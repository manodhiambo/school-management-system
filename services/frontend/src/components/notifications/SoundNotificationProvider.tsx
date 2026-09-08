import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, DollarSign, X, Volume2, VolumeX, BellRing } from 'lucide-react';
import { soundService, SoundType } from '@/services/soundService';
import { voiceService } from '@/services/voiceService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

// ── types ─────────────────────────────────────────────────────────────────

export interface SoundSettings {
  enabled: boolean;
  messagesEnabled: boolean;
  feeEnabled: boolean;
  alertsEnabled: boolean;
  volume: number;
  voiceEnabled: boolean;
  voiceURI: string;
  voiceRate: number;
}

interface SoundCtx extends SoundSettings {
  setEnabled(v: boolean): void;
  setMessagesEnabled(v: boolean): void;
  setFeeEnabled(v: boolean): void;
  setAlertsEnabled(v: boolean): void;
  setVolume(v: number): void;
  setVoiceEnabled(v: boolean): void;
  setVoiceURI(v: string): void;
  setVoiceRate(v: number): void;
  preview(type: SoundType): void;
  previewVoice(text: string): void;
  voiceSupported: boolean;
  // Shared unread-notification count — polled here every 30s and consumed by Header's
  // bell badge too, so there's a single poller instead of two components hitting the
  // same /notifications/unread-count endpoint independently (see Header.tsx).
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
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
  voiceEnabled: true, voiceURI: '', voiceRate: 1, voiceSupported: false,
  setEnabled: () => {}, setMessagesEnabled: () => {}, setFeeEnabled: () => {},
  setAlertsEnabled: () => {}, setVolume: () => {}, preview: () => {},
  setVoiceEnabled: () => {}, setVoiceURI: () => {}, setVoiceRate: () => {}, previewVoice: () => {},
  unreadCount: 0, setUnreadCount: () => {},
});

export function useSoundSettings() { return useContext(Ctx); }

// ── helper: small toggle that syncs soundService + forces re-render ───────

function useSoundPref(
  getter: () => boolean,
  setter: (v: boolean) => void,
): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(getter);
  return [val, (v: boolean) => { setter(v); setVal(v); }];
}

// ── provider ──────────────────────────────────────────────────────────────

