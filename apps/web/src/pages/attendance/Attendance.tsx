import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, DataTable } from '@school/shared-ui';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@school/shared-ui';
import { format } from 'date-fns';

interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  checkInTime?: string;
  reason?: string;
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('CLASS001');
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: classData } = useQuery(['classes'], () => apiClient.getClasses());
  const { data: students, isLoading } = useQuery(
    ['students', selectedClass],
    () => apiClient.getStudents({ classId: selectedClass, page: 1, limit: 50 })
  );
  const { data: existingAttendance } = useQuery(
    ['attendance', selectedClass, selectedDate],
    () => apiClient.getClassAttendance(selectedClass, selectedDate)
  );

  useEffect(() => {
    if (existingAttendance?.data) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      existingAttendance.data.forEach((record: any) => {
        attendanceMap[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          checkInTime: record.checkInTime,
          reason: record.reason,
        };
      });
      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance]);

  const markAttendanceMutation = useMutation(
    (data: any) => apiClient.markAttendance(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['attendance', selectedClass, selectedDate]);
        addToast('success', 'Attendance marked successfully');
      },
      onError: () => {
        addToast('error', 'Failed to mark attendance');
      },
    }
  );

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        studentId,
        status,
        checkInTime: status === 'present' ? new Date().toTimeString().split(' ')[0] : undefined,
      },
    }));
  };

  const handleSubmit = () => {
    const attendanceList = Object.values(attendanceData);
    markAttendanceMutation.mutate({
      classId: selectedClass,
      date: selectedDate,
      attendance: attendanceList,
    });
  };

  const columns = [
    {
      key: 'rollNumber',
      title: 'Roll No',
    },
    {
      key: 'name',
      title: 'Name',
      render: (_: any, record: any) => `${record.firstName} ${record.lastName}`,
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, record: any) => {
        const currentStatus = attendanceData[record.id]?.status || 'absent';
        return (
          <div className="flex gap-1">
            <button
              onClick={() => handleStatusChange(record.id, 'present')}
              className={`p-2 rounded ${currentStatus === 'present' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}
            >
              <CheckCircle size={16} />
            </button>
            <button
              onClick={() => handleStatusChange(record.id, 'absent')}
              className={`p-2 rounded ${currentStatus === 'absent' ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}
            >
              <XCircle size={16} />
            </button>
            <button
              onClick={() => handleStatusChange(record.id, 'late')}
              className={`p-2 rounded ${currentStatus === 'late' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100'}`}
            >
              <Clock size={16} />
            </button>
          </div>
        );
      },
    },
    {
      key: 'checkInTime',
      title: 'Check In',
      render: (_: any, record: any) => attendanceData[record.id]?.checkInTime || 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mark Attendance</h1>

      {/* Class and Date Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {classData?.data?.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSubmit} disabled={markAttendanceMutation.isLoading}>
                {markAttendanceMutation.isLoading ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Class: {selectedClass} | Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={students?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-green-600">
                {Object.values(attendanceData).filter((a) => a.status === 'present').length}
              </div>
              <div className="text-sm text-gray-500">Present</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="mx-auto text-red-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-red-600">
                {Object.values(attendanceData).filter((a) => a.status === 'absent').length}
              </div>
              <div className="text-sm text-gray-500">Absent</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="mx-auto text-yellow-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(attendanceData).filter((a) => a.status === 'late').length}
              </div>
              <div className="text-sm text-gray-500">Late</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="mx-auto text-blue-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-blue-600">
                {students?.data?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Total Students</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
