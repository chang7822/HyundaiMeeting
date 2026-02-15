import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated, isInitialLoading } = useAuth();
  
  if (isLoading || isInitialLoading) return null;
  
  // 인증되지 않은 경우 랜딩페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // 관리자가 아닌 경우 메인페이지로 리다이렉트
  if (!user?.isAdmin) {
    return <Navigate to="/main" replace />;
  }
  
  return <>{children}</>;
};

export default AdminRoute; 