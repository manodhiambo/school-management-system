import { apiClient } from '../client';
import type { Student, PaginatedResponse, StudentFilters, StudentDocument } from '@sms/shared-types';

export const studentService = {
  async getStudents(filters: StudentFilters = {}): Promise<PaginatedResponse<Student>> {
    const response = await apiClient.get<PaginatedResponse<Student>>('/students', {
      params: filters,
    });
    return response.data;
  },

  async getStudentById(id: string): Promise<Student> {
    const response = await apiClient.get<Student>(`/students/${id}`);
    return response.data;
  },

  async createStudent(data: Omit<Student, 'id'>): Promise<Student> {
    const response = await apiClient.post<Student>('/students', data);
    return response.data;
  },

  async updateStudent(id: string, data: Partial<Omit<Student, 'id'>>): Promise<Student> {
    const response = await apiClient.put<Student>(`/students/${id}`, data);
    return response.data;
  },

  async deleteStudent(id: string): Promise<void> {
    await apiClient.delete(`/students/${id}`);
  },

  async uploadDocument(studentId: string, file: File): Promise<StudentDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<StudentDocument>(`/students/${studentId}/documents`, formData);
    return response.data;
  },
};
