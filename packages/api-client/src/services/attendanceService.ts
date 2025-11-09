import { apiClient } from '../client';
import type { Attendance, CreateAttendanceDto } from '@sms/shared-types';

export const attendanceService = {
  async getAttendanceById(id: string): Promise<Attendance> {
    const response = await apiClient.get<Attendance>(`/attendance/${id}`);
    return response.data;
  },

  async createAttendance(data: CreateAttendanceDto): Promise<Attendance> {
    const response = await apiClient.post<Attendance>('/attendance', data);
    return response.data;
  },

  async updateAttendance(id: string, data: Partial<CreateAttendanceDto>): Promise<Attendance> {
    const response = await apiClient.put<Attendance>(`/attendance/${id}`, data);
    return response.data;
  },

  async deleteAttendance(id: string): Promise<void> {
    await apiClient.delete(`/attendance/${id}`);
  },
};
