// Student boarding types (migration 095): a student is exactly one of these.
export const STUDENT_TYPES = ['day_scholar', 'full_time_boarder', 'weekly_boarder'] as const;
export type StudentType = typeof STUDENT_TYPES[number];

const LABELS: Record<string, string> = {
  day_scholar: 'Day Scholar',
  full_time_boarder: 'Full-Time Boarder',
  weekly_boarder: 'Weekly Boarder',
  boarder: 'Boarder', // legacy value, still seen on old fee structures
};

export function studentTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Day Scholar';
  return LABELS[type] || type;
}

export function isBoarder(type: string | null | undefined): boolean {
  return type === 'full_time_boarder' || type === 'weekly_boarder' || type === 'boarder';
}

// Tailwind badge classes, consistent across pages: blue for day scholar, purple/indigo
// for the two boarder subtypes.
export function studentTypeBadgeClass(type: string | null | undefined): string {
  if (type === 'weekly_boarder') return 'bg-indigo-100 text-indigo-800';
  if (isBoarder(type)) return 'bg-purple-100 text-purple-800';
  return 'bg-blue-100 text-blue-800';
}
