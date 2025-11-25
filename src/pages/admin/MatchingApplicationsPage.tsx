import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import { FaSort, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { adminMatchingApi } from '../../services/api.ts';
import InlineSpinner from '../../components/InlineSpinner.tsx';

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
  margin-bottom: 24px;
`;
const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
`;
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  th, td {
    border-bottom: 1px solid #eee;
    padding: 10px 8px;
    text-align: center;
    white-space: nowrap;
  }
  th {
    background: #f7f7fa;
    font-weight: 600;
    cursor: pointer;
  }
`;
const Button = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-weight: 600;
  margin: 0 4px;
  cursor: pointer;
  &:hover { background: #5b21b6; }
`;
const NicknameBtn = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: #7C3AED; }
`;
const StyledSelect = styled.select`
  padding: 10px 36px 10px 14px;
  border-radius: 8px;
  border: 1.5px solid #7C3AED;
  background: #f7f7fa url('data:image/svg+xml;utf8,<svg fill="%237C3AED" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 8.293a1 1 0 011.414 0L10 9.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>') no-repeat right 12px center/18px 18px;
  font-size: 1.05rem;
  font-weight: 500;
  color: #4F46E5;
  outline: none;
  min-width: 120px;
  cursor: pointer;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(80,60,180,0.04);
  &:hover, &:focus {
    border: 1.5px solid #5b21b6;
    box-shadow: 0 2px 8px rgba(80,60,180,0.10);
    background-color: #ede7f6;
  }
`;
const TabWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 12px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  color: ${props => props.$active ? '#fff' : '#4F46E5'};
  background: ${props => props.$active ? '#7C3AED' : '#ede7f6'};
  transition: all 0.2s ease;
`;

const CompatibilityList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
`;

const CompatibilityRow = styled.div<{ $mutual: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${props => props.$mutual ? 'rgba(16,185,129,0.12)' : '#f8f9fa'};
  border: 1px solid ${props => props.$mutual ? 'rgba(16,185,129,0.4)' : 'transparent'};
  & + & {
    margin-top: 10px;
  }
`;

const Badge = styled.span<{ $positive?: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.$positive ? '#0f766e' : '#6b7280'};
  background: ${props => props.$positive ? 'rgba(45,212,191,0.2)' : '#e5e7eb'};
  border-radius: 999px;
  padding: 4px 10px;
`;

const EmptyRow = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 40px 0;
`;
Modal.setAppElement('#root');

const pickPreferenceFields = (profile?: any | null) => {
  if (!profile) return null;
  const prefs: Record<string, any> = {};
  Object.keys(profile).forEach(key => {
    if (key.startsWith('preferred_')) {
      prefs[key] = profile[key];
    }
  });
  return Object.keys(prefs).length ? prefs : null;
};

const getProfileSnapshot = (application: any) => {
  if (!application) return null;
  return application.profile_snapshot ?? application.profile ?? null;
};

const getPreferenceSnapshot = (application: any) => {
  if (!application) return null;
  if (application.preference_snapshot) return application.preference_snapshot;
  const profile = getProfileSnapshot(application);
  return pickPreferenceFields(profile);
};

const buildSnapshotPayload = (application: any) => {
  const profile = getProfileSnapshot(application);
  const preference = getPreferenceSnapshot(application);
  if (!profile && !preference) return null;
  return {
    ...(profile || {}),
    ...(preference || {})
  };
};

function formatKST(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

const MatchingApplicationsPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('applied_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<any>(null);
const [compatModal, setCompatModal] = useState<{
  open: boolean;
  loading: boolean;
  data: { iPrefer: any[]; preferMe: any[] } | null;
  user: any;
  activeTab: 'iPrefer' | 'preferMe';
}>({
  open: false,
  loading: false,
  data: null,
  user: null,
  activeTab: 'iPrefer'
});
  const [loading, setLoading] = useState(true);

  // 회차 목록 불러오기
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await adminMatchingApi.getMatchingLogs();
        setLogs(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('회차 목록 조회 오류:', error);
        setLogs([]); // 에러 시 빈 배열로 설정
      }
    };
    loadLogs();
  }, []);
  // 신청 현황 불러오기
  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      try {
        const response = await adminMatchingApi.getMatchingApplications(periodId);
        setApplications(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('신청 현황 조회 오류:', error);
        toast.error('신청 현황 조회 실패');
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, [periodId]);

  // 소팅
  const sortedApps = [...applications].sort((a, b) => {
    let v1 = a[sortKey], v2 = b[sortKey];
    if (sortKey === 'user_id') {
      const profileA = buildSnapshotPayload(a);
      const profileB = buildSnapshotPayload(b);
      if (profileA && profileB) {
        v1 = profileA.nickname || '';
        v2 = profileB.nickname || '';
      }
    }
    if (v1 === undefined || v1 === null) v1 = '';
    if (v2 === undefined || v2 === null) v2 = '';
    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return sortAsc ? v1.localeCompare(v2) : v2.localeCompare(v1);
    }
    return sortAsc ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
  });

  // 모달 열기
  const openModal = (app: any) => {
    setModalUser(app);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalUser(null);
  };

  // 회차 인덱스 → 연속 번호로 변환 함수
