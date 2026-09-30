import { badge, callout, hash, roundRect, type Ctx, type SceneFrame } from "@/film/scenes/kit";
import {
  blob,
  drawBalls,
  drawGlow,
  ease,
  hex,
  layer,
  phase,
  planet,
  pop,
  rgba,
  sparkle,
  type RGB,
} from "@/film/scenes/art";

/**
 * RNA dünyası. Volkanik bir kıyıdaki sıcak bir gölete dalarız. Suda serbest nükleotitler
 * sürüklenir; bir RNA ipliği kalıp olur, eşleşen harfler (A–U, G–C) tek tek gelip yeni bir
 * iplik örer. İplikler ayrılır; kopya kendi üstüne katlanıp bir ribozime dönüşür ve iki RNA
 * parçasını birleştirir. Sonra yağ asitleri kendiliğinden bir kesecik kurup RNA'ları içine
 * alır: içeri sızan nükleotitlerle kopyalama sürer, kesecik büyür ve ikiye bölünür.
 */
export function rna(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [b0, , b2] = beats;
  const G = geo(f);
  const dive = phase(t, b0 + 0.2, b0 + 1.7);
  const out = ease.inOut(phase(t, b2 + 4.6, b2 + 6.2));

  if (dive > 0.01) {
    water(f, G);
    const z = (0.6 + 0.4 * ease.out(dive)) * (1 - 0.32 * out);
    ctx.save();
    ctx.globalAlpha = Math.min(1, dive * 1.6);
    ctx.translate(G.cx, G.cy);
    ctx.scale(z, z);
    ctx.translate(-G.cx, -G.cy);
    others(f, G, out);
    clay(f, G);
    drift(f, G);
    lipids(f, G);
    strands(f, G);
    ctx.restore();
  }
  if (dive < 0.99) pond(f, G, dive);
  card(f);
  labels(f, G, out);
}

const TAU = Math.PI * 2;
const lin = (x: number) => x;
const COMP: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };
/** Kopya ipliği saç tokası gibi katlanabilsin diye kendi içinde eşleşen bir dizi. */
const COPY = "GCAUCAAGAUGC";
const TEMPLATE = [...COPY].map((b) => COMP[b]).join("");
const N = COPY.length;
const BASES: Record<string, [RGB, RGB]> = {
  A: [hex("ff8a5c"), hex("cf5530")],
  U: [hex("7fd0ff"), hex("3d90c6")],
  G: [hex("f5cf5b"), hex("c29424")],
  C: [hex("8fe07f"), hex("4c9e43")],
};
const LIPID_N = 76;

type Geo = ReturnType<typeof geo>;
type Nt = [number, number, number];

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    wide,
    cx: f.w * (wide ? 0.6 : 0.5),
    cy: f.h * (wide ? 0.44 : 0.4),
    d: Math.min((f.w * 0.9) / 13, f.h * 0.05),
  };
}

function lerpAngle(a: number, b: number, k: number) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * k;
}

/* ---------- Gölet ---------- */

function pondCenter(f: SceneFrame, G: Geo): [number, number] {
  return [G.cx, f.h * (G.wide ? 0.73 : 0.62)];
}

