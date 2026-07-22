import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { BarChart2, TrendingUp, Users, Award } from 'lucide-react';
import api from '@/services/api';
import { computeCBEGrade } from '@/utils/cbeGrades';

type Tab = 'exam' | 'student' | 'class';

// ---------- helpers ----------

// Grade bands in top-to-bottom display order for each CBE education level (matches
// the scale computeCBEGrade() returns for that level — junior_secondary uses the
// 8-level KJSEA scale, everything else the standard 4-level EE/ME/AE/BE).
function gradeBandsFor(educationLevel?: string): string[] {
  if (educationLevel === 'junior_secondary') return ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'];
  if (['playgroup', 'pre_primary'].includes(educationLevel || '')) return ['WD', 'D', 'B'];
  return ['EE', 'ME', 'AE', 'BE'];
}

function gradeFromMark(mark: number, maxMark = 100, educationLevel?: string): string {
  const pct = (mark / maxMark) * 100;
  return computeCBEGrade(pct, educationLevel || 'lower_primary');
}

const GRADE_COLOR: Record<string, string> = {
  EE: 'bg-green-500', EE1: 'bg-green-600', EE2: 'bg-green-500', WD: 'bg-green-500',
  ME: 'bg-blue-500', ME1: 'bg-blue-600', ME2: 'bg-blue-500',
  AE: 'bg-amber-500', AE1: 'bg-amber-600', AE2: 'bg-amber-500', D: 'bg-amber-500',
  BE: 'bg-red-500', BE1: 'bg-red-600', BE2: 'bg-red-500', B: 'bg-red-500',
};

