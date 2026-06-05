import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText, Users, TrendingUp, DollarSign, Download,
  Printer, BarChart2, CheckCircle, RefreshCw,
} from 'lucide-react';
import api from '@/services/api';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const CURRENT_YEAR = new Date().getFullYear().toString();

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TermReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'class' | 'student'>('summary');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [classReport, setClassReport] = useState<any>(null);
  const [studentReport, setStudentReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadSummary(); }, [term, academicYear]);
  useEffect(() => { if (selectedClass) loadClassReport(); }, [selectedClass, term, academicYear]);
  useEffect(() => { if (selectedStudent) loadStudentReport(); }, [selectedStudent, term, academicYear]);

  const loadMeta = async () => {
    try {
      const [cls, stu]: any[] = await Promise.all([api.getClasses(), api.getStudents({ limit: 1000 })]);
      setClasses(cls?.data || cls?.classes || []);
      setStudents(stu?.data || stu?.students || []);
    } catch { /* silent */ }
  };

  const loadSummary = async () => {
    try {
      const res: any = await api.getTermReportSummary({ term, academic_year: academicYear });
      setSummary(res?.data || null);
    } catch { setSummary(null); }
  };

  const loadClassReport = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res: any = await api.getTermReportClass(selectedClass, { term, academic_year: academicYear });
      setClassReport(res?.data || null);
    } catch { setClassReport(null); } finally { setLoading(false); }
  };

  const loadStudentReport = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const res: any = await api.getTermReportStudent(selectedStudent, { term, academic_year: academicYear });
      setStudentReport(res?.data || null);
    } catch { setStudentReport(null); } finally { setLoading(false); }
  };

  const generateAll = async () => {
    if (!confirm(`Generate term reports for all classes — ${term} ${academicYear}?`)) return;
    setGenerating(true);
    try {
      await api.generateAllTermReports({ term, academic_year: academicYear });
      setGenerated(true);
      setTimeout(() => setGenerated(false), 4000);
    } catch (e: any) { alert(e?.message || 'Generation failed'); } finally { setGenerating(false); }
  };

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows?.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const printSection = () => window.print();

  const TABS = [
    { key: 'summary', label: 'School Summary', icon: BarChart2 },
    { key: 'class',   label: 'Class Report',   icon: Users },
    { key: 'student', label: 'Student Report',  icon: FileText },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Term Reports</h2>
          <p className="text-sm text-gray-500">Generate comprehensive end-of-term reports</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {generated && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" /> Reports generated!
            </span>
          )}
          <Button variant="outline" size="sm" onClick={generateAll} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate All Reports'}
          </Button>
        </div>
      </div>

      {/* Period controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Academic Year</Label>
              <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-32 mt-1" placeholder="2025" />
            </div>
            <div>
              <Label>Term</Label>
              <select value={term} onChange={e => setTerm(e.target.value)} className="border rounded-md px-3 py-2 text-sm mt-1">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={loadSummary}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          {summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Enrolled" value={summary.total_students} icon={Users} color="bg-indigo-500" />
                <StatCard label="Avg Attendance %" value={summary.avg_attendance_pct ? `${Number(summary.avg_attendance_pct).toFixed(1)}%` : '—'} icon={TrendingUp} color="bg-green-500" />
                <StatCard label="Fees Collected (KES)" value={summary.total_fees_collected ? Number(summary.total_fees_collected).toLocaleString() : '—'} icon={DollarSign} color="bg-blue-500" />
                <StatCard label="Outstanding (KES)" value={summary.total_outstanding ? Number(summary.total_outstanding).toLocaleString() : '—'} icon={DollarSign} color="bg-amber-500" />
              </div>

              {summary.top_classes?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top Performing Classes</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Rank</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Marks</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Students</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {summary.top_classes.map((c: any, i: number) => (
                          <tr key={c.class_id || i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">#{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{c.class_name}</td>
                            <td className="px-4 py-3 text-indigo-700 font-semibold">{c.avg_marks ? Number(c.avg_marks).toFixed(1) : '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{c.student_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No summary data available. Select term & year above then click Refresh.</p>
            </div>
          )}
        </div>
      )}

      {/* Class Report Tab */}
      {activeTab === 'class' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Select Class</Label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm mt-1">
                <option value="">-- Choose a class --</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
              </select>
            </div>
            {classReport?.students?.length > 0 && (
              <div className="flex gap-2 mt-5">
                <Button variant="outline" size="sm" onClick={() => exportCSV(classReport.students, `class-report-${term.replace(' ','-')}.csv`)}>
                  <Download className="h-4 w-4 mr-2" />CSV
                </Button>
                <Button variant="outline" size="sm" onClick={printSection}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
              </div>
            )}
          </div>

          {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>}

          {!loading && classReport && (
            <div ref={printRef}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{classReport.class_info?.name} — {term} {academicYear}</h3>
                  <p className="text-sm text-gray-500">{classReport.students?.length} students</p>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Rank</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Adm No.</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Marks</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Attendance %</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Fee Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classReport.students?.map((s: any, i: number) => (
                          <tr key={s.student_id || i} className={`hover:bg-gray-50 ${i < 3 ? 'font-medium' : ''}`}>
                            <td className="px-4 py-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                i === 1 ? 'bg-gray-100 text-gray-700' :
                                i === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-500'
                              }`}>{i + 1}</span>
                            </td>
                            <td className="px-4 py-3">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.admission_number || '—'}</td>
                            <td className="px-4 py-3 text-indigo-700 font-semibold">{s.avg_marks ? Number(s.avg_marks).toFixed(1) : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                s.grade === 'A' ? 'bg-green-100 text-green-700' :
                                s.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                s.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>{s.grade || '—'}</span>
                            </td>
                            <td className="px-4 py-3">{s.attendance_pct != null ? `${Number(s.attendance_pct).toFixed(1)}%` : '—'}</td>
                            <td className={`px-4 py-3 font-medium ${Number(s.fee_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {s.fee_balance != null ? `KES ${Number(s.fee_balance).toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {!loading && !classReport && selectedClass && (
            <div className="text-center py-10 text-gray-400">No report data available for this class and term.</div>
          )}
        </div>
      )}

      {/* Student Report Tab */}
      {activeTab === 'student' && (
        <div className="space-y-4">
          <div className="flex-1 min-w-[200px]">
            <Label>Select Student</Label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm mt-1 max-w-sm">
              <option value="">-- Choose a student --</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.class_name || 'No class'}</option>)}
            </select>
          </div>

          {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>}

          {!loading && studentReport && (
            <div className="space-y-5">
              {/* Student info header */}
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {studentReport.student?.first_name} {studentReport.student?.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {studentReport.student?.class_name} · Adm: {studentReport.student?.admission_number || '—'}
                      </p>
                      <p className="text-sm text-indigo-600 font-medium mt-1">{term} {academicYear}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={printSection}><Printer className="h-4 w-4 mr-2" />Print Report</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Days" value={studentReport.attendance?.total_days} icon={Users} color="bg-gray-500" />
                <StatCard label="Present" value={studentReport.attendance?.present} icon={CheckCircle} color="bg-green-500" />
                <StatCard label="Absent" value={studentReport.attendance?.absent} icon={TrendingUp} color="bg-red-500" />
                <StatCard label="Attendance %" value={studentReport.attendance?.percentage ? `${Number(studentReport.attendance.percentage).toFixed(1)}%` : '—'} icon={BarChart2} color="bg-indigo-500" />
              </div>

              {/* Subject performance */}
              {studentReport.subjects_performance?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Subject Performance</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Marks</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Max</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">%</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {studentReport.subjects_performance.map((s: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{s.subject_name}</td>
                            <td className="px-4 py-3">{s.marks ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-500">{s.max_marks ?? '—'}</td>
                            <td className="px-4 py-3">{s.percentage != null ? `${Number(s.percentage).toFixed(1)}%` : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                s.grade === 'A' ? 'bg-green-100 text-green-700' :
                                s.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                s.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>{s.grade || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Fee summary */}
              {studentReport.fee_summary && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Fee Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-gray-800">KES {Number(studentReport.fee_summary.total_billed || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Billed</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xl font-bold text-green-700">KES {Number(studentReport.fee_summary.total_paid || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Paid</p>
                      </div>
                      <div className={`rounded-lg p-3 ${Number(studentReport.fee_summary.balance) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-xl font-bold ${Number(studentReport.fee_summary.balance) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          KES {Number(studentReport.fee_summary.balance || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Balance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remarks */}
              {studentReport.general_remarks && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Class Teacher's Remarks</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-gray-700 italic">"{studentReport.general_remarks}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
