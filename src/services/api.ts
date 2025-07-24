import axios from 'axios';
import { User, UserProfile, LoginCredentials, RegisterFormData, Company, Match, ChatMessage, ApiResponse, ProfileCategory, ProfileOption } from '../types/index.ts';
import { toast } from 'react-toastify';

// API Base URL을 반드시 환경변수로만 사용하도록 강제
const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, ''); // 끝 슬래시 제거

// fetch/axios 등에서 항상 API_BASE_URL을 prefix로 사용하도록 유틸 함수 제공
export function apiUrl(path: string) {
  // path 앞에 슬래시가 없으면 추가
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE_URL + path;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // console.log('[axios] 요청 URL:', config.url, '토큰:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // console.log('[axios] Authorization 헤더에 토큰 추가:', token);
  } else {
    // console.log('[axios] 토큰 없음, Authorization 헤더 미포함');
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
    if (error.response?.status === 401) {
      if (!isLoginRequest) {
        toast.error('로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
        localStorage.removeItem('token');
        // console.log('[axios] 401 발생, localStorage token:', localStorage.getItem('token'));
        // 이동 없이 에러도 반환하지 않음(페이지 멈춤)
        return;
      }
      // /auth/login 요청이면 아무 토스트도 띄우지 않음 (실패 안내는 LoginPage에서 따로 처리)
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await axios.post(apiUrl('/auth/login'), credentials);
    // console.log('[api] /auth/login 응답:', response.data);
    return response.data;
  },

  register: async (userData: RegisterFormData): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  registerComplete: async (userData: {
    email: string;
    password: string;
    nickname: string;
    gender: string;
    birthYear: number;
    height?: number;
    residence?: string;
    company?: string;
    maritalStatus?: string;
    jobType?: string;
    appeal?: string;
    profileData: {
      selected: { [categoryId: number]: number[] };
      mbti?: string;
      bodyType?: string;
      residence?: string;
      interests?: string[];
      appearance?: string[];
      personality?: string[];
      religion?: string;
      smoking?: string;
      drinking?: string;
    };
    preferences: {
      age: number[] | null;
      height: number[] | null;
      bodyType: string[] | null;
      jobType: string[] | null;
    };
  }): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await axios.get(apiUrl('/auth/me'), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      params: {
        _t: Date.now() // 캐시 방지를 위한 timestamp
      }
    });
    // console.log('[api] /auth/me 응답:', response.data);
    return response.data;
  },

  verifyEmail: async (email: string): Promise<boolean> => {
    const response = await api.post('/auth/verify-email', { email });
    return response.data.success;
  },

  confirmVerification: async (email: string, code: string): Promise<boolean> => {
    const response = await api.post('/auth/confirm-verification', { email, code });
    return response.data.success;
  },

  resendVerificationEmail: async (email: string): Promise<boolean> => {
    const response = await api.post('/auth/verify-email', { email });
    return response.data.success;
  },
};

// Company API
export const companyApi = {
  getCompanies: async (): Promise<Company[]> => {
    // 실제 API 호출
    const response = await api.get('/companies');
    return response.data;
  },

  getCompanyByDomain: async (domain: string): Promise<Company | null> => {
    const response = await api.get(`/companies/domain/${domain}`);
    return response.data;
  },
};

// User API
export const userApi = {
  updateProfile: async (userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put(`/users/${userId}`, profileData);
    return response.data;
  },

  getUser: async (userId: string): Promise<User & UserProfile> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  getUserProfile: async (userId: string): Promise<UserProfile> => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  // 내 정보 조회 (GET /users/me)
  getMe: async (): Promise<User & UserProfile> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // 내 정보 수정 (PUT /users/me)
  updateMe: async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put('/users/me', profileData);
    return response.data.profile;
  },

  // 비밀번호 변경
  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    const response = await api.put(`/users/${userId}/password`, { currentPassword, newPassword });
    return response.data.success;
  },

  // 회원 탈퇴
  deleteMe: async (): Promise<boolean> => {
    const response = await api.delete('/users/me');
    return response.data.success;
  },
};

// Matching API
export const matchingApi = {
  requestMatching: async (userId?: string): Promise<any> => {
    const response = await api.post('/matching/request', userId ? { userId } : {});
    return response.data;
  },

  getMatchingStatus: async (userId: string): Promise<any> => {
    const response = await api.get('/matching/status', { params: { userId } });
    return response.data;
  },

  cancelMatching: async (userId: string): Promise<any> => {
    const response = await api.post('/matching/cancel', { userId });
    return response.data;
  },

  getMyMatches: async (): Promise<Match[]> => {
    const response = await api.get('/matching/my-matches');
    return response.data;
  },

  getMatchDetails: async (matchId: string): Promise<Match> => {
    const response = await api.get(`/matching/${matchId}`);
    return response.data;
  },

  confirmMatch: async (matchId: string): Promise<Match> => {
    const response = await api.post(`/matching/${matchId}/confirm`);
    return response.data;
  },

  // 매칭 기간 정보 조회
  getMatchingPeriod: async () => {
    const response = await api.get('/matching/period');
    return response.data;
  },
};

