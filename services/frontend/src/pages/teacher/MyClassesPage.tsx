import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyClassesPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showAllStudentsModal, setShowAllStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user?.id]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getTeacherClasses(user?.id || '');
      console.log('My classes:', response);
      setClasses(response?.data || response?.classes || []);
    } catch (error: any) {
      console.error('Error loading classes:', error);
      setError(error?.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (classItem: any) => {
    try {
      setSelectedClass(classItem);
      setStudentsLoading(true);
      setShowStudentsModal(true);
      
      const response: any = await api.getClassStudents(classItem.id);
      console.log('Class students:', response);
      setStudents(response?.data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      alert('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleViewAllStudents = async () => {
    try {
      setStudentsLoading(true);
      setShowAllStudentsModal(true);
      
      // Load students from all assigned classes
      let allStudentsList: any[] = [];
      for (const classItem of classes) {
        const response: any = await api.getClassStudents(classItem.id);
        const classStudents = (response?.data || []).map((s: any) => ({
          ...s,
          class_name: classItem.name
        }));
        allStudentsList = [...allStudentsList, ...classStudents];
      }
      
      // Remove duplicates based on student id
      const uniqueStudents = allStudentsList.filter((student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
      );
      
      setAllStudents(uniqueStudents);
    } catch (error: any) {
      console.error('Error loading all students:', error);
      alert('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleMarkAttendance = (classItem: any) => {
    // Navigate to attendance page or show attendance modal
    window.location.href = `/app/attendance?classId=${classItem.id}`;
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
            <CardTitle className="text-red-600">Error Loading Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadClasses} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Classes</h2>
          <p className="text-gray-500">Manage your assigned classes and subjects</p>
        </div>
        <Button onClick={handleViewAllStudents} disabled={classes.length === 0}>
          View All Students
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No classes assigned yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Contact an administrator to assign classes to you.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          classes.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{classItem.name} {classItem.section || ''}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-gray-600">Students</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {classItem.current_strength || classItem.capacity || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-600">Subjects</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        {classItem.total_subjects || '-'}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-gray-600">Attendance</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900">
                        {classItem.attendance_percentage || '-'}%
                      </p>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-gray-600">Avg Grade</span>
                      </div>
                      <p className="text-lg font-bold text-orange-900">
                        {classItem.average_grade || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleMarkAttendance(classItem)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </Button>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleViewStudents(classItem)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Students
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Class Students Modal */}
      <Dialog open={showStudentsModal} onOpenChange={setShowStudentsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Students in {selectedClass?.name} {selectedClass?.section || ''}
            </DialogTitle>
          </DialogHeader>
          
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No students in this class</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Adm No</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-mono text-sm">{student.admission_number}</td>
                      <td className="p-3 font-medium">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{student.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View All Students Modal */}
      <Dialog open={showAllStudentsModal} onOpenChange={setShowAllStudentsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All My Students</DialogTitle>
          </DialogHeader>
          
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Total: {allStudents.length} students across {classes.length} classes
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Adm No</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Class</th>
                      <th className="text-left p-3 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStudents.map((student, index) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-mono text-sm">{student.admission_number}</td>
                        <td className="p-3 font-medium">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="p-3">{student.class_name}</td>
                        <td className="p-3 text-sm text-gray-600">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
