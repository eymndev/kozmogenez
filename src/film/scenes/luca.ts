import { badge, callout, hash, roundRect, type Ctx, type SceneFrame } from "@/film/scenes/kit";
import {
  blob,
  drawBalls,
  drawGlow,
  ease,
  hex,
  layer,
  phase,
  pop,
  rgba,
  stamp,
  type RGB,
} from "@/film/scenes/art";

/**
 * DNA ve ortak ata. Önce yaşamın iş bölümü: çift sarmal DNA arşivdir; ondan bir RNA kopyası
 * çıkar, ribozom onu okuyup amino asitleri bir zincire dizer, zincir katlanıp protein olur.
 * Sonra genetik kodun çarkı: AUG her canlıda aynı anlama gelir. Erken bir topluluğun
 * soyları dallanır, gen alışverişi yapar, çoğu söner; biri LUCA olur. LUCA'nın içine gireriz
 * (zar, DNA, ribozomlar, ATP sentaz) ve ondan iki büyük dal ayrılır: bakteriler ve arkeler.
 */
export function luca(f: SceneFrame) {
  const { t, beats } = f;
  const [, b1, b2] = beats;
  const G = geo(f);
  background(f);
  const dogma = 1 - phase(t, b1 - 0.4, b1 + 0.4);
  if (dogma > 0.01) centralDogma(f, G, dogma);
  const wheelK = phase(t, b1 - 0.3, b1 + 0.8) * (1 - phase(t, b1 + 3.6, b1 + 4.3));
  if (wheelK > 0.01) codeWheel(f, G, wheelK);
  const cell = phase(t, b2 - 0.2, b2 + 0.9) * (1 - phase(t, b2 + 3.1, b2 + 4));
  const treeK = phase(t, b1 + 3.8, b1 + 4.5);
  if (treeK > 0.01) tree(f, G, treeK * (1 - 0.9 * cell));
  if (cell > 0.01) lucaCell(f, G, cell);
  labels(f, G, cell);
}

const TAU = Math.PI * 2;
const lin = (x: number) => x;
const BASE_COL: Record<string, RGB> = {
  A: hex("ff8a5c"),
  U: hex("7fd0ff"),
  T: hex("c98cff"),
  G: hex("f5cf5b"),
  C: hex("8fe07f"),
};
const AA_COLS = ["#ff9a7a", "#8fd6ff", "#ffd36a", "#a8e890", "#e0a0ff", "#ff9ac0"];

type Geo = ReturnType<typeof geo>;

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  const { w, h } = f;
  return {
    wide,
    cx: w * (wide ? 0.64 : 0.5),
    cy: h * (wide ? 0.45 : 0.38),
    // Ağaç: taban, LUCA düğümü, uçlar.
    yb: h * (wide ? 0.76 : 0.68),
    yl: h * (wide ? 0.46 : 0.42),
    yt: h * (wide ? 0.2 : 0.11),
    span: wide ? w * 0.32 : w * 0.44,
    m: Math.min(w, h),
  };
}

function background(f: SceneFrame) {
  const { ctx, w, h, t, s } = f;
  const img = layer(f, "luca-bg", (g) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0a1024");
    bg.addColorStop(1, "#060814");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    drawGlow(g, w * 0.62, h * 0.4, Math.max(w, h) * 0.55, hex("20306a"), 0.5);
    drawGlow(g, w * 0.2, h * 0.8, Math.max(w, h) * 0.4, hex("3a1a4a"), 0.35);
  });
  ctx.drawImage(img, 0, 0, w, h);
  ctx.fillStyle = "rgba(170,200,255,0.25)";
  ctx.beginPath();
  for (let i = 0; i < 50; i++) {
    const x = (hash(i * 3.1) * w + t * 6 * s * (0.5 + hash(i))) % w;
    const y = (hash(i * 5.3) * h + Math.sin(t * 0.4 + i) * 10 * s + h) % h;
    const r = (0.8 + hash(i * 2) * 1.4) * s;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}

