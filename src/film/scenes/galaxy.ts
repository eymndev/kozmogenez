import { badge, callout, hash, roundRect, type Ctx, type SceneFrame } from "@/film/scenes/kit";
import { drawGlow, ease, hex, phase, pop, rgba, stamp, type RGB } from "@/film/scenes/art";

/**
 * Samanyolu. Kozmik ağın iplikleri boyunca karanlık madde haleleri; içlerinde küçük, düzensiz
 * cüce galaksiler. Cüceler sırayla ana galaksiye düşer: yıldızları eğik yörüngelerle geniş,
 * yuvarlak bir yıldız halesine saçılır; gazları ise dönerek yassı bir diske çöker ve orada,
 * içten dışa, yeni yıldızlar doğar. Sonunda bugünkü çubuklu sarmal ve Güneş'in yörüngesi.
 */
export function galaxy(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const G = geo(f);
  const final = phase(t, b2 - 0.6, b2 + 1.4);
  const zoom = 0.78 + 0.22 * ease.inOut(phase(t, b1 - 1, b1 + 4)) + 0.08 * ease.inOut(final);
  const disk = phase(t, b1 + 0.4, b1 + 5, (x) => x);
  const dw = DW.map((_, d) => dwarfAt(f, G, d, zoom));
  const merged = dw.reduce((m, p, d) => (d ? m + p[2] : m), 0) / (DW.length - 1);

  ctx.fillStyle = "#03040b";
  ctx.fillRect(0, 0, w, h);
  drawGlow(ctx, G.cx, G.cy, Math.max(w, h) * 0.75, hex("1a1440"), 0.55);
  ctx.fillStyle = "rgb(220,225,255)";
  for (let i = 0; i < 110; i++) {
    ctx.globalAlpha = 0.1 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.3));
    ctx.beginPath();
    ctx.arc(hash(i * 4.3) * w, hash(i * 7.9) * h, (0.4 + hash(i) * 0.9) * s, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  web(f, G, zoom, 1 - 0.85 * phase(t, b1 - 0.5, b1 + 4.5));
  // Karanlık madde: her cücenin kendi halesi; birleştikçe ana hale büyür.
  bubble(
    ctx,
    G.cx,
    G.cy,
    G.R * zoom * (0.5 + 0.65 * merged),
    (1 - 0.3 * merged) * (1 - 0.55 * final),
  );
  for (let d = 1; d < DW.length; d++) {
    const [x, y, fall] = dw[d];
    bubble(ctx, x, y, haloR(f, d, zoom) * (1 - 0.5 * fall), 1 - fall);
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  diskGlow(f, G, zoom, disk, final);
  ctx.restore();

  // Son hali: önbellekli, ayrıntılı galaksi görüntüsü; kollarla aynı açıda döner.
  if (final > 0.01) {
    const size = G.R * 2.3;
    const img = stamp(f, "samanyolu", size, size, (g) => milkyWay(g, size));
    ctx.save();
    ctx.globalAlpha = final;
    ctx.translate(G.cx, G.cy);
    ctx.scale(zoom, zoom * TILT);
    ctx.rotate(spin(t));
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  stars(f, G, zoom, dw, final);
  gas(f, G, zoom, dw, final);
  drawGlow(
    ctx,
    G.cx,
    G.cy,
    G.R * zoom * (0.22 + 0.22 * merged),
    hex("ffd9a0"),
    0.3 + 0.35 * merged,
  );
  ctx.restore();

  sun(f, G, zoom);
  labels(f, G, zoom, dw);
}

const TAU = Math.PI * 2;
const TILT = 0.58;
const TILT_Z = Math.sqrt(1 - TILT * TILT);
const PITCH = 0.22;
/** Kolların dış ucu (galaksi yarıçapı cinsinden); ayrıntılı görüntüyle aynı. */
const ARM_R = 1.058;
const YOUNG = 720;
/** Güneş: diskin yarıçapının ~%52'si (26 bin / 50 bin ışık yılı), iki kolun arasında. */
const SUN_R = 0.52;
const SUN_A = Math.log(SUN_R / 0.16) / Math.tan(PITCH) + Math.PI * 1.25;
const PINK = hex("ff5c9e");
const BLUE = hex("6fa8ff");

type Geo = ReturnType<typeof geo>;
type Dwarf = [number, number, number];

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    wide,
    cx: f.w * (wide ? 0.6 : 0.5),
    cy: f.h * (wide ? 0.46 : 0.42),
    R: Math.min(f.w, f.h) * (wide ? 0.42 : 0.4),
    // Disk dışındaki uzayı ekranın en-boy oranına yay.
    ax: wide ? 1 : 0.6,
    ay: wide ? 0.78 : 1.25,
  };
}

