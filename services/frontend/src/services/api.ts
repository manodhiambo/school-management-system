import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

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

  // Auth
  login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  logout() {
    return this.api.post('/auth/logout');
  }

  getCurrentUser() {
    return this.api.get('/auth/me');
  }

  // Dashboard
  getDashboardStats() {
    return this.api.get('/admin/dashboard');
  }

  // Students
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

  // Teachers
  getTeachers(params?: any) {
    return this.api.get('/teachers', { params });
  }

  getTeacher(id: string) {
    return this.api.get(`/teachers/${id}`);
  }

  createTeacher(data: any) {
    return this.api.post('/teachers', data);
  }

  // Attendance
  markAttendance(data: any) {
    return this.api.post('/attendance/mark', data);
  }

  getAttendance(params?: any) {
    return this.api.get('/attendance', { params });
  }

  // Fees
  getFeeStructures(params?: any) {
    return this.api.get('/fee/structure', { params });
  }

  getInvoices(params?: any) {
    return this.api.get('/fee/invoice', { params });
  }

  recordPayment(data: any) {
    return this.api.post('/fee/payment', data);
  }
}

export default new ApiService();
