import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile, LoginCredentials, AuthContextType } from '../types/index.ts';
import { authApi, userApi } from '../services/api.ts';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true); // 인증 복원 시작 시 무조건 true
    const token = localStorage.getItem('token');
    // console.log('[AuthContext] useEffect 진입, token:', token);
    if (token) {
      (async () => {
        try {
          const userData = await authApi.getCurrentUser();
          // userData가 snake_case(is_admin)로 올 수 있으니 camelCase로 변환
          const userWithCamel = { ...userData, isAdmin: userData.isAdmin ?? userData.is_admin ?? false };
          if (!userWithCamel.id) {
            console.error('[AuthContext] userData.id 없음!:', userWithCamel);
          }
          const profileData = await userApi.getUserProfile(userWithCamel.id);
          // getCurrentUser에서 이미 is_applied, is_matched 포함된 전체 데이터를 받으므로 그대로 사용
          setAuthState({ user: userWithCamel, profile: profileData });
        } catch (err) {
          console.error('[AuthContext] 인증 복원 실패:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setAuthState({ user: null, profile: null });
        } finally {
          setIsLoading(false);
          // console.log('[AuthContext] 인증 복원 완료, isLoading:', false);
        }
      })();
    } else {
      setAuthState({ user: null, profile: null });
      setIsLoading(false);
      // console.log('[AuthContext] 토큰 없음, 인증 복원 종료');
    }
  }, []);

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
  const value: AuthContextType & { setProfile: (profile: UserProfile) => void; fetchUser: typeof fetchUser } = {
    user,
    profile,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    setProfile: setProfileOnly,
    fetchUser,
  };
  // console.log('[AuthContext] value 리턴', { user, profile, isLoading, isAuthenticated: !!user });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 