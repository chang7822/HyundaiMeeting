import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FaHeart, FaComments, FaUser, FaCalendarAlt, FaRegStar, FaRegClock, FaUserCircle, FaChevronRight, FaExclamationTriangle } from 'react-icons/fa';
import { matchingApi } from '../services/api.ts';
import { toast } from 'react-toastify';
import ProfileCard, { ProfileIcon } from '../components/ProfileCard.tsx';
import { userApi } from '../services/api.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

// 액션 타입 정의
type ActionItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  disabled: boolean;
};

type BaseQuickAction = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  disabled: boolean;
  custom?: boolean;
};

type ProfilePreferenceAction = {
  type: 'profile-preference';
  profileAction: ActionItem;
  preferenceAction: ActionItem;
};

type NoticeFaqAction = {
  type: 'notice-faq';
  noticeAction: ActionItem;
  faqAction: ActionItem;
};

type QuickAction = BaseQuickAction | ProfilePreferenceAction | NoticeFaqAction;

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1.5rem;
    padding-top: 80px;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    padding-top: 70px;
  }
`;

const WelcomeSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    padding: 2rem;
    margin-bottom: 1.5rem;
    border-radius: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 1.5rem;
    margin-bottom: 1rem;
    border-radius: 12px;
  }
`;

const WelcomeTitle = styled.h1`
  color: #333;
  margin-bottom: 0.8rem;
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 0.6rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.6rem;
    margin-bottom: 0.5rem;
  }
`;

const WelcomeSubtitle = styled.p`
  color: #666;
  font-size: 1.15rem;
  margin-bottom: 2.5rem;
  line-height: 1.5;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
`;

const ProfilePreferenceCard = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 1.2rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ActionCard = styled.div`
  background: white;
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
    border-color: rgba(102, 126, 234, 0.2);
  }
  
  &:active {
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 1.3rem;
    border-radius: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 1.2rem;
    border-radius: 14px;
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  color: #667eea;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  
  ${ActionCard}:hover & {
    transform: scale(1.1);
  }
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-right: 0.8rem;
  }
`;

const ActionTitle = styled.h3`
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.4rem;
  }
`;

const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.8rem;
  }
`;

const ActionDescription = styled.p`
  color: #666;
  font-size: 1.05rem;
  line-height: 1.5;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.4;
  }
`;

const HalfWidthCard = styled(ActionCard)`
  min-width: 0;
  padding: 1.2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.9rem;
  }
`;

const HalfWidthIcon = styled(ActionIcon)`
  font-size: 1.8rem;
  margin-right: 0.8rem;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin-right: 0.7rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-right: 0.6rem;
  }
`;

const HalfWidthTitle = styled(ActionTitle)`
  font-size: 1.1rem;
  margin-bottom: 0.4rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 0.3rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const HalfWidthHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.8rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.7rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.6rem;
  }
`;

const HalfWidthDescription = styled(ActionDescription)`
  font-size: 0.95rem;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    line-height: 1.3;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 1rem;
  }
`;

const StatCard = styled.div`
  background: white;
  border-radius: 18px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 1.2rem;
    border-radius: 14px;
  }
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.8rem;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 0.6rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const MatchingButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 28px;
  font-size: 1.15rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 14px 28px;
    font-size: 1.1rem;
    border-radius: 25px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 24px;
    font-size: 1rem;
    border-radius: 22px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 20px;
  justify-content: flex-start;
  align-items: center;
  margin-top: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 16px;
    margin-top: 1.5rem;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-top: 1.5rem;
    > * {
      width: 100%;
      text-align: left !important;
    }
  }
