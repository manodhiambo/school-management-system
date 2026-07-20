import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, DollarSign, Bus, Users, Loader2, Eye, CheckCircle2, XCircle, Link2 } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

const STUDENT_TYPE_LABEL: Record<string, string> = {
  all: 'All Students',
  boarder: 'Boarders Only',
  day_scholar: 'Day Scholars Only',
};

const EMPTY_FORM = {
  name: '',
  amount: '',
  frequency: 'quarterly',
  description: '',
  dueDay: '15',
  classId: '',
  academicYear: new Date().getFullYear().toString(),
  isMandatory: true,
  lateFeeAmount: '0',
  gracePeriodDays: '0',
  student_type: 'all',
  is_transport_fee: false,
  route_id: '',
  term: '',
};

export function FeeStructurePage() {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const isFinanceOfficer = user?.role === 'finance_officer';
  const [activeTab, setActiveTab] = useState<'structures' | 'bulk'>('structures');
  const [structures, setStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Bulk generate state
  const [bulkForm, setBulkForm] = useState({
    class_ids: [] as string[],
    fee_structure_ids: [] as string[],
    due_date: '',
    term: 'term1',
    academic_year: new Date().getFullYear().toString(),
  });
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkPreviewing, setBulkPreviewing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [structuresRes, classesRes, routesRes]: any = await Promise.all([
        api.getFeeStructures(),
        api.getClasses(),
        api.getTransportRoutes(),
      ]);
      setStructures(structuresRes.data || []);
      setClasses(classesRes.data || []);
      setRoutes(routesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        description: formData.description,
        due_day: parseInt(formData.dueDay),
        class_id: formData.classId || null,
        academic_year: formData.academicYear,
        is_mandatory: formData.isMandatory,
        late_fee_amount: parseFloat(formData.lateFeeAmount) || 0,
        grace_period_days: parseInt(formData.gracePeriodDays) || 0,
        student_type: formData.student_type,
        is_transport_fee: formData.is_transport_fee,
        route_id: formData.is_transport_fee ? (formData.route_id || null) : null,
        term: formData.term || null,
      };
      if (editingStructure) {
        await api.updateFeeStructure(editingStructure.id, payload);
      } else {
        await api.createFeeStructure(payload);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save fee structure');
    }
  };

  const handleEdit = (structure: any) => {
    setEditingStructure(structure);
    setFormData({
      name: structure.name || '',
      amount: structure.amount?.toString() || '',
      frequency: structure.frequency || 'quarterly',
      description: structure.description || '',
      dueDay: structure.due_day?.toString() || '15',
      classId: structure.class_id || '',
      academicYear: structure.academic_year || new Date().getFullYear().toString(),
      isMandatory: structure.is_mandatory ?? true,
      lateFeeAmount: structure.late_fee_amount?.toString() || '0',
      gracePeriodDays: structure.grace_period_days?.toString() || '0',
      student_type: structure.student_type || 'all',
      is_transport_fee: structure.is_transport_fee ?? false,
      route_id: structure.route_id || '',
      term: structure.term || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee structure permanently? This cannot be undone.')) return;
    try {
      await api.deleteFeeStructure(id);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete fee structure');
    }
  };

  const resetForm = () => {
    setEditingStructure(null);
    setFormData({ ...EMPTY_FORM });
  };

  // Bulk helpers
  const toggleBulkClass = (id: string) => {
    setBulkForm(f => ({
      ...f,
      class_ids: f.class_ids.includes(id) ? f.class_ids.filter(c => c !== id) : [...f.class_ids, id],
    }));
    setBulkPreview(null);
  };
  const toggleBulkStructure = (id: string) => {
    setBulkForm(f => ({
      ...f,
      fee_structure_ids: f.fee_structure_ids.includes(id) ? f.fee_structure_ids.filter(s => s !== id) : [...f.fee_structure_ids, id],
    }));
    setBulkPreview(null);
  };

  const runBulk = async (dryRun: boolean) => {
    if (!bulkForm.fee_structure_ids.length) { alert('Select at least one fee structure.'); return; }
    if (dryRun) setBulkPreviewing(true); else setBulkGenerating(true);
    try {
      const res: any = await api.bulkSmartGenerateInvoices({ ...bulkForm, dry_run: dryRun });
      if (dryRun) {
        setBulkPreview(res.data);
      } else {
        alert(`Done! ${res.data?.created?.length || 0} invoices created, ${res.data?.errors?.length || 0} errors.`);
        setBulkPreview(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setBulkPreviewing(false);
      setBulkGenerating(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
  const freqLabel: Record<string, string> = {
    monthly: 'Monthly', quarterly: 'Per Term', half_yearly: 'Half Yearly', yearly: 'Yearly', one_time: 'One Time',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('Fee Structures')}</h2>
          <p className="text-gray-500">{t('Manage fee structures and bulk invoice generation')}</p>
        </div>
        {activeTab === 'structures' && !isFinanceOfficer && (
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {t('Add Fee Structure')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['structures', 'bulk'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab === 'structures' ? t('Fee Structures') : t('Bulk Generate Invoices')}
          </button>
        ))}
      </div>

      {activeTab === 'structures' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Total Active')}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{structures.length}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Boarder Fees')}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-purple-600">{structures.filter(s => s.student_type === 'boarder').length}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Day Scholar Fees')}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{structures.filter(s => s.student_type === 'day_scholar').length}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('Transport Fees')}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{structures.filter(s => s.is_transport_fee).length}</div></CardContent></Card>
          </div>

          {/* List */}
          <Card>
            <CardContent className="p-0">
              {structures.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">{t('No fee structure found')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">{t('Name')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Amount')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Frequency')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Term')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Applies To')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Class')}</th>
                        <th className="text-left px-4 py-3 font-medium">{t('Type')}</th>
                        <th className="text-center px-4 py-3 font-medium">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {structures.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                            {s.is_transport_fee && s.route_name && (
                              <p className="text-xs text-orange-500 flex items-center gap-1 mt-0.5">
                                <Bus className="h-3 w-3" /> Route: {s.route_name}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold">{fmt(s.amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{freqLabel[s.frequency] || s.frequency}</td>
                          <td className="px-4 py-3">
                            {s.term ? (
                              <Badge className="bg-amber-100 text-amber-800">{s.term.replace('term', 'Term ')}</Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">{t('All Terms')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={s.student_type === 'boarder' ? 'bg-purple-100 text-purple-800' : s.student_type === 'day_scholar' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}>
                              {STUDENT_TYPE_LABEL[s.student_type] || 'All Students'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{s.class_name || t('All Classes')}</td>
                          <td className="px-4 py-3 text-center">
                            {s.is_transport_fee && (
                              <Badge className="bg-orange-100 text-orange-700 mr-1">
                                <Bus className="h-3 w-3 mr-1" />Transport
                              </Badge>
                            )}
                            {s.extra_fee_id && (
                              <Badge className="bg-indigo-100 text-indigo-700">
                                <Link2 className="h-3 w-3 mr-1" />Extra Fee
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(s.is_transport_fee || s.extra_fee_id) ? (
                              <p className="text-xs text-gray-400 text-center italic">{t('Auto-managed')}</p>
                            ) : isFinanceOfficer ? (
                              <p className="text-xs text-gray-400 text-center italic">{t('View only')}</p>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(s.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Configure */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('1. Select Classes')}</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {classes.length === 0 && <p className="text-sm text-gray-400">{t('No classes found')}</p>}
                {classes.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input type="checkbox" checked={bulkForm.class_ids.includes(c.id)} onChange={() => toggleBulkClass(c.id)} className="rounded" />
                    <span className="text-sm">{c.name}{c.section ? ` (${c.section})` : ''}</span>
                  </label>
                ))}
                <button className="text-xs text-blue-500 mt-1" onClick={() => setBulkForm(f => ({ ...f, class_ids: bulkForm.class_ids.length === classes.length ? [] : classes.map((c: any) => c.id) }))}>
                  {bulkForm.class_ids.length === classes.length ? t('Deselect All') : t('Select All')}
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t('2. Select Fee Structures')}</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {structures.length === 0 && <p className="text-sm text-gray-400">{t('No fee structure found')}</p>}
                {structures.map((s: any) => (
                  <label key={s.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                    <input type="checkbox" checked={bulkForm.fee_structure_ids.includes(s.id)} onChange={() => toggleBulkStructure(s.id)} className="rounded mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <span className="text-xs text-gray-500">{fmt(s.amount)}</span>
                        <Badge className={`text-xs px-1 py-0 ${s.student_type === 'boarder' ? 'bg-purple-100 text-purple-700' : s.student_type === 'day_scholar' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {STUDENT_TYPE_LABEL[s.student_type]}
                        </Badge>
                        {s.is_transport_fee && <Badge className="text-xs px-1 py-0 bg-orange-100 text-orange-700"><Bus className="h-2.5 w-2.5 mr-0.5" />Transport</Badge>}
                      </div>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t('3. Invoice Settings')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t('Term')}</Label>
                  <Select value={bulkForm.term} onChange={e => setBulkForm(f => ({ ...f, term: e.target.value }))}>
                    <option value="term1">Term 1</option>
                    <option value="term2">Term 2</option>
                    <option value="term3">Term 3</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t('Academic Year')}</Label>
                  <Input value={bulkForm.academic_year} onChange={e => setBulkForm(f => ({ ...f, academic_year: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">{t('Due Date (optional)')}</Label>
                  <Input type="date" value={bulkForm.due_date} onChange={e => setBulkForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => runBulk(true)} disabled={bulkPreviewing || bulkGenerating}>
                {bulkPreviewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {t('Preview')}
              </Button>
              <Button className="flex-1" onClick={() => runBulk(false)} disabled={bulkGenerating || bulkPreviewing || !bulkPreview}>
                {bulkGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                {t('Generate')}
              </Button>
            </div>
            {!bulkPreview && <p className="text-xs text-gray-400 text-center">Preview first to confirm which students will receive invoices, then click Generate.</p>}
          </div>

          {/* Right: Preview results */}
          <div className="lg:col-span-2">
            {!bulkPreview ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">{t('Configure options on the left and click Preview to see which students will be billed.')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{bulkPreview.created?.length || 0}</p>
                      <p className="text-xs text-green-600">{t('Will be billed')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-gray-600">{bulkPreview.skipped?.length || 0}</p>
                      <p className="text-xs text-gray-500">{t('Skipped')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">
                        {fmt(bulkPreview.created?.reduce((s: number, i: any) => s + Number(i.amount || 0), 0) || 0)}
                      </p>
                      <p className="text-xs text-blue-600">{t('Total to generate')}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Will be billed */}
                {bulkPreview.created?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> {t('Students to be Billed')}</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-64 overflow-y-auto divide-y text-sm">
                        {bulkPreview.created.map((row: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                            <div>
                              <span className="font-medium">{row.name}</span>
                              <span className="text-xs text-gray-400 ml-2">{row.class_name}</span>
                              <Badge className={`ml-2 text-xs ${row.student_type === 'boarder' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {row.student_type || 'day_scholar'}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{fmt(row.amount)}</p>
                              <p className="text-xs text-gray-400">{row.fee}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Skipped */}
                {bulkPreview.skipped?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-gray-400" /> Skipped ({bulkPreview.skipped.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-gray-500">
                        {['student_type_mismatch', 'no_transport', 'route_mismatch'].map(reason => {
                          const count = bulkPreview.skipped.filter((s: any) => s.reason === reason).length;
                          if (!count) return null;
                          const label = reason === 'student_type_mismatch' ? 'Wrong student category' : reason === 'no_transport' ? 'No transport assigned' : 'Different route';
                          return <p key={reason}><span className="font-medium">{count}</span> — {label}</p>;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStructure ? t('Edit Fee Structure') : t('Add Fee Structure')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">

              {/* Name & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Fee Name')} *</Label>
                  <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder={t('e.g., Tuition Fee')} required />
                </div>
                <div>
                  <Label>{t('Amount (KES)')} *</Label>
                  <Input type="number" value={formData.amount} onChange={e => handleChange('amount', e.target.value)} placeholder="50000" required />
                </div>
              </div>

              {/* Student Type */}
              <div>
                <Label>{t('Student Type')}</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { value: 'all', label: 'All Students' },
                    { value: 'day_scholar', label: 'Day Scholar' },
                    { value: 'boarder', label: 'Boarder' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => handleChange('student_type', opt.value)}
                      className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                        formData.student_type === opt.value
                          ? opt.value === 'boarder' ? 'bg-purple-600 text-white border-purple-600'
                            : opt.value === 'day_scholar' ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Frequency')} *</Label>
                  <Select value={formData.frequency} onChange={e => handleChange('frequency', e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (Per Term)</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One Time</option>
                  </Select>
                </div>
                <div>
                  <Label>{t('Academic Year')}</Label>
                  <Input value={formData.academicYear} onChange={e => handleChange('academicYear', e.target.value)} />
                </div>
              </div>

              {/* Term */}
              <div>
                <Label>{t('Term')}</Label>
                <Select value={formData.term} onChange={e => handleChange('term', e.target.value)}>
                  <option value="">{t('All Terms (same amount every term)')}</option>
                  <option value="term1">{t('Term 1 only')}</option>
                  <option value="term2">{t('Term 2 only')}</option>
                  <option value="term3">{t('Term 3 only')}</option>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  {t('Set this when a fee amount differs by term (e.g. tuition). Create one entry per term with its own amount. Leave as "All Terms" for fees like transport or lunch that don\'t change by term.')}
                </p>
              </div>

              {/* Transport Fee */}
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <input type="checkbox" id="is_transport_fee" checked={formData.is_transport_fee}
                  onChange={e => handleChange('is_transport_fee', e.target.checked)} className="rounded mt-0.5" />
                <div className="flex-1">
                  <label htmlFor="is_transport_fee" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    <Bus className="h-4 w-4 text-orange-500" /> {t('This is a transport fee')}
                  </label>
                  {formData.is_transport_fee && (
                    <div className="mt-2">
                      <Label className="text-xs">{t('Route (optional)')}</Label>
                      <Select value={formData.route_id} onChange={e => handleChange('route_id', e.target.value)}>
                        <option value="">{t('All routes')}</option>
                        {routes.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.route_name}{r.route_code ? ` (${r.route_code})` : ''} — KES {Number(r.term_fee || 0).toLocaleString()}/term</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Apply to Class')}</Label>
                  <Select value={formData.classId} onChange={e => handleChange('classId', e.target.value)}>
                    <option value="">{t('All Classes')}</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name} {cls.section || ''}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{t('Due Day of Month')}</Label>
                  <Input type="number" min="1" max="28" value={formData.dueDay} onChange={e => handleChange('dueDay', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>{t('Description')}</Label>
                <Input value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder={t('Optional description')} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isMandatory} onChange={e => handleChange('isMandatory', e.target.checked)} className="rounded" />
                <span className="text-sm">{t('Mandatory fee')}</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('Cancel')}</Button>
              <Button type="submit">{editingStructure ? t('Update') : t('Create')} {t('Fee Structure')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
