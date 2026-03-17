import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { jsPDF } from 'jspdf';
import { FileText, CheckCircle, Download, PlusCircle, Users, Share2, Mail, MessageCircle, X, Phone, AtSign, AlertCircle, Loader2 } from 'lucide-react';

// ── Grade color helpers for PDF (hex RGB) ───────────────────────────────────
const GRADE_HEX: Record<string, [number, number, number]> = {
  EE: [22, 163, 74],   EE1: [15, 118, 54],  EE2: [22, 163, 74],
  ME: [37, 99, 235],   ME1: [29, 78, 216],  ME2: [37, 99, 235],
  AE: [202, 138, 4],   AE1: [180, 120, 2],  AE2: [202, 138, 4],
  BE: [220, 38, 38],   BE1: [185, 28, 28],  BE2: [220, 38, 38],
  WD: [22, 163, 74],   D:   [202, 138, 4],  B:   [220, 38, 38],
};
const GRADE_LABEL: Record<string, string> = {
  EE: 'Exceeding', EE1: 'EE Level 1', EE2: 'EE Level 2',
  ME: 'Meeting',   ME1: 'ME Level 1', ME2: 'ME Level 2',
  AE: 'Approaching', AE1: 'AE Level 1', AE2: 'AE Level 2',
  BE: 'Below',     BE1: 'BE Level 1', BE2: 'BE Level 2',
  WD: 'Well Dev.', D: 'Developing',   B: 'Beginning',
};

