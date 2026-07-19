import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

export const GoodsReceiptManagement: React.FC = () => {
  const [grns, setGrns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ po_id: '', delivery_date: '', delivery_note_number: '', remarks: '' });
  const [grItems, setGrItems] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getGRNs(),
      procurementService.getOrders({ status: 'sent' }),
    ]).then(([g, o]) => { setGrns(g); setOrders(o); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePOSelect = async (poId: string) => {
    setForm({ ...form, po_id: poId });
    if (!poId) { setGrItems([]); return; }
    const po = await procurementService.getOrder(poId);
    setGrItems(po.items.map((i: any) => ({
      po_item_id: i.id, item_name: i.item_name, ordered_qty: i.quantity,
      received_qty: i.quantity - i.received_qty, rejected_qty: 0, unit: i.unit, condition: 'good', remarks: '',
    })));
  };

  const updateGrItem = (i: number, f: string, v: any) => { const next = [...grItems]; next[i] = { ...next[i], [f]: v }; setGrItems(next); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createGRN({ ...form, items: grItems });
      setShowModal(false); setForm({ po_id: '', delivery_date: '', delivery_note_number: '', remarks: '' }); setGrItems([]); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const openDetail = async (id: string) => {
    const d = await procurementService.getGRN(id);
    setDetail(d);
  };

  const inspectionColor = (s: string) => ({ pending: 'bg-yellow-100 text-yellow-800', passed: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', partial: 'bg-orange-100 text-orange-800' }[s] || 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goods Receipt (GRN)</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Record Delivery
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['GRN #', 'PO #', 'Supplier', 'Delivery Date', 'Delivery Note', 'Inspection', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              grns.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No goods receipts yet</td></tr> :
              grns.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => openDetail(g.id)}>{g.grn_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{g.po_number}</td>
                  <td className="px-4 py-3 text-sm font-medium">{g.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{g.delivery_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{g.delivery_note_number || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inspectionColor(g.inspection_status)}`}>{g.inspection_status}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{g.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => openDetail(g.id)} className="text-blue-500 hover:text-blue-700"><EyeIcon className="h-4 w-4" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{detail.grn_number}</h3>
                <p className="text-sm text-gray-500">PO: {detail.po_number} · Supplier: {detail.supplier_name}</p>
              </div>
              <button onClick={() => setDetail(null)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Delivery Date:</span> <span className="ml-1 font-medium">{detail.delivery_date?.slice(0, 10)}</span></div>
                <div><span className="text-gray-500">Delivery Note:</span> <span className="ml-1">{detail.delivery_note_number || '—'}</span></div>
                <div><span className="text-gray-500">Inspection:</span> <span className="ml-1 capitalize">{detail.inspection_status}</span></div>
              </div>
              {detail.remarks && <div className="bg-gray-50 rounded-lg p-3 text-sm">{detail.remarks}</div>}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Received Items</h4>
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-gray-50"><tr>{['Item', 'Ordered', 'Received', 'Rejected', 'Unit', 'Condition', 'Remarks'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items?.map((i: any) => (
                      <tr key={i.id} className={i.condition !== 'good' ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2">{i.item_name}</td>
                        <td className="px-3 py-2">{i.ordered_qty}</td>
                        <td className="px-3 py-2 font-medium text-green-700">{i.received_qty}</td>
                        <td className="px-3 py-2 text-red-600">{i.rejected_qty || 0}</td>
                        <td className="px-3 py-2">{i.unit}</td>
                        <td className="px-3 py-2 capitalize">{i.condition}</td>
                        <td className="px-3 py-2 text-gray-500">{i.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create GRN Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Record Goods Receipt</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order *</label>
                  <select required value={form.po_id} onChange={e => handlePOSelect(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select PO</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.po_number} — {o.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
                  <input type="date" required value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note Number</label>
                  <input value={form.delivery_note_number} onChange={e => setForm({ ...form, delivery_note_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {grItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Verify Items</h4>
                  <div className="space-y-2">
                    {grItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm border border-gray-100 rounded-lg p-2">
                        <div className="col-span-4 font-medium text-gray-800">{item.item_name}<div className="text-xs text-gray-400">Ordered: {item.ordered_qty} {item.unit}</div></div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Received</label>
                          <input type="number" min="0" max={item.ordered_qty} value={item.received_qty} onChange={e => updateGrItem(i, 'received_qty', Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Rejected</label>
                          <input type="number" min="0" value={item.rejected_qty} onChange={e => updateGrItem(i, 'rejected_qty', Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Condition</label>
                          <select value={item.condition} onChange={e => updateGrItem(i, 'condition', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="wrong_item">Wrong Item</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Remarks</label>
                          <input value={item.remarks} onChange={e => updateGrItem(i, 'remarks', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Submit GRN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodsReceiptManagement;
