import { callout, hash, roundRect, type Ctx, type SceneFrame } from "@/film/scenes/kit";
import {
  blob,
  curve,
  drawBalls,
  drawGlow,
  drawLayer,
  ease,
  hex,
  layer,
  mix,
  phase,
  planet,
  pop,
  rgba,
  sheet,
  spaceLayer,
  sparkle,
  wave,
  type RGB,
} from "@/film/scenes/art";

/**
 * Güneş doğuyor. Genç yıldızların ışığıyla kenarları parlayan toz sütunlarının ucundaki yoğun
 * bir çekirdeğe dalarız: dönen bulut içten dışa çöker ve yassılaşır; ortada kızıl bir ön-yıldız,
 * kutuplarından fışkıran jetler. Çekirdek ~10 milyon K'e ısınınca hidrojen füzyonu başlar
 * (büyüteç: 4 H → He). Diskte halkalar ve boşluklar açılır, kar çizgisi kayayı buzdan ayırır;
 * toz çakıla, çakıl gezegenimsilere, onlar da gezegenlere dönüşür. Dünya iç bölgede büyür.
 */
export function solar(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [b0, b1, b2] = beats;
  const G = geo(f);
  const T0 = b0 + 1.2;
  const S =
    0.3 + 0.7 * ease.inOut(phase(t, T0, T0 + 4.2)) + 0.2 * ease.inOut(phase(t, b2 + 2.5, b2 + 5.5));
  const tilt = 0.3 + 0.16 * ease.inOut(phase(t, b1 + 2, b2 + 0.5));
  const V: View = { ...G, S, tilt, tz: Math.sqrt(1 - tilt * tilt), T0 };
  const clear = phase(t, b2 + 2, b2 + 5.5);

  const bg = layer(
    f,
    "solar-space",
    spaceLayer(
      hex("08071a"),
      hex("140818"),
      [
        [0.8, 0.15, 0.45, hex("2f7fa8"), 0.2],
        [0.3, 0.7, 0.5, hex("8a3a7a"), 0.2],
        [0.6, 0.45, 0.35, hex("ff9a6a"), 0.12],
      ],
      9,
    ),
  );
  drawLayer(f, bg);
  nebula(f, G);

  gasDisk(f, V, clear);
  const back: number[][] = [[], [], []];
  const front: number[][] = [[], [], []];
  const vis = dust(f, V, back, front) * (1 - 0.85 * clear);
  drawDust(ctx, back, vis);
  jets(f, V);
  star(f, V);
  drawDust(ctx, front, vis);
  snowLine(f, V);
  bodies(f, V);
  fusion(f, V);
  growthCard(f);
  labels(f, V);
}

const TAU = Math.PI * 2;
const lin = (x: number) => x;
const DUST = 1300;
/** Kar çizgisi: içeride kaya ve metal, dışarıda buz (disk yarıçapı cinsinden). */
const SNOW = 0.46;
/** ALMA'nın gördüğü boşluklar: [yarıçap, genişlik]. */
const GAPS: [number, number][] = [
  [0.31, 0.03],
  [0.52, 0.035],
  [0.63, 0.05],
  [0.75, 0.035],
  [0.85, 0.05],
  [0.96, 0.03],
];
const RINGS = [0.2, 0.26, 0.4, 0.57, 0.69, 0.8, 0.905, 1.02];
const PROTON: [RGB, RGB, RGB] = [hex("ff7a52"), hex("b83a2e"), hex("ffd2b8")];
const NEUTRON: [RGB, RGB, RGB] = [hex("9fb0cc"), hex("566580"), hex("e6eefc")];

type Geo = ReturnType<typeof geo>;
type View = Geo & { S: number; tilt: number; tz: number; T0: number };

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    wide,
    cx: f.w * (wide ? 0.6 : 0.5),
    cy: f.h * (wide ? 0.47 : 0.43),
    R: wide ? Math.min(f.w * 0.36, f.h * 0.8) : f.w * 0.46,
  };
}

/** Disk düzlemindeki (x, y) ve dikey z noktasını ekrana taşır. */
function proj(V: View, x: number, y: number, z: number): [number, number] {
  const k = V.R * V.S;
  return [V.cx + x * k, V.cy + (y * V.tilt - z * V.tz) * k];
}

/** Kepler: iç yörüngeler daha hızlı döner. */
const kepler = (r: number, k = 0.08) => Math.min(1.2, k * Math.max(r, 0.05) ** -1.5);

/* ---------- Molekül bulutu ---------- */

