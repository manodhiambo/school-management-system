import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, Calendar, Clock, FileText, CheckCircle, Award,
  TrendingUp, Bell, ArrowRight, DollarSign, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [fees, setFees] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, timetableRes, feesRes, attendanceRes]: any = await Promise.all([
        api.getStudentAssignments(user?.id || '').catch(() => ({ data: [] })),
        api.getStudentTimetable(user?.id || '').catch(() => ({ data: [] })),
        api.getStudentFeeAccount(user?.id || '').catch(() => ({ data: {} })),
        api.getStudentAttendance(user?.id || '').catch(() => ({ data: [] }))
      ]);

      setAssignments(assignmentsRes?.data || []);
      setTimetable(timetableRes?.data || []);
      setFees(feesRes?.data || {});

      const attendance = attendanceRes?.data || [];
      const presentCount = attendance.filter((a: any) => a.status === 'present').length;
      const attendanceRate = attendance.length > 0 
        ? Math.round((presentCount / attendance.length) * 100) 
        : 0;

      setStats({
        totalAssignments: (assignmentsRes?.data || []).length,
        pendingAssignments: (assignmentsRes?.data || []).filter((a: any) => 
          !a.submission_status || a.submission_status === 'pending'
        ).length,
        attendanceRate,
        feeBalance: feesRes?.data?.pending || 0
      });
    } catch (error) {
      console.error('Error loading student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTodayClasses = () => {
    const today = new Date().getDay();
    const dayMap: any = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
    return timetable.filter(t => t.day_of_week === dayMap[today])
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const todayClasses = getTodayClasses();
  const upcomingAssignments = assignments
    .filter(a => !a.submission_status || a.submission_status === 'pending')
    .slice(0, 3);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Student!</h1>
            <p className="text-green-100 mt-1">Let's make today a great learning day!</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2">
            <Calendar className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Attendance</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.attendanceRate}%</h3>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Assignments</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingAssignments}</h3>
                <p className="text-xs text-gray-500 mt-1">pending</p>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Classes</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{todayClasses.length}</h3>
              </div>
              <div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg bg-gradient-to-br ${stats.feeBalance > 0 ? 'from-red-50' : 'from-green-50'} to-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fee Balance</p>
                <h3 className={`text-xl font-bold mt-1 ${stats.feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(stats.feeBalance)}
                </h3>
              </div>
              <div className={`h-14 w-14 ${stats.feeBalance > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-2xl flex items-center justify-center`}>
                <DollarSign className={`h-7 w-7 ${stats.feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center">
                <Clock className="h-5 w-5 mr-2 text-green-600" />
                Today's Classes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/my-timetable')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayClasses.length > 0 ? (
              <div className="space-y-3">
                {todayClasses.map((item, index) => (
                  <div key={index} className="flex items-center p-4 bg-green-50 rounded-xl">
                    <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                      <BookOpen className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.subject_name || 'Subject'}</p>
                      <p className="text-sm text-gray-500">{item.teacher_name || 'Teacher'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </p>
                      {item.room && <p className="text-sm text-gray-500">Room {item.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No classes today</p>
                <p className="text-sm">Enjoy your day!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Pending Assignments
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/assignments')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment, index) => {
                  const isOverdue = new Date(assignment.due_date) < new Date();
                  return (
                    <div key={index} className={`flex items-center p-4 rounded-xl ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <div className={`h-10 w-10 ${isOverdue ? 'bg-red-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center mr-3`}>
                        {isOverdue ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-gray-500">{assignment.subject_name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                          {isOverdue ? 'Overdue' : 'Due'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50 text-green-400" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm">No pending assignments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/app/my-attendance')}
            >
              <CheckCircle className="h-8 w-8 mb-2 text-green-600" />
              <span>My Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/app/my-results')}
            >
              <Award className="h-8 w-8 mb-2 text-blue-600" />
              <span>My Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/app/my-fees')}
            >
              <DollarSign className="h-8 w-8 mb-2 text-purple-600" />
              <span>My Fees</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-orange-50 hover:border-orange-300"
              onClick={() => navigate('/app/communication')}
            >
              <Bell className="h-8 w-8 mb-2 text-orange-600" />
              <span>Messages</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
