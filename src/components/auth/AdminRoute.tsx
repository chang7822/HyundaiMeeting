import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        로딩 중...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // TODO: 실제 관리자 권한 체크 로직 구현
  // 현재는 임시로 이메일로 체크
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('관리자');
  
  if (!isAdmin) {
    return <Navigate to="/main" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute; 