/** Disk ve kolların ortak dönüşü. */
const spin = (t: number) => t * 0.05;

function toScreen(G: Geo, zoom: number, x: number, y: number): [number, number] {
  return [G.cx + x * G.R * zoom * G.ax, G.cy + y * G.R * zoom * G.ay];
}

/* ---------- Kozmik ağ ---------- */

const FIL = [
  { a: -0.62, bend: 0.45 },
  { a: 0.4, bend: -0.4 },
  { a: 2.3, bend: 0.4 },
  { a: 3.62, bend: -0.45 },
];
const FIL_LEN = 1.95;

/** İplik üzerindeki nokta: u=0 merkez, u=1 uzak uç (galaksi yarıçapı cinsinden). */
function filPoint(k: number, u: number): [number, number] {
  const { a, bend } = FIL[k];
  const ex = Math.cos(a) * FIL_LEN;
  const ey = Math.sin(a) * FIL_LEN;
  const mx = ex * 0.5 - Math.sin(a) * bend;
  const my = ey * 0.5 + Math.cos(a) * bend;
  const q = 2 * (1 - u) * u;
  const wob = Math.sin(u * 7 + k * 2) * 0.04;
  return [q * mx + u * u * ex - Math.sin(a) * wob, q * my + u * u * ey + Math.cos(a) * wob];
}

