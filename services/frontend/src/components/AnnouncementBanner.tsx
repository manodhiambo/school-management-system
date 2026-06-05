import { useEffect, useState } from 'react';
import { X, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/services/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_pinned: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-600 text-white',
  high:   'bg-amber-500 text-white',
  normal: 'bg-indigo-600 text-white',
  low:    'bg-gray-500 text-white',
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await (api as any).api.get('/announcements?limit=2&unread=true&pinned=false');
        const data: Announcement[] = res.data || res || [];
        setItems(data.slice(0, 2));
      } catch { /* silent — banner is non-critical */ }
    })();
  }, []);

  const dismiss = async (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await (api as any).api.post(`/announcements/${id}/read`);
    } catch { /* silent */ }
  };

  const visible = items.filter((i) => !dismissed.has(i.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map((ann) => {
        const colorClass = PRIORITY_COLORS[ann.priority] ?? PRIORITY_COLORS.normal;
        const isOpen = expanded === ann.id;
        return (
          <div key={ann.id} className={`${colorClass} px-4 py-2 text-sm`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Bell className="h-4 w-4 shrink-0 mt-0.5 opacity-80" />
                <div className="min-w-0">
                  <span className="font-semibold">{ann.title}</span>
                  {isOpen && (
                    <p className="mt-1 text-sm opacity-90 whitespace-pre-wrap">{ann.body}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : ann.id)}
                  className="opacity-80 hover:opacity-100 p-0.5"
                  title={isOpen ? 'Collapse' : 'Read more'}
                  aria-label={isOpen ? 'Collapse announcement' : 'Expand announcement'}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => dismiss(ann.id)}
                  className="opacity-80 hover:opacity-100 p-0.5"
                  title="Dismiss"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
