import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Modal from 'react-modal';
import { FaSort, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ProfileDetailModal from './ProfileDetailModal.tsx';
import { adminApi, adminMatchingApi, matchingApi } from '../../services/api.ts';
import InlineSpinner from '../../components/InlineSpinner.tsx';
import { getDisplayCompanyName } from '../../utils/companyDisplay.ts';

const Container = styled.div<{ $sidebarOpen: boolean }>`
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(80,60,180,0.08);
  padding: 32px 24px;
  max-width: 1200px;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: ${props => (window.innerWidth > 768 && props.$sidebarOpen) ? '280px' : '0'};
  
  @media (max-width: 768px) {
    margin: 1rem auto;
    margin-left: 0 !important;
    padding: 1.5rem 1rem;
    border-radius: 12px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #7C3AED;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #5b21b6;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    transition: transform 0.3s;
  }
  
  &:hover svg {
    transform: rotate(180deg);
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
`;

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    gap: 12px;
    margin-bottom: 12px;
  }
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
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    min-width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
  }
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #4b5563;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const SummarySub = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    overflow-x: visible;
  }
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
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileCardList = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 1.5rem;
  }
`;

const MobileCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  box-sizing: border-box;
  width: 100%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
`;

const MobileCardTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const MobileCardBottomRow = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #6b7280;
  flex-wrap: wrap;
  
  span {
    &:not(:last-child)::after {
      content: '·';
      margin-left: 0.5rem;
    }
  }
`;

const MobileButtonGroup = styled.div`
  display: flex;
  gap: 0.35rem;
`;

const CompactButton = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover { background: #5b21b6; }
  
  &:nth-child(2) {
    background: #4F46E5;
    &:hover { background: #4338ca; }
  }
`;

const Button = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-weight: 600;
  margin: 0 2px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  &:hover { background: #5b21b6; }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.85rem;
    flex: 1;
    margin: 0;
  }
`;

const NicknameBtn = styled.button`
  background: none;
  border: none;
  color: #4F46E5;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: #7C3AED; }
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const TabWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    gap: 6px;
    margin-bottom: 12px;
  }
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
  
  @media (max-width: 768px) {
    padding: 8px 10px;
    font-size: 0.9rem;
  }
`;

const CompatibilityList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
  
  @media (max-width: 768px) {
    max-height: 280px;
  }
`;

const CompatibilityRow = styled.div<{ $mutual: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${props => props.$mutual ? 'rgba(16,185,129,0.12)' : '#f8f9fa'};
  border: 1px solid ${props => props.$mutual ? 'rgba(16,185,129,0.4)' : 'transparent'};
  & + & {
    margin-top: 10px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr auto;
    gap: 8px;
    padding: 10px 12px;
  }
`;

const BadgeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
`;

const Badge = styled.span<{ $positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.$positive ? '#0f766e' : '#6b7280'};
  background: ${props => props.$positive ? 'rgba(45,212,191,0.2)' : '#e5e7eb'};
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 2px 8px;
  }
`;

const EmptyRow = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 40px 0;
  
  @media (max-width: 768px) {
    padding: 2rem 0;
    font-size: 0.9rem;
  }
`;

Modal.setAppElement('#root');

const FilterBar = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  
  @media (max-width: 768px) {
    min-width: 100%;
    font-size: 0.85rem;
  }
`;

const SortSelect = styled.select`
  padding: 0.6rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  
  @media (max-width: 768px) {
    flex: 1;
    font-size: 0.85rem;
  }
