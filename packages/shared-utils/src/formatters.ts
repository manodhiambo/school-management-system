// Data formatters for display
export const formatters = {
  studentName: (firstName: string, lastName: string): string => {
    return `${lastName.toUpperCase()}, ${firstName}`;
  },

  className: (numericValue: number, section: string): string => {
    return `Class ${numericValue} - Section ${section}`;
  },

  attendanceStatus: (status: string): { label: string; color: string } => {
    const map = {
      present: { label: 'Present', color: 'green' },
      absent: { label: 'Absent', color: 'red' },
      late: { label: 'Late', color: 'orange' },
      half_day: { label: 'Half Day', color: 'yellow' },
      holiday: { label: 'Holiday', color: 'blue' }
    };
    return map[status as keyof typeof map] || { label: status, color: 'gray' };
  }
};
