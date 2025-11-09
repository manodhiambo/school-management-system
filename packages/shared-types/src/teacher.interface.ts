export interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  designation?: string;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: string;
}

export interface TeacherProfile extends Teacher {
  qualifications: string[];
  experienceYears: number;
  specialization?: string;
}
