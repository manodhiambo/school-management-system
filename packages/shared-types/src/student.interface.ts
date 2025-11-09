export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  sectionId: string;
  parentId: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred';
  medicalNotes?: string;
  profilePhotoUrl?: string;
  createdAt: string;
}

export interface StudentFilters {
  classId?: string;
  sectionId?: string;
  status?: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  documentType: 'birth_certificate' | 'transfer_certificate' | 'medical' | 'address_proof' | 'photo' | 'other';
  fileUrl: string;
  fileName: string;
}
