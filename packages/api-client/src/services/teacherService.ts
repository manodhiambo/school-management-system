import { apiClient } from '../client';
import type { Teacher, PaginatedResponse } from '@sms/shared-types';

export const teacherService = {
  async getTeachers(): Promise<PaginatedResponse<Teacher>> {
    const response = await apiClient.get<PaginatedResponse<Teacher>>('/teachers');
    return response.data;
  },

  async getTeacherById(id: string): Promise<Teacher> {
    const response = await apiClient.get<Teacher>(`/teachers/${id}`);
    return response.data;
  },

  async createTeacher(data: Omit<Teacher, 'id'>): Promise<Teacher> {
    const response = await apiClient.post<Teacher>('/teachers', data);
    return response.data;
  },

  async updateTeacher(id: string, data: Partial<Omit<Teacher, 'id'>>): Promise<Teacher> {
    const response = await apiClient.put<Teacher>(`/teachers/${id}`, data);
    return response.data;
  },

  async deleteTeacher(id: string): Promise<void> {
    await apiClient.delete(`/teachers/${id}`);
  },
};
