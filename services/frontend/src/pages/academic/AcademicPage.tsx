import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen, GraduationCap, FileText, Calendar, Plus, CheckCircle,
  ClipboardList, FolderOpen, Star, Lightbulb, Target, Users,
  BookMarked, TrendingUp, Award, ChevronDown, ChevronRight,
  Edit2, Trash2, X, Save, Eye, ArrowUpCircle, BarChart2,
  Building2, Layers, AlertCircle, RefreshCw,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// ── Helper: CBC grade badge ──────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  EE: 'bg-green-100 text-green-800',
  ME: 'bg-blue-100 text-blue-800',
  AE: 'bg-yellow-100 text-yellow-800',
  BE: 'bg-red-100 text-red-800',
  WD: 'bg-green-100 text-green-800',
  D: 'bg-blue-100 text-blue-800',
  B: 'bg-yellow-100 text-yellow-800',
};
const GradeBadge = ({ grade }: { grade?: string }) => {
  if (!grade) return <span className="text-gray-400">—</span>;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[grade] || 'bg-gray-100 text-gray-700'}`}>
      {grade}
    </span>
  );
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-200 text-gray-600',
  moderated: 'bg-purple-100 text-purple-700',
  completed: 'bg-indigo-100 text-indigo-700',
};
const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',           icon: BarChart2 },
  { id: 'classes',    label: 'Classes & Rooms',     icon: Building2 },
  { id: 'subjects',   label: 'Learning Areas',      icon: Layers },
  { id: 'schemes',    label: 'Schemes of Work',     icon: ClipboardList },
  { id: 'lessons',    label: 'Lesson Plans',        icon: BookOpen },
  { id: 'sba',        label: 'SBA',                 icon: Target },
  { id: 'projects',   label: 'Projects',            icon: FolderOpen },
  { id: 'lifeskills', label: 'Values & Life Skills',icon: Star },
  { id: 'career',     label: 'Career Guidance',     icon: Lightbulb },
  { id: 'materials',  label: 'Learning Materials',  icon: BookMarked },
  { id: 'promotion',  label: 'Promotion',           icon: ArrowUpCircle },
];

type Tab = typeof TABS[number]['id'];

export function AcademicPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [strands, setStrands] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.getAcademicClasses().catch(() => ({ data: [] })),
      api.getAcademicSubjects().catch(() => ({ data: [] })),
      api.getCbcStrands().catch(() => ({ data: [] })),
      api.getAcademicsDashboard().catch(() => ({ data: null })),
    ]).then(([c, s, st, d]: any) => {
      setClasses(c.data || []);
      setSubjects(s.data || []);
      setStrands(st.data || []);
      setDashboard(d.data || null);
    });
  }, []);

  const currentYear = new Date().getFullYear().toString();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">CBC Academics Module</h2>
        <p className="text-sm text-gray-500">Kenya Competency-Based Curriculum — full academic management</p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <OverviewTab dashboard={dashboard} isAdmin={isAdmin} onSetupDone={() => {
            Promise.all([
              api.getAcademicClasses().catch(() => ({ data: [] })),
              api.getAcademicSubjects().catch(() => ({ data: [] })),
            ]).then(([c, s]: any) => {
              setClasses(c.data || []);
              setSubjects(s.data || []);
            });
          }} />
        )}
        {activeTab === 'classes' && (
          <ClassesRoomsTab
            classes={classes} subjects={subjects}
            isAdmin={isAdmin}
            onRefresh={() => api.getAcademicClasses().then((r: any) => setClasses(r.data || []))}
          />
        )}
        {activeTab === 'subjects' && (
          <SubjectsTab
            subjects={subjects} isAdmin={isAdmin}
            onRefresh={() => api.getAcademicSubjects().then((r: any) => setSubjects(r.data || []))}
          />
        )}
        {activeTab === 'schemes' && (
          <SchemesTab classes={classes} subjects={subjects} strands={strands} currentYear={currentYear} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'lessons' && (
          <LessonPlansTab classes={classes} subjects={subjects} strands={strands} currentYear={currentYear} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'sba' && (
          <SbaTab classes={classes} subjects={subjects} strands={strands} currentYear={currentYear} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab classes={classes} subjects={subjects} strands={strands} currentYear={currentYear} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'lifeskills' && (
          <LifeSkillsTab classes={classes} currentYear={currentYear} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'career' && (
          <CareerTab classes={classes} currentYear={currentYear} isAdmin={isAdmin} />
        )}
        {activeTab === 'materials' && (
          <MaterialsTab classes={classes} subjects={subjects} strands={strands} isAdmin={isAdmin} isTeacher={isTeacher} />
        )}
        {activeTab === 'promotion' && (
          <PromotionTab classes={classes} currentYear={currentYear} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────
function OverviewTab({ dashboard, isAdmin, onSetupDone }: { dashboard: any; isAdmin: boolean; onSetupDone: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [setupStatus, setSetupStatus] = useState<any>(null);

  useEffect(() => {
    if (isAdmin) {
      api.getSetupStatus().then((r: any) => setSetupStatus(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const seedAll = async () => {
    setSeeding(true);
    try {
      const res: any = await api.seedCbcAll();
      alert(res.message || 'Seeding complete!');
      onSetupDone();
      api.getSetupStatus().then((r: any) => setSetupStatus(r.data)).catch(() => {});
    } catch (e: any) { alert(e.message); }
    finally { setSeeding(false); }
  };
  const stats = [
    { label: 'Schemes of Work', value: dashboard?.schemes?.total ?? '—', sub: `${dashboard?.schemes?.approved ?? 0} approved`, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'Lesson Plans', value: dashboard?.lesson_plans?.total ?? '—', sub: `${dashboard?.lesson_plans?.approved ?? 0} approved`, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'SBA Assessments', value: dashboard?.sbas?.total ?? '—', sub: 'this term', icon: Target, color: 'text-orange-600 bg-orange-50' },
    { label: 'Active Projects', value: dashboard?.projects?.active ?? '—', sub: `${dashboard?.projects?.total ?? 0} total`, icon: FolderOpen, color: 'text-purple-600 bg-purple-50' },
    { label: 'Learning Materials', value: dashboard?.materials?.total ?? '—', sub: 'in library', icon: BookMarked, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Setup Wizard Banner */}
      {isAdmin && setupStatus?.needs_setup && (
        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-6 bg-indigo-50 flex flex-col md:flex-row items-center gap-4">
          <AlertCircle className="h-10 w-10 text-indigo-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-800">Set Up Your School's Academic Structure</h3>
            <p className="text-sm text-indigo-600 mt-0.5">
              No classes or subjects found. Load the complete Kenya CBC curriculum — all classes from Playgroup to Grade 12
              and all learning areas per level — with one click. You can add more or customize after.
            </p>
          </div>
          <Button onClick={seedAll} disabled={seeding} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
            {seeding ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading...</> : '🇰🇪 Load CBC Defaults'}
          </Button>
        </div>
      )}
      {isAdmin && setupStatus && !setupStatus.needs_setup && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-sm">
          <span className="text-gray-600">
            <span className="font-medium">{setupStatus.class_count}</span> classes · <span className="font-medium">{setupStatus.subject_count}</span> learning areas configured
          </span>
          <Button size="sm" variant="outline" onClick={seedAll} disabled={seeding}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
            Add Missing CBC Defaults
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="text-center">
              <CardContent className="pt-4 pb-3">
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-full mb-2 ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium text-gray-700">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CBC Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { g: 'EE', label: 'Exceeding Expectations', range: '≥ 80%', color: 'border-green-400 bg-green-50' },
              { g: 'ME', label: 'Meeting Expectations', range: '60–79%', color: 'border-blue-400 bg-blue-50' },
              { g: 'AE', label: 'Approaching Expectations', range: '40–59%', color: 'border-yellow-400 bg-yellow-50' },
              { g: 'BE', label: 'Below Expectations', range: '< 40%', color: 'border-red-400 bg-red-50' },
            ].map((item) => (
              <div key={item.g} className={`border-l-4 rounded p-3 ${item.color}`}>
                <div className="text-lg font-bold">{item.g}</div>
                <div className="text-xs font-medium">{item.label}</div>
                <div className="text-xs text-gray-500">{item.range}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 font-medium mb-2">Pre-Primary (PP1/PP2/Playgroup)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { g: 'WD', label: 'Well Developed', range: '≥ 70%', color: 'border-green-400 bg-green-50' },
                { g: 'D', label: 'Developing', range: '40–69%', color: 'border-yellow-400 bg-yellow-50' },
                { g: 'B', label: 'Beginning', range: '< 40%', color: 'border-red-400 bg-red-50' },
              ].map((item) => (
                <div key={item.g} className={`border-l-4 rounded p-3 ${item.color}`}>
                  <div className="text-lg font-bold">{item.g}</div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.range}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Kenya CBC Education Structure</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { level: 'Playgroup / PP1–PP2', grades: 'Ages 3–5', system: 'WD / D / B', color: 'bg-pink-50 border-pink-200' },
              { level: 'Lower Primary (Grade 1–3)', grades: 'Ages 6–8', system: 'EE / ME / AE / BE', color: 'bg-blue-50 border-blue-200' },
              { level: 'Upper Primary (Grade 4–6)', grades: 'Ages 9–11', system: 'EE / ME / AE / BE', color: 'bg-indigo-50 border-indigo-200' },
              { level: 'Junior Secondary (Grade 7–9)', grades: 'Ages 12–14', system: 'EE / ME / AE / BE + SBA', color: 'bg-emerald-50 border-emerald-200' },
              { level: 'Senior Secondary (Grade 10–12)', grades: 'Ages 15–17', system: 'National Exams (KCSE equivalent)', color: 'bg-orange-50 border-orange-200' },
              { level: 'University / TVET', grades: 'Ages 18+', system: 'Institutional', color: 'bg-gray-50 border-gray-200' },
            ].map((row) => (
              <div key={row.level} className={`flex justify-between items-center px-4 py-2 rounded border ${row.color}`}>
                <span className="font-medium text-sm">{row.level}</span>
                <span className="text-xs text-gray-500">{row.grades}</span>
                <span className="text-xs font-medium text-gray-700">{row.system}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── SCHEMES OF WORK TAB ──────────────────────────────────────
function SchemesTab({ classes, subjects, strands, currentYear, isAdmin, isTeacher }: any) {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: '', status: '' });
  const [form, setForm] = useState({ subject_id: '', class_id: '', academic_year: currentYear, term: '1', title: '', total_weeks: 13, objectives: '', resources: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.getSchemes(filters);
      setSchemes(res.data || []);
    } catch { setSchemes([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    try {
      await api.createScheme(form);
      setShowForm(false);
      setForm({ subject_id: '', class_id: '', academic_year: currentYear, term: '1', title: '', total_weeks: 13, objectives: '', resources: '' });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const approve = async (id: string) => {
    await api.updateScheme(id, { status: 'approved' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 py-1 text-sm" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.term} onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        {(isAdmin || isTeacher) && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Scheme
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Scheme of Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select Class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Learning Area *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select Subject</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
              </div>
              <div>
                <Label>Term</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Scheme Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mathematics Grade 4 Term 1 Scheme" />
            </div>
            <div>
              <Label>Learning Objectives</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} />
            </div>
            <div>
              <Label>Teaching & Learning Resources</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save Scheme</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No schemes of work found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schemes.map((s: any) => (
            <div key={s.id} className="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {s.class_name} · {s.subject_name} · Term {s.term} {s.academic_year}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Teacher: {s.teacher_name} · {s.week_count} weeks planned
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {isAdmin && s.status === 'submitted' && (
                  <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => approve(s.id)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected(s)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <SchemeDetailModal scheme={selected} onClose={() => setSelected(null)} subjects={subjects} strands={strands} onSaved={load} />
      )}
    </div>
  );
}

function SchemeDetailModal({ scheme, onClose, onSaved }: any) {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api.getScheme(scheme.id).then((res: any) => setWeeks(res.data?.weeks || []));
  }, [scheme.id]);

  const saveWeeks = async () => {
    await api.saveSchemeWeeks(scheme.id, weeks);
    setEditing(false);
    onSaved();
  };

  const updateWeek = (i: number, field: string, val: string) => {
    setWeeks(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: val } : w));
  };

  const addWeek = () => {
    setWeeks(prev => [...prev, { week_number: prev.length + 1, topic: '', learning_outcomes: '', activities: '', resources: '', assessment_type: '' }]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{scheme.title}</h3>
            <p className="text-xs text-gray-500">{scheme.class_name} · {scheme.subject_name} · Term {scheme.term}</p>
          </div>
          <div className="flex gap-2">
            {!editing && <Button size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit Weeks</Button>}
            {editing && <Button size="sm" onClick={saveWeeks}><Save className="h-4 w-4 mr-1" /> Save</Button>}
            <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {editing && (
            <Button size="sm" variant="outline" onClick={addWeek}><Plus className="h-4 w-4 mr-1" /> Add Week</Button>
          )}
          {weeks.length === 0 && !editing && (
            <p className="text-center text-gray-400 py-8">No weeks planned yet. Click Edit Weeks to add.</p>
          )}
          {weeks.map((w, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">Week {w.week_number}</span>
                {editing ? (
                  <Input className="flex-1 h-7 text-sm" value={w.topic} onChange={e => updateWeek(i, 'topic', e.target.value)} placeholder="Topic / Content" />
                ) : (
                  <span className="font-medium text-sm">{w.topic}</span>
                )}
              </div>
              {editing ? (
                <div className="grid grid-cols-2 gap-2">
                  <textarea className="border rounded px-2 py-1 text-xs" rows={2} value={w.learning_outcomes || ''} onChange={e => updateWeek(i, 'learning_outcomes', e.target.value)} placeholder="Learning Outcomes" />
                  <textarea className="border rounded px-2 py-1 text-xs" rows={2} value={w.activities || ''} onChange={e => updateWeek(i, 'activities', e.target.value)} placeholder="Activities" />
                  <textarea className="border rounded px-2 py-1 text-xs" rows={2} value={w.resources || ''} onChange={e => updateWeek(i, 'resources', e.target.value)} placeholder="Resources" />
                  <Input className="h-7 text-xs" value={w.assessment_type || ''} onChange={e => updateWeek(i, 'assessment_type', e.target.value)} placeholder="Assessment type" />
                </div>
              ) : (
                <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                  {w.learning_outcomes && <p><span className="font-medium">Outcomes:</span> {w.learning_outcomes}</p>}
                  {w.activities && <p><span className="font-medium">Activities:</span> {w.activities}</p>}
                  {w.resources && <p><span className="font-medium">Resources:</span> {w.resources}</p>}
                  {w.assessment_type && <p><span className="font-medium">Assessment:</span> {w.assessment_type}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LESSON PLANS TAB ─────────────────────────────────────────
function LessonPlansTab({ classes, subjects, strands, currentYear, isAdmin, isTeacher }: any) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: '', status: '' });
  const [form, setForm] = useState<any>({
    subject_id: '', class_id: '', academic_year: currentYear, term: '1',
    week_number: 1, lesson_number: 1, topic: '', learning_objectives: '',
    teaching_methods: '', activities: '', homework: '', resources: '',
    assessment_method: '', date: '', duration_minutes: 40
  });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.getLessonPlans(filters);
      setPlans(res.data || []);
    } catch { setPlans([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    try {
      await api.createLessonPlan(form);
      setShowForm(false);
      load();
    } catch (e: any) { alert(e.message); }
  };

  const approve = async (id: string) => {
    await api.updateLessonPlan(id, { status: 'approved' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 py-1 text-sm" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.term} onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
            <option value="">All Terms</option>
            {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        {(isAdmin || isTeacher) && (
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Lesson Plan</Button>
        )}
      </div>

      {showForm && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-2"><CardTitle className="text-base">New Lesson Plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Class *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.class_id} onChange={e => setForm((f: any) => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Learning Area *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_id} onChange={e => setForm((f: any) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Term</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.term} onChange={e => setForm((f: any) => ({ ...f, term: e.target.value }))}>
                  {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
              <div>
                <Label>Week No.</Label>
                <Input type="number" min={1} max={13} value={form.week_number} onChange={e => setForm((f: any) => ({ ...f, week_number: e.target.value }))} />
              </div>
              <div>
                <Label>Lesson No.</Label>
                <Input type="number" min={1} value={form.lesson_number} onChange={e => setForm((f: any) => ({ ...f, lesson_number: e.target.value }))} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Topic / Title *</Label>
              <Input value={form.topic} onChange={e => setForm((f: any) => ({ ...f, topic: e.target.value }))} placeholder="e.g. Addition of fractions" />
            </div>
            <div>
              <Label>Learning Objectives *</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.learning_objectives} onChange={e => setForm((f: any) => ({ ...f, learning_objectives: e.target.value }))} placeholder="By the end of the lesson, learners should be able to..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Teaching Methods</Label>
                <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.teaching_methods} onChange={e => setForm((f: any) => ({ ...f, teaching_methods: e.target.value }))} placeholder="Discussion, demonstration, guided discovery..." />
              </div>
              <div>
                <Label>Learning Activities</Label>
                <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.activities} onChange={e => setForm((f: any) => ({ ...f, activities: e.target.value }))} placeholder="Group work, projects, practice..." />
              </div>
              <div>
                <Label>Resources</Label>
                <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.resources} onChange={e => setForm((f: any) => ({ ...f, resources: e.target.value }))} placeholder="Textbooks, charts, models..." />
              </div>
              <div>
                <Label>Assessment Method</Label>
                <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.assessment_method} onChange={e => setForm((f: any) => ({ ...f, assessment_method: e.target.value }))} placeholder="Oral questions, classwork, observation..." />
              </div>
            </div>
            <div>
              <Label>Homework</Label>
              <Input value={form.homework} onChange={e => setForm((f: any) => ({ ...f, homework: e.target.value }))} placeholder="Assignment or homework given" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="space-y-2">
          {plans.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No lesson plans found</p>
            </div>
          )}
          {plans.map((p: any) => (
            <div key={p.id} className="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50">
              <div>
                <div className="font-medium">{p.topic}</div>
                <div className="text-sm text-gray-500">{p.class_name} · {p.subject_name} · Term {p.term} Wk{p.week_number}/L{p.lesson_number}</div>
                <div className="text-xs text-gray-400">{p.teacher_name} · {p.date ? new Date(p.date).toLocaleDateString() : 'No date'}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {isAdmin && p.status === 'submitted' && (
                  <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => approve(p.id)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SBA TAB ──────────────────────────────────────────────────
function SbaTab({ classes, subjects, strands, currentYear, isAdmin, isTeacher }: any) {
  const [sbas, setSbas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({
    class_id: '', subject_id: '', strand_id: '', academic_year: currentYear, term: '1',
    title: '', assessment_type: 'classwork', description: '', max_score: 100,
    weight_percentage: 10, assessment_date: '', instructions: ''
  });
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: '' });

  const load = async () => {
    setLoading(true);
    try { const res: any = await api.getSbaSetups(filters); setSbas(res.data || []); }
    catch { setSbas([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    try { await api.createSbaSetup(form); setShowForm(false); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.term} onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
            <option value="">All Terms</option>
            {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
        </div>
        {(isAdmin || isTeacher) && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New SBA</Button>}
      </div>

      {showForm && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2"><CardTitle className="text-base">New School Based Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Class *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.class_id} onChange={e => setForm((f: any) => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Learning Area *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_id} onChange={e => setForm((f: any) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Term</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.term} onChange={e => setForm((f: any) => ({ ...f, term: e.target.value }))}>
                  {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
              <div><Label>Assessment Type</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.assessment_type} onChange={e => setForm((f: any) => ({ ...f, assessment_type: e.target.value }))}>
                  {['classwork','project','practical','oral','observation','written','portfolio','group_work','field_work','other'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div><Label>Max Score</Label>
                <Input type="number" value={form.max_score} onChange={e => setForm((f: any) => ({ ...f, max_score: e.target.value }))} />
              </div>
              <div><Label>Weight (%)</Label>
                <Input type="number" value={form.weight_percentage} onChange={e => setForm((f: any) => ({ ...f, weight_percentage: e.target.value }))} />
              </div>
              <div><Label>Assessment Date</Label>
                <Input type="date" value={form.assessment_date} onChange={e => setForm((f: any) => ({ ...f, assessment_date: e.target.value }))} />
              </div>
            </div>
            <div><Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Term 1 Science Project" />
            </div>
            <div><Label>Instructions</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.instructions} onChange={e => setForm((f: any) => ({ ...f, instructions: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="space-y-2">
          {sbas.length === 0 && <div className="text-center py-16 text-gray-400"><Target className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No SBA assessments found</p></div>}
          {sbas.map((s: any) => (
            <div key={s.id} className="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-gray-500">{s.class_name} · {s.subject_name} · Term {s.term}</div>
                <div className="text-xs text-gray-400 flex gap-2 mt-0.5">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">{s.assessment_type}</span>
                  <span>Weight: {s.weight_percentage}%</span>
                  <span>{s.submissions_count ?? 0} / {s.total_students ?? 0} submitted</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {(isAdmin || isTeacher) && (
                  <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Enter Marks
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <SbaMarksModal sba={selected} onClose={() => setSelected(null)} onSaved={load} classes={classes} />}
    </div>
  );
}

function SbaMarksModal({ sba, onClose, onSaved, classes }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      (api as any).getStudentsByClass ? (api as any).getStudentsByClass(sba.class_id) : (api as any).getStudents({ class_id: sba.class_id }).catch(() => ({ data: [] })),
      api.getSbaRecords(sba.id),
    ]).then(([studRes, recRes]: any) => {
      const studs = studRes.data || [];
      const recs = recRes.data || [];
      const map = Object.fromEntries(recs.map((r: any) => [r.student_id, r]));
      setStudents(studs);
      setRecords(studs.map((s: any) => ({
        student_id: s.id,
        student_name: `${s.first_name} ${s.last_name}`,
        admission_number: s.admission_number,
        score: map[s.id]?.score ?? '',
        is_absent: map[s.id]?.is_absent ?? false,
        teacher_remarks: map[s.id]?.teacher_remarks ?? '',
        cbc_grade: map[s.id]?.cbc_grade ?? '',
      })));
      setLoading(false);
    });
  }, [sba.id]);

  const updateRecord = (idx: number, field: string, val: any) => {
    setRecords(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      if (field === 'score' && val !== '') {
        const pct = (parseFloat(val) / parseFloat(sba.max_score)) * 100;
        updated[idx].cbc_grade = pct >= 80 ? 'EE' : pct >= 60 ? 'ME' : pct >= 40 ? 'AE' : 'BE';
      }
      return updated;
    });
  };

  const save = async () => {
    await api.saveSbaRecords(sba.id, records);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{sba.title}</h3>
            <p className="text-xs text-gray-500">Max: {sba.max_score} · {sba.class_name}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save Marks</Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="overflow-y-auto">
          {loading ? <div className="p-8 text-center text-gray-400">Loading students...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Student</th>
                  <th className="text-center p-3 font-medium">Score /{sba.max_score}</th>
                  <th className="text-center p-3 font-medium">Grade</th>
                  <th className="text-center p-3 font-medium">Absent</th>
                  <th className="text-left p-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.student_id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.student_name}</div>
                      <div className="text-xs text-gray-400">{r.admission_number}</div>
                    </td>
                    <td className="p-2 text-center">
                      <Input className="w-20 mx-auto text-center h-7" type="number" min={0} max={sba.max_score} value={r.score} disabled={r.is_absent} onChange={e => updateRecord(i, 'score', e.target.value)} />
                    </td>
                    <td className="p-2 text-center"><GradeBadge grade={r.cbc_grade} /></td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={r.is_absent} onChange={e => updateRecord(i, 'is_absent', e.target.checked)} />
                    </td>
                    <td className="p-2">
                      <Input className="h-7 text-xs" value={r.teacher_remarks} onChange={e => updateRecord(i, 'teacher_remarks', e.target.value)} placeholder="Remarks" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PROJECTS TAB ─────────────────────────────────────────────
function ProjectsTab({ classes, subjects, strands, currentYear, isAdmin, isTeacher }: any) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filters, setFilters] = useState({ class_id: '', subject_id: '', term: '' });
  const [form, setForm] = useState<any>({
    class_id: '', subject_id: '', strand_id: '', academic_year: currentYear, term: '1',
    title: '', description: '', project_type: 'individual', is_stem: false,
    start_date: '', due_date: '', max_score: 100, learning_outcomes: '', materials_needed: ''
  });

  const load = async () => {
    setLoading(true);
    try { const res: any = await api.getProjects(filters); setProjects(res.data || []); }
    catch { setProjects([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    try { await api.createProject(form); setShowForm(false); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 py-1 text-sm" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.term} onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
            <option value="">All Terms</option>
            {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
        </div>
        {(isAdmin || isTeacher) && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Project</Button>}
      </div>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2"><CardTitle className="text-base">New Project</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Class *</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.class_id} onChange={e => setForm((f: any) => ({ ...f, class_id: e.target.value }))}>
                  <option value="">Select</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Learning Area</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_id} onChange={e => setForm((f: any) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Type</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.project_type} onChange={e => setForm((f: any) => ({ ...f, project_type: e.target.value }))}>
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
              </div>
              <div><Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm((f: any) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div><Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div><Label>Max Score</Label>
                <Input type="number" value={form.max_score} onChange={e => setForm((f: any) => ({ ...f, max_score: e.target.value }))} />
              </div>
            </div>
            <div><Label>Project Title *</Label>
              <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Water Purification Project" />
            </div>
            <div><Label>Description</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
            </div>
            <div><Label>Learning Outcomes</Label>
              <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.learning_outcomes} onChange={e => setForm((f: any) => ({ ...f, learning_outcomes: e.target.value }))} placeholder="What learners will demonstrate..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_stem" checked={form.is_stem} onChange={e => setForm((f: any) => ({ ...f, is_stem: e.target.checked }))} />
              <Label htmlFor="is_stem" className="font-normal cursor-pointer">STEM Project</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {projects.length === 0 && <div className="col-span-2 text-center py-16 text-gray-400"><FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No projects found</p></div>}
          {projects.map((p: any) => (
            <div key={p.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(p)}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">{p.title}</span>
                <div className="flex gap-1">
                  {p.is_stem && <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded">STEM</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.project_type === 'group' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{p.project_type}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">{p.class_name} · {p.subject_name} · Term {p.term}</div>
              <div className="text-xs text-gray-400 flex gap-3 mt-1">
                {p.due_date && <span>Due: {new Date(p.due_date).toLocaleDateString()}</span>}
                <span>{p.submission_count ?? 0} submissions</span>
                <span>{p.milestone_count ?? 0} milestones</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <ProjectDetailModal project={selected} onClose={() => setSelected(null)} onSaved={load} isAdmin={isAdmin} isTeacher={isTeacher} />}
    </div>
  );
}

function ProjectDetailModal({ project, onClose, onSaved, isAdmin, isTeacher }: any) {
  const [detail, setDetail] = useState<any>(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  useEffect(() => {
    api.getProject(project.id).then((res: any) => setDetail(res.data));
  }, [project.id]);

  const addMilestone = async () => {
    await api.addProjectMilestone(project.id, milestoneForm);
    setShowMilestoneForm(false);
    api.getProject(project.id).then((res: any) => setDetail(res.data));
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{project.title}</h3>
            <p className="text-xs text-gray-500">{project.class_name} · Term {project.term}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {detail?.description && <p className="text-sm text-gray-600">{detail.description}</p>}
          {detail?.learning_outcomes && (
            <div className="bg-blue-50 rounded p-3 text-sm"><strong>Learning Outcomes:</strong> {detail.learning_outcomes}</div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Milestones</h4>
              {(isAdmin || isTeacher) && <Button size="sm" variant="outline" onClick={() => setShowMilestoneForm(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>}
            </div>
            {showMilestoneForm && (
              <div className="border rounded p-3 space-y-2 mb-2">
                <Input placeholder="Milestone title" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
                <Input placeholder="Description" value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} />
                <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} />
                <div className="flex gap-2"><Button size="sm" onClick={addMilestone}>Add</Button><Button size="sm" variant="ghost" onClick={() => setShowMilestoneForm(false)}>Cancel</Button></div>
              </div>
            )}
            {(detail?.milestones || []).length === 0 ? <p className="text-xs text-gray-400">No milestones</p> : (
              <div className="space-y-1">
                {detail.milestones.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm border rounded px-3 py-2">
                    <span className="font-medium text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">{i+1}</span>
                    <span className="flex-1">{m.title}</span>
                    {m.due_date && <span className="text-xs text-gray-400">{new Date(m.due_date).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Submissions ({(detail?.submissions || []).length})</h4>
            {(detail?.submissions || []).length === 0 ? <p className="text-xs text-gray-400">No submissions yet</p> : (
              <div className="space-y-1">
                {detail.submissions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{s.student_name}</span>
                      <span className="text-xs text-gray-400 ml-2">{s.admission_number}</span>
                      {s.is_late && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">Late</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.score && <span className="text-xs text-gray-500">{s.score}/{project.max_score}</span>}
                      <GradeBadge grade={s.cbc_grade} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LIFE SKILLS TAB ──────────────────────────────────────────
const CORE_VALUES = [
  { key: 'responsibility', label: 'Responsibility' },
  { key: 'respect', label: 'Respect' },
  { key: 'integrity', label: 'Integrity' },
  { key: 'patriotism', label: 'Patriotism' },
];
const COMPETENCIES = [
  { key: 'communication', label: 'Communication' },
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'critical_thinking', label: 'Critical Thinking' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'digital_literacy', label: 'Digital Literacy' },
  { key: 'self_management', label: 'Self Management' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'physical_health', label: 'Physical & Health' },
];

function LifeSkillsTab({ classes, currentYear, isAdmin, isTeacher }: any) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('1');
  const [students, setStudents] = useState<any[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const [recRes, stuRes]: any = await Promise.all([
        api.getLifeSkills({ class_id: selectedClass, academic_year: currentYear, term }),
        (api as any).getStudents ? (api as any).getStudents({ class_id: selectedClass }) : Promise.resolve({ data: [] }),
      ]);
      setRecords(recRes.data || []);
      setStudents(stuRes.data || []);
    } catch { setRecords([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedClass, term]);

  const startEdit = (student: any) => {
    const existing = records.find(r => r.student_id === student.id);
    setEditingIdx(student.id);
    setEditForm({
      student_id: student.id, class_id: selectedClass, academic_year: currentYear, term,
      responsibility: '', respect: '', integrity: '', patriotism: '',
      communication: '', collaboration: '', critical_thinking: '', creativity: '',
      digital_literacy: '', self_management: '', leadership: '', physical_health: '',
      teacher_remarks: '', areas_of_improvement: '', strengths: '',
      ...existing
    });
  };

  const saveRecord = async () => {
    await api.saveLifeSkills(editForm);
    setEditingIdx(null);
    load();
  };

  const GradeSelect = ({ field }: { field: string }) => (
    <select className="border rounded px-1 py-0.5 text-xs" value={editForm[field] || ''} onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}>
      <option value="">—</option>
      {['EE','ME','AE','BE'].map(g => <option key={g} value={g}>{g}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select className="border rounded px-2 py-1.5 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={term} onChange={e => setTerm(e.target.value)}>
          {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
        </select>
      </div>

      {!selectedClass && <div className="text-center py-16 text-gray-400"><Star className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Select a class to manage Values & Life Skills</p></div>}

      {selectedClass && loading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      {selectedClass && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border font-medium min-w-[150px]">Student</th>
                {CORE_VALUES.map(v => <th key={v.key} className="p-2 border font-medium text-xs text-center" title={v.label}>{v.label.slice(0,4)}</th>)}
                {COMPETENCIES.map(c => <th key={c.key} className="p-2 border font-medium text-xs text-center" title={c.label}>{c.label.slice(0,5)}</th>)}
                <th className="p-2 border font-medium text-xs">Remarks</th>
                <th className="p-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s: any) => {
                const rec = records.find(r => r.student_id === s.id);
                const isEditing = editingIdx === s.id;
                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 border">
                      <div className="font-medium text-xs">{s.first_name} {s.last_name}</div>
                      <div className="text-gray-400 text-xs">{s.admission_number}</div>
                    </td>
                    {CORE_VALUES.map(v => (
                      <td key={v.key} className="p-1 border text-center">
                        {isEditing ? <GradeSelect field={v.key} /> : <GradeBadge grade={rec?.[v.key]} />}
                      </td>
                    ))}
                    {COMPETENCIES.map(c => (
                      <td key={c.key} className="p-1 border text-center">
                        {isEditing ? <GradeSelect field={c.key} /> : <GradeBadge grade={rec?.[c.key]} />}
                      </td>
                    ))}
                    <td className="p-1 border">
                      {isEditing ? (
                        <Input className="h-6 text-xs w-32" value={editForm.teacher_remarks} onChange={e => setEditForm((f: any) => ({ ...f, teacher_remarks: e.target.value }))} />
                      ) : (
                        <span className="text-xs text-gray-500">{rec?.teacher_remarks?.slice(0, 30) || '—'}</span>
                      )}
                    </td>
                    <td className="p-1 border text-center">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button className="text-green-600 hover:text-green-800" onClick={saveRecord}><Save className="h-4 w-4" /></button>
                          <button className="text-gray-400 hover:text-gray-600" onClick={() => setEditingIdx(null)}><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        (isAdmin || isTeacher) && <button className="text-indigo-400 hover:text-indigo-600" onClick={() => startEdit(s)}><Edit2 className="h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan={20} className="text-center text-gray-400 py-8">No students in this class</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CAREER GUIDANCE TAB ──────────────────────────────────────
function CareerTab({ classes, currentYear, isAdmin }: any) {
  const [pathways, setPathways] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [activeView, setActiveView] = useState<'pathways' | 'profiles'>('pathways');
  const [showPathwayForm, setShowPathwayForm] = useState(false);
  const [pathwayForm, setPathwayForm] = useState({ name: '', category: 'stem', description: '' });

  useEffect(() => {
    api.getCareerPathways().then((res: any) => setPathways(res.data || []));
  }, []);

  useEffect(() => {
    if (selectedClass && activeView === 'profiles') {
      setLoading(true);
      api.getCareerProfiles({ class_id: selectedClass, academic_year: currentYear })
        .then((res: any) => setProfiles(res.data || []))
        .finally(() => setLoading(false));
    }
  }, [selectedClass, activeView]);

  const savePathway = async () => {
    await api.createCareerPathway(pathwayForm);
    setShowPathwayForm(false);
    api.getCareerPathways().then((res: any) => setPathways(res.data || []));
  };

  const CATEGORY_COLORS: Record<string, string> = {
    stem: 'bg-blue-50 border-blue-200 text-blue-700',
    arts: 'bg-pink-50 border-pink-200 text-pink-700',
    social_sciences: 'bg-purple-50 border-purple-200 text-purple-700',
    technical: 'bg-orange-50 border-orange-200 text-orange-700',
    business: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    health: 'bg-red-50 border-red-200 text-red-700',
    other: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setActiveView('pathways')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeView === 'pathways' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Career Pathways
        </button>
        <button onClick={() => setActiveView('profiles')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeView === 'profiles' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Student Profiles
        </button>
      </div>

      {activeView === 'pathways' && (
        <div className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowPathwayForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Pathway</Button>
            </div>
          )}
          {showPathwayForm && (
            <Card className="border-indigo-200">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Pathway Name</Label><Input value={pathwayForm.name} onChange={e => setPathwayForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Category</Label>
                    <select className="w-full border rounded px-2 py-1.5 text-sm" value={pathwayForm.category} onChange={e => setPathwayForm(f => ({ ...f, category: e.target.value }))}>
                      {['stem','arts','social_sciences','technical','business','health','other'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div><Label>Description</Label><textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={pathwayForm.description} onChange={e => setPathwayForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={savePathway}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPathwayForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {pathways.map((p: any) => (
              <div key={p.id} className={`border rounded-lg p-4 ${CATEGORY_COLORS[p.category] || CATEGORY_COLORS.other}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs capitalize">{p.category.replace('_',' ')}</span>
                </div>
                <p className="text-xs mb-2 opacity-80">{p.description}</p>
                {p.career_options?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.career_options.slice(0,4).map((c: string) => (
                      <span key={c} className="bg-white/50 text-xs px-1.5 py-0.5 rounded border border-current opacity-80">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'profiles' && (
        <div className="space-y-3">
          <select className="border rounded px-2 py-1.5 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class (Grade 7–9 JSS)</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!selectedClass && <div className="text-center py-16 text-gray-400"><Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Select a class to view career profiles</p></div>}
          {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}
          {!loading && profiles.length > 0 && (
            <div className="space-y-2">
              {profiles.map((p: any) => (
                <div key={p.id} className="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{p.student_name}</div>
                    <div className="text-sm text-gray-500">{p.admission_number}</div>
                    {p.career_aspirations && <div className="text-xs text-gray-400 mt-0.5">Aspires: {p.career_aspirations}</div>}
                  </div>
                  {p.pathway_name && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{p.pathway_name}</div>
                      {p.subject_combination && <div className="text-xs text-gray-400 mt-0.5">{p.subject_combination}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!loading && selectedClass && profiles.length === 0 && (
            <div className="text-center py-10 text-gray-400">No career profiles for this class yet</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LEARNING MATERIALS TAB ───────────────────────────────────
function MaterialsTab({ classes, subjects, strands, isAdmin, isTeacher }: any) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ subject_id: '', material_type: '', class_id: '' });
  const [form, setForm] = useState<any>({
    subject_id: '', class_id: '', title: '', description: '', material_type: 'note',
    education_level: '', file_url: '', external_url: '', is_public: false, tags: ''
  });

  const load = async () => {
    setLoading(true);
    try { const res: any = await api.getLearningMaterials(filters); setMaterials(res.data || []); }
    catch { setMaterials([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    const data = { ...form, tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [] };
    try { await api.createLearningMaterial(data); setShowForm(false); load(); }
    catch (e: any) { alert(e.message); }
  };

  const TYPE_ICONS: Record<string, string> = {
    note: '📝', textbook: '📚', past_paper: '📄', video: '🎥', audio: '🎵',
    presentation: '📊', worksheet: '📋', curriculum_doc: '🗂️', assessment: '📝',
    project_guide: '🔨', other: '📎',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 py-1 text-sm" value={filters.subject_id} onChange={e => setFilters(f => ({ ...f, subject_id: e.target.value }))}>
            <option value="">All Subjects</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filters.material_type} onChange={e => setFilters(f => ({ ...f, material_type: e.target.value }))}>
            <option value="">All Types</option>
            {['note','textbook','past_paper','video','presentation','worksheet','curriculum_doc','assessment'].map(t => (
              <option key={t} value={t}>{TYPE_ICONS[t]} {t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        {(isAdmin || isTeacher) && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Upload Material</Button>}
      </div>

      {showForm && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2"><CardTitle className="text-base">Upload Learning Material</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Learning Area</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_id} onChange={e => setForm((f: any) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">Select</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Material Type</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.material_type} onChange={e => setForm((f: any) => ({ ...f, material_type: e.target.value }))}>
                  {['note','textbook','past_paper','video','audio','presentation','worksheet','curriculum_doc','assessment','project_guide','other'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div><Label>Education Level</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.education_level} onChange={e => setForm((f: any) => ({ ...f, education_level: e.target.value }))}>
                  <option value="">All Levels</option>
                  {['playgroup','pre_primary','lower_primary','upper_primary','junior_secondary','senior_secondary'].map(l => (
                    <option key={l} value={l}>{l.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="is_public" checked={form.is_public} onChange={e => setForm((f: any) => ({ ...f, is_public: e.target.checked }))} />
                <Label htmlFor="is_public" className="font-normal cursor-pointer">Visible to Students/Parents</Label>
              </div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. Grade 5 Maths Notes Term 1" /></div>
            <div><Label>Description</Label><textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>File URL</Label><Input value={form.file_url} onChange={e => setForm((f: any) => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div>
              <div><Label>External Link</Label><Input value={form.external_url} onChange={e => setForm((f: any) => ({ ...f, external_url: e.target.value }))} placeholder="YouTube, Drive..." /></div>
            </div>
            <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))} placeholder="fractions, grade5, term1" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {materials.length === 0 && <div className="col-span-2 text-center py-16 text-gray-400"><BookMarked className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No learning materials uploaded yet</p></div>}
          {materials.map((m: any) => (
            <div key={m.id} className="border rounded-lg p-4 flex gap-3 hover:bg-gray-50">
              <span className="text-2xl">{TYPE_ICONS[m.material_type] || '📎'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.title}</div>
                <div className="text-xs text-gray-500">{m.subject_name} · {m.education_level?.replace(/_/g,' ') || 'All levels'}</div>
                <div className="text-xs text-gray-400">{m.uploaded_by_name} · {m.download_count || 0} downloads</div>
                {m.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {m.tags.map((t: string) => <span key={t} className="bg-gray-100 text-xs px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {m.is_public && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Public</span>}
                {(m.file_url || m.external_url) && (
                  <a href={m.file_url || m.external_url} target="_blank" rel="noreferrer"
                    onClick={() => api.trackMaterialDownload(m.id)}
                    className="text-xs text-indigo-600 hover:underline">Open</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PROMOTION TAB ────────────────────────────────────────────
function PromotionTab({ classes, currentYear, isAdmin }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'rules' | 'history' | 'promote'>('history');
  const [filters, setFilters] = useState({ academic_year: currentYear, class_id: '', promotion_type: '' });
  const [ruleForm, setRuleForm] = useState<any>({
    from_class_id: '', to_class_id: '', academic_year: currentYear,
    min_attendance_percent: 75, min_subjects_passed: 5, min_average_percent: 40,
    cbc_min_me_count: 3, auto_promote: false
  });

  const loadHistory = async () => {
    setLoading(true);
    try { const res: any = await api.getPromotionHistory(filters); setHistory(res.data || []); }
    catch { setHistory([]); } finally { setLoading(false); }
  };

  const loadRules = async () => {
    const res: any = await api.getPromotionRules().catch(() => ({ data: [] }));
    setRules(res.data || []);
  };

  useEffect(() => { loadHistory(); loadRules(); }, [filters]);

  const saveRule = async () => {
    await api.savePromotionRule(ruleForm);
    loadRules();
  };

  const PROMO_COLORS: Record<string, string> = {
    promoted: 'bg-green-100 text-green-700',
    repeated: 'bg-orange-100 text-orange-700',
    graduated: 'bg-blue-100 text-blue-700',
    transferred: 'bg-purple-100 text-purple-700',
    withdrawn: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        {['history','rules','promote'].map(v => (
          <button key={v} onClick={() => setActiveView(v as any)} className={`px-4 py-1.5 rounded text-sm font-medium capitalize ${activeView === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{v === 'promote' ? 'Promote Students' : v}</button>
        ))}
      </div>

      {activeView === 'history' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input className="w-28" placeholder="Year" value={filters.academic_year} onChange={e => setFilters(f => ({ ...f, academic_year: e.target.value }))} />
            <select className="border rounded px-2 py-1 text-sm" value={filters.class_id} onChange={e => setFilters(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">All Classes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={filters.promotion_type} onChange={e => setFilters(f => ({ ...f, promotion_type: e.target.value }))}>
              <option value="">All Types</option>
              {['promoted','repeated','graduated','transferred','withdrawn'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
            <div className="space-y-1">
              {history.length === 0 && <div className="text-center py-16 text-gray-400"><ArrowUpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No promotion records found</p></div>}
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{h.student_name}</div>
                    <div className="text-sm text-gray-500">{h.from_class_name} → {h.to_class_name || 'Graduated'} · {h.academic_year}</div>
                    {h.remarks && <div className="text-xs text-gray-400">{h.remarks}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    {h.average_score && <span className="text-xs text-gray-500">Avg: {parseFloat(h.average_score).toFixed(1)}%</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PROMO_COLORS[h.promotion_type] || 'bg-gray-100 text-gray-600'}`}>{h.promotion_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'rules' && isAdmin && (
        <div className="space-y-4">
          <Card className="border-indigo-200">
            <CardHeader className="pb-2"><CardTitle className="text-base">Configure Promotion Rule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From Class</Label>
                  <select className="w-full border rounded px-2 py-1.5 text-sm" value={ruleForm.from_class_id} onChange={e => setRuleForm((f: any) => ({ ...f, from_class_id: e.target.value }))}>
                    <option value="">Select</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><Label>Promote To Class</Label>
                  <select className="w-full border rounded px-2 py-1.5 text-sm" value={ruleForm.to_class_id} onChange={e => setRuleForm((f: any) => ({ ...f, to_class_id: e.target.value }))}>
                    <option value="">(Graduate / Leave)</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><Label>Min Attendance %</Label><Input type="number" value={ruleForm.min_attendance_percent} onChange={e => setRuleForm((f: any) => ({ ...f, min_attendance_percent: e.target.value }))} /></div>
                <div><Label>Min Subjects Passed</Label><Input type="number" value={ruleForm.min_subjects_passed} onChange={e => setRuleForm((f: any) => ({ ...f, min_subjects_passed: e.target.value }))} /></div>
                <div><Label>Min Average %</Label><Input type="number" value={ruleForm.min_average_percent} onChange={e => setRuleForm((f: any) => ({ ...f, min_average_percent: e.target.value }))} /></div>
                <div><Label>Min ME Grades (CBC)</Label><Input type="number" value={ruleForm.cbc_min_me_count} onChange={e => setRuleForm((f: any) => ({ ...f, cbc_min_me_count: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveRule}><Save className="h-4 w-4 mr-1" /> Save Rule</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {rules.map((r: any) => (
              <div key={r.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <div className="font-medium">{r.from_class_name} → {r.to_class_name || 'Graduate'}</div>
                  <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                    <span>Min Attendance: {r.min_attendance_percent}%</span>
                    <span>Min Avg: {r.min_average_percent}%</span>
                    <span>Min ME: {r.cbc_min_me_count}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{r.academic_year}</span>
              </div>
            ))}
            {rules.length === 0 && <p className="text-center text-gray-400 py-4">No promotion rules configured</p>}
          </div>
        </div>
      )}

      {activeView === 'promote' && isAdmin && (
        <div>
          <BulkPromotePanel classes={classes} currentYear={currentYear} onSaved={loadHistory} />
        </div>
      )}
    </div>
  );
}

function BulkPromotePanel({ classes, currentYear, onSaved }: any) {
  const [selectedClass, setSelectedClass] = useState('');
  const [toClass, setToClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      (api as any).getStudents
        ? (api as any).getStudents({ class_id: selectedClass }).then((res: any) => setStudents(res.data || []))
        : setStudents([]);
    }
  }, [selectedClass]);

  const setAll = (type: string) => {
    const s: Record<string, string> = {};
    students.forEach((st: any) => { s[st.id] = type; });
    setSelections(s);
  };

  const promote = async () => {
    const promotions = students.map((s: any) => ({
      student_id: s.id, from_class_id: selectedClass, to_class_id: selections[s.id] === 'repeated' ? selectedClass : toClass,
      promotion_type: selections[s.id] || 'promoted'
    }));
    setLoading(true);
    await api.bulkPromoteStudents({ promotions, academic_year: currentYear });
    setLoading(false);
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-xs">From Class</Label>
          <select className="border rounded px-2 py-1.5 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Promote To</Label>
          <select className="border rounded px-2 py-1.5 text-sm" value={toClass} onChange={e => setToClass(e.target.value)}>
            <option value="">Next Class / Graduate</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {students.length > 0 && (
          <div className="flex gap-1 mt-5">
            <Button size="sm" variant="outline" onClick={() => setAll('promoted')}>All Promoted</Button>
            <Button size="sm" variant="outline" className="text-orange-600" onClick={() => setAll('repeated')}>All Repeat</Button>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Student</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{s.first_name} {s.last_name}</div>
                    <div className="text-xs text-gray-400">{s.admission_number}</div>
                  </td>
                  <td className="p-3 text-center">
                    <select className="border rounded px-2 py-1 text-sm" value={selections[s.id] || 'promoted'} onChange={e => setSelections(sel => ({ ...sel, [s.id]: e.target.value }))}>
                      <option value="promoted">Promoted</option>
                      <option value="repeated">Repeat Year</option>
                      <option value="graduated">Graduated</option>
                      <option value="transferred">Transferred</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t bg-gray-50">
            <Button onClick={promote} disabled={loading}>
              {loading ? 'Processing...' : `Process ${students.length} Promotions`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CLASSES & ROOMS TAB ──────────────────────────────────────
const LEVEL_ORDER = ['pre_primary','lower_primary','upper_primary','junior_secondary','senior_secondary'];
const LEVEL_LABELS: Record<string, string> = {
  pre_primary: 'Pre-Primary (Playgroup, PP1, PP2)',
  lower_primary: 'Lower Primary (Grade 1–3)',
  upper_primary: 'Upper Primary (Grade 4–6)',
  junior_secondary: 'Junior Secondary (Grade 7–9)',
  senior_secondary: 'Senior Secondary (Grade 10–12)',
};
const LEVEL_COLORS: Record<string, string> = {
  pre_primary: 'bg-pink-50 border-pink-200 text-pink-700',
  lower_primary: 'bg-blue-50 border-blue-200 text-blue-700',
  upper_primary: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  junior_secondary: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  senior_secondary: 'bg-orange-50 border-orange-200 text-orange-700',
};

function ClassesRoomsTab({ classes, subjects, isAdmin, onRefresh }: any) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'classes' | 'rooms'>('classes');
  const [showClassForm, setShowClassForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(LEVEL_ORDER));

  const [classForm, setClassForm] = useState<any>({
    name: '', section: 'A', education_level: 'lower_primary', grade_number: '',
    capacity: 45, room_id: '', class_teacher_id: '', academic_year: new Date().getFullYear().toString()
  });
  const [roomForm, setRoomForm] = useState<any>({
    name: '', room_number: '', capacity: 45, building: '', floor: '', room_type: 'classroom', notes: ''
  });

  useEffect(() => {
    loadRooms();
    // Load teachers
    (api as any).getTeachers ? (api as any).getTeachers().then((r: any) => setTeachers(r.data || [])).catch(() => {}) : null;
  }, []);

  const loadRooms = () => {
    api.getRooms().then((r: any) => setRooms(r.data || [])).catch(() => {});
  };

  // Group classes by education level
  const grouped: Record<string, any[]> = {};
  for (const cls of classes) {
    const level = cls.education_level || 'lower_primary';
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(cls);
  }

  const saveClass = async () => {
    try {
      if (editingClass) {
        await api.updateAcademicClass(editingClass.id, classForm);
      } else {
        await api.createAcademicClass(classForm);
      }
      setShowClassForm(false);
      setEditingClass(null);
      onRefresh();
    } catch (e: any) { alert(e.message); }
  };

  const saveRoom = async () => {
    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, roomForm);
      } else {
        await api.createRoom(roomForm);
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      loadRooms();
    } catch (e: any) { alert(e.message); }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Delete this class?')) return;
    try { await api.deleteAcademicClass(id); onRefresh(); }
    catch (e: any) { alert(e.message); }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    try { await api.deleteRoom(id); loadRooms(); }
    catch (e: any) { alert(e.message); }
  };

  const openEditClass = (cls: any) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name, section: cls.section || 'A', education_level: cls.education_level,
      grade_number: cls.grade_number || '', capacity: cls.capacity || 45,
      room_id: cls.room_id || '', class_teacher_id: cls.class_teacher_id || '',
      academic_year: cls.academic_year || new Date().getFullYear().toString()
    });
    setShowClassForm(true);
  };

  const openEditRoom = (room: any) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name, room_number: room.room_number || '', capacity: room.capacity,
      building: room.building || '', floor: room.floor || '',
      room_type: room.room_type, notes: room.notes || ''
    });
    setShowRoomForm(true);
  };

  const seedClasses = async () => {
    setSeeding(true);
    try {
      const res: any = await api.seedCbcClasses();
      alert(res.message);
      onRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setSeeding(false); }
  };

  const toggleLevel = (level: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  };

  const ROOM_TYPE_ICONS: Record<string, string> = {
    classroom: '🏫', laboratory: '🔬', computer_lab: '💻', library: '📚',
    hall: '🏛️', sports_room: '⚽', art_room: '🎨', music_room: '🎵',
    staffroom: '👔', office: '🏢', store: '📦', other: '🏠',
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setActiveView('classes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'classes' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}>
            Classes ({classes.length})
          </button>
          <button onClick={() => setActiveView('rooms')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'rooms' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}>
            Rooms ({rooms.length})
          </button>
        </div>
        {isAdmin && activeView === 'classes' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={seedClasses} disabled={seeding}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
              Load CBC Defaults
            </Button>
            <Button size="sm" onClick={() => { setEditingClass(null); setClassForm({ name: '', section: 'A', education_level: 'lower_primary', grade_number: '', capacity: 45, room_id: '', class_teacher_id: '', academic_year: new Date().getFullYear().toString() }); setShowClassForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Class
            </Button>
          </div>
        )}
        {isAdmin && activeView === 'rooms' && (
          <Button size="sm" onClick={() => { setEditingRoom(null); setRoomForm({ name: '', room_number: '', capacity: 45, building: '', floor: '', room_type: 'classroom', notes: '' }); setShowRoomForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Room
          </Button>
        )}
      </div>

      {/* CLASS FORM */}
      {showClassForm && activeView === 'classes' && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editingClass ? 'Edit Class' : 'Add New Class'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Class Name *</Label>
                <Input value={classForm.name} onChange={e => setClassForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Grade 1" />
              </div>
              <div>
                <Label className="text-xs">Stream/Section</Label>
                <Input value={classForm.section} onChange={e => setClassForm((f: any) => ({ ...f, section: e.target.value }))} placeholder="A" />
              </div>
              <div>
                <Label className="text-xs">Education Level</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={classForm.education_level} onChange={e => setClassForm((f: any) => ({ ...f, education_level: e.target.value }))}>
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Grade Number</Label>
                <Input type="number" value={classForm.grade_number} onChange={e => setClassForm((f: any) => ({ ...f, grade_number: e.target.value }))} placeholder="e.g. 1" />
              </div>
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input type="number" value={classForm.capacity} onChange={e => setClassForm((f: any) => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Assign Room</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={classForm.room_id} onChange={e => setClassForm((f: any) => ({ ...f, room_id: e.target.value }))}>
                  <option value="">No room assigned</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap: {r.capacity})</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Class Teacher</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={classForm.class_teacher_id} onChange={e => setClassForm((f: any) => ({ ...f, class_teacher_id: e.target.value }))}>
                  <option value="">Not assigned</option>
                  {teachers.map((t: any) => <option key={t.id} value={t.user_id || t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Academic Year</Label>
                <Input value={classForm.academic_year} onChange={e => setClassForm((f: any) => ({ ...f, academic_year: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveClass}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowClassForm(false); setEditingClass(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROOM FORM */}
      {showRoomForm && activeView === 'rooms' && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editingRoom ? 'Edit Room' : 'Add New Room'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">Room Name *</Label><Input value={roomForm.name} onChange={e => setRoomForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Room 1A" /></div>
              <div><Label className="text-xs">Room Number</Label><Input value={roomForm.room_number} onChange={e => setRoomForm((f: any) => ({ ...f, room_number: e.target.value }))} placeholder="101" /></div>
              <div><Label className="text-xs">Capacity</Label><Input type="number" value={roomForm.capacity} onChange={e => setRoomForm((f: any) => ({ ...f, capacity: e.target.value }))} /></div>
              <div><Label className="text-xs">Room Type</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={roomForm.room_type} onChange={e => setRoomForm((f: any) => ({ ...f, room_type: e.target.value }))}>
                  {['classroom','laboratory','computer_lab','library','hall','sports_room','art_room','music_room','staffroom','office','store','other'].map(t => (
                    <option key={t} value={t}>{ROOM_TYPE_ICONS[t]} {t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div><Label className="text-xs">Building</Label><Input value={roomForm.building} onChange={e => setRoomForm((f: any) => ({ ...f, building: e.target.value }))} placeholder="Main Block" /></div>
              <div><Label className="text-xs">Floor</Label><Input value={roomForm.floor} onChange={e => setRoomForm((f: any) => ({ ...f, floor: e.target.value }))} placeholder="Ground Floor" /></div>
              <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={roomForm.notes} onChange={e => setRoomForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Has projector, AC" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveRoom}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowRoomForm(false); setEditingRoom(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLASSES VIEW */}
      {activeView === 'classes' && (
        <div className="space-y-3">
          {classes.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No classes yet</p>
              <p className="text-sm mt-1">Click "Load CBC Defaults" to add all Kenya CBC classes automatically</p>
            </div>
          )}
          {LEVEL_ORDER.filter(l => grouped[l]?.length > 0).map(level => (
            <div key={level} className="border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleLevel(level)}
                className={`w-full flex items-center justify-between px-4 py-3 font-medium text-sm ${LEVEL_COLORS[level] || 'bg-gray-50'}`}
              >
                <span>{LEVEL_LABELS[level]} ({grouped[level]?.length || 0} classes)</span>
                {expandedLevels.has(level) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expandedLevels.has(level) && (
                <div className="divide-y">
                  {(grouped[level] || []).map((cls: any) => (
                    <div key={cls.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="text-center bg-white border rounded-lg px-2 py-1 min-w-[48px]">
                          <div className="text-xs font-bold text-gray-700">{cls.section}</div>
                          <div className="text-xs text-gray-400">Stream</div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{cls.name}</div>
                          <div className="text-xs text-gray-400 flex gap-2">
                            <span>{cls.student_count || 0}/{cls.capacity || 45} students</span>
                            {cls.room_name && <span>· 🏫 {cls.room_name}</span>}
                            {cls.class_teacher_name && <span>· 👤 {cls.class_teacher_name}</span>}
                            {cls.subject_count > 0 && <span>· {cls.subject_count} subjects</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedClass(cls)}>
                          <Layers className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEditClass(cls)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => deleteClass(cls.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Add stream button */}
                  {isAdmin && (
                    <div className="px-4 py-2">
                      <button
                        onClick={() => {
                          const lastInLevel = grouped[level]?.[grouped[level].length - 1];
                          const nextSection = lastInLevel
                            ? String.fromCharCode((lastInLevel.section || 'A').charCodeAt(0) + 1)
                            : 'B';
                          setEditingClass(null);
                          setClassForm({
                            name: lastInLevel?.name || '', section: nextSection,
                            education_level: level, grade_number: lastInLevel?.grade_number || '',
                            capacity: 45, room_id: '', class_teacher_id: '',
                            academic_year: new Date().getFullYear().toString()
                          });
                          setShowClassForm(true);
                          setActiveView('classes');
                        }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add stream to this level
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ROOMS VIEW */}
      {activeView === 'rooms' && (
        <div className="space-y-2">
          {rooms.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No rooms configured. Add rooms and assign them to classes.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {rooms.map((r: any) => (
              <div key={r.id} className="border rounded-xl p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ROOM_TYPE_ICONS[r.room_type] || '🏠'}</span>
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        {r.room_number && <span>#{r.room_number}</span>}
                        <span>Cap: {r.capacity}</span>
                        {r.building && <span>· {r.building}</span>}
                        {r.floor && <span>· {r.floor}</span>}
                      </div>
                      {r.class_count > 0 && <div className="text-xs text-indigo-600 mt-0.5">{r.class_count} class(es) assigned</div>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditRoom(r)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => deleteRoom(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                {r.notes && <p className="text-xs text-gray-400 mt-1 pl-9">{r.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class subjects modal */}
      {selectedClass && (
        <ClassSubjectsModal cls={selectedClass} onClose={() => setSelectedClass(null)} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function ClassSubjectsModal({ cls, onClose, isAdmin }: any) {
  const [linked, setLinked] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [addingId, setAddingId] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getClassSubjects(cls.id).then((r: any) => setLinked(r.data || []));
    api.getAcademicSubjects({ education_level: cls.education_level }).then((r: any) => setAllSubjects(r.data || []));
    (api as any).getTeachers?.().then((r: any) => setTeachers(r.data || [])).catch(() => {});
  }, [cls.id]);

  const unlinkedSubjects = allSubjects.filter(s => !linked.find(l => l.subject_id === s.id));

  const addSubject = async () => {
    if (!addingId) return;
    await api.addSubjectToClass(cls.id, { subject_id: addingId, teacher_id: teacherMap[addingId] || null });
    const r: any = await api.getClassSubjects(cls.id);
    setLinked(r.data || []);
    setAddingId('');
  };

  const removeSubject = async (subjectId: string) => {
    await api.removeSubjectFromClass(cls.id, subjectId);
    setLinked(prev => prev.filter(l => l.subject_id !== subjectId));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{cls.name} {cls.section} — Subjects</h3>
            <p className="text-xs text-gray-500">{LEVEL_LABELS[cls.education_level]}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {/* Add subject */}
          {isAdmin && unlinkedSubjects.length > 0 && (
            <div className="flex gap-2">
              <select className="flex-1 border rounded px-2 py-1.5 text-sm" value={addingId} onChange={e => setAddingId(e.target.value)}>
                <option value="">Select subject to add...</option>
                {unlinkedSubjects.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} {s.is_elective ? '(Elective)' : ''}</option>
                ))}
              </select>
              <Button size="sm" onClick={addSubject} disabled={!addingId}><Plus className="h-4 w-4" /></Button>
            </div>
          )}

          {/* Linked subjects */}
          <div className="space-y-1">
            {linked.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No subjects assigned. Add from above.</p>}
            {linked.map((l: any) => (
              <div key={l.subject_id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  {l.color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />}
                  <div>
                    <span className="text-sm font-medium">{l.subject_name}</span>
                    {l.is_elective && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1 rounded">Elective</span>}
                    <div className="text-xs text-gray-400">{l.code} · {l.weekly_periods} periods/week
                      {l.teacher_name && ` · ${l.teacher_name}`}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button className="text-red-400 hover:text-red-600" onClick={() => removeSubject(l.subject_id)}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUBJECTS / LEARNING AREAS TAB ────────────────────────────
const SUBJECT_GROUP_COLORS: Record<string, string> = {
  stem: 'bg-blue-100 text-blue-700',
  languages: 'bg-orange-100 text-orange-700',
  humanities: 'bg-purple-100 text-purple-700',
  arts: 'bg-pink-100 text-pink-700',
  technical: 'bg-stone-100 text-stone-700',
  business: 'bg-teal-100 text-teal-700',
  sports: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
};

function SubjectsTab({ subjects, isAdmin, onRefresh }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState<any>({
    name: '', code: '', description: '', education_level: 'lower_primary',
    category: 'core', subject_group: 'stem', is_elective: false,
    weekly_periods: 5, color: '#3b82f6'
  });

  const filtered = subjects.filter((s: any) => {
    if (filterLevel && s.education_level !== filterLevel) return false;
    if (filterGroup && s.subject_group !== filterGroup) return false;
    return true;
  });

  // Group by education level
  const grouped: Record<string, any[]> = {};
  for (const s of filtered) {
    const level = s.education_level || 'other';
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(s);
  }

  const saveSubject = async () => {
    try {
      if (editingSubject) {
        await api.updateAcademicSubject(editingSubject.id, form);
      } else {
        await api.createAcademicSubject(form);
      }
      setShowForm(false);
      setEditingSubject(null);
      onRefresh();
    } catch (e: any) { alert(e.message); }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try { await api.deleteAcademicSubject(id); onRefresh(); }
    catch (e: any) { alert(e.message); }
  };

  const openEdit = (s: any) => {
    setEditingSubject(s);
    setForm({
      name: s.name, code: s.code, description: s.description || '',
      education_level: s.education_level || 'lower_primary',
      category: s.category || 'core', subject_group: s.subject_group || 'stem',
      is_elective: s.is_elective || false, weekly_periods: s.weekly_periods || 5, color: s.color || '#3b82f6'
    });
    setShowForm(true);
  };

  const seedSubjects = async () => {
    setSeeding(true);
    try {
      const res: any = await api.seedCbcSubjects();
      alert(res.message);
      onRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setSeeding(false); }
  };

  const displayLevels = filterLevel
    ? [filterLevel]
    : LEVEL_ORDER.filter(l => grouped[l]?.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1.5 text-sm" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="">All Levels</option>
            {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
          <select className="border rounded px-2 py-1.5 text-sm" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
            <option value="">All Groups</option>
            {['stem','languages','humanities','arts','technical','business','sports','other'].map(g => (
              <option key={g} value={g}>{g.replace('_',' ')}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={seedSubjects} disabled={seeding}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
              Load CBC Defaults
            </Button>
            <Button size="sm" onClick={() => { setEditingSubject(null); setForm({ name: '', code: '', description: '', education_level: 'lower_primary', category: 'core', subject_group: 'stem', is_elective: false, weekly_periods: 5, color: '#3b82f6' }); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Subject
            </Button>
          </div>
        )}
      </div>

      {/* Subject Form */}
      {showForm && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{editingSubject ? 'Edit Learning Area' : 'New Learning Area'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" /></div>
              <div><Label className="text-xs">Code *</Label><Input value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} placeholder="MTH" /></div>
              <div><Label className="text-xs">Education Level</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.education_level} onChange={e => setForm((f: any) => ({ ...f, education_level: e.target.value }))}>
                  {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Subject Group</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.subject_group} onChange={e => setForm((f: any) => ({ ...f, subject_group: e.target.value }))}>
                  {['stem','languages','humanities','arts','technical','business','sports','other'].map(g => (
                    <option key={g} value={g}>{g.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              <div><Label className="text-xs">Category</Label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                  <option value="core">Core</option>
                  <option value="elective">Elective</option>
                  <option value="co_curricular">Co-Curricular</option>
                  <option value="extra_curricular">Extra-Curricular</option>
                </select>
              </div>
              <div><Label className="text-xs">Weekly Periods</Label><Input type="number" value={form.weekly_periods} onChange={e => setForm((f: any) => ({ ...f, weekly_periods: e.target.value }))} /></div>
              <div><Label className="text-xs">Color</Label><input type="color" value={form.color} onChange={e => setForm((f: any) => ({ ...f, color: e.target.value }))} className="h-9 w-full cursor-pointer rounded border" /></div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="is_elective" checked={form.is_elective} onChange={e => setForm((f: any) => ({ ...f, is_elective: e.target.checked, category: e.target.checked ? 'elective' : 'core' }))} />
                <Label htmlFor="is_elective" className="text-xs font-normal cursor-pointer">Elective Subject</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSubject}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingSubject(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects list grouped by level */}
      {subjects.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No learning areas yet</p>
          <p className="text-sm mt-1">Click "Load CBC Defaults" to add all Kenya CBC learning areas automatically</p>
        </div>
      )}

      <div className="space-y-4">
        {displayLevels.map(level => (
          <div key={level}>
            <h3 className={`text-sm font-semibold px-3 py-1.5 rounded-lg mb-2 inline-block border ${LEVEL_COLORS[level] || 'bg-gray-50'}`}>
              {LEVEL_LABELS[level]} — {grouped[level]?.length || 0} learning areas
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {(grouped[level] || []).map((s: any) => (
                <div key={s.id} className="border rounded-lg p-3 flex items-start gap-2 hover:bg-gray-50">
                  <div className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: s.color || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-sm truncate">{s.name}</span>
                      {s.is_elective && <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">Elective</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{s.code}</span>
                      {s.subject_group && (
                        <span className={`text-xs px-1 rounded ${SUBJECT_GROUP_COLORS[s.subject_group] || 'bg-gray-100 text-gray-600'}`}>
                          {s.subject_group}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{s.weekly_periods}p/wk</span>
                      {s.class_count > 0 && <span className="text-xs text-indigo-500">{s.class_count} classes</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-gray-400 hover:text-indigo-600" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></button>
                      <button className="text-gray-400 hover:text-red-600" onClick={() => deleteSubject(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
