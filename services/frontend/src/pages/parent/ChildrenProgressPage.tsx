import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Award, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '@/services/api';
import { getCBCGradeBadgeClass, getEducationLevelLabel } from '@/utils/cbcGrades';

export function ChildrenProgressPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [cbcData, setCbcData] = useState<any>(null);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      const sid = selectedChild.student_id || selectedChild.id;
      loadChildProgress(sid);
      loadCbcData(sid);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.getParentByUserId(user?.id || '');
      const parentData = response.data || response;
      const childrenData = parentData.children || [];
      setChildren(childrenData);
      if (childrenData.length > 0) setSelectedChild(childrenData[0]);

      // Load parent CBC overview
      try {
        const overviewRes: any = await api.getCbcParentOverview();
        const overviewData = overviewRes.data || overviewRes;
        setUpcomingExams(overviewData.upcoming_exams || []);
      } catch { /* silent */ }
    } catch (err: any) {
      setError(err?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadChildProgress = async (childId: string) => {
    try {
      const [attendanceRes, resultsRes]: any[] = await Promise.all([
        api.getStudentAttendance(childId),
        api.getStudentExamResults(childId)
      ]);
      setProgress({
        attendance: attendanceRes.data || attendanceRes,
        results: resultsRes.data?.results || resultsRes.results || resultsRes.data || []
      });
    } catch { /* silent */ }
  };

  const loadCbcData = async (studentId: string) => {
    try {
      const res: any = await api.getCbcStudentAnalytics(studentId);
      setCbcData(res.data || res);
    } catch { /* silent */ }
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
          <CardHeader><CardTitle className="text-red-600">Error Loading Progress</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadChildren} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No children linked to your account</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const childClass = selectedChild?.class_name;
  const educationLevel = selectedChild?.education_level;

  // Build performance trend from grade history
  const trendData = cbcData?.grade_history?.slice(0, 10).map((h: any) => ({
    exam: h.exam_name?.slice(0, 12) || 'Exam',
    '%': parseFloat(h.percentage) || 0,
    subject: h.subject_name || ''
  })) || [];

  // Attendance chart data
  const present = progress?.attendance?.summary?.present ?? progress?.attendance?.present ?? 0;
  const absent = progress?.attendance?.summary?.absent ?? progress?.attendance?.absent ?? 0;
  const late = progress?.attendance?.summary?.late ?? progress?.attendance?.late ?? 0;

  // Latest CBC grade
  const latestGrade = cbcData?.grade_history?.[0]?.cbc_grade;
  const classRank = cbcData?.class_rank;
  const attendancePct = (present + absent + late) > 0 ? Math.round((present / (present + absent + late)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Children Progress</h2>
        <p className="text-gray-500">Track your children's CBC academic performance</p>
      </div>

      {/* Child Selector */}
      <div className="flex gap-2 flex-wrap">
        {children.map(child => (
          <Button
            key={child.student_id || child.id}
            variant={(selectedChild?.student_id || selectedChild?.id) === (child.student_id || child.id) ? 'default' : 'outline'}
            onClick={() => setSelectedChild(child)}
          >
            {child.first_name} {child.last_name}
          </Button>
        ))}
      </div>

      {selectedChild && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Level</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {educationLevel ? getEducationLevelLabel(educationLevel) : childClass || 'N/A'}
                </div>
                {childClass && <p className="text-xs text-gray-500">{childClass}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {classRank ? `#${classRank}` : 'N/A'}
                </div>
                <p className="text-xs text-gray-500">In class</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendancePct}%</div>
                <p className="text-xs text-gray-500">{present} days present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latest Grade</CardTitle>
                <Award className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestGrade ? (
                    <span className={`px-3 py-1 rounded-lg border-2 text-lg font-bold ${getCBCGradeBadgeClass(latestGrade)}`}>
                      {latestGrade}
                    </span>
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">CBC Grade</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trend */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="%" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Score %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Subject performance table from CBC history */}
          {cbcData?.grade_history?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4">Exam</th>
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Score</th>
                        <th className="py-2">CBC Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cbcData.grade_history.slice(0, 10).map((h: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 pr-4">{h.exam_name}</td>
                          <td className="py-2 pr-4">{h.subject_name || '–'}</td>
                          <td className="py-2 pr-4">{h.marks_obtained}/{h.max_marks} ({h.percentage}%)</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getCBCGradeBadgeClass(h.cbc_grade)}`}>
                              {h.cbc_grade || '–'}
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

          {/* Attendance Summary */}
          <Card>
            <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{present}</p>
                  <p className="text-sm text-gray-600">Present</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{absent}</p>
                  <p className="text-sm text-gray-600">Absent</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{late}</p>
                  <p className="text-sm text-gray-600">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          {upcomingExams.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Upcoming Exams</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcomingExams.slice(0, 5).map(exam => (
                  <div key={exam.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{exam.name}</p>
                      <p className="text-xs text-gray-500">{exam.class_name}</p>
                    </div>
                    <div className="text-right">
                      {exam.start_date && (
                        <p className="text-xs text-gray-500">{new Date(exam.start_date).toLocaleDateString()}</p>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${exam.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {exam.mode || 'offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
