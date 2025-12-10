import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, BookOpen, Calendar, Clock, FileText, CheckCircle,
  GraduationCap, Bell, ArrowRight, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [classesRes, assignmentsRes, timetableRes]: any = await Promise.all([
        api.getTeacherClasses(user?.id || ''),
        api.getTeacherAssignments(user?.id || ''),
        api.getTeacherTimetable(user?.id || '')
      ]);

      setClasses(classesRes?.data || classesRes?.classes || []);
      setAssignments(assignmentsRes?.data || []);
      setTimetable(timetableRes?.data || []);

      // Calculate stats
      const totalStudents = (classesRes?.data || classesRes?.classes || [])
        .reduce((sum: number, c: any) => sum + (c.student_count || 0), 0);

      setStats({
        totalClasses: (classesRes?.data || classesRes?.classes || []).length,
        totalStudents,
        totalAssignments: (assignmentsRes?.data || []).length,
        pendingGrading: (assignmentsRes?.data || []).filter((a: any) => 
          a.submission_count > 0 && a.submission_count > (a.graded_count || 0)
        ).length
      });
    } catch (error) {
      console.error('Error loading teacher dashboard:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const todayClasses = getTodayClasses();

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Teacher!</h1>
            <p className="text-purple-100 mt-1">Ready to inspire minds today?</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2">
            <Calendar className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">My Classes</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalClasses}</h3>
              </div>
              <div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</h3>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Users className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Assignments</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAssignments}</h3>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <FileText className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Classes</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{todayClasses.length}</h3>
              </div>
              <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-orange-600" />
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
                <Clock className="h-5 w-5 mr-2 text-purple-600" />
                Today's Schedule
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
                  <div key={index} className="flex items-center p-4 bg-purple-50 rounded-xl">
                    <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.subject_name || 'Subject'}</p>
                      <p className="text-sm text-gray-500">{item.class_name || 'Class'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-purple-600">
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
                <p className="text-sm">Enjoy your day off!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Classes */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
                My Classes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/my-classes')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {classes.length > 0 ? (
              <div className="space-y-3">
                {classes.slice(0, 4).map((classItem, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{classItem.name} {classItem.section || ''}</p>
                        <p className="text-sm text-gray-500">{classItem.subject_name || 'Subject'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {classItem.student_count || 0} students
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No classes assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/app/attendance')}
            >
              <CheckCircle className="h-8 w-8 mb-2 text-purple-600" />
              <span>Mark Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/app/gradebook')}
            >
              <FileText className="h-8 w-8 mb-2 text-blue-600" />
              <span>Grade Book</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/app/assignments')}
            >
              <BookOpen className="h-8 w-8 mb-2 text-green-600" />
              <span>Assignments</span>
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
