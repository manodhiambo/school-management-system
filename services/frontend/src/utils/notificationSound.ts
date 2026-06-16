type SoundType = 'success' | 'warning' | 'urgent';

export function playNotificationSound(type: SoundType = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const play = (freq: number, start: number, duration: number, volume = 0.3) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    if (type === 'success') {
      // Two ascending tones — picked up / dropped off
      play(440, 0,    0.15);
      play(660, 0.18, 0.25);
    } else if (type === 'warning') {
      // Three pulsed tones — missed / attention needed
      play(550, 0,    0.15);
      play(550, 0.2,  0.15);
      play(440, 0.4,  0.2);
    } else if (type === 'urgent') {
      // Rapid alert — URGENT missed + parent left home conflict
      play(880, 0,    0.12, 0.5);
      play(660, 0.15, 0.12, 0.5);
      play(880, 0.3,  0.12, 0.5);
      play(660, 0.45, 0.12, 0.5);
      play(440, 0.6,  0.25, 0.4);
    }
  } catch {
    // Audio not available — silent fail
  }
}
