const LS_ENABLED = 'skulmanager_voice_enabled';
const LS_VOICE   = 'skulmanager_voice_uri';
const LS_RATE    = 'skulmanager_voice_rate';

function getBool(key: string, def = true): boolean {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}
function getNum(key: string, def: number): number {
  const v = localStorage.getItem(key);
  return v === null ? def : parseFloat(v);
}
function getStr(key: string, def = ''): string {
  return localStorage.getItem(key) ?? def;
}

class VoiceService {
  private _unlocked = false;

  get supported()  { return typeof window !== 'undefined' && 'speechSynthesis' in window; }
  get enabled()     { return this.supported && getBool(LS_ENABLED, true); }
  get voiceURI()    { return getStr(LS_VOICE, ''); }
  get rate()        { return getNum(LS_RATE, 1); }
  get isUnlocked()  { return this._unlocked; }

  set enabled(v: boolean)  { localStorage.setItem(LS_ENABLED, String(v)); }
  set voiceURI(v: string)  { localStorage.setItem(LS_VOICE, v); }
  set rate(v: number)      { localStorage.setItem(LS_RATE, String(v)); }

  // Most browsers load voices asynchronously; resolves once the list is populated.
  getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.supported) return Promise.resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return Promise.resolve(existing);
    return new Promise(resolve => {
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Some browsers never fire the event if there's nothing to load — bail out.
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    });
  }

  private buildUtterance(text: string, volume: number): SpeechSynthesisUtterance | null {
    if (!this.supported) return null;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = Math.max(0.5, Math.min(2, this.rate));
    utter.volume = Math.max(0, Math.min(1, volume));
    const uri = this.voiceURI;
    if (uri) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === uri);
      if (voice) utter.voice = voice;
    }
    return utter;
  }

  // Call once from a real user-gesture handler (click/keydown/touch) so later
  // timer-triggered speak() calls aren't silently dropped by autoplay policy.
  unlock(): void {
    if (!this.supported || this._unlocked) return;
    try {
      const utter = new SpeechSynthesisUtterance(' ');
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
      this._unlocked = true;
    } catch {
      // speechSynthesis not usable
    }
  }

  speak(text: string, volume = 1): void {
    if (!this.enabled) return;
    const utter = this.buildUtterance(text, volume);
    if (!utter) return;
    try {
      window.speechSynthesis.speak(utter);
    } catch { /* speech synthesis unavailable — non-critical */ }
  }

  preview(text: string, volume = 1): void {
    this.unlock();
    const utter = this.buildUtterance(text, volume);
    if (!utter) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch { /* speech synthesis unavailable — non-critical */ }
  }
}

export const voiceService = new VoiceService();
