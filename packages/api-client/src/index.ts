import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '@school/shared-types';

/**
 * A configured axios instance for your API requests.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Generic request helper.
 * @param config Axios request configuration
 * @returns The data of type T from the response
 */
export const request = async <T = any>(config: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await apiClient.request(config);
  return response.data;
};

/**
 * Example helper for fetching the current authenticated user.
 */
export const fetchCurrentUser = async (): Promise<User> => {
  const data = await request<User>({
    url: '/api/v1/auth/me',
    method: 'GET'
  });
  return data;
};
