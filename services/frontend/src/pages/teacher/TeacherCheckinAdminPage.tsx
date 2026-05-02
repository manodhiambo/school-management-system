import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  MapPin, Navigation, User, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function TeacherCheckinAdminPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getTeacherCheckins({ date });
      setData(res?.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date]);

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Teacher Attendance — ${date}`, 14, 16);
    const rows = [
      ...(data.checkins || []).map((r: any) => [
        `${r.first_name} ${r.last_name}`,
        r.status,
        r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'}) : '—',
        r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'}) : '—',
        r.checkin_lat ? `${r.checkin_lat.toFixed(4)},${r.checkin_lng?.toFixed(4)}` : '—',
      ]),
      ...(data.not_checked_in || []).map((r: any) => [
        `${r.first_name} ${r.last_name}`, 'Absent', '—', '—', '—',
      ]),
    ];
    autoTable(doc, {
      head: [['Teacher', 'Status', 'Check-in', 'Check-out', 'Location']],
      body: rows,
      startY: 22,
    });
    doc.save(`teacher-attendance-${date}.pdf`);
  };

  const { checkins = [], not_checked_in = [], summary = {} } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Teacher Check-in Records</h2>
          <p className="text-gray-500">Daily teacher attendance with GPS verification</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present',  val: summary.present || 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Late',     val: summary.late    || 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Absent',   val: summary.absent  || 0, icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50'   },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center`}>
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

      {/* Present / Late */}
      {checkins.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Checked In ({checkins.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs">
                    <th className="py-2 pr-4">Teacher</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Check-in</th>
                    <th className="py-2 pr-4">Check-out</th>
                    <th className="py-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {r.profile_photo_url ? (
                            <img src={r.profile_photo_url} className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium">{r.first_name} {r.last_name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          r.status === 'present' ? 'bg-green-100 text-green-700' :
                          r.status === 'late'    ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-sm">
                        {r.checkin_time ? new Date(r.checkin_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'}) : '—'}
                      </td>
                      <td className="py-2 pr-4 text-sm text-gray-500">
                        {r.checkout_time ? new Date(r.checkout_time).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'}) : '—'}
                      </td>
                      <td className="py-2">
                        {r.checkin_lat ? (
                          <a
                            href={`https://www.google.com/maps?q=${r.checkin_lat},${r.checkin_lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 flex items-center gap-1 text-xs hover:underline"
                          >
                            <Navigation className="h-3 w-3" /> Map
                          </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Absent / not checked in */}
      {not_checked_in.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Not Checked In ({not_checked_in.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {not_checked_in.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{t.first_name} {t.last_name}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-10"><RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>
      )}
    </div>
  );
}
