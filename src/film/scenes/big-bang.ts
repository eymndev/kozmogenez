import {
  badge,
  callout,
  center,
  dot,
  glow,
  hash,
  lerp,
  nearest,
  pick,
  roundRect,
  smooth,
  span,
  wrap,
  type SceneFrame,
} from "@/film/scenes/kit";

const CLUSTERS = 60;
const SINGLES = 720; // yaklaşık 12 hidrojen çekirdeğine 1 helyum: kütlece ~%75 / ~%25
const TOTAL = CLUSTERS * 4 + SINGLES;
const LITHIUM = CLUSTERS * 4; // tek bir lityum-7: eser miktar
const PHOTONS = 110;

const QUARK = [
  [255, 96, 92],
  [110, 235, 140],
  [98, 150, 255],
];
const PROTON = [255, 128, 96];
const NEUTRON = [160, 172, 192];

/**
 * Büyük Patlama: patlama değil, her yerde aynı anda genişleyen uzay.
 * 1) Her uzaklığın aynı oranda büyüdüğü bir ızgara, 2) şişme ve kuark–gluon plazması,
 * 3) ilk dakikalarda hidrojen ve helyum çekirdeklerinin oluşumu.
 */
export function bigBang(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const [cx, cy] = center(f);

  // Sıcaklık: 1 = beyaz-sıcak, 0 = soğumuş koyu kehribar.
  const hot = 1 - 0.2 * span(t, b0, b1) - 0.25 * span(t, b1, b1 + 3) - 0.35 * span(t, b2, b2 + 5);
  // Film ışıkla başlar ama tek bir noktadan değil: bütün ekran birlikte ısınır.
  const bloom = lerp(0.32, 1, span(t, 0.1, 2.2));
  const core = [lerp(60, 250, hot), lerp(24, 214, hot), lerp(12, 160, hot)].map((v) => v * bloom);
  const edge = [lerp(8, 196, hot * hot), lerp(5, 92, hot * hot), lerp(8, 34, hot * hot)].map(
    (v) => v * bloom,
  );
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.7);
  bg.addColorStop(0, `rgb(${core.map(Math.round).join(",")})`);
  bg.addColorStop(1, `rgb(${edge.map(Math.round).join(",")})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Yoğun, kaynayan ışık: yumuşak ve yavaş dalgalanan lekeler.
  for (let i = 0; i < 14; i++) {
    const x = wrap(hash(i) * w + Math.sin(t * 0.4 + i) * 40 * s, w);
    const y = wrap(hash(i + 50) * h + Math.cos(t * 0.33 + i * 2) * 40 * s, h);
    const a = 0.1 * hot * bloom;
    glow(ctx, x, y, (120 + hash(i + 9) * 160) * s, `rgba(255,250,235,${a})`);
  }

  drawLattice(f, cx, cy);
  drawSoup(f, cx, cy);

  // Genişleme ölçeği: şişme anında ekran bir anda beyazlar.
  const flash = Math.exp(-(((t - b1 - 0.5) / 0.55) ** 2));
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,250,240,${0.75 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Kütle oranı çubuğu.
  const bar = span(t, b2 + 3.2, b2 + 4.4);
  if (bar > 0.01) {
    const bw = Math.min(w * 0.7, 300 * s);
    const bx = cx - bw / 2;
    const by = h * (w < h ? 0.2 : 0.18);
    ctx.save();
    ctx.globalAlpha = bar;
    ctx.fillStyle = "rgba(5,6,10,0.55)";
    roundRect(ctx, bx - 14 * s, by - 30 * s, bw + 28 * s, 58 * s, 12 * s);
    ctx.fill();
    ctx.fillStyle = `rgb(${PROTON.join(",")})`;
    ctx.fillRect(bx, by, bw * 0.75 * bar, 6 * s);
    ctx.fillStyle = "rgb(235,208,150)";
    ctx.fillRect(bx + bw * 0.75, by, bw * 0.25 * bar, 6 * s);
    ctx.fillStyle = "rgba(243,238,226,0.95)";
    ctx.font = `500 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("Kütlece ≈ %75 hidrojen", bx, by - 10 * s);
    ctx.textAlign = "right";
    ctx.fillText("≈ %25 helyum", bx + bw, by - 10 * s);
    ctx.restore();
  }
}

function drawLattice(f: SceneFrame, cx: number, cy: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1] = beats;
  const alpha = span(t, b0 - 1.2, b0 + 0.4) * (1 - span(t, b1 + 0.2, b1 + 1.2));
  if (alpha <= 0.01) return;
  const grow = 1 + 1.4 * smooth((t - b0 + 1) / (b1 - b0 + 1));
  const a = grow * Math.exp(5.5 * span(t, b1, b1 + 1.3));
  const g = 64 * s * a;
  const n = Math.ceil(Math.max(w, h) / g / 2) + 2;
  const pos = (i: number, j: number): [number, number] => {
    const jx = (hash(i * 31.7 + j * 7.3) - 0.5) * 0.35;
    const jy = (hash(i * 5.1 + j * 19.9) - 0.5) * 0.35;
    return [cx + (i + jx) * g, cy + (j + jy) * g];
  };

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(90,40,10,0.28)";
  ctx.lineWidth = Math.max(1, s);
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
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const [x, y] = pos(i, j);
      dot(ctx, x, y, 2.4 * s, "rgba(80,32,8,0.55)");
    }
  }

  // Üç işaretli nokta: hangisinden bakarsan bak, ötekiler aynı oranda uzaklaşır.
  const A = pos(-1, 0);
  const B = pos(2, 1);
  const C = pos(-2, -2);
  ctx.strokeStyle = "rgba(150,70,0,0.9)";
  ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.setLineDash([6 * s, 5 * s]);
  ctx.beginPath();
  ctx.moveTo(...A);
  ctx.lineTo(...B);
  ctx.moveTo(...A);
  ctx.lineTo(...C);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of [A, B, C]) {
    dot(ctx, x, y, 5.5 * s, "rgba(150,70,0,0.95)");
    dot(ctx, x, y, 2.5 * s, "rgba(255,245,225,1)");
  }
  ctx.fillStyle = "rgba(70,28,4,0.95)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = `×${grow.toFixed(1).replace(".", ",")}`;
  ctx.fillText(label, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 14 * s);
  ctx.fillText(label, (A[0] + C[0]) / 2 - 18 * s, (A[1] + C[1]) / 2);
  ctx.restore();

  badge(
    f,
    cx,
    h * (w < h ? 0.19 : 0.17),
    "Merkez yok: her uzaklık aynı oranda büyür",
    span(t, b0 + 0.8, b0 + 1.8) * (1 - span(t, b1 - 0.6, b1)),
  );
}