/** Yuvarlak, iki tonlu şekil: sağ altta gölge hilali, sol üstte parlaklık. */
function toon(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  sx: number,
  sy: number,
  seed: number,
  base: string,
  shade: string,
) {
  ctx.save();
  blob(ctx, x, y, r, seed, { n: 9, wobble: 0.1, sx, sy });
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.clip();
  blob(ctx, x - r * 0.16 * sx, y - r * 0.2 * sy, r, seed, { n: 9, wobble: 0.1, sx, sy });
  ctx.fillStyle = base;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4 * sx, y - r * 0.45 * sy, r * 0.22 * sx, r * 0.12 * sy, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ---------- 1. DNA → RNA → protein ---------- */

const DNA_SEQ = "ATGGCTTACGAACTGGTACCGATTGCA";

function centralDogma(f: SceneFrame, G: Geo, alpha: number) {
  const { ctx, w, h, t, s } = f;
  const [b0, b1] = f.beats;
  const wide = G.wide;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Çift sarmal.
  const hx0 = wide ? w * 0.28 : w * 0.06;
  const hx1 = wide ? w * 0.58 : w * 0.94;
  const hy = wide ? h * 0.33 : h * 0.17;
  const A = G.m * (wide ? 0.055 : 0.07);
  const inK = ease.out(phase(t, 0.2, 1.6));
  helix(ctx, hx0, hx1, hy, A * inK, t);
  // RNA kopyası: sarmaldan ayrılıp ribozoma akar.
  const P0: [number, number] = [wide ? w * 0.46 : w * 0.5, hy + A * 0.9];
  const P1: [number, number] = wide ? [w * 0.66, h * 0.56] : [w * 0.5, h * 0.42];
  const P2: [number, number] = wide ? [w * 0.96, h * 0.56] : [w * 1.02, h * 0.42];
  const pathPt = (u: number): [number, number, number] => {
    const L1 = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
    const L2 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    const d = u * (L1 + L2);
    if (d < L1) {
      const k = d / L1;
      return [
        P0[0] + (P1[0] - P0[0]) * k,
        P0[1] + (P1[1] - P0[1]) * k + Math.sin(k * Math.PI) * 30 * s,
        Math.atan2(P1[1] - P0[1], P1[0] - P0[0]),
      ];
    }
    const k = (d - L1) / L2;
    return [P1[0] + (P2[0] - P1[0]) * k, P1[1] + (P2[1] - P1[1]) * k, 0];
  };
  const rnaK = phase(t, b0 + 0.9, b1 - 0.4, lin);
  const ntGap = 0.028;
  const head = rnaK * 1.05;
  const ntR = G.m * 0.012;
  const mrna: [number, number, string][] = [];
  for (let k = 0; k < 40; k++) {
    const u = head - k * ntGap;
    if (u < 0) break;
    if (u > 1) continue;
    const [x, y] = pathPt(u);
    mrna.push([x, y, "AUGGCUUACGAACUGGUACCGAUUGCAUAA"[k % 30]]);
  }
  if (mrna.length) {
    ctx.strokeStyle = "#ffd9b0";
    ctx.lineWidth = ntR * 0.9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    mrna.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    for (const [x, y, b] of mrna) {
      ctx.fillStyle = rgba(BASE_COL[b]);
      roundRect(ctx, x - ntR * 0.7, y, ntR * 1.4, ntR * 2.4, ntR * 0.5);
      ctx.fill();
    }
  }
  // Ribozom: büyük ve küçük alt birim, mRNA'yı arasına alır.
  const ribK = pop(t, b0 + 2.4, 0.6);
  const R = G.m * (wide ? 0.07 : 0.085);
  if (ribK > 0.01) {
    const [rx, ry] = P1;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(ribK, ribK);
    toon(ctx, 0, R * 0.95, R * 0.72, 1.25, 0.62, 3, "#9d8cf0", "#6a58c0");
    toon(ctx, 0, -R * 0.55, R, 1.2, 0.8, 7, "#b8a8ff", "#7d6ad8");
    ctx.restore();
  }
  // Amino asitler: ribozomdan çıkan zincir; sonunda katlanıp protein olur.
  const n = Math.max(0, Math.min(18, Math.floor((head - 0.62) / ntGap / 3)));
  const fold = ease.inOut(phase(t, b1 - 1.9, b1 - 0.6));
  if (n > 0 && ribK > 0.5) {
    const [ex, ey] = [P1[0], P1[1] - R * 1.3];
    const [px, py] = wide ? [w * 0.8, h * 0.26] : [w * 0.78, h * 0.3];
    const beads: number[][] = AA_COLS.map(() => []);
    let x = ex;
    let y = ey;
    const br = G.m * 0.013;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + Math.sin(k * 1.3 + t * 0.8) * 0.9 + (k > 6 ? 0.5 : 0);
      x += Math.cos(a) * br * 1.9;
      y += Math.sin(a) * br * 1.9;
      const ga = hash(k * 3.7) * TAU;
      const gr = Math.sqrt(hash(k * 5.1)) * br * 4.2;
      const fx = px + Math.cos(ga) * gr;
      const fy = py + Math.sin(ga) * gr;
      beads[k % AA_COLS.length].push(x + (fx - x) * fold, y + (fy - y) * fold, br);
    }
    if (fold > 0.05) {
      drawGlow(ctx, px, py, br * 9, hex("ffb0d0"), 0.35 * fold);
      ctx.fillStyle = `rgba(255,190,210,${0.3 * fold})`;
      blob(ctx, px, py, br * 5.4, 17, { n: 10, wobble: 0.18, t, live: 0.04 });
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,240,230,0.5)";
    ctx.lineWidth = br * 0.45;
    ctx.beginPath();
    let first = true;
    for (let k = 0; k < n; k++) {
      const b = beads[k % AA_COLS.length];
      const q = Math.floor(k / AA_COLS.length) * 3;
      if (first) ctx.moveTo(b[q], b[q + 1]);
      else ctx.lineTo(b[q], b[q + 1]);
      first = false;
    }
    ctx.stroke();
    beads.forEach((pts, c) => {
      const col = hex(AA_COLS[c].slice(1));
      drawBalls(ctx, pts, col, [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6], [255, 255, 255]);
    });
  }
  // tRNA'lar: amino asit taşıyan küçük L'ler ribozoma gelir.
  if (ribK > 0.5) {
    for (let j = 0; j < 3; j++) {
      const at = b0 + 3.2 + j * 1.1;
      const k = phase(t, at, at + 0.8);
      const out = phase(t, at + 1, at + 1.6);
      if (k <= 0.01 || out >= 0.99) continue;
      const x = P1[0] - R * (2.4 - 2 * k) + R * 1.6 * out;
      const y = P1[1] - R * (2.2 - 1.6 * k) - R * 1.2 * out;
      ctx.globalAlpha = alpha * (1 - out);
      ctx.strokeStyle = "#7ee0b0";
      ctx.lineWidth = R * 0.16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - R * 0.3, y - R * 0.35);
      ctx.lineTo(x, y);
      ctx.lineTo(x + R * 0.35, y - R * 0.1);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + R * 0.35);
      ctx.stroke();
      if (out < 0.2) {
        const col = hex(AA_COLS[j].slice(1));
        drawBalls(
          ctx,
          [x - R * 0.36, y - R * 0.42, G.m * 0.013],
          col,
          [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6],
          [255, 255, 255],
        );
      }
      ctx.globalAlpha = alpha;
    }
  }
  ctx.restore();
}

