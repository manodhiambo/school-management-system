import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function AssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      // Mock data for now - replace with actual API call when available
      setAssignments([
        {
          id: 1,
          title: 'Mathematics - Algebra Assignment',
          subject: 'Mathematics',
          dueDate: '2025-12-01',
          status: 'pending',
          description: 'Complete exercises 1-10 from Chapter 5'
        },
        {
          id: 2,
          title: 'English - Essay Writing',
          subject: 'English',
          dueDate: '2025-11-28',
          status: 'submitted',
          description: 'Write a 500-word essay on environmental conservation'
        }
      ]);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setError(error?.message || 'Failed to load assignments');
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
            <CardTitle className="text-red-600">Error Loading Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadAssignments} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Assignments</h2>
        <p className="text-gray-500">View and submit your assignments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assignments.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No assignments available</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-base">{assignment.title}</span>
                  </div>
                  {assignment.status === 'submitted' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">{assignment.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      assignment.status === 'submitted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {assignment.status}
                    </span>
                    {assignment.status === 'pending' && (
                      <Button size="sm">Submit Assignment</Button>
                    )}
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
