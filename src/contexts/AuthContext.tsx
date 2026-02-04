import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserProfile, LoginCredentials, AuthContextType } from '../types/index.ts';
import { authApi, userApi } from '../services/api.ts';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 상태를 하나로 통합하여 배칭 보장
  const [state, setState] = useState<{
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isInitialLoading: boolean;
  }>({
    user: null,
    profile: null,
    isLoading: false,
    isInitialLoading: true,
  });

  // 토큰 갱신 및 사용자 정보 로드 함수
  const restoreAuth = useCallback(async (showLoading = true, isInitial = false) => {
    if (showLoading) {
      setState(prev => ({
        ...prev,
        isLoading: isInitial ? false : true,
        isInitialLoading: isInitial ? true : prev.isInitialLoading,
      }));
    }
    
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    // 결과를 저장할 변수
    let authResult: { user: User | null; profile: UserProfile | null } | null = null;
    
    try {
      // Refresh Token이 있으면 먼저 토큰 갱신 시도
      if (refreshToken) {
        try {
          const refreshResponse = await authApi.refresh(refreshToken);
          localStorage.setItem('token', refreshResponse.token);
        } catch (refreshErr: any) {
          console.log('[AuthContext] Refresh Token 갱신 실패:', refreshErr?.response?.status || refreshErr?.message);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setState({
            user: null,
            profile: null,
            isLoading: false,
            isInitialLoading: false,
          });
          return;
        }
      }
      
      // Access Token이 있으면 사용자 정보 가져오기
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        const userData = await authApi.getCurrentUser();
        const userWithCamel = { ...userData, isAdmin: userData.isAdmin ?? userData.is_admin ?? false };
        if (!userWithCamel.id) {
          console.error('[AuthContext] userData.id 없음!:', userWithCamel);
        }
        const profileData = await userApi.getUserProfile(userWithCamel.id);
        
        // 결과 저장 (아직 setState 안 함)
        authResult = { user: userWithCamel, profile: profileData };
      } else {
        // 토큰이 없음
        authResult = { user: null, profile: null };
      }
    } catch (err: any) {
      // 네트워크 에러인 경우 상세 로그 출력
      if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('Network') || err?.message?.includes('network')) {
        console.error('[AuthContext] 네트워크 연결 실패');
      }
      
      // CORS 에러인 경우
      if (err?.message?.includes('CORS') || err?.code === 'ERR_CORS') {
        console.error('[AuthContext] CORS 에러 발생 - 서버 CORS 설정 확인 필요');
      }
      
      // 401 에러가 발생하면 토큰 삭제하고 상태 초기화
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        authResult = { user: null, profile: null };
      }
      // 401이 아닌 에러(네트워크 등)는 기존 상태 유지 (isInitial일 때만 초기화)
      else if (isInitial) {
        authResult = { user: null, profile: null };
      }
      // isInitial=false일 때는 authResult를 null로 두어 상태 유지
    } finally {
      // finally에서 모든 상태를 한 번에 업데이트!
      if (authResult !== null) {
        setState({
          user: authResult.user,
          profile: authResult.profile,
          isLoading: false,
          isInitialLoading: isInitial ? false : false, // isInitial이든 아니든 여기서 false
        });
      } else if (showLoading) {
        // authResult가 null이면 로딩만 해제 (에러 발생 시 기존 상태 유지)
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialLoading: isInitial ? false : prev.isInitialLoading,
        }));
      }
    }
  }, []);

  // 앱 시작 시 인증 복원 (초기 로딩만 표시)
  useEffect(() => {
    restoreAuth(true, true);
  }, [restoreAuth]);

  // 포어그라운드로 돌아올 때 토큰 갱신
  useEffect(() => {
    // 네이티브 앱: Capacitor App API 사용
    if (Capacitor.isNativePlatform()) {
      let appStateListener: any = null;
      
      const setupAppStateListener = async () => {
        try {
          const { App } = await import('@capacitor/app');
          
          appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
              // 포어그라운드로 돌아올 때 토큰 갱신 (로딩 표시 없이)
              console.log('[AuthContext] 앱이 포어그라운드로 돌아옴, 토큰 갱신 시도');
              restoreAuth(false);
            }
          });
        } catch (error) {
          console.error('[AuthContext] App State Listener 설정 실패:', error);
        }
      };
      
      setupAppStateListener();
      
      return () => {
        if (appStateListener) {
          appStateListener.remove();
        }
      };
    } else {
      // 웹: visibilitychange 이벤트 사용
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // 포어그라운드로 돌아올 때 토큰 갱신 (로딩 표시 없이)
          console.log('[AuthContext] 페이지가 포어그라운드로 돌아옴, 토큰 갱신 시도');
          restoreAuth(false);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [restoreAuth]);

  const login = async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await authApi.login(credentials);
      // Access Token과 Refresh Token 모두 저장
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      if (!response.user.id) {
        console.error('[AuthContext] 로그인 후 user.id 없음!:', response.user);
      }
      
      // user 객체의 관리자 권한 필드를 camelCase로 변환
      const userWithCamel = { ...response.user, isAdmin: response.user.isAdmin ?? response.user.is_admin ?? false };
      const profileData = await userApi.getUserProfile(userWithCamel.id);
      
      // 한 번에 모든 상태 업데이트
      setState({
        user: userWithCamel,
        profile: profileData,
        isLoading: false,
        isInitialLoading: false,
      });
      
      return { user: userWithCamel, profile: profileData };
    } catch (error) {
      console.error('[AuthContext] 로그인 실패:', error);
      
      // 에러 시에도 한 번에 업데이트
      setState({
        user: null,
        profile: null,
        isLoading: false,
        isInitialLoading: false,
      });
      
      throw error;
    }
  };

  const logout = async () => {
    // Refresh Token 무효화 요청
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // ignore - 로그아웃은 항상 성공으로 처리
    }
    // 토큰 삭제
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    setState(prev => ({
      ...prev,
      user: null,
      profile: null,
    }));
    // console.log('[AuthContext] 로그아웃, localStorage token:', localStorage.getItem('token'));
  };

  // user 정보 새로고침 함수 추가 (백그라운드 업데이트 옵션)
  const fetchUser = async (showLoading = false) => {
    // 초기 로드나 명시적 요청시에만 로딩 표시
    if (showLoading) {
      setState(prev => ({ ...prev, isLoading: true }));
    }
    
    try {
      const userData = await authApi.getCurrentUser();
      const userWithCamel = { ...userData, isAdmin: userData.isAdmin ?? userData.is_admin ?? false };
      if (!userWithCamel.id) {
        console.error('[AuthContext] fetchUser: userData.id 없음!:', userWithCamel);
      }
      const profileData = await userApi.getUserProfile(userWithCamel.id);
      
      // 한 번에 모든 상태 업데이트
      if (showLoading) {
        setState(prev => ({
          ...prev,
          user: userWithCamel,
          profile: profileData,
          isLoading: false,
        }));
      } else {
        // 백그라운드 업데이트는 user/profile만
        setState(prev => ({
          ...prev,
          user: userWithCamel,
          profile: profileData,
        }));
      }
    } catch (err) {
      console.error('[AuthContext] fetchUser: 인증 복원 실패:', err);
      localStorage.removeItem('token');
      
      // 에러 시에도 한 번에 업데이트
      if (showLoading) {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
        }));
      }
    }
  };

  // setProfile은 UserProfile을 받아서 profile만 갱신
  const setProfileOnly = (profile: UserProfile) => setState((prev) => ({ ...prev, profile }));

  const { user, profile, isLoading, isInitialLoading } = state;
  // console.log('[AuthContext] value 리턴 직전', { user, profile, isLoading });
  const value: AuthContextType & { setProfile: (profile: UserProfile) => void; fetchUser: typeof fetchUser; isInitialLoading: boolean } = {
    user,
    profile,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    setProfile: setProfileOnly,
    fetchUser,
    isInitialLoading,
  };
  // console.log('[AuthContext] value 리턴', { user, profile, isLoading, isAuthenticated: !!user });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 