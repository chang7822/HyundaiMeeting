import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, startTransition } from 'react';
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
  const [authState, setAuthState] = useState<{ user: User | null; profile: UserProfile | null }>({ user: null, profile: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 토큰 갱신 및 사용자 정보 로드 함수
  const restoreAuth = useCallback(async (showLoading = true, isInitial = false) => {
    if (showLoading) {
      if (isInitial) {
        setIsInitialLoading(true);
      } else {
        setIsLoading(true);
      }
    }
    
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      // Refresh Token이 있으면 먼저 토큰 갱신 시도
      if (refreshToken) {
        try {
          // console.log('[AuthContext] Refresh Token으로 토큰 갱신 시도');
          const refreshResponse = await authApi.refresh(refreshToken);
          // 새로운 Access Token 저장
          localStorage.setItem('token', refreshResponse.token);
          // console.log('[AuthContext] 토큰 갱신 성공');
        } catch (refreshErr: any) {
          // Refresh Token 갱신 실패 - 토큰이 만료되었거나 유효하지 않음
          console.log('[AuthContext] Refresh Token 갱신 실패:', refreshErr?.response?.status || refreshErr?.message);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setAuthState({ user: null, profile: null });
          if (showLoading) {
            if (isInitial) {
              setIsInitialLoading(false);
            } else {
              setIsLoading(false);
            }
          }
          return;
        }
      }
      
      // Access Token이 있으면 사용자 정보 가져오기
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        const userData = await authApi.getCurrentUser();
        // userData가 snake_case(is_admin)로 올 수 있으니 camelCase로 변환
        const userWithCamel = { ...userData, isAdmin: userData.isAdmin ?? userData.is_admin ?? false };
        if (!userWithCamel.id) {
          console.error('[AuthContext] userData.id 없음!:', userWithCamel);
        }
        const profileData = await userApi.getUserProfile(userWithCamel.id);
        
        // 상태 업데이트를 즉시 실행 (배칭은 React가 자동으로 처리)
        setAuthState({ user: userWithCamel, profile: profileData });
      } else {
        // 토큰이 없으면 로그인하지 않은 상태
        setAuthState({ user: null, profile: null });
      }
    } catch (err: any) {
      // console.error('[AuthContext] 인증 복원 실패:', err);
      
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
        setAuthState({ user: null, profile: null });
      }
      // 401이 아닌 에러(네트워크 등)는 기존 상태 유지 (isInitial일 때만 초기화)
      else if (isInitial) {
        // 앱 최초 시작 시에만 상태 초기화
        setAuthState({ user: null, profile: null });
      }
      // 포어그라운드 복귀 등 isInitial=false일 때는 기존 user/profile 유지
    } finally {
      if (showLoading) {
        // 상태 업데이트를 같은 마이크로태스크에서 실행하도록 보장
        if (isInitial) {
          setIsInitialLoading(false);
        } else {
          setIsLoading(false);
        }
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
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      // Access Token과 Refresh Token 모두 저장
      localStorage.setItem('token', response.token); // Access Token
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken); // Refresh Token
      }
      // console.log('[AuthContext] 로그인 성공, 토큰 저장:', response.token);
      // console.log('[AuthContext] localStorage token:', localStorage.getItem('token'));
      if (!response.user.id) {
        console.error('[AuthContext] 로그인 후 user.id 없음!:', response.user);
      }
      // user 객체의 관리자 권한 필드를 camelCase로 변환
      const userWithCamel = { ...response.user, isAdmin: response.user.isAdmin ?? response.user.is_admin ?? false };
      const profileData = await userApi.getUserProfile(userWithCamel.id);
      // console.log('[AuthContext] getUserProfile 성공:', profileData);
      // console.log('[AuthContext] setAuthState 직전 (login)', { user: userWithCamel, profile: profileData });
      setAuthState({ user: userWithCamel, profile: profileData });
      return { user: userWithCamel, profile: profileData };
    } catch (error) {
      console.error('[AuthContext] 로그인 실패:', error);
      setAuthState({ user: null, profile: null });
      throw error;
    } finally {
      setIsLoading(false);
      // console.log('[AuthContext] login: isLoading false');
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
    setAuthState({ user: null, profile: null });
    // console.log('[AuthContext] 로그아웃, localStorage token:', localStorage.getItem('token'));
  };

  // user 정보 새로고침 함수 추가 (백그라운드 업데이트 옵션)
  const fetchUser = async (showLoading = false) => {
    // 초기 로드나 명시적 요청시에만 로딩 표시
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      const userData = await authApi.getCurrentUser();
      const userWithCamel = { ...userData, isAdmin: userData.isAdmin ?? userData.is_admin ?? false };
      if (!userWithCamel.id) {
        console.error('[AuthContext] fetchUser: userData.id 없음!:', userWithCamel);
      }
      const profileData = await userApi.getUserProfile(userWithCamel.id);
      // getCurrentUser에서 이미 is_applied, is_matched 포함된 전체 데이터를 받으므로 그대로 사용
      setAuthState({ user: userWithCamel, profile: profileData });
    } catch (err) {
      console.error('[AuthContext] fetchUser: 인증 복원 실패:', err);
      localStorage.removeItem('token');
      setAuthState({ user: null, profile: null });
    } finally {
      // showLoading이 true였을 때만 로딩 해제
      if (showLoading) {
        setIsLoading(false);
      }
      // console.log('[AuthContext] fetchUser: isLoading false');
    }
  };

  // setProfile은 UserProfile을 받아서 profile만 갱신
  const setProfileOnly = (profile: UserProfile) => setAuthState((prev) => ({ ...prev, profile }));

  const { user, profile } = authState;
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