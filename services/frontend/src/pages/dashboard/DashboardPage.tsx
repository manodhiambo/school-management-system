import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, DollarSign, Calendar, TrendingUp, TrendingDown, UserPlus, CreditCard, BookOpen } from 'lucide-react';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getDashboardStats();
      console.log('Dashboard stats:', response);
      setStats(response.data || response);
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={loadDashboardStats}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get chart data from API response or use empty arrays
  const enrollmentData = stats?.charts?.enrollmentTrend || [];
  const feeCollectionData = stats?.charts?.feeCollectionTrend || [];
  
  // Attendance pie chart data
  const attendanceData = [
    { name: 'Present', value: stats?.attendance?.present || 0 },
    { name: 'Absent', value: stats?.attendance?.absent || 0 },
    { name: 'Late', value: stats?.attendance?.late || 0 },
  ].filter(item => item.value > 0);

  // If no attendance data, show placeholder
  const hasAttendanceData = attendanceData.length > 0 && attendanceData.some(d => d.value > 0);

  // Format recent activities
  const recentActivities = [
    ...(stats?.recentPayments || []).map((p: any) => ({
      action: `Fee payment: KES ${parseFloat(p.amount).toLocaleString()} from ${p.first_name} ${p.last_name}`,
      time: new Date(p.payment_date).toLocaleString(),
      type: 'success'
    })),
    ...(stats?.recentAdmissions || []).map((s: any) => ({
      action: `New admission: ${s.first_name} ${s.last_name} (${s.admission_number})`,
      time: new Date(s.created_at).toLocaleString(),
      type: 'info'
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-gray-500">
          Welcome back{user?.email ? `, ${user.email}` : ''}! Here's an overview of your school.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.students?.total_students || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{stats?.students?.active_students || 0} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.teachers?.total_teachers || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{stats?.teachers?.active_teachers || 0} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {parseFloat(stats?.fees?.total_collected || '0').toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              <span>KES {parseFloat(stats?.fees?.total_pending || '0').toLocaleString()} pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendance?.present || 0}</div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <span>{stats?.attendance?.absent || 0} absent, {stats?.attendance?.late || 0} late</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Student Enrollment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentData.length > 0 ? (
              <LineChart
                data={enrollmentData}
                xKey="month"
                yKey="students"
                color="#8884d8"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No enrollment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Attendance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasAttendanceData ? (
              <PieChart
                data={attendanceData}
                nameKey="name"
                valueKey="value"
                colors={['#00C49F', '#FF8042', '#FFBB28']}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No attendance data for today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Fee Collection Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeCollectionData.length > 0 ? (
              <BarChart
                data={feeCollectionData}
                xKey="month"
                yKey="amount"
                color="#10b981"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No fee collection data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Classes</span>
                <span className="font-bold">{stats?.classes?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Subjects</span>
                <span className="font-bold">{stats?.subjects?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Upcoming Exams</span>
                <span className="font-bold">{stats?.exams?.upcoming || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Pending Fees</span>
                <span className="font-bold text-red-600">
                  KES {parseFloat(stats?.fees?.total_pending || '0').toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Active Parents</span>
                <span className="font-bold">{stats?.parents?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">New Admissions</span>
                <span className="font-bold text-green-600">{stats?.students?.new_admissions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