const GRADE_TEXT: Record<string, string> = {
  EE: 'text-green-700', EE1: 'text-green-700', EE2: 'text-green-700', WD: 'text-green-700',
  ME: 'text-blue-700', ME1: 'text-blue-700', ME2: 'text-blue-700',
  AE: 'text-amber-700', AE1: 'text-amber-700', AE2: 'text-amber-700', D: 'text-amber-700',
  BE: 'text-red-700', BE1: 'text-red-700', BE2: 'text-red-700', B: 'text-red-700',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CSSBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-xs font-semibold text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-5">
        <div
          className={`${color} h-5 rounded text-white text-xs flex items-center justify-end pr-1 transition-all`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 10 ? `${pct}%` : ''}
        </div>
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ---------- Tab 1: Exam Analysis ----------

function ExamAnalysisTab() {
  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getExams().then((res: any) => {
      setExams(res.data || res.exams || res || []);
    }).catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    (api as any).api.get(`/exam-analytics/exam/${examId}/summary`)
      .then((res: any) => setSummary(res.data || res || null))
      .catch((e: any) => setError(e?.message || 'Failed to load exam summary'))
      .finally(() => setLoading(false));
  }, [examId]);

  // Grade distribution comes pre-computed (and education-level aware) from the backend
  const educationLevel: string | undefined = summary?.exam?.education_level;
  const students: any[] = summary?.students || [];
  const gradeBands = gradeBandsFor(educationLevel);
  const bandCounts: Record<string, number> = summary?.grade_distribution
    ? { ...summary.grade_distribution }
    : Object.fromEntries(gradeBands.map((g) => [g, 0]));
  const total = summary?.total_students || students.length || 1;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
          <option value="">Select an exam...</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name || ex.exam_name}</option>
          ))}
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

      {summary && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Class Average" value={`${Number(summary.average ?? 0).toFixed(1)}%`} color="text-indigo-700" />
            <StatCard label="Highest Score" value={`${summary.highest ?? 0}`} color="text-green-700" />
            <StatCard label="Lowest Score" value={`${summary.lowest ?? 0}`} color="text-red-700" />
            <StatCard label="Pass Rate" value={`${Number(summary.pass_rate ?? 0).toFixed(1)}%`} color="text-amber-700" />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {gradeBands.map((g) => (
                <CSSBar
                  key={g}
                  label={g}
                  pct={Math.round((bandCounts[g] / total) * 100)}
                  color={GRADE_COLOR[g]}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Student Results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Student', 'Marks', 'Grade', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s, i) => {
                      const grade = s.grade || gradeFromMark(s.marks ?? 0, s.max_mark ?? 100, educationLevel);
                      const passed = ((s.marks ?? 0) / (s.max_mark ?? 100)) * 100 >= 50;
                      return (
                        <tr key={s.id ?? i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.student_name || s.name}</td>
                          <td className="px-4 py-3 text-gray-700">{s.marks ?? '—'} / {s.max_mark ?? 100}</td>
                          <td className={`px-4 py-3 font-bold ${GRADE_TEXT[grade] ?? ''}`}>{grade}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {passed ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!examId && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <BarChart2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            Select an exam to view analytics.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Tab 2: Student Performance ----------

function StudentPerformanceTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [perf, setPerf] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStudents().then((res: any) => {
      setStudents(res.data || res.students || res || []);
    }).catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    (api as any).api.get(`/exam-analytics/student/${studentId}/performance`)
      .then((res: any) => setPerf(res.data || res || null))
      .catch((e: any) => setError(e?.message || 'Failed to load student performance'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const educationLevel: string | undefined = perf?.student?.education_level;
  const subjects: any[] = perf?.subjects || [];
  const exams: any[] = perf?.exams || [];
  const sortedSubjects = [...subjects].sort((a, b) => (b.avg_marks ?? 0) - (a.avg_marks ?? 0));
  const strongest = sortedSubjects[0];
  const weakest = sortedSubjects[sortedSubjects.length - 1];
  const maxExamMark = Math.max(...exams.map((e) => e.avg_marks ?? 0), 1);

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name || s.student_name}</option>
          ))}
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

      {perf && !loading && (
        <>
          {(strongest || weakest) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strongest && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-green-600 font-semibold uppercase">Strongest Subject</p>
                    <p className="text-lg font-bold text-green-800 mt-1">{strongest.subject_name}</p>
                    <p className="text-sm text-green-700">{Number(strongest.avg_marks).toFixed(1)} avg</p>
                  </CardContent>
                </Card>
              )}
              {weakest && weakest !== strongest && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-red-600 font-semibold uppercase">Needs Attention</p>
                    <p className="text-lg font-bold text-red-800 mt-1">{weakest.subject_name}</p>
                    <p className="text-sm text-red-700">{Number(weakest.avg_marks).toFixed(1)} avg</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Performance by Subject</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Subject', 'Avg Marks', 'Grade', 'Highlight'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjects.map((s, i) => {
                      const grade = gradeFromMark(s.avg_marks ?? 0, 100, educationLevel);
                      const isStrongest = s === strongest;
                      const isWeakest = s === weakest && s !== strongest;
                      return (
                        <tr key={s.subject_id ?? i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.subject_name}</td>
                          <td className="px-4 py-3 text-gray-700">{Number(s.avg_marks ?? 0).toFixed(1)}</td>
                          <td className={`px-4 py-3 font-bold ${GRADE_TEXT[grade] ?? ''}`}>{grade}</td>
                          <td className="px-4 py-3">
                            {isStrongest && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Strongest</span>}
                            {isWeakest && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Needs Work</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {exams.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Exam Trend</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {exams.map((ex, i) => (
                  <div key={ex.exam_id ?? i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-32 truncate" title={ex.exam_name}>{ex.exam_name}</span>
                    <div className="flex-1 bg-gray-100 rounded h-5">
                      <div
                        className="bg-indigo-500 h-5 rounded text-white text-xs flex items-center justify-end pr-1 transition-all"
                        style={{ width: `${Math.max(((ex.avg_marks ?? 0) / maxExamMark) * 100, 2)}%` }}
                      >
                        {((ex.avg_marks ?? 0) / maxExamMark) * 100 > 15 ? `${Number(ex.avg_marks).toFixed(1)}` : ''}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{Number(ex.avg_marks ?? 0).toFixed(1)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!studentId && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            Select a student to view their performance.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Tab 3: Class Report ----------

function ClassReportTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getClasses().then((res: any) => {
      setClasses(res.data || res.classes || res || []);
    }).catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    (api as any).api.get(`/exam-analytics/class/${classId}/report`)
      .then((res: any) => setReport(res.data?.students || res.data || res.students || res || []))
      .catch((e: any) => setError(e?.message || 'Failed to load class report'))
      .finally(() => setLoading(false));
  }, [classId]);

  const educationLevel: string | undefined = classes.find((c) => c.id === classId)?.education_level;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select a class...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.class_name}</option>
          ))}
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

      {report.length > 0 && !loading && (
        <Card>
          <CardHeader><CardTitle className="text-base">Class Ranking</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Rank', 'Student', 'Average', 'Grade'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.map((row, i) => {
                    const avg = Number(row.average ?? row.avg_marks ?? 0);
                    const grade = gradeFromMark(avg, 100, educationLevel);
                    const rank = row.rank ?? i + 1;
                    return (
                      <tr key={row.student_id ?? i} className={`hover:bg-gray-50 ${rank <= 3 ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            rank === 1 ? 'bg-amber-400 text-white' :
                            rank === 2 ? 'bg-gray-300 text-gray-800' :
                            rank === 3 ? 'bg-orange-400 text-white' :
                            'bg-gray-100 text-gray-600'
                          }`}>{rank}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.student_name || row.name}</td>
                        <td className="px-4 py-3 text-gray-700">{avg.toFixed(1)}</td>
                        <td className={`px-4 py-3 font-bold ${GRADE_TEXT[grade] ?? ''}`}>{grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!classId && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            Select a class to view rankings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Main Page ----------

export function ExamAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('exam');

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'exam',    label: 'Exam Analysis',       icon: <BarChart2 className="h-4 w-4" /> },
    { key: 'student', label: 'Student Performance', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'class',   label: 'Class Report',        icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="h-6 w-6 text-indigo-600" /> Exam Analytics
        </h2>
        <p className="text-gray-500 text-sm mt-1">Deep insights into exam performance and student progress</p>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'exam'    && <ExamAnalysisTab />}
      {tab === 'student' && <StudentPerformanceTab />}
      {tab === 'class'   && <ClassReportTab />}
    </div>
  );
}
