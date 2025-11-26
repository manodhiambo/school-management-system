import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        throw error.response?.data || error;
      }
    );
  }

  login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  logout() {
    return this.api.post('/auth/logout');
  }

  getMe() {
    return this.api.get('/auth/me');
  }

  getCurrentUser() {
    return this.api.get('/auth/me');
  }

  getDashboardStats() {
    return this.api.get('/admin/dashboard');
  }

  getStudents(params?: any) {
    return this.api.get('/students', { params });
  }

  getStudent(id: string) {
    return this.api.get('/students/' + id);
  }

  createStudent(data: any) {
    return this.api.post('/students', data);
  }

  updateStudent(id: string, data: any) {
    return this.api.put('/students/' + id, data);
  }

  deleteStudent(id: string) {
    return this.api.delete('/students/' + id);
  }

  getStudentAttendance(studentId: string, params?: any) {
    return this.api.get('/attendance/student/' + studentId, { params });
  }

  getStudentExamResults(studentId: string) {
    return this.api.get('/academic/results/student/' + studentId);
  }

  getStudentFeeAccount(studentId: string) {
    return this.api.get('/fee/student/' + studentId);
  }

  getTeachers(params?: any) {
    return this.api.get('/teachers', { params });
  }

  getTeacher(id: string) {
    return this.api.get('/teachers/' + id);
  }

  createTeacher(data: any) {
    return this.api.post('/teachers', data);
  }

  updateTeacher(id: string, data: any) {
    return this.api.put('/teachers/' + id, data);
  }

  deleteTeacher(id: string) {
    return this.api.delete('/teachers/' + id);
  }

  getParents(params?: any) {
    return this.api.get('/parents', { params });
  }

  getParent(id: string) {
    return this.api.get('/parents/' + id);
  }

  getParentByUserId(userId: string) {
    return this.api.get('/parents/by-user/' + userId);
  }

  createParent(data: any) {
    return this.api.post('/parents', data);
  }

  updateParent(id: string, data: any) {
    return this.api.put('/parents/' + id, data);
  }

  linkStudentToParent(parentId: string, studentId: string) {
    return this.api.post('/parents/' + parentId + '/link-student', { studentId });
  }

  getClasses(params?: any) {
    return this.api.get('/classes', { params });
  }

  getClass(id: string) {
    return this.api.get('/classes/' + id);
  }

  createClass(data: any) {
    return this.api.post('/classes', data);
  }

  updateClass(id: string, data: any) {
    return this.api.put('/classes/' + id, data);
  }

  deleteClass(id: string) {
    return this.api.delete('/classes/' + id);
  }

  getSubjects(params?: any) {
    return this.api.get('/subjects', { params });
  }

  getSubject(id: string) {
    return this.api.get('/subjects/' + id);
  }

  createSubject(data: any) {
    return this.api.post('/subjects', data);
  }

  updateSubject(id: string, data: any) {
    return this.api.put('/subjects/' + id, data);
  }

  deleteSubject(id: string) {
    return this.api.delete('/subjects/' + id);
  }

  getAttendance(params?: any) {
    return this.api.get('/attendance', { params });
  }

  markAttendance(data: any) {
    return this.api.post('/attendance', data);
  }

  markBulkAttendance(data: any) {
    return this.api.post('/attendance/bulk', data);
  }

  getAttendanceByClass(classId: string, date: string) {
    return this.api.get('/attendance/class/' + classId, { params: { date } });
  }

  // Fee Management
  getFeeStructures(params?: any) {
    return this.api.get('/fee/structure', { params });
  }

  createFeeStructure(data: any) {
    return this.api.post('/fee/structure', data);
  }

  getFeeInvoices(params?: any) {
    return this.api.get('/fee/invoice', { params });
  }

  getFeeInvoice(id: string) {
    return this.api.get('/fee/invoice/' + id);
  }

  createFeeInvoice(data: any) {
    return this.api.post('/fee/invoice', data);
  }

  // Generate bulk invoices for students
  generateInvoices(data: any) {
    return this.api.post('/fee/invoice/bulk', data);
  }

  recordFeePayment(data: any) {
    return this.api.post('/fee/payment', data);
  }

  getFeePayments(params?: any) {
    return this.api.get('/fee/payment', { params });
  }

  getFeeDefaulters(params?: any) {
    return this.api.get('/fee/defaulters', { params });
  }

  getFeeStatistics(params?: any) {
    return this.api.get('/fee/statistics', { params });
  }

  // M-Pesa Payments
  initiateMpesaPayment(invoiceId: string, phoneNumber: string, amount: number) {
    return this.api.post('/fee/mpesa/pay', { invoiceId, phoneNumber, amount });
  }

  getMpesaTransactionStatus(checkoutRequestId: string) {
    return this.api.get('/fee/mpesa/status/' + checkoutRequestId);
  }

  getMpesaTransaction(transactionId: string) {
    return this.api.get('/fee/mpesa/transaction/' + transactionId);
  }

  getStudentMpesaTransactions(studentId: string) {
    return this.api.get('/fee/mpesa/student/' + studentId);
  }

  // Exams
  getExams(params?: any) {
    return this.api.get('/exams', { params });
  }

  createExam(data: any) {
    return this.api.post('/exams', data);
  }

  // Academic
  getResults(params?: any) {
    return this.api.get('/academic/results', { params });
  }

  submitResults(data: any) {
    return this.api.post('/academic/results', data);
  }

  // Timetable
  getTimetable(params?: any) {
    return this.api.get('/timetable', { params });
  }

  createTimetableEntry(data: any) {
    return this.api.post('/timetable', data);
  }

  // Communication
  getAnnouncements(params?: any) {
    return this.api.get('/communication/announcements', { params });
  }

  createAnnouncement(data: any) {
    return this.api.post('/communication/announcements', data);
  }

  getMessages(params?: any) {
    return this.api.get('/communication/messages', { params });
  }

  sendMessage(data: any) {
    return this.api.post('/communication/messages', data);
  }

  // Notifications
  getNotifications() {
    return this.api.get('/notifications');
  }

  markNotificationAsRead(id: string) {
    return this.api.put('/notifications/' + id + '/read');
  }

  markAllNotificationsAsRead() {
    return this.api.post('/notifications/mark-all-read');
  }

  // Users
  getUsers(params?: any) {
    return this.api.get('/users', { params });
  }

  createUser(data: any) {
    return this.api.post('/users', data);
  }

  updateUser(id: string, data: any) {
    return this.api.put('/users/' + id, data);
  }

  deleteUser(id: string) {
    return this.api.delete('/users/' + id);
  }

  // Settings
  getSettings() {
    return this.api.get('/settings');
  }

  updateSettings(data: any) {
    return this.api.put('/settings', data);
  }

  getAcademicYears() {
    return this.api.get('/settings/academic-years');
  }

  createAcademicYear(data: any) {
    return this.api.post('/settings/academic-years', data);
  }
}

export default new ApiService();
