import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare, Square, AlertTriangle, CheckCircle2,
  Loader2, Eye, Zap, Search, X,
} from 'lucide-react';
import api from '@/services/api';

interface GenerateInvoicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const currentYear = new Date().getFullYear().toString();

export function GenerateInvoicesModal({ open, onOpenChange, onSuccess }: GenerateInvoicesModalProps) {
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [fsSearch, setFsSearch] = useState('');
  const [selectedStructures, setSelectedStructures] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [preview, setPreview] = useState<{ created: any[]; skipped: any[]; errors: any[] } | null>(null);
  const [result, setResult] = useState<{ created: any[]; errors: any[] } | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
      setStep('config');
      setPreview(null);
      setResult(null);
      setSelectedStructures([]);
      setSelectedClasses([]);
      setFsSearch('');
      setDueDate('');
      setTerm('');
      setAcademicYear(currentYear);
    }
  }, [open]);

  const loadData = async () => {
    try {
      // isActive=all → return every structure regardless of active status
      const [clsRes, fsRes]: any[] = await Promise.all([
        api.getClasses(),
        api.getFeeStructures({ isActive: 'all' }),
      ]);
      setClasses(clsRes.data || []);
      setFeeStructures(fsRes.data || []);
    } catch {
      /* ignore */
    }
  };

  const toggleStructure = (id: string) =>
    setSelectedStructures(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleClass = (id: string) =>
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Filtered list for the search box
  const visibleStructures = feeStructures.filter(fs => {
    if (!fsSearch) return true;
    const q = fsSearch.toLowerCase();
    return (
      fs.name?.toLowerCase().includes(q) ||
      fs.class_name?.toLowerCase().includes(q) ||
      fs.student_type?.toLowerCase().includes(q)
    );
  });

  const selectAllVisible = () =>
    setSelectedStructures(prev => [...new Set([...prev, ...visibleStructures.map(f => f.id)])]);

  const deselectAllVisible = () => {
    const visibleIds = new Set(visibleStructures.map(f => f.id));
    setSelectedStructures(prev => prev.filter(id => !visibleIds.has(id)));
  };

  const handlePreview = async () => {
    if (!selectedStructures.length) return;
    setLoading(true);
    try {
      const res: any = await api.generateSmartBulkInvoices({
        fee_structure_ids: selectedStructures,
        class_ids: selectedClasses.length ? selectedClasses : undefined,
        due_date: dueDate || undefined,
        term: term || undefined,
        academic_year: academicYear || undefined,
        dry_run: true,
      });
      setPreview(res.data || { created: [], skipped: [], errors: [] });
      setStep('preview');
    } catch (e: any) {
      alert(e?.response?.data?.message || e.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res: any = await api.generateSmartBulkInvoices({
        fee_structure_ids: selectedStructures,
        class_ids: selectedClasses.length ? selectedClasses : undefined,
        due_date: dueDate || undefined,
        term: term || undefined,
        academic_year: academicYear || undefined,
        dry_run: false,
      });
      setResult(res.data || { created: [], errors: [] });
      setStep('done');
      onSuccess();
    } catch (e: any) {
      alert(e?.response?.data?.message || e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Group skipped by reason
  const skipReasons: Record<string, number> = {};
  for (const s of preview?.skipped || []) {
    skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
  }
  const reasonLabel: Record<string, string> = {
    class_mismatch: 'Not in target class',
    student_type_mismatch: 'Student type mismatch (day/boarding)',
    no_transport: 'Not assigned to any transport route',
    route_mismatch: 'Wrong transport route',
    already_invoiced: 'Invoice already exists for this term/year',
  };

  const classRestrictedIds = new Set(feeStructures.filter(f => f.class_id).map(f => f.id));

  // Count how many visible structures are selected
  const visibleSelectedCount = visibleStructures.filter(f => selectedStructures.includes(f.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' && 'Generate Fee Invoices'}
            {step === 'preview' && 'Preview — Confirm Generation'}
            {step === 'done' && 'Invoices Generated'}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Config ── */}
        {step === 'config' && (
          <div className="space-y-5">
            {/* Fee Structures */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-semibold">
                  Fee Structures *
                  {selectedStructures.length > 0 && (
                    <span className="ml-2 text-blue-600 font-normal">({selectedStructures.length} selected)</span>
                  )}
                </Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="text-blue-600 hover:underline"
                  >
                    Select all{fsSearch ? ' matching' : ''}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllVisible}
                    className="text-gray-500 hover:underline"
                  >
                    Deselect all{fsSearch ? ' matching' : ''}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-2">
                All fee structures are shown — active and inactive. Each auto-assigns to students based on class, student type, and transport settings.
              </p>

              {/* Search box */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search by name, class or student type..."
                  value={fsSearch}
                  onChange={e => setFsSearch(e.target.value)}
                  className="pl-8 pr-8 text-sm h-9"
                />
                {fsSearch && (
                  <button
                    type="button"
                    onClick={() => setFsSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                {feeStructures.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No fee structures found. Create one first in Fee Structure settings.
                  </p>
                ) : visibleStructures.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No structures match your search.</p>
                ) : (
                  visibleStructures.map(fs => (
                    <div
                      key={fs.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer select-none transition-colors ${
                        selectedStructures.includes(fs.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${!fs.is_active ? 'opacity-60' : ''}`}
                      onClick={() => toggleStructure(fs.id)}
                    >
                      {selectedStructures.includes(fs.id)
                        ? <CheckSquare className="h-5 w-5 text-blue-600 shrink-0" />
                        : <Square className="h-5 w-5 text-gray-300 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{fs.name}</p>
                        <p className="text-xs text-gray-400">
                          KES {Number(fs.amount).toLocaleString()}
                          {fs.class_name && <span className="ml-2 text-purple-600">· {fs.class_name}</span>}
                          {fs.student_type && fs.student_type !== 'all' && (
                            <span className="ml-2 text-blue-500 capitalize">· {fs.student_type}</span>
                          )}
                          {fs.is_transport_fee && <span className="ml-2 text-orange-500">· Transport</span>}
                          {fs.frequency && <span className="ml-2 text-gray-300 capitalize">· {fs.frequency}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {classRestrictedIds.has(fs.id) && (
                          <Badge variant="outline" className="text-[10px]">Class</Badge>
                        )}
                        {!fs.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary line */}
              <p className="text-xs text-gray-400 mt-1">
                Showing {visibleStructures.length} of {feeStructures.length} structure(s)
                {fsSearch && ` matching "${fsSearch}"`}
                {visibleSelectedCount > 0 && ` · ${visibleSelectedCount} selected in view`}
              </p>
            </div>

            {/* Restrict to classes */}
            <div>
              <Label className="text-sm font-semibold">Restrict to Classes (optional)</Label>
              <p className="text-xs text-gray-400 mb-2">
                Leave blank to include all classes. Select to override which classes receive invoices.
              </p>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClass(c.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedClasses.includes(c.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Term / Year / Due Date */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Term</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                >
                  <option value="">All Terms</option>
                  <option value="term1">Term 1</option>
                  <option value="term2">Term 2</option>
                  <option value="term3">Term 3</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Invoices auto-assign based on each structure's class and student type. Use <strong>Preview</strong> to verify before generating.
              </span>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handlePreview} disabled={loading || selectedStructures.length === 0}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading preview...</>
                  : <><Eye className="h-4 w-4 mr-2" /> Preview ({selectedStructures.length} selected)</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-lg p-3 bg-green-50">
                <p className="text-2xl font-bold text-green-700">{preview.created.length}</p>
                <p className="text-xs text-gray-500">Invoices to create</p>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-2xl font-bold text-gray-500">{preview.skipped.length}</p>
                <p className="text-xs text-gray-500">Skipped (not affected)</p>
              </div>
              <div className="border rounded-lg p-3 bg-blue-50">
                <p className="text-2xl font-bold text-blue-700">
                  KES {preview.created.reduce((s: number, r: any) => s + Number(r.amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total value</p>
              </div>
            </div>

            {Object.keys(skipReasons).length > 0 && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <p className="font-medium text-gray-600">Why students were skipped:</p>
                {Object.entries(skipReasons).map(([reason, count]) => (
                  <p key={reason}>· {count} student(s) — {reasonLabel[reason] || reason}</p>
                ))}
              </div>
            )}

            {preview.created.length > 0 && (
              <div className="border rounded-md max-h-56 overflow-y-auto divide-y text-sm">
                {preview.created.map((row: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-medium">{row.name}</span>
                      {row.class_name && <span className="text-gray-400 text-xs ml-2">· {row.class_name}</span>}
                      <p className="text-xs text-gray-400">{row.fee}</p>
                    </div>
                    <span className="font-semibold text-gray-700">KES {Number(row.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.created.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No students match the selected fee structures.</p>
                <p className="text-xs mt-1">Check that the structures have the correct class / student type settings.</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('config')}>Back</Button>
              <Button onClick={handleGenerate} disabled={loading || preview.created.length === 0}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                  : <><Zap className="h-4 w-4 mr-2" /> Generate {preview.created.length} Invoice(s)</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-800">{result.created.length} Invoices Created</h3>
              <p className="text-sm text-gray-500 mt-1">
                Invoices have been assigned to the relevant students and are ready for payment.
              </p>
              {result.errors.length > 0 && (
                <p className="text-xs text-red-500 mt-2">{result.errors.length} error(s) occurred — check logs.</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
