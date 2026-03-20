import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Calendar, CheckCircle, XCircle, Clock, Download, Bell,
  Loader2, CheckCircle2, AlertTriangle, Users,
} from 'lucide-react';
import { MarkAttendanceModal } from '@/components/modals/MarkAttendanceModal';
import api from '@/services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── helpers ───────────────────────────────────────────────────────────────────
const todayIso = () => new Date().toISOString().split('T')[0];
const currentYM  = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const statusColor: Record<string, string> = {
  present: 'text-green-600',
  absent:  'text-red-600',
  late:    'text-yellow-600',
  excused: 'text-blue-600',
};
const statusChar: Record<string, string> = {
  present: 'P', absent: 'A', late: 'L', excused: 'E',
};

// ─── Monthly Report Modal ───────────────────────────────────────────────────────
function MonthlyReportModal({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: any[] }) {
  const [month, setMonth] = useState(currentYM());
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const res: any = await api.getMonthlyAttendanceReport(month, classId || undefined);
      setReport(res.data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const monthLabel = new Date(report.month + '-15').toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
    const className = classes.find(c => c.id === classId)?.name || 'All Classes';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Monthly Attendance Report — ${monthLabel}`, 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Class: ${className}    School days recorded: ${report.school_days.length}`, 14, 21);

    const days = report.school_days.map((d: string) => d.slice(8)); // day numbers

    const head = [['#', 'Student', 'Adm No', ...days, 'P', 'A', 'L', '%']];
    const body = report.students.map((s: any, i: number) => [
      i + 1,
      `${s.first_name} ${s.last_name}`,
      s.admission_number,
      ...report.school_days.map((d: string) => statusChar[s.daily[d]] || '-'),
      s.present,
      s.absent,
      s.late,
      s.attendance_rate + '%',
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 26,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 36 },
        2: { cellWidth: 18 },
      },
    });

    doc.save(`attendance-${report.month}-${className.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monthly Attendance Report</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-sm">Month *</Label>
            <input
              type="month"
              value={month}
              onChange={e => { setMonth(e.target.value); setReport(null); }}
              className="block border rounded-md px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Class (optional)</Label>
            <select
              className="block border rounded-md px-3 py-2 text-sm mt-1 min-w-[160px]"
              value={classId}
              onChange={e => { setClassId(e.target.value); setReport(null); }}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button onClick={handleLoad} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Loading...' : 'Load Report'}
          </Button>
        </div>

        {report && (
          <>
            {report.students.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No attendance records found for this period.</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {[
                    { label: 'Students', value: report.students.length, color: 'text-gray-700' },
                    { label: 'School Days', value: report.school_days.length, color: 'text-blue-700' },
                    { label: 'Avg Attendance', color: 'text-green-700',
                      value: report.students.length
                        ? (report.students.reduce((s: number, r: any) => s + parseFloat(r.attendance_rate), 0) / report.students.length).toFixed(1) + '%'
                        : '—' },
                    { label: 'Total Absences', color: 'text-red-700',
                      value: report.students.reduce((s: number, r: any) => s + r.absent, 0) },
                  ].map(c => (
                    <div key={c.label} className="border rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-gray-400">{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* Attendance grid */}
                <div className="overflow-x-auto rounded-lg border mt-3">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="px-3 py-2 text-left sticky left-0 bg-blue-600 z-10">Student</th>
                        <th className="px-2 py-2 text-left">Adm No</th>
                        {report.school_days.map((d: string) => (
                          <th key={d} className="px-1 py-2 text-center min-w-[22px]">{d.slice(8)}</th>
                        ))}
                        <th className="px-2 py-2 text-center bg-green-700">P</th>
                        <th className="px-2 py-2 text-center bg-red-700">A</th>
                        <th className="px-2 py-2 text-center bg-yellow-600">L</th>
                        <th className="px-2 py-2 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.students.map((s: any) => (
                        <tr key={s.student_id} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-medium sticky left-0 bg-white">{s.first_name} {s.last_name}</td>
                          <td className="px-2 py-1.5 text-gray-400">{s.admission_number}</td>
                          {report.school_days.map((d: string) => {
                            const st = s.daily[d];
                            return (
                              <td key={d} className={`px-1 py-1.5 text-center font-medium ${statusColor[st] || 'text-gray-300'}`}>
                                {statusChar[st] || '·'}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center font-semibold text-green-700">{s.present}</td>
                          <td className="px-2 py-1.5 text-center font-semibold text-red-700">{s.absent}</td>
                          <td className="px-2 py-1.5 text-center font-semibold text-yellow-700">{s.late}</td>
                          <td className={`px-2 py-1.5 text-center font-semibold ${parseFloat(s.attendance_rate) < 75 ? 'text-red-600' : 'text-green-600'}`}>
                            {s.attendance_rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-1">P = Present · A = Absent · L = Late · E = Excused · · = No record</p>
              </>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {report && report.students.length > 0 && (
            <Button onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Absent Notifications Modal ─────────────────────────────────────────────────
function AbsentNotificationsModal({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: any[] }) {
  const [date, setDate] = useState(todayIso());
  const [classId, setClassId] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [absentStudents, setAbsentStudents] = useState<any[] | null>(null);
  const [result, setResult] = useState<any>(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setAbsentStudents(null);
    setResult(null);
    try {
      const res: any = await api.getAbsentPreview(date, classId || undefined);
      setAbsentStudents(res.data || []);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!absentStudents?.length) return;
    setSendLoading(true);
    try {
      const res: any = await api.notifyAbsentStudents({ date, classId: classId || undefined });
      setResult(res.data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to send notifications');
    } finally {
      setSendLoading(false);
    }
  };

  const reset = () => {
    setAbsentStudents(null);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Absence Notifications</DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm">Date *</Label>
                  <input
                    type="date"
                    value={date}
                    max={todayIso()}
                    onChange={e => { setDate(e.target.value); reset(); }}
                    className="block w-full border rounded-md px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">Class (optional)</Label>
                  <select
                    className="block w-full border rounded-md px-3 py-2 text-sm mt-1"
                    value={classId}
                    onChange={e => { setClassId(e.target.value); reset(); }}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                {previewLoading ? 'Loading...' : 'Preview Absent Students'}
              </Button>

              {absentStudents !== null && (
                <div>
                  {absentStudents.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      No absent students found for this date. Nothing to notify.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm mb-2">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>{absentStudents.length} absent student(s) found. Notifications will be sent to linked parents via in-app alerts.</span>
                      </div>
                      <div className="border rounded-md max-h-52 overflow-y-auto divide-y">
                        {absentStudents.map((s: any) => (
                          <div key={s.student_id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div>
                              <span className="font-medium">{s.first_name} {s.last_name}</span>
                              <span className="text-gray-400 text-xs ml-2">{s.admission_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {s.class_name && <span className="text-xs text-gray-400">{s.class_name}</span>}
                              <Badge variant="destructive" className="text-[10px]">Absent</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sendLoading || !absentStudents?.length}
              >
                {sendLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                  : <><Bell className="h-4 w-4 mr-2" /> Send {absentStudents?.length ? `(${absentStudents.length})` : ''} Notifications</>}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Result view */
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-800">Notifications Sent</h3>
              <p className="text-sm text-gray-500 mt-1">
                {result.students.length} student(s) · {result.sent} parent alert(s) created
              </p>
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
              {result.students.map((s: any) => (
                <div key={s.student_id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-gray-400">
                    {s.parents_notified} parent{s.parents_notified !== 1 ? 's' : ''} notified
                    {s.parents_notified === 0 && <span className="text-amber-500 ml-1">(no linked parents)</span>}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => { onClose(); reset(); }}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function AttendancePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [statsRes, classRes]: any[] = await Promise.all([
        api.getAttendanceStatistics(),
        api.getClasses(),
      ]);
      setStats(statsRes.data || {});
      setClasses(classRes.data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      setStats({});
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

  const totalDays = stats?.total || 0;
  const presentDays = stats?.present || 0;
  const absentDays = stats?.absent || 0;
  const lateDays = stats?.late || 0;
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Attendance Management</h2>
          <p className="text-gray-500">Track and manage student attendance</p>
        </div>
        <Button onClick={() => setShowMarkModal(true)}>
          <Calendar className="mr-2 h-4 w-4" />
          Mark Attendance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Total Records</span>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Present</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Absent</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Late</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lateDays}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {attendancePercentage}%
              </div>
              <p className="text-gray-500 mt-2">Overall attendance rate</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${attendancePercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline" onClick={() => setShowMarkModal(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Mark Today's Attendance
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowReportModal(true)}>
              <Download className="mr-2 h-4 w-4" />
              Download Monthly Report
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowNotifyModal(true)}>
              <Bell className="mr-2 h-4 w-4" />
              Send Absence Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      <MarkAttendanceModal
        open={showMarkModal}
        onOpenChange={setShowMarkModal}
        onSuccess={loadAll}
      />

      <MonthlyReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        classes={classes}
      />

      <AbsentNotificationsModal
        open={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        classes={classes}
      />
    </div>
  );
}
