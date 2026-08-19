import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { DEPARTMENTS } from '@/constants/departments';
import {
  Package, Plus, X, RefreshCw, CheckCircle2, XCircle, Send,
  Truck, PackageCheck, AlertTriangle, ClipboardList,
} from 'lucide-react';

type Tab = 'mine' | 'approve' | 'deliveries';

const URGENCIES = ['low', 'medium', 'high', 'emergency'];

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
  partially_issued: 'bg-orange-100 text-orange-800', issued: 'bg-green-200 text-green-900',
  cancelled: 'bg-gray-100 text-gray-500',
  pending_receipt: 'bg-yellow-100 text-yellow-800', received: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-700');

const urgencyColor = (u: string) => ({
  low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-800',
}[u] || 'bg-gray-100 text-gray-700');

const emptyLine = { item_id: '', quantity_requested: '', notes: '' };

export function StoreRequisitions() {
  const { user } = useAuthStore();
  const isStoreManager = user?.role === 'admin' || user?.role === 'superadmin';

  const [tab, setTab] = useState<Tab>('mine');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [items, setItems] = useState<any[]>([]);
  const [myReqs, setMyReqs] = useState<any[]>([]);
  const [pendingApproval, setPendingApproval] = useState<any[]>([]);
  const [readyToIssue, setReadyToIssue] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Create requisition modal
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ department: '', urgency: 'medium', required_date: '', reason: '', notes: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);

  // Issue modal
  const [issueModal, setIssueModal] = useState<any>(null); // requisition detail
  const [issueQtys, setIssueQtys] = useState<Record<string, string>>({});

  // Receipt confirmation modal
  const [receiptModal, setReceiptModal] = useState<any>(null);
  const [receiptForm, setReceiptForm] = useState({ condition_on_receipt: 'good', notes: '' });

  const loadItems = async () => {
    try {
      const res: any = await api.getInventoryItems();
      setItems(res?.data || []);
    } catch { /* item picker optional */ }
  };

  const loadMine = async () => {
    setLoading(true);
    try {
      const res: any = await api.getStoreRequisitions({ mine: 'true' });
      setMyReqs(res?.data || []);
    } catch { setError('Failed to load your requisitions'); }
    setLoading(false);
  };

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const [sub, appr, part]: any[] = await Promise.all([
        api.getStoreRequisitions({ status: 'submitted' }),
        api.getStoreRequisitions({ status: 'approved' }),
        api.getStoreRequisitions({ status: 'partially_issued' }),
      ]);
      setPendingApproval(sub?.data || []);
      setReadyToIssue([...(appr?.data || []), ...(part?.data || [])]);
    } catch { setError('Failed to load requisitions'); }
    setLoading(false);
  };

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res: any = await api.getStoreIssues({ pending_for_me: 'true' });
      setDeliveries(res?.data || []);
    } catch { setError('Failed to load deliveries'); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); loadMine(); }, []);
  useEffect(() => {
    if (tab === 'mine') loadMine();
    if (tab === 'approve' && isStoreManager) loadApprovals();
    if (tab === 'deliveries') loadDeliveries();
  }, [tab]);

  const addLine = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, f: string, v: any) => { const next = [...lines]; next[i] = { ...next[i], [f]: v }; setLines(next); };

  const submitRequisition = async () => {
    if (!form.department) { setError('Department is required'); return; }
    const validLines = lines.filter(l => l.item_id && l.quantity_requested);
    if (!validLines.length) { setError('Add at least one item'); return; }
    try {
      await api.createStoreRequisition({ ...form, items: validLines });
      setCreateModal(false);
      setForm({ department: '', urgency: 'medium', required_date: '', reason: '', notes: '' });
      setLines([{ ...emptyLine }]);
      loadMine();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to submit requisition'); }
  };

  const approve = async (id: string) => { await api.approveStoreRequisition(id); loadApprovals(); };
  const reject = async (id: string) => {
    const comments = window.prompt('Reason for rejection (optional):') || '';
    await api.rejectStoreRequisition(id, comments);
    loadApprovals();
  };

  const openIssueModal = async (req: any) => {
    const res: any = await api.getStoreRequisition(req.id);
    const detail = res?.data || res;
    setIssueModal(detail);
    const defaults: Record<string, string> = {};
    (detail.items || []).forEach((i: any) => {
      const remaining = Number(i.quantity_requested) - Number(i.quantity_issued);
      if (remaining > 0) defaults[i.id] = String(remaining);
    });
    setIssueQtys(defaults);
  };

  const submitIssue = async () => {
    if (!issueModal) return;
    const linesToIssue = Object.entries(issueQtys)
      .filter(([, v]) => Number(v) > 0)
      .map(([requisition_item_id, quantity]) => ({ requisition_item_id, quantity: Number(quantity) }));
    if (!linesToIssue.length) { setError('Enter a quantity to issue'); return; }
    try {
      await api.issueStoreRequisition(issueModal.id, linesToIssue);
      setIssueModal(null);
      loadApprovals();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to issue items'); }
  };

  const submitReceipt = async () => {
    if (!receiptModal) return;
    try {
      await api.confirmStoreIssueReceipt(receiptModal.id, receiptForm);
      setReceiptModal(null);
      setReceiptForm({ condition_on_receipt: 'good', notes: '' });
      loadDeliveries();
    } catch { setError('Failed to confirm receipt'); }
  };

  const TABS: { id: Tab; label: string; icon: any; show: boolean }[] = [
    { id: 'mine', label: 'My Requisitions', icon: ClipboardList, show: true },
    { id: 'approve', label: 'Approve & Issue', icon: PackageCheck, show: isStoreManager },
    { id: 'deliveries', label: 'My Deliveries', icon: Truck, show: true },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-orange-600" /> Store Requisitions
        </h1>
        <p className="text-sm text-gray-500">Request stock already in the central store for your department, and sign for what you receive.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded p-3">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {TABS.filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {t.id === 'deliveries' && deliveries.length > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{deliveries.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* My Requisitions */}
      {tab === 'mine' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Requests you've made for stock from the central store.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadMine}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => setCreateModal(true)}><Plus className="h-4 w-4 mr-1" /> New Requisition</Button>
            </div>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-2">Requisition #</th>
                      <th className="px-4 py-2">Department</th>
                      <th className="px-4 py-2">Urgency</th>
                      <th className="px-4 py-2">Items</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReqs.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No requisitions yet.</td></tr>
                    ) : myReqs.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{r.requisition_number}</td>
                        <td className="px-4 py-2">{r.department}</td>
                        <td className="px-4 py-2 capitalize">{r.urgency}</td>
                        <td className="px-4 py-2">{r.item_count}</td>
                        <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded font-semibold ${statusColor(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-2 text-gray-500">{r.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Approve & Issue */}
      {tab === 'approve' && isStoreManager && (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-800">Awaiting Approval</h2>
              <Button variant="outline" size="sm" onClick={loadApprovals}><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApproval.length === 0 && <p className="text-gray-400 col-span-3 text-center py-6">Nothing awaiting approval.</p>}
              {pendingApproval.map((r: any) => (
                <Card key={r.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{r.requisition_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${urgencyColor(r.urgency)}`}>{r.urgency}</span>
                    </div>
                    <p className="text-sm text-gray-600">{r.department} · {r.item_count} item(s)</p>
                    <p className="text-xs text-gray-400">Requested by {r.requester_name || '—'}</p>
                    {r.reason && <p className="text-xs text-gray-500 italic">"{r.reason}"</p>}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => approve(r.id)}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => reject(r.id)}><XCircle className="h-3 w-3 mr-1" /> Reject</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Ready to Issue</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {readyToIssue.length === 0 && <p className="text-gray-400 col-span-3 text-center py-6">Nothing approved and waiting to be issued.</p>}
              {readyToIssue.map((r: any) => (
                <Card key={r.id} className="border-l-4 border-l-green-400">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{r.requisition_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${statusColor(r.status)}`}>{r.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{r.department} · {r.item_count} item(s)</p>
                    <Button size="sm" className="w-full" onClick={() => openIssueModal(r)}><Send className="h-3 w-3 mr-1" /> Issue to Department</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Deliveries */}
      {tab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">Items issued to your department, awaiting your confirmation of receipt.</p>
            <Button variant="outline" size="sm" onClick={loadDeliveries}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-gray-500">Loading...</p> : deliveries.length === 0 ? (
            <div className="text-center py-12 text-green-600">
              <PackageCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nothing awaiting your sign-off.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveries.map((d: any) => (
                <Card key={d.id} className="border-l-4 border-l-yellow-400">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">{d.item_name}</p>
                      <Truck className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-600">Qty: {d.quantity} {d.unit} · To: {d.to_department}</p>
                    <p className="text-xs text-gray-400">Issued by {d.issued_by_name || '—'} on {d.issued_at?.split('T')[0]}</p>
                    <Button size="sm" className="w-full" onClick={() => { setReceiptModal(d); setReceiptForm({ condition_on_receipt: 'good', notes: '' }); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm Receipt
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Requisition Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">New Store Requisition</h2>
              <button onClick={() => setCreateModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label>Urgency</Label>
                <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                  {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <Label>Required By</Label>
                <Input type="date" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why does the department need this?" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Add Item</button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => {
                  const selected = items.find((it: any) => it.id === line.item_id);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select className="w-full border rounded px-2 py-1.5 text-sm" value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}>
                          <option value="">Select item</option>
                          {items.map((it: any) => <option key={it.id} value={it.id}>{it.name} ({it.quantity} {it.unit} in stock)</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input type="number" min="1" max={selected?.quantity} placeholder="Quantity" value={line.quantity_requested}
                          onChange={e => updateLine(i, 'quantity_requested', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-3">
                        <input placeholder="Notes" value={line.notes} onChange={e => updateLine(i, 'notes', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button onClick={submitRequisition}>Submit Requisition</Button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {issueModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Issue — {issueModal.requisition_number}</h2>
              <button onClick={() => setIssueModal(null)}><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500">To: <strong>{issueModal.department}</strong></p>
            <div className="space-y-3">
              {(issueModal.items || []).map((i: any) => {
                const remaining = Number(i.quantity_requested) - Number(i.quantity_issued);
                if (remaining <= 0) return null;
                return (
                  <div key={i.id} className="flex items-center justify-between gap-3 border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">{i.item_name}</p>
                      <p className="text-xs text-gray-400">Requested {i.quantity_requested} {i.unit} · In stock: {i.current_stock} · Remaining to issue: {remaining}</p>
                    </div>
                    <input type="number" min="0" max={Math.min(remaining, Number(i.current_stock))}
                      value={issueQtys[i.id] ?? ''}
                      onChange={e => setIssueQtys(q => ({ ...q, [i.id]: e.target.value }))}
                      className="w-24 border rounded px-2 py-1.5 text-sm" />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIssueModal(null)}>Cancel</Button>
              <Button onClick={submitIssue}>Confirm Issue</Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Confirmation Modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Confirm Receipt</h2>
              <button onClick={() => setReceiptModal(null)}><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-600">{receiptModal.item_name} — {receiptModal.quantity} {receiptModal.unit} to {receiptModal.to_department}</p>
            <div>
              <Label>Condition on Receipt</Label>
              <select className="w-full border rounded px-3 py-2 text-sm mt-1" value={receiptForm.condition_on_receipt} onChange={e => setReceiptForm(f => ({ ...f, condition_on_receipt: e.target.value }))}>
                <option value="good">Good — matches what was issued</option>
                <option value="damaged">Damaged</option>
                <option value="short">Short delivery (quantity mismatch)</option>
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={receiptForm.notes} onChange={e => setReceiptForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <p className="text-xs text-gray-400">By confirming, you're signing that this delivery was received by you on behalf of {receiptModal.to_department}.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiptModal(null)}>Cancel</Button>
              <Button onClick={submitReceipt}>Sign & Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreRequisitions;
