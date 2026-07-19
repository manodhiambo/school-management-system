import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Plus, RefreshCw, Search, CheckCircle,
  Trash2, Award
} from 'lucide-react';

type Tab = 'templates' | 'appraisals' | 'history';

const GRADE_COLORS: Record<string, string> = {
  Excellent:     'bg-green-100 text-green-800',
  Good:          'bg-blue-100 text-blue-800',
  Satisfactory:  'bg-yellow-100 text-yellow-800',
  Needs_Improvement: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-green-100 text-green-800',
};

function calcGrade(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 85) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Satisfactory';
  return 'Needs_Improvement';
}

export function AppraisalPage() {
  const { toast } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const isTeacher = user?.role === 'teacher';

  const [tab, setTab] = useState<Tab>(isAdmin ? 'templates' : 'appraisals');
  const [loading, setLoading] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', criteria: [{ name: '', max_score: 10 }] });

  // Appraisals
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [showApprForm, setShowApprForm] = useState(false);
  const [apprForm, setApprForm] = useState({ staff_id: '', template_id: '', period: '', scores: {} as Record<string, number> });
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  // History
  const [histSearch, setHistSearch] = useState('');

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if ((tab === 'templates' || tab === 'appraisals') && isAdmin) {
        const tRes: any = await (api as any).getAppraisalTemplates();
        setTemplates(tRes?.data || []);
      }
      if (tab === 'appraisals' || tab === 'history') {
        const aRes: any = await (api as any).getAppraisals();
        setAppraisals(aRes?.data || []);
        const sRes: any = await api.getTeachers();
        setStaffList(sRes?.data || []);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const addCriterion = () => {
    setTplForm(f => ({ ...f, criteria: [...f.criteria, { name: '', max_score: 10 }] }));
  };
  const removeCriterion = (i: number) => {
    setTplForm(f => ({ ...f, criteria: f.criteria.filter((_, idx) => idx !== i) }));
  };
  const updateCriterion = (i: number, field: string, val: any) => {
    setTplForm(f => ({
      ...f,
      criteria: f.criteria.map((c, idx) => idx === i ? { ...c, [field]: val } : c),
    }));
  };

  const saveTemplate = async () => {
    try {
      await (api as any).createAppraisalTemplate(tplForm);
      toast({ title: 'Template created' });
      setShowTplForm(false);
      setTplForm({ name: '', criteria: [{ name: '', max_score: 10 }] });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const onTemplateSelect = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId);
    setSelectedTemplate(tpl || null);
    const scores: Record<string, number> = {};
    if (tpl?.criteria) tpl.criteria.forEach((c: any) => { scores[c.id || c.name] = 0; });
    setApprForm(f => ({ ...f, template_id: tplId, scores }));
  };

  const totalScore = selectedTemplate
    ? Object.values(apprForm.scores).reduce((s, v) => s + (v || 0), 0)
    : 0;
  const maxScore = selectedTemplate
    ? (selectedTemplate.criteria || []).reduce((s: number, c: any) => s + Number(c.max_score || 0), 0)
    : 0;

  const saveAppraisal = async () => {
    try {
      await (api as any).createAppraisal(apprForm);
      toast({ title: 'Appraisal created' });
      setShowApprForm(false);
      setApprForm({ staff_id: '', template_id: '', period: '', scores: {} });
      setSelectedTemplate(null);
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const submitAppraisal = async (id: string) => {
    try {
      await (api as any).submitAppraisal(id);
      toast({ title: 'Appraisal submitted' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const acknowledgeAppraisal = async (id: string) => {
    try {
      await (api as any).acknowledgeAppraisal(id);
      toast({ title: 'Appraisal acknowledged' });
      loadTab();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredHistory = appraisals.filter(a =>
    !histSearch || (a.staff_name || '').toLowerCase().includes(histSearch.toLowerCase())
  );

  if (!isAdmin && !isTeacher) {
    return <div className="p-6 text-center text-gray-400">Access restricted</div>;
  }

  // Teacher-only view
  if (isTeacher) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appraisals</h1>
          <p className="text-sm text-gray-500 mt-1">View and acknowledge your performance appraisals</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : appraisals.filter(a => a.staff_id === user?.id).length === 0 ? (
          <div className="text-center py-12 text-gray-400">No appraisals assigned to you yet</div>
        ) : (
          <div className="space-y-4">
            {appraisals.filter(a => a.staff_id === user?.id).map(a => (
              <Card key={a.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-lg">{a.period}</div>
                      <div className="text-sm text-gray-500">Template: {a.template_name}</div>
                      <div className="text-sm mt-2">
                        Score: <span className="font-medium">{a.total_score} / {a.max_score}</span>
                        &nbsp;–&nbsp;
                        <Badge className={GRADE_COLORS[a.grade] || ''}>{a.grade}</Badge>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[a.status] || ''}>{a.status}</Badge>
                  </div>
                  {a.status === 'submitted' && (
                    <Button className="mt-4" size="sm" onClick={() => acknowledgeAppraisal(a.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Acknowledge
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const TABS = [
    { key: 'templates' as Tab, label: 'Templates' },
    { key: 'appraisals' as Tab, label: 'Appraisals' },
    { key: 'history' as Tab, label: 'History' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Performance Appraisals</h1>
        <p className="text-sm text-gray-500 mt-1">Manage appraisal templates and staff evaluations</p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>
      )}

      {/* TEMPLATES */}
      {!loading && tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Appraisal Templates</h2>
            <Button onClick={() => setShowTplForm(!showTplForm)}>
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          </div>

          {showTplForm && (
            <Card><CardContent className="pt-6">
              <div className="mb-4">
                <Label>Template Name</Label>
                <Input className="mt-1" placeholder="e.g. Teacher Annual Appraisal" value={tplForm.name}
                  onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Criteria</Label>
                  <Button size="sm" variant="outline" onClick={addCriterion}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {tplForm.criteria.map((c, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Input placeholder="Criterion name (e.g. Lesson Planning)" value={c.name}
                      onChange={e => updateCriterion(i, 'name', e.target.value)} />
                    <Input type="number" placeholder="Max" className="w-24" value={c.max_score}
                      onChange={e => updateCriterion(i, 'max_score', Number(e.target.value))} />
                    {tplForm.criteria.length > 1 && (
                      <Button size="sm" variant="outline" className="text-red-600 shrink-0"
                        onClick={() => removeCriterion(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={saveTemplate}>Save Template</Button>
                <Button variant="outline" onClick={() => setShowTplForm(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No templates yet</div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <Card key={t.id}>
                  <CardContent className="pt-6">
                    <div className="font-semibold">{t.name}</div>
                    <div className="mt-2 space-y-1">
                      {(t.criteria || []).map((c: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm text-gray-600">
                          <span>{c.name}</span>
                          <span className="font-medium">/{c.max_score}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Total: {(t.criteria || []).reduce((s: number, c: any) => s + Number(c.max_score||0), 0)} marks
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPRAISALS */}
      {!loading && tab === 'appraisals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Appraisals</h2>
            <Button onClick={() => setShowApprForm(!showApprForm)}>
              <Plus className="h-4 w-4 mr-2" /> New Appraisal
            </Button>
          </div>

          {showApprForm && (
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Staff Member</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={apprForm.staff_id}
                    onChange={e => setApprForm(f => ({ ...f, staff_id: e.target.value }))}>
                    <option value="">Select staff</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name || [s.first_name, s.last_name].filter(Boolean).join(' ')}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Template</Label>
                  <select className="w-full mt-1 border rounded px-3 py-2 text-sm"
                    value={apprForm.template_id}
                    onChange={e => onTemplateSelect(e.target.value)}>
                    <option value="">Select template</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Period (e.g. Term 1 2025)</Label>
                  <Input className="mt-1" placeholder="Term 1 2025" value={apprForm.period}
                    onChange={e => setApprForm(f => ({ ...f, period: e.target.value }))} />
                </div>
              </div>

              {selectedTemplate && (
                <div className="space-y-3 mb-4">
                  <Label>Score Entry</Label>
                  {(selectedTemplate.criteria || []).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm flex-1">{c.name}</span>
                      <Input type="number" min={0} max={c.max_score} className="w-24"
                        value={apprForm.scores[c.id || c.name] || 0}
                        onChange={e => setApprForm(f => ({
                          ...f,
                          scores: { ...f.scores, [c.id || c.name]: Number(e.target.value) }
                        }))} />
                      <span className="text-sm text-gray-400">/ {c.max_score}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Total: {totalScore} / {maxScore}</span>
                    <Badge className={GRADE_COLORS[calcGrade(totalScore, maxScore)] || ''}>
                      {calcGrade(totalScore, maxScore).replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={saveAppraisal}>Save Appraisal</Button>
                <Button variant="outline" onClick={() => { setShowApprForm(false); setSelectedTemplate(null); }}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          {appraisals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No appraisals yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-3 pr-4">Staff</th>
                    <th className="text-left py-3 pr-4">Period</th>
                    <th className="text-right py-3 pr-4">Score</th>
                    <th className="text-left py-3 pr-4">Grade</th>
                    <th className="text-left py-3 pr-4">Status</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appraisals.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{a.staff_name}</td>
                      <td className="py-3 pr-4">{a.period}</td>
                      <td className="py-3 pr-4 text-right">{a.total_score}/{a.max_score}</td>
                      <td className="py-3 pr-4">
                        <Badge className={GRADE_COLORS[a.grade] || ''}>{(a.grade||'').replace('_',' ')}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={STATUS_COLORS[a.status] || ''}>{a.status}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {a.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => submitAppraisal(a.id)}>
                              Submit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {!loading && tab === 'history' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search by staff name..." value={histSearch}
              onChange={e => setHistSearch(e.target.value)} />
          </div>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No appraisal history found</div>
          ) : (
            <div className="space-y-4">
              {Array.from(new Set(filteredHistory.map(a => a.staff_id))).map(staffId => {
                const staffAppraisals = filteredHistory.filter(a => a.staff_id === staffId);
                const firstName = staffAppraisals[0]?.staff_name || 'Staff';
                return (
                  <Card key={staffId as string}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4 text-blue-500" /> {firstName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {staffAppraisals.map(a => (
                          <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <div className="text-sm font-medium">{a.period}</div>
                              <div className="text-xs text-gray-500">{a.template_name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{a.total_score}/{a.max_score}</span>
                              <Badge className={GRADE_COLORS[a.grade] || ''}>{(a.grade||'').replace('_',' ')}</Badge>
                              <Badge className={STATUS_COLORS[a.status] || ''}>{a.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
