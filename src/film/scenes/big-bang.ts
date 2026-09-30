import { badge, callout, hash, lerp, roundRect, wrap, type SceneFrame } from "@/film/scenes/kit";
import {
  applyCam,
  ballSprite,
  camera,
  drawBalls,
  drawGlow,
  drawSprite,
  ease,
  hex,
  mix,
  phase,
  pop,
  project,
  rgba,
  sparkle,
  wave,
  type Cam,
  type RGB,
} from "@/film/scenes/art";

/** Sıcaklık paleti: soğuk mor → pembe → turuncu → altın → krem beyaz. */
const HEAT: [number, RGB][] = [
  [0, hex("0d0620")],
  [0.25, hex("3a1466")],
  [0.45, hex("b8336a")],
  [0.65, hex("ff7a45")],
  [0.85, hex("ffc861")],
  [1, hex("fff4dc")],
];

function heat(v: number): RGB {
  const x = Math.min(1, Math.max(0, v));
  for (let i = 0; i < HEAT.length - 1; i++) {
    const [a, ca] = HEAT[i];
    const [b, cb] = HEAT[i + 1];
    if (x <= b) return mix(ca, cb, (x - a) / (b - a));
  }
  return HEAT[HEAT.length - 1][1];
}

// Kuarklar renk yükü taşır: her proton ya da nötron bir kırmızı, bir yeşil, bir mavi kuarktan oluşur.
const QUARK: RGB[] = [hex("ff5d73"), hex("4fd98b"), hex("4d8dff")];
const PROTON: [RGB, RGB, RGB] = [hex("ff7a52"), hex("b83a2e"), hex("ffd2b8")];
const NEUTRON: [RGB, RGB, RGB] = [hex("9fb0cc"), hex("566580"), hex("e6eefc")];

const CLUSTERS = 15; // 15 helyum-4: 60 nükleon, toplamın ~%25’i (kütlece)
const LI0 = CLUSTERS * 4; // 7 nükleonluk tek bir lityum-7: eser miktar
const NUCLEONS = 240;
const GLUONS = 90;
const PHOTONS = 50;

const PACK4: [number, number][] = [
  [-0.5, -0.5],
  [0.5, 0.5],
  [0.5, -0.5],
  [-0.5, 0.5],
];
const PACK7: [number, number][] = [
  [0, 0],
  ...Array.from(
    { length: 6 },
    (_, k) => [Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)] as [number, number],
  ),
];

const isNeutron = (j: number) => (j < LI0 ? j % 4 >= 2 : j < LI0 + 7 ? j - LI0 >= 3 : false);

/**
 * Büyük Patlama: patlama değil, her yerde aynı anda genişleyen uzay.
 * 1) Her uzaklığın aynı oranda büyüdüğü ızgara, 2) şişme ve kuark–gluon plazması,
 * 3) kuarkların proton ve nötronlara bağlanması, ardından helyum ve lityum çekirdekleri.
 */
export function bigBang(f: SceneFrame) {
  const { ctx, w, h, t, beats, dur } = f;
  const [b0, b1, b2] = beats;
  const cam = camera(t, [
    [0, 0, 0, 1.14],
    [b0 + 0.5, 0, 0, 1],
    [b1, 0, 0, 1],
    [b1 + 0.55, 0, 0, 1.07],
    [b1 + 1.8, 0, 0, 1],
    [b2 + 1, 0, 0, 1],
    [dur, 0.03, 0.01, 1.16],
  ]);

  // Film ışıkla başlar ama tek bir noktadan değil: bütün ekran birlikte ısınır.
  const bloom = lerp(0.22, 1, phase(t, 0.05, 1.9, ease.out));
  const v = 1 - 0.16 * phase(t, b0, b1) - 0.3 * phase(t, b1, b1 + 3) - 0.32 * phase(t, b2, dur);
  const cx = w / 2;
  const cy = h * (w < h ? 0.46 : 0.44);
  const core = heat(v).map((c) => c * bloom) as RGB;
  const edge = heat(v - 0.42).map((c) => c * bloom) as RGB;
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.62);
  bg.addColorStop(0, rgba(core));
  bg.addColorStop(0.55, rgba(mix(core, edge, 0.6)));
  bg.addColorStop(1, rgba(edge));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  applyCam(f, cam);
  plasma(f, v, bloom);
  lattice(f, cx, cy);
  soup(f);
  ctx.restore();
  bokeh(f, v);

  // Şişme anı: bir parlama ve dışa koşan bir halka.
  const flash = Math.exp(-(((t - b1 - 0.55) / 0.45) ** 2));
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,248,232,${0.8 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }
  const ring = phase(t, b1 + 0.3, b1 + 1.6, ease.out);
  if (ring > 0 && ring < 1) {
    ctx.strokeStyle = `rgba(255,245,225,${0.6 * (1 - ring)})`;
    ctx.lineWidth = 6 * f.s * (1 - ring) + 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.hypot(w, h) * 0.7 * ring, 0, Math.PI * 2);
    ctx.stroke();
  }

  labels(f, cam);
  inset(f);
}

