import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { shopApi } from '../../services/api';

// ─── 스타일 ───────────────────────────────────
const Container = styled.div<{ $sidebarOpen?: boolean }>`
  flex: 1;
  margin-left: ${(p) => (p.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: #f8f9fa;
  transition: margin-left 0.3s;
  @media (max-width: 768px) { margin-left: 0; padding: 1rem; }
`;

const Content = styled.div`max-width: 1100px; margin: 0 auto;`;

const Title = styled.h1`font-size: 24px; font-weight: 700; color: #1f2933; margin-bottom: 4px;`;
const SubTitle = styled.p`font-size: 13px; color: #6b7280; margin-bottom: 24px;`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
`;

const StatCard = styled.div<{ $accent?: string }>`
  background: #fff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border-left: 4px solid ${(p) => p.$accent || '#e5e7eb'};
`;

const StatLabel = styled.div`font-size: 12px; color: #9ca3af; margin-bottom: 4px;`;
const StatValue = styled.div`font-size: 22px; font-weight: 700; color: #1f2933;`;
const StatSub = styled.div`font-size: 12px; color: #6b7280; margin-top: 2px;`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid ${(p) => (p.$active ? '#7c3aed' : '#e5e7eb')};
  background: ${(p) => (p.$active ? '#7c3aed' : '#fff')};
  color: ${(p) => (p.$active ? '#fff' : '#374151')};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
`;

const RefreshBtn = styled.button`
  margin-left: auto;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
`;

const Th = styled.th`
  background: #f3f4f6;
  padding: 10px 12px;
  text-align: left;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 10px 12px;
  font-size: 13px;
  color: #374151;
  border-top: 1px solid #f3f4f6;
  vertical-align: middle;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  background: ${(p) => p.$color};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 13px;
  border-radius: 8px;
  border: 1.5px solid ${(p) => (p.$active ? '#7c3aed' : '#e5e7eb')};
  background: ${(p) => (p.$active ? '#7c3aed' : '#fff')};
  color: ${(p) => (p.$active ? '#fff' : '#374151')};
  font-size: 13px;
  cursor: pointer;
`;

const Empty = styled.div`text-align: center; padding: 40px 0; color: #9ca3af; font-size: 14px;`;

// ─── 상수 ─────────────────────────────────────
const STATUS_INFO: Record<string, { label: string; color: string }> = {
  PENDING:             { label: '처리중',   color: '#f59e0b' },
  WAITING_FOR_DEPOSIT: { label: '입금대기', color: '#3b82f6' },
  DONE:                { label: '충전완료', color: '#10b981' },
  CANCELED:            { label: '취소됨',  color: '#9ca3af' },
  FAILED:              { label: '실패',    color: '#ef4444' },
  ALL:                 { label: '전체',    color: '#6b7280' },
};

const STATUS_FILTERS = ['ALL', 'DONE', 'WAITING_FOR_DEPOSIT', 'CANCELED', 'FAILED', 'PENDING'];
const PAGE_SIZE = 50;

function fmtPrice(n: number) {
  return n?.toLocaleString('ko-KR') + '원';
}

