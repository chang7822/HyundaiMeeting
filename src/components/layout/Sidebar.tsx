import React, { useState, useEffect, useCallback } from 'react';
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
  FaHandshake,
  FaHandScissors,
  FaBell,
  FaCog,
  FaEdit,
  FaSave,
  FaTimes,
} from 'react-icons/fa';
import { matchingApi, starApi, notificationApi, extraMatchingApi, userApi, adminApi, systemApi } from '../../services/api.ts';
import { isNativeApp } from '../../firebase.ts';
import { Capacitor } from '@capacitor/core';
import { getCurrentVersion, fetchVersionPolicy } from '../../utils/versionCheck.ts';

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
  
  @media (max-width: 768px) {
    width: 100%;
    max-width: 280px;
    /* setDecorFitsSystemWindows(true) 사용 시 viewport가 이미 safe area */
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
  top: calc(18px + var(--sidebar-top-offset, 0px));
  right: 18px;
  z-index: 1100;
  background: transparent;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
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
  padding-top: calc(2rem + var(--sidebar-top-offset, 0px));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`;

const LogoBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.9; }
`;

const AppIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  flex-shrink: 0;
`;

const LogoText = styled.span`
  font-size: 1.8rem;
  font-weight: bold;
  letter-spacing: -0.02em;
`;

const UserInfo = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const SettingsButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 1.8rem; /* 아이콘 크기 두 배 */
  
  &:hover {
    color: rgba(255, 255, 255, 1);
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SettingsModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
`;

const SettingsModalContent = styled.div`
  background: #f9fafb;
  border-radius: 18px;
  padding: 24px;
  width: 95vw;
  max-width: 480px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const SettingsModalTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 20px;
  text-align: center;
`;

const SettingsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingsLabel = styled.div`
  font-size: 1rem;
  color: #333;
  font-weight: 500;
`;

const SettingsDescription = styled.div`
  font-size: 0.85rem;
  color: #666;
  margin-top: 4px;
`;

const SwitchLabel = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 18px;
  flex-shrink: 0;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  &:checked + span {
    background-color: #4F46E5;
  }
  &:focus + span {
    box-shadow: 0 0 1px #4F46E5;
  }
  &:checked + span:before {
    transform: translateX(16px);
  }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 18px;
  &:before {
    position: absolute;
    content: "";
    height: 15px;
    width: 15px;
    left: 1.5px;
    bottom: 1.5px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;

const SettingsModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
`;

const SettingsModalVersion = styled.div`
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
`;

const SettingsModalButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
  
  &.secondary {
    background: #f9fafb;
    color: #4b5563;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #f3f4f6;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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
}) <{ active: boolean }>`
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

const NewChip = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f97316;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
`;

const NotificationQuickRow = styled.button`
  margin-top: 8px;
  width: 100%;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.28);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  gap: 8px;

  &:hover {
    background: rgba(15, 23, 42, 0.38);
  }

  span.label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  span.count {
    font-size: 0.72rem;
    padding: 2px 6px;
    border-radius: 999px;
    background: #f97316;
    color: #fff7ed;
    font-weight: 700;
  }
`;

/* Android: 패널 높이만 줄였으므로 하단 패딩은 1rem만 (이중 적용 방지) */
const LogoutSection = styled.div`
  padding: 1rem 1.5rem;
  padding-bottom: 1rem;
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
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  
  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

const AttendanceSecondaryButton = styled.button`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  width: 100%;

  @media (min-width: 480px) {
    width: auto;
  }

  &:hover {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const AttendancePrimaryButton = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #f9fafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;

  @media (min-width: 480px) {
    width: auto;
  }

  &:hover:not(:disabled) {
    opacity: 0.96;
  }

  &:disabled {
    background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
    cursor: not-allowed;
  }
`;

const AppOnlyBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.9);
`;

const Sidebar: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  preloadedRewarded?: any;
}> = ({ isOpen, onToggle, preloadedRewarded }) => {
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
  const [notificationUnreadCount, setNotificationUnreadCount] = useState<number>(0);
  const [extraMatchingInWindow, setExtraMatchingInWindow] = useState<boolean | null>(null);
  const [communityEnabled, setCommunityEnabled] = useState<boolean | null>(null);
  const [sidebarMenuOrder, setSidebarMenuOrder] = useState<string[] | null>(null);
  const [menuOrderEditing, setMenuOrderEditing] = useState(false);
  const [menuOrderDraft, setMenuOrderDraft] = useState<string[]>([]);
  const [menuOrderSaving, setMenuOrderSaving] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  // 로딩 상태: user가 null이면 true, 아니면 false
  const isUserLoading = user === null;

  // 이메일 수신 허용 설정 조회
  useEffect(() => {
    if (user?.id && settingsModalOpen) {
      const fetchEmailNotificationSetting = async () => {
        setSettingsLoading(true);
        try {
          const result = await userApi.getEmailNotificationSetting();
          setEmailNotificationEnabled(result.email_notification_enabled);
        } catch (error) {
          console.error('[Sidebar] 이메일 수신 설정 조회 실패:', error);
          // 기본값 true로 설정 (에러 시)
          setEmailNotificationEnabled(true);
        } finally {
          setSettingsLoading(false);
        }
      };
      fetchEmailNotificationSetting();
    } else if (!settingsModalOpen) {
      // 모달이 닫히면 상태 초기화
      setEmailNotificationEnabled(null);
    }
  }, [user?.id, settingsModalOpen]);

  // 설정 모달 열릴 때: 앱/최신 버전 조회 + 버전 체크 트리거 (업데이트 안내)
  useEffect(() => {
    if (settingsModalOpen) {
      window.dispatchEvent(new CustomEvent('request-version-check'));
      const platform = Capacitor.getPlatform();
      const platformKey = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : null;
      getCurrentVersion().then(setAppVersion).catch(() => setAppVersion(null));
      fetchVersionPolicy().then((policy) => {
        if (policy && platformKey) setLatestVersion(policy[platformKey].latestVersion);
        else setLatestVersion(null);
      }).catch(() => setLatestVersion(null));
    } else {
      setAppVersion(null);
      setLatestVersion(null);
    }
  }, [settingsModalOpen]);

  // 이메일 수신 허용 설정 토글
  const handleToggleEmailNotification = async () => {
    if (settingsLoading) return;

    const newValue = !emailNotificationEnabled;
    setSettingsLoading(true);

    try {
      const result = await userApi.updateEmailNotificationSetting(newValue);
      setEmailNotificationEnabled(result.email_notification_enabled);
      toast.success(result.message || (newValue ? '이메일 수신이 허용되었습니다.' : '이메일 수신이 거부되었습니다.'));
    } catch (error: any) {
      console.error('[Sidebar] 이메일 수신 설정 업데이트 실패:', error);
      toast.error(error?.response?.data?.error || '설정 업데이트에 실패했습니다.');
    } finally {
      setSettingsLoading(false);
    }
  };

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

  // 알림 안읽음 개수 로드
  useEffect(() => {
    if (!user?.id) {
      setNotificationUnreadCount(0);
      return;
    }
    let cancelled = false;
    let shouldStop = false;
    let timer: number | null = null;

    const load = async () => {
      if (shouldStop || cancelled) return;

      const token = localStorage.getItem('token');
      if (!token) {
        shouldStop = true;
        setNotificationUnreadCount(0);
        if (timer) window.clearInterval(timer);
        return;
      }

      try {
        const res = await notificationApi.getUnreadCount();
        if (!cancelled && !shouldStop) {
          setNotificationUnreadCount(res.unreadCount || 0);
        }
      } catch (e: any) {
        if (!cancelled) {
          // 401 에러 시 폴링 중단
          if (e?.response?.status === 401) {
            shouldStop = true;
            setNotificationUnreadCount(0);
            if (timer) window.clearInterval(timer);
            return;
          }
          // 그 외 에러는 로그만 출력하고 계속 시도
          setNotificationUnreadCount(0);
        }
      }
    };

    load();
    timer = window.setInterval(load, 15000);

    return () => {
      cancelled = true;
      shouldStop = true;
      if (timer) window.clearInterval(timer);
    };
  }, [user?.id]);

  // 알림함에서 읽음/모두읽음 시 즉시 갱신
  useEffect(() => {
    const handleNotificationCountChanged = (e: Event) => {
      const ev = e as CustomEvent<{ delta?: number }>;
      const delta = ev.detail?.delta;
      // 낙관적 업데이트: delta가 있으면 즉시 반영
      if (typeof delta === 'number') {
        setNotificationUnreadCount(prev => Math.max(0, prev + delta));
      }
      // 서버에서 정확한 값 재조회
      if (!user?.id) return;
      notificationApi.getUnreadCount()
        .then(res => setNotificationUnreadCount(res.unreadCount || 0))
        .catch(() => {});
    };
    window.addEventListener('notification-count-changed', handleNotificationCountChanged);
    return () => window.removeEventListener('notification-count-changed', handleNotificationCountChanged);
  }, [user?.id]);

  // 추가 매칭 도전 가능 기간(inWindow) 여부 로드
  useEffect(() => {
    if (!user?.id) {
      setExtraMatchingInWindow(null);
      return;
    }
    let cancelled = false;
    let shouldStop = false;
    let timer: number | null = null;

    const loadExtraStatus = async () => {
      if (shouldStop || cancelled) return;

      const token = localStorage.getItem('token');
      if (!token) {
        shouldStop = true;
        setExtraMatchingInWindow(false);
        if (timer) window.clearInterval(timer);
        return;
      }

      try {
        const res = await extraMatchingApi.getStatus();
        if (cancelled || shouldStop) return;

        // 기능이 비활성화되어 있으면 false로 설정
        if (res?.featureEnabled === false) {
          setExtraMatchingInWindow(false);
          return;
        }

        const p = res?.currentPeriod;
        if (!p || !p.matching_announce || !p.finish) {
          setExtraMatchingInWindow(false);
          return;
        }
        const nowTime = Date.now();
        const announce = new Date(p.matching_announce).getTime();
        const finish = new Date(p.finish).getTime();
        if (Number.isNaN(announce) || Number.isNaN(finish)) {
          setExtraMatchingInWindow(false);
          return;
        }
        setExtraMatchingInWindow(nowTime >= announce && nowTime <= finish);
      } catch (e: any) {
        if (!cancelled) {
          // 401 에러 시 폴링 중단
          if (e?.response?.status === 401) {
            shouldStop = true;
            setExtraMatchingInWindow(false);
            if (timer) window.clearInterval(timer);
            return;
          }
          // 그 외 에러는 로그만 출력하고 계속 시도
          setExtraMatchingInWindow(false);
        }
      }
    };

    loadExtraStatus();
    timer = window.setInterval(loadExtraStatus, 30000);

    return () => {
      cancelled = true;
      shouldStop = true;
      if (timer) window.clearInterval(timer);
    };
  }, [user?.id]);

  // 사용자 정지 상태 확인
  const isBanned = user?.is_banned === true;
  const bannedUntil = user?.banned_until ? new Date(user.banned_until) : null;
  const now = new Date();
  const isBanActive = isBanned && (!bannedUntil || bannedUntil > now);

  const displayNickname =
    profile?.nickname ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';

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
        const dailyDone = !!data?.today?.dailyDone;
        const adDone = !!data?.today?.adDone;
        // 오늘 중 하나라도 별을 획득했다면 사이드바에서는 "오늘 출석 완료"로 표시 (하루 1회: 둘 중 택1)
        setHasDailyToday(dailyDone || adDone);
        setHasAdToday(adDone);
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

  // 커뮤니티 기능 활성화 여부 로드
  useEffect(() => {
    let cancelled = false;

    const loadCommunitySettings = async () => {
      // 관리자가 아닌 경우 기본값(true) 사용, API 호출 안 함
      if (!user?.isAdmin) {
        setCommunityEnabled(true);
        return;
      }

      try {
        const res = await adminApi.getSystemSettings();
        if (cancelled) return;
        setCommunityEnabled(res?.community?.enabled !== false);
      } catch (err) {
        if (cancelled) return;
        console.error('[Sidebar] 커뮤니티 설정 조회 오류:', err);
        setCommunityEnabled(true); // 오류 시 기본값 true
      }
    };

    loadCommunitySettings();

    return () => {
      cancelled = true;
    };
  }, [user?.isAdmin]);

  const loadSidebarMenuOrder = useCallback(() => {
    systemApi.getSidebarMenuOrder()
      .then((res) => {
        if (res?.order && Array.isArray(res.order)) {
          // /community → /main 마이그레이션, /matching-apply 없으면 추가
          let order = res.order.filter((p: string) => p !== '/community');
          if (!order.includes('/matching-apply')) {
            const idx = order.indexOf('/main');
            order = [...order.slice(0, idx >= 0 ? idx + 1 : 0), '/matching-apply', ...order.slice(idx >= 0 ? idx + 1 : 0)];
          }
          setSidebarMenuOrder(order);
        } else {
          setSidebarMenuOrder(null);
        }
      })
      .catch(() => setSidebarMenuOrder(null));
  }, []);

  useEffect(() => {
    loadSidebarMenuOrder();
  }, [loadSidebarMenuOrder]);

  useEffect(() => {
    const handler = () => loadSidebarMenuOrder();
    window.addEventListener('sidebar-menu-order-updated', handler);
    return () => window.removeEventListener('sidebar-menu-order-updated', handler);
  }, [loadSidebarMenuOrder]);

  const handleDailyAttendance = async () => {
    if (!user?.id) return;
    setAttendanceSubmitting(true);
    try {
      const res = await starApi.dailyAttendance();
      if (typeof res.newBalance === 'number') {
        setStarBalance(res.newBalance);
        window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
      }
      toast.success(res.message || '출석 체크가 완료되었습니다.');
      setHasDailyToday(true);
      setAttendanceModalOpen(false);
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
    if (!isNativeApp()) {
      toast.error('광고 보기는 앱에서만 사용 가능합니다.');
      return;
    }
    if (hasDailyToday) return;

    setAdSubmitting(true);
    let removeListeners: (() => Promise<void>) | null = null;
    try {
      // WebView 준비 확인
      const waitForWebViewReady = () => {
        return new Promise<void>((resolve) => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 1000);
          } else {
            window.addEventListener('load', () => {
              setTimeout(resolve, 1000);
            });
          }
        });
      };

      await waitForWebViewReady();

      // AdMob 모듈 로드
      let RewardedAd;
      let RewardedInterstitialAd;
      let AdMob;
      try {
        const admobModule = await import('@capgo/capacitor-admob');
        RewardedAd = admobModule.RewardedAd;
        RewardedInterstitialAd = admobModule.RewardedInterstitialAd || admobModule.RewardedAd;
        AdMob = admobModule.AdMob;
      } catch (importError: any) {
        toast.error('광고 모듈을 불러올 수 없습니다.');
        setAdSubmitting(false);
        return;
      }

      // 사전로드된 광고가 있으면 사용, 없으면 새로 생성
      let rewardedAd;
      if (preloadedRewarded) {
        rewardedAd = preloadedRewarded;
      } else {
        // 플랫폼별 광고 ID 설정
        const { Capacitor } = await import('@capacitor/core');
        const platform = Capacitor.getPlatform();
        const isIOS = platform === 'ios';
        const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
        const adId = isTesting
          ? 'ca-app-pub-3940256099942544/5354046379' // Google 테스트 Rewarded Interstitial ID
          : isIOS
            ? 'ca-app-pub-1352765336263182/8848248607' // iOS 보상형
            : 'ca-app-pub-1352765336263182/8702080467'; // Android 보상형

        // 보상형 전면 광고 생성
        rewardedAd = new RewardedInterstitialAd({
          adUnitId: adId,
        });
      }

      // 플러그인 이벤트 기반으로 "리워드 지급" 여부를 판정해야 함
      // (RewardedAd.show()는 Promise<void> 이므로 반환값으로 완료여부 판단 불가)
      const adInstanceId = (rewardedAd as any)?.id;
      const getEventAdId = (event: any) => event?.adId ?? event?.id; // Android: adId, iOS: id

      let rewarded = false;
      let dismissed = false;
      let showFailed: string | undefined;
      let rewardPromise: Promise<void> | null = null;

      // 광고 로드 (사전로드되지 않은 경우에만)
      if (!preloadedRewarded) {
        try {
          await rewardedAd.load();
        } catch (loadError: any) {
          // 로드 실패 시 재시도
          await new Promise(resolve => setTimeout(resolve, 1000));
          await rewardedAd.load();
        }
      }

      // 로드 성공 후에 리스너를 등록 (로드 실패 시 리스너 누수 방지)
      {
        let rewardHandle: any;
        let dismissHandle: any;
        let showFailHandle: any;

        removeListeners = async () => {
          try { await rewardHandle?.remove?.(); } catch { }
          try { await dismissHandle?.remove?.(); } catch { }
          try { await showFailHandle?.remove?.(); } catch { }
        };

        rewardPromise = new Promise<void>((resolve, reject) => {
          const safeResolve = async () => {
            await removeListeners?.();
            resolve();
          };
          const safeReject = async (err: any) => {
            await removeListeners?.();
            reject(err);
          };

          (async () => {
            try {
              // RewardedInterstitialAd는 'rewardedi' 접두사 사용 (공식 문서 확인)
              rewardHandle = await AdMob.addListener('rewardedi.reward', (event: any) => {
                console.log('[AdMob] rewardedi.reward 이벤트 수신', event);
                if (rewarded) return;
                rewarded = true;
                console.log('[AdMob] ✅ 보상 지급 확인');
                safeResolve();
              });

              dismissHandle = await AdMob.addListener('rewardedi.dismiss', (event: any) => {
                console.log('[AdMob] rewardedi.dismiss 이벤트 수신', event);
                if (dismissed) return;
                dismissed = true;
                console.log('[AdMob] ❌ 광고 닫힘 확인 (중간에 닫음)');
                safeResolve();
              });

              showFailHandle = await AdMob.addListener('rewardedi.showfail', (event: any) => {
                console.log('[AdMob] rewardedi.showfail 이벤트 수신', event);
                showFailed = event?.error || event?.message || '광고 표시 실패';
                safeReject(new Error(showFailed || '광고 표시 실패'));
              });

              console.log('[AdMob] 📡 보상형 전면 광고 이벤트 리스너 등록 완료');
            } catch (e) {
              console.error('[AdMob] ❌ 이벤트 리스너 등록 실패:', e);
              safeReject(e);
            }
          })();
        });
      }

      // 광고 표시
      await rewardedAd.show();

      // rewarded.reward(보상) 또는 rewarded.dismiss(닫힘) 이벤트를 기다림
      // (너무 오래 걸리는 케이스 방지: 90초 타임아웃)
      await Promise.race([
        rewardPromise!,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('광고 응답이 지연되었습니다. 잠시 후 다시 시도해주세요.')), 90_000)),
      ]);

      // 광고 시청 완료(리워드 지급) 확인 및 보상 지급
      if (rewarded) {
        try {
          const res = await starApi.adReward();
          if (res.success && typeof res.newBalance === 'number') {
            setStarBalance(res.newBalance);
            window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
            toast.success(res.message || '광고 보상 별이 지급되었습니다.');
            setAttendanceModalOpen(false);
            setHasAdToday(true);
            setHasDailyToday(true);
          } else {
            // 백엔드에서 에러 응답 (400, 500 등)인 경우
            toast.error(res.message || '보상 지급에 실패했습니다.');
            setAttendanceModalOpen(false); // 모달 닫기
          }
        } catch (rewardError: any) {
          // 네트워크 오류 또는 기타 예외
          const errorMessage = rewardError?.response?.data?.message || '보상 지급 중 오류가 발생했습니다.';
          toast.error(errorMessage);
          setAttendanceModalOpen(false); // 모달 닫기
        }
      } else {
        // dismissed 되었거나 타임아웃 등으로 reward가 없으면 안내
        setAttendanceModalOpen(false); // 광고를 닫았으므로 모달도 닫기
        if (!dismissed) {
          toast.warning('광고를 끝까지 시청해야 보상을 받을 수 있습니다.');
        } else {
          toast.info('광고를 끝까지 시청해야 보상이 지급됩니다.');
        }
      }
    } catch (error: any) {
      const errStr = String(error?.message ?? error?.error ?? '');
      const isAdBlocked = /googleads|doubleclick|failed to connect|ad server/i.test(errStr);
      const isNoFill = /no\s*fill/i.test(errStr);
      if (isAdBlocked) {
        toast.warning('광고 서버에 연결할 수 없습니다. 네트워크 연결 또는 광고 차단 설정(AdsGuard 등)을 확인해주세요.');
      } else if (isNoFill) {
        toast.info('준비된 광고 부족으로 광고시청을 생략합니다.');
        try {
          const res = await starApi.adReward();
          if (res.success && typeof res.newBalance === 'number') {
            setStarBalance(res.newBalance);
            window.dispatchEvent(new CustomEvent('stars-updated', { detail: { balance: res.newBalance } }));
            toast.success(res.message || '광고 보상 별이 지급되었습니다.');
            setAttendanceModalOpen(false);
            setHasAdToday(true);
            setHasDailyToday(true);
          } else {
            toast.error(res.message || '보상 지급에 실패했습니다.');
            setAttendanceModalOpen(false);
          }
        } catch (rewardError: any) {
          const errorMessage = rewardError?.response?.data?.message || '보상 지급 중 오류가 발생했습니다.';
          toast.error(errorMessage);
          setAttendanceModalOpen(false);
        }
      } else if (!isAdBlocked) {
        toast.error(error?.message || '광고 처리 중 오류가 발생했습니다.');
      }
    } finally {
      try { await removeListeners?.(); } catch { }
      setAdSubmitting(false);
      // 보상형 광고 1회 시청 후 소비되므로, 다음 사용(출석/RPS 등)을 위해 다시 로드
      if (preloadedRewarded) {
        preloadedRewarded.load?.().catch(() => { });
      }
    }
  };

  const DEFAULT_MENU_ORDER = ['/main', '/matching-apply', '/profile', '/preference', '/extra-matching', '/rps-arena', '/matching-history', '/notice', '/faq', '/support/my-inquiries', 'chat'];

  const userMenuItemsBase = [
    { path: '/main', icon: <FaHome />, text: '커뮤니티 홈', disabled: communityEnabled === false },
    { path: '/matching-apply', icon: <FaHandshake />, text: '매칭 신청' },
    { path: '/profile', icon: <FaUser />, text: '프로필' },
    { path: '/preference', icon: <FaStar />, text: '선호 스타일' },
    {
      path: '/extra-matching',
      icon: <FaRegStar />,
      text: '추가 매칭 도전',
      disabled: extraMatchingInWindow === false || user?.is_verified !== true,
      hiddenWhenDisabled: true, // 비활성화 시 사이드바에서 숨김 (순서 편집 시에는 표시)
    },
    { path: '/rps-arena', icon: <FaHandScissors />, text: '가위바위보 멸망전' },
    { path: '/matching-history', icon: <FaHistory />, text: '매칭 이력' },
    { path: '/notice', icon: <FaBullhorn />, text: '공지사항' },
    { path: '/faq', icon: <FaQuestionCircle />, text: 'FAQ' },
    { path: '/support/my-inquiries', icon: <FaHeadset />, text: '고객센터' },
    {
      path: partnerUserId ? `/chat/${partnerUserId}` : '#',
      icon: <FaComments />,
      text: isBanActive ? '채팅 불가 (정지됨)' : '상대방과 약속 잡기',
      disabled: !canChat,
      hiddenWhenDisabled: true, // 채팅 비활성화 시 사이드바에서 숨김 (순서 편집 시에는 표시)
    },
  ];

  const getOrderKey = (path: string) => path.startsWith('/chat/') || path === '#' ? 'chat' : path;
  const effectiveOrder = menuOrderEditing ? menuOrderDraft : (sidebarMenuOrder && sidebarMenuOrder.length > 0 ? sidebarMenuOrder : DEFAULT_MENU_ORDER);
  const orderMap = new Map(effectiveOrder.map((p, i) => [p, i]));
  const userMenuItems = [...userMenuItemsBase].sort((a, b) => {
    const orderA = orderMap.get(getOrderKey(a.path)) ?? 999;
    const orderB = orderMap.get(getOrderKey(b.path)) ?? 999;
    return orderA - orderB;
  });

  // 비활성화 시 숨김 처리(hiddenWhenDisabled): 일반 모드에서만 숨기고, 순서 편집 시에는 모두 표시
  const displayMenuItems = menuOrderEditing
    ? userMenuItems
    : userMenuItems.filter((item: { hiddenWhenDisabled?: boolean; disabled?: boolean }) =>
        !(item.hiddenWhenDisabled && item.disabled)
      );

  const handleStartMenuOrderEdit = () => {
    const order = (sidebarMenuOrder && sidebarMenuOrder.length > 0) ? [...sidebarMenuOrder] : [...DEFAULT_MENU_ORDER];
    setMenuOrderDraft(order);
    setMenuOrderEditing(true);
  };
  const handleCancelMenuOrderEdit = () => {
    setMenuOrderEditing(false);
    setMenuOrderDraft([]);
  };
  const handleMoveMenuOrder = (idx: number, direction: 'up' | 'down') => {
    const next = [...menuOrderDraft];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setMenuOrderDraft(next);
  };
  const handleSaveMenuOrder = async () => {
    setMenuOrderSaving(true);
    try {
      await adminApi.updateSidebarMenuOrder(menuOrderDraft);
      setSidebarMenuOrder(menuOrderDraft);
      setMenuOrderEditing(false);
      setMenuOrderDraft([]);
      toast.success('사이드바 메뉴 순서가 저장되었습니다.');
      window.dispatchEvent(new CustomEvent('sidebar-menu-order-updated'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setMenuOrderSaving(false);
    }
  };

  const adminMenuItems = user?.isAdmin ? [
    { path: '/admin/matching-log', icon: <span role="img" aria-label="calendar">📅</span>, text: '매칭 회차 관리' },
    { path: '/admin/matching-result', icon: <span role="img" aria-label="heart">💑</span>, text: '매칭 결과' },
    { path: '/admin/matching-applications', icon: <span role="img" aria-label="list">📝</span>, text: '매칭 신청 현황' },
    { path: '/admin/user-matching-overview', icon: <span role="img" aria-label="users">👥</span>, text: '회원 매칭 조회' },
    { path: '/admin/extra-matching-status', icon: <span role="img" aria-label="star">⭐</span>, text: '추가 매칭도전 현황' },
    { path: '/admin/star-rewards', icon: <span role="img" aria-label="gift">🎁</span>, text: '이벤트 별 지급' },
    { path: '/admin/report-management', icon: <FaExclamationTriangle />, text: '신고 관리' },
    { path: '/admin/support', icon: <FaHeadset />, text: '고객센터 관리' },
    { path: '/admin/category-manager', icon: <span role="img" aria-label="tree">🌳</span>, text: '카테고리 관리' },
    { path: '/admin/company-manager', icon: <span role="img" aria-label="office">🏢</span>, text: '회사 관리' },
    { path: '/admin/notice-manager', icon: <span role="img" aria-label="notice">📢</span>, text: '공지사항 관리' },
    { path: '/admin/faq-manager', icon: <span role="img" aria-label="faq">❓</span>, text: 'FAQ 관리' },
    { path: '/admin/broadcast-email', icon: <span role="img" aria-label="mail">✉️</span>, text: '메일 공지' },
    { path: '/admin/notifications', icon: <span role="img" aria-label="bell">🔔</span>, text: '알림 보내기' },
    { path: '/admin/settings', icon: <span role="img" aria-label="settings">⚙️</span>, text: '설정' },
    { path: '/admin/logs', icon: <span role="img" aria-label="logs">📊</span>, text: '서버 로그' },
  ] : [];
  // console.log('[Sidebar] adminMenuItems 배열:', adminMenuItems);

  const handleNavClick = (path: string) => {
    // 현재 페이지에 있고, 클릭한 경로도 같은 경우 강제 재로드
    if (location.pathname === path && (path === '/main' || path === '/matching-apply')) {
      navigate(path, { replace: true, state: { forceReload: Date.now() } });
      window.dispatchEvent(new CustomEvent(path === '/main' ? 'main-page-reload' : 'matching-apply-page-reload'));
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

  // 플로팅 버튼·알림종 상단 고정 (콘텐츠 패딩과 무관하게 위쪽에 유지)
  const floatingButtonTop = '16px';

  return (
    <>
      {!isOpen && (
        <SidebarCloseButton
          onClick={onToggle}
          style={{
            position: 'fixed',
            left: 20,
            top: floatingButtonTop,
            background: '#667eea',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}
        >
          <FaBars />
        </SidebarCloseButton>
      )}
      <MobileOverlay $isOpen={isOpen} onClick={onToggle} />
      <SidebarContainer $isOpen={isOpen} data-safe-area-top>
        {isOpen && (
          <SidebarCloseButton onClick={onToggle}>
            <FaChevronLeft />
          </SidebarCloseButton>
        )}
        <SidebarHeader>
          <LogoBanner
            onClick={() => {
              if (location.pathname === '/main') {
                navigate('/main', { replace: true, state: { forceReload: Date.now() } });
                window.dispatchEvent(new CustomEvent('main-page-reload'));
              } else {
                navigate('/main');
              }
            }}
          >
            <AppIcon src="/icons/icon-96.webp" alt="직쏠공" />
            <LogoText>직쏠공</LogoText>
          </LogoBanner>
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
              <UserInfo>
                <span>{user?.email}</span>
                <SettingsButton
                  type="button"
                  onClick={() => setSettingsModalOpen(true)}
                  title="설정"
                >
                  <FaCog size={32} />
                </SettingsButton>
              </UserInfo>
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
                <NotificationQuickRow
                  type="button"
                  onClick={() => handleNavClick('/notifications')}
                >
                  <span className="label">
                    <FaBell style={{ fontSize: '0.9rem' }} />
                    <span>알림함</span>
                  </span>
                  {notificationUnreadCount > 0 && (
                    <span className="count">
                      {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                    </span>
                  )}
                </NotificationQuickRow>
              </UserSummary>
            </>
          )}
        </SidebarHeader>
        {/* user가 null이면 메뉴/로그아웃 숨김, 아니면 기존대로 */}
        {!isUserLoading && (
          <>
            <NavMenu>
              <MenuSection>
                {user?.isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1.5rem 0.25rem', gap: 8 }}>
                    {!menuOrderEditing ? (
                      <button
                        type="button"
                        onClick={handleStartMenuOrderEdit}
                        title="메뉴 순서 편집"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.4)',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <FaEdit size={10} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={handleSaveMenuOrder}
                          disabled={menuOrderSaving}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#10b981',
                            color: '#fff',
                            cursor: menuOrderSaving ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FaSave size={10} /> {menuOrderSaving ? '저장 중...' : '저장'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelMenuOrderEdit}
                          disabled={menuOrderSaving}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.5)',
                            background: 'transparent',
                            color: '#fff',
                            cursor: menuOrderSaving ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FaTimes size={10} /> 취소
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {displayMenuItems.map((item, idx) => {
                  const orderKey = getOrderKey(item.path);
                  const orderIdx = menuOrderDraft.indexOf(orderKey);
                  const isEditing = menuOrderEditing && orderIdx >= 0;
                  return (
                    <NavItem
                      key={item.path}
                      active={!menuOrderEditing && location.pathname === item.path}
                      onClick={() => !menuOrderEditing && !item.disabled && handleNavClick(item.path)}
                      style={item.disabled && !menuOrderEditing ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                    >
                      {menuOrderEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleMoveMenuOrder(orderIdx, 'up'); }}
                              disabled={orderIdx <= 0}
                              style={{
                                padding: '2px 6px',
                                border: 'none',
                                background: orderIdx <= 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                color: orderIdx <= 0 ? 'rgba(255,255,255,0.4)' : '#fff',
                                borderRadius: 4,
                                cursor: orderIdx <= 0 ? 'not-allowed' : 'pointer',
                                fontSize: '0.65rem',
                                lineHeight: 1,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleMoveMenuOrder(orderIdx, 'down'); }}
                              disabled={orderIdx >= menuOrderDraft.length - 1}
                              style={{
                                padding: '2px 6px',
                                border: 'none',
                                background: orderIdx >= menuOrderDraft.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                color: orderIdx >= menuOrderDraft.length - 1 ? 'rgba(255,255,255,0.4)' : '#fff',
                                borderRadius: 4,
                                cursor: orderIdx >= menuOrderDraft.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.65rem',
                                lineHeight: 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                          {item.icon}
                          <NavText>{item.text}</NavText>
                        </div>
                      ) : (
                        <>
                          {item.icon}
                          <NavText>{item.text}</NavText>
                          {item.path === '/notifications' && notificationUnreadCount > 0 && (
                            <NewChip>NEW</NewChip>
                          )}
                        </>
                      )}
                    </NavItem>
                  );
                })}
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
            <AttendanceModalTitle>출석 체크</AttendanceModalTitle>
            <AttendanceModalBody>
              <p style={{ marginBottom: 6 }}>
                하루 한 번 <strong>출석 체크</strong>를 하면 별 <strong>1개</strong>를 모을 수 있어요.
              </p>
              <p style={{ marginBottom: 6 }}>
                원하시면 출석 후에 <strong>광고 보기</strong>로 별 <strong>2개</strong>를 추가로 받을 수 있습니다.
                {!isNativeApp() && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}> (앱 전용)</span>}
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
                disabled={attendanceSubmitting || adSubmitting || hasDailyToday}
              >
                {attendanceSubmitting ? '출석 처리 중...' : '출석 체크 (⭐1)'}
              </AttendancePrimaryButton>
              <AttendancePrimaryButton
                type="button"
                onClick={handleAdReward}
                disabled={adSubmitting || !isNativeApp() || hasDailyToday}
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' }}
              >
                <span>{adSubmitting ? '광고 보상 중...' : '광고 보기 (⭐2)'}</span>
                {!isNativeApp() && <AppOnlyBadge>앱 전용</AppOnlyBadge>}
              </AttendancePrimaryButton>
            </AttendanceModalActions>
          </AttendanceModalContent>
        </AttendanceModalOverlay>
      )}

      {/* 설정 모달 */}
      {settingsModalOpen && (
        <SettingsModalOverlay
          onClick={() => {
            if (!settingsLoading) {
              setSettingsModalOpen(false);
            }
          }}
        >
          <SettingsModalContent onClick={(e) => e.stopPropagation()}>
            <SettingsModalTitle>설정</SettingsModalTitle>

            <SettingsRow>
              <div style={{ flex: 1 }}>
                <SettingsLabel>이메일 수신 허용</SettingsLabel>
                <SettingsDescription>
                  이메일 수신을 거부하면 공지사항 및 매칭 관련 이메일을 받지 않습니다.
                </SettingsDescription>
              </div>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={emailNotificationEnabled === true}
                  onChange={handleToggleEmailNotification}
                  disabled={settingsLoading || emailNotificationEnabled === null}
                />
                <SwitchSlider />
              </SwitchLabel>
            </SettingsRow>

            <SettingsModalActions>
              <SettingsModalButton
                type="button"
                className="secondary"
                onClick={() => {
                  if (!settingsLoading) {
                    setSettingsModalOpen(false);
                  }
                }}
                disabled={settingsLoading}
              >
                닫기
              </SettingsModalButton>
            </SettingsModalActions>
            <SettingsModalVersion>
              앱 버전 {appVersion != null ? `v${appVersion}` : '–'}
              {latestVersion != null && ` · 최신 버전 v${latestVersion}`}
            </SettingsModalVersion>
          </SettingsModalContent>
        </SettingsModalOverlay>
      )}
    </>
  );
};

export default Sidebar; 