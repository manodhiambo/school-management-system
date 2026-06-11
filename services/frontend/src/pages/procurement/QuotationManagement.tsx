import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

export const QuotationManagement: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rfqFilter, setRfqFilter] = useState('');
  const [form, setForm] = useState({ rfq_id: '', supplier_id: '', quotation_number: '', submission_date: '', validity_date: '', total_amount: '', delivery_days: '', warranty_terms: '', payment_terms: '', quality_score: '', technical_score: '', financial_score: '', notes: '' });
  const [items, setItems] = useState([{ item_name: '', quantity: '', unit: '', unit_price: '', total_price: '' }]);

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getQuotations(rfqFilter ? { rfq_id: rfqFilter } : {}),
      procurementService.getRFQs(),
      procurementService.getSuppliers({ status: 'active' }),
    ]).then(([q, r, s]) => { setQuotations(q); setRfqs(r); setSuppliers(s); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [rfqFilter]);

  const addItem = () => setItems([...items, { item_name: '', quantity: '', unit: '', unit_price: '', total_price: '' }]);
  const updateItem = (i: number, f: string, v: string) => { const next = [...items]; next[i] = { ...next[i], [f]: v }; setItems(next); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createQuotation({ ...form, items });
      setShowModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const scoreColor = (n: number) => n >= 8 ? 'text-green-600' : n >= 5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotation Management</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Record Quotation
        </button>
      </div>

      <div className="flex gap-3">
        <select value={rfqFilter} onChange={e => setRfqFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All RFQs</option>
          {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['RFQ', 'Supplier', 'Quotation #', 'Submission', 'Total (KES)', 'Delivery', 'Quality', 'Technical', 'Financial', 'Overall', 'Recommended'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              quotations.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">No quotations yet</td></tr> :
              quotations.map(q => (
                <tr key={q.id} className={`hover:bg-gray-50 ${q.is_recommended ? 'bg-green-50' : ''}`}>
                  <td className="px-3 py-3 text-xs text-gray-500">{q.rfq_number}</td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">{q.supplier_name}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{q.quotation_number}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{q.submission_date?.slice(0, 10)}</td>
                  <td className="px-3 py-3 text-sm font-semibold">{Number(q.total_amount).toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm">{q.delivery_days ? `${q.delivery_days}d` : '—'}</td>
                  <td className="px-3 py-3"><span className={`text-sm font-bold ${scoreColor(q.quality_score)}`}>{q.quality_score}</span></td>
                  <td className="px-3 py-3"><span className={`text-sm font-bold ${scoreColor(q.technical_score)}`}>{q.technical_score}</span></td>
                  <td className="px-3 py-3"><span className={`text-sm font-bold ${scoreColor(q.financial_score)}`}>{q.financial_score}</span></td>
                  <td className="px-3 py-3"><span className={`text-sm font-bold ${scoreColor(q.overall_score)}`}>{q.overall_score}</span></td>
                  <td className="px-3 py-3">
                    {q.is_recommended && <span className="flex items-center gap-1 text-xs text-green-700 font-bold"><StarIcon className="h-3 w-3 fill-green-500 text-green-500" /> Winner</span>}
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
              <h3 className="font-semibold text-gray-900">Record Supplier Quotation</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFQ *</label>
                  <select required value={form.rfq_id} onChange={e => setForm({ ...form, rfq_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select RFQ</option>
                    {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select required value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                  <input value={form.quotation_number} onChange={e => setForm({ ...form, quotation_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
                  <input type="date" value={form.submission_date} onChange={e => setForm({ ...form, submission_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (KES) *</label>
                  <input type="number" required min="0" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery (days)</label>
                  <input type="number" min="0" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity Date</label>
                  <input type="date" value={form.validity_date} onChange={e => setForm({ ...form, validity_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input value={form.payment_terms} placeholder="e.g. Net 30 days" onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-700 mb-3">Evaluation Scores (0–10)</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[['quality_score', 'Quality'], ['technical_score', 'Technical'], ['financial_score', 'Financial']].map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label} Score</label>
                      <input type="number" min="0" max="10" step="0.1" value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><PlusIcon className="h-3 w-3" /> Add</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2">
                      <input placeholder="Item" value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Qty" type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Unit price" type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Total" type="number" value={item.total_price} onChange={e => updateItem(i, 'total_price', e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationManagement;
