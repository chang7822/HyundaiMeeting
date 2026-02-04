import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { isNativeApp, getNativePushToken, setupNativePushListeners } from './firebase.ts';
import { pushApi } from './services/api.ts';
import ExitConfirmModal from './components/ExitConfirmModal.tsx';
import PushPermissionModal from './components/PushPermissionModal.tsx';

// Pages
import LandingPage from './pages/LandingPage.tsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.tsx';
import DeleteAccountPage from './pages/DeleteAccountPage.tsx';
import ChildSafetyPage from './pages/ChildSafetyPage.tsx';
import LoginPage from './pages/auth/LoginPage.tsx';
import RegisterPage from './pages/auth/RegisterPage.tsx';
import CompanySelectionPage from './pages/auth/CompanySelectionPage.tsx';
import EmailVerificationPage from './pages/auth/EmailVerificationPage.tsx';
import EmailSentPage from './pages/auth/EmailSentPage.tsx';
import PasswordSetupPage from './pages/auth/PasswordSetupPage.tsx';
import RequiredInfoPage from './pages/auth/RequiredInfoPage.tsx';
import ProfileSetupPage from './pages/auth/ProfileSetupPage.tsx';
import AddressSelectionPage from './pages/auth/AddressSelectionPage.tsx';
import NicknameSetupPage from './pages/auth/NicknameSetupPage.tsx';
import PreferenceSetupPage from './pages/auth/PreferenceSetupPage.tsx';
import AppealPage from './pages/auth/AppealPage.tsx';
// Password Reset Pages
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.tsx';
import ResetPasswordVerifyPage from './pages/auth/ResetPasswordVerifyPage.tsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.tsx';
import MainPage from './pages/MainPage.tsx';
import AdminPage from './pages/admin/AdminPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import PreferencePage from './pages/PreferencePage.tsx';
import NoticePage from './pages/NoticePage.tsx';
import FaqPage from './pages/FaqPage.tsx';
import MatchingLogAdminPage from './pages/admin/MatchingLogAdminPage.tsx';
import CategoryManagerPage from './pages/admin/CategoryManagerPage.tsx';
import CompanyManagerPage from './pages/admin/CompanyManagerPage.tsx';
import { MatchingApplicationsPage } from './pages/admin/MatchingApplicationsPage.tsx';
import MatchingResultPage from './pages/admin/MatchingResultPage.tsx';
import NoticeManagerPage from './pages/admin/NoticeManagerPage.tsx';
import FaqManagerPage from './pages/admin/FaqManagerPage.tsx';
import ReportManagementPage from './pages/admin/ReportManagementPage.tsx';
import MatchingHistoryPage from './pages/MatchingHistoryPage.tsx';
import CommunityPage from './pages/CommunityPage.tsx';
import ExtraMatchingPage from './pages/ExtraMatchingPage.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
import AdminNotificationPage from './pages/admin/AdminNotificationPage.tsx';
import AdminStarRewardPage from './pages/admin/AdminStarRewardPage.tsx';
import ExtraMatchingAdminPage from './pages/admin/ExtraMatchingAdminPage.tsx';
import UserMatchingOverviewPage from './pages/admin/UserMatchingOverviewPage.tsx';
// ChatPage는 sidebarOpen prop을 받는 컴포넌트입니다.
import ChatPage from './pages/ChatPage.tsx';
// Support Pages
import SupportInquiryPage from './pages/SupportInquiryPage.tsx';
import MySupportInquiriesPage from './pages/MySupportInquiriesPage.tsx';
import SupportInquiryDetailPage from './pages/SupportInquiryDetailPage.tsx';
// Admin Support Pages
import AdminSupportPage from './pages/admin/AdminSupportPage.tsx';
import AdminSupportDetailPage from './pages/admin/AdminSupportDetailPage.tsx';
import SettingsPage from './pages/admin/SettingsPage.tsx';
import BroadcastEmailPage from './pages/admin/BroadcastEmailPage.tsx';
import LogsPage from './pages/admin/LogsPage.tsx';

