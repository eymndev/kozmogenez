/**
 * İllüstrasyon araç kutusu: yumuşak hareket eğrileri, önbelleğe alınmış ışık ve top
 * görselleri, pürüzsüz organik şekiller, gölgeli gezegenler, kamera ve paralaks.
 * Kurzgesagt tarzı düz ama katmanlı, ışıklı çizimler için.
 */
import { clamp01, hash, type Ctx, type SceneFrame } from "@/film/scenes/kit";

/* ---------- Hareket eğrileri ---------- */

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t * t * t,
  /** Hedefi biraz aşıp geri oturur: nesneler canlı “pop” ile belirir. */
  back: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/** `a` ile `b` saniyeleri arasında 0→1, verilen eğriyle. */
export function phase(t: number, a: number, b: number, fn: (x: number) => number = ease.inOut) {
  return fn(clamp01((t - a) / (b - a)));
}

/** Belirme: 0’dan 1’e hafif taşarak; kaybolmak için `until` verilebilir. */
export function pop(t: number, at: number, dur = 0.6, until = Infinity, out = 0.4) {
  if (t < at) return 0;
  const inK = ease.back(clamp01((t - at) / dur));
  if (t < until) return inK;
  return inK * (1 - ease.inOut(clamp01((t - until) / out)));
}

/** Yavaş, sürekli “nefes”: -1..1 aralığında pürüzsüz salınım. */
export function breathe(t: number, speed = 1, seed = 0) {
  return Math.sin(t * speed + seed * 2.3) * 0.6 + Math.sin(t * speed * 0.53 + seed * 5.1) * 0.4;
}

/* ---------- Renk ---------- */

export type RGB = [number, number, number];

export function hex(value: string): RGB {
  const v = value.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgba(c: RGB, alpha = 1) {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
}

/* ---------- Önbellekli görseller ---------- */

const sprites = new Map<string, HTMLCanvasElement>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Yumuşak ışık lekesi; bir kez çizilir, her karede yalnızca kopyalanır. */
export function glowSprite(color: RGB): HTMLCanvasElement {
  const key = `g${color.map(Math.round).join(",")}`;
  let c = sprites.get(key);
  if (c) return c;
  c = canvas(128, 128);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.18, rgba(color, 0.7));
  grad.addColorStop(0.45, rgba(color, 0.22));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  sprites.set(key, c);
  return c;
}

