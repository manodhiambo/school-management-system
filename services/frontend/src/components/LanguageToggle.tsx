import { useLanguageStore } from '@/store/languageStore';
import api from '@/services/api';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  const toggle = async () => {
    const next = language === 'en' ? 'sw' : 'en';
    setLanguage(next);
    try { await api.saveUserPreference({ language: next }); } catch { /* silent */ }
  };

  return (
    <button
      onClick={toggle}
      title={language === 'en' ? 'Switch to Kiswahili' : 'Switch to English'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-700 shadow-sm"
    >
      {language === 'en' ? (
        <><span>🇬🇧</span><span>EN</span></>
      ) : (
        <><span>🇰🇪</span><span>SW</span></>
      )}
    </button>
  );
}
