import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PreferenceSetupPage from './pages/auth/PreferenceSetupPage.tsx';
import AppealPage from './pages/auth/AppealPage.tsx';
import MainPage from './pages/MainPage.tsx';
import MatchingPage from './pages/MatchingPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import AdminPage from './pages/admin/AdminPage.tsx';

// Components
import Sidebar from './components/layout/Sidebar.tsx';
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';
import AdminRoute from './components/auth/AdminRoute.tsx';

// Contexts
import { AuthProvider } from './contexts/AuthContext.tsx';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
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
              <Route path="/register/preferences" element={<PreferenceSetupPage />} />
              <Route path="/register/appeal" element={<AppealPage />} />
              
              {/* Protected Routes */}
              <Route path="/main" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar />
                    <MainPage />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/matching" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar />
                    <MatchingPage />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/chat/:matchId" element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar />
                    <ChatPage />
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPage />
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
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 