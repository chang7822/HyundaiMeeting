import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api.ts';

const Container = styled.div<{ $sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 20px;
`;

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
`;

const SummaryCard = styled.div`
  flex: 1;
  min-width: 220px;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  border-radius: 16px;
  padding: 14px 18px;
  box-shadow: 0 4px 10px rgba(79,70,229,0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #4b5563;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
`;

const SummarySub = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  th, td {
    border-bottom: 1px solid #eee;
    padding: 8px 6px;
    text-align: center;
    white-space: nowrap;
    font-size: 0.85rem;
  }
  th {
    background: #f7f7fa;
    font-weight: 600;
  }
  tr:hover td {
    background: #f9fafb;
  }
`;

const EntryButton = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: #7C3AED; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1600;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 20px 22px 18px;
  width: 95vw;
  max-width: 720px;
  max-height: 80vh;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.4);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ModalTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
`;

const ModalCloseBtn = styled.button`
  border: none;
  background: none;
  font-size: 1.2rem;
  cursor: pointer;
`;

const ModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-top: 4px;
`;

const Badge = styled.span<{ $type?: 'success' | 'danger' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $type }) =>
    $type === 'success' ? '#047857' : $type === 'danger' ? '#b91c1c' : '#4b5563'};
  background: ${({ $type }) =>
    $type === 'success'
      ? 'rgba(16,185,129,0.15)'
      : $type === 'danger'
      ? 'rgba(248,113,113,0.18)'
      : '#e5e7eb'};
`;

interface ExtraMatchingAdminPageProps {
  sidebarOpen?: boolean;
}

const ExtraMatchingAdminPage: React.FC<ExtraMatchingAdminPageProps> = ({ sidebarOpen = true }) => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [appliesModal, setAppliesModal] = useState<{
    open: boolean;
    entry: any | null;
    items: any[];
    loading: boolean;
  }>({
    open: false,
    entry: null,
    items: [],
    loading: false,
  });

  useEffect(() => {
    const loadPeriods = async () => {
      setLoadingPeriods(true);
      try {
        const res = await adminApi.getExtraMatchingPeriodsSummary();
        setPeriods(Array.isArray(res) ? res : []);
      } catch (e) {
        console.error('[ExtraMatchingAdmin] 회차 요약 조회 오류:', e);
        toast.error('추가 매칭 회차 정보를 불러오지 못했습니다.');
        setPeriods([]);
      } finally {
        setLoadingPeriods(false);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) {
      setEntries([]);
      return;
    }
    const loadEntries = async () => {
      setLoadingEntries(true);
      try {
        const res = await adminApi.getExtraMatchingEntriesByPeriod(selectedPeriodId);
        setEntries(Array.isArray(res) ? res : []);
      } catch (e) {
        console.error('[ExtraMatchingAdmin] 엔트리 조회 오류:', e);
        toast.error('추가 매칭 도전 엔트리를 불러오지 못했습니다.');
        setEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };
    loadEntries();
  }, [selectedPeriodId]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || null;

  const handleOpenApplies = async (entry: any) => {
    setAppliesModal({
      open: true,
      entry,
      items: [],
      loading: true,
    });
    try {
      const res = await adminApi.getExtraMatchingAppliesByEntry(entry.id);
      setAppliesModal(prev => ({
        ...prev,
        loading: false,
        items: Array.isArray(res) ? res : [],
      }));
    } catch (e) {
      console.error('[ExtraMatchingAdmin] 호감 내역 조회 오류:', e);
      toast.error('해당 도전에 대한 호감 내역을 불러오지 못했습니다.');
      setAppliesModal(prev => ({
        ...prev,
        loading: false,
        items: [],
      }));
    }
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Title>추가 매칭도전 현황</Title>
      <Description>
        회차별로 추가 매칭 도전 등록자와 호감 보낸 사람, 승낙/거절 상태를 한눈에 확인할 수 있는 화면입니다.
      </Description>

      <FilterRow>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>회차 선택</span>
        <Select
          value={selectedPeriodId ?? ''}
          onChange={(e) =>
            setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">회차를 선택하세요</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {`${p.id}회차 (${p.status || '상태없음'})`}
            </option>
          ))}
        </Select>
        {loadingPeriods && <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>회차 불러오는 중...</span>}
      </FilterRow>

      {selectedPeriod && (
        <SummaryRow>
          <SummaryCard>
            <SummaryLabel>추가 매칭 도전 등록 수</SummaryLabel>
            <SummaryValue>{selectedPeriod.extraEntryCount}</SummaryValue>
            <SummarySub>해당 회차에서 추가 매칭 도전을 등록한 인원 수</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>호감 보내기 수</SummaryLabel>
            <SummaryValue>{selectedPeriod.extraApplyCount}</SummaryValue>
            <SummarySub>추가 매칭 도전에 대해 보낸 호감 총 건수</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>추가 매칭 성사 건수</SummaryLabel>
            <SummaryValue>{selectedPeriod.extraMatchedCount}</SummaryValue>
            <SummarySub>추가 매칭 도전을 통해 매칭이 성사된 건수</SummarySub>
          </SummaryCard>
        </SummaryRow>
      )}

      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <th>엔트리 ID</th>
              <th>닉네임</th>
              <th>성별</th>
              <th>상태</th>
              <th>총 호감</th>
              <th>대기</th>
              <th>승낙</th>
              <th>거절</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {loadingEntries ? (
              <tr>
                <td colSpan={9} style={{ padding: '24px 0', color: '#6b7280' }}>
                  엔트리를 불러오는 중입니다...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '24px 0', color: '#6b7280' }}>
                  선택된 회차의 추가 매칭 도전 내역이 없습니다.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.profile?.nickname || '-'}</td>
                  <td>{e.gender === 'male' ? '남성' : e.gender === 'female' ? '여성' : '-'}</td>
                  <td>{e.status}</td>
                  <td>{e.stats?.totalApplies ?? 0}</td>
                  <td>{e.stats?.pendingApplies ?? 0}</td>
                  <td>{e.stats?.acceptedApplies ?? 0}</td>
                  <td>{e.stats?.rejectedApplies ?? 0}</td>
                  <td>
                    <EntryButton type="button" onClick={() => handleOpenApplies(e)}>
                      호감 내역
                    </EntryButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrapper>

      {appliesModal.open && (
        <ModalOverlay
          onClick={() => setAppliesModal({ open: false, entry: null, items: [], loading: false })}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                엔트리 #{appliesModal.entry?.id} – {appliesModal.entry?.profile?.nickname || '닉네임 없음'}
              </ModalTitle>
              <ModalCloseBtn
                type="button"
                onClick={() => setAppliesModal({ open: false, entry: null, items: [], loading: false })}
              >
                ×
              </ModalCloseBtn>
            </ModalHeader>
            <ModalBody>
              {appliesModal.loading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280' }}>
                  호감 내역을 불러오는 중입니다...
                </div>
              ) : appliesModal.items.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280' }}>
                  이 도전에 대한 호감 내역이 없습니다.
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>신청 ID</th>
                      <th>보낸 닉네임</th>
                      <th>성별</th>
                      <th>상태</th>
                      <th>보낸 시각</th>
                      <th>처리 시각</th>
                      <th>환불</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliesModal.items.map((a) => (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td>{a.profile?.nickname || '-'}</td>
                        <td>{a.profile?.gender === 'male' ? '남성' : a.profile?.gender === 'female' ? '여성' : '-'}</td>
                        <td>
                          {a.status === 'accepted' && <Badge $type="success">승낙</Badge>}
                          {a.status === 'rejected' && <Badge $type="danger">거절</Badge>}
                          {a.status === 'pending' && <Badge $type="pending">대기중</Badge>}
                          {!a.status && '-'}
                        </td>
                        <td>{a.created_at}</td>
                        <td>{a.updated_at || '-'}</td>
                        <td>{a.refunded ? '환불됨' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default ExtraMatchingAdminPage;