function web(f: SceneFrame, G: Geo, zoom: number, a: number) {
  if (a <= 0.01) return;
  const { ctx, t, s } = f;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const col = hex("6f86e8");
  for (let k = 0; k < FIL.length; k++) {
    ctx.beginPath();
    for (let j = 0; j <= 32; j++) {
      const [x, y] = toScreen(G, zoom, ...filPoint(k, (j / 32) * 1.3));
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    for (const [lw, al] of [
      [44, 0.035],
      [18, 0.06],
      [5, 0.1],
      [1.6, 0.3],
    ]) {
      ctx.strokeStyle = rgba(col, al * a);
      ctx.lineWidth = lw * s;
      ctx.stroke();
    }
  }
  // Gaz iplikler boyunca halelere akar.
  ctx.fillStyle = rgba(hex("c4d0ff"), 0.75 * a);
  ctx.beginPath();
  for (let k = 0; k < FIL.length; k++) {
    for (let j = 0; j < 20; j++) {
      const u = 1.3 * (1 - ((hash(k * 31 + j) + t * 0.05) % 1));
      const [x, y] = toScreen(G, zoom, ...filPoint(k, u));
      const off = (hash(k * 7 + j * 3) - 0.5) * 12 * s;
      const r = 1.3 * s * Math.min(1, u * 4);
      ctx.moveTo(x + off + r, y - off * 0.5);
      ctx.arc(x + off, y - off * 0.5, r, 0, TAU);
    }
  }
  ctx.fill();
  ctx.restore();
}

/** Karanlık madde halesi: kenarı hafifçe parlayan, yarı saydam bir küre. */
function bubble(ctx: Ctx, x: number, y: number, r: number, a: number) {
  if (a <= 0.01 || r <= 1) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(100,70,210,${0.07 * a})`);
  g.addColorStop(0.7, `rgba(115,85,225,${0.1 * a})`);
  g.addColorStop(0.93, `rgba(150,120,255,${0.2 * a})`);
  g.addColorStop(1, "rgba(150,120,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/* ---------- Cüce galaksiler ---------- */

/** [iplik (-1: merkez), iplik üzerindeki yeri, boyu, birleşme anı (b1'e göre, sn)] */
const DW: [number, number, number, number][] = [
  [-1, 0, 1.45, 0],
  [0, 0.4, 0.95, -0.5],
  [2, 0.42, 0.85, -0.1],
  [1, 0.4, 0.8, 0.3],
  [3, 0.5, 0.9, 0.7],
  [1, 0.8, 1.4, 1.3],
  [3, 0.84, 0.75, 1.9],
  [0, 0.8, 0.8, 2.3],
  [2, 0.82, 0.9, 2.7],
  [0, 1.06, 0.7, 3.1],
  [3, 1.1, 0.75, 3.5],
];
/** Gaia–Enceladus: iri bir cüce, ~10 milyar yıl önce. */
const GE = 5;
const LBL_DWARF = 7;
const LBL_HALO = 6;

const OLD: number[] = [];
DW.forEach(([, , size], d) => {
  const n = Math.round(60 * size ** 1.6);
  for (let j = 0; j < n; j++) OLD.push(d);
});

function haloR(f: SceneFrame, d: number, zoom: number) {
  return (40 + 34 * DW[d][2]) * f.s * zoom;
}

/** Cücenin merkezi: ipliği boyunca yavaşça süzülür, sonra sarmal çizerek ana galaksiye düşer. */
function dwarfAt(f: SceneFrame, G: Geo, d: number, zoom: number): Dwarf {
  const [fil, u0, , m] = DW[d];
  if (fil < 0) return [G.cx, G.cy, 0];
  const at = f.beats[1] + m;
  const drift = 1 - 0.22 * phase(f.t, 0, at - 1.8, (x) => x);
  const fall = ease.in(phase(f.t, at - 1.8, at, (x) => x));
  const [x, y] = filPoint(fil, u0 * drift * (1 - fall));
  const sw = fall * 1.2;
  const c = Math.cos(sw);
  const sn = Math.sin(sw);
  const [X, Y] = toScreen(G, zoom, x * c - y * sn, x * sn + y * c);
  return [X, Y, fall];
}

/* ---------- Yıldızlar ---------- */

const COLS: RGB[] = [hex("a8ccff"), hex("eef3ff"), hex("ffe2b0"), hex("ffb98a")];

function stars(f: SceneFrame, G: Geo, zoom: number, dw: Dwarf[], final: number) {
  const { ctx, s } = f;
  // Cücelerin toplu ışığı.
  for (let d = 0; d < DW.length; d++) {
    const [x, y, fall] = dw[d];
    const a = d ? 1 - fall : 1 - phase(f.t, f.beats[1], f.beats[1] + 3);
    if (a > 0.01) drawGlow(ctx, x, y, 34 * s * DW[d][2] * zoom, hex("8fb0ff"), 0.4 * a);
  }
  // 0-3 cüce yıldızları ve şişkinlik, 4-5 yıldız halesi (sönük), 6-7 diskte yeni doğanlar.
  const buckets: number[][] = [[], [], [], [], [], [], [], []];
  for (let i = 0; i < OLD.length; i++) oldStar(f, G, i, zoom, dw, buckets);
  for (let i = 0; i < YOUNG; i++) youngStar(f, G, i, zoom, buckets);
  const fade = 1 - 0.6 * final;
  const styles = [
    rgba(COLS[0], 0.9),
    rgba(COLS[1], 0.9),
    rgba(COLS[2], 0.9),
    rgba(COLS[3], 0.85),
    rgba(COLS[2], 0.55),
    rgba(COLS[3], 0.5),
    rgba(hex("9cc4ff"), 0.9 * fade),
    rgba(hex("e8f0ff"), 0.9 * fade),
  ];
  buckets.forEach((pts, c) => {
    if (!pts.length) return;
    ctx.fillStyle = styles[c];
    ctx.beginPath();
    for (let k = 0; k < pts.length; k += 3) {
      ctx.moveTo(pts[k] + pts[k + 2], pts[k + 1]);
      ctx.arc(pts[k], pts[k + 1], pts[k + 2], 0, TAU);
    }
    ctx.fill();
  });
}

/**
 * Eski yıldız: önce cücesinin düzensiz topaklarından birinde; birleşmeyle eğik, rastgele
 * yönelimli bir yörüngeye savrulur (yıldız halesi). Ana galaksininkiler şişkinliği kurar.
 */
function oldStar(f: SceneFrame, G: Geo, i: number, zoom: number, dw: Dwarf[], out: number[][]) {
  const { t, s } = f;
  const [, b1] = f.beats;
  const d = OLD[i];
  const size = DW[d][2];
  const [dx, dy] = dw[d];
  const spinD = t * (0.22 + hash(d * 1.7) * 0.2);
  const cl = Math.floor(hash(i * 3.7) * 3);
  const ca = hash(d * 11.3 + cl) * TAU + spinD;
  const cr = 0.15 + hash(d * 13.7 + cl) * 0.45;
  const aa = hash(i * 3.3) * TAU + spinD * 1.5;
  const rr = Math.sqrt(hash(i * 7.1)) * 0.45;
  const Rd = 36 * s * size * zoom;
  const x0 = dx + (Math.cos(ca) * cr + Math.cos(aa) * rr) * Rd;
  const y0 = dy + (Math.sin(ca) * cr + Math.sin(aa) * rr) * Rd * 0.8;
  const r = (0.6 + hash(i * 1.9) * 1.1) * s;
  const young = hash(i * 2.9) < 0.45 ? 0 : hash(i * 4.4) < 0.6 ? 1 : 2;
  const main = d === 0;
  const start = main ? b1 - 0.4 + hash(i * 5.1) * 1.6 : b1 + DW[d][3] - 1 + hash(i * 5.1) * 1.2;
  const k = ease.inOut(phase(t, start, start + 1.8, (x) => x));
  if (k <= 0.001) {
    out[young].push(x0, y0, r);
    return;
  }
  const bulge = main && hash(i * 17.3) < 0.75;
  const rh = bulge ? 0.03 + 0.15 * Math.sqrt(hash(i * 5.9)) : 0.16 + 1.05 * hash(i * 5.9) ** 1.4;
  const inc = Math.acos(1 - 2 * hash(i * 6.1));
  const node = hash(i * 8.3) * TAU;
  const ph = hash(i * 9.7) * TAU + t * (0.1 / Math.sqrt(rh + 0.08));
  const ox = Math.cos(ph);
  const oy = Math.sin(ph) * Math.cos(inc);
  const oz = Math.sin(ph) * Math.sin(inc) * (bulge ? 0.55 : 1);
  const cn = Math.cos(node);
  const sn = Math.sin(node);
  const kR = G.R * zoom * rh;
  const hx = G.cx + (ox * cn - oy * sn) * kR;
  const hy = G.cy + ((ox * sn + oy * cn) * TILT - oz * TILT_Z) * kR;
  const c = k < 0.55 ? young : (bulge ? 2 : 4) + (hash(i) < 0.4 ? 1 : 0);
  out[c].push(x0 + (hx - x0) * k, y0 + (hy - y0) * k, r);
}

/** Diskte yeni doğan yıldız: kollar boyunca, önce içte sonra dışta (içten dışa büyüme). */
function youngStar(f: SceneFrame, G: Geo, i: number, zoom: number, out: number[][]) {
  const { t, s } = f;
  const [, b1] = f.beats;
  const u = 0.16 + 0.84 * Math.sqrt(hash(i * 5.9));
  const appear = b1 + 0.6 + 3.4 * u + hash(i * 31.1) * 0.9;
  const a = ease.out(phase(t, appear, appear + 0.6, (x) => x));
  if (a <= 0.02) return;
  const arm = hash(i * 17.3) < 0.72 ? (hash(i * 2.1) < 0.5 ? 0 : 2) : hash(i * 2.1) < 0.5 ? 1 : 3;
  const phi =
    hash(i * 41.3) < 0.22
      ? hash(i * 43.7) * TAU + spin(t)
      : arm * (Math.PI / 2) +
        Math.log(u / 0.16) / Math.tan(PITCH) +
        (hash(i * 23.7) - 0.5) * 0.4 +
        spin(t);
  const R = u * (1 + (hash(i * 29.3) - 0.5) * 0.1) * G.R * ARM_R * zoom;
  out[hash(i * 2.7) < 0.7 ? 6 : 7].push(
    G.cx + Math.cos(phi) * R,
    G.cy + Math.sin(phi) * R * TILT,
    (0.55 + hash(i * 1.9)) * s * a,
  );
}

/** Gaz diski ve kollar: içten dışa, kol kol aydınlanır. */
function diskGlow(f: SceneFrame, G: Geo, zoom: number, disk: number, final: number) {
  if (disk <= 0.001) return;
  const { ctx, t } = f;
  const [, b1] = f.beats;
  const RA = G.R * ARM_R;
  const fade = 1 - 0.7 * final;
  ctx.save();
  ctx.translate(G.cx, G.cy);
  ctx.scale(zoom, zoom * TILT);
  drawGlow(ctx, 0, 0, RA * (0.35 + 0.8 * disk), hex("3a5ab8"), 0.45 * Math.min(1, disk * 2) * fade);
  const col = hex("7aa6ff");
  for (let arm = 0; arm < 4; arm++) {
    const major = arm % 2 === 0;
    for (let k = 0; k < 24; k++) {
      const u = 0.16 + 0.84 * (k / 23);
      const a = phase(t, b1 + 0.6 + 3.4 * u, b1 + 1.8 + 3.4 * u);
      if (a <= 0.01) continue;
      const phi = arm * (Math.PI / 2) + Math.log(u / 0.16) / Math.tan(PITCH) + spin(t);
      const r = RA * u;
      drawGlow(
        ctx,
        Math.cos(phi) * r,
        Math.sin(phi) * r,
        RA * (major ? 0.1 : 0.065) * (1.1 - u * 0.5),
        col,
        (major ? 0.32 : 0.2) * a * fade,
      );
    }
  }
  ctx.restore();
}

/**
 * Gaz: cücelerin pembe yıldız doğum bölgeleri ve mavi gazı. Birleşmede merkez çevresinde
 * kıvrılarak diske iner ve kolların üzerine yerleşir.
 */
function gas(f: SceneFrame, G: Geo, zoom: number, dw: Dwarf[], final: number) {
  const { ctx, t, s } = f;
  const [, b1] = f.beats;
  const fade = 1 - 0.6 * final;
  for (let d = 0; d < DW.length; d++) {
    const [dx, dy] = dw[d];
    const size = DW[d][2];
    const n = d === 0 ? 7 : size > 1 ? 5 : 3;
    const start0 = d === 0 ? b1 - 0.2 : b1 + DW[d][3] - 1.3;
    const spinD = t * (0.22 + hash(d * 1.7) * 0.2);
    for (let j = 0; j < n; j++) {
      const q = d * 10 + j;
      const la = hash(q * 3.1) * TAU + spinD;
      const lr = (0.15 + hash(q * 4.7) * 0.45) * 36 * s * size * zoom;
      const x0 = dx + Math.cos(la) * lr;
      const y0 = dy + Math.sin(la) * lr * 0.8;
      const start = start0 + hash(q * 5.3) * 0.8;
      const k = ease.inOut(phase(t, start, start + 2.2, (x) => x));
      const u = 0.3 + 0.65 * hash(q * 6.1);
      const phi =
        (hash(q * 7.9) < 0.5 ? 0 : Math.PI) + Math.log(u / 0.16) / Math.tan(PITCH) + spin(t);
      const RR = u * G.R * ARM_R * zoom;
      const tx = G.cx + Math.cos(phi) * RR;
      const ty = G.cy + Math.sin(phi) * RR * TILT;
      // Düz bir çizgi yerine disk düzleminde merkez çevresinde kıvrılarak iner.
      const rx = x0 + (tx - x0) * k - G.cx;
      const ry = (y0 + (ty - y0) * k - G.cy) / TILT;
      const sw = Math.sin(Math.PI * k) * 0.9;
      const c = Math.cos(sw);
      const sn = Math.sin(sw);
      const x = G.cx + rx * c - ry * sn;
      const y = G.cy + (rx * sn + ry * c) * TILT;
      const pink = hash(q * 8.8) < 0.55;
      const r = (10 + hash(q * 9.9) * 8) * s * zoom * (d ? size : 1.2) * (1 - 0.3 * k);
      drawGlow(ctx, x, y, r * 2, pink ? PINK : BLUE, (pink ? 0.55 : 0.4) * fade);
    }
  }
}

/** Ayrıntılı Samanyolu: çekirdek, çubuk, iki ana kol ve ara kollar, toz şeritleri, pembe bulutsular. */
function milkyWay(g: Ctx, size: number) {
  const c = size / 2;
  const R = size * 0.46;
  g.save();
  g.translate(c, c);
  drawGlow(g, 0, 0, R * 1.05, hex("6a7ac8"), 0.35);
  drawGlow(g, 0, 0, R * 0.55, hex("ffd9a0"), 0.5);
  // Çubuk.
  g.save();
  g.rotate(0.45);
  g.scale(1, 0.35);
  drawGlow(g, 0, 0, R * 0.32, hex("ffe0b0"), 0.9);
  g.restore();
  drawGlow(g, 0, 0, R * 0.12, hex("fff4dc"), 1);
  // Kollar: yoğun, yumuşak ışık lekeleri ve yıldızlar.
  for (let arm = 0; arm < 4; arm++) {
    const major = arm % 2 === 0;
    for (let k = 0; k < 220; k++) {
      const u = k / 220;
      const rr = R * (0.16 + 0.84 * u);
      const phi =
        arm * (Math.PI / 2) +
        Math.log(rr / (R * 0.16)) / Math.tan(PITCH) +
        (hash(arm * 1000 + k) - 0.5) * 0.25;
      const x = Math.cos(phi) * rr;
      const y = Math.sin(phi) * rr;
      if (k % 3 === 0)
        drawGlow(
          g,
          x,
          y,
          R * (major ? 0.07 : 0.045) * (1 - u * 0.5),
          hex("8ab4ff"),
          major ? 0.35 : 0.22,
        );
      g.fillStyle = `rgba(230,238,255,${0.5 + hash(k) * 0.5})`;
      g.beginPath();
      g.arc(
        x + (hash(k * 3) - 0.5) * R * 0.05,
        y + (hash(k * 5) - 0.5) * R * 0.05,
        0.8 + hash(k * 7) * 1.4,
        0,
        TAU,
      );
      g.fill();
      if (major && hash(arm * 77 + k) > 0.94) drawGlow(g, x, y, R * 0.03, hex("ff7ab0"), 0.8);
    }
    // Toz şeridi: kolun iç kenarında koyu, ince bir iz.
    g.strokeStyle = "rgba(20,10,20,0.45)";
    g.lineWidth = R * (major ? 0.025 : 0.015);
    g.beginPath();
    for (let k = 0; k <= 80; k++) {
      const rr = R * (0.2 + 0.7 * (k / 80));
      const phi = arm * (Math.PI / 2) + Math.log(rr / (R * 0.16)) / Math.tan(PITCH) - 0.12;
      const x = Math.cos(phi) * rr;
      const y = Math.sin(phi) * rr;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // Disk boyunca dağınık yıldızlar.
  for (let k = 0; k < 900; k++) {
    const rr = R * Math.sqrt(hash(k * 3.7));
    const a = hash(k * 9.1) * TAU;
    g.fillStyle = `rgba(255,240,220,${0.15 + hash(k) * 0.4})`;
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.5 + hash(k * 2) * 0.8, 0, TAU);
    g.fill();
  }
  g.restore();
}

/* ---------- Güneş ve etiketler ---------- */

function sun(f: SceneFrame, G: Geo, zoom: number) {
  const { ctx, t, s } = f;
  const [, , b2] = f.beats;
  const k = phase(t, b2 + 0.8, b2 + 1.6);
  if (k <= 0.01) return;
  const Rs = G.R * ARM_R * SUN_R * zoom;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = "rgba(255,214,122,0.6)";
  ctx.lineWidth = Math.max(1, 1.4 * s);
  ctx.setLineDash([5 * s, 5 * s]);
  ctx.lineDashOffset = -t * 10 * s;
  ctx.beginPath();
  ctx.ellipse(G.cx, G.cy, Rs, Rs * TILT, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const a = SUN_A + spin(t);
  const sx = G.cx + Math.cos(a) * Rs;
  const sy = G.cy + Math.sin(a) * Rs * TILT;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  drawGlow(ctx, sx, sy, (14 + pulse * 8) * s, hex("ffd24a"), 0.7);
  ctx.fillStyle = "#fff2c0";
  ctx.beginPath();
  ctx.arc(sx, sy, 3.2 * s, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,240,200,0.9)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.arc(sx, sy, (9 + pulse * 4) * s, 0, TAU);
  ctx.stroke();
  ctx.restore();
  callout(
    f,
    sx,
    sy,
    "Güneş",
    phase(t, b2 + 1.2, b2 + 1.9),
    G.wide ? -1 : 1,
    "merkeze ~26.000 ışık yılı",
    G.wide ? 2.2 : 1.2,
  );
  scaleBar(f, G, zoom, phase(t, b2 + 1.8, b2 + 2.6));
  orbitCard(f, pop(t, b2 + 2.6, 0.7));
}

function labels(f: SceneFrame, G: Geo, zoom: number, dw: Dwarf[]) {
  const { t, w, h } = f;
  const [b0, b1, b2] = f.beats;
  const side = (x: number): 1 | -1 => (x > w * 0.55 ? -1 : 1);
  // Yatay ekranda etiketler birlikte durur; dar ekranda sırayla gelir.
  const show = (a: number, b: number, wa: number, wb: number) =>
    G.wide
      ? phase(t, a, a + 0.7) * (1 - phase(t, b1 - 1.2, b1 - 0.7))
      : phase(t, wa, wa + 0.6) * (1 - phase(t, wb, wb + 0.4));
  const [ax, ay] = dw[LBL_DWARF];
  callout(
    f,
    ax,
    ay,
    "Cüce galaksi",
    show(b0 + 0.3, 0, b0 + 0.2, b0 + 2),
    side(ax),
    "küçük, düzensiz, kalabalık",
  );
  const [hx, hy] = dw[LBL_HALO];
  const hr = haloR(f, LBL_HALO, zoom) * 0.7;
  callout(
    f,
    G.wide ? hx - hr : hx + hr,
    hy - hr,
    "Karanlık madde halesi",
    show(b0 + 1.4, 0, b0 + 2.2, b0 + 3.9),
    G.wide ? -1 : 1,
    "görünmez kütleçekim kuyusu",
  );
  const [fx, fy] = toScreen(G, zoom, ...filPoint(1, 1.02));
  callout(
    f,
    fx,
    fy,
    "Kozmik ağ",
    show(b0 + 2.6, 0, b0 + 4.1, b1 - 0.8),
    -1,
    "gaz ipliklerden halelere akar",
  );
  const [gx, gy] = dw[GE];
  callout(
    f,
    gx,
    gy,
    "Gaia–Enceladus",
    phase(t, b1 - 0.6, b1) * (1 - phase(t, b1 + 1, b1 + 1.4)),
    side(gx),
    "~10 milyar yıl önce birleşti",
  );
  const late = 1 - phase(t, b2 - 0.8, b2 - 0.3);
  if (!G.wide) {
    badge(
      f,
      w / 2,
      h * 0.1,
      "Yıldızlar haleye saçılır, gaz diske çöker",
      phase(t, b1 + 2.2, b1 + 2.9) * late,
    );
    return;
  }
  const RA = G.R * ARM_R * zoom;
  callout(
    f,
    G.cx - RA * 0.62,
    G.cy - RA * 0.5,
    "Yıldız halesi",
    phase(t, b1 + 3.6, b1 + 4.3) * late,
    -1,
    "birleşen cücelerin yıldızları",
  );
  callout(
    f,
    G.cx + RA * 0.42,
    G.cy + RA * 0.12 * TILT,
    "Gaz diski",
    phase(t, b1 + 2.2, b1 + 2.9) * late,
    1,
    "yeni yıldızlar içten dışa doğar",
  );
}

/** Diskin çapı: ana eksen boyunca, merkezden iki yana açılan bir ölçü çizgisi. */
function scaleBar(f: SceneFrame, G: Geo, zoom: number, k: number) {
  if (k <= 0.01) return;
  const { ctx, s } = f;
  const half = G.R * ARM_R * zoom * ease.out(k);
  const y = G.cy;
  const label = "~100.000 ışık yılı";
  ctx.save();
  ctx.strokeStyle = "rgba(243,238,226,0.75)";
  ctx.lineWidth = Math.max(1, 1.3 * s);
  ctx.beginPath();
  ctx.moveTo(G.cx - half, y);
  ctx.lineTo(G.cx + half, y);
  ctx.moveTo(G.cx - half, y - 6 * s);
  ctx.lineTo(G.cx - half, y + 6 * s);
  ctx.moveTo(G.cx + half, y - 6 * s);
  ctx.lineTo(G.cx + half, y + 6 * s);
  ctx.stroke();
  ctx.globalAlpha = phase(k, 0.5, 1);
  ctx.font = `600 ${Math.round(Math.max(10.5, 12 * s))}px Outfit, system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const lx = G.cx + G.R * ARM_R * zoom * 0.62;
  ctx.fillStyle = "rgba(8,8,22,0.82)";
  roundRect(ctx, lx - tw / 2 - 9 * s, y - 11 * s, tw + 18 * s, 22 * s, 11 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(243,238,226,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, lx, y + 0.5 * s);
  ctx.restore();
}

function orbitCard(f: SceneFrame, k: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 240 * s);
  const ch = 84 * s;
  const x = wide ? w * 0.045 : (w - cw) / 2;
  const y = wide ? h * 0.2 : h * 0.64;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,10,26,0.86)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Güneş'in bir turu", 14 * s, 22 * s);
  ctx.fillStyle = "#ffd27a";
  ctx.font = `700 ${Math.round(Math.max(14, 18 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("~230 milyon yıl", 14 * s, 48 * s);
  ctx.fillStyle = "rgba(215,208,196,0.9)";
  ctx.font = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("dinozorlar tek bir turda gelip gitti", 14 * s, 68 * s);
  ctx.restore();
}
