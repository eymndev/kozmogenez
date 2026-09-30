import { SPANS, TOTAL, clamp, locate } from "@/film/timeline";

export type Snapshot = {
  index: number;
  beat: number;
  inCard: boolean;
  playing: boolean;
  speed: number;
  ended: boolean;
};

/** Her karede çağrılır. `prev`, bir önceki karenin zamanıdır; atlamalarda `time` ile eşittir. */
export type FrameFn = (time: number, prev: number) => void;

/**
 * Filmin saati. React yalnızca kesikli değişiklikleri (bölüm, cümle, oynatma)
 * `useSyncExternalStore` ile izler; kare kare işler `onFrame` ile doğrudan DOM’a yazılır.
 */
export class FilmEngine {
  time = 0;
  playing = false;
  speed = 1;
  ended = false;

  private prev = 0;
  private snap: Snapshot;
  private subs = new Set<() => void>();
  private frames = new Set<FrameFn>();
  private raf = 0;
  private last = 0;

  constructor(time = 0) {
    this.time = clamp(time, 0, TOTAL);
    this.prev = this.time;
    this.snap = this.compute();
  }

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };

  getSnapshot = () => this.snap;

  onFrame(fn: FrameFn) {
    this.frames.add(fn);
    return () => {
      this.frames.delete(fn);
    };
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.playing) {
        this.time = Math.min(TOTAL, this.time + dt * this.speed);
        if (this.time >= TOTAL) {
          this.playing = false;
          this.ended = true;
        }
      }
      const prev = this.prev;
      this.prev = this.time;
      for (const fn of this.frames) fn(this.time, prev);
      this.publish();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  play() {
    if (this.ended || this.time >= TOTAL - 0.05) {
      this.seek(0);
    }
    this.playing = true;
    this.publish();
  }

  pause() {
    this.playing = false;
    this.publish();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(time: number) {
    this.time = clamp(time, 0, TOTAL);
    this.prev = this.time;
    this.ended = this.time >= TOTAL;
    if (this.ended) this.playing = false;
    this.publish();
  }

  goTo(index: number) {
    const i = clamp(index, 0, SPANS.length - 1);
    this.seek(SPANS[i].start);
  }

  next() {
    const { index } = locate(this.time);
    if (index >= SPANS.length - 1) this.seek(TOTAL);
    else this.goTo(index + 1);
  }

  /** Bölümün başından birkaç saniye geçtiyse başa, değilse bir önceki bölüme döner. */
  previous() {
    const { index } = locate(this.time);
    const into = this.time - SPANS[index].start;
    this.goTo(into > 2.5 || index === 0 ? index : index - 1);
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.publish();
  }

  private compute(): Snapshot {
    const pos = locate(this.time);
    return {
      index: pos.index,
      beat: pos.beat,
      inCard: pos.inCard,
      playing: this.playing,
      speed: this.speed,
      ended: this.ended,
    };
  }

  private publish() {
    const next = this.compute();
    const s = this.snap;
    if (
      next.index === s.index &&
      next.beat === s.beat &&
      next.inCard === s.inCard &&
      next.playing === s.playing &&
      next.speed === s.speed &&
      next.ended === s.ended
    ) {
      return;
    }
    this.snap = next;
    for (const fn of this.subs) fn();
  }
}
