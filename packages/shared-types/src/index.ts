// Base types
export type { User, StudentUser, TeacherUser, ParentUser } from './user.interface';
export type { ApiResponse } from './api-response.interface';

// Auth types
export type {
  AuthTokens,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthResponse, // Add this
} from './auth.interface';

// Student types
export type { Student, StudentFilters, PaginatedResponse } from './student.interface';

// Attendance types
export type { Attendance, CreateAttendanceDto } from './attendance.interface';

// Teacher types
export type { Teacher } from './teacher.interface';

// Fee types
export type { FeeStructure, FeeInvoice, FeePayment } from './fee.interface';
// Message types
export type { Message, MessageStatus, MessageType } from './message.interface';
