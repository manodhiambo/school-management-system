import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  // ==================== AUTH ====================
  login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  logout() {
    return this.api.post('/auth/logout');
  }

  getCurrentUser() {
    return this.api.get('/auth/me');
  }

  forgotPassword(email: string) {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string) {
    return this.api.post(`/auth/reset-password/${token}`, { password });
  }

  changePassword(oldPassword: string, newPassword: string) {
    return this.api.post('/auth/change-password', { oldPassword, newPassword });
  }

  // ==================== DASHBOARD ====================
  getDashboardStats() {
    return this.api.get('/admin/dashboard');
  }

  // ==================== STUDENTS ====================
  getStudents(params?: any) {
    return this.api.get('/students', { params });
  }

  getStudent(id: string) {
    return this.api.get(`/students/${id}`);
  }

  createStudent(data: any) {
    return this.api.post('/students', data);
  }

  updateStudent(id: string, data: any) {
    return this.api.put(`/students/${id}`, data);
  }

  deleteStudent(id: string) {
    return this.api.delete(`/students/${id}`);
  }

  updateStudentStatus(id: string, status: string) {
    return this.api.patch(`/students/${id}/status`, { status });
  }

  bulkImportStudents(file: FormData) {
    return this.api.post('/students/bulk-import', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  getStudentAttendance(id: string) {
    return this.api.get(`/students/${id}/attendance`);
  }

  getStudentAcademicReport(id: string) {
    return this.api.get(`/students/${id}/academic-report`);
  }

  getStudentFinance(id: string) {
    return this.api.get(`/students/${id}/finance`);
  }

  promoteStudent(id: string, data: any) {
    return this.api.post(`/students/${id}/promote`, data);
  }

  // ==================== TEACHERS ====================
  getTeachers(params?: any) {
    return this.api.get('/teachers', { params });
  }

  getTeacher(id: string) {
    return this.api.get(`/teachers/${id}`);
  }

  createTeacher(data: any) {
    return this.api.post('/teachers', data);
  }

  updateTeacher(id: string, data: any) {
    return this.api.put(`/teachers/${id}`, data);
  }

  deleteTeacher(id: string) {
    return this.api.delete(`/teachers/${id}`);
  }

  assignTeacherToClass(id: string, classId: string, sectionId: string) {
    return this.api.patch(`/teachers/${id}/assign-class`, { classId, sectionId });
  }

  getTeacherSchedule(id: string) {
    return this.api.get(`/teachers/${id}/schedule`);
  }

  applyTeacherLeave(id: string, data: any) {
    return this.api.post(`/teachers/${id}/leave`, data);
  }

  getTeacherLeaves(id: string) {
    return this.api.get(`/teachers/${id}/leave`);
  }

  // ==================== PARENTS ====================
  getParents(params?: any) {
    return this.api.get('/parents', { params });
  }

  getParent(id: string) {
    return this.api.get(`/parents/${id}`);
  }

  createParent(data: any) {
    return this.api.post('/parents', data);
  }

  updateParent(id: string, data: any) {
    return this.api.put(`/parents/${id}`, data);
  }

  linkParentToStudent(parentId: string, studentId: string) {
    return this.api.post(`/parents/${parentId}/link-student`, { studentId });
  }

  // ==================== CLASSES & SUBJECTS ====================
  getClasses(params?: any) {
    return this.api.get('/classes', { params });
  }

  getClass(id: string) {
    return this.api.get(`/classes/${id}`);
  }

  createClass(data: any) {
    return this.api.post('/classes', data);
  }

  updateClass(id: string, data: any) {
    return this.api.put(`/classes/${id}`, data);
  }

  deleteClass(id: string) {
    return this.api.delete(`/classes/${id}`);
  }

  getSubjects(params?: any) {
    return this.api.get('/subjects', { params });
  }

  createSubject(data: any) {
    return this.api.post('/subjects', data);
  }

  updateSubject(id: string, data: any) {
    return this.api.put(`/subjects/${id}`, data);
  }

  deleteSubject(id: string) {
    return this.api.delete(`/subjects/${id}`);
  }

  // ==================== ATTENDANCE ====================
  markAttendance(data: any) {
    return this.api.post('/attendance/mark', data);
  }

  getAttendance(params?: any) {
    return this.api.get('/attendance', { params });
  }

  getClassAttendance(classId: string, date: string) {
    return this.api.get(`/attendance/class/${classId}/date/${date}`);
  }

  getAttendanceStatistics(studentId?: string) {
    const url = studentId ? `/attendance/statistics/${studentId}` : '/attendance/statistics';
    return this.api.get(url);
  }

  getAttendanceReport(params?: any) {
    return this.api.get('/attendance/report', { params });
  }

  // ==================== FEES ====================
  getFeeStructures(params?: any) {
    return this.api.get('/fee/structure', { params });
  }

  createFeeStructure(data: any) {
    return this.api.post('/fee/structure', data);
  }

  updateFeeStructure(id: string, data: any) {
    return this.api.put(`/fee/structure/${id}`, data);
  }

  getStudentFeeAccount(studentId: string) {
    return this.api.get(`/fee/student/${studentId}`);
  }

  recordPayment(data: any) {
    return this.api.post('/fee/payment', data);
  }

  initiateOnlinePayment(data: any) {
    return this.api.post('/fee/payment/online', data);
  }

  getFeeReceipt(paymentId: string) {
    return this.api.get(`/fee/receipt/${paymentId}`);
  }

  getFeeDefaulters() {
    return this.api.get('/fee/defaulters');
  }

  sendFeeReminders(data: any) {
    return this.api.post('/fee/reminders', data);
  }

  getFeeStatistics() {
    return this.api.get('/fee/statistics');
  }

  // ==================== EXAMS ====================
  getExams(params?: any) {
    return this.api.get('/exams', { params });
  }

  createExam(data: any) {
    return this.api.post('/exams', data);
  }

  getExam(id: string) {
    return this.api.get(`/exams/${id}`);
  }

  updateExam(id: string, data: any) {
    return this.api.put(`/exams/${id}`, data);
  }

  uploadExamResults(examId: string, file: FormData) {
    return this.api.post(`/exams/${examId}/results`, file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  getStudentExamResults(studentId: string) {
    return this.api.get(`/students/${studentId}/exam-results`);
  }

  // ==================== TIMETABLE ====================
  generateTimetable(data: any) {
    return this.api.post('/timetable/generate', data);
  }

  getClassTimetable(classId: string) {
    return this.api.get(`/timetable/class/${classId}`);
  }

  getTeacherTimetable(teacherId: string) {
    return this.api.get(`/timetable/teacher/${teacherId}`);
  }

  assignSubstitute(data: any) {
    return this.api.post('/timetable/substitute', data);
  }

  getTimetableConflicts() {
    return this.api.get('/timetable/conflicts');
  }

  // ==================== COMMUNICATION ====================
  sendMessage(data: any) {
    return this.api.post('/messages', data);
  }

  getMessages(params?: any) {
    return this.api.get('/messages', { params });
  }

  getSentMessages() {
    return this.api.get('/messages/sent');
  }

  markMessageAsRead(id: string) {
    return this.api.post(`/messages/${id}/read`);
  }

  broadcastMessage(data: any) {
    return this.api.post('/messages/broadcast', data);
  }

  schedulePTM(data: any) {
    return this.api.post('/messages/parent-teacher-meeting', data);
  }

  getNotifications() {
    return this.api.get('/notifications');
  }

  markNotificationAsRead(id: string) {
    return this.api.put(`/notifications/${id}/read`);
  }

  // ==================== SETTINGS ====================
  getSettings() {
    return this.api.get('/admin/settings');
  }

  updateSettings(data: any) {
    return this.api.put('/admin/settings', data);
  }

  getAuditLogs(params?: any) {
    return this.api.get('/admin/audit-logs', { params });
  }

  // ==================== REPORTS ====================
  getEnrollmentReport(params?: any) {
    return this.api.get('/reports/enrollment', { params });
  }

  getAttendanceAnalytics(params?: any) {
    return this.api.get('/reports/attendance', { params });
  }

  getFinancialReport(params?: any) {
    return this.api.get('/reports/finance', { params });
  }

  getAcademicReport(params?: any) {
    return this.api.get('/reports/academic', { params });
  }

  exportReport(type: string, params?: any) {
    return this.api.get(`/reports/export?type=${type}`, { params, responseType: 'blob' });
  }

  // ==================== USERS (Admin Only) ====================
  getUsers(params?: any) {
    return this.api.get('/users', { params });
  }

  createUser(data: any) {
    return this.api.post('/users', data);
  }

  updateUserStatus(id: string, isActive: boolean) {
    return this.api.patch(`/users/${id}/status`, { is_active: isActive });
  }

  resetUserPassword(id: string, newPassword: string) {
    return this.api.post(`/users/${id}/reset-password`, { password: newPassword });
  }

  sendUserCredentials(id: string) {
    return this.api.post(`/users/${id}/send-credentials`);
  }

  deleteUser(id: string) {
    return this.api.delete(`/users/${id}`);
  }
}

export default new ApiService();