const getPeriodDisplayNumber = (period_id: number|string) => {
    const idx = logs.findIndex(log => String(log.id) === String(period_id));
    return idx >= 0 ? idx + 1 : period_id;
  };

const openCompatibilityModal = async (app: any, tab: 'iPrefer' | 'preferMe') => {
  if (periodId === 'all') {
    toast.warn('회차를 선택한 후 확인해주세요.');
    return;
  }
  setCompatModal({
    open: true,
    loading: true,
    data: null,
    user: app,
    activeTab: tab
  });
  try {
    const data = await adminMatchingApi.getMatchingCompatibility(app.user_id, periodId);
    setCompatModal(prev => ({
      ...prev,
      loading: false,
      data
    }));
  } catch (error) {
    console.error('호환성 조회 오류:', error);
    toast.error('호환성 정보를 불러오지 못했습니다.');
    setCompatModal(prev => ({
      ...prev,
      loading: false
    }));
  }
};

const closeCompatibilityModal = () => {
  setCompatModal({
    open: false,
    loading: false,
    data: null,
    user: null,
    activeTab: 'iPrefer'
  });
};

const modalProfile = modalUser ? buildSnapshotPayload(modalUser) : null;
const compatProfile = compatModal.user ? buildSnapshotPayload(compatModal.user) : null;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Title>매칭 신청 현황</Title>
      <FilterRow>
        <span>회차:</span>
        <StyledSelect value={periodId} onChange={e=>setPeriodId(e.target.value)}>
          <option value="all">전체</option>
          {logs.map((log, idx) => (
            <option key={log.id} value={log.id}>{idx+1}회차 ({formatKST(log.application_start)})</option>
          ))}
        </StyledSelect>
      </FilterRow>
      <TableWrapper>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="신청 현황을 불러오는 중입니다..." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th onClick={()=>{setSortKey('user_id');setSortAsc(k=>!k);}}>닉네임 <FaSort /></th>
                <th onClick={()=>{setSortKey('user.email');setSortAsc(k=>!k);}}>이메일 <FaSort /></th>
                <th onClick={()=>{setSortKey('applied_at');setSortAsc(k=>!k);}}>신청시각 <FaSort /></th>
                <th onClick={()=>{setSortKey('cancelled_at');setSortAsc(k=>!k);}}>취소시각 <FaSort /></th>
                <th onClick={()=>{setSortKey('matched');setSortAsc(k=>!k);}}>매칭 <FaSort /></th>
                <th>상대방</th>
                <th>회차</th>
                <th>내가 선호하는</th>
                <th>나를 선호하는</th>
              </tr>
            </thead>
            <tbody>
              {sortedApps.map(app => {
                const profile = buildSnapshotPayload(app);
                return (
                <tr key={app.id} style={app.cancelled ? { color: '#aaa' } : {}}>
                  <td>
                    <NicknameBtn onClick={()=>openModal(app)} style={app.cancelled ? { color: '#aaa', textDecoration: 'line-through' } : {}}>{profile?.nickname || '-'}</NicknameBtn>
                  </td>
                  <td>{app.user?.email || '-'}</td>
                  <td>{formatKST(app.applied_at)}</td>
                  <td>{app.cancelled ? formatKST(app.cancelled_at) : '-'}</td>
                  <td>{app.matched ? <FaCheck color="#4F46E5"/> : <FaTimes color="#aaa"/>}</td>
                  <td>{app.partner ? (app.partner.email || app.partner.id) : '-'}</td>
                  <td>{getPeriodDisplayNumber(app.period_id)}</td>
                  <td>
                    {app.cancelled ? '-' : (
                      <Button
                        style={{ padding:'4px 10px', fontSize:'1em' }}
                        onClick={()=>openCompatibilityModal(app, 'iPrefer')}
                        disabled={periodId === 'all'}
                      >
                        보기
                      </Button>
                    )}
                  </td>
                  <td>
                    {app.cancelled ? '-' : (
                      <Button
                        style={{ padding:'4px 10px', fontSize:'1em', background:'#4F46E5' }}
                        onClick={()=>openCompatibilityModal(app, 'preferMe')}
                        disabled={periodId === 'all'}
                      >
                        보기
                      </Button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </Table>
        )}
      </TableWrapper>
      {/* 프로필/선호 모달 */}
      <ProfileDetailModal isOpen={modalOpen} onRequestClose={closeModal} user={modalProfile ? { ...modalProfile, email: modalUser?.user?.email } : null} />
      <Modal
        isOpen={compatModal.open}
        onRequestClose={closeCompatibilityModal}
        style={{content:{maxWidth:520,minWidth:320,margin:'auto',borderRadius:16,padding:24,overflowY:'auto'}}}
        contentLabel="매칭 선호 상세"
      >
        <h3 style={{ marginBottom: 8, fontSize: '1.2rem', color: '#4F46E5' }}>
          {compatProfile?.nickname || compatModal.user?.user?.email || '회원'}님의 매칭 선호
        </h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', fontSize: '0.9rem' }}>
          동일 회차 신청 여부와 과거 매칭 이력을 함께 확인할 수 있습니다.
        </p>
        <TabWrapper>
          <TabButton
            type="button"
            $active={compatModal.activeTab === 'iPrefer'}
            onClick={() => setCompatModal(prev => ({ ...prev, activeTab: 'iPrefer' }))}
          >
            내가 선호하는
          </TabButton>
          <TabButton
            type="button"
            $active={compatModal.activeTab === 'preferMe'}
            onClick={() => setCompatModal(prev => ({ ...prev, activeTab: 'preferMe' }))}
          >
            나를 선호하는
          </TabButton>
        </TabWrapper>
        {compatModal.loading ? (
          <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="데이터를 불러오는 중입니다..." />
          </div>
        ) : (
          <CompatibilityList>
            {(compatModal.data?.[compatModal.activeTab] || []).length === 0 ? (
              <EmptyRow>해당되는 회원이 없습니다.</EmptyRow>
            ) : (
              compatModal.data?.[compatModal.activeTab].map(item => (
                <CompatibilityRow key={item.user_id} $mutual={item.mutual}>
                  <div>
                    <strong>{item.nickname}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.email}</div>
                  </div>
                  <Badge $positive={item.applied}>신청 {item.applied ? 'O' : 'X'}</Badge>
                  <Badge $positive={item.hasHistory}>매칭이력 {item.hasHistory ? 'O' : 'X'}</Badge>
                </CompatibilityRow>
              ))
            )}
          </CompatibilityList>
        )}
        <Button onClick={closeCompatibilityModal} style={{ marginTop: 16, width: '100%' }}>닫기</Button>
      </Modal>
    </Container>
  );
};

export { MatchingApplicationsPage }; 