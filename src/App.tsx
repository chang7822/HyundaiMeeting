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
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message?: string } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  
  // 뒤로가기 버튼 두 번 누르면 앱 종료를 위한 ref
  const [showExitModal, setShowExitModal] = useState(false);
  const preloadedAdsRef = useRef<any>({ banner: null, rewarded: null });

  // 앱 초기화
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
        
        const { AdMob } = await import('@capgo/capacitor-admob');
        await AdMob.start();
      } catch (error) {
        // AdMob 초기화 실패는 조용히 처리 (앱 사용에는 영향 없음)
      }
    };
    
    // 약간의 지연 후 초기화 (앱이 완전히 로드된 후)
    const timer = setTimeout(() => {
      initializeAdMob();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Android 뒤로가기 버튼 처리 (두 번 누르면 앱 종료)
  useEffect(() => {
    if (!isNativeApp() || Capacitor.getPlatform() !== 'android') return;
    
    let listener: any = null;
    
    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        listener = await App.addListener('backButton', ({ canGoBack }) => {
          // 메인 페이지에서는 히스토리 상관없이 무조건 종료 모달 표시 (광고)
          const isMainPage = location.pathname === '/' || location.pathname === '/main';
          
          if (isMainPage) {
            setShowExitModal(true);
            return;
          }
          
          // 다른 페이지에서는 뒤로 갈 곳이 있으면 일반 뒤로가기
          if (canGoBack) {
            navigate(-1);
            return;
          }
          
          // 뒤로 갈 곳이 없으면 종료 확인 모달 표시
          setShowExitModal(true);
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

  // 웹 포어그라운드 푸시 알림 처리
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

        // 포어그라운드에서 메시지 수신 시
        onMessage(messaging, (payload) => {
          console.log('[Web] 포어그라운드 메시지 수신:', payload);
          console.log('[Web] payload.data:', payload.data);
          console.log('[Web] payload.notification:', payload.notification);
          
          const data = payload.data || {};
          const isChatMessage = data.type === 'chat_unread';
          const currentPath = window.location.pathname;
          const isCurrentChatPage = currentPath.includes('/chat/') && 
                                    data.senderId &&
                                    currentPath.includes(`/chat/${data.senderId}`);

          console.log('[Web] 채팅 메시지 체크:', {
            isChatMessage,
            dataType: data.type,
            senderId: data.senderId,
            currentPath,
            isCurrentChatPage
          });

          // 채팅 메시지가 아니면 포어그라운드에서는 알림 표시 안 함 (백그라운드에서만)
          if (!isChatMessage) {
            console.log('[Web] 📍 채팅 메시지가 아니므로 포어그라운드 알림 표시 안 함');
            return;
          }

          // 채팅 메시지이고 현재 채팅방이면 알림 표시 안 함
          if (isChatMessage && isCurrentChatPage) {
            console.log('[Web] 📍 현재 채팅방이므로 알림 표시 안 함');
            return;
          }

          // 채팅 메시지이고 다른 페이지인 경우 브라우저 알림 표시
          const title = payload.notification?.title || data.title || '새 알림';
          const body = payload.notification?.body || data.body || '';

          console.log('[Web] 알림 표시 시도:', { title, body, permission: Notification.permission });

          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: body,
              icon: '/icon-192.png',
              data: data,
            });
            console.log('[Web] ✅ 브라우저 알림 표시 성공');
          } else {
            console.warn('[Web] ❌ 브라우저 알림 권한 없음:', Notification.permission);
          }
        });

        console.log('[Web] 포어그라운드 푸시 알림 리스너 설정 완료');
      } catch (error) {
        console.error('[Web] 포어그라운드 푸시 알림 설정 실패:', error);
      }
    };

    setupWebForegroundPush();
  }, []);

  // 네이티브 앱에서 푸시 알림 권한 요청 및 토큰 등록
  useEffect(() => {
    if (!isNativeApp() || !isAuthenticated || !user?.id) return;

    const setupPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // "앱 첫 실행(권한이 prompt 상태)"에서만 1회 자동으로 권한 팝업을 띄우기 위한 플래그
        // - 허용: 토큰 자동 발급/등록 + 토글 ON
        // - 거부: 토글 OFF로 유지, 추가 팝업 없음
        const PROMPTED_KEY = 'pushPermissionPrompted_v1';

        const ensureTokenRegisteredAndEnabled = async () => {
          // 토큰 가져오기 (권한은 이미 확인했으므로 skipPermissionCheck=true)
          const token = await getNativePushToken(true);

          if (token) {
            // 네이티브 푸시 리스너 설정
            await setupNativePushListeners();

            // 이전 토큰 확인 및 정리 (클라이언트 저장 토큰이 바뀐 경우만)
            const previousToken = localStorage.getItem('pushFcmToken');
            
            // 토큰이 변경되지 않았고 이미 등록되어 있다면 재등록하지 않음
            if (previousToken === token) {
              // 토큰이 동일하면 재등록하지 않음 (불필요한 서버 호출 방지)
              return;
            }
            
            if (previousToken && previousToken !== token) {
              try {
                await pushApi.unregisterToken(previousToken);
                console.log('[push] 이전 토큰 삭제 완료 (같은 기기)');
              } catch (unregisterError) {
                console.warn('[push] 이전 토큰 삭제 실패 (무시 가능):', unregisterError);
              }
            }

            // 서버에 새 토큰 등록 (서버에서 user_id + device_type 기준으로 1개만 유지)
            try {
              await pushApi.registerToken(token);
              localStorage.setItem('pushFcmToken', token);
              localStorage.setItem(`pushEnabled_${user.id}`, 'true');
              console.log('[push] 새 토큰 등록 완료 및 토글 ON 설정');

              // MainPage 토글이 즉시 DB 기준으로 ON으로 갱신되도록 이벤트 브로드캐스트
              try {
                window.dispatchEvent(new CustomEvent('push-status-changed', {
                  detail: { enabled: true, source: 'auto' },
                }));
              } catch {
                // ignore
              }
            } catch (registerError) {
              console.error('[push] 토큰 등록 실패:', registerError);
            }
          }
        };
        
        // 현재 권한 상태 확인
        const permissionStatus = await PushNotifications.checkPermissions();
        const receive = (permissionStatus.receive === 'prompt-with-rationale')
          ? 'prompt'
          : (permissionStatus.receive || 'prompt');
        
        // 권한이 이미 허용된 경우 토큰 가져와서 서버에 등록
        if (receive === 'granted') {
          await ensureTokenRegisteredAndEnabled();
        } else if (receive === 'prompt') {
          // 앱 첫 실행 때만(플래그 1회) 자동 권한 요청 팝업을 띄운다.
          const prompted = localStorage.getItem(PROMPTED_KEY) === 'true';
          if (!prompted) {
            localStorage.setItem(PROMPTED_KEY, 'true');
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

    return () => clearTimeout(timer);
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
        // 먼저 pendingNavigationRef 설정하여 "/" 경로에서 메인으로 리다이렉트 방지
        pendingNavigationRef.current = linkUrl;
        
        if (isAuthenticated) {
          // 인증된 상태면 즉시 이동
          setTimeout(() => {
            navigate(linkUrl);
            pendingNavigationRef.current = null; // 이동 후 초기화
          }, 0);
        }
        // 인증 대기 중이면 pendingNavigationRef에 저장된 상태로 대기
      }
    };

    window.addEventListener('push-notification-clicked', handlePushNotificationClick as EventListener);

    return () => {
      window.removeEventListener('push-notification-clicked', handlePushNotificationClick as EventListener);
    };
  }, [navigate, isAuthenticated]);

  // 인증 완료 후 대기 중인 네비게이션 실행
  useEffect(() => {
    if (isAuthenticated && pendingNavigationRef.current) {
      const targetUrl = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigate(targetUrl);
    }
  }, [isAuthenticated, navigate]);

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
                isLoading ? <LoadingSpinner preloadedBanner={preloadedAdsRef.current.banner} /> : (
                  pendingNavigationRef.current ? (
                    // 대기 중인 네비게이션이 있으면 로딩 표시 (메인페이지 거치지 않음)
                    <LoadingSpinner preloadedBanner={preloadedAdsRef.current.banner} />
                  ) : (
                    isAuthenticated ? <Navigate to="/main" replace /> : <LandingPage />
                  )
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
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MainPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <ProfilePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/preference" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <PreferencePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notice" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <NoticePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notice/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <NoticePage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/faq" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <FaqPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/faq/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <FaqPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/matching-history" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MatchingHistoryPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <CommunityPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/extra-matching" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <ExtraMatchingPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <NotificationsPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              {/* Support Routes */}
              <Route path="/support/inquiry" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <SupportInquiryPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/support/my-inquiries" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MySupportInquiriesPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/support/inquiry/:id" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
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
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MatchingLogAdminPage isSidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/category-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <CategoryManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/company-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <CompanyManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/matching-applications" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fa' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MatchingApplicationsPage sidebarOpen={sidebarOpen} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/admin/matching-result" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <MatchingResultPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/user-matching-overview" element={
                <AdminRoute>
                  <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fa' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <UserMatchingOverviewPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/notice-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <NoticeManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/faq-manager" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <FaqManagerPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <SettingsPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/logs" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <LogsPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/report-management" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <ReportManagementPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              {/* Admin Support Routes */}
              <Route path="/admin/support" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <AdminSupportPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/support/:id" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <AdminSupportDetailPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/broadcast-email" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <BroadcastEmailPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/notifications" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <AdminNotificationPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/star-rewards" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <AdminStarRewardPage sidebarOpen={sidebarOpen} />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/extra-matching-status" element={
                <AdminRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
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