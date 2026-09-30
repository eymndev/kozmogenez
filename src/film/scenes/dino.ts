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
  camera,
  curve,
  drawGlow,
  ease,
  hex,
  mix,
  phase,
  planet,
  pop,
  project,
  rgba,
  sheet,
  spaceLayer,
  layer,
  drawLayer,
  twinkles,
  type Cam,
} from "@/film/scenes/art";

/**
 * Dinozorlar ve bir taş. Kamera zamanla birlikte sağa kayar: Jura başı, Jura, Geç Kretase;
 * her dönemin kendi dinozorları, bitkileri ve ayak altındaki küçük memelileri. Gökte bir
 * ateş topu belirir; uzaydan Yucatán'a çarpışı, yangınları ve dünyayı saran tozu izleriz.
 * Sonra kül altındaki dünya: önce eğrelti otları döner, yerde yaşayan kuşlar ve memeliler kalır.
 */
export function dino(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [, b1, b2] = beats;
  const up = phase(t, b1 + 0.2, b1 + 1.1);
  const down = phase(t, b2 - 0.3, b2 + 0.8);
  if (up < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - up;
    ages(f);
    ctx.restore();
  }
  const space = up * (1 - down);
  if (space > 0) {
    ctx.save();
    ctx.globalAlpha *= space;
    impact(f, up);
    ctx.restore();
  }
  if (down > 0) {
    ctx.save();
    ctx.globalAlpha *= down;
    aftermath(f);
    ctx.restore();
  }
}

const TAU = Math.PI * 2;
type Pt = [number, number];
type Pal = { base: string; dark: string; light: string; belly?: string };
const pal = (base: string, dark: string, light: string, belly?: string): Pal => ({
  base,
  dark,
  light,
  belly,
});

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

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    wide,
    horizon: f.h * (wide ? 0.55 : 0.5),
    mid: f.h * (wide ? 0.64 : 0.57),
    front: f.h * (wide ? 0.74 : 0.64),
    /** Hayvan ölçeği: yatayda yüksekliğe, dikeyde genişliğe göre. */
    u: wide ? f.h : f.w * 1.25,
  };
}

/* ---------- Mezozoyik: üç durak ---------- */

function agesCam(f: SceneFrame): Cam {
  const { t, beats } = f;
  const [b0, b1] = beats;
  return camera(t, [
    [0, -0.04, 0, 1.04],
    [b0 + 0.6, 0, 0, 1],
    [b0 + 2.6, 1, 0, 1],
    [b0 + 4.6, 2, 0, 1],
    [b1 + 1, 2.08, -0.03, 1.04],
  ]);
}

