import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, AlertCircle, Upload, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function AssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create assignment form state (teacher only)
  const [showCreate, setShowCreate] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    maxScore: '100',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
      if (user.role === 'teacher') {
        loadClassesAndSubjects();
      }
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

      const data = response?.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setError(error?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadClassesAndSubjects = async () => {
    try {
      const [classRes, subjectRes]: any[] = await Promise.all([
        api.getTeacherClasses(user?.id || ''),
        api.getSubjects(),
      ]);
      setClasses(classRes?.data || []);
      setSubjects(subjectRes?.data || subjectRes?.subjects || []);
    } catch {
      /* non-critical — form still usable */
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) { setCreateError('Title is required.'); return; }
    if (!formData.classId) { setCreateError('Please select a class.'); return; }
    if (!formData.dueDate) { setCreateError('Due date is required.'); return; }

    setCreating(true);
    setCreateError('');
    try {
      await api.createAssignment({
        title: formData.title,
        description: formData.description,
        classId: formData.classId,
        subjectId: formData.subjectId || undefined,
        dueDate: formData.dueDate,
        maxScore: Number(formData.maxScore) || 100,
      });
      setShowCreate(false);
      setFormData({ title: '', description: '', classId: '', subjectId: '', dueDate: '', maxScore: '100' });
      loadAssignments();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
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
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'graded': return <CheckCircle className="h-4 w-4" />;
      case 'late': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Assignments</h2>
          <p className="text-gray-500">
            {user?.role === 'teacher'
              ? 'Manage and grade student assignments'
              : 'View and submit your assignments'}
          </p>
        </div>
        {user?.role === 'teacher' && (
          <Button onClick={() => { setShowCreate(true); setCreateError(''); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                New Assignment
              </CardTitle>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="Assignment title..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Instructions or description..."
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Class *</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData(p => ({ ...p, classId: e.target.value }))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">-- Select class --</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section || ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData(p => ({ ...p, subjectId: e.target.value }))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">-- Select subject --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Due Date *</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Score</label>
                  <Input
                    type="number"
                    value={formData.maxScore}
                    onChange={e => setFormData(p => ({ ...p, maxScore: e.target.value }))}
                    className="mt-1"
                    min="1"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No assignments found</p>
              <p className="text-sm text-gray-400 mt-2">
                {user?.role === 'teacher'
                  ? 'Click "Create Assignment" to add one.'
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

                  {user?.role === 'teacher' && assignment.submission_count !== undefined && (
                    <div className="mt-4 text-sm text-gray-500">
                      {assignment.submission_count} / {assignment.total_students || '?'} submissions
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
