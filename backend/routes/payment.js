const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');
const { sendPushToUsers } = require('../pushService');

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_CLIENT_KEY = (process.env.TOSS_CLIENT_KEY || '').trim();
const TOSS_API_URL = 'https://api.tosspayments.com/v1/virtual-accounts';
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

// 토스페이먼츠 Authorization 헤더 생성 (secretKey + ':' 를 base64 인코딩)
function getTossAuthHeader() {
  const encoded = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

const OPEN_PAYMENT_STATUSES = ['PENDING', 'WAITING_FOR_DEPOSIT'];

/** 가상계좌·간편결제 포함, 미완료 결제 1건만 허용 */
async function userHasOpenPaymentOrder(userId) {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('id')
    .eq('user_id', userId)
    .in('status', OPEN_PAYMENT_STATUSES)
    .limit(1);

  if (error) throw error;
  return (data && data.length > 0);
}

const OPEN_PAYMENT_BLOCK_MESSAGE =
  '진행 중인 결제가 있어요. 충전 내역에서 해당 건을 취소한 뒤 다시 시도해 주세요.';

// 별 지급 공통 함수 (stars.js와 동일한 패턴)
async function awardStars(userId, amount, reason, meta) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('star_balance')
    .eq('id', userId)
    .single();

  if (userError || !user) throw userError || new Error('사용자를 찾을 수 없습니다.');

  const newBalance = (typeof user.star_balance === 'number' ? user.star_balance : 0) + amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ star_balance: newBalance })
    .eq('id', userId);

  if (updateError) throw updateError;

  const { error: txError } = await supabase
    .from('star_transactions')
    .insert({ user_id: userId, amount, reason, meta: meta || null });

  if (txError) throw txError;

  return newBalance;
}

