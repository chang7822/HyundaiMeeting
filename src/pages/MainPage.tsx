import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FaComments, FaUser, FaRegStar, FaRegClock, FaChevronRight, FaExclamationTriangle, FaBullhorn } from 'react-icons/fa';
import { matchingApi, chatApi, authApi, companyApi, noticeApi } from '../services/api.ts';
import { toast } from 'react-toastify';
import ProfileCard, { ProfileIcon } from '../components/ProfileCard.tsx';
import { userApi } from '../services/api.ts';
import { Company } from '../types/index.ts';
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
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
  
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

const TopWelcomeTitle = styled.h1`
  color: #ffffff;
  margin-bottom: 0.4rem;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.3;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);

  @media (max-width: 1024px) {
    font-size: 2.1rem;
  }

  @media (max-width: 768px) {
    font-size: 1.9rem;
    margin-bottom: 0.35rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.7rem;
    margin-bottom: 0.3rem;
  }
`;

const TopWelcomeSubtitle = styled.p`
  color: #e5e7ff;
  font-size: 1.05rem;
  margin-bottom: 1.4rem;
  line-height: 1.5;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);

  @media (max-width: 768px) {
    font-size: 0.98rem;
    margin-bottom: 1.2rem;
  }

  @media (max-width: 480px) {
    font-size: 0.92rem;
    margin-bottom: 1rem;
  }
`;

const StatusChatWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
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

const LatestNoticeCard = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border-radius: 16px;
  padding: 1.1rem 1.4rem;
  margin-bottom: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border: 1px solid rgba(102, 126, 234, 0.18);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.15);
  transition: all 0.2s ease;
  gap: 1rem;
  overflow: hidden; /* 내부 내용이 카드 밖으로 나가도 전체 페이지에 스크롤이 생기지 않도록 */

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.45);
  }

  @media (max-width: 768px) {
    padding: 1rem 1.2rem;
    margin-bottom: 1.4rem;
    border-radius: 14px;
  }

  @media (max-width: 480px) {
    padding: 0.9rem 1rem;
    margin-bottom: 1.2rem;
    border-radius: 12px;
  }
`;

const LatestNoticeLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1; /* 제목 영역이 오른쪽 영역과 함께 줄어들 수 있게 함 */
`;

const LatestNoticeTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  flex: 1; /* 내부 텍스트 그룹도 줄어들 수 있게 */
`;

const LatestNoticeLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const LatestNoticeTitle = styled.span`
  font-size: 0.98rem;
  font-weight: 600;
  color: #1f2933;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; /* 블록 요소로 만들어 ellipsis 적용 보장 */
  max-width: 100%;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    font-size: 0.92rem;
  }

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const LatestNoticeRight = styled.span`
  font-size: 0.85rem;
  color: #4f46e5;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

// 다음 회차 예정 배지용 래퍼: 데스크탑에서는 버튼/문구와 같은 row의 우측 끝, 모바일에서는 전체 폭
const NextPeriodWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  margin-left: auto; /* 데스크탑: 같은 row에서 오른쪽 끝으로 밀기 */

  @media (max-width: 600px) {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
`;

// 다음 회차 예정 배지: 모바일에서는 좌우 전체 폭을 채우도록 설정
const NextPeriodBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(124, 58, 237, 0.08) 100%);
  border: 1px solid rgba(79, 70, 229, 0.25);

  @media (max-width: 600px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
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

// 새로운 컴팩트 카드 스타일 (가로 배치용)
const CompactCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  min-height: 80px;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
    border-color: rgba(102, 126, 234, 0.2);
  }
  
  &:active {
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    min-height: 70px;
  }
  
  @media (max-width: 480px) {
    padding: 0.9rem;
    min-height: 65px;
  }
`;

const CompactIcon = styled.div`
  font-size: 1.8rem;
  color: #667eea;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  min-width: 2.5rem;
  
  ${CompactCard}:hover & {
    transform: scale(1.1);
  }
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin-right: 0.8rem;
    min-width: 2.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-right: 0.7rem;
    min-width: 2rem;
  }
`;

const CompactTitle = styled.h3`
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  
  /* 태블릿에서 2x2 그리드 */
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
    margin-bottom: 1.5rem;
  }
  
  /* 모바일에서 2x2 그리드 유지 */
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
    margin-bottom: 1rem;
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



const cancelTime = 1;

