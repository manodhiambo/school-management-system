import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { ClipboardList, Plus, RefreshCw, Star } from 'lucide-react';

const EMPTY_FORM = { room_id: '', inspection_date: '', cleanliness_score: '5', damages: '', student_remarks: '' };

const scoreColor = (score: number) => {
  if (score >= 4) return 'bg-green-100 text-green-800';
  if (score >= 3) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export function DormitoryInspectionPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [rooms, setRooms] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => { loadHostels(); loadInspections(); }, []);

  const loadHostels = async () => {
    try {
      const res: any = await (api as any).getHostels();
      const list = res?.data || [];
      const allRooms: any[] = [];
      for (const h of list) {
        const r: any = await (api as any).getHostelRooms(h.id);
        (r?.data || []).forEach((room: any) => allRooms.push({ ...room, hostel_name: h.name }));
      }
      setRooms(allRooms);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const loadInspections = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getInspections();
      setInspections(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createInspection = async () => {
    if (!form.room_id) return;
    try {
      await (api as any).createInspection({ ...form, cleanliness_score: parseInt(form.cleanliness_score, 10) });
      toast({ title: 'Inspection recorded' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      loadInspections();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Dormitory inspections are only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dormitory Inspections</h1>
          <p className="text-sm text-gray-500 mt-1">Scheduled inspections, cleanliness scores, damages and remarks</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Log Inspection
        </Button>
      </div>

      {showForm && (
        <Card><CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Room</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
                <option value="">Select room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.hostel_name} · Room {r.room_number}</option>)}
              </select>
            </div>
            <div>
              <Label>Inspection Date</Label>
              <Input type="date" className="mt-1" value={form.inspection_date}
                onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} />
            </div>
            <div>
              <Label>Cleanliness Score (1–5)</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.cleanliness_score} onChange={e => setForm(f => ({ ...f, cleanliness_score: e.target.value }))}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Damages</Label>
              <Input className="mt-1" placeholder="Any damages found" value={form.damages}
                onChange={e => setForm(f => ({ ...f, damages: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Student Remarks</Label>
              <Input className="mt-1" value={form.student_remarks}
                onChange={e => setForm(f => ({ ...f, student_remarks: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={createInspection}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No inspections recorded yet</div>
      ) : (
        <div className="space-y-2">
          {inspections.map(i => (
            <Card key={i.id}>
              <CardContent className="py-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <ClipboardList className="h-8 w-8 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-medium">{i.hostel_name} — Room {i.room_number}</div>
                    <div className="text-xs text-gray-500">
                      {i.inspection_date?.slice(0, 10)} · Inspected by {i.inspected_by_name || 'Staff'}
                    </div>
                    {i.damages && <div className="text-sm text-red-600 mt-1">Damages: {i.damages}</div>}
                    {i.student_remarks && <div className="text-sm text-gray-600 mt-0.5 italic">"{i.student_remarks}"</div>}
                  </div>
                </div>
                <Badge className={`flex items-center gap-1 ${scoreColor(i.cleanliness_score)}`}>
                  <Star className="h-3 w-3" /> {i.cleanliness_score}/5
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
