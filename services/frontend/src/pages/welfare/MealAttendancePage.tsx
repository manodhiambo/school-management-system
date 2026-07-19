import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Utensils, RefreshCw, AlertTriangle, Search, ScanLine } from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'supper', 'snack'];

const studentLabel = (s: any) => s.first_name ? `${s.first_name} ${s.last_name}` : (s.name || s.full_name || 'Unknown');

export function MealAttendancePage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState('lunch');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dietAlerts, setDietAlerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStudentsAndAlerts(); }, []);
  useEffect(() => { loadAttendance(); }, [date, mealType]);

  const loadStudentsAndAlerts = async () => {
    try {
      const [sRes, aRes]: any[] = await Promise.all([
        api.getStudents(),
        (api as any).getDietAlerts(),
      ]);
      setStudents(sRes?.data?.students || sRes?.data || []);
      setDietAlerts(aRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getMealAttendance({ date, meal_type: mealType });
      setAttendance(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const dietAlertFor = (studentId: string) => dietAlerts.find(d => d.student_id === studentId);

  const markAttendance = async (studentId: string, method: 'manual' | 'qr') => {
    try {
      await (api as any).markMealAttendance({ student_id: studentId, attendance_date: date, meal_type: mealType, method });
      const alert = dietAlertFor(studentId);
      if (alert) {
        toast({ title: 'Marked — dietary note', description: `${alert.allergies || ''} ${alert.dietary_requirements || ''}`.trim() });
      } else {
        toast({ title: 'Attendance marked' });
      }
      loadAttendance();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const scanBarcode = async () => {
    if (!barcode.trim()) return;
    // A USB/handheld QR scanner types the scanned value like a keyboard — the
    // scanned code is expected to be the student's own ID (e.g. printed on
    // their ID card), so this just marks attendance directly for that id.
    await markAttendance(barcode.trim(), 'qr');
    setBarcode('');
  };

  const attendedIds = new Set(attendance.map(a => a.student_id));
  const filtered = students.filter(s => studentLabel(s).toLowerCase().includes(search.toLowerCase()));

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Meal attendance is only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meal Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Track who ate, independent of wallet payment — and see dietary alerts at the point of service</p>
      </div>

      <Card><CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Meal</Label>
            <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={mealType} onChange={e => setMealType(e.target.value)}>
              {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Scan Student QR / ID</Label>
            <div className="flex gap-2 mt-1">
              <Input value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && scanBarcode()} placeholder="Scan or paste student ID" />
              <Button size="sm" onClick={scanBarcode}><ScanLine className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </CardContent></Card>

      <Badge className="bg-green-100 text-green-800">{attendance.length} marked present for {mealType}</Badge>

      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input placeholder="Search student..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const alert = dietAlertFor(s.id);
            const done = attendedIds.has(s.id);
            return (
              <Card key={s.id} className={done ? 'border-green-300' : ''}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {studentLabel(s)}
                      {alert && (
                        <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {alert.allergies ? 'Allergy' : 'Diet'}
                        </Badge>
                      )}
                    </div>
                    {alert && <div className="text-xs text-orange-600 mt-0.5">{[alert.allergies, alert.dietary_requirements].filter(Boolean).join(' · ')}</div>}
                  </div>
                  {done ? (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><Utensils className="h-3 w-3" /> Marked</Badge>
                  ) : (
                    <Button size="sm" onClick={() => markAttendance(s.id, 'manual')}>Mark Present</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
