/** Kodla çizilen sahneler için ortak yardımcılar. Her şey zamanın saf fonksiyonudur: geri sarınca aynı kare çıkar. */

export type Ctx = CanvasRenderingContext2D;

export type SceneFrame = {
  ctx: Ctx;
  w: number;
  h: number;
  /** Çekimin başından beri geçen süre (sn). */
  t: number;
  /** Çekimin toplam süresi (sn). */
  dur: number;
  /** Anlatı cümlelerinin çekim başına göre başlangıçları (sn); ilki başlık kartının bitişi. */
  beats: number[];
  /** Kısa kenara göre ölçek: 800 px için 1. */
  s: number;
};

export type Scene = (f: SceneFrame) => void;

export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** `a` ile `b` saniyeleri arasında 0→1 yumuşak geçiş. */
export function span(t: number, a: number, b: number): number {
  return smooth((t - a) / (b - a));
}

export function wrap(v: number, size: number): number {
  return ((v % size) + size) % size;
}

export function glow(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer = "rgba(0,0,0,0)",
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
  ctx.fill();
}

export function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Belgesel grafiği tarzında küçük etiket: nokta, ince çizgi ve yazı. */
export function callout(
  f: SceneFrame,
  x: number,
  y: number,
  text: string,
  alpha: number,
  dir: 1 | -1 = 1,
  sub?: string,
) {
  if (alpha <= 0.01) return;
  const { ctx, s } = f;
  const len = 34 * s;
  const ex = x + dir * len;
  const ey = y - len * 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(243,238,226,0.7)";
  ctx.lineWidth = Math.max(1, 1 * s);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + dir * 10 * s, ey);
  ctx.stroke();
  dot(ctx, x, y, 2.2 * s, "rgba(243,238,226,0.9)");
  ctx.fillStyle = "rgba(243,238,226,0.95)";
  ctx.font = `500 ${Math.round(Math.max(11, 13 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = dir === 1 ? "left" : "right";
  ctx.textBaseline = "middle";
  ctx.fillText(text, ex + dir * 14 * s, ey);
  if (sub) {
    ctx.fillStyle = "rgba(168,161,148,0.95)";
    ctx.font = `400 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(sub, ex + dir * 14 * s, ey + 15 * s);
  }
  ctx.restore();
}

/** Sahnenin görsel merkezi: dikey ekranda üst bölgede, yatayda biraz yukarıda. */
export function center(f: SceneFrame): [number, number] {
  return [f.w * 0.5, f.h * (f.w < f.h ? 0.46 : 0.42)];
}

const images = new Map<string, HTMLImageElement>();

/** Sahnelerin kullandığı hazır görselleri (ör. gökyüzü haritası) bir kez yükler. */
export function image(src: string): HTMLImageElement | null {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Sahne üstünde küçük, okunaklı bir başlık/ölçüm kutusu. */
export function badge(f: SceneFrame, x: number, y: number, text: string, alpha: number) {
  if (alpha <= 0.01) return;
  const { ctx, s } = f;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = 12 * s;
  ctx.fillStyle = "rgba(5,6,10,0.6)";
  roundRect(ctx, x - tw / 2 - pad, y - 14 * s, tw + pad * 2, 28 * s, 14 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(243,238,226,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Etiketlerin başlık, takvim ve altyazılarla çakışmayacağı güvenli bölge. */
export function safe(f: SceneFrame, x: number, y: number): boolean {
  const portrait = f.w < f.h;
  return (
    x > f.w * 0.14 &&
    x < f.w * 0.8 &&
    y > f.h * (portrait ? 0.3 : 0.24) &&
    y < f.h * (portrait ? 0.78 : 0.56)
  );
}

/**
 * Etiketlenecek örneği seçer: `at(i, zaman)` konumunu verir; seçim etiketin belirdiği
 * andaki konuma göre yapılır ki etiket sonra nesneden nesneye atlamasın.
 */
export function pick(
  f: SceneFrame,
  at: (i: number, time: number) => [number, number],
  from: number,
  count: number,
  when: number,
  accept: (x: number, y: number) => boolean = () => true,
): number {
  for (let k = 0; k < count; k++) {
    const i = from + k;
    const [x, y] = at(i, when);
    if (safe(f, x, y) && accept(x, y)) return i;
  }
  return from;
}

/** `at(i, when)` konumu hedef noktaya en yakın örneği seçer; etiketleri sabit yerlere oturtmak için. */
export function nearest(
  at: (i: number, time: number) => [number, number],
  from: number,
  count: number,
  when: number,
  target: [number, number],
): number {
  let best = from;
  let bestD = Infinity;
  for (let k = 0; k < count; k++) {
    const [x, y] = at(from + k, when);
    const d = Math.hypot(x - target[0], y - target[1]);
    if (d < bestD) {
      bestD = d;
      best = from + k;
    }
  }
  return best;
}