/** Çift sarmal: iki omurga ve aralarında renkli baz çiftleri; arkadakiler önce çizilir. */
function helix(ctx: Ctx, x0: number, x1: number, y: number, A: number, t: number) {
  if (A <= 0.5) return;
  const K = 90;
  const turn = 0.21;
  const at = (k: number, strand: number) => {
    const phi = k * turn + t * 0.9 + strand * Math.PI;
    return [x0 + ((x1 - x0) * k) / K, y + Math.sin(phi) * A, Math.cos(phi)];
  };
  const seg = (front: boolean) => {
    for (const strand of [0, 1]) {
      ctx.strokeStyle = strand ? "#6fb4ff" : "#c98cff";
      ctx.lineWidth = A * 0.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let k = 0; k < K; k++) {
        const [xa, ya, za] = at(k, strand);
        const [xb, yb] = at(k + 1, strand);
        if (za > 0 !== front) continue;
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
      }
      ctx.globalAlpha *= front ? 1 : 0.55;
      ctx.stroke();
      ctx.globalAlpha /= front ? 1 : 0.55;
    }
  };
  seg(false);
  for (let k = 1; k < K; k += 3) {
    const [xa, ya] = at(k, 0);
    const [, yb] = at(k, 1);
    const b = DNA_SEQ[Math.floor(k / 3) % DNA_SEQ.length];
    const c = { A: "T", T: "A", G: "C", C: "G" }[b] as string;
    const my = (ya + yb) / 2;
    ctx.strokeStyle = rgba(BASE_COL[b]);
    ctx.lineWidth = A * 0.14;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xa, my);
    ctx.stroke();
    ctx.strokeStyle = rgba(BASE_COL[c]);
    ctx.beginPath();
    ctx.moveTo(xa, my);
    ctx.lineTo(xa, yb);
    ctx.stroke();
  }
  seg(true);
}

/* ---------- 2. Genetik kodun çarkı ---------- */

const CODE = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
const AA3: Record<string, string> = {
  F: "Phe",
  L: "Leu",
  S: "Ser",
  Y: "Tyr",
  "*": "dur",
  C: "Cys",
  W: "Trp",
  P: "Pro",
  H: "His",
  Q: "Gln",
  R: "Arg",
  I: "Ile",
  M: "Met",
  T: "Thr",
  N: "Asn",
  K: "Lys",
  V: "Val",
  A: "Ala",
  D: "Asp",
  E: "Glu",
  G: "Gly",
};
const AA_CLASS: Record<string, string> = {
  F: "#f6b38a",
  L: "#f6b38a",
  I: "#f6b38a",
  M: "#ffd27a",
  V: "#f6b38a",
  P: "#f6b38a",
  A: "#f6b38a",
  W: "#f6b38a",
  G: "#f6b38a",
  S: "#9fe0c0",
  T: "#9fe0c0",
  Y: "#9fe0c0",
  C: "#9fe0c0",
  N: "#9fe0c0",
  Q: "#9fe0c0",
  K: "#8cc4ff",
  R: "#8cc4ff",
  H: "#8cc4ff",
  D: "#ff9ab8",
  E: "#ff9ab8",
  "*": "#8a8a9a",
};
const RING = "UCAG";
/** AUG'nin dilimi çarkın neresine düşsün: yatayda tepeye, dikeyde dibe. */
const AUG_OFF = Math.PI + (3.5 / 64) * TAU;
const wheelA0 = (wide: boolean) => (wide ? -Math.PI / 2 - 0.15 : Math.PI / 2 - 0.15) - AUG_OFF;

function wheelGeo(f: SceneFrame, G: Geo) {
  const wide = G.wide;
  return {
    x: wide ? f.w * 0.62 : f.w * 0.5,
    y: wide ? f.h * 0.44 : f.h * 0.33,
    R: wide ? f.h * 0.28 : f.w * 0.37,
  };
}

