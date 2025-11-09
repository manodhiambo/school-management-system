import type { User } from '@sms/shared-types';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUser = (user: Partial<User>): string[] => {
  const errors: string[] = [];
  
  if (!user.email || !validateEmail(user.email)) {
    errors.push('Valid email is required');
  }
  
  if (!user.name || user.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!user.role || !['admin', 'teacher', 'student'].includes(user.role)) {
    errors.push('Valid role is required');
  }
  
  return errors;
};
