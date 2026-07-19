import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, TrashIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const urgencyColor = (u: string) => ({ low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-800' }[u] || 'bg-gray-100 text-gray-700');
const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800', converted_to_rfq: 'bg-purple-100 text-purple-700',
  converted_to_po: 'bg-indigo-100 text-indigo-700', cancelled: 'bg-gray-100 text-gray-500',
}[s] || 'bg-gray-100 text-gray-700');

const DEPARTMENTS = ['Administration', 'ICT', 'Science', 'Mathematics', 'Languages', 'Social Studies',
  'Humanities', 'Technical', 'Sports', 'Library', 'Health', 'Transport', 'Accounts', 'Maintenance'];

const emptyItem = { item_name: '', quantity: 1, unit: '', estimated_unit_cost: 0, specifications: '' };

export const PurchaseRequisitions: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [comments, setComments] = useState('');
  const [form, setForm] = useState({ department: '', required_date: '', urgency: 'medium', reason: '', notes: '' });
  const [items, setItems] = useState([{ ...emptyItem }]);

  const load = () => {
    setLoading(true);
    procurementService.getRequisitions({ status: statusFilter })
      .then(setList).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetail = async (id: string) => {
    const d = await procurementService.getRequisition(id);
    setDetail(d);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    setItems(next);
  };

  const totalEstimated = items.reduce((s, i) => s + Number(i.quantity) * Number(i.estimated_unit_cost || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createRequisition({ ...form, items });
      setShowModal(false); setForm({ department: '', required_date: '', urgency: 'medium', reason: '', notes: '' }); setItems([{ ...emptyItem }]); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to create PR'); }
  };

  const handleSubmitPR = async (id: string) => {
    await procurementService.submitRequisition(id); load(); setDetail(null);
  };
  const handleApprove = async (id: string) => {
    await procurementService.approveRequisition(id, comments); load(); setDetail(null);
  };
  const handleReject = async (id: string) => {
    if (!comments.trim()) return alert('Please enter rejection reason');
    await procurementService.rejectRequisition(id, comments); load(); setDetail(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> New Requisition
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Draft', 'draft'], ['Pending', 'pending_approval'], ['Approved', 'approved'], ['Rejected', 'rejected']].map(([label, s]) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`p-4 rounded-lg border text-left transition ${statusFilter === s ? 'ring-2 ring-blue-500' : 'hover:border-blue-300'} bg-white`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xl font-bold ${statusColor(s)}`}>{list.filter(r => r.status === s).length}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="converted_to_po">Converted to PO</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['PR #', 'Department', 'Requested By', 'Required Date', 'Urgency', 'Est. Cost (KES)', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              list.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No requisitions found</td></tr> :
              list.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => openDetail(r.id)}>{r.pr_number}</td>
                  <td className="px-4 py-3 text-sm">{r.department}</td>
                  <td className="px-4 py-3 text-sm">{r.requester_name}</td>
                  <td className="px-4 py-3 text-sm">{r.required_date?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${urgencyColor(r.urgency)}`}>{r.urgency}</span></td>
                  <td className="px-4 py-3 text-sm font-medium">{Number(r.total_estimated_cost || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.status === 'draft' && <button onClick={() => handleSubmitPR(r.id)} className="text-xs text-blue-600 hover:underline">Submit</button>}
                      {(r.status === 'submitted' || r.status === 'pending_approval') && (
                        <>
                          <button onClick={() => { openDetail(r.id); }} className="text-xs text-green-600 hover:underline">Review</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{detail.pr_number}</h3>
                <p className="text-sm text-gray-500">{detail.department} · {detail.requester_name}</p>
              </div>
              <button onClick={() => setDetail(null)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(detail.status)}`}>{detail.status.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-500">Urgency:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${urgencyColor(detail.urgency)}`}>{detail.urgency}</span></div>
                <div><span className="text-gray-500">Required by:</span> <span className="ml-1 font-medium">{detail.required_date?.slice(0, 10) || '—'}</span></div>
              </div>
              {detail.reason && <div className="bg-gray-50 rounded-lg p-3 text-sm"><strong>Reason:</strong> {detail.reason}</div>}

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Requested Items</h4>
                <table className="min-w-full text-sm divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>{['Item', 'Qty', 'Unit', 'Est. Unit Cost', 'Total'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items?.map((i: any) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">{i.item_name}{i.specifications && <div className="text-xs text-gray-400">{i.specifications}</div>}</td>
                        <td className="px-3 py-2">{i.quantity}</td>
                        <td className="px-3 py-2">{i.unit}</td>
                        <td className="px-3 py-2">{Number(i.estimated_unit_cost).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium">{Number(i.estimated_total).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total Estimated</td><td className="px-3 py-2">KES {Number(detail.total_estimated_cost || 0).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>

              {detail.approval_trail?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Approval Trail</h4>
                  <div className="space-y-2">
                    {detail.approval_trail.map((a: any) => (
                      <div key={a.id} className={`flex items-start gap-3 p-2 rounded-lg ${a.action === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${a.action === 'approved' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{a.action}</span>
                        <div className="text-sm"><span className="font-medium">{a.approver_name}</span>{a.comments && <span className="text-gray-600"> — {a.comments}</span>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(detail.status === 'submitted' || detail.status === 'pending_approval') && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <textarea rows={2} value={comments} onChange={e => setComments(e.target.value)}
                    placeholder="Add approval/rejection comments..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => handleApprove(detail.id)} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                      <CheckIcon className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => handleReject(detail.id)} className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">New Purchase Requisition</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
                  <input type="date" value={form.required_date} onChange={e => setForm({ ...form, required_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Justification</label>
                  <textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Items</h4>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><PlusIcon className="h-3 w-3" /> Add Item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <input placeholder="Item name *" required value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <input placeholder="Unit" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="Est. unit cost" min="0" value={item.estimated_unit_cost} onChange={e => updateItem(i, 'estimated_unit_cost', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-1 flex justify-center pt-1.5">
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm font-semibold text-gray-700">
                  Total Estimated: KES {totalEstimated.toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create Requisition</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequisitions;
