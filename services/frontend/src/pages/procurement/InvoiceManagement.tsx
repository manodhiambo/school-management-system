import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const statusColor = (s: string) => ({
  received: 'bg-gray-100 text-gray-700', verified: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-800', partially_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-200 text-green-900', rejected: 'bg-red-100 text-red-800',
  overdue: 'bg-red-200 text-red-900',
}[s] || 'bg-gray-100 text-gray-700');

export const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ invoice_number: '', supplier_id: '', po_id: '', grn_id: '', invoice_date: '', due_date: '', subtotal: '', vat_amount: '', total_amount: '', notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getInvoices(statusFilter ? { status: statusFilter } : {}),
      procurementService.getSuppliers(),
      procurementService.getOrders({ status: 'sent' }),
      procurementService.getGRNs(),
    ]).then(([inv, s, o, g]) => { setInvoices(inv); setSuppliers(s); setOrders(o); setGrns(g); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const calcTotal = (sub: string, vat: string) => {
    const s = parseFloat(sub) || 0;
    const v = parseFloat(vat) || s * 0.16;
    setForm(f => ({ ...f, subtotal: sub, vat_amount: v.toFixed(2), total_amount: (s + v).toFixed(2) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createInvoice(form);
      setShowModal(false); setForm({ invoice_number: '', supplier_id: '', po_id: '', grn_id: '', invoice_date: '', due_date: '', subtotal: '', vat_amount: '', total_amount: '', notes: '' }); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleApprove = async (id: string) => { await procurementService.approveInvoice(id); load(); };
  const handleReject = async (id: string) => { await procurementService.rejectInvoice(id); load(); };

  const isOverdue = (inv: any) => inv.due_date && new Date(inv.due_date) < new Date() && !['paid', 'rejected'].includes(inv.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Record Invoice
        </button>
      </div>

      {/* Overdue alert */}
      {invoices.filter(isOverdue).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <strong>{invoices.filter(isOverdue).length} overdue invoice(s)</strong> — total outstanding: KES {invoices.filter(isOverdue).reduce((s, i) => s + Number(i.balance || 0), 0).toLocaleString()}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {[
          { label: 'Total Invoices', val: invoices.length, color: 'text-gray-900' },
          { label: 'Total Amount', val: `KES ${invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0).toLocaleString()}`, color: 'text-gray-900' },
          { label: 'Paid', val: `KES ${invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0).toLocaleString()}`, color: 'text-green-600' },
          { label: 'Outstanding', val: `KES ${invoices.reduce((s, i) => s + Number(i.balance || 0), 0).toLocaleString()}`, color: 'text-red-600' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`font-bold mt-1 ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {['received','verified','approved','partially_paid','paid','rejected','overdue'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Invoice #', 'Supplier', 'PO #', 'Date', 'Due Date', 'Total (KES)', 'Paid', 'Balance', '3-Way Match', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              invoices.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">No invoices</td></tr> :
              invoices.map(inv => (
                <tr key={inv.id} className={`hover:bg-gray-50 ${isOverdue(inv) ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-3 text-xs font-mono font-medium">{inv.invoice_number}</td>
                  <td className="px-3 py-3 text-sm">{inv.supplier_name}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{inv.po_number || '—'}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{inv.invoice_date?.slice(0, 10)}</td>
                  <td className="px-3 py-3 text-xs"><span className={isOverdue(inv) ? 'text-red-600 font-bold' : 'text-gray-500'}>{inv.due_date?.slice(0, 10) || '—'}</span></td>
                  <td className="px-3 py-3 text-sm font-semibold">{Number(inv.total_amount).toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-green-600">{Number(inv.paid_amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-red-600 font-medium">{Number(inv.balance || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-center">{inv.three_way_match ? <span className="text-green-600 text-xs font-bold">✓</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>{inv.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {inv.status === 'received' && (
                        <>
                          <button onClick={() => handleApprove(inv.id)} className="text-green-500 hover:text-green-700" title="Approve"><CheckIcon className="h-4 w-4" /></button>
                          <button onClick={() => handleReject(inv.id)} className="text-red-500 hover:text-red-700" title="Reject"><XCircleIcon className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Record Supplier Invoice</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input required value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked PO</label>
                  <select value={form.po_id} onChange={e => setForm({ ...form, po_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select PO (optional)</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.po_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked GRN</label>
                  <select value={form.grn_id} onChange={e => setForm({ ...form, grn_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select GRN (optional)</option>
                    {grns.map(g => <option key={g.id} value={g.id}>{g.grn_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input type="date" required value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal (KES) *</label>
                  <input type="number" required min="0" value={form.subtotal} onChange={e => calcTotal(e.target.value, form.vat_amount)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT (KES)</label>
                  <input type="number" min="0" value={form.vat_amount} onChange={e => { const v = parseFloat(e.target.value) || 0; setForm(f => ({ ...f, vat_amount: e.target.value, total_amount: String((parseFloat(f.subtotal) || 0) + v) })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                  <input type="number" required value={form.total_amount} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {form.po_id && form.grn_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  Three-way match will be automatically verified (PR + PO + GRN).
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Record Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
