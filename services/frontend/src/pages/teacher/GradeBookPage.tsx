import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, BookOpen, Users, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
  
  // Modal states
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);
  
  // Form states
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState('quiz');
  const [maxMarks, setMaxMarks] = useState('100');
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
      const classesData = response?.data || response?.classes || [];
      setClasses(classesData);
      if (classesData.length > 0) {
        setSelectedClass(classesData[0]);
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
      setSubjects(response?.data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const response: any = await api.getClassStudents(classId);
      setStudents(response?.data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
    }
  };

  const loadGradebookEntries = async () => {
    try {
      if (!selectedClass) return;
      
      const params: any = { classId: selectedClass.id };
      if (selectedSubject) {
        params.subjectId = selectedSubject;
      }
      
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
    if (!selectedSubject) {
      alert('Please select a subject first');
      return;
    }
    // Initialize grades data
    const initialGrades: Record<string, string> = {};
    students.forEach(student => {
      initialGrades[student.id] = '';
    });
    setGradesData(initialGrades);
    setShowBulkGradeModal(true);
  };

  const handleSaveBulkGrades = async () => {
    try {
      setSaving(true);
      
      // Filter out empty grades
      const gradesToSave = Object.entries(gradesData)
        .filter(([_, score]) => score !== '' && score !== null)
        .map(([studentId, score]) => ({
          studentId,
          score: parseFloat(score)
        }));
      
      if (gradesToSave.length === 0) {
        alert('Please enter at least one grade');
        setSaving(false);
        return;
      }
      
      const response: any = await api.saveBulkGrades({
        classId: selectedClass.id,
        subjectId: selectedSubject,
        assessmentType,
        title: assessmentTitle || 'Assessment',
        maxMarks: parseFloat(maxMarks),
        date: new Date().toISOString().split('T')[0],
        grades: gradesToSave
      });
      
      alert(`Successfully saved ${response?.data?.created?.length || gradesToSave.length} grades!`);
      setShowBulkGradeModal(false);
      setGradesData({});
      setAssessmentTitle('');
      loadGradebookEntries();
    } catch (error: any) {
      console.error('Error saving grades:', error);
      alert(error?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const calculateGrade = (score: number, max: number = 100): string => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  // Get student's average from gradebook entries
  const getStudentAverage = (studentId: string) => {
    const studentEntries = gradebookEntries.filter(e => e.student_id === studentId);
    if (studentEntries.length === 0) return null;
    
    const totalMarks = studentEntries.reduce((sum, e) => sum + parseFloat(e.marks || 0), 0);
    const totalMaxMarks = studentEntries.reduce((sum, e) => sum + parseFloat(e.max_marks || 0), 0);
    
    if (totalMaxMarks === 0) return null;
    return ((totalMarks / totalMaxMarks) * 100).toFixed(1);
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
        <Button onClick={handleOpenBulkGrade} disabled={!selectedSubject}>
          <Plus className="h-4 w-4 mr-2" />
          Enter Grades
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          {classes.map((classItem) => (
            <Button
              key={classItem.id}
              variant={selectedClass?.id === classItem.id ? "default" : "outline"}
              onClick={() => setSelectedClass(classItem)}
            >
              {classItem.name} {classItem.section || ''}
            </Button>
          ))}
        </div>
        <div className="w-48">
          <Select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </Select>
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
                    ? (gradebookEntries.reduce((sum, e) => sum + ((parseFloat(e.marks) / parseFloat(e.max_marks)) * 100), 0) / gradebookEntries.length).toFixed(1) + '%'
                    : '-'}
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
              <CardTitle>Students - {selectedClass.name} {selectedClass.section || ''}</CardTitle>
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
                        <th className="text-left py-3 px-4 font-medium">#</th>
                        <th className="text-left py-3 px-4 font-medium">Adm No.</th>
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Entries</th>
                        <th className="text-left py-3 px-4 font-medium">Average</th>
                        <th className="text-left py-3 px-4 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any, index: number) => {
                        const studentEntries = gradebookEntries.filter(e => e.student_id === student.id);
                        const average = getStudentAverage(student.id);
                        
                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{index + 1}</td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {student.admission_number || '-'}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="py-3 px-4">{studentEntries.length}</td>
                            <td className="py-3 px-4">
                              {average ? `${average}%` : '-'}
                            </td>
                            <td className="py-3 px-4">
                              {average ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  parseFloat(average) >= 80 ? 'bg-green-100 text-green-800' :
                                  parseFloat(average) >= 70 ? 'bg-blue-100 text-blue-800' :
                                  parseFloat(average) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  parseFloat(average) >= 50 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {calculateGrade(parseFloat(average), 100)}
                                </span>
                              ) : '-'}
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
                        <th className="text-left py-2 px-3 font-medium">Date</th>
                        <th className="text-left py-2 px-3 font-medium">Student</th>
                        <th className="text-left py-2 px-3 font-medium">Subject</th>
                        <th className="text-left py-2 px-3 font-medium">Title</th>
                        <th className="text-left py-2 px-3 font-medium">Score</th>
                        <th className="text-left py-2 px-3 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebookEntries.slice(0, 10).map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="py-2 px-3 text-sm">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3">
                            {entry.student_first_name} {entry.student_last_name}
                          </td>
                          <td className="py-2 px-3">{entry.subject_name}</td>
                          <td className="py-2 px-3">{entry.title}</td>
                          <td className="py-2 px-3">
                            {entry.marks}/{entry.max_marks}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {entry.grade}
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

      {/* Bulk Grade Entry Modal */}
      <Dialog open={showBulkGradeModal} onOpenChange={setShowBulkGradeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Grades - {selectedClass?.name} {selectedClass?.section || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Subject</Label>
                <Select value={selectedSubject} disabled>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Assessment Type</Label>
                <Select 
                  value={assessmentType} 
                  onChange={(e) => setAssessmentType(e.target.value)}
                >
                  <option value="quiz">Quiz</option>
                  <option value="homework">Homework</option>
                  <option value="classwork">Classwork</option>
                  <option value="project">Project</option>
                  <option value="exam">Exam</option>
                </Select>
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label>Assessment Title</Label>
              <Input
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Quiz, Mid-Term Exam"
              />
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Student</th>
                    <th className="text-left py-2 px-3 font-medium w-32">Score</th>
                    <th className="text-left py-2 px-3 font-medium w-20">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} className="border-t">
                      <td className="py-2 px-3">{index + 1}</td>
                      <td className="py-2 px-3">
                        {student.first_name} {student.last_name}
                        <span className="text-xs text-gray-500 ml-2">({student.admission_number})</span>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min="0"
                          max={maxMarks}
                          className="w-24 h-8"
                          placeholder={`0-${maxMarks}`}
                          value={gradesData[student.id] || ''}
                          onChange={(e) => setGradesData(prev => ({
                            ...prev,
                            [student.id]: e.target.value
                          }))}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          gradesData[student.id] 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-400'
                        }`}>
                          {gradesData[student.id] 
                            ? calculateGrade(parseFloat(gradesData[student.id]), parseFloat(maxMarks)) 
                            : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium">Grading Scale:</p>
              <p>A: 80-100% | B: 70-79% | C: 60-69% | D: 50-59% | F: Below 50%</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowBulkGradeModal(false)}>
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
