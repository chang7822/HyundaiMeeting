import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, profile } = useAuth();

  const hasEssentialData = !!(user && profile);

  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  // 로딩 중이 아닌데 데이터가 없으면 로그아웃 (무한 루프 방지)
  if (!hasEssentialData && !isLoading) {
    // 토큰이 있는데 user가 없는 비정상 상태 → 로그아웃
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    return <Navigate to="/" replace />;
  }

  // 로딩 중이면서 데이터 없으면 "/" 리다이렉트 (App.tsx의 LoadingSpinner 표시)
  if (!hasEssentialData) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 