function ages(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [b0, b1] = beats;
  const G = geo(f);
  const cam = agesCam(f);

  ctx.save();
  applyCam(f, cam, 0.08);
  sheet(f, "dino-gok", -0.2 * w, -0.1 * h, 1.5 * w, G.horizon + 0.05 * h, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, G.horizon);
    grad.addColorStop(0, "#3d7cc4");
    grad.addColorStop(0.55, "#8fc6e6");
    grad.addColorStop(1, "#f2dcae");
    g.fillStyle = grad;
    g.fillRect(-0.2 * w, -0.1 * h, 1.7 * w, G.horizon + 0.2 * h);
    drawGlow(g, w * 1.05, h * 0.12, w * 0.45, hex("fff4d0"), 0.55);
    g.fillStyle = "#fffbe8";
    g.beginPath();
    g.arc(w * 1.05, h * 0.12, Math.min(w, h) * 0.05, 0, TAU);
    g.fill();
    for (const [cx, cy, r] of [
      [0.08, 0.16, 70],
      [0.46, 0.1, 90],
      [0.78, 0.26, 60],
      [1.25, 0.2, 80],
    ] as [number, number, number][])
      cloud(g, w * cx, h * cy, r * s);
  });
  ctx.restore();

  // Ateş topu: son durakta gökyüzünde beliren, yavaşça büyüyen ışık.
  const fire = phase(t, b1 - 1.4, b1 + 0.8, ease.in);
  if (fire > 0.01) {
    const fx = w * (G.wide ? 0.78 : 0.7) - fire * w * 0.1;
    const fy = h * 0.14 + fire * h * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const tail = ctx.createLinearGradient(fx, fy, fx + w * 0.25, fy - h * 0.12);
    tail.addColorStop(0, `rgba(255,220,160,${0.8 * fire})`);
    tail.addColorStop(1, "rgba(255,160,90,0)");
    ctx.strokeStyle = tail;
    ctx.lineCap = "round";
    ctx.lineWidth = (3 + fire * 7) * s;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + w * 0.25, fy - h * 0.12);
    ctx.stroke();
    drawGlow(ctx, fx, fy, (20 + fire * 60) * s, hex("fff0c8"), 0.9);
    drawGlow(ctx, fx, fy, (60 + fire * 160) * s, hex("ffa060"), 0.3 * fire);
    ctx.restore();
  }

  ctx.save();
  applyCam(f, cam, 0.25);
  sheet(f, "dino-dag", -0.2 * w, G.horizon - 0.22 * h, 1.9 * w, G.horizon + 0.03 * h, (g) => {
    ridge(g, -0.2 * w, 1.9 * w, G.horizon, 0.1 * h, "#8aa6c8", "#7892b6", 2.1);
    // Uzakta dumanı tüten bir yanardağ.
    const vx = w * 1.35;
    g.fillStyle = "#7086aa";
    g.beginPath();
    g.moveTo(vx - w * 0.16, G.horizon + 2);
    g.quadraticCurveTo(vx - w * 0.05, G.horizon - h * 0.12, vx - w * 0.02, G.horizon - h * 0.17);
    g.lineTo(vx + w * 0.02, G.horizon - h * 0.17);
    g.quadraticCurveTo(vx + w * 0.06, G.horizon - h * 0.1, vx + w * 0.16, G.horizon + 2);
    g.fill();
    ridge(g, -0.2 * w, 1.9 * w, G.horizon + 0.01 * h, 0.05 * h, "#6f8f86", "#5f7f78", 5.3);
  });
  ctx.restore();

  ctx.save();
  applyCam(f, cam, 0.55);
  sheet(f, "dino-orman", -0.2 * w, G.horizon - 0.28 * h, 3.4 * w, G.mid + 0.02 * h, (g) => {
    for (let i = 0; i < 26; i++) {
      const x = -0.15 * w + i * 0.135 * w + hash(i * 3.1) * 0.05 * w;
      const H = (0.14 + hash(i * 1.7) * 0.12) * h;
      araucaria(g, x, G.horizon + 0.03 * h, H, pal("#3f6f5a", "#325a4a", "#5c8c70"));
    }
    g.fillStyle = "#56806a";
    g.fillRect(-0.2 * w, G.horizon + 0.025 * h, 3.6 * w, G.mid - G.horizon);
  });
  ctx.restore();

  ctx.save();
  applyCam(f, cam);
  sheet(f, "dino-zemin", -0.2 * w, G.horizon + 0.02 * h, 3.4 * w, h * 1.1, (g) => {
    const grad = g.createLinearGradient(0, G.horizon, 0, h);
    grad.addColorStop(0, "#6f9a62");
    grad.addColorStop(0.5, "#5a8450");
    grad.addColorStop(1, "#3a5c3a");
    g.fillStyle = grad;
    g.fillRect(-0.2 * w, G.horizon + 0.03 * h, 3.6 * w, h);
    // Kıvrılan ırmak: gökyüzünü yansıtan açık şerit.
    g.fillStyle = "rgba(170,215,235,0.85)";
    g.beginPath();
    const pts: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      pts.push([
        -0.2 * w + (3.6 * w * i) / 30,
        G.horizon + 0.06 * h + Math.sin(i * 0.7) * 0.012 * h,
      ]);
    }
    curve(g, pts);
    for (let i = 30; i >= 0; i--) {
      g.lineTo(
        -0.2 * w + (3.6 * w * i) / 30,
        G.horizon + 0.075 * h + Math.sin(i * 0.7) * 0.012 * h,
      );
    }
    g.fill();
    for (let i = 0; i < 120; i++) {
      const x = -0.2 * w + hash(i * 2.9) * 3.6 * w;
      const d = hash(i * 5.3);
      const y = G.mid + d * d * (h - G.mid);
      g.fillStyle = d > 0.5 ? "rgba(40,70,40,0.5)" : "rgba(120,160,100,0.5)";
      g.beginPath();
      g.ellipse(x, y, (6 + d * 18) * s, (2 + d * 5) * s, 0, 0, TAU);
      g.fill();
    }
  });

  // Bitkiler: cycas, ağaç eğreltileri, eğrelti öbekleri; son durakta çiçekli çalılar.
  for (let i = 0; i < 14; i++) {
    const x = -0.1 * w + i * 0.24 * w + hash(i * 4.4) * 0.06 * w;
    const y = G.mid + hash(i * 1.3) * 0.02 * h;
    if (i % 3 === 0) treeFern(ctx, x, y, (0.12 + hash(i) * 0.06) * G.u, t, i);
    else cycad(ctx, x, y, (0.06 + hash(i) * 0.04) * G.u, i);
  }
  for (let i = 0; i < 6; i++) {
    const x = 2.05 * w + i * 0.17 * w;
    flowers(ctx, x, G.mid + 0.02 * h, (0.05 + hash(i * 3.3) * 0.03) * G.u, i, t);
  }

  // Durak 1, Jura başı: Dilophosaurus ve Massospondylus.
  const U = G.u;
  theropod(ctx, 0.86 * w, G.mid, 0.34 * U, t * 0.8, MASSO);
  theropod(ctx, 0.56 * w + Math.max(0, t - b0 + 1) * 0.03 * w, G.front, 0.32 * U, t * 5, DILO);
  mammal(ctx, 0.9 * w - wrap(t * 30 * s, 80 * s), G.front + 0.05 * h, 0.035 * U, t, -1);
  // Durak 2, Jura: Brachiosaurus ve Stegosaurus.
  brachiosaurus(ctx, 1.74 * w, G.mid, 0.46 * U, t);
  stegosaurus(ctx, 1.5 * w + Math.max(0, t - b0 - 1.4) * 0.02 * w, G.front, 0.34 * U, t);
  mammal(ctx, 1.84 * w + Math.sin(t * 1.3) * 20 * s, G.front + 0.06 * h, 0.035 * U, t + 3, 1);
  // Durak 3, Geç Kretase: Tyrannosaurus ve Triceratops sürüsü.
  theropod(ctx, 2.46 * w + Math.max(0, t - b0 - 3.4) * 0.025 * w, G.mid, 0.5 * U, t * 3.4, REX);
  triceratops(ctx, 2.78 * w, G.front + 0.01 * h, 0.4 * U, t, -1, 0);
  triceratops(ctx, 2.93 * w, G.mid + 0.02 * h, 0.3 * U, t + 1.7, -1, 1);
  mammal(ctx, 2.64 * w + Math.sin(t * 1.6) * 24 * s, G.front + 0.07 * h, 0.04 * U, t + 5, 1);
  ctx.restore();

  // Pterosorlar: gökte süzülür; Jura'da küçük, Kretase'de dev.
  ctx.save();
  applyCam(f, cam, 0.8);
  pterosaur(ctx, 0.5 * w + t * 12 * s, h * 0.2 + Math.sin(t * 0.6) * 10 * s, 0.1 * U, t, false);
  pterosaur(ctx, 1.3 * w + t * 10 * s, h * 0.26, 0.09 * U, t + 1, false);
  pterosaur(
    ctx,
    1.95 * w + t * 16 * s,
    h * 0.18 + Math.sin(t * 0.5) * 12 * s,
    0.26 * U,
    t + 2,
    true,
  );
  ctx.restore();

  // Önde sallanan eğrelti yaprakları: derinlik için koyu siluetler.
  ctx.save();
  applyCam(f, cam, 1.35);
  for (let i = 0; i < 9; i++) {
    const x = -0.05 * w + i * 0.5 * w + hash(i * 6.1) * 0.1 * w;
    fern(ctx, x, h * 1.04, (0.22 + hash(i) * 0.1) * h, t, i, pal("#12261a", "#0c1c12", "#1e3a26"));
  }
  ctx.restore();

  // Etiketler.
  const P = (x: number, y: number) => project(f, cam, x, y);
  const wide = G.wide;
  const era = (label: string, a: number, b: number) =>
    badge(
      f,
      w / 2,
      h * (wide ? 0.13 : 0.1),
      label,
      phase(t, a, a + 0.5) * (1 - phase(t, b - 0.4, b)),
    );
  era("Jura başı · ~200 milyon yıl önce", b0 - 0.2, b0 + 1.4);
  era("Jura · ~150 milyon yıl önce", b0 + 2.4, b0 + 3.8);
  era("Geç Kretase · ~68 milyon yıl önce", b0 + 4.4, b1 - 0.4);
  {
    const x = 0.56 * w + Math.max(0, t - b0 + 1) * 0.03 * w + 0.11 * U;
    const [ax, ay] = P(x, G.front - 0.21 * U);
    callout(
      f,
      ax,
      ay,
      "Dilophosaurus",
      phase(t, b0 + 0.1, b0 + 0.8) * (1 - phase(t, b0 + 1.2, b0 + 1.5)),
      1,
      "başında çift ibik",
    );
  }
  {
    const [ax, ay] = P(1.74 * w + 0.16 * U, G.mid - 0.44 * U);
    callout(
      f,
      ax,
      ay,
      "Brachiosaurus",
      phase(t, b0 + 2.3, b0 + 3) * (1 - phase(t, b0 + 3.4, b0 + 3.7)),
      wide ? 1 : -1,
      "~12 metre boyunda",
    );
  }
  {
    const x = 1.5 * w + Math.max(0, t - b0 - 1.4) * 0.02 * w;
    const [ax, ay] = P(x - 0.05 * U, G.front - 0.2 * U);
    callout(
      f,
      ax,
      ay,
      "Stegosaurus",
      phase(t, b0 + 2.7, b0 + 3.3) * (1 - phase(t, b0 + 3.4, b0 + 3.7)),
      -1,
      "sırtında plakalar",
    );
  }
  const lateOut = 1 - phase(t, b1 - 0.2, b1 + 0.3);
  {
    const x = 2.46 * w + Math.max(0, t - b0 - 3.4) * 0.025 * w + 0.17 * U;
    const [ax, ay] = P(x, G.mid - 0.25 * U);
    callout(
      f,
      ax,
      ay,
      "Tyrannosaurus",
      phase(t, b0 + 4.6, b0 + 5.2) * lateOut,
      wide ? 1 : -1,
      "~12 metre, dev çeneler",
    );
  }
  {
    const [ax, ay] = P(2.78 * w + 0.02 * U, G.front - 0.12 * U);
    callout(
      f,
      ax,
      ay,
      "Triceratops",
      phase(t, b0 + 5, b0 + 5.6) * lateOut,
      wide ? 1 : -1,
      "boynuzlar ve yaka",
    );
  }
  {
    const [ax, ay] = P(2.64 * w, G.front + 0.06 * h);
    callout(f, ax, ay, "Memeli", phase(t, b0 + 5.4, b0 + 6) * lateOut, -1, "çoğu fare boyutunda");
  }
}

function cloud(g: Ctx, x: number, y: number, r: number) {
  const p = new Path2D();
  for (const [px, py, pr] of [
    [-0.9, 0.1, 0.42],
    [-0.45, -0.12, 0.58],
    [0.1, -0.3, 0.74],
    [0.62, -0.08, 0.55],
    [1, 0.12, 0.38],
  ] as [number, number, number][]) {
    p.moveTo(x + px * r + pr * r, y + py * r);
    p.arc(x + px * r, y + py * r, pr * r, 0, TAU);
  }
  g.save();
  g.beginPath();
  g.rect(x - 2 * r, y - 2 * r, 4 * r, 2.3 * r);
  g.clip();
  toon(g, p, pal("#ffffff", "#d6e6f2", "#ffffff"), r * 0.1);
  g.restore();
}

function ridge(
  g: Ctx,
  x0: number,
  x1: number,
  base: number,
  amp: number,
  light: string,
  dark: string,
  seed: number,
) {
  const n = 22;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const peak = i % 2 === 0 ? 0.5 + 0.5 * hash(i * 3.1 + seed) : 0.15 + 0.2 * hash(i + seed);
    pts.push([x0 + ((x1 - x0) * i) / n + (hash(i * 7.7 + seed) - 0.5) * 20, base - amp * peak]);
  }
  g.fillStyle = light;
  g.beginPath();
  g.moveTo(x0, base + amp);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(x1, base + amp);
  g.closePath();
  g.fill();
  g.fillStyle = dark;
  for (let i = 0; i < n; i += 2) {
    const [px, py] = pts[i];
    const [qx, qy] = pts[i + 1];
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(qx, qy);
    g.lineTo(qx - (qx - px) * 0.3, base + amp);
    g.lineTo(px, base + amp);
    g.closePath();
    g.fill();
  }
}

/* ---------- Bitkiler ---------- */

function araucaria(g: Ctx, x: number, y: number, H: number, p: Pal) {
  g.strokeStyle = "#4a3a32";
  g.lineWidth = H * 0.035;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - H);
  g.stroke();
  for (let j = 0; j < 5; j++) {
    const v = 0.62 + j * 0.09;
    const wd = H * (0.28 - j * 0.04);
    const path = new Path2D();
    path.ellipse(x, y - H * v, wd, H * 0.05, 0, 0, TAU);
    toon(g, path, p, H * 0.012);
  }
}

