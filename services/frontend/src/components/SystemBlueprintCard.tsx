import { useState } from 'react';
import { FileText, Download, BookOpen, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { generateBlueprint } from '@/utils/generateBlueprint';

export function SystemBlueprintCard() {
  const { user } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 60));
      const schoolName = (user as any)?.school_name || (user as any)?.tenant?.name || 'Your School';
      generateBlueprint(schoolName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 shadow-lg overflow-hidden bg-white">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">System Blueprint</h2>
              <p className="text-white/70 text-sm mt-0.5">21 sections · Full feature guide · PDF</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 flex-shrink-0">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">20+ pages</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-gray-600 text-sm leading-relaxed">
          Complete technical and feature documentation for SkulManager — covering all 15 modules,
          user roles, CBE grading, Kenya education structure, payment methods, and an implementation checklist.
          Share with your school board or head teacher.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'All 15 feature modules detailed',
            'User roles & permissions matrix',
            'CBE grading reference guide',
            'Kenya education structure',
            'Payment methods supported',
            'Getting started checklist',
            'Technical specifications',
            'Implementation roadmap',
          ].map(h => (
            <div key={h} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{h}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-5 font-semibold text-sm
            bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:opacity-90 active:scale-[0.98]
            disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
        >
          {downloading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Blueprint PDF…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download System Blueprint (PDF)
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Includes your school name · Professional A4 format · No internet required
        </p>
      </div>
    </div>
  );
}