`;

const SortDirectionButton = styled.button`
  padding: 0.6rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4F46E5;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const UserMatchingOverviewPage = ({ sidebarOpen = true }: { sidebarOpen?: boolean }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<string>('nickname');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

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
    activeTab: 'iPrefer',
  });

  const [loading, setLoading] = useState(true);
  const [compatCounts, setCompatCounts] = useState<Record<string, { iPrefer: number; preferMe: number }>>({});
  const [loadingCompat, setLoadingCompat] = useState(false);
  const [compatProgress, setCompatProgress] = useState({ current: 0, total: 0 });
  const [reasonModal, setReasonModal] = useState<{ open: boolean; item: any | null }>({
    open: false,
    item: null,
  });

  const [currentPeriodStats, setCurrentPeriodStats] = useState<{
    total: number;
    male: number;
    female: number;
    unknown: number;
  } | null>(null);
  const [currentPeriodLoading, setCurrentPeriodLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await adminApi.getAllUsers();
        setUsers(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('[UserMatchingOverview] 사용자 목록 조회 오류:', error);
        toast.error('회원 목록을 불러오지 못했습니다.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // 현재 회차 기준 신청 인원(성별) 요약
  useEffect(() => {
    const loadCurrentPeriodStats = async () => {
      setCurrentPeriodLoading(true);
      try {
        const period = await matchingApi.getMatchingPeriod();
        const current = period && period.current ? period.current : null;
        if (!current || !current.id) {
          setCurrentPeriodStats(null);
          return;
        }
        const applications = await adminMatchingApi.getMatchingApplications(String(current.id));
        const appsArray = Array.isArray(applications) ? applications : [];
        const activeApps = appsArray.filter((app: any) => app.applied && !app.cancelled);
        let male = 0;
        let female = 0;
        let unknown = 0;
        activeApps.forEach((app: any) => {
          const profile = app.profile || app.profile_snapshot || null;
          const g = profile?.gender;
          if (g === 'male') male += 1;
          else if (g === 'female') female += 1;
          else unknown += 1;
        });
        setCurrentPeriodStats({
          total: activeApps.length,
          male,
          female,
          unknown,
        });
      } catch (error) {
        console.error('[UserMatchingOverview] 현재 회차 신청 현황 조회 오류:', error);
        setCurrentPeriodStats(null);
      } finally {
        setCurrentPeriodLoading(false);
      }
    };
    loadCurrentPeriodStats();
  }, []);

  const genderSummary = React.useMemo(() => {
    let male = 0;
    let female = 0;
    let unknown = 0;
    users.forEach(u => {
      if (u.gender === 'male') male += 1;
      else if (u.gender === 'female') female += 1;
      else unknown += 1;
    });
    return {
      total: users.length,
      male,
      female,
      unknown,
    };
  }, [users]);

  const [virtualModal, setVirtualModal] = useState<{
    open: boolean;
    loading: boolean;
    data: any | null;
  }>({
    open: false,
    loading: false,
    data: null,
  });

  const handleVirtualMatchCurrent = async () => {
    setVirtualModal({ open: true, loading: true, data: null });
    try {
      // 전체 회원(관리자/정지/비활성 제외)을 대상으로 현재 프로필/선호 기준 가상 매칭
      const res = await adminMatchingApi.virtualMatchLive();
      setVirtualModal({ open: true, loading: false, data: res });
    } catch (error) {
      console.error('[UserMatchingOverview] 가상 매칭 오류:', error);
      toast.error('가상 매칭 실행 중 오류가 발생했습니다.');
      setVirtualModal({ open: false, loading: false, data: null });
    }
  };

  // 전체 회원 호환 인원 수 조회 (버튼 클릭 시 실행)
  const fetchAllCompatCounts = async () => {
    if (!users.length) {
      toast.warn('조회할 회원이 없습니다.');
      return;
    }
    
    setLoadingCompat(true);
    setCompatProgress({ current: 0, total: users.length });
    const next: Record<string, { iPrefer: number; preferMe: number }> = {};
    
    let completed = 0;
    for (const u of users) {
      if (!u?.user_id) {
        completed++;
        setCompatProgress({ current: completed, total: users.length });
        continue;
      }
      
      const key = String(u.user_id);
      try {
        const data = await adminMatchingApi.getMatchingCompatibilityLive(key);
        next[key] = {
          iPrefer: Array.isArray(data?.iPrefer) ? data.iPrefer.length : 0,
          preferMe: Array.isArray(data?.preferMe) ? data.preferMe.length : 0,
        };
      } catch {
        // 에러가 나더라도 기본값 0 유지
        if (!next[key]) {
          next[key] = { iPrefer: 0, preferMe: 0 };
        }
      }
      
      completed++;
      setCompatProgress({ current: completed, total: users.length });
    }
    
    if (Object.keys(next).length) {
      setCompatCounts(prev => ({ ...prev, ...next }));
    }
    
    setLoadingCompat(false);
    toast.success('전체 회원 매칭 호환성 조회가 완료되었습니다!');
  };

  const sortedAndFilteredUsers = React.useMemo(() => {
    // 먼저 검색 필터 적용
    let filtered = users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = users.filter(user => {
        const nickname = (user.nickname || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const gender = user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '';
        return nickname.includes(query) || email.includes(query) || gender.includes(query);
      });
    }
    
    // 정렬 적용
    return [...filtered].sort((a, b) => {
      let v1: any = a[sortKey];
      let v2: any = b[sortKey];
      if (sortKey === 'nickname') {
        v1 = a.nickname || '';
        v2 = b.nickname || '';
      }
      if (v1 === undefined || v1 === null) v1 = '';
      if (v2 === undefined || v2 === null) v2 = '';
      if (typeof v1 === 'string' && typeof v2 === 'string') {
        return sortAsc ? v1.localeCompare(v2) : v2.localeCompare(v1);
      }
      return sortAsc ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
    });
  }, [users, sortKey, sortAsc, searchQuery]);

  const openProfileModal = (user: any) => {
    setSelectedUser(user);
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setSelectedUser(null);
  };

  const openCompatibilityModal = async (user: any, tab: 'iPrefer' | 'preferMe') => {
    // 주의: /admin/users 응답에서 user.id는 user_profiles.id(숫자)로 덮어쓰여 있으므로,
    // 실제 사용자 식별자는 user.user_id(문자열/uuid)를 사용해야 함.
    if (!user?.user_id) {
      toast.warn('회원 정보를 찾을 수 없습니다.');
      return;
    }
    setCompatModal({
      open: true,
      loading: true,
      data: null,
      user,
      activeTab: tab,
    });
    try {
      const data = await adminMatchingApi.getMatchingCompatibilityLive(String(user.user_id));
      // 버튼 옆에 표시할 인원 수 캐싱
      const iPreferCount = Array.isArray(data?.iPrefer) ? data.iPrefer.length : 0;
      const preferMeCount = Array.isArray(data?.preferMe) ? data.preferMe.length : 0;
      setCompatCounts(prev => ({
        ...prev,
        [String(user.user_id)]: {
          iPrefer: iPreferCount,
          preferMe: preferMeCount,
        },
      }));
      setCompatModal(prev => ({
        ...prev,
        loading: false,
        data,
      }));
    } catch (error) {
      console.error('[UserMatchingOverview] 호환성 조회 오류:', error);
      toast.error('호환성 정보를 불러오지 못했습니다.');
      setCompatModal(prev => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const closeCompatibilityModal = () => {
    setCompatModal({
      open: false,
      loading: false,
      data: null,
      user: null,
      activeTab: 'iPrefer',
    });
  };

  const compatProfile = compatModal.user;

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <TitleRow>
        <Title>회원 매칭 조회 (전체 회원 기준)</Title>
        <RefreshButton onClick={() => window.location.reload()}>
          <FaSyncAlt />
          새로고침
        </RefreshButton>
      </TitleRow>

      <SummaryRow>
        <SummaryCard>
          <SummaryLabel>전체 회원</SummaryLabel>
          <SummaryValue>{genderSummary.total}명</SummaryValue>
          <SummarySub>
            남 {genderSummary.male}명 · 여 {genderSummary.female}명
            {genderSummary.unknown > 0 && ` · 기타/미입력 ${genderSummary.unknown}명`}
          </SummarySub>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>현재 회차 신청 현황</SummaryLabel>
          {currentPeriodLoading ? (
            <SummarySub>불러오는 중입니다...</SummarySub>
          ) : currentPeriodStats ? (
            <>
              <SummaryValue>{currentPeriodStats.total}명</SummaryValue>
              <SummarySub>
                남 {currentPeriodStats.male}명 · 여 {currentPeriodStats.female}명
                {currentPeriodStats.unknown > 0 && ` · 기타/미입력 ${currentPeriodStats.unknown}명`}
              </SummarySub>
            </>
          ) : (
            <SummarySub>진행 중인 회차가 없거나, 신청 내역이 없습니다.</SummarySub>
          )}
        </SummaryCard>
      </SummaryRow>

      {/* 검색 및 정렬 필터 */}
      <FilterBar>
        <SearchInput
          type="text"
          placeholder="닉네임, 이메일, 성별로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SortSelect value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="nickname">닉네임</option>
          <option value="gender">성별</option>
          <option value="email">이메일</option>
          <option value="created_at">가입일</option>
        </SortSelect>
        <SortDirectionButton onClick={() => setSortAsc(prev => !prev)}>
          {sortAsc ? '↑ 오름차순' : '↓ 내림차순'}
        </SortDirectionButton>
      </FilterBar>

      {/* 프로그레스 바 및 버튼 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          {loadingCompat && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                호환 인원 조회 중... ({compatProgress.current} / {compatProgress.total})
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(compatProgress.current / compatProgress.total) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #7C3AED 0%, #0EA5E9 100%)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
          <Button
            onClick={fetchAllCompatCounts}
            disabled={loadingCompat || loading}
            style={{ padding: '8px 14px', fontSize: '0.9rem', background: loadingCompat ? '#9ca3af' : '#7C3AED', margin: 0 }}
          >
            {loadingCompat ? '조회 중...' : '전체 조회'}
          </Button>
          <Button
            onClick={handleVirtualMatchCurrent}
            style={{ padding: '8px 14px', fontSize: '0.9rem', background: '#0EA5E9', margin: 0 }}
          >
            가상 매칭
          </Button>
        </div>
      </div>
      <TableWrapper>
        {loading ? (
          <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="회원 목록을 불러오는 중입니다..." />
          </div>
        ) : (
          <>
            <Table>
            <thead>
              <tr>
                <th onClick={() => { setSortKey('nickname'); setSortAsc(k => !k); }}>
                  닉네임 <FaSort />
                </th>
                <th onClick={() => { setSortKey('gender'); setSortAsc(k => !k); }}>
                  성별 <FaSort />
                </th>
                <th onClick={() => { setSortKey('email'); setSortAsc(k => !k); }}>
                  이메일 <FaSort />
                </th>
                <th onClick={() => { setSortKey('created_at'); setSortAsc(k => !k); }}>
                  가입일 <FaSort />
                </th>
                <th>내가 선호하는</th>
                <th>나를 선호하는</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredUsers.map(user => {
                const counts = compatCounts[String(user.user_id)] || { iPrefer: 0, preferMe: 0 };
                return (
                <tr key={user.id}>
                  <td>
                    <NicknameBtn onClick={() => openProfileModal(user)}>
                      {user.nickname || '-'}
                    </NicknameBtn>
                  </td>
                  <td>{user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '-'}</td>
                  <td>{user.email || '-'}</td>
                  <td>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td>
                    <Button
                      style={{ padding: '4px 10px', fontSize: '0.9em' }}
                      onClick={() => openCompatibilityModal(user, 'iPrefer')}
                    >
                      보기 ({counts.iPrefer})
                    </Button>
                  </td>
                  <td>
                    <Button
                      style={{ padding: '4px 10px', fontSize: '0.9em', background: '#4F46E5' }}
                      onClick={() => openCompatibilityModal(user, 'preferMe')}
                    >
                      보기 ({counts.preferMe})
                    </Button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </Table>
          
          {/* 모바일 카드 뷰 */}
          <MobileCardList>
            {sortedAndFilteredUsers.map(user => {
              const counts = compatCounts[String(user.user_id)] || { iPrefer: 0, preferMe: 0 };
              return (
                <MobileCard key={user.id}>
                  {/* 첫 줄: 닉네임 + 버튼 2개 */}
                  <MobileCardTopRow>
                    <NicknameBtn onClick={() => openProfileModal(user)} style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {user.nickname || '-'}
                    </NicknameBtn>
                    <MobileButtonGroup>
                      <CompactButton onClick={() => openCompatibilityModal(user, 'iPrefer')}>
                        내가({counts.iPrefer})
                      </CompactButton>
                      <CompactButton onClick={() => openCompatibilityModal(user, 'preferMe')}>
                        나를({counts.preferMe})
                      </CompactButton>
                    </MobileButtonGroup>
                  </MobileCardTopRow>
                  
                  {/* 둘째 줄: 성별, 이메일, 가입일 */}
                  <MobileCardBottomRow>
                    <span>{user.gender === 'male' ? '남성' : user.gender === 'female' ? '여성' : '-'}</span>
                    <span>{user.email || '-'}</span>
                    <span>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('ko-KR', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : '-'}
                    </span>
                  </MobileCardBottomRow>
                </MobileCard>
              );
            })}
          </MobileCardList>
          </>
        )}
      </TableWrapper>

      {/* 프로필/선호 모달 - 현재 프로필/선호 기준 */}
      <ProfileDetailModal
        isOpen={profileModalOpen}
        onRequestClose={closeProfileModal}
        user={selectedUser}
      />

      {/* 호환성 모달 - MatchingApplicationsPage와 동일 UI */}
      <Modal
        isOpen={compatModal.open}
        onRequestClose={closeCompatibilityModal}
        style={{ content: { maxWidth: 520, minWidth: 320, margin: 'auto', borderRadius: 16, padding: 24, overflowY: 'auto' } }}
        contentLabel="매칭 선호 상세 (현재 프로필 기준)"
      >
        <h3 style={{ marginBottom: 8, fontSize: '1.2rem', color: '#4F46E5' }}>
          {compatProfile?.nickname || compatProfile?.email || '회원'}님의 매칭 선호 (현재 기준)
        </h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', fontSize: '0.9rem' }}>
          현재 가입된 회원들의 프로필/선호 정보를 기준으로 내가 선호하는 / 나를 선호하는 회원을 확인합니다.
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
              compatModal.data?.[compatModal.activeTab].map((item: any) => {
                const foundUser = users.find(u => u.user_id === item.user_id);
                return (
                  <CompatibilityRow
                    key={item.user_id}
                    $mutual={item.mutual}
                    onClick={(e) => {
                      // Shift+클릭: 매칭 실패 사유 보기 (mutual이 false일 때만)
                      if (e.shiftKey && !item.mutual) {
                        setReasonModal({ open: true, item });
                      } else {
                        // 일반 클릭: 프로필 보기
                        if (foundUser) {
                          openProfileModal(foundUser);
                        }
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong>{item.nickname}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.email}</div>
                      {!item.mutual && (
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                          💡 Shift+클릭: 매칭 실패 사유
                        </div>
                      )}
                    </div>
                    <BadgeGroup>
                      <Badge $positive={item.applied}>신청 {item.applied ? 'O' : 'X'}</Badge>
                      <Badge $positive={item.hasHistory}>매칭이력 {item.hasHistory ? 'O' : 'X'}</Badge>
                    </BadgeGroup>
                  </CompatibilityRow>
                );
              })
            )}
          </CompatibilityList>
        )}
        <Button onClick={closeCompatibilityModal} style={{ marginTop: 16, width: '100%' }}>
          닫기
        </Button>
      </Modal>
      {/* 매칭 실패 사유 모달 */}
      <Modal
        isOpen={reasonModal.open}
        onRequestClose={() => setReasonModal({ open: false, item: null })}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            maxWidth: 480,
            minWidth: 280,
            borderRadius: 16,
            padding: 20,
          },
        }}
        contentLabel="매칭 실패 사유"
      >
        <h3 style={{ marginBottom: 8, fontSize: '1.1rem', color: '#4F46E5' }}>
          매칭이 성사되지 않은 이유
        </h3>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#6b7280', fontSize: '0.9rem' }}>
          회색 항목은 한쪽 또는 양쪽의 선호 조건이 맞지 않아 매칭이 되지 않은 경우입니다.
        </p>
        {reasonModal.item ? (
          <>
            {(() => {
              const item: any = reasonModal.item;
              const isIPreferTab = compatModal.activeTab === 'iPrefer';
              const reasons =
                isIPreferTab ? (item.reasonsFromOther || []) : (item.reasonsFromSubject || []);

              if (!reasons || reasons.length === 0) {
                return (
                  <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                    설정된 선호 조건에는 모두 맞지만, 다른 내부 조건으로 인해 매칭이 성사되지 않았습니다.
                  </p>
                );
              }

              const labelMap: Record<string, string> = {
                age: '나이',
                height: '키',
                body: '체형',
                job: '직군',
                marital: '결혼상태',
                region: '지역',
                company: '회사',
              };

              const ownerLabel = isIPreferTab ? '상대의' : '나의';
              const targetLabel = isIPreferTab ? '나의' : '상대의';

              return (
                <>
                  <ul style={{ paddingLeft: '0', listStyle: 'none', fontSize: '0.9rem', color: '#374151' }}>
                    {reasons.map((r: any, idx: number) => {
                      const fieldLabel = labelMap[r.key] || '';
                      return (
                        <li key={r.key || idx} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>
                            {idx + 1}. {r.title}
                          </div>
                          <div style={{ marginLeft: 8 }}>
                            - {ownerLabel} 선호 {fieldLabel ? `${fieldLabel}은` : '값은'} [{r.ownerPref}] 인데,
                            {' '}{targetLabel} {fieldLabel ? `${fieldLabel}은` : '값은'} [{r.targetValue}] 입니다.
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              );
            })()}
          </>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
            선택된 항목 정보가 없습니다.
          </p>
        )}
        <Button onClick={() => setReasonModal({ open: false, item: null })} style={{ marginTop: 16, width: '100%' }}>
          닫기
        </Button>
      </Modal>

      {/* 가상 매칭 결과 모달 (현재 회차 기준) */}
      <Modal
        isOpen={virtualModal.open}
        onRequestClose={() => setVirtualModal({ open: false, loading: false, data: null })}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            maxWidth: 520,
            minWidth: 320,
            maxHeight: '80vh',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        contentLabel="가상 매칭 결과 (전체 회원 기준)"
      >
        <h3 style={{ marginBottom: 8, fontSize: '1.2rem', color: '#0EA5E9' }}>전체 회원 가상 매칭 결과</h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', fontSize: '0.9rem' }}>
          실제 DB에는 반영되지 않은 시뮬레이션 결과입니다. 관리자/정지/비활성 계정을 제외한 전체 회원 기준 예상 커플 구성을 미리 확인할 수 있습니다.
        </p>
        {virtualModal.loading ? (
          <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <InlineSpinner text="가상 매칭을 실행하는 중입니다..." />
          </div>
        ) : !virtualModal.data || !virtualModal.data.couples?.length ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
            매칭 가능한 커플이 없습니다.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {virtualModal.data.couples.map((pair: any, idx: number) => (
              <div
                key={`${pair.male?.user_id || 'm'}-${pair.female?.user_id || 'f'}-${idx}`}
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  padding: '10px 12px',
                  background: '#f9fafb',
                  display: 'grid',
                  gridTemplateColumns: '1fr 24px 1fr',
                  alignItems: 'center',
                  columnGap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2 }}>남성</div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{pair.male?.nickname || '(닉네임 없음)'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{pair.male?.email || '-'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {pair.male?.birth_year ? `${pair.male.birth_year}년생` : ''}
                    {getDisplayCompanyName(pair.male?.company, pair.male?.custom_company_name) ? ` · ${getDisplayCompanyName(pair.male?.company, pair.male?.custom_company_name)}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6b7280' }}>
                  {idx + 1}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2 }}>여성</div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{pair.female?.nickname || '(닉네임 없음)'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{pair.female?.email || '-'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {pair.female?.birth_year ? `${pair.female.birth_year}년생` : ''}
                    {getDisplayCompanyName(pair.female?.company, pair.female?.custom_company_name) ? ` · ${getDisplayCompanyName(pair.female?.company, pair.female?.custom_company_name)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={() => setVirtualModal({ open: false, loading: false, data: null })}
          style={{ marginTop: 16, width: '100%' }}
        >
          닫기
        </Button>
      </Modal>
    </Container>
  );
};

export default UserMatchingOverviewPage;


