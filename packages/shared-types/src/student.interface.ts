export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  category?: 'general' | 'obc' | 'sc' | 'st' | 'other';
  aadharNumber?: string;
  rollNumber?: string;
  classId: string;
  sectionId?: string;
  parentId: string;
  joiningDate?: string;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred';
  isNewAdmission: boolean;
  medicalNotes?: string;
  emergencyContact?: Record<string, any>;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFilters {
  classId?: string;
  sectionId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