function pond(f: SceneFrame, G: Geo, dive: number) {
  const { ctx, w, h, t, s } = f;
  const [b0] = f.beats;
  const [px, py] = pondCenter(f, G);
  const img = layer(f, "rna-golet", (g) => pondScene(g, w, h, s, G.wide, px, py));
  const Z = 1 + 0.08 * phase(t, 0, b0 + 0.2, lin) + 5 * ease.in(dive);
  ctx.save();
  ctx.globalAlpha = 1 - ease.in(phase(dive, 0.25, 1, lin));
  ctx.translate(px, py);
  ctx.scale(Z, Z);
  ctx.translate(-px, -py);
  ctx.drawImage(img, 0, 0, w, h);
  // Volkan dumanı.
  const vx = w * (G.wide ? 0.33 : 0.3);
  const vy = h * (G.wide ? 0.34 : 0.3);
  for (let j = 0; j < 7; j++) {
    const u = (t * 0.09 + j / 7) % 1;
    drawGlow(
      ctx,
      vx + u * 60 * s + Math.sin(j) * 8 * s,
      vy - u * 140 * s,
      (18 + u * 40) * s,
      hex("8a7a8a"),
      0.45 * (1 - u),
    );
  }
  // Göletin yüzeyinde kabarcık halkaları ve yükselen buhar.
  const rx = w * (G.wide ? 0.2 : 0.36);
  const ry = h * (G.wide ? 0.06 : 0.05);
  ctx.strokeStyle = "rgba(220,255,250,0.6)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  for (let j = 0; j < 7; j++) {
    const u = (t * 0.5 + hash(j * 3.3)) % 1;
    const bx = px + (hash(j * 5.1) - 0.5) * rx * 1.3;
    const by = py + (hash(j * 7.7) - 0.5) * ry * 1.1;
    ctx.globalAlpha = (1 - u) * 0.8 * (1 - dive);
    ctx.beginPath();
    ctx.ellipse(bx, by, (2 + u * 12) * s, (1 + u * 4) * s, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1 - dive;
  for (let j = 0; j < 9; j++) {
    const u = (t * 0.12 + j / 9) % 1;
    const sx = px + (hash(j * 2.1) - 0.5) * rx * 1.6 + Math.sin(t * 0.8 + j) * 10 * s;
    drawGlow(
      ctx,
      sx,
      py - u * 130 * s,
      (16 + u * 34) * s,
      hex("f4eaf0"),
      0.28 * Math.sin(Math.PI * u),
    );
  }
  ctx.restore();
}

function pondScene(g: Ctx, w: number, h: number, s: number, wide: boolean, px: number, py: number) {
  const hz = h * (wide ? 0.52 : 0.46);
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, "#241c4c");
  sky.addColorStop(0.55, "#7a4a70");
  sky.addColorStop(1, "#f2a476");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, hz + 2);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,240,230,${0.2 + hash(i * 3.3) * 0.5})`;
    g.beginPath();
    g.arc(hash(i * 1.7) * w, hash(i * 5.9) * hz * 0.45, (0.5 + hash(i) * 0.9) * s, 0, TAU);
    g.fill();
  }
  const m = Math.min(w, h);
  // Genç ve sönük Güneş, alçakta.
  const sx = w * (wide ? 0.16 : 0.2);
  const sy = hz * 0.7;
  drawGlow(g, sx, sy, m * 0.5, hex("ffb070"), 0.55);
  g.fillStyle = "#fff0cc";
  g.beginPath();
  g.arc(sx, sy, m * 0.028, 0, TAU);
  g.fill();
  // Ay: bugünkünden yakın, bu yüzden gökte daha iri. Koyu lav denizleri henüz yok.
  const mx = w * (wide ? 0.6 : 0.64);
  const my = hz * (wide ? 0.34 : 0.44);
  const mr = m * 0.085;
  planet(g, mx, my, mr, {
    base: hex("d6d0de"),
    shade: hex("2a2140"),
    rim: hex("ffffff"),
    atmo: hex("f0d8e8"),
    atmoAlpha: 0.25,
    night: 0.8,
    detail: (c) => {
      for (let j = 0; j < 14; j++) {
        const a = hash(j * 4.4) * TAU;
        const r = Math.sqrt(hash(j * 6.6)) * mr * 0.85;
        c.fillStyle = `rgba(150,140,165,${0.35 + hash(j) * 0.3})`;
        c.beginPath();
        c.arc(
          mx + Math.cos(a) * r,
          my + Math.sin(a) * r,
          mr * (0.05 + hash(j * 8.8) * 0.12),
          0,
          TAU,
        );
        c.fill();
      }
    },
  });
  // Uzak volkanlar.
  g.fillStyle = "#4a3150";
  g.beginPath();
  g.moveTo(0, hz);
  const peaks: [number, number][] = wide
    ? [
        [0.08, 0.06],
        [0.2, 0.1],
        [0.33, 0.18],
        [0.46, 0.08],
        [0.58, 0.05],
      ]
    : [
        [0.1, 0.07],
        [0.3, 0.16],
        [0.52, 0.06],
      ];
  for (const [x, ph] of peaks) {
    g.lineTo(w * (x - 0.07), hz);
    g.lineTo(w * (x - 0.012), hz - h * ph);
    g.lineTo(w * (x + 0.012), hz - h * ph);
    g.lineTo(w * (x + 0.07), hz);
  }
  g.lineTo(w * 0.62, hz);
  g.closePath();
  g.fill();
  // Kraterden ışıyan lav.
  const vx = w * (wide ? 0.33 : 0.3);
  drawGlow(g, vx, hz - h * (wide ? 0.18 : 0.16), m * 0.07, hex("ff7a3a"), 0.8);
  // Deniz.
  const sea = g.createLinearGradient(0, hz, 0, h * 0.62);
  sea.addColorStop(0, "#c98a86");
  sea.addColorStop(1, "#1c3a4c");
  g.fillStyle = sea;
  g.fillRect(w * 0.5, hz, w * 0.5, h * 0.12);
  g.strokeStyle = "rgba(255,210,190,0.35)";
  g.lineWidth = Math.max(1, s);
  for (let j = 0; j < 8; j++) {
    const yy = hz + (j + 1) * h * 0.012;
    g.beginPath();
    g.moveTo(w * (0.56 + hash(j) * 0.1), yy);
    g.lineTo(w * (0.7 + hash(j * 2) * 0.28), yy);
    g.stroke();
  }
  // Bazalt kıyı.
  g.fillStyle = "#2a1c28";
  g.beginPath();
  g.moveTo(0, hz - h * 0.01);
  g.bezierCurveTo(w * 0.3, hz + h * 0.02, w * 0.5, hz + h * 0.02, w * 0.62, hz + h * 0.05);
  g.bezierCurveTo(w * 0.8, hz + h * 0.08, w * 0.9, hz + h * 0.06, w, hz + h * 0.07);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  const ground = g.createLinearGradient(0, hz, 0, h);
  ground.addColorStop(0, "rgba(120,70,80,0.35)");
  ground.addColorStop(1, "rgba(10,6,12,0.6)");
  g.fillStyle = ground;
  g.fillRect(0, hz, w, h - hz);
  // Kayalar: sol üstten ışık alan kenarlar.
  for (let j = 0; j < 9; j++) {
    const x = w * hash(j * 3.7);
    const y = hz + (h - hz) * (0.25 + hash(j * 5.3) * 0.7);
    if (Math.abs(x - px) < w * 0.25 && Math.abs(y - py) < h * 0.12) continue;
    const r = (14 + hash(j * 7.1) * 30) * s * (0.6 + (y - hz) / (h - hz));
    g.fillStyle = "#e6a488";
    blob(g, x - r * 0.08, y - r * 0.1, r, j + 3, { n: 8, wobble: 0.22, sy: 0.6 });
    g.fill();
    g.fillStyle = "#1e1420";
    blob(g, x, y, r, j + 3, { n: 8, wobble: 0.22, sy: 0.6 });
    g.fill();
  }
  // Gölet: kükürt ve silika kabuğu, turkuaz sıcak su.
  const rx = w * (wide ? 0.2 : 0.36);
  const ry = h * (wide ? 0.06 : 0.05);
  g.fillStyle = "#cfc6b4";
  g.beginPath();
  g.ellipse(px, py, rx * 1.12, ry * 1.35, 0, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(240,210,90,0.7)";
  for (let j = 0; j < 16; j++) {
    const a = hash(j * 2.9) * TAU;
    g.beginPath();
    g.ellipse(
      px + Math.cos(a) * rx * 1.06,
      py + Math.sin(a) * ry * 1.25,
      (4 + hash(j) * 8) * s,
      (2 + hash(j) * 3) * s,
      0,
      0,
      TAU,
    );
    g.fill();
  }
  const wat = g.createRadialGradient(px, py - ry * 0.2, 0, px, py, rx);
  wat.addColorStop(0, "#8ff0e0");
  wat.addColorStop(0.5, "#34b4b4");
  wat.addColorStop(1, "#15606c");
  g.fillStyle = wat;
  g.beginPath();
  g.ellipse(px, py, rx, ry, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = Math.max(1, 1.5 * s);
  g.beginPath();
  g.ellipse(px - rx * 0.1, py - ry * 0.25, rx * 0.55, ry * 0.35, 0, Math.PI * 1.1, Math.PI * 1.7);
  g.stroke();
}

/* ---------- Su ---------- */

function water(f: SceneFrame, G: Geo) {
  const { ctx, w, h, t, s } = f;
  const img = layer(f, "rna-su", (g) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0f4a58");
    bg.addColorStop(0.5, "#0a3040");
    bg.addColorStop(1, "#061a26");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    drawGlow(g, G.cx, G.cy, Math.max(w, h) * 0.55, hex("2a8a8a"), 0.35);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(190,240,235,${0.08 + hash(i * 2.3) * 0.18})`;
      g.beginPath();
      g.arc(hash(i * 1.1) * w, hash(i * 3.7) * h, (0.6 + hash(i) * 1.6) * s, 0, TAU);
      g.fill();
    }
  });
  ctx.drawImage(img, 0, 0, w, h);
  // Yukarıdan süzülen ışık huzmeleri.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let j = 0; j < 5; j++) {
    const x = w * (0.1 + j * 0.2) + Math.sin(t * 0.3 + j) * 30 * s;
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.9);
    g.addColorStop(0, `rgba(140,230,220,${0.07 + 0.03 * Math.sin(t * 0.7 + j * 2)})`);
    g.addColorStop(1, "rgba(140,230,220,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30 * s, 0);
    ctx.lineTo(x + 30 * s, 0);
    ctx.lineTo(x + 140 * s, h * 0.9);
    ctx.lineTo(x + 40 * s, h * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Kil levhacıkları: yüzeylerinde RNA birikebilen mineral pulları. */
function clay(f: SceneFrame, G: Geo) {
  const { ctx, t } = f;
  const d = G.d;
  for (let j = 0; j < 6; j++) {
    const x = G.cx + (hash(j * 3.1) - 0.5) * 22 * d + Math.sin(t * 0.2 + j) * d;
    const y = G.cy + (hash(j * 5.7) - 0.5) * 13 * d + Math.cos(t * 0.17 + j) * 0.8 * d;
    const r = (1 + hash(j * 7.3) * 1.2) * d;
    const rot = hash(j) * TAU + t * 0.05 * (j % 2 ? 1 : -1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, 0.45);
    ctx.fillStyle = "rgba(170,120,90,0.22)";
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      if (k) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(230,190,150,0.25)";
    ctx.lineWidth = d * 0.05;
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Nükleotitler ve iplikler ---------- */

/** Bir nükleotit: şeker (beşgen), fosfat (boncuk) ve baz (renkli harf). */
function nucleotide(
  ctx: Ctx,
  x: number,
  y: number,
  ang: number,
  b: string,
  d: number,
  withP = true,
) {
  const [c, dk] = BASES[b];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = rgba(dk);
  roundRect(ctx, 0.2 * d, -0.22 * d, 0.76 * d, 0.44 * d, 0.14 * d);
  ctx.fill();
  ctx.fillStyle = rgba(c);
  roundRect(ctx, 0.2 * d, -0.22 * d, 0.76 * d, 0.32 * d, 0.14 * d);
  ctx.fill();
  if (withP) {
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.arc(-0.1 * d, -0.42 * d, 0.13 * d, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#ffe6cc";
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU - Math.PI / 2;
    if (k) ctx.lineTo(Math.cos(a) * 0.21 * d, Math.sin(a) * 0.21 * d);
    else ctx.moveTo(Math.cos(a) * 0.21 * d, Math.sin(a) * 0.21 * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(40,24,20,0.8)";
  ctx.font = `700 ${Math.round(0.32 * d)}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b, x + Math.cos(ang) * 0.58 * d, y + Math.sin(ang) * 0.58 * d + 0.02 * d);
}

/** Omurga: şeker–fosfat zinciri. `bonds[k]`: k ile k+1 arasındaki bağın görünürlüğü. */
function backbone(ctx: Ctx, pts: Nt[], bonds: number[], d: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffd9b0";
  ctx.lineWidth = 0.17 * d;
  ctx.beginPath();
  for (let k = 0; k < pts.length - 1; k++) {
    if (bonds[k] <= 0.01) continue;
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + (x1 - x0) * bonds[k], y0 + (y1 - y0) * bonds[k]);
  }
  ctx.stroke();
  const beads: number[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    if (bonds[k] < 0.99) continue;
    beads.push((pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2, 0.14 * d);
  }
  drawBalls(ctx, beads, hex("ffb347"), hex("c47a1c"), hex("ffe2b0"));
  ctx.restore();
}

/** Serbest bir nükleotidin suda sürüklenişi. */
function floatNt(f: SceneFrame, G: Geo, i: number): Nt {
  const { t } = f;
  const d = G.d;
  const hx = G.cx + (hash(i * 3.3) - 0.5) * (G.wide ? 22 : 12) * d;
  const hy = G.cy + (hash(i * 7.1) - 0.5) * (G.wide ? 14 : 16) * d;
  return [
    hx + Math.sin(t * (0.4 + hash(i) * 0.3) + i) * 0.9 * d,
    hy + Math.cos(t * (0.35 + hash(i * 2) * 0.3) + i * 1.7) * 0.7 * d,
    hash(i * 5.5) * TAU + t * (hash(i * 6.1) - 0.5) * 0.8,
  ];
}

function drift(f: SceneFrame, G: Geo) {
  const { ctx } = f;
  const n = G.wide ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const [x, y, a] = i === 0 ? labelNt(f, G) : floatNt(f, G, i + 40);
    nucleotide(ctx, x, y, a, "AUGC"[i % 4], G.d);
  }
}

/** Etiketlenen serbest nükleotit: boş bir köşede durur. */
function labelNt(f: SceneFrame, G: Geo): Nt {
  const { t } = f;
  const d = G.d;
  return [
    G.cx + (G.wide ? 5.6 : 3.4) * d + Math.sin(t * 0.6) * 0.3 * d,
    G.cy - (G.wide ? 3.6 : 5.4) * d + Math.cos(t * 0.5) * 0.3 * d,
    -0.4 + Math.sin(t * 0.4) * 0.3,
  ];
}

/* ---------- Kesecik bölünmesi ---------- */

function division(f: SceneFrame, G: Geo) {
  const { t } = f;
  const [, , b2] = f.beats;
  const Rv = 5.2 * G.d;
  const Rp = Rv * (1 + 0.2 * ease.inOut(phase(t, b2 + 2.4, b2 + 3.6)));
  const kd = ease.inOut(phase(t, b2 + 3.6, b2 + 5.4));
  const sep = 0.625 * Rp * (1 + 0.22 * ease.inOut(phase(t, b2 + 5.2, b2 + 6.2)));
  return { Rv, Rp, kd, rd: 0.625 * Rp, sep };
}

/** Bölünürken bir grubun içeriği kız keseciğe taşınır: g grup merkezi, c hedef merkez. */
function carry(p: Nt, gx: number, gy: number, cx: number, cy: number, k: number): Nt {
  if (k <= 0) return p;
  const tx = cx + (p[0] - gx) * 0.62;
  const ty = cy + (p[1] - gy) * 0.62;
  return [p[0] + (tx - p[0]) * k, p[1] + (ty - p[1]) * k, p[2]];
}

/** Kalıp iplik: önce yatay, sonra kenara çekilir, en sonda keseciğin içinde bir yay. */
function templateNt(f: SceneFrame, G: Geo, i: number): Nt {
  const { t } = f;
  const [, b1, b2] = f.beats;
  const d = G.d;
  const kB = ease.inOut(phase(t, b1 - 0.6, b1 + 0.6));
  // Kenara çekilir: yatay ekranda sol üste, dikeyde yukarı.
  let x = G.cx - 5.5 * d + i * d - (G.wide ? 4.2 : 0) * d * kB;
  let y =
    G.cy - 0.95 * d - (G.wide ? 2.9 : 4.4) * d * kB + Math.sin(t * 1.2 + i * 0.7) * 0.12 * d * kB;
  let a = Math.PI / 2;
  const kC = ease.inOut(phase(t, b2 - 1.4, b2 - 0.1));
  if (kC > 0) {
    const aa = 4.62 - (i / (N - 1)) * 2.87;
    x += (G.cx + Math.cos(aa) * 3.9 * d - x) * kC;
    y += (G.cy + Math.sin(aa) * 3.9 * d - y) * kC;
    a = lerpAngle(a, aa + Math.PI, kC);
  }
  const D = division(f, G);
  return carry([x, y, a], G.cx - 2.6 * d, G.cy, G.cx - D.sep, G.cy, D.kd);
}

/** Saç tokası: 0–4 sol kol, 5–6 ilmek, 7–11 sağ kol; kollardaki harfler birbirine eşleşir. */
function hairpin(j: number, d: number): Nt {
  if (j <= 4) return [-0.95 * d, (4 - j) * 0.95 * d, 0];
  if (j >= 7) return [0.95 * d, (j - 7) * 0.95 * d, Math.PI];
  return j === 5 ? [-0.55 * d, -0.95 * d, -2.3] : [0.55 * d, -0.95 * d, -0.84];
}

/** Ribozimin (katlanan kopyanın) merkezi. */
function ribozymeCenter(f: SceneFrame, G: Geo): [number, number] {
  const kV = ease.inOut(phase(f.t, f.beats[2] - 1.4, f.beats[2] - 0.1));
  const [x0, y0] = G.wide ? [4, -0.6] : [0.5, 0.2];
  return [G.cx + (x0 + (1.9 - x0) * kV) * G.d, G.cy + (y0 + (-1.7 - y0) * kV) * G.d];
}

const captureAt = (b0: number, j: number) => b0 + 1.2 + j * 0.33;

/** Kopya iplik: serbest nükleotitler kalıba gelir, ayrılır ve ribozime katlanır. */
function copyNt(f: SceneFrame, G: Geo, j: number): Nt {
  const { t } = f;
  const [b0, b1] = f.beats;
  const d = G.d;
  const cap = captureAt(b0, j);
  const kc = ease.inOut(phase(t, cap, cap + 0.75));
  const [fx, fy, fa] = floatNt(f, G, 100 + j);
  let x = fx + (G.cx - 5.5 * d + j * d - fx) * kc;
  let y = fy + (G.cy + 0.95 * d - fy) * kc;
  let a = lerpAngle(fa, -Math.PI / 2, kc);
  const kS = ease.inOut(phase(t, b1 - 0.6, b1 + 0.4));
  x += 0.8 * d * kS;
  y += 1.2 * d * kS;
  const kF = ease.inOut(phase(t, b1 - 0.1, b1 + 1.8));
  if (kF > 0) {
    const [hx, hy] = ribozymeCenter(f, G);
    const [lx, ly, la] = hairpin(j, d);
    x += (hx + lx - x) * kF;
    y += (hy + ly - y) * kF;
    a = lerpAngle(a, la, kF);
  }
  const D = division(f, G);
  const [hx, hy] = ribozymeCenter(f, G);
  return carry([x, y, a], hx, hy + 1.4 * d, G.cx + D.sep + 1.1 * d, G.cy, D.kd);
}

/** Keseciğin içinde, zardan sızan nükleotitlerle örülen ikinci kopya. */
function innerNt(f: SceneFrame, G: Geo, i: number): [Nt, number] {
  const { t } = f;
  const [, , b2] = f.beats;
  const d = G.d;
  const at = b2 + 1.6 + i * 0.12;
  const k = ease.inOut(phase(t, at, at + 0.9));
  const aa = 4.62 - (i / (N - 1)) * 2.87;
  const sa = aa + (hash(i * 3.7) - 0.5) * 1.2;
  const x0 = G.cx + Math.cos(sa) * 7 * d;
  const y0 = G.cy + Math.sin(sa) * 7 * d;
  const x = x0 + (G.cx + Math.cos(aa) * 2 * d - x0) * k;
  const y = y0 + (G.cy + Math.sin(aa) * 2 * d - y0) * k;
  const D = division(f, G);
  const p = carry(
    [x, y, lerpAngle(hash(i) * TAU, aa, k)],
    G.cx - 1.33 * d,
    G.cy,
    G.cx + D.sep - 0.9 * d,
    G.cy,
    D.kd,
  );
  return [p, phase(t, at - 0.2, at + 0.2)];
}

/** Ribozimin birleştirdiği iki kısa RNA parçası. */
function substrateNt(f: SceneFrame, G: Geo, k: number): [Nt, number] {
  const { t } = f;
  const [, b1] = f.beats;
  const d = G.d;
  const [hx, hy] = ribozymeCenter(f, G);
  const left = k < 3;
  const q = left ? k : k - 3;
  const arrive = ease.inOut(phase(t, b1 + 2.2 + (left ? 0 : 0.4), b1 + 3.4 + (left ? 0 : 0.4)));
  const join = ease.inOut(phase(t, b1 + 3.6, b1 + 4));
  const leave = ease.inOut(phase(t, b1 + 4.6, b1 + 6.2));
  const tx = hx + (left ? -2.2 * d + q * 0.85 * d : 0.55 * d + q * 0.85 * d - 0.35 * d * join);
  const ty = hy - 2.1 * d;
  const sx = hx + (left ? -6 : 5) * d + q * 0.85 * d;
  const sy = hy - (left ? 4.5 : 5) * d;
  const x = sx + (tx - sx) * arrive - 3 * d * leave;
  const y = sy + (ty - sy) * arrive - 2.5 * d * leave;
  const a = phase(t, b1 + 2, b1 + 2.4) * (1 - leave);
  return [[x, y, Math.PI / 2], a];
}

function strands(f: SceneFrame, G: Geo) {
  const { ctx, t, s } = f;
  const [b0, b1, b2] = f.beats;
  const d = G.d;
  // Kalıp.
  const T = [...TEMPLATE].map((_, i) => templateNt(f, G, i));
  backbone(
    ctx,
    T,
    T.map(() => 1),
    d,
  );
  T.forEach(([x, y, a], i) => nucleotide(ctx, x, y, a, TEMPLATE[i], d, false));
  // Kopya ve ribozim.
  const C = [...COPY].map((_, j) => copyNt(f, G, j));
  const bonds = C.map((_, j) =>
    j < N - 1 ? phase(t, captureAt(b0, j + 1) + 0.75, captureAt(b0, j + 1) + 0.95) : 0,
  );
  backbone(ctx, C, bonds, d);
  C.forEach(([x, y, a], j) => nucleotide(ctx, x, y, a, COPY[j], d, false));
  // Yeni bağlar kurulurken küçük kıvılcımlar.
  for (let j = 0; j < N - 1; j++) {
    const at = captureAt(b0, j + 1) + 0.8;
    const k = Math.exp(-(((t - at) / 0.12) ** 2));
    if (k > 0.05)
      drawGlow(
        ctx,
        (C[j][0] + C[j + 1][0]) / 2,
        (C[j][1] + C[j + 1][1]) / 2,
        12 * s,
        hex("fff2c0"),
        k,
      );
  }
  // Ribozimin birleştirdiği parçalar.
  const sub = [0, 1, 2, 3, 4, 5].map((k) => substrateNt(f, G, k));
  const sa = sub[0][1];
  if (sa > 0.01) {
    ctx.save();
    ctx.globalAlpha *= sa;
    const P = sub.map(([p]) => p);
    const join = phase(t, b1 + 3.8, b1 + 4);
    backbone(ctx, P, [1, 1, join, 1, 1, 0], d);
    P.forEach(([x, y, a], k) => nucleotide(ctx, x, y, a, "GAUCCA"[k], d, false));
    const sp = Math.exp(-(((t - b1 - 3.9) / 0.15) ** 2));
    if (sp > 0.05) {
      const mx = (P[2][0] + P[3][0]) / 2;
      const my = (P[2][1] + P[3][1]) / 2;
      drawGlow(ctx, mx, my, 30 * s, hex("fff2c0"), sp);
      sparkle(ctx, mx, my, 14 * s * sp, "rgba(255,250,220,0.95)", t);
    }
    ctx.restore();
  }
  // Keseciğin içinde ikinci kopya.
  if (t > b2 + 1.3) {
    const I = [...TEMPLATE].map((_, i) => innerNt(f, G, i));
    const pts = I.map(([p]) => p);
    const ib = I.map(([, a], i) =>
      i < N - 1 ? Math.min(a, I[i + 1][1]) * phase(t, b2 + 3, b2 + 3.3) : 0,
    );
    backbone(ctx, pts, ib, d);
    I.forEach(([[x, y, a], v], i) => {
      if (v <= 0.01) return;
      ctx.save();
      ctx.globalAlpha *= v;
      nucleotide(ctx, x, y, a, COPY[i], d, true);
      ctx.restore();
    });
  }
}

/* ---------- Yağ asitleri ve kesecik ---------- */

function lipids(f: SceneFrame, G: Geo) {
  const { ctx, t } = f;
  const [, b1, b2] = f.beats;
  const vis = phase(t, b1 + 3.6, b1 + 5);
  if (vis <= 0.01) return;
  const d = G.d;
  const D = division(f, G);
  const heads: number[] = [];
  ctx.save();
  ctx.globalAlpha *= vis;
  ctx.strokeStyle = "#f3e2a8";
  ctx.lineWidth = 0.08 * d;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < LIPID_N * 2; i++) {
    const leaf = i < LIPID_N ? 1 : -1;
    const q = i % LIPID_N;
    const th = ((q + (leaf < 0 ? 0.5 : 0)) / LIPID_N) * TAU;
    const [fx, fy, fa] = freeLipid(f, G, i);
    // Zardaki yeri.
    const st = i === 0 ? b2 + 0.6 : b2 - 0.8 + hash(i * 2.2) * 1.4;
    const k = ease.inOut(phase(t, st, st + 1.4));
    let mx: number;
    let my: number;
    let nx: number;
    let ny: number;
    const px = G.cx + Math.cos(th) * (D.Rp + leaf * 0.36 * d);
    const py = G.cy + Math.sin(th) * (D.Rp + leaf * 0.36 * d);
    if (D.kd > 0) {
      const right = Math.cos(th) >= 0;
      const tt = right ? th : th - Math.PI;
      const tw = Math.atan2(Math.sin(tt), Math.cos(tt));
      const phi = right ? 2 * tw : 2 * tw + Math.PI;
      const ccx = G.cx + (right ? D.sep : -D.sep);
      const dx = ccx + Math.cos(phi) * (D.rd + leaf * 0.36 * d);
      const dy = G.cy + Math.sin(phi) * (D.rd + leaf * 0.36 * d);
      mx = px + (dx - px) * D.kd;
      my = py + (dy - py) * D.kd;
      nx = Math.cos(th) * (1 - D.kd) + Math.cos(phi) * D.kd;
      ny = Math.sin(th) * (1 - D.kd) + Math.sin(phi) * D.kd;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
    } else {
      mx = px;
      my = py;
      nx = Math.cos(th);
      ny = Math.sin(th);
    }
    const ma = Math.atan2(-leaf * ny, -leaf * nx);
    const x = fx + (mx - fx) * k;
    const y = fy + (my - fy) * k;
    const a = lerpAngle(fa, ma, k);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 0.34 * d, y + Math.sin(a) * 0.34 * d);
    heads.push(x, y, 0.15 * d);
  }
  ctx.stroke();
  drawBalls(ctx, heads, hex("5ec4ea"), hex("2a7aa8"), hex("d8f4ff"));
  ctx.restore();
}

/** Uzaklaşınca görünen başka kesecikler: her biri kendi kaderine sahip. */
function others(f: SceneFrame, G: Geo, out: number) {
  if (out <= 0.01) return;
  const { ctx, t } = f;
  const d = G.d;
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU + 0.4;
    const R = (G.wide ? 13 : 10) * d * (0.9 + hash(j) * 0.3);
    const x = G.cx + Math.cos(a) * R * (G.wide ? 1.25 : 0.7) + Math.sin(t * 0.3 + j) * d * 0.4;
    const y = G.cy + Math.sin(a) * R * (G.wide ? 0.72 : 1.1);
    const r = (2.2 + hash(j * 3.3) * 2) * d;
    ctx.save();
    ctx.globalAlpha *= out * 0.9;
    drawGlow(ctx, x, y, r * 1.2, hex("7fe0d0"), 0.2);
    const heads: number[] = [];
    const n = Math.round(r / (0.42 * d)) * 6;
    for (let k = 0; k < n; k++) {
      const q = (k / n) * TAU;
      heads.push(x + Math.cos(q) * (r + 0.36 * d), y + Math.sin(q) * (r + 0.36 * d), 0.15 * d);
      heads.push(x + Math.cos(q) * (r - 0.36 * d), y + Math.sin(q) * (r - 0.36 * d), 0.15 * d);
    }
    ctx.strokeStyle = "rgba(243,226,168,0.8)";
    ctx.lineWidth = 0.3 * d;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    drawBalls(ctx, heads, hex("5ec4ea"), hex("2a7aa8"), hex("d8f4ff"));
    // İçeride kıvrılan bir RNA.
    ctx.strokeStyle = ["#ff8a5c", "#7fd0ff", "#f5cf5b", "#8fe07f"][j % 4];
    ctx.lineWidth = 0.22 * d;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      const px = x + (u - 0.5) * r * 1.1;
      const py = y + Math.sin(u * 9 + j + t) * r * 0.2;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Kart ve etiketler ---------- */

function card(f: SceneFrame) {
  const { ctx, w, h, t, s } = f;
  const [, b1, b2] = f.beats;
  const k = pop(t, b1 + 1.8, 0.6, b2 - 1, 0.5);
  if (k <= 0.01) return;
  const wide = w > h;
  const cw = Math.min(w * 0.92, 310 * s);
  const ch = 122 * s;
  const x = wide ? w * 0.04 : (w - cw) / 2;
  const y = wide ? h * 0.13 : h * 0.63;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(6,20,28,0.88)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("RNA iki iş birden yapar", 14 * s, 19 * s);
  const d = 17 * s;
  // Bilgi: düz bir dizi.
  const x1 = cw * 0.27;
  for (let q = 0; q < 4; q++)
    nucleotide(ctx, x1 - 1.5 * d + q * d, 44 * s, Math.PI / 2, "AUGC"[q], d, false);
  ctx.strokeStyle = "#ffd9b0";
  ctx.lineWidth = 0.17 * d;
  ctx.beginPath();
  ctx.moveTo(x1 - 1.5 * d, 44 * s);
  ctx.lineTo(x1 + 1.5 * d, 44 * s);
  ctx.stroke();
  // İş: katlanmış bir şekil ve kıvılcım.
  const x2 = cw * 0.73;
  for (let j = 0; j < N; j++) {
    const [lx, ly, la] = hairpin(j, d * 0.62);
    nucleotide(ctx, x2 + lx, 44 * s + ly - 0.9 * d, la, COPY[j], d * 0.62, false);
  }
  const sp = 0.6 + 0.4 * Math.sin(t * 5);
  drawGlow(ctx, x2 + 1.7 * d, 34 * s, 14 * s, hex("fff2c0"), 0.8 * sp);
  sparkle(ctx, x2 + 1.7 * d, 34 * s, 7 * s * sp, "rgba(255,250,220,0.95)", t);
  ctx.textAlign = "center";
  for (const [xx, head, sub] of [
    [x1, "Bilgi taşır", "dizisi kopyalanır"],
    [x2, "Tepkime hızlandırır", "şekli iş görür"],
  ] as const) {
    ctx.fillStyle = "rgba(255,250,240,0.96)";
    ctx.font = `600 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(head, xx, 92 * s);
    ctx.fillStyle = "rgba(200,220,215,0.9)";
    ctx.font = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(sub, xx, 108 * s);
  }
  ctx.restore();
}

function labels(f: SceneFrame, G: Geo, out: number) {
  const { t, w, h } = f;
  const [b0, b1, b2] = f.beats;
  const d = G.d;
  const wide = G.wide;
  const z = (0.6 + 0.4 * ease.out(phase(t, b0 + 0.2, b0 + 1.7))) * (1 - 0.32 * out);
  const Z = (x: number, y: number): [number, number] => [
    G.cx + (x - G.cx) * z,
    G.cy + (y - G.cy) * z,
  ];
  const [px, py] = pondCenter(f, G);
  callout(
    f,
    px + w * (wide ? 0.12 : 0.2),
    py - h * 0.01,
    "Sıcak bir gölet",
    phase(t, b0 - 0.6, b0) * (1 - phase(t, b0 + 0.4, b0 + 0.8)),
    wide ? 1 : -1,
    "ıslanıp kuruyan, minerallerle dolu",
  );
  const show = (a: number, b: number, pa: number, pb: number) =>
    wide
      ? phase(t, a, a + 0.6) * (1 - phase(t, b, b + 0.4))
      : phase(t, pa, pa + 0.6) * (1 - phase(t, pb, pb + 0.4));
  const T0 = templateNt(f, G, 0);
  const [tx, ty] = Z(T0[0] - 0.3 * d, T0[1]);
  callout(
    f,
    tx,
    ty,
    "RNA ipliği",
    show(b0 + 1.6, b1 - 0.9, b0 + 1.6, b0 + 3.2),
    -1,
    "dört harfli bir dizi",
  );
  const L = labelNt(f, G);
  const [lx, ly] = Z(L[0], L[1]);
  callout(
    f,
    lx,
    ly,
    "Nükleotit",
    show(b0 + 2.2, b1 - 0.9, b0 + 3.3, b0 + 4.6),
    wide ? 1 : -1,
    "RNA'nın yapı taşı",
  );
  let front = 0;
  for (let j = 0; j < N; j++) if (t > captureAt(b0, j) + 0.75) front = j;
  const [fx, fy] = Z(G.cx - 5.5 * d + front * d, G.cy);
  callout(f, fx, fy, "Baz eşleşmesi", show(b0 + 3.2, b1 - 0.9, b0 + 4.7, b1 - 0.9), 1, "A–U, G–C");
  badge(
    f,
    w / 2,
    h * (wide ? 0.13 : 0.1),
    "Her kopya yeni kopyalar için kalıptır",
    phase(t, b1 - 0.5, b1) * (1 - phase(t, b1 + 1.4, b1 + 1.8)),
  );
  const [hx, hy] = ribozymeCenter(f, G);
  const [rx, ry] = Z(hx + 1.3 * d, hy + 2.6 * d);
  callout(
    f,
    rx,
    ry,
    "Ribozim",
    show(b1 + 1.4, b2 - 1.4, b1 + 1.4, b1 + 3.4),
    1,
    "katlanan RNA, enzim gibi",
    wide ? 1 : 0.6,
  );
  const [sx, sy] = Z(hx, hy - 2.2 * d);
  callout(
    f,
    sx,
    sy,
    "Bağ kurulur",
    show(b1 + 3.9, b1 + 5.4, b1 + 3.9, b1 + 5.4),
    -1,
    "iki parça tek iplik olur",
    1.4,
  );
  const lip = freeLipid(f, G, 0);
  const [ax, ay] = Z(lip[0], lip[1]);
  callout(
    f,
    ax,
    ay,
    "Yağ asidi",
    show(b2 - 0.6, b2 + 0.9, b2 - 0.6, b2 + 0.9),
    wide ? 1 : -1,
    "suyu seven baş, sevmeyen kuyruk",
  );
  const D = division(f, G);
  const [mx, my] = Z(
    G.cx + Math.cos(-0.7) * (D.Rp + 0.5 * d),
    G.cy + Math.sin(-0.7) * (D.Rp + 0.5 * d),
  );
  callout(
    f,
    mx,
    my,
    "Kesecik",
    show(b2 + 1.3, b2 + 3.3, b2 + 1.3, b2 + 3.3),
    wide ? 1 : -1,
    "zar küçük molekülleri geçirir",
  );
  const [qx, qy] = Z(G.cx + D.sep + Math.cos(-0.8) * D.rd, G.cy + Math.sin(-0.8) * D.rd);
  callout(
    f,
    qx,
    qy,
    "Protohücre",
    phase(t, b2 + 4, b2 + 4.6),
    wide ? 1 : -1,
    "büyür, bölünür, kopyalar",
  );
}

/** Serbest yağ asidi; 0 numaralı, etiketlenen, boş bir köşede durur. */
function freeLipid(f: SceneFrame, G: Geo, i: number): Nt {
  const { t } = f;
  const d = G.d;
  if (i === 0)
    return [
      G.cx + (G.wide ? 6.6 : 3.2) * d + Math.sin(t * 0.5) * 0.4 * d,
      G.cy + (G.wide ? 3 : 6.4) * d + Math.cos(t * 0.45) * 0.3 * d,
      -2.4 + Math.sin(t * 0.6) * 0.3,
    ];
  return [
    G.cx + (hash(i * 3.9) - 0.5) * (G.wide ? 24 : 13) * d + Math.sin(t * 0.5 + i) * 0.6 * d,
    G.cy + (hash(i * 6.3) - 0.5) * (G.wide ? 15 : 18) * d + Math.cos(t * 0.45 + i * 1.3) * 0.5 * d,
    hash(i * 8.1) * TAU + t * 0.3 * (hash(i) - 0.5),
  ];
}
