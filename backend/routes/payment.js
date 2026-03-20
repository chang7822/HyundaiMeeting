const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../database');
const authenticate = require('../middleware/authenticate');

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_URL = 'https://api.tosspayments.com/v1/virtual-accounts';

// 토스페이먼츠 Authorization 헤더 생성 (secretKey + ':' 를 base64 인코딩)
function getTossAuthHeader() {
  const encoded = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

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
    return res.status(400).json({ message: '상품, 은행, 입금자명을 모두 입력해주세요.' });
  }

  try {
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
// GET /api/payment/orders — 내 결제 내역 조회
// ─────────────────────────────────────────────
router.get('/orders', authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select(`
        id, order_id, amount, stars_to_award, status,
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

      // 인앱 알림 저장
      await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'star_purchase',
          title: '별 충전 완료!',
          body: `⭐ ${order.stars_to_award}개가 충전되었습니다. (잔액: ${newBalance}개)`,
          is_read: false,
        });

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

module.exports = router;
