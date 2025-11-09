export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile extends User {
  phone?: string;
  address?: string;
  profilePhotoUrl?: string;
}
