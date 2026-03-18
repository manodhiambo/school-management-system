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

// ── Grade helpers ─────────────────────────────────────────────────────────────
const GRADE_HEX: Record<string, [number, number, number]> = {
  EE: [22, 163, 74],   EE1: [15, 118, 54],  EE2: [22, 163, 74],
  ME: [37, 99, 235],   ME1: [29, 78, 216],  ME2: [37, 99, 235],
  AE: [202, 138, 4],   AE1: [180, 120, 2],  AE2: [202, 138, 4],
  BE: [220, 38, 38],   BE1: [185, 28, 28],  BE2: [220, 38, 38],
  WD: [22, 163, 74],   D:   [202, 138, 4],  B:   [220, 38, 38],
};
const GRADE_LABEL_FULL: Record<string, string> = {
  EE: 'Exceeding Expectations',  EE1: 'Exceeding Expectations', EE2: 'Exceeding Expectations',
  ME: 'Meeting Expectations',    ME1: 'Meeting Expectations',   ME2: 'Meeting Expectations',
  AE: 'Approaching Expectations',AE1: 'Approaching Expectations',AE2: 'Approaching Expectations',
  BE: 'Below Expectations',      BE1: 'Below Expectations',     BE2: 'Below Expectations',
  WD: 'Well Developed', D: 'Developing', B: 'Beginning',
};
const GRADE_POINTS: Record<string, number> = {
  EE: 4, EE1: 4, EE2: 4, ME: 3, ME1: 3, ME2: 3,
  AE: 2, AE1: 2, AE2: 2, BE: 1, BE1: 1, BE2: 1,
  WD: 4, D: 2, B: 1,
};

// Draw a bordered cell
function cell(doc: jsPDF, x: number, y: number, w: number, h: number, fill?: [number,number,number]) {
  if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F'); }
  doc.setDrawColor(180, 180, 180);
  doc.rect(x, y, w, h, 'D');
}

