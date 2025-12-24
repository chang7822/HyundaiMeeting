// User(계정 정보만)
export interface User {
  id: string;
  email: string;
  password?: string;
  // 로그인 응답에서 닉네임을 함께 내려줄 수 있으므로 선택 필드로 추가
  nickname?: string;
  is_verified: boolean;
  is_active: boolean;
  isAdmin: boolean;
  created_at: string;
  updated_at: string;
  is_applied: boolean; // 매칭 신청 여부
  is_matched: boolean | null; // 매칭 결과(성공/실패/null)
  is_banned?: boolean; // 정지 상태
  banned_until?: string; // 정지 만료일
}

// UserProfile(모든 프로필 정보를 한 행에)
export interface UserProfile {
  id: number;
  user_id: string;
  // 사용자 정지 상태 정보 (프로필 조회 시 포함)
  user?: {
    is_banned: boolean;
    banned_until: string | null;
  };
  // 기본 정보
  nickname?: string;
  gender?: 'male' | 'female';
  birth_year?: number;
  height?: number;
  residence?: string;
  company?: string;
  custom_company_name?: string; // 프리랜서/자영업, 기타 회사 선택 시 사용자가 입력한 회사명/직업
  job_type?: '일반직(사무직)' | '기술직(생산직)' | '연구직' | '기타';
  appeal?: string;
  
  // 단일 선택 항목들
  marital_status?: string; // 결혼상태
  religion?: string; // 종교
  smoking?: string; // 흡연
  drinking?: string; // 음주
  mbti?: string; // MBTI
  body_type?: string; // 체형
  
  // 중복 선택 항목들 (JSON 배열로 저장)
  interests?: string; // JSON: ["영화감상", "음악감상", "책읽기"]
  appearance?: string; // JSON: ["동안", "강아지상", "고양이상"]
  personality?: string; // JSON: ["웃음이 많아요", "애교가 많아요"]
  
  // 선호사항
  preferred_age_min?: number;
  preferred_age_max?: number;
  preferred_height_min?: number;
  preferred_height_max?: number;
  preferred_body_types?: string; // JSON: ["마른", "슬림탄탄", "보통"]
  preferred_job_types?: string; // JSON: ["일반직", "기술직"]
  preferred_marital_statuses?: string; // JSON: ["미혼", "돌싱"]
  prefer_company?: number[]; // integer[]: 선호 회사 id 배열
  prefer_region?: string[]; // text[]: 선호 지역(시/도 등) 배열
  
  created_at: string;
  updated_at: string;
}

// 프로필 카테고리
export interface ProfileCategory {
  id: number;
  name: string;
  gender: 'common' | 'male' | 'female';
  display_order: number;
  created_at: string;
}

// 프로필 옵션
export interface ProfileOption {
  id: number;
  category_id: number;
  option_text: string;
  display_order: number;
  created_at: string;
}

// 선호사항
export interface UserPreference {
  id: number;
  user_id: string;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_height_min: number;
  preferred_height_max: number;
  created_at: string;
  updated_at: string;
}

// 선호 옵션(체형, 결혼상태 등)
export interface UserPreferenceOption {
  id: number;
  user_id: string;
  preference_type: string; // 'body_type', 'marital_status', ...
  option_text: string;
  created_at: string;
}

// Company Types
export interface Company {
  id: string;
  name: string;
  emailDomains: string[];
  isActive: boolean;
  jobTypeHold?: boolean; // 직군 선택을 일반직으로 고정할지 여부
}

// Matching Types
export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  matchDate: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  chatEnabled: boolean;
  createdAt: Date;
}

// Chat Types
export interface ChatMessage {
  id: string | number;
  period_id: string;
  sender_id: string;
  receiver_id: string;
  sender_nickname?: string;
  receiver_nickname?: string;
  content: string;
  timestamp: string | Date;
  matchId?: string;
  senderId?: string;
}

// Form Types
export interface RegisterFormData {
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
  birthYear: number;
  gender: 'male' | 'female';
  height: string;
  bodyType: string;
  maritalStatus: string;
  location: string;
  religion: string;
  occupation: string;
  smoking: string;
  drinking: string;
  appearance: string;
  personality: string;
  interests: string[];
  address: {
    city: string;
    district: string;
    detail: string;
  };
  preferences: {
    preferredAgeRange: string;
    preferredBodyType: string;
    preferredMaritalStatus: string;
    maxDistance: number;
    preferredReligion: string;
    preferredSmoking: string;
    preferredDrinking: string;
    avoidCompanies: string[];
  };
  appeal: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  login: (credentials: LoginCredentials) => Promise<{ user: User; profile: UserProfile }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  fetchUser: (showLoading?: boolean) => Promise<void>; // 백그라운드 업데이트 옵션 추가
} 