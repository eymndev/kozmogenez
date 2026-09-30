import type { Tone } from "@/film/chapters";

/**
 * Filmin müziği, Web Audio ile anlık üretilir: her bölümün kendi akoru,
 * yavaş nefes alan bir pad, uzak bir "kozmik rüzgâr", bölüm geçişlerinde bir çan
 * ve iki büyük an için (Büyük Patlama, göktaşı) derin bir gümbürtü.
 */

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

type Pad = { out: GainNode; nodes: AudioScheduledSourceNode[] };

export class Score {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pad: Pad | null = null;
  private tone: Tone | null = null;
  private pendingTone: Tone | null = null;
  private toneTimer = 0;
  private suspendTimer = 0;
  private muted = false;
  private active = false;

  /** Kullanıcı etkileşimi içinde çağrılmalı (tarayıcıların otomatik ses kuralı). */
  ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === "suspended" && this.audible()) void this.ctx.resume();
      return true;
    }
    if (typeof window === "undefined") return false;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    const bus = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = 0.62;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 4.2);
    bus.connect(dry).connect(master);
    bus.connect(reverb).connect(wet).connect(master);
    this.bus = bus;

    this.noise = this.noiseBuffer(ctx, 3);
    this.startWind(ctx, bus);
    if (this.pendingTone) this.applyTone(this.pendingTone, true);
    this.syncLevel();
    return true;
  }

  /** Her kullanıcı etkileşiminde çağrılır: askıya alınmış bağlamı yeniden uyandırır. */
  unlock() {
    if (this.ctx?.state !== "suspended") return;
    void this.ctx.resume();
    this.syncLevel();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.syncLevel();
  }

  setActive(active: boolean) {
    this.active = active;
    this.syncLevel();
  }

  /** Bölüm değişince akoru yumuşakça değiştirir; hızlı atlamalarda son akoru bekler. */
  setTone(tone: Tone, immediate = false) {
    this.pendingTone = tone;
    if (!this.ctx) return;
    window.clearTimeout(this.toneTimer);
    if (immediate) this.applyTone(tone, true);
    else this.toneTimer = window.setTimeout(() => this.applyTone(tone, false), 260);
  }

  chime() {
    const ctx = this.ctx;
    const bus = this.bus;
    const tone = this.pendingTone;
    if (!ctx || !bus || !tone || !this.audible()) return;
    const top = tone.chord[tone.chord.length - 1];
    const f = mtof(top + 12);
    const now = ctx.currentTime;
    const partials: [number, number, number][] = [
      [1, 0.05, 4.5],
      [2.01, 0.02, 3],
      [3.02, 0.01, 2],
      [4.23, 0.005, 1.4],
    ];
    for (const [ratio, level, decay] of partials) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(level, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(g).connect(bus);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    }
  }

  boom() {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus || !this.noise || !this.audible()) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(96, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 2.6);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 4);
    osc.connect(og).connect(bus);
    osc.start(now);
    osc.stop(now + 4.1);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, now);
    lp.frequency.exponentialRampToValueAtTime(70, now + 2.8);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.32, now + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 3);
    src.connect(lp).connect(ng).connect(bus);
    src.start(now);
    src.stop(now + 3.1);
  }

  dispose() {
    window.clearTimeout(this.toneTimer);
    window.clearTimeout(this.suspendTimer);
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.bus = null;
    this.noise = null;
    this.pad = null;
    this.tone = null;
  }

  private audible() {
    return this.active && !this.muted;
  }

  private syncLevel() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const on = this.audible();
    window.clearTimeout(this.suspendTimer);
    if (on) {
      if (ctx.state === "suspended") void ctx.resume();
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    } else {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      this.suspendTimer = window.setTimeout(() => {
        if (!this.audible() && ctx.state === "running") void ctx.suspend();
      }, 30000);
    }
  }

  private applyTone(tone: Tone, immediate: boolean) {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus || tone === this.tone) return;
    this.tone = tone;
    const now = ctx.currentTime;
    const fadeIn = immediate ? 1.2 : 3.2;

    const old = this.pad;
    if (old) {
      old.out.gain.cancelScheduledValues(now);
      old.out.gain.setValueAtTime(old.out.gain.value, now);
      old.out.gain.linearRampToValueAtTime(0, now + 3.6);
      for (const node of old.nodes) node.stop(now + 3.8);
      window.setTimeout(() => old.out.disconnect(), 4200);
    }

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(1, now + fadeIn);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = tone.brightness;
    filter.Q.value = 0.6;
    filter.connect(out).connect(bus);

    const nodes: AudioScheduledSourceNode[] = [];
    const lfo = (rate: number, depth: number, target: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = rate;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(target);
      o.start(now);
      nodes.push(o);
    };
    lfo(0.045, tone.brightness * 0.35, filter.frequency);

    tone.chord.forEach((note, n) => {
      const f = mtof(note);
      const vg = ctx.createGain();
      const level = 0.05 * (n === 0 ? 1.15 : Math.max(0.5, 1 - n * 0.09));
      vg.gain.value = level;
      vg.connect(filter);
      lfo(0.06 + ((n * 0.037) % 0.13), level * 0.55, vg.gain);
      const layers: [OscillatorType, number, number][] = [
        ["sine", 0, 1],
        ["triangle", 6, 0.45],
        ["sawtooth", -7, 0.09],
      ];
      for (const [type, cents, gain] of layers) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = gain;
        o.connect(g).connect(vg);
        o.start(now);
        nodes.push(o);
      }
    });

    const sub = ctx.createOscillator();
    sub.frequency.value = mtof(tone.chord[0] - 12);
    const sg = ctx.createGain();
    sg.gain.value = 0.08;
    sub.connect(sg).connect(out);
    sub.start(now);
    nodes.push(sub);

    this.pad = { out, nodes };
  }

  private startWind(ctx: AudioContext, bus: GainNode) {
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 650;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.02;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03;
    const depth = ctx.createGain();
    depth.gain.value = 380;
    lfo.connect(depth).connect(bp.frequency);
    src.connect(bp).connect(g).connect(bus);
    src.start();
    lfo.start();
  }

  private noiseBuffer(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private impulse(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4;
    }
    return buf;
  }
}
