import axios from 'axios';
import { User, LoginCredentials, RegisterFormData, Company, Match, ChatMessage, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterFormData): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
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
    // 임시 하드코딩된 회사 리스트 (백엔드 서버가 없을 때 사용)
    const mockCompanies: Company[] = [
      {
        id: '1',
        name: '현대자동차',
        emailDomain: 'hyundai.com',
        isActive: true
      },
      {
        id: '2',
        name: '기아자동차',
        emailDomain: 'kia.com',
        isActive: false
      },
      {
        id: '3',
        name: '현대모비스',
        emailDomain: 'mobis.co.kr',
        isActive: false
      },
      {
        id: '4',
        name: '현대제철',
        emailDomain: 'hyundai-steel.com',
        isActive: false
      },
      {
        id: '5',
        name: '현대엔지니어링',
        emailDomain: 'hdec.kr',
        isActive: false
      },
      {
        id: '6',
        name: '현대글로비스',
        emailDomain: 'glovis.net',
        isActive: false
      }
    ];
    
    // 실제 API 호출 대신 임시 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockCompanies);
      }, 500); // 0.5초 지연으로 실제 API 호출 시뮬레이션
    });
    
    // 백엔드 서버가 준비되면 아래 코드로 교체
    // const response = await api.get('/companies');
    // return response.data;
  },

  getCompanyByDomain: async (domain: string): Promise<Company | null> => {
    const response = await api.get(`/companies/domain/${domain}`);
    return response.data;
  },
};

// User API
export const userApi = {
  updateProfile: async (userId: string, profileData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, profileData);
    return response.data;
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
};

// Matching API
export const matchingApi = {
  requestMatching: async (): Promise<Match> => {
    const response = await api.post('/matching/request');
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

  cancelMatch: async (matchId: string): Promise<Match> => {
    const response = await api.post(`/matching/${matchId}/cancel`);
    return response.data;
  },
};

// Chat API
export const chatApi = {
  getMessages: async (matchId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/${matchId}/messages`);
    return response.data;
  },

  sendMessage: async (matchId: string, content: string): Promise<ChatMessage> => {
    const response = await api.post(`/chat/${matchId}/messages`, { content });
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getAllUsers: async (): Promise<User[]> => {
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

export default api; 