import { User } from '@school/shared-types';

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateUser = (user: Partial<User>): boolean => {
  if (!user.email || !validateEmail(user.email)) return false;
  if (!user.firstName || !user.lastName) return false;
  return true;
};

export const generateAdmissionNumber = (year: number, sequence: number): string => {
  return `ADM${year}${sequence.toString().padStart(4, '0')}`;
};
