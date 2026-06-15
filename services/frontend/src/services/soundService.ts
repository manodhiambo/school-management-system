// Sound notification service — uses Web Audio API (no audio files required)

const LS_ENABLED  = 'skulmanager_sound_enabled';
const LS_MESSAGES = 'skulmanager_sound_messages';
const LS_FEE      = 'skulmanager_sound_fee';
const LS_ALERTS   = 'skulmanager_sound_alerts';
const LS_VOLUME   = 'skulmanager_sound_volume';

function getBool(key: string, def = true): boolean {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}
function getNum(key: string, def: number): number {
  const v = localStorage.getItem(key);
  return v === null ? def : parseFloat(v);
}

export type SoundType = 'message' | 'fee' | 'alert' | 'success';

class SoundService {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── settings ──────────────────────────────────────────────────────────────

  get enabled()         { return getBool(LS_ENABLED,  true); }
  get messagesEnabled() { return getBool(LS_MESSAGES, true); }
  get feeEnabled()      { return getBool(LS_FEE,      true); }
  get alertsEnabled()   { return getBool(LS_ALERTS,   true); }
  get volume()          { return getNum(LS_VOLUME, 0.5); }

  set enabled(v: boolean)         { localStorage.setItem(LS_ENABLED,  String(v)); }
  set messagesEnabled(v: boolean) { localStorage.setItem(LS_MESSAGES, String(v)); }
  set feeEnabled(v: boolean)      { localStorage.setItem(LS_FEE,      String(v)); }
  set alertsEnabled(v: boolean)   { localStorage.setItem(LS_ALERTS,   String(v)); }
  set volume(v: number)           { localStorage.setItem(LS_VOLUME,   String(v)); }

  // ── tone generation ───────────────────────────────────────────────────────

  private tone(freq: number, dur: number, startAt: number, vol: number, type: OscillatorType = 'sine') {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
    gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + startAt + dur + 0.05);
  }

  // ── sounds ────────────────────────────────────────────────────────────────

  /** Soft two-note ding — for new messages */
  private playMessageTone(vol: number) {
    this.tone(880, 0.18, 0,    vol);
    this.tone(660, 0.28, 0.18, vol * 0.7);
  }

  /** Three-note rising alert — for fee reminders */
  private playFeeTone(vol: number) {
    this.tone(523, 0.14, 0,    vol, 'triangle');
    this.tone(659, 0.14, 0.16, vol, 'triangle');
    this.tone(784, 0.24, 0.32, vol, 'triangle');
  }

  /** Two quick beeps — for general alerts */
  private playAlertTone(vol: number) {
    this.tone(880, 0.12, 0,    vol, 'square');
    this.tone(880, 0.12, 0.20, vol, 'square');
  }

  /** Rising chime — for success/confirmation */
  private playSuccessTone(vol: number) {
    this.tone(523, 0.12, 0,    vol * 0.8);
    this.tone(659, 0.12, 0.13, vol * 0.8);
    this.tone(784, 0.22, 0.26, vol);
  }

  // ── public API ────────────────────────────────────────────────────────────

  play(type: SoundType) {
    if (!this.enabled) return;
    if (type === 'message' && !this.messagesEnabled) return;
    if (type === 'fee'     && !this.feeEnabled)      return;
    if (type === 'alert'   && !this.alertsEnabled)   return;

    try {
      const vol = Math.max(0.05, Math.min(1, this.volume));
      if (type === 'message') this.playMessageTone(vol);
      if (type === 'fee')     this.playFeeTone(vol);
      if (type === 'alert')   this.playAlertTone(vol);
      if (type === 'success') this.playSuccessTone(vol);
    } catch {
      // Silently ignore — AudioContext not available in some contexts
    }
  }

  /** Preview a sound from the settings panel (always plays regardless of toggles) */
  preview(type: SoundType) {
    try {
      const vol = Math.max(0.05, Math.min(1, this.volume));
      if (type === 'message') this.playMessageTone(vol);
      if (type === 'fee')     this.playFeeTone(vol);
      if (type === 'alert')   this.playAlertTone(vol);
      if (type === 'success') this.playSuccessTone(vol);
    } catch {}
  }
}

export const soundService = new SoundService();
