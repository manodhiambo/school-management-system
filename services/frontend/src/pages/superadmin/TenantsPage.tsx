import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Search, Plus, CheckCircle, XCircle, LogIn, Trash2, Edit2,
  X, Loader2, AlertCircle, DollarSign, Calendar, Phone, Mail, Clock,
  RefreshCw, Eye, ChevronDown, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

type Tenant = {
  id: string;
  school_name: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  school_type?: string;
  county?: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  subscription_start_date?: string;
  subscription_end_date?: string;
  created_at: string;
  total_students?: number;
};

type ModalType = 'create' | 'edit' | 'payments' | 'extend' | null;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function TenantsPage() {
  const navigate = useNavigate();
  const { setAuth, user: currentUser } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState('');
  const [extendMonths, setExtendMonths] = useState(12);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [form, setForm] = useState({
    school_name: '', admin_name: '', admin_email: '', admin_phone: '',
    school_type: '', county: '', school_address: '',
  });

  useEffect(() => { loadTenants(); }, [search, statusFilter]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res: any = await api.getTenants({ search, status: statusFilter });
      const data = res?.data ?? res?.tenants ?? res ?? [];
      setTenants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedTenant(null);
    setForm({ school_name: '', admin_name: '', admin_email: '', admin_phone: '', school_type: '', county: '', school_address: '' });
    setFormError('');
    setModal('create');
  };

  const openEdit = (t: Tenant) => {
    setSelectedTenant(t);
    setForm({
      school_name: t.school_name, admin_name: t.admin_name || '', admin_email: t.admin_email,
      admin_phone: t.admin_phone || '', school_type: t.school_type || '', county: t.county || '', school_address: '',
    });
    setFormError('');
    setModal('edit');
    setOpenMenu(null);
  };

  const openPayments = async (t: Tenant) => {
    setSelectedTenant(t);
    setModal('payments');
    setOpenMenu(null);
    try {
      const res: any = await api.getTenantPayments(t.id);
      setPayments(res?.data ?? res?.payments ?? res ?? []);
    } catch { setPayments([]); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.school_name || !form.admin_email) { setFormError('School name and admin email are required.'); return; }
    setActionLoading('save');
    try {
      if (modal === 'create') {
        await api.createTenant(form);
      } else if (selectedTenant) {
        await api.updateTenant(selectedTenant.id, form);
      }
      setModal(null);
      await loadTenants();
    } catch (err: any) {
      setFormError(err?.message || 'Save failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleActivate = async (t: Tenant) => {
    setActionLoading('activate_' + t.id);
    try { await api.activateTenant(t.id); await loadTenants(); }
    catch (err: any) { alert(err?.message || 'Failed to activate'); }
    finally { setActionLoading(''); setOpenMenu(null); }
  };

  const handleSuspend = async (t: Tenant) => {
    if (!window.confirm(`Suspend ${t.school_name}? They will lose access immediately.`)) return;
    setActionLoading('suspend_' + t.id);
    try { await api.suspendTenant(t.id); await loadTenants(); }
    catch (err: any) { alert(err?.message || 'Failed to suspend'); }
    finally { setActionLoading(''); setOpenMenu(null); }
  };

  const handleExtend = async () => {
    if (!selectedTenant) return;
    setActionLoading('extend');
    try {
      await api.extendTenantSubscription(selectedTenant.id, extendMonths);
      setModal(null);
      await loadTenants();
    } catch (err: any) { alert(err?.message || 'Failed to extend'); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async (id: string) => {
    setActionLoading('delete_' + id);
    try { await api.deleteTenant(id); setConfirmDelete(null); await loadTenants(); }
    catch (err: any) { alert(err?.message || 'Failed to delete'); }
    finally { setActionLoading(''); }
  };

  const handleLoginAs = async (t: Tenant) => {
    setActionLoading('login_' + t.id);
    try {
      const res: any = await api.loginAsTenant(t.id);
      const token = res?.data?.token ?? res?.token;
      const tenantUser = res?.data?.user ?? res?.user;
      if (!token) throw new Error('No token received');
      // Store current superadmin token for later return
      const superToken = localStorage.getItem('accessToken') || '';
      sessionStorage.setItem('superadmin_return_token', superToken);
      sessionStorage.setItem('superadmin_return_user', JSON.stringify(currentUser));
      setAuth(tenantUser, token, true);
      navigate('/app/dashboard');
    } catch (err: any) { alert(err?.message || 'Login as tenant failed'); }
    finally { setActionLoading(''); setOpenMenu(null); }
  };

  const filtered = tenants; // Server-side filtering already done

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Schools</h1>
          <p className="text-gray-500 text-sm mt-1">{tenants.length} school{tenants.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button onClick={openCreate} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Add School
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by school name or email..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
        <Button variant="outline" onClick={loadTenants} className="flex-shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No schools found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{t.school_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[t.status] || STATUS_COLORS.pending}`}>
                          {t.status}
                        </span>
                        {t.school_type && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t.school_type}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-sm text-gray-600 flex items-center"><Mail className="h-3 w-3 mr-1 text-gray-400" />{t.admin_email}</span>
                        {t.admin_phone && <span className="text-sm text-gray-600 flex items-center"><Phone className="h-3 w-3 mr-1 text-gray-400" />{t.admin_phone}</span>}
                        {t.county && <span className="text-sm text-gray-500">{t.county}</span>}
                      </div>
                      {t.subscription_end_date && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Subscription: {t.subscription_start_date ? new Date(t.subscription_start_date).toLocaleDateString() : '–'} → {new Date(t.subscription_end_date).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Registered: {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <div className="relative flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openMenu === t.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button onClick={() => handleLoginAs(t)} disabled={t.status !== 'active' || !!actionLoading}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed">
                          {actionLoading === 'login_' + t.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                          Login as Admin
                        </button>
                        <button onClick={() => openEdit(t)}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit2 className="h-4 w-4 mr-2" /> Edit Details
                        </button>
                        <button onClick={() => openPayments(t)}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <DollarSign className="h-4 w-4 mr-2" /> View Payments
                        </button>
                        <button onClick={() => { setSelectedTenant(t); setExtendMonths(12); setModal('extend'); setOpenMenu(null); }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50">
                          <Clock className="h-4 w-4 mr-2" /> Extend Subscription
                        </button>
                        <hr className="my-1" />
                        {t.status !== 'active' ? (
                          <button onClick={() => handleActivate(t)} disabled={!!actionLoading}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50">
                            {actionLoading === 'activate_' + t.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Activate
                          </button>
                        ) : (
                          <button onClick={() => handleSuspend(t)} disabled={!!actionLoading}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50">
                            {actionLoading === 'suspend_' + t.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                            Suspend
                          </button>
                        )}
                        <button onClick={() => { setConfirmDelete(t.id); setOpenMenu(null); }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Close dropdown on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}

      {/* Delete Confirm Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete School?</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">This will permanently delete the school and all its data. This action cannot be undone.</p>
            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading.startsWith('delete') ? <Loader2 className="animate-spin h-4 w-4" /> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Add New School' : `Edit: ${selectedTenant?.school_name}`}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}
              {[
                { name: 'school_name', label: 'School Name *', placeholder: 'Full school name' },
                { name: 'admin_name', label: 'Admin / Principal Name', placeholder: 'Full name' },
                { name: 'admin_email', label: 'Admin Email *', placeholder: 'email@school.ac.ke', type: 'email' },
                { name: 'admin_phone', label: 'Admin Phone', placeholder: '07XXXXXXXX' },
                { name: 'school_address', label: 'Address', placeholder: 'P.O. Box, Street' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    name={f.name}
                    value={(form as any)[f.name]}
                    onChange={e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
                  <select name="school_type" value={form.school_type} onChange={e => setForm(p => ({ ...p, school_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                    <option value="">Select...</option>
                    {['Primary School', 'Secondary School', 'Mixed', 'Pre-Primary', 'University', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                  <select name="county" value={form.county} onChange={e => setForm(p => ({ ...p, county: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                    <option value="">Select...</option>
                    {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Meru', 'Nyeri', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading === 'save'} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
                  {actionLoading === 'save' ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving...</> : modal === 'create' ? 'Create School' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {modal === 'payments' && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
                <p className="text-sm text-gray-500">{selectedTenant.school_name}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">KSh {parseFloat(p.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{p.payment_type || 'Payment'} · {p.mpesa_receipt || p.reference || '—'}</p>
                        <p className="text-xs text-gray-400">{new Date(p.paid_at || p.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status || 'completed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {modal === 'extend' && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Extend Subscription</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedTenant.school_name}</p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Extension Period</label>
              <select value={extendMonths} onChange={e => setExtendMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                <option value={1}>1 month — KSh 833</option>
                <option value={3}>3 months — KSh 2,500</option>
                <option value={6}>6 months — KSh 5,000</option>
                <option value={12}>12 months — KSh 10,000</option>
                <option value={24}>24 months — KSh 20,000</option>
              </select>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 mb-5">
              <p className="text-sm text-blue-700">
                New expiry: <strong>{(() => {
                  const base = selectedTenant.subscription_end_date ? new Date(selectedTenant.subscription_end_date) : new Date();
                  base.setMonth(base.getMonth() + extendMonths);
                  return base.toLocaleDateString();
                })()}</strong>
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleExtend} disabled={actionLoading === 'extend'}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {actionLoading === 'extend' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Extend'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