function drawWheel(g: Ctx, R: number, A0: number) {
  const c = R * 1.02;
  g.translate(c, c);
  const r1 = R * 0.22;
  const r2 = R * 0.42;
  const r3 = R * 0.62;
  const r4 = R;
  const sector = (ra: number, rb: number, a0: number, a1: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(0, 0, rb, a0, a1);
    g.arc(0, 0, ra, a1, a0, true);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(10,14,30,0.9)";
    g.lineWidth = Math.max(1, R * 0.006);
    g.stroke();
  };
  const label = (
    r: number,
    a: number,
    text: string,
    size: number,
    color = "rgba(20,16,24,0.85)",
  ) => {
    g.save();
    g.rotate(a);
    g.translate(r, 0);
    g.rotate(Math.cos(a) < 0 ? Math.PI : 0);
    g.fillStyle = color;
    g.font = `700 ${Math.round(size)}px Outfit, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, 0);
    g.restore();
  };
  for (let i = 0; i < 4; i++) {
    const a0 = A0 + (i / 4) * TAU;
    const a1 = A0 + ((i + 1) / 4) * TAU;
    sector(0, r1, a0, a1, rgba(BASE_COL[RING[i]]));
    label(r1 * 0.6, (a0 + a1) / 2, RING[i], R * 0.1);
    for (let j = 0; j < 4; j++) {
      const b0 = a0 + ((a1 - a0) * j) / 4;
      const b1 = a0 + ((a1 - a0) * (j + 1)) / 4;
      sector(r1, r2, b0, b1, rgba(BASE_COL[RING[j]], 0.85));
      label((r1 + r2) / 2, (b0 + b1) / 2, RING[j], R * 0.065);
      for (let k = 0; k < 4; k++) {
        const c0 = b0 + ((b1 - b0) * k) / 4;
        const c1 = b0 + ((b1 - b0) * (k + 1)) / 4;
        sector(r2, r3, c0, c1, rgba(BASE_COL[RING[k]], 0.7));
        label((r2 + r3) / 2, (c0 + c1) / 2, RING[k], R * 0.042);
      }
    }
  }
  // Amino asit halkası: aynı anlama gelen ardışık kodonlar tek dilimde.
  let q = 0;
  while (q < 64) {
    let e = q;
    while (e + 1 < 64 && CODE[e + 1] === CODE[q] && Math.floor((e + 1) / 4) === Math.floor(q / 4))
      e++;
    const a0 = A0 + (q / 64) * TAU;
    const a1 = A0 + ((e + 1) / 64) * TAU;
    sector(r3, r4, a0, a1, AA_CLASS[CODE[q]]);
    label((r3 + r4) / 2, (a0 + a1) / 2, AA3[CODE[q]], R * 0.052, "rgba(20,16,24,0.9)");
    q = e + 1;
  }
}

/** AUG kodonunun çarktaki dilimleri: A (iç), U (orta), G (dış) ve Met. */
function augArcs(R: number, A0: number): [number, number, number, number][] {
  const i = 2;
  const j = 0;
  const k = 3;
  const a0 = A0 + (i / 4) * TAU;
  const b0 = a0 + (TAU / 16) * j;
  const c0 = b0 + (TAU / 64) * k;
  return [
    [0, R * 0.22, a0, a0 + TAU / 4],
    [R * 0.22, R * 0.42, b0, b0 + TAU / 16],
    [R * 0.42, R * 0.62, c0, c0 + TAU / 64],
    [R * 0.62, R, c0, c0 + TAU / 64],
  ];
}

function codeWheel(f: SceneFrame, G: Geo, k: number) {
  const { ctx, t, s } = f;
  const [, b1] = f.beats;
  const W = wheelGeo(f, G);
  const size = W.R * 2.04;
  const A0 = wheelA0(G.wide);
  const img = stamp(f, "kod-carki", size, size, (g) => drawWheel(g, W.R, A0));
  const sc = 0.6 + 0.4 * ease.back(Math.min(1, k * 1.1));
  const rot = (1 - ease.out(Math.min(1, k * 1.2))) * -1.2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.5);
  drawGlow(ctx, W.x, W.y, W.R * 1.5, hex("4a6ad0"), 0.3);
  ctx.translate(W.x, W.y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  // AUG'nin yolu: içten dışa yanan dilimler.
  augArcs(W.R, A0).forEach(([ra, rb, a0, a1], q) => {
    const on = phase(t, b1 + 0.9 + q * 0.35, b1 + 1.2 + q * 0.35);
    if (on <= 0.01) return;
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * on})`;
    ctx.lineWidth = Math.max(2, 3 * s);
    ctx.beginPath();
    ctx.arc(0, 0, rb, a0, a1);
    ctx.arc(0, 0, ra, a1, a0, true);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.25 * on})`;
    ctx.fill();
  });
  ctx.restore();
  // Aynı sözlüğü kullanan canlılar.
  const orgs = organismsAround(f, G);
  const [mx, my] = metPoint(f, G);
  orgs.forEach(([x, y, kind, name], j) => {
    const p = pop(t, b1 + 1.8 + j * 0.28, 0.5);
    if (p <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.5);
    ctx.strokeStyle = "rgba(255,240,200,0.55)";
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.lineDashOffset = -t * 12 * s;
    const lk = phase(t, b1 + 2 + j * 0.28, b1 + 2.6 + j * 0.28);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (mx - x) * lk, y + (my - y) * lk);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(x, y);
    ctx.scale(p, p);
    drawGlow(ctx, 0, 0, 44 * s, hex("2a3a7a"), 0.7);
    ctx.fillStyle = "rgba(12,18,40,0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, 30 * s, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(150,180,255,0.45)";
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.stroke();
    organism(ctx, kind, 20 * s, t);
    ctx.fillStyle = "rgba(240,236,228,0.95)";
    ctx.font = `600 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(name, 0, 35 * s);
    ctx.restore();
  });
}

function metPoint(f: SceneFrame, G: Geo): [number, number] {
  const W = wheelGeo(f, G);
  const [, , a0, a1] = augArcs(W.R, wheelA0(G.wide))[3];
  const a = (a0 + a1) / 2;
  return [W.x + Math.cos(a) * W.R * 0.81, W.y + Math.sin(a) * W.R * 0.81];
}

function organismsAround(f: SceneFrame, G: Geo): [number, number, number, string][] {
  const { w, h } = f;
  const names = ["bakteri", "arke", "maya", "bitki", "insan"];
  if (G.wide) {
    const W = wheelGeo(f, G);
    const xl = W.x - W.R - w * 0.1;
    const xr = W.x + W.R + w * 0.09;
    return [
      [xl, h * 0.2, 0, names[0]],
      [xl - w * 0.05, h * 0.4, 1, names[1]],
      [xl + w * 0.01, h * 0.6, 2, names[2]],
      [xr, h * 0.3, 3, names[3]],
      [xr, h * 0.55, 4, names[4]],
    ];
  }
  return names.map(
    (n, j) => [w * (0.12 + j * 0.19), h * 0.64, j, n] as [number, number, number, string],
  );
}

