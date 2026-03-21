import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { FaRegCopy } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { shopApi, starApi, systemApi } from '../services/api';

/** 상품 카드 할인율 표시용 정가 (개당 원) — DB 가격·백엔드와 맞출 것 */
const SHOP_LIST_PRICE_PER_STAR = 300;

/** 토스 가상계좌 발급 은행 코드 — 주요 은행만 노출 (전체 목록은 토스 문서 참고) */
const BANK_OPTIONS = [
  { code: '국민', name: 'KB국민은행' },
  { code: '신한', name: '신한은행' },
  { code: '우리', name: '우리은행' },
  { code: '하나', name: '하나은행' },
  { code: '농협', name: 'NH농협은행' },
];

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}까지`;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:              { label: '처리중',  color: '#f59e0b' },
  WAITING_FOR_DEPOSIT:  { label: '입금대기', color: '#3b82f6' },
  DONE:                 { label: '충전완료', color: '#10b981' },
  CANCELED:             { label: '취소됨',  color: '#9ca3af' },
  FAILED:               { label: '실패',    color: '#ef4444' },
};

function orderStatusDisplay(o: any) {
  if (o.status === 'PENDING' && o.pay_channel === 'easy_pay') {
    return { label: '간편결제 대기', color: '#f59e0b' };
  }
  return STATUS_LABEL[o.status] || { label: o.status, color: '#9ca3af' };
}

type PayMode = 'virtual_account' | 'easy_pay';

const ShopPage: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [starBalance, setStarBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [bankCode, setBankCode] = useState(BANK_OPTIONS[0].code);
  const [customerName, setCustomerName] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issuedAccount, setIssuedAccount] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [chargeSuccess, setChargeSuccess] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [payMode, setPayMode] = useState<PayMode>('virtual_account');
  const [easyPayLoading, setEasyPayLoading] = useState(false);
  const [cancelingVa, setCancelingVa] = useState(false);
  const [shopGate, setShopGate] = useState<'loading' | 'ok'>('loading');

  const paymentKeyFromUrl = searchParams.get('paymentKey');
  const orderIdFromUrl = searchParams.get('orderId');
  const amountFromUrl = searchParams.get('amount');

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [productRes, orderRes, starRes] = await Promise.all([
        shopApi.getProducts(),
        shopApi.getMyOrders(),
        starApi.getMyStars(),
      ]);
      setProducts(productRes.products || []);
      setOrders(orderRes.orders || []);
      setStarBalance(starRes.balance ?? 0);
    } catch (e) {
      console.error('[ShopPage] 데이터 로드 오류:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { enabled } = await systemApi.getStarShopEnabled();
        if (cancelled) return;
        if (!enabled) {
          toast.info('별 충전소는 준비 중입니다.');
          navigate('/main', { replace: true });
          return;
        }
        setShopGate('ok');
      } catch {
        if (!cancelled) {
          toast.error('설정을 확인할 수 없습니다.');
          navigate('/main', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (shopGate !== 'ok') return;
    fetchData();
  }, [shopGate, fetchData]);

  // 간편결제 성공 후 리다이렉트: ?paymentKey=&orderId=&amount= → 서버 승인
  useEffect(() => {
    if (!paymentKeyFromUrl || !orderIdFromUrl || !amountFromUrl) return;

    const lockKey = `toss_confirm_${paymentKeyFromUrl}`;
    if (sessionStorage.getItem(lockKey) === 'done') {
      navigate('/shop', { replace: true });
      return;
    }
    if (sessionStorage.getItem(lockKey) === 'pending') return;
    sessionStorage.setItem(lockKey, 'pending');

    (async () => {
      try {
        const res = await shopApi.confirmPayment({
          paymentKey: paymentKeyFromUrl,
          orderId: orderIdFromUrl,
          amount: amountFromUrl,
        });
        if (res.success && !res.alreadyDone) {
          setChargeSuccess(true);
          setTimeout(() => setChargeSuccess(false), 6000);
        }
        sessionStorage.setItem(lockKey, 'done');
        await fetchData();
      } catch (e: any) {
        sessionStorage.removeItem(lockKey);
        setErrorMsg(e?.response?.data?.message || '결제 승인 처리에 실패했습니다.');
      } finally {
        navigate('/shop', { replace: true });
      }
    })();
  }, [paymentKeyFromUrl, orderIdFromUrl, amountFromUrl, navigate, fetchData]);

  useEffect(() => {
    if (searchParams.get('payFail') !== '1') return;

    const failOrderId = searchParams.get('orderId');
    const msg = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.';
    setErrorMsg(decodeURIComponent(msg));
    setSearchParams({}, { replace: true });

    if (failOrderId) {
      shopApi.cancelPendingPayment({ orderId: failOrderId }).finally(() => {
        fetchData();
      });
    }
  }, [searchParams, setSearchParams, fetchData]);

  // issuedAccount 생기면 5초마다 폴링 — DONE 되면 잔액 갱신 + 성공 메시지
  useEffect(() => {
    if (!issuedAccount) {
      stopPolling();
      return;
    }
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const [orderRes, starRes] = await Promise.all([
          shopApi.getMyOrders(),
          starApi.getMyStars(),
        ]);
        const updatedOrders: any[] = orderRes.orders || [];
        setOrders(updatedOrders);

        const target = updatedOrders.find((o: any) => o.order_id === issuedAccount.orderId);
        if (target?.status === 'DONE') {
          setStarBalance(starRes.balance ?? 0);
          setChargeSuccess(true);
          setIssuedAccount(null);
          stopPolling();
          setTimeout(() => setChargeSuccess(false), 6000);
        } else if (target && (target.status === 'CANCELED' || target.status === 'FAILED')) {
          setIssuedAccount(null);
          stopPolling();
        }
      } catch (e) {
        console.error('[ShopPage] 폴링 오류:', e);
      }
    }, 5000);

    return stopPolling;
  }, [issuedAccount, stopPolling]);

  // 프로필 닉네임을 기본값으로 (실제로는 통장 예금주와 같게 수정 권장)
  useEffect(() => {
    if (profile?.nickname && !customerName) {
      setCustomerName(profile.nickname);
    }
  }, [profile, customerName]);

  const handleIssue = async () => {
    if (!selectedProduct) { setErrorMsg('상품을 선택해주세요.'); return; }
    if (!customerName.trim()) { setErrorMsg('보내는 통장 예금주 이름을 입력해 주세요.'); return; }
    setErrorMsg('');
    setIssuing(true);
    setIssuedAccount(null);
    try {
      const result = await shopApi.issueVirtualAccount({
        productId: selectedProduct.id,
        bankCode,
        customerName: customerName.trim(),
      });
      setIssuedAccount(result);
      // 발급 후 내역 갱신
      const orderRes = await shopApi.getMyOrders();
      setOrders(orderRes.orders || []);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || '가상계좌 발급 중 오류가 발생했습니다.');
    } finally {
      setIssuing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /** 가상계좌·간편결제 포함, 미완료 1건이라도 있으면 새 결제 불가 */
  const hasOpenPayment = orders.some(
    (o: any) => o.status === 'PENDING' || o.status === 'WAITING_FOR_DEPOSIT'
  );

  const issueBtnDisabled = issuing || !selectedProduct || hasOpenPayment;
  const easyPayBtnDisabled = easyPayLoading || !selectedProduct || hasOpenPayment;

  const handleCancelPendingPayment = async (orderId: string) => {
    setErrorMsg('');
    setCancelingVa(true);
    try {
      await shopApi.cancelPendingPayment({ orderId });
      setIssuedAccount((prev: any) => (prev?.orderId === orderId ? null : prev));
      await fetchData();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || '취소 처리에 실패했습니다.');
    } finally {
      setCancelingVa(false);
    }
  };

  const handleEasyPay = async (easyPayLabel: '카카오페이' | '토스페이') => {
    if (!selectedProduct) {
      setErrorMsg('상품을 선택해 주세요.');
      return;
    }
    setErrorMsg('');
    setEasyPayLoading(true);
    let prepOrderId: string | null = null;
    try {
      const { clientKey } = await shopApi.getTossClientKey();
      const prep = await shopApi.prepareEasyPay({ productId: selectedProduct.id });
      prepOrderId = prep.orderId;
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: prep.customerKey });
      const origin = window.location.origin;
      const failUrl = `${origin}/shop?payFail=1&orderId=${encodeURIComponent(prep.orderId)}`;

      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: prep.amount,
        },
        orderId: prep.orderId,
        orderName: prep.orderName,
        customerName: profile?.nickname?.trim() || '구매자',
        successUrl: `${origin}/shop`,
        failUrl,
        card: {
          flowMode: 'DIRECT',
          easyPay: easyPayLabel,
        },
      });
    } catch (e: any) {
      if (prepOrderId) {
        try {
          await shopApi.cancelPendingPayment({ orderId: prepOrderId });
          await fetchData();
        } catch (_) {
          /* 무시 */
        }
      }
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        '간편결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.';
      setErrorMsg(msg);
    } finally {
      setEasyPayLoading(false);
    }
  };

  if (shopGate !== 'ok') {
    return (
      <div style={{ flex: 1, minHeight: '100vh', background: '#f7f7fa', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>로딩 중...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, minHeight: '100vh', background: '#f7f7fa', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: '100vh', background: '#f7f7fa', overflowY: 'auto' }}>
      {chargeSuccess && (
        <div style={S.successToast}>
          🎉 별 충전 완료! 잔액이 자동으로 갱신되었습니다.
        </div>
      )}
      <div style={S.inner}>

        {/* 헤더 */}
        <div style={S.header}>
          <h1 style={S.title}>⭐ 별 충전소</h1>
          <div style={S.balanceBadge}>현재 보유: <strong>{starBalance}개</strong></div>
        </div>

        {/* 상품 목록 */}
        <div style={S.section}>
          <h2 style={S.sectionTitle}>상품 선택</h2>
          <div style={S.productGrid}>
            {products.map((p) => {
              const selected = selectedProduct?.id === p.id;
              const totalStars = p.stars + (p.bonus_stars || 0);
              const listTotal = p.stars * SHOP_LIST_PRICE_PER_STAR;
              const discountPct =
                listTotal > 0 ? Math.round((1 - p.price / listTotal) * 100) : 0;
              return (
                <button
                  key={p.id}
                  style={{
                    border: selected ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '16px 10px',
                    background: selected ? '#faf5ff' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => { setSelectedProduct(p); setIssuedAccount(null); setErrorMsg(''); }}
                >
                  <div style={S.productStars}>⭐ {totalStars}개</div>
                  {p.bonus_stars > 0 && (
                    <div style={S.bonusBadge}>+{p.bonus_stars} 보너스</div>
                  )}
                  <div style={S.productPriceBlock}>
                    {discountPct > 0 ? (
                      <div style={S.productPriceLine}>
                        <span style={S.productListPrice}>{formatPrice(listTotal)}</span>
                        <span style={S.priceArrow}>→</span>
                        <span style={S.productSalePrice}>{formatPrice(p.price)}</span>
                      </div>
                    ) : (
                      <div style={S.productSalePriceSingle}>{formatPrice(p.price)}</div>
                    )}
                  </div>
                  {discountPct > 0 && (
                    <div style={S.discountBadge}>{discountPct}% 할인</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 결제 방법 */}
        <div style={S.section}>
          <h2 style={S.sectionTitle}>결제 방법</h2>
          {hasOpenPayment && (
            <div style={S.openPaymentHint}>
              진행 중인 결제가 있어요. <strong>충전 내역</strong>에서 취소한 뒤 다시 시도해 주세요.
            </div>
          )}
          <div style={S.payModeRow}>
            <button
              type="button"
              style={{
                ...S.payModeBtn,
                ...(payMode === 'virtual_account' ? S.payModeBtnActive : {}),
              }}
              onClick={() => { setPayMode('virtual_account'); setErrorMsg(''); }}
            >
              🏦 가상계좌
            </button>
            <button
              type="button"
              style={{
                ...S.payModeBtn,
                ...(payMode === 'easy_pay' ? S.payModeBtnActive : {}),
              }}
              onClick={() => { setPayMode('easy_pay'); setErrorMsg(''); }}
            >
              ⚡ 간편결제
            </button>
          </div>

          {payMode === 'virtual_account' && (
            <>
              <p style={S.formHint}>
                <strong>은행</strong>은 가상계좌 번호가 만들어지는 은행이에요. 입금할 때 쓰기 편한 곳을 고르면 됩니다.
                <br />
                <strong>아래 칸</strong>에는 <strong>돈을 보내는 내 통장(출금 계좌) 예금주 이름</strong>을 적어 주세요. 즉, 은행 앱에서 이체할 때 <strong>“보내는 사람”으로 찍히는 이름</strong>과 같아야 해요. (닉네임·다른 사람 이름이면 입금 확인이 늦어질 수 있어요.)
              </p>
              <div style={S.formRow}>
                <label style={S.label}>가상계좌 은행</label>
                <select style={S.select} value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                  {BANK_OPTIONS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div style={S.formRow}>
                <label style={S.label}>예금주(보내는 계좌 주인)</label>
                <input
                  style={S.input}
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: issueBtnDisabled ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: issueBtnDisabled ? 'not-allowed' : 'pointer',
                  marginTop: 4,
                }}
                onClick={handleIssue}
                disabled={issueBtnDisabled}
              >
                {issuing ? '발급 중...' : hasOpenPayment ? '진행 중인 결제 취소 후 발급 가능' : '가상계좌 발급하기'}
              </button>
            </>
          )}

          {payMode === 'easy_pay' && (
            <>
              <p style={S.formHint}>
                상품을 고른 뒤 <strong>카카오페이</strong> 또는 <strong>토스페이</strong>로 바로 결제할 수 있어요.
                결제가 끝나면 별이 즉시 충전됩니다.
              </p>
              <div style={S.easyPayRow}>
                <button
                  type="button"
                  style={{
                    ...S.easyPayKakao,
                    ...(easyPayBtnDisabled ? S.easyPayDisabled : {}),
                  }}
                  disabled={easyPayBtnDisabled}
                  onClick={() => handleEasyPay('카카오페이')}
                >
                  {easyPayLoading ? '연결 중...' : hasOpenPayment ? '결제 진행 중' : '카카오페이'}
                </button>
                <button
                  type="button"
                  style={{
                    ...S.easyPayToss,
                    ...(easyPayBtnDisabled ? S.easyPayDisabled : {}),
                  }}
                  disabled={easyPayBtnDisabled}
                  onClick={() => handleEasyPay('토스페이')}
                >
                  {easyPayLoading ? '연결 중...' : hasOpenPayment ? '결제 진행 중' : '토스페이'}
                </button>
              </div>
            </>
          )}

          {errorMsg && <div style={S.errorMsg}>{errorMsg}</div>}
        </div>

        {/* 발급된 계좌 안내 */}
        {issuedAccount && (
          <div style={S.accountBox}>
            <div style={S.accountTitle}>🏦 가상계좌 발급 완료</div>
            <div style={S.accountRow}>
              <span style={S.accountLabel}>은행</span>
              <span style={S.accountValue}>{issuedAccount.bankCode}은행</span>
            </div>
            <div style={S.accountRow}>
              <span style={S.accountLabel}>계좌번호</span>
              <div style={S.accountNumberWithCopy}>
                <span style={S.accountValue}>{issuedAccount.accountNumber}</span>
                <button
                  type="button"
                  style={S.copyIconBtn}
                  title="계좌번호 복사"
                  aria-label="계좌번호 복사"
                  onClick={() => handleCopy(issuedAccount.accountNumber)}
                >
                  <FaRegCopy size={18} />
                </button>
              </div>
            </div>
            <div style={S.accountRow}>
              <span style={S.accountLabel}>입금금액</span>
              <span style={S.accountValue}><strong>{formatPrice(issuedAccount.amount)}</strong></span>
            </div>
            <div style={S.accountRow}>
              <span style={S.accountLabel}>입금기한</span>
              <span style={{ ...S.accountValue, color: '#ef4444' }}>{formatDate(issuedAccount.dueDate)}</span>
            </div>
            <div style={S.accountNotice}>
              발급 직후 토스에서 <strong>입금 대기</strong> 상태가 되는 것이 정상이에요. 입금하면 별이 들어옵니다.<br />
              ※ 기한 내 미입금 시 자동 취소됩니다. 마음이 바뀌면 아래에서 취소할 수 있어요.
            </div>
            <button
              type="button"
              style={S.cancelVaBtn}
              disabled={cancelingVa}
              onClick={() => handleCancelPendingPayment(issuedAccount.orderId)}
            >
              {cancelingVa ? '취소 처리 중...' : '이 결제 취소하기'}
            </button>
            {copied && <div style={S.copiedHint}>✅ 계좌번호를 복사했어요</div>}
          </div>
        )}

        {/* 충전 내역 */}
        <div style={S.section}>
          <h2 style={S.sectionTitle}>충전 내역</h2>
          {orders.length === 0 ? (
            <div style={S.emptyText}>충전 내역이 없습니다.</div>
          ) : (
            <div style={S.orderList}>
              {orders.map((o) => {
                const st = orderStatusDisplay(o);
                const canCancelPending =
                  !!o.order_id && (o.status === 'WAITING_FOR_DEPOSIT' || o.status === 'PENDING');
                return (
                  <div key={o.id} style={S.orderRow}>
                    <div style={S.orderLeft}>
                      <div style={S.orderName}>
                        {o.shop_products?.name || '상품'}
                        {o.pay_channel === 'easy_pay' && (
                          <span style={S.channelTag}>간편</span>
                        )}
                      </div>
                      <div style={S.orderDate}>
                        {new Date(o.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <div style={S.orderRight}>
                      <div style={{ color: '#7c3aed', fontWeight: 700 }}>+{o.stars_to_award}개</div>
                      <div style={S.orderAmount}>{formatPrice(o.amount)}</div>
                      <div style={{ ...S.statusBadge, background: st.color }}>{st.label}</div>
                      {canCancelPending && (
                        <button
                          type="button"
                          style={S.orderCancelBtn}
                          disabled={cancelingVa}
                          onClick={() => handleCancelPendingPayment(o.order_id)}
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ─── 스타일 상수 ──────────────────────────────
const S = {
  inner: { maxWidth: 480, margin: '0 auto', padding: '24px 16px 40px' } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 } as React.CSSProperties,
  title: { fontSize: '1.4rem', fontWeight: 800, color: '#1e1b4b', margin: 0 } as React.CSSProperties,
  balanceBadge: { background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '4px 14px', fontSize: '0.85rem' } as React.CSSProperties,
  section: { background: '#fff', borderRadius: 16, padding: '20px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as React.CSSProperties,
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: 14, marginTop: 0 } as React.CSSProperties,
  openPaymentHint: { marginBottom: 12, padding: '10px 12px', background: '#f3f4f6', borderRadius: 10, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45, border: '1px solid #e5e7eb' } as React.CSSProperties,
  payModeRow: { display: 'flex', gap: 10, marginBottom: 16 } as React.CSSProperties,
  payModeBtn: {
    flex: 1,
    padding: '12px 10px',
    borderRadius: 12,
    border: '2px solid #e5e7eb',
    background: '#f9fafb',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#6b7280',
    cursor: 'pointer',
  } as React.CSSProperties,
  payModeBtnActive: {
    border: '2px solid #7c3aed',
    background: '#faf5ff',
    color: '#5b21b6',
  } as React.CSSProperties,
  easyPayRow: { display: 'flex', gap: 10, marginTop: 4 } as React.CSSProperties,
  easyPayKakao: {
    flex: 1,
    padding: '14px 12px',
    borderRadius: 12,
    border: 'none',
    background: '#fee500',
    color: '#191919',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  easyPayToss: {
    flex: 1,
    padding: '14px 12px',
    borderRadius: 12,
    border: 'none',
    background: '#0064ff',
    color: '#fff',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  easyPayDisabled: { opacity: 0.55, cursor: 'not-allowed' } as React.CSSProperties,
  productGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } as React.CSSProperties,
  productStars: { fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', marginBottom: 4 } as React.CSSProperties,
  productPriceBlock: { marginTop: 6, width: '100%' } as React.CSSProperties,
  productPriceLine: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    textAlign: 'center',
    lineHeight: 1.35,
  } as React.CSSProperties,
  productListPrice: {
    fontSize: '0.82rem',
    color: '#9ca3af',
    textDecoration: 'line-through',
    textDecorationColor: '#9ca3af',
    textDecorationThickness: '1.5px',
  } as React.CSSProperties,
  priceArrow: { fontSize: '0.78rem', color: '#9ca3af', flexShrink: 0 } as React.CSSProperties,
  productSalePrice: { fontSize: '1rem', fontWeight: 800, color: '#7c3aed' } as React.CSSProperties,
  productSalePriceSingle: { fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginTop: 0 } as React.CSSProperties,
  bonusBadge: { fontSize: '0.7rem', background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 6px', display: 'inline-block', marginBottom: 2 } as React.CSSProperties,
  discountBadge: { fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600, marginTop: 2 } as React.CSSProperties,
  formRow: { marginBottom: 12 } as React.CSSProperties,
  formHint: { fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55, marginBottom: 14, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' } as React.CSSProperties,
  label: { display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: 6, fontWeight: 500 } as React.CSSProperties,
  select: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.95rem', background: '#fff', color: '#374151', boxSizing: 'border-box' } as React.CSSProperties,
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.95rem', color: '#374151', boxSizing: 'border-box' } as React.CSSProperties,
  errorMsg: { color: '#ef4444', fontSize: '0.85rem', marginBottom: 10 } as React.CSSProperties,
  accountBox: { background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '20px 16px', marginBottom: 16 } as React.CSSProperties,
  accountTitle: { fontWeight: 700, fontSize: '1rem', color: '#065f46', marginBottom: 14 } as React.CSSProperties,
  accountRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 } as React.CSSProperties,
  accountNumberWithCopy: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flex: 1, minWidth: 0 } as React.CSSProperties,
  copyIconBtn: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    border: '1.5px solid #10b981',
    background: '#fff',
    color: '#059669',
    cursor: 'pointer',
  } as React.CSSProperties,
  cancelVaBtn: {
    width: '100%',
    marginTop: 12,
    padding: '11px 0',
    borderRadius: 10,
    border: '1.5px solid #fca5a5',
    background: '#fff',
    color: '#b91c1c',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  copiedHint: { fontSize: '0.82rem', color: '#059669', textAlign: 'center', marginTop: 10, fontWeight: 600 } as React.CSSProperties,
  orderCancelBtn: {
    marginTop: 6,
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid #fca5a5',
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
  } as React.CSSProperties,
  accountLabel: { fontSize: '0.85rem', color: '#6b7280', minWidth: 70 } as React.CSSProperties,
  accountValue: { fontSize: '0.95rem', color: '#1e1b4b', fontWeight: 500, wordBreak: 'break-all' } as React.CSSProperties,
  accountNotice: { fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.6, marginTop: 4 } as React.CSSProperties,
  successToast: { position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' } as React.CSSProperties,
  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', padding: '16px 0' } as React.CSSProperties,
  orderList: { display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties,
  orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' } as React.CSSProperties,
  orderLeft: {} as React.CSSProperties,
  orderName: { fontSize: '0.95rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } as React.CSSProperties,
  channelTag: { fontSize: '0.65rem', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 6 } as React.CSSProperties,
  orderDate: { fontSize: '0.8rem', color: '#9ca3af', marginTop: 2 } as React.CSSProperties,
  orderRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 } as React.CSSProperties,
  orderAmount: { fontSize: '0.82rem', color: '#6b7280' } as React.CSSProperties,
  statusBadge: { fontSize: '0.72rem', color: '#fff', borderRadius: 8, padding: '2px 8px', fontWeight: 600 } as React.CSSProperties,
};

export default ShopPage;
