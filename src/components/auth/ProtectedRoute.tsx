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

  const hasEssentialData = !!(user && profile);
  const shouldBlockRender = !hasEssentialData && isLoading;

  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (shouldBlockRender) {
    return <LoadingSpinner />;
  }

  // console.log('[ProtectedRoute] children 렌더');
  return <>{children}</>;
};

export default ProtectedRoute; 