// Chat API
export const chatApi = {
  getMessages: async (periodId: string, partnerUserId: string, userId: string) => {
    const res = await fetch(apiUrl(`/chat/${periodId}/${partnerUserId}/messages?userId=${userId}`));
    if (!res.ok) throw new Error('메시지 조회 실패');
    return await res.json();
  },

  sendMessage: async (matchId: string, content: string): Promise<ChatMessage> => {
    const response = await api.post(`/chat/${matchId}/messages`, { content });
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getAllUsers: async (): Promise<(User & UserProfile)[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  getAllMatches: async (): Promise<Match[]> => {
    const response = await api.get('/admin/matches');
    return response.data;
  },

  updateUserStatus: async (userId: string, status: { isActive: boolean }): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/status`, status);
    return response.data;
  },

  getSystemStats: async (): Promise<any> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export const getProfileCategories = async (): Promise<ProfileCategory[]> => {
  try {
    const res = await api.get('/users/profile-categories');
    return res.data;
  } catch (error) {
    console.warn('프로필 카테고리 로드 실패:', error);
    return [];
  }
};

export const getProfileOptions = async (): Promise<ProfileOption[]> => {
  try {
    const res = await api.get('/users/profile-options');
    return res.data;
  } catch (error) {
    console.warn('프로필 옵션 로드 실패:', error);
    return [];
  }
};

// Preferences API (이제 user_profiles 테이블에 통합됨)
export const preferencesApi = {
  savePreferences: async (userId: string, preferences: {
    age: number[] | null;
    height: number[] | null;
    bodyType: string[] | null;
    jobType: string[] | null;
  }): Promise<any> => {
    const response = await api.put(`/users/${userId}`, {
      preferred_age_min: preferences.age ? preferences.age[0] : null,
      preferred_age_max: preferences.age ? preferences.age[1] : null,
      preferred_height_min: preferences.height ? preferences.height[0] : null,
      preferred_height_max: preferences.height ? preferences.height[1] : null,
      preferred_body_types: preferences.bodyType ? JSON.stringify(preferences.bodyType) : null,
      preferred_job_types: preferences.jobType ? JSON.stringify(preferences.jobType) : null
    });
    return response.data;
  },

  getPreferences: async (userId: string): Promise<{
    age: number[] | null;
    height: number[] | null;
    bodyType: string[];
    jobType: string[];
  }> => {
    const response = await api.get(`/users/${userId}/profile`);
    const profile = response.data;
    
    return {
      age: profile.preferred_age_min && profile.preferred_age_max ? 
        [profile.preferred_age_min, profile.preferred_age_max] : null,
      height: profile.preferred_height_min && profile.preferred_height_max ? 
        [profile.preferred_height_min, profile.preferred_height_max] : null,
      bodyType: profile.preferred_body_types ? JSON.parse(profile.preferred_body_types) : [],
      jobType: profile.preferred_job_types ? JSON.parse(profile.preferred_job_types) : []
    };
  },
};

// Admin 카테고리/옵션 관리용 API
export const getAdminProfileCategories = async () => {
  const res = await api.get('/admin/profile-categories');
  return res.data;
};
export const getAdminProfileOptions = async () => {
  const res = await api.get('/admin/profile-options');
  return res.data;
};

// Admin 카테고리/옵션 일괄 저장 API
export const saveAdminProfileCategories = async (categories: any[]) => {
  const res = await api.post('/admin/profile-categories/bulk-save', { categories });
  return res.data;
};
export const saveAdminProfileOptions = async (options: any[]) => {
  const res = await api.post('/admin/profile-options/bulk-save', { options });
  return res.data;
};

// Notice API
export const noticeApi = {
  getNotices: async (): Promise<any[]> => {
    const response = await api.get('/notice');
    return response.data;
  },

  getNotice: async (id: number): Promise<any> => {
    const response = await api.get(`/notice/${id}`);
    return response.data;
  },

  // 관리자용 API
  createNotice: async (data: { title: string; content: string; author?: string; is_important?: boolean }): Promise<any> => {
    const response = await api.post('/notice', data);
    return response.data;
  },

  updateNotice: async (id: number, data: { title: string; content: string; author?: string; is_important?: boolean }): Promise<any> => {
    const response = await api.put(`/notice/${id}`, data);
    return response.data;
  },

  deleteNotice: async (id: number): Promise<any> => {
    const response = await api.delete(`/notice/${id}`);
    return response.data;
  },
};

// FAQ API
export const faqApi = {
  getFaqs: async (): Promise<any[]> => {
    const response = await api.get('/faq');
    return response.data;
  },

  getFaq: async (id: number): Promise<any> => {
    const response = await api.get(`/faq/${id}`);
    return response.data;
  },

  // 관리자용 API
  createFaq: async (data: { question: string; answer: string; display_order?: number; is_active?: boolean }): Promise<any> => {
    const response = await api.post('/faq', data);
    return response.data;
  },

  updateFaq: async (id: number, data: { question: string; answer: string; display_order?: number; is_active?: boolean }): Promise<any> => {
    const response = await api.put(`/faq/${id}`, data);
    return response.data;
  },

  deleteFaq: async (id: number): Promise<any> => {
    const response = await api.delete(`/faq/${id}`);
    return response.data;
  },
};

// 매칭 결과 발표 이메일 발송 API
export const sendMatchingResultEmails = async (periodId: number): Promise<any> => {
  const response = await api.post('/admin/send-matching-result-emails', { periodId });
  return response.data;
};

export default api; 