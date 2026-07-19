import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, BookOpen, Calendar, Clock, FileText, CheckCircle,
  GraduationCap, Bell, ArrowRight, PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { UserManualCard } from '@/components/UserManualCard';
import { TeacherCheckinWidget } from '@/components/TeacherCheckinWidget';
import { useLanguageStore } from '@/store/languageStore';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t, language } = useLanguageStore();
  const [stats, setStats] = useState<any>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  // Ticks the "now teaching / starting in Nm" banner without a full data reload
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [classesRes, assignmentsRes, timetableRes]: any = await Promise.all([
        api.getTeacherClasses(user?.id || ''),
        api.getTeacherAssignments(user?.id || ''),
        api.getTeacherTimetable(user?.id || '')
      ]);

      setClasses(classesRes?.data || classesRes?.classes || []);
      setTimetable(timetableRes?.data || []);

      // Calculate stats
      const totalStudents = (classesRes?.data || classesRes?.classes || [])
        .reduce((sum: number, c: any) => sum + (Number(c.student_count) || 0), 0);

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
    if (language === 'sw') {
      if (hour < 12) return 'Habari za Asubuhi';
      if (hour < 17) return 'Habari za Mchana';
      return 'Habari za Jioni';
    }
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

  // Builds a today-anchored Date from a "HH:MM:SS" timetable time string.
  const toTodayDate = (time: string, base: Date) => {
    if (!time) return null;
    const [h, m, s] = time.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h || 0, m || 0, s || 0, 0);
    return d;
  };

  // Finds the period happening right now, and the next one coming up today —
  // this is what drives the "Now teaching" / "Starting in Nm" banner.
  const getPeriodStatus = () => {
    const today = getTodayClasses();
    let current: any = null;
    let next: any = null;
    let minutesToNext: number | null = null;

    for (const item of today) {
      const start = toTodayDate(item.start_time, now);
      const end = toTodayDate(item.end_time, now);
      if (!start || !end) continue;

      if (now >= start && now <= end) {
        current = item;
      } else if (start > now && (!next || start < toTodayDate(next.start_time, now)!)) {
        next = item;
        minutesToNext = Math.round((start.getTime() - now.getTime()) / 60000);
      }
    }

    return { current, next, minutesToNext };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  const todayClasses = getTodayClasses();
  const { current: currentPeriod, next: nextPeriod, minutesToNext } = getPeriodStatus();

  return (
    <div className="space-y-8 pb-8">
      {/* Now Teaching / Starting Soon Banner */}
      {currentPeriod && (
        <div className="flex items-center p-4 rounded-2xl bg-green-600 text-white shadow-lg">
          <span className="relative flex h-3 w-3 mr-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <PlayCircle className="h-6 w-6 mr-3" />
          <div className="flex-1">
            <p className="font-semibold">{t('Now teaching')}: {currentPeriod.subject_name || 'Subject'} — {currentPeriod.class_name || 'Class'}</p>
            <p className="text-sm text-green-100">{formatTime(currentPeriod.start_time)} - {formatTime(currentPeriod.end_time)}{currentPeriod.room ? ` · ${t('Room')} ${currentPeriod.room}` : ''}</p>
          </div>
        </div>
      )}
      {!currentPeriod && nextPeriod && minutesToNext !== null && minutesToNext <= 15 && (
        <div className="flex items-center p-4 rounded-2xl bg-amber-500 text-white shadow-lg">
          <Bell className="h-6 w-6 mr-3" />
          <div className="flex-1">
            <p className="font-semibold">
              {t('Starting in')} {minutesToNext} {minutesToNext === 1 ? t('minute') : t('minutes')}: {nextPeriod.subject_name || 'Subject'} — {nextPeriod.class_name || 'Class'}
            </p>
            <p className="text-sm text-amber-100">{formatTime(nextPeriod.start_time)} - {formatTime(nextPeriod.end_time)}{nextPeriod.room ? ` · ${t('Room')} ${nextPeriod.room}` : ''}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || user?.email?.split('@')[0] || 'Teacher'}!</h1>
            <p className="text-purple-100 mt-1">{t('Ready to inspire minds today?')}</p>
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
                <p className="text-sm font-medium text-gray-500">{t('My Classes')}</p>
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
                <p className="text-sm font-medium text-gray-500">{t('Total Students')}</p>
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
                <p className="text-sm font-medium text-gray-500">{t('Assignments')}</p>
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
                <p className="text-sm font-medium text-gray-500">{t("Today's Classes")}</p>
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
                {t("Today's Schedule")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/my-timetable')}>
                {t('View')} <ArrowRight className="h-4 w-4 ml-1" />
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
                      {item.room && <p className="text-sm text-gray-500">{t('Room')} {item.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t('No classes today')}</p>
                <p className="text-sm">{t('Enjoy your day off!')}</p>
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
                {t('My Classes')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/my-classes')}>
                {t('View')} <ArrowRight className="h-4 w-4 ml-1" />
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
                      {Number(classItem.student_count) || 0} {t('Students').toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>{t('No classes assigned yet')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{t('Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/app/attendance')}
            >
              <CheckCircle className="h-8 w-8 mb-2 text-purple-600" />
              <span>{t('Mark Attendance')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/app/gradebook')}
            >
              <FileText className="h-8 w-8 mb-2 text-blue-600" />
              <span>{t('Grade Book')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/app/assignments')}
            >
              <BookOpen className="h-8 w-8 mb-2 text-green-600" />
              <span>{t('Assignments')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center hover:bg-orange-50 hover:border-orange-300"
              onClick={() => navigate('/app/communication')}
            >
              <Bell className="h-8 w-8 mb-2 text-orange-600" />
              <span>{t('Messages')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in */}
      <TeacherCheckinWidget />

      {/* User Manual Download */}
      <UserManualCard />
    </div>
  );
}
