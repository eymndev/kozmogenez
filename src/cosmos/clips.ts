import { CHAPTERS } from "@/cosmos/chapters";

export type ClipSpec = {
  src: string;
  local: number;
  shotSeconds: number;
  opacity: number;
  scale: number;
};

const SPLIT: Record<string, [string, string]> = {
  dunya: ["/cosmos/dunya.mp4", "/cosmos/bacalar.mp4"],
  kara: ["/cosmos/kambriyen.mp4", "/cosmos/kita.mp4"],
  dino: ["/cosmos/dino.mp4", "/cosmos/carpisma.mp4"],
};

const SINGLE: Record<string, string> = {
  patlama: "/cosmos/patlama.mp4",
  isik: "/cosmos/isik.mp4",
  yildiz: "/cosmos/yildiz.mp4",
  galaksi: "/cosmos/galaksi.mp4",
  gunes: "/cosmos/gunes.mp4",
  rna: "/cosmos/rna.mp4",
  dna: "/cosmos/dna.mp4",
  oksijen: "/cosmos/hucre.mp4",
  insan: "/cosmos/insan.mp4",
};

type Shot = { src: string; start: number; end: number };

const BLEND = 3.2;

const SHOTS: Shot[] = (() => {
  const shots: Shot[] = [];
  let t = 0;
  for (const chapter of CHAPTERS) {
    const pair = SPLIT[chapter.id];
    if (pair) {
      const half = chapter.duration / 2;
      shots.push({ src: pair[0], start: t, end: t + half });
      shots.push({ src: pair[1], start: t + half, end: t + chapter.duration });
    } else {
      const src = SINGLE[chapter.id];
      if (src) shots.push({ src, start: t, end: t + chapter.duration });
    }
    t += chapter.duration;
  }
  return shots;
})();

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function indexAt(time: number): number {
  const last = SHOTS.length - 1;
  const t = Math.min(Math.max(0, time), SHOTS[last].end - 0.001);
  for (let i = 0; i < SHOTS.length; i++) {
    if (t < SHOTS[i].end) return i;
  }
  return last;
}

function specFor(shot: Shot, index: number, time: number, opacity: number, role: "hold" | "out" | "in", fadeU: number): ClipSpec {
  const dur = shot.end - shot.start;
  const lead = index > 0 ? BLEND : 0;
  const span = dur + lead;
  const local = clamp01((time - (shot.start - lead)) / span);
  let scale = lerp(1.04, 1.1, local);
  if (role === "out") scale = lerp(1.04, 1.34, smooth(fadeU));
  if (role === "in") scale = lerp(1.38, 1.04, smooth(fadeU));
  return { src: shot.src, local, shotSeconds: span, opacity, scale };
}

export function clipSlots(time: number): [ClipSpec | null, ClipSpec | null] {
  const slots: [ClipSpec | null, ClipSpec | null] = [null, null];
  const i = indexAt(time);
  const shot = SHOTS[i];
  const left = shot.end - time;
  const place = (index: number, spec: ClipSpec) => {
    slots[index % 2] = spec;
  };

  if (left < BLEND && i < SHOTS.length - 1) {
    const fadeU = clamp01(1 - left / BLEND);
    const fade = smooth(fadeU);
    place(i, specFor(shot, i, time, 1 - fade, "out", fadeU));
    place(i + 1, specFor(SHOTS[i + 1], i + 1, time, fade, "in", fadeU));
    return slots;
  }

  place(i, specFor(shot, i, time, 1, "hold", 0));
  if (i < SHOTS.length - 1 && left < BLEND + 2) {
    place(i + 1, specFor(SHOTS[i + 1], i + 1, SHOTS[i + 1].start - BLEND, 0, "in", 0));
  }
  return slots;
}

export function bindVideo(video: HTMLVideoElement, spec: ClipSpec | null, speed: number, playing: boolean): number {
  if (!spec) {
    video.style.opacity = "0";
    if (!video.paused) video.pause();
    return 0;
  }

  if (video.dataset.clip !== spec.src) {
    video.dataset.clip = spec.src;
    video.style.opacity = "0";
    video.src = spec.src;
    return 0;
  }

  const hasFrame = video.videoWidth > 0;
  const shown = hasFrame ? spec.opacity : 0;
  video.style.opacity = String(shown);
  video.style.transform = `scale(${spec.scale.toFixed(4)})`;

  if (Number.isFinite(video.duration) && video.duration > 0) {
    const target = Math.min(video.duration - 0.04, Math.max(0, spec.local * video.duration));
    const drift = Math.abs(video.currentTime - target);
    const limit = playing && spec.opacity > 0.03 ? 1.15 : 0.06;
    if (drift > limit) {
      try {
        video.currentTime = target;
      } catch {
        /* not seekable yet */
      }
    }
    const rate = Math.min(2, Math.max(0.25, (video.duration / Math.max(0.25, spec.shotSeconds)) * speed));
    if (Math.abs(video.playbackRate - rate) > 0.05) video.playbackRate = rate;
  }

  const shouldPlay = playing && spec.opacity > 0.03;
  if (shouldPlay) {
    if (video.paused) void video.play().catch(() => undefined);
  } else if (!video.paused) {
    video.pause();
  }

  return shown;
}
