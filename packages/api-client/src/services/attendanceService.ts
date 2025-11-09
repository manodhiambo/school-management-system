import { apiClient } from '../index';
import type { Attendance, CreateAttendanceDto, ApiResponse } from '@school/shared-types';

export const attendanceService = {
  markAttendance: async (data: CreateAttendanceDto): Promise<ApiResponse<Attendance>> => {
    const response = await apiClient.post('/api/v1/attendance/mark', data);
    return response.data;
  },
  
  getStudentAttendance: async (studentId: string, date: string): Promise<ApiResponse<Attendance[]>> => {
    const response = await apiClient.get(`/api/v1/attendance/student/${studentId}/date/${date}`);
    return response.data;
  },
};
