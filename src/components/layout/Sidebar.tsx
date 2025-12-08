import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { toast } from 'react-toastify';
import { 
  FaHome, 
  FaComments, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
  FaStar,
  FaBullhorn,
  FaQuestionCircle,
  FaHistory,
  FaExclamationTriangle,
  FaHeadset,
  FaRegStar,
} from 'react-icons/fa';
import { matchingApi, starApi } from '../../services/api.ts';

const SidebarContainer = styled.div<{ $isOpen: boolean }>`
  width: 280px;
  height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  transition: transform 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  display: flex;
  flex-direction: column;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 280px;
    /* 모바일에서는 실제 보이는 화면 높이(dvh)를 강제 */
    height: 100dvh;
    min-height: 100dvh;
  }
`;

const MobileOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const SidebarCloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 1100;
  background: transparent;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: rgba(255,255,255,0.12);
  }
`;

const SidebarHeader = styled.div`
  padding: 2rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: color 0.15s;
  &:hover { color: #ffe082; }
`;

const UserInfo = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const UserSummary = styled.div`
  margin-top: 0.75rem;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const NicknameRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
`;

const StarRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
`;

const StarBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(250, 250, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 0.8rem;
  font-weight: 600;
`;

const AttendanceButton = styled.button`
  padding: 4px 10px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, rgba(250, 250, 255, 0.92) 0%, rgba(224, 231, 255, 0.95) 100%);
  color: #4f46e5;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
  transition: all 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    box-shadow: none;
    transform: none;
  }
`;

const NavMenu = styled.nav`
  padding: 1rem 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  
  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
`;

const MenuSection = styled.div`
  margin-bottom: 1rem;
`;

const MenuDivider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
  margin: 1rem 1.5rem;
`;

const MenuTitle = styled.div`
  padding: 0.75rem 1.5rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NavItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border-left: 3px solid ${props => props.active ? 'white' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const NavText = styled.span`
  font-weight: 500;
`;

const LogoutSection = styled.div`
  padding: 1rem 1.5rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  flex-shrink: 0;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const AttendanceModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
`;

const AttendanceModalContent = styled.div`
  background: #f9fafb;
  border-radius: 18px;
  padding: 20px 22px 18px;
  width: 95vw;
  max-width: 420px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const AttendanceModalTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
`;

const AttendanceModalBody = styled.div`
  font-size: 0.88rem;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 14px;
