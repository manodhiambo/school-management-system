import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', published: 'bg-blue-100 text-blue-700',
  awaiting_quotes: 'bg-yellow-100 text-yellow-800', quotes_received: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-200 text-gray-600', awarded: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-700');

export const RFQManagement: React.FC = () => {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', evaluation_criteria: '', supplier_ids: [] as string[] });

  const load = () => {
    setLoading(true);
    Promise.all([procurementService.getRFQs(), procurementService.getSuppliers()])
      .then(([r, s]) => { setRfqs(r); setSuppliers(s.filter((x: any) => x.status === 'active')); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    const d = await procurementService.getRFQ(id);
    setDetail(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementService.createRFQ(form);
      setShowModal(false); setForm({ title: '', description: '', deadline: '', evaluation_criteria: '', supplier_ids: [] }); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const toggleSupplier = (id: string) => {
    setForm(f => ({ ...f, supplier_ids: f.supplier_ids.includes(id) ? f.supplier_ids.filter(s => s !== id) : [...f.supplier_ids, id] }));
  };

  const handlePublish = async (id: string) => { await procurementService.publishRFQ(id); load(); };
  const handleClose = async (id: string) => { await procurementService.closeRFQ(id); load(); if (detail?.id === id) setDetail(null); };

  const recommendQuotation = async (qid: string) => {
    await procurementService.recommendQuotation(qid);
    if (detail) { const d = await procurementService.getRFQ(detail.id); setDetail(d); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Request for Quotation (RFQ)</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Create RFQ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['RFQ #', 'Title', 'Issue Date', 'Deadline', 'Suppliers', 'Quotes', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              rfqs.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No RFQs found</td></tr> :
              rfqs.map(r => {
                const pastDeadline = new Date(r.deadline) < new Date();
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => openDetail(r.id)}>{r.rfq_number}</td>
                    <td className="px-4 py-3"><div className="font-medium text-sm text-gray-900">{r.title}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.issue_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-sm"><span className={pastDeadline && r.status !== 'closed' && r.status !== 'awarded' ? 'text-red-600 font-medium' : 'text-gray-500'}>{r.deadline?.slice(0, 10)}</span></td>
                    <td className="px-4 py-3 text-sm text-center">{r.supplier_count}</td>
                    <td className="px-4 py-3 text-sm text-center">{r.quote_count}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(r.id)} className="text-blue-500 hover:text-blue-700"><EyeIcon className="h-4 w-4" /></button>
                        {r.status === 'draft' && <button onClick={() => handlePublish(r.id)} className="text-xs text-green-600 hover:underline">Publish</button>}
                        {['published','awaiting_quotes','quotes_received'].includes(r.status) && (
                          <button onClick={() => handleClose(r.id)} className="text-xs text-gray-600 hover:underline">Close</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{detail.rfq_number} — {detail.title}</h3>
                <p className="text-xs text-gray-500">Deadline: {detail.deadline?.slice(0, 10)} · Status: {detail.status}</p>
              </div>
              <button onClick={() => setDetail(null)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-5">
              {detail.description && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detail.description}</p>}

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Suppliers Invited ({detail.suppliers?.length || 0})</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.suppliers?.map((s: any) => (
                    <span key={s.id} className={`px-2 py-1 rounded-full text-xs font-medium ${s.responded ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {s.supplier_name} {s.responded ? '✓' : '—'}
                    </span>
                  ))}
                </div>
              </div>

              {detail.quotations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Quotation Comparison</h4>
                  <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-50"><tr>{['Supplier', 'Quotation #', 'Amount (KES)', 'Delivery Days', 'Quality', 'Technical', 'Financial', 'Overall', 'Recommended'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.quotations.map((q: any) => (
                        <tr key={q.id} className={q.is_recommended ? 'bg-green-50' : ''}>
                          <td className="px-3 py-2 font-medium">{q.supplier_name}</td>
                          <td className="px-3 py-2 text-gray-500">{q.quotation_number}</td>
                          <td className="px-3 py-2 font-semibold">{Number(q.total_amount).toLocaleString()}</td>
                          <td className="px-3 py-2">{q.delivery_days || '—'}</td>
                          <td className="px-3 py-2">{q.quality_score}</td>
                          <td className="px-3 py-2">{q.technical_score}</td>
                          <td className="px-3 py-2">{q.financial_score}</td>
                          <td className="px-3 py-2 font-bold text-blue-700">{q.overall_score}</td>
                          <td className="px-3 py-2">
                            {q.is_recommended ? <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">Recommended</span>
                              : detail.status === 'closed' && <button onClick={() => recommendQuotation(q.id)} className="text-xs text-blue-600 hover:underline">Set Winner</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Create RFQ</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                <input type="date" required value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Criteria</label>
                <textarea rows={2} placeholder="e.g. Price (40%), Quality (30%), Delivery time (20%), Warranty (10%)" value={form.evaluation_criteria} onChange={e => setForm({ ...form, evaluation_criteria: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Suppliers</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                  {suppliers.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={form.supplier_ids.includes(s.id)} onChange={() => toggleSupplier(s.id)} className="rounded" />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{s.supplier_name}</div>
                        <div className="text-xs text-gray-400">{s.category} · {s.email || 'No email'}</div>
                      </div>
                    </label>
                  ))}
                  {!suppliers.length && <div className="px-3 py-4 text-sm text-gray-400 text-center">No active suppliers</div>}
                </div>
                <p className="text-xs text-gray-400 mt-1">{form.supplier_ids.length} supplier(s) selected</p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create RFQ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFQManagement;
