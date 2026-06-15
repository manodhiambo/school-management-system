import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Bell, MessageSquare, DollarSign, X, Volume2, VolumeX } from 'lucide-react';
import { soundService, SoundType } from '@/services/soundService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

// ── types ─────────────────────────────────────────────────────────────────

export interface SoundSettings {
  enabled: boolean;
  messagesEnabled: boolean;
  feeEnabled: boolean;
  alertsEnabled: boolean;
  volume: number;
}

interface SoundCtx extends SoundSettings {
  setEnabled(v: boolean): void;
  setMessagesEnabled(v: boolean): void;
  setFeeEnabled(v: boolean): void;
  setAlertsEnabled(v: boolean): void;
  setVolume(v: number): void;
  preview(type: SoundType): void;
}

interface Toast {
  id: number;
  type: SoundType;
  title: string;
  body: string;
  href?: string;
}

// ── context ───────────────────────────────────────────────────────────────

const Ctx = createContext<SoundCtx>({
  enabled: true, messagesEnabled: true, feeEnabled: true, alertsEnabled: true, volume: 0.5,
  setEnabled: () => {}, setMessagesEnabled: () => {}, setFeeEnabled: () => {},
  setAlertsEnabled: () => {}, setVolume: () => {}, preview: () => {},
});

export function useSoundSettings() { return useContext(Ctx); }

// ── helper: small toggle that syncs soundService + forces re-render ───────

function useSoundPref<K extends keyof typeof soundService>(
  getter: () => boolean,
  setter: (v: boolean) => void,
): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(getter);
  return [val, (v: boolean) => { setter(v); setVal(v); }];
}

// ── provider ──────────────────────────────────────────────────────────────

export function SoundNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  // settings state (mirrors soundService localStorage)
  const [enabled,         setEnabledState]   = useSoundPref(() => soundService.enabled, v => (soundService.enabled = v));
  const [messagesEnabled, setMsgState]       = useSoundPref(() => soundService.messagesEnabled, v => (soundService.messagesEnabled = v));
  const [feeEnabled,      setFeeState]       = useSoundPref(() => soundService.feeEnabled, v => (soundService.feeEnabled = v));
  const [alertsEnabled,   setAlertsState]    = useSoundPref(() => soundService.alertsEnabled, v => (soundService.alertsEnabled = v));
  const [volume,          setVolState]       = useState(soundService.volume);

  const setVolume = (v: number) => { soundService.volume = v; setVolState(v); };
  const preview   = (t: SoundType) => soundService.preview(t);

  // toasts visible on screen
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  // last-seen counts to detect increases
  const prevCounts = useRef({ messages: -1, notifications: -1, parentAlerts: -1 });

  const addToast = useCallback((type: SoundType, title: string, body: string, href?: string) => {
    const id = ++nextId.current;
    setToasts(t => [...t, { id, type, title, body, href }]);
    soundService.play(type);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
  }, []);

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  // ── polling ─────────────────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!user?.id || !enabled) return;

    try {
      // Unread messages (all roles)
      const msgRes: any = await api.getUnreadMessageCount().catch(() => null);
      const msgCount = msgRes?.data?.count ?? 0;
      if (prevCounts.current.messages >= 0 && msgCount > prevCounts.current.messages) {
        const diff = msgCount - prevCounts.current.messages;
        addToast('message', 'New Message', `You have ${diff} new message${diff > 1 ? 's' : ''}`, '/app/messages');
      }
      prevCounts.current.messages = msgCount;
    } catch {}

    try {
      // General notifications (all roles)
      const notifRes: any = await api.getUnreadNotificationCount().catch(() => null);
      const notifCount = notifRes?.data?.count ?? 0;
      if (prevCounts.current.notifications >= 0 && notifCount > prevCounts.current.notifications) {
        const diff = notifCount - prevCounts.current.notifications;
        addToast('alert', 'New Notification', `You have ${diff} new notification${diff > 1 ? 's' : ''}`, '/app/notifications');
      }
      prevCounts.current.notifications = notifCount;
    } catch {}

    // Parent-only: fee & parent alerts
    if (user.role === 'parent') {
      try {
        const alertRes: any = await api.getParentAlertsCount().catch(() => null);
        const alertCount = alertRes?.data?.count ?? 0;
        if (prevCounts.current.parentAlerts >= 0 && alertCount > prevCounts.current.parentAlerts) {
          const diff = alertCount - prevCounts.current.parentAlerts;
          addToast('fee', 'Fee Reminder', `You have ${diff} new alert${diff > 1 ? 's' : ''} from school`, '/app/parent-alerts');
        }
        prevCounts.current.parentAlerts = alertCount;
      } catch {}
    }
  }, [user, enabled, addToast]);

  useEffect(() => {
    if (!user?.id) return;
    // Reset counts when user changes so we don't play sounds on first load
    prevCounts.current = { messages: -1, notifications: -1, parentAlerts: -1 };

    // First poll after a short delay so we baseline without making noise on login
    const initial = setTimeout(() => {
      // Baseline only (no sound) — set counts without calling addToast
      const baseline = async () => {
        try {
          const [msgRes, notifRes, alertRes]: any[] = await Promise.allSettled([
            api.getUnreadMessageCount(),
            api.getUnreadNotificationCount(),
            user.role === 'parent' ? api.getParentAlertsCount() : Promise.resolve(null),
          ]);
          prevCounts.current.messages      = msgRes?.value?.data?.count   ?? 0;
          prevCounts.current.notifications = notifRes?.value?.data?.count ?? 0;
          prevCounts.current.parentAlerts  = alertRes?.value?.data?.count ?? 0;
        } catch {}
      };
      baseline();
    }, 2000);

    // Poll every 30s after baseline
    const interval = setInterval(poll, 30_000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [user?.id, user?.role, enabled, poll]);

  // ── toast icon by type ───────────────────────────────────────────────────

  const toastIcon = (type: SoundType) => {
    if (type === 'message') return <MessageSquare className="h-5 w-5 text-blue-500" />;
    if (type === 'fee')     return <DollarSign    className="h-5 w-5 text-orange-500" />;
    return                         <Bell          className="h-5 w-5 text-purple-500" />;
  };

  const toastColor = (type: SoundType) => {
    if (type === 'message') return 'border-blue-400 bg-blue-50';
    if (type === 'fee')     return 'border-orange-400 bg-orange-50';
    return                         'border-purple-400 bg-purple-50';
  };

  const ctx: SoundCtx = {
    enabled, messagesEnabled, feeEnabled, alertsEnabled, volume,
    setEnabled: setEnabledState,
    setMessagesEnabled: setMsgState,
    setFeeEnabled: setFeeState,
    setAlertsEnabled: setAlertsState,
    setVolume,
    preview,
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}

      {/* Toast stack — top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg animate-in slide-in-from-right-5 ${toastColor(toast.type)}`}
          >
            <div className="flex-shrink-0 mt-0.5">{toastIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800">{toast.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{toast.body}</p>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Master mute toggle — bottom-right corner */}
      <button
        onClick={() => setEnabledState(!enabled)}
        title={enabled ? 'Mute notifications' : 'Unmute notifications'}
        className="fixed bottom-6 right-6 z-[9998] w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-lg transition-all"
      >
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-400" />}
      </button>
    </Ctx.Provider>
  );
}
