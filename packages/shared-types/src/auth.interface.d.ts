import { User } from './user.interface';
import { ApiResponse } from './api-response.interface';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface LoginRequest {
    email: string;
    password: string;
    role: User['role'];
}
export interface LoginResponse extends ApiResponse<{
    user: User;
    tokens: AuthTokens;
}> {
}
export interface RegisterRequest {
    email: string;
    password: string;
    role: User['role'];
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    employeeId?: string;
    relationship?: string;
}
export interface ForgotPasswordRequest {
    email: string;
    role: User['role'];
}
export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export type AuthResponse<T = any> = ApiResponse<T>;
//# sourceMappingURL=auth.interface.d.ts.map