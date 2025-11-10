export interface User {
    id: string;
    email: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    mfaEnabled: boolean;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
export interface StudentUser extends User {
    role: 'student';
    admissionNumber: string;
    classId: string;
    sectionId?: string;
    rollNumber?: string;
}
export interface TeacherUser extends User {
    role: 'teacher';
    employeeId: string;
    departmentId: string;
}
export interface ParentUser extends User {
    role: 'parent';
    relationship: 'father' | 'mother' | 'guardian' | 'other';
    phonePrimary: string;
}
//# sourceMappingURL=user.interface.d.ts.map