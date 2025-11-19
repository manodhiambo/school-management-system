export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  isActive: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  classId?: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred' | 'graduated';
  profilePhotoUrl?: string;
}

export interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId?: string;
  status: 'active' | 'inactive' | 'on_leave';
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
