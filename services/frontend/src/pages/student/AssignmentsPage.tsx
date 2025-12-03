import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, AlertCircle, Upload } from 'lucide-react';
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
  }, [user?.id]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response: any;
      if (user?.role === 'teacher') {
        response = await api.getTeacherAssignments(user.id);
      } else if (user?.role === 'student') {
        response = await api.getStudentAssignments(user.id);
      } else {
        response = await api.getAssignments();
      }
      
      console.log('Assignments response:', response);
      const data = response?.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setError(error?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignmentId: string) => {
    try {
      const submissionText = prompt('Enter your submission text (or leave blank for file upload):');
      if (submissionText !== null) {
        await api.submitAssignment(assignmentId, { submissionText });
        alert('Assignment submitted successfully!');
        loadAssignments();
      }
    } catch (error: any) {
      alert(error?.message || 'Failed to submit assignment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'graded':
        return <CheckCircle className="h-4 w-4" />;
      case 'late':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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
        <p className="text-gray-500">
          {user?.role === 'teacher' 
            ? 'Manage and grade student assignments' 
            : 'View and submit your assignments'}
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No assignments found</p>
              <p className="text-sm text-gray-400 mt-2">
                {user?.role === 'teacher' 
                  ? 'Create your first assignment to get started.' 
                  : 'Your assignments will appear here when available.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((assignment) => {
            const status = assignment.submission_status || assignment.status || 'pending';
            const overdue = isOverdue(assignment.due_date) && status === 'pending';
            
            return (
              <Card key={assignment.id} className={overdue ? 'border-red-200' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {assignment.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {assignment.subject_name || assignment.subject || 'Subject'}
                        {assignment.class_name && ` • ${assignment.class_name}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                      {status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-3">
                    {assignment.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                        Due: {formatDate(assignment.due_date)}
                      </span>
                      {overdue && <span className="text-red-600 ml-2">(Overdue)</span>}
                    </div>
                    
                    {assignment.score !== null && assignment.score !== undefined && (
                      <div className="text-sm font-medium text-green-600">
                        Score: {assignment.score}/{assignment.max_score || 100}
                      </div>
                    )}
                  </div>

                  {user?.role === 'student' && status === 'pending' && (
                    <Button 
                      className="w-full mt-4" 
                      size="sm"
                      onClick={() => handleSubmit(assignment.id)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Assignment
                    </Button>
                  )}

                  {user?.role === 'teacher' && (
                    <div className="mt-4 text-sm text-gray-500">
                      {assignment.submission_count !== undefined && (
                        <span>
                          {assignment.submission_count} / {assignment.total_students || '?'} submissions
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