function drawSoup(f: SceneFrame, cx: number, cy: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, b1, b2] = beats;
  const alpha = span(t, b1 + 0.3, b1 + 1.4);
  if (alpha <= 0.01) return;
  const bind = span(t, b2, b2 + 1.6); // kuarklar → proton/nötron
  const fuse = (i: number) => span(t, b2 + 1.2 + hash(i + 3) * 1.6, b2 + 2.6 + hash(i + 3) * 1.6);
  const jitter = lerp(9, 3, bind) * s;

  const free = (i: number, time = t): [number, number] => {
    const vx = (hash(i * 3.1) - 0.5) * 60 * s;
    const vy = (hash(i * 7.7) - 0.5) * 60 * s;
    return [
      wrap(hash(i) * w + vx * time + Math.sin(time * 9 + i) * jitter, w),
      wrap(hash(i + 0.5) * h + vy * time + Math.cos(time * 8 + i * 1.3) * jitter, h),
    ];
  };
  const clusterAt = (c: number, time = t): [number, number] => [
    wrap(hash(c * 13.3 + 1) * w + (hash(c) - 0.5) * 12 * s * time, w),
    wrap(hash(c * 17.9 + 2) * h + (hash(c + 4) - 0.5) * 12 * s * time, h),
  ];
  const lithium: [number, number] = [cx + 0.26 * w, cy + 0.12 * h];

  ctx.save();
  ctx.globalAlpha = alpha;
  const r = 2.3 * s;
  for (let i = 0; i < TOTAL; i++) {
    let [x, y] = free(i);
    let isNeutron = false;
    if (i < CLUSTERS * 4) {
      const c = Math.floor(i / 4);
      const k = i % 4;
      isNeutron = k >= 2;
      const [kx, ky] = clusterAt(c);
      const off = [
        [-1, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
      ][k];
      const m = fuse(c);
      x = lerp(x, kx + off[0] * r * 0.95, m);
      y = lerp(y, ky + off[1] * r * 0.95, m);
    } else if (i < LITHIUM + 7) {
      const k = i - LITHIUM;
      isNeutron = k >= 3;
      const ang = (k / 7) * Math.PI * 2;
      const m = span(t, b2 + 2.4, b2 + 4);
      x = lerp(x, lithium[0] + Math.cos(ang) * r * 1.3, m);
      y = lerp(y, lithium[1] + Math.sin(ang) * r * 1.3, m);
    }
    const q = QUARK[Math.floor(hash(i + 0.25) * 3)];
    const target = isNeutron ? NEUTRON : PROTON;
    const col = q.map((v, n) => Math.round(lerp(v, target[n], bind)));
    dot(ctx, x, y, r, `rgb(${col.join(",")})`);
  }

  // Fotonlar: kısa, parlak çizgiler; plazmada her yöne koşuşur.
  ctx.strokeStyle = "rgba(255,252,240,0.85)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  for (let i = 0; i < PHOTONS; i++) {
    const ang = hash(i * 9.1) * Math.PI * 2;
    const v = 260 * s;
    const x = wrap(hash(i * 2.3) * w + Math.cos(ang) * v * t, w);
    const y = wrap(hash(i * 4.9) * h + Math.sin(ang) * v * t, h);
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang) * 10 * s, y - Math.sin(ang) * 10 * s);
  }
  ctx.stroke();
  ctx.restore();

  const soupLabel = alpha * (1 - bind);
  const side = (x: number) => (x > w * 0.55 ? -1 : 1);
  const probe = free(pick(f, free, TOTAL - 120, 120, b1 + 1.6));
  callout(
    f,
    probe[0],
    probe[1],
    "Kuark–gluon plazması",
    soupLabel * span(t, b1 + 1.6, b1 + 2.4),
    side(probe[0]),
  );

  const he = clusterAt(nearest(clusterAt, 0, CLUSTERS, b2 + 3, [w * 0.62, h * 0.33]));
  const hLabel = span(t, b2 + 3, b2 + 3.8);
  callout(f, he[0], he[1], "Helyum-4", hLabel, side(he[0]), "2 proton + 2 nötron");
  const p = free(nearest(free, LITHIUM + 7, SINGLES - 7, b2 + 3, [w * 0.3, h * 0.46]));
  callout(f, p[0], p[1], "Hidrojen", hLabel, side(p[0]), "tek proton");
  callout(f, lithium[0], lithium[1], "Lityum-7", span(t, b2 + 4, b2 + 4.8), -1, "eser miktar");
}
