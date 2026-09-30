import {
  badge,
  callout,
  hash,
  image,
  roundRect,
  wrap,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";
import {
  drawBalls,
  drawGlow,
  ease,
  hex,
  mix,
  phase,
  pop,
  rgba,
  sparkle,
  type RGB,
} from "@/film/scenes/art";

/**
 * İlk ışık. Önce sıcak, opak bir sis: fotonlar serbest elektronlara çarpıp zikzak çizer.
 * Sıcaklık ~3.000 kelvine inince elektronlar çekirdeklere bağlanır, sis kalkar, ışık dümdüz
 * yol alır. Sonra o ışığın bize her yönden gelişi: yolda dalgası uzar, mikrodalgaya döner;
 * en sonda bütün gökyüzünün haritası.
 */
export function firstLight(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [, b1, b2] = beats;
  const clear = phase(t, b1 + 0.6, b1 + 3);
  const out = phase(t, b2 - 0.5, b2 + 0.6);
  if (out < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - out;
    plasma(f, clear);
    ctx.restore();
  }
  if (out > 0) {
    ctx.save();
    ctx.globalAlpha *= out;
    sky(f, out);
    ctx.restore();
  }
}

const TAU = Math.PI * 2;
const NUCLEI = 84;
const PHOTONS = 30;
const STEP = 0.22;
const PROTON: [RGB, RGB, RGB] = [hex("ff7a52"), hex("b83a2e"), hex("ffd2b8")];
const NEUTRON: [RGB, RGB, RGB] = [hex("9fb0cc"), hex("566580"), hex("e6eefc")];
const ELECTRON: [RGB, RGB, RGB] = [hex("7ec8ff"), hex("2f6fb0"), hex("e6f6ff")];

/* ---------- Opak plazma ve saydamlaşma ---------- */

function nucleusAt(f: SceneFrame, i: number): [number, number] {
  const { w, h, t, s } = f;
  return [
    wrap(hash(i * 3.7) * w * 1.1 + t * (4 + hash(i) * 6) * s, w * 1.1) - w * 0.05,
    hash(i * 9.2) * h + Math.cos(t * 0.6 + i * 1.7) * 8 * s,
  ];
}

/** Elektron: önce hızlı ve serbest; bağlanınca çekirdeğin çevresinde yörüngeye oturur. */
function electronAt(f: SceneFrame, i: number): { x: number; y: number; bound: number } {
  const { t, s, beats } = f;
  const [nx, ny] = nucleusAt(f, i);
  const start = beats[1] + 0.5 + hash(i + 5) * 1.8;
  const bound = phase(t, start, start + 0.9, ease.inOut);
  const fx = nx + Math.sin(t * 5.3 + i * 2.1) * 38 * s + Math.cos(t * 3.1 + i) * 22 * s;
  const fy = ny + Math.cos(t * 4.7 + i * 1.3) * 38 * s + Math.sin(t * 2.9 + i) * 22 * s;
  const ang = t * 3 + i;
  const ox = nx + Math.cos(ang) * 12 * s;
  const oy = ny + Math.sin(ang) * 5 * s;
  return { x: fx + (ox - fx) * bound, y: fy + (oy - fy) * bound, bound };
}

/** Foton yolu: her `STEP` saniyede bir elektrona çarpıp yön değiştirir; saydamlaşınca dümdüz. */
function photonAt(f: SceneFrame, i: number) {
  const { w, h, t, s, beats } = f;
  const free = beats[1] + 1.2;
  const L = 26 * s;
  let x = hash(i * 5.3) * w;
  let y = hash(i * 8.1) * h;
  const trail: [number, number][] = [[x, y]];
  const walkEnd = Math.min(t, free);
  const steps = Math.floor(walkEnd / STEP);
  let ang = 0;
  for (let k = Math.max(0, steps - 8); k <= steps; k++) {
    if (k === Math.max(0, steps - 8)) {
      // Önceki adımların toplamını tek seferde ekle: yol sabit kalsın.
      for (let q = 0; q < k; q++) {
        const a = hash(i * 131 + q * 17.3) * TAU;
        x += Math.cos(a) * L;
        y += Math.sin(a) * L;
      }
      trail[0] = [x, y];
    }
    ang = hash(i * 131 + k * 17.3) * TAU;
    const len = k < steps ? L : L * ((walkEnd - steps * STEP) / STEP);
    x += Math.cos(ang) * len;
    y += Math.sin(ang) * len;
    trail.push([x, y]);
  }
  const hitAge = (walkEnd - steps * STEP) / STEP;
  if (t <= free) {
    return {
      x: wrap(x, w),
      y: wrap(y, h),
      trail,
      ang,
      straight: 0,
      hitAge,
      ox: wrap(x, w) - x,
      oy: wrap(y, h) - y,
    };
  }
  const run = (t - free) * 260 * s;
  const hx = x + Math.cos(ang) * run;
  const hy = y + Math.sin(ang) * run;
  return {
    x: wrap(hx, w),
    y: wrap(hy, h),
    trail,
    ang,
    straight: Math.min(1, run / (80 * s)),
    hitAge: 1,
    ox: wrap(hx, w) - hx,
    oy: wrap(hy, h) - hy,
  };
}

function plasma(f: SceneFrame, clear: number) {
  const { ctx, w, h, t, s, beats } = f;
  const [b0, b1, b2] = beats;
  const fog = 1 - clear;

  const bg = ctx.createRadialGradient(
    w * 0.5,
    h * 0.45,
    0,
    w * 0.5,
    h * 0.45,
    Math.hypot(w, h) * 0.65,
  );
  bg.addColorStop(0, rgba(mix(hex("0f1230"), hex("e0783a"), fog)));
  bg.addColorStop(0.6, rgba(mix(hex("0a0c22"), hex("9a3c22"), fog)));
  bg.addColorStop(1, rgba(mix(hex("05060f"), hex("4a1a12"), fog)));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Sisin dalgalanan katmanları.
  if (fog > 0.01) {
    for (let i = 0; i < 12; i++) {
      const x = hash(i * 2.3) * w + Math.sin(t * 0.25 + i) * 50 * s;
      const y = hash(i * 4.7) * h + Math.cos(t * 0.2 + i * 1.3) * 40 * s;
      drawGlow(ctx, x, y, (160 + hash(i) * 160) * s, hex(i % 2 ? "ffb070" : "ff8a50"), 0.18 * fog);
    }
  }
  // Clear sonrası: uzak, yeni doğan evrenin koyu dokusu ve pırıltılar.
  if (clear > 0.01) {
    ctx.save();
    ctx.globalAlpha *= clear;
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = `rgba(255,236,210,${0.25 + 0.4 * tw})`;
      ctx.beginPath();
      ctx.arc(hash(i * 6.1) * w, hash(i * 7.3) * h, (0.6 + hash(i) * 1.1) * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Çekirdekler: çoğu proton (hidrojen), bazıları helyum.
  const pPts: number[] = [];
  const nPts: number[] = [];
  for (let i = 0; i < NUCLEI; i++) {
    const [x, y] = nucleusAt(f, i);
    if (hash(i + 11) > 0.9) {
      const r = 3.4 * s;
      pPts.push(x - r * 0.7, y - r * 0.6, r, x + r * 0.7, y + r * 0.6, r);
      nPts.push(x + r * 0.7, y - r * 0.6, r, x - r * 0.7, y + r * 0.6, r);
    } else pPts.push(x, y, 4.2 * s);
  }
  // Atomlar: bağlanan elektronun yörüngesi.
  ctx.strokeStyle = "rgba(140,205,255,0.35)";
  ctx.lineWidth = Math.max(1, 0.9 * s);
  ctx.beginPath();
  for (let i = 0; i < NUCLEI; i++) {
    const e = electronAt(f, i);
    if (e.bound < 0.3) continue;
    const [x, y] = nucleusAt(f, i);
    ctx.moveTo(x + 12 * s, y);
    ctx.ellipse(x, y, 12 * s, 5 * s, 0, 0, TAU);
  }
  ctx.stroke();
  drawBalls(ctx, nPts, ...NEUTRON);
  drawBalls(ctx, pPts, ...PROTON);
  const ePts: number[] = [];
  for (let i = 0; i < NUCLEI; i++) {
    const e = electronAt(f, i);
    ePts.push(e.x, e.y, 2.2 * s);
  }
  drawBalls(ctx, ePts, ...ELECTRON);

  // Fotonlar: sisin içinde zikzak, sonra dümdüz ışık çizgileri.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < PHOTONS; i++) {
    const P = photonAt(f, i);
    ctx.strokeStyle = `rgba(255,236,170,${0.55 + 0.3 * clear})`;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    if (P.straight > 0) {
      const tail = 110 * s * P.straight;
      ctx.moveTo(P.x - Math.cos(P.ang) * tail, P.y - Math.sin(P.ang) * tail);
      ctx.lineTo(P.x, P.y);
    } else {
      P.trail.forEach(([x, y], k) => {
        const px = x + P.ox;
        const py = y + P.oy;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
    }
    ctx.stroke();
    drawGlow(ctx, P.x, P.y, 10 * s, hex("fff4d0"), 0.95);
    // Çarpışma pırıltısı: yön değiştirdiği anda kısa bir ışık.
    if (P.straight === 0 && P.hitAge < 0.35) {
      sparkle(ctx, P.x, P.y, 6 * s * (1 - P.hitAge / 0.35), "rgba(255,250,230,0.9)", t);
    }
  }

  // Büyüteç: önce bir fotonun elektrona çarpıp saçılması; sonra elektronun protona bağlanması.
  lens(f, pop(t, b0 + 1.4, 0.7, b1 - 0.4, 0.5), "scatter");
  lens(f, pop(t, b1 + 1.2, 0.7, b2 - 0.8, 0.5), "bind");
  thermometer(f, pop(t, b1 - 0.1, 0.6, b2 - 0.6, 0.5), phase(t, b1, b1 + 2.6));

  const wide = w > h;
  badge(
    f,
    w / 2,
    h * (wide ? 0.13 : 0.1),
    "Işık düz yol alamaz: evren bir sis gibi",
    phase(t, b0 + 0.3, b0 + 0.9) * (1 - phase(t, b1 - 0.6, b1 - 0.2)),
  );
  badge(
    f,
    w / 2,
    h * (wide ? 0.13 : 0.1),
    "~380.000 yıl: evren saydamlaşır",
    phase(t, b1 + 2.4, b1 + 3) * (1 - phase(t, b2 - 0.8, b2 - 0.4)),
  );
  // Etiketler: sabit bir örnek üzerine.
  const P = photonAt(f, 3);
  const [px, py] = [P.x, P.y];
  callout(
    f,
    px,
    py,
    "Foton",
    phase(t, b0 + 0.6, b0 + 1.3) * (1 - phase(t, b0 + 3.4, b0 + 3.8)),
    px > w * 0.55 ? -1 : 1,
    "her an bir elektrona çarpar",
  );
}

/** Büyüteç: saçılma ya da bağlanma, yakından. */
function lens(f: SceneFrame, k: number, mode: "scatter" | "bind") {
  if (k <= 0.01) return;
  const { ctx, w, h, t, s } = f;
  const wide = w > h;
  const R = (wide ? h * 0.2 : w * 0.26) * k;
  const cx = wide ? w * 0.74 : w * 0.5;
  const cy = wide ? h * 0.4 : h * 0.34;
  ctx.save();
  drawGlow(ctx, cx, cy, R * 1.5, hex("ffd0a0"), 0.25);
  ctx.fillStyle = mode === "scatter" ? "#3a1a2a" : "#101838";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const u = R / 100;
  if (mode === "scatter") {
    // Dalga soldan gelir, elektrona çarpar, başka yöne saçılır.
    const cyc = (t * 0.55) % 1;
    const ex = cx + Math.sin(t * 20) * 2 * u * (cyc > 0.45 && cyc < 0.6 ? 1 : 0.2);
    const ey = cy;
    drawBalls(ctx, [ex, ey, 9 * u], ...ELECTRON);
    ctx.strokeStyle = "rgba(255,236,170,0.95)";
    ctx.lineWidth = Math.max(1.5, 3 * u);
    ctx.lineCap = "round";
    const inK = Math.min(1, cyc / 0.5);
    const outK = Math.max(0, (cyc - 0.5) / 0.5);
    const a0 = Math.PI;
    const a1 = -0.9;
    if (cyc < 0.5) {
      const hx = cx + Math.cos(a0) * 100 * u * (1 - inK);
      waveLine(ctx, hx - 60 * u, cy, hx, cy, 5 * u, 4, t * 12);
    } else {
      const hx = cx + Math.cos(a1) * 100 * u * outK;
      const hy = cy + Math.sin(a1) * 100 * u * outK;
      waveLine(
        ctx,
        hx - Math.cos(a1) * 60 * u,
        hy - Math.sin(a1) * 60 * u,
        hx,
        hy,
        5 * u,
        4,
        t * 12,
      );
      drawGlow(ctx, ex, ey, 26 * u * (1 - outK), hex("fff4d0"), 0.8);
    }
  } else {
    // Elektron sarmal çizerek protona yaklaşır, yörüngeye oturur: hidrojen atomu.
    const k2 = ((t * 0.35) % 1) * 1.4;
    const bind = Math.min(1, k2);
    drawBalls(ctx, [cx, cy, 13 * u], ...PROTON);
    ctx.strokeStyle = `rgba(140,205,255,${0.6 * bind})`;
    ctx.lineWidth = Math.max(1, 1.6 * u);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44 * u, 18 * u, 0, 0, TAU);
    ctx.stroke();
    const r = 44 * u + (1 - ease.out(bind)) * 50 * u;
    const a = t * 3;
    drawBalls(
      ctx,
      [cx + Math.cos(a) * r, cy + Math.sin(a) * r * (0.41 + 0.59 * (1 - bind)), 6 * u],
      ...ELECTRON,
    );
    // Bağlanırken salınan foton.
    if (k2 > 1 && k2 < 1.4) {
      const q = (k2 - 1) / 0.4;
      ctx.strokeStyle = `rgba(255,236,170,${1 - q})`;
      ctx.lineWidth = Math.max(1.5, 3 * u);
      waveLine(
        ctx,
        cx + 20 * u + q * 60 * u,
        cy - 30 * u - q * 50 * u,
        cx + 50 * u + q * 60 * u,
        cy - 60 * u - q * 50 * u,
        4 * u,
        3,
        t * 12,
      );
    }
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,250,240,0.85)";
  ctx.lineWidth = Math.max(1.5, 2.2 * s);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,250,240,0.95)";
  ctx.font = `600 ${Math.round(Math.max(11, 13 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    mode === "scatter" ? "foton + elektron: saçılma" : "proton + elektron = hidrojen atomu",
    cx,
    cy + R * 0.78,
  );
  ctx.restore();
}

function waveLine(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  cycles: number,
  shift: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const o = Math.sin(u * cycles * TAU - shift) * amp * Math.sin(u * Math.PI);
    const px = x1 + dx * u + nx * o;
    const py = y1 + dy * u + ny * o;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/** Termometre: sıcaklık ~4.000 K'den ~3.000 K'e iner; çizgiyi geçince atomlar oluşur. */
function thermometer(f: SceneFrame, k: number, fall: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const wide = w > h;
  const x = wide ? w * 0.08 : w * 0.1;
  const y0 = h * (wide ? 0.2 : 0.2);
  const H = h * (wide ? 0.3 : 0.3);
  const tw = 14 * s;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, k);
  ctx.fillStyle = "rgba(10,10,24,0.72)";
  roundRect(ctx, x - tw * 0.5 - 12 * s, y0 - 14 * s, tw + 150 * s, H + 64 * s, 14 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, x - tw / 2, y0, tw, H, tw / 2);
  ctx.fill();
  const temp = 4200 - 1300 * fall;
  const lvl = (temp - 2500) / 2000;
  const col = mix(hex("ff8a50"), hex("ffd070"), fall);
  ctx.fillStyle = rgba(col);
  roundRect(ctx, x - tw * 0.3, y0 + H * (1 - lvl), tw * 0.6, H * lvl + tw * 0.5, tw * 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y0 + H + tw * 0.4, tw * 0.9, 0, TAU);
  ctx.fill();
  // 3.000 K çizgisi.
  const ly = y0 + H * (1 - (3000 - 2500) / 2000);
  ctx.strokeStyle = "rgba(255,250,240,0.85)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(x - tw, ly);
  ctx.lineTo(x + tw * 1.4, ly);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `700 ${Math.round(Math.max(12, 15 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${Math.round(temp / 50) * 50} K`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    x + tw * 1.3,
    y0 + H * (1 - lvl),
  );
  ctx.fillStyle = "rgba(215,208,196,0.9)";
  ctx.font = `500 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("3.000 K: atomlar", x + tw * 1.3, ly + 14 * s);
  ctx.restore();
}

/* ---------- Bugün: her yönden gelen ışık ve gökyüzü haritası ---------- */

function sky(f: SceneFrame, into: number) {
  const { ctx, w, h, t, s, beats, dur } = f;
  const [, , b2] = beats;
  const wide = w > h;
  const cx = w * (wide ? 0.62 : 0.5);
  const cy = h * (wide ? 0.44 : 0.42);
  const R0 = Math.min(w, h) * (wide ? 0.36 : 0.42);
  const toMap = phase(t, b2 + 3, b2 + 4.4);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.7);
  bg.addColorStop(0, "#141a3a");
  bg.addColorStop(1, "#05060f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
    ctx.fillStyle = `rgba(255,246,230,${0.2 + 0.4 * tw})`;
    ctx.beginPath();
    ctx.arc(hash(i * 3.9) * w, hash(i * 8.3) * h, (0.5 + hash(i) * 1.1) * s, 0, TAU);
    ctx.fill();
  }

  const circle = 1 - toMap;
  if (circle > 0.01) {
    ctx.save();
    ctx.globalAlpha *= circle;
    const R = R0 * (0.7 + 0.3 * ease.out(into));
    // Son saçılma yüzeyi: ışığın 380.000 yaşında yola çıktığı kabuk.
    drawGlow(ctx, cx, cy, R * 1.25, hex("ff9a50"), 0.18);
    ctx.strokeStyle = "rgba(255,170,100,0.8)";
    ctx.lineWidth = Math.max(2, 5 * s);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    // Fotonlar her yönden içeri akar; yol aldıkça dalga boyu uzar, renk kızılın ötesine kayar.
    ctx.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + hash(i) * 0.1;
      const life = (t * 0.22 + hash(i * 3.1)) % 1;
      const d = R * (1 - life * 0.86);
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const len = R * 0.22;
      const x1 = cx + Math.cos(a) * (d + len);
      const y1 = cy + Math.sin(a) * (d + len);
      const stretch = 1 + life * 3.2;
      const col = mix(hex("ffd070"), hex("b0305a"), life);
      ctx.strokeStyle = rgba(col, 0.9 * Math.min(1, (1 - life) * 4) * Math.min(1, life * 8 + 0.2));
      ctx.lineWidth = Math.max(1.2, 2.2 * s);
      waveLine(ctx, x1, y1, x2, y2, 4 * s, 5 / stretch, t * 8);
    }
    // Dünya: ortada, bugün.
    const earthR = 9 * s;
    drawGlow(ctx, cx, cy, earthR * 3, hex("7fc4ff"), 0.4);
    drawBalls(ctx, [cx, cy, earthR], hex("3f86d8"), hex("1a3a70"), hex("cfe8ff"));
    ctx.restore();
    const k1 = phase(t, b2 + 0.4, b2 + 1.1) * circle;
    callout(
      f,
      cx + R * 0.7,
      cy - R * 0.7,
      "Son saçılma yüzeyi",
      k1,
      wide ? 1 : -1,
      "ışığın yola çıktığı an",
    );
    callout(
      f,
      cx,
      cy,
      "Dünya, bugün",
      phase(t, b2 + 0.9, b2 + 1.6) * circle,
      -1,
      "ışık her yönden gelir",
    );
    stretchCard(f, pop(t, b2 + 1.5, 0.7, b2 + 3, 0.4));
  }

  if (toMap > 0.01) {
    const img = image("/cosmos/sim/cmb.webp");
    const mw = Math.min(w * (wide ? 0.62 : 0.92), h * (wide ? 0.62 : 0.5) * 2);
    const mh = mw / 2;
    const zoom = 1 + 0.03 * phase(t, b2 + 4.4, dur);
    const mx = wide ? cx : w / 2;
    ctx.save();
    ctx.globalAlpha *= toMap;
    ctx.translate(mx, cy);
    ctx.scale(zoom * (0.6 + 0.4 * ease.out(toMap)), zoom * (0.6 + 0.4 * ease.out(toMap)));
    ctx.beginPath();
    ctx.ellipse(0, 0, mw / 2, mh / 2, 0, 0, TAU);
    ctx.save();
    ctx.clip();
    if (img) ctx.drawImage(img, -mw / 2, -mh / 2, mw, mh);
    ctx.restore();
    ctx.strokeStyle = "rgba(243,238,226,0.5)";
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
    ctx.restore();
    const legend = phase(t, b2 + 4.2, b2 + 5);
    if (legend > 0.01) {
      const lw = Math.min(mw * 0.55, 260 * s);
      const lx = mx - lw / 2;
      const ly = cy + mh / 2 + 22 * s;
      ctx.save();
      ctx.globalAlpha *= legend;
      const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      (
        [
          [0, "rgb(0,0,150)"],
          [0.19, "rgb(0,110,250)"],
          [0.36, "rgb(125,205,255)"],
          [0.5, "rgb(255,238,218)"],
          [0.65, "rgb(255,176,72)"],
          [0.82, "rgb(236,72,22)"],
          [1, "rgb(110,0,0)"],
        ] as [number, string][]
      ).forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g;
      roundRect(ctx, lx, ly, lw, 7 * s, 3.5 * s);
      ctx.fill();
      ctx.fillStyle = "rgba(243,238,226,0.9)";
      ctx.font = `500 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("−300 µK", lx, ly + 12 * s);
      ctx.textAlign = "right";
      ctx.fillText("+300 µK", lx + lw, ly + 12 * s);
      ctx.textAlign = "center";
      ctx.fillText("ortalama 2,725 K", lx + lw / 2, ly + 28 * s);
      ctx.fillStyle = "rgba(168,161,148,0.85)";
      ctx.font = `400 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
      ctx.fillText("Planck güç spektrumuyla simülasyon", lx + lw / 2, ly + 45 * s);
      ctx.restore();
    }
    badge(
      f,
      mx,
      h * (wide ? 0.13 : 0.1),
      "Bütün gökyüzü · kozmik mikrodalga arka plan",
      phase(t, b2 + 3.8, b2 + 4.4),
    );
  }
}

/** Dalga boyu kartı: 3.000 K'lik ışık, evren ~1.100 kat genişleyince 2,7 K'lik mikrodalga olur. */
function stretchCard(f: SceneFrame, k: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, t, s } = f;
  const wide = w > h;
  const cw = Math.min(w * 0.9, 250 * s);
  const ch = 118 * s;
  const x = wide ? w * 0.05 : (w - cw) / 2;
  const y = wide ? h * 0.22 : h * 0.78;
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
  ctx.fillText("Dalga yolda uzar", 14 * s, 20 * s);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, 2.4 * s);
  ctx.strokeStyle = "#ffd070";
  waveLine(ctx, 14 * s, 48 * s, cw - 14 * s, 48 * s, 7 * s, 14, t * 6);
  ctx.strokeStyle = "#c04a6a";
  waveLine(ctx, 14 * s, 80 * s, cw - 14 * s, 80 * s, 7 * s, 2.2, t * 2);
  ctx.fillStyle = "rgba(215,208,196,0.92)";
  ctx.font = `500 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("o zaman: ~3.000 K, turuncu ışık", 14 * s, 62 * s);
  ctx.fillText("bugün: 2,7 K, mikrodalga", 14 * s, 100 * s);
  ctx.restore();
}
