import axios from 'axios';
import { User, UserProfile, LoginCredentials, RegisterFormData, Company, Match, ChatMessage, ProfileCategory, ProfileOption } from '../types/index.ts';
import { toast } from 'react-toastify';

// API Base URL 설정
function getApiBaseUrl(): string {
  const envUrl = process.env.REACT_APP_API_URL;
  
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // 끝의 슬래시 제거
  }
  
  // 환경변수가 없을 때만 fallback 사용
  return 'https://auto-matching-way-backend.onrender.com/api';
}

const API_BASE_URL = getApiBaseUrl();

// API_BASE_URL을 export하여 다른 곳에서도 사용 가능하도록 함
export { API_BASE_URL };

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
  // 네이티브 앱에서 CORS 문제 해결을 위한 설정
  withCredentials: false, // 네이티브 앱에서는 false로 설정
});

// 수동 로그아웃 이후에는 401 토스트를 막기 위한 플래그
let suppressAuth401Toast = false;

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh Token 갱신 중 플래그 (무한 루프 방지)
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

// Global response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // /matching/period 엔드포인트의 404 에러는 조용히 처리
    if (error?.config?.url?.includes('/matching/period') && error?.response?.status === 404) {
      // 404를 정상적인 응답으로 변환
      return Promise.resolve({ data: null });
    }
    
    // Handle token expiration
    const isLoginRequest = error?.config?.url?.includes('/auth/login') ?? false;
    const isRefreshRequest = error?.config?.url?.includes('/auth/refresh') ?? false;
    
    if (error.response?.status === 401) {
      // 로그인/갱신 요청 자체가 401이면 재시도하지 않음
      if (isLoginRequest || isRefreshRequest) {
        if (!isLoginRequest && !suppressAuth401Toast) {
          toast.error('로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        if (!isLoginRequest && !suppressAuth401Toast) {
          window.location.href = '/';
        }
        suppressAuth401Toast = false;
        return Promise.reject(error);
      }

      // Refresh Token으로 자동 갱신 시도
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken && !isRefreshing) {
        isRefreshing = true;
        
        try {
          // Refresh Token으로 새로운 Access Token 발급
          const refreshResponse = await authApi.refresh(refreshToken);
          const newAccessToken = refreshResponse.token;
          
          // 새로운 Access Token 저장
          localStorage.setItem('token', newAccessToken);
          
          // 실패한 요청들을 재시도
          failedQueue.forEach(({ resolve }) => {
            resolve();
          });
          failedQueue = [];
          
          // 원래 요청을 새로운 토큰으로 재시도
          const originalRequest = error.config;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh Token 갱신 실패 - 모든 토큰 삭제 및 로그인 페이지로 이동
          failedQueue.forEach(({ reject }) => {
            reject(refreshError);
          });
          failedQueue = [];
          
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          
          if (!suppressAuth401Toast) {
            toast.error('로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
            window.location.href = '/';
          }
          suppressAuth401Toast = false;
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else if (isRefreshing) {
        // 이미 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          const originalRequest = error.config;
          const newAccessToken = localStorage.getItem('token');
          if (newAccessToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
          return Promise.reject(error);
        });
      } else {
        // Refresh Token이 없거나 갱신 실패 - 로그인 페이지로 이동
        if (!suppressAuth401Toast) {
          toast.error('로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        if (!suppressAuth401Toast) {
          window.location.href = '/';
        }
        suppressAuth401Toast = false;
        return Promise.reject(error);
      }
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

  logout: async (refreshToken?: string) => {
    // 수동 로그아웃 이후에는 인증 만료 토스트를 막는다.
    suppressAuth401Toast = true;
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // 로그아웃은 항상 성공으로 처리
    }
  },

  refresh: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken });
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
    customCompanyName?: string;
    maritalStatus?: string;
    education?: string;
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
    // 선호값 전체를 그대로 서버로 넘긴다 (ageMin, heightMin, preferredBodyTypes 등 + preferCompanyIds 포함)
    preferences: any;
                  termsAgreement?: {
                privacy: boolean;
                terms: boolean;
                email: boolean;
                agreedAt: string;
              };
  }): Promise<{ user: User; token: string; refreshToken?: string }> => {
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
    const response = await api.post('/auth/resend-verification', { email });
    return response.data.success;
  },

  // 비밀번호 찾기 API
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetCode: async (email: string, code: string) => {
    const response = await api.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  resetPassword: async (email: string, resetToken: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { email, resetToken, newPassword });
    return response.data;
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

  // 랜딩 페이지에서 관리자에게 회사 추가 요청 보내기
  requestNewCompany: async (payload: { companyName: string; emailDomain: string; replyEmail: string; message?: string }) => {
    const response = await api.post('/companies/request', payload);
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

  // 이메일 수신 허용 설정 조회
  getEmailNotificationSetting: async (): Promise<{ email_notification_enabled: boolean }> => {
    const response = await api.get('/users/me/email-notification');
    return response.data;
  },

  // 이메일 수신 허용 설정 업데이트
  updateEmailNotificationSetting: async (enabled: boolean): Promise<{ success: boolean; email_notification_enabled: boolean; message: string }> => {
    const response = await api.put('/users/me/email-notification', { enabled });
    return response.data;
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
    const data = response.data;

    // 백엔드가 { success, current, next, message } 형태로 내려주는 경우
    if (data && typeof data === 'object' && ('current' in data || 'next' in data)) {
      const current = data.current || null;
      const next = data.next || null;

      // current/next 둘 다 없으면 "매칭 회차 없음"으로 간주 -> 프론트에 null 반환
      if (!current && !next) {
        return null;
      }

      return { current, next };
    }

    // 과거 호환: 단일 회차 객체만 내려오는 경우 그대로 반환
    return data;
  },

  // 커뮤니티 페이지용 매칭 회차 조회 (준비중 상태 제외)
  getMatchingPeriodForCommunity: async () => {
    const response = await api.get('/matching/period-for-community');
    const data = response.data;

    // 백엔드가 { success, current, message } 형태로 내려주는 경우
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.current) {
        return null;
      }
      return { current: data.current };
    }

    return data;
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

  // 메시지 읽음 처리
  markAsRead: async (periodId: string, partnerUserId: string, userId: string) => {
    const response = await api.put(`/chat/${periodId}/${partnerUserId}/read`, { userId });
    return response.data;
  },

  // 안읽은 메시지 개수 조회
  getUnreadCount: async (userId: string) => {
    const response = await api.get(`/chat/unread-count/${userId}`);
    return response.data;
  },
};

