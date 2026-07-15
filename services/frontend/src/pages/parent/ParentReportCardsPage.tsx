import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Download, Printer, Award, Calendar, BookOpen,
  ChevronRight, Loader2, AlertCircle, CheckCircle, Clock, RefreshCw, Users
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { jsPDF } from 'jspdf';
import { renderReportCardPage } from '@/pages/cbc/CbcReportCardPage';

// Same helpers/patterns as MyReportCardPage.tsx (student version) — kept in
// sync so parent and student see an identical report card layout.

const TERM_LABEL: Record<string, string> = {
  term1: 'Term 1', term2: 'Term 2', term3: 'Term 3',
};

const GRADE_COLOR: Record<string, string> = {
  EE: 'bg-green-100 text-green-800',  EE1: 'bg-green-200 text-green-900',
  EE2: 'bg-green-100 text-green-800', ME: 'bg-blue-100 text-blue-800',
  ME1: 'bg-blue-200 text-blue-900',   ME2: 'bg-blue-100 text-blue-800',
  AE: 'bg-yellow-100 text-yellow-800',AE1: 'bg-yellow-200 text-yellow-900',
  AE2: 'bg-yellow-100 text-yellow-800',BE: 'bg-red-100 text-red-800',
  BE1: 'bg-red-200 text-red-900',     BE2: 'bg-red-100 text-red-800',
  WD: 'bg-green-100 text-green-800',  D: 'bg-yellow-100 text-yellow-800',
  B: 'bg-red-100 text-red-800',
};

const GRADE_FULL: Record<string, string> = {
  EE:'Exceeding Expectations', EE1:'Exceeding Expectations', EE2:'Exceeding Expectations',
  ME:'Meeting Expectations',   ME1:'Meeting Expectations',   ME2:'Meeting Expectations',
  AE:'Approaching Expectations',AE1:'Approaching Expectations',AE2:'Approaching Expectations',
  BE:'Below Expectations',     BE1:'Below Expectations',     BE2:'Below Expectations',
  WD:'Well Developed', D:'Developing', B:'Beginning',
};

