import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, profile, isInitialLoading } = useAuth() as any;

  const hasEssentialData = !!(user && profile);

  // 인증되지 않았고 로딩도 끝났으면 로그인 페이지로
  if (!isAuthenticated && !isLoading && !isInitialLoading) {
    return <Navigate to="/" replace />;
  }

  // 로딩 중이면 대기 (App.tsx에서 LoadingSpinner 표시)
  if (isLoading || isInitialLoading) {
    return null; // 아무것도 렌더링하지 않음
  }

  // 로딩이 완료되었는데 필수 데이터가 없으면 로그아웃
  if (!hasEssentialData) {
    // 토큰이 있는데 user가 없는 비정상 상태 → 로그아웃
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 