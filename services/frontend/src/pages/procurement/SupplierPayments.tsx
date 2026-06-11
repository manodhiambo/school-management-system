import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const statusColor = (s: string) => ({
  pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-700');

export const SupplierPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ invoice_id: '', supplier_id: '', payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'bank_transfer', reference_number: '', bank_name: '', notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getPayments(statusFilter ? { status: statusFilter } : {}),
      procurementService.getSuppliers(),
      procurementService.getInvoices({ status: 'approved' }),
    ]).then(([p, s, inv]) => { setPayments(p); setSuppliers(s); setInvoices(inv); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    setForm(f => ({ ...f, invoice_id: invId, supplier_id: inv?.supplier_id || f.supplier_id, amount: String(inv?.balance || '') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createPayment(form);
      setShowModal(false); setForm({ invoice_id: '', supplier_id: '', payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'bank_transfer', reference_number: '', bank_name: '', notes: '' }); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleApprove = async (id: string) => { await procurementService.approvePayment(id); load(); };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Payments</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Payments', val: payments.length },
          { label: 'Total Paid (KES)', val: `KES ${totalPaid.toLocaleString()}`, className: 'text-green-600' },
          { label: 'Pending Approval', val: payments.filter(p => p.status === 'pending').length, className: 'text-yellow-600' },
          { label: 'Pending Amount (KES)', val: `KES ${totalPending.toLocaleString()}`, className: 'text-orange-600' },
        ].map(({ label, val, className = 'text-gray-900' }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`font-bold mt-1 text-sm ${className}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Voucher #', 'Supplier', 'Invoice #', 'Payment Date', 'Amount (KES)', 'Method', 'Reference', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              payments.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">No payments recorded</td></tr> :
              payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono font-medium">{p.payment_voucher_number}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.payment_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">{Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{p.payment_method?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.reference_number || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' && (
                      <button onClick={() => handleApprove(p.id)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                        <CheckIcon className="h-3 w-3" /> Approve & Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Record Supplier Payment</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Linked Invoice</label>
                  <select value={form.invoice_id} onChange={e => handleInvoiceSelect(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select invoice (optional)</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.supplier_name} (Balance: KES {Number(i.balance).toLocaleString()})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                  <input type="date" required value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                  <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select required value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="Transaction ref / Cheque #" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPayments;