function cycad(ctx: Ctx, x: number, y: number, H: number, seed: number) {
  const trunk = new Path2D();
  trunk.ellipse(x, y - H * 0.25, H * 0.12, H * 0.28, 0, 0, TAU);
  toon(ctx, trunk, pal("#8a6a48", "#6a4e34", "#a88660"), H * 0.03);
  ctx.strokeStyle = "rgba(90,60,40,0.5)";
  ctx.lineWidth = Math.max(1, H * 0.015);
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(x - H * 0.1, y - H * (0.08 + k * 0.08));
    ctx.lineTo(x + H * 0.1, y - H * (0.12 + k * 0.08));
    ctx.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.36 + (hash(seed + k) - 0.5) * 0.2;
    const len = H * (0.55 + hash(seed * 3 + k) * 0.25);
    const tx = x + Math.cos(a) * len;
    const ty = y - H * 0.5 + Math.sin(a) * len * 0.8 + len * 0.25;
    ctx.strokeStyle = k % 2 ? "#4f8a4a" : "#3f7640";
    ctx.lineWidth = Math.max(1, H * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - H * 0.5);
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.6,
      y - H * 0.5 + Math.sin(a) * len * 0.6,
      tx,
      ty,
    );
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, H * 0.014);
    ctx.beginPath();
    for (let q = 1; q < 7; q++) {
      const v = q / 7;
      const px = x + (tx - x) * v;
      const py = y - H * 0.5 + (ty - (y - H * 0.5)) * v - Math.sin(v * Math.PI) * len * 0.12;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + 1.2) * H * 0.07, py + Math.sin(a + 1.2) * H * 0.07);
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a - 1.2) * H * 0.07, py + Math.sin(a - 1.2) * H * 0.07);
    }
    ctx.stroke();
  }
}

function treeFern(ctx: Ctx, x: number, y: number, H: number, t: number, seed: number) {
  ctx.strokeStyle = "#5a4232";
  ctx.lineWidth = H * 0.06;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + H * 0.04, y - H * 0.5, x, y - H);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    const sway = Math.sin(t * 0.9 + seed + k) * 0.05;
    const dx = Math.cos(a) * H * 0.42;
    const tx = x + dx;
    const ty = y - H * 0.78 + Math.abs(Math.sin(a)) * H * 0.1;
    ctx.strokeStyle = k % 2 ? "#4a8c52" : "#3a7644";
    ctx.lineWidth = Math.max(1, H * 0.03);
    ctx.beginPath();
    ctx.moveTo(x, y - H);
    ctx.quadraticCurveTo(x + dx * 0.6, y - H * (1.12 + sway), tx, ty);
    ctx.stroke();
  }
}

function fern(ctx: Ctx, x: number, y: number, H: number, t: number, seed: number, p: Pal) {
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.32 + Math.sin(t * 1.1 + seed + k) * 0.05;
    const len = H * (0.6 + hash(seed * 5 + k) * 0.4);
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    const cx = x + Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * len * 0.12;
    const cy = y + Math.sin(a) * len * 0.5 + Math.sin(a + Math.PI / 2) * len * 0.12;
    ctx.strokeStyle = k % 2 ? p.base : p.dark;
    ctx.lineWidth = Math.max(1, H * 0.018);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
    ctx.fillStyle = k % 2 ? p.base : p.light;
    for (let q = 1; q < 9; q++) {
      const v = q / 9;
      const px = (1 - v) * (1 - v) * x + 2 * (1 - v) * v * cx + v * v * tx;
      const py = (1 - v) * (1 - v) * y + 2 * (1 - v) * v * cy + v * v * ty;
      const lw = H * 0.09 * (1 - v * 0.7);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          px + Math.cos(a + side * 1.3) * lw * 0.5,
          py + Math.sin(a + side * 1.3) * lw * 0.5,
          lw * 0.55,
          lw * 0.2,
          a + side * 1.3,
          0,
          TAU,
        );
        ctx.fill();
      }
    }
  }
}

/** Geç Kretase'nin yenilikleri: çiçekli bitkiler (manolyaya benzer çalılar). */
function flowers(ctx: Ctx, x: number, y: number, H: number, seed: number, t: number) {
  const bush = new Path2D();
  for (let k = 0; k < 5; k++) {
    const bx = x + (k - 2) * H * 0.35;
    const by = y - H * (0.35 + hash(seed * 7 + k) * 0.25);
    bush.moveTo(bx + H * 0.4, by);
    bush.arc(bx, by, H * 0.4, 0, TAU);
  }
  toon(ctx, bush, pal("#4f8a4a", "#3a6c3a", "#6aa860"), H * 0.06);
  for (let k = 0; k < 9; k++) {
    const fx = x + (hash(seed * 11 + k) - 0.5) * H * 1.6;
    const fy = y - H * (0.4 + hash(seed * 13 + k) * 0.5);
    const r = H * 0.09 * (0.9 + 0.1 * Math.sin(t * 2 + k));
    ctx.fillStyle = k % 3 ? "#f7d6e6" : "#fff4f8";
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * TAU;
      ctx.beginPath();
      ctx.ellipse(
        fx + Math.cos(a) * r * 0.6,
        fy + Math.sin(a) * r * 0.6,
        r * 0.6,
        r * 0.34,
        a,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#f2b640";
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.3, 0, TAU);
    ctx.fill();
  }
}

/* ---------- Hayvanlar (yandan, sağa bakar) ---------- */

type Theropod = {
  /** Kafa boyu, çene derinliği, boyun yüksekliği ve öne uzanışı, kol boyu, gövde derinliği. */
  head: number;
  jaw: number;
  neck: number;
  reach: number;
  arm: number;
  bulk: number;
  leg: number;
  crest: boolean;
  teeth: boolean;
  p: Pal;
  stripes: string;
};
const DILO: Theropod = {
  head: 0.12,
  jaw: 0.035,
  neck: 0.2,
  reach: 0.1,
  arm: 0.12,
  bulk: 0.075,
  leg: 0.36,
  crest: true,
  teeth: true,
  p: pal("#c79a4a", "#9a7236", "#e6c27a", "#ecd8a6"),
  stripes: "rgba(110,70,30,0.45)",
};
const REX: Theropod = {
  head: 0.2,
  jaw: 0.07,
  neck: 0.11,
  reach: 0.08,
  arm: 0.05,
  bulk: 0.13,
  leg: 0.34,
  crest: false,
  teeth: true,
  p: pal("#6a6a48", "#4e4e34", "#8a8a62", "#c8b68a"),
  stripes: "rgba(50,46,30,0.45)",
};
/** Massospondylus: iki ayaklı, uzun boyunlu, küçük başlı bir sauropodomorf. */
const MASSO: Theropod = {
  head: 0.07,
  jaw: 0.02,
  neck: 0.36,
  reach: 0.22,
  arm: 0.14,
  bulk: 0.09,
  leg: 0.3,
  crest: false,
  teeth: false,
  p: pal("#a8886a", "#86684c", "#c6a888", "#e2d0b4"),
  stripes: "rgba(110,80,50,0.35)",
};

/** İki kemikli bacak için diz: diz öne bakar. */
function knee(hx: number, hy: number, ax: number, ay: number, l1: number, l2: number): Pt {
  const dx = ax - hx;
  const dy = ay - hy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
  const a = Math.atan2(dy, dx);
  const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [hx + Math.cos(a - c) * l1, hy + Math.sin(a - c) * l1];
}

/**
 * İki ayaklı dinozor: kalın uyluklu bacaklar üstünde dengelenen gövde, uzun kuyruk, S boyun.
 * Ayak yere basar, öteki ayak kalkıp öne gelir; diz öne bakar, bilek yerden yüksektedir.
 */
