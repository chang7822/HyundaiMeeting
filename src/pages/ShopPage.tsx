import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { shopApi, starApi } from '../services/api';

interface ShopPageProps {
  sidebarOpen?: boolean;
}

const BANK_OPTIONS = [
  { code: '신한', name: '신한은행' },
  { code: '국민', name: 'KB국민은행' },
  { code: '농협', name: 'NH농협은행' },
  { code: '우리', name: '우리은행' },
  { code: '하나', name: '하나은행' },
  { code: '기업', name: 'IBK기업은행' },
  { code: '부산', name: '부산은행' },
  { code: '경남', name: '경남은행' },
  { code: '광주', name: '광주은행' },
  { code: '새마을', name: '새마을금고' },
  { code: '수협', name: 'Sh수협은행' },
  { code: '우체국', name: '우체국예금보험' },
  { code: 'iM뱅크', name: 'iM뱅크(대구)' },
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

const ShopPage: React.FC<ShopPageProps> = ({ sidebarOpen }) => {
  const { profile } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [starBalance, setStarBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [bankCode, setBankCode] = useState('신한');
  const [customerName, setCustomerName] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issuedAccount, setIssuedAccount] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

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
    fetchData();
  }, [fetchData]);

  // 프로필 닉네임을 기본 입금자명으로
  useEffect(() => {
    if (profile?.nickname && !customerName) {
      setCustomerName(profile.nickname);
    }
  }, [profile, customerName]);

  const handleIssue = async () => {
    if (!selectedProduct) { setErrorMsg('상품을 선택해주세요.'); return; }
    if (!customerName.trim()) { setErrorMsg('입금자명을 입력해주세요.'); return; }
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container(sidebarOpen)}>
      <div style={styles.inner}>

        {/* 헤더 */}
        <div style={styles.header}>
          <h1 style={styles.title}>⭐ 별 충전소</h1>
          <div style={styles.balanceBadge}>현재 보유: <strong>{starBalance}개</strong></div>
        </div>

        {/* 상품 목록 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>상품 선택</h2>
          <div style={styles.productGrid}>
            {products.map((p) => {
              const selected = selectedProduct?.id === p.id;
              const totalStars = p.stars + (p.bonus_stars || 0);
              return (
                <button
                  key={p.id}
                  style={styles.productCard(selected)}
                  onClick={() => { setSelectedProduct(p); setIssuedAccount(null); setErrorMsg(''); }}
                >
                  <div style={styles.productStars}>⭐ {totalStars}개</div>
                  {p.bonus_stars > 0 && (
                    <div style={styles.bonusBadge}>+{p.bonus_stars} 보너스</div>
                  )}
                  <div style={styles.productPrice}>{formatPrice(p.price)}</div>
                  {p.stars >= 100 && (
                    <div style={styles.discountBadge}>
                      {Math.round((1 - p.price / (p.stars * 100)) * 100)}% 할인
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 은행 & 입금자명 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>결제 정보</h2>
          <div style={styles.formRow}>
            <label style={styles.label}>은행 선택</label>
            <select
              style={styles.select}
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
            >
              {BANK_OPTIONS.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>입금자명</label>
            <input
              style={styles.input}
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="실제 입금할 이름"
              maxLength={20}
            />
          </div>
          {errorMsg && <div style={styles.errorMsg}>{errorMsg}</div>}
          <button
            style={styles.issueBtn(issuing || !selectedProduct)}
            onClick={handleIssue}
            disabled={issuing || !selectedProduct}
          >
            {issuing ? '발급 중...' : '가상계좌 발급하기'}
          </button>
        </div>

        {/* 발급된 계좌 안내 */}
        {issuedAccount && (
          <div style={styles.accountBox}>
            <div style={styles.accountTitle}>🏦 가상계좌 발급 완료</div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>은행</span>
              <span style={styles.accountValue}>{issuedAccount.bankCode}은행</span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>계좌번호</span>
              <span style={styles.accountValue}>{issuedAccount.accountNumber}</span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>입금금액</span>
              <span style={styles.accountValue}><strong>{formatPrice(issuedAccount.amount)}</strong></span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>입금기한</span>
              <span style={{ ...styles.accountValue, color: '#ef4444' }}>{formatDate(issuedAccount.dueDate)}</span>
            </div>
            <button
              style={styles.copyBtn}
              onClick={() => handleCopy(issuedAccount.accountNumber)}
            >
              {copied ? '✅ 복사됨!' : '계좌번호 복사'}
            </button>
            <div style={styles.accountNotice}>
              ※ 기한 내 미입금 시 자동 취소됩니다.<br />
              ※ 입금 완료 후 자동으로 별이 지급됩니다.
            </div>
          </div>
        )}

        {/* 충전 내역 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>충전 내역</h2>
          {orders.length === 0 ? (
            <div style={styles.emptyText}>충전 내역이 없습니다.</div>
          ) : (
            <div style={styles.orderList}>
              {orders.map((o) => {
                const st = STATUS_LABEL[o.status] || { label: o.status, color: '#9ca3af' };
                return (
                  <div key={o.id} style={styles.orderRow}>
                    <div style={styles.orderLeft}>
                      <div style={styles.orderName}>{o.shop_products?.name || '상품'}</div>
                      <div style={styles.orderDate}>
                        {new Date(o.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <div style={styles.orderRight}>
                      <div style={{ color: '#7c3aed', fontWeight: 700 }}>+{o.stars_to_award}개</div>
                      <div style={styles.orderAmount}>{formatPrice(o.amount)}</div>
                      <div style={{ ...styles.statusBadge, background: st.color }}>{st.label}</div>
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

// ─── 스타일 ───────────────────────────────────
const styles: Record<string, any> = {
  container: (sidebarOpen?: boolean) => ({
    flex: 1,
    minHeight: '100vh',
    background: '#f7f7fa',
    overflowY: 'auto' as const,
    marginLeft: sidebarOpen ? 0 : 0,
  }),
  inner: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 16px 40px',
  },
  loadingText: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#9ca3af',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#1e1b4b',
    margin: 0,
  },
  balanceBadge: {
    background: '#ede9fe',
    color: '#7c3aed',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: '0.85rem',
  },
  section: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 16px',
    marginBottom: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#374151',
    marginBottom: 14,
    marginTop: 0,
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  productCard: (selected: boolean) => ({
    border: selected ? '2px solid #7c3aed' : '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '16px 10px',
    background: selected ? '#faf5ff' : '#fff',
    cursor: 'pointer',
    textAlign: 'center' as const,
    position: 'relative' as const,
    transition: 'all 0.15s',
  }),
  productStars: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1e1b4b',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginTop: 6,
  },
  bonusBadge: {
    fontSize: '0.7rem',
    background: '#fef3c7',
    color: '#d97706',
    borderRadius: 6,
    padding: '2px 6px',
    display: 'inline-block',
    marginBottom: 2,
  },
  discountBadge: {
    fontSize: '0.7rem',
    color: '#7c3aed',
    fontWeight: 600,
    marginTop: 2,
  },
  formRow: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: 500,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: '0.95rem',
    background: '#fff',
    color: '#374151',
    boxSizing: 'border-box' as const,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: '0.95rem',
    color: '#374151',
    boxSizing: 'border-box' as const,
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: 10,
  },
  issueBtn: (disabled: boolean) => ({
    width: '100%',
    padding: '13px 0',
    borderRadius: 12,
    border: 'none',
    background: disabled ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 4,
    transition: 'background 0.2s',
  }),
  accountBox: {
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    borderRadius: 16,
    padding: '20px 16px',
    marginBottom: 16,
  },
  accountTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    color: '#065f46',
    marginBottom: 14,
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: '0.85rem',
    color: '#6b7280',
    minWidth: 70,
  },
  accountValue: {
    fontSize: '0.95rem',
    color: '#1e1b4b',
    fontWeight: 500,
    wordBreak: 'break-all' as const,
  },
  copyBtn: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 10,
    border: '1.5px solid #10b981',
    background: '#fff',
    color: '#10b981',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: 12,
    marginBottom: 10,
  },
  accountNotice: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    lineHeight: 1.6,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '0.9rem',
    padding: '16px 0',
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  orderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  orderLeft: {},
  orderName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#374151',
  },
  orderDate: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginTop: 2,
  },
  orderRight: {
    textAlign: 'right' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 2,
  },
  orderAmount: {
    fontSize: '0.82rem',
    color: '#6b7280',
  },
  statusBadge: {
    fontSize: '0.72rem',
    color: '#fff',
    borderRadius: 8,
    padding: '2px 8px',
    fontWeight: 600,
  },
};

export default ShopPage;