// ── Generate a single report card page in the jsPDF doc ─────────────────────
async function renderReportCardPage(
  doc: jsPDF,
  detail: any,
  school: any,
  term: string,
  academicYear: string,
  isFirstPage: boolean
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  if (!isFirstPage) doc.addPage();

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 38, 'F');

  if (school?.school_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => { try { doc.addImage(img, 'PNG', margin, 5, 22, 22); } catch { /* skip */ } resolve(); };
        img.onerror = () => resolve();
        img.src = school.school_logo_url;
      });
    } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text(school?.school_name || 'School Report Card', pageW / 2, 12, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const addrLine = [school?.address, school?.city, school?.state].filter(Boolean).join(', ');
  if (addrLine) doc.text(addrLine, pageW / 2, 19, { align: 'center' });
  const contactLine = [school?.phone, school?.email].filter(Boolean).join('  |  ');
  if (contactLine) doc.text(contactLine, pageW / 2, 25, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(`LEARNER PROGRESS REPORT — ${term.replace('term', 'Term ')} ${academicYear}`, pageW / 2, 33, { align: 'center' });
  y = 46;

  // ── Student Details ─────────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, y, pageW - 2 * margin, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('LEARNER INFORMATION', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const lc = margin + 4, rc = pageW / 2 + 4;
  doc.text(`Name: ${detail.student_name || '—'}`, lc, y + 13);
  doc.text(`Admission No: ${detail.admission_number || '—'}`, rc, y + 13);
  doc.text(`Class: ${detail.class_name || '—'}`, lc, y + 19);
  doc.text(`NEMIS: ${detail.nemis_number || '—'}`, rc, y + 19);
  y += 28;

  // ── Attendance ─────────────────────────────────────────────────────────────
  const attBoxW = (pageW - 2 * margin - 8) / 3;
  const attData = [
    { label: 'Days Present', val: detail.days_present ?? 0, bg: [220, 252, 231] as [number,number,number], fg: [22, 101, 52] as [number,number,number] },
    { label: 'Days Absent',  val: detail.days_absent ?? 0,  bg: [254, 226, 226] as [number,number,number], fg: [153, 27, 27] as [number,number,number] },
    { label: 'Days Late',    val: detail.days_late ?? 0,    bg: [254, 249, 195] as [number,number,number], fg: [133, 77, 14] as [number,number,number] },
  ];
  attData.forEach((a, i) => {
    const bx = margin + i * (attBoxW + 4);
    doc.setFillColor(...a.bg); doc.roundedRect(bx, y, attBoxW, 14, 2, 2, 'F');
    doc.setTextColor(...a.fg);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(String(a.val), bx + attBoxW / 2, y + 9, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(a.label, bx + attBoxW / 2, y + 13, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
  y += 20;

  // ── Learning Areas ──────────────────────────────────────────────────────────
  if (detail.competencies?.length > 0) {
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('LEARNING AREAS', margin + 4, y + 5.5);
    y += 10; doc.setTextColor(0, 0, 0);

    // Header row
    const cx = [margin, margin + 72, margin + 108, margin + 134, margin + 154];
    doc.setFillColor(219, 234, 254); doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    ['Learning Area', 'Score %', 'Grade', 'Grade Label', 'Comment'].forEach((h, i) => doc.text(h, cx[i], y + 5));
    y += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    detail.competencies.forEach((c: any, idx: number) => {
      if (y > 230) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageW - 2 * margin, 7, 'F'); }
      const grade = c.overall_cbc_grade || c.pre_primary_grade || '';
      doc.text((c.subject_name || '—').slice(0, 26), cx[0], y + 5);
      doc.text(c.percentage != null ? `${c.percentage}%` : '—', cx[1], y + 5);

      if (grade) {
        const [r, g, b] = GRADE_HEX[grade] || [100, 100, 100];
        doc.setFillColor(r, g, b); doc.setTextColor(255, 255, 255);
        doc.roundedRect(cx[2], y + 0.5, 18, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(grade, cx[2] + 2, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
        doc.text((GRADE_LABEL[grade] || grade).slice(0, 16), cx[3], y + 5);
      } else {
        doc.text('—', cx[2], y + 5);
      }
      doc.text((c.teacher_comment || '—').slice(0, 22), cx[4], y + 5);
      y += 7;
    });
    y += 4;
  }

  // ── Overall Grade ───────────────────────────────────────────────────────────
  if (detail.overall_grade) {
    const og = detail.overall_grade;
    const [r, g, b] = GRADE_HEX[og] || [100, 100, 100];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text('Overall Grade:', margin, y + 5);
    doc.setFillColor(r, g, b); doc.setTextColor(255, 255, 255);
    doc.roundedRect(margin + 32, y, 18, 7, 1.5, 1.5, 'F');
    doc.text(og, margin + 33, y + 5);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
    y += 12;
  }

  // ── Comments ────────────────────────────────────────────────────────────────
  if (y < 220 && (detail.class_teacher_comment || detail.head_teacher_comment)) {
    if (detail.class_teacher_comment) {
      doc.setFillColor(239, 246, 255); doc.roundedRect(margin, y, pageW - 2 * margin, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 64, 175);
      doc.text('Class Teacher:', margin + 4, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      doc.text(String(detail.class_teacher_comment).slice(0, 80), margin + 30, y + 5);
      y += 14;
    }
    if (detail.head_teacher_comment) {
      doc.setFillColor(245, 243, 255); doc.roundedRect(margin, y, pageW - 2 * margin, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(88, 28, 135);
      doc.text('Head Teacher:', margin + 4, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      doc.text(String(detail.head_teacher_comment).slice(0, 80), margin + 30, y + 5);
      y += 14;
    }
  }

  // ── Fee Statement ───────────────────────────────────────────────────────────
  const feeRows: any[] = detail.fee_breakdown || [];
  const totalBalance = feeRows.reduce((s: number, r: any) => s + Number(r.balance_amount || 0), 0);
  const totalPaid    = feeRows.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
  const totalCharged = feeRows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);

  const fmtKes = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  if (feeRows.length > 0 || totalBalance > 0) {
    if (y + 6 + feeRows.length * 6 + 22 > 270) { doc.addPage(); y = 20; }

    // Section header
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('FEE STATEMENT (Outstanding)', margin + 4, y + 5.5);
    y += 10; doc.setTextColor(0, 0, 0);

    if (feeRows.length === 0) {
      // No outstanding fees
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(22, 163, 74);
      doc.text('No outstanding fees — fully paid.', margin + 4, y + 5);
      y += 10;
    } else {
      // Column headers
      const fc = [margin, margin + 70, margin + 110, margin + 142, margin + 168];
      doc.setFillColor(219, 234, 254); doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 58, 138);
      ['Fee Type', 'Charged', 'Paid', 'Balance', 'Due Date'].forEach((h, i) => doc.text(h, fc[i], y + 5));
      y += 8; doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      feeRows.forEach((fee: any, idx: number) => {
        if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y, pageW - 2 * margin, 6.5, 'F'); }
        const bal = Number(fee.balance_amount || 0);
        const isOverdue = fee.statuses?.includes('overdue');

        // Fee name (with transport icon as text prefix)
        const feeLabel = (fee.is_transport_fee ? '[Bus] ' : '') + String(fee.fee_name || 'School Fee').slice(0, 28);
        doc.setTextColor(0, 0, 0);
        doc.text(feeLabel, fc[0], y + 5);
        doc.text(fmtKes(Number(fee.total_amount || 0)), fc[1], y + 5);
        doc.text(fmtKes(Number(fee.paid_amount || 0)), fc[2], y + 5);

        // Balance in red if overdue, orange if pending
        doc.setTextColor(isOverdue ? 185 : bal > 0 ? 180 : 22, isOverdue ? 28 : bal > 0 ? 80 : 163, isOverdue ? 28 : bal > 0 ? 2 : 74);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text(fmtKes(bal), fc[3], y + 5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);

        const dueStr = fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        doc.text(dueStr, fc[4], y + 5);
        y += 6.5;
      });

      // Totals row
      doc.setFillColor(239, 246, 255); doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text('TOTAL', fc[0], y + 5.5);
      doc.text(fmtKes(totalCharged), fc[1], y + 5.5);
      doc.text(fmtKes(totalPaid), fc[2], y + 5.5);
      doc.setTextColor(totalBalance > 0 ? 185 : 22, totalBalance > 0 ? 28 : 163, totalBalance > 0 ? 28 : 74);
      doc.text(fmtKes(totalBalance), fc[3], y + 5.5);
      doc.setTextColor(0, 0, 0);
      y += 12;
    }
  } else {
    // No invoices at all — show a clean paid notice
    doc.setFillColor(240, 253, 244); doc.roundedRect(margin, y, pageW - 2 * margin, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(22, 101, 52);
    doc.text('Fee account is clear — no outstanding invoices.', margin + 4, y + 6.5);
    y += 14;
  }

  // ── Signature Lines ─────────────────────────────────────────────────────────
  if (y < 250) {
    const sigY = Math.max(y + 6, 255);
    const sigW = (pageW - 2 * margin - 8) / 3;
    doc.setDrawColor(180, 180, 180);
    ['Class Teacher', 'Head Teacher', 'Parent / Guardian'].forEach((label, i) => {
      const sx = margin + i * (sigW + 4);
      doc.line(sx, sigY, sx + sigW, sigY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
      doc.text(label, sx + sigW / 2, sigY + 5, { align: 'center' });
    });
    doc.setTextColor(0, 0, 0);
  }
}

// ── Build and save PDF (one or many students) ────────────────────────────────
async function downloadReportCardsPDF(
  cardsToDownload: any[],
  school: any,
  term: string,
  academicYear: string,
  className: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let i = 0; i < cardsToDownload.length; i++) {
    await renderReportCardPage(doc, cardsToDownload[i], school, term, academicYear, i === 0);
  }
  const safeName = className.replace(/[^a-z0-9]/gi, '_');
  const termLabel = term.replace('term', 'T');
  doc.save(`ReportCards_${safeName}_${termLabel}_${academicYear}.pdf`);
}

const GRADE_COLORS: Record<string, string> = {
  EE: 'bg-green-100 text-green-800 border-green-200',
  EE1: 'bg-green-200 text-green-900 border-green-300',
  EE2: 'bg-green-100 text-green-800 border-green-200',
  ME: 'bg-blue-100 text-blue-800 border-blue-200',
  ME1: 'bg-blue-200 text-blue-900 border-blue-300',
  ME2: 'bg-blue-100 text-blue-800 border-blue-200',
  AE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  AE1: 'bg-yellow-200 text-yellow-900 border-yellow-300',
  AE2: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BE: 'bg-red-100 text-red-800 border-red-200',
  BE1: 'bg-red-200 text-red-900 border-red-300',
  BE2: 'bg-red-100 text-red-800 border-red-200',
  WD: 'bg-green-100 text-green-800 border-green-200',
  D: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  B: 'bg-red-100 text-red-800 border-red-200',
};

export function CbcReportCardPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ class_id: '', term: 'term1', academic_year: new Date().getFullYear().toString() });
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.getClasses() });
  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['cbc-report-cards', filters],
    queryFn: () => api.getCbcReportCards(filters),
    enabled: !!filters.class_id,
  });
  const { data: cardDetail } = useQuery({
    queryKey: ['cbc-report-card', selectedCard?.id],
    queryFn: () => api.getCbcReportCard(selectedCard.id),
    enabled: !!selectedCard?.id,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishCbcReportCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateCbcReportCards({
      class_id: filters.class_id,
      term: filters.term,
      academic_year: filters.academic_year,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const shareMutation = useMutation({
    mutationFn: (channels: string[]) => api.shareReportCard(detail?.id, channels),
    onSuccess: (res: any) => setShareResult(res?.data?.results || res?.results || {}),
  });

  const classes = (classesData as any)?.data || [];
  const cards = (cardsData as any)?.data || [];
  const detail = (cardDetail as any)?.data;
  const cardsWithId = cards.filter((c: any) => c.id);
  const selectedClass = classes.find((c: any) => c.id === filters.class_id);

  // ── Download handler ────────────────────────────────────────────────────────
  const handleDownload = async (scope: 'class' | 'selected' | 'published') => {
    setShowDownloadMenu(false);
    setDownloading(true);
    try {
      const school = (await api.getSettings() as any)?.data || {};

      let targetCards: any[] = [];
      if (scope === 'selected' && detail) {
        targetCards = [detail];
      } else {
        // Fetch full details for each card
        const pool = scope === 'published'
          ? cardsWithId.filter((c: any) => c.status === 'published' || c.status === 'acknowledged')
          : cardsWithId;
        if (pool.length === 0) { alert('No report cards to download for this selection.'); return; }
        const results = await Promise.all(pool.map((c: any) => api.getCbcReportCard(c.id)));
        targetCards = results.map((r: any) => r?.data).filter(Boolean);
      }

      if (targetCards.length === 0) { alert('No report cards available.'); return; }
      await downloadReportCardsPDF(
        targetCards,
        school,
        filters.term,
        filters.academic_year,
        selectedClass?.name || 'Class'
      );
    } catch (e: any) {
      alert('Failed to generate PDF: ' + (e?.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const statusBadge = (status: string | null) => {
    if (status === 'published') return <Badge className="bg-green-100 text-green-800">Published</Badge>;
    if (status === 'acknowledged') return <Badge className="bg-purple-100 text-purple-800">Acknowledged</Badge>;
    if (!status) return <Badge variant="outline" className="text-gray-400">No Card</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBC Report Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Holistic Learner Progress Reports — Kenya CBC</p>
        </div>

        {/* Download PDF dropdown */}
        {filters.class_id && cardsWithId.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowDownloadMenu(v => !v)}
              disabled={downloading}
              className="flex items-center gap-2"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Generating PDF…' : 'Download PDF'}
            </Button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-30 w-64 py-1">
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">Download Options</p>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-start gap-3"
                  onClick={() => handleDownload('class')}
                >
                  <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium block">All Students — {selectedClass?.name}</span>
                    <span className="text-xs text-gray-500">{cardsWithId.length} report cards in one PDF</span>
                  </span>
                </button>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-start gap-3"
                  onClick={() => handleDownload('published')}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium block">Published / Acknowledged Only</span>
                    <span className="text-xs text-gray-500">
                      {cardsWithId.filter((c: any) => c.status === 'published' || c.status === 'acknowledged').length} cards
                    </span>
                  </span>
                </button>
                {detail && (
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 flex items-start gap-3 border-t"
                    onClick={() => handleDownload('selected')}
                  >
                    <FileText className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium block">Selected Student Only</span>
                      <span className="text-xs text-gray-500">{detail?.student_name}</span>
                    </span>
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-3 text-xs text-gray-400 hover:bg-gray-50 border-t"
                  onClick={() => setShowDownloadMenu(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Class *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={filters.class_id}
                onChange={e => { setSelectedCard(null); setFilters({ ...filters, class_id: e.target.value }); }}
              >
                <option value="">— Select a class —</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No classes found. Add classes first.</p>
              )}
            </div>
            <div>
              <Label>Term</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={filters.term} onChange={e => setFilters({ ...filters, term: e.target.value })}>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="term3">Term 3</option>
              </select>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={filters.academic_year} onChange={e => setFilters({ ...filters, academic_year: e.target.value })} />
            </div>
          </div>

          {/* Generate button — shown when a class is selected */}
          {filters.class_id && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {generateMutation.isPending ? 'Generating…' : 'Generate Report Cards for All Students'}
              </Button>
              {generateMutation.isSuccess && (
                <span className="text-xs text-green-600">
                  {(generateMutation.data as any)?.data?.created === 0
                    ? 'All students already have report cards.'
                    : `Created ${(generateMutation.data as any)?.data?.created} new report card(s).`}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Learners ({cards.length})
                </CardTitle>
                {cards.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {cards.filter((c: any) => c.id).length} with card
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!filters.class_id ? (
                <div className="p-6 text-center">
                  <FileText className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Select a class above to view students.</p>
                </div>
              ) : isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No students in this class</p>
                  <p className="text-xs text-gray-400 mt-1">Enroll students first, then generate report cards.</p>
                </div>
              ) : (
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {cards.map((card: any) => (
                    <button
                      key={card.student_id}
                      onClick={() => card.id ? setSelectedCard(card) : null}
                      className={`w-full text-left px-4 py-3 transition-colors
                        ${card.id ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default opacity-60'}
                        ${selectedCard?.id === card.id ? 'bg-indigo-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{card.student_name}</p>
                          <p className="text-xs text-gray-500">{card.admission_number}</p>
                        </div>
                        {statusBadge(card.status)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report card detail */}
        <div className="lg:col-span-2">
          {!selectedCard ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a learner to view their report card.</p>
              </CardContent>
            </Card>
          ) : detail ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{detail.student_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {detail.class_name} · {detail.term?.replace('term', 'Term ')} · {detail.academic_year}
                    </p>
                    <p className="text-xs text-gray-400">Admission: {detail.admission_number}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusBadge(detail.status)}
                    {detail.status === 'draft' && (
                      <Button size="sm" onClick={() => publishMutation.mutate(detail.id)} disabled={publishMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                    {detail.status === 'published' || detail.status === 'acknowledged' ? (
                      <Button size="sm" variant="outline" onClick={() => { setShowShare(true); setShareResult(null); }}
                        className="flex items-center gap-1 border-green-300 text-green-700 hover:bg-green-50">
                        <Share2 className="h-4 w-4" />
                        Share with Parent
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attendance */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{detail.days_present || 0}</p>
                    <p className="text-xs text-green-600">Days Present</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{detail.days_absent || 0}</p>
                    <p className="text-xs text-red-600">Days Absent</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{detail.days_late || 0}</p>
                    <p className="text-xs text-yellow-600">Days Late</p>
                  </div>
                </div>

                {/* Learning areas */}
                {detail.competencies?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Learning Areas</h3>
                    <div className="space-y-2">
                      {detail.competencies.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium">{c.subject_name}</span>
                          <div className="flex items-center gap-2">
                            {c.percentage && <span className="text-xs text-gray-500">{c.percentage}%</span>}
                            {(c.overall_cbc_grade || c.pre_primary_grade) && (
                              <Badge className={GRADE_COLORS[c.overall_cbc_grade || c.pre_primary_grade] || 'bg-gray-100'}>
                                {c.overall_cbc_grade || c.pre_primary_grade}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher comment */}
                {detail.class_teacher_comment && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Class Teacher's Comment</p>
                    <p className="text-sm text-blue-900">{detail.class_teacher_comment}</p>
                  </div>
                )}

                {/* Head teacher comment */}
                {detail.head_teacher_comment && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Head Teacher's Comment</p>
                    <p className="text-sm text-purple-900">{detail.head_teacher_comment}</p>
                  </div>
                )}

                {/* Parent acknowledgment */}
                {detail.status === 'acknowledged' && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Parent Acknowledged</p>
                    {detail.parent_comment && <p className="text-sm text-green-900">{detail.parent_comment}</p>}
                    <p className="text-xs text-green-600 mt-1">
                      {detail.parent_acknowledged_at ? new Date(detail.parent_acknowledged_at).toLocaleString() : ''}
                    </p>
                  </div>
                )}

                {/* Overall grade */}
                {detail.overall_grade && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <span className="text-sm font-semibold text-gray-600">Overall Grade:</span>
                    <Badge className={GRADE_COLORS[detail.overall_grade] || 'bg-gray-100 text-gray-800'}>
                      {detail.overall_grade}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading report card...</CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Share Dialog ─────────────────────────────────────────────────── */}
      {showShare && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Share Report Card</h2>
              </div>
              <button onClick={() => { setShowShare(false); setShareResult(null); }}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Student info */}
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="font-semibold text-indigo-900">{detail.student_name}</p>
                <p className="text-sm text-indigo-600">{detail.class_name} · {detail.term?.replace('term', 'Term ')} {detail.academic_year}</p>
              </div>

              {/* Parent contact info (read-only) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registered Parent / Guardian Contact</p>
                {detail.guardian_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{detail.guardian_name}
                      {detail.guardian_relationship ? ` (${detail.guardian_relationship})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {detail.guardian_phone ? (
                    <span className="text-gray-700 font-mono">{detail.guardian_phone}</span>
                  ) : (
                    <span className="text-red-500 italic">No phone number registered</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AtSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {detail.guardian_email ? (
                    <span className="text-gray-700">{detail.guardian_email}</span>
                  ) : (
                    <span className="text-red-500 italic">No email address registered</span>
                  )}
                </div>
                {!detail.guardian_phone && !detail.guardian_email && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">No parent contact details found. Ask the school office to link a parent/guardian to this student.</p>
                  </div>
                )}
              </div>

              {/* Share results */}
              {shareResult && (
                <div className="space-y-2">
                  {shareResult.email !== undefined && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${shareResult.email?.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      {shareResult.email?.success
                        ? 'Email sent successfully to parent.'
                        : `Email failed: ${shareResult.email?.error}`}
                    </div>
                  )}
                  {shareResult.whatsapp !== undefined && shareResult.whatsapp?.success && (
                    <a
                      href={shareResult.whatsapp.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      Open WhatsApp to send message →
                    </a>
                  )}
                  {shareResult.whatsapp !== undefined && !shareResult.whatsapp?.success && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700">
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      WhatsApp: {shareResult.whatsapp?.error}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                {/* Email */}
                <button
                  onClick={() => shareMutation.mutate(['email'])}
                  disabled={shareMutation.isPending || !detail.guardian_email}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {shareMutation.isPending ? 'Sending…' : `Send Email to ${detail.guardian_email || 'parent'}`}
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => shareMutation.mutate(['whatsapp'])}
                  disabled={shareMutation.isPending || !detail.guardian_phone}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {shareMutation.isPending ? 'Preparing…' : `Send via WhatsApp to ${detail.guardian_phone || 'parent'}`}
                </button>

                {/* Both */}
                {detail.guardian_email && detail.guardian_phone && (
                  <button
                    onClick={() => shareMutation.mutate(['email', 'whatsapp'])}
                    disabled={shareMutation.isPending}
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 font-medium text-sm
                      border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Send via Both (Email + WhatsApp)
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Messages are sent only to the registered contact details shown above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
