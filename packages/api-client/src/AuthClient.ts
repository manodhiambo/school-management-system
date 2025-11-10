/// <reference types="vite/client" />
import axios, { AxiosInstance } from 'axios';

export class AuthClient {
  private axios: AxiosInstance;

  constructor(baseURL: string, getToken?: () => string | null) {
    this.axios = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axios.interceptors.request.use((config) => {
      const token = getToken?.();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async request<T = any>(config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    params?: any;
  }): Promise<T> {
    const response = await this.axios({
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
    });
    return response.data;
  }

  async getTeachers(params?: { status?: string; department?: string }) {
    return this.request({
      url: '/api/v1/teachers',
      method: 'GET',
      params,
    });
  }

  async getReports(path: string) {
    return this.request({
      url: `/api/v1/reports/${path}`,
      method: 'GET',
    });
  }
}

export const apiClient = new AuthClient(
  import.meta.env.VITE_API_URL || 'http://localhost:5000',
  () => localStorage.getItem('access_token')
);
