import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const CATEGORIES = ['Stationery', 'Furniture', 'ICT Equipment', 'Cleaning Supplies', 'Food & Catering',
  'Maintenance', 'Books & Materials', 'Transport', 'Construction', 'Services', 'Other'];

const statusColor = (s: string) => ({ active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-600', blacklisted: 'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-600');

const emptyForm = { supplier_name: '', business_registration: '', kra_pin: '', email: '', phone: '',
  address: '', category: '', bank_name: '', bank_account: '', bank_branch: '', payment_terms: '', notes: '' };

export const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'list' | 'preq'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [preqList, setPreqList] = useState<any[]>([]);
  const [showPreqModal, setShowPreqModal] = useState(false);
  const [preqForm, setPreqForm] = useState({ application_date: '', category: '', evaluation_score: '', qualification_criteria: '', expiry_date: '', notes: '' });

  const load = () => {
    setLoading(true);
    procurementService.getSuppliers({ search, status: statusFilter })
      .then(setSuppliers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openEdit = (s: any) => { setEditing(s); setForm({ ...emptyForm, ...s }); setShowModal(true); };
  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await procurementService.updateSupplier(editing.id, form);
      else await procurementService.createSupplier(form);
      setShowModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to save supplier'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    await procurementService.deleteSupplier(id); load();
  };

  const openPreq = async (s: any) => {
    setSelectedSupplier(s); setTab('preq');
    const data = await procurementService.getPrequalification(s.id);
    setPreqList(data);
  };

  const handlePreqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await procurementService.createPrequalification(selectedSupplier.id, preqForm);
    const data = await procurementService.getPrequalification(selectedSupplier.id);
    setPreqList(data); setShowPreqModal(false);
    setPreqForm({ application_date: '', category: '', evaluation_score: '', qualification_criteria: '', expiry_date: '', notes: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {(['list', 'preq'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'list' ? 'Supplier Registry' : `Prequalification${selectedSupplier ? ` — ${selectedSupplier.supplier_name}` : ''}`}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'list' && (
        <>
          <div className="flex gap-3">
            <input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Code', 'Supplier Name', 'Category', 'KRA PIN', 'Phone', 'Email', 'Status', 'Rating', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No suppliers found</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{s.supplier_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{s.supplier_name}</div>
                      {s.business_registration && <div className="text-xs text-gray-400">{s.business_registration}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.kra_pin || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-700">{Number(s.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openPreq(s)} className="text-xs text-blue-600 hover:underline">Prequalify</button>
                        <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(s.id, s.supplier_name)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'preq' && selectedSupplier && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prequalification — {selectedSupplier.supplier_name}</h2>
            <button onClick={() => setShowPreqModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <PlusIcon className="h-4 w-4" /> Add Application
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>{['Date', 'Category', 'Score', 'Status', 'Expiry'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preqList.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-sm">{p.application_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-sm">{p.category}</td>
                  <td className="px-4 py-3 text-sm">{p.evaluation_score ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-sm">{p.expiry_date?.slice(0, 10) || '—'}</td>
                </tr>
              ))}
              {!preqList.length && <tr><td colSpan={5} className="text-center py-6 text-gray-400">No prequalification records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                  <input required value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration</label>
                  <input value={form.business_registration} onChange={e => setForm({ ...form, business_registration: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN</label>
                  <input value={form.kra_pin} onChange={e => setForm({ ...form, kra_pin: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="immediate">Immediate</option>
                    <option value="net14">Net 14 days</option>
                    <option value="net30">Net 30 days</option>
                    <option value="net60">Net 60 days</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Branch</label>
                  <input value={form.bank_branch} onChange={e => setForm({ ...form, bank_branch: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={(form as any).status || 'active'} onChange={e => setForm({ ...form, ...{ status: e.target.value } })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blacklisted">Blacklisted</option>
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Save Changes' : 'Add Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prequalification Modal */}
      {showPreqModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900">Add Prequalification</h3>
              <button onClick={() => setShowPreqModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handlePreqSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Application Date *</label>
                  <input type="date" required value={preqForm.application_date} onChange={e => setPreqForm({ ...preqForm, application_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input value={preqForm.category} onChange={e => setPreqForm({ ...preqForm, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Score (0-100)</label>
                  <input type="number" min="0" max="100" value={preqForm.evaluation_score} onChange={e => setPreqForm({ ...preqForm, evaluation_score: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={preqForm.expiry_date} onChange={e => setPreqForm({ ...preqForm, expiry_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Qualification Criteria</label>
                  <textarea rows={3} value={preqForm.qualification_criteria} onChange={e => setPreqForm({ ...preqForm, qualification_criteria: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowPreqModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
