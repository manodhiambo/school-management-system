import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyChildrenPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadChildren();
    }
  }, [user]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getParent(user?.id);
      console.log('My children:', response);
      setChildren(response.children || response.data?.children || []);
    } catch (error: any) {
      console.error('Error loading children:', error);
      setError(error?.message || 'Failed to load children information');
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
            <CardTitle className="text-red-600">Error Loading Children</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadChildren} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Children</h2>
        <p className="text-gray-500">View your children's information and progress</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {children.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No children linked to your account</p>
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <Card key={child.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{child.first_name} {child.last_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-gray-600">Class</span>
                      </div>
                      <p className="font-semibold text-blue-900">{child.class_name || 'N/A'}</p>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-600">Attendance</span>
                      </div>
                      <p className="font-semibold text-green-900">{child.attendance_percentage || 0}%</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-gray-600">Average Grade</span>
                      </div>
                      <p className="font-semibold text-purple-900">{child.average_grade || 'N/A'}</p>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <DollarSign className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-gray-600">Pending Fees</span>
                      </div>
                      <p className="font-semibold text-orange-900">
                        KES {parseFloat(child.pending_fees || '0').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <Button variant="outline" className="w-full" size="sm">
                      View Full Report
                    </Button>
                    <Button className="w-full" size="sm">
                      Contact Class Teacher
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
