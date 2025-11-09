// Authentication
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  mfaEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Student Management
export interface Student {
  id: string;
  userId?: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  category?: 'general' | 'obc' | 'sc' | 'st' | 'other';
  aadharNumber?: string;
  rollNumber?: string;
  classId: string;
  sectionId: string;
  parentId: string;
  joiningDate?: string;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred';
  isNewAdmission: boolean;
  medicalNotes?: string;
  emergencyContact?: any;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  occupation?: string;
  annualIncome?: number;
  education?: string;
  address?: string;
  city?: string;
  pincode?: string;
  phonePrimary: string;
  phoneSecondary?: string;
  profilePhotoUrl?: string;
  createdAt: string;
}

// Teacher Management
export interface Teacher {
  id: string;
  userId?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfJoining?: string;
  qualification?: string;
  specialization?: string;
  experienceYears?: number;
  departmentId?: string;
  designation?: string;
  salaryGrade?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  profilePhotoUrl?: string;
  isClassTeacher: boolean;
  classId?: string;
  sectionId?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'resigned';
  createdAt: string;
}

// Attendance
export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday';
  checkInTime?: string;
  checkOutTime?: string;
  markedBy?: string;
  reason?: string;
  isExcused: boolean;
  createdAt: string;
}

// Academic Management
export interface Class {
  id: string;
  name: string;
  numericValue: number;
  section: string;
  classTeacherId?: string;
  maxStudents: number;
  roomNumber?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category: 'core' | 'elective' | 'co_curricular';
  isActive: boolean;
  createdAt: string;
}

export interface Exam {
  id: string;
  name: string;
  type: 'unit_test' | 'term' | 'half_yearly' | 'final' | 'practical';
  session: string;
  classId: string;
  startDate: string;
  endDate: string;
  maxMarks?: number;
  passingMarks?: number;
  weightage?: number;
  isResultsPublished: boolean;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained?: number;
  grade?: string;
  remarks?: string;
  teacherId?: string;
  createdAt: string;
}

// Fee Management
export interface FeeStructure {
  id: string;
  classId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  dueDay: number;
  lateFeeAmount: number;
  lateFeePerDay: number;
  isActive: boolean;
  createdAt: string;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  invoiceNumber: string;
  month: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  createdAt: string;
}

// Timetable
export interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  periodId: string;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  roomNumber?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, any>;
}
