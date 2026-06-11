import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800', sent: 'bg-blue-100 text-blue-700',
  partially_delivered: 'bg-orange-100 text-orange-800', completed: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-700');

const emptyItem = { item_name: '', quantity: 1, unit: '', unit_price: 0, vat_rate: 16 };

export const ProcurementOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ supplier_id: '', delivery_date: '', payment_terms: '', delivery_terms: '', currency: 'KES', notes: '' });
  const [items, setItems] = useState([{ ...emptyItem }]);

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getOrders(statusFilter ? { status: statusFilter } : {}),
      procurementService.getSuppliers({ status: 'active' }),
    ]).then(([o, s]) => { setOrders(o); setSuppliers(s); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetail = async (id: string) => {
    const d = await procurementService.getOrder(id);
    setDetail(d);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: string, v: any) => { const next = [...items]; next[i] = { ...next[i], [f]: v }; setItems(next); };

  const computedTotals = () => {
    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price || 0), 0);
    const vat = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price || 0) * (Number(i.vat_rate || 0) / 100), 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createOrder({ ...form, items });
      setShowModal(false); setForm({ supplier_id: '', delivery_date: '', payment_terms: '', delivery_terms: '', currency: 'KES', notes: '' }); setItems([{ ...emptyItem }]); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleApprove = async (id: string) => { await procurementService.approveOrder(id); load(); setDetail(null); };
  const handleSend = async (id: string) => { await procurementService.sendOrder(id); load(); setDetail(null); };
  const handleCancel = async (id: string) => { if (!confirm('Cancel this PO?')) return; await procurementService.cancelOrder(id); load(); setDetail(null); };

  const totals = computedTotals();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Create PO
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['All', ''], ['Draft', 'draft'], ['Approved', 'approved'], ['Completed', 'completed']].map(([label, s]) => (
          <button key={label} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`p-4 bg-white rounded-lg border text-left transition ${statusFilter === s ? 'ring-2 ring-blue-500' : 'hover:border-blue-300'}`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-bold">{s ? orders.filter(o => o.status === s).length : orders.length}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {['draft','pending_approval','approved','sent','partially_delivered','completed','cancelled'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['PO #', 'Supplier', 'PO Date', 'Delivery Date', 'Subtotal', 'VAT', 'Total (KES)', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              orders.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">No purchase orders</td></tr> :
              orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => openDetail(o.id)}>{o.po_number}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.po_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.delivery_date?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3 text-sm">{Number(o.subtotal).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{Number(o.vat_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{Number(o.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(o.id)} className="text-blue-500 hover:text-blue-700"><EyeIcon className="h-4 w-4" /></button>
                      {o.status === 'draft' && <button onClick={() => handleApprove(o.id)} className="text-xs text-green-600 hover:underline">Approve</button>}
                      {o.status === 'approved' && <button onClick={() => handleSend(o.id)} className="text-xs text-blue-600 hover:underline">Send</button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{detail.po_number}</h3>
                <p className="text-sm text-gray-500">{detail.supplier_name} · {detail.supplier_email}</p>
              </div>
              <button onClick={() => setDetail(null)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(detail.status)}`}>{detail.status.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-500">PO Date:</span> <span className="ml-1 font-medium">{detail.po_date?.slice(0, 10)}</span></div>
                <div><span className="text-gray-500">Delivery:</span> <span className="ml-1 font-medium">{detail.delivery_date?.slice(0, 10) || '—'}</span></div>
              </div>
              {detail.payment_terms && <div className="text-sm bg-blue-50 rounded-lg p-3"><strong>Payment Terms:</strong> {detail.payment_terms}</div>}

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Order Items</h4>
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-gray-50"><tr>{['Item', 'Qty', 'Unit', 'Unit Price', 'VAT%', 'Total', 'Received'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items?.map((i: any) => (
                      <tr key={i.id} className={i.received_qty >= i.quantity ? 'bg-green-50' : ''}>
                        <td className="px-3 py-2">{i.item_name}</td>
                        <td className="px-3 py-2">{i.quantity}</td>
                        <td className="px-3 py-2">{i.unit}</td>
                        <td className="px-3 py-2">{Number(i.unit_price).toLocaleString()}</td>
                        <td className="px-3 py-2">{i.vat_rate}%</td>
                        <td className="px-3 py-2 font-medium">{Number(i.total_price).toLocaleString()}</td>
                        <td className="px-3 py-2">{i.received_qty}/{i.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 text-right text-sm space-y-1">
                  <div className="text-gray-500">Subtotal: KES {Number(detail.subtotal).toLocaleString()}</div>
                  <div className="text-gray-500">VAT: KES {Number(detail.vat_amount).toLocaleString()}</div>
                  <div className="font-bold text-gray-900">Total: KES {Number(detail.total_amount).toLocaleString()}</div>
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                {detail.status === 'draft' && <button onClick={() => handleApprove(detail.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve PO</button>}
                {detail.status === 'approved' && <button onClick={() => handleSend(detail.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Mark as Sent</button>}
                {!['completed','cancelled'].includes(detail.status) && (
                  <button onClick={() => handleCancel(detail.id)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">Cancel PO</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Create Purchase Order</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input placeholder="e.g. Net 30 days after delivery" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                  <input placeholder="e.g. Delivery to school gate" value={form.delivery_terms} onChange={e => setForm({ ...form, delivery_terms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Order Items</h4>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><PlusIcon className="h-3 w-3" /> Add Item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4"><input required placeholder="Item name" value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-2"><input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-2"><input placeholder="Unit" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-2"><input type="number" placeholder="Unit price" min="0" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-1"><input type="number" placeholder="VAT%" min="0" max="100" value={item.vat_rate} onChange={e => updateItem(i, 'vat_rate', Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
                      <div className="col-span-1 flex justify-center">
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-right space-y-1">
                  <div className="text-gray-600">Subtotal: KES {totals.subtotal.toLocaleString()}</div>
                  <div className="text-gray-600">VAT: KES {totals.vat.toLocaleString()}</div>
                  <div className="font-bold text-gray-900">Total: KES {totals.total.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementOrders;
