export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