export function ParentReportCardsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (user?.id) { loadChildren(); loadSettings(); }
  }, [user?.id]);

  useEffect(() => {
    if (selectedChildId) loadCards(selectedChildId);
  }, [selectedChildId]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await api.getParentByUser(user?.id || '');
      const kids = res?.data?.children || [];
      setChildren(kids);
      if (kids.length) setSelectedChildId(kids[0].id || kids[0].student_id);
    } catch (e: any) {
      setError(e?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (studentId: string) => {
    try {
      setCardsLoading(true);
      setSelected(null);
      setDetail(null);
      const res: any = await api.getChildReportCards(studentId);
      setCards(res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report cards');
    } finally {
      setCardsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res: any = await api.getSettings();
      setSettings(res?.data || res);
    } catch {}
  };

  const openCard = async (card: any) => {
    setSelected(card);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res: any = await api.getMyReportCard(card.id);
      setDetail(res?.data || res);
    } catch (e: any) {
      setDetail({ error: e?.message || 'Failed to load' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!detail || !selected) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await renderReportCardPage(doc, detail, settings, selected.term, selected.academic_year, true);
      const safeName = (detail.student_name || 'Student').replace(/\s+/g, '_');
      const termLabel = (selected.term || 'term').replace('term', 'T');
      doc.save(`ReportCard_${safeName}_${termLabel}_${selected.academic_year}.pdf`);
    } catch (e: any) {
      alert('PDF generation failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const statusBadge = (status: string) => {
    if (status === 'published') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        <CheckCircle className="h-3 w-3" /> Published
      </span>
    );
    if (status === 'acknowledged') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
        <CheckCircle className="h-3 w-3" /> Acknowledged
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
        <Clock className="h-3 w-3" /> {status}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (error && !children.length) return (
    <div className="flex items-center justify-center h-64">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 mb-3">
            <AlertCircle className="h-5 w-5" /> <p className="font-medium">{error}</p>
          </div>
          <Button onClick={loadChildren}>Retry</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" /> Report Cards
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            View and download your children's term report cards once published
          </p>
        </div>
        {selectedChildId && (
          <Button variant="outline" size="sm" onClick={() => loadCards(selectedChildId)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        )}
      </div>

      {/* Child selector */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No children linked to your account</p>
            <p className="text-gray-400 text-sm mt-1">Contact the school to link your children.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {children.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {children.map(child => {
                const cid = child.id || child.student_id;
                return (
                  <button
                    key={cid}
                    onClick={() => setSelectedChildId(cid)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      selectedChildId === cid
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-gray-200 bg-white hover:border-teal-300 text-gray-600'
                    }`}
                  >
                    {child.first_name} {child.last_name}
                  </button>
                );
              })}
            </div>
          )}

          {cardsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : cards.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No report cards available yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Report cards will appear here once the school publishes them.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-5 gap-6">

              {/* Left — card list */}
              <div className="md:col-span-2 space-y-2">
                {cards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => openCard(card)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected?.id === card.id
                        ? 'border-teal-500 bg-teal-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {TERM_LABEL[card.term] || card.term}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {card.academic_year} · {card.class_name}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {statusBadge(card.status)}
                          {card.overall_grade && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${GRADE_COLOR[card.overall_grade] || 'bg-gray-100 text-gray-700'}`}>
                              {card.overall_grade}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 mt-1 flex-shrink-0 transition-colors ${
                        selected?.id === card.id ? 'text-teal-500' : 'text-gray-300'
                      }`} />
                    </div>
                    {card.published_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Published {new Date(card.published_at).toLocaleDateString('en-KE')}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Right — card detail / preview */}
              <div className="md:col-span-3">
                {!selected ? (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="py-16 text-center text-gray-400">
                      <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Select a report card to view details</p>
                    </CardContent>
                  </Card>
                ) : detailLoading ? (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="py-16 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-gray-400 mt-3 text-sm">Loading report card…</p>
                    </CardContent>
                  </Card>
                ) : detail?.error ? (
                  <Card>
                    <CardContent className="py-8 text-center text-red-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      {detail.error}
                    </CardContent>
                  </Card>
                ) : detail ? (
                  <Card className="print-report-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base">
                          {TERM_LABEL[selected.term] || selected.term} · {selected.academic_year}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="no-print"
                          >
                            <Printer className="h-4 w-4 mr-1" /> Print
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDownload}
                            disabled={downloading}
                            className="no-print bg-teal-600 hover:bg-teal-700"
                          >
                            {downloading
                              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              : <Download className="h-4 w-4 mr-1" />}
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      {/* Student info strip */}
                      <div className="bg-teal-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Student</p>
                          <p className="font-semibold">{detail.student_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Admission No.</p>
                          <p className="font-semibold">{detail.admission_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Class</p>
                          <p className="font-semibold">{detail.class_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Overall Grade</p>
                          {detail.overall_grade ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_COLOR[detail.overall_grade] || 'bg-gray-100 text-gray-700'}`}>
                              {detail.overall_grade} · {GRADE_FULL[detail.overall_grade] || ''}
                            </span>
                          ) : <p className="font-semibold text-gray-400">—</p>}
                        </div>
                      </div>

                      {/* Attendance */}
                      {(detail.days_present != null || detail.days_absent != null) && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />Attendance
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-green-700">{detail.days_present ?? '—'}</p>
                              <p className="text-xs text-gray-500">Present</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-red-600">{detail.days_absent ?? '—'}</p>
                              <p className="text-xs text-gray-500">Absent</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-2">
                              <p className="text-lg font-bold text-yellow-600">{detail.days_late ?? '—'}</p>
                              <p className="text-xs text-gray-500">Late</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Subject competencies */}
                      {detail.competencies?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            <BookOpen className="h-3.5 w-3.5 inline mr-1" />Subject Performance
                          </p>
                          <div className="rounded-xl border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 text-xs text-gray-500">
                                  <th className="text-left px-3 py-2">Subject</th>
                                  <th className="text-center px-3 py-2">Grade</th>
                                  <th className="text-left px-3 py-2 hidden sm:table-cell">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {detail.competencies.map((comp: any, i: number) => {
                                  const grade = comp.overall_cbc_grade || comp.pre_primary_grade || '—';
                                  return (
                                    <tr key={i} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 font-medium">{comp.subject_name}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_COLOR[grade] || 'bg-gray-100 text-gray-700'}`}>
                                          {grade}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-500 hidden sm:table-cell">
                                        {GRADE_FULL[grade] || ''}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      {(detail.class_teacher_comment || detail.head_teacher_comment) && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comments</p>
                          {detail.class_teacher_comment && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-400 mb-1">Class Teacher</p>
                              <p className="text-sm text-gray-700 italic">"{detail.class_teacher_comment}"</p>
                            </div>
                          )}
                          {detail.head_teacher_comment && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-gray-400 mb-1">Head Teacher / Principal</p>
                              <p className="text-sm text-gray-700 italic">"{detail.head_teacher_comment}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Term dates */}
                      {(detail.closing_date || detail.opening_date) && (
                        <div className="flex gap-4 text-sm border-t pt-3">
                          {detail.closing_date && (
                            <div>
                              <p className="text-xs text-gray-400">School Closes</p>
                              <p className="font-medium">{new Date(detail.closing_date).toLocaleDateString('en-KE')}</p>
                            </div>
                          )}
                          {detail.opening_date && (
                            <div>
                              <p className="text-xs text-gray-400">School Opens</p>
                              <p className="font-medium">{new Date(detail.opening_date).toLocaleDateString('en-KE')}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.print-report-card) { display: none !important; }
          .no-print { display: none !important; }
          .print-report-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
