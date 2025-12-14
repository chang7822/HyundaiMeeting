import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LandingPage from './pages/LandingPage.tsx';
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
import { MatchingApplicationsPage } from './pages/admin/MatchingApplicationsPage.tsx';
import MatchingResultPage from './pages/admin/MatchingResultPage.tsx';
import NoticeManagerPage from './pages/admin/NoticeManagerPage.tsx';
import FaqManagerPage from './pages/admin/FaqManagerPage.tsx';
import ReportManagementPage from './pages/admin/ReportManagementPage.tsx';
import MatchingHistoryPage from './pages/MatchingHistoryPage.tsx';
import ExtraMatchingPage from './pages/ExtraMatchingPage.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
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

// Components
import Sidebar from './components/layout/Sidebar.tsx';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import AdminRoute from './components/auth/AdminRoute.tsx';

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
  const { user, isAuthenticated, logout } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message?: string } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  // 모바일 진입 시 사이드바 자동 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

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
              <Route path="/" element={<LandingPage />} />
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
          </div>
  );
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