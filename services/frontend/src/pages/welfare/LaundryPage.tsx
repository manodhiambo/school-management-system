import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Shirt, Plus, RefreshCw } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  collected: 'bg-gray-100 text-gray-700',
  washing:   'bg-blue-100 text-blue-800',
  ready:     'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  missing:   'bg-red-100 text-red-800',
};

const STATUS_FLOW: Record<string, string> = { collected: 'washing', washing: 'ready', ready: 'delivered' };

const EMPTY_FORM = { student_id: '', items_count: '', expected_delivery: '', charge_amount: '', notes: '' };

const studentLabel = (s: any) => s.first_name ? `${s.first_name} ${s.last_name}` : (s.name || s.full_name || 'Unknown');

export function LaundryPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, sRes]: any[] = await Promise.all([
        (api as any).getLaundryBatches(statusFilter ? { status: statusFilter } : undefined),
        api.getStudents(),
      ]);
      setBatches(bRes?.data || []);
      setStudents(sRes?.data?.students || sRes?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createBatch = async () => {
    try {
      await (api as any).createLaundryBatch(form);
      toast({ title: 'Laundry collection logged' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const advanceStatus = async (batch: any) => {
    const next = STATUS_FLOW[batch.status];
    if (!next) return;
    try {
      await (api as any).updateLaundryBatch(batch.id, { status: next });
      toast({ title: `Marked as ${next}` });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const markMissing = async (batch: any) => {
    const missing = prompt('Describe the missing item(s):');
    if (missing == null) return;
    try {
      await (api as any).updateLaundryBatch(batch.id, { status: 'missing', missing_items: missing });
      toast({ title: 'Marked missing items' });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Laundry management is only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laundry Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track laundry collection, washing, delivery and charges</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Log Collection
        </Button>
      </div>

      {showForm && (
        <Card><CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Student</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <Label>Items Count</Label>
              <Input type="number" className="mt-1" value={form.items_count}
                onChange={e => setForm(f => ({ ...f, items_count: e.target.value }))} />
            </div>
            <div>
              <Label>Expected Delivery</Label>
              <Input type="date" className="mt-1" value={form.expected_delivery}
                onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} />
            </div>
            <div>
              <Label>Charge (KES)</Label>
              <Input type="number" className="mt-1" value={form.charge_amount}
                onChange={e => setForm(f => ({ ...f, charge_amount: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input className="mt-1" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={createBatch}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="flex gap-2">
        {['', 'collected', 'washing', 'ready', 'delivered', 'missing'].map(s => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No laundry batches recorded</div>
      ) : (
        <div className="space-y-2">
          {batches.map(b => (
            <Card key={b.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shirt className="h-8 w-8 text-blue-400" />
                  <div>
                    <div className="font-medium">{b.student_name} <span className="text-gray-400 font-normal text-sm">({b.admission_number})</span></div>
                    <div className="text-xs text-gray-500">
                      {b.items_count} items · collected {b.collected_at?.slice(0, 10)}
                      {b.room_number && ` · Room ${b.room_number}`}
                      {b.charge_amount > 0 && ` · KES ${b.charge_amount}`}
                    </div>
                    {b.missing_items && <div className="text-xs text-red-600 mt-0.5">Missing: {b.missing_items}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_STYLES[b.status] || ''}>{b.status}</Badge>
                  {STATUS_FLOW[b.status] && (
                    <Button size="sm" variant="outline" onClick={() => advanceStatus(b)}>
                      Mark {STATUS_FLOW[b.status]}
                    </Button>
                  )}
                  {b.status !== 'missing' && b.status !== 'delivered' && (
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => markMissing(b)}>
                      Missing Items
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
