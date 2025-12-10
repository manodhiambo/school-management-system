import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, GraduationCap, DollarSign, Calendar, TrendingUp, TrendingDown, 
  UserPlus, CreditCard, BookOpen, Bell, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, AlertTriangle, Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response: any = await api.getDashboardStats();
      setStats(response.data || response);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const attendanceRate = stats?.attendance?.total > 0
    ? Math.round((stats?.attendance?.present / stats?.attendance?.total) * 100)
    : 0;

  const collectionRate = stats?.fees?.total_amount > 0
    ? Math.round((stats?.fees?.total_collected / stats?.fees?.total_amount) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Admin!</h1>
            <p className="text-blue-100 mt-1">Here's what's happening at your school today.</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2">
            <Calendar className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.students?.total || 0}</h3>
                <div className="flex items-center mt-2 text-sm">
                  <span className="flex items-center text-green-600">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    {stats?.students?.active || 0} active
                  </span>
                </div>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Users className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.teachers?.total || 0}</h3>
                <div className="flex items-center mt-2 text-sm">
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {stats?.teachers?.active || 0} active
                  </span>
                </div>
              </div>
              <div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fee Collected</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats?.fees?.total_collected || 0)}
                </h3>
                <div className="flex items-center mt-2 text-sm">
                  <span className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {collectionRate}% collected
                  </span>
                </div>
              </div>
              <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Attendance</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{attendanceRate}%</h3>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <span>{stats?.attendance?.present || 0} present</span>
                </div>
              </div>
              <div className="h-14 w-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Activity className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fee Overview */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Fee Collection Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Collection Progress</span>
                  <span className="font-semibold text-green-600">{collectionRate}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Expected</p>
                  <p className="text-xl font-bold text-blue-700 mt-1">
                    {formatCurrency(stats?.fees?.total_amount || 0)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Collected</p>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatCurrency(stats?.fees?.total_collected || 0)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
                  <p className="text-xl font-bold text-red-700 mt-1">
                    {formatCurrency(stats?.fees?.total_pending || 0)}
                  </p>
                </div>
              </div>

              {/* Pending Invoices Alert */}
              {(stats?.fees?.pending_count || 0) > 0 && (
                <div className="flex items-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mr-3" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {stats?.fees?.pending_count} pending invoices
                    </p>
                    <p className="text-sm text-amber-600">Requires attention</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-orange-600" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Circular Progress */}
              <div className="flex justify-center py-4">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${attendanceRate * 3.52} 352`}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{attendanceRate}%</span>
                    <span className="text-xs text-gray-500">Present</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-700">{stats?.attendance?.present || 0}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-700">{stats?.attendance?.absent || 0}</p>
                  <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-yellow-700">{stats?.attendance?.late || 0}</p>
                  <p className="text-xs text-gray-500">Late</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Stats Cards */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">School Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-indigo-50 rounded-xl">
                <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{stats?.classes?.total || 0}</p>
                  <p className="text-sm text-gray-500">Classes</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-teal-50 rounded-xl">
                <div className="h-12 w-12 bg-teal-100 rounded-xl flex items-center justify-center mr-4">
                  <UserPlus className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-700">{stats?.parents?.total || 0}</p>
                  <p className="text-sm text-gray-500">Parents</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-pink-50 rounded-xl">
                <div className="h-12 w-12 bg-pink-100 rounded-xl flex items-center justify-center mr-4">
                  <CreditCard className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-700">{stats?.fees?.pending_count || 0}</p>
                  <p className="text-sm text-gray-500">Pending Invoices</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-amber-50 rounded-xl">
                <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
                  <Bell className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{stats?.notifications || 0}</p>
                  <p className="text-sm text-gray-500">Notifications</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.recentPayments || []).slice(0, 4).map((payment: any, index: number) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {payment.first_name} {payment.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Paid {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {(stats?.recentAdmissions || []).slice(0, 2).map((student: any, index: number) => (
                <div key={`adm-${index}`} className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      New admission - {student.admission_number}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(student.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {(!stats?.recentPayments?.length && !stats?.recentAdmissions?.length) && (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
