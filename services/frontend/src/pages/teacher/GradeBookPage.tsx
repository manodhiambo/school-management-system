import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, BookOpen, Users, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function GradeBookPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [gradebookEntries, setGradebookEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  // Modal states
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);

  // Form states
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState('quiz');
  const [maxMarks, setMaxMarks] = useState('100');
  const [modalSubject, setModalSubject] = useState('');
  const [gradesData, setGradesData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) {
      loadClasses();
      loadSubjects();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id);
      loadGradebookEntries();
    }
  }, [selectedClass, selectedSubject]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getTeacherClasses(user?.id || '');
      const classesData = response?.data || response?.classes || response || [];
      const arr = Array.isArray(classesData) ? classesData : [];
      setClasses(arr);
      if (arr.length > 0) {
        setSelectedClass(arr[0]);
      }
    } catch (error: any) {
      console.error('Error loading classes:', error);
      setError(error?.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const response: any = await api.getSubjects();
      const data = response?.data || response?.subjects || response || [];
      const arr = Array.isArray(data) ? data : [];
      setSubjects(arr);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const response: any = await api.getClassStudents(classId);
      const data = response?.data || response?.students || response || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading students:', error);
    }
  };

  const loadGradebookEntries = async () => {
    try {
      if (!selectedClass) return;
      const params: any = { classId: selectedClass.id };
      if (selectedSubject) params.subjectId = selectedSubject;
      const response: any = await api.getGradebookEntries(params);
      setGradebookEntries(response?.data || []);
    } catch (error) {
      console.error('Error loading gradebook entries:', error);
    }
  };

  const handleOpenBulkGrade = () => {
    if (students.length === 0) {
      alert('No students in this class');
      return;
    }
    // Pre-fill modal subject from filter (or first subject)
    const preSelected = selectedSubject || (subjects.length > 0 ? subjects[0].id : '');
    setModalSubject(preSelected);

    const initialGrades: Record<string, string> = {};
    students.forEach(student => {
      initialGrades[student.id] = '';
    });
    setGradesData(initialGrades);
    setSaveError('');
    setShowBulkGradeModal(true);
  };

  const handleSaveBulkGrades = async () => {
    setSaveError('');

    if (!modalSubject) {
      setSaveError('Please select a subject.');
      return;
    }

    const gradesToSave = Object.entries(gradesData)
      .filter(([_, score]) => score !== '' && score !== null && score !== undefined)
      .map(([studentId, score]) => ({
        studentId,
        score: parseFloat(score)
      }));

    if (gradesToSave.length === 0) {
      setSaveError('Please enter at least one grade before saving.');
      return;
    }

    try {
      setSaving(true);
      await api.saveBulkGrades({
        classId: selectedClass.id,
        subjectId: modalSubject,
        assessmentType,
        title: assessmentTitle.trim() || 'Assessment',
        maxMarks: parseFloat(maxMarks) || 100,
        date: new Date().toISOString().split('T')[0],
        grades: gradesToSave
      });

      setShowBulkGradeModal(false);
      setGradesData({});
      setAssessmentTitle('');
      loadGradebookEntries();
    } catch (error: any) {
      console.error('Error saving grades:', error);
      setSaveError(error?.message || 'Failed to save grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateGrade = (score: number, max: number = 100): string => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default:  return 'bg-red-100 text-red-800';
    }
  };

  const getStudentAverage = (studentId: string) => {
    const entries = gradebookEntries.filter(e => e.student_id === studentId);
    if (entries.length === 0) return null;
    const totalMarks = entries.reduce((sum, e) => sum + parseFloat(e.marks || 0), 0);
    const totalMax   = entries.reduce((sum, e) => sum + parseFloat(e.max_marks || 0), 0);
    if (totalMax === 0) return null;
    return ((totalMarks / totalMax) * 100).toFixed(1);
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
            <CardTitle className="text-red-600">Error Loading Grade Book</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadClasses} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No classes assigned yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Grade Book</h2>
          <p className="text-gray-500">Manage student grades and assessments</p>
        </div>
        <Button onClick={handleOpenBulkGrade}>
          <Plus className="h-4 w-4 mr-2" />
          Enter Grades
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {classes.map((classItem) => (
            <Button
              key={classItem.id}
              variant={selectedClass?.id === classItem.id ? 'default' : 'outline'}
              onClick={() => setSelectedClass(classItem)}
              size="sm"
            >
              {classItem.name} {classItem.section || ''}
            </Button>
          ))}
        </div>
        <div className="w-52">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedClass && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grade Entries</CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gradebookEntries.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                <Award className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {gradebookEntries.length > 0
                    ? (gradebookEntries.reduce((sum, e) =>
                        sum + (parseFloat(e.marks || 0) / parseFloat(e.max_marks || 1)) * 100, 0
                      ) / gradebookEntries.length).toFixed(1) + '%'
                    : '—'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjects.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Students List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Students — {selectedClass.name} {selectedClass.section || ''}</CardTitle>
                <Button size="sm" onClick={handleOpenBulkGrade}>
                  <Plus className="h-4 w-4 mr-1" />
                  Enter Grades
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No students in this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-sm">#</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Adm No.</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Entries</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Average</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any, index: number) => {
                        const studentEntries = gradebookEntries.filter(e => e.student_id === student.id);
                        const average = getStudentAverage(student.id);
                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{index + 1}</td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {student.admission_number || '—'}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="py-3 px-4">{studentEntries.length}</td>
                            <td className="py-3 px-4">
                              {average ? `${average}%` : '—'}
                            </td>
                            <td className="py-3 px-4">
                              {average ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeBadgeClass(calculateGrade(parseFloat(average), 100))}`}>
                                  {calculateGrade(parseFloat(average), 100)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Entries */}
          {gradebookEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Grade Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-sm">Date</th>
                        <th className="text-left py-2 px-3 font-medium text-sm">Student</th>
                        <th className="text-left py-2 px-3 font-medium text-sm">Subject</th>
                        <th className="text-left py-2 px-3 font-medium text-sm">Title</th>
                        <th className="text-left py-2 px-3 font-medium text-sm">Score</th>
                        <th className="text-left py-2 px-3 font-medium text-sm">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebookEntries.slice(0, 20).map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="py-2 px-3 text-sm">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {entry.student_first_name} {entry.student_last_name}
                          </td>
                          <td className="py-2 px-3 text-sm">{entry.subject_name}</td>
                          <td className="py-2 px-3 text-sm">{entry.title}</td>
                          <td className="py-2 px-3 text-sm">
                            {entry.marks}/{entry.max_marks}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getGradeBadgeClass(entry.grade || '')}`}>
                              {entry.grade || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Bulk Grade Entry Modal ── */}
      <Dialog open={showBulkGradeModal} onOpenChange={setShowBulkGradeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enter Grades — {selectedClass?.name} {selectedClass?.section || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Assessment meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label>Assessment Title</Label>
                <Input
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="e.g., Chapter 5 Quiz, Mid-Term Exam"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Subject *</Label>
                <select
                  value={modalSubject}
                  onChange={(e) => setModalSubject(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">-- Select subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Assessment Type</Label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="quiz">Quiz</option>
                  <option value="homework">Homework</option>
                  <option value="classwork">Classwork</option>
                  <option value="project">Project</option>
                  <option value="exam">Exam</option>
                  <option value="cat">CAT</option>
                </select>
              </div>
            </div>

            <div className="w-40">
              <Label>Max Marks</Label>
              <Input
                type="number"
                value={maxMarks}
                min="1"
                onChange={(e) => setMaxMarks(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Students table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Student</th>
                    <th className="text-left py-2 px-3 font-medium w-36">Score (/{maxMarks})</th>
                    <th className="text-left py-2 px-3 font-medium w-24">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const raw = gradesData[student.id] || '';
                    const scoreNum = raw !== '' ? parseFloat(raw) : null;
                    const grade = scoreNum !== null && !isNaN(scoreNum)
                      ? calculateGrade(scoreNum, parseFloat(maxMarks) || 100)
                      : null;
                    return (
                      <tr key={student.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                        <td className="py-2 px-3 font-medium">
                          {student.first_name} {student.last_name}
                          <span className="text-xs text-gray-400 ml-1">
                            {student.admission_number ? `(${student.admission_number})` : ''}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            max={maxMarks}
                            step="0.5"
                            className="w-28 h-8 text-sm"
                            placeholder={`0 – ${maxMarks}`}
                            value={raw}
                            onChange={(e) => setGradesData(prev => ({
                              ...prev,
                              [student.id]: e.target.value
                            }))}
                          />
                        </td>
                        <td className="py-2 px-3">
                          {grade ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getGradeBadgeClass(grade)}`}>
                              {grade}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Grading scale info */}
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <span className="font-semibold">Grading scale:</span>{' '}
              A: 80–100% &nbsp;|&nbsp; B: 70–79% &nbsp;|&nbsp; C: 60–69% &nbsp;|&nbsp; D: 50–59% &nbsp;|&nbsp; F: &lt;50%
            </div>

            {saveError && (
              <p className="text-sm text-red-600 font-medium">{saveError}</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulkGradeModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBulkGrades} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Grades'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