// System API (유지보수 모드 등 전역 설정)
export const systemApi = {
  getStatus: async (): Promise<{ success: boolean; maintenance: { enabled: boolean; message?: string } }> => {
    const response = await api.get('/system/status');
    return response.data;
  },
  
  // 앱 버전 정책 조회
  getVersionPolicy: async (): Promise<any> => {
    const response = await api.get('/system/version-policy');
    return response.data;
  },
};

// 별 / 출석 API
export const starApi = {
  // 내 별 잔액 및 최근 내역 조회
  getMyStars: async (): Promise<any> => {
    const response = await api.get('/stars/me');
    return response.data;
  },

  // 일일 출석 체크 (별 1개)
  dailyAttendance: async (): Promise<{ success: boolean; message?: string; newBalance?: number }> => {
    const response = await api.post('/stars/attendance/daily');
    return response.data;
  },

  // 광고 보기 보상 (별 2개)
  adReward: async (): Promise<{ success: boolean; message?: string; newBalance?: number }> => {
    const response = await api.post('/stars/attendance/ad');
    return response.data;
  },

  // 가위바위보 일일 사용량 조회 (앱/웹 동기화)
  getRpsDaily: async (): Promise<{ used: number; extra: number }> => {
    const response = await api.get('/stars/rps/daily');
    return response.data;
  },

  // 가위바위보 미니게임: 배팅 (1~3개 차감, 서버에서 used 증가)
  rpsBet: async (amount: number): Promise<{ success: boolean; newBalance: number; used?: number; extra?: number }> => {
    const response = await api.post('/stars/rps/bet', { amount });
    return response.data;
  },

  // 가위바위보: 광고 시청 후 추가 횟수 + 별 지급 (서버에 반영해 앱/웹 동기화)
  rpsAddExtra: async (count: number = 3, starReward: number = 3): Promise<{ success: boolean; used: number; extra: number; newBalance?: number }> => {
    const response = await api.post('/stars/rps/extra', { count, starReward });
    return response.data;
  },

  // 가위바위보 미니게임: 승리 시 2배 지급
  rpsWin: async (amount: number): Promise<{ success: boolean; newBalance: number; reward: number }> => {
    const response = await api.post('/stars/rps/win', { amount });
    return response.data;
  },
};

