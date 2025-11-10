import axios, { AxiosInstance } from 'axios';
import { 
  User, 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '@school/shared-types';

export class AuthClient {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1') {
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const { data } = await this.client.post('/auth/refresh-token', { refreshToken });
            localStorage.setItem('accessToken', data.accessToken);
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>('/auth/forgot-password', data);
    return response.data;
  }

  async resetPassword(token: string, data: ResetPasswordRequest): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(
      `/auth/reset-password/${token}`,
      data
    );
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>('/auth/change-password', data);
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

// Export singleton instance
export const authClient = new AuthClient();
