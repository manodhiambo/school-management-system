import { apiClient } from '../index';
import type { Teacher, ApiResponse, PaginatedResponse } from '@school/shared-types';

export const teacherService = {
  getTeachers: async (): Promise<ApiResponse<PaginatedResponse<Teacher>>> => {
    const response = await apiClient.get('/api/v1/teachers');
    return response.data;
  },
};
