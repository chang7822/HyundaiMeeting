import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FaHeart, FaComments, FaUser, FaCalendarAlt, FaRegStar, FaRegClock, FaUserCircle, FaChevronRight } from 'react-icons/fa';
import { matchingApi } from '../services/api.ts';
import { toast } from 'react-toastify';
import ProfileCard, { ProfileIcon } from '../components/ProfileCard.tsx';
import { userApi } from '../services/api.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

const MainContainer = styled.div<{ $sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => (props.$sidebarOpen ? '280px' : '0')};
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: margin-left 0.3s;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    padding-top: 80px;
  }
`;

const WelcomeSection = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const WelcomeTitle = styled.h1`
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const WelcomeSubtitle = styled.p`
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ActionCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  }
`;

const ActionIcon = styled.div`
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 1rem;
`;

const ActionTitle = styled.h3`
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
`;

const ActionDescription = styled.p`
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const MatchingButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-start;
  align-items: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    > * {
      width: 100%;
      text-align: left !important;
    }
  }
`;

const NicknameSpan = styled.span`
  color: #4F46E5;
  font-weight: bold;
  cursor: pointer;
  text-decoration: underline;
  &:hover {
    color: #7C3AED;
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
  padding: 32px 24px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  min-width: 320px;
  max-width: 90vw;
  @media (min-width: 768px) {
    max-width: 520px;
  }
  @media (min-width: 1200px) {
    max-width: 600px;
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

const MainPage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated } = useAuth();

  // 매칭 기간 상태
  const [period, setPeriod] = useState<any>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  // 매칭 상태 조회
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  const [showMatchingConfirmModal, setShowMatchingConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // 매칭 성공 시 상대방 user_id 추출
  let partnerUserId: string | null = null;
  if (matchingStatus && matchingStatus.matched === true) {
    // 백엔드에서 상대방 user_id를 내려주는 경우
    if (matchingStatus.partner_user_id) {
      partnerUserId = matchingStatus.partner_user_id;
    } else if (user && matchingStatus.period_id) {
      // 없으면 matching_history에서 직접 조회 (동기화 필요시 useEffect에서 fetch)
      // 이 부분은 간단히 버튼 클릭 시 fetchPartnerProfile(partnerUserId)로 처리
    }
  }

  // [추가] 매칭 성공 상태라면 partnerProfile을 자동으로 fetch
  useEffect(() => {
    if (
      matchingStatus &&
      matchingStatus.matched === true &&
      partnerUserId
    ) {
      // 이미 같은 상대라면 중복 호출 방지
      if (!partnerProfile || partnerProfile.user_id !== partnerUserId) {
        fetchPartnerProfile(partnerUserId);
      }
    } else {
      // 매칭 성공이 아니면 상대 프로필 초기화
      setPartnerProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingStatus, partnerUserId]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    matchingApi.getMatchingPeriod().then(data => {
      setPeriod(data);
      setLoadingPeriod(false);
      // 매칭 기간, 현재 시각, 비교 결과 모두 보기 좋게 한 번만 출력
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
    const timer = window.setInterval(() => setNow(new Date()), 1000); // 1초마다 갱신
    return () => window.clearInterval(timer);
  }, [isLoading, isAuthenticated]);

  // 매칭 상태 조회
  const fetchMatchingStatus = async () => {
    if (!user?.id) {
      console.warn('[디버깅] fetchMatchingStatus: user.id 없음, 중단');
      return;
    }
    setStatusLoading(true);
    try {
      console.log('[디버깅] fetchMatchingStatus: matchingApi.getMatchingStatus 호출, user.id:', user.id);
      const res = await matchingApi.getMatchingStatus(user.id);
      console.log('[디버깅] fetchMatchingStatus: API 응답 전체:', res);
      if (res && typeof res === 'object' && 'status' in res) {
        setMatchingStatus(res.status);
        console.log('[디버깅] fetchMatchingStatus: setMatchingStatus 호출, 값:', res.status);
      } else {
        setMatchingStatus(null);
        console.warn('[디버깅] fetchMatchingStatus: 응답에 status 필드 없음, res:', res);
      }
    } catch (e) {
      setMatchingStatus(null);
      console.error('[디버깅] fetchMatchingStatus: 에러 발생', e);
    } finally {
      setStatusLoading(false);
    }
  };

  // [추가] MainPage 진입 시 matchingStatus 자동 fetch
  useEffect(() => {
    if (user?.id) fetchMatchingStatus();
  }, [user?.id]);

  // 상대방 프로필 정보 fetch 함수
  const fetchPartnerProfile = async (partnerUserId: string) => {
    console.log('[MainPage][fetchPartnerProfile] 호출, partnerUserId:', partnerUserId);
    try {
      const res = await userApi.getUserProfile(partnerUserId);
      console.log('[MainPage][fetchPartnerProfile] API 성공, 결과:', res);
      setPartnerProfile(res);
    } catch (e) {
      console.error('[MainPage][fetchPartnerProfile] API 실패:', e);
      toast.error('상대방 프로필 정보를 불러오지 못했습니다.');
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

  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMatchingStatus(),
      partnerUserId ? fetchPartnerProfile(partnerUserId) : Promise.resolve()
    ]).finally(() => setLoading(false));
  }, [/* 의존성: 필요한 값들 */]);

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

  if (loading) return <LoadingSpinner sidebarOpen={sidebarOpen} />;

  if (isLoading || !isAuthenticated) return null;

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

  // 매칭 현황 안내문구 상태/기간 분리 및 색상 반환 (성공/실패/종료 색상 개선)
  const getMatchingStatusDisplay = () => {
    // [수정] period가 null이거나, finish가 지났으면 마감 처리
    if (!period || (period.finish && new Date(period.finish) < now)) {
      return {
        status: '이번 회차 매칭이 마감되었습니다.',
        period: '',
        color: '#888',
      };
    }
    const start = new Date(period.application_start);
    const end = new Date(period.application_end);
    const finish = period.finish ? new Date(period.finish) : null;
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    const nowTime = now.getTime();
    // [1] 매칭 공지일 도래 후: 결과 대기중 분기 최상단
    if (announce && nowTime >= announce.getTime()) {
      if (matchingStatus == null || typeof matchingStatus.matched === 'undefined') {
        return {
          status: '결과 대기중',
          period: '매칭 결과를 불러오는 중입니다...',
          color: '#888',
        };
      }
      if (matchingStatus.matched === true) {
        return {
          status: '매칭 성공',
          period: '상대방 프로필을 확인해보세요.',
          color: '#27ae60',
        };
      }
      if (matchingStatus.matched === false) {
        return {
          status: '매칭 실패',
          period: '아쉽지만 다음기회를 기약할게요.',
          color: '#e74c3c',
        };
      }
    }
    // [2] 신청 마감 후 ~ 매칭 공지 전 (신청 마감은 지났고, 공지 전)
    if (nowTime > end.getTime() && (!announce || nowTime < announce.getTime())) {
      // 이미 신청한 사람: 신청 완료, 미신청: 신청 마감
      if (matchingStatus && matchingStatus.applied && !matchingStatus.cancelled) {
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
    // [3] 회차 종료 이후(다음 회차 전) 또는 신청기간이 아님
    if ((finish && nowTime >= finish.getTime()) || nowTime < start.getTime()) {
      return {
        status: '신청 기간이 아닙니다.',
        period: `신청기간 : ${formatKST(period.application_start)}\n~ ${formatKST(period.application_end)}`,
        color: '#888',
      };
    }
    // [4] 신청 기간 중, 미신청 또는 신청 취소
    if (!matchingStatus || !matchingStatus.applied || matchingStatus.cancelled) {
      return {
        status: '매칭 미신청',
        period: `신청기간 : ${formatKST(period.application_start)}\n~ ${formatKST(period.application_end)}`,
        color: '#1976d2',
      };
    }
    // [5] 신청을 한 상태(신청 완료, 매칭 공지 전)
    if (!announce || nowTime < announce.getTime()) {
      return {
        status: '신청 완료',
        period: `매칭 공지를 기다려주세요\n매칭일 : ${announce ? formatKST(period.matching_announce) : '-'}`,
        color: '#7C3AED',
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

  // 버튼 상태/표기 결정
  let buttonDisabled = true;
  let buttonLabel = '매칭 신청하기';
  let periodLabel = '';
  let showCancel = false;

  const { status: statusText, period: periodText } = getMatchingStatusDisplay();
  periodLabel = periodText;

  // 10분 재신청 제한 로직
  let canReapply = true;
  let reapplyMessage = '';
  if (matchingStatus && matchingStatus.cancelled && matchingStatus.cancelled_at) {
    const cancelledAt = new Date(matchingStatus.cancelled_at);
    const nowTime = now.getTime();
    const diff = nowTime - cancelledAt.getTime();
    if (diff < 10 * 60 * 1000) {
      canReapply = false;
      const remain = 10 * 60 * 1000 - diff;
      const min = Math.floor(remain / 60000);
      const sec = Math.floor((remain % 60000) / 1000);
      reapplyMessage = `신청까지\n남은 시간: ${min}분 ${sec}초`;
    }
  }

  // 버튼/문구 분기 보완 (신청기간 && 신청 내역 없음이면 반드시 활성화)
  if (period) {
    const start = new Date(period.application_start);
    const end = new Date(period.application_end);
    const announce = period.matching_announce ? new Date(period.matching_announce) : null;
    const nowTime = now.getTime();
    // 신청 마감 후 ~ 공지 전: 무조건 비활성화
    if (nowTime > end.getTime() && (!announce || nowTime < announce.getTime())) {
      buttonDisabled = true;
      buttonLabel = matchingStatus && matchingStatus.applied && !matchingStatus.cancelled ? '신청 완료' : '매칭 신청 불가';
      showCancel = false;
    } else if (now >= start && now <= end) {
      if (!matchingStatus) {
      buttonDisabled = false;
        buttonLabel = '매칭 신청하기';
        showCancel = false;
      } else if (matchingStatus.matched === true) {
        buttonDisabled = true;
        buttonLabel = '신청 완료';
        showCancel = true;
      } else if (matchingStatus.applied && !matchingStatus.cancelled) {
        buttonDisabled = true;
        buttonLabel = '신청 완료';
        showCancel = true;
      } else if (matchingStatus.cancelled && matchingStatus.cancelled_at) {
        buttonDisabled = !canReapply;
        buttonLabel = '매칭 신청하기';
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

  const quickActions = [
    {
      icon: <FaUser />,
      title: '프로필 관리',
      description: '내 프로필 정보를 수정하고 관리하세요.',
      action: () => navigate('/profile'),
      disabled: false,
    },
    {
      icon: <FaRegStar />,
      title: '내가 선호하는 스타일',
      description: '내가 선호하는 스타일을 조회/수정할 수 있습니다.',
      action: () => navigate('/preference'),
      disabled: false,
    },
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
          <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            {/* 안내문구 분리 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 18,
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
                매칭 신청 시점의 프로필/선호 스타일이 매칭에 사용됩니다.
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
                신청 후에는 프로필/선호 스타일을 변경해도 이번 매칭에는 반영되지 않습니다.
              </div>
            </div>
            {/* 프로필/선호 스타일 요약 */}
            <div style={{
              border: 'none',
              borderRadius: '14px',
              padding: '18px 0 10px 0',
              maxWidth: '420px',
              background: 'none',
              fontSize: '1rem',
              margin: '0 auto',
            }}>
              <div style={{marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:'1.18rem',color:'#4F46E5',marginBottom:2}}>{profile?.nickname || displayName}</div>
                <div style={{fontSize:'0.98rem',color:'#666'}}>{profile?.birth_year || 0}년생 · {profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'} · {profile?.job_type || '-'}</div>
              </div>
              <div style={{display:'flex',gap:16,marginBottom:10}}>
                <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem'}}>MBTI</span>
                <span style={{color:'#222',fontSize:'1rem'}}>{profile?.mbti || '-'}</span>
                <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem'}}>결혼상태</span>
                <span style={{color:'#222',fontSize:'1rem'}}>{profile?.marital_status || '-'}</span>
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
            <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'center' }}>
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
          <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 18,
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
                신청 취소 후 <b style={{color:'#e74c3c'}}>10분 동안 재신청이 불가</b>합니다.<br/>
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
        {quickActions.map((action, index) => (
          <ActionCard
            key={index}
            onClick={!action.disabled ? action.action : undefined}
            style={action.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
          >
            <ActionIcon>{action.icon}</ActionIcon>
            <ActionTitle>{action.title}</ActionTitle>
            {action.title === '매칭 현황' ? (() => {
              const { status, period, color } = getMatchingStatusDisplay();
              return (
                <div style={{
                  marginTop: 18,
                  background: 'linear-gradient(135deg, #f7f7fa 0%, #e9e6f7 100%)',
                  borderRadius: 10,
                  padding: '18px 14px',
                  minHeight: 56,
                  boxShadow: '0 2px 8px rgba(80,60,180,0.06)',
                  textAlign: 'center',
                  letterSpacing: '-0.01em'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '1.13rem', color, marginBottom: period ? 8 : 0 }}>{status}</div>
                  {period && <div style={{ fontSize: '0.93rem', color: '#555', fontWeight: 500, whiteSpace: 'pre-line' }}>{period}</div>}
                  {/* 매칭 성공 시 상대방 프로필 박스 */}
                  {status === '매칭 성공' && partnerUserId && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #f7f7fa 0%, #e9e6f7 100%)',
                        borderRadius: 10,
                        padding: '7px 14px 7px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        boxShadow: '0 2px 8px rgba(80,60,180,0.08)',
                        minWidth: 90,
                        cursor: 'pointer',
                        border: '1.5px solid #e0e7ff',
                        transition: 'box-shadow 0.15s',
                        marginTop: 14,
                        justifyContent: 'center',
                      }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await fetchPartnerProfile(partnerUserId!);
                        setShowPartnerModal(true);
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,63,237,0.13)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(80,60,180,0.08)')}
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
                          if (!partnerProfile?.nickname) {
                            console.warn('[MainPage] partnerProfile 닉네임 없음! partnerProfile:', partnerProfile, '\npartnerUserId:', partnerUserId, '\nmatchingStatus:', matchingStatus);
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
            <ActionDescription>{action.description}</ActionDescription>
            )}
            {/* 채팅하기 카드만 커스텀 안내문구/버튼 */}
            {action.title === '상대방과 약속잡기' ? (
              <>
                <button
                  style={{
                    marginTop: 10,
                    background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 16,
                    padding: '7px 18px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: canChat ? 'pointer' : 'not-allowed',
                    opacity: canChat ? 1 : 0.5,
                  }}
                  disabled={!canChat}
                  onClick={e => {
                    e.stopPropagation();
                    if (canChat) navigate(`/chat/${partnerUserId}`);
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
        ))}
      </QuickActions>

    </MainContainer>
  );
};

export default MainPage; 