/** Minik canlı simgeleri. */
function organism(ctx: Ctx, kind: number, r: number, t: number) {
  ctx.save();
  if (kind === 0) {
    ctx.strokeStyle = "#5ec4ea";
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    for (let q = 0; q <= 12; q++) {
      const x = r * 0.55 + q * r * 0.08;
      const y = Math.sin(q * 0.9 + t * 6) * r * 0.12;
      if (q) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#5ec4ea";
    roundRect(ctx, -r * 0.75, -r * 0.33, r * 1.4, r * 0.66, r * 0.33);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    roundRect(ctx, -r * 0.6, -r * 0.24, r * 0.7, r * 0.16, r * 0.08);
    ctx.fill();
  } else if (kind === 1) {
    toon(ctx, 0, 0, r * 0.62, 1, 1, 5, "#ff8a6a", "#c2503a");
    ctx.strokeStyle = "#ff8a6a";
    ctx.lineWidth = r * 0.06;
    for (let q = 0; q < 7; q++) {
      const a = (q / 7) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
  } else if (kind === 2) {
    toon(ctx, -r * 0.2, r * 0.1, r * 0.55, 1, 1, 8, "#f4e2b8", "#b89a6a");
    toon(ctx, r * 0.45, -r * 0.35, r * 0.32, 1, 1, 9, "#f4e2b8", "#b89a6a");
  } else if (kind === 3) {
    ctx.fillStyle = "#6fcf6a";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.8);
    ctx.bezierCurveTo(-r * 0.9, r * 0.1, -r * 0.4, -r * 0.8, 0, -r * 0.85);
    ctx.bezierCurveTo(r * 0.4, -r * 0.8, r * 0.9, r * 0.1, 0, r * 0.8);
    ctx.fill();
    ctx.strokeStyle = "#2f7a3a";
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.8);
    ctx.lineTo(0, -r * 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#f2c4a0";
    ctx.beginPath();
    ctx.arc(0, -r * 0.45, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.8);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.1, 0, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.1, r * 0.5, r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 3. Erken topluluk, LUCA ve iki büyük dal ---------- */

/** Soy: taban x, uç x (−1..1), bitiş yüksekliği (1: LUCA), eğrilik; `from`: çatallandığı soy ve yer. */
type Lineage = { x0: number; x1: number; end: number; bend: number; from?: [number, number] };

const LINEAGES: Lineage[] = [
  { x0: -0.95, x1: -0.9, end: 0.34, bend: 0.05 },
  { x0: -0.72, x1: -0.64, end: 0.66, bend: -0.05 },
  { x0: -0.5, x1: -0.46, end: 0.22, bend: 0.04 },
  { x0: -0.28, x1: -0.2, end: 0.82, bend: 0.06 },
  { x0: -0.05, x1: 0, end: 1, bend: -0.06 },
  { x0: 0.18, x1: 0.24, end: 0.52, bend: 0.05 },
  { x0: 0.42, x1: 0.34, end: 0.74, bend: -0.05 },
  { x0: 0.66, x1: 0.72, end: 0.3, bend: 0.05 },
  { x0: 0.9, x1: 0.84, end: 0.58, bend: -0.05 },
  { x0: 0, x1: -0.5, end: 0.5, bend: 0.03, from: [1, 0.3] },
  { x0: 0, x1: 0.52, end: 0.42, bend: -0.03, from: [5, 0.2] },
  { x0: 0, x1: 0.14, end: 0.9, bend: 0.03, from: [6, 0.45] },
  { x0: 0, x1: -0.8, end: 0.56, bend: -0.03, from: [0, 0.16] },
];
const SURVIVOR = 4;

/** Soyun u yüksekliğindeki (0 taban, 1 LUCA) yeri. */
function lineagePt(G: Geo, L: Lineage, u: number): [number, number] {
  const X = (x: number) => G.cx + G.span * (G.wide ? x * 0.8 + 0.16 : x * 0.9);
  const y = G.yb + (G.yl - G.yb) * u;
  if (L.from) {
    const [pi, pu] = L.from;
    const [px] = lineagePt(G, LINEAGES[pi], pu);
    const k = Math.max(0, (u - pu) / (L.end - pu));
    return [px + (X(L.x1) - px) * k + Math.sin(k * Math.PI) * L.bend * G.span, y];
  }
  return [X(L.x0 + (L.x1 - L.x0) * u) + Math.sin(u * Math.PI) * L.bend * G.span, y];
}

function tree(f: SceneFrame, G: Geo, alpha: number) {
  const { ctx, t, s } = f;
  const [, b1, b2] = f.beats;
  const grow = phase(t, b1 + 3.6, b2 - 0.8, lin);
  const dom = ease.out(phase(t, b2 + 3.3, b2 + 5.2, lin));
  const faded = 1 - 0.6 * dom;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Taban: sıcak bir kaynağın çevresinde erken hücrelerden bir sis.
  drawGlow(ctx, G.cx + G.span * 0.1, G.yb, G.span * 1.1, hex("2a6a8a"), 0.35 * faded);
  // Gen alışverişi: soylar arasında kesikli yaylar, üstlerinde koşan genler.
  const HGT: [number, number, number][] = [
    [0, 1, 0.25],
    [2, 3, 0.18],
    [3, 4, 0.45],
    [5, 6, 0.3],
    [4, 5, 0.4],
    [7, 8, 0.2],
    [6, 8, 0.5],
    [9, 3, 0.44],
    [11, 4, 0.7],
  ];
  for (const [a, b, u] of HGT) {
    if (grow < u || u > LINEAGES[a].end || u > LINEAGES[b].end) continue;
    const [xa, ya] = lineagePt(G, LINEAGES[a], u);
    const [xb, yb] = lineagePt(G, LINEAGES[b], u);
    const k = phase(grow, u, u + 0.08, lin);
    ctx.strokeStyle = `rgba(160,230,255,${0.55 * faded})`;
    ctx.lineWidth = Math.max(1, 1.3 * s);
    ctx.setLineDash([3 * s, 4 * s]);
    const mx = (xa + xb) / 2;
    const my = (ya + yb) / 2 - 18 * s;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.quadraticCurveTo(mx, my, xa + (xb - xa) * k, ya + (yb - ya) * k);
    ctx.stroke();
    ctx.setLineDash([]);
    const q = (t * 0.6 + u * 3) % 1;
    const gx = (1 - q) * (1 - q) * xa + 2 * (1 - q) * q * mx + q * q * xb;
    const gy = (1 - q) * (1 - q) * ya + 2 * (1 - q) * q * my + q * q * yb;
    if (k > 0.99)
      drawBalls(ctx, [gx, gy, 3 * s], hex("a8ecff"), hex("3a8ab0"), hex("ffffff"), faded);
  }
  // Soylar: büyüyen uçlarda küçük hücreler; sönen soyların ucu griye döner.
  LINEAGES.forEach((L, i) => {
    const u0 = L.from ? L.from[1] : 0;
    const top = Math.min(grow, L.end);
    if (top <= u0 + 0.001) return;
    const survivor = i === SURVIVOR;
    ctx.strokeStyle = survivor ? "#ffd27a" : rgba(hex("6ab8c8"), 0.85 * faded);
    ctx.lineWidth = (survivor ? 4.2 : 2.8) * s;
    ctx.beginPath();
    for (let q = 0; q <= 24; q++) {
      const [x, y] = lineagePt(G, L, u0 + ((top - u0) * q) / 24);
      if (q) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    if (survivor) return;
    const [ex, ey] = lineagePt(G, L, top);
    const dead = phase(grow, L.end, L.end + 0.06, lin);
    const r = 5.5 * s;
    ctx.fillStyle = dead > 0.5 ? `rgba(110,118,128,${faded})` : `rgba(70,170,180,${faded})`;
    ctx.strokeStyle = dead > 0.5 ? `rgba(170,176,184,${faded})` : `rgba(200,250,255,${faded})`;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  // LUCA düğümü.
  const lk = phase(grow, 0.97, 1, lin);
  if (lk > 0.01) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    drawGlow(ctx, G.cx, G.yl, (30 + pulse * 10) * s, hex("ffd27a"), 0.8 * lk);
    drawBalls(ctx, [G.cx, G.yl, 9 * s * lk], hex("ffd27a"), hex("b0802a"), hex("fff6e0"));
  }
  // İki büyük dal.
  if (dom > 0.01) {
    domain(f, G, -1, dom);
    domain(f, G, 1, dom);
  }
  ctx.restore();
}

/** Bakteriler (sol, −1) ya da arkeler (sağ, +1): LUCA'dan yükselen, dallanan bir kol. */
function domain(f: SceneFrame, G: Geo, side: number, k: number) {
  const { ctx, t, s } = f;
  const col = side < 0 ? "#5ec4ea" : "#ff8a6a";
  const mx = G.cx + side * G.span * 0.4;
  const my = G.yl + (G.yt - G.yl) * 0.45;
  drawGlow(ctx, mx, my, G.span * 0.5, hex(side < 0 ? "2a7aa8" : "a84a3a"), 0.25 * k);
  ctx.strokeStyle = col;
  ctx.lineWidth = 5 * s;
  const k1 = Math.min(1, k * 2);
  ctx.beginPath();
  ctx.moveTo(G.cx, G.yl);
  ctx.quadraticCurveTo(
    G.cx + side * G.span * 0.05,
    G.yl + (my - G.yl) * 0.7,
    G.cx + (mx - G.cx) * k1,
    G.yl + (my - G.yl) * k1,
  );
  ctx.stroke();
  const k2 = Math.max(0, k * 2 - 1);
  if (k2 <= 0) return;
  [-0.2, 0.05, 0.3, 0.55].forEach((dx, q) => {
    const tx = mx + side * G.span * dx;
    const ty = G.yt + (q % 2 ? 0.05 : 0) * f.h;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(
      mx + (tx - mx) * 0.15,
      my + (ty - my) * 0.65,
      mx + (tx - mx) * k2,
      my + (ty - my) * k2,
    );
    ctx.stroke();
    const p = phase(k2, 0.85, 1, lin);
    if (p > 0.01) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(p, p);
      tipCell(ctx, side, q, 15 * s, t);
      ctx.restore();
    }
  });
}

/** Dal uçlarındaki minik hücreler: çubuk, küre, sarmal, kamçılı; arkelerde loblu ve kare. */
function tipCell(ctx: Ctx, side: number, q: number, r: number, t: number) {
  const bact = side < 0;
  const base = bact
    ? ["#5ec4ea", "#7fe0c8", "#8cc4ff", "#6ad0f0"][q]
    : ["#ff8a6a", "#ffb08a", "#ff9ac0", "#ffa070"][q];
  const shade = bact ? "#2a7aa8" : "#b84a3a";
  if (q === 0) {
    toon(ctx, 0, 0, r, 1, 0.45, 3, base, shade);
  } else if (q === 1 && bact) {
    toon(ctx, 0, 0, r * 0.7, 1, 1, 5, base, shade);
  } else if (q === 1) {
    ctx.fillStyle = shade;
    ctx.fillRect(-r * 0.75, -r * 0.7, r * 1.55, r * 1.5);
    ctx.fillStyle = base;
    ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.5, r * 1.45);
  } else if (q === 2 && bact) {
    ctx.strokeStyle = base;
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) {
      const x = -r + (k / 14) * r * 2;
      const y = Math.sin(k * 1.1 + t * 3) * r * 0.35;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  } else if (q === 2) {
    toon(ctx, 0, 0, r * 0.8, 1, 1, 13, base, shade);
    ctx.strokeStyle = base;
    ctx.lineWidth = r * 0.1;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + t * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
      ctx.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
      ctx.stroke();
    }
  } else {
    toon(ctx, 0, 0, r * 0.85, 1, 0.5, 17, base, shade);
    ctx.strokeStyle = base;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = r * 0.8 + k * r * 0.12;
      const y = Math.sin(k + t * 5) * r * 0.2;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

/* ---------- 4. LUCA'nın içi ---------- */

function cellGeo(f: SceneFrame, G: Geo, k: number) {
  const e = ease.inOut(k);
  const R = (G.wide ? f.h * 0.27 : f.w * 0.4) * e;
  const cx = G.cx;
  const cy = G.yl + ((G.wide ? f.h * 0.42 : f.h * 0.36) - G.yl) * e;
  return { cx, cy, R };
}

function lucaCell(f: SceneFrame, G: Geo, k: number) {
  const { ctx, t } = f;
  const { cx, cy, R } = cellGeo(f, G, k);
  if (R < 2) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  drawGlow(ctx, cx, cy, R * 1.5, hex("3a8ab0"), 0.35);
  // Sitoplazma.
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  g.addColorStop(0, "#2c6a7c");
  g.addColorStop(1, "#153848");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  // DNA: kıvrımlı, halka biçimli kromozom.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const dna = (w: number, col: string, dash: number[] = []) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.setLineDash(dash);
    ctx.beginPath();
    // Kendi üstüne sarılmış halka: büyük bir çember boyunca küçük ilmekler.
    for (let q = 0; q <= 240; q++) {
      const a = (q / 240) * TAU;
      const r0 = R * (0.3 + 0.03 * Math.sin(a * 3 + t * 0.5));
      const x = cx - R * 0.1 + Math.cos(a) * r0 + Math.cos(a * 11 + t * 0.3) * R * 0.075;
      const y = cy + R * 0.03 + Math.sin(a) * r0 * 0.78 + Math.sin(a * 11 + t * 0.3) * R * 0.075;
      if (q) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  dna(R * 0.04, "#c98cff");
  dna(R * 0.018, "#6fb4ff", [R * 0.025, R * 0.025]);
  // Ribozomlar ve üzerlerinde okunan mRNA.
  for (let j = 0; j < 9; j++) {
    const a = hash(j * 3.3) * TAU + t * 0.08;
    const rr = R * (0.55 + hash(j * 5.1) * 0.25);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const r = R * 0.07;
    toon(ctx, x, y + r * 0.45, r * 0.7, 1.2, 0.6, j, "#9d8cf0", "#6a58c0");
    toon(ctx, x, y - r * 0.2, r, 1.15, 0.78, j + 20, "#b8a8ff", "#7d6ad8");
  }
  // Proteinler.
  const prot: number[][] = AA_COLS.map(() => []);
  for (let j = 0; j < 16; j++) {
    const a = hash(j * 7.7) * TAU + t * (0.1 + hash(j) * 0.1);
    const rr = R * (0.2 + hash(j * 2.9) * 0.62);
    prot[j % AA_COLS.length].push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R * 0.025);
  }
  prot.forEach((pts, c) => {
    const col = hex(AA_COLS[c].slice(1));
    drawBalls(ctx, pts, col, [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6], [255, 255, 255]);
  });
  // Zar: çift katman.
  ctx.strokeStyle = "#f3e2a8";
  ctx.lineWidth = R * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  const heads: number[] = [];
  const n = 110;
  for (let q = 0; q < n; q++) {
    const a = (q / n) * TAU;
    heads.push(cx + Math.cos(a) * R * 1.035, cy + Math.sin(a) * R * 1.035, R * 0.018);
    heads.push(cx + Math.cos(a) * R * 0.965, cy + Math.sin(a) * R * 0.965, R * 0.018);
  }
  drawBalls(ctx, heads, hex("5ec4ea"), hex("2a7aa8"), hex("d8f4ff"));
  atpSynthase(ctx, cx, cy, R, t);
  ctx.restore();
}

const ATP_A = -0.35;

/** ATP sentaz: zardaki dönen çark (F0), sap ve içerideki başlık (F1); protonlar içeri akar. */
function atpSynthase(ctx: Ctx, cx: number, cy: number, R: number, t: number) {
  const a = ATP_A;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  ctx.save();
  ctx.translate(cx + ux * R, cy + uy * R);
  ctx.rotate(a);
  // F0 halkası.
  ctx.fillStyle = "#e07a9a";
  roundRect(ctx, -R * 0.06, -R * 0.1, R * 0.12, R * 0.2, R * 0.04);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = R * 0.012;
  for (let q = 0; q < 4; q++) {
    const y = ((q / 4 + t * 0.8) % 1) * R * 0.2 - R * 0.1;
    ctx.beginPath();
    ctx.moveTo(-R * 0.06, y);
    ctx.lineTo(R * 0.06, y);
    ctx.stroke();
  }
  // Sap ve F1 başlığı.
  ctx.fillStyle = "#c86a8a";
  ctx.fillRect(-R * 0.16, -R * 0.02, R * 0.12, R * 0.04);
  ctx.save();
  ctx.translate(-R * 0.24, 0);
  ctx.rotate(t * 1.6);
  for (let q = 0; q < 6; q++) {
    const b = (q / 6) * TAU;
    toon(
      ctx,
      Math.cos(b) * R * 0.055,
      Math.sin(b) * R * 0.055,
      R * 0.045,
      1,
      1,
      q,
      q % 2 ? "#ff9ab8" : "#ffc0d4",
      "#b85a7a",
    );
  }
  ctx.restore();
  // Protonlar dışarıdan içeri akar; ATP içeri salınır.
  const pts: number[] = [];
  for (let q = 0; q < 5; q++) {
    const u = (t * 0.7 + q / 5) % 1;
    pts.push(R * (0.28 - u * 0.44), Math.sin(q * 2 + t) * R * 0.03 * (1 - u), R * 0.018);
  }
  drawBalls(ctx, pts, hex("ff6a6a"), hex("a02a3a"), hex("ffd0d0"));
  const atp: number[] = [];
  for (let q = 0; q < 3; q++) {
    const u = (t * 0.45 + q / 3) % 1;
    atp.push(-R * (0.3 + u * 0.3), (q - 1) * R * 0.08 * u, R * 0.02 * (1 - u * 0.5));
  }
  drawBalls(ctx, atp, hex("ffd27a"), hex("b08020"), hex("fff6e0"));
  ctx.restore();
}

/* ---------- Etiketler ---------- */

function labels(f: SceneFrame, G: Geo, cell: number) {
  const { t, w, h } = f;
  const [b0, b1, b2] = f.beats;
  const wide = G.wide;
  const out = 1 - phase(t, b1 - 0.6, b1 - 0.2);
  const hx0 = wide ? w * 0.28 : w * 0.06;
  const hy = wide ? h * 0.33 : h * 0.17;
  const A = G.m * (wide ? 0.055 : 0.07);
  const seq = (a: number, b: number, pa: number, pb: number) =>
    wide
      ? phase(t, a, a + 0.6) * (1 - phase(t, b, b + 0.4))
      : phase(t, pa, pa + 0.6) * (1 - phase(t, pb, pb + 0.4));
  callout(
    f,
    wide ? hx0 + w * 0.02 : w * 0.3,
    hy - A,
    "DNA",
    seq(b0 + 0.3, b1 - 0.7, b0 + 0.3, b0 + 2.2) * out,
    wide ? -1 : 1,
    "çift iplik: kararlı arşiv",
  );
  const [mx, my] = wide ? [w * 0.555, h * 0.5] : [w * 0.5, h * 0.33];
  callout(
    f,
    mx,
    my,
    "RNA",
    seq(b0 + 1.6, b1 - 0.7, b0 + 2.4, b0 + 4),
    wide ? -1 : 1,
    "genin geçici kopyası",
  );
  const R = G.m * (wide ? 0.07 : 0.085);
  const [rx, ry] = wide
    ? [w * 0.66 + R * 0.9, h * 0.56 - R * 1.1]
    : [w * 0.5 + R * 0.9, h * 0.42 - R * 1.1];
  callout(
    f,
    rx,
    ry,
    "Ribozom",
    seq(b0 + 3, b1 - 0.7, b0 + 4.1, b0 + 5.4),
    1,
    "kalbi RNA'dan yapılmış",
    wide ? 1 : 0.6,
  );
  const [px, py] = wide ? [w * 0.8, h * 0.26] : [w * 0.78, h * 0.3];
  callout(
    f,
    px - 20,
    py - 10,
    "Protein",
    seq(b1 - 2, b1 - 0.7, b1 - 2, b1 - 0.7),
    -1,
    "işi yapan katlanmış zincir",
  );
  badge(
    f,
    w / 2,
    h * (wide ? 0.13 : 0.1),
    "DNA saklar · RNA taşır · protein iş görür",
    phase(t, b0 + 4.4, b0 + 5) * (1 - phase(t, b1 - 0.7, b1 - 0.3)),
  );
  const [ax, ay] = metPoint(f, G);
  callout(
    f,
    ax,
    ay,
    "AUG → Met",
    phase(t, b1 + 2, b1 + 2.6) * (1 - phase(t, b1 + 3.5, b1 + 3.9)),
    -1,
    "her canlıda 'başla' demek",
    wide ? 1.2 : 0.8,
  );
  badge(
    f,
    w / 2,
    h * (wide ? 0.13 : 0.1),
    "Bakteriden insana aynı genetik kod",
    phase(t, b1 + 0.4, b1 + 1) * (1 - phase(t, b1 + 3.5, b1 + 3.9)),
  );
  const [ex, ey] = lineagePt(G, LINEAGES[6], 0.3);
  callout(
    f,
    ex,
    ey,
    "Erken topluluk",
    phase(t, b1 + 4.8, b1 + 5.4) * (1 - phase(t, b2 - 0.6, b2 - 0.2)),
    1,
    "genler soylar arasında el değiştirir",
  );
  const lu = phase(t, b2 - 1.2, b2 - 0.6) * (1 - cell) + phase(t, b2 + 4.4, b2 + 5);
  callout(f, G.cx + 6, G.yl - 6, "LUCA", Math.min(1, lu), 1, "son evrensel ortak ata", 1.2);
  // LUCA'nın içindekiler.
  const C = cellGeo(f, G, cell);
  if (cell > 0.95) {
    const ins = phase(t, b2 + 0.8, b2 + 1.3) * (1 - phase(t, b2 + 2.9, b2 + 3.2));
    const Rc = C.R;
    callout(
      f,
      C.cx - Rc * 0.7,
      C.cy - Rc * 0.72,
      "Zar",
      ins,
      wide ? -1 : 1,
      "içeriyi dışarıdan ayırır",
    );
    callout(
      f,
      C.cx - Rc * 0.12 - Rc * 0.3,
      C.cy + Rc * 0.26,
      "DNA",
      ins,
      -1,
      "halka biçimli arşiv",
      wide ? 1.4 : 0.8,
    );
    const ra = hash(0) * TAU + t * 0.08;
    const rr = Rc * (0.55 + hash(0) * 0.25);
    callout(
      f,
      C.cx + Math.cos(ra) * rr,
      C.cy + Math.sin(ra) * rr - Rc * 0.06,
      "Ribozom",
      ins,
      Math.cos(ra) > 0 === wide ? 1 : -1,
      "protein üretir",
    );
    callout(
      f,
      C.cx + Math.cos(ATP_A) * Rc * 1.08,
      C.cy + Math.sin(ATP_A) * Rc * 1.08,
      "ATP sentaz",
      ins,
      wide ? 1 : -1,
      "proton akışından enerji",
      wide ? 1 : 0.9,
    );
  }
  // Dalların adları.
  const dk = phase(t, b2 + 4.8, b2 + 5.4);
  if (dk > 0.01) {
    const { ctx, s } = f;
    ctx.save();
    ctx.globalAlpha = dk;
    ctx.font = `600 ${Math.round(Math.max(14, 18 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8 * s;
    const ly = G.yl + (G.yt - G.yl) * 0.42;
    ctx.fillStyle = "#8fe0ff";
    ctx.fillText("Bakteriler", G.cx - G.span * 0.42 - (wide ? 80 : 50) * s, ly);
    ctx.fillStyle = "#ffa88a";
    ctx.fillText("Arkeler", G.cx + G.span * 0.42 + (wide ? 70 : 42) * s, ly);
    ctx.restore();
  }
}
