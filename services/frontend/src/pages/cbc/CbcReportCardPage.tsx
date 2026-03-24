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
  const logoSize = 26;
  const photoSize = 26;
  const headerH = 32;

  // School logo — LEFT corner
  if (school?.school_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => { try { doc.addImage(img, 'PNG', M, 3, logoSize, logoSize); } catch { /* skip */ } resolve(); };
        img.onerror = () => resolve();
        img.src = school.school_logo_url;
      });
    } catch { /* skip */ }
  } else {
    // Logo placeholder box
    doc.setFillColor(230, 230, 230); doc.setDrawColor(180, 180, 180);
    doc.rect(M, 3, logoSize, logoSize, 'FD');
    doc.setFontSize(5); doc.setTextColor(160, 160, 160);
    doc.text('LOGO', M + logoSize / 2, 3 + logoSize / 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // School info — centered between logo and student photo
  const hTextX = M + logoSize + 2;
  const hTextW = W - M - logoSize - 2 - photoSize - 2 - M;
  const hCenterX = hTextX + hTextW / 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text((school?.school_name || 'SCHOOL NAME').toUpperCase(), hCenterX, 10, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const addrParts = [school?.address, school?.city, school?.state].filter(Boolean).join(', ');
  let hy = 16;
  if (addrParts) { doc.text(addrParts, hCenterX, hy, { align: 'center' }); hy += 5; }
  if (school?.phone) { doc.text(`Tel: ${school.phone}`, hCenterX, hy, { align: 'center' }); hy += 5; }
  if (school?.email) { doc.text(school.email, hCenterX, hy, { align: 'center' }); hy += 5; }
  if (school?.motto) {
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(7);
    doc.text(school.motto, hCenterX, hy, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }

  // Student photo — RIGHT corner
  const photoX = W - M - photoSize;
  const studentPhotoUrl = detail.profile_photo_url || null;
  if (studentPhotoUrl) {
    try {
      const sImg = new Image();
      sImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        sImg.onload = () => {
          try {
            const fmt = studentPhotoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(sImg, fmt, photoX, 3, photoSize, photoSize);
          } catch { /* skip */ }
          resolve();
        };
        sImg.onerror = () => resolve();
        sImg.src = studentPhotoUrl;
      });
    } catch { /* skip */ }
  } else {
    doc.setFillColor(220, 220, 220); doc.setDrawColor(160, 160, 160);
    doc.rect(photoX, 3, photoSize, photoSize, 'FD');
    doc.setFontSize(5.5); doc.setTextColor(130, 130, 130);
    doc.text('PHOTO', photoX + photoSize / 2, 3 + photoSize / 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // "LEARNER ASSESSMENT REPORT CARD" title banner
  const termRoman = term === 'term1' ? 'I' : term === 'term2' ? 'II' : 'III';
  const termLabel = `END TERM ${termRoman}`;
  doc.setFillColor(21, 101, 192);
  doc.rect(M, headerH + 2, CW, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('LEARNER ASSESSMENT REPORT CARD', W / 2, headerH + 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Thin blue sub-banner with term/class info
  doc.setFillColor(189, 214, 238);
  doc.rect(M, headerH + 10, CW, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(21, 101, 192);
  doc.text(
    `${(detail.class_name || '').toUpperCase()} – ${termLabel} – ${academicYear}`,
    W / 2, headerH + 14.5, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  y = headerH + 18;

  // ── 2. STUDENT INFO ROW ───────────────────────────────────────────────────
  // Full-width student details (no photo here — photo is in header)
  const comps: any[] = detail.competencies || [];
  const totalPts = comps.reduce((s: number, c: any) => s + (GRADE_POINTS[c.overall_cbc_grade || c.pre_primary_grade || ''] || 0), 0);
  const maxPts = comps.length * 4;
  const meanPts = comps.length ? totalPts / comps.length : 0;
  const perfLevel = meanPts >= 3.5 ? 'Exceeding Expectations' : meanPts >= 2.5 ? 'Meeting Expectations' : meanPts >= 1.5 ? 'Approaching Expectations' : 'Below Expectations';

  // Name / Adm / Grade / Stream / Term / Year info grid
  const infoRowH = 6;
  const infoCol = [M, M + 20, M + 80, M + 110, M + 140, M + 160];
  const infoW   = [20, 60,     30,     30,      20,      CW - 150];
  const row1Labels = ['NAME', detail.student_name || '', 'GRADE', detail.class_name || '', 'ADMNO', detail.admission_number || ''];
  const row2Labels = ['STREAM', detail.class_name || '', 'TERM', termLabel, 'YEAR', academicYear];

  [row1Labels, row2Labels].forEach((rowData, ri) => {
    const ry = y + ri * infoRowH;
    doc.setFillColor(ri === 0 ? 240 : 248, ri === 0 ? 240 : 248, ri === 0 ? 240 : 248);
    doc.rect(M, ry, CW, infoRowH, 'F');
    doc.setDrawColor(200, 200, 200); doc.rect(M, ry, CW, infoRowH, 'D');
    rowData.forEach((txt, ci) => {
      if (ci > 0 && infoCol[ci]) {
        doc.setDrawColor(200, 200, 200);
        doc.line(infoCol[ci], ry, infoCol[ci], ry + infoRowH);
      }
      const isBold = ci % 2 === 0;
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(isBold ? 6.5 : 8);
      doc.setTextColor(isBold ? 80 : 0, isBold ? 80 : 0, isBold ? 80 : 0);
      const cx = infoCol[ci] + (infoW[ci] || 30) / 2;
      doc.text(String(txt).slice(0, 20), cx, ry + 4.2, { align: 'center' });
    });
  });
  doc.setTextColor(0, 0, 0);
  y += 2 * infoRowH + 2;

  // ── 3. STATS BAR ─────────────────────────────────────────────────────────
  const statW = CW / 4;
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, CW, 15, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(M, y, CW, 15, 'D');

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
    if (i > 0) { doc.setDrawColor(200, 200, 200); doc.line(sx, y, sx, y + 15); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text(s.label, sx + statW / 2, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(s.small ? 7.5 : 10); doc.setTextColor(0, 0, 0);
    // Color performance level
    if (i === 0) {
      const [pr, pg, pb] = meanPts >= 3.5 ? [22, 163, 74] : meanPts >= 2.5 ? [37, 99, 235] : meanPts >= 1.5 ? [202, 138, 4] : [220, 38, 38];
      doc.setTextColor(pr, pg, pb);
    }
    doc.text(s.val, sx + statW / 2, y + 11, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });
  y += 17;

  // ── 4. LEARNING AREAS TABLE ────────────────────────────────────────────────
  // Section header
  doc.setFillColor(21, 101, 192);
  doc.rect(M, y, CW, 7, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('LEARNING AREAS PERFORMANCE', W / 2, y + 4.5, { align: 'center' });
  y += 8; doc.setTextColor(0, 0, 0);

  // Column config: LEARNING AREA | TYPE/PERIOD | SCORE | GRADE | POINTS | FACILITATOR
  const COL = {
    subject:     { x: M,        w: 55 },
    period:      { x: M + 55,   w: 28 },
    score:       { x: M + 83,   w: 22 },
    grade:       { x: M + 105,  w: 16 },
    points:      { x: M + 121,  w: 16 },
    facilitator: { x: M + 137,  w: CW - 137 },
  };

  const termPeriod = term === 'term1' ? 'END TERM 1' : term === 'term2' ? 'END TERM 2' : 'END TERM 3';

  // Column header row
  doc.setFillColor(189, 214, 238);
  doc.rect(M, y, CW, 7, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.rect(M, y, CW, 7, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
  [
    { k: 'subject',     t: 'LEARNING AREA' },
    { k: 'period',      t: 'TYPE/PERIOD' },
    { k: 'score',       t: 'SCORE' },
    { k: 'grade',       t: 'GRADE' },
    { k: 'points',      t: 'PTS' },
    { k: 'facilitator', t: 'FACILITATOR' },
  ].forEach(({ k, t }) => {
    const c = COL[k as keyof typeof COL];
    doc.text(t, c.x + 2, y + 4.5);
    doc.setDrawColor(160, 160, 160);
    doc.line(c.x, y, c.x, y + 7);
  });
  y += 7;

  // Data rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const rowH = 7;
  comps.forEach((c: any, idx: number) => {
    if (y + rowH > 264) { doc.addPage(); y = 10; }
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

    const scoreStr = c.total_score != null && c.max_score != null
      ? `${Number(c.total_score).toFixed(0)}/${Number(c.max_score).toFixed(0)}`
      : pct;
    const pts = c.grade_points != null ? String(c.grade_points) : (
      grade === 'EE' || grade === 'WD' ? '4' :
      grade === 'ME' ? '3' :
      grade === 'AE' || grade === 'D' ? '2' :
      grade === 'BE' || grade === 'B' ? '1' : '—'
    );

    doc.setTextColor(0, 0, 0);
    doc.text((c.subject_name || '').slice(0, 26), COL.subject.x + 2, y + 4.5);
    doc.setFontSize(6.5);
    doc.text(termPeriod, COL.period.x + 2, y + 4.5);
    doc.setFontSize(8);
    doc.text(scoreStr, COL.score.x + 2, y + 4.5);

    // Grade badge
    if (grade) {
      const [r, g, b] = GRADE_HEX[grade] || [100, 100, 100];
      doc.setFillColor(r, g, b);
      doc.roundedRect(COL.grade.x + 1, y + 0.5, 14, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text(grade, COL.grade.x + 8, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
    } else {
      doc.text('—', COL.grade.x + 2, y + 4.5);
    }

    doc.text(pts, COL.points.x + 2, y + 4.5);
    doc.setFontSize(7.5);
    doc.text((c.teacher_name || '—').slice(0, 28), COL.facilitator.x + 2, y + 4.5);
    doc.setFontSize(8);
    y += rowH;
  });
  y += 3;

  // ── 5. REMARKS (2 columns) ────────────────────────────────────────────────
  if (y + 36 > 272) { doc.addPage(); y = 10; }
  const remW = (CW - 4) / 2;
  const remH = 30;
  const remY = y;

  // Class Facilitator box
  doc.setDrawColor(160, 160, 160); doc.setFillColor(255, 255, 255);
  doc.rect(M, remY, remW, remH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
  doc.text('CLASS FACILITATOR', M + 3, remY + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(21, 101, 192);
  doc.text(detail.class_teacher_name || '—', M + 3, remY + 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
  doc.text('Signature:', M + 3, remY + remH - 4);
  doc.setDrawColor(0, 0, 0);
  doc.line(M + 26, remY + remH - 4, M + remW - 3, remY + remH - 4);

  // Head Teacher / Principal box
  const prX = M + remW + 4;
  doc.setDrawColor(160, 160, 160); doc.setFillColor(255, 255, 255);
  doc.rect(prX, remY, remW, remH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
  doc.text('HEAD TEACHER / PRINCIPAL', prX + 3, remY + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(21, 101, 192);
  doc.text(detail.head_teacher_name || '—', prX + 3, remY + 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
  doc.text('Signature:', prX + 3, remY + remH - 4);
  doc.setDrawColor(0, 0, 0);
  doc.line(prX + 26, remY + remH - 4, prX + remW - 3, remY + remH - 4);

  y += remH + 4;

  // ── 6. GRADE DESCRIPTORS TABLE ────────────────────────────────────────────
  if (y + 25 > 280) { doc.addPage(); y = 10; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text('GRADE DESCRIPTORS', M, y + 4);
  y += 5;

  const dCols = [M, M + 38, M + 38 + 38, M + 38 + 38 + 38, M + 38 + 38 + 38 + 38];
  const dWidths = [38, 38, 38, 38, CW - 38 * 4];
  const dH = 6;

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  ['Performance Level', 'Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations'].forEach((h, i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text(h.slice(0, 20), dCols[i] + 2, y + 4);
    doc.setDrawColor(160, 160, 160); doc.line(dCols[i], y, dCols[i], y + dH);
  });
  y += dH;

  // Points row
  doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('Points', dCols[0] + 2, y + 4);
  ['4', '3', '2', '1'].forEach((v, i) => {
    doc.line(dCols[i + 1], y, dCols[i + 1], y + dH);
    doc.text(v, dCols[i + 1] + dWidths[i + 1] / 2, y + 4, { align: 'center' });
  });
  y += dH;

  // Range row
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, dH, 'F');
  doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, dH, 'D');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Range (%)', dCols[0] + 2, y + 4);
  ['75-100', '50-74', '25-49', '0-24'].forEach((v, i) => {
    doc.line(dCols[i + 1], y, dCols[i + 1], y + dH);
    doc.text(v, dCols[i + 1] + dWidths[i + 1] / 2, y + 4, { align: 'center' });
  });
  y += dH + 3;

  // ── 7. FEES + TERM DATES ──────────────────────────────────────────────────
  const feeRows: any[] = detail.fee_breakdown || [];
  const totalFees = feeRows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const totalPaid = feeRows.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
  const totalBalance = feeRows.reduce((s: number, r: any) => s + Number(r.balance_amount || 0), 0);

  const feeW = CW * 0.56;
  const dateW = CW - feeW - 4;
  const feeX = M;
  const dateX = M + feeW + 4;

  const feeSectionHeight = Math.max(27, 7 + feeRows.length * 5 + 16);
  if (y + feeSectionHeight > 284) { doc.addPage(); y = 10; }
  const feeSectionStartY = y;

  // FEES header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text('FEES', feeX, y + 5);
  doc.text('TERM DATES', dateX, y + 5);
  y += 7;

  // Fee list header row — FEE ITEM | CHARGED | PAID | BALANCE
  cell(doc, feeX, y, feeW * 0.46, 6, [235, 235, 235]);
  cell(doc, feeX + feeW * 0.46, y, feeW * 0.18, 6, [235, 235, 235]);
  cell(doc, feeX + feeW * 0.64, y, feeW * 0.18, 6, [235, 235, 235]);
  cell(doc, feeX + feeW * 0.82, y, feeW * 0.18, 6, [235, 235, 235]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(0, 0, 0);
  doc.text('FEE ITEM', feeX + 2, y + 4);
  doc.text('CHARGED', feeX + feeW * 0.46 + 2, y + 4);
  doc.text('PAID', feeX + feeW * 0.64 + 2, y + 4);
  doc.text('BALANCE', feeX + feeW * 0.82 + 2, y + 4);
  y += 6;

  // Individual fee rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  feeRows.forEach((r: any, i: number) => {
    const bg: [number, number, number] = i % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    cell(doc, feeX, y, feeW * 0.46, 5, bg);
    cell(doc, feeX + feeW * 0.46, y, feeW * 0.18, 5, bg);
    cell(doc, feeX + feeW * 0.64, y, feeW * 0.18, 5, bg);
    cell(doc, feeX + feeW * 0.82, y, feeW * 0.18, 5, bg);
    doc.setTextColor(0, 0, 0);
    const label = r.is_transport_fee
      ? `Transport${r.route_name ? ` (${r.route_name})` : ''}`
      : r.fee_name;
    doc.text((label || 'Fee').slice(0, 22), feeX + 2, y + 3.5);
    doc.text(Number(r.total_amount || 0).toLocaleString('en-KE'), feeX + feeW * 0.46 + 2, y + 3.5);
    const paid = Number(r.paid_amount || 0);
    if (paid > 0) doc.setTextColor(22, 163, 74);
    doc.text(paid.toLocaleString('en-KE'), feeX + feeW * 0.64 + 2, y + 3.5);
    const bal = Number(r.balance_amount || 0);
    if (bal > 0) doc.setTextColor(200, 40, 40); else doc.setTextColor(0, 0, 0);
    doc.text(bal.toLocaleString('en-KE'), feeX + feeW * 0.82 + 2, y + 3.5);
    doc.setTextColor(0, 0, 0);
    y += 5;
  });

  if (feeRows.length === 0) {
    cell(doc, feeX, y, feeW, 5, [250, 250, 250]);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
    doc.text('No fee invoices found', feeX + 2, y + 3.5);
    y += 5;
  }

  // Total row
  cell(doc, feeX, y, feeW * 0.46, 6, [220, 235, 255]);
  cell(doc, feeX + feeW * 0.46, y, feeW * 0.18, 6, [220, 235, 255]);
  cell(doc, feeX + feeW * 0.64, y, feeW * 0.18, 6, [220, 235, 255]);
  cell(doc, feeX + feeW * 0.82, y, feeW * 0.18, 6, [220, 235, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', feeX + 2, y + 4.5);
  doc.text(totalFees.toLocaleString('en-KE'), feeX + feeW * 0.46 + 2, y + 4.5);
  doc.setTextColor(22, 163, 74);
  doc.text(totalPaid.toLocaleString('en-KE'), feeX + feeW * 0.64 + 2, y + 4.5);
  if (totalBalance > 0) doc.setTextColor(200, 40, 40); else doc.setTextColor(0, 0, 0);
  doc.text(totalBalance.toLocaleString('en-KE'), feeX + feeW * 0.82 + 2, y + 4.5);
  doc.setTextColor(0, 0, 0);
  y += 6;

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
  const [termDates, setTermDates] = useState({ closing_date: '', opening_date: '' });
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);
  const [shareContact, setShareContact] = useState({ name: '', phone: '', email: '' });
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

  const bulkPublishMutation = useMutation({
    mutationFn: () => api.bulkPublishCbcReportCards({
      class_id: filters.class_id,
      term: filters.term,
      academic_year: filters.academic_year,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateCbcReportCards({
      class_id: filters.class_id,
      term: filters.term,
      academic_year: filters.academic_year,
      closing_date: termDates.closing_date || undefined,
      opening_date: termDates.opening_date || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-report-cards'] }),
  });

  const shareMutation = useMutation({
    mutationFn: (channels: string[]) => api.shareReportCard(detail?.id, channels, shareContact),
    onSuccess: (res: any) => setShareResult(res?.data?.results || res?.results || {}),
  });

  const classes = (classesData as any)?.data || [];
  const cards = (cardsData as any)?.data || [];
  const detail = (cardDetail as any)?.data;
  const cardsWithId = cards.filter((c: any) => c.id);
  const draftCards = cardsWithId.filter((c: any) => c.status === 'draft');
  const publishedCards = cardsWithId.filter((c: any) => c.status === 'published' || c.status === 'acknowledged');
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
                  className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${publishedCards.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
                  onClick={() => publishedCards.length > 0 && handleDownload('published')}
                >
                  <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${publishedCards.length > 0 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span>
                    <span className="font-medium block">Published / Acknowledged Only</span>
                    <span className="text-xs text-gray-500">
                      {publishedCards.length} card{publishedCards.length !== 1 ? 's' : ''}
                      {publishedCards.length === 0 ? ' — use Publish All Drafts first' : ''}
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

          {/* Term closing / opening dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Term Closing Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={termDates.closing_date}
                onChange={e => setTermDates(d => ({ ...d, closing_date: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-0.5">Last day of this term (printed on report card)</p>
            </div>
            <div>
              <Label>Next Term Opening Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={termDates.opening_date}
                onChange={e => setTermDates(d => ({ ...d, opening_date: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-0.5">First day of next term (printed on report card)</p>
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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Learners ({cards.length})
                </CardTitle>
                {cardsWithId.length > 0 && (
                  <span className="text-xs text-gray-400">{cardsWithId.length} with card</span>
                )}
              </div>

              {/* Status summary + Bulk Publish */}
              {cardsWithId.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Status counts */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-700">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      {publishedCards.length} published
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                      {draftCards.length} draft
                    </span>
                  </div>

                  {/* Publish All Drafts button */}
                  {draftCards.length > 0 && (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                      onClick={() => bulkPublishMutation.mutate()}
                      disabled={bulkPublishMutation.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      {bulkPublishMutation.isPending
                        ? 'Publishing…'
                        : `Publish All Drafts (${draftCards.length})`}
                    </Button>
                  )}
                  {bulkPublishMutation.isSuccess && (
                    <p className="text-xs text-green-600 text-center">
                      {(bulkPublishMutation.data as any)?.data?.published ?? 0} card(s) published successfully.
                    </p>
                  )}
                </div>
              )}
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
                  <div className="flex items-start gap-4">
                    {/* Student passport photo */}
                    <div className="flex-shrink-0">
                      {detail.profile_photo_url ? (
                        <img
                          src={detail.profile_photo_url}
                          alt={detail.student_name}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                          <span className="text-2xl text-gray-300">📷</span>
                          <span className="text-xs text-gray-400 mt-1">No Photo</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle>{detail.student_name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {detail.class_name} · {detail.term?.replace('term', 'Term ')} · {detail.academic_year}
                      </p>
                      <p className="text-xs text-gray-400">Admission: {detail.admission_number}</p>
                    </div>
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
                      <Button size="sm" variant="outline" onClick={() => {
                          setShareContact({
                            name: detail?.guardian_name || '',
                            phone: detail?.guardian_phone || '',
                            email: detail?.guardian_email || '',
                          });
                          setShareResult(null);
                          setShowShare(true);
                        }}
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
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-50 text-blue-800">
                            <th className="text-left px-3 py-1.5 font-semibold">Learning Area</th>
                            <th className="text-center px-2 py-1.5 font-semibold hidden sm:table-cell">Type/Period</th>
                            <th className="text-center px-2 py-1.5 font-semibold">Score</th>
                            <th className="text-center px-2 py-1.5 font-semibold">Grade</th>
                            <th className="text-center px-2 py-1.5 font-semibold">Pts</th>
                            <th className="text-left px-2 py-1.5 font-semibold">Facilitator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.competencies.map((c: any, i: number) => {
                            const grade = c.overall_cbc_grade || c.pre_primary_grade || '';
                            const scoreStr = c.total_score != null && c.max_score != null
                              ? `${Math.round(Number(c.total_score))}/${Math.round(Number(c.max_score))}`
                              : c.percentage ? `${Math.round(Number(c.percentage))}%` : '—';
                            const pts = c.grade_points != null ? c.grade_points :
                              grade === 'EE' || grade === 'WD' ? 4 :
                              grade === 'ME' ? 3 :
                              grade === 'AE' || grade === 'D' ? 2 :
                              grade === 'BE' || grade === 'B' ? 1 : '—';
                            const period = detail.term === 'term1' ? 'End Term 1' : detail.term === 'term2' ? 'End Term 2' : 'End Term 3';
                            return (
                              <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-1.5 text-gray-800 font-medium">{c.subject_name}</td>
                                <td className="px-2 py-1.5 text-center text-gray-500 hidden sm:table-cell">{period}</td>
                                <td className="px-2 py-1.5 text-center text-gray-600">{scoreStr}</td>
                                <td className="px-2 py-1.5 text-center">
                                  {grade ? (
                                    <Badge className={`text-xs ${GRADE_COLORS[grade] || 'bg-gray-100'}`}>{grade}</Badge>
                                  ) : '—'}
                                </td>
                                <td className="px-2 py-1.5 text-center font-semibold text-indigo-700">{pts}</td>
                                <td className="px-2 py-1.5 text-gray-700 font-medium">{c.teacher_name || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Class Facilitator */}
                {detail.class_teacher_name && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-500 mb-0.5">Class Facilitator</p>
                    <p className="text-sm font-bold text-blue-900">{detail.class_teacher_name}</p>
                  </div>
                )}

                {/* Head Teacher / Principal */}
                {detail.head_teacher_name && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-0.5">Head Teacher / Principal</p>
                    <p className="text-sm font-bold text-purple-900">{detail.head_teacher_name}</p>
                  </div>
                )}

                {/* Term Dates */}
                {(detail.term_end_date || detail.next_term_start_date) && (
                  <div className="grid grid-cols-2 gap-3">
                    {detail.term_end_date && (
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xs font-semibold text-orange-600 mb-1">Term Closes</p>
                        <p className="text-sm font-bold text-orange-900">{detail.term_end_date}</p>
                      </div>
                    )}
                    {detail.next_term_start_date && (
                      <div className="bg-teal-50 rounded-lg p-3 text-center">
                        <p className="text-xs font-semibold text-teal-600 mb-1">Next Term Opens</p>
                        <p className="text-sm font-bold text-teal-900">{detail.next_term_start_date}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fee Breakdown — includes standard fees, extra fees and transport */}
                {detail.fee_breakdown && detail.fee_breakdown.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Fee Account</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-600">
                            <th className="text-left px-3 py-1.5 font-semibold">Fee Item</th>
                            <th className="text-right px-3 py-1.5 font-semibold">Charged</th>
                            <th className="text-right px-3 py-1.5 font-semibold">Paid</th>
                            <th className="text-right px-3 py-1.5 font-semibold">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.fee_breakdown.map((f: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-1.5 text-gray-800">
                                {f.is_transport_fee
                                  ? `Transport${f.route_name ? ` (${f.route_name})` : ''}`
                                  : f.fee_name}
                                {f.is_extra_fee && <span className="ml-1 text-purple-500 font-medium">(Extra)</span>}
                              </td>
                              <td className="px-3 py-1.5 text-right text-gray-700">
                                {Number(f.total_amount || 0).toLocaleString('en-KE')}
                              </td>
                              <td className="px-3 py-1.5 text-right text-green-700">
                                {Number(f.paid_amount || 0).toLocaleString('en-KE')}
                              </td>
                              <td className={`px-3 py-1.5 text-right font-medium ${Number(f.balance_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {Number(f.balance_amount || 0).toLocaleString('en-KE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 font-semibold border-t">
                            <td className="px-3 py-1.5 text-gray-800">TOTAL</td>
                            <td className="px-3 py-1.5 text-right text-gray-800">
                              {detail.fee_breakdown.reduce((s: number, f: any) => s + Number(f.total_amount || 0), 0).toLocaleString('en-KE')}
                            </td>
                            <td className="px-3 py-1.5 text-right text-green-700">
                              {detail.fee_breakdown.reduce((s: number, f: any) => s + Number(f.paid_amount || 0), 0).toLocaleString('en-KE')}
                            </td>
                            <td className={`px-3 py-1.5 text-right ${detail.fee_breakdown.reduce((s: number, f: any) => s + Number(f.balance_amount || 0), 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {detail.fee_breakdown.reduce((s: number, f: any) => s + Number(f.balance_amount || 0), 0).toLocaleString('en-KE')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
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

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Student info */}
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="font-semibold text-indigo-900">{detail.student_name}</p>
                <p className="text-sm text-indigo-600">{detail.class_name} · {detail.term?.replace('term', 'Term ')} {detail.academic_year}</p>
              </div>

              {/* Editable contact fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient Contact</p>
                  {(detail.guardian_name || detail.guardian_phone || detail.guardian_email) && (
                    <button
                      className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                      onClick={() => setShareContact({
                        name: detail.guardian_name || '',
                        phone: detail.guardian_phone || '',
                        email: detail.guardian_email || '',
                      })}
                    >
                      Reset to registered contact
                    </button>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-gray-600">
                    <Users className="h-3 w-3 inline mr-1" />Name
                  </Label>
                  <Input
                    value={shareContact.name}
                    onChange={e => setShareContact(c => ({ ...c, name: e.target.value }))}
                    placeholder="Parent / Guardian name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600">
                    <Phone className="h-3 w-3 inline mr-1" />Phone (WhatsApp)
                  </Label>
                  <Input
                    value={shareContact.phone}
                    onChange={e => setShareContact(c => ({ ...c, phone: e.target.value }))}
                    placeholder="e.g. 0712 345 678"
                    className="mt-1 font-mono"
                    type="tel"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600">
                    <AtSign className="h-3 w-3 inline mr-1" />Email address
                  </Label>
                  <Input
                    value={shareContact.email}
                    onChange={e => setShareContact(c => ({ ...c, email: e.target.value }))}
                    placeholder="parent@email.com"
                    className="mt-1"
                    type="email"
                  />
                </div>

                {!shareContact.phone && !shareContact.email && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Enter a phone number (for WhatsApp) or email address to send the report card.</p>
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
                        ? `Email sent successfully to ${shareContact.email || 'recipient'}.`
                        : `Email failed: ${shareResult.email?.error}`}
                    </div>
                  )}
                  {shareResult.whatsapp?.success && (
                    <a
                      href={shareResult.whatsapp.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      Tap to open WhatsApp and send →
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
                {/* Download PDF first */}
                <button
                  onClick={() => handleDownload('selected')}
                  disabled={downloading}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 font-medium text-sm
                    border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {downloading ? 'Generating PDF…' : 'Download PDF'}
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => { setShareResult(null); shareMutation.mutate(['whatsapp']); }}
                  disabled={shareMutation.isPending || !shareContact.phone}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {shareMutation.isPending ? 'Preparing…' : `Send via WhatsApp${shareContact.phone ? ` → ${shareContact.phone}` : ''}`}
                </button>

                {/* Email */}
                <button
                  onClick={() => { setShareResult(null); shareMutation.mutate(['email']); }}
                  disabled={shareMutation.isPending || !shareContact.email}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-semibold text-sm
                    bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {shareMutation.isPending ? 'Sending…' : `Send Email${shareContact.email ? ` → ${shareContact.email}` : ''}`}
                </button>

                {/* Both */}
                {shareContact.email && shareContact.phone && (
                  <button
                    onClick={() => { setShareResult(null); shareMutation.mutate(['email', 'whatsapp']); }}
                    disabled={shareMutation.isPending}
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 font-medium text-sm
                      border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Send via Both (WhatsApp + Email)
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                You can type any contact details above — not limited to registered parents.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