function theropod(ctx: Ctx, x: number, y: number, L: number, ph: number, T: Theropod) {
  const hipY = -T.leg * L;
  const bob = Math.abs(Math.cos(ph)) * 0.01 * L;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const leg = (p: number, col: string, dark: boolean) => {
    const fx = 0.04 * L + 0.13 * L * Math.sin(p);
    const fy = -0.05 * L * Math.max(0, Math.cos(p));
    const ax = fx - 0.035 * L;
    const ay = fy - T.leg * 0.3 * L;
    const hy = hipY - bob;
    const [kx, ky] = knee(0, hy, ax, ay, T.leg * 0.5 * L, T.leg * 0.45 * L);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = T.bulk * L * 0.42;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.lineWidth = T.bulk * L * 0.28;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(fx, fy);
    ctx.lineTo(fx + 0.07 * L, fy);
    ctx.stroke();
    // Kaslı uyluk: kalçadan dize uzanan kalın gövde.
    const ang = Math.atan2(ky - hy, kx);
    ctx.beginPath();
    ctx.ellipse(kx * 0.5, (hy + ky) * 0.5, T.leg * 0.3 * L, T.bulk * L * 0.62, ang, 0, TAU);
    ctx.fill();
    if (!dark) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(
        kx * 0.45 - 0.01 * L,
        (hy + ky) * 0.5 - 0.02 * L,
        T.leg * 0.2 * L,
        T.bulk * L * 0.25,
        ang,
        0,
        TAU,
      );
      ctx.fill();
    }
  };
  leg(ph + Math.PI, T.p.dark, true);
  const by = hipY - bob;
  const sway = Math.sin(ph * 0.5) * 0.02 * L;
  const hx = 0.24 * L + T.reach * L;
  const hy = by - T.neck * L;
  const B = T.bulk * L;
  const pts: Pt[] = [
    [-0.64 * L, by + 0.02 * L + sway],
    [-0.4 * L, by - 0.04 * L + sway * 0.5],
    [-0.12 * L, by - B * 1.05],
    [0.1 * L, by - B * 1.0],
    [0.2 * L, by - B * 0.6],
    [0.2 * L + T.reach * 0.6 * L, hy + T.head * 0.2 * L],
    [hx, hy - T.head * 0.12 * L],
    [hx + 0.02 * L, hy + T.head * 0.35 * L],
    [0.22 * L + T.reach * 0.3 * L, by - B * 0.1],
    [0.18 * L, by + B * 0.75],
    [0.02 * L, by + B * 0.85],
    [-0.14 * L, by + B * 0.45],
    [-0.4 * L, by + 0.04 * L + sway * 0.5],
  ];
  const body = new Path2D();
  curve(body, pts, true);
  toon(ctx, body, T.p, 0.012 * L);
  ctx.save();
  ctx.clip(body);
  if (T.p.belly) {
    ctx.fillStyle = T.p.belly;
    ctx.globalAlpha *= 0.65;
    ctx.beginPath();
    ctx.ellipse(0.06 * L, by + B * 0.75, 0.2 * L, B * 0.35, -0.1, 0, TAU);
    ctx.fill();
    ctx.globalAlpha /= 0.65;
  }
  ctx.strokeStyle = T.stripes;
  ctx.lineWidth = Math.max(1, 0.012 * L);
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const sx = -0.42 * L + k * 0.07 * L;
    ctx.moveTo(sx, by - B * 1.1);
    ctx.lineTo(sx + 0.03 * L, by - B * 0.2);
  }
  ctx.stroke();
  ctx.restore();
  // Kollar.
  ctx.strokeStyle = T.p.dark;
  ctx.lineWidth = Math.max(1, B * 0.2);
  ctx.beginPath();
  ctx.moveTo(0.18 * L, by + B * 0.2);
  ctx.lineTo(0.18 * L + T.arm * 0.5 * L, by + B * 0.2 + T.arm * 0.5 * L);
  ctx.lineTo(0.18 * L + T.arm * L, by + B * 0.2 + T.arm * 0.35 * L);
  ctx.stroke();
  // Baş: çenesi arada açılıp kapanan kafatası, göz, dişler.
  const hl = T.head * L;
  const open = Math.max(0, Math.sin(ph * 0.3)) * 0.2;
  const skull = new Path2D();
  skull.moveTo(hx - hl * 0.25, hy - hl * 0.2);
  skull.quadraticCurveTo(hx + hl * 0.3, hy - hl * 0.42, hx + hl * 0.95, hy - hl * 0.1);
  skull.lineTo(hx + hl, hy + hl * 0.1);
  skull.lineTo(hx - hl * 0.15, hy + hl * 0.22);
  skull.closePath();
  const jaw = new Path2D();
  jaw.moveTo(hx - hl * 0.1, hy + hl * 0.16);
  jaw.lineTo(hx + hl * 0.9, hy + hl * 0.12);
  jaw.lineTo(hx + hl * 0.85, hy + hl * 0.12 + T.jaw * L);
  jaw.quadraticCurveTo(hx + hl * 0.3, hy + hl * 0.2 + T.jaw * L, hx - hl * 0.1, hy + hl * 0.34);
  jaw.closePath();
  ctx.save();
  ctx.translate(hx - hl * 0.1, hy + hl * 0.16);
  ctx.rotate(open);
  ctx.translate(-(hx - hl * 0.1), -(hy + hl * 0.16));
  toon(ctx, jaw, T.p, 0.005 * L);
  ctx.restore();
  if (T.teeth) {
    ctx.fillStyle = "#f4eedc";
    for (let k = 0; k < 7; k++) {
      const tx = hx + hl * (0.15 + k * 0.11);
      ctx.beginPath();
      ctx.moveTo(tx, hy + hl * 0.12);
      ctx.lineTo(tx + hl * 0.035, hy + hl * 0.21);
      ctx.lineTo(tx + hl * 0.07, hy + hl * 0.11);
      ctx.fill();
    }
  }
  toon(ctx, skull, T.p, 0.006 * L);
  if (T.crest) {
    ctx.fillStyle = "#d9543a";
    for (const off of [0, 0.07]) {
      ctx.beginPath();
      ctx.moveTo(hx + hl * (0.05 + off), hy - hl * 0.28);
      ctx.quadraticCurveTo(
        hx + hl * (0.35 + off),
        hy - hl * 1.0,
        hx + hl * (0.72 + off),
        hy - hl * 0.2,
      );
      ctx.fill();
    }
  }
  ctx.fillStyle = "#1c1810";
  ctx.beginPath();
  ctx.arc(hx + hl * 0.32, hy - hl * 0.08, Math.max(1, hl * 0.075), 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(hx + hl * 0.3, hy - hl * 0.11, Math.max(0.6, hl * 0.025), 0, TAU);
  ctx.fill();
  leg(ph, T.p.base, false);
  ctx.restore();
}

function triceratops(
  ctx: Ctx,
  x: number,
  y: number,
  L: number,
  t: number,
  dir: number,
  seed: number,
) {
  const p = pal("#8a8c5a", "#6a6c42", "#aaac78", "#cfc49a");
  const graze = Math.max(0, Math.sin(t * 0.8 + seed * 2)) ** 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineCap = "round";
  const legs = (col: string, near: boolean) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = L * 0.085;
    for (const lx of near ? [-0.2, 0.2] : [-0.14, 0.26]) {
      ctx.beginPath();
      ctx.moveTo(lx * L, -0.3 * L);
      ctx.lineTo(lx * L + 0.01 * L, -0.03 * L);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(lx * L + 0.02 * L, -0.02 * L, 0.055 * L, 0.025 * L, 0, 0, TAU);
      ctx.fill();
    }
  };
  legs(p.dark, false);
  const tail = new Path2D();
  tail.moveTo(-0.3 * L, -0.42 * L);
  tail.quadraticCurveTo(-0.52 * L, -0.34 * L, -0.66 * L, -0.24 * L);
  tail.quadraticCurveTo(-0.5 * L, -0.26 * L, -0.28 * L, -0.28 * L);
  tail.closePath();
  toon(ctx, tail, p, 0.01 * L);
  const body = new Path2D();
  body.ellipse(-0.03 * L, -0.38 * L, 0.36 * L, 0.18 * L, -0.04, 0, TAU);
  toon(ctx, body, p, 0.02 * L);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = p.belly!;
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.ellipse(-0.03 * L, -0.25 * L, 0.3 * L, 0.06 * L, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Baş: yaka, iki uzun kaş boynuzu, kısa burun boynuzu ve gaga; otlarken aşağı iner.
  ctx.save();
  ctx.translate(0.28 * L, -0.4 * L);
  ctx.rotate(0.35 * graze);
  const frill = new Path2D();
  const scal: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * 0.55 + (k / 10) * Math.PI * 0.95;
    const r = 0.2 * L * (1 + (k % 2 ? 0.08 : 0));
    scal.push([Math.cos(a) * r + 0.02 * L, Math.sin(a) * r - 0.04 * L]);
  }
  frill.moveTo(0.05 * L, 0.02 * L);
  for (const [px, py] of scal) frill.lineTo(px, py);
  frill.closePath();
  toon(ctx, frill, pal("#d9794a", "#b25a34", "#f09a66"), 0.01 * L);
  ctx.strokeStyle = "rgba(255,230,190,0.6)";
  ctx.lineWidth = Math.max(1, 0.01 * L);
  ctx.beginPath();
  ctx.arc(0.02 * L, -0.04 * L, 0.13 * L, Math.PI * 0.65, Math.PI * 1.45);
  ctx.stroke();
  const skull = new Path2D();
  skull.moveTo(-0.02 * L, -0.06 * L);
  skull.quadraticCurveTo(0.14 * L, -0.12 * L, 0.24 * L, 0.02 * L);
  skull.lineTo(0.3 * L, 0.08 * L);
  skull.quadraticCurveTo(0.2 * L, 0.12 * L, 0.02 * L, 0.08 * L);
  skull.closePath();
  toon(ctx, skull, p, 0.008 * L);
  ctx.fillStyle = "#f2e8cc";
  for (const [bx, by, tx, ty, wd] of [
    [0.08, -0.07, 0.3, -0.22, 0.03],
    [0.12, -0.06, 0.32, -0.18, 0.025],
    [0.22, 0.0, 0.27, -0.06, 0.02],
  ] as [number, number, number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(bx * L - wd * L, by * L);
    ctx.quadraticCurveTo((bx + tx) * 0.5 * L, (by + ty) * 0.5 * L - 0.02 * L, tx * L, ty * L);
    ctx.lineTo(bx * L + wd * L, by * L);
    ctx.fill();
  }
  ctx.fillStyle = "#1c1810";
  ctx.beginPath();
  ctx.arc(0.1 * L, -0.02 * L, Math.max(1, 0.014 * L), 0, TAU);
  ctx.fill();
  ctx.restore();
  legs(p.base, true);
  ctx.restore();
}