`;

const AttendanceModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

const AttendanceSecondaryButton = styled.button`
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const AttendancePrimaryButton = styled.button`
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #f9fafb;
  cursor: pointer;

  &:hover {
    opacity: 0.96;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const Sidebar: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useAuth() as any;

  // 매칭 상태 및 partnerUserId 상태 관리
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [period, setPeriod] = useState<any>(null);
  const [starBalance, setStarBalance] = useState<number | null>(null);
  const [starLoading, setStarLoading] = useState(false);
  const [hasDailyToday, setHasDailyToday] = useState(false);
  const [hasAdToday, setHasAdToday] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [adSubmitting, setAdSubmitting] = useState(false);

  // 로딩 상태: user가 null이면 true, 아니면 false
  const isUserLoading = user === null;

  // console.log('[Sidebar] 렌더링', {
  //   user,
  //   isUserLoading,
  //   isAdmin: user?.isAdmin,
  //   adminMenuItems: user?.isAdmin,
  //   canChat,
  //   partnerUserId,
  //   matchingStatus,
  //   period
  // });
  // if (user) {
  //   console.log('[Sidebar] user 전체:', user);
  // }

  useEffect(() => {
    if (user?.id) {
      matchingApi.getMatchingStatus(user.id).then(res => {
        setMatchingStatus(res.status);
        if (res.status && res.status.matched === true && res.status.partner_user_id) {
          setPartnerUserId(res.status.partner_user_id);
          // 회차 마감 전인지 추가 체크
          matchingApi.getMatchingPeriod().then(periodResp => {
            const periodData = periodResp?.current || periodResp;
            setPeriod(periodData);
            const now = new Date();
            const finish = periodData.finish ? new Date(periodData.finish) : null;
            
            // 사용자 정지 상태 확인
            const isBanned = user?.is_banned === true;
            const bannedUntil = user?.banned_until ? new Date(user.banned_until) : null;
            const isBanActive = isBanned && (!bannedUntil || bannedUntil > now);
            
            if (!isBanActive && (!finish || now < finish)) {
              setCanChat(true);
            } else {
              setCanChat(false);
            }
          }).catch(() => {
            setCanChat(false);
          });
        } else {
          setPartnerUserId(null);
          setCanChat(false);
        }
      }).catch(() => {
        setPartnerUserId(null);
        setCanChat(false);
      });
    }
  }, [user?.id, user?.is_banned, user?.banned_until]);

  // 별 잔액 로드
  useEffect(() => {
    if (!user?.id) {
      setStarBalance(null);
      setHasDailyToday(false);
      setHasAdToday(false);
      return;
    }
    let cancelled = false;
    setStarLoading(true);
    starApi
      .getMyStars()
      .then((data) => {
        if (cancelled) return;
        setStarBalance(typeof data.balance === 'number' ? data.balance : 0);
        setHasDailyToday(!!data?.today?.dailyDone);
        setHasAdToday(!!data?.today?.adDone);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error('[Sidebar] 별 잔액 조회 오류:', err);
        setStarBalance(null);
      })
      .finally(() => {
        if (!cancelled) setStarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 별 잔액 외부 업데이트 이벤트 리스너 (추가 매칭 등)
  useEffect(() => {
    const handler = (event: any) => {
      const balance = event?.detail?.balance;
      if (typeof balance === 'number') {
        setStarBalance(balance);
      }
    };
    window.addEventListener('stars-updated', handler as any);
    return () => {
      window.removeEventListener('stars-updated', handler as any);
    };
  }, []);

  // 사용자 정지 상태 확인
  const isBanned = user?.is_banned === true;
  const bannedUntil = user?.banned_until ? new Date(user.banned_until) : null;
  const now = new Date();
  const isBanActive = isBanned && (!bannedUntil || bannedUntil > now);

  const displayNickname =
    profile?.nickname ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';

  const handleDailyAttendance = async () => {
    if (!user?.id) return;
    setAttendanceSubmitting(true);
    try {
      const res = await starApi.dailyAttendance();
      if (typeof res.newBalance === 'number') {
        setStarBalance(res.newBalance);
      }
      toast.success(res.message || '출석 체크가 완료되었습니다.');
      setAttendanceModalOpen(false);
      setHasDailyToday(true);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '출석 체크 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      toast.error(msg);
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const handleAdReward = async () => {
    if (!user?.id) return;
    setAdSubmitting(true);
    try {
      const res = await starApi.adReward();
      if (typeof res.newBalance === 'number') {
        setStarBalance(res.newBalance);
      }
      toast.success(res.message || '광고 보상 별이 지급되었습니다.');
      setAttendanceModalOpen(false);
      setHasAdToday(true);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        '광고 보상 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      toast.error(msg);
    } finally {
      setAdSubmitting(false);
    }
  };

  const userMenuItems = [
    { path: '/main', icon: <FaHome />, text: '홈' },
    { path: '/profile', icon: <FaUser />, text: '프로필' },
    { path: '/preference', icon: <FaStar />, text: '선호 스타일' },
    { path: '/matching-history', icon: <FaHistory />, text: '매칭 이력' },
    { path: '/extra-matching', icon: <FaRegStar />, text: '추가 매칭 도전' },
    { path: '/notice', icon: <FaBullhorn />, text: '공지사항' },
    { path: '/faq', icon: <FaQuestionCircle />, text: 'FAQ' },
    { path: '/support/my-inquiries', icon: <FaHeadset />, text: '고객센터' },
    {
      path: partnerUserId ? `/chat/${partnerUserId}` : '#',
      icon: <FaComments />,
      text: isBanActive ? '채팅 불가 (정지됨)' : '상대방과 약속 잡기',
      disabled: !canChat,
    },
  ];

  const adminMenuItems = user?.isAdmin ? [
    { path: '/admin/matching-log', icon: <span role="img" aria-label="calendar">📅</span>, text: '매칭 회차 관리' },
    { path: '/admin/matching-result', icon: <span role="img" aria-label="heart">💑</span>, text: '매칭 결과' },
    { path: '/admin/matching-applications', icon: <span role="img" aria-label="list">📝</span>, text: '매칭 신청 현황' },
    { path: '/admin/user-matching-overview', icon: <span role="img" aria-label="users">👥</span>, text: '회원 매칭 조회' },
    { path: '/admin/report-management', icon: <FaExclamationTriangle />, text: '신고 관리' },
    { path: '/admin/support', icon: <FaHeadset />, text: '고객센터 관리' },
    { path: '/admin/category-manager', icon: <span role="img" aria-label="tree">🌳</span>, text: '카테고리 관리' },
    { path: '/admin/notice-manager', icon: <span role="img" aria-label="notice">📢</span>, text: '공지사항 관리' },
    { path: '/admin/faq-manager', icon: <span role="img" aria-label="faq">❓</span>, text: 'FAQ 관리' },
    { path: '/admin/broadcast-email', icon: <span role="img" aria-label="mail">✉️</span>, text: '메일 공지' },
    { path: '/admin/settings', icon: <span role="img" aria-label="settings">⚙️</span>, text: '설정' },
  ] : [];
  // console.log('[Sidebar] adminMenuItems 배열:', adminMenuItems);

  const handleNavClick = (path: string) => {
    // 현재 메인페이지에 있고, 클릭한 경로도 메인페이지인 경우 새로고침
    if (location.pathname === '/main' && path === '/main') {
      window.location.reload();
      return;
    }
    
    navigate(path);
    if (window.innerWidth <= 768) onToggle();
  };

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다!');
    // setTimeout을 사용해 logout() 완료 후 navigate 실행
    setTimeout(() => {
      navigate('/');
    }, 0);
  };

  return (
    <>
      {!isOpen && (
        <SidebarCloseButton onClick={onToggle} style={{ position: 'fixed', left: 20, top: 20, background: '#667eea', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          <FaBars />
        </SidebarCloseButton>
      )}
      <MobileOverlay $isOpen={isOpen} onClick={onToggle} />
      <SidebarContainer $isOpen={isOpen}>
        {isOpen && (
          <SidebarCloseButton onClick={onToggle}>
            <FaChevronLeft />
          </SidebarCloseButton>
        )}
        <SidebarHeader>
          <Logo onClick={() => {
            // 현재 메인페이지에 있는 경우 새로고침
            if (location.pathname === '/main') {
              window.location.reload();
            } else {
              navigate('/main');
            }
          }}>직장인 솔로 공모</Logo>
          {/* user가 null이면 로딩 중 메시지, 아니면 이메일 + 요약 */}
          {isUserLoading ? (
            <div
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: '1.08rem',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              로딩 중...
            </div>
          ) : (
            <>
              <UserInfo>{user?.email}</UserInfo>
              <UserSummary>
                <NicknameRow>
                  <span style={{ fontSize: '0.9rem' }}>
                    <strong>{displayNickname || '회원'}</strong>
                    <span style={{ opacity: 0.8 }}> 님</span>
                  </span>
                </NicknameRow>
                <StarRow>
                  <StarBadge>
                    <FaStar style={{ color: '#FCD34D' }} />
                    <span>
                      {starLoading
                        ? '별 확인 중...'
                        : typeof starBalance === 'number'
                        ? `별 ${starBalance}개`
                        : '별 정보 없음'}
                    </span>
                  </StarBadge>
                  <AttendanceButton
                    type="button"
                    onClick={() => setAttendanceModalOpen(true)}
                    disabled={attendanceSubmitting || adSubmitting || hasDailyToday}
                  >
                    <span>{hasDailyToday ? '오늘 출석 완료' : '출석 체크하기'}</span>
                  </AttendanceButton>
                </StarRow>
              </UserSummary>
            </>
          )}
        </SidebarHeader>
        {/* user가 null이면 메뉴/로그아웃 숨김, 아니면 기존대로 */}
        {!isUserLoading && (
          <>
            <NavMenu>
              <MenuSection>
                {userMenuItems.map((item) => (
                  <NavItem
                    key={item.path}
                    active={location.pathname === item.path}
                    onClick={() => !item.disabled && handleNavClick(item.path)}
                    style={item.disabled ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                  >
                    {item.icon}
                    <NavText>{item.text}</NavText>
                  </NavItem>
                ))}
              </MenuSection>
              
              {adminMenuItems.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuTitle>관리자 메뉴</MenuTitle>
                  <MenuSection>
                    {adminMenuItems.map((item) => (
                      <NavItem
                        key={item.path}
                        active={location.pathname === item.path}
                        onClick={() => handleNavClick(item.path)}
                      >
                        {item.icon}
                        <NavText>{item.text}</NavText>
                      </NavItem>
                    ))}
                  </MenuSection>
                </>
              )}
            </NavMenu>
            <LogoutSection>
              <LogoutButton onClick={handleLogout}>
                <FaSignOutAlt />
                로그아웃
              </LogoutButton>
            </LogoutSection>
          </>
        )}
      </SidebarContainer>
      {attendanceModalOpen && (
        <AttendanceModalOverlay
          onClick={() => {
            if (!attendanceSubmitting && !adSubmitting) {
              setAttendanceModalOpen(false);
            }
          }}
        >
          <AttendanceModalContent onClick={(e) => e.stopPropagation()}>
            <AttendanceModalTitle>출석 체크 & 광고 보상</AttendanceModalTitle>
            <AttendanceModalBody>
              <p style={{ marginBottom: 6 }}>
                하루 한 번 <strong>출석 체크</strong>를 하면 별 <strong>1개</strong>를 모을 수 있어요.
              </p>
              <p style={{ marginBottom: 6 }}>
                원하시면 출석 후에 <strong>광고 보기</strong>로 별 <strong>2개</strong>를 추가로 받을 수 있습니다.
              </p>
            </AttendanceModalBody>
            <AttendanceModalActions>
              <AttendanceSecondaryButton
                type="button"
                onClick={() => {
                  if (!attendanceSubmitting && !adSubmitting) {
                    setAttendanceModalOpen(false);
                  }
                }}
                disabled={attendanceSubmitting || adSubmitting}
              >
                닫기
              </AttendanceSecondaryButton>
              <AttendancePrimaryButton
                type="button"
                onClick={handleDailyAttendance}
                disabled={attendanceSubmitting}
              >
                {attendanceSubmitting ? '출석 처리 중...' : '출석 체크 (⭐1)'}
              </AttendancePrimaryButton>
              <AttendancePrimaryButton
                type="button"
                onClick={handleAdReward}
                disabled={adSubmitting}
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' }}
              >
                {adSubmitting ? '광고 보상 중...' : '광고 보기 (⭐2)'}
              </AttendancePrimaryButton>
            </AttendanceModalActions>
          </AttendanceModalContent>
        </AttendanceModalOverlay>
      )}
    </>
  );
};

export default Sidebar; 