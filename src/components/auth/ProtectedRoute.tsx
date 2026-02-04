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

  // App.tsx에서 이미 user/profile을 기다리므로 여기서는 바로 렌더링
  // 만약 데이터가 없으면 "/" 로 리다이렉트 (다시 LoadingSpinner 표시)
  if (!hasEssentialData) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 