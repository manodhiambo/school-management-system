import { useState } from 'react';
import { Download, BookOpen, CheckCircle, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { generateUserManual } from '@/utils/generateManual';

const ROLE_META: Record<string, { label: string; color: string; bg: string; chapters: number; description: string }> = {
  admin: {
    label: 'Administrator Manual',
    color: 'text-blue-700',
    bg: 'from-blue-600 to-indigo-600',
    chapters: 24,
    description: 'Full system guide: students, teachers, fees, CBE academics, IGCSE, welfare, procurement module, library and settings.',
  },
  teacher: {
    label: 'Teacher Manual',
    color: 'text-indigo-700',
    bg: 'from-indigo-600 to-purple-600',
    chapters: 15,
    description: 'Attendance, grade book, CBE SBA, lesson plans, schemes of work, assignments, projects, leave requests and IGCSE mark entry.',
  },
  student: {
    label: 'Student Manual',
    color: 'text-emerald-700',
    bg: 'from-emerald-600 to-teal-600',
    chapters: 12,
    description: 'Courses, assignments, results, exams, fees, attendance, timetable, library and IGCSE Cambridge results.',
  },
  parent: {
    label: 'Parent Manual',
    color: 'text-amber-700',
    bg: 'from-amber-500 to-orange-500',
    chapters: 7,
    description: 'Monitor your children\'s progress, fees, alerts, messages and academic results.',
  },
  finance_officer: {
    label: 'Finance Officer Manual',
    color: 'text-red-700',
    bg: 'from-red-600 to-rose-600',
    chapters: 12,
    description: 'Fee structures, payments, budgets, expenses, reports, procurement invoices/payments, assets and bank accounts.',
  },
  driver: {
    label: 'Transport Driver Manual',
    color: 'text-teal-700',
    bg: 'from-teal-600 to-cyan-600',
    chapters: 5,
    description: 'Log in, view your assigned route, mark student pickups (Picked Up / Missed / Absent) and review the daily pickup log.',
  },
};

const HIGHLIGHTS: Record<string, string[]> = {
  admin: ['Manage students & staff', 'CBE & IGCSE curriculum modules', 'Finance & fee management', 'Reports, settings & user accounts'],
  teacher: ['Mark attendance & grade book', 'CBE SBA, lesson plans & schemes', 'IGCSE mark entry & grade calculation', 'Assignments, projects & leave requests'],
  student: ['View CBE & IGCSE grades', 'Submit assignments & online exams', 'Check fee balance & timetable', 'Library, messages & notifications'],
  parent: ['Track children\'s progress', 'View fee statements', 'Receive school alerts', 'Message teachers'],
  finance_officer: ['Record fee payments', 'Student payments & defaulters report', 'Procurement invoices & supplier payments', 'Budget management & reports'],
  driver: ['View assigned route & students', 'Mark pickups: Picked Up / Missed / Absent', 'GPS recorded per pickup event', 'View pickup log & history'],
};

export function UserManualCard() {
  const { user } = useAuthStore();
  const [downloading, setDownloading] = useState(false);
  const role = (user?.role ?? 'admin') as string;
  const meta = ROLE_META[role] ?? ROLE_META['admin'];
  const highlights = HIGHLIGHTS[role] ?? HIGHLIGHTS['admin'];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Small timeout so spinner renders before heavy PDF work
      await new Promise(r => setTimeout(r, 50));
      const schoolName = (user as any)?.school_name || (user as any)?.tenant?.name || 'Your School';
      generateUserManual(role as any, schoolName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 shadow-lg overflow-hidden bg-white">
      {/* Header band */}
      <div className={`bg-gradient-to-r ${meta.bg} p-5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{meta.label}</h2>
              <p className="text-white/80 text-sm mt-0.5">{meta.chapters} chapters &bull; PDF format</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 flex-shrink-0">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Free</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-gray-600 text-sm leading-relaxed">{meta.description}</p>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {highlights.map(h => (
            <div key={h} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{h}</span>
            </div>
          ))}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-5 font-semibold text-sm transition-all
            bg-gradient-to-r ${meta.bg} text-white hover:opacity-90 active:scale-[0.98]
            disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
        >
          {downloading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating PDF…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download User Manual (PDF)
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          The manual is tailored to your role and covers all features available to you.
        </p>
      </div>
    </div>
  );
}