// 추가 매칭 도전(패자부활전) API
export const extraMatchingApi = {
  // 상태 조회 (현재 회차, 참가 가능 여부, 내 엔트리, 받은 어필 개수, 별 잔액)
  getStatus: async (): Promise<any> => {
    const response = await api.get('/extra-matching/status');
    return response.data;
  },

      // "추가 매칭 도전" 엔트리 생성 (별 10개 사용)
  createEntry: async (extraAppealText?: string): Promise<any> => {
    const payload = extraAppealText && extraAppealText.trim().length > 0
      ? { extraAppealText: extraAppealText.trim() }
      : {};
    const response = await api.post('/extra-matching/entries', payload);
    return response.data;
  },

      // 내 추가 매칭 도전 엔트리 취소 (호감 표현이 오기 전까지만, 별 환불 없음)
      cancelEntry: async (entryId: number): Promise<any> => {
        const response = await api.post(`/extra-matching/entries/${entryId}/cancel`);
        return response.data;
      },

  // 엔트리 추가 어필 텍스트 저장
  saveEntryAppeal: async (entryId: number, text: string): Promise<any> => {
    const response = await api.post(`/extra-matching/entries/${entryId}/extra-appeal`, { text });
    return response.data;
  },

  // 이성들의 추가 매칭 도전 엔트리 목록 조회
  listEntries: async (): Promise<{ entries: any[] }> => {
    const response = await api.get('/extra-matching/entries');
    return response.data;
  },

  // 특정 엔트리에 "호감 보내기" 신청 (별 10개 사용)
  applyEntry: async (entryId: number, extraAppealText?: string): Promise<any> => {
    const payload = extraAppealText && extraAppealText.trim().length > 0
      ? { extraAppealText: extraAppealText.trim() }
      : {};
    const response = await api.post(`/extra-matching/entries/${entryId}/apply`, payload);
    return response.data;
  },

  // 내가 받은 "호감 보내기" 목록 조회
  getMyReceivedApplies: async (): Promise<{ entry: any; applies: any[] }> => {
    const response = await api.get('/extra-matching/my-received-applies');
    return response.data;
  },

  // "호감 보내기" 수락
  acceptApply: async (applyId: number): Promise<any> => {
    const response = await api.post(`/extra-matching/applies/${applyId}/accept`);
    return response.data;
  },

  // "호감 보내기" 거절 (별 5개 환불)
  rejectApply: async (applyId: number): Promise<any> => {
    const response = await api.post(`/extra-matching/applies/${applyId}/reject`);
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

  /** 가위바위보 통계: 누적·오늘·주간(최근7일) 판수·±별·광고환급·계, 많이 둔 순 */
  getRpsStats: async (): Promise<{
    cumulative: Array<{ rank: number; userId: string; displayName: string; playCount: number; netStars: number; adRewardStars: number; totalNetStars: number }>;
    today: Array<{ rank: number; userId: string; displayName: string; playCount: number; netStars: number; adRewardStars: number; totalNetStars: number }>;
    weekly: Array<{ rank: number; userId: string; displayName: string; playCount: number; netStars: number; adRewardStars: number; totalNetStars: number }>;
  }> => {
    const response = await api.get('/admin/rps/stats');
    return response.data;
  },

  // 시스템 설정 조회 (유지보수 모드 등)
  getSystemSettings: async (): Promise<{
    success: boolean;
    maintenance: { enabled: boolean; message?: string };
    devMode?: { enabled: boolean };
    extraMatching?: { enabled: boolean };
    community?: { enabled: boolean };
    rpsStatsExcluded?: { nicknames: string[] };
    versionPolicy?: {
      ios?: { minimumVersion?: string; latestVersion?: string; storeUrl?: string };
      android?: { minimumVersion?: string; latestVersion?: string; storeUrl?: string };
      messages?: { forceUpdate?: string; optionalUpdate?: string };
    };
  }> => {
    const response = await api.get('/admin/system-settings');
    return response.data;
  },

  // 가위바위보 통계 제외 닉네임 목록 업데이트 (닉네임 기준)
  updateRpsStatsExcluded: async (nicknames: string[]): Promise<{ success: boolean; nicknames: string[] }> => {
    const response = await api.put('/admin/system-settings/rps-stats-excluded', { nicknames });
    return response.data;
  },

  // 유지보수 모드 토글
  updateMaintenance: async (enabled: boolean, message?: string): Promise<any> => {
    const response = await api.put('/admin/system-settings/maintenance', { enabled, message });
    return response.data;
  },

  // 관리자 모드(Dev Mode) 토글
  updateDevMode: async (enabled: boolean): Promise<any> => {
    const response = await api.put('/admin/system-settings/dev-mode', { enabled });
    return response.data;
  },

  // 추가 매칭 도전 기능 토글
  updateExtraMatching: async (enabled: boolean): Promise<any> => {
    const response = await api.put('/admin/system-settings/extra-matching', { enabled });
    return response.data;
  },

  updateCommunity: async (enabled: boolean): Promise<any> => {
    const response = await api.put('/admin/system-settings/community', { enabled });
    return response.data;
  },

  // 버전 정책 업데이트
  updateVersionPolicy: async (versionPolicy: any): Promise<any> => {
    const response = await api.put('/admin/system-settings/version-policy', versionPolicy);
    return response.data;
  },

  // 회차 초기화 복구
  restorePeriodUsers: async (periodId: number): Promise<any> => {
    const response = await api.post('/admin/restore-period-users', { periodId });
    return response.data;
  },

  clearAdminMatchingDataPreview: async (): Promise<{ historyCount: number; messagesCount: number }> => {
    const response = await api.get('/admin/clear-admin-matching-data-preview');
    return response.data;
  },

  clearAdminMatchingData: async (): Promise<{ historyDeleted: number; messagesDeleted: number; message: string }> => {
    const response = await api.post('/admin/clear-admin-matching-data');
    return response.data;
  },

  // 전체 회원 공지 메일 발송
  sendBroadcastEmail: async (payload: { subject: string; content: string; is_html?: boolean; targets?: string[] }): Promise<any> => {
    const response = await api.post('/admin/broadcast-email', payload);
    return response.data;
  },

  // 전체 메일 발송 대상 조회
  getBroadcastRecipients: async (): Promise<any[]> => {
    const response = await api.get('/admin/broadcast-recipients');
    return response.data;
  },

  // 관리자용 알림 보내기
  sendAdminNotification: async (payload: {
    target: {
      type?: 'all' | 'user_ids' | 'emails' | 'period_extra_participants';
      userIds?: string[];
      emails?: string[];
      periodId?: number;
    };
    notification: {
      title: string;
      body: string;
      linkUrl?: string | null;
      meta?: any;
    };
  }): Promise<any> => {
    const response = await api.post('/admin/notifications/send', payload);
    return response.data;
  },

  // 관리자: 이벤트 별 지급 + (선택) 알림/푸시 발송
  grantStars: async (payload: {
    userIds: string[];
    amount: number;
    notification?: {
      title: string;
      body: string;
      linkUrl?: string | null;
    };
    sendPush?: boolean;
  }): Promise<any> => {
    const response = await api.post('/admin/stars/grant', payload);
    return response.data;
  },

  // 추가 매칭도전 회차 요약 조회
  getExtraMatchingPeriodsSummary: async (): Promise<any[]> => {
    const response = await api.get('/admin/extra-matching/periods');
    return response.data;
  },

  // 특정 회차의 추가 매칭 도전 엔트리 목록 조회
  getExtraMatchingEntriesByPeriod: async (periodId: number): Promise<any[]> => {
    const response = await api.get(`/admin/extra-matching/period/${periodId}/entries`);
    return response.data;
  },

  // 특정 엔트리의 호감 리스트 조회
  getExtraMatchingAppliesByEntry: async (entryId: number): Promise<any[]> => {
    const response = await api.get(`/admin/extra-matching/entry/${entryId}/applies`);
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
    preferredEducations: string[] | null;
  }): Promise<any> => {
    const response = await api.put(`/users/${userId}`, {
      preferred_age_min: preferences.age ? preferences.age[0] : null,
      preferred_age_max: preferences.age ? preferences.age[1] : null,
      preferred_height_min: preferences.height ? preferences.height[0] : null,
      preferred_height_max: preferences.height ? preferences.height[1] : null,
      preferred_body_types: preferences.bodyType ? JSON.stringify(preferences.bodyType) : null,
      preferred_educations: preferences.preferredEducations ? JSON.stringify(preferences.preferredEducations) : null
    });
    return response.data;
  },

  getPreferences: async (userId: string): Promise<{
    age: number[] | null;
    height: number[] | null;
    bodyType: string[];
    preferredEducations: string[];
  }> => {
    const response = await api.get(`/users/${userId}/profile`);
    const profile = response.data;
    
    return {
      age: profile.preferred_age_min && profile.preferred_age_max ? 
        [profile.preferred_age_min, profile.preferred_age_max] : null,
      height: profile.preferred_height_min && profile.preferred_height_max ? 
        [profile.preferred_height_min, profile.preferred_height_max] : null,
      bodyType: profile.preferred_body_types ? JSON.parse(profile.preferred_body_types) : [],
      preferredEducations: profile.preferred_educations ? JSON.parse(profile.preferred_educations) : []
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

// Admin 회사(Companies) 관리 API
export const adminCompanyApi = {
  // 회사 목록 조회 (활성/비활성 포함)
  getCompanies: async (): Promise<{
    success: boolean;
    data: {
      id: number;
      name: string;
      emailDomains: string[];
      isActive: boolean;
      createdAt?: string;
    }[];
  }> => {
    const res = await api.get('/admin/companies');
    return res.data;
  },

  // 회사 생성
  createCompany: async (payload: {
    name: string;
    emailDomains: string[];
    isActive: boolean;
    createNotice?: boolean;
    sendNotification?: boolean;
    sendPush?: boolean;
    applyPreferCompany?: boolean;
    sendEmail?: boolean;
    emailRecipient?: string;
    emailSubject?: string;
    emailContent?: string;
  }): Promise<any> => {
    const res = await api.post('/admin/companies', payload);
    return res.data;
  },

  // 회사 수정
  updateCompany: async (
    id: number,
    payload: {
      name?: string;
      emailDomains?: string[];
      isActive?: boolean;
    },
  ): Promise<any> => {
    const res = await api.put(`/admin/companies/${id}`, payload);
    return res.data;
  },

  // 회사 삭제
  deleteCompany: async (id: number): Promise<any> => {
    const res = await api.delete(`/admin/companies/${id}`);
    return res.data;
  },

  // 선택한 회사들을 모든 회원의 선호 회사(prefer_company)에 일괄 추가
  applyPreferredToAllUsers: async (companyIds: number[]): Promise<any> => {
    const res = await api.post('/admin/companies/apply-prefer-company', { companyIds });
    return res.data;
  },

  // 신규 회사 추가 요청 목록 조회
  getCompanyRequests: async (status?: 'pending' | 'accepted' | 'rejected'): Promise<{
    success: boolean;
    data: {
      id: string;
      companyName: string;
      emailDomain: string;
      replyEmail: string;
      message: string | null;
      status: string;
      createdAt: string;
      resolvedAt: string | null;
      companyId: number | null;
    }[];
  }> => {
    const params = status ? { status } : {};
    const res = await api.get('/admin/company-requests', { params });
    return res.data;
  },

  // 요청 상태 업데이트 (수락 시 회사 생성 후 호출)
  patchCompanyRequest: async (id: string, payload: { status: 'accepted'; companyId: number } | { status: 'rejected' }): Promise<any> => {
    const res = await api.patch(`/admin/company-requests/${id}`, payload);
    return res.data;
  },

  // 요청 거절 + 거절 메일 발송
  rejectCompanyRequest: async (id: string, payload: { rejectSubject: string; rejectBody: string }): Promise<any> => {
    const res = await api.post(`/admin/company-requests/${id}/reject`, payload);
    return res.data;
  },
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
  createNotice: async (data: { title: string; content: string; author?: string; is_important?: boolean; is_html?: boolean }): Promise<any> => {
    const response = await api.post('/notice', data);
    return response.data;
  },

  updateNotice: async (id: number, data: { title: string; content: string; author?: string; is_important?: boolean; is_html?: boolean }): Promise<any> => {
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

// ===================================
// 고객센터 API
// ===================================

// 문의 등록
export const createSupportInquiry = async (inquiryData: {
  title: string;
  content: string;
  category?: string;
}): Promise<any> => {
  const response = await api.post('/support/inquiries', inquiryData);
  return response.data;
};

// 내 문의 목록 조회
export const getMySupportInquiries = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> => {
  const response = await api.get('/support/inquiries/my', { params });
  return response.data;
};

// 문의 상세 조회
export const getSupportInquiry = async (id: number): Promise<any> => {
  const response = await api.get(`/support/inquiries/${id}`);
  return response.data;
};

export const getAdminSupportInquiry = async (id: number): Promise<any> => {
  const response = await api.get(`/support/admin/inquiries/${id}`);
  return response.data;
};



// 관리자용 문의 목록 조회
export const getAdminSupportInquiries = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
}): Promise<any> => {
  const response = await api.get('/support/admin/inquiries', { params });
  return response.data;
};

// 관리자 답변 등록
export const addAdminSupportReply = async (id: number, content: string): Promise<any> => {
  const response = await api.post(`/support/admin/inquiries/${id}/reply`, { content });
  return response.data;
};

// 문의 상태 변경 (관리자)
export const updateSupportInquiryStatus = async (id: number, status: string): Promise<any> => {
  const response = await api.put(`/support/admin/inquiries/${id}/status`, { status });
  return response.data;
};

// 신고 API
export const reportApi = {
  // 신고 등록
  createReport: async (data: {
    reported_user_id: string;
    period_id: number;
    report_type: string;
    report_details?: string;
  }): Promise<any> => {
    const response = await api.post('/reports', data);
    return response.data;
  },

  // 내가 신고한 목록 조회
  getMyReports: async (): Promise<any[]> => {
    const response = await api.get('/reports/my-reports');
    return response.data;
  },

  // 신고 상세 조회
  getReport: async (id: number): Promise<any> => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
};

// 매칭 이력 API
export const matchingHistoryApi = {
  // 내 매칭 이력 조회
  getMyHistory: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get('/matching-history/my-history');
    return response.data;
  },

  // 특정 매칭 이력 상세 조회
  getHistoryDetail: async (id: number): Promise<any> => {
    const response = await api.get(`/matching-history/${id}`);
    return response.data;
  },
};

// 관리자 신고 관리 API
export const adminReportApi = {
  // 모든 신고 목록 조회
  getAllReports: async (params?: { status?: string; page?: number; limit?: number }): Promise<any> => {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  // 신고 상세 조회
  getReportDetail: async (id: number): Promise<any> => {
    const response = await api.get(`/admin/reports/${id}`);
    return response.data;
  },

  // 신고 처리 (신고 횟수 기반 정지 시스템)
  processReport: async (id: number, data: {
    status: string;
    admin_notes?: string;
    ban_duration_days?: number;
  }): Promise<any> => {
    const response = await api.put(`/admin/reports/${id}/process`, data);
    return response.data;
  },

  // 사용자별 신고 정보 조회
  getUserReportInfo: async (userId: string): Promise<any> => {
    const response = await api.get(`/admin/users/${userId}/report-info`);
    return response.data;
  },

  // 사용자 신고 정보 수동 조정
  updateUserReportInfo: async (userId: string, data: {
    report_count?: number;
    is_banned?: boolean;
    banned_until?: string;
    reason?: string;
  }): Promise<any> => {
    const response = await api.put(`/admin/users/${userId}/report-info`, data);
    return response.data;
  },

  // 사용자 프로필 조회 (관리자용)
  getUserProfile: async (userId: string): Promise<any> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },
};

// 관리자 매칭 관리 API
export const adminMatchingApi = {
  // 매칭 로그 조회
  getMatchingLogs: async (): Promise<any[]> => {
    const response = await api.get('/admin/matching-log');
    return response.data;
  },

  // 매칭 로그 생성
  createMatchingLog: async (log: any): Promise<any> => {
    const response = await api.post('/admin/matching-log', log);
    return response.data;
  },

  // 매칭 로그 수정
  updateMatchingLog: async (id: number, log: any): Promise<any> => {
    const response = await api.put(`/admin/matching-log/${id}`, log);
    return response.data;
  },

  // 매칭 로그 삭제
  deleteMatchingLog: async (id: number): Promise<any> => {
    const response = await api.delete(`/admin/matching-log/${id}`);
    return response.data;
  },

  // 매칭 신청 현황 조회
  getMatchingApplications: async (periodId: string = 'all'): Promise<any[]> => {
    const response = await api.get(`/admin/matching-applications?periodId=${periodId}`);
    return response.data;
  },

  // 매칭 결과 조회
  getMatchingHistory: async (periodId: string = 'all', nickname?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (periodId !== 'all') params.append('periodId', periodId);
    if (nickname) params.append('nickname', nickname);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/admin/matching-history${queryString}`);
    return response.data;
  },

  getMatchingCompatibility: async (userId: string, periodId: string): Promise<{
    iPrefer: any[];
    preferMe: any[];
  }> => {
    const response = await api.get(`/admin/matching-compatibility/${userId}`, {
      params: { periodId }
    });
    return response.data;
  },

  // 현재 프로필/선호 기준 전체 회원 호환성 조회 (회차/신청과 무관)
  getMatchingCompatibilityLive: async (userId: string): Promise<{
    iPrefer: any[];
    preferMe: any[];
  }> => {
    const response = await api.get(`/admin/matching-compatibility-live/${userId}`);
    return response.data;
  },

  // 가상 매칭 (DB 변경 없이 예상 커플 계산)
  virtualMatch: async (periodId?: string | null): Promise<{
    success: boolean;
    periodId: number | null;
    totalApplicants: number;
    eligibleApplicants: number;
    matchCount: number;
    couples: any[];
  }> => {
    const payload: any = {};
    if (periodId && periodId !== 'all') {
      payload.periodId = periodId;
    }
    const response = await api.post('/admin/matching-simulate', payload);
    return response.data;
  },

  // 가상 매칭 (전체 회원 기준, 관리자/정지/비활성 제외)
  virtualMatchLive: async (): Promise<{
    success: boolean;
    totalUsers: number;
    eligibleUsers: number;
    matchCount: number;
    couples: any[];
  }> => {
    const response = await api.post('/admin/matching-simulate-live', {});
    return response.data;
  },
};

// Notification API
export const notificationApi = {
  // 내 알림 목록 조회
  getNotifications: async (options?: { onlyUnread?: boolean; limit?: number }): Promise<{ notifications: any[] }> => {
    const params: any = {};
    if (options?.onlyUnread) params.onlyUnread = true;
    if (options?.limit != null) params.limit = options.limit;
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // 읽지 않은 알림 개수 조회
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // 특정 알림 읽음 처리
  markAsRead: async (id: number | string): Promise<{ success: boolean; alreadyRead?: boolean }> => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  // 내 모든 알림 읽음 처리
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

// Push Notification API (Firebase FCM Web Push용 토큰 등록/해제)
export const pushApi = {
  // 현재 기기의 FCM 토큰을 서버에 등록
  registerToken: async (token: string): Promise<{ success: boolean }> => {
    const response = await api.post('/push/register-token', { token });
    return response.data;
  },

  // 현재 기기의 FCM 토큰을 서버에서 해제
  // token을 보내지 않으면 해당 사용자(userId)의 모든 토큰을 제거
  unregisterToken: async (token?: string): Promise<{ success: boolean }> => {
    const payload = token ? { token } : {};
    const response = await api.post('/push/unregister-token', payload);
    return response.data;
  },

  // 사용자의 푸시 토큰 목록 조회
  getTokens: async (): Promise<{ success: boolean; tokens: any[]; hasToken: boolean }> => {
    const response = await api.get('/push/tokens');
    return response.data;
  },

  // 테스트 푸시 알림 전송 (현재 사용자 대상)
  sendTestNotification: async (): Promise<{ success: boolean }> => {
    const response = await api.post('/push/send-test', {});
    return response.data;
  },

  // 관리자용 푸시 알림 전송 (특정 사용자 대상)
  sendAdminPush: async (email: string, title: string, message: string): Promise<{ success: boolean; sent?: number; message?: string }> => {
    const response = await api.post('/push/send-admin', { email, title, message });
    return response.data;
  },
};

// Logs API
export const logsApi = {
  // 서버 로그 조회
  getServerLogs: async (limit?: number): Promise<{ logs: any[]; count: number }> => {
    const params = limit ? { limit } : {};
    const response = await api.get('/logs/server', { params });
    return response.data;
  },

  // 스케줄러 로그 조회
  getSchedulerLogs: async (limit?: number): Promise<{ logs: any[]; count: number }> => {
    const params = limit ? { limit } : {};
    const response = await api.get('/logs/scheduler', { params });
    return response.data;
  },
};

// Admin Chat API
export const adminChatApi = {
  // 두 사용자 간의 채팅 내역 조회 (관리자용)
  getChatMessages: async (user1Id: string | number, user2Id: string | number): Promise<{ messages: any[]; users: any; isDevMode?: boolean }> => {
    const response = await api.get(`/admin/chat-messages/${user1Id}/${user2Id}`);
    return response.data;
  },
};

// Community API
export const communityApi = {
  // 내 익명 ID 조회
  getMyIdentity: async (periodId: number): Promise<{ anonymousNumber: number; colorCode: string; tag: string }> => {
    const response = await api.get(`/community/my-identity/${periodId}`);
    return response.data;
  },

  // [관리자 전용] 모든 익명 ID 조회 (fixedDisplayTag: 해당 ID로 이미 글/댓글 쓴 적 있으면 그때 태그 고정)
  getAdminIdentities: async (periodId: number): Promise<{ identities: Array<{ anonymousNumber: number; colorCode: string; tag: string; fixedDisplayTag?: string }> }> => {
    const response = await api.get(`/community/admin/identities/${periodId}`);
    return response.data;
  },

  // [관리자 전용] 익명 ID 자동 생성 (마지막 번호 + 1)
  createAdminIdentity: async (periodId: number): Promise<{ anonymousNumber: number; colorCode: string; tag: string; message: string }> => {
    const response = await api.post('/community/admin/identities', { period_id: periodId });
    return response.data;
  },

  // [관리자 전용] 익명 ID 일괄 생성 (N개)
  createAdminIdentitiesBulk: async (periodId: number, count: number): Promise<{ identities: Array<{ anonymousNumber: number; colorCode: string; tag: string }>; message: string }> => {
    const response = await api.post('/community/admin/identities/bulk', { period_id: periodId, count });
    return response.data;
  },

  // [관리자 전용] 게시글 강제 삭제
  adminDeletePost: async (postId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/community/admin/delete-post/${postId}`);
    return response.data;
  },

  // [관리자 전용] 댓글 강제 삭제
  adminDeleteComment: async (commentId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/community/admin/delete-comment/${commentId}`);
    return response.data;
  },

  // 게시글 목록 조회
  getPosts: async (periodId: number, limit = 20, offset = 0, sortBy: 'latest' | 'popular' = 'latest', filter: 'all' | 'mine' = 'all'): Promise<{ posts: any[]; hasMore: boolean; totalCount: number }> => {
    const response = await api.get(`/community/posts/${periodId}`, { params: { limit, offset, sortBy, filter } });
    return response.data;
  },

  // 게시글 작성 (postAsAdmin: true면 공식 관리자 ID로 표시, displayTag: 관리자 익명 시 선택 태그)
  createPost: async (periodId: number, content: string, preferredAnonymousNumber?: number, postAsAdmin?: boolean, displayTag?: string | null): Promise<{ post: any }> => {
    const response = await api.post('/community/posts', { 
      period_id: periodId, 
      content,
      ...(preferredAnonymousNumber != null && preferredAnonymousNumber !== undefined && { preferred_anonymous_number: preferredAnonymousNumber }),
      ...(postAsAdmin && { post_as_admin: true }),
      ...(displayTag != null && displayTag !== '' && { display_tag: displayTag })
    });
    return response.data;
  },

  // 게시글 삭제
  deletePost: async (postId: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/community/posts/${postId}`);
    return response.data;
  },

  // 댓글 목록 조회
  getComments: async (postId: number): Promise<{ comments: any[] }> => {
    const response = await api.get(`/community/posts/${postId}/comments`);
    return response.data;
  },

  // 댓글 작성 (postAsAdmin: true면 공식 관리자 ID로 표시, displayTag: 관리자 익명 시 선택 태그)
  createComment: async (postId: number, content: string, preferredAnonymousNumber?: number, postAsAdmin?: boolean, displayTag?: string | null): Promise<{ comment: any }> => {
    const response = await api.post('/community/comments', { 
      post_id: postId, 
      content,
      ...(preferredAnonymousNumber != null && preferredAnonymousNumber !== undefined && { preferred_anonymous_number: preferredAnonymousNumber }),
      ...(postAsAdmin && { post_as_admin: true }),
      ...(displayTag != null && displayTag !== '' && { display_tag: displayTag })
    });
    return response.data;
  },

  // 댓글 삭제
  deleteComment: async (commentId: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/community/comments/${commentId}`);
    return response.data;
  },

  // 좋아요 토글
  toggleLike: async (postId: number, anonymousNumber?: number): Promise<{ liked: boolean }> => {
    const response = await api.post(`/community/posts/${postId}/like`, { 
      ...(anonymousNumber && { anonymous_number: anonymousNumber })
    });
    return response.data;
  },

  // 내가 좋아요한 게시글 ID 목록
  getMyLikes: async (periodId: number, anonymousNumber?: number): Promise<{ likedPostIds: number[] }> => {
    const response = await api.get(`/community/posts/my-likes/${periodId}`, {
      params: anonymousNumber ? { anonymous_number: anonymousNumber } : {}
    });
    return response.data;
  },

  // 신고
  reportContent: async (targetType: 'post' | 'comment', targetId: number, reason: string, anonymousNumber?: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/community/reports', { 
      target_type: targetType, 
      target_id: targetId, 
      reason,
      ...(anonymousNumber && { anonymous_number: anonymousNumber })
    });
    return response.data;
  },

  // [차단] 익명 사용자 차단 (회차 + 익명 번호)
  blockUser: async (periodId: number, anonymousNumber: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/community/block', { period_id: periodId, anonymous_number: anonymousNumber });
    return response.data;
  },

  // [차단] 차단 해제
  unblockUser: async (periodId: number, anonymousNumber: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/community/block/${periodId}/${anonymousNumber}`);
    return response.data;
  },

  // [차단] 해당 회차에서 내가 차단한 익명 번호 목록
  getBlockedList: async (periodId: number): Promise<{ blockedAnonymousNumbers: number[] }> => {
    const response = await api.get(`/community/blocked-list/${periodId}`);
    return response.data;
  },
};

export default api;