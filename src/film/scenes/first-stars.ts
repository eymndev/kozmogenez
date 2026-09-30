import { badge, callout, hash, roundRect, type SceneFrame } from "@/film/scenes/kit";
import {
  applyCam,
  camera,
  drawBalls,
  drawGlow,
  ease,
  hex,
  mix,
  phase,
  pop,
  project,
  rgba,
  type Cam,
  type RGB,
} from "@/film/scenes/art";

/**
 * İlk yıldızlar. Karanlık çağda henüz hiç yıldız yok: karanlık madde ağının düğümüne hidrojen
 * akar, bulut kendi ağırlığıyla çöker ve evrenin ilk ışıklarından biri yanar. Güneş'in yanında
 * dev ve kısa ömürlü bu yıldızın içinde element katmanları birikir; sonunda patlar ve karbonu,
 * oksijeni, kalsiyumu, demiri uzaya saçar: bizim kemiklerimizin ve kanımızın hammaddesi.
 */
export function firstStars(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [, b1, b2] = beats;
  const close = phase(t, b1 - 0.3, b1 + 0.8);
  const boom = phase(t, b2 - 0.2, b2 + 0.4);
  if (close < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - close;
    web(f);
    ctx.restore();
  }
  if (close > 0) {
    ctx.save();
    ctx.globalAlpha *= close;
    if (boom < 1) giant(f, close);
    if (boom > 0) supernova(f);
    ctx.restore();
  }
}

const TAU = Math.PI * 2;
type Pt = [number, number];

function focus(f: SceneFrame): Pt {
  const wide = f.w > f.h;
  return [f.w * (wide ? 0.6 : 0.5), f.h * (wide ? 0.45 : 0.42)];
}

/* ---------- Karanlık madde ağı ve ilk yıldızın doğuşu ---------- */

const NODES = 18;

function nodeAt(f: SceneFrame, i: number): Pt {
  const [fx, fy] = focus(f);
  if (i === 0) return [fx, fy];
  const a = hash(i * 4.1) * TAU;
  const d = (0.25 + hash(i * 7.3) * 0.9) * Math.max(f.w, f.h) * 0.55;
  return [fx + Math.cos(a) * d, fy + Math.sin(a) * d * 0.8];
}

function edges(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 1; i < NODES; i++) {
    out.push([0, i].sort() as [number, number]);
    const j = 1 + Math.floor(hash(i * 13.7) * (NODES - 1));
    if (j !== i) out.push([i, j]);
  }
  return out;
}
const EDGES = edges();

/** Filament: iki düğüm arasında hafifçe kıvrılan yol. */
function filament(f: SceneFrame, e: [number, number], k: number): Pt {
  const [a, b] = e;
  const [x0, y0] = nodeAt(f, a);
  const [x1, y1] = nodeAt(f, b);
  const bend = (hash(a * 3 + b * 7) - 0.5) * 0.4;
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const off = Math.sin(k * Math.PI) * bend;
  return [x0 + (x1 - x0) * k + nx * off, y0 + (y1 - y0) * k + ny * off];
}