/** Işıkla kenarları parlayan toz sütunları; en öndekinin ucundaki çekirdeğe dalınır. */
function nebula(f: SceneFrame, G: Geo) {
  const { ctx, w, h, t, s } = f;
  const [b0] = f.beats;
  const a = 1 - phase(t, b0 + 1.4, b0 + 2.3);
  if (a <= 0.01) return;
  const Z = 1 + 0.16 * phase(t, 0, b0 + 1, lin) + 6 * ease.in(phase(t, b0 + 1, b0 + 2.3, lin));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(G.cx, G.cy);
  ctx.scale(Z, Z);
  ctx.translate(-G.cx, -G.cy);
  sheet(f, "molekul-bulutu", -w * 0.06, -h * 0.06, w * 1.06, h * 1.06, (g) =>
    pillars(g, w, h, G.cx, G.cy, s),
  );
  ctx.restore();
  // Sütunun ucundaki yoğun çekirdek ısınır.
  const k = phase(t, 0.4, b0 + 1);
  drawGlow(ctx, G.cx, G.cy, (18 + 30 * k) * s * Z, hex("ffb07a"), 0.55 * k * a);
}

function pillars(g: Ctx, w: number, h: number, tx: number, ty: number, s: number) {
  const x0 = -w * 0.06;
  const y0 = -h * 0.06;
  const W = w * 1.12;
  const H = h * 1.12;
  const M = Math.max(w, h);
  const bg = g.createLinearGradient(0, y0, 0, y0 + H);
  bg.addColorStop(0, "#0b0a26");
  bg.addColorStop(1, "#1d0b22");
  g.fillStyle = bg;
  g.fillRect(x0, y0, W, H);
  drawGlow(g, w * 0.9, h * 0.02, M * 0.62, hex("2fb0bf"), 0.5);
  drawGlow(g, w * 0.5, h * 0.3, M * 0.45, hex("d0508e"), 0.4);
  drawGlow(g, w * 0.12, h * 0.62, M * 0.42, hex("6a3aa0"), 0.4);
  drawGlow(g, tx + w * 0.05, ty - h * 0.1, M * 0.24, hex("ffb07a"), 0.42);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(255,246,236,${0.2 + hash(i * 3.1) * 0.6})`;
    g.beginPath();
    g.arc(x0 + hash(i * 1.3) * W, y0 + hash(i * 2.9) * H, (0.5 + hash(i) * 1.1) * s, 0, TAU);
    g.fill();
  }
  // Katman katman gaz bulutları: uzakta pembe, ortada mor, sütunların arkasında şeftali.
  const banks: [string, number, number, number, number][] = [
    ["224,112,150", 0.2, 0.0, 0.45, 0.26],
    ["140,92,210", 0.16, 0.25, 0.7, 0.22],
    ["255,170,130", 0.14, 0.2, 0.5, 0.16],
  ];
  banks.forEach(([rgb, al, ya, yb, rad], layer) => {
    for (let j = 0; j < 7; j++) {
      const x = x0 + W * (j / 6) + (hash(layer * 31 + j) - 0.5) * w * 0.12;
      const y = h * (ya + (yb - ya) * hash(layer * 17 + j * 3));
      const r = M * rad * (0.7 + hash(layer * 7 + j) * 0.6);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},${al})`);
      gr.addColorStop(0.6, `rgba(${rgb},${al * 0.5})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      blob(g, x, y, r, layer * 13 + j, { n: 11, wobble: 0.14 });
      g.fill();
    }
  });
  // Işık kaynağı: sağ üstte sıcak, genç yıldızlar.
  for (let j = 0; j < 5; j++) {
    const x = w * (0.8 + hash(j * 4.1) * 0.18);
    const y = h * (0.03 + hash(j * 6.3) * 0.16);
    const r = (6 + hash(j) * 7) * s;
    drawGlow(g, x, y, r * 5, hex("bfe8ff"), 0.6);
    sparkle(g, x, y, r * 1.6, "rgba(235,248,255,0.95)");
  }
  const P: [number, number, number, number, number, number, number][] = [
    // taban x, taban genişliği, uç x, uç y, baş yarıçapı, tohum, uzaklık
    [tx - w * 0.31, w * 0.14, tx - w * 0.27, ty + h * 0.2, w * 0.032, 3, 1],
    [tx + w * 0.27, w * 0.12, tx + w * 0.24, ty + h * 0.3, w * 0.028, 7, 1],
    [tx + w * 0.02, w * 0.17, tx, ty, w * 0.038, 11, 0],
  ];
  for (const [bx, bw, px, py, hr, seed, far] of P) {
    // Işığın buharlaştırdığı uç: ışık kaynağına bakan yanda parlayan gaz.
    drawGlow(g, px + hr * 0.6, py - hr * 0.6, hr * 3.2, hex("ffc09a"), far ? 0.35 : 0.5);
    const path = pillarPath(bx, bw, px, py + hr * 0.5, hr, h * 1.08, seed);
    g.save();
    g.fillStyle = far ? "#d9806e" : "#ffb286";
    g.fill(path);
    g.clip(path);
    g.translate(-7 * s, 9 * s);
    g.fillStyle = far ? "#3d1b31" : "#2a0f22";
    g.fill(path);
    const body = g.createLinearGradient(0, py, 0, h);
    body.addColorStop(0, far ? "rgba(120,60,90,0.35)" : "rgba(150,64,84,0.42)");
    body.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = body;
    g.fill(path);
    // Sütunun içindeki yoğun, koyu topaklar.
    g.fillStyle = far ? "rgba(20,6,16,0.35)" : "rgba(16,4,12,0.4)";
    for (let j = 0; j < 4; j++) {
      blob(
        g,
        px + (hash(seed * 5 + j) - 0.5) * bw * 0.6,
        py + h * (0.12 + j * 0.16),
        bw * 0.16,
        seed + j,
        {
          n: 8,
          wobble: 0.3,
        },
      );
      g.fill();
    }
    g.restore();
  }
  // Önde koyu toz bulutları.
  g.fillStyle = "#120713";
  for (let j = 0; j < 6; j++) {
    blob(
      g,
      w * (j < 3 ? 0.05 + j * 0.1 : 0.75 + (j - 3) * 0.12),
      h * (1.02 + hash(j) * 0.04),
      (50 + hash(j * 3) * 50) * s,
      j + 20,
      {
        n: 9,
        wobble: 0.25,
      },
    );
    g.fill();
  }
}

function pillarPath(
  bx: number,
  bw: number,
  tx: number,
  ty: number,
  hr: number,
  H: number,
  seed: number,
) {
  const p = new Path2D();
  const pts: [number, number][] = [];
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const j = k > 0 && k < n ? (hash(seed + k) - 0.5) * bw * 0.25 * Math.sqrt(1 - u) : 0;
    pts.push([bx - bw / 2 + (tx - hr - (bx - bw / 2)) * u ** 0.9 + j, H + (ty - H) * u]);
  }
  for (let k = 1; k < 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    const q = 1 + (hash(seed * 3 + k) - 0.5) * 0.25;
    pts.push([tx + Math.cos(a) * hr * q, ty + Math.sin(a) * hr * 1.15 * q]);
  }
  for (let k = n; k >= 0; k--) {
    const u = k / n;
    const j = k > 0 && k < n ? (hash(seed * 7 + k) - 0.5) * bw * 0.25 * Math.sqrt(1 - u) : 0;
    pts.push([bx + bw / 2 + (tx + hr - (bx + bw / 2)) * u ** 0.9 + j, H + (ty - H) * u]);
  }
  curve(p, pts, true);
  return p;
}

/* ---------- Çöken bulut ve disk ---------- */

function gasDisk(f: SceneFrame, V: View, clear: number) {
  const { ctx, t } = f;
  const [b0, b1] = f.beats;
  const RR = V.R * V.S;
  const cloud = phase(t, b0 + 0.5, b0 + 1.5) * (1 - phase(t, V.T0 + 1.5, V.T0 + 4));
  if (cloud > 0.01) drawGlow(ctx, V.cx, V.cy, 2.7 * RR, hex("a0524a"), 0.45 * cloud);
  const k = phase(t, V.T0 + 1.2, V.T0 + 4) * (1 - 0.85 * clear);
  if (k <= 0.01) return;
  ctx.save();
  ctx.translate(V.cx, V.cy);
  ctx.scale(1, V.tilt);
  const g = ctx.createRadialGradient(0, 0, RR * 0.02, 0, 0, RR * 1.1);
  g.addColorStop(0, `rgba(255,236,190,${0.9 * k})`);
  g.addColorStop(0.12, `rgba(255,186,118,${0.62 * k})`);
  g.addColorStop(0.4, `rgba(222,120,92,${0.4 * k})`);
  g.addColorStop(0.75, `rgba(150,80,104,${0.24 * k})`);
  g.addColorStop(1, "rgba(90,50,90,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, RR * 1.1, 0, TAU);
  ctx.fill();
  // Dönüşü gösteren sarmal akıntılar.
  ctx.lineCap = "round";
  for (let j = 0; j < 3; j++) {
    ctx.strokeStyle = `rgba(255,214,170,${0.13 * k})`;
    ctx.lineWidth = RR * 0.035;
    ctx.beginPath();
    for (let q = 0; q <= 30; q++) {
      const r = 0.1 + 0.85 * (q / 30);
      const a = j * (TAU / 3) + Math.log(r) * 2.2 + t * 0.45;
      if (q) ctx.lineTo(Math.cos(a) * r * RR, Math.sin(a) * r * RR);
      else ctx.moveTo(Math.cos(a) * r * RR, Math.sin(a) * r * RR);
    }
    ctx.stroke();
  }
  // Halkalar ve boşluklar.
  const rings = phase(t, b1 + 1.8, b1 + 4);
  if (rings > 0.01) {
    for (const [r, wd] of GAPS) {
      ctx.strokeStyle = `rgba(16,6,18,${0.6 * rings * k})`;
      ctx.lineWidth = wd * RR;
      ctx.beginPath();
      ctx.arc(0, 0, r * RR, 0, TAU);
      ctx.stroke();
    }
    for (const r of RINGS) {
      ctx.strokeStyle = `rgba(255,200,150,${0.12 * rings * k})`;
      ctx.lineWidth = 0.022 * RR;
      ctx.beginPath();
      ctx.arc(0, 0, r * RR, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Toz: önce dönen bir küre; içten dışa çökerek yassı diske iner (açısal momentum korunur,
 * hızlanır). Sonra halkalarda toplanır; kar çizgisinin ötesindekiler buzla kaplanır.
 */
function dust(f: SceneFrame, V: View, back: number[][], front: number[][]) {
  const { t, s } = f;
  const [b0, b1] = f.beats;
  const vis = phase(t, b0 + 0.5, b0 + 1.5);
  if (vis <= 0.01) return 0;
  const rings = phase(t, b1 + 1.8, b1 + 4);
  const icy = phase(t, b1 + 3.4, b1 + 4.6);
  for (let i = 0; i < DUST; i++) {
    const r0 = 0.07 + 0.98 * hash(i * 1.9) ** 0.85;
    let ring = RINGS[0];
    for (const r of RINGS) if (Math.abs(r - r0) < Math.abs(ring - r0)) ring = r;
    const rr = r0 + rings * (ring - r0) * 0.75;
    const th = Math.acos(1 - 2 * hash(i * 2.3));
    const rc = 0.35 + r0 * 2.6;
    const st = V.T0 + (rc - 0.35) * 0.55;
    const k = ease.inOut(phase(t, st, st + 2.4, lin));
    const ph = hash(i * 7.7) * TAU + 0.12 * t + kepler(r0) * k * Math.max(0, t - st);
    const cyl = rc * Math.sin(th) * (1 - k) + rr * k;
    const z = rc * Math.cos(th) * (1 - k) + (hash(i * 3.1) - 0.5) * 0.05 * rr * k;
    const x = cyl * Math.cos(ph);
    const y = cyl * Math.sin(ph);
    const [px, py] = proj(V, x, y, z);
    const c = k < 0.5 ? 0 : rr > SNOW && icy > hash(i * 5.3) ? 2 : 1;
    (y * V.tz + z * V.tilt > 0 ? front : back)[c].push(px, py, (0.8 + hash(i * 4.1) * 0.9) * s);
  }
  return vis;
}

const DUST_COLS = ["rgba(214,140,128,A)", "rgba(255,200,146,A)", "rgba(196,222,255,A)"];

function drawDust(ctx: Ctx, buckets: number[][], a: number) {
  if (a <= 0.01) return;
  buckets.forEach((pts, c) => {
    if (!pts.length) return;
    ctx.fillStyle = DUST_COLS[c].replace("A", String(0.75 * a));
    ctx.beginPath();
    for (let k = 0; k < pts.length; k += 3) {
      ctx.moveTo(pts[k] + pts[k + 2], pts[k + 1]);
      ctx.arc(pts[k], pts[k + 1], pts[k + 2], 0, TAU);
    }
    ctx.fill();
  });
}

/** Kutup jetleri: diskin eksenince iki yana fışkıran madde, dışa koşan parlak düğümlerle. */
function jets(f: SceneFrame, V: View) {
  const { ctx, t, s } = f;
  const [, b1] = f.beats;
  const a = phase(t, V.T0 + 2, V.T0 + 3) * (1 - phase(t, b1 + 1.2, b1 + 2.6));
  if (a <= 0.01) return;
  const L = V.R * V.S * 0.55 * V.tz;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const dir of [-1, 1]) {
    const y1 = V.cy + dir * L;
    const g = ctx.createLinearGradient(V.cx, V.cy, V.cx, y1);
    g.addColorStop(0, `rgba(175,222,255,${0.8 * a})`);
    g.addColorStop(0.55, `rgba(120,170,255,${0.32 * a})`);
    g.addColorStop(1, "rgba(120,170,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(V.cx - 4 * s, V.cy);
    ctx.lineTo(V.cx - 24 * s, y1);
    ctx.lineTo(V.cx + 24 * s, y1);
    ctx.lineTo(V.cx + 4 * s, V.cy);
    ctx.closePath();
    ctx.fill();
    for (let j = 0; j < 5; j++) {
      const u = (t * 0.32 + j / 5) % 1;
      const x = V.cx + Math.sin(j * 2.1 + t * 1.3) * 2.5 * s * u;
      drawGlow(
        ctx,
        x,
        V.cy + dir * L * u,
        (6 + 9 * u) * s,
        hex("c4e4ff"),
        0.65 * a * Math.sin(Math.PI * u),
      );
    }
  }
  ctx.restore();
}

/** Önce kızıl bir ön-yıldız; füzyonla birlikte sarı-beyaz Güneş. */
function star(f: SceneFrame, V: View) {
  const { ctx, t, s } = f;
  const [, b1] = f.beats;
  const born = phase(t, V.T0 + 0.4, V.T0 + 2.2);
  if (born <= 0.01) return;
  const ig = phase(t, b1 + 0.6, b1 + 1.6);
  const flash = Math.exp(-(((t - b1 - 0.9) / 0.35) ** 2));
  const r = (8 + 6 * born + 4 * ig) * s;
  const hot = mix(hex("ff7a44"), hex("fff3cc"), ig);
  drawGlow(
    ctx,
    V.cx,
    V.cy,
    r * (7 + 6 * ig),
    mix(hex("ff5530"), hex("ffcf70"), ig),
    0.5 * born + 0.3 * ig,
  );
  drawGlow(ctx, V.cx, V.cy, r * 2.6, hot, 0.8 * born);
  if (ig > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,226,150,${0.16 * ig})`;
    ctx.beginPath();
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU + t * 0.08;
      const L = r * (3.2 + (j % 2) * 1.4);
      ctx.moveTo(V.cx + Math.cos(a - 0.06) * r, V.cy + Math.sin(a - 0.06) * r);
      ctx.lineTo(V.cx + Math.cos(a) * L, V.cy + Math.sin(a) * L);
      ctx.lineTo(V.cx + Math.cos(a + 0.06) * r, V.cy + Math.sin(a + 0.06) * r);
    }
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = rgba(mix(hex("ff8a4a"), hex("ffcf5a"), ig), born);
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(hot, born);
  ctx.beginPath();
  ctx.arc(V.cx - r * 0.12, V.cy - r * 0.12, r * 0.7, 0, TAU);
  ctx.fill();
  if (flash > 0.02) drawGlow(ctx, V.cx, V.cy, 280 * s * flash, hex("fff8e8"), 0.85 * flash);
}

