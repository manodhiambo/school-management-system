import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthResponse, User, LoginRequest } from '@school/shared-types';

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenUrl = '/api/v1/auth/refresh-token';

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
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
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await this.client.post<AuthResponse>(this.refreshTokenUrl, {
              refreshToken,
            });
            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);
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

  // Authentication
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/v1/auth/login', data);
    const { accessToken, refreshToken, user } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/v1/auth/logout');
    localStorage.clear();
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/api/v1/auth/me');
    return response.data;
  }

  // Students
  async getStudents(params?: any) {
    const response = await this.client.get('/api/v1/students', { params });
    return response.data;
  }

  async getStudent(id: string) {
    const response = await this.client.get(`/api/v1/students/${id}`);
    return response.data;
  }

  async createStudent(data: any) {
    const response = await this.client.post('/api/v1/students', data);
    return response.data;
  }

  async updateStudent(id: string, data: any) {
    const response = await this.client.put(`/api/v1/students/${id}`, data);
    return response.data;
  }

  // Teachers
  async getTeachers(params?: any) {
    const response = await this.client.get('/api/v1/teachers', { params });
    return response.data;
  }

  async getTeacher(id: string) {
    const response = await this.client.get(`/api/v1/teachers/${id}`);
    return response.data;
  }

  // Attendance
  async markAttendance(data: any) {
    const response = await this.client.post('/api/v1/attendance/mark', data);
    return response.data;
  }

  async getClassAttendance(classId: string, date: string) {
    const response = await this.client.get(`/api/v1/attendance/class/${classId}/date/${date}`);
    return response.data;
  }

  // Fee Management
  async getFeeStructure(params?: any) {
    const response = await this.client.get('/api/v1/fee/structure', { params });
    return response.data;
  }

  async getStudentFee(studentId: string) {
    const response = await this.client.get(`/api/v1/fee/student/${studentId}`);
    return response.data;
  }

  // Academic
  async getClasses(params?: any) {
    const response = await this.client.get('/api/v1/classes', { params });
    return response.data;
  }

  async getExams(params?: any) {
    const response = await this.client.get('/api/v1/exams', { params });
    return response.data;
  }

  // Reports
  async getReports(type: string, params?: any) {
    const response = await this.client.get(`/api/v1/reports/${type}`, { params });
    return response.data;
  }

  // Generic request method
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

// Custom hook for API calls
import { useState, useEffect } from 'react';

export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiCall();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}