function web(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [b0, b1] = beats;
  const [fx, fy] = focus(f);
  const ignite = b1 - 1.2;
  const cam: Cam = camera(t, [
    [0, 0, 0, 1],
    [ignite, ((fx / w - 0.5) * 0.6) / 1.6, ((fy / h - 0.5) * 0.6) / 1.6, 1.6],
    [b1 + 1, ((fx / w - 0.5) * 1.2) / 2.2, ((fy / h - 0.5) * 1.2) / 2.2, 2.2],
  ]);

  ctx.fillStyle = "#04050c";
  ctx.fillRect(0, 0, w, h);
  drawGlow(ctx, w * 0.5, h * 0.5, Math.max(w, h) * 0.7, hex("241a4a"), 0.5);

  ctx.save();
  applyCam(f, cam);
  // Karanlık madde filamentleri: görünmez ama kütleçekimiyle her şeyi toplar; mor bir ışıkla.
  ctx.lineCap = "round";
  for (const pass of [0, 1]) {
    for (const e of EDGES) {
      ctx.strokeStyle = pass ? "rgba(170,120,255,0.35)" : "rgba(120,80,220,0.12)";
      ctx.lineWidth = (pass ? 2 : 14) * s;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const [x, y] = filament(f, e, k / 16);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  for (let i = 1; i < NODES; i++) {
    const [x, y] = nodeAt(f, i);
    drawGlow(ctx, x, y, (30 + hash(i) * 40) * s, hex("8a60e0"), 0.35);
  }
  // Hidrojen: filamentler boyunca merkeze akan mavi gaz.
  const pts: number[] = [];
  for (let i = 0; i < 420; i++) {
    const e = EDGES[i % EDGES.length];
    const toward0 = e[0] === 0;
    const life = (hash(i * 1.7) + t * (0.05 + hash(i) * 0.05)) % 1;
    const k = toward0 ? 1 - life : life;
    const [x, y] = filament(f, e, k);
    const j = (hash(i * 3.3) - 0.5) * 16 * s;
    pts.push(x + j, y + (hash(i * 5.1) - 0.5) * 16 * s, (1 + hash(i * 2.2) * 1.4) * s);
  }
  ctx.fillStyle = "rgba(140,190,255,0.7)";
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 3) {
    ctx.moveTo(pts[i] + pts[i + 2], pts[i + 1]);
    ctx.arc(pts[i], pts[i + 1], pts[i + 2], 0, TAU);
  }
  ctx.fill();
  // Merkezdeki bulut: toplanır, döner, küçülür, ısınır.
  const grow = phase(t, 0, ignite - 0.4);
  const collapse = phase(t, b0 + 1.4, ignite, ease.in);
  const R = (70 + 60 * grow) * s * (1 - 0.8 * collapse);
  const heat = collapse;
  const col = mix(hex("6aa0ff"), hex("ffb070"), heat);
  drawGlow(ctx, fx, fy, R * 2.2, col, 0.35 + 0.3 * heat);
  for (let i = 0; i < 70; i++) {
    const a = hash(i * 2.9) * TAU + t * (0.6 + collapse * 2.5) * (1 + hash(i) * 0.5);
    const d = R * Math.sqrt(hash(i * 6.1));
    const x = fx + Math.cos(a) * d;
    const y = fy + Math.sin(a) * d * 0.55;
    ctx.fillStyle = rgba(mix(hex("a8c8ff"), hex("ffd2a0"), heat), 0.7);
    ctx.beginPath();
    ctx.arc(x, y, (1.4 + hash(i) * 1.6) * s, 0, TAU);
    ctx.fill();
  }
  // Tutuşma: bir parlama ve mavi-beyaz, dev bir yıldız.
  const lit = phase(t, ignite, ignite + 0.6, ease.out);
  if (lit > 0) {
    const flash = Math.exp(-(((t - ignite - 0.1) / 0.3) ** 2));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, fx, fy, (40 + 260 * flash) * s, hex("e8f0ff"), 0.9 * flash + 0.4 * lit);
    drawGlow(ctx, fx, fy, 70 * s * lit, hex("9ec4ff"), 0.9);
    ctx.restore();
    drawBalls(ctx, [fx, fy, 16 * s * lit], hex("e8f2ff"), hex("9ec4ff"), hex("ffffff"));
  }
  ctx.restore();

  const P = (x: number, y: number) => project(f, cam, x, y);
  const [ex, ey] = P(...filament(f, EDGES[3], 0.5));
  callout(
    f,
    ex,
    ey,
    "Karanlık madde ağı",
    phase(t, b0 + 0.2, b0 + 0.9) * (1 - phase(t, ignite - 0.5, ignite)),
    ex > w * 0.55 ? -1 : 1,
    "görünmez, ama her şeyi toplar",
  );
  const [gx, gy] = P(fx + R * 0.9, fy - R * 0.4);
  callout(
    f,
    gx,
    gy,
    "Hidrojen bulutu",
    phase(t, b0 + 1.2, b0 + 1.9) * (1 - phase(t, ignite - 0.5, ignite)),
    1,
    "soğudukça kendi ağırlığıyla çöker",
  );
  badge(
    f,
    w / 2,
    h * (w > h ? 0.13 : 0.1),
    "Karanlık çağ: henüz tek bir yıldız bile yok",
    phase(t, b0 - 0.4, b0 + 0.2) * (1 - phase(t, b0 + 2.4, b0 + 2.8)),
  );
  badge(
    f,
    w / 2,
    h * (w > h ? 0.13 : 0.1),
    "İlk yıldızlar yanar",
    phase(t, ignite + 0.2, ignite + 0.7),
  );
}