export function SoundNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  // settings state (mirrors soundService localStorage)
  const [enabled,         setEnabledState] = useSoundPref(() => soundService.enabled, v => (soundService.enabled = v));
  const [messagesEnabled, setMsgState]     = useSoundPref(() => soundService.messagesEnabled, v => (soundService.messagesEnabled = v));
  const [feeEnabled,      setFeeState]     = useSoundPref(() => soundService.feeEnabled, v => (soundService.feeEnabled = v));
  const [alertsEnabled,   setAlertsState]  = useSoundPref(() => soundService.alertsEnabled, v => (soundService.alertsEnabled = v));
  const [volume,          setVolState]     = useState(soundService.volume);
  const [audioReady,      setAudioReady]   = useState(false);

  // voice (text-to-speech) settings — mirror voiceService localStorage
  const [voiceEnabled, setVoiceState] = useSoundPref(() => voiceService.enabled, v => (voiceService.enabled = v));
  const [voiceURI,      setVoiceURIState] = useState(voiceService.voiceURI);
  const [voiceRate,     setVoiceRateState] = useState(voiceService.rate);
  const voiceSupported = voiceService.supported;

  const setVolume    = (v: number) => { soundService.volume = v; setVolState(v); };
  const setVoiceURI  = (v: string) => { voiceService.voiceURI = v; setVoiceURIState(v); };
  const setVoiceRate = (v: number) => { voiceService.rate = v; setVoiceRateState(v); };
  const preview      = (t: SoundType) => soundService.preview(t);
  const previewVoice = (text: string) => voiceService.preview(text, volume);

  // ── AudioContext unlock ───────────────────────────────────────────────────
  // Browsers block audio until a real user gesture occurs. We listen for the
  // first click/keydown/touch and call soundService.unlock() from inside that
  // handler, which is the only place browsers allow AudioContext.resume().
  // After that, timer-triggered play() calls work fine.

  useEffect(() => {
    if (!enabled) return;
    if (soundService.isUnlocked) { setAudioReady(true); return; }

    const unlock = async () => {
      await soundService.unlock();
      voiceService.unlock();
      if (soundService.isUnlocked) {
        setAudioReady(true);
      }
    };

    window.addEventListener('click',      unlock, { passive: true });
    window.addEventListener('keydown',    unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });

    return () => {
      window.removeEventListener('click',      unlock);
      window.removeEventListener('keydown',    unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [enabled]);

  // toast stack
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  // per-message tracking: set of message IDs already seen (so we toast each message once)
  const seenMsgIds      = useRef<Set<string>>(new Set());
  const msgBaselined    = useRef(false);

  // count-based tracking for general notifications and parent alerts
  const prevNotifCount  = useRef(-1);
  const prevAlertCount  = useRef(-1);

  // unread-notification count — shared with Header's bell badge (see SoundCtx above)
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = useCallback((type: SoundType, title: string, body: string, href?: string) => {
    const id = ++nextId.current;
    setToasts(t => [...t, { id, type, title, body, href }]);
    soundService.play(type);
    voiceService.speak(`${title}. ${body}`, soundService.volume);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000);
  }, []);

  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  const clickToast = (toast: Toast) => {
    dismiss(toast.id);
    if (toast.href) navigate(toast.href);
  };

  // ── message polling (every 15 s) ─────────────────────────────────────────

  const pollMessages = useCallback(async () => {
    if (!user?.id || !enabled || !messagesEnabled) return;

    try {
      const res: any = await (api as any).getNewUnreadMessages().catch(() => null);
      const messages: any[] = res?.data || [];

      if (!msgBaselined.current) {
        // First call: silently record all currently-unread IDs as already seen
        messages.forEach((m: any) => seenMsgIds.current.add(m.id));
        msgBaselined.current = true;
        return;
      }

      // Show a toast for each message that arrived since last poll
      const newMsgs = messages.filter((m: any) => !seenMsgIds.current.has(m.id));
      newMsgs.forEach((m: any) => {
        seenMsgIds.current.add(m.id);
        const sender = m.sender_name?.trim() || m.sender_email || 'Someone';
        const body   = m.subject || m.preview?.slice(0, 80) || 'New message';
        addToast('message', `Message from ${sender}`, body, '/app/messages');
      });
    } catch { /* poll failure — retried on next interval */ }
  }, [user?.id, enabled, messagesEnabled, addToast]);

  // ── notifications + parent-alerts polling (every 30 s) ──────────────────

  const pollOther = useCallback(async () => {
    if (!user?.id) return;

    // General notifications — count is kept fresh regardless of the mute toggle (Header's
    // bell badge depends on it); only the toast+sound alert is gated on `enabled`.
    try {
      const res: any = await (api as any).getUnreadNotificationCount().catch(() => null);
      const count = res?.data?.count ?? 0;
      if (enabled && prevNotifCount.current >= 0 && count > prevNotifCount.current && alertsEnabled) {
        const diff = count - prevNotifCount.current;
        addToast('alert', 'New Notification', `You have ${diff} new notification${diff > 1 ? 's' : ''}`, '/app/notifications');
      }
      prevNotifCount.current = count;
      setUnreadCount(count);
    } catch { /* poll failure — retried on next interval */ }

    // Parent-only: fee / school alerts
    if (enabled && user.role === 'parent' && feeEnabled) {
      try {
        const res: any = await (api as any).getParentAlertsCount().catch(() => null);
        const count = res?.data?.count ?? 0;
        if (prevAlertCount.current >= 0 && count > prevAlertCount.current) {
          const diff = count - prevAlertCount.current;
          addToast('fee', 'Fee / School Alert', `${diff} new alert${diff > 1 ? 's' : ''} from school`, '/app/parent-alerts');
        }
        prevAlertCount.current = count;
      } catch { /* poll failure — retried on next interval */ }
    }
  }, [user?.id, user?.role, enabled, alertsEnabled, feeEnabled, addToast]);

  // ── effects: reset + intervals on user change ────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    // Reset all state when user changes (logout / switch account)
    seenMsgIds.current   = new Set();
    msgBaselined.current = false;
    prevNotifCount.current  = -1;
    prevAlertCount.current  = -1;
    setUnreadCount(0);

    // Baseline both immediately (first call to pollMessages records IDs silently;
    // first call to pollOther sets counts without triggering toasts)
    pollMessages();
    pollOther();

    const msgInterval   = setInterval(pollMessages, 15_000);
    const otherInterval = setInterval(pollOther,    30_000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(otherInterval);
    };
  }, [user?.id, user?.role, enabled, pollMessages, pollOther]);

  // ── toast icon / colour by type ──────────────────────────────────────────

  const toastIcon = (type: SoundType) => {
    if (type === 'message') return <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />;
    if (type === 'fee')     return <DollarSign    className="h-5 w-5 text-orange-500 shrink-0" />;
    return                         <Bell          className="h-5 w-5 text-purple-500 shrink-0" />;
  };

  const toastBorder = (type: SoundType) => {
    if (type === 'message') return 'border-blue-400 bg-blue-50';
    if (type === 'fee')     return 'border-orange-400 bg-orange-50';
    return                         'border-purple-400 bg-purple-50';
  };

  const ctx: SoundCtx = {
    enabled, messagesEnabled, feeEnabled, alertsEnabled, volume,
    voiceEnabled, voiceURI, voiceRate, voiceSupported,
    setEnabled: setEnabledState,
    setMessagesEnabled: setMsgState,
    setFeeEnabled: setFeeState,
    setAlertsEnabled: setAlertsState,
    setVolume,
    setVoiceEnabled: setVoiceState,
    setVoiceURI,
    setVoiceRate,
    preview,
    previewVoice,
    unreadCount,
    setUnreadCount,
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}

      {/* Toast stack — top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg
              animate-in slide-in-from-right-5 duration-300 ${toastBorder(toast.type)}
              ${toast.href ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
            onClick={() => clickToast(toast)}
          >
            <div className="mt-0.5">{toastIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 leading-tight">{toast.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{toast.body}</p>
              {toast.href && (
                <p className="text-[10px] text-blue-400 mt-1">Click to open →</p>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); dismiss(toast.id); }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* "Click to enable audio" hint — shown only until first user interaction unlocks AudioContext */}
      {enabled && !audioReady && user?.id && (
        <div
          className="fixed bottom-16 right-4 z-[9997] flex items-center gap-2 px-3 py-2 rounded-xl
            bg-blue-600 text-white text-xs shadow-lg cursor-pointer animate-pulse select-none"
          onClick={async () => { await soundService.unlock(); setAudioReady(soundService.isUnlocked); }}
          title="Click to enable sound notifications"
        >
          <BellRing className="h-3.5 w-3.5 shrink-0" />
          Click to enable sounds
        </div>
      )}

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
