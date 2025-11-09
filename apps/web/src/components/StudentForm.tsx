import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@school/api-client';
import { Button, Input, Modal } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

const studentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  category: z.enum(['general', 'obc', 'sc', 'st', 'other']).optional(),
  aadharNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().min(1, 'Section is required'),
  parentId: z.string().min(1, 'Parent is required'),
  joiningDate: z.string().optional(),
  admissionDate: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyContact: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StudentForm({ initialData, onSuccess, onCancel }: StudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      admissionNumber: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male',
      classId: '',
      sectionId: '',
      parentId: '',
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsSubmitting(true);
      if (initialData) {
        await apiClient.updateStudent(initialData.id, data);
        addToast('success', 'Student updated successfully');
      } else {
        await apiClient.createStudent(data);
        addToast('success', 'Student created successfully');
      }
      onSuccess();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to save student');
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
          <Input
            label="Admission Number *"
            {...register('admissionNumber')}
            error={errors.admissionNumber?.message}
          />
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
            label="Date of Birth *"
            type="date"
            {...register('dateOfBirth')}
            error={errors.dateOfBirth?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
            )}
          </div>
          <Input
            label="Blood Group"
            {...register('bloodGroup')}
            error={errors.bloodGroup?.message}
          />
        </div>

        {/* Academic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Academic Information</h3>
          <Input
            label="Roll Number"
            {...register('rollNumber')}
            error={errors.rollNumber?.message}
          />
          <Input
            label="Class ID *"
            {...register('classId')}
            error={errors.classId?.message}
          />
          <Input
            label="Section ID *"
            {...register('sectionId')}
            error={errors.sectionId?.message}
          />
          <Input
            label="Parent ID *"
            {...register('parentId')}
            error={errors.parentId?.message}
          />
          <Input
            label="Joining Date"
            type="date"
            {...register('joiningDate')}
            error={errors.joiningDate?.message}
          />
          <Input
            label="Admission Date"
            type="date"
            {...register('admissionDate')}
            error={errors.admissionDate?.message}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Information</h3>
          <Input
            label="Aadhar Number"
            {...register('aadharNumber')}
            error={errors.aadharNumber?.message}
          />
          <Input
            label="Religion"
            {...register('religion')}
            error={errors.religion?.message}
          />
          <Input
            label="Caste"
            {...register('caste')}
            error={errors.caste?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="general">General</option>
              <option value="obc">OBC</option>
              <option value="sc">SC</option>
              <option value="st">ST</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Medical & Emergency */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Medical & Emergency</h3>
          <Input
            label="Medical Notes"
            {...register('medicalNotes')}
            error={errors.medicalNotes?.message}
          />
          <Input
            label="Emergency Contact (JSON)"
            {...register('emergencyContact')}
            error={errors.emergencyContact?.message}
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
