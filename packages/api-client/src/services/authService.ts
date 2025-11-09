import apiClient from '../client';
import type { LoginRequest, AuthResponse } from '@school/shared-types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    return response.data;
  },
};