// ── Generate a single report card page (Kenya CBC format) ────────────────────
async function renderReportCardPage(
  doc: jsPDF,
  detail: any,
  school: any,
  term: string,
  academicYear: string,
  isFirstPage: boolean
) {
  const W = 210; // A4 width mm
  const M = 10;  // margin
  const CW = W - 2 * M; // content width = 190mm
  let y = 0;

  if (!isFirstPage) doc.addPage();
  doc.setTextColor(0, 0, 0);

  // ── 1. SCHOOL HEADER ───────────────────────────────────────────────────────
  // Logo
  if (school?.school_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => { try { doc.addImage(img, 'PNG', M, 4, 24, 24); } catch { /* skip */ } resolve(); };
        img.onerror = () => resolve();
        img.src = school.school_logo_url;
      });
    } catch { /* skip */ }
  }

  // School name
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text((school?.school_name || 'SCHOOL NAME').toUpperCase(), W / 2, 10, { align: 'center' });

  // Address / Tel / Email
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const addrParts = [school?.address, school?.city, school?.state].filter(Boolean).join(', ');
  if (addrParts) doc.text(`Address: ${addrParts}`, W / 2, 16, { align: 'center' });
  if (school?.phone) doc.text(`Tel: ${school.phone}`, W / 2, 21, { align: 'center' });
  if (school?.email) doc.text(`Email: ${school.email}`, W / 2, 26, { align: 'center' });

  // Blue title banner
  const termRoman = term === 'term1' ? 'I' : term === 'term2' ? 'II' : 'III';
  const termLabel = `END TERM ${termRoman}`;
  doc.setFillColor(21, 101, 192);
  doc.rect(M, 29, CW, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(
    `ACADEMIC REPORT FORM – ${(detail.class_name || '').toUpperCase()} – ${termLabel} – (${academicYear} TERM ${termRoman})`,
    W / 2, 35.5, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  y = 42;

  // ── 2. STUDENT INFO + PERFORMANCE SNAPSHOT ────────────────────────────────
  // Photo placeholder
  doc.setFillColor(220, 220, 220); doc.setDrawColor(160, 160, 160);
  doc.rect(M, y, 28, 36, 'FD');
  doc.setTextColor(140, 140, 140); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('PHOTO', M + 14, y + 19, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Student details (right of photo)
  const sd = M + 32;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text((detail.student_name || '').toUpperCase(), sd, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`ADMNO:${detail.admission_number || ''}`, sd, y + 15);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.setTextColor(22, 163, 74);
  doc.text(`GRADE:${detail.class_name || ''}`, sd, y + 22);
  doc.setTextColor(0, 0, 0);

  // Performance snapshot (right side, small box)
  const comps: any[] = detail.competencies || [];
  const totalPts = comps.reduce((s: number, c: any) => s + (GRADE_POINTS[c.overall_cbc_grade || c.pre_primary_grade || ''] || 0), 0);
  const maxPts = comps.length * 4;
  const meanPts = comps.length ? totalPts / comps.length : 0;
  const perfLevel = meanPts >= 3.5 ? 'Exceeding Expectations' : meanPts >= 2.5 ? 'Meeting Expectations' : meanPts >= 1.5 ? 'Approaching Expectations' : 'Below Expectations';

  const snapX = M + CW - 62;
  doc.setFillColor(248, 248, 248); doc.setDrawColor(200, 200, 200);
  doc.rect(snapX, y, 62, 36, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 80);
  doc.text('Learning Area Performance', snapX + 31, y + 5, { align: 'center' });
  // Mini bar chart for each subject
  const barMaxW = 40;
  const barH = 3;
  const barStartX = snapX + 4;
  const barY0 = y + 9;
  comps.slice(0, 8).forEach((c: any, i: number) => {
    const pct = Number(c.percentage) || 0;
    const barW = (pct / 100) * barMaxW;
    const grade = c.overall_cbc_grade || c.pre_primary_grade || '';
    const [r, g, b] = GRADE_HEX[grade] || [150, 150, 150];
    doc.setFillColor(r, g, b);
    doc.rect(barStartX, barY0 + i * 3.5, barW, barH, 'F');
    doc.setFontSize(5); doc.setTextColor(80, 80, 80);
    doc.text(`${Math.round(pct)}%`, barStartX + barMaxW + 1, barY0 + i * 3.5 + 2.5);
  });
  doc.setTextColor(0, 0, 0);
  y += 39;

  // ── 3. STATS BAR ─────────────────────────────────────────────────────────
  const statW = CW / 4;
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, CW, 18, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(M, y, CW, 18, 'D');

  const totalMarksSum = comps.reduce((s: number, c: any) => s + (Number(c.score) || 0), 0);
  const totalMaxSum = comps.reduce((s: number, c: any) => s + (Number(c.max_score) || 0), 0);
  const statsData = [
    { label: 'Performance Level', val: perfLevel, small: true },
    { label: 'Total Marks', val: totalMaxSum > 0 ? `${totalMarksSum}/${totalMaxSum}` : `${comps.reduce((s: number, c: any) => s + (Number(c.percentage) || 0), 0).toFixed(0)}%`, small: false },
    { label: 'Total Points', val: `${totalPts}/${maxPts}`, small: false },
    { label: 'Mean Points', val: meanPts.toFixed(2), small: false },
  ];
  statsData.forEach((s, i) => {
    const sx = M + i * statW;
    if (i > 0) { doc.setDrawColor(200, 200, 200); doc.line(sx, y, sx, y + 18); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text(s.label, sx + statW / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(s.small ? 7.5 : 10); doc.setTextColor(0, 0, 0);
    // Color performance level
    if (i === 0) {
      const [pr, pg, pb] = meanPts >= 3.5 ? [22, 163, 74] : meanPts >= 2.5 ? [37, 99, 235] : meanPts >= 1.5 ? [202, 138, 4] : [220, 38, 38];
      doc.setTextColor(pr, pg, pb);
    }
    doc.text(s.val, sx + statW / 2, y + 13, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });
  y += 20;

  // ── 4. LEARNING AREAS TABLE ────────────────────────────────────────────────
  // Section header
  doc.setFillColor(21, 101, 192);
  doc.rect(M, y, CW, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('LEARNING AREAS PERFORMANCE', W / 2, y + 5.5, { align: 'center' });
  y += 9; doc.setTextColor(0, 0, 0);

  // Column config: LEARNING AREAS | MARKS | DEV. | GRADE | PERFORMANCE LEVEL | TEACHER
  const COL = {
    subject: { x: M,        w: 58 },
    marks:   { x: M + 58,   w: 16 },
    dev:     { x: M + 74,   w: 14 },
    grade:   { x: M + 88,   w: 16 },
    perf:    { x: M + 104,  w: 46 },
    teacher: { x: M + 150,  w: CW - 150 },
  };

  // Column header row
  doc.setFillColor(189, 214, 238);
  doc.rect(M, y, CW, 8, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.rect(M, y, CW, 8, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
  [
    { k: 'subject', t: 'LEARNING AREAS' },
    { k: 'marks',   t: 'MARKS' },
    { k: 'dev',     t: 'DEV.' },
    { k: 'grade',   t: 'GRADE' },
    { k: 'perf',    t: 'PERFORMANCE LEVEL' },
    { k: 'teacher', t: 'TEACHER' },
  ].forEach(({ k, t }) => {
    const c = COL[k as keyof typeof COL];
    doc.text(t, c.x + 2, y + 5.5);
    // vertical divider
    doc.setDrawColor(160, 160, 160);
    doc.line(c.x, y, c.x, y + 8);
  });
  y += 8;

  // Data rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const rowH = 8;
  comps.forEach((c: any, idx: number) => {
    if (y + rowH > 250) { doc.addPage(); y = 10; }
    const bg: [number,number,number] = idx % 2 === 1 ? [245, 245, 245] : [255, 255, 255];
    doc.setFillColor(...bg); doc.rect(M, y, CW, rowH, 'F');
    doc.setDrawColor(200, 200, 200); doc.rect(M, y, CW, rowH, 'D');

    const grade = c.overall_cbc_grade || c.pre_primary_grade || '';
    const pct = c.percentage != null ? `${Math.round(Number(c.percentage))}%` : '—';

    // vertical dividers
    Object.values(COL).forEach(col => {
      doc.setDrawColor(200, 200, 200);
      doc.line(col.x, y, col.x, y + rowH);
    });

    doc.setTextColor(0, 0, 0);
    doc.text((c.subject_name || '').slice(0, 28), COL.subject.x + 2, y + 5.5);
    doc.text(pct, COL.marks.x + 2, y + 5.5);
    doc.text('—', COL.dev.x + 2, y + 5.5); // DEV not yet computed

    // Grade badge
    if (grade) {
      const [r, g, b] = GRADE_HEX[grade] || [100, 100, 100];
      doc.setFillColor(r, g, b);
      doc.roundedRect(COL.grade.x + 1, y + 1, 14, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text(grade, COL.grade.x + 8, y + 5.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
    } else {
      doc.text('—', COL.grade.x + 2, y + 5.5);
    }

    doc.text((GRADE_LABEL_FULL[grade] || '—').slice(0, 22), COL.perf.x + 2, y + 5.5);
    doc.text((c.teacher_name || '').slice(0, 20), COL.teacher.x + 2, y + 5.5);
    y += rowH;
  });
  y += 4;

  // ── 5. REMARKS (2 columns) ────────────────────────────────────────────────
  if (y + 42 > 265) { doc.addPage(); y = 10; }
  const remW = (CW - 4) / 2;
  const remH = 38;
  const remY = y;

  // Class Teacher box
  doc.setDrawColor(160, 160, 160); doc.setFillColor(255, 255, 255);
  doc.rect(M, remY, remW, remH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text(`Class Teacher Remarks: ${detail.class_teacher_name || ''}`, M + 3, remY + 6);
  if (detail.class_teacher_comment) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(String(detail.class_teacher_comment), remW - 6);
    doc.text(lines.slice(0, 4), M + 3, remY + 12);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Signature:', M + 3, remY + remH - 5);
  doc.setDrawColor(0, 0, 0);
  doc.line(M + 26, remY + remH - 5, M + remW - 3, remY + remH - 5);

  // Principal box
  const prX = M + remW + 4;
  doc.setDrawColor(160, 160, 160); doc.setFillColor(255, 255, 255);
  doc.rect(prX, remY, remW, remH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(`Principal Remarks: ${school?.school_name ? '' : ''}`, prX + 3, remY + 6);
  if (detail.head_teacher_comment) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    const lines2 = doc.splitTextToSize(String(detail.head_teacher_comment), remW - 6);
    doc.text(lines2.slice(0, 4), prX + 3, remY + 12);
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Signature:', prX + 3, remY + remH - 5);
  doc.setDrawColor(0, 0, 0);
  doc.line(prX + 26, remY + remH - 5, prX + remW - 3, remY + remH - 5);

  y += remH + 5;

  // ── 6. GRADE DESCRIPTORS TABLE ────────────────────────────────────────────
  if (y + 30 > 268) { doc.addPage(); y = 10; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text('GRADE DESCRIPTORS', M, y + 5);
  y += 7;

  const dCols = [M, M + 38, M + 38 + 38, M + 38 + 38 + 38, M + 38 + 38 + 38 + 38];
  const dWidths = [38, 38, 38, 38, CW - 38 * 4];
  const dH = 7;

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  ['Performance Level', 'Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations'].forEach((h, i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text(h.slice(0, 20), dCols[i] + 2, y + 4.5);
    doc.setDrawColor(160, 160, 160); doc.line(dCols[i], y, dCols[i], y + dH);
  });
  y += dH;

  // Points row
  doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Points', dCols[0] + 2, y + 5);
  ['4', '3', '2', '1'].forEach((v, i) => {
    doc.line(dCols[i + 1], y, dCols[i + 1], y + dH);
    doc.text(v, dCols[i + 1] + dWidths[i + 1] / 2, y + 5, { align: 'center' });
  });
  y += dH;

  // Range row
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Range (%)', dCols[0] + 2, y + 5);
  ['75-100', '50-74', '25-49', '0-24'].forEach((v, i) => {
    doc.line(dCols[i + 1], y, dCols[i + 1], y + dH);
    doc.text(v, dCols[i + 1] + dWidths[i + 1] / 2, y + 5, { align: 'center' });
  });
  y += dH + 5;

  // ── 7. FEES + TERM DATES ──────────────────────────────────────────────────
  const feeRows: any[] = detail.fee_breakdown || [];
  const totalFees = feeRows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const totalPaid = feeRows.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
  const totalBalance = feeRows.reduce((s: number, r: any) => s + Number(r.balance_amount || 0), 0);

  const feeW = CW * 0.56;
  const dateW = CW - feeW - 4;
  const feeX = M;
  const dateX = M + feeW + 4;

  const feeSectionHeight = Math.max(28, 7 + feeRows.length * 6 + 14);
  if (y + feeSectionHeight > 272) { doc.addPage(); y = 10; }
  const feeSectionStartY = y;

  // FEES header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text('FEES', feeX, y + 5);
  doc.text('TERM DATES', dateX, y + 5);
  y += 7;

  // Fee list header row
  cell(doc, feeX, y, feeW * 0.55, 6, [235, 235, 235]);
  cell(doc, feeX + feeW * 0.55, y, feeW * 0.22, 6, [235, 235, 235]);
  cell(doc, feeX + feeW * 0.77, y, feeW * 0.23, 6, [235, 235, 235]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(0, 0, 0);
  doc.text('FEE ITEM', feeX + 2, y + 4);
  doc.text('CHARGED', feeX + feeW * 0.55 + 2, y + 4);
  doc.text('BALANCE', feeX + feeW * 0.77 + 2, y + 4);
  y += 6;

  // Individual fee rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  feeRows.forEach((r: any, i: number) => {
    const bg: [number, number, number] = i % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    cell(doc, feeX, y, feeW * 0.55, 6, bg);
    cell(doc, feeX + feeW * 0.55, y, feeW * 0.22, 6, bg);
    cell(doc, feeX + feeW * 0.77, y, feeW * 0.23, 6, bg);
    doc.setTextColor(0, 0, 0);
    const label = r.is_transport_fee
      ? `Transport${r.route_name ? ` (${r.route_name})` : ''}`
      : r.fee_name;
    doc.text((label || 'Fee').slice(0, 26), feeX + 2, y + 4.5);
    doc.text(Number(r.total_amount || 0).toLocaleString('en-KE'), feeX + feeW * 0.55 + 2, y + 4.5);
    const bal = Number(r.balance_amount || 0);
    if (bal > 0) doc.setTextColor(200, 40, 40);
    doc.text(bal.toLocaleString('en-KE'), feeX + feeW * 0.77 + 2, y + 4.5);
    doc.setTextColor(0, 0, 0);
    y += 6;
  });

  if (feeRows.length === 0) {
    cell(doc, feeX, y, feeW, 6, [250, 250, 250]);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
    doc.text('No fee invoices found', feeX + 2, y + 4.5);
    y += 6;
  }

  // Total row
  cell(doc, feeX, y, feeW * 0.55, 7, [220, 235, 255]);
  cell(doc, feeX + feeW * 0.55, y, feeW * 0.22, 7, [220, 235, 255]);
  cell(doc, feeX + feeW * 0.77, y, feeW * 0.23, 7, [220, 235, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', feeX + 2, y + 5);
  doc.text(totalFees.toLocaleString('en-KE'), feeX + feeW * 0.55 + 2, y + 5);
  if (totalBalance > 0) doc.setTextColor(200, 40, 40);
  doc.text(totalBalance.toLocaleString('en-KE'), feeX + feeW * 0.77 + 2, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 7;

  // Paid row
  cell(doc, feeX, y, feeW, 6, [240, 255, 245]);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  doc.text(`Paid: KES ${totalPaid.toLocaleString('en-KE')}`, feeX + 2, y + 4.5);
  y += 6;

  // M-Pesa note
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(60, 60, 60);
  doc.text('Dial *657*66# on Safaricom to pay school fees from your M-Pesa', feeX, y + 4);
  y += 5;

  // Term dates table (positioned to the right, aligned with fee list header)
  const termY = feeSectionStartY + 7;
  const dColW = dateW / 2;
  ['TERM ENDS', 'NEXT TERM BEGINS'].forEach((h, i) => {
    cell(doc, dateX + i * dColW, termY, dColW, 7, [235, 235, 235]);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
    doc.text(h, dateX + i * dColW + dColW / 2, termY + 4.5, { align: 'center' });
  });
  const termEndStr = detail.term_end_date || '—';
  const nextTermStr = detail.next_term_start_date || '—';
  [termEndStr, nextTermStr].forEach((v, i) => {
    cell(doc, dateX + i * dColW, termY + 7, dColW, 8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(0, 0, 0);
    doc.text(v, dateX + i * dColW + dColW / 2, termY + 13, { align: 'center' });
  });

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const footerY = 287;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 120);
  doc.text(`Verification Code: ${detail.admission_number || ''}${detail.term || ''}`, M, footerY);
  doc.text('Generated by SkulManager', W / 2, footerY, { align: 'center' });
  if (school?.motto) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(21, 101, 192);
    doc.text(`School Motto: ${school.motto}`, W - M, footerY, { align: 'right' });
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