export function drawGlow(ctx: Ctx, x: number, y: number, r: number, color: RGB, alpha = 1) {
  if (alpha <= 0.003 || r <= 0.5) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

/** Gölgeli top: taban renk, sağ altta gölge hilali, sol üstte parıltı. */
export function ballSprite(base: RGB, shade: RGB, light: RGB): HTMLCanvasElement {
  const key = `b${base.join(",")}|${shade.join(",")}|${light.join(",")}`;
  let c = sprites.get(key);
  if (c) return c;
  const S = 64;
  const r = S / 2 - 1;
  c = canvas(S, S);
  const g = c.getContext("2d")!;
  g.fillStyle = rgba(shade);
  g.beginPath();
  g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = rgba(base);
  g.beginPath();
  g.arc(S / 2 - r * 0.16, S / 2 - r * 0.16, r * 0.92, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba(light, 0.85);
  g.beginPath();
  g.ellipse(S / 2 - r * 0.38, S / 2 - r * 0.4, r * 0.24, r * 0.16, -0.7, 0, Math.PI * 2);
  g.fill();
  g.restore();
  sprites.set(key, c);
  return c;
}

/**
 * Çok sayıda küçük, gölgeli topu tek seferde çizer: önce hepsinin gölge rengi, sonra biraz
 * yukarı-sola kaymış taban rengi, en son parıltılar. Yüzlerce ayrı `drawImage` yerine üç dolgu.
 * `pts`: art arda x, y, r üçlüleri.
 */
export function drawBalls(ctx: Ctx, pts: number[], base: RGB, shade: RGB, light: RGB, alpha = 1) {
  if (alpha <= 0.003 || pts.length < 3) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  const layers: [RGB, number, number, number, number][] = [
    [shade, 0, 0, 1, 1],
    [base, -0.08, -0.08, 0.88, 0.88],
    [light, -0.36, -0.38, 0.26, 0.17],
  ];
  for (const [color, ox, oy, rx, ry] of layers) {
    ctx.fillStyle = rgba(color, color === light ? 0.85 : 1);
    ctx.beginPath();
    for (let i = 0; i + 2 < pts.length; i += 3) {
      const r = pts[i + 2];
      if (r <= 0.2) continue;
      const x = pts[i] + ox * r;
      const y = pts[i + 1] + oy * r;
      ctx.moveTo(x + rx * r, y);
      ctx.ellipse(x, y, rx * r, ry * r, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = prev;
}

export function drawSprite(
  ctx: Ctx,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  r: number,
  alpha = 1,
) {
  if (alpha <= 0.003 || r <= 0.2) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

const layers = new Map<string, HTMLCanvasElement>();

/**
 * Pahalı ama değişmeyen katmanı (gökyüzü, yıldızlar, uzak tepeler) boyut başına bir kez
 * çizer. `over`: paralaks kayması için kenarlardan taşan pay.
 */
export function layer(
  f: SceneFrame,
  key: string,
  draw: (g: Ctx, w: number, h: number) => void,
  over = 0,
): HTMLCanvasElement {
  const W = f.w * (1 + over * 2);
  const H = f.h * (1 + over * 2);
  const k = `${key}:${Math.round(W)}x${Math.round(H)}@${f.dpr}`;
  let c = layers.get(k);
  if (c) return c;
  if (layers.size > 40) layers.clear();
  c = canvas(W * f.dpr, H * f.dpr);
  const g = c.getContext("2d")!;
  g.scale(f.dpr, f.dpr);
  draw(g, W, H);
  layers.set(k, c);
  return c;
}

/**
 * Ekrandan geniş, değişmeyen dünya bölgesi (deniz tabanı, uzak siluetler): [x0,x1]×[y0,y1]
 * bölgesi dünya koordinatlarıyla bir kez çizilir, sonra her karede yalnızca kopyalanır.
 */
export function sheet(
  f: SceneFrame,
  key: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  draw: (g: Ctx) => void,
) {
  const W = x1 - x0;
  const H = y1 - y0;
  const k = `${key}:${Math.round(f.w)}x${Math.round(f.h)}@${f.dpr}`;
  let c = layers.get(k);
  if (!c) {
    if (layers.size > 40) layers.clear();
    c = canvas(W * f.dpr, H * f.dpr);
    const g = c.getContext("2d")!;
    g.scale(f.dpr, f.dpr);
    g.translate(-x0, -y0);
    draw(g);
    layers.set(k, c);
  }
  f.ctx.drawImage(c, x0, y0, W, H);
}

/**
 * Küçük, değişmeyen çizim (sünger, kaya, kavkı): yerel koordinatlarda (0..w, 0..h) bir kez
 * çizilir. Kamera yakınlaşınca da keskin kalsın diye biraz fazla çözünürlükle saklanır.
 */
export function stamp(
  f: SceneFrame,
  key: string,
  w: number,
  h: number,
  draw: (g: Ctx) => void,
): HTMLCanvasElement {
  const k = `${key}:${Math.round(w)}x${Math.round(h)}@${f.dpr}`;
  let c = sprites.get(k);
  if (c) return c;
  if (sprites.size > 600) sprites.clear();
  const q = f.dpr * 1.25;
  c = canvas(w * q, h * q);
  const g = c.getContext("2d")!;
  g.scale(q, q);
  draw(g);
  sprites.set(k, c);
  return c;
}

/** Önbellekli katmanı çizer; `dx, dy` paralaks kayması (px). */
export function drawLayer(
  f: SceneFrame,
  img: HTMLCanvasElement,
  over = 0,
  dx = 0,
  dy = 0,
  alpha = 1,
) {
  if (alpha <= 0.003) return;
  const W = f.w * (1 + over * 2);
  const H = f.h * (1 + over * 2);
  const prev = f.ctx.globalAlpha;
  f.ctx.globalAlpha = prev * alpha;
  f.ctx.drawImage(img, -f.w * over + dx, -f.h * over + dy, W, H);
  f.ctx.globalAlpha = prev;
}

/* ---------- Şekiller ---------- */

/** Noktalardan geçen pürüzsüz eğri (Catmull-Rom). `closed` kapalı şekil üretir. */
export function curve(ctx: CanvasPath, pts: [number, number][], closed = false) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
}

/** Organik, hafifçe dalgalanan kapalı şekil (hücre, bulut, kıta). */
export function blob(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  seed: number,
  opts: { wobble?: number; t?: number; n?: number; sx?: number; sy?: number; live?: number } = {},
) {
  const n = opts.n ?? 10;
  const wobble = opts.wobble ?? 0.18;
  const t = opts.t ?? 0;
  const live = opts.live ?? 0.05;
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr =
      r *
      (1 + wobble * (hash(seed * 13.7 + k) * 2 - 1) + live * Math.sin(t * 1.3 + k * 2.1 + seed));
    pts.push([x + Math.cos(a) * rr * (opts.sx ?? 1), y + Math.sin(a) * rr * (opts.sy ?? 1)]);
  }
  ctx.beginPath();
  curve(ctx, pts, true);
}

/** Dört köşeli yıldız pırıltısı. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number, color: string, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = rot + (k * Math.PI) / 4;
    const rr = k % 2 === 0 ? r : r * 0.2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Dalgalı çizgi: foton gibi. `append`: çizgiyi mevcut yola ekler, çok sayıda dalga tek seferde çizilsin diye. */
export function wave(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  cycles: number,
  shift = 0,
  append = false,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(8, Math.round(cycles * 10));
  if (!append) ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const o = Math.sin(u * cycles * Math.PI * 2 + shift) * amp * Math.sin(u * Math.PI);
    const px = x1 + dx * u + nx * o;
    const py = y1 + dy * u + ny * o;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

/**
 * Kurzgesagt tarzı gezegen: düz taban renk, ayrıntılar, sağ altta yumuşak kenarlı gölge,
 * sol üst kenarda ince ışık hilali ve dışta atmosfer ışıması. Işık sol üstten gelir.
 */
export function planet(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  opts: {
    base: RGB;
    shade?: RGB;
    rim?: RGB;
    atmo?: RGB;
    atmoAlpha?: number;
    detail?: (ctx: Ctx) => void;
    night?: number;
  },
) {
  if (opts.atmo) drawGlow(ctx, x, y, r * 1.55, opts.atmo, opts.atmoAlpha ?? 0.55);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = rgba(opts.base);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  opts.detail?.(ctx);
  // Gölge: kayık bir daire, kenarı yumuşak geçişli.
  const shade = opts.shade ?? [10, 12, 30];
  const sx = x + r * 0.55;
  const sy = y + r * 0.42;
  const g = ctx.createRadialGradient(sx, sy, r * 0.55, sx, sy, r * 1.25);
  g.addColorStop(0, rgba(shade, opts.night ?? 0.72));
  g.addColorStop(0.55, rgba(shade, (opts.night ?? 0.72) * 0.75));
  g.addColorStop(1, rgba(shade, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  // Işık hilali.
  if (opts.rim) {
    ctx.save();
    ctx.strokeStyle = rgba(opts.rim, 0.55);
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.985, Math.PI * 0.95, Math.PI * 1.75);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Kamera ---------- */

export type Cam = { x: number; y: number; z: number };

/**
 * Anahtar karelerden kamera: [zaman, x, y, yakınlık]. x ve y ekran genişliği/yüksekliği
 * oranında kayma; aralar yumuşak eğriyle doldurulur.
 */
export function camera(t: number, keys: [number, number, number, number][]): Cam {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, x0, y0, z0] = keys[i];
    const [t1, x1, y1, z1] = keys[i + 1];
    if (t <= t1) {
      const u = ease.inOut(clamp01((t - t0) / (t1 - t0)));
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, z: z0 * Math.pow(z1 / z0, u) };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k[1], y: k[2], z: k[3] };
}

/** Dünya koordinatlarını kameraya göre ekrana uygular; `depth` < 1 uzak katmanlar içindir. */
export function applyCam(f: SceneFrame, cam: Cam, depth = 1) {
  const z = 1 + (cam.z - 1) * depth;
  f.ctx.translate(f.w / 2, f.h / 2);
  f.ctx.scale(z, z);
  f.ctx.translate(-f.w / 2 - cam.x * f.w * depth, -f.h / 2 - cam.y * f.h * depth);
}

/** Dünya noktasının ekrandaki yeri (etiketler kamerasız çizildiği için). */
export function project(
  f: SceneFrame,
  cam: Cam,
  x: number,
  y: number,
  depth = 1,
): [number, number] {
  const z = 1 + (cam.z - 1) * depth;
  return [
    f.w / 2 + (x - f.w / 2 - cam.x * f.w * depth) * z,
    f.h / 2 + (y - f.h / 2 - cam.y * f.h * depth) * z,
  ];
}

/* ---------- Hazır arka planlar ---------- */

/** Uzay: dikey renk geçişi, yumuşak bulutsular, farklı parlaklıkta yıldızlar ve pırıltılar. */
export function spaceLayer(
  top: RGB,
  bottom: RGB,
  nebulae: [number, number, number, RGB, number][],
  seed = 1,
  density = 1,
) {
  return (g: Ctx, w: number, h: number) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgba(top));
    grad.addColorStop(1, rgba(bottom));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (const [nx, ny, nr, color, a] of nebulae)
      drawGlow(g, nx * w, ny * h, nr * Math.max(w, h), color, a);
    const m = Math.min(w, h) / 800;
    const count = Math.round((420 * density * (w * h)) / (1280 * 800));
    for (let i = 0; i < count; i++) {
      const x = hash(seed * 91 + i * 1.7) * w;
      const y = hash(seed * 37 + i * 2.3) * h;
      const b = hash(seed + i * 3.1);
      const r = (b > 0.97 ? 1.6 : b > 0.85 ? 1.1 : 0.7) * Math.max(0.7, m);
      g.fillStyle = `rgba(255,248,235,${0.25 + b * 0.6})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 14 * density; i++) {
      const x = hash(seed * 7 + i * 5.3) * w;
      const y = hash(seed * 11 + i * 7.9) * h;
      const r = (3 + hash(i + seed) * 5) * Math.max(0.7, m);
      drawGlow(g, x, y, r * 2.4, [255, 240, 220], 0.35);
      sparkle(g, x, y, r, "rgba(255,248,235,0.9)");
    }
  };
}

/** Pırıldayan birkaç yıldız: arka plan katmanının üstüne her kare çizilir. */
export function twinkles(f: SceneFrame, seed: number, count = 18, alpha = 1) {
  const { ctx, w, h, t, s } = f;
  const prev = ctx.globalAlpha;
  for (let i = 0; i < count; i++) {
    const x = hash(seed * 13 + i * 4.1) * w;
    const y = hash(seed * 17 + i * 6.7) * h;
    const k = 0.5 + 0.5 * Math.sin(t * (1.2 + hash(i) * 1.6) + i * 2.1);
    const r = (2 + hash(i + 3) * 3.5) * s * (0.6 + 0.4 * k);
    ctx.globalAlpha = prev * alpha * k;
    sparkle(ctx, x, y, r, "rgba(255,250,240,0.95)", t * 0.2 + i);
  }
  ctx.globalAlpha = prev;
}
