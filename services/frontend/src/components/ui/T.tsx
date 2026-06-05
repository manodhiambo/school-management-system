import { useLanguageStore } from '@/store/languageStore';

interface TProps {
  children: string;
  className?: string;
}

/** Auto-translating text wrapper. Use as: <T>English text</T> */
export function T({ children, className }: TProps) {
  const { t } = useLanguageStore();
  if (className) return <span className={className}>{t(children)}</span>;
  return <>{t(children)}</>;
}
