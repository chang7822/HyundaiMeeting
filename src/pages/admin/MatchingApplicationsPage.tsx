import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import { FaSort, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { apiUrl, adminMatchingApi } from '../../services/api.ts';
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
Modal.setAppElement('#root');

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

function isMutualMatch(a: any, b: any) {
  // 나이: 최소/최대 출생연도 = 내 출생연도 - preferred_age_max/min (min: 연상, max: 연하)
  const a_min_birth = a.birth_year - (a.preferred_age_max ?? 0); // 연상(나이 많은 쪽)
  const a_max_birth = a.birth_year - (a.preferred_age_min ?? 0); // 연하(나이 어린 쪽)
  const b_min_birth = b.birth_year - (b.preferred_age_max ?? 0);
  const b_max_birth = b.birth_year - (b.preferred_age_min ?? 0);
  if (b.birth_year < a_min_birth || b.birth_year > a_max_birth) return false;
  if (a.birth_year < b_min_birth || a.birth_year > b_max_birth) return false;
  // 키
  if (b.height < (a.preferred_height_min ?? 0) || b.height > (a.preferred_height_max ?? 999)) return false;
  if (a.height < (b.preferred_height_min ?? 0) || a.height > (b.preferred_height_max ?? 999)) return false;
  // 체형 - 매칭 알고리즘과 동일한 로직
  const aBody = a.preferred_body_types ? (Array.isArray(a.preferred_body_types) ? a.preferred_body_types : (typeof a.preferred_body_types === 'string' ? JSON.parse(a.preferred_body_types) : [])) : [];
  const bBody = b.body_type ? (Array.isArray(b.body_type) ? b.body_type : (typeof b.body_type === 'string' ? JSON.parse(b.body_type) : [])) : [];
  if (aBody.length > 0 && bBody.length > 0 && !aBody.some((type: string) => bBody.includes(type))) return false;
  const bPrefBody = b.preferred_body_types ? (Array.isArray(b.preferred_body_types) ? b.preferred_body_types : (typeof b.preferred_body_types === 'string' ? JSON.parse(b.preferred_body_types) : [])) : [];
  const aRealBody = a.body_type ? (Array.isArray(a.body_type) ? a.body_type : (typeof a.body_type === 'string' ? JSON.parse(a.body_type) : [])) : [];
  if (bPrefBody.length > 0 && aRealBody.length > 0 && !bPrefBody.some((type: string) => aRealBody.includes(type))) return false;
  // 직군
  const aJob = Array.isArray(a.preferred_job_types) ? a.preferred_job_types : (a.preferred_job_types ? JSON.parse(a.preferred_job_types) : []);
  const bJob = Array.isArray(b.preferred_job_types) ? b.preferred_job_types : (b.preferred_job_types ? JSON.parse(b.preferred_job_types) : []);
  if (aJob.length > 0 && !aJob.includes(b.job_type)) return false;
  if (bJob.length > 0 && !bJob.includes(a.job_type)) return false;
  // 결혼상태
  const aMarital = Array.isArray(a.preferred_marital_statuses) ? a.preferred_marital_statuses : (a.preferred_marital_statuses ? JSON.parse(a.preferred_marital_statuses) : []);
  const bMarital = Array.isArray(b.preferred_marital_statuses) ? b.preferred_marital_statuses : (b.preferred_marital_statuses ? JSON.parse(b.preferred_marital_statuses) : []);
  if (aMarital.length > 0 && (!b.marital_status || !aMarital.includes(b.marital_status))) return false;
  if (bMarital.length > 0 && (!a.marital_status || !bMarital.includes(a.marital_status))) return false;
  return true;
}

const MatchingApplicationsPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('applied_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<any>(null);
  const [matchableMap, setMatchableMap] = useState<{[userId:string]: any[]}>({});
  const [matchableModal, setMatchableModal] = useState<{open:boolean, list:any[]}>({open:false, list:[]});
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
    if (sortKey === 'user_id' && a.profile && b.profile) {
      v1 = a.profile.nickname || '';
      v2 = b.profile.nickname || '';
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

  // 신청자 데이터 변경 시 매칭 가능 인원 계산
  useEffect(() => {
    // 1. user_id 기준으로 가장 최근 신청만 남기기 (중복 제거)
    const latestAppsMap = new Map();
    for (const app of applications) {
      if (!latestAppsMap.has(app.user_id) || new Date(app.applied_at) > new Date(latestAppsMap.get(app.user_id).applied_at)) {
        latestAppsMap.set(app.user_id, app);
      }
    }
    // [수정] periodId가 'all'이 아니면 해당 회차만, 'all'이면 전체
    const filteredApps = periodId === 'all'
      ? Array.from(latestAppsMap.values())
      : Array.from(latestAppsMap.values()).filter(a => String(a.period_id) === String(periodId));
    // 2. 같은 회차 신청자만(취소 제외)
    const validApps = filteredApps.filter(a => !a.cancelled && a.profile && a.profile.birth_year && a.profile.height);
    const map: {[userId:string]: any[]} = {};
    for (const a of validApps) {
      // others도 반드시 취소자 제외 및 중복 제거
      const others = validApps.filter(b => b.user_id !== a.user_id && !b.cancelled);
      map[a.user_id] = others.filter(b => isMutualMatch(a.profile, b.profile));
    }
    setMatchableMap(map);
  }, [applications, periodId]);

  // 회차 인덱스 → 연속 번호로 변환 함수
  const getPeriodDisplayNumber = (period_id: number|string) => {
    const idx = logs.findIndex(log => String(log.id) === String(period_id));
    return idx >= 0 ? idx + 1 : period_id;
  };

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
                <th>매칭가능</th>
              </tr>
            </thead>
            <tbody>
              {sortedApps.map(app => (
                <tr key={app.id} style={app.cancelled ? { color: '#aaa' } : {}}>
                  <td>
                    <NicknameBtn onClick={()=>openModal(app)} style={app.cancelled ? { color: '#aaa', textDecoration: 'line-through' } : {}}>{app.profile?.nickname || '-'}</NicknameBtn>
                  </td>
                  <td>{app.user?.email || '-'}</td>
                  <td>{formatKST(app.applied_at)}</td>
                  <td>{app.cancelled ? formatKST(app.cancelled_at) : '-'}</td>
                  <td>{app.matched ? <FaCheck color="#4F46E5"/> : <FaTimes color="#aaa"/>}</td>
                  <td>{app.partner ? (app.partner.email || app.partner.id) : '-'}</td>
                  <td>{getPeriodDisplayNumber(app.period_id)}</td>
                  <td>
                    {!app.cancelled && (
                      <Button style={{padding:'4px 10px',fontSize:'1em'}} onClick={()=>setMatchableModal({open:true, list:matchableMap[app.user_id]||[]})}>
                        {matchableMap[app.user_id]?.length ?? 0}명
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableWrapper>
      {/* 프로필/선호 모달 */}
      <ProfileDetailModal isOpen={modalOpen} onRequestClose={closeModal} user={modalUser?.profile ? { ...modalUser.profile, email: modalUser.user?.email } : null} />
      {/* 매칭가능 닉네임 목록 모달 */}
      <Modal
        isOpen={matchableModal.open}
        onRequestClose={()=>setMatchableModal({open:false, list:[]})}
        style={{content:{maxWidth:340,minWidth:200,margin:'auto',borderRadius:14,padding:18,overflowY:'auto'}}}
        contentLabel="매칭 가능 인원 목록"
      >
        <h3 style={{marginBottom:12,fontSize:'1.1rem',color:'#4F46E5'}}>매칭 가능 인원</h3>
        {matchableModal.list.length === 0 ? <div style={{color:'#888'}}>매칭 가능한 인원이 없습니다.</div> : (
          <ul style={{padding:0,margin:0,listStyle:'none',maxHeight:320,overflowY:'auto'}}>
            {matchableModal.list.filter(b => {
              // 혹시라도 매칭 가능 인원 리스트에 취소자가 포함되어 있으면 제외
              const app = applications.find(a => a.user_id === b.user_id && !a.cancelled);
              return app;
            }).map((b:any)=> (
              <li key={b.user_id} style={{marginBottom:6}}>
                <NicknameBtn onClick={()=>{openModal(applications.find(a=>a.user_id===b.user_id && !a.cancelled)); setMatchableModal({open:false,list:[]});}}>
                  {b.profile?.nickname || b.nickname || b.user_id}
                </NicknameBtn>
              </li>
            ))}
          </ul>
        )}
        <Button onClick={()=>setMatchableModal({open:false,list:[]})} style={{marginTop:10,width:'100%'}}>닫기</Button>
      </Modal>
    </Container>
  );
};

export { MatchingApplicationsPage }; 