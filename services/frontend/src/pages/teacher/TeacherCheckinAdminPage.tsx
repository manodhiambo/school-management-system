import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  MapPin, Navigation, User, Download, Wifi
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function TeacherCheckinAdminPage() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string>('');
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours]         = useState<any>({ start: '08:00', late_after: '08:15', end: '17:00' });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load check-ins and school hours independently so one failure does not blank the other
      const checkinRes: any = await (api as any).getTeacherCheckins({ date });
      setData(checkinRes?.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      const msg = err?.message || err?.error || 'Failed to load check-in data';
      setError(msg);
    } finally {
      setLoading(false);
    }
    // Fetch hours separately — non-critical, failure is silent
    try {
      const hoursRes: any = await (api as any).getCheckinSchoolHours();
      if (hoursRes?.data) setHours(hoursRes.data);
    } catch { /* use defaults */ }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 45 seconds when viewing today
  useEffect(() => {
    if (!autoRefresh) return;
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return;
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, [date, autoRefresh, load]);

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Teacher Attendance — ${date}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`School hours: ${hours.start} – ${hours.end}  |  Late after: ${hours.late_after}`, 14, 23);
    const rows = [
      ...(data.checkins || []).map((r: any) => [
        `${r.first_name} ${r.last_name}`,
        r.status === 'present' ? 'Present' : r.status === 'late' ? 'Late' : r.status,
        r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—',
        r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—',
        r.checkin_lat ? `${Number(r.checkin_lat).toFixed(5)}, ${Number(r.checkin_lng).toFixed(5)}` : '—',
      ]),
      ...(data.not_checked_in || []).map((r: any) => [
        `${r.first_name} ${r.last_name}`, 'Absent', '—', '—', '—',
      ]),
    ];
    autoTable(doc, {
      head: [['Teacher', 'Status', 'Check-in', 'Check-out', 'GPS Coordinates']],
      body: rows,
      startY: 27,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] as [number, number, number] },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 1) {
          if (d.cell.raw === 'Present') d.cell.styles.textColor = [22, 163, 74];
          else if (d.cell.raw === 'Late') d.cell.styles.textColor = [217, 119, 6];
          else if (d.cell.raw === 'Absent') d.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
    doc.save(`teacher-attendance-${date}.pdf`);
  };

  const { checkins = [], not_checked_in = [], summary = {} } = data || {};
  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold">Teacher Check-in</h2>
          <p className="text-gray-500">Daily attendance with GPS verification</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
          <button
            onClick={() => setAutoRefresh(v => !v)}
            title={autoRefresh ? 'Auto-refresh ON (every 45s)' : 'Auto-refresh OFF'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              autoRefresh && isToday ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <Wifi className="h-3.5 w-3.5" />
            {autoRefresh && isToday ? 'Live' : 'Manual'}
          </button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* School hours bar */}
      <div className="flex items-center gap-4 flex-wrap p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Clock className="h-4 w-4 text-blue-500 shrink-0" />
        <span>Check-in opens: <strong>{hours.start}</strong></span>
        <span className="text-amber-700">Late after: <strong>{hours.late_after}</strong></span>
        <span>Closes: <strong>{hours.end}</strong></span>
        <span className="ml-auto text-xs text-blue-500">
          Refreshed: {lastRefresh.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not load check-in data</p>
            <p className="text-xs mt-0.5 text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present',  val: summary.present || 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Late',     val: summary.late    || 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Absent',   val: summary.absent  || 0, icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'   },
          { label: 'Total',    val: summary.total   || 0, icon: User,         color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`border ${s.border}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Checked-in teachers */}
      {checkins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Checked In ({checkins.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Arrived</th>
                    <th className="py-3 px-4">Signed Out</th>
                    <th className="py-3 px-4">GPS Location</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {r.profile_photo_url ? (
                            <img src={r.profile_photo_url} className="h-8 w-8 rounded-full object-cover shrink-0" alt="" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{r.first_name} {r.last_name}</p>
                            <p className="text-xs text-gray-400">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === 'present' ? 'bg-green-100 text-green-700' :
                          r.status === 'late'    ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status === 'present' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {r.status === 'present' ? 'On Time' : r.status === 'late' ? 'Late' : r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.checkin_time ? (
                          <div>
                            <p className="font-semibold text-gray-900 text-base">
                              {new Date(r.checkin_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(r.checkin_time).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {r.checkout_time
                          ? new Date(r.checkout_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-xs text-gray-300">Still in school</span>}
                      </td>
                      <td className="py-3 px-4">
                        {r.checkin_lat ? (
                          <div className="space-y-0.5">
                            <a
                              href={`https://www.google.com/maps?q=${r.checkin_lat},${r.checkin_lng}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                            >
                              <Navigation className="h-3.5 w-3.5" /> Open in Maps
                            </a>
                            <p className="text-[10px] text-gray-400">
                              {Number(r.checkin_lat).toFixed(5)}, {Number(r.checkin_lng).toFixed(5)}
                            </p>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" /> No GPS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not checked in */}
      {not_checked_in.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-5 w-5 text-red-500" />
              Not Checked In ({not_checked_in.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {not_checked_in.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{t.first_name} {t.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{t.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for today */}
      {!loading && !error && checkins.length === 0 && not_checked_in.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No teacher data found for {date}</p>
            <p className="text-xs text-gray-400 mt-1">Teachers with role "teacher" will appear here once they check in or are detected as absent.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
        </div>
      )}
    </div>
  );
}