const MainPage = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, fetchUser, setProfile } = useAuth() as any;
  const [period, setPeriod] = useState<any>(null);        // 현재 회차
  const [nextPeriod, setNextPeriod] = useState<any>(null); // NEXT 회차(예고용)
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [partnerProfileError, setPartnerProfileError] = useState(false);
  const [partnerProfileLoading, setPartnerProfileLoading] = useState(false);
  const [showMatchingConfirmModal, setShowMatchingConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [latestNotice, setLatestNotice] = useState<{ id: number; title: string } | null>(null);
  const [isLoadingNotice, setIsLoadingNotice] = useState(false);
  
  // 이메일 인증 관련 상태
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [emailVerificationStep, setEmailVerificationStep] = useState<'input'>('input');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const partnerUserId = useMemo(() => {
    const id = (matchingStatus && matchingStatus.matched === true) ? (matchingStatus.partner_user_id || null) : null;
    return id;
  }, [matchingStatus]);

  // [추가] 매칭 성공 상태라면 partnerProfile을 자동으로 fetch
  useEffect(() => {
    // 회차가 종료되었으면 파트너 프로필 조회하지 않음
    const isCurrentPeriodFinished = period && period.finish && new Date(period.finish) < now;
    
    if (
      !isCurrentPeriodFinished &&
      matchingStatus &&
      matchingStatus.matched === true &&
      partnerUserId
    ) {
      // 이미 에러 상태이거나 로딩 중이거나 해당 사용자의 프로필이 있으면 호출하지 않음
      if (!partnerProfileError && !partnerProfileLoading && (!partnerProfile || partnerProfile.user_id !== partnerUserId)) {
        fetchPartnerProfile(partnerUserId);
      }
    } else {
      // 매칭 상태가 아니거나 회차가 종료되었을 때 상태 초기화
      setPartnerProfile(null);
      setPartnerProfileError(false);
      setPartnerProfileLoading(false);
    }
  }, [matchingStatus, partnerUserId, period, now]); // period, now 의존성 추가하고 상태 의존성 제거

  useEffect(() => {
    matchingApi.getMatchingPeriod().then(data => {
      if (!data) {
        setPeriod(null);
        setNextPeriod(null);
      } else if (data.current || data.next) {
        // 백엔드가 { current, next } 형태로 내려주는 경우
        setPeriod(data.current || null);
        setNextPeriod(data.next || null);
      } else {
        // 과거 호환: 단일 회차 객체만 내려오는 경우
        setPeriod(data);
        setNextPeriod(null);
      }
      setLoadingPeriod(false);
    }).catch((err) => {
      setLoadingPeriod(false);
      console.error('[MainPage] 매칭 기간 API 에러:', err);
    });
    const timer = window.setInterval(() => {
      const newNow = new Date();
      // 초 단위가 바뀔 때만 업데이트 (불필요한 리렌더링 방지)
      setNow(prev => {
        // 초기값이 없거나 초 단위가 바뀐 경우에만 업데이트
        if (!prev || Math.floor(newNow.getTime() / 1000) !== Math.floor(prev.getTime() / 1000)) {
          return newNow;
        }
        return prev;
      });
    }, 1000); // 1초마다 갱신
    return () => window.clearInterval(timer);
  }, []);

  // 최신 공지사항 1건 조회
  useEffect(() => {
    const fetchLatestNotice = async () => {
      try {
        setIsLoadingNotice(true);
        const data = await noticeApi.getNotices();
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          if (first && typeof first.id === 'number' && typeof first.title === 'string') {
            setLatestNotice({ id: first.id, title: first.title });
          }
        }
      } catch (e) {
        console.error('[MainPage] 최신 공지사항 조회 오류:', e);
      } finally {
        setIsLoadingNotice(false);
      }
    };

    fetchLatestNotice();
  }, []);

  // 선호 회사 이름 매핑용 회사 목록 로드
  useEffect(() => {
    companyApi
      .getCompanies()
      .then(setCompanies)
      .catch(() => {
        // 회사 목록 로드 실패 시에도 페이지는 계속 동작하게 둔다.
      });
  }, []);

  // 안읽은 메시지 개수 조회
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await chatApi.getUnreadCount(user.id);
      setUnreadCount(result.unreadCount || 0);
    } catch (error) {
      console.error('안읽은 메시지 개수 조회 실패:', error);
      setUnreadCount(0);
    }
  }, [user?.id]);

  // 매칭 상태 조회 (로딩 상태 최소화)
  const fetchMatchingStatus = useCallback(async (showLoading = false) => {
    if (!user?.id) {
      setStatusLoading(false);
      return;
    }
    
    if (showLoading) {
      setStatusLoading(true);
    }
    
    try {
      const res = await matchingApi.getMatchingStatus(user.id);
      
      if (res && typeof res === 'object' && 'status' in res && res.status) {
        const newStatus = {
          ...res.status,
          is_applied: res.status.is_applied ?? res.status.applied,
          is_matched: res.status.is_matched ?? res.status.matched,
          is_cancelled: res.status.is_cancelled ?? res.status.cancelled,
        };
        
        // 상태가 실제로 변경된 경우에만 업데이트 (불필요한 리렌더링 방지)
        setMatchingStatus(prev => {
          // 핵심 상태값만 비교하여 깜빡임 방지
          if (!prev || 
              prev.is_applied !== newStatus.is_applied ||
              prev.is_matched !== newStatus.is_matched ||
              prev.is_cancelled !== newStatus.is_cancelled ||
              prev.partner_user_id !== newStatus.partner_user_id) {
            return newStatus;
          }
          return prev;
        });
      } else {
        setMatchingStatus(null);
      }
    } catch (e) {
      console.error('매칭 상태 조회 오류:', e);
      setMatchingStatus(null);
    } finally {
      if (showLoading) {
        setStatusLoading(false);
      }
    }
  }, [user?.id]);

  // 메인페이지 진입 시 사용자 정지 상태 확인 (로딩 스피너 없이)
  const checkUserBanStatus = useCallback(async () => {
    try {
      const userData = await userApi.getMe();
      
      // 정지 상태가 변경되었다면 전체 사용자 정보 업데이트 (백그라운드)
      if (userData.is_banned !== user?.is_banned || userData.banned_until !== user?.banned_until) {
        await fetchUser(false);
      }
    } catch (error) {
      console.error('[MainPage] 사용자 상태 확인 오류:', error);
    }
  }, [user?.is_banned, user?.banned_until, fetchUser]);

  // MainPage 진입 시 정지 상태 확인 후 기본 데이터 로드
  useEffect(() => {
    if (user?.id) {
      checkUserBanStatus().then(() => {
        fetchMatchingStatus(true); // 초기 로드시에만 로딩 표시
        fetchUnreadCount();
      });
    }
  }, [user?.id, checkUserBanStatus, fetchMatchingStatus, fetchUnreadCount]);

  // 상대방 프로필 정보 fetch 함수
  const fetchPartnerProfile = async (partnerUserId: string) => {
    // 이미 에러 상태이거나 로딩 중이면 중복 호출 방지
    if (partnerProfileError || partnerProfileLoading) {
      return;
    }
    
    setPartnerProfileLoading(true);
    setPartnerProfileError(false);
    try {
      const res = await userApi.getUserProfile(partnerUserId);
      setPartnerProfile(res);
      setPartnerProfileError(false);
    } catch (e) {
      console.error('[MainPage][fetchPartnerProfile] API 실패:', e);
      setPartnerProfileError(true);
      setPartnerProfile(null);
      // 탈퇴한 사용자에 대해서는 토스트 메시지를 표시하지 않음 (조용히 처리)
    } finally {
      setPartnerProfileLoading(false);
    }
  };

  // 매칭/공지 타이밍에 의존하지 않고, 일정 주기로 상태를 갱신해서
  // 새로고침 없이도 성공/실패, 신청 여부가 자동으로 반영되도록 폴링
  useEffect(() => {
    if (!user?.id) return;
    const interval = window.setInterval(() => {
      // 로딩 스피너 없이 조용히 상태만 갱신
      fetchMatchingStatus(false);
    }, 5000); // 5초마다 최신 상태 확인
    return () => window.clearInterval(interval);
  }, [user?.id, fetchMatchingStatus]);


  // 매칭 결과 폴링 제거 - 사용자가 직접 "매칭 결과 확인" 버튼으로 새로고침

  // 모달이 열릴 때 body 스크롤 막기
  useEffect(() => {
    const isAnyModalOpen = showProfileModal || showPartnerModal || showMatchingConfirmModal || showCancelConfirmModal;
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => { document.body.classList.remove('modal-open'); };
  }, [showProfileModal, showPartnerModal, showMatchingConfirmModal, showCancelConfirmModal]);

  // 모든 useState, useEffect 선언 이후
  // useEffect는 항상 최상단에서 호출
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);



  // 안읽은 메시지 개수 정기 업데이트 (5초마다, 최대한 실시간에 가깝게)
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = window.setInterval(async () => {
      try {
        const result = await chatApi.getUnreadCount(user.id);
        const newCount = result.unreadCount || 0;
        // 개수가 실제로 변경된 경우에만 업데이트
        setUnreadCount(prev => prev !== newCount ? newCount : prev);
      } catch (error) {
        // 에러 시 조용히 무시 (깜빡임 방지)
      }
    }, 5000); // 5초마다 업데이트

    return () => window.clearInterval(interval);
  }, [user?.id]);

  // 카운트다운 계산 함수 (조건부 렌더링 이전에 선언)
  const calculateCountdown = useCallback(() => {
    if (!period || !user || !profile || loadingPeriod || statusLoading) return;
    
    let status = '';

    if (period && !(period.finish && new Date(period.finish) < now)) {
      const announce = period.matching_announce ? new Date(period.matching_announce) : null;
      const nowTime = now.getTime();

      // 🔧 getUserMatchingState 와 동일하게, 매칭 결과는 matchingStatus만 신뢰
      let isApplied = false;
      let isMatched: boolean | null = null;

      if (matchingStatus) {
        isApplied = matchingStatus.is_applied === true || matchingStatus.applied === true;

        if (typeof matchingStatus.is_matched === 'boolean') {
          isMatched = matchingStatus.is_matched;
        } else if (typeof matchingStatus.matched === 'boolean') {
          isMatched = matchingStatus.matched;
        } else {
          isMatched = null;
        }
      } else if (user) {
        // matchingStatus가 아직 없으면, 신청 여부만 user에서 보완
        isApplied = user.is_applied === true;
        isMatched = null;
      }

      if (announce && nowTime >= announce.getTime() && isApplied && isMatched === true) {
        status = '매칭 성공';
      }
    }
    
    const canChat = status === '매칭 성공' && partnerUserId;

    if (!period?.finish || !canChat) {
      setCountdown('');
      return;
    }

    const finishTime = new Date(period.finish);
    const nowTime = new Date();
    const diff = finishTime.getTime() - nowTime.getTime();

    if (diff <= 0) {
      setCountdown('마감됨');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let countdownText = '';
    if (days > 0) countdownText += `${days}일 `;
    if (hours > 0) countdownText += `${hours}시간 `;
    if (minutes > 0) countdownText += `${minutes}분 `;
    countdownText += `${seconds}초`;

    // 카운트다운이 실제로 변경된 경우에만 업데이트 (깜빡임 방지)
    setCountdown(prev => prev !== countdownText ? countdownText : prev);
  }, [period, user, profile, loadingPeriod, statusLoading, now, partnerUserId, matchingStatus]);

  // 카운트다운 업데이트 (깜빡임 방지)
  useEffect(() => {
    calculateCountdown();
    const interval = window.setInterval(() => {
      // 카운트다운이 실제로 필요한 상황에서만 계산
      if (period && user && profile && !loadingPeriod && !statusLoading) {
        calculateCountdown();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [calculateCountdown, period, user, profile, loadingPeriod, statusLoading]);

  // 인증되지 않은 상태면 랜딩페이지로 리다이렉트
  if (!isAuthenticated && !isLoading) {
    navigate('/');
    return null;
  }
  
  // 핵심 데이터 로딩 시 전체 스피너
  if (!user || !profile) {
    return <LoadingSpinner sidebarOpen={sidebarOpen} />;
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

  // [리팩터링] 매칭 상태 분기 함수
  const getUserMatchingState = () => {
    // 🔧 성공/실패 여부(isMatched)는 **항상 서버에서 내려준 matchingStatus만** 신뢰하고,
    // user 객체의 과거 is_matched 값(이전 회차 결과 등)은 사용하지 않는다.
    // (모바일에서 과거 회차의 실패 값이 잠깐 섞여 "매칭 실패"로 보이는 문제 방지)

    let isApplied = false;
    let isMatched: boolean | null = null;
    
    if (matchingStatus) {
      // 신청 여부는 matchingStatus를 우선 사용하되, 없으면 false
      isApplied = matchingStatus.is_applied === true || matchingStatus.applied === true;

      // 매칭 결과(boolean)가 명시된 경우에만 성공/실패로 사용
      if (typeof matchingStatus.is_matched === 'boolean') {
        isMatched = matchingStatus.is_matched;
      } else if (typeof matchingStatus.matched === 'boolean') {
        isMatched = matchingStatus.matched;
      } else {
        isMatched = null; // 아직 결과 미정 → "결과 준비중"
    }
    } else if (user) {
      // matchingStatus가 아직 없으면, 신청 여부만 user에서 보완
      isApplied = user.is_applied === true;
      // isMatched는 과거 회차의 잔존값일 수 있으므로 **사용하지 않고 null로 둔다**
      isMatched = null;
    }
    
    // is_cancelled는 matchingStatus에서만 사용
    const isCancelled = matchingStatus?.is_cancelled === true || matchingStatus?.cancelled === true;
    
    return { isApplied, isMatched, isCancelled };
  };

  // [리팩터링] 매칭 현황 안내문구 상태/기간 분리 및 색상 반환 (is_applied, is_matched 기준)
  const getMatchingStatusDisplay = () => {
    // 매칭 로그가 없는 경우 (관리자가 삭제했거나 아직 생성되지 않음)
    if (!period) {
      return {
        status: '현재 진행 중인 매칭이 없습니다.',
        period: '새로운 매칭 회차를 기다려주세요.',
        color: '#888',
      };
    }
    
    // 회차가 종료된 경우
    if (period.finish && new Date(period.finish) < now) {
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
          period: '매칭 신청기간이 아닙니다.\n다음 회차에 이용해주세요.',
          color: '#888',
        };
      }
      if (typeof isMatched === 'undefined' || isMatched === null) {
        return {
          status: '결과 준비중',
          period: '매칭 결과를 불러오는 중입니다.',
          color: '#7C3AED',
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
        const finishLabel = period.finish ? formatKST(period.finish) : '-';
        return {
          status: '매칭 실패',
          period: `아쉽지만 다음기회를 기약할게요.\n매칭 종료 : ${finishLabel}`,
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

  // [리팩터링] 버튼 상태/표기 결정 (is_applied, is_matched 기준)
  let buttonDisabled = true;
  let buttonLabel = '매칭 신청하기';
  let periodLabel = '';
  let showCancel = false;

  const { period: periodText } = getMatchingStatusDisplay();
  periodLabel = periodText;

  // 매칭 성공 && 회차 마감 전일 때만 채팅 가능
  const { status } = getMatchingStatusDisplay();
  const canChat = status === '매칭 성공' && partnerUserId;

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

    // [리팩터링] 버튼/문구 분기 (정지 상태 + is_applied, is_matched 기준)
  if (period) {
    // 정지 상태 체크 (최우선)
    if (user?.is_banned) {
      if (user.banned_until) {
        const bannedUntil = new Date(user.banned_until);
        const now = new Date();
        if (bannedUntil > now) {
          buttonDisabled = true;
          buttonLabel = `정지 상태 (${bannedUntil.toLocaleDateString('ko-KR')}까지)`;
          showCancel = false;
        } else {
          // 정지 기간이 만료된 경우 정상 처리
        }
      } else {
        buttonDisabled = true;
        buttonLabel = '영구 정지 상태';
        showCancel = false;
      }
    } else {
      // 정지 상태가 아닌 경우에만 기존 로직 실행
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
          // 🔧 아직 매칭 결과(boolean)가 결정되지 않은 상태에서는
          // 실패로 취급하지 않고 "결과 준비중" 상태로만 표시한다.
          // (모바일처럼 네트워크/렌더 타이밍이 느린 환경에서
          // 잠깐이라도 "매칭 실패"로 보이는 현상 방지)
          buttonDisabled = true;
          buttonLabel = '결과 준비중';
          showCancel = false;
        } else if (isMatched === true) {
          buttonDisabled = true;
          buttonLabel = '매칭 성공';
          showCancel = false;
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
  }

  // NEXT 회차 예고 문구 (현재 회차가 발표완료 상태이고, NEXT 회차가 있을 때만 노출)
  let nextPeriodLabel: string | null = null;
  if (period && nextPeriod && period.matching_announce) {
    const announceTime = new Date(period.matching_announce);
    const finishTime = period.finish ? new Date(period.finish) : null;
    const nowTime = now.getTime();

    const isAfterAnnounce = nowTime >= announceTime.getTime();
    const isBeforeFinish = !finishTime || nowTime < finishTime.getTime();

    if (isAfterAnnounce && isBeforeFinish) {
      // 현재 회차: 발표완료~마감 전 구간 → NEXT 회차 예고
      const nextStart = nextPeriod.application_start
        ? formatKST(nextPeriod.application_start)
        : '-';
      const nextEnd = nextPeriod.application_end
        ? formatKST(nextPeriod.application_end)
        : '-';
      // "YYYY-MM-DD HH시 mm분 ~ YYYY-MM-DD HH시 mm분" 형식만 담아두고,
      // 문구는 렌더링 쪽에서 조합
      nextPeriodLabel = `${nextStart} ~`;
    }
  }



  const quickActions: QuickAction[] = [
    {
      icon: <FaRegClock />,
      title: '매칭 현황',
      description: '',
      action: () => {},
      disabled: false,
    },
  ];

  // 컴팩트 카드용 액션들 (2x2 그리드)
  const compactActions = [
    {
      icon: <FaExclamationTriangle />,
      title: '공지사항',
      action: () => navigate('/notice'),
      disabled: false,
    },
    {
      icon: <FaRegStar />,
      title: 'FAQ',
      action: () => navigate('/faq'),
      disabled: false,
    },
    {
      icon: <FaUser />,
      title: '프로필',
      action: () => navigate('/profile'),
      disabled: false,
    },
    {
      icon: <FaRegStar />,
      title: '선호 스타일',
      action: () => {
        if (checkEmailVerification()) {
          navigate('/preference');
        }
      },
      disabled: false,
    },
  ];

  // 이메일 인증이 필요한 기능인지 체크
  const checkEmailVerification = () => {
    if (user?.is_verified === false) {
      setShowEmailVerificationModal(true);
      return false;
    }
    if (user?.is_verified !== true) {
      return false;
    }
    return true;
  };

  // 이메일 인증 처리
  const handleEmailVerification = async () => {
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    const userEmail = user?.email;
    if (!userEmail) {
      toast.error('사용자 이메일 정보를 찾을 수 없습니다.');
      return;
    }

    setIsVerifying(true);
    try {
      await authApi.confirmVerification(userEmail, verificationCode);
      toast.success('이메일 인증이 완료되었습니다!');
      setShowEmailVerificationModal(false);
      setVerificationCode('');
      // 사용자 정보 새로고침
      await fetchUser(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 이메일 재발송
  const handleResendVerificationEmail = async () => {
    const userEmail = user?.email;
    if (!userEmail) {
      toast.error('사용자 이메일 정보를 찾을 수 없습니다.');
      return;
    }

    setIsResending(true);
    try {
      await authApi.resendVerificationEmail(userEmail);
      toast.success('인증 메일이 재발송되었습니다.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '메일 발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsResending(false);
    }
  };

  // 매칭 신청
  const handleMatchingRequest = async () => {
    // 최신 프로필 정보를 서버에서 다시 조회 (기존 캐시/컨텍스트와 무관하게)
    let bodyTypes: string[] = [];
    let me: any = null;
    try {
      me = await userApi.getMe();
      const val: any = me.body_type;
      if (!val) {
        bodyTypes = [];
      } else if (Array.isArray(val)) {
        bodyTypes = val as string[];
      } else {
        try {
          const parsed = JSON.parse(val as any);
          bodyTypes = Array.isArray(parsed) ? parsed : [String(val)];
        } catch {
          bodyTypes = [String(val)];
        }
      }
    } catch (e) {
      console.error('[MainPage] 프로필 조회 중 오류:', e);
      bodyTypes = [];
    }

    // 모달에 보여줄 프로필도 최신 값으로 업데이트
    if (me) {
      try {
        setProfile(me);
      } catch (e) {
        console.error('[MainPage] setProfile 중 오류:', e);
      }
    }

    // 선호 회사 선택 여부 확인 (기존 회원 보호용)
    try {
      const preferCompany = me?.prefer_company;
      const preferCompanyCount =
        Array.isArray(preferCompany) ? preferCompany.length : 0;
      if (!preferCompanyCount || preferCompanyCount === 0) {
        toast.error('선호 스타일에서 선호 회사를 선택해주세요.');
        return;
      }
    } catch (e) {
      // 예외가 나더라도 매칭 전에 안전하게 막힌 상태이므로 추가 처리 없음
      toast.error('선호 스타일에서 선호 회사를 선택해주세요.');
      return;
    }

    // 선호 지역 선택 여부 확인 (기존 회원 보호용, 시/도 단위)
    try {
      const preferRegion = me?.prefer_region;
      const preferRegionCount =
        Array.isArray(preferRegion) ? preferRegion.length : 0;
      if (!preferRegionCount || preferRegionCount === 0) {
        toast.error('선호 스타일에서 선호 지역을 선택해주세요.');
        return;
      }
    } catch (e) {
      toast.error('선호 스타일에서 선호 지역을 선택해주세요.');
      return;
    }

    if (bodyTypes.length !== 3) {
      toast.error('원활한 매칭을 위해 프로필에서 체형 3개를 선택해 주세요.');
      return;
    }

    // 이메일 인증 체크
    if (!checkEmailVerification()) {
      return;
    }
    setShowMatchingConfirmModal(true);
  };

  const handleMatchingConfirm = async () => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      await matchingApi.requestMatching(user.id);
      toast.success('매칭 신청이 완료되었습니다!');
      
      // 백엔드 업데이트 완료를 위한 지연 시간 증가
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 순차적으로 상태 업데이트 (users 테이블 우선 업데이트)
      await fetchUser(true);
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
      
      // 백엔드 업데이트 완료를 위한 지연 시간 증가
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 순차적으로 상태 업데이트 (users 테이블 우선 업데이트)
      await fetchUser(true);
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

  // 정지 상태 체크 (최우선 필터링)
  const isBanned = user.is_banned === true;
  const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
  const isPermanentBan = isBanned && !bannedUntil;
  const isTemporaryBan = isBanned && bannedUntil;
  const isBanExpired = isTemporaryBan && bannedUntil && bannedUntil < now;

  // 정지 상태일 때 UI 분기
  if (isBanned && !isBanExpired) {
    const banMessage = isPermanentBan 
      ? '영구정지로 인해 매칭 신청이 불가능합니다.'
      : `매칭 신청이 불가능합니다.\n${formatKST(user.banned_until!)}까지 정지되었습니다.`;
    
    return (
      <MainContainer $sidebarOpen={sidebarOpen}>
        <TopWelcomeTitle>
          환영합니다,{' '}
          <NicknameSpan
            onClick={() => setShowProfileModal(true)}
            style={{ color: '#fffb8a', textDecorationColor: '#fffb8a' }}
          >
            {displayName}
          </NicknameSpan>
          님!
        </TopWelcomeTitle>
        <TopWelcomeSubtitle>
          직장인 솔로 매칭 플랫폼에 오신 것을 환영합니다.
        </TopWelcomeSubtitle>
        <WelcomeSection>
          {/* 이메일 인증 알림 */}
          {user?.is_verified === false && (
            <div style={{
              background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
              border: '2px solid #f39c12',
              borderRadius: '16px',
              padding: '20px',
              marginTop: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(243, 156, 18, 0.2)'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#d68910', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>이메일 인증이 필요합니다</span>
              </div>
              <p style={{ 
                color: '#856404', 
                margin: '0 0 16px 0', 
                fontSize: '0.95rem',
                lineHeight: '1.4'
              }}>
                매칭 신청 및 프로필 수정을 위해서는 이메일 인증을 완료해주세요.
              </p>
              <button
                onClick={() => setShowEmailVerificationModal(true)}
                style={{
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(243, 156, 18, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e67e22';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f39c12';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📧 이메일 인증하기
              </button>
            </div>
          )}
          
          {/* 정지 상태 안내 */}
          <div style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
            border: '2px solid #feb2b2',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '2rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(254, 178, 178, 0.2)'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#e53e3e',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              {isPermanentBan ? '영구정지' : '기간정지'}
            </div>
            <div style={{
              fontSize: '1.1rem',
              color: '#c53030',
              fontWeight: '600',
              lineHeight: '1.6',
              whiteSpace: 'pre-line'
            }}>
              {banMessage}
            </div>
            {isTemporaryBan && (
              <div style={{
                fontSize: '0.95rem',
                color: '#744210',
                marginTop: '12px',
                fontWeight: '500'
              }}>
                정지 기간이 만료되면 자동으로 해제됩니다.
              </div>
            )}
          </div>
        </WelcomeSection>
        
        {/* 정지 상태일 때는 QuickActions 숨김 */}
      </MainContainer>
    );
  }

  const handleOpenProfileModal = async () => {
    try {
      const me = await userApi.getMe();
      if (me) {
        try {
          setProfile(me);
        } catch (e) {
          console.error('[MainPage] 프로필 모달 setProfile 중 오류:', e);
        }
      }
    } catch (e) {
      console.error('[MainPage] 프로필 모달용 프로필 조회 중 오류:', e);
    } finally {
      setShowProfileModal(true);
    }
  };

  return (
    <MainContainer $sidebarOpen={sidebarOpen}>
      <TopWelcomeTitle>
        환영합니다,{' '}
        <NicknameSpan
          onClick={handleOpenProfileModal}
          style={{ color: '#fffb8a', textDecorationColor: '#fffb8a' }}
        >
          {displayName}
        </NicknameSpan>
        님!
      </TopWelcomeTitle>
      <TopWelcomeSubtitle>
        직장인 솔로 매칭 플랫폼에 오신 것을 환영합니다.
      </TopWelcomeSubtitle>
      <WelcomeSection>
        {/* 최신 공지사항 카드 */}
        {latestNotice && (
          <LatestNoticeCard
            onClick={() => navigate(`/notice/${latestNotice.id}`)}
          >
            <LatestNoticeLeft>
              <FaBullhorn size={20} color="#4F46E5" />
              <LatestNoticeTextGroup>
                <LatestNoticeLabel>
                  <span>공지사항</span>
                </LatestNoticeLabel>
                <LatestNoticeTitle>
                  {latestNotice.title}
                </LatestNoticeTitle>
              </LatestNoticeTextGroup>
            </LatestNoticeLeft>
            <LatestNoticeRight>
              <span>자세히 보기</span>
              <FaChevronRight size={14} />
            </LatestNoticeRight>
          </LatestNoticeCard>
        )}
        
        {/* 이메일 인증 알림 */}
        {user?.is_verified === false && (
          <div style={{
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
            border: '2px solid #f39c12',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(243, 156, 18, 0.2)'
          }}>
            <div style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#d68910', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>이메일 인증이 필요합니다</span>
            </div>
            <p style={{ 
              color: '#856404', 
              margin: '0 0 16px 0', 
              fontSize: '0.95rem',
              lineHeight: '1.4'
            }}>
              매칭 신청 및 프로필 수정을 위해서는 이메일 인증을 완료해주세요.
            </p>
            <button
              onClick={() => setShowEmailVerificationModal(true)}
              style={{
                background: '#f39c12',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(243, 156, 18, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e67e22';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f39c12';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              📧 이메일 인증하기
            </button>
          </div>
        )}
        
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
        {nextPeriodLabel && (
          <NextPeriodWrapper>
            <NextPeriodBadge>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#4F46E5',
                  background: 'rgba(79, 70, 229, 0.1)',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                다음 회차 신청
              </span>
              <span
                style={{
                  fontSize: '0.9rem',
                  color: '#111827',
                  fontWeight: 600,
                  textAlign: 'left',
                  flex: 1,
                }}
              >
                {nextPeriodLabel}
              </span>
            </NextPeriodBadge>
          </NextPeriodWrapper>
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
              company={profile?.company || undefined}
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
              company={partnerProfile.company || undefined}
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
                  <div style={{fontSize:'0.98rem',color:'#666'}}>
                    {profile?.birth_year || 0}년생 · {profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'}
                    {profile?.company ? ` · ${profile.company}` : ''}
                    {' · '}{profile?.job_type || '-'}
                  </div>
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
                  {/* 체형 - row 배치, ,로 join해서 한 줄로 모두 표시 */}
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
                  {/* 거주지 - 체형 밑 한 줄 전체 사용 */}
                  <div style={{display:'flex',flexDirection:'row',alignItems:'center',flex:'1 1 100%',minWidth:0,marginRight:0,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span style={{fontWeight:600,color:'#4F46E5',fontSize:'0.98rem',marginRight:4}}>거주지</span>
                    <span style={{color:'#222',fontSize:'1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {profile?.residence || '-'}
                    </span>
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
                    <b>회사:</b> {(() => {
                      const ids = (profile as any)?.prefer_company;
                      if (!ids || !Array.isArray(ids) || !companies.length) return '-';
                      const names = ids
                        .map((id: number) => {
                          const found = companies.find(c => Number(c.id) === id);
                          return found?.name;
                        })
                        .filter((name): name is string => !!name);
                      return names.length > 0 ? names.join(', ') : '-';
                    })()}<br/>
                    <b>직군:</b> {(() => {
                      const arr = profile?.preferred_job_types ? (Array.isArray(profile.preferred_job_types) ? profile.preferred_job_types : (()=>{try{return JSON.parse(profile.preferred_job_types);}catch{return[];}})()) : [];
                      return arr.length > 0 ? arr.join(', ') : '-';
                    })()}<br/>
                    <b>지역:</b> {(() => {
                      const arr = profile?.prefer_region;
                      if (!arr || !Array.isArray(arr)) return '-';
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
      
      {/* 주요 기능 카드들 */}
      <QuickActions>
        {quickActions.map((action, index) => {
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
              {baseAction.title === '매칭 현황'
                ? (() => {
                    const { status, period, color } = getMatchingStatusDisplay();
                    return (
                      <StatusChatWrapper>
                        {/* 버튼: 회색 박스 위, 우측 정렬 */}
                        <div
                          style={{
                            marginTop: 4,
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {/* 안읽은 메시지 뱃지 */}
                            {unreadCount > 0 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '-8px',
                                  right: '-8px',
                                  background:
                                    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  boxShadow: '0 2px 8px rgba(231, 76, 60, 0.4)',
                                  zIndex: 10,
                                  border: '2px solid white',
                                }}
                              >
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </div>
                            )}
                            <button
                              style={{
                                background:
                                  'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 20,
                                padding: '8px 18px',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                cursor: canChat ? 'pointer' : 'not-allowed',
                                opacity: canChat ? 1 : 0.5,
                                transition: 'all 0.2s ease',
                                boxShadow: canChat
                                  ? '0 3px 10px rgba(124,58,237,0.3)'
                                  : '0 2px 6px rgba(0,0,0,0.1)',
                                whiteSpace: 'nowrap',
                              }}
                              disabled={!canChat}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canChat) navigate(`/chat/${partnerUserId}`);
                              }}
                              onMouseEnter={(e) => {
                                if (canChat) {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow =
                                    '0 5px 15px rgba(124,58,237,0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (canChat) {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow =
                                    '0 3px 10px rgba(124,58,237,0.3)';
                                }
                              }}
                            >
                              상대방과 연락하기
                            </button>
                          </div>
                        </div>

                        {/* 회색 박스 */}
                        <div
                          style={{
                            marginTop: 0,
                            background:
                              'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 100%)',
                            borderRadius: 16,
                            padding: '18px 18px 20px',
                            boxShadow: '0 4px 12px rgba(102,126,234,0.08)',
                            letterSpacing: '-0.01em',
                            border: '1px solid rgba(102,126,234,0.1)',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '1.2rem',
                              color,
                              marginBottom: period ? 8 : 0,
                              lineHeight: 1.3,
                              textAlign: 'center',
                            }}
                          >
                            {status}
                          </div>
                          {period && (
                            <div
                              style={{
                                fontSize: '0.95rem',
                                color: '#555',
                                fontWeight: 500,
                                whiteSpace: 'pre-line',
                                lineHeight: 1.4,
                                textAlign: 'center',
                              }}
                            >
                              {period}
                            </div>
                          )}

                          {/* 매칭 성공 시 상대방 프로필 박스 */}
                          {status === '매칭 성공' && partnerUserId && canChat && (
                            <div
                              style={{
                                background:
                                  'linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)',
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
                                pointerEvents: partnerProfileError ? 'none' : 'auto',
                                opacity: partnerProfileError ? 0.6 : 1,
                              }}
                              onClick={async (e) => {
                                if (partnerProfileError) return;
                                e.stopPropagation();
                                await fetchPartnerProfile(partnerUserId!);
                                setShowPartnerModal(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow =
                                  '0 5px 18px rgba(102,126,234,0.18)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow =
                                  '0 3px 10px rgba(102,126,234,0.12)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <FaChevronRight
                                size={18}
                                color="#7C3AED"
                                style={{ marginRight: 2 }}
                              />
                              <ProfileIcon gender={partnerProfile?.gender || ''} size={28} />
                              <span
                                style={{
                                  fontWeight: 700,
                                  color:
                                    partnerProfile?.gender === 'male' ||
                                    partnerProfile?.gender === '남성'
                                      ? '#7C3AED'
                                      : partnerProfile?.gender === 'female' ||
                                        partnerProfile?.gender === '여성'
                                      ? '#F472B6'
                                      : '#bbb',
                                  fontSize: '1.01rem',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {(() => {
                                  if (partnerProfileError) {
                                    return '프로필 없음';
                                  }
                                  if (partnerProfileLoading) {
                                    return '로딩 중...';
                                  }
                                  if (!partnerProfile?.nickname) {
                                    return '상대방';
                                  }
                                  return partnerProfile.nickname;
                                })()}
                              </span>
                            </div>
                          )}

                          {/* 카운트다운 (매칭 성공 + 채팅 가능일 때, 박스 안 하단에) */}
                          {canChat && countdown && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: '12px 16px',
                                background:
                                  'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)',
                                borderRadius: 12,
                                border: '1px solid rgba(124, 58, 237, 0.2)',
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  color: '#7C3AED',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                              >
                                <FaRegClock size={14} />
                                <span>채팅 가능 시간</span>
                              </div>
                              <div
                                style={{
                                  color: '#111827',
                                  fontSize: '1rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                  textShadow: '0 1px 2px rgba(124, 58, 237, 0.2)',
                                }}
                              >
                                {countdown}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 박스 아래 안내 문구 (항상 세로로 아래에 쌓임) */}
                        {!canChat && (
                          <div
                            style={{
                              color: '#aaa',
                              fontSize: '0.95rem',
                              marginTop: 6,
                              textAlign: 'center',
                            }}
                          >
                            매칭이 성공하면 <br />
                            상대방과 연락하기 버튼이 활성화됩니다.
                          </div>
                        )}
                      </StatusChatWrapper>
                    );
                  })() : (
                    <ActionDescription>{baseAction.description}</ActionDescription>
                  )}
              {/* 채팅하기 카드만 커스텀 안내문구/버튼 */}
              {baseAction.title === '상대방과 약속잡기' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      {/* 안읽은 메시지 뱃지 */}
                      {unreadCount > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          boxShadow: '0 2px 8px rgba(231, 76, 60, 0.4)',
                          zIndex: 10,
                          border: '2px solid white'
                        }}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                      <button
                        style={{
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
                      >상대방과 연락하기</button>
                    </div>
                  </div>
                  {!canChat && (
                    <div style={{ color: '#aaa', fontSize: '0.95rem', marginTop: 6 }}>
                      
                    </div>
                  )}
                  {canChat && countdown && (
                    <div style={{ 
                      marginTop: 12,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)',
                      borderRadius: 12,
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        color: '#7C3AED', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}>
                        <span style={{ fontSize: '1rem' }}>⏰</span>
                        채팅방 마감 시간
                      </div>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1.1rem',
                        color: '#7C3AED',
                        textShadow: '0 1px 2px rgba(124, 58, 237, 0.2)'
                      }}>
                        {countdown}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </ActionCard>
          );
        })}
      </QuickActions>

      {/* 컴팩트 2x2 그리드 카드들 */}
      <CompactGrid>
        {compactActions.map((action, index) => (
          <CompactCard
            key={index}
            onClick={!action.disabled ? action.action : undefined}
            style={action.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none', background: '#f3f3f3' } : {}}
          >
            <CompactIcon>{action.icon}</CompactIcon>
            <CompactTitle>{action.title}</CompactTitle>
          </CompactCard>
        ))}
      </CompactGrid>

      {/* 이메일 인증 모달 */}
      {showEmailVerificationModal && (
        <ModalOverlay onClick={() => setShowEmailVerificationModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ padding: '2rem' }}>
              <h2 style={{ color: '#333', marginBottom: '1rem', textAlign: 'center' }}>이메일 인증</h2>
              <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
                이 기능을 사용하려면 이메일 인증이 필요합니다.
              </p>
              
              {emailVerificationStep === 'input' && (
                <div>
                  <input
                    type="text"
                    placeholder="인증번호 6자리를 입력하세요"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e1e5e9',
                      fontSize: '1rem',
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      onClick={handleEmailVerification}
                      disabled={!verificationCode || isVerifying}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#667eea',
                        color: 'white',
                        fontSize: '1rem',
                        cursor: verificationCode && !isVerifying ? 'pointer' : 'not-allowed',
                        opacity: verificationCode && !isVerifying ? 1 : 0.5
                      }}
                    >
                      {isVerifying ? '인증 중...' : '인증 확인'}
                    </button>
                    
                    <button
                      onClick={handleResendVerificationEmail}
                      disabled={isResending}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                        background: 'transparent',
                        color: '#667eea',
                        fontSize: '1rem',
                        cursor: isResending ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isResending ? '재발송 중...' : '메일 재발송'}
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setShowEmailVerificationModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '2px solid #ddd',
                    background: 'transparent',
                    color: '#888',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  나중에 하기
                </button>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

    </MainContainer>
  );
};

export default MainPage; 