/* ---------- Dev yıldız, Güneş'le kıyas ve içindeki katmanlar ---------- */

const SHELLS: [string, string, string][] = [
  ["H", "hidrojen", "#6aa0ff"],
  ["He", "helyum", "#9ec8ff"],
  ["C", "karbon", "#e6decc"],
  ["O", "oksijen", "#7ee0cc"],
  ["Si", "silisyum", "#f0cc68"],
  ["Fe", "demir", "#ff8a58"],
];

function giant(f: SceneFrame, into: number) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const wide = w > h;
  const [fx, fy] = focus(f);
  const R = Math.min(w, h) * (wide ? 0.3 : 0.34) * (0.7 + 0.3 * ease.out(into));
  const cut = phase(t, b1 + 2.6, b1 + 3.6, ease.inOut);
  const dying = phase(t, b2 - 0.9, b2 - 0.2, ease.in);

  ctx.fillStyle = "#04050c";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * 1.8 + i);
    ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.3 * tw})`;
    ctx.beginPath();
    ctx.arc(hash(i * 5.7) * w, hash(i * 3.1) * h, (0.5 + hash(i) * 1) * s, 0, TAU);
    ctx.fill();
  }
  const r = R * (1 - 0.85 * dying);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  drawGlow(ctx, fx, fy, r * 2.3, hex("6a9cff"), 0.45);
  drawGlow(ctx, fx, fy, r * 1.5, hex("bcd6ff"), 0.4);
  ctx.restore();
  // Yüzey: parlak mavi-beyaz, kenara doğru kararan; kaynayan taneler.
  const disc = ctx.createRadialGradient(fx - r * 0.2, fy - r * 0.2, r * 0.1, fx, fy, r);
  disc.addColorStop(0, "#f4f8ff");
  disc.addColorStop(0.6, "#b8d2ff");
  disc.addColorStop(1, "#5a84e0");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 60; i++) {
    const a = hash(i * 3.3) * TAU + t * 0.05;
    const d = r * Math.sqrt(hash(i * 7.7));
    const gr = r * (0.05 + hash(i) * 0.05) * (0.8 + 0.2 * Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.arc(fx + Math.cos(a) * d, fy + Math.sin(a) * d, gr, 0, TAU);
    ctx.fill();
  }
  // Kesit: sağ üst çeyrek açılır, içi soğan katmanları gibi görünür.
  if (cut > 0.01) {
    const a0 = -Math.PI / 2;
    const a1 = a0 + (Math.PI / 2) * cut;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.arc(fx, fy, r * 1.01, a0, a1);
    ctx.closePath();
    ctx.fillStyle = "#1a1a30";
    ctx.fill();
    SHELLS.forEach(([, , color], i) => {
      const k = phase(t, b1 + 2.8 + i * 0.35, b1 + 3.2 + i * 0.35);
      if (k <= 0) return;
      const rr = r * (1 - i * 0.155) * (0.9 + 0.1 * k);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.arc(fx, fy, rr, a0, a1);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha *= 0.6 + 0.4 * k;
      ctx.fill();
      ctx.globalAlpha /= 0.6 + 0.4 * k;
      ctx.strokeStyle = "rgba(10,10,30,0.35)";
      ctx.lineWidth = Math.max(1, 1.2 * s);
      ctx.stroke();
    });
  }
  ctx.restore();
  // Katman adları: kesitin yanında.
  if (cut > 0.3 && dying < 0.5) {
    SHELLS.forEach(([sym], i) => {
      const k = phase(t, b1 + 3 + i * 0.35, b1 + 3.5 + i * 0.35) * (1 - dying * 2);
      if (k <= 0.01) return;
      const rr = r * (1 - i * 0.155 - 0.07);
      const a = -Math.PI / 4;
      const x = fx + Math.cos(a) * rr;
      const y = fy + Math.sin(a) * rr;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.fillStyle = "rgba(20,16,40,0.9)";
      ctx.font = `700 ${Math.round(Math.max(10, 12 * s))}px Outfit, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sym, x, y);
      ctx.restore();
    });
  }
  // Güneş: ölçek için, yanında küçücük.
  const sunK = pop(t, b1 + 0.6, 0.6) * (1 - dying);
  if (sunK > 0.01) {
    const sx = wide ? fx - r - 90 * s : fx - r * 0.5;
    const sy = wide ? fy + r * 0.2 : fy + r + 50 * s;
    const sr = Math.max(3, r * 0.06) * sunK;
    drawGlow(ctx, sx, sy, sr * 5, hex("ffd070"), 0.6);
    drawBalls(ctx, [sx, sy, sr], hex("ffd24a"), hex("e89a2a"), hex("fff6c8"));
    callout(
      f,
      sx,
      sy - sr,
      "Güneş",
      phase(t, b1 + 0.9, b1 + 1.5) * (1 - phase(t, b2 - 1.2, b2 - 0.8)),
      -1,
      "ölçek için",
    );
  }
  const lx = fx + r * 0.72;
  const ly = fy + r * 0.72;
  callout(
    f,
    lx,
    ly,
    "İlk kuşak yıldız",
    phase(t, b1 + 0.8, b1 + 1.5) * (1 - phase(t, b1 + 2.4, b1 + 2.8)),
    wide ? 1 : -1,
    "Güneş'in yüzlerce katı kütle",
  );
  lifeCard(f, pop(t, b1 + 1.4, 0.6, b2 - 1, 0.4));
  callout(
    f,
    fx + 4 * s,
    fy - 4 * s,
    "Demir çekirdek",
    phase(t, b1 + 5, b1 + 5.6) * (1 - dying),
    wide ? 1 : -1,
    "burada füzyon durur",
  );
}