// ─────────────────────────────────────────────
// GET /api/payment/products — 활성 상품 목록 조회
// ─────────────────────────────────────────────
router.get('/products', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shop_products')
      .select('id, name, stars, price, bonus_stars, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return res.json({ products: data });
  } catch (err) {
    console.error('[payment] /products 오류:', err);
    return res.status(500).json({ message: '상품 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/virtual-account — 가상계좌 발급
// ─────────────────────────────────────────────
router.post('/virtual-account', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { productId, bankCode, customerName } = req.body;

  if (!productId || !bankCode || !customerName) {
    return res.status(400).json({ message: '상품, 은행, 보내는 통장 예금주 이름을 모두 입력해 주세요.' });
  }

  try {
    if (await userHasOpenPaymentOrder(userId)) {
      return res.status(409).json({
        message: OPEN_PAYMENT_BLOCK_MESSAGE,
        code: 'OPEN_PAYMENT_EXISTS',
      });
    }

    // 상품 조회 (금액은 DB 기준으로 결정, 프론트 금액 무시)
    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('id, name, stars, price, bonus_stars, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    if (!product.is_active) {
      return res.status(400).json({ message: '현재 판매 중이지 않은 상품입니다.' });
    }

    const starsToAward = product.stars + (product.bonus_stars || 0);
    const orderId = uuidv4(); // 고유 주문번호

    // DB에 PENDING 상태로 주문 먼저 저장
    const { error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        user_id: userId,
        product_id: product.id,
        order_id: orderId,
        amount: product.price,
        stars_to_award: starsToAward,
        customer_name: customerName,
        status: 'PENDING',
        pay_channel: 'virtual_account',
      });

    if (insertError) throw insertError;

    // 토스페이먼츠 가상계좌 발급 요청
    const tossRes = await fetch(TOSS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: getTossAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        orderName: product.name,
        amount: product.price,
        customerName,
        bank: bankCode,
        validHours: 24, // 24시간 이내 입금
      }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error('[payment] 토스 가상계좌 발급 실패:', tossData);
      // 실패 시 주문 상태 FAILED로 업데이트
      await supabase
        .from('payment_orders')
        .update({ status: 'FAILED' })
        .eq('order_id', orderId);
      return res.status(400).json({ message: tossData?.message || '가상계좌 발급에 실패했습니다.' });
    }

    const va = tossData.virtualAccount;

    // 발급 성공: 주문 정보 업데이트
    await supabase
      .from('payment_orders')
      .update({
        payment_key: tossData.paymentKey,
        toss_secret: tossData.secret,
        bank_code: va.bankCode,
        account_number: va.accountNumber,
        due_date: va.dueDate,
        status: 'WAITING_FOR_DEPOSIT',
      })
      .eq('order_id', orderId);

    console.log(`[payment] 가상계좌 발급 완료 — user:${userId}, order:${orderId}, amount:${product.price}`);

    return res.json({
      orderId,
      bankCode: va.bankCode,
      accountNumber: va.accountNumber,
      customerName: va.customerName,
      dueDate: va.dueDate,
      amount: product.price,
      starsToAward,
      productName: product.name,
    });
  } catch (err) {
    console.error('[payment] /virtual-account 오류:', err);
    return res.status(500).json({ message: '가상계좌 발급 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/cancel-pending — 진행 중 결제 통합 취소 (가상계좌·간편결제)
// ─────────────────────────────────────────────
async function handleCancelPendingPayment(req, res) {
  const userId = req.user.userId;
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: '주문번호가 필요합니다.' });
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('id, user_id, payment_key, status, pay_channel, order_id')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    if (order.user_id !== userId) {
      return res.status(403).json({ message: '본인 주문만 취소할 수 있습니다.' });
    }

    if (order.status === 'CANCELED') {
      return res.json({ success: true, alreadyCanceled: true });
    }

    if (!OPEN_PAYMENT_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: '진행 중인 결제만 취소할 수 있습니다.' });
    }

    const channel = order.pay_channel || 'virtual_account';

    // 간편결제: prepare 직후 PENDING(창 닫음 등) → 토스 승인 전이면 DB만 취소
    if (channel === 'easy_pay' && order.status === 'PENDING') {
      await supabase.from('payment_orders').update({ status: 'CANCELED' }).eq('order_id', orderId);
      console.log(`[payment] 간편결제 PENDING 취소(DB) — user:${userId}, order:${orderId}`);
      return res.json({ success: true });
    }

    // 가상계좌: 발급 도중 끊김 등 PENDING + payment_key 없음
    if (channel === 'virtual_account' && order.status === 'PENDING' && !order.payment_key) {
      await supabase.from('payment_orders').update({ status: 'CANCELED' }).eq('order_id', orderId);
      console.log(`[payment] 가상계좌 PENDING(무결제키) 취소(DB) — user:${userId}, order:${orderId}`);
      return res.json({ success: true });
    }

    // 입금 대기(가상계좌) 또는 payment_key가 있는 미완료 건 → 토스 취소 시도
    if (!order.payment_key) {
      return res.status(400).json({ message: '취소할 결제 정보가 없습니다.' });
    }

    if (!TOSS_SECRET_KEY) {
      return res.status(503).json({ message: '서버 결제 설정이 완료되지 않았습니다.' });
    }

    const cancelRes = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: getTossAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: '고객 요청으로 결제 취소' }),
      }
    );

    const cancelData = await cancelRes.json();

    if (!cancelRes.ok) {
      console.error('[payment] 토스 결제 취소 실패:', cancelData);
      return res.status(400).json({
        message: cancelData?.message || '결제 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    await supabase.from('payment_orders').update({ status: 'CANCELED' }).eq('order_id', orderId);

    console.log(`[payment] 진행 중 결제 토스 취소 완료 — user:${userId}, order:${orderId}, channel:${channel}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[payment] /cancel-pending 오류:', err);
    return res.status(500).json({ message: '취소 처리 중 오류가 발생했습니다.' });
  }
}

router.post('/cancel-pending', authenticate, handleCancelPendingPayment);
// 하위 호환
router.post('/virtual-account/cancel', authenticate, handleCancelPendingPayment);

// ─────────────────────────────────────────────
// GET /api/payment/toss-client-key — 프론트 결제창용 (공개 클라이언트 키)
// ─────────────────────────────────────────────
router.get('/toss-client-key', authenticate, async (req, res) => {
  if (!TOSS_CLIENT_KEY) {
    return res.status(503).json({ message: '간편결제 설정이 아직 완료되지 않았습니다. (TOSS_CLIENT_KEY)' });
  }
  return res.json({ clientKey: TOSS_CLIENT_KEY });
});

// ─────────────────────────────────────────────
// POST /api/payment/easy-pay/prepare — 간편결제용 주문 생성 (결제창 호출 전)
// ─────────────────────────────────────────────
router.post('/easy-pay/prepare', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: '상품을 선택해 주세요.' });
  }

  try {
    if (await userHasOpenPaymentOrder(userId)) {
      return res.status(409).json({
        message: OPEN_PAYMENT_BLOCK_MESSAGE,
        code: 'OPEN_PAYMENT_EXISTS',
      });
    }

    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('id, name, stars, price, bonus_stars, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    if (!product.is_active) {
      return res.status(400).json({ message: '현재 판매 중이지 않은 상품입니다.' });
    }

    const starsToAward = product.stars + (product.bonus_stars || 0);
    const orderId = uuidv4();

    const insertPayload = {
      user_id: userId,
      product_id: product.id,
      order_id: orderId,
      amount: product.price,
      stars_to_award: starsToAward,
      status: 'PENDING',
      pay_channel: 'easy_pay',
      customer_name: null,
    };

    const { error: insertError } = await supabase.from('payment_orders').insert(insertPayload);

    if (insertError) {
      console.error('[payment] easy-pay prepare insert:', insertError);
      if (insertError.message && insertError.message.includes('pay_channel')) {
        return res.status(500).json({
          message: 'DB에 pay_channel 컬럼이 없습니다. supabase/migrations/20260320000000_create_shop_and_payment_tables.sql 을 적용해 주세요.',
        });
      }
      throw insertError;
    }

    return res.json({
      orderId,
      orderName: product.name,
      amount: product.price,
      customerKey: `member_${userId}`,
    });
  } catch (err) {
    console.error('[payment] /easy-pay/prepare 오류:', err);
    return res.status(500).json({ message: '주문 생성 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/confirm — 간편결제 승인 (successUrl 복귀 후)
// ─────────────────────────────────────────────
router.post('/confirm', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { paymentKey, orderId, amount } = req.body;

  if (!paymentKey || !orderId || amount === undefined || amount === null) {
    return res.status(400).json({ message: '결제 정보가 올바르지 않습니다.' });
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ message: '결제 금액이 올바르지 않습니다.' });
  }

  if (!TOSS_SECRET_KEY) {
    return res.status(503).json({ message: '서버 결제 설정이 완료되지 않았습니다.' });
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('id, user_id, stars_to_award, amount, status, pay_channel, order_id')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ message: '본인 주문만 결제할 수 있습니다.' });
    }

    const channel = order.pay_channel || 'virtual_account';
    if (channel !== 'easy_pay') {
      return res.status(400).json({ message: '간편결제 주문이 아닙니다.' });
    }

    if (order.status === 'DONE') {
      return res.json({ success: true, alreadyDone: true, message: '이미 처리된 결제입니다.' });
    }

    if (order.amount !== amountNum) {
      return res.status(400).json({ message: '결제 금액이 주문과 일치하지 않습니다.' });
    }

    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: getTossAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: amountNum,
      }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error('[payment] confirm 실패:', tossData);
      await supabase
        .from('payment_orders')
        .update({ status: 'FAILED', payment_key: paymentKey })
        .eq('order_id', orderId);
      return res.status(400).json({ message: tossData?.message || '결제 승인에 실패했습니다.' });
    }

    const newBalance = await awardStars(
      order.user_id,
      order.stars_to_award,
      'purchase',
      { orderId, amount: amountNum, payChannel: 'easy_pay' }
    );

    const secret = tossData.secret || null;
    await supabase
      .from('payment_orders')
      .update({
        status: 'DONE',
        payment_key: paymentKey,
        toss_secret: secret,
        deposited_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    const notifBody = `⭐ ${order.stars_to_award}개가 충전되었습니다. (현재 보유 ${newBalance}개)`;
    await supabase
      .from('notifications')
      .insert({
        user_id: order.user_id,
        type: 'star_purchase',
        title: '별 충전 완료!',
        body: notifBody,
        is_read: false,
        link_url: null,
      });

    try {
      await sendPushToUsers([String(order.user_id)], {
        type: 'star_purchase',
        title: '[직쏠공] 별 충전 완료!',
        body: notifBody,
      });
    } catch (pushErr) {
      console.error('[payment] confirm 푸시 실패 (무시):', pushErr);
    }

    return res.json({ success: true, newBalance });
  } catch (err) {
    console.error('[payment] /confirm 오류:', err);
    return res.status(500).json({ message: '결제 처리 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/orders — 내 결제 내역 조회
// ─────────────────────────────────────────────
router.get('/orders', authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select(`
        id, order_id, amount, stars_to_award, status, pay_channel,
        bank_code, account_number, due_date, deposited_at, created_at,
        shop_products(name, stars)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json({ orders: data });
  } catch (err) {
    console.error('[payment] /orders 오류:', err);
    return res.status(500).json({ message: '결제 내역을 불러오는 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/webhook — 토스페이먼츠 입금 웹훅 (인증 없음)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  // 반드시 10초 이내에 200 응답해야 함 (토스가 최대 7회 재전송)
  const { secret, status, orderId } = req.body;

  try {
    if (!orderId || !secret) {
      return res.status(400).end();
    }

    // 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('id, user_id, stars_to_award, amount, status, toss_secret')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      console.warn('[payment] webhook: 주문 없음 —', orderId);
      return res.status(200).end(); // 알 수 없는 주문은 200으로 응답 (토스 재전송 방지)
    }

    // secret 검증 (위변조 방지)
    if (order.toss_secret !== secret) {
      console.error('[payment] webhook: secret 불일치 —', orderId);
      return res.status(400).end();
    }

    // 입금 완료 처리
    if (status === 'DONE') {
      // 중복 처리 방지
      if (order.status === 'DONE') {
        console.warn('[payment] webhook: 이미 처리된 주문 —', orderId);
        return res.status(200).end();
      }

      // 별 지급
      const newBalance = await awardStars(
        order.user_id,
        order.stars_to_award,
        'purchase',
        { orderId, amount: order.amount }
      );

      // 주문 상태 업데이트
      await supabase
        .from('payment_orders')
        .update({ status: 'DONE', deposited_at: new Date().toISOString() })
        .eq('order_id', orderId);

      const notifBody = `⭐ ${order.stars_to_award}개가 충전되었습니다. (현재 보유 ${newBalance}개)`;
      // 인앱 알림 저장
      await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'star_purchase',
          title: '별 충전 완료!',
          body: notifBody,
          is_read: false,
          link_url: null,
        });

      // FCM 푸시 알림 (링크 없음 — 알림 탭 시 별도 화면 이동 없음)
      try {
        await sendPushToUsers([String(order.user_id)], {
          type: 'star_purchase',
          title: '[직쏠공] 별 충전 완료!',
          body: notifBody,
        });
      } catch (pushErr) {
        console.error('[payment] 푸시 알림 실패 (무시):', pushErr);
      }

      console.log(`[payment] webhook DONE — order:${orderId}, stars:${order.stars_to_award}, user:${order.user_id}`);
    }

    // 취소 처리
    if (status === 'CANCELED') {
      await supabase
        .from('payment_orders')
        .update({ status: 'CANCELED' })
        .eq('order_id', orderId);

      console.log(`[payment] webhook CANCELED — order:${orderId}`);
    }

    return res.status(200).end();
  } catch (err) {
    console.error('[payment] webhook 처리 오류:', err);
    // 에러가 나도 200 응답 (토스 재전송 방지, 내부적으로 로그 확인)
    return res.status(200).end();
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/admin/orders — 관리자 전체 결제 내역 조회
// ─────────────────────────────────────────────
router.get('/admin/orders', authenticate, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  const { status, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = supabase
      .from('payment_orders')
      .select(`
        id, order_id, amount, stars_to_award, status,
        bank_code, account_number, customer_name, due_date,
        deposited_at, created_at, updated_at,
        shop_products(name, stars),
        users(nickname, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ orders: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[payment] /admin/orders 오류:', err);
    return res.status(500).json({ message: '결제 내역을 불러오는 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/admin/stats — 관리자 결제 통계
// ─────────────────────────────────────────────
router.get('/admin/stats', authenticate, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select('status, amount');

    if (error) throw error;

    const stats = {
      total: data.length,
      DONE: { count: 0, amount: 0 },
      WAITING_FOR_DEPOSIT: { count: 0, amount: 0 },
      CANCELED: { count: 0, amount: 0 },
      FAILED: { count: 0, amount: 0 },
    };

    for (const o of data) {
      if (stats[o.status]) {
        stats[o.status].count++;
        stats[o.status].amount += o.amount || 0;
      }
    }

    return res.json({ stats });
  } catch (err) {
    console.error('[payment] /admin/stats 오류:', err);
    return res.status(500).json({ message: '통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
