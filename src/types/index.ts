// User Types
export interface User {
  id: string;
  email: string;
  company: string;
  birthYear: number;
  gender: 'male' | 'female';
  height: number;
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
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Company Types
export interface Company {
  id: string;
  name: string;
  emailDomain: string;
  isActive: boolean;
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
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

// Form Types
export interface RegisterFormData {
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
  birthYear: number;
  gender: 'male' | 'female';
  height: number;
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
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
} 