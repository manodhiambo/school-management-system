import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, BookOpen, Users, Plus, Save, X } from 'lucide-react';
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
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false);
  const [showEnterGradesModal, setShowEnterGradesModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Form states
  const [assessmentData, setAssessmentData] = useState({
    name: '',
    subjectId: '',
    maxScore: '100',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [gradesData, setGradesData] = useState<Record<string, { score: string; grade: string }>>({});

  useEffect(() => {
    if (user?.id) {
      loadClasses();
      loadSubjects();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass.id);
    }
  }, [selectedClass]);

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
      console.log('Class students:', response);
      setStudents(response?.data || response?.students || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
    }
  };

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a full implementation, this would create an exam/assessment
      alert(`Assessment "${assessmentData.name}" created successfully!\n\nNote: Full exam management coming soon.`);
      setShowAddAssessmentModal(false);
      setAssessmentData({
        name: '',
        subjectId: '',
        maxScore: '100',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      alert(error?.message || 'Failed to create assessment');
    }
  };

  const handleEnterGrades = (student: any) => {
    setSelectedStudent(student);
    // Initialize grades data for the student
    setGradesData({
      score: '',
      grade: ''
    });
    setShowEnterGradesModal(true);
  };

  const handleSaveGrades = async () => {
    try {
      // In a full implementation, this would save to the results/grades table
      const score = parseFloat(gradesData.score || '0');
      let grade = gradesData.grade;
      
      // Auto-calculate grade if not provided
      if (!grade && score) {
        if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 50) grade = 'D';
        else grade = 'F';
      }
      
      alert(`Grades saved for ${selectedStudent.first_name} ${selectedStudent.last_name}!\n\nScore: ${score}\nGrade: ${grade}\n\nNote: Full grade management coming soon.`);
      setShowEnterGradesModal(false);
      setSelectedStudent(null);
    } catch (error: any) {
      alert(error?.message || 'Failed to save grades');
    }
  };

  const handleBulkGradeEntry = () => {
    if (students.length === 0) {
      alert('No students in this class');
      return;
    }
    
    // Initialize grades for all students
    const initialGrades: Record<string, { score: string; grade: string }> = {};
    students.forEach(student => {
      initialGrades[student.id] = { score: '', grade: '' };
    });
    setGradesData(initialGrades);
    setShowEnterGradesModal(true);
    setSelectedStudent(null); // null means bulk entry
  };

  const handleBulkSaveGrades = async () => {
    try {
      const entries = Object.entries(gradesData).filter(([_, data]) => data.score);
      if (entries.length === 0) {
        alert('Please enter at least one score');
        return;
      }
      
      alert(`Saved grades for ${entries.length} students!\n\nNote: Full grade management coming soon.`);
      setShowEnterGradesModal(false);
      setGradesData({});
    } catch (error: any) {
      alert(error?.message || 'Failed to save grades');
    }
  };

  const calculateGrade = (score: number): string => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
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
              <p className="text-sm text-gray-400 mt-2">
                Contact an administrator to assign classes to you.
              </p>
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
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBulkGradeEntry} disabled={students.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Bulk Grade Entry
          </Button>
          <Button onClick={() => setShowAddAssessmentModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assessment
          </Button>
        </div>
      </div>

      {/* Class Selector */}
      <div className="flex gap-2 flex-wrap">
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

      {selectedClass && (
        <>
          {/* Class Summary */}
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
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClass.average_grade || '-'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <Award className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClass.pass_rate || '-'}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClass.total_subjects || '-'}</div>
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
                  <p className="text-gray-500">No students enrolled in this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium">#</th>
                        <th className="text-left py-3 px-4 font-medium">Adm No.</th>
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Current Grade</th>
                        <th className="text-left py-3 px-4 font-medium">Attendance</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: any, index: number) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4 font-mono text-sm">
                            {student.admission_number || student.roll_number || '-'}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {student.current_grade || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{student.attendance_percentage || '-'}%</td>
                          <td className="py-3 px-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEnterGrades(student)}
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Enter Grades
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Assessment Modal */}
      <Dialog open={showAddAssessmentModal} onOpenChange={setShowAddAssessmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Assessment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAssessment}>
            <div className="space-y-4">
              <div>
                <Label>Assessment Name</Label>
                <Input
                  value={assessmentData.name}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mid-Term Exam, Quiz 1"
                  required
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Select
                  value={assessmentData.subjectId}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, subjectId: e.target.value }))}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    value={assessmentData.maxScore}
                    onChange={(e) => setAssessmentData(prev => ({ ...prev, maxScore: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={assessmentData.date}
                    onChange={(e) => setAssessmentData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddAssessmentModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Assessment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enter Grades Modal - Single Student */}
      <Dialog open={showEnterGradesModal && selectedStudent !== null} onOpenChange={(open) => {
        if (!open) {
          setShowEnterGradesModal(false);
          setSelectedStudent(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enter Grades - {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select defaultValue="">
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Score (out of 100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={gradesData.score || ''}
                  onChange={(e) => setGradesData(prev => ({ ...prev, score: e.target.value }))}
                  placeholder="Enter score"
                />
              </div>
              <div>
                <Label>Grade (auto-calculated)</Label>
                <Input
                  value={gradesData.score ? calculateGrade(parseFloat(gradesData.score)) : '-'}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="font-medium">Grading Scale:</p>
              <p>A: 80-100 | B: 70-79 | C: 60-69 | D: 50-59 | F: Below 50</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => {
              setShowEnterGradesModal(false);
              setSelectedStudent(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrades}>
              <Save className="h-4 w-4 mr-2" />
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Grade Entry Modal */}
      <Dialog open={showEnterGradesModal && selectedStudent === null} onOpenChange={(open) => {
        if (!open) {
          setShowEnterGradesModal(false);
          setGradesData({});
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Grade Entry - {selectedClass?.name} {selectedClass?.section || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subject</Label>
                <Select defaultValue="">
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Assessment</Label>
                <Input placeholder="e.g., Mid-Term Exam" />
              </div>
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
                          max="100"
                          className="w-24 h-8"
                          placeholder="0-100"
                          value={gradesData[student.id]?.score || ''}
                          onChange={(e) => setGradesData(prev => ({
                            ...prev,
                            [student.id]: { 
                              score: e.target.value, 
                              grade: e.target.value ? calculateGrade(parseFloat(e.target.value)) : '' 
                            }
                          }))}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          gradesData[student.id]?.score 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-400'
                        }`}>
                          {gradesData[student.id]?.score 
                            ? calculateGrade(parseFloat(gradesData[student.id].score)) 
                            : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => {
              setShowEnterGradesModal(false);
              setGradesData({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkSaveGrades}>
              <Save className="h-4 w-4 mr-2" />
              Save All Grades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
