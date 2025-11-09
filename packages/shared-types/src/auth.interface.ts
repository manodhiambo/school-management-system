import { User } from './user.interface';

export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}
