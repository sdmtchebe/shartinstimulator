type SoundType =
  | "step" | "eat" | "fridge" | "door" | "punch" | "block" | "miss"
  | "swish" | "transform" | "alarm" | "crack" | "coin"
  | "sleep" | "death" | "phoneOpen" | "phoneTab"
  | "fishCast" | "fishCatch" | "tvStatic"
  | "burp" | "thud" | "soccerKick" | "cousinChomp"
  | "select" | "victory" | "defeat" | "cheer" | "shock"
  | "questDone" | "shutter" | "engineStart" | "engineRev" | "engineIdle" | "engineDrive" | "carBounce";

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private lastStep = 0;
  private alarmInterval: number | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch { /* noop */ }
  }

  resume() { if (this.ctx?.state === "suspended") this.ctx.resume(); }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.3;
    return this.muted;
  }

  isMuted() { return this.muted; }

  private noiseBuf(durSec: number, ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * durSec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  play(type: SoundType) {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const dest = this.masterGain;
    const t0 = ctx.currentTime;

    const tone = (f: number, t: OscillatorType, g: number, d: number, fe?: number) => {
      const o = ctx.createOscillator(); const gn = ctx.createGain();
      o.type = t; o.frequency.setValueAtTime(f, t0);
      if (fe !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(0.001, fe), t0 + d);
      gn.gain.setValueAtTime(g, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(gn).connect(dest); o.start(t0); o.stop(t0 + d + 0.05);
    };
    const noise = (d: number, g: number, ff?: number, ft: BiquadFilterType = "lowpass") => {
      const buf = this.noiseBuf(d, ctx);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(g, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      if (ff) {
        const f = ctx.createBiquadFilter();
        f.type = ft; f.frequency.value = ff; f.Q.value = 2;
        src.connect(f).connect(gn).connect(dest);
      } else { src.connect(gn).connect(dest); }
      src.start(t0); src.stop(t0 + d + 0.05);
    };

    switch (type) {
      case "step":
        if (t0 - this.lastStep < 0.16) return;
        this.lastStep = t0;
        tone(110, "square", 0.2, 0.1, 50); noise(0.05, 0.08, 200); break;
      case "eat": noise(0.15, 0.4, 1200, "bandpass"); tone(280, "square", 0.1, 0.08, 200); break;
      case "burp": tone(180, "sawtooth", 0.3, 0.4, 60); break;
      case "fridge": tone(800, "triangle", 0.2, 0.18, 1200); noise(0.1, 0.05, 4000, "highpass"); break;
      case "door": noise(0.4, 0.2, 600, "bandpass"); tone(60, "sine", 0.12, 0.4, 30); break;
      case "punch": tone(70, "square", 0.5, 0.15, 30); noise(0.08, 0.3, 800); break;
      case "block": tone(140, "square", 0.3, 0.18, 100); break;
      case "miss": tone(420, "sine", 0.15, 0.2, 200); break;
      case "swish": noise(0.18, 0.3, 5000, "bandpass"); tone(900, "sine", 0.18, 0.15, 1400); break;
      case "transform":
        for (let i = 0; i < 6; i++) { const f = 300 + i * 200; setTimeout(() => tone(f, "triangle", 0.15, 0.15, f * 1.5), i * 60); }
        break;
      case "alarm": tone(820, "square", 0.18, 0.2, 420); break;
      case "crack": tone(60, "sawtooth", 0.6, 0.3, 20); noise(0.2, 0.4, 1200); break;
      case "coin": tone(880, "square", 0.22, 0.08); setTimeout(() => tone(1320, "square", 0.22, 0.12), 60); break;
      case "sleep": for (let i = 0; i < 4; i++) setTimeout(() => tone(440 - i * 80, "sine", 0.12, 0.4, 220 - i * 40), i * 250); break;
      case "death": for (let i = 0; i < 5; i++) setTimeout(() => tone(400 - i * 60, "sawtooth", 0.25, 0.3, 100 - i * 15), i * 180); break;
      case "phoneOpen": tone(660, "square", 0.18, 0.06); setTimeout(() => tone(990, "square", 0.18, 0.06), 70); break;
      case "phoneTab": tone(1100, "square", 0.12, 0.05); break;
      case "fishCast": noise(0.4, 0.22, 800, "bandpass"); break;
      case "fishCatch":
        tone(440, "triangle", 0.2, 0.2, 880);
        setTimeout(() => tone(660, "triangle", 0.2, 0.2, 1100), 130);
        setTimeout(() => tone(880, "triangle", 0.2, 0.2, 1320), 260);
        break;
      case "tvStatic": noise(0.25, 0.15, 3500, "highpass"); break;
      case "thud": tone(80, "square", 0.4, 0.18, 30); break;
      case "soccerKick": tone(180, "square", 0.4, 0.1, 60); noise(0.06, 0.18, 600); break;
      case "cousinChomp":
        tone(60, "sawtooth", 0.6, 0.3, 20);
        for (let i = 0; i < 3; i++) setTimeout(() => noise(0.08, 0.4, 800, "bandpass"), i * 80);
        setTimeout(() => tone(120, "square", 0.4, 0.2, 60), 300);
        break;
      case "select": tone(660, "square", 0.16, 0.05); break;
      case "victory": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, "square", 0.2, 0.15), i * 110)); break;
      case "defeat": [400, 320, 240, 160].forEach((f, i) => setTimeout(() => tone(f, "sawtooth", 0.18, 0.2), i * 140)); break;
      case "cheer": noise(0.5, 0.2, 2200, "bandpass"); break;
      case "shock": tone(880, "square", 0.18, 0.08, 1320); setTimeout(() => tone(1320, "square", 0.18, 0.08, 880), 60); break;
      case "shutter": noise(0.07, 0.3, 3000, "highpass"); break;
      case "questDone": [659, 784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.16, 0.13), i * 80)); break;
      case "engineStart": tone(80, "sawtooth", 0.4, 0.3, 120); noise(0.2, 0.3, 400); break;
      case "engineRev": tone(200, "sawtooth", 0.25, 0.15, 400); tone(300, "square", 0.15, 0.1, 500); break;
      case "engineIdle": tone(60, "sawtooth", 0.15, 0.08, 50); break;
      case "engineDrive": 
        tone(120, "sawtooth", 0.2, 0.1, 80);
        tone(90, "square", 0.15, 0.08, 60);
        break;
      case "carBounce": tone(100, "square", 0.3, 0.12, 50); noise(0.1, 0.25, 300); break;
    }
  }

  startAlarm() {
    if (this.alarmInterval !== null) return;
    this.alarmInterval = window.setInterval(() => this.play("alarm"), 700);
  }
  stopAlarm() {
    if (this.alarmInterval !== null) { clearInterval(this.alarmInterval); this.alarmInterval = null; }
  }
}

export const sound = new SoundManager();