/** Ön planda yavaş süzülen, bulanık ışık lekeleri: sahneye derinlik katar. */
function bokeh(f: SceneFrame, v: number) {
  const { ctx, w, h, t, s, beats } = f;
  const a = phase(t, beats[1] + 0.8, beats[1] + 2);
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const x = wrap(hash(i * 12.1) * w + t * (14 + hash(i) * 18) * s, w + 200 * s) - 100 * s;
    const y = h * (0.1 + hash(i * 4.4) * 0.8) + Math.sin(t * 0.4 + i) * 20 * s;
    drawGlow(ctx, x, y, (50 + hash(i * 2.2) * 60) * s, heat(v + 0.1), 0.1 * a);
  }
  ctx.restore();
}

/**
 * Büyüteç: önce kuarkları birbirine bağlayan gluonları, sonra p + n → döteryum →
 * helyum-4 kaynaşmasını yakından gösteren yuvarlak pencere.
 */
function inset(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const wide = w > h;
  const R = wide ? Math.min(w, h) * 0.17 : w * 0.3;
  const cx = wide ? w * 0.72 : w * 0.5;
  const cy = wide ? h * 0.42 : h * 0.56;
  const kQ = pop(t, b1 + 2.2, 0.7, b2 - 0.2, 0.45);
  const kF = pop(t, b2 + 0.8, 0.7);
  const k = Math.max(kQ, kF);
  if (k <= 0.01) return;
  const quarks = QUARK.map((c) => ballSprite(c, mix(c, [20, 10, 40], 0.45), [255, 255, 255]));
  const proton = ballSprite(...PROTON);
  const neutron = ballSprite(...NEUTRON);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  drawGlow(ctx, 0, 0, R * 1.6, [255, 190, 150], 0.35);
  const g = ctx.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
  g.addColorStop(0, "rgb(70,26,90)");
  g.addColorStop(1, "rgb(22,8,40)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();

  const font = (size: number, weight = 600) =>
    `${weight} ${Math.round(Math.max(10, size * s))}px Outfit, system-ui, sans-serif`;
  if (kQ > 0.01 && t < b2) {
    // Üç kuark, aralarında titreşen gluon yayları.
    const pts: [number, number][] = [0, 1, 2].map((q) => {
      const a = t * 1.1 + (q * Math.PI * 2) / 3;
      const r = R * 0.34 * (1 + 0.12 * Math.sin(t * 2.3 + q * 2));
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    ctx.strokeStyle = "rgba(255,214,110,0.95)";
    ctx.lineWidth = Math.max(1.5, 2.4 * s);
    ctx.lineCap = "round";
    for (let q = 0; q < 3; q++) {
      const [x1, y1] = pts[q];
      const [x2, y2] = pts[(q + 1) % 3];
      wave(ctx, x1, y1, x2, y2, R * 0.05, 5, t * 9 + q);
      ctx.stroke();
    }
    pts.forEach(([x, y], q) => {
      drawGlow(ctx, x, y, R * 0.3, QUARK[q], 0.35);
      drawSprite(ctx, quarks[q], x, y, R * 0.13);
    });
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.font = font(12.5);
    ctx.textAlign = "center";
    ctx.fillText("kuarklar ve gluonlar", 0, R * 0.78);
  }
  if (kF > 0.01) {
    const u = t - (b2 + 0.8);
    const r = R * 0.12;
    const d = r * 0.95;
    const stepA = phase(u, 0.2, 1.4, ease.inOut); // p + n → döteryum
    const stepB = phase(u, 2, 3.2, ease.inOut); // döteryum + döteryum → helyum-4
    const spin = u * 0.5;
    const place = (x: number, y: number): [number, number] => [
      x * Math.cos(spin) - y * Math.sin(spin),
      x * Math.sin(spin) + y * Math.cos(spin),
    ];
    // İlk çift (p + n) soldan gelir; ikinci çift sağdan katılır.
    const pairA: [number, number, boolean][] = [
      [lerp(-R * 0.6, -d, stepA), lerp(-d, -d, stepA), false],
      [lerp(-R * 0.1, d, stepA), lerp(R * 0.3, -d, stepA), true],
    ];
    const pairB: [number, number, boolean][] = [
      [lerp(R * 0.9, -d, stepB), lerp(R * 0.2, d, stepB), true],
      [lerp(R * 1.3, d, stepB), lerp(R * 0.5, d, stepB), false],
    ];
    const all = stepB > 0 ? [...pairA, ...pairB] : pairA;
    const flash = Math.exp(-(((u - 1.4) / 0.25) ** 2)) + Math.exp(-(((u - 3.2) / 0.25) ** 2));
    if (flash > 0.02) drawGlow(ctx, 0, 0, R * 0.7, [255, 240, 200], flash);
    for (const [x, y, neutronBall] of all) {
      const [px, py] = place(x, y);
      drawSprite(ctx, neutronBall ? neutron : proton, px, py, r);
    }
    const text = u < 1.6 ? "proton + nötron" : u < 3.3 ? "döteryum + döteryum" : "helyum-4";
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.font = font(13);
    ctx.textAlign = "center";
    ctx.fillText(text, 0, R * 0.74);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,244,225,0.95)";
  ctx.lineWidth = Math.max(2, 3.5 * s);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Arka plandaki sıcak plazma bulutları: katmanlı, yavaş sürüklenen, toplamsal ışık. */
function plasma(f: SceneFrame, v: number, bloom: number) {
  const { ctx, w, h, t, s, beats } = f;
  const grow = 1 + 0.3 * phase(t, beats[0], beats[1]);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    const x = w * (hash(i * 3.1) * 1.2 - 0.1) + Math.sin(t * 0.25 + i) * 50 * s;
    const y = h * (hash(i * 5.7) * 1.2 - 0.1) + Math.cos(t * 0.21 + i * 1.7) * 50 * s;
    const r = (170 + hash(i * 7.3) * 230) * s * grow;
    drawGlow(ctx, x, y, r, heat(v - 0.08 - hash(i) * 0.25), 0.16 * bloom);
  }
  ctx.restore();
}

function lattice(f: SceneFrame, cx: number, cy: number) {
  const { ctx, w, h, t, s, beats } = f;
  const [b0, b1] = beats;
  const alpha = phase(t, b0 - 1.4, b0 + 0.2, ease.out) * (1 - phase(t, b1 + 0.15, b1 + 1));
  if (alpha <= 0.01) return;
  const grow = 1 + 1.4 * phase(t, b0 - 0.6, b1 - 0.2);
  const infl = Math.exp(5.5 * phase(t, b1, b1 + 1.3, ease.in));
  const g = 70 * s * grow * infl;
  const n = Math.min(30, Math.ceil(Math.max(w, h) / g / 2) + 2);
  const pos = (i: number, j: number): [number, number] => [
    cx + (i + (hash(i * 31.7 + j * 7.3) - 0.5) * 0.32) * g,
    cy + (j + (hash(i * 5.1 + j * 19.9) - 0.5) * 0.32) * g,
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(120,40,24,0.32)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const [x, y] = pos(i, j);
      const [x2, y2] = pos(i + 1, j);
      const [x3, y3] = pos(i, j + 1);
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.moveTo(x, y);
      ctx.lineTo(x3, y3);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(110,34,20,0.7)";
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const [x, y] = pos(i, j);
      ctx.beginPath();
      ctx.arc(x, y, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Üç işaretli nokta: hangisinden bakarsan bak, ötekiler aynı oranda uzaklaşır.
  const marks: [[number, number], string][] = [
    [pos(-1, 0), "2fd3c0"],
    [pos(2, 1), "ff4f8b"],
    [pos(-2, -2), "5b5bff"],
  ];
  ctx.setLineDash([7 * s, 6 * s]);
  ctx.strokeStyle = "rgba(70,16,40,0.85)";
  ctx.lineWidth = Math.max(1.5, 2.2 * s);
  ctx.beginPath();
  ctx.moveTo(...marks[0][0]);
  ctx.lineTo(...marks[1][0]);
  ctx.moveTo(...marks[0][0]);
  ctx.lineTo(...marks[2][0]);
  ctx.stroke();
  ctx.setLineDash([]);
  marks.forEach(([[x, y], color], k) => {
    const r = 8 * s * pop(t, b0 - 0.4 + k * 0.25, 0.6);
    if (r <= 0) return;
    drawGlow(ctx, x, y, r * 3, hex(color), 0.6);
    ctx.fillStyle = `#${color}`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    sparkle(ctx, x, y, r * 0.9, "rgba(255,255,255,0.95)", t * 0.5);
  });
  const label = `×${grow.toFixed(1).replace(".", ",")}`;
  const tag = (x: number, y: number) => {
    ctx.font = `700 ${Math.round(Math.max(12, 15 * s))}px Outfit, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,244,220,0.92)";
    roundRect(ctx, x - tw / 2 - 8 * s, y - 12 * s, tw + 16 * s, 24 * s, 12 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(70,16,40,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  };
  const [A, B, C] = marks.map((m) => m[0]);
  tag((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 16 * s);
  tag((A[0] + C[0]) / 2 - 22 * s, (A[1] + C[1]) / 2);
  ctx.restore();
}

function clusterAt(f: SceneFrame, c: number, time: number): [number, number] {
  const { w, h, s } = f;
  const drift = 9 * s;
  return [
    wrap(hash(c * 7.7 + 1) * w + (hash(c * 2.1) - 0.5) * drift * time, w),
    wrap(hash(c * 9.1 + 2) * h + (hash(c * 4.3) - 0.5) * drift * time, h),
  ];
}

function fuse(f: SceneFrame, c: number, time: number) {
  const b2 = f.beats[2];
  const at = c < CLUSTERS ? b2 + 2 + hash(c + 11) * 1.4 : b2 + 3.4;
  return phase(time, at, at + 0.8, ease.inOut);
}

function lithiumAt(f: SceneFrame): [number, number] {
  return f.w > f.h ? [f.w * 0.88, f.h * 0.7] : [f.w * 0.8, f.h * 0.24];
}

/** Bir nükleonun (proton ya da nötron) merkezi; küme üyeleri kaynaşınca paketlenir. */
function nucleonAt(f: SceneFrame, j: number, time: number): [number, number] {
  const { w, h, s } = f;
  const r = 5.6 * s;
  if (j < LI0 + 7) {
    const cluster = j < LI0;
    const c = cluster ? Math.floor(j / 4) : CLUSTERS;
    const [kx, ky] = cluster ? clusterAt(f, c, time) : lithiumAt(f);
    const ox = (hash(j * 3.3) - 0.5) * 120 * s;
    const oy = (hash(j * 5.9) - 0.5) * 120 * s;
    const [px, py] = cluster ? PACK4[j % 4] : PACK7[j - LI0];
    const m = fuse(f, c, time);
    const k = cluster ? 1.9 : 1.75;
    return [kx + lerp(ox, px * r * k, m), ky + lerp(oy, py * r * k, m)];
  }
  const drift = 10 * s;
  return [
    wrap(hash(j * 1.13) * w + (hash(j * 2.2) - 0.5) * drift * time, w),
    wrap(hash(j * 4.41) * h + (hash(j * 6.6) - 0.5) * drift * time, h),
  ];
}

function soup(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const alpha = phase(t, b1 + 0.3, b1 + 1.4, ease.out);
  if (alpha <= 0.01) return;
  const had = phase(t, b2, b2 + 1.5); // kuarklar bağlanır
  const quarkA = 1 - phase(t, b2 + 1.1, b2 + 1.7);
  const cool = phase(t, b1, b2 + 4);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Gluonlar: kuarkları bağlayan kuvvetin taşıyıcıları, kısa dalgalı çizgiler.
  const gl = 1 - had;
  if (gl > 0.01) {
    ctx.strokeStyle = `rgba(255,214,110,${0.75 * gl})`;
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.beginPath();
    for (let i = 0; i < GLUONS; i++) {
      const x = wrap(hash(i * 8.3) * w + (hash(i) - 0.5) * 80 * s * t, w);
      const y = wrap(hash(i * 3.9) * h + (hash(i + 5) - 0.5) * 80 * s * t, h);
      const a = hash(i * 2.7) * Math.PI * 2 + t * 2;
      const [ex, ey] = [x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s];
      wave(ctx, x, y, ex, ey, 2.2 * s, 2, t * 10 + i, true);
    }
    ctx.stroke();
  }

  // Kuarklar ve onların bağlandığı proton/nötronlar: renk başına tek dolguyla toplu çizilir.
  const qPts: number[][] = [[], [], []];
  const pPts: number[] = [];
  const nPts: number[] = [];
  for (let j = 0; j < NUCLEONS; j++) {
    const [nx, ny] = nucleonAt(f, j, t);
    if (quarkA > 0.01) {
      for (let q = 0; q < 3; q++) {
        const id = j * 3 + q;
        const ang = hash(id * 1.7) * Math.PI * 2 + t * (1.4 + hash(id) * 2.2) * (1 - had * 0.6);
        const rad = lerp(100 * s * (0.25 + 0.75 * hash(id * 2.9)), 4.4 * s, had);
        const jit = (1 - cool) * 3 * s;
        const x = nx + Math.cos(ang) * rad + Math.sin(t * 9 + id) * jit;
        const y = ny + Math.sin(ang) * rad * 0.85 + Math.cos(t * 8 + id) * jit;
        qPts[q].push(x, y, lerp(3.6, 2.4, had) * s);
      }
    }
    const nPop = pop(t, b2 + 1 + hash(j) * 0.4, 0.5);
    if (nPop > 0.01) (isNeutron(j) ? nPts : pPts).push(nx, ny, 5.6 * s * nPop);
  }
  QUARK.forEach((c, q) =>
    drawBalls(ctx, qPts[q], c, mix(c, [20, 10, 40], 0.45), [255, 255, 255], quarkA),
  );
  drawBalls(ctx, pPts, ...PROTON);
  drawBalls(ctx, nPts, ...NEUTRON);

  // Kaynaşma anı: her helyum kümesinde küçük bir ışık halkası.
  for (let c = 0; c <= CLUSTERS; c++) {
    const at = c < CLUSTERS ? b2 + 2.8 + hash(c + 11) * 1.4 : b2 + 4.2;
    const k = phase(t, at, at + 0.6, ease.out);
    if (k <= 0 || k >= 1) continue;
    const [x, y] = c < CLUSTERS ? clusterAt(f, c, t) : lithiumAt(f);
    ctx.strokeStyle = `rgba(255,236,190,${0.9 * (1 - k)})`;
    ctx.lineWidth = Math.max(1, 2 * s * (1 - k));
    ctx.beginPath();
    ctx.arc(x, y, (8 + 22 * k) * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fotonlar: her yöne koşan ışık dalgaları.
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,250,236,0.9)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  for (let i = 0; i < PHOTONS; i++) {
    const a = hash(i * 9.1) * Math.PI * 2;
    const v = 240 * s;
    const x = wrap(hash(i * 2.3) * w + Math.cos(a) * v * t, w);
    const y = wrap(hash(i * 4.9) * h + Math.sin(a) * v * t, h);
    const [sx, sy] = [x - Math.cos(a) * 30 * s, y - Math.sin(a) * 30 * s];
    wave(ctx, sx, sy, x, y, 2.6 * s, 2.5, -t * 14, true);
  }
  ctx.stroke();
  ctx.restore();
}

function nearestSingle(f: SceneFrame, target: [number, number], when: number) {
  let best = LI0 + 7;
  let bestD = Infinity;
  for (let j = LI0 + 7; j < NUCLEONS; j++) {
    const [x, y] = nucleonAt(f, j, when);
    const d = Math.hypot(x - target[0], y - target[1]);
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  }
  return best;
}

function labels(f: SceneFrame, cam: Cam) {
  const { w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const top = h * (w < h ? 0.2 : 0.17);
  badge(
    f,
    w / 2,
    top,
    "Merkez yok: her uzaklık aynı oranda büyür",
    phase(t, b0 + 0.6, b0 + 1.2) * (1 - phase(t, b1 - 0.5, b1)),
  );

  const side = (x: number) => (x > w * 0.6 ? -1 : 1);
  const soupK = phase(t, b1 + 1.8, b1 + 2.8) * (1 - phase(t, b2 - 0.6, b2));
  if (soupK > 0.01) {
    const j = nearestSingle(f, w > h ? [w * 0.36, h * 0.38] : [w * 0.3, h * 0.26], b1 + 2);
    const [x, y] = project(f, cam, ...nucleonAt(f, j, t));
    callout(f, x, y, "Kuark–gluon plazması", soupK, side(x), "kuarklar serbest, ortam çok sıcak");
  }
  const pK = phase(t, b2 + 2.6, b2 + 3.6);
  if (pK > 0.01) {
    const j = nearestSingle(f, w > h ? [w * 0.28, h * 0.46] : [w * 0.3, h * 0.86], b2 + 2.6);
    const [x, y] = project(f, cam, ...nucleonAt(f, j, t));
    callout(f, x, y, "Proton", pK, side(x), "hidrojen çekirdeği");
  }
  const heK = phase(t, b2 + 3.4, b2 + 4.4);
  if (heK > 0.01) {
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < CLUSTERS; c++) {
      const [x, y] = clusterAt(f, c, b2 + 3.4);
      const d =
        w > h ? Math.hypot(x - w * 0.42, y - h * 0.3) : Math.hypot(x - w * 0.28, y - h * 0.3);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    const [x, y] = project(f, cam, ...clusterAt(f, best, t));
    callout(f, x, y, "Helyum-4", heK, side(x), "2 proton + 2 nötron");
  }
  const [lx, ly] = project(f, cam, ...lithiumAt(f));
  callout(f, lx, ly, "Lityum-7", phase(t, b2 + 4.6, b2 + 5.4), -1, "yalnızca eser miktarda");

  // Kütlece bileşim kartı.
  const card = pop(t, b2 + 4.8, 0.7);
  if (card > 0.01) {
    const { ctx } = f;
    const cw = Math.min(w * 0.8, 330 * s);
    const ch = 70 * s;
    ctx.save();
    ctx.translate(w / 2, top + 10 * s);
    ctx.scale(card, card);
    ctx.fillStyle = "rgba(12,6,28,0.72)";
    roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 16 * s);
    ctx.fill();
    const bw = cw - 36 * s;
    const bx = -bw / 2;
    const by = 8 * s;
    ctx.fillStyle = rgba(PROTON[0]);
    roundRect(ctx, bx, by, bw * 0.75 - 2 * s, 9 * s, 4.5 * s);
    ctx.fill();
    ctx.fillStyle = "rgb(255,208,120)";
    roundRect(ctx, bx + bw * 0.75 + 2 * s, by, bw * 0.25 - 2 * s, 9 * s, 4.5 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.font = `600 ${Math.round(Math.max(12, 13.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("Hidrojen ≈ %75", bx, -12 * s);
    ctx.textAlign = "right";
    ctx.fillText("Helyum ≈ %25", bx + bw, -12 * s);
    ctx.restore();
  }
}
