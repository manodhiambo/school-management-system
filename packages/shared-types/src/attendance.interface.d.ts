export interface Attendance {
    id: string;
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    checkInTime?: string;
    markedBy: string;
}
export interface CreateAttendanceDto {
    studentId: string;
    date: string;
    status: Attendance['status'];
    checkInTime?: string;
}
//# sourceMappingURL=attendance.interface.d.ts.map