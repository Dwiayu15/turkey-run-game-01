// Synthesised sound for Turkey Trot: no audio files, every effect is built
// live with WebAudio oscillators and filtered noise, so the game stays a
// handful of plain files and plays with the network off.
export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the context on the first user gesture; browsers forbid it before. */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** A short oscillator blip with an attack/decay envelope. */
  tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.25, delay = 0 }) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** A burst of filtered noise (whooshes, thuds, the knife whistle). */
  noise({ duration = 0.2, volume = 0.2, from = 1200, to = 300, delay = 0, type = 'bandpass' }) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + duration);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  /** The turkey's gobble: two quick descending clucks with a warble. */
  gobble() {
    this.tone({ type: 'square', from: 520, to: 300, duration: 0.09, volume: 0.16 });
    this.tone({ type: 'square', from: 460, to: 240, duration: 0.1, volume: 0.16, delay: 0.1 });
    this.tone({ type: 'square', from: 380, to: 200, duration: 0.12, volume: 0.14, delay: 0.2 });
  }

  /** The spotted alarm: a rising sawtooth wail, twice. */
  alarm() {
    this.tone({ type: 'sawtooth', from: 320, to: 720, duration: 0.22, volume: 0.18 });
    this.tone({ type: 'sawtooth', from: 320, to: 720, duration: 0.22, volume: 0.18, delay: 0.26 });
  }

  /** A bright pickup blip, a fifth higher for the rarer seeds. */
  pickup(kind) {
    const base = kind === 'seed' ? 880 : kind === 'feather' ? 1040 : 660;
    this.tone({ type: 'sine', from: base, to: base * 1.5, duration: 0.1, volume: 0.22 });
    this.tone({ type: 'sine', from: base * 1.5, to: base * 2, duration: 0.12, volume: 0.16, delay: 0.07 });
  }

  /** A dull thud when the turkey is hit, plus a startled squawk. */
  hit() {
    this.noise({ duration: 0.18, volume: 0.3, from: 300, to: 90, type: 'lowpass' });
    this.tone({ type: 'square', from: 700, to: 180, duration: 0.18, volume: 0.2 });
  }

  /** The knife whistling down: a high noise sweep. */
  knifeWhistle() {
    this.noise({ duration: 0.35, volume: 0.1, from: 2600, to: 500 });
  }

  /** A soft wing-beat whoosh for the dash. */
  dash() {
    this.noise({ duration: 0.16, volume: 0.18, from: 900, to: 2400 });
  }

  /** A little major-key jingle for the escape. */
  jingle() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((note, i) => {
      this.tone({ type: 'triangle', from: note, duration: 0.22, volume: 0.22, delay: i * 0.13 });
    });
  }

  /** A low two-note sting for being caught. */
  caughtSting() {
    this.tone({ type: 'sawtooth', from: 220, to: 160, duration: 0.35, volume: 0.18 });
    this.tone({ type: 'sawtooth', from: 165, to: 110, duration: 0.5, volume: 0.18, delay: 0.3 });
  }

  /** A quiet UI click. */
  click() {
    this.tone({ type: 'sine', from: 700, to: 900, duration: 0.05, volume: 0.12 });
  }
}
