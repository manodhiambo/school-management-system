export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface Student extends User {
  grade?: string;
  parentEmail?: string;
}

export interface Teacher extends User {
  subjects?: string[];
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
}

export interface CreateAttendanceDto {
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface StudentFilters {
  search?: string;
  grade?: string;
  page?: number;
  limit?: number;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  fileName: string;
  fileUrl: string;
}
