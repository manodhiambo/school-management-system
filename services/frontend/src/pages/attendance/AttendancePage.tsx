import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, XCircle, Clock, Download, Bell } from 'lucide-react';
import { MarkAttendanceModal } from '@/components/modals/MarkAttendanceModal';
import api from '@/services/api';

export function AttendancePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMarkModal, setShowMarkModal] = useState(false);

  useEffect(() => {
    loadAttendanceStats();
  }, []);

  const loadAttendanceStats = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAttendanceStatistics();
      setStats(response.data || {});
    } catch (error) {
      console.error('Error loading attendance stats:', error);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    alert('Report download functionality coming soon!');
  };

  const handleSendNotifications = () => {
    alert('Notification functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalDays = stats?.total || 0;
  const presentDays = stats?.present || 0;
  const absentDays = stats?.absent || 0;
  const lateDays = stats?.late || 0;
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Attendance Management</h2>
          <p className="text-gray-500">Track and manage student attendance</p>
        </div>
        <Button onClick={() => setShowMarkModal(true)}>
          <Calendar className="mr-2 h-4 w-4" />
          Mark Attendance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Total Records</span>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Present</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Absent</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Late</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lateDays}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {attendancePercentage}%
              </div>
              <p className="text-gray-500 mt-2">Overall attendance rate</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${attendancePercentage}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline" onClick={() => setShowMarkModal(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Mark Today's Attendance
            </Button>
            <Button className="w-full" variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Monthly Report
            </Button>
            <Button className="w-full" variant="outline" onClick={handleSendNotifications}>
              <Bell className="mr-2 h-4 w-4" />
              Send Absence Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      <MarkAttendanceModal
        open={showMarkModal}
        onOpenChange={setShowMarkModal}
        onSuccess={loadAttendanceStats}
      />
    </div>
  );
}
