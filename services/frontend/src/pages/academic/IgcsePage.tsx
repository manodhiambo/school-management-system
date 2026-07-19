/**
 * IGCSE (Cambridge International) Module Page
 * Multi-tab comprehensive interface for managing Cambridge IGCSE curriculum
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen, FileText, Calendar, Plus, CheckCircle,
  ClipboardList, Users, Award, Edit2, Trash2, X, Save, Eye,
  BarChart2, Settings, Lock, RefreshCw, AlertCircle,
  ChevronDown, ChevronRight, Globe, Star,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// ── Grade colour helpers ──────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  'A*': 'bg-violet-100 text-violet-800',
  A:   'bg-green-100 text-green-800',
  B:   'bg-blue-100 text-blue-800',
  C:   'bg-teal-100 text-teal-800',
  D:   'bg-yellow-100 text-yellow-800',
  E:   'bg-orange-100 text-orange-800',
  F:   'bg-red-100 text-red-700',
  G:   'bg-rose-100 text-rose-700',
  U:   'bg-gray-200 text-gray-600',
};
const GradeBadge = ({ grade }: { grade?: string }) => {
  if (!grade) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[grade] ?? 'bg-gray-100 text-gray-700'}`}>
      {grade}
    </span>
  );
};

const COMPONENT_TYPE_COLORS: Record<string, string> = {
  written:    'bg-blue-100 text-blue-700',
  coursework: 'bg-orange-100 text-orange-700',
  practical:  'bg-green-100 text-green-700',
  oral:       'bg-purple-100 text-purple-700',
  portfolio:  'bg-pink-100 text-pink-700',
};

const TIER_COLORS: Record<string, string> = {
  core:     'bg-sky-100 text-sky-700',
  extended: 'bg-indigo-100 text-indigo-700',
  both:     'bg-gray-100 text-gray-600',
};

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Overview',          icon: BarChart2 },
  { id: 'setup',        label: 'Grading Setup',     icon: Settings },
  { id: 'subjects',     label: 'Subjects & Syllabi',icon: BookOpen },
  { id: 'sessions',     label: 'Exam Sessions',     icon: Calendar },
  { id: 'enrollments',  label: 'Enrollments',       icon: Users },
  { id: 'marks',        label: 'Mark Entry',        icon: ClipboardList },
  { id: 'results',      label: 'Results',           icon: Award },
  { id: 'reports',      label: 'Report Cards',      icon: FileText },
];
type Tab = typeof TABS[number]['id'];

// ── Modal wrapper ─────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium text-gray-700">{label}</Label>
    {children}
  </div>
);

const Select = ({ value, onChange, children, className = '' }: any) => (
  <select
    value={value}
    onChange={onChange}
    className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
  >
    {children}
  </select>
);

// ============================================================
export function IgcsePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [gradingSystems, setGradingSystems] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Mark Entry
  const [markSyllabusId, setMarkSyllabusId] = useState('');
  const [markSessionId, setMarkSessionId] = useState('');
  const [markSheet, setMarkSheet] = useState<any>(null);
  const [pendingMarks, setPendingMarks] = useState<Record<string, string>>({});
  const [marksSaving, setMarksSaving] = useState(false);

  // Results
  const [resultStudentId, setResultStudentId] = useState('');
  const [resultSessionId, setResultSessionId] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Modals
  const [showAddGS, setShowAddGS] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState<any>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showEditSession, setShowEditSession] = useState<any>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showEditSubject, setShowEditSubject] = useState<any>(null);
  const [showAddSyllabus, setShowAddSyllabus] = useState<any>(null);
  const [showAddComponent, setShowAddComponent] = useState<any>(null);
  const [showComponents, setShowComponents] = useState<Record<string, boolean>>({});
  const [syllabusComponents, setSyllabusComponents] = useState<Record<string, any[]>>({});
  const [showEnroll, setShowEnroll] = useState(false);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Forms
  const [gsForm, setGsForm] = useState({ name: '', scale_type: 'A_to_G', description: '' });
  const [sessionForm, setSessionForm] = useState({ name: '', series: 'May/June', year: new Date().getFullYear(), start_date: '', end_date: '', is_active: false });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', subject_group: '', description: '' });
  const [syllabusForm, setSyllabusForm] = useState({ syllabus_code: '', version: '', description: '', grading_system_id: '', has_tiers: true });
  const [componentForm, setComponentForm] = useState({ name: '', component_code: '', type: 'written', tier: 'both', weight: '', max_marks: '', duration_minutes: '', sort_order: '0' });
  const [enrollForm, setEnrollForm] = useState({ student_id: '', syllabus_id: '', exam_session_id: '', tier: 'extended', candidate_number: '', centre_number: '' });
  const [bulkEnrollForm, setBulkEnrollForm] = useState({ syllabus_id: '', exam_session_id: '', tier: 'extended', class_id: '' });
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [boundaryRows, setBoundaryRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  // ── Loaders ─────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/dashboard');
      setDashboard(r.data);
    } catch { /* non-blocking */ }
  }, []);

  const loadGradingSystems = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/grading-systems');
      setGradingSystems(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/sessions');
      setSessions(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/subjects');
      setSubjects(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadSyllabi = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/syllabi');
      setSyllabi(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/igcse/enrollments');
      setEnrollments(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/students?limit=500');
      setStudents(r.data?.students || r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const r: any = await (api as any).api.get('/classes');
      setClasses(r.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadSyllabusComponents = async (syllabusId: string) => {
    try {
      const r: any = await (api as any).api.get(`/igcse/syllabi/${syllabusId}/components`);
      setSyllabusComponents(prev => ({ ...prev, [syllabusId]: r.data || [] }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadDashboard();
    loadSessions();
    loadSubjects();
    loadSyllabi();
    if (isAdmin || isTeacher) {
      loadGradingSystems();
      loadStudents();
      loadClasses();
    }
  }, []);

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    if (t === 'enrollments') loadEnrollments();
    if (t === 'setup') loadGradingSystems();
  };

  // ── GRADING SYSTEM CRUD ──────────────────────────────────────
  const saveGradingSystem = async () => {
    if (!gsForm.name) return flash('Name required', 'error');
    try {
      await (api as any).api.post('/igcse/grading-systems', gsForm);
      flash('Grading system created');
      setShowAddGS(false);
      setGsForm({ name: '', scale_type: 'A_to_G', description: '' });
      loadGradingSystems();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteGradingSystem = async (id: number) => {
    if (!confirm('Delete this grading system?')) return;
    try {
      await (api as any).api.delete(`/igcse/grading-systems/${id}`);
      flash('Deleted'); loadGradingSystems();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const loadBoundaries = async (gsId: number) => {
    try {
      const r: any = await (api as any).api.get(`/igcse/grading-systems/${gsId}/boundaries`);
      const gs = gradingSystems.find(g => g.id === gsId);
      // Seed default boundaries if none
      const defaultAtoG = [
        { grade: 'A*', min_score: 90, max_score: 100, sort_order: 0 },
        { grade: 'A',  min_score: 80, max_score: 89.99, sort_order: 1 },
        { grade: 'B',  min_score: 70, max_score: 79.99, sort_order: 2 },
        { grade: 'C',  min_score: 60, max_score: 69.99, sort_order: 3 },
        { grade: 'D',  min_score: 50, max_score: 59.99, sort_order: 4 },
        { grade: 'E',  min_score: 40, max_score: 49.99, sort_order: 5 },
        { grade: 'F',  min_score: 30, max_score: 39.99, sort_order: 6 },
        { grade: 'G',  min_score: 20, max_score: 29.99, sort_order: 7 },
        { grade: 'U',  min_score: 0,  max_score: 19.99, sort_order: 8 },
      ];
      setBoundaryRows(r.data?.length ? r.data : defaultAtoG);
      setShowBoundaries({ id: gsId, name: gs?.name });
    } catch { /* ignore */ }
  };

  const saveBoundaries = async () => {
    if (!showBoundaries) return;
    try {
      await (api as any).api.post(`/igcse/grading-systems/${showBoundaries.id}/boundaries`, {
        boundaries: boundaryRows
      });
      flash('Boundaries saved');
      setShowBoundaries(null);
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── SESSION CRUD ─────────────────────────────────────────────
  const saveSession = async () => {
    if (!sessionForm.name || !sessionForm.year) return flash('Name and year required', 'error');
    try {
      if (showEditSession) {
        await (api as any).api.put(`/igcse/sessions/${showEditSession.id}`, sessionForm);
        flash('Session updated');
        setShowEditSession(null);
      } else {
        await (api as any).api.post('/igcse/sessions', sessionForm);
        flash('Session created');
        setShowAddSession(false);
      }
      setSessionForm({ name: '', series: 'May/June', year: new Date().getFullYear(), start_date: '', end_date: '', is_active: false });
      loadSessions();
      loadDashboard();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteSession = async (id: number) => {
    if (!confirm('Delete this exam session?')) return;
    try {
      await (api as any).api.delete(`/igcse/sessions/${id}`);
      flash('Deleted'); loadSessions();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── SUBJECT CRUD ─────────────────────────────────────────────
  const saveSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) return flash('Name and code required', 'error');
    try {
      if (showEditSubject) {
        await (api as any).api.put(`/igcse/subjects/${showEditSubject.id}`, subjectForm);
        flash('Subject updated');
        setShowEditSubject(null);
      } else {
        await (api as any).api.post('/igcse/subjects', subjectForm);
        flash('Subject created');
        setShowAddSubject(false);
      }
      setSubjectForm({ name: '', code: '', subject_group: '', description: '' });
      loadSubjects(); loadSyllabi();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteSubject = async (id: number) => {
    if (!confirm('Delete this subject? This will also delete all syllabi.')) return;
    try {
      await (api as any).api.delete(`/igcse/subjects/${id}`);
      flash('Deleted'); loadSubjects(); loadSyllabi();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── SYLLABUS CRUD ────────────────────────────────────────────
  const saveSyllabus = async () => {
    if (!syllabusForm.syllabus_code) return flash('Syllabus code required', 'error');
    try {
      await (api as any).api.post('/igcse/syllabi', { ...syllabusForm, subject_id: showAddSyllabus.id });
      flash('Syllabus created');
      setShowAddSyllabus(null);
      setSyllabusForm({ syllabus_code: '', version: '', description: '', grading_system_id: '', has_tiers: true });
      loadSyllabi();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteSyllabus = async (id: number) => {
    if (!confirm('Delete this syllabus and all components?')) return;
    try {
      await (api as any).api.delete(`/igcse/syllabi/${id}`);
      flash('Deleted'); loadSyllabi();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── COMPONENT CRUD ───────────────────────────────────────────
  const saveComponent = async () => {
    if (!componentForm.name || !componentForm.weight || !componentForm.max_marks) {
      return flash('Name, weight and max marks required', 'error');
    }
    try {
      await (api as any).api.post(`/igcse/syllabi/${showAddComponent.id}/components`, componentForm);
      flash('Component added');
      setShowAddComponent(null);
      setComponentForm({ name: '', component_code: '', type: 'written', tier: 'both', weight: '', max_marks: '', duration_minutes: '', sort_order: '0' });
      loadSyllabusComponents(showAddComponent.id);
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteComponent = async (id: number, syllabusId: string) => {
    if (!confirm('Delete this component?')) return;
    try {
      await (api as any).api.delete(`/igcse/components/${id}`);
      flash('Deleted'); loadSyllabusComponents(syllabusId);
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── ENROLLMENT ───────────────────────────────────────────────
  const saveEnrollment = async () => {
    if (!enrollForm.student_id || !enrollForm.syllabus_id || !enrollForm.exam_session_id) {
      return flash('Student, syllabus, and session required', 'error');
    }
    try {
      await (api as any).api.post('/igcse/enrollments', enrollForm);
      flash('Student enrolled');
      setShowEnroll(false);
      setEnrollForm({ student_id: '', syllabus_id: '', exam_session_id: '', tier: 'extended', candidate_number: '', centre_number: '' });
      loadEnrollments();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const deleteEnrollment = async (id: number) => {
    if (!confirm('Remove this enrollment?')) return;
    try {
      await (api as any).api.delete(`/igcse/enrollments/${id}`);
      flash('Enrollment removed'); loadEnrollments();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const toggleBulkStudent = (id: string) => {
    setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveBulkEnroll = async () => {
    if (!bulkEnrollForm.class_id || !bulkEnrollForm.syllabus_id || !bulkEnrollForm.exam_session_id || !bulkSelectedIds.length) {
      return flash('Class, syllabus, session, and at least one student required', 'error');
    }
    try {
      const r: any = await (api as any).api.post('/igcse/enrollments/bulk', { ...bulkEnrollForm, student_ids: bulkSelectedIds });
      flash(`Enrolled ${r.data?.enrolled ?? bulkSelectedIds.length} student(s)`);
      setShowBulkEnroll(false);
      setBulkEnrollForm({ syllabus_id: '', exam_session_id: '', tier: 'extended', class_id: '' });
      setBulkSelectedIds([]);
      loadEnrollments();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  // ── MARK ENTRY ───────────────────────────────────────────────
  const loadMarkSheet = async () => {
    if (!markSyllabusId || !markSessionId) return flash('Select syllabus and session', 'error');
    setLoading(true);
    try {
      const r: any = await (api as any).api.get(`/igcse/mark-entry?syllabus_id=${markSyllabusId}&session_id=${markSessionId}`);
      setMarkSheet(r.data);
      setPendingMarks({});
    } catch (e: any) { flash(e.response?.data?.error || 'Error loading mark sheet', 'error'); }
    setLoading(false);
  };

  const saveMarks = async () => {
    if (!markSheet) return;
    const marks: any[] = [];
    for (const [key, val] of Object.entries(pendingMarks)) {
      const [enrollmentId, componentId] = key.split('_');
      marks.push({
        enrollment_id: parseInt(enrollmentId),
        component_id: parseInt(componentId),
        raw_score: val === '' ? null : parseFloat(val),
        is_absent: val === 'ABS',
      });
    }
    if (!marks.length) return flash('No changes to save', 'error');
    setMarksSaving(true);
    try {
      await (api as any).api.post('/igcse/marks/batch', { marks });
      flash(`${marks.length} mark(s) saved`);
      setPendingMarks({});
      loadMarkSheet();
    } catch (e: any) { flash(e.response?.data?.error || 'Error saving marks', 'error'); }
    setMarksSaving(false);
  };

  const lockMarks = async () => {
    if (!confirm('Lock all marks for this syllabus/session? This cannot be undone without admin access.')) return;
    try {
      await (api as any).api.post('/igcse/marks/lock', { session_id: markSessionId, syllabus_id: markSyllabusId });
      flash('Marks locked successfully');
      loadMarkSheet();
    } catch (e: any) { flash(e.response?.data?.error || 'Error', 'error'); }
  };

  const calculateGrades = async () => {
    if (!markSessionId) return flash('Select a session first', 'error');
    try {
      const r: any = await (api as any).api.post(`/igcse/sessions/${markSessionId}/calculate-all`);
      flash(`Grades computed for ${r.data.computed} / ${r.data.total} enrollments`);
      loadMarkSheet();
    } catch (e: any) { flash(e.response?.data?.error || 'Error computing grades', 'error'); }
  };

  // ── RESULTS ──────────────────────────────────────────────────
  const loadResults = async () => {
    if (!resultStudentId) return flash('Select a student', 'error');
    setLoading(true);
    try {
      const params = resultSessionId ? `?session_id=${resultSessionId}` : '';
      const r: any = await (api as any).api.get(`/igcse/results/student/${resultStudentId}${params}`);
      setResults(r.data || []);
    } catch (e: any) { flash(e.response?.data?.error || 'Error loading results', 'error'); }
    setLoading(false);
  };

  const loadReportCard = async (studentId: string, sessionId: string) => {
    setLoading(true);
    try {
      const r: any = await (api as any).api.get(`/igcse/report-cards/data/${studentId}/${sessionId}`);
      setReportData(r.data);
    } catch (e: any) { flash(e.response?.data?.error || 'Error loading report', 'error'); }
    setLoading(false);
  };

  const activeSession = sessions.find(s => s.is_active);

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">IGCSE Module</h1>
            <p className="text-xs text-gray-500">Cambridge International General Certificate of Secondary Education</p>
          </div>
        </div>
        {activeSession && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Active: {activeSession.name}</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-0">
        {TABS.filter(t => {
          if (isStudent && ['setup', 'marks'].includes(t.id)) return false;
          return true;
        }).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === t.id
                  ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Subjects', value: dashboard?.subjects ?? '—', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
              { label: 'Exam Sessions', value: dashboard?.sessions ?? '—', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
              { label: 'Enrollments', value: dashboard?.enrollments ?? '—', icon: Users, color: 'text-teal-600 bg-teal-50' },
              { label: 'Graded', value: dashboard?.graded ?? '—', icon: Award, color: 'text-green-600 bg-green-50' },
            ].map(stat => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Grade Distribution */}
          {dashboard?.grade_distribution?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Grade Distribution — {activeSession?.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {dashboard.grade_distribution.map((g: any) => (
                    <div key={g.final_grade} className="flex flex-col items-center gap-1">
                      <GradeBadge grade={g.final_grade} />
                      <span className="text-sm font-semibold text-gray-700">{g.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* IGCSE Info */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-indigo-600" /> IGCSE Grading Scale (A*–G)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['A*','A','B','C','D','E','F','G','U'].map(g => (
                  <GradeBadge key={g} grade={g} />
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Cambridge IGCSE uses grade boundaries that vary by subject and exam session.
                Core tier candidates can achieve C–G; Extended tier candidates can achieve A*–G.
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { tier: 'Extended', desc: 'A*–G (full range)', color: 'bg-indigo-50 border-indigo-200' },
                  { tier: 'Core', desc: 'C–G (limited range)', color: 'bg-sky-50 border-sky-200' },
                  { tier: 'Sessions', desc: 'May/June & Oct/Nov', color: 'bg-purple-50 border-purple-200' },
                ].map(item => (
                  <div key={item.tier} className={`p-3 rounded-lg border ${item.color}`}>
                    <p className="font-semibold text-gray-700">{item.tier}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Grading Setup Tab ─────────────────────────────────── */}
      {activeTab === 'setup' && (isAdmin || isTeacher) && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Grading Systems</h2>
            {isAdmin && <Button size="sm" onClick={() => setShowAddGS(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add System</Button>}
          </div>
          {gradingSystems.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No grading systems configured yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {gradingSystems.map(gs => (
                <Card key={gs.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{gs.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Scale: {gs.scale_type === 'A_to_G' ? 'A*–G' : '9–1'} · {gs.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => loadBoundaries(gs.id)} className="gap-1 text-xs">
                        <Settings className="h-3.5 w-3.5" /> Boundaries
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => deleteGradingSystem(gs.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add Grading System Modal */}
          {showAddGS && (
            <Modal title="Add Grading System" onClose={() => setShowAddGS(false)}>
              <div className="space-y-4">
                <Field label="Name"><Input value={gsForm.name} onChange={e => setGsForm(f => ({...f, name: e.target.value}))} placeholder="e.g. IGCSE A*-G 2026" /></Field>
                <Field label="Scale Type">
                  <Select value={gsForm.scale_type} onChange={(e: any) => setGsForm(f => ({...f, scale_type: e.target.value}))}>
                    <option value="A_to_G">A*–G</option>
                    <option value="9_to_1">9–1</option>
                  </Select>
                </Field>
                <Field label="Description (optional)"><Input value={gsForm.description} onChange={e => setGsForm(f => ({...f, description: e.target.value}))} /></Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddGS(false)}>Cancel</Button>
                  <Button onClick={saveGradingSystem}>Save</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Grade Boundaries Modal */}
          {showBoundaries && (
            <Modal title={`Grade Boundaries — ${showBoundaries.name}`} onClose={() => setShowBoundaries(null)}>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Set the minimum % score for each grade. These thresholds apply to the weighted final score.</p>
                <div className="space-y-2">
                  {boundaryRows.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <GradeBadge grade={b.grade} />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500">Min %</Label>
                          <Input
                            type="number" min="0" max="100" step="0.01"
                            value={b.min_score}
                            onChange={e => setBoundaryRows(rows => rows.map((r, j) => j === i ? {...r, min_score: parseFloat(e.target.value)} : r))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Max %</Label>
                          <Input
                            type="number" min="0" max="100" step="0.01"
                            value={b.max_score}
                            onChange={e => setBoundaryRows(rows => rows.map((r, j) => j === i ? {...r, max_score: parseFloat(e.target.value)} : r))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setShowBoundaries(null)}>Cancel</Button>
                  <Button onClick={saveBoundaries}><Save className="h-4 w-4 mr-1" />Save Boundaries</Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Subjects & Syllabi Tab ────────────────────────────── */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Subjects & Syllabi</h2>
            {isAdmin && <Button size="sm" onClick={() => setShowAddSubject(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Subject</Button>}
          </div>

          {subjects.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No subjects added yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {subjects.map(sub => {
                const subSyllabi = syllabi.filter(sy => sy.subject_id === sub.id);
                return (
                  <Card key={sub.id} className="overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-sm font-bold">{sub.code}</div>
                        <div>
                          <p className="font-semibold text-gray-800">{sub.name}</p>
                          <p className="text-xs text-gray-500">{sub.subject_group || 'No group'} · {subSyllabi.length} syllabus(i)</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isAdmin && <>
                          <Button size="sm" variant="outline" onClick={() => { setSyllabusForm({ syllabus_code: sub.code, version: '', description: '', grading_system_id: '', has_tiers: true }); setShowAddSyllabus(sub); }} className="text-xs gap-1">
                            <Plus className="h-3.5 w-3.5" /> Syllabus
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSubjectForm({ name: sub.name, code: sub.code, subject_group: sub.subject_group || '', description: sub.description || '' }); setShowEditSubject(sub); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteSubject(sub.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>}
                      </div>
                    </div>
                    {subSyllabi.length > 0 && (
                      <div className="border-t bg-gray-50 px-4 py-2 space-y-2">
                        {subSyllabi.map(sy => {
                          const expanded = showComponents[sy.id];
                          const comps = syllabusComponents[sy.id];
                          return (
                            <div key={sy.id} className="bg-white rounded-lg border">
                              <div className="px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setShowComponents(prev => ({...prev, [sy.id]: !prev[sy.id]}));
                                      if (!comps) loadSyllabusComponents(String(sy.id));
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">{sy.syllabus_code} {sy.version && `(${sy.version})`}</p>
                                    <p className="text-xs text-gray-400">{sy.grading_system_name || 'No grading system'} · {sy.component_count} components · {sy.has_tiers ? 'Core/Extended' : 'Single tier'}</p>
                                  </div>
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="text-xs gap-1"
                                      onClick={() => { setShowAddComponent(sy); setComponentForm({ name: '', component_code: '', type: 'written', tier: 'both', weight: '', max_marks: '', duration_minutes: '', sort_order: '0' }); }}>
                                      <Plus className="h-3 w-3" /> Component
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => deleteSyllabus(sy.id)} className="text-red-500"><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                )}
                              </div>
                              {expanded && comps && (
                                <div className="border-t px-3 pb-2">
                                  {comps.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-2">No components yet.</p>
                                  ) : (
                                    <table className="w-full text-xs mt-2">
                                      <thead>
                                        <tr className="text-gray-400 border-b">
                                          <th className="text-left py-1 font-medium">Name</th>
                                          <th className="text-left py-1 font-medium">Type</th>
                                          <th className="text-left py-1 font-medium">Tier</th>
                                          <th className="text-right py-1 font-medium">Marks</th>
                                          <th className="text-right py-1 font-medium">Weight</th>
                                          {isAdmin && <th></th>}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {comps.map(c => (
                                          <tr key={c.id} className="border-b last:border-0">
                                            <td className="py-1.5 font-medium text-gray-700">{c.name} {c.component_code && <span className="text-gray-400">({c.component_code})</span>}</td>
                                            <td className="py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs ${COMPONENT_TYPE_COLORS[c.type] || 'bg-gray-100 text-gray-600'}`}>{c.type}</span></td>
                                            <td className="py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs ${TIER_COLORS[c.tier] || 'bg-gray-100'}`}>{c.tier}</span></td>
                                            <td className="py-1.5 text-right">{c.max_marks}</td>
                                            <td className="py-1.5 text-right">{c.weight}%</td>
                                            {isAdmin && (
                                              <td className="py-1.5 text-right">
                                                <button onClick={() => deleteComponent(c.id, String(sy.id))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Subject Modal */}
          {(showAddSubject || showEditSubject) && (
            <Modal title={showEditSubject ? 'Edit Subject' : 'Add IGCSE Subject'} onClose={() => { setShowAddSubject(false); setShowEditSubject(null); }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Subject Name"><Input value={subjectForm.name} onChange={e => setSubjectForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Mathematics" /></Field>
                  <Field label="Cambridge Code"><Input value={subjectForm.code} onChange={e => setSubjectForm(f => ({...f, code: e.target.value}))} placeholder="e.g. 0580" /></Field>
                </div>
                <Field label="Subject Group">
                  <Select value={subjectForm.subject_group} onChange={(e: any) => setSubjectForm(f => ({...f, subject_group: e.target.value}))}>
                    <option value="">Select group…</option>
                    {['Languages','Sciences','Mathematics','Humanities','Arts & Technology','Social Sciences'].map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </Field>
                <Field label="Description (optional)"><Input value={subjectForm.description} onChange={e => setSubjectForm(f => ({...f, description: e.target.value}))} /></Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddSubject(false); setShowEditSubject(null); }}>Cancel</Button>
                  <Button onClick={saveSubject}>Save</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Add Syllabus Modal */}
          {showAddSyllabus && (
            <Modal title={`Add Syllabus — ${showAddSyllabus.name}`} onClose={() => setShowAddSyllabus(null)}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Syllabus Code"><Input value={syllabusForm.syllabus_code} onChange={e => setSyllabusForm(f => ({...f, syllabus_code: e.target.value}))} /></Field>
                  <Field label="Version"><Input value={syllabusForm.version} onChange={e => setSyllabusForm(f => ({...f, version: e.target.value}))} placeholder="e.g. 2023-2025" /></Field>
                </div>
                <Field label="Grading System">
                  <Select value={syllabusForm.grading_system_id} onChange={(e: any) => setSyllabusForm(f => ({...f, grading_system_id: e.target.value}))}>
                    <option value="">None</option>
                    {gradingSystems.map(gs => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                  </Select>
                </Field>
                <Field label="Tiers">
                  <Select value={syllabusForm.has_tiers ? 'true' : 'false'} onChange={(e: any) => setSyllabusForm(f => ({...f, has_tiers: e.target.value === 'true'}))}>
                    <option value="true">Core & Extended</option>
                    <option value="false">Single tier</option>
                  </Select>
                </Field>
                <Field label="Description"><Input value={syllabusForm.description} onChange={e => setSyllabusForm(f => ({...f, description: e.target.value}))} /></Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddSyllabus(null)}>Cancel</Button>
                  <Button onClick={saveSyllabus}>Add Syllabus</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Add Component Modal */}
          {showAddComponent && (
            <Modal title={`Add Component — ${showAddComponent.syllabus_code}`} onClose={() => setShowAddComponent(null)}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name"><Input value={componentForm.name} onChange={e => setComponentForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Paper 2" /></Field>
                  <Field label="Code"><Input value={componentForm.component_code} onChange={e => setComponentForm(f => ({...f, component_code: e.target.value}))} placeholder="e.g. 22" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type">
                    <Select value={componentForm.type} onChange={(e: any) => setComponentForm(f => ({...f, type: e.target.value}))}>
                      {['written','coursework','practical','oral','portfolio'].map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <Field label="Tier">
                    <Select value={componentForm.tier} onChange={(e: any) => setComponentForm(f => ({...f, tier: e.target.value}))}>
                      <option value="both">Both</option>
                      <option value="core">Core only</option>
                      <option value="extended">Extended only</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Max Marks"><Input type="number" value={componentForm.max_marks} onChange={e => setComponentForm(f => ({...f, max_marks: e.target.value}))} /></Field>
                  <Field label="Weight (%)"><Input type="number" value={componentForm.weight} onChange={e => setComponentForm(f => ({...f, weight: e.target.value}))} /></Field>
                  <Field label="Duration (min)"><Input type="number" value={componentForm.duration_minutes} onChange={e => setComponentForm(f => ({...f, duration_minutes: e.target.value}))} /></Field>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddComponent(null)}>Cancel</Button>
                  <Button onClick={saveComponent}>Add Component</Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Exam Sessions Tab ─────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Exam Sessions</h2>
            {isAdmin && <Button size="sm" onClick={() => { setSessionForm({ name: '', series: 'May/June', year: new Date().getFullYear(), start_date: '', end_date: '', is_active: false }); setShowAddSession(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> Add Session</Button>}
          </div>
          {sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No exam sessions created yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {sessions.map(s => (
                <Card key={s.id} className={`p-4 ${s.is_active ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} text-xs font-bold`}>
                        {s.year.toString().slice(-2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">{s.name}</p>
                          {s.is_active && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span>}
                          {s.is_locked && <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs"><Lock className="h-3 w-3" />Locked</span>}
                        </div>
                        <p className="text-xs text-gray-500">{s.series} · {s.year}{s.start_date && ` · ${s.start_date}`}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSessionForm({ name: s.name, series: s.series, year: s.year, start_date: s.start_date || '', end_date: s.end_date || '', is_active: s.is_active }); setShowEditSession(s); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => deleteSession(s.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {(showAddSession || showEditSession) && (
            <Modal title={showEditSession ? 'Edit Session' : 'Add Exam Session'} onClose={() => { setShowAddSession(false); setShowEditSession(null); }}>
              <div className="space-y-4">
                <Field label="Session Name"><Input value={sessionForm.name} onChange={e => setSessionForm(f => ({...f, name: e.target.value}))} placeholder="e.g. May/June 2026" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Series">
                    <Select value={sessionForm.series} onChange={(e: any) => setSessionForm(f => ({...f, series: e.target.value}))}>
                      <option value="May/June">May/June</option>
                      <option value="Oct/Nov">Oct/Nov</option>
                      <option value="Jan/Feb">Jan/Feb</option>
                    </Select>
                  </Field>
                  <Field label="Year"><Input type="number" value={sessionForm.year} onChange={e => setSessionForm(f => ({...f, year: parseInt(e.target.value)}))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date"><Input type="date" value={sessionForm.start_date} onChange={e => setSessionForm(f => ({...f, start_date: e.target.value}))} /></Field>
                  <Field label="End Date"><Input type="date" value={sessionForm.end_date} onChange={e => setSessionForm(f => ({...f, end_date: e.target.value}))} /></Field>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sessionForm.is_active} onChange={e => setSessionForm(f => ({...f, is_active: e.target.checked}))} className="rounded" />
                  <span className="text-sm text-gray-700">Set as active session</span>
                </label>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddSession(false); setShowEditSession(null); }}>Cancel</Button>
                  <Button onClick={saveSession}>Save</Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Enrollments Tab ───────────────────────────────────── */}
      {activeTab === 'enrollments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Student Enrollments</h2>
            {isAdmin && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowBulkEnroll(true)} className="gap-1 text-xs">
                  <Users className="h-3.5 w-3.5" /> Bulk Enroll
                </Button>
                <Button size="sm" onClick={() => setShowEnroll(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Enroll Student</Button>
              </div>
            )}
          </div>
          {enrollments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">No enrollments found.</CardContent></Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b text-xs">
                    <th className="py-2 font-medium">Student</th>
                    <th className="py-2 font-medium">Subject</th>
                    <th className="py-2 font-medium">Syllabus</th>
                    <th className="py-2 font-medium">Session</th>
                    <th className="py-2 font-medium">Tier</th>
                    <th className="py-2 font-medium">Grade</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <p className="font-medium text-gray-700">{e.student_name}</p>
                        <p className="text-xs text-gray-400">{e.admission_number}</p>
                      </td>
                      <td className="py-2">
                        <p className="font-medium text-gray-700">{e.subject_name}</p>
                        <p className="text-xs text-gray-400">{e.subject_code}</p>
                      </td>
                      <td className="py-2 text-gray-600 text-xs">{e.syllabus_code} {e.syllabus_version && `(${e.syllabus_version})`}</td>
                      <td className="py-2 text-gray-600 text-xs">{e.session_name}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_COLORS[e.tier] || 'bg-gray-100'}`}>{e.tier}</span>
                      </td>
                      <td className="py-2"><GradeBadge grade={e.final_grade} /></td>
                      {isAdmin && (
                        <td className="py-2 text-right">
                          <button onClick={() => deleteEnrollment(e.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Enroll Modal */}
          {showEnroll && (
            <Modal title="Enroll Student" onClose={() => setShowEnroll(false)}>
              <div className="space-y-4">
                <Field label="Student">
                  <Select value={enrollForm.student_id} onChange={(e: any) => setEnrollForm(f => ({...f, student_id: e.target.value}))}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                  </Select>
                </Field>
                <Field label="Syllabus">
                  <Select value={enrollForm.syllabus_id} onChange={(e: any) => setEnrollForm(f => ({...f, syllabus_id: e.target.value}))}>
                    <option value="">Select syllabus…</option>
                    {syllabi.map(sy => <option key={sy.id} value={sy.id}>{sy.subject_name} ({sy.syllabus_code}) {sy.version}</option>)}
                  </Select>
                </Field>
                <Field label="Exam Session">
                  <Select value={enrollForm.exam_session_id} onChange={(e: any) => setEnrollForm(f => ({...f, exam_session_id: e.target.value}))}>
                    <option value="">Select session…</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tier">
                    <Select value={enrollForm.tier} onChange={(e: any) => setEnrollForm(f => ({...f, tier: e.target.value}))}>
                      <option value="extended">Extended</option>
                      <option value="core">Core</option>
                    </Select>
                  </Field>
                  <Field label="Candidate No."><Input value={enrollForm.candidate_number} onChange={e => setEnrollForm(f => ({...f, candidate_number: e.target.value}))} placeholder="Optional" /></Field>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
                  <Button onClick={saveEnrollment}>Enroll</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Bulk Enroll Modal */}
          {showBulkEnroll && (
            <Modal title="Bulk Enroll Students" onClose={() => { setShowBulkEnroll(false); setBulkSelectedIds([]); }}>
              <div className="space-y-4">
                <Field label="Class">
                  <Select value={bulkEnrollForm.class_id} onChange={(e: any) => { setBulkEnrollForm(f => ({...f, class_id: e.target.value})); setBulkSelectedIds([]); }}>
                    <option value="">Select class…</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Syllabus">
                  <Select value={bulkEnrollForm.syllabus_id} onChange={(e: any) => setBulkEnrollForm(f => ({...f, syllabus_id: e.target.value}))}>
                    <option value="">Select syllabus…</option>
                    {syllabi.map(sy => <option key={sy.id} value={sy.id}>{sy.subject_name} ({sy.syllabus_code}) {sy.version}</option>)}
                  </Select>
                </Field>
                <Field label="Exam Session">
                  <Select value={bulkEnrollForm.exam_session_id} onChange={(e: any) => setBulkEnrollForm(f => ({...f, exam_session_id: e.target.value}))}>
                    <option value="">Select session…</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="Tier">
                  <Select value={bulkEnrollForm.tier} onChange={(e: any) => setBulkEnrollForm(f => ({...f, tier: e.target.value}))}>
                    <option value="extended">Extended</option>
                    <option value="core">Core</option>
                  </Select>
                </Field>
                <Field label={`Students in class${bulkSelectedIds.length ? ` (${bulkSelectedIds.length} selected)` : ''}`}>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {!bulkEnrollForm.class_id ? (
                      <p className="text-sm text-gray-400 p-3">Select a class first.</p>
                    ) : students.filter(s => String(s.class_id) === String(bulkEnrollForm.class_id)).length === 0 ? (
                      <p className="text-sm text-gray-400 p-3">No students in this class.</p>
                    ) : students.filter(s => String(s.class_id) === String(bulkEnrollForm.class_id)).map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={bulkSelectedIds.includes(s.id)} onChange={() => toggleBulkStudent(s.id)} />
                        {s.first_name} {s.last_name} ({s.admission_number})
                      </label>
                    ))}
                  </div>
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowBulkEnroll(false); setBulkSelectedIds([]); }}>Cancel</Button>
                  <Button onClick={saveBulkEnroll} disabled={!bulkSelectedIds.length}>
                    Enroll {bulkSelectedIds.length || ''} Student{bulkSelectedIds.length === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Mark Entry Tab ────────────────────────────────────── */}
      {activeTab === 'marks' && (isAdmin || isTeacher) && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Mark Entry</h2>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Syllabus">
                <Select value={markSyllabusId} onChange={(e: any) => setMarkSyllabusId(e.target.value)}>
                  <option value="">Select syllabus…</option>
                  {syllabi.map(sy => <option key={sy.id} value={sy.id}>{sy.subject_name} ({sy.syllabus_code})</option>)}
                </Select>
              </Field>
              <Field label="Exam Session">
                <Select value={markSessionId} onChange={(e: any) => setMarkSessionId(e.target.value)}>
                  <option value="">Select session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <div className="flex items-end">
                <Button onClick={loadMarkSheet} disabled={loading} className="w-full gap-1.5">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Load Sheet
                </Button>
              </div>
            </div>
          </Card>

          {markSheet && (
            <>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveMarks} disabled={marksSaving || !Object.keys(pendingMarks).length} className="gap-1.5">
                  <Save className="h-4 w-4" /> {marksSaving ? 'Saving…' : 'Save Marks'}
                </Button>
                {isAdmin && <>
                  <Button size="sm" variant="outline" onClick={calculateGrades} className="gap-1.5">
                    <RefreshCw className="h-4 w-4" /> Calculate Grades
                  </Button>
                  <Button size="sm" variant="outline" onClick={lockMarks} className="gap-1.5 text-red-600 border-red-300">
                    <Lock className="h-4 w-4" /> Lock All
                  </Button>
                </>}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">Student</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Tier</th>
                      {markSheet.components.map((c: any) => (
                        <th key={c.id} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                          <div>{c.name}</div>
                          <div className="text-gray-400 font-normal">/{c.max_marks} · {c.weight}%</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markSheet.enrollments.map((enroll: any) => (
                      <tr key={enroll.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 sticky left-0 bg-white">
                          <p className="font-medium text-gray-700 whitespace-nowrap">{enroll.student_name}</p>
                          <p className="text-xs text-gray-400">{enroll.admission_number}</p>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${TIER_COLORS[enroll.tier]}`}>{enroll.tier}</span>
                        </td>
                        {markSheet.components.map((c: any) => {
                          const existing = enroll.marks?.[c.id];
                          const key = `${enroll.id}_${c.id}`;
                          const pending = pendingMarks[key];
                          const value = pending !== undefined ? pending : (existing?.raw_score ?? '');
                          const isLocked = existing?.is_locked;
                          return (
                            <td key={c.id} className="px-2 py-1.5 text-center">
                              {isLocked ? (
                                <div className="flex items-center justify-center gap-1 text-gray-500">
                                  <span>{existing.raw_score}</span>
                                  <Lock className="h-3 w-3 text-gray-400" />
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  max={c.max_marks}
                                  step="0.5"
                                  value={value}
                                  onChange={e => setPendingMarks(prev => ({ ...prev, [key]: e.target.value }))}
                                  className={`h-7 w-20 text-center text-sm px-1 ${pending !== undefined ? 'border-indigo-400 bg-indigo-50' : ''}`}
                                  placeholder="—"
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <GradeBadge grade={enroll.final_grade} />
                          {enroll.weighted_score && <div className="text-xs text-gray-400 mt-0.5">{parseFloat(enroll.weighted_score).toFixed(1)}%</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {markSheet.enrollments.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm">No students enrolled for this syllabus/session.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Results Tab ───────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Student Results</h2>

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!isStudent && (
                <Field label="Student">
                  <Select value={resultStudentId} onChange={(e: any) => setResultStudentId(e.target.value)}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Session (optional)">
                <Select value={resultSessionId} onChange={(e: any) => setResultSessionId(e.target.value)}>
                  <option value="">All sessions</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <div className="flex items-end">
                <Button onClick={loadResults} disabled={loading} className="w-full gap-1.5">
                  <Eye className="h-4 w-4" /> View Results
                </Button>
              </div>
            </div>
          </Card>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map(enroll => (
                <Card key={enroll.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{enroll.subject_name} <span className="text-gray-400 font-normal text-sm">({enroll.subject_code})</span></CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">{enroll.session_name} · Syllabus {enroll.syllabus_code} {enroll.version && `(${enroll.version})`}</p>
                      </div>
                      <div className="text-right">
                        <GradeBadge grade={enroll.final_grade} />
                        {enroll.weighted_score && <p className="text-xs text-gray-400 mt-1">{parseFloat(enroll.weighted_score).toFixed(2)}%</p>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {enroll.marks?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-400 border-b">
                            <th className="py-1 font-medium">Component</th>
                            <th className="py-1 font-medium text-right">Score</th>
                            <th className="py-1 font-medium text-right">Max</th>
                            <th className="py-1 font-medium text-right">%</th>
                            <th className="py-1 font-medium text-right">Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enroll.marks.map((m: any) => (
                            <tr key={m.component_id} className="border-b last:border-0">
                              <td className="py-1.5 text-gray-700">{m.component_name}</td>
                              <td className="py-1.5 text-right font-medium text-gray-700">{m.raw_score ?? (m.is_absent ? <span className="text-red-500 text-xs">ABS</span> : '—')}</td>
                              <td className="py-1.5 text-right text-gray-400">{m.max_marks}</td>
                              <td className="py-1.5 text-right text-gray-600">
                                {m.raw_score != null ? `${((m.raw_score / m.max_marks) * 100).toFixed(1)}%` : '—'}
                              </td>
                              <td className="py-1.5 text-right text-gray-400">{m.weight}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-400">No marks entered yet.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && resultStudentId && (
            <Card><CardContent className="py-8 text-center text-gray-400">No results found for this student.</CardContent></Card>
          )}
        </div>
      )}

      {/* ── Report Cards Tab ──────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">IGCSE Report Cards</h2>

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!isStudent && (
                <Field label="Student">
                  <Select value={resultStudentId} onChange={(e: any) => setResultStudentId(e.target.value)}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Exam Session">
                <Select value={resultSessionId} onChange={(e: any) => setResultSessionId(e.target.value)}>
                  <option value="">Select session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => loadReportCard(
                    isStudent ? String(user?.id) : resultStudentId,
                    resultSessionId
                  )}
                  disabled={loading || !resultSessionId}
                  className="flex-1 gap-1.5"
                >
                  <Eye className="h-4 w-4" /> Generate Report
                </Button>
              </div>
            </div>
          </Card>

          {reportData && (
            <Card>
              {/* Report Header */}
              <CardContent className="p-6">
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                        Cambridge IGCSE Statement of Results
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">{reportData.session?.name}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Cambridge Assessment International Education</p>
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 text-sm">
                  {[
                    { label: 'Candidate Name', value: `${reportData.student?.first_name} ${reportData.student?.last_name}` },
                    { label: 'Admission No.', value: reportData.student?.admission_number },
                    { label: 'Class', value: reportData.student?.class_name || '—' },
                    { label: 'Session', value: reportData.session?.name },
                    { label: 'Series', value: reportData.session?.series },
                    { label: 'Year', value: reportData.session?.year },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</p>
                      <p className="font-semibold text-gray-800">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Subject Results */}
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-4 py-2 text-left font-medium">Subject</th>
                      <th className="px-4 py-2 text-left font-medium">Code</th>
                      <th className="px-4 py-2 text-left font-medium">Tier</th>
                      <th className="px-4 py-2 text-left font-medium">Component Breakdown</th>
                      <th className="px-4 py-2 text-right font-medium">Weighted %</th>
                      <th className="px-4 py-2 text-center font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.enrollments.map((enroll: any, idx: number) => (
                      <tr key={enroll.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-medium text-gray-800">{enroll.subject_name}</td>
                        <td className="px-4 py-3 text-gray-500">{enroll.subject_code}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_COLORS[enroll.tier]}`}>{enroll.tier}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {enroll.marks?.map((m: any) => (
                              <span key={m.component_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {m.component_name}: {m.raw_score ?? '—'}/{m.max_marks}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {enroll.weighted_score ? `${parseFloat(enroll.weighted_score).toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <GradeBadge grade={enroll.final_grade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {reportData.enrollments.length === 0 && (
                  <p className="text-center text-gray-400 py-6">No subjects enrolled for this session.</p>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-gray-400">
                  <p>Cambridge Assessment International Education © Cambridge University Press & Assessment</p>
                  <p>Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
