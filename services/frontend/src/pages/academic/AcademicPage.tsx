import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, FileText, Calendar } from 'lucide-react';
import api from '@/services/api';

export function AcademicPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAcademicData();
  }, []);

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, examsRes]: any = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getExams(),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setExams(examsRes.data || []);
    } catch (error) {
      console.error('Error loading academic data:', error);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Academic Management</h2>
        <p className="text-gray-500">Manage classes, subjects, exams and curriculum</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Classes</span>
              <BookOpen className="h-5 w-5 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{classes.length}</div>
            <p className="text-xs text-gray-500">Total classes</p>
            <Button className="w-full mt-4" size="sm">Manage Classes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Subjects</span>
              <GraduationCap className="h-5 w-5 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subjects.length}</div>
            <p className="text-xs text-gray-500">Total subjects</p>
            <Button className="w-full mt-4" size="sm">Manage Subjects</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Exams</span>
              <FileText className="h-5 w-5 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{exams.length}</div>
            <p className="text-xs text-gray-500">Scheduled exams</p>
            <Button className="w-full mt-4" size="sm">Manage Exams</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classes & Sections</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No classes configured</p>
            ) : (
              <div className="space-y-2">
                {classes.slice(0, 5).map((cls: any) => (
                  <div key={cls.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{cls.name} - Section {cls.section}</p>
                      <p className="text-sm text-gray-500">{cls.student_count || 0} students</p>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No subjects configured</p>
            ) : (
              <div className="space-y-2">
                {subjects.slice(0, 5).map((subject: any) => (
                  <div key={subject.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-gray-500">Code: {subject.code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      subject.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upcoming Exams</span>
            <Button size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Exam
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming exams</p>
          ) : (
            <div className="space-y-3">
              {exams.map((exam: any) => (
                <div key={exam.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-medium">{exam.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">View Details</Button>
                    <Button variant="ghost" size="sm">Upload Results</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
