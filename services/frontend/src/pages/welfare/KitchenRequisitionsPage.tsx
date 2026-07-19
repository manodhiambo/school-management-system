import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { ClipboardList, Plus, RefreshCw, X } from 'lucide-react';

const urgencyColor = (u: string) => ({
  low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-800',
}[u] || 'bg-gray-100 text-gray-700');

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800', converted_to_rfq: 'bg-purple-100 text-purple-700',
  converted_to_po: 'bg-indigo-100 text-indigo-700', cancelled: 'bg-gray-100 text-gray-500',
}[s] || 'bg-gray-100 text-gray-700');

const EMPTY_ITEM = { item_name: '', quantity: '', unit: '', estimated_unit_cost: '' };
const EMPTY_FORM = { required_date: '', urgency: 'medium', reason: '', notes: '' };

export function KitchenRequisitionsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role || '');

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getKitchenRequisitions();
      setList(res?.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const addItemRow = () => setItems(rows => [...rows, { ...EMPTY_ITEM }]);
  const removeItemRow = (i: number) => setItems(rows => rows.filter((_, idx) => idx !== i));
  const updateItemRow = (i: number, field: string, value: string) =>
    setItems(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const create = async () => {
    const validItems = items.filter(i => i.item_name && i.quantity);
    if (!validItems.length) {
      toast({ title: 'Add at least one item', variant: 'destructive' });
      return;
    }
    try {
      await (api as any).createKitchenRequisition({ ...form, items: validItems });
      toast({ title: 'Requisition submitted — now visible in Procurement' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setItems([{ ...EMPTY_ITEM }]);
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-400">Kitchen requisitions are only available to administrators.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Requisitions</h1>
          <p className="text-sm text-gray-500 mt-1">Requests flow through the same Procurement approval pipeline (PR → RFQ → PO → GRN)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> New Requisition
        </Button>
      </div>

      {showForm && (
        <Card><CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Required By</Label>
              <Input type="date" className="mt-1" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} />
            </div>
            <div>
              <Label>Urgency</Label>
              <select className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <Label>Reason</Label>
              <Input className="mt-1" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Items</Label>
            <div className="space-y-2 mt-1">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  <Input placeholder="Item name" className="sm:col-span-2" value={it.item_name} onChange={e => updateItemRow(i, 'item_name', e.target.value)} />
                  <Input type="number" placeholder="Qty" value={it.quantity} onChange={e => updateItemRow(i, 'quantity', e.target.value)} />
                  <Input placeholder="Unit" value={it.unit} onChange={e => updateItemRow(i, 'unit', e.target.value)} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Est. cost" value={it.estimated_unit_cost} onChange={e => updateItemRow(i, 'estimated_unit_cost', e.target.value)} />
                    {items.length > 1 && (
                      <button onClick={() => removeItemRow(i)} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={addItemRow}>
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={create}>Submit</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No kitchen requisitions yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-left">
                <th className="py-3 pr-4">PR Number</th>
                <th className="py-3 pr-4">Requested By</th>
                <th className="py-3 pr-4">Required</th>
                <th className="py-3 pr-4">Urgency</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Estimated Cost</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-gray-400" /> {r.pr_number}</td>
                  <td className="py-3 pr-4">{r.requester_name || '—'}</td>
                  <td className="py-3 pr-4">{r.required_date?.slice(0, 10) || '—'}</td>
                  <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${urgencyColor(r.urgency)}`}>{r.urgency}</span></td>
                  <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                  <td className="py-3">KES {Number(r.total_estimated_cost || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
