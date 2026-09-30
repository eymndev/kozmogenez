import {
  badge,
  callout,
  hash,
  roundRect,
  wrap,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";
import {
  applyCam,
  ballSprite,
  blob,
  camera,
  curve,
  drawGlow,
  drawSprite,
  ease,
  hex,
  mix,
  phase,
  pop,
  project,
  rgba,
  sheet,
  stamp,
  type Cam,
  type RGB,
} from "@/film/scenes/art";

/**
 * Denizden karaya. Ediyakara’nın yumuşak, yassı canlıları; kamera sağa kayarken Kambriyen
 * resifi “patlar”: süngerler, arkeosiyatlar, trilobitler, Hallucigenia, Opabinia, ilk
 * omurgalılar ve onları kollayan Anomalocaris. Sonra su yüzeyine çıkılır: Devoniyen
 * kıyısında önce bitkiler ve çokayaklılar, ardından ormanlar ve çamura yüzgeçleriyle
 * dayanan Tiktaalik.
 */
export function land(f: SceneFrame) {
  const { ctx, w, h, t, beats } = f;
  const rise = phase(t, beats[2] - 0.5, beats[2] + 1.1, ease.inOut);
  if (rise > 0) {
    ctx.save();
    ctx.translate(0, -(1 - rise) * h * 0.25);
    shore(f);
    ctx.restore();
  }
  if (rise >= 1) return;
  if (rise <= 0) {
    sea(f);
    return;
  }
  // Yüzeye çıkış: su yüzeyi ekranda aşağı kayar; üstünde kıyı, altında deniz.
  const ys = -0.04 * h + rise * h * 1.1;
  const line = surfaceLine(f, ys);
  ctx.save();
  ctx.beginPath();
  curve(ctx, line);
  ctx.lineTo(w * 1.1, h + 10);
  ctx.lineTo(-w * 0.1, h + 10);
  ctx.closePath();
  ctx.clip();
  ctx.translate(0, ys + 0.04 * h);
  sea(f);
  ctx.restore();
  surface(f, line, ys);
}

/* ---------- Ortak ---------- */

type Pt = [number, number];
type Pal = { base: string; dark: string; light: string };
type Item = { y: number; draw: () => void };
type Stamp = { img: HTMLCanvasElement; w: number; h: number; ax: number; ay: number };

const TAU = Math.PI * 2;
const pal = (base: string, dark: string, light: string): Pal => ({ base, dark, light });

const FROND = [
  pal("#f59f7f", "#cf6f5c", "#ffd3bc"),
  pal("#f6b97e", "#cf8a56", "#ffdfb6"),
  pal("#ef90a4", "#c3627c", "#ffc6d1"),
];
const DICK = pal("#f3b3a0", "#d0857a", "#ffdace");
const KIMB = pal("#b996dc", "#8a69b6", "#ddc9f4");
const TRIB = pal("#f5cf8c", "#d2a560", "#fff0c6");
const FRACTO = pal("#eab08f", "#c98567", "#ffd8c0");
const CLOUDINA = pal("#efe5cc", "#c4ae88", "#ffffff");
const CUP = pal("#f1d9aa", "#cfa977", "#fff3d8");
const SPONGE = [
  pal("#f39c3f", "#c7722b", "#ffca7c"),
  pal("#f4cf4f", "#c9a02e", "#fff093"),
  pal("#9b76da", "#6f4fb2", "#c6aaf6"),
  pal("#ea6a5c", "#bb4a41", "#ffa497"),
];
const CHOIA = pal("#f5d86e", "#caa941", "#fff4b8");
const ROCK = pal("#8f82a0", "#62577a", "#bbaecb");
const SHELL = pal("#ecd2a8", "#c5a57a", "#fff3da");
const TRILO = [
  pal("#c18f69", "#8c6045", "#ebc39c"),
  pal("#cc9a67", "#98673d", "#f3cf9e"),
  pal("#ad9280", "#786052", "#dbc3b0"),
];
const HALLU = pal("#f38fb2", "#c7628a", "#ffc6da");
const WIWA = [hex("6d86e0"), hex("7f6ee0"), hex("58a9d8"), hex("8fa2ff")];
const OPAB = pal("#e77b5c", "#b75340", "#ffb092");
const ANOM = pal("#e0674f", "#ad4436", "#ff9f87");
const FISH = pal("#93cbe0", "#4c87a4", "#e8fbff");
const ALGAE = [pal("#4cb38b", "#2c8768", "#91e4ba"), pal("#e06a88", "#b24866", "#ffa6bd")];
const OTTO = pal("#f19ab1", "#c96a88", "#ffcbd9");
const SIL = pal("#0a2944", "#061a2e", "#1f4f70");
const WATER: RGB = hex("2f93c0");

/** Uzaktaki nesneler suyun rengine karışır. */
function haze(p: Pal, k: number): Pal {
  if (k <= 0.01) return p;
  const m = (c: string) => rgba(mix(hex(c), WATER, k));
  return { base: m(p.base), dark: m(p.dark), light: m(p.light) };
}

function ell(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  return p;
}

function rrect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

/** Organik, yamuk yumru (kaya, moloz). */
function blobPath(
  x: number,
  y: number,
  r: number,
  seed: number,
  sy: number,
  wobble: number,
): Path2D {
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    const rr = r * (1 + wobble * (hash(seed * 13.7 + k) * 2 - 1));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * sy]);
  }
  const p = new Path2D();
  curve(p, pts, true);
  return p;
}

/**
 * Kurzgesagt tarzı iki tonlu gölge: sağ altta koyu hilal, sol üstte ince ışık kenarı.
 * `o` hilalin kalınlığıdır.
 */
function toon(ctx: Ctx, path: Path2D, p: Pal, o: number) {
  ctx.fillStyle = p.dark;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.translate(-o, -o);
  ctx.fillStyle = p.light;
  ctx.fill(path);
  ctx.clip(path);
  ctx.translate(o * 1.6, o * 1.6);
  ctx.fillStyle = p.base;
  ctx.fill(path);
  ctx.restore();
}

/** Önbellekli küçük çizim; `(ax, ay)` yere basan noktası. */
function makeStamp(
  f: SceneFrame,
  key: string,
  w: number,
  h: number,
  ax: number,
  ay: number,
  draw: (g: Ctx) => void,
): Stamp {
  return { img: stamp(f, key, w, h, draw), w, h, ax, ay };
}

function place(ctx: Ctx, st: Stamp, x: number, y: number, k = 1, alpha = 1) {
  if (k <= 0.01 || alpha <= 0.01) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  // Belirirken önce yukarı doğru uzar: canlı büyüyormuş gibi.
  const kx = Math.min(1, k * 1.15) * (k > 1 ? k : 1);
  ctx.drawImage(st.img, x - st.ax * kx, y - st.ay * k, st.w * kx, st.h * k);
  ctx.globalAlpha = prev;
}

/* ---------- Deniz: yerleşim ve kamera ---------- */

function floorY(f: SceneFrame) {
  return f.h * (f.w > f.h ? 0.6 : 0.56);
}

/** Tabanda derinlik: 0 arka kenar, 1 ön. */
function depthY(f: SceneFrame, d: number) {
  const fy = floorY(f);
  return fy + d * (f.h - fy) * 0.62;
}

function depthK(d: number) {
  return 0.72 + d * 0.5;
}

function seaCam(f: SceneFrame): Cam {
  const { t, beats } = f;
  const [, b1, b2] = beats;
  return camera(t, [
    [0, 0, 0, 1],
    [b1 - 1.5, 0.05, 0, 1.045],
    [b1 + 0.9, 1.08, 0, 1],
    [b2 + 1, 1.19, 0, 1.04],
  ]);
}

function onScreen(f: SceneFrame, cam: Cam, x: number, margin: number) {
  const sx = f.w / 2 + (x - f.w / 2 - cam.x * f.w) * cam.z;
  return sx > -margin && sx < f.w + margin;
}

/** Kambriyen nesnelerinin belirme anı: kamera yaklaştıkça sırayla, soldan sağa. */
function popAt(f: SceneFrame, u: number, i: number) {
  return f.beats[1] - 0.8 + (u - 1.3) * 1.3 + hash(i * 3.7) * 0.3;
}

// x (w), derinlik, boy (h), diskli mi, palet
const FRONDS: [number, number, number, boolean, number][] = [
  [0.2, 0, 0.16, false, 1],
  [0.52, 0.02, 0.18, false, 2],
  [0.67, 0, 0.14, true, 0],
  [0.87, 0.02, 0.17, false, 1],
  [0.08, 0.3, 0.34, true, 0],
  [0.31, 0.46, 0.4, true, 2],
  [0.44, 0.18, 0.27, false, 0],
  [0.58, 0.3, 0.31, true, 1],
  [0.78, 0.44, 0.37, true, 2],
  [0.96, 0.22, 0.26, false, 0],
];
// x, derinlik, yarıçap, yön
const DICKS: [number, number, number, number][] = [
  [0.645, 0.22, 36, 1],
  [0.78, 0.1, 24, -1],
  [0.9, 0.6, 40, -1],
  [0.35, 0.3, 30, 1],
];
const KIMBS: [number, number, number][] = [
  [0.92, 0.42, 62],
  [0.22, 0.5, 48],
];
const TRIBS: [number, number][] = [
  [0.16, 0.7],
  [0.5, 0.62],
  [0.71, 0.33],
  [0.98, 0.28],
  [0.42, 0.84],
];
const FRACTOS: [number, number][] = [
  [0.27, 0.76],
  [0.68, 0.84],
  [0.84, 0.2],
];
const CLOUDINAS: [number, number][] = [
  [0.47, 0.48],
  [0.92, 0.1],
  [0.12, 0.22],
];

// Kambriyen: x (w), derinlik, tür/boy
const MOUNDS: [number, number, number][] = [
  [1.8, 0.02, 1],
  [1.2, 0.05, 0.7],
  [2.34, 0.04, 0.85],
];
// x, derinlik, tür (0 tüp, 1 dallı, 2 Choia), boy, palet
const SPONGES: [number, number, number, number, number][] = [
  [1.52, 0.3, 0, 0.21, 0],
  [1.93, 0.46, 0, 0.14, 1],
  [2.2, 0.26, 0, 0.18, 3],
  [1.29, 0.52, 0, 0.12, 1],
  [1.38, 0.2, 1, 0.17, 2],
  [2.05, 0.12, 1, 0.13, 2],
  [1.63, 0.56, 2, 16, 0],
  [1.87, 0.3, 2, 13, 0],
  [2.13, 0.62, 2, 18, 0],
];
const SHELLS: [number, number][] = [
  [1.46, 0.64],
  [1.73, 0.74],
  [2.02, 0.52],
  [2.37, 0.66],
];
const ROCKS: [number, number, number][] = [
  [1.1, 0.42, 30],
  [1.67, 0.14, 22],
  [2.29, 0.52, 34],
];
const TUFTS: [number, number, number][] = [
  [1.14, 0.36, 0],
  [1.43, 0.1, 1],
  [1.77, 0.4, 0],
  [2.17, 0.42, 1],
  [2.42, 0.22, 0],
];
const WORMS: [number, number][] = [
  [1.7, 0.62],
  [2.09, 0.74],
];
// x, derinlik, yön, hız, boy, palet
const TRILOS: [number, number, number, number, number, number][] = [
  [1.84, 0.26, -1, 9, 62, 0],
  [1.6, 0.5, 1, 7, 50, 1],
  [2.1, 0.36, -1, 8, 44, 2],
  [1.34, 0.4, 1, 10, 42, 0],
  [2.28, 0.6, -1, 6, 54, 1],
];

function frondBend(t: number, u: number, i: number) {
  // Tabandan geçen yavaş bir akıntı dalgası: yapraklar sırayla eğilir.
  return 0.09 * Math.sin(t * 0.6 - u * 3 + i * 0.4) + 0.035 * Math.sin(t * 1.25 + i * 2);
}

function frondGeo(f: SceneFrame, i: number) {
  const [u, d, len] = FRONDS[i];
  return { x: u * f.w, y: depthY(f, d), L: len * f.h * (0.85 + d * 0.3) };
}

function dickAt(f: SceneFrame, i: number) {
  const { w, t, s } = f;
  const [u, d, r, dir] = DICKS[i];
  // Dickinsonia kayar, durur, beslenir, yine kayar: geride gövde biçimli izler kalır.
  const period = 3.4 + i * 0.3;
  const time = t / period + i * 0.37;
  const n = Math.floor(time);
  const glide = ease.inOut(Math.min(1, Math.max(0, (time - n - 0.62) / 0.38)));
  const step = 15 * s * dir;
  return {
    x: u * w + (n + glide) * step,
    y: depthY(f, d),
    r: r * depthK(d) * s,
    glide,
    step,
  };
}

function kimbAt(f: SceneFrame, i: number) {
  const [u, d, L] = KIMBS[i];
  return { x0: u * f.w, x: u * f.w - f.t * 4 * f.s, y: depthY(f, d), L: L * depthK(d) * f.s };
}

function triloAt(f: SceneFrame, i: number) {
  const { w, t, s, beats } = f;
  const [u, d, dir, v, L, p] = TRILOS[i];
  const walked = Math.max(0, t - (beats[1] - 1.5)) * v * s;
  return {
    x0: u * w,
    x: u * w + walked * dir,
    y: depthY(f, d),
    L: L * depthK(d) * s,
    dir,
    p,
    walked,
  };
}

function anomAt(f: SceneFrame) {
  const { w, h, t, s, beats } = f;
  const u = t - beats[1];
  return {
    x: 2.18 * w - u * 0.07 * w,
    y: h * (w > h ? 0.28 : 0.3) + Math.sin(u * 0.9) * 12 * s,
    tilt: Math.cos(u * 0.9) * 0.05,
    L: 300 * s,
  };
}

function schoolAt(f: SceneFrame, i: number) {
  const { w, h, t, s, beats } = f;
  const u = t - beats[1];
  const lead = 1.4 * w + u * 0.02 * w;
  const bx =
    lead - (i % 4) * 42 * s - Math.floor(i / 4) * 21 * s + Math.sin(t * 0.8 + i * 1.7) * 6 * s;
  const by =
    h * (w > h ? 0.41 : 0.44) +
    (Math.floor(i / 4) - 0.5) * 30 * s +
    (i % 2) * 10 * s +
    Math.sin(t * 1.1 + i * 2.3) * 5 * s;
  // Avcı yaklaşınca sürü dağılır.
  const A = anomAt(f);
  const hx = A.x - A.L * 0.4;
  const dx = bx - hx;
  const dy = by - A.y;
  const dist = Math.hypot(dx, dy) || 1;
  const R = Math.max(w, h) * 0.22;
  const push = Math.max(0, 1 - dist / R) ** 2 * 90 * s;
  return {
    x: bx + (dx / dist) * push,
    y: by + (dy / dist) * push * 1.4,
    fear: push / (90 * s),
  };
}

/* ---------- Deniz ---------- */

function sea(f: SceneFrame) {
  const { ctx, w, h } = f;
  const cam = seaCam(f);
  const fy = floorY(f);

  ctx.save();
  applyCam(f, cam, 0.2);
  sheet(f, "kara-su", -0.45 * w, -0.06 * h, 1.5 * w, 1.06 * h, (g) => waterBack(g, f, fy));
  ctx.restore();

  rays(f, cam, fy);

  ctx.save();
  applyCam(f, cam, 0.5);
  sheet(f, "kara-uzak", -0.4 * w, fy - 0.3 * h, 2 * w, fy + 0.05 * h, (g) => farLife(g, f, fy));
  ctx.restore();

  ctx.save();
  applyCam(f, cam);
  sheet(f, "kara-taban", -0.35 * w, fy - 0.03 * h, 2.65 * w, h * 1.1, (g) => seabed(g, f, fy));
  caustics(f, cam, fy);
  const items: Item[] = [];
  ediacara(f, cam, items);
  cambrian(f, cam, items);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  swimmers(f, cam, fy);
  ctx.restore();

  ctx.save();
  applyCam(f, cam, 1.4);
  foreground(f);
  ctx.restore();

  snow(f, cam);
  seaLabels(f, cam);
}