function fmtDate(s: string) {
  if (!s) return '-';
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── 컴포넌트 ─────────────────────────────────
interface AdminPaymentPageProps {
  sidebarOpen?: boolean;
}

const AdminPaymentPage: React.FC<AdminPaymentPageProps> = ({ sidebarOpen }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        shopApi.adminGetOrders({ status: statusFilter, page, limit: PAGE_SIZE }),
        shopApi.adminGetStats(),
      ]);
      setOrders(ordersRes.orders || []);
      setTotal(ordersRes.total || 0);
      setStats(statsRes.stats);
    } catch (e) {
      console.error('[AdminPaymentPage] 조회 오류:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleFilterChange = (f: string) => {
    setStatusFilter(f);
    setPage(1);
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Content>
        <Title>결제 내역 관리</Title>
        <SubTitle>가상계좌 별 충전 결제 현황 및 내역을 확인합니다.</SubTitle>

        {/* 통계 카드 */}
        {stats && (
          <StatsGrid>
            <StatCard $accent="#10b981">
              <StatLabel>충전 완료</StatLabel>
              <StatValue>{stats.DONE?.count ?? 0}건</StatValue>
              <StatSub>{fmtPrice(stats.DONE?.amount ?? 0)}</StatSub>
            </StatCard>
            <StatCard $accent="#3b82f6">
              <StatLabel>입금 대기</StatLabel>
              <StatValue>{stats.WAITING_FOR_DEPOSIT?.count ?? 0}건</StatValue>
              <StatSub>{fmtPrice(stats.WAITING_FOR_DEPOSIT?.amount ?? 0)}</StatSub>
            </StatCard>
            <StatCard $accent="#9ca3af">
              <StatLabel>취소됨</StatLabel>
              <StatValue>{stats.CANCELED?.count ?? 0}건</StatValue>
              <StatSub>{fmtPrice(stats.CANCELED?.amount ?? 0)}</StatSub>
            </StatCard>
            <StatCard $accent="#ef4444">
              <StatLabel>실패</StatLabel>
              <StatValue>{stats.FAILED?.count ?? 0}건</StatValue>
              <StatSub>—</StatSub>
            </StatCard>
            <StatCard $accent="#7c3aed">
              <StatLabel>전체</StatLabel>
              <StatValue>{stats.total ?? 0}건</StatValue>
              <StatSub>누적</StatSub>
            </StatCard>
          </StatsGrid>
        )}

        {/* 필터 + 새로고침 */}
        <FilterRow>
          {STATUS_FILTERS.map((f) => (
            <FilterBtn key={f} $active={statusFilter === f} onClick={() => handleFilterChange(f)}>
              {STATUS_INFO[f]?.label ?? f}
            </FilterBtn>
          ))}
          <RefreshBtn onClick={fetchAll}>↻ 새로고침</RefreshBtn>
        </FilterRow>

        {/* 테이블 */}
        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : orders.length === 0 ? (
          <Empty>내역이 없습니다.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>주문번호</Th>
                  <Th>닉네임</Th>
                  <Th>이메일</Th>
                  <Th>상품</Th>
                  <Th>금액</Th>
                  <Th>별</Th>
                  <Th>은행</Th>
                  <Th>입금자명</Th>
                  <Th>상태</Th>
                  <Th>입금 기한</Th>
                  <Th>입금 완료</Th>
                  <Th>주문 일시</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const si = STATUS_INFO[o.status] || { label: o.status, color: '#9ca3af' };
                  return (
                    <tr key={o.id}>
                      <Td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>
                        {o.order_id?.slice(0, 8)}…
                      </Td>
                      <Td>{o.users?.nickname ?? '-'}</Td>
                      <Td style={{ fontSize: 11 }}>{o.users?.email ?? '-'}</Td>
                      <Td>{o.shop_products?.name ?? '-'}</Td>
                      <Td style={{ fontWeight: 600 }}>{fmtPrice(o.amount)}</Td>
                      <Td style={{ color: '#7c3aed', fontWeight: 700 }}>+{o.stars_to_award}</Td>
                      <Td>{o.bank_code ?? '-'}</Td>
                      <Td>{o.customer_name ?? '-'}</Td>
                      <Td>
                        <StatusBadge $color={si.color}>{si.label}</StatusBadge>
                      </Td>
                      <Td style={{ fontSize: 12 }}>{fmtDate(o.due_date)}</Td>
                      <Td style={{ fontSize: 12 }}>{o.deposited_at ? fmtDate(o.deposited_at) : '-'}</Td>
                      <Td style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <Pagination>
                <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</PageBtn>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
                    <PageBtn key={p} $active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
                  ))}
                <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</PageBtn>
              </Pagination>
            )}
          </>
        )}
      </Content>
    </Container>
  );
};

export default AdminPaymentPage;
