import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import procurementService from '../../services/procurementService';

const ASSET_CATEGORIES = ['Computers & Laptops', 'Printers & Photocopiers', 'Projectors & Screens',
  'Furniture', 'Science Equipment', 'Sports Equipment', 'Vehicles & Buses', 'Generators', 'CCTV & Security',
  'Audio/Visual', 'Library Equipment', 'Kitchen Equipment', 'Cleaning Equipment', 'Other'];

const statusColor = (s: string) => ({ active: 'bg-green-100 text-green-800', maintenance: 'bg-yellow-100 text-yellow-800', disposed: 'bg-red-100 text-red-800', transferred: 'bg-blue-100 text-blue-700' }[s] || 'bg-gray-100 text-gray-700');
const conditionColor = (c: string) => ({ new: 'text-green-700 font-bold', good: 'text-green-600', fair: 'text-yellow-600', poor: 'text-red-600', disposed: 'text-gray-500' }[c] || 'text-gray-600');

const emptyForm = { asset_name: '', category: '', purchase_date: '', purchase_cost: '', depreciation_rate: '20', useful_life_years: '5', location: '', assigned_department: '', serial_number: '', barcode: '', warranty_expiry: '', notes: '' };

export const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    procurementService.getAssets({ category: categoryFilter, status: statusFilter })
      .then(setAssets).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [categoryFilter, statusFilter]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ ...emptyForm, ...a, purchase_cost: String(a.purchase_cost || ''), depreciation_rate: String(a.depreciation_rate || '20'), useful_life_years: String(a.useful_life_years || '5') });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await procurementService.updateAsset(editing.id, form);
      else await procurementService.createAsset(form);
      setShowModal(false); load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"?`)) return;
    await procurementService.deleteAsset(id); load();
  };

  const computeCurrentValue = (cost: number, rate: number, purchaseDate: string) => {
    if (!purchaseDate || !cost) return cost;
    const yearsOld = (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 86400000);
    return Math.max(0, cost * Math.pow(1 - rate / 100, yearsOld));
  };

  const filtered = assets.filter(a =>
    !search || a.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_tag?.toLowerCase().includes(search.toLowerCase()) ||
    a.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalValue = assets.reduce((s, a) => s + Number(a.purchase_cost || 0), 0);
  const totalCurrentValue = assets.reduce((s, a) => s + computeCurrentValue(Number(a.purchase_cost || 0), Number(a.depreciation_rate || 0), a.purchase_date), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <PlusIcon className="h-4 w-4" /> Register Asset
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Assets', val: assets.length, color: 'text-gray-900' },
          { label: 'Active Assets', val: assets.filter(a => a.status === 'active').length, color: 'text-green-600' },
          { label: 'Purchase Value (KES)', val: `KES ${totalValue.toLocaleString()}`, color: 'text-blue-700' },
          { label: 'Current Value (KES)', val: `KES ${Math.round(totalCurrentValue).toLocaleString()}`, color: 'text-purple-700' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`font-bold mt-1 text-sm ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Warranty expiry alerts */}
      {assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) < new Date(Date.now() + 30 * 86400000) && new Date(a.warranty_expiry) > new Date()).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) < new Date(Date.now() + 30 * 86400000) && new Date(a.warranty_expiry) > new Date()).length} asset(s) with warranty expiring within 30 days
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Search by name, tag, serial..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="disposed">Disposed</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{['Tag', 'Asset Name', 'Category', 'Location / Dept', 'Purchase Date', 'Cost (KES)', 'Curr. Value', 'Condition', 'Warranty', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading...</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">No assets found</td></tr> :
              filtered.map(a => {
                const currentVal = computeCurrentValue(Number(a.purchase_cost || 0), Number(a.depreciation_rate || 0), a.purchase_date);
                const warrantyExpired = a.warranty_expiry && new Date(a.warranty_expiry) < new Date();
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <QrCodeIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-mono font-medium text-blue-700">{a.asset_tag}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-sm text-gray-900">{a.asset_name}</div>
                      {a.serial_number && <div className="text-xs text-gray-400">SN: {a.serial_number}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{a.category}</td>
                    <td className="px-3 py-3 text-xs">
                      <div>{a.location || '—'}</div>
                      {a.assigned_department && <div className="text-gray-400">{a.assigned_department}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{a.purchase_date?.slice(0, 10) || '—'}</td>
                    <td className="px-3 py-3 text-sm font-medium">{a.purchase_cost ? Number(a.purchase_cost).toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-sm text-purple-700">{a.purchase_cost ? Math.round(currentVal).toLocaleString() : '—'}</td>
                    <td className="px-3 py-3 text-xs"><span className={`capitalize ${conditionColor(a.condition)}`}>{a.condition}</span></td>
                    <td className="px-3 py-3 text-xs">
                      {a.warranty_expiry ? (
                        <span className={warrantyExpired ? 'text-red-600 line-through' : 'text-gray-500'}>{a.warranty_expiry.slice(0, 10)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(a)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(a.id, a.asset_name)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
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
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Asset' : 'Register New Asset'}</h3>
              <button onClick={() => setShowModal(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label>
                  <input required value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select category</option>
                    {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost (KES)</label>
                  <input type="number" min="0" value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rate (% / year)</label>
                  <input type="number" min="0" max="100" value={form.depreciation_rate} onChange={e => setForm({ ...form, depreciation_rate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
                  <input type="number" min="1" value={form.useful_life_years} onChange={e => setForm({ ...form, useful_life_years: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. ICT Lab, Room 12" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input value={form.assigned_department} onChange={e => setForm({ ...form, assigned_department: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Barcode / QR</label>
                  <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                  <input type="date" value={form.warranty_expiry} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                {editing && (
                  <>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                      <select value={(form as any).condition || 'good'} onChange={e => setForm({ ...form, ...{ condition: e.target.value } })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {['new','good','fair','poor','disposed'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={(form as any).status || 'active'} onChange={e => setForm({ ...form, ...{ status: e.target.value } })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {['active','maintenance','disposed','transferred'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                  </>
                )}
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Save Changes' : 'Register Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