// Components
import Sidebar from './components/layout/Sidebar.tsx';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import AdminRoute from './components/auth/AdminRoute.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { systemApi } from './services/api.ts';

const queryClient = new QueryClient();

const MaintenanceScreen: React.FC<{ onLogout: () => void; message?: string }> = ({ onLogout, message }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      padding: '0 24px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: 16 }}>서버 점검중입니다</h1>
      <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: 24, whiteSpace: 'pre-line' }}>
        현재 서비스 안정화를 위한 점검이 진행 중입니다.
        {'\n'}점검 완료 후 다시 이용 부탁드립니다.
      </p>
      {message && (
        <div style={{
          maxWidth: 520,
          margin: '0 auto 24px',
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(15,23,42,0.35)',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-line',
        }}>
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={onLogout}
        style={{
          marginTop: 8,
          padding: '10px 20px',
          borderRadius: 999,
          border: 'none',
          background: '#111827',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        로그아웃
      </button>
    </div>
  );
};

const AppInner: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, logout, isInitialLoading } = useAuth() as any;
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message?: string } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  
  // 뒤로가기 버튼 두 번 누르면 앱 종료를 위한 ref
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPushPermissionModal, setShowPushPermissionModal] = useState(false);
  const preloadedAdsRef = useRef<any>({ banner: null, rewarded: null });

  // 앱 초기화 및 광고 사전로드
  useEffect(() => {
    // AdMob 초기화 (네이티브 앱에서만)
    // WebView가 완전히 로드된 후에 초기화해야 함
    const initializeAdMob = async () => {
      if (!isNativeApp()) return;
      
      // WebView가 준비될 때까지 대기
      const waitForWebView = () => {
        return new Promise<void>((resolve) => {
          if (Capacitor.getPlatform() === 'android') {
            // Android: window.load 이벤트 대기 (더 확실한 방법)
            if (document.readyState === 'complete') {
              // 추가 지연으로 WebView JavaScript 엔진이 완전히 준비되도록 함
              setTimeout(resolve, 1500);
            } else {
              window.addEventListener('load', () => {
                setTimeout(resolve, 1500);
              });
            }
          } else {
            resolve();
          }
        });
      };
      
      try {
        await waitForWebView();
        
        const admobModule = await import('@capgo/capacitor-admob');
        const { AdMob, BannerAd, RewardedInterstitialAd } = admobModule;
        
        await AdMob.start();
        
        // 광고 사전로드 (백그라운드에서 준비)
        const preloadAds = async () => {
          try {
            // 플랫폼 확인
            const platform = Capacitor.getPlatform();
            const isIOS = platform === 'ios';
            const isTesting = process.env.REACT_APP_ADMOB_TESTING !== 'false';
            
            // 배너 광고 사전로드 (플랫폼별 ID)
            const bannerAdUnitId = isTesting
              ? 'ca-app-pub-3940256099942544/6300978111' // 테스트 ID
              : isIOS
                ? 'ca-app-pub-1352765336263182/5438712556' // iOS
                : 'ca-app-pub-1352765336263182/5676657338'; // Android
            
            const banner = new BannerAd({ adUnitId: bannerAdUnitId });
            preloadedAdsRef.current.banner = banner;
            
            // 보상형 전면 광고 사전로드 (플랫폼별 ID)
            const rewardedAdUnitId = isTesting
              ? 'ca-app-pub-3940256099942544/5354046379' // 테스트 ID
              : isIOS
                ? 'ca-app-pub-1352765336263182/8848248607' // iOS
                : 'ca-app-pub-1352765336263182/8702080467'; // Android
            
            const RewardedClass = RewardedInterstitialAd || admobModule.RewardedAd;
            const rewarded = new RewardedClass({ adUnitId: rewardedAdUnitId });
            await rewarded.load(); // 보상형 광고는 미리 로드
            preloadedAdsRef.current.rewarded = rewarded;
            
            console.log('[App] 광고 사전로드 완료');
          } catch (error) {
            console.error('[App] 광고 사전로드 실패:', error);
          }
        };
        
        // 사전로드는 비동기로 실행 (앱 시작을 막지 않음)
        preloadAds();
      } catch (error) {
        // AdMob 초기화 실패는 조용히 처리 (앱 사용에는 영향 없음)
        console.error('[App] AdMob 초기화 실패:', error);
      }
    };
    
    // 약간의 지연 후 초기화 (앱이 완전히 로드된 후)
    const timer = setTimeout(() => {
      initializeAdMob();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Android 뒤로가기 버튼 처리
  useEffect(() => {
    if (!isNativeApp() || Capacitor.getPlatform() !== 'android') return;
    
    let listener: any = null;
    
    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        listener = await App.addListener('backButton', ({ canGoBack }) => {
          const isMainPage = location.pathname === '/' || location.pathname === '/main';
          
          // 메인 페이지에서만 종료 모달 표시 (광고)
          if (isMainPage) {
            setShowExitModal(true);
            return;
          }
          
          // 다른 페이지에서는 뒤로 갈 곳이 있으면 일반 뒤로가기
          if (canGoBack) {
            navigate(-1);
            return;
          }
          
          // 다른 페이지에서 뒤로 갈 곳이 없으면 메인 페이지로 이동
          navigate('/main', { replace: true });
        });
      } catch (error) {
        console.error('[App] 뒤로가기 버튼 리스너 설정 실패:', error);
      }
    };
    
    setupBackButton();
    
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [location.pathname, navigate]);

  // StatusBar 설정 (Android에서 상단바와 겹치지 않도록)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {
        // StatusBar 플러그인이 사용 불가능한 경우 무시
      });
    }
  }, []);

  // 웹 포어그라운드 푸시 알림 처리 (백그라운드에서만 표시)
  useEffect(() => {
    if (isNativeApp()) return; // 네이티브 앱은 firebase.ts에서 처리

    const setupWebForegroundPush = async () => {
      try {
        const { getMessaging, onMessage } = await import('firebase/messaging');
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        
        const firebaseConfig = {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
        };

        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // 포어그라운드에서 메시지 수신 시 (표시 안 함)
        onMessage(messaging, (payload) => {
          // notification 필드가 있는 알림은 백그라운드에서만 표시됨
          // 포어그라운드에서는 아무것도 하지 않음
        });
      } catch (error) {
        console.error('[Web] 포어그라운드 푸시 알림 설정 실패:', error);
      }
    };

    setupWebForegroundPush();
  }, []);

  // 네이티브 앱에서 푸시 알림 권한 요청 및 토큰 등록
  useEffect(() => {
    if (!isNativeApp() || !isAuthenticated || !user?.id) return;

    let cleanup: (() => void) | undefined;

    const setupPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const platform = Capacitor.getPlatform();
        const isIOS = platform === 'ios';

        console.log('[푸시 알림 설정] 플랫폼:', platform, 'iOS:', isIOS);

        // "앱 첫 실행(권한이 prompt 상태)"에서만 1회 자동으로 권한 팝업을 띄우기 위한 플래그
        const PROMPTED_KEY = 'pushPermissionPrompted_v1';

        const ensureTokenRegisteredAndEnabled = async () => {
          console.log('[푸시 설정] ensureTokenRegisteredAndEnabled 시작');
          
        let token: string | null = null;
        
        // 실제 기기: 진짜 토큰 가져오기
        token = await getNativePushToken(true);
        console.log('[푸시 설정] 실제 토큰 발급:', token ? '성공' : '실패');

          if (token) {
          await setupNativePushListeners();

            // 이전 토큰 확인
            const previousToken = localStorage.getItem('pushFcmToken');
            
            if (previousToken === token) {
              console.log('[푸시 설정] 동일한 토큰, 재등록 생략');
              localStorage.setItem(`pushEnabled_${user.id}`, 'true');
              window.dispatchEvent(new CustomEvent('push-status-changed', {
                detail: { enabled: true, source: 'auto' },
              }));
              return;
            }
            
            if (previousToken && previousToken !== token) {
              try {
                await pushApi.unregisterToken(previousToken);
                console.log('[push] 이전 토큰 삭제 완료');
              } catch (unregisterError) {
                console.warn('[push] 이전 토큰 삭제 실패 (무시)');
              }
            }

            // 서버에 토큰 등록 (시뮬레이터 토큰도 등록 시도)
            try {
            await pushApi.registerToken(token);
            console.log('[push] 서버에 토큰 등록 완료');
              
              localStorage.setItem('pushFcmToken', token);
              localStorage.setItem(`pushEnabled_${user.id}`, 'true');
              console.log('[푸시 설정] ✅ localStorage 저장 완료');

              window.dispatchEvent(new CustomEvent('push-status-changed', {
                detail: { enabled: true, source: 'auto' },
              }));
              console.log('[푸시 설정] ✅ 이벤트 발송 완료');
            } catch (registerError) {
              console.error('[push] 토큰 등록 실패:', registerError);
            }
          } else {
            console.error('[푸시 설정] ❌ 토큰을 받지 못했습니다');
          }
        };
        
        // 현재 권한 상태 확인
        const permissionStatus = await PushNotifications.checkPermissions();
        const receive = (permissionStatus.receive === 'prompt-with-rationale')
          ? 'prompt'
          : (permissionStatus.receive || 'prompt');
        
        const requestSystemPermission = async () => {
          const result = await PushNotifications.requestPermissions();
          const next = (result.receive === 'prompt-with-rationale') ? 'prompt' : (result.receive || 'prompt');

          if (next === 'granted') {
            await ensureTokenRegisteredAndEnabled();
          } else {
            // 거부/미결정: 토글 OFF 유지
            try {
              localStorage.setItem(`pushEnabled_${user.id}`, 'false');
            } catch {
              // ignore
            }

            // MainPage 토글이 즉시 OFF로 갱신되도록 이벤트 브로드캐스트
            try {
              window.dispatchEvent(new CustomEvent('push-status-changed', {
                detail: { enabled: false, source: 'auto' },
              }));
            } catch {
              // ignore
            }
          }
        };

        // 권한이 이미 허용된 경우 토큰 가져와서 서버에 등록
        if (receive === 'granted') {
          console.log('[푸시 알림 설정] 권한 이미 허용됨');
          await ensureTokenRegisteredAndEnabled();
        } else if (receive === 'prompt' || receive === 'denied') {
          // prompt 또는 denied 상태에서 앱 첫 실행 때만 안내
          const promptedValue = localStorage.getItem(PROMPTED_KEY);
          const prompted = promptedValue === 'true';
          console.log('[푸시 알림 설정] 권한 상태:', receive, 'prompted:', prompted);
          
          if (!prompted) {
            localStorage.setItem(PROMPTED_KEY, 'true');
            console.log('[푸시 알림 설정] 플래그 저장 완료');
            
            // iOS & Android 공통: 커스텀 모달을 먼저 표시
            console.log('[푸시 알림 설정] 커스텀 모달 표시 시도 (플랫폼:', platform, ')');
            setShowPushPermissionModal(true);

            // 이벤트 리스너 등록
            const handlePushPermissionResponse = async (event: Event) => {
              const customEvent = event as CustomEvent;
              if (customEvent.detail?.allowed) {
                // denied 상태라면 시스템 권한 요청해도 팝업이 안 뜨므로 
                // 바로 설정 안내 토스트 표시
                if (receive === 'denied') {
                  const settingGuide = isIOS 
                    ? 'iOS 설정에서 알림 권한을 허용해주세요'
                    : 'Android 설정에서 알림 권한을 허용해주세요';
                  toast.info(settingGuide);
                } else {
                  await requestSystemPermission();
                }
              } else {
                // 사용자가 "나중에" 선택 - 토글 OFF
                try {
                  localStorage.setItem(`pushEnabled_${user.id}`, 'false');
                } catch {
                  // ignore
                }
              }
              // 모달은 이미 handlePushPermissionAllow/Deny에서 닫혔음
            };

            window.addEventListener('push-permission-response', handlePushPermissionResponse);

            // cleanup 함수 저장
            cleanup = () => {
              window.removeEventListener('push-permission-response', handlePushPermissionResponse);
            };
          }
        }
      } catch (error) {
        // 권한 요청 실패 시 무시 (사용자가 거부했을 수 있음)
      }
    };

    // 약간의 지연을 두고 실행 (앱 초기화 및 로그인 완료 후)
    const timer = setTimeout(() => {
      setupPushNotifications();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, [isAuthenticated, user?.id]);

  // 모바일 진입 시 사이드바 자동 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  // 네이티브 앱 푸시 알림 클릭 처리
  const pendingNavigationRef = useRef<string | null>(null);

  useEffect(() => {
    const handlePushNotificationClick = (event: CustomEvent) => {
      const { linkUrl } = event.detail || {};
      if (linkUrl) {
        // 먼저 pendingNavigationRef 설정
        pendingNavigationRef.current = linkUrl;
        
        if (isAuthenticated && !isLoading) {
          // 인증 완료 상태면 즉시 이동 (replace로 히스토리 남기지 않음)
          navigate(linkUrl, { replace: true });
          pendingNavigationRef.current = null;
        }
        // 인증 대기 중이면 pendingNavigationRef에 저장된 상태로 대기
      }
    };

    window.addEventListener('push-notification-clicked', handlePushNotificationClick as EventListener);

    return () => {
      window.removeEventListener('push-notification-clicked', handlePushNotificationClick as EventListener);
    };
  }, [navigate, isAuthenticated, isLoading]);

  // 인증 완료 후 대기 중인 네비게이션 실행
  useEffect(() => {
    if (isAuthenticated && !isLoading && pendingNavigationRef.current) {
      const targetUrl = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(targetUrl, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // 회원가입 단계 이동 시마다 스크롤을 최상단으로 이동
  useEffect(() => {
    if (location.pathname.startsWith('/register')) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  // 페이지 이동 시에도 모바일이면 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location]);

  const handleSidebarToggle = () => setSidebarOpen(open => !open);

  // 시스템 상태(유지보수 모드) 조회
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await systemApi.getStatus();
        if (!cancelled) {
          const m = res?.maintenance;
          setMaintenance(m ? { enabled: !!m.enabled, message: m.message || '' } : { enabled: false, message: '' });
          setMaintenanceLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMaintenance({ enabled: false, message: '' });
          setMaintenanceLoading(false);
        }
      }
    };

    // 최초 1회 즉시 조회
    fetchStatus();
    // 이후 주기적으로 상태 확인 (예: 10초마다)
    const intervalId = window.setInterval(fetchStatus, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  // F5(새로고침) 시 디버깅 로그를 화면에 출력 (복사 가능)
  if ((window as any)._debugLogs && (window as any)._debugLogs.length > 0) {
    return (
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#222',
          color: '#fff',
          padding: 20,
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          maxHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {(window as any)._debugLogs.join('\n')}
      </pre>
    );
  }

  // 유지보수 모드: 인증 완료 후 일반 사용자만 막고, 관리자는 통과
  const isAdmin = !!user?.isAdmin;
  const showMaintenance =
    maintenanceLoading ? false : ((maintenance?.enabled === true) && isAuthenticated && !isAdmin);

  if (showMaintenance) {
    return (
      <MaintenanceScreen
        onLogout={() => {
          logout();
          window.location.href = '/';
        }}
        message={maintenance?.message}
      />
    );
  }

  return (
    <div className="App">
      <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                isInitialLoading || pendingNavigationRef.current || (localStorage.getItem('token') && !user) ? (
                  <LoadingSpinner preloadedBanner={preloadedAdsRef.current.banner} />
                ) : (
                  isAuthenticated ? <Navigate to="/main" replace /> : <LandingPage />
                )
              } />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
              <Route path="/child-safety" element={<ChildSafetyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/company" element={<CompanySelectionPage />} />
              <Route path="/register/email-verification" element={<EmailVerificationPage />} />
              <Route path="/register/email-sent" element={<EmailSentPage />} />
              <Route path="/register/password" element={<PasswordSetupPage />} />
              <Route path="/register/required-info" element={<RequiredInfoPage />} />
              <Route path="/register/profile" element={<ProfileSetupPage />} />
              <Route path="/register/address" element={<AddressSelectionPage />} />
              <Route path="/register/nickname" element={<NicknameSetupPage />} />
              <Route path="/register/preference" element={<PreferenceSetupPage />} />
              <Route path="/register/appeal" element={<AppealPage />} />
              
              {/* Password Reset Routes */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password-verify" element={<ResetPasswordVerifyPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Protected Routes */}
              <Route path="/main" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MainPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <ProfilePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/preference" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <PreferencePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notice" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <NoticePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notice/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <NoticePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/faq" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <FaqPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/faq/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <FaqPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/matching-history" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MatchingHistoryPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <CommunityPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/extra-matching" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <ExtraMatchingPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <NotificationsPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              {/* Support Routes */}
              <Route path="/support/inquiry" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <SupportInquiryPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/support/my-inquiries" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MySupportInquiriesPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/support/inquiry/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <SupportInquiryDetailPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/chat/:partnerUserId" element={
                <ProtectedRoute>
                  {/* 사이드바 없이 ChatPage만 렌더 */}
                  <ChatPage />
                </ProtectedRoute>
              } />
              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              } />
              <Route path="/admin/matching-log" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MatchingLogAdminPage isSidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/category-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <CategoryManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/company-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <CompanyManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/matching-applications" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fa' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MatchingApplicationsPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/admin/matching-result" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <MatchingResultPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/user-matching-overview" element={
                <AdminRoute>
                  <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fa' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <UserMatchingOverviewPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/notice-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <NoticeManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/faq-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <FaqManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <SettingsPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/logs" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <LogsPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/report-management" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <ReportManagementPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              {/* Admin Support Routes */}
              <Route path="/admin/support" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <AdminSupportPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/support/:id" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <AdminSupportDetailPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/broadcast-email" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <BroadcastEmailPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/notifications" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <AdminNotificationPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/star-rewards" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <AdminStarRewardPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/extra-matching-status" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} preloadedRewarded={preloadedAdsRef.current.rewarded} />
                    <ExtraMatchingAdminPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable={false}
              pauseOnHover
              limit={3}
              enableMultiContainer={false}
              toastStyle={{
                touchAction: 'manipulation'
              }}
            />

            {/* 앱 종료 확인 모달 (네이티브 광고 포함) */}
            <ExitConfirmModal
              isOpen={showExitModal}
              onConfirm={handleExitConfirm}
              onCancel={handleExitCancel}
              preloadedBanner={preloadedAdsRef.current.banner}
            />

            <PushPermissionModal
              isOpen={showPushPermissionModal}
              onAllow={handlePushPermissionAllow}
              onDeny={handlePushPermissionDeny}
              platform={Capacitor.getPlatform() as 'ios' | 'android' | 'web'}
            />
            
          </div>
  );

  // 앱 종료 확인
  async function handleExitConfirm() {
    try {
      const { App } = await import('@capacitor/app');
      App.exitApp();
    } catch (error) {
      console.error('[App] 앱 종료 실패:', error);
    }
  }

  // 앱 종료 취소
  function handleExitCancel() {
    setShowExitModal(false);
  }

  // 푸시 알림 권한 허용
  function handlePushPermissionAllow() {
    // 모달 즉시 닫기
    setShowPushPermissionModal(false);
    
    // 시스템 권한 요청 이벤트 발생
    window.dispatchEvent(new CustomEvent('push-permission-response', {
      detail: { allowed: true }
    }));
  }

  // 푸시 알림 권한 거부 (나중에)
  function handlePushPermissionDeny() {
    // 모달 즉시 닫기
    setShowPushPermissionModal(false);
    
    // 거부 이벤트 발생
    window.dispatchEvent(new CustomEvent('push-permission-response', {
      detail: { allowed: false }
    }));
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 