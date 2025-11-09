import { apiClient } from '../index';
import type { Student, ApiResponse, PaginatedResponse, StudentFilters } from '@school/shared-types';

export const studentService = {
  getStudents: async (filters?: StudentFilters): Promise<ApiResponse<PaginatedResponse<Student>>> => {
    const response = await apiClient.get('/api/v1/students', { params: filters });
    return response.data;
  },
  
  getStudentById: async (id: string): Promise<ApiResponse<Student>> => {
    const response = await apiClient.get(`/api/v1/students/${id}`);
    return response.data;
  },
};
