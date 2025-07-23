import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || !user.isAdmin) {
    // 관리자 아니면 /main으로 리다이렉트
    return <Navigate to="/main" replace />;
  }
  return <>{children}</>;
};

export default AdminRoute; 