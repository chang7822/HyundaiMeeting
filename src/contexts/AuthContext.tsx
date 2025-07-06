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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true); // 인증 복원 시작 시 무조건 true
    const token = localStorage.getItem('token');
    console.log('[AuthContext] useEffect 진입, token:', token);
    if (token) {
      authApi.getCurrentUser()
        .then(userData => {
          setUser(userData);
          console.log('[AuthContext] getCurrentUser 성공:', userData);
          // user.id(UUID)만 사용
          if (!userData.id) {
            console.error('[AuthContext] userData.id 없음!:', userData);
          }
          return userApi.getUserProfile(userData.id);
        })
        .then(profileData => {
          setProfile(profileData);
          console.log('[AuthContext] getUserProfile 성공:', profileData);
        })
        .catch((err) => {
          console.error('[AuthContext] 인증 복원 실패:', err);
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        })
        .finally(() => {
          setIsLoading(false);
          console.log('[AuthContext] 인증 복원 완료, isLoading:', false);
        });
    } else {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      console.log('[AuthContext] 토큰 없음, 인증 복원 종료');
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem('token', response.token);
      console.log('[AuthContext] 로그인 성공, 토큰 저장:', response.token);
      console.log('[AuthContext] localStorage token:', localStorage.getItem('token'));
      setUser(response.user);
      if (!response.user.id) {
        console.error('[AuthContext] 로그인 후 user.id 없음!:', response.user);
      }
      // 로그인 후 프로필 정보 가져오기 (user.id는 UUID)
      const profileData = await userApi.getUserProfile(response.user.id);
      setProfile(profileData);
      console.log('[AuthContext] getUserProfile 성공:', profileData);
    } catch (error) {
      console.error('[AuthContext] 로그인 실패:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    setUser(null);
    setProfile(null);
    console.log('[AuthContext] 로그아웃, localStorage token:', localStorage.getItem('token'));
  };

  const value: AuthContextType & { setProfile: typeof setProfile } = {
    user,
    profile,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    setProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 