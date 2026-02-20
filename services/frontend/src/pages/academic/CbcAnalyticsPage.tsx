import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import api from '@/services/api';
import { getCBCGradeBadgeClass, getEducationLevelLabel } from '@/utils/cbcGrades';

type Tab = 'overview' | 'class' | 'student' | 'subject';

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

  const filteredStudents = students.filter(s =>
    studentSearch === '' ||
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'class', label: 'Class View' },
    { key: 'student', label: 'Student View' },
    { key: 'subject', label: 'Subject View' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">CBC Analytics</h2>
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
                  <CardHeader><CardTitle>CBC Grade Distribution</CardTitle></CardHeader>
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
    </div>
  );
}