function stegosaurus(ctx: Ctx, x: number, y: number, L: number, t: number) {
  const p = pal("#7a8a5a", "#5c6c42", "#9aaa78", "#cfc49a");
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  const legs = (col: string, near: boolean) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = L * 0.07;
    for (const [lx, top] of near
      ? ([
          [-0.2, -0.42],
          [0.2, -0.26],
        ] as [number, number][])
      : ([
          [-0.14, -0.42],
          [0.24, -0.26],
        ] as [number, number][])) {
      const sw = Math.sin(t * 3 + lx * 10) * 0.02 * L;
      ctx.beginPath();
      ctx.moveTo(lx * L, top * L);
      ctx.lineTo(lx * L + sw, -0.02 * L);
      ctx.stroke();
    }
  };
  legs(p.dark, false);
  // Sırt plakaları: iki sıra, dönüşümlü; kuyruk ucunda dört diken.
  for (let k = 0; k < 9; k++) {
    const u = k / 8;
    const px = (-0.36 + u * 0.62) * L;
    const py = -0.4 * L - Math.sin(u * Math.PI) * 0.16 * L;
    const ph = (0.07 + Math.sin(u * Math.PI) * 0.1) * L;
    const plate = new Path2D();
    plate.moveTo(px - ph * 0.45, py + ph * 0.3);
    plate.quadraticCurveTo(px - ph * 0.3, py - ph, px + ph * 0.1, py - ph * 1.1);
    plate.quadraticCurveTo(px + ph * 0.5, py - ph * 0.2, px + ph * 0.45, py + ph * 0.3);
    plate.closePath();
    toon(ctx, plate, pal("#d98a4a", "#b0643a", "#f2b070"), 0.008 * L);
  }
  const body = new Path2D();
  body.moveTo(-0.7 * L, -0.3 * L);
  body.quadraticCurveTo(-0.3 * L, -0.66 * L, 0.18 * L, -0.4 * L);
  body.quadraticCurveTo(0.3 * L, -0.32 * L, 0.42 * L, -0.24 * L);
  body.quadraticCurveTo(0.46 * L, -0.19 * L, 0.36 * L, -0.19 * L);
  body.quadraticCurveTo(0.1 * L, -0.18 * L, -0.1 * L, -0.24 * L);
  body.quadraticCurveTo(-0.45 * L, -0.22 * L, -0.7 * L, -0.28 * L);
  body.closePath();
  toon(ctx, body, p, 0.015 * L);
  ctx.fillStyle = "#f2e8cc";
  for (const [a, b] of [
    [-0.6, -0.3],
    [-0.66, -0.29],
  ] as Pt[]) {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a * L - 0.01 * L, b * L);
      ctx.lineTo(a * L - 0.05 * L, b * L - d * 0.09 * L);
      ctx.lineTo(a * L + 0.02 * L, b * L);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#1c1810";
  ctx.beginPath();
  ctx.arc(0.39 * L, -0.23 * L, Math.max(1, 0.01 * L), 0, TAU);
  ctx.fill();
  legs(p.base, true);
  ctx.restore();
}

function brachiosaurus(ctx: Ctx, x: number, y: number, H: number, t: number) {
  const p = pal("#8a92a8", "#6a7288", "#aab2c6", "#cfd2da");
  const L = H * 0.9;
  const bob = Math.sin(t * 0.6) * 0.015 * H;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  const legs = (col: string, near: boolean) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = L * 0.07;
    for (const [lx, top] of near
      ? ([
          [-0.18, -0.34],
          [0.14, -0.44],
        ] as [number, number][])
      : ([
          [-0.12, -0.34],
          [0.2, -0.44],
        ] as [number, number][])) {
      ctx.beginPath();
      ctx.moveTo(lx * L, top * L);
      ctx.lineTo(lx * L, -0.01 * L);
      ctx.stroke();
    }
  };
  legs(p.dark, false);
  const body = new Path2D();
  body.moveTo(-0.62 * L, -0.28 * L);
  body.quadraticCurveTo(-0.3 * L, -0.46 * L, 0.05 * L, -0.54 * L);
  // Yükselen boyun: omuzdan göğe doğru, hafifçe salınır.
  body.quadraticCurveTo(0.2 * L, -0.7 * L, 0.26 * L + bob, -1.02 * L);
  body.lineTo(0.33 * L + bob, -1.04 * L);
  body.quadraticCurveTo(0.3 * L, -0.7 * L, 0.24 * L, -0.4 * L);
  body.quadraticCurveTo(0.1 * L, -0.26 * L, -0.2 * L, -0.28 * L);
  body.quadraticCurveTo(-0.45 * L, -0.26 * L, -0.62 * L, -0.26 * L);
  body.closePath();
  toon(ctx, body, p, 0.015 * L);
  const headP = new Path2D();
  headP.ellipse(0.33 * L + bob, -1.05 * L, 0.07 * L, 0.035 * L, 0.1, 0, TAU);
  toon(ctx, headP, p, 0.006 * L);
  ctx.fillStyle = "#1c1810";
  ctx.beginPath();
  ctx.arc(0.33 * L + bob, -1.06 * L, Math.max(1, 0.008 * L), 0, TAU);
  ctx.fill();
  legs(p.base, true);
  ctx.restore();
}