function snowLine(f: SceneFrame, V: View) {
  const { ctx, t, s } = f;
  const [, b1, b2] = f.beats;
  const a = phase(t, b1 + 3.4, b1 + 4.4) * (1 - phase(t, b2 + 5, b2 + 6));
  if (a <= 0.01) return;
  const r = SNOW * V.R * V.S;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = "rgba(176,220,255,0.9)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.setLineDash([6 * s, 6 * s]);
  ctx.lineDashOffset = -t * 8 * s;
  ctx.beginPath();
  ctx.ellipse(V.cx, V.cy, r, r * V.tilt, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* ---------- Gezegenimsiler ve gezegenler ---------- */

/** [yörünge yarıçapı, boyut, büyüme başı, büyüme sonu (b2'ye göre)] */
const PL: [number, number, number, number][] = [
  [0.17, 3, 2, 4],
  [0.24, 4.6, 2.2, 4.6],
  [0.3, 5, 2.4, 5.4],
  [0.37, 3.8, 1.8, 3.8],
  [0.63, 15, 0.8, 3.2],
  [0.85, 12, 1.2, 3.6],
];
const EARTH = 2;
const JUPITER = 4;
const ROCKS = 110;

/** Gezegenlerin açısı `b2 + 4` anında: etiketler boş alanlara düşsün. */
const PA = [0.9, 3.6, 2.5, -1.2, -0.45, 3.3];

function planetAngle(f: SceneFrame, p: number) {
  return PA[p] + kepler(PL[p][0], 0.04) * (f.t - f.beats[2] - 4);
}

function planetPos(f: SceneFrame, V: View, p: number): [number, number] {
  const a = planetAngle(f, p);
  return proj(V, Math.cos(a) * PL[p][0], Math.sin(a) * PL[p][0], 0);
}

function bodies(f: SceneFrame, V: View) {
  const { ctx, t, s } = f;
  const [, , b2] = f.beats;
  if (t < b2 - 0.2) return;
  // Yörüngeler.
  const orb = phase(t, b2 + 3.6, b2 + 4.6);
  if (orb > 0.01) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,240,220,${0.16 * orb})`;
    ctx.lineWidth = Math.max(1, s);
    for (const [r] of PL) {
      ctx.beginPath();
      ctx.ellipse(V.cx, V.cy, r * V.R * V.S, r * V.R * V.S * V.tilt, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Gezegenimsiler: yörünge boyunca dağınık kayalar, gezegene doğru toplanır.
  const rocky: number[] = [];
  const icy: number[] = [];
  for (let i = 0; i < ROCKS; i++) {
    const p = Math.floor(hash(i * 2.7) * PL.length);
    const [pr, , g0, g1] = PL[p];
    const appear = pop(t, b2 + 0.1 + hash(i * 3.9) * 0.8, 0.5);
    const m = ease.in(phase(t, b2 + g0 + hash(i * 4.3) * 1.2, b2 + g1 - 0.2, lin));
    if (appear <= 0.01 || m >= 0.98) continue;
    const dr = (hash(i * 5.1) - 0.5) * (p >= JUPITER ? 0.16 : 0.08) * (1 - m);
    const da = (hash(i * 6.7) - 0.5) * 2.8 * (1 - m);
    const a = planetAngle(f, p) + da;
    const [x, y] = proj(V, Math.cos(a) * (pr + dr), Math.sin(a) * (pr + dr), 0);
    (pr > SNOW ? icy : rocky).push(x, y, (1.3 + hash(i * 7.3) * 1.3) * s * appear);
  }
  drawBalls(ctx, rocky, hex("a08470"), hex("5a4032"), hex("e2c8b0"));
  drawBalls(ctx, icy, hex("d4e4f4"), hex("7a90b0"), hex("ffffff"));
  // Asteroit kuşağı: gezegen olamayan artıklar.
  const belt = phase(t, b2 + 3.4, b2 + 4.4);
  if (belt > 0.01) {
    const pts: number[] = [];
    for (let i = 0; i < 90; i++) {
      const r = 0.43 + hash(i * 8.1) * 0.1;
      const a = hash(i * 9.3) * TAU + kepler(r, 0.04) * t;
      const [x, y] = proj(V, Math.cos(a) * r, Math.sin(a) * r, 0);
      pts.push(x, y, (0.8 + hash(i) * 0.8) * s * belt);
    }
    drawBalls(ctx, pts, hex("a89484"), hex("5a4a40"), hex("e8d8c8"));
  }
  // Gezegenler.
  PL.forEach(([, size, g0, g1], p) => {
    const k = ease.out(phase(t, b2 + g0, b2 + g1, lin));
    if (k <= 0.01) return;
    const [x, y] = planetPos(f, V, p);
    const r = size * s * k;
    if (p === JUPITER || p === JUPITER + 1) {
      planet(ctx, x, y, r, {
        base: p === JUPITER ? hex("d9b48a") : hex("e6cf98"),
        shade: hex("3a2418"),
        rim: hex("fff0d8"),
        detail: (g) => {
          for (let j = 0; j < 5; j++) {
            g.fillStyle = j % 2 ? "rgba(170,110,70,0.55)" : "rgba(255,236,200,0.35)";
            g.fillRect(x - r, y - r + (j + 0.6) * r * 0.36, r * 2, r * 0.16);
          }
        },
      });
    } else if (p === EARTH) {
      drawGlow(ctx, x, y, r * 3.2, hex("ff6a2a"), 0.55 * k);
      drawBalls(ctx, [x, y, r], hex("ff7a3a"), hex("8a2012"), hex("ffd08a"));
    } else {
      const base = [hex("a89c90"), hex("dca06a"), hex("ff7a3a"), hex("c4643e")][p];
      drawBalls(ctx, [x, y, r], base, mix(base, hex("200a08"), 0.6), mix(base, hex("ffffff"), 0.5));
    }
  });
}

/* ---------- Büyüteç: hidrojen füzyonu ---------- */

function fusion(f: SceneFrame, V: View) {
  const { ctx, w, h, t, s } = f;
  const [, b1] = f.beats;
  const k = pop(t, b1 - 0.4, 0.6, b1 + 3.1, 0.5);
  if (k <= 0.01) return;
  const L = V.wide
    ? { x: w * 0.22, y: h * 0.3, r: h * 0.16 }
    : { x: w * 0.26, y: h * 0.23, r: w * 0.19 };
  const R = L.r * k;
  const la = Math.min(1, k);
  ctx.save();
  ctx.globalAlpha = la;
  ctx.strokeStyle = "rgba(255,240,220,0.55)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  const ang = Math.atan2(V.cy - L.y, V.cx - L.x);
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const a = ang + d * 1.25;
    ctx.moveTo(V.cx, V.cy);
    ctx.lineTo(L.x + Math.cos(a) * L.r, L.y + Math.sin(a) * L.r);
  }
  ctx.stroke();
  ctx.restore();
  drawGlow(ctx, L.x, L.y, R * 1.45, hex("ffb070"), 0.3 * la);
  ctx.save();
  ctx.fillStyle = "#3b120c";
  ctx.beginPath();
  ctx.arc(L.x, L.y, R, 0, TAU);
  ctx.fill();
  ctx.clip();
  drawGlow(ctx, L.x, L.y, R * 1.2, hex("ff7a3a"), 0.45);
  const u = R / 100;
  const fuseAt = b1 + 0.9;
  if (t < fuseAt) {
    // Dört proton, ısının itişiyle birbirine yaklaşır.
    const q = ease.in(phase(t, b1 - 0.3, fuseAt, lin));
    const pts: number[] = [];
    for (let j = 0; j < 4; j++) {
      const a = (j * TAU) / 4 + 0.6 + t * 0.5 * (1 - q);
      const d = (66 - 54 * q) * u + Math.sin(t * 9 + j) * 3 * u * (1 - q);
      pts.push(L.x + Math.cos(a) * d, L.y + Math.sin(a) * d, 11 * u);
    }
    drawBalls(ctx, pts, ...PROTON);
  } else {
    // Helyum-4: iki proton, iki nötron; saçılan ışık ve nötrinolar.
    const e = ease.out(phase(t, fuseAt, fuseAt + 0.5, lin));
    const d = 7.5 * u * (0.6 + 0.4 * e);
    drawBalls(ctx, [L.x - d, L.y - d, 11 * u, L.x + d, L.y + d, 11 * u], ...NEUTRON);
    drawBalls(ctx, [L.x + d, L.y - d, 11 * u, L.x - d, L.y + d, 11 * u], ...PROTON);
    const pk = phase(t, fuseAt, fuseAt + 1.6, lin);
    if (pk < 1) {
      ctx.strokeStyle = `rgba(255,236,150,${1 - pk})`;
      ctx.lineWidth = Math.max(1.5, 3 * u);
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const a = -0.5 + j * 2.1;
        const r0 = (20 + pk * 70) * u;
        wave(
          ctx,
          L.x + Math.cos(a) * r0,
          L.y + Math.sin(a) * r0,
          L.x + Math.cos(a) * (r0 + 34 * u),
          L.y + Math.sin(a) * (r0 + 34 * u),
          5 * u,
          3,
          t * 14,
          true,
        );
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(210,240,255,${1 - pk})`;
      ctx.beginPath();
      for (const a of [1.2, 4.1]) {
        const r0 = (20 + pk * 120) * u;
        ctx.moveTo(L.x + Math.cos(a) * r0 + 3 * u, L.y + Math.sin(a) * r0);
        ctx.arc(L.x + Math.cos(a) * r0, L.y + Math.sin(a) * r0, 3 * u, 0, TAU);
      }
      ctx.fill();
    }
  }
  const flash = Math.exp(-(((t - fuseAt) / 0.18) ** 2));
  if (flash > 0.02) drawGlow(ctx, L.x, L.y, 70 * u, hex("fff6d8"), flash);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = la;
  ctx.strokeStyle = "rgba(255,236,210,0.9)";
  ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.beginPath();
  ctx.arc(L.x, L.y, R, 0, TAU);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6 * s;
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Hidrojen füzyonu: 4 H → He", L.x, L.y + L.r + 12 * s);
  ctx.fillStyle = "rgba(225,220,210,0.92)";
  ctx.font = `400 ${Math.round(Math.max(10.5, 12 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("kütlenin ~%0,7'si enerjiye dönüşür", L.x, L.y + L.r + 30 * s);
  ctx.restore();
}

/* ---------- Kart: tozdan gezegene ---------- */

function growthCard(f: SceneFrame) {
  const { ctx, w, h, t, s } = f;
  const [, , b2] = f.beats;
  const k = pop(t, b2 + 0.2, 0.6, b2 + 5.2, 0.5);
  if (k <= 0.01) return;
  const wide = w > h;
  const cw = Math.min(w * 0.92, 360 * s);
  const ch = 114 * s;
  const x = wide ? w * 0.04 : (w - cw) / 2;
  const y = wide ? h * 0.13 : h * 0.63;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(12,9,22,0.88)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Tozdan gezegene", 14 * s, 18 * s);
  const cells: [string, string][] = [
    ["toz", "mikron"],
    ["çakıl", "santimetre"],
    ["gezegenimsi", "kilometre"],
    ["gezegen", "binlerce km"],
  ];
  const cellW = (cw - 16 * s) / 4;
  cells.forEach(([name, size], j) => {
    const pk = pop(t, b2 + 0.6 + j * 0.6, 0.5);
    if (pk <= 0.01) return;
    const cx = 8 * s + cellW * (j + 0.5);
    const cy = 54 * s;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pk * 1.25, pk * 1.25);
    icon(ctx, j, s);
    ctx.restore();
    ctx.globalAlpha = Math.min(1, pk);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.font = `600 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(name, cx, 86 * s);
    ctx.fillStyle = "rgba(210,200,190,0.9)";
    ctx.font = `400 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
    ctx.fillText(size, cx, 101 * s);
    if (j > 0) {
      const ax = 8 * s + cellW * j;
      ctx.strokeStyle = "rgba(255,210,150,0.8)";
      ctx.lineWidth = Math.max(1, 1.6 * s);
      ctx.beginPath();
      ctx.moveTo(ax - 3 * s, cy - 5 * s);
      ctx.lineTo(ax + 2 * s, cy);
      ctx.lineTo(ax - 3 * s, cy + 5 * s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function icon(ctx: Ctx, j: number, s: number) {
  if (j === 0) {
    const pts: number[] = [];
    for (let q = 0; q < 7; q++)
      pts.push((hash(q * 3.1) - 0.5) * 16 * s, (hash(q * 5.7) - 0.5) * 12 * s, 1.4 * s);
    drawBalls(ctx, pts, hex("e0b890"), hex("8a6048"), hex("fff0e0"));
  } else if (j === 1) {
    ctx.fillStyle = "#8a6a56";
    blob(ctx, 0, 0, 6 * s, 4, { n: 7, wobble: 0.2, sy: 0.8 });
    ctx.fill();
    ctx.fillStyle = "rgba(255,230,200,0.5)";
    blob(ctx, -1.5 * s, -1.5 * s, 2.4 * s, 5, { n: 6, wobble: 0.2 });
    ctx.fill();
  } else if (j === 2) {
    ctx.fillStyle = "#7a6658";
    blob(ctx, 0, 0, 11 * s, 9, { n: 9, wobble: 0.22 });
    ctx.fill();
    ctx.fillStyle = "rgba(40,26,20,0.45)";
    for (const [cx, cy, r] of [
      [3, 2, 2.6],
      [-4, 3, 1.8],
      [-1, -4, 1.6],
    ]) {
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, r * s, 0, TAU);
      ctx.fill();
    }
  } else {
    drawGlow(ctx, 0, 0, 26 * s, hex("ff6a2a"), 0.5);
    drawBalls(ctx, [0, 0, 13 * s], hex("ff7a3a"), hex("8a2012"), hex("ffd08a"));
  }
}

/* ---------- Etiketler ---------- */

function labels(f: SceneFrame, V: View) {
  const { t, w, h, s } = f;
  const [b0, b1, b2] = f.beats;
  const RR = V.R * V.S;
  const wide = V.wide;
  callout(
    f,
    V.cx + w * (wide ? 0.035 : 0.06),
    V.cy + h * (wide ? 0.16 : 0.12),
    "Molekül bulutu",
    phase(t, b0 - 0.3, b0 + 0.3) * (1 - phase(t, b0 + 1, b0 + 1.4)),
    wide ? 1 : -1,
    "soğuk gaz ve toz, ~10 K",
  );
  const n = Math.round(1 + 9 * phase(t, b0 + 4.2, b1 - 0.5, lin));
  callout(
    f,
    V.cx + 7 * s,
    V.cy - 6 * s,
    "Ön-yıldız",
    phase(t, b0 + 3.8, b0 + 4.5) * (1 - phase(t, b1 - 0.6, b1 - 0.2)),
    wide ? 1 : -1,
    `çekirdek ~${n} milyon K`,
    wide ? 1.6 : 1,
  );
  callout(
    f,
    V.cx + (wide ? 0.5 : 0.3) * RR,
    V.cy + (wide ? 0.08 : 0.9) * RR * V.tilt,
    "Gaz ve toz diski",
    phase(t, b0 + 4.9, b0 + 5.6) * (1 - phase(t, b1 + 1, b1 + 1.4)),
    wide ? 1 : -1,
    "dönerek yassılaşır",
  );
  callout(
    f,
    V.cx + 3 * s,
    V.cy - RR * V.tz * 0.38,
    "Jet",
    phase(t, b0 + 4.3, b0 + 5) * (1 - phase(t, b1 - 0.6, b1 - 0.2)),
    -1,
    "kutuplardan fışkırır",
  );
  callout(
    f,
    V.cx - 0.8 * RR,
    V.cy - 0.25 * RR * V.tilt,
    "Halkalar ve boşluklar",
    wide
      ? phase(t, b1 + 4, b1 + 4.7) * (1 - phase(t, b2 + 0.2, b2 + 0.6))
      : phase(t, b1 + 3.6, b1 + 4.3) * (1 - phase(t, b1 + 5, b1 + 5.4)),
    wide ? -1 : 1,
    "ALMA genç disklerde gördü",
  );
  const sa = -0.9;
  callout(
    f,
    V.cx + Math.cos(sa) * SNOW * RR,
    V.cy + Math.sin(sa) * SNOW * RR * V.tilt,
    "Kar çizgisi",
    phase(t, wide ? b1 + 4.4 : b1 + 5.4, wide ? b1 + 5.1 : b1 + 6.1) *
      (1 - phase(t, b2 + 3.2, b2 + 3.6)),
    wide ? 1 : -1,
    "içeride kaya, dışarıda buz",
  );
  const [jx, jy] = planetPos(f, V, JUPITER);
  callout(
    f,
    jx,
    jy - 12 * s,
    "Jüpiter",
    phase(t, b2 + 3.2, b2 + 3.9),
    jx > w * 0.55 ? -1 : 1,
    "ilk büyüyen dev",
  );
  const [ex, ey] = planetPos(f, V, EARTH);
  callout(
    f,
    ex,
    ey - 4 * s,
    "Dünya",
    phase(t, b2 + 3.9, b2 + 4.6),
    ex > V.cx ? 1 : -1,
    "erimiş, hâlâ büyüyor",
  );
  const note = phase(t, b2 + 3.6, b2 + 4.4);
  if (note > 0.01) {
    const { ctx } = f;
    ctx.save();
    ctx.globalAlpha = note;
    ctx.fillStyle = "rgba(225,215,205,0.75)";
    ctx.font = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(
      "boyutlar ve uzaklıklar ölçekli değil",
      w - 16 * s,
      V.cy + 0.9 * RR * V.tilt + 24 * s,
    );
    ctx.restore();
  }
}
