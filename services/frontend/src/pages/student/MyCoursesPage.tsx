import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, User, Clock, Award, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyCoursesPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [className, setClassName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadCourses();
  }, [user?.id]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get the student record to find their class_id
      const studentRes: any = await api.getStudents({ userId: user!.id });
      const students: any[] = studentRes?.data || studentRes?.students || [];
      const student = students[0];

      if (student?.class_id) {
        // 2. Get subjects assigned to that class
        setClassName(student.class_name || student.class?.name || '');
        const subjectsRes: any = await api.getClassSubjects(student.class_id);
        const data: any[] = subjectsRes?.data || subjectsRes?.subjects || subjectsRes || [];
        setCourses(Array.isArray(data) ? data : []);
      } else {
        // Fallback: get all subjects for the tenant
        const fallback: any = await api.getSubjects();
        setCourses(fallback?.data || fallback?.subjects || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadCourses} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Courses</h2>
        <p className="text-gray-500">
          {className ? `Subjects for ${className}` : 'Your enrolled courses and subjects'}
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <GraduationCap className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No subjects found</p>
            <p className="text-sm text-gray-400 mt-1">
              Subjects will appear here once your class has been set up.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="line-clamp-1">{course.subject_name || course.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(course.teacher_name || course.teacher_first_name) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
                    <span>{course.teacher_name || `${course.teacher_first_name || ''} ${course.teacher_last_name || ''}`.trim()}</span>
                  </div>
                )}
                {course.weekly_hours != null && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
                    <span>{course.weekly_hours} hrs/week</span>
                  </div>
                )}
                {course.credits != null && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Award className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
                    <span>{course.credits} credits</span>
                  </div>
                )}
                {(course.subject_code || course.code) && (
                  <div className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded w-fit">
                    {course.subject_code || course.code}
                  </div>
                )}
                {course.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