/** Ömür kartı: dev yıldız birkaç milyon yıl, Güneş yaklaşık on milyar yıl. */
function lifeCard(f: SceneFrame, k: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 250 * s);
  const ch = 104 * s;
  const x = wide ? w * 0.05 : (w - cw) / 2;
  const y = wide ? h * 0.2 : h * 0.8;
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
  ctx.fillText("Ömür", 14 * s, 20 * s);
  const bar = (y0: number, len: number, color: string, label: string) => {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 14 * s, y0, cw - 28 * s, 10 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, 14 * s, y0, Math.max(6 * s, (cw - 28 * s) * len), 10 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(215,208,196,0.92)";
    ctx.font = `500 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(label, 14 * s, y0 + 20 * s);
  };
  bar(38 * s, 0.004, "#9ec4ff", "ilk kuşak dev: birkaç milyon yıl");
  bar(70 * s, 1, "#ffd24a", "Güneş: ~10 milyar yıl");
  ctx.restore();
}

/* ---------- Süpernova ve saçılan elementler ---------- */

const EJECTA: [string, string][] = [
  ["C", "#e6decc"],
  ["O", "#7ee0cc"],
  ["Si", "#f0cc68"],
  ["Ca", "#f29ad2"],
  ["Fe", "#ff8a58"],
];

function supernova(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, , b2] = beats;
  const u = t - b2;
  const wide = w > h;
  const [fx, fy] = focus(f);
  const e = phase(u, 0, 3.2, ease.out);
  const flash = Math.exp(-((u / 0.35) ** 2));

  ctx.fillStyle = "#04050c";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.3 * hash(i)})`;
    ctx.beginPath();
    ctx.arc(hash(i * 5.7) * w, hash(i * 3.1) * h, (0.5 + hash(i) * 1) * s, 0, TAU);
    ctx.fill();
  }
  const R = Math.min(w, h) * 0.46 * e;
  // Kalıntı: renkli, lifli bir bulutsu kabuk.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  drawGlow(ctx, fx, fy, R * 1.2, hex("ff7a50"), 0.35 * (1 - e * 0.4));
  drawGlow(ctx, fx, fy, R * 0.8, hex("5ab0ff"), 0.3);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU + hash(i) * 0.2;
    const d = R * (0.75 + hash(i * 3.3) * 0.3);
    const x = fx + Math.cos(a) * d;
    const y = fy + Math.sin(a) * d;
    drawGlow(
      ctx,
      x,
      y,
      (10 + hash(i * 2.1) * 20) * s * (0.4 + e),
      hex(i % 3 ? "ff9a60" : "7ec8ff"),
      0.45,
    );
  }
  ctx.restore();
  ctx.strokeStyle = `rgba(255,230,200,${0.7 * (1 - e)})`;
  ctx.lineWidth = Math.max(1.5, 4 * s * (1 - e));
  ctx.beginPath();
  ctx.arc(fx, fy, R, 0, TAU);
  ctx.stroke();
  // Merkezde kalan yoğun nesne.
  drawGlow(ctx, fx, fy, 14 * s, hex("dfe8ff"), 0.9);
  // Elementler: renkli toplar, üstlerinde simgeleri, dışarı savrulur.
  EJECTA.forEach(([sym, color], i) => {
    for (let j = 0; j < 3; j++) {
      const a = ((i * 3 + j) / 15) * TAU + 0.3 + hash(i * 7 + j) * 0.3;
      const d = R * (0.35 + hash(i * 11 + j) * 0.5);
      const x = fx + Math.cos(a) * d;
      const y = fy + Math.sin(a) * d;
      const k = phase(u, 0.3 + i * 0.12, 0.9 + i * 0.12);
      if (k <= 0) continue;
      const c = hex(color.slice(1));
      drawBalls(ctx, [x, y, 11 * s * k], c, mix(c, [30, 20, 50], 0.4) as RGB, [255, 255, 255]);
      ctx.fillStyle = "rgba(20,16,40,0.9)";
      ctx.font = `700 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha *= k;
      ctx.fillText(sym, x, y + 0.5 * s);
      ctx.globalAlpha /= k;
    }
  });
  if (flash > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, fx, fy, Math.max(w, h) * 0.8 * flash, hex("fff6e8"), flash);
    ctx.restore();
    ctx.fillStyle = `rgba(255,250,240,${0.55 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }
  badge(f, w / 2, h * (wide ? 0.13 : 0.1), "Süpernova: elementler uzaya saçılır", phase(u, 0.4, 1));
  bodyCard(f, pop(u, 2.2, 0.7), t);
}

/** Kemiklerdeki kalsiyum, kandaki demir: çoktan ölmüş yıldızlardan. */
function bodyCard(f: SceneFrame, k: number, t: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 270 * s);
  const ch = 150 * s;
  const x = wide ? w * 0.05 : (w - cw) / 2;
  const y = wide ? h * 0.2 : h * 0.76;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,10,26,0.88)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  // İnsan silueti.
  const hx = 50 * s;
  const hy = 78 * s;
  ctx.fillStyle = "rgba(255,210,170,0.35)";
  ctx.beginPath();
  ctx.arc(hx, hy - 44 * s, 12 * s, 0, TAU);
  ctx.fill();
  roundRect(ctx, hx - 16 * s, hy - 30 * s, 32 * s, 48 * s, 12 * s);
  ctx.fill();
  roundRect(ctx, hx - 14 * s, hy + 12 * s, 11 * s, 48 * s, 5 * s);
  ctx.fill();
  roundRect(ctx, hx + 3 * s, hy + 12 * s, 11 * s, 48 * s, 5 * s);
  ctx.fill();
  // Kemik ve kan damlası.
  ctx.strokeStyle = "#f29ad2";
  ctx.lineWidth = 4 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx - 8.5 * s, hy + 20 * s);
  ctx.lineTo(hx - 8.5 * s, hy + 52 * s);
  ctx.stroke();
  const pulse = 0.85 + 0.15 * Math.sin(t * 4);
  ctx.fillStyle = "#ff6a50";
  ctx.beginPath();
  ctx.moveTo(hx + 6 * s, hy - 20 * s);
  ctx.quadraticCurveTo(hx + 14 * s * pulse, hy - 6 * s, hx + 6 * s, hy - 2 * s);
  ctx.quadraticCurveTo(hx - 2 * s * pulse, hy - 6 * s, hx + 6 * s, hy - 20 * s);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 13.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Yıldız tozundan", 92 * s, 30 * s);
  ctx.font = `500 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillStyle = "#f29ad2";
  ctx.fillText("Ca · kemiklerindeki kalsiyum", 92 * s, 62 * s);
  ctx.fillStyle = "#ff8a58";
  ctx.fillText("Fe · kanındaki demir", 92 * s, 84 * s);
  ctx.fillStyle = "rgba(215,208,196,0.9)";
  ctx.font = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("çoktan ölmüş yıldızlardan kalma", 92 * s, 112 * s);
  ctx.restore();
}
