import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const statusColor = (s: string) => ({
  draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800', terminated: 'bg-red-200 text-red-900',
  renewed: 'bg-blue-100 text-blue-700',
}[s] || 'bg-gray-100 text-gray-700');

const emptyForm = { supplier_id: '', po_id: '', title: '', contract_type: 'supply', start_date: '', end_date: '', contract_value: '', terms: '', notes: '' };

export const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      procurementService.getContracts(statusFilter ? { status: statusFilter } : {}),
      procurementService.getSuppliers(),
    ]).then(([c, s]) => { setContracts(c); setSuppliers(s); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...emptyForm, ...c, contract_value: String(c.contract_value) }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await procurementService.updateContract(editing.id, form);
      else await procurementService.createContract(form);
      setShowModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contract?')) return;
    await procurementService.deleteContract(id); load();
  };

  const daysUntilExpiry = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contract Management</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> New Contract
        </button>
      </div>

      {/* Expiry Alerts */}
      {contracts.filter(c => c.status === 'active' && daysUntilExpiry(c.end_date) <= 30 && daysUntilExpiry(c.end_date) > 0).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">Contracts expiring soon:</p>
          {contracts.filter(c => c.status === 'active' && daysUntilExpiry(c.end_date) <= 30 && daysUntilExpiry(c.end_date) > 0).map(c => (
            <p key={c.id} className="text-xs text-yellow-700 mt-1">{c.contract_number} — {c.title} ({daysUntilExpiry(c.end_date)} days left)</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {['draft','active','expired','terminated','renewed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Contract #', 'Supplier', 'Title', 'Type', 'Start', 'End', 'Value (KES)', 'Performance', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              contracts.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">No contracts found</td></tr> :
              contracts.map(c => {
                const days = daysUntilExpiry(c.end_date);
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${days <= 14 && c.status === 'active' ? 'bg-red-50' : days <= 30 && c.status === 'active' ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-3 text-xs font-mono">{c.contract_number}</td>
                    <td className="px-3 py-3 text-sm font-medium">{c.supplier_name}</td>
                    <td className="px-3 py-3 text-sm">{c.title}</td>
                    <td className="px-3 py-3 text-xs capitalize text-gray-500">{c.contract_type}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{c.start_date?.slice(0, 10)}</td>
                    <td className="px-3 py-3 text-xs">
                      <div>{c.end_date?.slice(0, 10)}</div>
                      {c.status === 'active' && <div className={`text-xs ${days <= 14 ? 'text-red-600 font-bold' : days <= 30 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {days > 0 ? `${days}d left` : 'Expired'}
                      </div>}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold">{Number(c.contract_value).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(c.performance_score * 10, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{c.performance_score}/10</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>{c.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Contract' : 'New Contract'}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <select value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="supply">Supply</option>
                    <option value="framework">Framework Agreement</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Title *</label>
                  <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value (KES) *</label>
                  <input type="number" required min="0" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={(form as any).status || 'active'} onChange={e => setForm({ ...form, ...{ status: e.target.value } })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {['draft','active','expired','terminated','renewed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea rows={3} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Save' : 'Create Contract'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagement;
