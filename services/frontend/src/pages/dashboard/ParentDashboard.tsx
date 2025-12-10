import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, Calendar, Clock, CheckCircle, Award,
  Bell, ArrowRight, DollarSign, AlertCircle, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function ParentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [children, setChildren] = useState<any[]>([]);
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
      
      // Get parent info and linked children
      const parentRes: any = await api.getParentByUser(user?.id || '').catch(() => null);
      
      if (parentRes?.data) {
        // Get children's info
        const childrenData = parentRes.data.children || [];
        setChildren(childrenData);

        // Get fee info for first child (or aggregate)
        if (childrenData.length > 0) {
          const feesRes: any = await api.getStudentFeeAccount(childrenData[0].id).catch(() => ({ data: {} }));
          setFees(feesRes?.data || {});
        }
      }
    } catch (error) {
      console.error('Error loading parent dashboard:', error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalBalance = parseFloat(fees?.pending || '0');

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Parent!</h1>
            <p className="text-teal-100 mt-1">Stay connected with your child's education.</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 bg-white/20 rounded-lg px-4 py-2">
            <Calendar className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">My Children</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{children.length}</h3>
              </div>
              <div className="h-14 w-14 bg-teal-100 rounded-2xl flex items-center justify-center">
                <Users className="h-7 w-7 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg bg-gradient-to-br ${totalBalance > 0 ? 'from-red-50' : 'from-green-50'} to-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fee Balance</p>
                <h3 className={`text-xl font-bold mt-1 ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalBalance)}
                </h3>
              </div>
              <div className={`h-14 w-14 ${totalBalance > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-2xl flex items-center justify-center`}>
                <DollarSign className={`h-7 w-7 ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Notifications</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">0</h3>
              </div>
              <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Bell className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Upcoming Events</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">0</h3>
              </div>
              <div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children Cards */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2 text-teal-600" />
            My Children
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {children.map((child, index) => (
                <div key={index} className="p-6 bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-2xl font-bold text-teal-600">
                          {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{child.first_name} {child.last_name}</h3>
                        <p className="text-sm text-gray-500">{child.admission_number || 'Student'}</p>
                        <p className="text-sm text-gray-500">{child.class_name || 'Class not assigned'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Attendance</p>
                      <p className="font-semibold">--</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <Award className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Grade</p>
                      <p className="font-semibold">--</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Rank</p>
                      <p className="font-semibold">--</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No children linked</p>
              <p className="text-sm">Contact the school to link your children to your account.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-teal-50 hover:border-teal-300"
              onClick={() => navigate('/app/my-children')}
            >
              <Users className="h-8 w-8 mb-2 text-teal-600" />
              <span>View Children</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/app/my-fees')}
            >
              <DollarSign className="h-8 w-8 mb-2 text-green-600" />
              <span>Pay Fees</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/app/communication')}
            >
              <Bell className="h-8 w-8 mb-2 text-blue-600" />
              <span>Messages</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/app/profile')}
            >
              <Award className="h-8 w-8 mb-2 text-purple-600" />
              <span>My Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
