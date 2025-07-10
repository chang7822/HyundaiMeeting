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
import MainPage from './pages/MainPage.tsx';
import AdminPage from './pages/admin/AdminPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import PreferencePage from './pages/PreferencePage.tsx';
import MatchingLogAdminPage from './pages/admin/MatchingLogAdminPage.tsx';
import CategoryManagerPage from './pages/admin/CategoryManagerPage.tsx';
import { MatchingApplicationsPage } from './pages/admin/MatchingApplicationsPage.tsx';
import MatchingResultPage from './pages/admin/MatchingResultPage.tsx';
// ChatPage는 sidebarOpen prop을 받는 컴포넌트입니다.
import ChatPage from './pages/ChatPage.tsx';

// Components
import Sidebar from './components/layout/Sidebar.tsx';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import AdminRoute from './components/auth/AdminRoute.tsx';

// Contexts
import { AuthProvider } from './contexts/AuthContext.tsx';

const queryClient = new QueryClient();

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // 모바일 진입 시 사이드바 자동 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  // 페이지 이동 시에도 모바일이면 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location]);

  const handleSidebarToggle = () => setSidebarOpen(open => !open);

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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Router 제거됨, 바로 App 내용 시작 */}
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
              <Route path="/chat/:partnerUserId" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
                    <ChatPage sidebarOpen={sidebarOpen} />
                  </div>
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
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 