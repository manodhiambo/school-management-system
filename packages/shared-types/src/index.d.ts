export interface User {
    id: string;
    email: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
    mfa_enabled?: boolean;
    is_active: boolean;
    created_at: string;
}
export interface LoginRequest {
    email: string;
    password: string;
    role: User['role'];
}
export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}
export interface Student {
    id: string;
    admission_number: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    blood_group?: string;
    religion?: string;
    caste?: string;
    category?: string;
    aadhar_number?: string;
    roll_number?: string;
    class_id: string;
    section_id: string;
    parent_id: string;
    status: 'active' | 'inactive' | 'suspended' | 'transferred';
    is_new_admission: boolean;
    medical_notes?: string;
    emergency_contact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    profile_photo_url?: string;
    created_at: string;
    updated_at: string;
}
export interface StudentDocument {
    id: string;
    student_id: string;
    document_type: 'birth_certificate' | 'transfer_certificate' | 'medical' | 'address_proof' | 'photo' | 'other';
    file_url: string;
    file_name: string;
    file_size: number;
    uploaded_by: string;
    created_at: string;
}
export interface Teacher {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    date_of_joining?: string;
    qualification?: string;
    specialization?: string;
    experience_years?: number;
    department_id?: string;
    designation?: string;
    salary_grade?: string;
    status: 'active' | 'inactive' | 'on_leave' | 'resigned';
    profile_photo_url?: string;
    created_at: string;
}
export interface Parent {
    id: string;
    first_name: string;
    last_name: string;
    relationship: 'father' | 'mother' | 'guardian' | 'other';
    occupation?: string;
    phone_primary: string;
    phone_secondary?: string;
    address?: string;
    email: string;
    created_at: string;
}
export interface Subject {
    id: string;
    name: string;
    code: string;
    description?: string;
    category: 'core' | 'elective' | 'co_curricular';
    is_active: boolean;
    created_at: string;
}
export interface Class {
    id: string;
    name: string;
    numeric_value: number;
    section: string;
    class_teacher_id?: string;
    max_students: number;
    room_number?: string;
    created_at: string;
}
export interface Exam {
    id: string;
    name: string;
    type: 'unit_test' | 'term' | 'half_yearly' | 'final' | 'practical';
    session: string;
    class_id: string;
    start_date: string;
    end_date: string;
    max_marks?: number;
    passing_marks?: number;
    weightage?: number;
    is_results_published: boolean;
    created_at: string;
}
export interface ExamResult {
    id: string;
    exam_id: string;
    student_id: string;
    subject_id: string;
    marks_obtained: number;
    grade?: string;
    remarks?: string;
    teacher_id: string;
    created_at: string;
}
export interface Attendance {
    id: string;
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday';
    check_in_time?: string;
    check_out_time?: string;
    marked_by: string;
    reason?: string;
    is_excused: boolean;
    created_at: string;
}
export interface FeeStructure {
    id: string;
    class_id: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
    due_day: number;
    late_fee_amount: number;
    late_fee_per_day: number;
    is_active: boolean;
}
export interface FeeInvoice {
    id: string;
    student_id: string;
    invoice_number: string;
    month: string;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    net_amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'partial' | 'overdue';
    created_at: string;
}
export interface Period {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    is_break: boolean;
}
export interface TimetableEntry {
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    period_id: string;
    day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    room_number?: string;
}
export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    subject: string;
    body: string;
    is_read: boolean;
    created_at: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: PaginatedResponse<T>['meta'];
}
export interface StudentFilters {
    classId?: string;
    sectionId?: string;
    status?: Student['status'];
    session?: string;
    page?: number;
    limit?: number;
}
export interface DateRangeFilter {
    startDate: string;
    endDate: string;
}
//# sourceMappingURL=index.d.ts.map