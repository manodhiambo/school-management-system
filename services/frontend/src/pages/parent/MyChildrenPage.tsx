import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, DollarSign } from 'lucide-react';
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
      // Use getParentByUserId instead of getParent
      const response: any = await api.getParentByUserId(user?.id);
      console.log('Parent data:', response);
      const parentData = response.data || response;
      setChildren(parentData.children || []);
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
        <p className="text-gray-500">View your children's information</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No children records found</p>
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <Card key={child.id || child.student_id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{child.first_name} {child.last_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Class
                    </span>
                    <span className="font-medium">{child.class_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Admission No
                    </span>
                    <span className="font-medium">{child.admission_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      Status
                    </span>
                    <span className={`font-medium ${child.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                      {child.status || 'N/A'}
                    </span>
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