function waterBack(g: Ctx, f: SceneFrame, fy: number) {
  const { w, h } = f;
  const x0 = -0.45 * w;
  const x1 = 1.5 * w;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#7ae4e8");
  grad.addColorStop(0.2, "#3fb0d2");
  grad.addColorStop(0.52, "#1d76a8");
  grad.addColorStop(1, "#0a3461");
  g.fillStyle = grad;
  g.fillRect(x0, -0.06 * h, x1 - x0, 1.12 * h);
  drawGlow(g, w * 0.3, -h * 0.15, w * 0.6, hex("e8fdff"), 0.5);
  drawGlow(g, w * 1.05, -h * 0.12, w * 0.5, hex("e8fdff"), 0.35);
  ridge(g, x0, x1, fy - 0.11 * h, 0.06 * h, 1.06 * h, "rgba(62,158,196,0.6)", 3.1);
  ridge(g, x0, x1, fy - 0.05 * h, 0.045 * h, 1.06 * h, "rgba(40,122,170,0.8)", 7.7);
}

function ridge(
  g: Ctx,
  x0: number,
  x1: number,
  y: number,
  amp: number,
  bottom: number,
  color: string,
  seed: number,
) {
  const pts: Pt[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const v = 0.5 + 0.3 * Math.sin(i * 0.9 + seed) + 0.2 * Math.sin(i * 2.3 + seed * 3);
    pts.push([x0 + ((x1 - x0) * i) / n, y - amp * v]);
  }
  g.fillStyle = color;
  g.beginPath();
  curve(g, pts);
  g.lineTo(x1, bottom);
  g.lineTo(x0, bottom);
  g.closePath();
  g.fill();
}

/** Yüzeyden süzülen ışık huzmeleri: önbellekli tek bir huzme, farklı yer ve parlaklıkta. */
function rays(f: SceneFrame, cam: Cam, fy: number) {
  const { ctx, w, t, s } = f;
  const rw = 220 * s;
  const img = stamp(f, "kara-huzme", rw, fy, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, fy);
    grad.addColorStop(0, "rgba(215,250,255,0.24)");
    grad.addColorStop(0.7, "rgba(215,250,255,0.06)");
    grad.addColorStop(1, "rgba(215,250,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(rw * 0.05, 0);
    g.lineTo(rw * 0.32, 0);
    g.lineTo(rw, fy);
    g.lineTo(rw * 0.55, fy);
    g.closePath();
    g.fill();
  });
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const span = w * 1.5;
  for (let i = 0; i < 7; i++) {
    const x =
      wrap(hash(i * 7.3) * span - cam.x * w * 0.3 + Math.sin(t * 0.22 + i) * 18 * s, span) -
      w * 0.3;
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 0.45 + i * 1.7);
    ctx.drawImage(img, x, 0, rw * (0.7 + hash(i) * 0.6), fy);
  }
  ctx.restore();
}

/** Orta uzaklıktaki sisli siluetler: solda Ediyakara yaprakları, sağda Kambriyen resifi. */
function farLife(g: Ctx, f: SceneFrame, fy: number) {
  const { w, h, s } = f;
  for (let i = 0; i < 16; i++) {
    const x = -0.35 * w + (i / 16) * 1.35 * w + hash(i * 3.7) * 0.05 * w;
    const L = (0.08 + hash(i * 5.1) * 0.1) * h;
    frondShape(g, x, fy + 0.01 * h, L, (hash(i) - 0.5) * 0.25, "rgba(52,140,182,0.85)");
  }
  g.fillStyle = "rgba(40,118,166,0.9)";
  for (let i = 0; i < 7; i++) {
    const cx = 0.72 * w + i * 0.19 * w + hash(i * 9.1) * 0.05 * w;
    g.beginPath();
    g.ellipse(
      cx,
      fy + 0.01 * h,
      (60 + hash(i) * 60) * s,
      (22 + hash(i + 2) * 18) * s,
      0,
      Math.PI,
      TAU,
    );
    g.fill();
    for (let k = 0; k < 5; k++) {
      const x = cx + (k - 2) * 22 * s + hash(i * 7 + k) * 10 * s;
      const hh = (26 + hash(i * 3 + k) * 52) * s;
      const ww = (8 + hash(i + k * 5) * 9) * s;
      roundRect(g, x - ww / 2, fy - hh, ww, hh + 12 * s, ww / 2);
      g.fill();
    }
  }
}

function frondShape(g: Ctx, x: number, y: number, L: number, bend: number, color: string) {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const v = k / 10;
    const ax = x + bend * L * v * v;
    const ay = y - L * v;
    const wd = L * 0.13 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.85);
    left.push([ax - wd, ay]);
    right.push([ax + wd, ay]);
  }
  g.fillStyle = color;
  g.beginPath();
  curve(g, [...left, ...right.reverse()], true);
  g.fill();
}

