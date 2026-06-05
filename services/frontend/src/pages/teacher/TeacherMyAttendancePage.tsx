import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, LogIn, LogOut, MapPin, Clock, AlertTriangle,
  Calendar, TrendingUp, History,
} from 'lucide-react';
import api from '@/services/api';

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late:    'bg-amber-100 text-amber-700',
  absent:  'bg-red-100 text-red-700',
};

export function TeacherMyAttendancePage() {
  const [status, setStatus]   = useState<any>(null);
  const [hours, setHours]     = useState<any>({ start: '08:00', late_after: '08:15', end: '17:00' });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [gpsMsg, setGpsMsg]   = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStatus();
    loadHours();
    loadHistory();
  }, []);

  const loadStatus = async () => {
    try {
      const res: any = await (api as any).getMyCheckinStatus();
      setStatus(res?.data || null);
    } catch { /* silent */ }
  };

  const loadHours = async () => {
    try {
      const res: any = await (api as any).getCheckinSchoolHours();
      if (res?.data) setHours(res.data);
    } catch { /* silent */ }
  };

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res: any = await (api as any).getTeacherCheckinHistory({ limit: 30 });
      const raw = res?.data || res || [];
      setHistory(Array.isArray(raw) ? raw : raw.checkins || []);
    } catch { /* silent */ } finally {
      setHistLoading(false);
    }
  };

  const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { setGpsMsg('GPS not supported'); resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        p => { setGpsMsg(''); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        err => {
          setGpsMsg(err.code === 1
            ? 'Location blocked — check-in recorded without GPS'
            : 'Location unavailable — check-in recorded without GPS');
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    });

  const handleCheckin = async () => {
    setLoading(true); setMessage('');
    try {
      const coords = await getCoords();
      const res: any = await (api as any).teacherCheckin({ latitude: coords?.lat, longitude: coords?.lng });
      setMessage(res?.status === 'late' ? '⚠️ Checked in — marked Late' : '✓ Checked in — On Time');
      loadStatus();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.message || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const handleCheckout = async () => {
    setLoading(true); setMessage('');
    try {
      const coords = await getCoords();
      await (api as any).teacherCheckout({ latitude: coords?.lat, longitude: coords?.lng });
      setMessage('✓ Signed out successfully');
      loadStatus();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Sign-out failed');
    } finally { setLoading(false); }
  };

  const now         = new Date();
  const timeStr     = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const dateStr     = now.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });
  const isCheckedIn  = !!status?.checkin_time;
  const isCheckedOut = !!status?.checkout_time;
  const nowMins      = now.getHours() * 60 + now.getMinutes();
  const [eh, em]     = (hours.end || '17:00').split(':').map(Number);
  const isClosed     = nowMins >= eh * 60 + em;

  const fmtTime = (t: string | null) =>
    t ? new Date(t).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }) : d;

  // Summary stats from history
  const totalDays    = history.length;
  const presentDays  = history.filter(h => h.status === 'present').length;
  const lateDays     = history.filter(h => h.status === 'late').length;
  const absentDays   = history.filter(h => h.status === 'absent').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
        <p className="text-sm text-gray-500">{dateStr} · {timeStr}</p>
      </div>

      {/* Today's card */}
      <Card className="border-2 border-indigo-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-indigo-600" />
            Today's Check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-4 flex-wrap">
            {isCheckedIn ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">
                    {status?.status === 'late' ? 'Checked in — Late' : 'Checked in — On Time'}
                  </p>
                  <p className="text-xs text-green-600">at {fmtTime(status?.checkin_time)}</p>
                </div>
              </div>
            ) : isClosed ? (
              <div className="flex items-center gap-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="font-semibold text-sm">Check-in closed for today</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <Clock className="h-5 w-5" />
                <p className="text-sm">Not checked in yet</p>
              </div>
            )}

            {isCheckedOut && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <LogOut className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">Signed out</p>
                  <p className="text-xs text-blue-600">at {fmtTime(status?.checkout_time)}</p>
                </div>
              </div>
            )}
          </div>

          {/* GPS info */}
          {status?.checkin_lat && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <a
                href={`https://maps.google.com/?q=${status.checkin_lat},${status.checkin_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View check-in location on map
              </a>
            </div>
          )}

          {gpsMsg && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {gpsMsg}
            </p>
          )}
          {message && (
            <p className={`text-sm font-medium ${message.startsWith('⚠️') ? 'text-amber-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            {!isCheckedIn && !isClosed && (
              <Button onClick={handleCheckin} disabled={loading} className="flex-1">
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Checking in...' : 'Check In Now'}
              </Button>
            )}
            {isCheckedIn && !isCheckedOut && (
              <Button variant="outline" onClick={handleCheckout} disabled={loading} className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                {loading ? 'Signing out...' : 'Sign Out'}
              </Button>
            )}
          </div>

          {/* School hours reference */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex gap-4">
            <span>Opens: <strong className="text-gray-700">{hours.start}</strong></span>
            <span>Late after: <strong className="text-amber-600">{hours.late_after}</strong></span>
            <span>Closes: <strong className="text-gray-700">{hours.end}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      {totalDays > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Days', value: totalDays, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
            { label: 'Present', value: presentDays, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
            { label: 'Late', value: lateDays, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
            { label: 'Absent', value: absentDays, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
          ].map(s => (
            <Card key={s.label} className={`border ${s.border} ${s.bg}`}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`text-xs font-medium ${s.color} opacity-70`}>{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Recent Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {histLoading ? (
            <div className="py-10 text-center text-gray-400 text-sm">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No attendance history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Check In</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Check Out</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{fmtDate(h.checkin_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtTime(h.checkin_time)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtTime(h.checkout_time)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-600'}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