/** Kürklü, küçük bir memeli: burnu sivri, kuyruğu uzun; koşuşturur, arada durup koklar. */
function mammal(ctx: Ctx, x: number, y: number, L: number, t: number, dir: number) {
  const p = pal("#8a6a52", "#6a4e3a", "#aa8a6e");
  const scurry = Math.sin(t * 14);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = p.dark;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, L * 0.06);
  ctx.beginPath();
  ctx.moveTo(-0.4 * L, -0.25 * L);
  ctx.quadraticCurveTo(-0.8 * L, -0.4 * L, -1.1 * L, -0.2 * L + Math.sin(t * 3) * 0.05 * L);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, L * 0.08);
  for (const [lx, ph] of [
    [-0.25, 0],
    [0.25, Math.PI],
  ] as Pt[]) {
    ctx.beginPath();
    ctx.moveTo(lx * L, -0.2 * L);
    ctx.lineTo(lx * L + Math.sin(scurry * 3 + ph) * 0.08 * L, 0);
    ctx.stroke();
  }
  const body = new Path2D();
  body.ellipse(0, -0.3 * L, 0.45 * L, 0.24 * L, 0, 0, TAU);
  toon(ctx, body, p, 0.04 * L);
  const headP = new Path2D();
  headP.moveTo(0.3 * L, -0.45 * L);
  headP.quadraticCurveTo(0.6 * L, -0.5 * L, 0.78 * L, -0.3 * L);
  headP.quadraticCurveTo(0.55 * L, -0.2 * L, 0.3 * L, -0.2 * L);
  headP.closePath();
  toon(ctx, headP, p, 0.03 * L);
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.ellipse(0.36 * L, -0.5 * L, 0.08 * L, 0.1 * L, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#1c1410";
  ctx.beginPath();
  ctx.arc(0.5 * L, -0.38 * L, Math.max(0.8, 0.045 * L), 0, TAU);
  ctx.arc(0.78 * L, -0.3 * L, Math.max(0.6, 0.03 * L), 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Uçan pterosor: yarasa gibi zar kanatlar, uzun boyun ve gaga; dev olanın başında ibik. */
function pterosaur(ctx: Ctx, x: number, y: number, W: number, t: number, giant: boolean) {
  const flap = Math.sin(t * (giant ? 1.6 : 3.2));
  const p = giant ? pal("#c9c2b4", "#a09888", "#e6e0d4") : pal("#8a6a5a", "#6a4c3e", "#aa8a78");
  ctx.save();
  ctx.translate(x, y);
  for (const side of [-1, 1]) {
    const wing = new Path2D();
    const tipX = side * W * 0.5;
    const tipY = -flap * W * 0.18 - W * 0.02;
    wing.moveTo(side * W * 0.04, -W * 0.02);
    wing.quadraticCurveTo(side * W * 0.25, tipY - W * 0.06, tipX, tipY);
    wing.quadraticCurveTo(side * W * 0.28, tipY + W * 0.06, side * W * 0.12, W * 0.06);
    wing.quadraticCurveTo(side * W * 0.05, W * 0.05, side * W * 0.02, W * 0.04);
    wing.closePath();
    toon(ctx, wing, p, W * 0.01);
  }
  const body = new Path2D();
  body.ellipse(0, 0.01 * W, W * 0.05, W * 0.03, 0, 0, TAU);
  toon(ctx, body, p, W * 0.006);
  // Boyun ve baş: uçuş yönüne, sağa uzanır.
  ctx.strokeStyle = p.base;
  ctx.lineWidth = Math.max(1, W * (giant ? 0.02 : 0.015));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(W * 0.04, 0);
  ctx.lineTo(W * (giant ? 0.18 : 0.1), -W * 0.03);
  ctx.stroke();
  const hx = W * (giant ? 0.18 : 0.1);
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.moveTo(hx - W * 0.01, -W * 0.05);
  ctx.lineTo(hx + W * (giant ? 0.14 : 0.07), -W * 0.03);
  ctx.lineTo(hx - W * 0.01, -W * 0.015);
  ctx.fill();
  if (giant) {
    ctx.fillStyle = "#e0703a";
    ctx.beginPath();
    ctx.moveTo(hx - W * 0.01, -W * 0.05);
    ctx.lineTo(hx - W * 0.04, -W * 0.1);
    ctx.lineTo(hx + W * 0.03, -W * 0.045);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- Çarpışma: uzaydan ---------- */

type P3 = { x: number; y: number; z: number };
function onSphere(lon: number, lat: number, lon0: number, lat0: number): P3 {
  const la = (lat * Math.PI) / 180;
  const lo = ((lon - lon0) * Math.PI) / 180;
  const c0 = (lat0 * Math.PI) / 180;
  const x = Math.cos(la) * Math.sin(lo);
  const y0 = Math.sin(la);
  const z0 = Math.cos(la) * Math.cos(lo);
  return {
    x,
    y: -(y0 * Math.cos(c0) - z0 * Math.sin(c0)),
    z: y0 * Math.sin(c0) + z0 * Math.cos(c0),
  };
}

// Kıtalar, 66 milyon yıl önceye yakın: iki Amerika arasında henüz kara köprüsü yok.
const LANDS: [number, number][][] = [
  [
    [-165, 64],
    [-140, 69],
    [-110, 71],
    [-85, 69],
    [-75, 61],
    [-62, 54],
    [-66, 45],
    [-75, 38],
    [-80, 31],
    [-81, 26],
    [-86, 30],
    [-94, 29],
    [-97, 25],
    [-97, 20],
    [-91, 22],
    [-87, 21.5],
    [-88, 17],
    [-93, 15],
    [-104, 19],
    [-110, 24],
    [-116, 31],
    [-121, 35],
    [-124, 42],
    [-125, 49],
    [-134, 57],
    [-150, 60],
  ],
  [
    [-78, 8],
    [-72, 11],
    [-62, 10],
    [-50, 1],
    [-36, -6],
    [-39, -20],
    [-47, -27],
    [-57, -37],
    [-64, -45],
    [-68, -54],
    [-74, -49],
    [-72, -34],
    [-71, -18],
    [-78, -6],
    [-80, 0],
  ],
  [
    [-17, 21],
    [-10, 30],
    [-6, 36],
    [10, 37],
    [20, 32],
    [32, 31],
    [35, 27],
    [43, 12],
    [51, 11],
    [41, -2],
    [40, -15],
    [34, -25],
    [27, -34],
    [18, -34],
    [12, -18],
    [9, -2],
    [7, 4],
    [-8, 5],
    [-17, 14],
  ],
  [
    [-10, 37],
    [-9, 43],
    [-3, 48],
    [2, 51],
    [8, 55],
    [14, 57],
    [26, 61],
    [32, 69],
    [44, 68],
    [42, 45],
    [28, 41],
    [20, 40],
    [12, 44],
    [4, 43],
  ],
  [
    [-52, 60],
    [-42, 62],
    [-22, 70],
    [-20, 80],
    [-58, 82],
    [-70, 77],
    [-58, 68],
  ],
];
const HIT = { lon: -89.5, lat: 21.3 };

function impactGeo(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    cx: f.w * (wide ? 0.6 : 0.5),
    cy: f.h * (wide ? 0.46 : 0.44),
    R: wide ? f.h * 0.3 : f.w * 0.36,
  };
}

function impact(f: SceneFrame, into: number) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const { cx, cy, R } = impactGeo(f);
  const hitT = b1 + 2;
  const lon0 = -72 + (t - b1) * 1.5;
  const lat0 = 18;
  const flash = Math.exp(-(((t - hitT) / 0.25) ** 2));
  const shake = Math.exp(-(((t - hitT - 0.1) / 0.4) ** 2));
  const cam: Cam = {
    x: Math.sin(t * 55) * 0.005 * shake,
    y: Math.cos(t * 47) * 0.005 * shake,
    z: 1.35 - 0.35 * ease.out(into) + 0.04 * phase(t, hitT + 1, b2),
  };

  const bg = layer(
    f,
    "dino-uzay",
    spaceLayer(
      hex("070a1c"),
      hex("140a20"),
      [
        [0.2, 0.2, 0.4, hex("3a4aa0"), 0.2],
        [0.85, 0.75, 0.4, hex("8a3a60"), 0.18],
      ],
      9,
    ),
    0.06,
  );
  drawLayer(f, bg, 0.06, 0, 0);
  twinkles(f, 9, 14);

  ctx.save();
  applyCam(f, cam);
  const dust = phase(t, hitT + 1.2, b2 - 0.2);
  const fires = phase(t, hitT + 0.4, hitT + 3);
  planet(ctx, cx, cy, R, {
    base: mix(hex("2f6fb8"), hex("4a3a36"), dust * 0.6),
    shade: hex("060818"),
    rim: hex("cfe8ff"),
    atmo: mix(hex("7fc0ff"), hex("a07050"), dust),
    atmoAlpha: 0.55,
    night: 0.82,
    detail: (g) => {
      for (const poly of LANDS) {
        const pts = poly.map(([lo, la]) => onSphere(lo, la, lon0, lat0));
        if (pts.every((p) => p.z < 0)) continue;
        g.fillStyle = rgba(mix(hex("6f9a5a"), hex("4a3a32"), dust * 0.7));
        g.beginPath();
        curve(
          g,
          pts.map(
            (p) =>
              [
                cx + p.x * R * (p.z < 0 ? 1 / Math.hypot(p.x, p.y) : 1),
                cy + p.y * R * (p.z < 0 ? 1 / Math.hypot(p.x, p.y) : 1),
              ] as Pt,
          ),
          true,
        );
        g.fill();
      }
      // Yucatán'ın sığ karbonat şelfi: açık turkuaz.
      const yc = onSphere(-89, 20.5, lon0, lat0);
      g.fillStyle = "rgba(120,220,230,0.55)";
      g.beginPath();
      g.ellipse(cx + yc.x * R, cy + yc.y * R, R * 0.07, R * 0.05, 0, 0, TAU);
      g.fill();
      // Bulutlar.
      for (let i = 0; i < 14; i++) {
        const c = onSphere(-140 + hash(i * 3.3) * 160, -40 + hash(i * 5.1) * 90, lon0, lat0);
        if (c.z < 0.1) continue;
        g.fillStyle = `rgba(255,255,255,${0.55 * (1 - dust)})`;
        g.beginPath();
        g.ellipse(
          cx + c.x * R,
          cy + c.y * R,
          R * 0.12 * c.z,
          R * 0.035,
          (hash(i) - 0.5) * 0.5,
          0,
          TAU,
        );
        g.fill();
      }
      // Çarpışmadan yayılan ateş: yeryüzüne geri düşen akkor parçalar, orman yangınları.
      if (fires > 0) {
        for (let i = 0; i < 260; i++) {
          const a = hash(i * 1.7) * TAU;
          const d = (5 + hash(i * 2.9) * 70) * fires;
          const lo = HIT.lon + Math.cos(a) * d;
          const la = Math.max(-80, Math.min(80, HIT.lat + Math.sin(a) * d * 0.6));
          const p = onSphere(lo, la, lon0, lat0);
          if (p.z < 0.05) continue;
          const flick = 0.6 + 0.4 * Math.sin(t * 7 + i);
          g.fillStyle = `rgba(255,${140 + ((i * 7) % 80)},60,${0.8 * flick * (1 - dust * 0.5)})`;
          g.beginPath();
          g.arc(cx + p.x * R, cy + p.y * R, Math.max(0.8, 1.6 * s * p.z), 0, TAU);
          g.fill();
        }
      }
      // Toz örtüsü: çarpışma noktasından yayılıp gezegeni karartır.
      if (dust > 0) {
        const hp = onSphere(HIT.lon, HIT.lat, lon0, lat0);
        const gr = g.createRadialGradient(
          cx + hp.x * R,
          cy + hp.y * R,
          0,
          cx + hp.x * R,
          cy + hp.y * R,
          R * (0.3 + dust * 2),
        );
        gr.addColorStop(0, `rgba(70,50,40,${0.85 * dust})`);
        gr.addColorStop(0.6, `rgba(80,60,50,${0.7 * dust})`);
        gr.addColorStop(1, "rgba(80,60,50,0)");
        g.fillStyle = gr;
        g.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
    },
  });
  const hp = onSphere(HIT.lon, HIT.lat, lon0, lat0);
  const hx = cx + hp.x * R;
  const hy = cy + hp.y * R;
  // Göktaşı: sağ üstten, arkasında ışıklı bir iz bırakarak gelir.
  if (t < hitT) {
    const k = ease.in(phase(t, b1 + 0.4, hitT, (x) => x));
    const sx = hx + R * 1.6 * (1 - k);
    const sy = hy - R * 1.3 * (1 - k);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const tail = ctx.createLinearGradient(sx, sy, sx + R * 0.5, sy - R * 0.4);
    tail.addColorStop(0, "rgba(255,230,190,0.9)");
    tail.addColorStop(1, "rgba(255,150,90,0)");
    ctx.strokeStyle = tail;
    ctx.lineWidth = (2 + k * 5) * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + R * 0.5, sy - R * 0.4);
    ctx.stroke();
    drawGlow(ctx, sx, sy, (10 + k * 30) * s, hex("fff0d0"), 0.9);
    ctx.restore();
    ctx.fillStyle = "#6a5a50";
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5 * s, 0, TAU);
    ctx.fill();
  }
  // Işık, şok halkası ve atmosferin dışına fırlayan ejekta perdesi.
  if (t >= hitT - 0.05) {
    const e = phase(t, hitT, hitT + 2.6, ease.out);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlow(ctx, hx, hy, R * (0.2 + 1.6 * flash), hex("fff4d8"), 0.9 * flash + 0.2 * (1 - e));
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.25, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = `rgba(255,230,190,${0.85 * (1 - e)})`;
    ctx.lineWidth = Math.max(1, 3 * s * (1 - e));
    ctx.beginPath();
    ctx.ellipse(
      hx,
      hy,
      R * 0.9 * e,
      R * 0.9 * e * Math.max(0.3, hp.z),
      Math.atan2(hp.y, hp.x),
      0,
      TAU,
    );
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = Math.atan2(hy - cy, hx - cx) + (hash(i * 3.1) - 0.5) * 2.2;
      const d = R * (0.05 + e * (0.35 + hash(i) * 0.4));
      const px = hx + Math.cos(a) * d;
      const py = hy + Math.sin(a) * d;
      drawGlow(ctx, px, py, (6 + e * 16) * s, hex("ff9a50"), 0.5 * (1 - e));
    }
    ctx.restore();
  }
  ctx.restore();
  if (flash > 0.02) {
    ctx.fillStyle = `rgba(255,246,226,${0.5 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Etiketler ve kartlar.
  const P = (x: number, y: number) => project(f, cam, x, y);
  const [lx, ly] = P(hx, hy);
  callout(
    f,
    lx,
    ly,
    "Chicxulub, Yucatán",
    phase(t, hitT + 0.5, hitT + 1.2) * (1 - phase(t, b2 - 0.8, b2 - 0.4)),
    -1,
    "krater ~180 km",
  );
  scaleCard(f, pop(t, b1 + 0.8, 0.6, hitT + 0.9, 0.4));
  iridium(f, pop(t, hitT + 2, 0.6, b2 - 0.5, 0.4), phase(t, hitT + 2.3, hitT + 3.2));
  badge(
    f,
    w / 2,
    h * (w > h ? 0.13 : 0.1),
    "Toz güneşi karartır; besin zinciri çöker",
    phase(t, hitT + 3, hitT + 3.6) * (1 - phase(t, b2 - 0.6, b2 - 0.2)),
  );
}

/** Ölçek kartı: 10 kilometrelik göktaşı ile Everest yan yana. */
function scaleCard(f: SceneFrame, k: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 240 * s);
  const ch = 132 * s;
  const x = wide ? w * 0.06 : (w - cw) / 2;
  const y = wide ? h * 0.22 : h * 0.78;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,10,26,0.84)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("~10 km genişliğinde", 14 * s, 20 * s);
  const base = ch - 22 * s;
  const unit = (ch - 58 * s) / 10;
  // Everest: 8,8 km.
  ctx.fillStyle = "#8a9ab8";
  ctx.beginPath();
  ctx.moveTo(26 * s, base);
  ctx.lineTo(70 * s, base - 8.8 * unit);
  ctx.lineTo(84 * s, base - 7 * unit);
  ctx.lineTo(118 * s, base);
  ctx.fill();
  ctx.fillStyle = "#f2f4f8";
  ctx.beginPath();
  ctx.moveTo(62 * s, base - 7.2 * unit);
  ctx.lineTo(70 * s, base - 8.8 * unit);
  ctx.lineTo(78 * s, base - 7.6 * unit);
  ctx.fill();
  // Göktaşı: 10 km çapında.
  const r = 5 * unit;
  ctx.fillStyle = "#7a6a60";
  ctx.beginPath();
  ctx.arc(cw - 26 * s - r, base - r, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(cw - 26 * s - r * 1.3, base - r * 1.3, r * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(10 * s, base);
  ctx.lineTo(cw - 10 * s, base);
  ctx.stroke();
  ctx.fillStyle = "rgba(215,208,196,0.92)";
  ctx.font = `500 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Everest 8,8 km", 72 * s, base + 12 * s);
  ctx.fillText("göktaşı", cw - 26 * s - r, base + 12 * s);
  ctx.restore();
}

/** İridyum tabakası: bütün dünyada aynı anı işaretleyen ince kil. */
function iridium(f: SceneFrame, k: number, reveal: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 250 * s);
  const ch = 150 * s;
  const x = wide ? w * 0.06 : (w - cw) / 2;
  const y = wide ? h * 0.22 : h * 0.76;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,10,26,0.84)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("K–Pg sınırı", 14 * s, 20 * s);
  const bands: [string, number][] = [
    ["#c9b08a", 18],
    ["#b89a74", 16],
    ["#2a2224", 5],
    ["#a88a6a", 16],
    ["#c4a882", 18],
  ];
  let yy = 36 * s;
  for (const [c, bh] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(14 * s, yy, cw * 0.45, bh * s);
    yy += bh * s;
  }
  const line = 36 * s + 34 * s + 2.5 * s;
  ctx.strokeStyle = `rgba(255,214,122,${reveal})`;
  ctx.lineWidth = Math.max(1, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(14 * s + cw * 0.45, line);
  ctx.lineTo(14 * s + cw * 0.45 + 16 * s * reveal, line);
  ctx.stroke();
  ctx.globalAlpha *= reveal;
  ctx.fillStyle = "rgba(255,214,122,1)";
  ctx.font = `600 ${Math.round(Math.max(10.5, 12 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("iridyum", cw * 0.45 + 34 * s, line - 8 * s);
  ctx.fillStyle = "rgba(215,208,196,0.92)";
  ctx.font = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("ince kil, her kıtada", cw * 0.45 + 34 * s, line + 8 * s);
  ctx.fillText("aynı anın izi", cw * 0.45 + 34 * s, line + 22 * s);
  ctx.restore();
}

/* ---------- Sonrası ---------- */

function aftermath(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, , b2] = beats;
  const u = t - b2;
  const G = geo(f);
  const clear = phase(u, 2.5, 6.5);
  const cam: Cam = camera(t, [
    [b2 - 0.3, 0, 0.02, 1.12],
    [f.dur, 0.02, 0, 1],
  ]);

  // Tozlu, kızıl gök; zamanla hafifçe aydınlanır.
  const sky = ctx.createLinearGradient(0, 0, 0, G.horizon);
  sky.addColorStop(0, rgba(mix(hex("1c1618"), hex("3c4a6a"), clear)));
  sky.addColorStop(0.7, rgba(mix(hex("4a3024"), hex("a07a5a"), clear)));
  sky.addColorStop(1, rgba(mix(hex("6a4230"), hex("d8b080"), clear)));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.7;
  const sunY = h * 0.22;
  drawGlow(ctx, sunX, sunY, h * 0.25, mix(hex("a04a2a"), hex("ffd08a"), clear), 0.5);
  ctx.fillStyle = rgba(mix(hex("c05a30"), hex("fff0c8"), clear), 0.8);
  ctx.beginPath();
  ctx.arc(sunX, sunY, Math.min(w, h) * 0.045, 0, TAU);
  ctx.fill();

  ctx.save();
  applyCam(f, cam);
  // Yanık zemin ve kararmış ağaç gövdeleri.
  const gg = ctx.createLinearGradient(0, G.horizon, 0, h);
  gg.addColorStop(0, "#3a2c26");
  gg.addColorStop(1, "#1a1412");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.moveTo(-0.1 * w, G.horizon + 0.02 * h);
  for (let i = 0; i <= 20; i++) {
    ctx.lineTo(-0.1 * w + (1.2 * w * i) / 20, G.horizon + 0.02 * h - Math.sin(i * 0.9) * 0.01 * h);
  }
  ctx.lineTo(1.1 * w, h * 1.1);
  ctx.lineTo(-0.1 * w, h * 1.1);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const x = w * (0.04 + i * 0.12 + hash(i * 2.7) * 0.04);
    const y = G.mid + hash(i) * 0.04 * h;
    snag(ctx, x, y, (0.12 + hash(i * 3.1) * 0.14) * G.u, i);
  }
  // Devrilmiş bir kütük ve bir Triceratops kafatası.
  ctx.fillStyle = "#241a16";
  ctx.beginPath();
  ctx.ellipse(w * 0.44, G.front, w * 0.12, 0.018 * h, -0.05, 0, TAU);
  ctx.fill();
  skull(ctx, w * (G.wide ? 0.66 : 0.6), G.front + 0.02 * h, 0.14 * G.u);

  // Eğrelti artışı: yıkımdan sonra ilk dönen bitkiler.
  for (let i = 0; i < 16; i++) {
    const x = w * (0.08 + (i / 15) * 0.9) + hash(i * 3.3) * 20 * s;
    const y = G.mid + (0.02 + hash(i * 1.9) * 0.12) * h;
    const k = pop(u, 0.6 + hash(i * 7.1) * 1.6, 0.9);
    if (k <= 0.01) continue;
    fern(ctx, x, y, (0.05 + hash(i) * 0.05) * G.u * k, t, i, pal("#6ac06a", "#4a9a52", "#9ae08a"));
  }
  // Yerde yaşayan kuş ve yuvasından çıkan memeliler.
  const birdX = w * (G.wide ? 0.82 : 0.78) - Math.max(0, u - 1.2) * 10 * s;
  bird(ctx, birdX, G.front + 0.01 * h, 0.07 * G.u, t, pop(u, 1.2, 0.6));
  for (const [mx, my, at, dir] of [
    [0.55, 0.03, 2.4, 1],
    [0.9, 0.06, 3, -1],
    [0.74, 0.1, 3.6, 1],
  ] as [number, number, number, number][]) {
    const k = phase(u, at, at + 0.6);
    if (k <= 0.01) continue;
    const run = Math.max(0, u - at) * 18 * s * dir;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = "#120c0a";
    ctx.beginPath();
    ctx.ellipse(w * mx, G.front + my * h + 2 * s, 0.03 * G.u, 0.01 * G.u, 0, 0, TAU);
    ctx.fill();
    mammal(ctx, w * mx + run, G.front + my * h, 0.045 * G.u, t + at, dir);
    ctx.restore();
  }
  ctx.restore();

  // Düşen kül.
  ctx.fillStyle = `rgba(200,180,170,${0.5 * (1 - clear * 0.7)})`;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = wrap(hash(i * 2.3) * w + Math.sin(t * 0.5 + i) * 12 * s, w);
    const y = wrap(hash(i * 4.1) * h + t * (10 + hash(i) * 14) * s, h);
    const r = (0.8 + hash(i * 1.3) * 1.6) * s;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();

  const P = (x: number, y: number) => project(f, cam, x, y);
  {
    const [ax, ay] = P(w * (G.wide ? 0.3 : 0.2), G.mid + 0.05 * h);
    callout(f, ax, ay, "Eğrelti artışı", phase(u, 1, 1.7), 1, "yıkımdan sonra ilk dönen bitkiler");
  }
  {
    const [ax, ay] = P(birdX, G.front - 0.05 * G.u);
    callout(f, ax, ay, "Kuşlar", phase(u, 1.8, 2.5), -1, "dinozorların yaşayan kolu");
  }
  {
    const [ax, ay] = P(w * 0.55 + Math.max(0, u - 2.4) * 18 * s, G.front + 0.02 * h);
    callout(f, ax, ay, "Memeliler", phase(u, 3, 3.7), -1, "boşalan nişlere yayılır");
  }
  badge(f, w / 2, h * (G.wide ? 0.13 : 0.1), "Türlerin ~%75’i yok oldu", phase(u, 0.5, 1.1));
}

function snag(ctx: Ctx, x: number, y: number, H: number, seed: number) {
  ctx.strokeStyle = "#1a1210";
  ctx.lineCap = "round";
  ctx.lineWidth = H * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (hash(seed) - 0.5) * H * 0.1, y - H);
  ctx.stroke();
  ctx.lineWidth = H * 0.03;
  for (let k = 0; k < 3; k++) {
    const v = 0.45 + k * 0.18;
    const side = k % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y - H * v);
    ctx.lineTo(x + side * H * (0.14 + hash(seed + k) * 0.1), y - H * (v + 0.12));
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,120,60,0.5)";
  ctx.beginPath();
  ctx.arc(x, y - H * (0.3 + hash(seed * 3) * 0.3), H * 0.015, 0, TAU);
  ctx.fill();
}

function skull(ctx: Ctx, x: number, y: number, L: number) {
  const p = pal("#d8ccb4", "#a89a82", "#f0e8d6");
  const frill = new Path2D();
  frill.moveTo(x - L * 0.1, y);
  frill.quadraticCurveTo(x - L * 0.6, y - L * 0.5, x - L * 0.2, y - L * 0.75);
  frill.quadraticCurveTo(x + L * 0.05, y - L * 0.5, x + L * 0.05, y - L * 0.1);
  frill.closePath();
  toon(ctx, frill, p, L * 0.02);
  ctx.fillStyle = "rgba(60,50,40,0.6)";
  ctx.beginPath();
  ctx.ellipse(x - L * 0.25, y - L * 0.4, L * 0.08, L * 0.12, 0.4, 0, TAU);
  ctx.fill();
  const face = new Path2D();
  face.moveTo(x - L * 0.05, y);
  face.lineTo(x + L * 0.1, y - L * 0.25);
  face.quadraticCurveTo(x + L * 0.35, y - L * 0.25, x + L * 0.5, y - L * 0.05);
  face.lineTo(x + L * 0.4, y);
  face.closePath();
  toon(ctx, face, p, L * 0.015);
  ctx.fillStyle = "#3a2e26";
  ctx.beginPath();
  ctx.arc(x + L * 0.15, y - L * 0.14, L * 0.04, 0, TAU);
  ctx.fill();
  ctx.fillStyle = p.light;
  for (const [bx, by, tx, ty] of [
    [0.12, -0.22, 0.45, -0.5],
    [0.36, -0.18, 0.42, -0.3],
  ] as [number, number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x + bx * L - L * 0.03, y + by * L);
    ctx.quadraticCurveTo(
      x + (bx + tx) * 0.5 * L,
      y + (by + ty) * 0.5 * L - L * 0.04,
      x + tx * L,
      y + ty * L,
    );
    ctx.lineTo(x + bx * L + L * 0.03, y + by * L);
    ctx.fill();
  }
}

/** Yerde yaşayan küçük kuş: ağaçlar yandı, yerde beslenen kuşlar hayatta kaldı. */
function bird(ctx: Ctx, x: number, y: number, L: number, t: number, k: number) {
  if (k <= 0.01) return;
  const peck = Math.max(0, Math.sin(t * 3)) ** 3;
  const p = pal("#8a7a6a", "#6a5a4c", "#b0a08e");
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-k, k);
  ctx.strokeStyle = "#d8a050";
  ctx.lineWidth = Math.max(1, L * 0.05);
  ctx.beginPath();
  ctx.moveTo(-0.05 * L, -0.3 * L);
  ctx.lineTo(-0.08 * L, 0);
  ctx.moveTo(0.08 * L, -0.3 * L);
  ctx.lineTo(0.1 * L, 0);
  ctx.stroke();
  const body = new Path2D();
  body.ellipse(0, -0.45 * L, 0.32 * L, 0.2 * L, -0.2, 0, TAU);
  toon(ctx, body, p, 0.03 * L);
  ctx.fillStyle = p.dark;
  ctx.beginPath();
  ctx.moveTo(-0.25 * L, -0.5 * L);
  ctx.lineTo(-0.55 * L, -0.62 * L);
  ctx.lineTo(-0.3 * L, -0.4 * L);
  ctx.fill();
  const hx = 0.28 * L;
  const hy = -0.62 * L + peck * 0.3 * L;
  const headP = new Path2D();
  headP.arc(hx, hy, 0.12 * L, 0, TAU);
  toon(ctx, headP, p, 0.015 * L);
  ctx.fillStyle = "#e0a040";
  ctx.beginPath();
  ctx.moveTo(hx + 0.1 * L, hy - 0.03 * L);
  ctx.lineTo(hx + 0.26 * L, hy + 0.02 * L + peck * 0.05 * L);
  ctx.lineTo(hx + 0.1 * L, hy + 0.04 * L);
  ctx.fill();
  ctx.fillStyle = "#141010";
  ctx.beginPath();
  ctx.arc(hx + 0.04 * L, hy - 0.03 * L, Math.max(0.8, 0.025 * L), 0, TAU);
  ctx.fill();
  ctx.restore();
}
