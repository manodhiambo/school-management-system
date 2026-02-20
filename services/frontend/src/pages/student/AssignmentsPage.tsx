import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText, Clock, CheckCircle, AlertCircle, Upload,
  Plus, X, Users, ChevronRight, Star, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

/* ─────────────────────────────────────────────────────── */

export function AssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create assignment form (teacher only)
  const [showCreate, setShowCreate] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '', description: '', classId: '', subjectId: '', dueDate: '', maxScore: '100',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Grading panel (teacher only)
  const [gradingAssignment, setGradingAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  // Per-submission grade state: { [submissionId]: { score: string, feedback: string } }
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; feedback: string }>>({});
  const [gradingSaving, setGradingSaving] = useState<Record<string, boolean>>({});

  /* ─── Load ─── */
  useEffect(() => {
    if (user?.id) {
      loadAssignments();
      if (user.role === 'teacher') loadClassesAndSubjects();
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load assignments');
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
      setClasses(classRes?.data || classRes?.classes || []);
      setSubjects(subjectRes?.data || subjectRes?.subjects || []);
    } catch { /* non-critical */ }
  };

  /* ─── Create ─── */
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

  /* ─── Student Submit ─── */
  const handleSubmit = async (assignmentId: string) => {
    const submissionText = prompt('Enter your submission text (or leave blank):');
    if (submissionText === null) return; // cancelled
    try {
      await api.submitAssignment(assignmentId, { submissionText });
      alert('Assignment submitted successfully!');
      loadAssignments();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit assignment');
    }
  };

  /* ─── Teacher: open grading panel ─── */
  const handleOpenGrading = async (assignment: any) => {
    setGradingAssignment(assignment);
    setSubmissionsLoading(true);
    setSubmissions([]);
    setGradeInputs({});
    try {
      const res: any = await api.getAssignmentSubmissions(assignment.id);
      const list: any[] = res?.data || res || [];
      setSubmissions(list);
      // Pre-fill grade inputs with existing scores/feedback
      const init: typeof gradeInputs = {};
      for (const sub of list) {
        init[sub.id] = {
          score: sub.score !== null && sub.score !== undefined ? String(sub.score) : '',
          feedback: sub.feedback || '',
        };
      }
      setGradeInputs(init);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleCloseGrading = () => {
    setGradingAssignment(null);
    setSubmissions([]);
    setGradeInputs({});
  };

  /* ─── Teacher: grade a submission ─── */
  const handleGradeSubmission = async (assignmentId: string, submissionId: string) => {
    const input = gradeInputs[submissionId];
    if (!input || input.score === '') {
      alert('Please enter a score before grading.');
      return;
    }
    const scoreNum = parseFloat(input.score);
    if (isNaN(scoreNum) || scoreNum < 0) {
      alert('Please enter a valid score.');
      return;
    }

    setGradingSaving(prev => ({ ...prev, [submissionId]: true }));
    try {
      await api.gradeAssignment(assignmentId, submissionId, {
        score: scoreNum,
        feedback: input.feedback || '',
      });
      // Update the local submission to show "graded"
      setSubmissions(prev =>
        prev.map(s =>
          s.id === submissionId
            ? { ...s, score: scoreNum, feedback: input.feedback, status: 'graded' }
            : s
        )
      );
      // Refresh assignment list in background so counts update
      loadAssignments();
    } catch (err: any) {
      alert(err?.message || 'Failed to grade submission');
    } finally {
      setGradingSaving(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  /* ─── Helpers ─── */
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded':    return 'bg-green-100 text-green-800';
      case 'late':      return 'bg-red-100 text-red-800';
      default:          return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'graded':    return <CheckCircle className="h-4 w-4" />;
      case 'late':      return <AlertCircle className="h-4 w-4" />;
      default:          return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No due date';

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date();

  const calcGrade = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  /* ─── Render ─── */
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
              ? 'Manage, grade, and track student assignments'
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

      {/* ── Create Assignment Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                New Assignment
              </CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
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
                      <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>
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
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1" disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="flex-1">
                  {creating ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Assignment Cards ── */}
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
            const subCount = Number(assignment.submission_count) || 0;
            const totalStudents = Number(assignment.total_students) || 0;
            const ungradedCount = submissions
              .filter(s => s.status === 'submitted')
              .length;

            return (
              <Card key={assignment.id} className={overdue ? 'border-red-200' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{assignment.title}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {assignment.subject_name || 'Subject'}
                        {assignment.class_name && ` • ${assignment.class_name}`}
                      </p>
                    </div>
                    {user?.role !== 'teacher' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {status}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {assignment.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                      Due: {formatDate(assignment.due_date)}
                      {overdue && <span className="ml-1 text-red-500">(Overdue)</span>}
                    </span>
                    <span className="text-gray-500">Max: {assignment.max_score || 100} marks</span>
                  </div>

                  {/* Student view: score + submit */}
                  {user?.role === 'student' && (
                    <>
                      {assignment.score !== null && assignment.score !== undefined && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
                          <Star className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-700">
                            Score: {assignment.score}/{assignment.max_score || 100}
                            {' '}({calcGrade(assignment.score, assignment.max_score || 100)})
                          </span>
                        </div>
                      )}
                      {status === 'pending' && (
                        <Button className="w-full" size="sm" onClick={() => handleSubmit(assignment.id)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Assignment
                        </Button>
                      )}
                      {status === 'submitted' && (
                        <div className="text-xs text-blue-600 text-center py-1">
                          Submitted — awaiting grading
                        </div>
                      )}
                    </>
                  )}

                  {/* Teacher view: submission count + Grade button */}
                  {user?.role === 'teacher' && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>
                          <span className="font-semibold text-gray-900">{subCount}</span>
                          {totalStudents > 0 && `/${totalStudents}`} submitted
                        </span>
                        {subCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            {subCount} to review
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenGrading(assignment)}
                        className="flex items-center gap-1"
                      >
                        Grade Submissions
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Teacher Grading Side Panel ── */}
      {gradingAssignment && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={handleCloseGrading} />

          {/* Panel */}
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Panel header */}
            <div className="flex items-start justify-between p-5 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{gradingAssignment.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {gradingAssignment.class_name} • {gradingAssignment.subject_name} • Max: {gradingAssignment.max_score || 100}
                </p>
              </div>
              <button
                onClick={handleCloseGrading}
                className="text-gray-400 hover:text-gray-600 mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex gap-6 px-5 py-3 border-b text-sm">
              <div>
                <span className="text-gray-500">Total submitted: </span>
                <span className="font-semibold">{submissions.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Graded: </span>
                <span className="font-semibold text-green-600">
                  {submissions.filter(s => s.status === 'graded').length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Pending: </span>
                <span className="font-semibold text-orange-600">
                  {submissions.filter(s => s.status === 'submitted').length}
                </span>
              </div>
            </div>

            {/* Submissions list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {submissionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No submissions yet</p>
                  <p className="text-sm">Students haven't submitted this assignment.</p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const inp = gradeInputs[sub.id] || { score: '', feedback: '' };
                  const scoreNum = inp.score !== '' ? parseFloat(inp.score) : null;
                  const grade = scoreNum !== null && !isNaN(scoreNum)
                    ? calcGrade(scoreNum, gradingAssignment.max_score || 100)
                    : null;
                  const isGraded = sub.status === 'graded';

                  return (
                    <div
                      key={sub.id}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isGraded ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Student info + status */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {sub.first_name} {sub.last_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sub.admission_number && `Adm: ${sub.admission_number} • `}
                            Submitted: {sub.submitted_at
                              ? new Date(sub.submitted_at).toLocaleString()
                              : 'Unknown'}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isGraded ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {isGraded ? `Graded: ${sub.score}/${gradingAssignment.max_score || 100}` : 'Awaiting grade'}
                        </span>
                      </div>

                      {/* Submission text */}
                      {sub.submission_text && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1 font-medium">Student's answer:</p>
                          <p className="whitespace-pre-wrap">{sub.submission_text}</p>
                        </div>
                      )}

                      {/* Previous feedback (if graded) */}
                      {isGraded && sub.feedback && (
                        <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                          <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p className="italic">{sub.feedback}</p>
                        </div>
                      )}

                      {/* Grade input row */}
                      <div className="flex gap-3 items-end pt-1">
                        <div className="w-32">
                          <label className="text-xs font-medium text-gray-600">
                            Score (/{gradingAssignment.max_score || 100})
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={gradingAssignment.max_score || 100}
                            step="0.5"
                            className="mt-1 h-9 text-sm"
                            placeholder="0"
                            value={inp.score}
                            onChange={e => setGradeInputs(prev => ({
                              ...prev,
                              [sub.id]: { ...inp, score: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600">Feedback (optional)</label>
                          <Input
                            className="mt-1 h-9 text-sm"
                            placeholder="Comments or feedback for the student..."
                            value={inp.feedback}
                            onChange={e => setGradeInputs(prev => ({
                              ...prev,
                              [sub.id]: { ...inp, feedback: e.target.value }
                            }))}
                          />
                        </div>

                        {/* Live grade badge */}
                        {grade && (
                          <div className={`flex-shrink-0 w-10 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                            grade === 'A' ? 'bg-green-100 text-green-700' :
                            grade === 'B' ? 'bg-blue-100 text-blue-700' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                            grade === 'D' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {grade}
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="flex-shrink-0 h-9"
                          disabled={gradingSaving[sub.id]}
                          onClick={() => handleGradeSubmission(gradingAssignment.id, sub.id)}
                        >
                          {gradingSaving[sub.id]
                            ? 'Saving...'
                            : isGraded ? 'Update' : 'Grade'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t p-4 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={handleCloseGrading}>Close Panel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
