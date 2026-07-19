import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

type Session = 'morning' | 'evening' | 'night';

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent:  'bg-red-100 text-red-800',
  late:    'bg-yellow-100 text-yellow-800',
};

export function RollCallPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [hostels, setHostels] = useState<any[]>([]);
  const [hostelId, setHostelId] = useState('');
  const [session, setSession] = useState<Session>('evening');
  const [rollCall, setRollCall] = useState<any>(null);
  const [missingToday, setMissingToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => { loadHostels(); loadMissing(); }, []);

  const loadHostels = async () => {
    try {
      const res: any = await (api as any).getHostels();
      const list = res?.data || [];
      setHostels(list);
      if (list.length && !hostelId) setHostelId(list[0].id);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadMissing = async () => {
    try {
      const res: any = await (api as any).getMissingStudentsToday();
      setMissingToday(res?.data || []);
    } catch { /* non-critical */ }
  };

  const startRollCall = async () => {
    if (!hostelId) return;
    setStarting(true);
    try {
      const res: any = await (api as any).createRollCall({ hostel_id: hostelId, session });
      setRollCall(res?.data || null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setStarting(false); }
  };

  const markEntry = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!rollCall) return;
    setLoading(true);
    try {
      await (api as any).markRollCallEntry(rollCall.id, studentId, { status });
      const res: any = await (api as any).getRollCall(rollCall.id);
      setRollCall(res?.data || null);
      loadMissing();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Roll call is only available to administrators.</div>;
  }

  const entries = rollCall?.entries || [];
  const counts = {
    present: entries.filter((e: any) => e.status === 'present').length,
    absent: entries.filter((e: any) => e.status === 'absent').length,
    late: entries.filter((e: any) => e.status === 'late').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roll Call & Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Take morning, evening or night roll call for boarders</p>
      </div>

      {missingToday.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
              <AlertTriangle className="h-4 w-4" /> Missing Students Today
            </div>
            <div className="space-y-1">
              {missingToday.map((m: any) => (
                <div key={`${m.student_id}-${m.session}`} className="text-sm text-red-800">
                  {m.student_name} ({m.admission_number}) — {m.hostel_name}, {m.session} roll call
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Dormitory</Label>
            <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={hostelId} onChange={e => { setHostelId(e.target.value); setRollCall(null); }}>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Session</Label>
            <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={session} onChange={e => { setSession(e.target.value as Session); setRollCall(null); }}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={startRollCall} disabled={starting || !hostelId}>
              <ClipboardCheck className="h-4 w-4 mr-2" /> {rollCall ? 'Refresh' : 'Start Roll Call'}
            </Button>
          </div>
        </div>
      </CardContent></Card>

      {starting && <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>}

      {rollCall && !starting && (
        <div className="space-y-3">
          <div className="flex gap-3 text-sm">
            <Badge className="bg-green-100 text-green-800">{counts.present} Present</Badge>
            <Badge className="bg-red-100 text-red-800">{counts.absent} Absent</Badge>
            <Badge className="bg-yellow-100 text-yellow-800">{counts.late} Late</Badge>
          </div>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No students currently allocated to this dormitory</div>
          ) : (
            <div className="space-y-2">
              {entries.map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{e.student_name}</div>
                      <div className="text-xs text-gray-400">{e.admission_number}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_STYLES[e.status] || ''}>{e.status}</Badge>
                      <Button size="sm" variant="outline" disabled={loading} onClick={() => markEntry(e.student_id, 'present')}>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={loading} onClick={() => markEntry(e.student_id, 'late')}>
                        <Clock className="h-3 w-3 text-yellow-600" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={loading} onClick={() => markEntry(e.student_id, 'absent')}>
                        <XCircle className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