/** Deniz tabanı: kum, dalgacıklar, Ediyakara’nın mikrobiyal örtüsü, Kambriyen’in yuvaları. */
function seabed(g: Ctx, f: SceneFrame, fy: number) {
  const { w, h, s } = f;
  const x0 = -0.35 * w;
  const x1 = 2.65 * w;
  const bottom = h * 1.1;
  const top: Pt[] = [];
  for (let i = 0; i <= 60; i++) {
    top.push([
      x0 + ((x1 - x0) * i) / 60,
      fy + Math.sin(i * 0.7) * 4 * s + Math.sin(i * 1.9 + 1) * 2 * s,
    ]);
  }
  const grad = g.createLinearGradient(0, fy - 6 * s, 0, h);
  grad.addColorStop(0, "#8ab8b2");
  grad.addColorStop(0.1, "#c8b387");
  grad.addColorStop(0.45, "#d7b27a");
  grad.addColorStop(1, "#a0724a");
  g.fillStyle = grad;
  g.beginPath();
  curve(g, top);
  g.lineTo(x1, bottom);
  g.lineTo(x0, bottom);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(225,250,240,0.4)";
  g.lineWidth = 2 * s;
  g.beginPath();
  curve(g, top);
  g.stroke();

  // Kum dalgacıkları: öne doğru seyrelir, perspektif hissi verir.
  g.strokeStyle = "rgba(140,96,60,0.16)";
  g.lineWidth = 1.5 * s;
  for (let k = 0; k < 16; k++) {
    const d = (k + 0.5) / 16;
    const y = fy + (0.015 + d * d * 0.42) * h;
    g.beginPath();
    let first = true;
    for (let x = x0; x <= x1; x += 24 * s) {
      const yy = y + Math.sin((x * 0.02) / (0.5 + d) + k) * 2.5 * s * (0.5 + d);
      if (first) g.moveTo(x, yy);
      else g.lineTo(x, yy);
      first = false;
    }
    g.stroke();
  }

  // Ediyakara: “fil derisi” kırışıklı mikrobiyal örtü.
  for (let i = 0; i < 22; i++) {
    const x = x0 + hash(i * 2.7) * 1.45 * w;
    const d = hash(i * 4.3);
    const y = fy + (0.02 + d * 0.5) * (h - fy);
    const rx = (50 + hash(i * 1.9) * 90) * s * (0.7 + d * 0.6);
    const ry = rx * 0.22;
    g.fillStyle = "rgba(112,140,84,0.3)";
    blob(g, x, y, rx, i, { sy: 0.22, wobble: 0.22, n: 9 });
    g.fill();
    g.strokeStyle = "rgba(82,104,62,0.32)";
    g.lineWidth = 1.2 * s;
    g.beginPath();
    for (let j = 0; j < 6; j++) {
      const v = (j / 5 - 0.5) * 1.2;
      const yy = y + v * ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - v * v)) * 0.8;
      g.moveTo(x - half, yy);
      g.bezierCurveTo(x - half * 0.3, yy - 3 * s, x + half * 0.3, yy + 3 * s, x + half, yy);
    }
    g.stroke();
  }

  // Kambriyen: yuva ağızları; taban artık kazılmış, delik deşik.
  for (let i = 0; i < 18; i++) {
    const x = 1.05 * w + hash(i * 6.1) * 1.45 * w;
    const d = hash(i * 8.3);
    const y = fy + (0.03 + d * 0.55) * (h - fy);
    const r = (6 + hash(i) * 5) * s * (0.7 + d * 0.6);
    g.fillStyle = "rgba(176,136,94,0.85)";
    g.beginPath();
    g.ellipse(x, y, r * 1.6, r * 0.55, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(70,44,30,0.85)";
    g.beginPath();
    g.ellipse(x, y + r * 0.05, r, r * 0.3, 0, 0, TAU);
    g.fill();
  }

  // Çakıllar.
  for (let i = 0; i < 80; i++) {
    const x = x0 + hash(i * 3.3) * (x1 - x0);
    const d = hash(i * 5.1);
    const y = fy + (0.02 + d * 0.9) * (h - fy);
    const r = (2 + hash(i * 1.7) * 4) * s * (0.7 + d * 0.6);
    g.fillStyle = "rgba(120,86,58,0.5)";
    g.beginPath();
    g.ellipse(x, y + r * 0.3, r, r * 0.5, 0, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(240,218,180,0.6)";
    g.beginPath();
    g.ellipse(x - r * 0.2, y, r * 0.7, r * 0.35, 0, 0, TAU);
    g.fill();
  }
}

/** Tabanda gezinen ışık desenleri. */
function caustics(f: SceneFrame, cam: Cam, fy: number) {
  const { ctx, w, h, t, s } = f;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 18; i++) {
    const base = -0.2 * w + hash(i * 4.4) * 2.7 * w;
    if (!onScreen(f, cam, base, 220 * s)) continue;
    const x = base + Math.sin(t * 0.35 + i * 2.1) * 50 * s;
    const y = fy + (0.04 + hash(i * 7.7) * 0.5) * (h - fy);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.3);
    drawGlow(
      ctx,
      0,
      0,
      (80 + hash(i) * 80) * s,
      [190, 255, 235],
      0.07 + 0.05 * Math.sin(t * 0.8 + i * 1.3),
    );
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- Ediyakara bahçesi ---------- */

function ediacara(f: SceneFrame, cam: Cam, items: Item[]) {
  const { ctx, w, t, s } = f;
  const add = (x: number, y: number, margin: number, draw: () => void) => {
    if (onScreen(f, cam, x, margin)) items.push({ y, draw });
  };
  FRONDS.forEach(([u, d, , disc, pi], i) => {
    const { x, y, L } = frondGeo(f, i);
    const p = haze(FROND[pi], (1 - d) * 0.3);
    add(x, y, L * 0.5, () => frond(ctx, x, y, L, frondBend(t, u, i), disc, p));
  });
  DICKS.forEach((_, i) => {
    const D = dickAt(f, i);
    add(D.x, D.y, D.r * 3, () => dickinsonia(ctx, D, t, i));
  });
  KIMBS.forEach((_, i) => {
    const K = kimbAt(f, i);
    add(K.x, K.y, K.L * 3, () => kimberella(ctx, K, t, s));
  });
  TRIBS.forEach(([u, d], i) => {
    const r = (15 + hash(i * 2.2) * 6) * depthK(d) * s;
    const st = makeStamp(f, `trib${i}`, r * 2.6, r * 1.6, r * 1.3, r * 0.8, (g) =>
      trib(g, r * 1.3, r * 0.8, r),
    );
    add(u * w, depthY(f, d), r * 2, () => place(ctx, st, u * w, depthY(f, d)));
  });
  FRACTOS.forEach(([u, d], i) => {
    const L = (70 + hash(i * 3.9) * 30) * depthK(d) * s;
    const st = makeStamp(f, `fracto${i}`, L * 1.1, L * 0.5, L * 0.55, L * 0.25, (g) =>
      fractofusus(g, L * 0.55, L * 0.25, L, i),
    );
    add(u * w, depthY(f, d), L, () => place(ctx, st, u * w, depthY(f, d)));
  });
  CLOUDINAS.forEach(([u, d], i) => {
    const H = 30 * depthK(d) * s;
    const st = makeStamp(f, `cloudina${i}`, H * 1.6, H * 1.2, H * 0.8, H * 1.1, (g) =>
      cloudina(g, H * 0.8, H * 1.1, H, i),
    );
    add(u * w, depthY(f, d), H * 2, () => place(ctx, st, u * w, depthY(f, d)));
  });
}

/** Charnia / Charniodiscus: diskli ya da disksiz, dönüşümlü dallanan yaprak. */
function frond(ctx: Ctx, x: number, y: number, L: number, bend: number, disc: boolean, p: Pal) {
  const stalk = disc ? 0.26 : 0.03;
  const axis = (u: number): Pt => [x + bend * L * u * u, y - L * u];
  const W = L * (disc ? 0.12 : 0.14);
  const n = 16;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const mid: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const v = k / n;
    const u = stalk + (1 - stalk) * v;
    const [ax, ay] = axis(u);
    const dx = 2 * bend * L * u;
    const nn = Math.hypot(L, dx);
    const nx = L / nn;
    const ny = dx / nn;
    const wd = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.85);
    left.push([ax - nx * wd, ay - ny * wd]);
    right.push([ax + nx * wd, ay + ny * wd]);
    mid.push([ax, ay]);
  }
  ctx.save();
  ctx.lineCap = "round";
  if (disc) {
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.ellipse(x, y + L * 0.006, L * 0.11, L * 0.035, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = p.base;
    ctx.beginPath();
    ctx.ellipse(x - L * 0.008, y, L * 0.095, L * 0.026, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = Math.max(1, L * 0.005);
    ctx.beginPath();
    ctx.ellipse(x, y, L * 0.06, L * 0.016, 0, 0, TAU);
    ctx.stroke();
    const st = [axis(0), axis(stalk * 0.5), axis(stalk + 0.03)];
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = L * 0.032;
    ctx.beginPath();
    curve(ctx, st);
    ctx.stroke();
    ctx.strokeStyle = p.light;
    ctx.lineWidth = L * 0.009;
    ctx.beginPath();
    curve(
      ctx,
      st.map(([px, py]) => [px - L * 0.008, py] as Pt),
    );
    ctx.stroke();
  } else {
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.ellipse(x, y, L * 0.045, L * 0.015, 0, 0, TAU);
    ctx.fill();
  }
  const leaf = new Path2D();
  curve(leaf, [...left, ...right.slice().reverse()], true);
  ctx.fillStyle = p.base;
  ctx.fill(leaf);
  ctx.save();
  ctx.clip(leaf);
  const half = new Path2D();
  curve(half, [...mid, ...right.slice().reverse()], true);
  ctx.globalAlpha *= 0.6;
  ctx.fillStyle = p.dark;
  ctx.fill(half);
  ctx.restore();
  // Dallar: eksenden kenara, yukarı eğimli; her birinin üstünde küçük ikincil dallar.
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = Math.max(0.7, L * 0.005);
  ctx.beginPath();
  for (let k = 1; k < n - 1; k++) {
    const [mx, my] = mid[k];
    for (const side of [left, right]) {
      const [ex, ey] = side[Math.min(n, k + 2)];
      ctx.moveTo(mx, my);
      ctx.lineTo(ex, ey);
      for (const q of [0.45, 0.75]) {
        const px = mx + (ex - mx) * q;
        const py = my + (ey - my) * q;
        ctx.moveTo(px, py);
        ctx.lineTo(px + (mid[k + 1][0] - mx) * 0.5, py + (mid[k + 1][1] - my) * 0.5);
      }
    }
  }
  ctx.stroke();
  ctx.strokeStyle = p.light;
  ctx.lineWidth = Math.max(1, L * 0.008);
  ctx.beginPath();
  curve(ctx, left.slice(1, n));
  ctx.stroke();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = Math.max(1, L * 0.01);
  ctx.beginPath();
  curve(ctx, mid);
  ctx.stroke();
  ctx.restore();
}

function dickinsonia(ctx: Ctx, D: ReturnType<typeof dickAt>, t: number, seed: number) {
  const { x, y, r, glide, step } = D;
  // Beslenme izleri: gövdenin geride bıraktığı soluk kopyalar (Epibaion izleri).
  for (let k = 0; k < 3; k++) {
    const a = 0.24 - k * 0.07 - glide * 0.07;
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(150,100,70,${a})`;
    ctx.beginPath();
    ctx.ellipse(x - (k + glide) * step, y, r, r * 0.4, 0, 0, TAU);
    ctx.fill();
  }
  const pulse = 1 + 0.025 * Math.sin(t * 1.3 + seed);
  const rx = r * pulse;
  const ry = r * 0.42;
  ctx.fillStyle = "rgba(70,40,30,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y + ry * 0.4, rx * 1.02, ry, 0, 0, TAU);
  ctx.fill();
  const body = ell(x, y, rx, ry);
  toon(ctx, body, DICK, r * 0.08);
  ctx.save();
  ctx.clip(body);
  ctx.strokeStyle = "rgba(172,96,84,0.55)";
  ctx.lineWidth = Math.max(0.8, r * 0.026);
  ctx.beginPath();
  const N = 20;
  for (let k = 1; k < N; k++) {
    const u = -1 + (2 * k) / N;
    const xx = x + u * rx * 0.96;
    const hh = ry * Math.sqrt(Math.max(0, 1 - u * u)) * 1.02;
    ctx.moveTo(xx, y);
    ctx.quadraticCurveTo(xx + u * r * 0.1, y - hh * 0.6, xx + u * r * 0.16, y - hh);
    const xo = xx + (rx / N) * 0.9;
    ctx.moveTo(xo, y);
    ctx.quadraticCurveTo(xo + u * r * 0.1, y + hh * 0.6, xo + u * r * 0.16, y + hh);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(160,80,70,0.75)";
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.9, y);
  ctx.lineTo(x + rx * 0.9, y);
  ctx.stroke();
  ctx.restore();
}

/** Kimberella: fırfırlı kenarlı, sırt kalkanlı; hortumuyla mikrobiyal örtüyü kazır. */
function kimberella(ctx: Ctx, K: ReturnType<typeof kimbAt>, t: number, s: number) {
  const { x0, x, y, L } = K;
  // Kazıma izleri (Kimberichnus): geride kalan yelpaze biçimli çizikler.
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, L * 0.012);
  const gap = 15 * s;
  for (let k = 0; k < 40; k++) {
    const fx = x0 - k * gap;
    const d = fx - x;
    if (d < L * 0.35) break;
    if (d > L * 3.2) continue;
    ctx.strokeStyle = `rgba(120,80,56,${0.42 * (1 - d / (L * 3.2))})`;
    ctx.beginPath();
    for (let j = -2; j <= 2; j++) {
      const a = Math.PI + j * 0.24;
      ctx.moveTo(fx, y + j * L * 0.018);
      ctx.lineTo(fx + Math.cos(a) * L * 0.14, y + Math.sin(a) * L * 0.06 + j * L * 0.03);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(70,40,30,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + L * 0.04, y + L * 0.08, L * 0.5, L * 0.18, 0, 0, TAU);
  ctx.fill();
  const pts: Pt[] = [];
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * TAU;
    const rr = 1 + 0.07 * Math.sin(k * 3.3 + t * 3);
    pts.push([x + Math.cos(a) * L * 0.52 * rr, y + Math.sin(a) * L * 0.24 * rr]);
  }
  const frill = new Path2D();
  curve(frill, pts, true);
  ctx.fillStyle = "rgba(221,201,244,0.9)";
  ctx.fill(frill);
  toon(ctx, ell(x, y, L * 0.44, L * 0.19), KIMB, L * 0.035);
  ctx.fillStyle = "rgba(110,80,150,0.45)";
  ctx.fill(ell(x + L * 0.04, y - L * 0.02, L * 0.28, L * 0.1));
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill(ell(x - L * 0.06, y - L * 0.07, L * 0.12, L * 0.028));
  const ext = 0.08 + 0.13 * (0.5 + 0.5 * Math.sin(t * 1.7));
  ctx.lineCap = "round";
  ctx.strokeStyle = KIMB.base;
  ctx.lineWidth = L * 0.07;
  ctx.beginPath();
  ctx.moveTo(x - L * 0.4, y + L * 0.02);
  ctx.lineTo(x - L * (0.44 + ext), y + L * 0.045);
  ctx.stroke();
  ctx.fillStyle = KIMB.dark;
  ctx.fill(ell(x - L * (0.45 + ext), y + L * 0.045, L * 0.035, L * 0.026));
}

function trib(g: Ctx, x: number, y: number, r: number) {
  g.save();
  g.translate(x, y);
  g.scale(1, 0.48);
  g.fillStyle = "rgba(90,60,40,0.22)";
  g.beginPath();
  g.arc(r * 0.08, r * 0.3, r, 0, TAU);
  g.fill();
  toon(g, ell(0, 0, r, r), TRIB, r * 0.1);
  g.strokeStyle = TRIB.dark;
  g.lineWidth = r * 0.14;
  g.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(
      Math.cos(a) * r * 0.6,
      Math.sin(a) * r * 0.6,
      Math.cos(a + 0.9) * r * 0.85,
      Math.sin(a + 0.9) * r * 0.85,
    );
    g.stroke();
  }
  g.restore();
}

/** Fractofusus: tabanda yatan, iğ biçimli, kendini tekrarlayan dallı bir rangeomorf. */
function fractofusus(g: Ctx, x: number, y: number, L: number, seed: number) {
  g.save();
  g.translate(x, y);
  g.rotate((hash(seed) - 0.5) * 0.3);
  g.scale(1, 0.42);
  const body = new Path2D();
  body.moveTo(-L * 0.5, 0);
  body.quadraticCurveTo(0, -L * 0.3, L * 0.5, 0);
  body.quadraticCurveTo(0, L * 0.3, -L * 0.5, 0);
  g.fillStyle = "rgba(90,60,40,0.2)";
  g.save();
  g.translate(L * 0.02, L * 0.06);
  g.fill(body);
  g.restore();
  toon(g, body, FRACTO, L * 0.02);
  g.save();
  g.clip(body);
  g.strokeStyle = FRACTO.dark;
  g.lineWidth = Math.max(0.7, L * 0.008);
  g.beginPath();
  for (let k = -9; k <= 9; k++) {
    const px = (k / 10) * L * 0.46;
    const half = L * 0.15 * (1 - (k / 10) ** 2);
    g.moveTo(px, 0);
    g.lineTo(px - half * 0.4, -half);
    g.moveTo(px, 0);
    g.lineTo(px - half * 0.4, half);
  }
  g.moveTo(-L * 0.46, 0);
  g.lineTo(L * 0.46, 0);
  g.stroke();
  g.restore();
  g.restore();
}

/** Cloudina: iç içe huniler gibi dizilmiş, ilk kireçli tüplerden. */
function cloudina(g: Ctx, x: number, y: number, H: number, seed: number) {
  const tubes = 3;
  for (let j = 0; j < tubes; j++) {
    const a = (j - 1) * 0.35 + (hash(seed * 5 + j) - 0.5) * 0.2;
    const len = H * (0.65 + hash(seed * 3 + j) * 0.35);
    g.save();
    g.translate(x + (j - 1) * H * 0.18, y);
    g.rotate(a);
    for (let k = 0; k < 6; k++) {
      const y0 = -len * (k / 6);
      const y1 = -len * ((k + 1) / 6);
      const w0 = H * 0.07;
      const w1 = H * 0.1;
      const cone = new Path2D();
      cone.moveTo(-w0, y0);
      cone.lineTo(-w1, y1);
      cone.lineTo(w1, y1);
      cone.lineTo(w0, y0);
      cone.closePath();
      toon(g, cone, CLOUDINA, H * 0.015);
    }
    g.fillStyle = "rgba(90,70,50,0.7)";
    g.beginPath();
    g.ellipse(0, -len, H * 0.08, H * 0.025, 0, 0, TAU);
    g.fill();
    g.restore();
  }
}

/* ---------- Kambriyen resifi ---------- */

function cambrian(f: SceneFrame, cam: Cam, items: Item[]) {
  const { ctx, w, h, t, s } = f;
  const add = (x: number, y: number, margin: number, draw: () => void) => {
    if (onScreen(f, cam, x, margin)) items.push({ y, draw });
  };
  MOUNDS.forEach(([u, d, size], i) => {
    const W = 270 * size * s;
    const H = 170 * size * s;
    const st = makeStamp(f, `mound${i}`, W, H, W / 2, H * 0.92, (g) => mound(g, W, H, i, s));
    const k = pop(t, popAt(f, u, i), 0.8);
    add(u * w, depthY(f, d), W, () => place(ctx, st, u * w, depthY(f, d), k));
  });
  SPONGES.forEach(([u, d, kind, size, pi], i) => {
    const x = u * w;
    const y = depthY(f, d);
    const k = pop(t, popAt(f, u, i + 10), 0.7);
    let st: Stamp;
    if (kind === 2) {
      const r = size * depthK(d) * s;
      st = makeStamp(f, `choia${i}`, r * 7, r * 3.6, r * 3.5, r * 2.6, (g) =>
        choia(g, r * 3.5, r * 2.6, r),
      );
    } else {
      const H = size * h * depthK(d);
      const W = H * (kind === 1 ? 0.9 : 0.46);
      st = makeStamp(f, `sponge${i}`, W, H * 1.08, W / 2, H * 1.06, (g) =>
        kind === 1
          ? vauxia(g, W / 2, H * 1.06, H, SPONGE[pi])
          : tubeSponge(g, W / 2, H * 1.06, H, H * 0.26, SPONGE[pi]),
      );
    }
    add(x, y, st.w, () => {
      place(ctx, st, x, y, k);
      // Hallucigenia en büyük süngerin tepesinde gezinir.
      if (i === 0 && k > 0.95) {
        const H = size * h * depthK(d);
        const walk = Math.sin(t * 0.35) * H * 0.05;
        const HL = 56 * s * depthK(d);
        hallucigenia(ctx, x + walk, y - H - HL * 0.16, HL, t, Math.cos(t * 0.35) > 0 ? 1 : -1);
      }
    });
  });
  SHELLS.forEach(([u, d], i) => {
    const r = 11 * depthK(d) * s;
    const st = makeStamp(f, `shell${i}`, r * 6, r * 3, r * 3, r * 2.6, (g) =>
      shells(g, r * 3, r * 2.6, r, i),
    );
    const k = pop(t, popAt(f, u, i + 30), 0.6);
    add(u * w, depthY(f, d), r * 4, () => place(ctx, st, u * w, depthY(f, d), k));
  });
  ROCKS.forEach(([u, d, r0], i) => {
    const r = r0 * depthK(d) * s;
    const st = makeStamp(f, `rock${i}`, r * 3, r * 1.9, r * 1.5, r * 1.4, (g) =>
      rock(g, r * 1.5, r * 1.4, r, i),
    );
    add(u * w, depthY(f, d), r * 2, () => place(ctx, st, u * w, depthY(f, d)));
  });
  TUFTS.forEach(([u, d, pi], i) => {
    const x = u * w;
    const y = depthY(f, d);
    const H = (60 + hash(i * 4.1) * 50) * depthK(d) * s;
    const k = pop(t, popAt(f, u, i + 40), 0.9);
    add(x, y, H, () => algae(ctx, x, y, H * k, t, i, ALGAE[pi]));
  });
  WORMS.forEach(([u, d], i) => {
    const x = u * w;
    const y = depthY(f, d);
    add(x, y, 60 * s, () => ottoia(ctx, x, y, 70 * depthK(d) * s, t, i));
  });
  TRILOS.forEach((_, i) => {
    const T = triloAt(f, i);
    const k = pop(t, popAt(f, T.x0 / w, i + 50), 0.6);
    add(T.x, T.y, T.L * 3, () => {
      tracks(ctx, T, s);
      trilobite(ctx, T.x, T.y, T.L * Math.min(1, k), t + i, TRILO[T.p], T.dir);
    });
  });
  {
    const x = 1.97 * w - Math.max(0, t - f.beats[1]) * 2 * s;
    const y = depthY(f, 0.36);
    const k = pop(t, popAt(f, 1.97, 60), 0.7);
    add(x, y, 80 * s, () => wiwaxia(ctx, x, y, 50 * depthK(0.36) * s * Math.min(1, k), t));
  }
}

/** Arkeosiyat resifi: moloz tabanda, gözenekli çift çeperli kadehler. */
function mound(g: Ctx, W: number, H: number, seed: number, s: number) {
  const bx = W / 2;
  const by = H * 0.92;
  for (let k = 0; k < 7; k++) {
    const x = bx + (k - 3) * W * 0.11 + (hash(seed * 7 + k) - 0.5) * W * 0.05;
    const r = (16 + hash(seed + k * 3) * 14) * s * (W / (270 * s));
    toon(g, blobPath(x, by - r * 0.3, r, seed * 9 + k, 0.6, 0.18), ROCK, r * 0.15);
  }
  const cups: [number, number, number, number][] = [];
  for (let k = 0; k < 10; k++) {
    cups.push([
      bx + (hash(k * 3.1 + seed) - 0.5) * W * 0.5,
      by - 4 * s - hash(k * 1.3 + seed) * H * 0.08,
      (0.35 + hash(k * 5.3 + seed) * 0.6) * H * 0.78,
      (hash(k * 7.7 + seed) - 0.5) * 0.45,
    ]);
  }
  cups.sort((a, b) => a[1] - b[1]);
  for (const [x, y, hgt, lean] of cups) cup(g, x, y, hgt, lean);
}

function cup(g: Ctx, x: number, y: number, hgt: number, lean: number) {
  g.save();
  g.translate(x, y);
  g.rotate(lean);
  const top = hgt * 0.3;
  const bot = hgt * 0.07;
  const body = new Path2D();
  body.moveTo(-bot, 0);
  body.bezierCurveTo(-bot - top * 0.1, -hgt * 0.4, -top, -hgt * 0.7, -top, -hgt);
  body.lineTo(top, -hgt);
  body.bezierCurveTo(top, -hgt * 0.7, bot + top * 0.1, -hgt * 0.4, bot, 0);
  body.closePath();
  toon(g, body, CUP, hgt * 0.05);
  g.save();
  g.clip(body);
  g.fillStyle = "rgba(160,118,74,0.55)";
  for (let r = 0; r < 7; r++) {
    const v = 0.14 + r * 0.12;
    const half = bot + (top - bot) * v;
    for (let c = -3; c <= 3; c++) {
      g.beginPath();
      g.arc(((c + (r % 2) * 0.5) / 3.5) * half * 0.9, -hgt * v, hgt * 0.017, 0, TAU);
      g.fill();
    }
  }
  g.restore();
  g.fillStyle = CUP.light;
  g.fill(ell(0, -hgt, top, top * 0.32));
  g.fillStyle = "#6b4a3a";
  g.fill(ell(0, -hgt + top * 0.02, top * 0.78, top * 0.22));
  g.fillStyle = "#94725a";
  g.fill(ell(0, -hgt + top * 0.03, top * 0.4, top * 0.11));
  g.restore();
}

function tubeSponge(g: Ctx, x: number, y: number, hgt: number, wd: number, p: Pal) {
  // Vazo biçimi: dar taban, şişkin gövde, hafif boğum ve dışa açılan ağız.
  const body = new Path2D();
  body.moveTo(x - wd * 0.26, y);
  body.bezierCurveTo(
    x - wd * 0.72,
    y - hgt * 0.28,
    x - wd * 0.66,
    y - hgt * 0.62,
    x - wd * 0.45,
    y - hgt * 0.84,
  );
  body.quadraticCurveTo(x - wd * 0.4, y - hgt * 0.95, x - wd * 0.54, y - hgt);
  body.lineTo(x + wd * 0.54, y - hgt);
  body.quadraticCurveTo(x + wd * 0.4, y - hgt * 0.95, x + wd * 0.45, y - hgt * 0.84);
  body.bezierCurveTo(
    x + wd * 0.66,
    y - hgt * 0.62,
    x + wd * 0.72,
    y - hgt * 0.28,
    x + wd * 0.26,
    y,
  );
  body.closePath();
  toon(g, body, p, wd * 0.12);
  g.save();
  g.clip(body);
  g.globalAlpha = 0.3;
  g.strokeStyle = p.dark;
  g.lineWidth = Math.max(1, wd * 0.03);
  for (let k = -2; k <= 2; k++) {
    g.beginPath();
    g.moveTo(x + k * wd * 0.14, y);
    g.quadraticCurveTo(x + k * wd * 0.2, y - hgt * 0.5, x + k * wd * 0.17, y - hgt);
    g.stroke();
  }
  g.globalAlpha = 0.5;
  g.fillStyle = p.dark;
  for (let r = 0; r < 9; r++) {
    for (let c = -2; c <= 2; c++) {
      g.beginPath();
      g.arc(
        x + (c + (r % 2) * 0.5 - 0.25) * wd * 0.18,
        y - hgt * (0.08 + r * 0.1),
        wd * 0.03,
        0,
        TAU,
      );
      g.fill();
    }
  }
  g.restore();
  g.fillStyle = p.light;
  g.fill(ell(x, y - hgt, wd * 0.5, wd * 0.14));
  g.fillStyle = "rgba(60,30,20,0.78)";
  g.fill(ell(x, y - hgt + wd * 0.01, wd * 0.36, wd * 0.09));
}

/** Vauxia: ortak tabandan dallanan tüp süngerler. */
function vauxia(g: Ctx, x: number, y: number, H: number, p: Pal) {
  const arms: [number, number][] = [
    [-0.42, 0.62],
    [0.4, 0.7],
    [-0.12, 1],
    [0.16, 0.84],
  ];
  g.fillStyle = p.dark;
  g.fill(ell(x, y - H * 0.04, H * 0.13, H * 0.06));
  for (const [a, rh] of arms) {
    g.save();
    g.translate(x, y - H * 0.05);
    g.rotate(a);
    tubeSponge(g, 0, 0, H * rh, H * 0.15, p);
    g.restore();
  }
}

/** Choia: yassı gövdeden dışa taşan uzun iğneler. */
function choia(g: Ctx, x: number, y: number, r: number) {
  g.strokeStyle = "rgba(255,244,200,0.85)";
  g.lineWidth = Math.max(0.8, r * 0.05);
  g.lineCap = "round";
  g.beginPath();
  for (let k = 0; k < 30; k++) {
    const a = Math.PI + (k / 29) * Math.PI;
    const len = r * (1.5 + hash(k * 3.3) * 0.9);
    g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.35);
    g.lineTo(x + Math.cos(a) * (r * 0.8 + len), y + Math.sin(a) * (r * 0.35 + len * 0.8));
  }
  g.stroke();
  toon(g, ell(x, y, r, r * 0.45), CHOIA, r * 0.1);
  g.fillStyle = CHOIA.dark;
  g.fill(ell(x, y - r * 0.05, r * 0.3, r * 0.12));
}

/** Brakiyopodlar: kaburgalı, hafif aralık iki kapaklı kavkılar. */
function shells(g: Ctx, x: number, y: number, r: number, seed: number) {
  for (let j = 0; j < 3; j++) {
    const px = x + (j - 1) * r * 1.3 + (hash(seed * 3 + j) - 0.5) * r * 0.5;
    const py = y - (j % 2) * r * 0.3;
    const rr = r * (0.8 + hash(seed + j * 7) * 0.4);
    g.save();
    g.translate(px, py);
    g.rotate((hash(seed * 5 + j) - 0.5) * 0.6);
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(-rr * 1.1, -rr * 0.2, -rr * 0.9, -rr * 1.3, 0, -rr * 1.25);
    p.bezierCurveTo(rr * 0.9, -rr * 1.3, rr * 1.1, -rr * 0.2, 0, 0);
    toon(g, p, SHELL, rr * 0.12);
    g.save();
    g.clip(p);
    g.strokeStyle = "rgba(160,120,80,0.45)";
    g.lineWidth = Math.max(0.6, rr * 0.06);
    g.beginPath();
    for (let k = -3; k <= 3; k++) {
      g.moveTo(0, 0);
      g.lineTo(k * rr * 0.3, -rr * 1.3);
    }
    g.stroke();
    g.restore();
    g.strokeStyle = "rgba(70,44,30,0.8)";
    g.lineWidth = Math.max(0.8, rr * 0.08);
    g.beginPath();
    g.moveTo(-rr * 0.55, -rr * 1.05);
    g.quadraticCurveTo(0, -rr * 1.2, rr * 0.55, -rr * 1.05);
    g.stroke();
    g.restore();
  }
}

function rock(g: Ctx, x: number, y: number, r: number, seed: number) {
  toon(g, blobPath(x, y - r * 0.4, r, seed * 11 + 3, 0.62, 0.2), ROCK, r * 0.12);
  g.fillStyle = "rgba(120,170,120,0.55)";
  g.fill(ell(x - r * 0.25, y - r * 0.9, r * 0.35, r * 0.1));
}

function algae(ctx: Ctx, x: number, y: number, H: number, t: number, seed: number, p: Pal) {
  if (H <= 1) return;
  for (let k = 0; k < 6; k++) {
    const a = (k - 2.5) * 0.2 + Math.sin(t * 0.9 + k + seed) * 0.12;
    const bh = H * (0.6 + hash(seed * 7 + k) * 0.4);
    const bw = H * 0.05;
    const tipX = x + Math.sin(a) * bh + Math.sin(t * 1.2 + k) * bh * 0.08;
    const tipY = y - Math.cos(a) * bh;
    const cx = x + Math.sin(a * 0.5) * bh * 0.5;
    const cy = (y + tipY) / 2;
    const blade = new Path2D();
    blade.moveTo(x - bw + k * bw * 0.4, y);
    blade.quadraticCurveTo(cx - bw * 0.6, cy, tipX, tipY);
    blade.quadraticCurveTo(cx + bw * 0.6, cy, x + bw + k * bw * 0.4, y);
    blade.closePath();
    ctx.fillStyle = k % 2 ? p.dark : p.base;
    ctx.fill(blade);
    ctx.strokeStyle = p.light;
    ctx.lineWidth = Math.max(0.8, bw * 0.25);
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.5 + k * bw * 0.4, y);
    ctx.quadraticCurveTo(cx - bw * 0.7, cy, tipX, tipY);
    ctx.stroke();
  }
}

/** Ottoia: yuvasından hortumunu çıkarıp geri çeken, dikenli ağızlı bir priapulid kurt. */
function ottoia(ctx: Ctx, x: number, y: number, L: number, t: number, seed: number) {
  ctx.fillStyle = "rgba(170,128,88,0.9)";
  ctx.fill(ell(x, y, L * 0.2, L * 0.07));
  ctx.fillStyle = "rgba(60,38,26,0.95)";
  ctx.fill(ell(x, y + L * 0.005, L * 0.13, L * 0.045));
  const e = Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + seed * 2.1), 1.6);
  const hgt = L * (0.06 + 0.6 * e);
  const bend = Math.sin(t * 0.7 + seed) * 0.3;
  const pts: Pt[] = [
    [x, y],
    [x + bend * hgt * 0.3, y - hgt * 0.5],
    [x + bend * hgt * 0.75, y - hgt],
  ];
  ctx.lineCap = "round";
  ctx.strokeStyle = OTTO.dark;
  ctx.lineWidth = L * 0.12;
  ctx.beginPath();
  curve(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = OTTO.base;
  ctx.lineWidth = L * 0.08;
  ctx.beginPath();
  curve(
    ctx,
    pts.map(([px, py]) => [px - L * 0.012, py] as Pt),
  );
  ctx.stroke();
  ctx.setLineDash([L * 0.015, L * 0.035]);
  ctx.strokeStyle = "rgba(160,80,100,0.6)";
  ctx.lineWidth = L * 0.1;
  ctx.beginPath();
  curve(ctx, pts);
  ctx.stroke();
  ctx.setLineDash([]);
  const [tx, ty] = pts[2];
  ctx.strokeStyle = OTTO.light;
  ctx.lineWidth = Math.max(0.8, L * 0.012);
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.4;
    ctx.moveTo(tx + Math.cos(a) * L * 0.05, ty + Math.sin(a) * L * 0.05);
    ctx.lineTo(tx + Math.cos(a) * L * 0.09, ty + Math.sin(a) * L * 0.09);
  }
  ctx.stroke();
  ctx.fillStyle = OTTO.base;
  ctx.fill(ell(tx, ty, L * 0.055, L * 0.045));
  ctx.fillStyle = "rgba(90,30,50,0.85)";
  ctx.fill(ell(tx, ty - L * 0.02, L * 0.025, L * 0.012));
}

/** Trilobit izleri (Cruziana): geride kalan, soluklaşan balıksırtı çizikler. */
function tracks(ctx: Ctx, T: ReturnType<typeof triloAt>, s: number) {
  const gap = 7 * s;
  const n = Math.min(26, Math.floor(T.walked / gap));
  if (n < 1) return;
  const back = -T.dir;
  const x0 = T.x + back * T.L * 0.35;
  const g = ctx.createLinearGradient(x0, 0, x0 + back * n * gap, 0);
  g.addColorStop(0, "rgba(110,72,48,0.45)");
  g.addColorStop(1, "rgba(110,72,48,0)");
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const px = x0 + back * k * gap;
    for (const side of [-1, 1]) {
      const py = T.y + side * T.L * 0.09;
      ctx.moveTo(px, py);
      ctx.lineTo(px + back * gap * 0.6, py + side * T.L * 0.05);
    }
  }
  ctx.stroke();
}

/** Trilobit: üstten, hafif perspektifle: baş kalkanı, göğüs halkaları, kuyruk, bileşik gözler. */
function trilobite(ctx: Ctx, x: number, y: number, L: number, t: number, p: Pal, dir: number) {
  if (L <= 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 0.62);
  ctx.fillStyle = "rgba(40,24,16,0.22)";
  ctx.beginPath();
  ctx.ellipse(L * 0.04, L * 0.14, L * 0.52, L * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = Math.max(1, L * 0.025);
  ctx.lineCap = "round";
  for (let k = 0; k < 8; k++) {
    const lx = -L * 0.28 + k * L * 0.07;
    const sw = Math.sin(t * 7 + k * 0.9) * L * 0.03;
    ctx.beginPath();
    ctx.moveTo(lx, -L * 0.24);
    ctx.lineTo(lx + sw, -L * 0.34);
    ctx.moveTo(lx, L * 0.24);
    ctx.lineTo(lx - sw, L * 0.34);
    ctx.stroke();
  }
  toon(ctx, ell(-L * 0.36, 0, L * 0.14, L * 0.2), p, L * 0.02);
  for (let k = 0; k < 8; k++) {
    const sx = -L * 0.3 + k * L * 0.065;
    ctx.fillStyle = k % 2 ? p.base : p.dark;
    ctx.fill(rrect(sx, -L * 0.25, L * 0.062, L * 0.5, L * 0.03));
  }
  ctx.fillStyle = p.light;
  ctx.fill(rrect(-L * 0.34, -L * 0.075, L * 0.62, L * 0.15, L * 0.075));
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(-L * 0.3, -L * 0.06, L * 0.5, L * 0.025);
  const head = new Path2D();
  head.moveTo(L * 0.22, -L * 0.3);
  head.quadraticCurveTo(L * 0.62, -L * 0.28, L * 0.6, 0);
  head.quadraticCurveTo(L * 0.62, L * 0.28, L * 0.22, L * 0.3);
  head.lineTo(L * 0.0, L * 0.44);
  head.lineTo(L * 0.16, L * 0.22);
  head.lineTo(L * 0.16, -L * 0.22);
  head.lineTo(L * 0.0, -L * 0.44);
  head.closePath();
  toon(ctx, head, p, L * 0.025);
  ctx.fillStyle = p.light;
  ctx.fill(ell(L * 0.4, 0, L * 0.13, L * 0.09));
  for (const sy of [-1, 1]) {
    ctx.fillStyle = "rgb(52,36,30)";
    ctx.fill(ell(L * 0.34, sy * L * 0.17, L * 0.055, L * 0.034));
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill(ell(L * 0.35, sy * L * 0.17 - L * 0.012, L * 0.018, L * 0.01));
  }
  ctx.restore();
}

/** Hallucigenia: sırtında sivri dikenler, altında pençeli dokunaç bacaklar. */
function hallucigenia(ctx: Ctx, x: number, y: number, L: number, t: number, dir: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const sp = (u: number): Pt => [
    (u - 0.5) * L,
    -Math.sin(u * Math.PI) * 0.05 * L + (u > 0.82 ? (u - 0.82) * 0.4 * L : 0),
  ];
  for (let k = 0; k < 7; k++) {
    const [px, py] = sp(0.14 + k * 0.1);
    for (const [off, col] of [
      [L * 0.018, "#d9b772"],
      [0, "#fde6b0"],
    ] as [number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px - L * 0.016 + off, py - L * 0.02);
      ctx.lineTo(px - L * 0.07 + off, py - L * 0.3);
      ctx.lineTo(px + L * 0.016 + off, py - L * 0.02);
      ctx.fill();
    }
  }
  ctx.strokeStyle = HALLU.dark;
  ctx.lineWidth = L * 0.035;
  ctx.lineCap = "round";
  for (let k = 0; k < 7; k++) {
    const [px, py] = sp(0.12 + k * 0.1);
    const sw = Math.sin(t * 4 + k * 0.9) * L * 0.04;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + sw * 0.5, py + L * 0.1, px + sw, py + L * 0.19);
    ctx.stroke();
  }
  const pts = [0, 0.25, 0.5, 0.75, 0.9, 1].map(sp);
  ctx.strokeStyle = HALLU.dark;
  ctx.lineWidth = L * 0.085;
  ctx.beginPath();
  curve(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = HALLU.base;
  ctx.lineWidth = L * 0.06;
  ctx.beginPath();
  curve(
    ctx,
    pts.map(([px, py]) => [px, py - L * 0.008] as Pt),
  );
  ctx.stroke();
  ctx.strokeStyle = HALLU.light;
  ctx.lineWidth = L * 0.014;
  ctx.beginPath();
  curve(
    ctx,
    pts.map(([px, py]) => [px, py - L * 0.026] as Pt),
  );
  ctx.stroke();
  const [hx, hy] = sp(1);
  toon(ctx, ell(hx + L * 0.02, hy, L * 0.065, L * 0.05), HALLU, L * 0.012);
  ctx.fillStyle = "rgb(50,30,40)";
  ctx.fill(ell(hx + L * 0.04, hy - L * 0.015, L * 0.012, L * 0.012));
  ctx.restore();
}

/** Wiwaxia: pul pul kaplı sırt ve iki sıra uzun, bıçak gibi diken. */
function wiwaxia(ctx: Ctx, x: number, y: number, L: number, t: number) {
  if (L <= 1) return;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.2) * L * 0.01);
  ctx.fillStyle = "rgba(40,24,16,0.2)";
  ctx.fill(ell(L * 0.03, L * 0.02, L * 0.52, L * 0.1));
  const spines = (row: number) => {
    for (let k = 0; k < 8; k++) {
      const u = (k + 0.5) / 8;
      const bx = (u - 0.5) * L * 0.72;
      const by = -L * 0.15 * Math.sin(u * Math.PI) - (row === 0 ? L * 0.02 : 0);
      const lean = (u - 0.5) * 0.9 + (row === 0 ? -0.18 : 0.18) + Math.sin(t * 0.8 + k) * 0.03;
      const len = L * (0.26 + 0.16 * Math.sin(u * Math.PI));
      const tx = bx + Math.sin(lean) * len;
      const ty = by - Math.cos(lean) * len;
      const nx = Math.cos(lean) * L * 0.028;
      const ny = Math.sin(lean) * L * 0.028;
      ctx.fillStyle = row === 0 ? "#c79a3e" : "#f2c35c";
      ctx.beginPath();
      ctx.moveTo(bx - nx, by - ny);
      ctx.quadraticCurveTo((bx + tx) / 2 - nx * 1.2, (by + ty) / 2 - ny * 1.2, tx, ty);
      ctx.quadraticCurveTo((bx + tx) / 2 + nx * 1.2, (by + ty) / 2 + ny * 1.2, bx + nx, by + ny);
      ctx.fill();
      if (row === 1) {
        ctx.strokeStyle = "rgba(255,240,190,0.8)";
        ctx.lineWidth = Math.max(0.7, L * 0.01);
        ctx.beginPath();
        ctx.moveTo(bx - nx * 0.6, by - ny * 0.6);
        ctx.quadraticCurveTo((bx + tx) / 2 - nx, (by + ty) / 2 - ny, tx, ty);
        ctx.stroke();
      }
    }
  };
  spines(0);
  const body = new Path2D();
  body.ellipse(0, 0, L * 0.5, L * 0.2, 0, Math.PI, TAU);
  body.quadraticCurveTo(0, L * 0.06, -L * 0.5, 0);
  toon(
    ctx,
    body,
    pal(rgba(WIWA[0]), rgba(mix(WIWA[0], [20, 20, 60], 0.35)), rgba(WIWA[3])),
    L * 0.03,
  );
  ctx.save();
  ctx.clip(body);
  for (let r = 0; r < 4; r++) {
    for (let c = -6; c <= 6; c++) {
      const px = (c + (r % 2) * 0.5) * L * 0.075;
      const py = -L * 0.03 - r * L * 0.045;
      ctx.fillStyle = rgba(WIWA[(r + c + 8) % 4], 0.9);
      ctx.beginPath();
      ctx.ellipse(px, py, L * 0.045, L * 0.028, 0, Math.PI, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  spines(1);
  ctx.restore();
}

/* ---------- Yüzücüler ---------- */

function swimmers(f: SceneFrame, cam: Cam, fy: number) {
  const { ctx, w, h, t, s, beats } = f;
  const b1 = beats[1];
  const vis = (x: number, m: number) => onScreen(f, cam, x, m);
  const fade = (u: number, i: number) => phase(t, popAt(f, u, i), popAt(f, u, i) + 0.9);

  // Uzakta: bir denizanası ve tarak medüzleri.
  if (vis(1.72 * w, 80 * s))
    jelly(
      ctx,
      1.72 * w + Math.sin(t * 0.3) * 20 * s,
      h * 0.15 - (t - b1) * 3 * s,
      26 * s,
      t,
      fade(1.7, 70),
    );
  for (const [u, v, r, i] of [
    [1.24, 0.2, 22, 0],
    [2.02, 0.36, 18, 1],
  ] as [number, number, number, number][]) {
    const x = u * w + Math.sin(t * 0.4 + i * 2) * 16 * s;
    if (vis(x, 80 * s))
      ctenophore(ctx, x, v * h - (t - b1) * 4 * s, r * s, t + i * 3, fade(u, 71 + i));
  }
  // Marrella sürüsü: tabana yakın, küçük, gökkuşağı parıltılı.
  for (let i = 0; i < 4; i++) {
    const x = 1.62 * w + i * 26 * s + Math.sin(t * 0.7 + i * 1.6) * 30 * s;
    const y = fy - 0.12 * h - i * 7 * s + Math.sin(t * 0.9 + i * 2.3) * 16 * s;
    if (vis(x, 40 * s))
      marrella(
        ctx,
        x,
        y,
        26 * s,
        t + i,
        Math.cos(t * 0.7 + i * 1.6) > 0 ? 1 : -1,
        fade(1.62, 80 + i),
      );
  }
  // Opabinia: beş gözlü, hortumlu; tabanın hemen üstünde süzülür.
  {
    const x = 2.3 * w - Math.max(0, t - b1) * 0.05 * w;
    const y = fy - 0.07 * h + Math.sin(t * 0.8) * 6 * s;
    if (vis(x, 80 * s)) opabinia(ctx, x, y, 100 * s, t, -1, fade(2.2, 90));
  }
  // İlk omurgalılar: küçük bir Haikouichthys sürüsü.
  for (let i = 0; i < 8; i++) {
    const F = schoolAt(f, i);
    if (vis(F.x, 40 * s)) fish(ctx, F.x, F.y, 46 * s, t * (1 + F.fear), 1, i, fade(1.4, 100 + i));
  }
  // Anomalocaris.
  {
    const A = anomAt(f);
    if (vis(A.x, A.L)) anomalocaris(ctx, A.x, A.y, A.L, t, A.tilt, phase(t, b1 - 0.2, b1 + 0.6));
  }
}

function fish(
  ctx: Ctx,
  x: number,
  y: number,
  L: number,
  t: number,
  dir: number,
  seed: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const N = 12;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const mid: Pt[] = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const px = L * (0.5 - u);
    const wv = Math.sin(t * 9 + seed - u * 5) * L * 0.05 * u * u;
    const half =
      L * (0.012 + 0.09 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.8) * (1 - 0.5 * u));
    top.push([px, wv - half]);
    bot.push([px, wv + half * 0.9]);
    mid.push([px, wv]);
  }
  // Yüzgeç kıvrımı: sırtta ve karında saydam zar.
  ctx.fillStyle = "rgba(210,245,255,0.35)";
  ctx.beginPath();
  curve(
    ctx,
    [
      ...top.slice(4).map(([px, py], k) => [px, py - L * 0.05 * Math.sin((k / 8) * Math.PI)] as Pt),
      ...bot
        .slice(6)
        .reverse()
        .map(([px, py], k) => [px, py + L * 0.04 * Math.sin((k / 6) * Math.PI)] as Pt),
    ],
    true,
  );
  ctx.fill();
  const body = new Path2D();
  curve(body, [...top, ...bot.slice().reverse()], true);
  toon(ctx, body, FISH, L * 0.018);
  ctx.save();
  ctx.clip(body);
  ctx.strokeStyle = "rgba(90,140,160,0.45)";
  ctx.lineWidth = Math.max(0.7, L * 0.012);
  ctx.beginPath();
  for (let k = 3; k <= 10; k++) {
    const [mx, my] = mid[k];
    ctx.moveTo(mx + L * 0.03, my - L * 0.08);
    ctx.lineTo(mx - L * 0.01, my);
    ctx.lineTo(mx + L * 0.03, my + L * 0.08);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(60,90,110,0.6)";
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.arc(L * (0.36 - k * 0.035), L * 0.03, L * 0.012, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fill(ell(L * 0.43, -L * 0.02, L * 0.035, L * 0.035));
  ctx.fillStyle = "#1c2a36";
  ctx.fill(ell(L * 0.44, -L * 0.02, L * 0.022, L * 0.022));
  ctx.restore();
}

function anomalocaris(
  ctx: Ctx,
  x: number,
  y: number,
  L: number,
  t: number,
  tilt: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Sola yüzer: yerel çizim sağa bakar, sonra aynalanır.
  ctx.scale(-1, 0.72);
  // Kuyruk yelpazesi.
  for (const [a, l] of [
    [0.45, 0.2],
    [0.8, 0.17],
    [1.15, 0.13],
  ]) {
    for (const sy of [-1, 1]) {
      toon(
        ctx,
        ell(
          -L * 0.5 - Math.cos(a) * L * l * 0.5,
          sy * Math.sin(a) * L * l * 0.5,
          L * l * 0.55,
          L * 0.035,
          sy * a,
        ),
        ANOM,
        L * 0.006,
      );
    }
  }
  // Yan kanatlar: gövde boyunca ilerleyen bir dalga.
  for (let k = 0; k < 11; k++) {
    const px = L * 0.28 - k * L * 0.07;
    const beat = Math.sin(t * 6 - k * 0.65);
    const reach = L * (0.13 + 0.05 * beat) * (1 - k * 0.04);
    for (const sy of [-1, 1]) {
      ctx.fillStyle = sy < 0 ? (k % 2 ? ANOM.base : ANOM.light) : k % 2 ? ANOM.dark : ANOM.base;
      ctx.beginPath();
      ctx.ellipse(
        px,
        sy * (L * 0.08 + reach * 0.5),
        L * 0.045,
        reach * 0.55,
        sy * 0.25 * beat,
        0,
        TAU,
      );
      ctx.fill();
    }
  }
  const body = ell(-L * 0.06, 0, L * 0.42, L * 0.1);
  toon(ctx, body, ANOM, L * 0.012);
  ctx.save();
  ctx.clip(body);
  ctx.strokeStyle = "rgba(150,50,40,0.4)";
  ctx.lineWidth = Math.max(1, L * 0.005);
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const px = -L * 0.44 + k * L * 0.07;
    ctx.moveTo(px, -L * 0.1);
    ctx.quadraticCurveTo(px + L * 0.02, 0, px, L * 0.1);
  }
  ctx.stroke();
  ctx.restore();
  toon(ctx, ell(L * 0.36, 0, L * 0.1, L * 0.085), ANOM, L * 0.01);
  ctx.strokeStyle = ANOM.dark;
  ctx.lineWidth = L * 0.02;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.34, sy * L * 0.05);
    ctx.lineTo(L * 0.36, sy * L * 0.15);
    ctx.stroke();
    ctx.fillStyle = "rgb(40,30,34)";
    ctx.fill(ell(L * 0.36, sy * L * 0.16, L * 0.036, L * 0.036));
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill(ell(L * 0.35, sy * L * 0.16 - L * 0.012, L * 0.012, L * 0.012));
  }
  // Ön kollar: kıvrık, halkalı, dikenli; av kovalarken daha sık kıvrılır.
  for (const sy of [-1, 1]) {
    const curl = 0.9 + 0.3 * Math.sin(t * 1.6);
    let px = L * 0.44;
    let py = sy * L * 0.03;
    let a = sy * 0.15;
    for (let k = 0; k < 10; k++) {
      const r = L * (0.03 - k * 0.0018);
      ctx.fillStyle = k % 2 ? ANOM.light : ANOM.base;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ANOM.dark;
      ctx.lineWidth = Math.max(1, L * 0.006);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + sy * 1.6) * r * 1.7, py + Math.sin(a + sy * 1.6) * r * 1.7);
      ctx.stroke();
      px += Math.cos(a) * r * 1.6;
      py += Math.sin(a) * r * 1.6;
      a += sy * 0.28 * curl;
    }
  }
  ctx.restore();
}

function opabinia(
  ctx: Ctx,
  x: number,
  y: number,
  L: number,
  t: number,
  dir: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  for (let k = 0; k < 3; k++) {
    for (const sy of [-1, 1]) {
      toon(
        ctx,
        ell(-L * 0.47 - k * L * 0.03, sy * L * 0.05, L * 0.13, L * 0.028, sy * (0.45 + k * 0.28)),
        pal("#e25a48", "#b03f33", "#ff9a88"),
        L * 0.006,
      );
    }
  }
  for (let k = 0; k < 11; k++) {
    const px = -L * 0.38 + k * L * 0.065;
    const beat = Math.sin(t * 6 - k * 0.7);
    ctx.fillStyle = k % 2 ? OPAB.dark : OPAB.base;
    ctx.beginPath();
    ctx.ellipse(
      px,
      L * 0.06 + beat * L * 0.015,
      L * 0.04,
      L * 0.035 + beat * L * 0.01,
      beat * 0.3,
      0,
      TAU,
    );
    ctx.fill();
  }
  const body = ell(-L * 0.05, 0, L * 0.4, L * 0.075);
  toon(ctx, body, OPAB, L * 0.012);
  ctx.save();
  ctx.clip(body);
  ctx.strokeStyle = "rgba(140,50,36,0.4)";
  ctx.lineWidth = Math.max(0.8, L * 0.006);
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const px = -L * 0.42 + k * L * 0.065;
    ctx.moveTo(px, -L * 0.08);
    ctx.lineTo(px + L * 0.01, L * 0.08);
  }
  ctx.stroke();
  ctx.restore();
  toon(ctx, ell(L * 0.33, -L * 0.005, L * 0.075, L * 0.06), OPAB, L * 0.01);
  // Beş saplı göz.
  for (let k = 0; k < 5; k++) {
    const bx = L * (0.29 + k * 0.022);
    const tx = bx + (k - 2) * L * 0.02;
    const ty = -L * (0.12 + (k % 2) * 0.02);
    ctx.strokeStyle = OPAB.dark;
    ctx.lineWidth = Math.max(1, L * 0.012);
    ctx.beginPath();
    ctx.moveTo(bx, -L * 0.04);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = "#2a1c22";
    ctx.fill(ell(tx, ty, L * 0.022, L * 0.018));
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill(ell(tx - L * 0.007, ty - L * 0.006, L * 0.007, L * 0.006));
  }
  // Uzun, esnek hortum ve ucundaki kıskaç.
  const reach = Math.sin(t * 1.5) * L * 0.05;
  const hx = L * 0.66 + reach * 0.5;
  const hy = L * 0.14 + reach;
  ctx.strokeStyle = OPAB.base;
  ctx.lineWidth = L * 0.022;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(L * 0.38, L * 0.03);
  ctx.quadraticCurveTo(L * 0.52, L * 0.2, hx, hy);
  ctx.stroke();
  const open = 0.3 + 0.3 * Math.sin(t * 3);
  ctx.strokeStyle = OPAB.dark;
  ctx.lineWidth = L * 0.014;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(
      hx + L * 0.04,
      hy + sy * L * 0.03 * open,
      hx + L * 0.06,
      hy + sy * L * 0.005,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function marrella(
  ctx: Ctx,
  x: number,
  y: number,
  L: number,
  t: number,
  dir: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,230,210,0.8)";
  ctx.lineWidth = Math.max(0.7, L * 0.025);
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.3, 0);
    ctx.quadraticCurveTo(
      L * 0.7,
      sy * L * 0.1,
      L * 0.95,
      sy * L * 0.25 + Math.sin(t * 3) * L * 0.05,
    );
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(L * 0.2, -L * 0.3, -L * 0.8, L * 0.3);
  g.addColorStop(0, "#ff9ad5");
  g.addColorStop(0.5, "#9ae8ff");
  g.addColorStop(1, "#c3a0ff");
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1, L * 0.06);
  for (const [sy, len] of [
    [-1, 0.95],
    [1, 0.8],
  ]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.2, sy * L * 0.04);
    ctx.quadraticCurveTo(-L * 0.2, sy * L * 0.35, -L * len, sy * L * 0.3);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,210,190,0.7)";
  ctx.lineWidth = Math.max(0.6, L * 0.02);
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const px = -L * 0.25 + k * L * 0.07;
    const sw = Math.sin(t * 10 + k) * L * 0.04;
    ctx.moveTo(px, L * 0.05);
    ctx.lineTo(px + sw, L * 0.2);
  }
  ctx.stroke();
  toon(ctx, ell(0, 0, L * 0.32, L * 0.09), pal("#f6c2b0", "#d4917e", "#fff0e8"), L * 0.015);
  ctx.restore();
}

/** Tarak medüzü: sekiz tarak sırası boyunca akan gökkuşağı pırıltısı. */
function ctenophore(ctx: Ctx, x: number, y: number, r: number, t: number, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawGlow(ctx, x, y, r * 2.4, [150, 230, 255], 0.3);
  ctx.strokeStyle = "rgba(220,250,255,0.4)";
  ctx.lineWidth = Math.max(0.7, r * 0.04);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const v = k / 14;
      const px = x + sx * r * 0.5 + sx * Math.sin(v * 5 + t * 1.5) * r * 0.25;
      const py = y + r * 0.6 + v * r * 3;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(200,240,255,0.2)";
  ctx.fill(ell(x, y, r * 0.7, r));
  ctx.strokeStyle = "rgba(230,252,255,0.6)";
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.stroke(ell(x, y, r * 0.7, r));
  for (let row = 0; row < 4; row++) {
    const off = -0.55 + row * 0.37;
    for (let k = 0; k < 10; k++) {
      const v = -0.85 + (k / 9) * 1.7;
      const px = x + off * r * 0.7 * Math.sqrt(Math.max(0, 1 - v * v));
      const py = y + v * r;
      ctx.fillStyle = `hsl(${(k * 30 + row * 50 - t * 260) % 360},95%,72%)`;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.07, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill(ell(x - r * 0.25, y - r * 0.5, r * 0.15, r * 0.25, -0.3));
  ctx.restore();
}

function jelly(ctx: Ctx, x: number, y: number, r: number, t: number, alpha: number) {
  if (alpha <= 0.01) return;
  const pulse = 1 + 0.08 * Math.sin(t * 2.4);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = "rgba(255,200,230,0.5)";
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let k = 0; k < 6; k++) {
    const tx = x - r * 0.6 + k * r * 0.24;
    ctx.beginPath();
    for (let j = 0; j <= 10; j++) {
      const v = j / 10;
      const px = tx + Math.sin(v * 4 + t * 3 + k) * r * 0.08 + Math.sin(t + k) * r * 0.2 * v;
      const py = y + v * r * 1.8;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  drawGlow(ctx, x, y - r * 0.3, r * 1.4, hex("ffb6e0"), 0.25);
  ctx.fillStyle = "rgba(255,190,225,0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y, r * pulse, (r * 0.75) / pulse, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill(ell(x - r * 0.3, y - r * 0.4, r * 0.25, r * 0.12, -0.4));
  ctx.restore();
}

/** Ön plan: kameraya çok yakın, koyu siluetler; derinlik hissi verir. */
function foreground(f: SceneFrame) {
  const { ctx, w, h, t } = f;
  frond(ctx, 0.05 * w, h * 1.05, h * 0.8, 0.1 * Math.sin(t * 0.5), true, SIL);
  frond(ctx, 1.02 * w, h * 1.06, h * 0.62, -0.1 + 0.07 * Math.sin(t * 0.55 + 1), false, SIL);
  algae(ctx, 1.6 * w, h * 1.04, h * 0.5, t, 3, SIL);
  vauxia(ctx, 2.6 * w, h * 1.06, h * 0.5, SIL);
  algae(ctx, 2.5 * w, h * 1.04, h * 0.36, t, 7, SIL);
}

/** Deniz karı ve kameraya yakın, bulanık parçacıklar. */
function snow(f: SceneFrame, cam: Cam) {
  const { ctx, w, h, t, s } = f;
  const span = w * 1.3;
  ctx.fillStyle = "rgba(235,252,255,0.55)";
  ctx.beginPath();
  for (let i = 0; i < 80; i++) {
    const depth = 0.6 + hash(i * 1.3) * 0.8;
    const x =
      wrap(hash(i * 2.9) * span - cam.x * w * depth + Math.sin(t * 0.4 + i) * 8 * s, span) -
      w * 0.15;
    const y = wrap(hash(i * 6.1) * h + t * (5 + hash(i) * 9) * s, h);
    const r = (0.6 + hash(i * 1.1) * 1.3) * s * depth;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x =
      wrap(hash(i * 9.1) * span - cam.x * w * 1.8 + Math.sin(t * 0.3 + i) * 20 * s, span) -
      w * 0.15;
    const y = wrap(hash(i * 3.9) * h + t * 10 * s, h);
    drawGlow(ctx, x, y, (10 + hash(i) * 12) * s, [220, 250, 255], 0.2);
  }
}

function seaLabels(f: SceneFrame, cam: Cam) {
  const { w, h, t, s, beats } = f;
  const [b0, b1, b2] = beats;
  const P = (x: number, y: number) => project(f, cam, x, y);
  const side = (x: number): 1 | -1 => (x > w * 0.56 ? -1 : 1);
  const edOut = 1 - phase(t, b1 - 1.9, b1 - 1.4);
  {
    const i = 6;
    const { x, y, L } = frondGeo(f, i);
    const bend = frondBend(t, FRONDS[i][0], i);
    const [px, py] = P(x + bend * L * 0.3, y - L * 0.55);
    callout(
      f,
      px,
      py,
      "Charnia",
      phase(t, b0 + 0.3, b0 + 1.2) * edOut,
      side(px),
      "yaprak biçimli, ağızsız",
    );
  }
  {
    const D = dickAt(f, 0);
    const [px, py] = P(D.x, D.y - D.r * 0.2);
    callout(
      f,
      px,
      py,
      "Dickinsonia",
      phase(t, b0 + 1.1, b0 + 2) * edOut,
      w > h ? 1 : side(px),
      "yassı gövde, beslenme izleri",
    );
  }
  {
    const K = kimbAt(f, 0);
    const [px, py] = P(K.x, K.y - K.L * 0.1);
    callout(
      f,
      px,
      py,
      "Kimberella",
      phase(t, b0 + 1.9, b0 + 2.8) * edOut,
      side(px),
      "mikrobiyal örtüyü kazır",
    );
  }
  const cOut = 1 - phase(t, b2 - 1, b2 - 0.55);
  const wide = w > h;
  badge(
    f,
    w / 2,
    h * (wide ? 0.12 : 0.11),
    "Kambriyen: gözler, kabuklar ve avcılar",
    phase(t, b1 + 0.7, b1 + 1.3) * cOut,
  );
  {
    const T = triloAt(f, 0);
    const [px, py] = P(T.x, T.y - T.L * 0.12);
    callout(
      f,
      px,
      py,
      "Trilobit",
      phase(t, b1 + 1.2, b1 + 2.1) * cOut,
      -1,
      "bileşik gözler, sert kabuk",
    );
  }
  {
    const A = anomAt(f);
    const [px, py] = P(A.x - A.L * 0.05, A.y - A.L * 0.06);
    callout(
      f,
      px,
      py,
      "Anomalocaris",
      phase(t, b1 + 2, b1 + 2.9) * cOut,
      -1,
      "ilk büyük avcılardan",
      2,
    );
  }
  {
    const F = schoolAt(f, 1);
    const [px, py] = P(F.x + 12 * s, F.y);
    callout(
      f,
      px,
      py,
      "Haikouichthys",
      phase(t, b1 + 2.8, b1 + 3.7) * cOut,
      1,
      "ilk omurgalılardan",
    );
  }
}

/* ---------- Su yüzeyi geçişi ---------- */

function surfaceLine(f: SceneFrame, ys: number): Pt[] {
  const { w, t, s } = f;
  const pts: Pt[] = [];
  for (let i = -1; i <= 17; i++) {
    pts.push([
      (w * i) / 16,
      ys + Math.sin(i * 1.3 + t * 2.4) * 4 * s + Math.sin(i * 0.6 - t * 1.7) * 3 * s,
    ]);
  }
  return pts;
}

function surface(f: SceneFrame, line: Pt[], ys: number) {
  const { ctx, w, t, s } = f;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0, ys, 0, ys + 70 * s);
  g.addColorStop(0, "rgba(190,250,255,0.5)");
  g.addColorStop(1, "rgba(190,250,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  curve(ctx, line);
  ctx.lineTo(w * 1.1, ys + 70 * s);
  ctx.lineTo(-w * 0.1, ys + 70 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(240,255,255,0.95)";
  ctx.lineWidth = Math.max(1.5, 3 * s);
  ctx.beginPath();
  curve(ctx, line);
  ctx.stroke();
  ctx.strokeStyle = "rgba(235,255,255,0.75)";
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  for (let i = 0; i < 22; i++) {
    const x = hash(i * 4.7) * w;
    const y = ys + (18 + wrap(hash(i * 2.3) * 140 - t * 60, 140)) * s;
    const r = (1.5 + hash(i) * 3.5) * s;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 3 + i) * 3 * s, y, r, 0, TAU);
    ctx.stroke();
  }
}

/* ---------- Devoniyen kıyısı ---------- */

function shoreGeo(f: SceneFrame) {
  const wide = f.w > f.h;
  return { wide, wl: f.h * (wide ? 0.6 : 0.58), xb: f.w * 0.5 };
}
type Geo = ReturnType<typeof shoreGeo>;

/** Kıyının kesiti: su altındaki yamaçtan çıkıp sağa doğru uzanan kara. */
function profile(f: SceneFrame, G: Geo): Pt[] {
  const { w, h } = f;
  const { wl, xb } = G;
  return [
    [xb - 0.34 * w, h * 1.1],
    [xb - 0.22 * w, wl + 0.25 * h],
    [xb - 0.09 * w, wl + 0.08 * h],
    [xb, wl],
    [xb + 0.035 * w, wl - 0.03 * h],
    [xb + 0.1 * w, wl - 0.042 * h],
    [xb + 0.22 * w, wl - 0.045 * h],
    [xb + 0.34 * w, wl - 0.053 * h],
    [xb + 0.48 * w, wl - 0.047 * h],
    [xb + 0.7 * w, wl - 0.055 * h],
  ];
}

/** Kara yüzeyinin verilen x’teki yüksekliği. */
function ground(f: SceneFrame, G: Geo, x: number) {
  const pts = profile(f, G);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x <= x1) return y0 + ((y1 - y0) * Math.max(0, x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

function tikAt(f: SceneFrame, G: Geo, u: number) {
  const { w, h } = f;
  const L = Math.min(w, h) * (G.wide ? 0.5 : 0.62);
  const up = phase(u, 1.5, 3, ease.inOut);
  const rot = 0.03 * (1 - up) - 0.14 * up + Math.sin(u * 1.1) * 0.012 * up;
  // Dinlenirken başının ucu kıyının dudağına dayanır; öncesinde suyun altında yüzer.
  const hx = G.xb + 0.05 * w;
  const hy = G.wl - 0.03 * h;
  return {
    x: hx - 0.52 * L * Math.cos(rot) - (1 - up) * L * 0.35,
    y: hy - 0.52 * L * Math.sin(rot) + (1 - up) * L * 0.2,
    L,
    rot,
    up,
  };
}

// x (w), sıra (0 arka, 1 ön), tür (0 Cooksonia, 1 Psilophyton, 2 likofit), çıkış zamanı
const PLANTS: [number, number, number, number][] = [
  [0.6, 1, 0, 0.3],
  [0.66, 0, 0, 0.4],
  [0.71, 1, 0, 0.5],
  [0.77, 0, 0, 0.6],
  [0.83, 1, 0, 0.7],
  [0.88, 0, 0, 0.8],
  [0.93, 1, 0, 0.9],
  [0.98, 0, 0, 1],
  [0.64, 0, 1, 1.2],
  [0.8, 0, 1, 1.35],
  [0.95, 0, 2, 1.5],
  [0.69, 0, 2, 1.65],
  [0.86, 1, 1, 1.8],
  [0.575, 0, 2, 1.95],
];

function plantAt(f: SceneFrame, G: Geo, i: number) {
  const [px, row] = PLANTS[i];
  const x = px * f.w;
  return { x, y: ground(f, G, x) + (row ? 3 : -2) * f.s, size: row ? 1.1 : 0.8 };
}

function shore(f: SceneFrame) {
  const { ctx, w, h, t, beats, dur, s } = f;
  const b2 = beats[2];
  const u = t - b2;
  const G = shoreGeo(f);
  const cam = camera(t, [
    [b2 - 0.5, 0, 0.02, 1.08],
    [dur, 0.02, 0, 1],
  ]);

  ctx.save();
  applyCam(f, cam, 0.1);
  sheet(f, "kara-gok", -0.15 * w, -0.15 * h, 1.15 * w, G.wl + 0.03 * h, (g) => skyBack(g, f, G));
  ctx.restore();

  ctx.save();
  applyCam(f, cam, 0.4);
  farBank(f, G, u);
  ctx.restore();

  ctx.save();
  applyCam(f, cam);
  // Suyun derinliği, sonra karanın kesiti.
  const deep = ctx.createLinearGradient(0, G.wl, 0, h);
  deep.addColorStop(0, "#5fb4d6");
  deep.addColorStop(1, "#15466f");
  ctx.fillStyle = deep;
  ctx.fillRect(-0.2 * w, G.wl, 1.4 * w, h * 0.7);
  sheet(f, "kara-kesit", G.xb - 0.36 * w, G.wl - 0.08 * h, 1.25 * w, h * 1.12, (g) =>
    landSection(g, f, G),
  );
  // Yamaçtaki su bitkileri.
  for (let i = 0; i < 4; i++) {
    const x = G.xb - (0.05 + i * 0.05) * w;
    algae(ctx, x, ground(f, G, x) + 4 * s, (40 + hash(i * 3.3) * 30) * s, t, i + 20, ALGAE[0]);
  }
  const T = tikAt(f, G, u);
  PLANTS.forEach((p, i) => {
    if (PLANTS[i][1] === 0) {
      const P = plantAt(f, G, i);
      plant(f, P.x, P.y, P.size, p[2], pop(u, p[3], 0.8), i);
    }
  });
  const M = millipedeAt(f, G, u);
  millipede(f, M.x, M.y, M.L, t, M.k);
  PLANTS.forEach((p, i) => {
    if (PLANTS[i][1] === 1) {
      const P = plantAt(f, G, i);
      plant(f, P.x, P.y, P.size, p[2], pop(u, p[3], 0.8), i);
    }
  });
  tiktaalik(f, T, t);
  waterOver(f, G, T, t);
  ctx.restore();

  shoreLabels(f, cam, G, u);
  finCard(f, u);
}

function skyBack(g: Ctx, f: SceneFrame, G: Geo) {
  const { w, h, s } = f;
  const x0 = -0.15 * w;
  const x1 = 1.15 * w;
  const grad = g.createLinearGradient(0, 0, 0, G.wl);
  grad.addColorStop(0, "#2a2f6e");
  grad.addColorStop(0.35, "#5a4f9c");
  grad.addColorStop(0.62, "#c7728c");
  grad.addColorStop(0.82, "#f6a47c");
  grad.addColorStop(1, "#ffd49a");
  g.fillStyle = grad;
  g.fillRect(x0, -0.15 * h, x1 - x0, G.wl + 0.2 * h);
  const sx = w * 0.3;
  const sy = G.wl - h * 0.1;
  drawGlow(g, sx, sy, w * 0.55, hex("ffb27a"), 0.5);
  drawGlow(g, sx, sy, w * 0.16, hex("fff0c8"), 0.9);
  g.fillStyle = "#fff6dc";
  g.beginPath();
  g.arc(sx, sy, 26 * s, 0, TAU);
  g.fill();
  cloud(g, w * 0.1, h * 0.19, 64 * s);
  cloud(g, w * 0.6, h * 0.12, 84 * s);
  cloud(g, w * 0.9, h * 0.29, 54 * s);
  cloud(g, w * 0.4, h * 0.33, 40 * s);
  mountains(g, x0, x1, G.wl - 0.05 * h, 0.13 * h, "#8e70a8", "#76598f", 1.3);
  mountains(g, x0, x1, G.wl - 0.015 * h, 0.08 * h, "#6d5a93", "#584579", 5.1);
}

/** Kurzgesagt bulutu: düz tabanlı, üst üste binen yuvarlaklar, açık tepe, koyu alt. */
function cloud(g: Ctx, x: number, y: number, r: number) {
  const puffs: [number, number, number][] = [
    [-0.9, 0.1, 0.42],
    [-0.45, -0.12, 0.58],
    [0.1, -0.3, 0.74],
    [0.62, -0.08, 0.55],
    [1, 0.12, 0.38],
  ];
  const p = new Path2D();
  for (const [px, py, pr] of puffs) {
    p.moveTo(x + px * r + pr * r, y + py * r);
    p.arc(x + px * r, y + py * r, pr * r, 0, TAU);
  }
  g.save();
  g.beginPath();
  g.rect(x - 2 * r, y - 2 * r, 4 * r, 2.3 * r);
  g.clip();
  toon(g, p, pal("#f2a8bb", "#c9869f", "#ffdde3"), r * 0.1);
  g.restore();
}

function mountains(
  g: Ctx,
  x0: number,
  x1: number,
  base: number,
  amp: number,
  light: string,
  dark: string,
  seed: number,
) {
  const n = 12;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const peak = i % 2 === 0 ? 0.55 + 0.45 * hash(i * 3.1 + seed) : 0.12 + 0.2 * hash(i + seed);
    pts.push([x + (hash(i * 7.7 + seed) - 0.5) * (x1 - x0) * 0.03, base - amp * peak]);
  }
  g.fillStyle = light;
  g.beginPath();
  g.moveTo(x0, base + amp);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(x1, base + amp);
  g.closePath();
  g.fill();
  // Gölgeli yamaçlar: her tepenin sağ yüzü.
  g.fillStyle = dark;
  for (let i = 0; i < n; i += 2) {
    const [px, py] = pts[i];
    const [qx, qy] = pts[i + 1];
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(qx, qy);
    g.lineTo(qx - (qx - px) * 0.25, base + amp);
    g.lineTo(px, base + amp);
    g.closePath();
    g.fill();
  }
}

/** Karşı kıyı: sisli tepeler ve zamanla yükselen ilk ormanlar (Archaeopteris, Wattieza). */
function farBank(f: SceneFrame, G: Geo, u: number) {
  const { ctx, w, h, s } = f;
  sheet(f, "kara-tepe", -0.2 * w, G.wl - 0.1 * h, 1.2 * w, G.wl + 0.02 * h, (g) => {
    for (const [c, a, seed] of [
      ["#667a93", 0.05, 2.1],
      ["#4f6f73", 0.028, 6.3],
    ] as [string, number, number][]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 20; i++) {
        pts.push([
          -0.2 * w + (1.4 * w * i) / 20,
          G.wl - h * a * (0.5 + 0.5 * Math.sin(i * 0.8 + seed)),
        ]);
      }
      g.fillStyle = c;
      g.beginPath();
      curve(g, pts);
      g.lineTo(1.2 * w, G.wl + 0.02 * h);
      g.lineTo(-0.2 * w, G.wl + 0.02 * h);
      g.closePath();
      g.fill();
    }
  });
  for (let i = 0; i < 26; i++) {
    const x = -0.12 * w + (i / 26) * 1.3 * w + hash(i * 3.3) * 0.04 * w;
    const k = pop(u, 1.2 + hash(i * 5.7) * 1.7, 0.9);
    if (k <= 0.01) continue;
    const y = G.wl - 0.004 * h - hash(i * 2.1) * 0.025 * h;
    const H = (46 + hash(i * 7.1) * 64) * s;
    const sway = Math.sin(f.t * 0.7 + i) * 0.02;
    if (hash(i * 9.9) > 0.35) archaeopteris(ctx, x, y, H, k, sway);
    else wattieza(ctx, x, y, H, k, sway);
  }
}

function archaeopteris(ctx: Ctx, x: number, y: number, H: number, k: number, sway: number) {
  const hh = H * k;
  ctx.fillStyle = "#3d5750";
  ctx.beginPath();
  ctx.moveTo(x - H * 0.025, y);
  ctx.lineTo(x + sway * hh, y - hh);
  ctx.lineTo(x + H * 0.025, y);
  ctx.fill();
  for (let j = 0; j < 6; j++) {
    const v = 0.35 + (j / 6) * 0.65;
    const cx = x + sway * hh * v;
    const cy = y - hh * v;
    const wd = H * 0.3 * (1 - v * 0.65) * Math.min(1, k * 1.2);
    ctx.fillStyle = "#3f625a";
    ctx.beginPath();
    ctx.ellipse(cx, cy, wd, H * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(242,180,140,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - wd * 0.3, cy - H * 0.02, wd * 0.6, H * 0.02, 0, 0, TAU);
    ctx.fill();
  }
}

function wattieza(ctx: Ctx, x: number, y: number, H: number, k: number, sway: number) {
  const hh = H * 0.85 * k;
  ctx.strokeStyle = "#3d5750";
  ctx.lineWidth = H * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sway * hh, y - hh);
  ctx.stroke();
  const cx = x + sway * hh;
  const cy = y - hh;
  ctx.strokeStyle = "#456a5f";
  ctx.lineWidth = H * 0.035;
  for (let j = 0; j < 7; j++) {
    const a = -Math.PI / 2 + (j - 3) * 0.45;
    const len = H * 0.28 * Math.min(1, k * 1.2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(a) * len * 0.7,
      cy + Math.sin(a) * len * 0.7,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len * 0.4 + len * 0.35,
    );
    ctx.stroke();
  }
}

/** Kıyının kesiti: Devoniyen’in kırmızı kumtaşı katmanları, taşlar ve bir fosil. */
function landSection(g: Ctx, f: SceneFrame, G: Geo) {
  const { w, h, s } = f;
  const pts = profile(f, G);
  const shape = new Path2D();
  curve(shape, pts);
  shape.lineTo(1.3 * w, h * 1.15);
  shape.lineTo(pts[0][0], h * 1.15);
  shape.closePath();
  g.fillStyle = "#8f5c40";
  g.fill(shape);
  g.save();
  g.clip(shape);
  const bands = ["#a0663f", "#c07a4f", "#d9a066", "#b0654a", "#cf8d58", "#96543f", "#b8744c"];
  const x0 = pts[0][0] - 0.1 * w;
  bands.forEach((c, k) => {
    const y0 = G.wl - 0.02 * h + k * 0.058 * h;
    const q = new Path2D();
    q.moveTo(x0, y0);
    for (let i = 0; i <= 24; i++) {
      q.lineTo(
        x0 + (1.6 * w * i) / 24,
        y0 + Math.sin(i * 0.9 + k * 2) * 4 * s + Math.sin(i * 0.37 + k) * 6 * s,
      );
    }
    q.lineTo(1.5 * w, h * 1.2);
    q.lineTo(x0, h * 1.2);
    q.closePath();
    g.fillStyle = c;
    g.fill(q);
  });
  for (let i = 0; i < 46; i++) {
    const x = x0 + hash(i * 3.7) * 1.5 * w;
    const y = G.wl + hash(i * 5.9) * 0.45 * h;
    const r = (2.5 + hash(i * 1.3) * 5) * s;
    g.fillStyle = "rgba(90,50,34,0.45)";
    g.fill(ell(x, y + r * 0.2, r, r * 0.6));
    g.fillStyle = "rgba(240,200,160,0.4)";
    g.fill(ell(x - r * 0.2, y, r * 0.6, r * 0.3));
  }
  // Kayada saklı bir trilobit: katmanlar geçmişin arşividir.
  g.save();
  g.translate(G.xb + 0.3 * w, G.wl + 0.21 * h);
  g.rotate(-0.3);
  g.globalAlpha = 0.75;
  trilobite(g, 0, 0, 38 * s, 0, pal("#e6c8a0", "#b8946a", "#f6e2c4"), 1);
  g.restore();
  g.restore();
  // Üst toprak ve yosunsu örtü, yalnızca suyun üstünde.
  g.save();
  g.beginPath();
  g.rect(-w, -h, 3 * w, G.wl + h);
  g.clip();
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = "#5c4630";
  g.lineWidth = 16 * s;
  g.beginPath();
  curve(
    g,
    pts.map(([x, y]) => [x, y + 7 * s] as Pt),
  );
  g.stroke();
  g.strokeStyle = "#6f8f46";
  g.lineWidth = 7 * s;
  g.beginPath();
  curve(g, pts);
  g.stroke();
  g.strokeStyle = "rgba(214,234,150,0.75)";
  g.lineWidth = 2 * s;
  g.beginPath();
  curve(
    g,
    pts.map(([x, y]) => [x, y - 3 * s] as Pt),
  );
  g.stroke();
  g.restore();
}

/** Su: altında kalan her şeyi (yamaç, Tiktaalik’in gövdesi) renklendirir; yüzeyde ışık ve halkalar. */
function waterOver(f: SceneFrame, G: Geo, T: ReturnType<typeof tikAt>, t: number) {
  const { ctx, w, h, s } = f;
  const pts = profile(f, G);
  const water = new Path2D();
  water.rect(-0.2 * w, G.wl, 1.4 * w, h * 0.7);
  const landShape = new Path2D();
  curve(landShape, pts);
  landShape.lineTo(1.3 * w, h * 1.15);
  landShape.lineTo(pts[0][0], h * 1.15);
  landShape.closePath();
  water.addPath(landShape);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-0.2 * w, G.wl, 1.4 * w, h * 0.7);
  ctx.clip();
  const g = ctx.createLinearGradient(0, G.wl, 0, h);
  g.addColorStop(0, "rgba(90,180,215,0.4)");
  g.addColorStop(1, "rgba(16,64,112,0.72)");
  ctx.fillStyle = g;
  ctx.fill(water, "evenodd");
  // Su altı ışık huzmeleri.
  ctx.clip(water, "evenodd");
  ctx.globalCompositeOperation = "lighter";
  const rw = 160 * s;
  const ray = stamp(f, "kara-huzme2", rw, h * 0.4, (q) => {
    const gr = q.createLinearGradient(0, 0, 0, h * 0.4);
    gr.addColorStop(0, "rgba(215,250,255,0.22)");
    gr.addColorStop(1, "rgba(215,250,255,0)");
    q.fillStyle = gr;
    q.beginPath();
    q.moveTo(rw * 0.05, 0);
    q.lineTo(rw * 0.3, 0);
    q.lineTo(rw, h * 0.4);
    q.lineTo(rw * 0.55, h * 0.4);
    q.closePath();
    q.fill();
  });
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.5 + 0.35 * Math.sin(t * 0.5 + i * 1.9);
    ctx.drawImage(ray, w * (0.02 + i * 0.14) + Math.sin(t * 0.3 + i) * 10 * s, G.wl, rw, h * 0.4);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  // Kabarcıklar: suyun altındayken ağzından, sonra dipten.
  ctx.strokeStyle = "rgba(235,250,255,0.7)";
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  for (let i = 0; i < 14; i++) {
    const fromMouth = i < 6 && T.up < 0.6;
    const bx = fromMouth
      ? T.x + T.L * 0.5 + Math.sin(t * 3 + i) * 4 * s
      : w * (0.05 + hash(i * 4.1) * 0.4);
    const top = G.wl + 4 * s;
    const span = (fromMouth ? T.y : h) - top;
    const by = top + wrap(hash(i * 2.7) * span - t * 40 * s, Math.max(1, span));
    ctx.beginPath();
    ctx.arc(bx, by, (1.5 + hash(i) * 2.5) * s, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // Yüzey çizgisi ve güneş parıltıları.
  const edge = G.xb;
  ctx.fillStyle = "rgba(210,245,255,0.35)";
  ctx.fillRect(-0.2 * w, G.wl, edge + 0.2 * w, 5 * s);
  ctx.strokeStyle = "rgba(240,252,255,0.95)";
  ctx.lineWidth = Math.max(1.2, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-0.2 * w, G.wl);
  ctx.lineTo(edge, G.wl);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const x = w * 0.3 + (hash(i * 3.1) - 0.5) * w * 0.3 + Math.sin(t * 1.3 + i) * 6 * s;
    if (x > edge - 6 * s) continue;
    const a = 0.3 + 0.5 * Math.max(0, Math.sin(t * 3 + i * 2.1));
    ctx.fillStyle = `rgba(255,240,205,${a})`;
    ctx.fillRect(x - 8 * s, G.wl - 1.5 * s, 16 * s, 2.5 * s);
  }
  // Gövdenin yüzeyi deldiği yerden yayılan halkalar.
  const cx = T.x + T.L * 0.1;
  ctx.lineWidth = Math.max(1, 1.4 * s);
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.6 + k / 3) % 1;
    const a = (1 - ph) * 0.7 * T.up;
    if (a <= 0.02) continue;
    ctx.strokeStyle = `rgba(240,252,255,${a})`;
    for (const dir of [-1, 1]) {
      const rx = cx + dir * (0.08 + ph * 0.3) * T.L;
      if (rx > edge) continue;
      ctx.beginPath();
      ctx.arc(rx, G.wl + 1 * s, (4 + ph * 4) * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
}

function plant(
  f: SceneFrame,
  x: number,
  y: number,
  size0: number,
  kind: number,
  k: number,
  seed: number,
) {
  if (k <= 0.01) return;
  const { ctx, t, s } = f;
  const size = size0 * s;
  const sway = Math.sin(t * 1.2 + seed) * 0.06;
  ctx.save();
  ctx.lineCap = "round";
  if (kind === 0) {
    // Cooksonia: yapraksız, ikiye çatallanan gövdeler; uçlarda spor keseleri.
    for (let j = 0; j < 4; j++) {
      const hgt = (30 + hash(seed * 7 + j) * 26) * size * k;
      const bx = x + (j - 1.5) * 6 * size;
      fork(ctx, bx, y, hgt * 0.5, (j - 1.5) * 0.12 + sway, 2, size, "#6aa84f", "#e8b04a");
    }
  } else if (kind === 1) {
    // Psilophyton: daha uzun, çok çatallı, uçları kıvrık.
    for (let j = 0; j < 3; j++) {
      const hgt = (64 + hash(seed * 5 + j) * 40) * size * k;
      fork(
        ctx,
        x + (j - 1) * 9 * size,
        y,
        hgt * 0.42,
        (j - 1) * 0.15 + sway,
        3,
        size,
        "#5a9a4a",
        "#9fcf6a",
      );
    }
  } else {
    // Likofitler: küçük sivri yapraklarla kaplı dik gövdeler.
    for (let j = 0; j < 3; j++) {
      const hgt = (74 + hash(seed * 3 + j) * 50) * size * k;
      const bx = x + (j - 1) * 10 * size;
      const tip: Pt = [bx + (sway + (j - 1) * 0.1) * hgt, y - hgt];
      ctx.strokeStyle = "#4b8a4e";
      ctx.lineWidth = 3.2 * size;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx, y - hgt * 0.6, tip[0], tip[1]);
      ctx.stroke();
      ctx.strokeStyle = "#7cc06c";
      ctx.lineWidth = 1.4 * size;
      ctx.beginPath();
      for (let q = 1; q < 12; q++) {
        const v = q / 12;
        const px = bx + (tip[0] - bx) * v * v;
        const py = y - hgt * v;
        const side = q % 2 ? 1 : -1;
        ctx.moveTo(px, py);
        ctx.lineTo(px + side * 7 * size, py - 5 * size);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function fork(
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  a: number,
  depth: number,
  size: number,
  stem: string,
  tip: string,
) {
  const ex = x + Math.sin(a) * len;
  const ey = y - Math.cos(a) * len;
  ctx.strokeStyle = stem;
  ctx.lineWidth = Math.max(1, (1.2 + depth * 0.6) * size);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + Math.sin(a) * len * 0.3, y - len * 0.6, ex, ey);
  ctx.stroke();
  if (depth === 0) {
    ctx.fillStyle = tip;
    ctx.beginPath();
    ctx.ellipse(ex, ey - 2.5 * size, 2.8 * size, 3.6 * size, a, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(ex - 0.8 * size, ey - 3.5 * size, 0.9 * size, 0, TAU);
    ctx.fill();
    return;
  }
  fork(ctx, ex, ey, len * 0.66, a - 0.36, depth - 1, size, stem, tip);
  fork(ctx, ex, ey, len * 0.66, a + 0.36, depth - 1, size, stem, tip);
}

function millipedeAt(f: SceneFrame, G: Geo, u: number) {
  const { w, s } = f;
  const x = w * 0.74 + Math.max(0, u - 0.8) * 13 * s;
  return { x, y: ground(f, G, x) + 1 * s, L: 90 * s, k: phase(u, 0.8, 1.3) };
}

/** Çokayaklı (binayak): yuvarlak halkalar, halka başına iki çift bacak, dalga gibi yürüyüş. */
function millipede(f: SceneFrame, x: number, y: number, L: number, t: number, k: number) {
  if (k <= 0.01) return;
  const { ctx } = f;
  const n = 16;
  const seg = ballSprite([168, 98, 60], [110, 58, 36], [240, 180, 130]);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = "#3a2618";
  ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.lineCap = "round";
  for (let q = n - 1; q >= 0; q--) {
    const px = x - q * (L / n) * 0.9;
    const py = y - L * 0.03 - Math.sin(t * 3 + q * 0.5) * L * 0.006;
    for (const off of [-0.2, 0.2]) {
      const leg = Math.sin(t * 12 + q * 0.9 + off * 5) * L * 0.018;
      ctx.beginPath();
      ctx.moveTo(px + off * L * 0.02, py);
      ctx.lineTo(px + off * L * 0.02 + leg, py + L * 0.035);
      ctx.stroke();
    }
    drawSprite(ctx, seg, px, py, L * (q === 0 ? 0.045 : 0.038));
  }
  ctx.strokeStyle = "#5a3a24";
  ctx.beginPath();
  ctx.moveTo(x + L * 0.03, y - L * 0.04);
  ctx.quadraticCurveTo(
    x + L * 0.08,
    y - L * 0.1,
    x + L * 0.1,
    y - L * 0.07 + Math.sin(t * 4) * L * 0.01,
  );
  ctx.stroke();
  ctx.restore();
}

/**
 * Tiktaalik: yassı kafa ve üstte gözler, hareketli boyun, pullu gövde; dirsekli ön yüzgeçleri
 * çamura dayanır. Suyun altında kalan kısmını su katmanı renklendirir.
 */
function tiktaalik(f: SceneFrame, T: ReturnType<typeof tikAt>, t: number) {
  const { ctx } = f;
  const { x, y, L, rot, up } = T;
  const pump = Math.max(0, Math.sin(t * 2.2)) ** 2 * up;
  const body = new Path2D();
  body.moveTo(L * 0.52, 0);
  body.quadraticCurveTo(L * 0.46, -L * 0.055, L * 0.36, -L * 0.07);
  body.quadraticCurveTo(L * 0.26, -L * 0.075, L * 0.18, -L * 0.08);
  body.quadraticCurveTo(L * 0.02, -L * 0.105, -L * 0.2, -L * 0.075);
  body.quadraticCurveTo(-L * 0.42, -L * 0.04, -L * 0.6, -L * 0.012);
  body.lineTo(-L * 0.62, L * 0.008);
  body.quadraticCurveTo(-L * 0.42, L * 0.04, -L * 0.2, L * 0.06);
  body.quadraticCurveTo(L * 0.05, L * 0.078, L * 0.22, L * 0.05 + pump * L * 0.012);
  body.quadraticCurveTo(L * 0.38, L * 0.035, L * 0.52, 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // Kuyruk yüzgeci: ışınlı, dalgalanan zar.
  const flick = Math.sin(t * 2) * L * 0.02;
  ctx.fillStyle = "rgba(150,170,100,0.85)";
  ctx.beginPath();
  ctx.moveTo(-L * 0.42, -L * 0.03);
  ctx.quadraticCurveTo(-L * 0.62, -L * 0.1 + flick, -L * 0.72, -L * 0.01 + flick);
  ctx.quadraticCurveTo(-L * 0.62, L * 0.06 + flick, -L * 0.42, L * 0.04);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,110,60,0.55)";
  ctx.lineWidth = Math.max(0.7, L * 0.003);
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const v = k / 8;
    ctx.moveTo(-L * 0.46, -L * 0.02 + v * L * 0.05);
    ctx.lineTo(-L * 0.7, -L * 0.07 + v * L * 0.12 + flick);
  }
  ctx.stroke();
  ctx.fillStyle = "#6f8a48";
  ctx.beginPath();
  ctx.ellipse(-L * 0.28, L * 0.07, L * 0.07, L * 0.02, 0.4, 0, TAU);
  ctx.fill();

  // Gövde: sırt zeytin yeşili, karın krem; alt kenarda gölge hilali, üstte ışık kenarı.
  ctx.fillStyle = "#7d9a55";
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = "#e3d6a4";
  ctx.beginPath();
  ctx.moveTo(-L * 0.7, L * 0.012);
  ctx.quadraticCurveTo(-L * 0.1, L * 0.028, L * 0.55, L * 0.012);
  ctx.lineTo(L * 0.55, L * 0.2);
  ctx.lineTo(-L * 0.7, L * 0.2);
  ctx.fill();
  const box: [number, number, number, number] = [-L * 0.8, -L * 0.3, L * 1.5, L * 0.6];
  crescent(ctx, body, 0, -L * 0.022, "rgba(50,60,30,0.35)", box);
  crescent(ctx, body, 0, L * 0.012, "rgba(214,232,150,0.8)", box);
  ctx.strokeStyle = "rgba(70,86,48,0.4)";
  ctx.lineWidth = Math.max(0.7, L * 0.003);
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const px = -L * 0.5 + i * L * 0.03;
    for (let j = 0; j < 3; j++) {
      const py = -L * 0.065 + j * L * 0.028;
      ctx.moveTo(px + (j % 2) * L * 0.015 + L * 0.014, py);
      ctx.arc(px + (j % 2) * L * 0.015, py, L * 0.014, 0, Math.PI);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(80,96,52,0.55)";
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.arc(
      -L * 0.42 + hash(i * 3.1) * L * 0.8,
      -L * 0.075 + hash(i * 5.3) * L * 0.05,
      L * 0.009,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.restore();

  // Ağız, göz, göz arkasında büyük hava deliği (spirakulum).
  ctx.strokeStyle = "rgba(50,56,34,0.8)";
  ctx.lineWidth = Math.max(1, L * 0.004);
  ctx.beginPath();
  ctx.moveTo(L * 0.52, 0);
  ctx.quadraticCurveTo(L * 0.42, L * 0.014, L * 0.32, L * 0.012);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,50,26,0.7)";
  ctx.lineWidth = Math.max(1, L * 0.006);
  ctx.beginPath();
  ctx.moveTo(L * 0.28, -L * 0.07);
  ctx.quadraticCurveTo(L * 0.3, -L * 0.055, L * 0.285, -L * 0.045);
  ctx.stroke();
  ctx.fillStyle = "#f2e2a8";
  ctx.fill(ell(L * 0.38, -L * 0.072, L * 0.024, L * 0.018));
  ctx.fillStyle = "#1e1c14";
  ctx.fill(ell(L * 0.385, -L * 0.074, L * 0.012, L * 0.012));
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill(ell(L * 0.38, -L * 0.079, L * 0.005, L * 0.005));

  // Ön yüzgeç: omuz–dirsek–bilek; çamura dayanır, ittikçe dirsek bükülür.
  const push = Math.sin(t * 1.4) * L * 0.012 * (0.4 + up * 0.6);
  const reach = 0.6 + up * 0.4;
  const sh: Pt = [L * 0.14, L * 0.03];
  const el: Pt = [L * 0.2 + push * 0.5, L * (0.05 + 0.05 * reach)];
  const wr: Pt = [L * 0.3 + push, L * (0.06 + 0.06 * reach)];
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#5f7a3d";
  ctx.lineWidth = L * 0.034;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1]);
  ctx.lineTo(el[0], el[1]);
  ctx.lineTo(wr[0], wr[1]);
  ctx.stroke();
  ctx.strokeStyle = "#8aa860";
  ctx.lineWidth = L * 0.016;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1] - L * 0.006);
  ctx.lineTo(el[0], el[1] - L * 0.006);
  ctx.lineTo(wr[0], wr[1] - L * 0.006);
  ctx.stroke();
  ctx.fillStyle = "rgba(160,180,110,0.9)";
  ctx.beginPath();
  ctx.moveTo(wr[0] - L * 0.01, wr[1] - L * 0.01);
  ctx.quadraticCurveTo(wr[0] + L * 0.05, wr[1] - L * 0.02, wr[0] + L * 0.07, wr[1] + L * 0.005);
  ctx.quadraticCurveTo(wr[0] + L * 0.03, wr[1] + L * 0.02, wr[0] - L * 0.01, wr[1] + L * 0.01);
  ctx.fill();
  ctx.restore();
}

/** Bir yolun kaydırılmış kopyasının dışında kalan ince şerit: gölge ya da ışık kenarı. */
function crescent(
  ctx: Ctx,
  path: Path2D,
  dx: number,
  dy: number,
  color: string,
  box: [number, number, number, number],
) {
  const p = new Path2D();
  p.rect(box[0], box[1], box[2], box[3]);
  p.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  ctx.fillStyle = color;
  ctx.fill(p, "evenodd");
}

function shoreLabels(f: SceneFrame, cam: Cam, G: Geo, u: number) {
  const { s } = f;
  const P = (x: number, y: number) => project(f, cam, x, y);
  {
    const Q = plantAt(f, G, 2);
    const [ax, ay] = P(Q.x, Q.y - 34 * s * Q.size);
    const k = phase(u, 0.5, 1.4) * (1 - phase(u, 1.8, 2.1));
    callout(f, ax, ay, "İlk kara bitkileri", k, -1, "yapraksız, çatallı gövdeler");
  }
  {
    const M = millipedeAt(f, G, u);
    const [ax, ay] = P(M.x - M.L * 0.2, M.y - M.L * 0.06);
    const k = phase(u, 1.9, 2.8) * (1 - phase(u, 2.8, 3.1));
    callout(f, ax, ay, "Çokayaklı", k, -1, "ilk kara hayvanlarından");
  }
  {
    const T = tikAt(f, G, u);
    const hx = T.x + Math.cos(T.rot) * T.L * 0.3 - Math.sin(T.rot) * -T.L * 0.08;
    const hy = T.y + Math.sin(T.rot) * T.L * 0.3 + Math.cos(T.rot) * -T.L * 0.08;
    const [ax, ay] = P(hx, hy);
    callout(f, ax, ay, "Tiktaalik", phase(u, 3, 3.9), -1, "boynu ve akciğeri olan bir balık");
  }
}

/** Yüzgeçteki kemikler ile insan kolundaki kemikler: aynı düzen, aynı renkler. */
function finCard(f: SceneFrame, u: number) {
  const k = pop(u, 3.2, 0.7);
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const cs = Math.max(0.8, s);
  const cw = Math.min(w * 0.92, 300 * cs);
  const q = cw / 300;
  const ch = 172 * q;
  const wide = w > h;
  const x = wide ? w * 0.94 - cw : (w - cw) / 2;
  const y = wide ? h * 0.2 : h * 0.12;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(18,14,36,0.86)";
  roundRect(ctx, 0, 0, cw, ch, 18 * q);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 15 * q))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Yüzgeç = kolun taslağı", cw / 2, 24 * q);
  const k1 = phase(u, 3.6, 4);
  const k2 = phase(u, 3.9, 4.3);
  const k3 = phase(u, 4.2, 4.6);
  ctx.save();
  ctx.scale(q, q);
  finArt(ctx, 14, 46, k1, k2, k3);
  armArt(ctx, 160, 46, k1, k2, k3);
  ctx.restore();
  ctx.fillStyle = "rgba(230,225,215,0.92)";
  ctx.font = `500 ${Math.round(Math.max(10.5, 12 * q))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Tiktaalik yüzgeci", 76 * q, 124 * q);
  ctx.fillText("insan kolu", 224 * q, 124 * q);
  const legend: [string, string][] = [
    ["üst kol", BONE[0]],
    ["ön kol", BONE[1]],
    ["bilek", BONE[2]],
  ];
  ctx.font = `600 ${Math.round(Math.max(10.5, 12 * q))}px Outfit, system-ui, sans-serif`;
  legend.forEach(([label, color], i) => {
    const lx = (62 + i * 88) * q;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx - 26 * q, 152 * q, 4.5 * q, 0, TAU);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillText(label, lx - 18 * q, 152 * q);
  });
  ctx.restore();
}

const BONE = ["#ffd166", "#64b5ff", "#7ee08a"];

function bone(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wd: number,
  color: string,
  k: number,
) {
  if (k <= 0.01) return;
  const ex = x1 + (x2 - x1) * k;
  const ey = y1 + (y2 - y1) * k;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = wd;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x1, y1, wd * 0.72, 0, TAU);
  ctx.arc(ex, ey, wd * 0.72, 0, TAU);
  ctx.fill();
}

/** Tiktaalik’in ön yüzgeci: tek üst kol kemiği, iki ön kol kemiği, bilek kemikleri, yüzgeç ışınları. */
function finArt(ctx: Ctx, x: number, y: number, k1: number, k2: number, k3: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(125,154,85,0.35)";
  ctx.strokeStyle = "rgba(190,215,140,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(30, 2, 80, 0, 118, 22);
  ctx.bezierCurveTo(88, 50, 34, 48, 0, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,220,170,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = -0.5 + i * 0.13;
    ctx.moveTo(92, 26);
    ctx.lineTo(92 + Math.cos(a) * 26, 26 + Math.sin(a) * 26);
  }
  ctx.stroke();
  bone(ctx, 8, 26, 38, 25, 9, BONE[0], k1);
  bone(ctx, 45, 20, 66, 17, 5.5, BONE[1], k2);
  bone(ctx, 45, 31, 66, 33, 5.5, BONE[1], k2);
  for (let i = 0; i < 5; i++) bone(ctx, 72, 18 + i * 4.5, 86, 12 + i * 8, 3.6, BONE[2], k3);
  ctx.restore();
}

/** İnsan kolu: üst kol kemiği, önkolun iki kemiği, bilek ve el kemikleri. */
function armArt(ctx: Ctx, x: number, y: number, k1: number, k2: number, k3: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(240,190,160,0.22)";
  ctx.strokeStyle = "rgba(255,210,185,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(26, 10, 52, 17);
  ctx.quadraticCurveTo(76, 18, 96, 19);
  ctx.lineTo(112, 10);
  ctx.lineTo(126, 12);
  ctx.lineTo(128, 22);
  ctx.lineTo(128, 32);
  ctx.lineTo(110, 36);
  ctx.quadraticCurveTo(76, 36, 52, 36);
  ctx.quadraticCurveTo(26, 40, 0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  bone(ctx, 8, 26, 46, 26, 8, BONE[0], k1);
  bone(ctx, 54, 22, 90, 22, 4.5, BONE[1], k2);
  bone(ctx, 54, 31, 90, 31, 4.5, BONE[1], k2);
  for (let i = 0; i < 4; i++) bone(ctx, 96, 21 + i * 3.5, 100, 21 + i * 3.5, 3.2, BONE[2], k3);
  for (let i = 0; i < 5; i++) bone(ctx, 104, 18 + i * 3.6, 124, 13 + i * 5.4, 2.4, BONE[2], k3);
  ctx.restore();
}
