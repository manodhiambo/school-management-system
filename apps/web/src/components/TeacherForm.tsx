import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@school/api-client';
import { Button, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfJoining: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  salaryGrade: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  panNumber: z.string().optional(),
  isClassTeacher: z.boolean().default(false),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'resigned']).default('active'),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TeacherForm({ initialData, onSuccess, onCancel }: TeacherFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '',
      gender: 'male',
      status: 'active',
      isClassTeacher: false,
    },
  });

  const onSubmit = async (data: TeacherFormData) => {
    try {
      setIsSubmitting(true);
      if (initialData) {
        await apiClient.request({
          url: `/api/v1/teachers/${initialData.id}`,
          method: 'PUT',
          data,
        });
        addToast('success', 'Teacher updated successfully');
      } else {
        await apiClient.request({
          url: '/api/v1/teachers',
          method: 'POST',
          data,
        });
        addToast('success', 'Teacher created successfully');
      }
      onSuccess();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to save teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name *"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Employee ID *"
            {...register('employeeId')}
            error={errors.employeeId?.message}
          />
          <Input
            label="Date of Birth"
            type="date"
            {...register('dateOfBirth')}
            error={errors.dateOfBirth?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Professional Information</h3>
          <Input
            label="Date of Joining"
            type="date"
            {...register('dateOfJoining')}
            error={errors.dateOfJoining?.message}
          />
          <Input
            label="Qualification"
            {...register('qualification')}
            error={errors.qualification?.message}
          />
          <Input
            label="Specialization"
            {...register('specialization')}
            error={errors.specialization?.message}
          />
          <Input
            label="Experience (Years)"
            type="number"
            {...register('experienceYears')}
            error={errors.experienceYears?.message}
          />
          <Input
            label="Department ID"
            {...register('departmentId')}
            error={errors.departmentId?.message}
          />
          <Input
            label="Designation"
            {...register('designation')}
            error={errors.designation?.message}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Bank Details</h3>
          <Input
            label="Account Number"
            {...register('accountNumber')}
            error={errors.accountNumber?.message}
          />
          <Input
            label="IFSC Code"
            {...register('ifscCode')}
            error={errors.ifscCode?.message}
          />
          <Input
            label="PAN Number"
            {...register('panNumber')}
            error={errors.panNumber?.message}
          />
        </div>

        {/* Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Class Assignment</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('isClassTeacher')}
              className="rounded"
            />
            <label className="text-sm">Is Class Teacher</label>
          </div>
          <Input
            label="Class ID"
            {...register('classId')}
            error={errors.classId?.message}
          />
          <Input
            label="Section ID"
            {...register('sectionId')}
            error={errors.sectionId?.message}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
