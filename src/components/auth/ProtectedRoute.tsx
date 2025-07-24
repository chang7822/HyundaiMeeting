import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, profile } = useAuth();

  // console.log('[ProtectedRoute] 렌더링', {
  //   isLoading,
  //   isAuthenticated,
  //   user,
  //   profile,
  //   childrenType: typeof children,
  //   children: children && (children as any).type ? (children as any).type.name : undefined
  // });

  if (isLoading || !user || !profile) {
    // console.log('[ProtectedRoute] isLoading이 true이거나 user/profile이 null, LoadingSpinner 반환');
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // console.log('[ProtectedRoute] isAuthenticated가 false, 로그인 페이지로 이동');
    return <Navigate to="/login" replace />;
  }

  // console.log('[ProtectedRoute] children 렌더');
  return <>{children}</>;
};

export default ProtectedRoute; 