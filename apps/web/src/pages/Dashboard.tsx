import { useState, useEffect } from 'react';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@school/shared-ui';
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@school/shared-ui';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: string;
  attendanceToday: string;
  pendingFees: string;
  upcomingExams: number;
}

interface RecentActivity {
  id: string;
  type: 'attendance' | 'fee' | 'exam';
  message: string;
  time: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activitiesRes] = await Promise.all([
        apiClient.request({ url: '/api/v1/reports/dashboard-stats', method: 'GET' }),
        apiClient.request({ url: '/api/v1/admin/audit-logs?limit=5', method: 'GET' })
      ]);

      setStats(statsRes.data);
      
      // Transform audit logs to activities
      const transformedActivities: RecentActivity[] = activitiesRes.data.map((log: any) => ({
        id: log.id,
        type: getActivityType(log.action),
        message: formatActivityMessage(log),
        time: new Date(log.createdAt).toLocaleString()
      }));
      
      setActivities(transformedActivities);
    } catch (error) {
      addToast('error', 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (action: string): RecentActivity['type'] => {
    if (action.includes('attendance')) return 'attendance';
    if (action.includes('fee') || action.includes('payment')) return 'fee';
    if (action.includes('exam')) return 'exam';
    return 'attendance';
  };

  const formatActivityMessage = (log: any): string => {
    return `${log.action} - ${log.resource || 'system'}`;
  };

  const getIconForActivity = (type: RecentActivity['type']) => {
    switch (type) {
      case 'attendance':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'fee':
        return <DollarSign className="text-blue-500" size={20} />;
      case 'exam':
        return <BookOpen className="text-purple-500" size={20} />;
    }
  };

  const getIconForStats = (key: string) => {
    switch (key) {
      case 'totalStudents':
        return <Users className="text-blue-500" size={24} />;
      case 'totalTeachers':
        return <BookOpen className="text-green-500" size={24} />;
      case 'totalRevenue':
        return <DollarSign className="text-yellow-500" size={24} />;
      case 'attendanceToday':
        return <Calendar className="text-purple-500" size={24} />;
      case 'pendingFees':
        return <AlertCircle className="text-red-500" size={24} />;
      case 'upcomingExams':
        return <TrendingUp className="text-indigo-500" size={24} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-8">Failed to load dashboard data</div>;
  }

  const statCards = [
    { key: 'totalStudents', label: 'Total Students', value: stats.totalStudents.toLocaleString() },
    { key: 'totalTeachers', label: 'Total Teachers', value: stats.totalTeachers.toLocaleString() },
    { key: 'totalRevenue', label: 'Monthly Revenue', value: `₹${stats.totalRevenue}` },
    { key: 'attendanceToday', label: "Today's Attendance", value: `${stats.attendanceToday}%` },
    { key: 'pendingFees', label: 'Pending Fees', value: `₹${stats.pendingFees}` },
    { key: 'upcomingExams', label: 'Upcoming Exams', value: stats.upcomingExams.toString() },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{card.label}</CardTitle>
              {getIconForStats(card.key)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">↑ 12%</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activities</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    {getIconForActivity(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => window.location.href = '/students/new'}>
                <Users size={16} className="mr-2" />
                Add Student
              </Button>
              <Button onClick={() => window.location.href = '/attendance'} variant="outline">
                <Calendar size={16} className="mr-2" />
                Mark Attendance
              </Button>
              <Button onClick={() => window.location.href = '/fee'} variant="outline">
                <DollarSign size={16} className="mr-2" />
                Collect Fee
              </Button>
              <Button onClick={() => window.location.href = '/communication/compose'}>
                <Bell size={16} className="mr-2" />
                Send Notice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
