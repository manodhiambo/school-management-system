export interface Teacher {
  id: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfJoining?: string;
  qualification?: string;
  specialization?: string;
  experienceYears?: number;
  departmentId: string;
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
  updatedAt: string;
}
