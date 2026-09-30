import { CHAPTERS, UNIVERSE_AGE, type Chapter } from "@/film/chapters";
import type { SceneId } from "@/film/scenes";

/** Her bölümün başında, altyazılardan önce gösterilen başlık kartının süresi. */
export const CARD = 3.2;
/** Çekimler arası geçişin yarı süresi (sn). */
export const FADE = 1.5;
/** Kaynak videoların süresi; hepsi 10 sn’lik klipler. */
export const CLIP_SECONDS = 10.04;

export type BeatSpan = { start: number; end: number };

export type ChapterSpan = {
  start: number;
  end: number;
  cardEnd: number;
  beats: BeatSpan[];
};

export type ShotSpan = {
  key: string;
  name: string;
  chapter: number;
  start: number;
  end: number;
  /** Video bu ana kadar ilk karede bekler (başlık kartı). */
  holdUntil: number;
  focus: [number, number];
  zoom: [number, number];
  scene?: SceneId;
  /** Bölümün anlatı cümlelerinin bu çekimin başına göre başlangıçları (sn). */
  beats: number[];
};

/** Okuma hızına göre cümle süresi: kısa cümle kısa, uzun cümle uzun kalır. */
function beatSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(10.5, Math.max(6.2, 1.9 + words * 0.27));
}

export const SPANS: ChapterSpan[] = (() => {
  const spans: ChapterSpan[] = [];
  let t = 0;
  for (const chapter of CHAPTERS) {
    const start = t;
    t += CARD;
    const cardEnd = t;
    const beats: BeatSpan[] = [];
    for (const beat of chapter.beats) {
      const d = beatSeconds(beat.text);
      beats.push({ start: t, end: t + d });
      t += d;
    }
    spans.push({ start, end: t, cardEnd, beats });
  }
  return spans;
})();

export const TOTAL = SPANS[SPANS.length - 1].end;

export const SHOTS: ShotSpan[] = (() => {
  const shots: ShotSpan[] = [];
  CHAPTERS.forEach((chapter, ci) => {
    const span = SPANS[ci];
    chapter.shots.forEach((shot, si) => {
      const start = shot.fromBeat === 0 ? span.start : span.beats[shot.fromBeat].start;
      const next = chapter.shots[si + 1];
      const end = next ? span.beats[next.fromBeat].start : span.end;
      shots.push({
        key: `${chapter.id}-${shot.name}`,
        name: shot.name,
        chapter: ci,
        start,
        end,
        holdUntil: shot.fromBeat === 0 ? span.cardEnd : start,
        focus: shot.focus,
        zoom: shot.zoom,
        scene: shot.scene,
        beats: span.beats.map((b) => b.start - start),
      });
    });
  });
  return shots;
})();

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export type Position = {
  index: number;
  beat: number;
  inCard: boolean;
  /** Bölüm içindeki ilerleme, 0–1. */
  progress: number;
};

export function locate(time: number): Position {
  const t = clamp(time, 0, TOTAL);
  let index = SPANS.length - 1;
  for (let i = 0; i < SPANS.length; i++) {
    if (t < SPANS[i].end) {
      index = i;
      break;
    }
  }
  const span = SPANS[index];
  let beat = 0;
  for (let b = 0; b < span.beats.length; b++) {
    if (t >= span.beats[b].start) beat = b;
  }
  return {
    index,
    beat,
    inCard: t < span.cardEnd,
    progress: clamp((t - span.start) / (span.end - span.start), 0, 1),
  };
}

export function shotIndexAt(time: number): number {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    if (time >= SHOTS[i].start) return i;
  }
  return 0;
}

/** Filmin `time` anında tasvir ettiği zaman, "yıl önce". Cümleler arasında logaritmik akar. */
export function yearsAgoAt(time: number): number {
  const pos = locate(time);
  const chapter: Chapter = CHAPTERS[pos.index];
  const span = SPANS[pos.index];
  if (pos.inCard) return chapter.beats[0].ya;
  const b = span.beats[pos.beat];
  const from = chapter.beats[pos.beat].ya;
  const to = chapter.beats[pos.beat + 1]?.ya ?? chapter.endYa;
  const u = smoothstep((time - b.start) / (b.end - b.start));
  return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * u);
}

const tr3 = new Intl.NumberFormat("tr-TR", { maximumSignificantDigits: 3 });

export function formatYearsAgo(ya: number): string {
  if (ya >= 1e9) return `${tr3.format(ya / 1e9)} milyar yıl önce`;
  if (ya >= 1e6) return `${tr3.format(ya / 1e6)} milyon yıl önce`;
  if (ya >= 1e3) return `${tr3.format(ya / 1e3)} bin yıl önce`;
  return `${Math.round(ya)} yıl önce`;
}

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type CalendarDate = { label: string; fraction: number };

/**
 * Carl Sagan’ın kozmik takvimi: evrenin bütün tarihi tek bir yıla sığdırılır.
 * Büyük Patlama 1 Ocak gece yarısı, bugün 31 Aralık gece yarısı.
 */
export function cosmicCalendar(ya: number): CalendarDate {
  const fraction = clamp(1 - ya / UNIVERSE_AGE, 0, 1);
  const dayFloat = Math.min(fraction * 365, 365 - 1e-6);
  let day = Math.floor(dayFloat);
  let month = 0;
  while (day >= MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month++;
  }
  const date = `${day + 1} ${MONTHS[month]}`;
  const showClock = (month === 0 && day === 0) || (month === 11 && day === 30);
  if (!showClock) return { label: date, fraction };
  const minutes = Math.floor((dayFloat - Math.floor(dayFloat)) * 1440);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return { label: `${date}, ${hh}:${mm}`, fraction };
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