`;

const NicknameSpan = styled.span`
  color: #4F46E5;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  transition: all 0.2s ease;
  
  &:hover {
    color: #7C3AED;
    text-decoration: none;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 64px 24px 48px 24px; /* 위쪽 padding을 더 넉넉하게 */
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  width: 90vw;
  height: 90vh;
  min-width: 220px;
  min-height: 220px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  @media (min-width: 768px) {
    max-width: 520px;
    max-height: 90vh;
  }
`;

const PreferenceSummary: React.FC<{ profile: any }> = ({ profile }) => {
  if (!profile) return null;
  // 선호 스타일 필드 추출
  const ageMin = profile.preferred_age_min;
  const ageMax = profile.preferred_age_max;
  const heightMin = profile.preferred_height_min;
  const heightMax = profile.preferred_height_max;
  const bodyTypes = profile.preferred_body_types ? (typeof profile.preferred_body_types === 'string' ? JSON.parse(profile.preferred_body_types) : profile.preferred_body_types) : [];
  const jobTypes = profile.preferred_job_types ? (typeof profile.preferred_job_types === 'string' ? JSON.parse(profile.preferred_job_types) : profile.preferred_job_types) : [];
  const maritalStatuses = profile.preferred_marital_statuses ? (typeof profile.preferred_marital_statuses === 'string' ? JSON.parse(profile.preferred_marital_statuses) : profile.preferred_marital_statuses) : [];
  return (
    <div style={{ background: '#f8f6fd', borderRadius: 10, padding: '18px 16px', marginTop: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, color: '#4F46E5', marginBottom: 8 }}>선호 스타일 요약</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.98rem', color: '#333' }}>
        <div><b>나이:</b> {typeof ageMin === 'number' && typeof ageMax === 'number' ? `${ageMin < 0 ? `${Math.abs(ageMin)}살 연하` : ageMin === 0 ? '동갑' : `${ageMin}살 연상`} ~ ${ageMax < 0 ? `${Math.abs(ageMax)}살 연하` : ageMax === 0 ? '동갑' : `${ageMax}살 연상`}` : '-'}</div>
        <div><b>키:</b> {typeof heightMin === 'number' && typeof heightMax === 'number' ? `${heightMin}cm ~ ${heightMax}cm` : '-'}</div>
        <div><b>체형:</b> {bodyTypes && bodyTypes.length > 0 ? bodyTypes.join(', ') : '-'}</div>
        <div><b>직군:</b> {jobTypes && jobTypes.length > 0 ? jobTypes.join(', ') : '-'}</div>
        <div><b>결혼상태:</b> {maritalStatuses && maritalStatuses.length > 0 ? maritalStatuses.join(', ') : '-'}</div>
      </div>
    </div>
  );
};

const cancelTime = 1;

const MainPage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, fetchUser } = useAuth();
  const [period, setPeriod] = useState<any>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [partnerProfileError, setPartnerProfileError] = useState(false);
  const [showMatchingConfirmModal, setShowMatchingConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const partnerUserId = useMemo(() => {
    const id = (matchingStatus && matchingStatus.matched === true) ? (matchingStatus.partner_user_id || null) : null;
    return id;
  }, [matchingStatus]);

  // [추가] 매칭 성공 상태라면 partnerProfile을 자동으로 fetch
  useEffect(() => {
    if (
      matchingStatus &&
      matchingStatus.matched === true &&
      partnerUserId
    ) {
      if (!partnerProfile || partnerProfile.user_id !== partnerUserId) {
        fetchPartnerProfile(partnerUserId);
      }
    } else {
      setPartnerProfile(null);
      setPartnerProfileError(false); // 상태 초기화
    }
  }, [matchingStatus, partnerUserId]);

  useEffect(() => {
    matchingApi.getMatchingPeriod().then(data => {
      setPeriod(data);
      setLoadingPeriod(false);
      const nowDate = new Date();
      const start = new Date(data.application_start);
      const end = new Date(data.application_end);
      const announce = data.matching_announce ? new Date(data.matching_announce) : null;
      console.log('[MainPage][DEBUG] period:', data);
      console.log('[MainPage][DEBUG] now:', nowDate.toISOString());
      console.log('[MainPage][DEBUG] announce:', announce ? announce.toISOString() : null);
    }).catch((err) => {
      setLoadingPeriod(false);
      console.error('[MainPage] 매칭 기간 API 에러:', err);
    });
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000); // 1초마다 갱신
    return () => window.clearInterval(timer);
  }, []);

  // 매칭 상태 조회
  const fetchMatchingStatus = async () => {
    if (!user?.id) {
      return;
    }
    setStatusLoading(true);
    try {
      const res = await matchingApi.getMatchingStatus(user.id);
      console.log('[디버깅] fetchMatchingStatus: API 응답 전체:', res);
      if (res && typeof res === 'object' && 'status' in res && res.status) {
        setMatchingStatus({
          ...res.status,
          is_applied: res.status.is_applied ?? res.status.applied,
          is_matched: res.status.is_matched ?? res.status.matched,
          is_cancelled: res.status.is_cancelled ?? res.status.cancelled,
        });
      } else {
        setMatchingStatus(null);
        console.warn('[디버깅] fetchMatchingStatus: 응답에 status 필드 없음 또는 null, res:', res);
      }
    } catch (e) {
      setMatchingStatus(null);
      console.error('[디버깅] fetchMatchingStatus: 에러 발생', e);
    } finally {
      setStatusLoading(false);
    }
  };

  // [수정] MainPage 진입 시 matchingStatus만 자동 fetch (fetchUser 호출 제거)
  useEffect(() => {
    if (user?.id) {
      fetchMatchingStatus();
    }
  }, [user?.id]);

  // 상대방 프로필 정보 fetch 함수
  const fetchPartnerProfile = async (partnerUserId: string) => {
    try {
      const res = await userApi.getUserProfile(partnerUserId);
      setPartnerProfile(res);
      setPartnerProfileError(false); // 성공 시 에러 상태 해제
    } catch (e) {
      console.error('[MainPage][fetchPartnerProfile] API 실패:', e);
      if (!partnerProfileError) {
        toast.error('매칭 상대방이 탈퇴했거나 정보를 찾을 수 없습니다.');
        setPartnerProfileError(true); // 한 번만 토스트
      }
      setPartnerProfile(null);
    }
  };

  // matchingStatus, period, announce 값 한 번만 출력 → now는 의존성에서 제거
  useEffect(() => {
    if (!period) return;
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    console.log('[MainPage][DEBUG] period:', period);
    console.log('[MainPage][DEBUG] announce:', announce ? announce.toISOString() : null);
    console.log('[MainPage][DEBUG] matchingStatus:', matchingStatus);
  }, [period, matchingStatus]);

  // [추가] 매칭 공지 시점 직전 polling으로 상태 강제 fetch
  useEffect(() => {
    if (!period || !user?.id) return;
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    if (!announce) return;
    const nowTime = Date.now();
    const announceTime = announce.getTime();
    const diff = announceTime - nowTime;
    // announce 2초 전 ~ 3초 후까지 polling
    if (diff > 0 && diff < 5000) {
      // 2초 전부터 5초간 1초 간격 polling
      const pollStart = window.setTimeout(() => {
        let count = 0;
        const poll = window.setInterval(() => {
          fetchMatchingStatus();
          count++;
          if (count >= 5) window.clearInterval(poll);
        }, 1000);
      }, Math.max(0, diff - 2000));
      return () => window.clearTimeout(pollStart);
    }
  }, [period, user?.id]);

  // [추가] 회차 시작 시 사용자 정보 자동 업데이트 (30초마다)
  useEffect(() => {
    if (!period || !user?.id) return;
    const start = new Date(period.application_start);
    const now = new Date();
    const startTime = start.getTime();
    const nowTime = now.getTime();
    // 회차 시작 30초 전 ~ 5분 후까지 30초마다 업데이트
    if (startTime - nowTime < 30000 && startTime - nowTime > -300000) {
      const interval = setInterval(() => {
        console.log('[MainPage] 회차 시작 시점 근처, 사용자 정보 업데이트');
      }, 30000); // 30초마다
      return () => clearInterval(interval);
    }
  }, [period, user?.id]);

  // [추가] 매칭 결과 발표 시각 이후 5초간 1초마다 polling (최대 5회)
  useEffect(() => {
    if (!period || !user?.id) return;
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    if (!announce) return;
    const nowTime = Date.now();
    const announceTime = announce.getTime();
    const diff = nowTime - announceTime;
    // 발표 직후 5초 동안만 polling
    if (diff >= 0 && diff < 5000) {
      let count = 0;
      const poll = setInterval(() => {
        fetchMatchingStatus();
        count++;
        if (count >= 5) clearInterval(poll);
      }, 1000);
      return () => clearInterval(poll);
    }
  }, [period, user?.id]);

  // 모달이 열릴 때 body 스크롤 막기
  useEffect(() => {
    const isAnyModalOpen = showProfileModal || showPartnerModal || showMatchingConfirmModal || showCancelConfirmModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showProfileModal, showPartnerModal, showMatchingConfirmModal, showCancelConfirmModal]);

  // 모든 useState, useEffect 선언 이후
  // useEffect는 항상 최상단에서 호출
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 렌더링 조건 강화: isLoading이 true이거나 user/profile이 null이면 무조건 스피너
  if (isLoading || !user || !profile) {
    return <LoadingSpinner sidebarOpen={sidebarOpen} />;
  }
  if (!isAuthenticated) return null;
  if (!user.isAdmin) {
    return <div style={{padding:'2rem',color:'#e74c3c',fontWeight:700,fontSize:'1.2rem'}}>관리자만 접근할 수 있습니다.</div>;
  }

  // 날짜/시간 포맷 함수 (KST 기준)
  const formatKST = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const hh = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}시 ${min}분`;
  };

  // [리팩터링] users의 is_applied, is_matched 기반 분기 함수 (is_cancelled만 matchingStatus에서)
  const getUserMatchingState = () => {
    // users 테이블 정보만 사용 (is_applied, is_matched)
    const isApplied = user?.is_applied === true;
    const isMatched = typeof user?.is_matched !== 'undefined' ? user?.is_matched : null;
    // is_cancelled만 matchingStatus에서
    const isCancelled = matchingStatus?.is_cancelled === true || matchingStatus?.cancelled === true;
    return { isApplied, isMatched, isCancelled };
  };

  // [리팩터링] 매칭 현황 안내문구 상태/기간 분리 및 색상 반환 (is_applied, is_matched 기준)
  const getMatchingStatusDisplay = () => {
    if (!period || (period.finish && new Date(period.finish) < now)) {
      return {
        status: '이번 회차가 종료되었습니다.',
        period: '',
        color: '#888',
      };
    }
    const start = new Date(period.application_start);
    const end = new Date(period.application_end);
    const finish = period.finish ? new Date(period.finish) : null;
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    const nowTime = now.getTime();
    const { isApplied, isMatched, isCancelled } = getUserMatchingState();
    // 신청 전
    if (nowTime < start.getTime()) {
      return {
        status: '신청 기간이 아닙니다.',
        period: `신청기간 : ${formatKST(period.application_start)}\n~ ${formatKST(period.application_end)}`,
        color: '#888',
      };
    }
    // 신청 기간
    if (nowTime >= start.getTime() && nowTime <= end.getTime()) {
      if (!isApplied || isCancelled) {
        return {
          status: '매칭 미신청',
          period: `신청기간 : ${formatKST(period.application_start)}\n~ ${formatKST(period.application_end)}`,
          color: '#1976d2',
        };
      } else {
        return {
          status: '신청 완료',
          period: `매칭 공지를 기다려주세요\n매칭일 : ${announce ? formatKST(period.matching_announce) : '-'}`,
          color: '#7C3AED',
        };
      }
    }
    // 신청 마감 후 ~ 매칭 공지 전
    if (nowTime > end.getTime() && (!announce || nowTime < announce.getTime())) {
      if (isApplied && !isCancelled) {
        return {
          status: '신청 완료',
          period: `매칭 공지를 기다려주세요\n매칭일 : ${announce ? formatKST(period.matching_announce) : '-'}`,
          color: '#7C3AED',
        };
      } else {
        return {
          status: '신청 마감',
          period: `매칭 공지를 기다려주세요\n매칭일 : ${announce ? formatKST(period.matching_announce) : '-'}`,
          color: '#888',
        };
      }
    }
    // 매칭 공지 이후(결과 발표)
    if (announce && nowTime >= announce.getTime()) {
      if (!isApplied || isCancelled) {
        return {
          status: '매칭 미신청',
          period: '',
          color: '#888',
        };
      }
      if (typeof isMatched === 'undefined' || isMatched === null) {
        return {
          status: '결과 대기중',
          period: '매칭 결과를 불러오는 중입니다...',
          color: '#888',
        };
      }
      if (isMatched === true) {
        return {
          status: '매칭 성공',
          period: '상대방 프로필을 확인해보세요.',
          color: '#27ae60',
        };
      }
      if (isMatched === false) {
        return {
          status: '매칭 실패',
          period: '아쉽지만 다음기회를 기약할게요.',
          color: '#e74c3c',
        };
      }
    }
    // 회차 종료(마감)
    if ((finish && nowTime >= finish.getTime())) {
      return {
        status: '이번 회차가 종료되었습니다.',
        period: '',
        color: '#888',
      };
    }
    return { status: '', period: '', color: '#888' };
  };

  // 신청기간 계산 함수 (위치 보장)
  const isInApplicationPeriod = () => {
    if (!period || !period.application_start || !period.application_end) return false;
    const start = new Date(period.application_start);
    const end = new Date(period.application_end);
    return now >= start && now <= end;
  };

  // [리팩터링] 버튼 상태/표기 결정 (is_applied, is_matched 기준)
  let buttonDisabled = true;
  let buttonLabel = '매칭 신청하기';
  let periodLabel = '';
  let showCancel = false;

  const { status: statusText, period: periodText } = getMatchingStatusDisplay();
  periodLabel = periodText;

  // 10분 재신청 제한 로직 (기존 유지)
  let canReapply = true;
  let reapplyMessage = '';
  if (matchingStatus && matchingStatus.cancelled && matchingStatus.cancelled_at) {
    const cancelledAt = new Date(matchingStatus.cancelled_at);
    const nowTime = now.getTime();
    const diff = nowTime - cancelledAt.getTime();
    if (diff < cancelTime * 60 * 1000) {
      canReapply = false;
      const remain = cancelTime * 60 * 1000 - diff;
      const min = Math.floor(remain / 60000);
      const sec = Math.floor((remain % 60000) / 1000);
      reapplyMessage = `신청가능까지\n남은 시간: ${min}분 ${sec}초`;
    }
  }

  // [리팩터링] 버튼/문구 분기 (is_applied, is_matched 기준)
  if (period) {
    const start = new Date(period.application_start);
    const end = new Date(period.application_end);
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    const finish = period.finish ? new Date(period.finish) : null;
    const nowTime = now.getTime();
    const { isApplied, isMatched, isCancelled } = getUserMatchingState();
    // 신청 전/회차 종료
    if (nowTime < start.getTime() || (finish && nowTime >= finish.getTime())) {
      buttonDisabled = true;
      buttonLabel = '매칭 신청 불가';
      showCancel = false;
    } else if (nowTime >= start.getTime() && nowTime <= end.getTime()) {
      if (!isApplied || isCancelled) {
        buttonDisabled = !canReapply;
        buttonLabel = '매칭 신청하기';
        showCancel = false;
      } else {
        buttonDisabled = true;
        buttonLabel = '신청 완료';
        showCancel = true;
      }
    } else if (nowTime > end.getTime() && (!announce || nowTime < announce.getTime())) {
      buttonDisabled = true;
      buttonLabel = isApplied && !isCancelled ? '신청 완료' : '매칭 신청 불가';
      showCancel = false;
    } else if (announce && nowTime >= announce.getTime()) {
      if (!isApplied || isCancelled) {
        buttonDisabled = true;
        buttonLabel = '매칭 신청 불가';
        showCancel = false;
      } else if (typeof isMatched === 'undefined' || isMatched === null) {
        buttonDisabled = true;
        buttonLabel = '결과 대기중';
        showCancel = false;
      } else if (isMatched === true) {
        buttonDisabled = true;
        buttonLabel = '매칭 성공';
        showCancel = false; // 매칭 성공 후에도 취소버튼 숨김
      } else if (isMatched === false) {
        buttonDisabled = true;
        buttonLabel = '매칭 실패';
        showCancel = false;
      }
    } else {
      buttonDisabled = true;
      buttonLabel = '매칭 신청 불가';
      showCancel = false;
    }
  }

  // 매칭 성공 && 회차 마감 전일 때만 채팅 가능
  const { status } = getMatchingStatusDisplay();
  const canChat = status === '매칭 성공' && partnerUserId;

  const quickActions: QuickAction[] = [
    {
      icon: <FaRegClock />,
      title: '매칭 현황',
      description: '',
      action: () => {},
      disabled: false,
    },
    {
      icon: <FaComments />,
      title: '상대방과 약속잡기',
      description: '매칭 성공 시 약속잡기 버튼이 활성화됩니다.',
      action: () => {
        if (canChat) navigate(`/chat/${partnerUserId}`);
      },
      disabled: !canChat,
      custom: true,
    },
    {
      type: 'notice-faq',
      noticeAction: {
        icon: <FaExclamationTriangle />,
        title: '공지사항',
        description: '매칭 관련 공지사항을 확인하세요.',
        action: () => {
          navigate('/notice');
        },
        disabled: false,
      },
      faqAction: {
        icon: <FaRegStar />,
        title: 'FAQ',
        description: '자주 묻는 질문과 답변을 확인하세요.',
        action: () => {
          navigate('/faq');
        },
        disabled: false,
      }
    },
    {
      type: 'profile-preference',
      profileAction: {
        icon: <FaUser />,
        title: '프로필 관리',
        description: '내 프로필 정보를 수정하고 관리하세요.',
        action: () => navigate('/profile'),
        disabled: false,
      },
      preferenceAction: {
        icon: <FaRegStar />,
        title: '내가 선호하는 스타일',
        description: '내가 선호하는 스타일을 조회/수정할 수 있습니다.',
        action: () => navigate('/preference'),
        disabled: false,
      }
    },
  ];

  // 매칭 신청
  const handleMatchingRequest = async () => {
    setShowMatchingConfirmModal(true);
  };

  const handleMatchingConfirm = async () => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      await matchingApi.requestMatching(user.id);
      toast.success('매칭 신청이 완료되었습니다!');
      await fetchMatchingStatus();
      setShowMatchingConfirmModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '매칭 신청에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 매칭 신청 취소 (모달에서만 호출)
  const handleCancel = async () => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      await matchingApi.cancelMatching(user.id);
      toast.success('매칭 신청이 취소되었습니다.');
      await fetchMatchingStatus();
      setShowCancelConfirmModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '신청 취소에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 닉네임 또는 이메일로 인사 (닉네임이 있으면 닉네임, 없으면 이메일)
  const displayName = profile?.nickname || user?.email?.split('@')[0] || '사용자';

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <WelcomeSection>
        <WelcomeTitle>
          환영합니다,{' '}
          <NicknameSpan onClick={() => setShowProfileModal(true)}>
            {displayName}
          </NicknameSpan>
          님!
        </WelcomeTitle>
        <WelcomeSubtitle>현대자동차(울산) 사내 매칭 플랫폼에 오신 것을 환영합니다.</WelcomeSubtitle>
        <ButtonRow>
        <MatchingButton onClick={handleMatchingRequest} disabled={buttonDisabled || actionLoading || statusLoading}>
          {(actionLoading && !showCancel) ? '처리 중...' : buttonLabel}
        </MatchingButton>
        {showCancel && (
          <MatchingButton onClick={() => setShowCancelConfirmModal(true)} disabled={actionLoading || statusLoading} style={{ background: '#ccc', color: '#333' }}>
            {actionLoading ? '처리 중...' : '신청 취소하기'}
          </MatchingButton>
        )}
        <div style={{ textAlign: 'center', marginTop: 8, color: '#888', whiteSpace: 'pre-line' }}>{periodLabel}</div>
        {reapplyMessage && (
          <div style={{ textAlign: 'center', marginTop: 4, color: '#e74c3c', whiteSpace: 'pre-line', fontWeight: 600 }}>{reapplyMessage}</div>
        )}
      </ButtonRow>
      {/* 프로필 카드 모달 */}
      {showProfileModal && (
        <ModalOverlay onClick={() => setShowProfileModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ProfileCard
              nickname={profile?.nickname || displayName}
              birthYear={profile?.birth_year || 0}
              gender={profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'}
              job={profile?.job_type || '-'}
              mbti={profile?.mbti}
              maritalStatus={profile?.marital_status}
              appeal={profile?.appeal}
              interests={profile?.interests}
              appearance={profile?.appearance}
              personality={profile?.personality}
              height={profile?.height}
              body_type={profile?.body_type}
              residence={profile?.residence}
              drinking={profile?.drinking}
              smoking={profile?.smoking}
              religion={profile?.religion}
            />
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button onClick={() => setShowProfileModal(false)} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>닫기</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      {/* 상대방 프로필 모달 */}
      {showPartnerModal && partnerProfile && (
        <ModalOverlay onClick={() => setShowPartnerModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ProfileCard
              nickname={partnerProfile.nickname}
              birthYear={partnerProfile.birth_year}
              gender={partnerProfile.gender === 'male' ? '남성' : partnerProfile.gender === 'female' ? '여성' : '-'}
              job={partnerProfile.job_type || '-'}
              mbti={partnerProfile.mbti}
              maritalStatus={partnerProfile.marital_status}
              appeal={partnerProfile.appeal}
              interests={partnerProfile.interests}
              appearance={partnerProfile.appearance}
              personality={partnerProfile.personality}
              height={partnerProfile.height}
              body_type={partnerProfile.body_type}
              residence={partnerProfile.residence}
              drinking={partnerProfile.drinking}
              smoking={partnerProfile.smoking}
              religion={partnerProfile.religion}
            />
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button onClick={() => setShowPartnerModal(false)} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>닫기</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      {showMatchingConfirmModal && (
        <ModalOverlay onClick={() => setShowMatchingConfirmModal(false)}>
          <ModalContent
            onClick={e => e.stopPropagation()}
            style={{
              width: '90vw',
              maxWidth: 420,
              minWidth: 220,
              height: '90vh',
              minHeight: 220,
              maxHeight: '90vh',
              padding: '36px 36px 0 36px', // 좌우 패딩 24px로 늘림
              overflow: 'hidden',
              position: 'relative',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            {/* 경고문구+안내+프로필 요약을 한 스크롤 영역에 묶음 (flex:1, minHeight:0, overflowY:auto) */}
            <div style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto', // 한 번에 스크롤
              overflowX: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '0 4px', // 내부 스크롤 컨테이너도 좌우 약간 여유
              gap: 0,
            }}>
              {/* 경고문구+아이콘 */}
              <div style={{
                width: '100%',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                background: 'rgba(255, 235, 238, 0.97)',
                color: '#e74c3c',
                borderRadius: 12,
                padding: '14px 18px', // 경고문구도 좌우 18px로
                fontWeight: 700,
                fontSize: '1rem',
                margin: '0 0 18px 0', // 좌우 마진은 0, 패딩으로만 여백
                gap: 14,
                zIndex: 2,
                boxShadow: '0 2px 8px rgba(231,76,60,0.07)',
                wordBreak: 'break-all',
                textAlign: 'left',
                whiteSpace: 'normal',
                overflow: 'visible',
              }}>
                <FaExclamationTriangle style={{ marginRight: 10, fontSize: '2em', flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.5, wordBreak: 'break-all', textAlign: 'left', whiteSpace: 'normal' }}>매칭 신청 시점의 프로필/선호 스타일이 매칭에 사용됩니다.</span>
              </div>
              {/* 안내문구(서브) */}
              <div style={{
                width: '100%',
                maxWidth: '100%',
                background: 'none',
                color: '#888',
                borderRadius: 8,
                padding: '0 8px 0 28px', // 안내문구도 좌우 8px, 왼쪽 28px(아이콘)
                fontWeight: 500,
                fontSize: '0.97rem',
                lineHeight: 1.5,
                margin: '0 0 24px 0',
                zIndex: 1,
                boxSizing: 'border-box',
                overflow: 'visible', // 내부 스크롤 없음
                wordBreak: 'break-all',
                whiteSpace: 'normal',
              }}>
                신청 후에는 프로필/선호 스타일을 변경해도 이번 매칭에는 반영되지 않습니다.
              </div>
              {/* 프로필/선호 스타일 요약 */}
              <div style={{
                border: 'none',
                borderRadius: '14px',
                padding: '18px 0 10px 0',
                maxWidth: '100%',
                background: 'none',
                fontSize: '1rem',
                margin: '0 auto',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'visible', // 내부 스크롤 없음
              }}>
                <div style={{marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:'1.18rem',color:'#4F46E5',marginBottom:2}}>{profile?.nickname || displayName}</div>
                  <div style={{fontSize:'0.98rem',color:'#666'}}>{profile?.birth_year || 0}년생 · {profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'} · {profile?.job_type || '-'}</div>
                </div>
                <div style={{
                  display:'flex',
                  flexWrap:'wrap',
                  gap: 6,
                  marginBottom:10,
                  width:'100%',
                  maxWidth:'100%',
                  overflowX:'hidden',
                }}>
                  {/* MBTI */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>MBTI</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.mbti || '-'}</span>
                  </div>
                  {/* 결혼상태 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>결혼상태</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.marital_status || '-'}</span>
                  </div>
                  {/* 키 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>키</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.height ? `${profile.height}cm` : '-'}</span>
                  </div>
                  {/* 흡연 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>흡연</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.smoking || '-'}</span>
                  </div>
                  {/* 음주 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>음주</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.drinking || '-'}</span>
                  </div>
                  {/* 종교 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 120px',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>종교</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.religion || '-'}</span>
                  </div>
                  {/* 체형 - 마지막, row 배치, ,로 join해서 한 줄로 모두 표시 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 100%',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>체형</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(() => {
                      const val = profile?.body_type;
                      let arr: any[] = [];
                      if (!val) arr = [];
                      else if (Array.isArray(val)) arr = val;
                      else {
                        try { arr = JSON.parse(val); if (!Array.isArray(arr)) arr = [String(val)]; } catch { arr = [String(val)]; }
                      }
                      return arr.length > 0 ? arr.join(', ') : '-';
                    })()}</span>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontWeight:600,color:'#4F46E5',marginBottom:4}}>자기소개</div>
                  <div style={{background:'#f8f6fd',borderRadius:8,minHeight:36,whiteSpace:'pre-line',color:'#444',fontSize:'0.98rem',padding:'10px 12px'}}>{profile?.appeal || '아직 자기소개가 없습니다.'}</div>
                </div>
                {/* 관심사/외모/성격 요약 */}
                <div style={{marginBottom:10,marginTop:10}}>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div>
                      <div style={{fontWeight:600,color:'#4F46E5',marginBottom:2}}>제 관심사는요</div>
                      <div style={{color:'#333',fontSize:'0.98rem',lineHeight:'1.7'}}>{(() => {
                        const arr = profile?.interests ? (Array.isArray(profile.interests) ? profile.interests : (()=>{try{return JSON.parse(profile.interests);}catch{return[];}})()) : [];
                        return arr.length > 0 ? arr.slice(0,3).join(', ') : '-';
                      })()}</div>
                    </div>
                    <div>
                      <div style={{fontWeight:600,color:'#4F46E5',marginBottom:2}}>이런 얘기 많이 들어요</div>
                      <div style={{color:'#333',fontSize:'0.98rem',lineHeight:'1.7'}}>{(() => {
                        const arr = profile?.appearance ? (Array.isArray(profile.appearance) ? profile.appearance : (()=>{try{return JSON.parse(profile.appearance);}catch{return[];}})()) : [];
                        return arr.length > 0 ? arr.slice(0,3).join(', ') : '-';
                      })()}</div>
                    </div>
                    <div>
                      <div style={{fontWeight:600,color:'#4F46E5',marginBottom:2}}>저는 이런 사람이에요</div>
                      <div style={{color:'#333',fontSize:'0.98rem',lineHeight:'1.7'}}>{(() => {
                        const arr = profile?.personality ? (Array.isArray(profile.personality) ? profile.personality : (()=>{try{return JSON.parse(profile.personality);}catch{return[];}})()) : [];
                        return arr.length > 0 ? arr.slice(0,3).join(', ') : '-';
                      })()}</div>
                    </div>
                  </div>
                </div>
                {/* 선호 스타일 요약 */}
                <div style={{marginTop:18,marginBottom:6}}>
                  <div style={{fontWeight:600,color:'#4F46E5',marginBottom:4}}>선호 스타일</div>
                  <div style={{fontSize:'0.98rem',color:'#333',lineHeight:'1.7'}}>
                    <b>나이:</b> {(() => {
                      if (typeof profile?.preferred_age_min === 'number' && typeof profile?.preferred_age_max === 'number') {
                        if (profile.preferred_age_min === -99 && profile.preferred_age_max === 99) {
                          return '상관없음';
                        }
                        const min = profile.preferred_age_min < 0 ? `${Math.abs(profile.preferred_age_min)}살 연하` : profile.preferred_age_min === 0 ? '동갑' : `${profile.preferred_age_min}살 연상`;
                        const max = profile.preferred_age_max < 0 ? `${Math.abs(profile.preferred_age_max)}살 연하` : profile.preferred_age_max === 0 ? '동갑' : `${profile.preferred_age_max}살 연상`;
                        return `${min} ~ ${max}`;
                      }
                      return '-';
                    })()}<br/>
                    <b>키:</b> {(() => {
                      if (typeof profile?.preferred_height_min === 'number' && typeof profile?.preferred_height_max === 'number') {
                        if (profile.preferred_height_min === 150 && profile.preferred_height_max === 199) {
                          return '상관없음';
                        }
                        return `${profile.preferred_height_min}cm ~ ${profile.preferred_height_max}cm`;
                      }
                      return '-';
                    })()}<br/>
                    <b>체형:</b> {(() => {
                      const arr = profile?.preferred_body_types ? (Array.isArray(profile.preferred_body_types) ? profile.preferred_body_types : (()=>{try{return JSON.parse(profile.preferred_body_types);}catch{return[];}})()) : [];
                      return arr.length > 0 ? arr.join(', ') : '-';
                    })()}<br/>
                    <b>직군:</b> {(() => {
                      const arr = profile?.preferred_job_types ? (Array.isArray(profile.preferred_job_types) ? profile.preferred_job_types : (()=>{try{return JSON.parse(profile.preferred_job_types);}catch{return[];}})()) : [];
                      return arr.length > 0 ? arr.join(', ') : '-';
                    })()}<br/>
                    <b>결혼상태:</b> {(() => {
                      const arr = profile?.preferred_marital_statuses ? (Array.isArray(profile.preferred_marital_statuses) ? profile.preferred_marital_statuses : (()=>{try{return JSON.parse(profile.preferred_marital_statuses);}catch{return[];}})()) : [];
                      return arr.length > 0 ? arr.join(', ') : '-';
                    })()}
                  </div>
                </div>
              </div>
            </div>
            {/* 버튼 영역은 flex column 하단에 고정, flex-shrink:0 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'center', flexShrink: 0, paddingBottom: 24 }}>
              <button onClick={handleMatchingConfirm} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: '1.08rem', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }} disabled={actionLoading}>
                {actionLoading ? '신청 중...' : '이 정보로 신청'}
              </button>
              <button onClick={() => setShowMatchingConfirmModal(false)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#eee', color: '#333', fontWeight: 600, fontSize: '1.08rem', cursor: 'pointer' }}>취소</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      {/* 신청 취소 커스텀 모달 */}
      {showCancelConfirmModal && (
        <ModalOverlay onClick={() => setShowCancelConfirmModal(false)}>
          <ModalContent
            onClick={e => e.stopPropagation()}
            style={{
              width: 380,
              minWidth: 220,
              maxWidth: '95vw',
              height: 'auto',
              minHeight: 0,
              maxHeight: '80vh',
              padding: '32px 20px 24px 20px',
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 18,
              width: '100%',
              alignItems: 'stretch',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 235, 238, 0.95)',
                color: '#e74c3c',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: '1.07rem',
                marginBottom: 0,
                gap: 8,
              }}>
                <span style={{fontSize:'1.25em',display:'flex',alignItems:'center'}}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{marginRight:4}} xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#e74c3c"/><path d="M10 5v5.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/><circle cx="10" cy="14.2" r="1.1" fill="#fff"/></svg>
                </span>
                정말 매칭 신청을 취소하시겠습니까?
              </div>
              <div style={{
                background: 'none',
                color: '#888',
                borderRadius: 8,
                padding: '6px 10px 0 32px',
                fontWeight: 500,
                fontSize: '0.97rem',
                lineHeight: 1.5,
                marginTop: 0,
              }}>
                신청 취소 후 <b style={{color:'#e74c3c'}}>{cancelTime}분 동안 재신청이 불가</b>합니다.<br/>
                정말로 취소하시려면 아래 버튼을 눌러주세요.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'center' }}>
              <button onClick={handleCancel} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontWeight: 700, fontSize: '1.08rem', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }} disabled={actionLoading}>
                {actionLoading ? '취소 중...' : '정말 취소'}
              </button>
              <button onClick={() => setShowCancelConfirmModal(false)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#eee', color: '#333', fontWeight: 600, fontSize: '1.08rem', cursor: 'pointer' }}>닫기</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      </WelcomeSection>
      
      <QuickActions>
        {quickActions.map((action, index) => {
          // profile-preference 타입 처리
          if ('type' in action && action.type === 'profile-preference') {
            const profileAction = action as ProfilePreferenceAction;
            return (
              <ProfilePreferenceCard key={index}>
                <HalfWidthCard
                  onClick={!profileAction.profileAction.disabled ? profileAction.profileAction.action : undefined}
                  style={profileAction.profileAction.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
                >
                  <HalfWidthHeader>
                    <HalfWidthIcon>{profileAction.profileAction.icon}</HalfWidthIcon>
                    <HalfWidthTitle>{profileAction.profileAction.title}</HalfWidthTitle>
                  </HalfWidthHeader>
                  <HalfWidthDescription>{profileAction.profileAction.description}</HalfWidthDescription>
                </HalfWidthCard>
                <HalfWidthCard
                  onClick={!profileAction.preferenceAction.disabled ? profileAction.preferenceAction.action : undefined}
                  style={profileAction.preferenceAction.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
                >
                  <HalfWidthHeader>
                    <HalfWidthIcon>{profileAction.preferenceAction.icon}</HalfWidthIcon>
                    <HalfWidthTitle>{profileAction.preferenceAction.title}</HalfWidthTitle>
                  </HalfWidthHeader>
                  <HalfWidthDescription>{profileAction.preferenceAction.description}</HalfWidthDescription>
                </HalfWidthCard>
              </ProfilePreferenceCard>
            );
          }
          
          // notice-faq 타입 처리
          if ('type' in action && action.type === 'notice-faq') {
            const noticeFaqAction = action as NoticeFaqAction;
            return (
              <ProfilePreferenceCard key={index}>
                <HalfWidthCard
                  onClick={!noticeFaqAction.noticeAction.disabled ? noticeFaqAction.noticeAction.action : undefined}
                  style={noticeFaqAction.noticeAction.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
                >
                  <HalfWidthHeader>
                    <HalfWidthIcon>{noticeFaqAction.noticeAction.icon}</HalfWidthIcon>
                    <HalfWidthTitle>{noticeFaqAction.noticeAction.title}</HalfWidthTitle>
                  </HalfWidthHeader>
                  <HalfWidthDescription>{noticeFaqAction.noticeAction.description}</HalfWidthDescription>
                </HalfWidthCard>
                <HalfWidthCard
                  onClick={!noticeFaqAction.faqAction.disabled ? noticeFaqAction.faqAction.action : undefined}
                  style={noticeFaqAction.faqAction.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
                >
                  <HalfWidthHeader>
                    <HalfWidthIcon>{noticeFaqAction.faqAction.icon}</HalfWidthIcon>
                    <HalfWidthTitle>{noticeFaqAction.faqAction.title}</HalfWidthTitle>
                  </HalfWidthHeader>
                  <HalfWidthDescription>{noticeFaqAction.faqAction.description}</HalfWidthDescription>
                </HalfWidthCard>
              </ProfilePreferenceCard>
            );
          }
          
          // 기존 카드 처리
          const baseAction = action as BaseQuickAction;
          return (
            <ActionCard
              key={index}
              onClick={!baseAction.disabled ? baseAction.action : undefined}
              style={baseAction.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
            >
              <ActionHeader>
                <ActionIcon>{baseAction.icon}</ActionIcon>
                <ActionTitle>{baseAction.title}</ActionTitle>
              </ActionHeader>
              {baseAction.title === '매칭 현황' ? (() => {
                const { status, period, color } = getMatchingStatusDisplay();
                return (
                  <div style={{
                    marginTop: 20,
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 100%)',
                    borderRadius: 16,
                    padding: '22px 18px',
                    minHeight: 60,
                    boxShadow: '0 4px 12px rgba(102,126,234,0.08)',
                    textAlign: 'center',
                    letterSpacing: '-0.01em',
                    border: '1px solid rgba(102,126,234,0.1)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color, marginBottom: period ? 10 : 0, lineHeight: 1.3 }}>{status}</div>
                    {period && <div style={{ fontSize: '0.95rem', color: '#555', fontWeight: 500, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{period}</div>}
                    {/* 매칭 성공 시 상대방 프로필 박스 */}
                    {status === '매칭 성공' && partnerUserId && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)',
                          borderRadius: 12,
                          padding: '8px 16px 8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 3px 10px rgba(102,126,234,0.12)',
                          minWidth: 100,
                          cursor: partnerProfileError ? 'not-allowed' : 'pointer',
                          border: '1.5px solid #dbeafe',
                          transition: 'all 0.2s ease',
                          marginTop: 16,
                          justifyContent: 'center',
                          pointerEvents: partnerProfileError ? 'none' : 'auto', // 클릭 막기
                          opacity: partnerProfileError ? 0.6 : 1,
                        }}
                        onClick={async (e) => {
                          if (partnerProfileError) return; // 방어: 클릭 막기
                          e.stopPropagation();
                          await fetchPartnerProfile(partnerUserId!);
                          setShowPartnerModal(true);
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 5px 18px rgba(102,126,234,0.18)', e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 3px 10px rgba(102,126,234,0.12)', e.currentTarget.style.transform = 'translateY(0)')}
                      >
                        <FaChevronRight size={18} color="#7C3AED" style={{ marginRight: 2 }} />
                        <ProfileIcon gender={partnerProfile?.gender || ''} size={28} />
                        <span style={{
                          fontWeight: 700,
                          color:
                            partnerProfile?.gender === 'male' || partnerProfile?.gender === '남성'
                              ? '#7C3AED'
                              : partnerProfile?.gender === 'female' || partnerProfile?.gender === '여성'
                              ? '#F472B6'
                              : '#bbb',
                          fontSize: '1.01rem',
                          whiteSpace: 'nowrap',
                        }}>
                          {(() => {
                            if (partnerProfileError) {
                              return '프로필 없음';
                            }
                            if (!partnerProfile?.nickname) {
                              if (!partnerProfile) {
                                console.warn('[MainPage] partnerProfile이 null입니다. fetchPartnerProfile이 정상 호출됐는지, API 응답이 어땠는지 위 로그를 확인하세요.');
                              } else if (partnerProfile && typeof partnerProfile === 'object') {
                                console.warn('[MainPage] partnerProfile 객체:', JSON.stringify(partnerProfile, null, 2));
                              }
                              return '상대방';
                            }
                            return partnerProfile.nickname;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })() : (
              <ActionDescription>{baseAction.description}</ActionDescription>
              )}
              {/* 채팅하기 카드만 커스텀 안내문구/버튼 */}
              {baseAction.title === '상대방과 약속잡기' ? (
                <>
                  <button
                    style={{
                      marginTop: 12,
                      background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 20,
                      padding: '8px 20px',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      cursor: canChat ? 'pointer' : 'not-allowed',
                      opacity: canChat ? 1 : 0.5,
                      transition: 'all 0.2s ease',
                      boxShadow: canChat ? '0 3px 10px rgba(124,58,237,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                    disabled={!canChat}
                    onClick={e => {
                      e.stopPropagation();
                      if (canChat) navigate(`/chat/${partnerUserId}`);
                    }}
                    onMouseEnter={e => {
                      if (canChat) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 5px 15px rgba(124,58,237,0.4)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (canChat) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 3px 10px rgba(124,58,237,0.3)';
                      }
                    }}
                  >채팅 바로가기</button>
                  {!canChat && (
                    <div style={{ color: '#aaa', fontSize: '0.95rem', marginTop: 6 }}>
                      매칭 성공 시 활성화됩니다
                    </div>
                  )}
                </>
              ) : null}
            </ActionCard>
          );
        })}
      </QuickActions>

    </MainContainer>
  );
};

export default MainPage; 