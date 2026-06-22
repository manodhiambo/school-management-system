import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import api from '@/services/api';
import { getCBEGradeBadgeClass, getEducationLevelLabel } from '@/utils/cbeGrades';

type Tab = 'overview' | 'class' | 'student' | 'subject' | 'broadsheet';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function CbcAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Overview
  const [overview, setOverview] = useState<any>(null);

  // Class view
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classAnalytics, setClassAnalytics] = useState<any>(null);

  // Student view
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);

  // Subject view
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjectAnalytics, setSubjectAnalytics] = useState<any>(null);

  // Broadsheet
  const [bsClassId, setBsClassId] = useState('');
  const [bsTerm, setBsTerm] = useState('');
  const [bsExamPeriod, setBsExamPeriod] = useState('');
  const [bsYear, setBsYear] = useState(new Date().getFullYear().toString());
  const [broadsheet, setBroadsheet] = useState<any>(null);

  useEffect(() => {
    loadBaseData();
    loadOverview();
  }, []);

  const loadBaseData = async () => {
    try {
      const [classesRes, subjectsRes, studentsRes]: any[] = await Promise.all([
        api.getClasses(), api.getSubjects(), api.getStudents()
      ]);
      setClasses(classesRes.data || classesRes || []);
      setSubjects(subjectsRes.data || subjectsRes || []);
      setStudents(studentsRes.data || studentsRes || []);
    } catch { /* silent */ }
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res: any = await api.getCbcOverview();
      setOverview(res.data || res);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadClassAnalytics = async (classId: string) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res: any = await api.getCbcClassAnalytics(classId);
      setClassAnalytics(res.data || res);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadStudentAnalytics = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res: any = await api.getCbcStudentAnalytics(studentId);
      setStudentAnalytics(res.data || res);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadSubjectAnalytics = async (subjectId: string) => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const res: any = await api.getCbcSubjectAnalytics(subjectId);
      setSubjectAnalytics(res.data || res);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadBroadsheet = async () => {
    if (!bsClassId) return;
    setLoading(true);
    try {
      const params: any = { class_id: bsClassId };
      if (bsTerm) params.term = bsTerm;
      if (bsExamPeriod) params.exam_period = bsExamPeriod;
      if (bsYear) params.academic_year = bsYear;
      const res: any = await (api as any).getCbcBroadsheet(params);
      setBroadsheet(res?.data || res);
    } catch { /* silent */ }
    setLoading(false);
  };

  const GRADE_COLORS: Record<string, string> = {
    EE: 'bg-green-100 text-green-800', ME: 'bg-blue-100 text-blue-800',
    AE: 'bg-yellow-100 text-yellow-800', BE: 'bg-red-100 text-red-800',
    WD: 'bg-green-100 text-green-800', D: 'bg-blue-100 text-blue-800',
    B: 'bg-red-100 text-red-800',
    EE1: 'bg-green-200 text-green-900', EE2: 'bg-green-100 text-green-800',
    ME1: 'bg-blue-200 text-blue-900',   ME2: 'bg-blue-100 text-blue-800',
    AE1: 'bg-yellow-200 text-yellow-900', AE2: 'bg-yellow-100 text-yellow-800',
    BE1: 'bg-red-200 text-red-900',     BE2: 'bg-red-100 text-red-800',
  };

  const isJSSBroadsheet = broadsheet?.education_level === 'junior_secondary';

  const downloadBroadsheetCSV = () => {
    if (!broadsheet) return;
    const subjectHeaders = broadsheet.subjects.flatMap((s: any) =>
      isJSSBroadsheet ? [`${s.name} (%)`, `${s.name} (Grade)`] : [s.name]
    );
    const headers = ['Pos', 'Student', 'Adm #', ...subjectHeaders,
      ...(isJSSBroadsheet ? ['Total Marks', 'Mean (%)'] : []), 'Overall'];
    const rows = broadsheet.students.map((st: any) => [
      st.rank,
      st.name,
      st.admission_number,
      ...broadsheet.subjects.flatMap((s: any) =>
        isJSSBroadsheet
          ? [st.scores?.[s.id] ?? '—', st.grades?.[s.id] || '—']
          : [st.grades?.[s.id] || '—']
      ),
      ...(isJSSBroadsheet ? [st.total_marks ?? '—', st.mean_score ?? '—'] : []),
      st.overall || '—',
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'broadsheet.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportBroadsheetPDF = () => {
    if (!broadsheet) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pw = doc.internal.pageSize.getWidth();
    let y = 10;
    const className = classes.find((c: any) => c.id === bsClassId)?.name || 'Class';
    const isJSS = isJSSBroadsheet;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pw, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('CBE PERFORMANCE BROADSHEET', pw / 2, 10, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const examPeriodLabel = bsExamPeriod === 'mid_term' ? 'Mid-Term' : bsExamPeriod === 'end_term' ? 'End-Term' : '';
    doc.text(`${className}${bsTerm ? ' · ' + bsTerm.toUpperCase() : ''}${examPeriodLabel ? ' · ' + examPeriodLabel : ''}${bsYear ? ' · ' + bsYear : ''} · Generated: ${new Date().toLocaleDateString('en-KE')}`, pw / 2, 18, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    y = 28;

    const subjects = broadsheet.subjects.slice(0, isJSS ? 9 : 10);
    const fixedCols = isJSS ? 64 + 20 + 18 : 64; // extra space for Total+Mean
    const colW = Math.min(isJSS ? 16 : 18, (pw - fixedCols - 20) / Math.max(subjects.length, 1));
    const startX = 10;
    const overallX = pw - 30;

    // Header row
    doc.setFillColor(37, 99, 235); doc.rect(startX, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('Pos', startX + 2, y + 5);
    doc.text('Student', startX + 10, y + 5);
    doc.text('Adm #', startX + 46, y + 5);
    subjects.forEach((s: any, i: number) => {
      doc.text((s.name || '').substring(0, isJSS ? 7 : 8), startX + 64 + i * colW, y + 5);
    });
    if (isJSS) {
      const totX = startX + 64 + subjects.length * colW;
      doc.text('Total', totX, y + 5);
      doc.text('Mean%', totX + 14, y + 5);
    }
    doc.text('Overall', overallX, y + 5);
    y += 7; doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    let rowBg = false;
    for (const st of broadsheet.students) {
      if (y > 190) { doc.addPage(); y = 10; }
      if (rowBg) { doc.setFillColor(245, 247, 255); doc.rect(startX, y, pw - 20, 6, 'F'); }
      doc.text(String(st.rank), startX + 2, y + 4);
      doc.text((st.name || '').substring(0, 22), startX + 10, y + 4);
      doc.text(st.admission_number || '', startX + 46, y + 4);
      subjects.forEach((s: any, i: number) => {
        if (isJSS) {
          const pct = st.scores?.[s.id];
          const g = st.grades?.[s.id] || '';
          const cell = pct !== null && pct !== undefined ? `${pct}` : (g || '—');
          doc.text(cell, startX + 64 + i * colW, y + 4);
        } else {
          doc.text(st.grades?.[s.id] || '—', startX + 64 + i * colW, y + 4);
        }
      });
      if (isJSS) {
        const totX = startX + 64 + subjects.length * colW;
        doc.text(st.total_marks != null ? String(st.total_marks) : '—', totX, y + 4);
        doc.text(st.mean_score != null ? `${st.mean_score}%` : '—', totX + 14, y + 4);
      }
      doc.text(st.overall || '—', overallX, y + 4);
      y += 6; rowBg = !rowBg;
    }
    doc.save(`broadsheet-${className.replace(/\s+/g, '-')}.pdf`);
  };

  const filteredStudents = students.filter(s =>
    studentSearch === '' ||
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'class', label: 'Class View' },
    { key: 'student', label: 'Student View' },
    { key: 'subject', label: 'Subject View' },
    { key: 'broadsheet', label: 'Broadsheet' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">CBE Analytics</h2>
        <p className="text-gray-500">Kenya Competency-Based Curriculum performance insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && overview && !loading && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {overview.students_by_level?.reduce((sum: number, l: any) => sum + parseInt(l.student_count), 0) || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Total Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{overview.active_exams || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Active Exams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {overview.pass_rate?.total > 0 ? Math.round((overview.pass_rate.passed / overview.pass_rate.total) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Pass Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {overview.students_by_level?.length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Education Levels</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Students by level - Pie */}
            {overview.students_by_level?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Students by Education Level</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={overview.students_by_level.map((l: any) => ({
                          name: getEducationLevelLabel(l.education_level),
                          value: parseInt(l.student_count)
                        }))}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, value }) => `${value}`}
                      >
                        {overview.students_by_level.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Avg by level - Bar */}
            {overview.avg_by_level?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Average Performance by Level</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={overview.avg_by_level.map((l: any) => ({
                      level: getEducationLevelLabel(l.education_level).split('(')[0].trim(),
                      avg: parseFloat(l.avg_percentage) || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="avg" name="Avg %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Class View */}
      {activeTab === 'class' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <label className="text-sm font-medium text-gray-700">Select Class</label>
              <select
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); loadClassAnalytics(e.target.value); }}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select a class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section && `(${c.section})`}</option>)}
              </select>
            </CardContent>
          </Card>

          {classAnalytics && !loading && (
            <div className="space-y-6">
              {/* Grade distribution */}
              {classAnalytics.grade_distribution?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>CBE Grade Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={classAnalytics.grade_distribution.map((g: any) => ({ grade: g.cbc_grade, count: parseInt(g.count) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Students" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Student rankings */}
              {classAnalytics.rankings?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Student Rankings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-4">Rank</th>
                            <th className="py-2 pr-4">Student</th>
                            <th className="py-2 pr-4">Avg %</th>
                            <th className="py-2">Exams</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classAnalytics.rankings.map((s: any, i: number) => (
                            <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 pr-4 font-bold text-blue-600">#{i + 1}</td>
                              <td className="py-2 pr-4">{s.first_name} {s.last_name}</td>
                              <td className="py-2 pr-4">{s.avg_percentage || 0}%</td>
                              <td className="py-2">{s.exam_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Student View */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Search Student</label>
                <Input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Name or admission number..."
                  className="mt-1"
                />
              </div>
              {studentSearch && (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {filteredStudents.slice(0, 10).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStudentId(s.id); setStudentSearch(''); loadStudentAnalytics(s.id); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                    >
                      {s.first_name} {s.last_name} <span className="text-gray-400">({s.admission_number})</span>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && <p className="px-3 py-2 text-gray-500 text-sm">No students found</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {studentAnalytics && !loading && (
            <div className="space-y-4">
              {/* Class rank */}
              {studentAnalytics.class_rank && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-blue-600">#{studentAnalytics.class_rank}</p>
                      <p className="text-sm text-gray-500">Class Rank</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {studentAnalytics.attendance?.total > 0
                          ? Math.round((studentAnalytics.attendance.present / studentAnalytics.attendance.total) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-gray-500">Attendance</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-purple-600">{studentAnalytics.grade_history?.length || 0}</p>
                      <p className="text-sm text-gray-500">Total Results</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Grade history chart */}
              {studentAnalytics.grade_history?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={studentAnalytics.grade_history.slice(0, 10).map((h: any) => ({
                        exam: h.exam_name?.slice(0, 15) || 'Exam',
                        '%': parseFloat(h.percentage) || 0,
                        subject: h.subject_name
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="%" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Results table */}
              {studentAnalytics.grade_history?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Result History</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-4">Exam</th>
                            <th className="py-2 pr-4">Subject</th>
                            <th className="py-2 pr-4">Score</th>
                            <th className="py-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentAnalytics.grade_history.map((h: any, i: number) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4">{h.exam_name}</td>
                              <td className="py-2 pr-4">{h.subject_name || '–'}</td>
                              <td className="py-2 pr-4">{h.marks_obtained}/{h.max_marks} ({h.percentage}%)</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getCBEGradeBadgeClass(h.cbc_grade)}`}>
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
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Subject View */}
      {activeTab === 'subject' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <label className="text-sm font-medium text-gray-700">Select Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => { setSelectedSubjectId(e.target.value); loadSubjectAnalytics(e.target.value); }}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select a subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </CardContent>
          </Card>

          {subjectAnalytics && !loading && (
            <div className="space-y-6">
              {/* By class */}
              {subjectAnalytics.by_class?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Performance by Class</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={subjectAnalytics.by_class.map((c: any) => ({
                        class: c.class_name,
                        avg: parseFloat(c.avg_percentage) || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="avg" name="Avg %" fill="#8b5cf6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Top & Bottom students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectAnalytics.top_students?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-green-700">Top Students</CardTitle></CardHeader>
                    <CardContent>
                      {subjectAnalytics.top_students.map((s: any, i: number) => (
                        <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                          <span className="font-medium">#{i+1} {s.first_name} {s.last_name}</span>
                          <span className="text-green-600 font-semibold">{s.avg_percentage}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {subjectAnalytics.bottom_students?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-red-700">Need Support</CardTitle></CardHeader>
                    <CardContent>
                      {subjectAnalytics.bottom_students.map((s: any, i: number) => (
                        <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.first_name} {s.last_name}</span>
                          <span className="text-red-600 font-semibold">{s.avg_percentage}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Broadsheet */}
      {activeTab === 'broadsheet' && (
        <div className="space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Class</label>
                  <select value={bsClassId} onChange={e => setBsClassId(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                    <option value="">-- Select class --</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.section && `(${c.section})`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Term</label>
                  <select value={bsTerm} onChange={e => setBsTerm(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                    <option value="">All Terms</option>
                    <option value="term1">Term 1</option>
                    <option value="term2">Term 2</option>
                    <option value="term3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Exam Period</label>
                  <select value={bsExamPeriod} onChange={e => setBsExamPeriod(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                    <option value="">All Periods</option>
                    <option value="mid_term">Mid-Term</option>
                    <option value="end_term">End-Term</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Academic Year</label>
                  <input type="text" value={bsYear} onChange={e => setBsYear(e.target.value)} placeholder="e.g. 2025" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadBroadsheet} disabled={!bsClassId || loading} className="w-full">
                    {loading ? 'Loading...' : 'Generate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {broadsheet && !loading && (
            <>
              {/* Export buttons */}
              <div className="flex gap-2 justify-end">
                <button onClick={downloadBroadsheetCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  ↓ CSV
                </button>
                <button onClick={exportBroadsheetPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                  ↓ PDF
                </button>
              </div>

              {/* Broadsheet table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Broadsheet — {classes.find((c: any) => c.id === bsClassId)?.name || ''}
                    {bsTerm && ` · ${bsTerm.toUpperCase()}`}
                    {bsExamPeriod && ` · ${bsExamPeriod === 'mid_term' ? 'Mid-Term' : 'End-Term'}`}
                    {bsYear && ` · ${bsYear}`}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({broadsheet.students?.length || 0} students · {broadsheet.subjects?.length || 0} subjects)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {broadsheet.students?.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No assessment data found for this class/term.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-blue-600 text-white">
                            <th className="px-3 py-2 text-center sticky left-0 bg-blue-600 z-10 min-w-[40px]">Pos</th>
                            <th className="px-3 py-2 text-left sticky left-10 bg-blue-600 z-10 min-w-[140px]">Student</th>
                            <th className="px-3 py-2 text-left min-w-[80px]">Adm #</th>
                            {broadsheet.subjects.map((s: any) => (
                              <th key={s.id} className="px-2 py-2 text-center min-w-[70px] whitespace-nowrap">
                                {s.name.length > 10 ? s.name.substring(0, 10) + '…' : s.name}
                              </th>
                            ))}
                            {isJSSBroadsheet && (
                              <>
                                <th className="px-3 py-2 text-center bg-blue-800 min-w-[70px] whitespace-nowrap">Total</th>
                                <th className="px-3 py-2 text-center bg-blue-800 min-w-[70px] whitespace-nowrap">Mean %</th>
                              </>
                            )}
                            <th className="px-3 py-2 text-center bg-blue-700 min-w-[90px]">Overall</th>
                          </tr>
                        </thead>
                        <tbody>
                          {broadsheet.students.map((st: any, idx: number) => (
                            <tr key={st.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-center font-bold text-blue-700 sticky left-0 bg-inherit z-10">{st.rank}</td>
                              <td className="px-3 py-2 font-medium sticky left-10 bg-inherit z-10">{st.name}</td>
                              <td className="px-3 py-2 text-gray-500">{st.admission_number}</td>
                              {broadsheet.subjects.map((s: any) => {
                                const grade = st.grades?.[s.id];
                                const score = st.scores?.[s.id];
                                return (
                                  <td key={s.id} className="px-2 py-1.5 text-center">
                                    {isJSSBroadsheet ? (
                                      score !== null && score !== undefined ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="font-semibold text-gray-800">{score}</span>
                                          {grade && (
                                            <span className={`inline-block px-1 py-0 rounded text-[10px] font-semibold ${GRADE_COLORS[grade] || 'bg-gray-100 text-gray-600'}`}>
                                              {grade}
                                            </span>
                                          )}
                                        </div>
                                      ) : grade ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${GRADE_COLORS[grade] || 'bg-gray-100 text-gray-600'}`}>
                                          {grade}
                                        </span>
                                      ) : <span className="text-gray-300">—</span>
                                    ) : (
                                      grade ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${GRADE_COLORS[grade] || 'bg-gray-100 text-gray-600'}`}>
                                          {grade}
                                        </span>
                                      ) : <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              {isJSSBroadsheet && (
                                <>
                                  <td className="px-3 py-2 text-center font-bold text-blue-900">
                                    {st.total_marks != null ? st.total_marks : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-semibold text-blue-700">
                                    {st.mean_score != null ? `${st.mean_score}%` : '—'}
                                  </td>
                                </>
                              )}
                              <td className="px-3 py-2 text-center">
                                {st.overall ? (
                                  <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${GRADE_COLORS[st.overall] || 'bg-gray-100 text-gray-600'}`}>
                                    {st.overall}
                                  </span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Grade legend */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {broadsheet.education_level === 'junior_secondary' ? (
                      <>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-green-200 text-green-900 font-semibold">EE1</span> Exceeding Expectations L1 (90–100%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">EE2</span> Exceeding Expectations L2 (75–89%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-semibold">ME1</span> Meeting Expectations L1 (58–74%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">ME2</span> Meeting Expectations L2 (41–57%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 font-semibold">AE1</span> Approaching Expectations L1 (31–40%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold">AE2</span> Approaching Expectations L2 (21–30%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-red-200 text-red-900 font-semibold">BE1</span> Below Expectations L1 (11–20%)</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">BE2</span> Below Expectations L2 (1–10%)</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">EE</span> Exceeding Expectations</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">ME</span> Meeting Expectations</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold">AE</span> Approaching Expectations</span>
                        <span className="flex items-center gap-1 text-xs"><span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">BE</span> Below Expectations</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!broadsheet && !loading && bsClassId && (
            <p className="text-center text-gray-400 py-12">Click "Generate" to load the broadsheet.</p>
          )}
          {!bsClassId && (
            <p className="text-center text-gray-400 py-12">Select a class to view the broadsheet.</p>
          )}
        </div>
      )}
    </div>
  );
}
