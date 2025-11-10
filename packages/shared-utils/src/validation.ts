// packages/shared-utils/src/validation.ts
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Invalid email format');

// Role-specific validation helpers
export const getRegisterSchema = (role: string) => {
  const baseSchema = {
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  };

  switch (role) {
    case 'student':
      return z.object({
        ...baseSchema,
        admissionNumber: z.string().min(1, 'Admission number is required'),
        classId: z.string().min(1, 'Class is required'),
        dateOfBirth: z.string().min(1, 'Date of birth is required'),
      });
    case 'teacher':
      return z.object({
        ...baseSchema,
        employeeId: z.string().min(1, 'Employee ID is required'),
        departmentId: z.string().min(1, 'Department is required'),
      });
    case 'parent':
      return z.object({
        ...baseSchema,
        relationship: z.enum(['father', 'mother', 'guardian']),
        phonePrimary: z.string().min(10, 'Valid phone number required'),
      });
    default:
      return z.object(baseSchema);
  }
};
