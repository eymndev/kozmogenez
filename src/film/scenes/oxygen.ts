import { callout, hash, roundRect, type Ctx, type SceneFrame } from "@/film/scenes/kit";
import {
  blob,
  curve,
  drawBalls,
  drawGlow,
  ease,
  hex,
  layer,
  phase,
  pop,
  rgba,
  type RGB,
} from "@/film/scenes/art";

/**
 * Oksijen, sonra çekirdek. Güneşli sığ bir denizde stromatolit tepecikleri; birinin tepesindeki
 * mikrop halısına yaklaşınca siyanobakteri iplikleri ve saldıkları oksijen kabarcıkları. Oksijen
 * denizdeki çözünmüş demiri paslandırır, pas taneleri çöker ve kırmızı–gri bantlı demir yatakları
 * birikir; havadaki oksijen grafiği 2,4 milyar yıl önce basamak yapar, oksijensiz yaşayan
 * mikroplar geriler. Sonra bir arke hücresi bir bakteriyi sarar ama sindirmez: bakteri
 * mitokondriye, hücre çekirdekli bir ökaryota dönüşür.
 */
export function oxygen(f: SceneFrame) {
  const { t, beats } = f;
  const [b0, , b2] = beats;
  const G = geo(f);
  const cell = phase(t, b2 - 0.4, b2 + 0.6);
  const zin = ease.inOut(phase(t, b0 + 0.2, b0 + 1.4));
  const zout = ease.inOut(phase(t, b0 + 3.6, b0 + 4.8));
  const micro = phase(t, b0 + 0.8, b0 + 1.4) * (1 - phase(t, b0 + 3.6, b0 + 4.3));
  if (cell < 1) {
    const Z = 1 + 3 * (zin - zout * zin);
    ocean(f, G, Z, 1 - cell);
    if (micro > 0.01) mat(f, G, micro * (1 - cell));
  }
  if (cell > 0.01) endosymbiosis(f, G, cell);
  o2Chart(f);
  bifCard(f);
  labels(f, G, micro, cell);
}

const TAU = Math.PI * 2;
const lin = (x: number) => x;

type Geo = ReturnType<typeof geo>;

function geo(f: SceneFrame) {
  const wide = f.w > f.h;
  const { w, h } = f;
  return {
    wide,
    wl: h * (wide ? 0.2 : 0.16),
    floor: h * (wide ? 0.8 : 0.66),
    // Stromatolitler: x, yükseklik, genişlik (ekran oranı).
    stroma: (wide
      ? [
          [0.4, 0.13, 0.034],
          [0.52, 0.19, 0.04],
          [0.66, 0.27, 0.05],
          [0.79, 0.2, 0.042],
          [0.91, 0.14, 0.034],
        ]
      : [
          [0.12, 0.1, 0.07],
          [0.32, 0.16, 0.085],
          [0.56, 0.22, 0.1],
          [0.82, 0.15, 0.085],
        ]) as [number, number, number][],
    hero: wide ? 2 : 2,
    m: Math.min(w, h),
  };
}

/** Kahramanın (yaklaşılan stromatolitin) tepesi. */
function heroTop(f: SceneFrame, G: Geo): [number, number] {
  const [x, hh] = G.stroma[G.hero];
  return [x * f.w, G.floor - hh * f.h];
}

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
  ctx.restore();
}

/* ---------- Sığ deniz ---------- */

function ocean(f: SceneFrame, G: Geo, Z: number, alpha: number) {
  const { ctx, w, h, t, s } = f;
  const [, b1, b2] = f.beats;
  const [hx, hy] = heroTop(f, G);
  const img = layer(f, "oksijen-deniz", (g) => seaScene(g, w, h, s, G));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(hx, hy);
  ctx.scale(Z, Z);
  ctx.translate(-hx, -hy);
  ctx.drawImage(img, 0, 0, w, h);
  // Suya süzülen ışık.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let j = 0; j < 6; j++) {
    const x = w * (0.08 + j * 0.17) + Math.sin(t * 0.3 + j) * 20 * s;
    const g = ctx.createLinearGradient(0, G.wl, 0, G.floor);
    g.addColorStop(0, `rgba(200,255,230,${0.1 + 0.04 * Math.sin(t * 0.8 + j)})`);
    g.addColorStop(1, "rgba(200,255,230,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 24 * s, G.wl);
    ctx.lineTo(x + 24 * s, G.wl);
    ctx.lineTo(x + 130 * s, G.floor);
    ctx.lineTo(x + 50 * s, G.floor);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Dalgalı yüzey.
  ctx.strokeStyle = "rgba(230,255,250,0.7)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8 * s) {
    const y = G.wl + Math.sin(x * 0.02 + t * 1.5) * 2.5 * s;
    if (x) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  // Mikrop halılarının parıltısı ve yükselen oksijen kabarcıkları.
  const bub = phase(t, f.beats[0] + 3.8, f.beats[0] + 4.6);
  const bubbles: number[] = [];
  G.stroma.forEach(([x, hh, ww], k) => {
    const tx = x * w;
    const ty = G.floor - hh * h;
    drawGlow(ctx, tx, ty, ww * w * 0.9, hex("5affc8"), 0.35 + 0.1 * Math.sin(t * 2 + k));
    if (bub <= 0.01) return;
    for (let j = 0; j < 9; j++) {
      const u = (t * 0.22 + j / 9 + hash(k * 7 + j) * 0.3) % 1;
      const bx = tx + (hash(k * 5 + j) - 0.5) * ww * w * 0.9 + Math.sin(u * 12 + j) * 4 * s;
      const by = ty - u * (ty - G.wl);
      bubbles.push(bx, by, (1.6 + u * 2.4) * s * bub);
    }
  });
  if (bubbles.length) {
    ctx.strokeStyle = "rgba(230,255,255,0.85)";
    ctx.lineWidth = Math.max(1, 1.1 * s);
    ctx.fillStyle = "rgba(200,245,255,0.25)";
    ctx.beginPath();
    for (let k = 0; k < bubbles.length; k += 3) {
      ctx.moveTo(bubbles[k] + bubbles[k + 2], bubbles[k + 1]);
      ctx.arc(bubbles[k], bubbles[k + 1], bubbles[k + 2], 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }
  // Demir: çözünmüş Fe²⁺ (yeşil) oksijenle pas tanelerine (kırmızı) döner ve çöker.
  const iron = phase(t, b1 - 0.8, b1);
  if (iron > 0.01) {
    const green: number[] = [];
    const rust: number[] = [];
    for (let i = 0; i < 90; i++) {
      const x = w * (G.wide ? 0.3 + hash(i * 2.3) * 0.7 : hash(i * 2.3));
      const y0 = G.wl + (G.floor - G.wl) * (0.1 + hash(i * 4.1) * 0.75);
      const ox = b1 + 0.2 + hash(i * 6.7) * 3.2;
      const dx = Math.sin(t * 0.6 + i) * 6 * s;
      if (t < ox) {
        green.push(x + dx, y0 + Math.cos(t * 0.5 + i) * 4 * s, 3.4 * s);
      } else {
        const y = y0 + (t - ox) * 60 * s;
        if (y < G.floor - 4 * s) rust.push(x + dx, y, 3.8 * s);
      }
    }
    drawBalls(ctx, green, hex("8fe0a0"), hex("3a8a58"), hex("e8fff0"), iron);
    drawBalls(ctx, rust, hex("e0643a"), hex("8a2a18"), hex("ffc0a0"), iron);
    // Tabanda biriken kırmızı katman.
    const layerK = phase(t, b1 + 0.8, b2);
    if (layerK > 0.01) {
      ctx.fillStyle = `rgba(190,70,40,${0.75 * layerK})`;
      ctx.fillRect(0, G.floor - 3 * s, w, (4 + 12 * layerK) * s);
    }
  }
  // Oksijensiz yaşayan mikroplar: oksijen yaklaşınca sönerler, bazıları çamura çekilir.
  const anK = phase(t, b1 + 2.4, b1 + 3);
  if (anK > 0.01) {
    for (let j = 0; j < 12; j++) {
      const x = w * (G.wide ? 0.34 + hash(j * 3.9) * 0.64 : 0.05 + hash(j * 3.9) * 0.9);
      const y = G.floor - (8 + hash(j * 5.3) * 40) * s;
      const die = phase(t, b1 + 3.6 + hash(j * 7.1) * 1.8, b1 + 4.4 + hash(j * 7.1) * 1.8);
      const hide = j % 4 === 0;
      const yy = y + (hide ? die * 30 * s : 0);
      const r = 6 * s * (hide ? 1 : 1 - 0.5 * die);
      const col = hide ? "#b070e0" : die > 0.5 ? "#6a6a78" : "#b070e0";
      ctx.save();
      ctx.globalAlpha = alpha * anK * (hide ? 1 - die * 0.8 : 1 - die * 0.4);
      toon(ctx, x, yy, r, 1.4, 0.8, j, col, "#5a3080");
      ctx.restore();
    }
  }
  ctx.restore();
}

function seaScene(g: Ctx, w: number, h: number, s: number, G: Geo) {
  const sky = g.createLinearGradient(0, 0, 0, G.wl);
  sky.addColorStop(0, "#7a9ab8");
  sky.addColorStop(1, "#f0d8b0");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, G.wl);
  drawGlow(g, w * 0.2, G.wl * 0.45, G.m * 0.4, hex("fff0c0"), 0.8);
  g.fillStyle = "#fffbe8";
  g.beginPath();
  g.arc(w * 0.2, G.wl * 0.45, G.m * 0.03, 0, TAU);
  g.fill();
  const sea = g.createLinearGradient(0, G.wl, 0, h);
  sea.addColorStop(0, "#3ab8b0");
  sea.addColorStop(0.45, "#16707c");
  sea.addColorStop(1, "#08323e");
  g.fillStyle = sea;
  g.fillRect(0, G.wl, w, h - G.wl);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(210,255,245,${0.06 + hash(i * 2.3) * 0.14})`;
    g.beginPath();
    g.arc(hash(i * 1.1) * w, G.wl + hash(i * 3.7) * (h - G.wl), (0.6 + hash(i) * 1.4) * s, 0, TAU);
    g.fill();
  }
  // Deniz tabanı.
  g.fillStyle = "#6a5a48";
  g.beginPath();
  g.moveTo(0, G.floor);
  for (let x = 0; x <= w; x += 20 * s)
    g.lineTo(x, G.floor + Math.sin(x * 0.013) * 4 * s + hash(x) * 3 * s);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  const mud = g.createLinearGradient(0, G.floor, 0, h);
  mud.addColorStop(0, "rgba(40,30,30,0)");
  mud.addColorStop(1, "rgba(20,14,18,0.8)");
  g.fillStyle = mud;
  g.fillRect(0, G.floor, w, h - G.floor);
  // Uzakta, soluk küçük stromatolitler.
  for (let j = 0; j < 9; j++) {
    const x = w * (0.05 + j * 0.115 + hash(j * 3.3) * 0.04);
    const hh = h * (0.04 + hash(j * 5.1) * 0.05);
    const rw = w * (0.015 + hash(j * 2.2) * 0.01);
    g.fillStyle = "rgba(60,90,90,0.55)";
    g.fill(stromaPath(x, G.floor - 6 * s, hh, rw, j + 40, s));
  }
  // Stromatolitler: katman katman büyüyen mikrop sütunları, tepeleri topaklı.
  G.stroma.forEach(([x, hh, ww], k) => {
    const cx = x * w;
    const top = G.floor - hh * h;
    const rw = ww * w;
    const path = stromaPath(cx, G.floor + 6 * s, hh * h + 6 * s, rw, k, s);
    g.save();
    g.fillStyle = "#3a3024";
    g.fill(path);
    g.clip(path);
    g.save();
    g.translate(-rw * 0.18, -rw * 0.1);
    g.fillStyle = "#8a7458";
    g.fill(path);
    g.restore();
    // İnce katmanlar: tepenin kavsini izleyen, üst üste binmiş yaylar.
    for (let q = 0; q < 16; q++) {
      const yy = top + ((G.floor - top) * (q + 0.3)) / 16;
      g.strokeStyle = q % 2 ? "rgba(50,40,30,0.5)" : "rgba(200,180,140,0.32)";
      g.lineWidth = ((G.floor - top) / 16) * 0.45;
      g.beginPath();
      g.moveTo(cx - rw * 1.6, yy + rw * 0.5);
      g.quadraticCurveTo(cx, yy - rw * 0.35, cx + rw * 1.6, yy + rw * 0.5);
      g.stroke();
    }
    g.restore();
    // Tepedeki canlı halı: siyanobakteriler.
    g.fillStyle = "#3fbf9f";
    g.beginPath();
    g.ellipse(cx, top + 5 * s, rw * 1.02, 7 * s, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = "rgba(170,255,225,0.7)";
    g.beginPath();
    g.ellipse(cx - rw * 0.3, top + 2 * s, rw * 0.36, 2.2 * s, 0, Math.PI, TAU);
    g.fill();
  });
}

/** Sütun biçimli stromatolit: dar gövde, topaklı ve geniş bir tepe. */
function stromaPath(cx: number, base: number, hh: number, rw: number, seed: number, s: number) {
  const top = base - hh;
  const raw: [number, number][] = [
    [cx - rw * 0.95, base],
    [cx - rw * 0.8, base - hh * 0.3],
    [cx - rw * 0.88, base - hh * 0.6],
    [cx - rw * 1.1, base - hh * 0.8],
    [cx - rw * 0.75, top + hh * 0.04],
    [cx - rw * 0.25, top],
    [cx + rw * 0.3, top + hh * 0.01],
    [cx + rw * 0.8, top + hh * 0.05],
    [cx + rw * 1.1, base - hh * 0.8],
    [cx + rw * 0.9, base - hh * 0.6],
    [cx + rw * 0.82, base - hh * 0.3],
    [cx + rw * 0.95, base],
  ];
  const pts = raw.map(
    ([x, y], q) =>
      [
        x + (hash(seed * 11 + q) - 0.5) * rw * 0.16,
        y + (q > 2 && q < 9 ? (hash(seed * 7 + q) - 0.5) * 6 * s : 0),
      ] as [number, number],
  );
  const p = new Path2D();
  curve(p, pts, false);
  p.lineTo(cx + rw * 0.95, base + 10 * s);
  p.lineTo(cx - rw * 0.95, base + 10 * s);
  p.closePath();
  return p;
}

/* ---------- Mikrop halısı ---------- */

function mat(f: SceneFrame, G: Geo, a: number) {
  const { ctx, w, h, t, s } = f;
  ctx.save();
  ctx.globalAlpha = a;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#5ad0c0");
  bg.addColorStop(1, "#0e5a5a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let j = 0; j < 5; j++) {
    const x = w * (0.1 + j * 0.22) + Math.sin(t * 0.4 + j) * 20 * s;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,220,0.16)");
    g.addColorStop(1, "rgba(255,255,220,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30 * s, 0);
    ctx.lineTo(x + 30 * s, 0);
    ctx.lineTo(x + 160 * s, h);
    ctx.lineTo(x + 60 * s, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Siyanobakteri iplikleri: hücre hücre dizili, hafifçe dalgalanan zincirler.
  const cw = G.m * (G.wide ? 0.062 : 0.075);
  const rows = G.wide ? 5 : 6;
  const y00 = h * (G.wide ? 0.52 : 0.38);
  const step = cw * 1.14;
  const tops: number[] = [];
  for (let r = rows - 1; r >= 0; r--) {
    const y0 = y00 + r * cw * 1.25;
    const n = Math.ceil(w / step) + 2;
    const off = (hash(r * 3.1) * cw + t * (r % 2 ? 7 : -6) * s) % step;
    const dark = r / rows;
    for (let k = -1; k < n; k++) {
      const x = k * step + off;
      const ph = x * 0.008 + r * 1.7 + t * 0.6;
      const y = y0 + Math.sin(ph) * cw * 0.4;
      const ang = Math.cos(ph) * 0.3;
      if (r === 0 && k % 3 === 1) tops.push(x, y - cw * 0.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = rgba([24 - dark * 10, 110 - dark * 40, 96 - dark * 30]);
      roundRect(ctx, -cw * 0.5, -cw * 0.36, cw, cw * 0.72, cw * 0.3);
      ctx.fill();
      ctx.fillStyle = rgba([62 - dark * 20, 190 - dark * 60, 150 - dark * 40]);
      roundRect(ctx, -cw * 0.5, -cw * 0.36, cw * 0.95, cw * 0.6, cw * 0.28);
      ctx.fill();
      // Tilakoit zarları: ışığı yakalayan ince çizgiler.
      ctx.strokeStyle = "rgba(180,255,215,0.55)";
      ctx.lineWidth = cw * 0.045;
      ctx.beginPath();
      for (let q = -1; q <= 1; q++) {
        ctx.moveTo(-cw * 0.32, q * cw * 0.13 - cw * 0.04);
        ctx.lineTo(cw * 0.28, q * cw * 0.13 - cw * 0.04);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  // Oksijen kabarcıkları: üstteki hücrelerden kopup yükselir.
  const pts: number[] = [];
  for (let j = 0; j < tops.length / 2; j++) {
    for (let q = 0; q < 2; q++) {
      const u = (t * 0.28 + hash(j * 2.7 + q * 9.1)) % 1;
      const x = tops[j * 2] + Math.sin(u * 10 + j) * 10 * s;
      const y = tops[j * 2 + 1] - u * tops[j * 2 + 1];
      pts.push(x, y, (4 + u * 9) * s);
    }
  }
  ctx.strokeStyle = "rgba(240,255,255,0.95)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.fillStyle = "rgba(220,250,255,0.35)";
  ctx.beginPath();
  for (let k = 0; k < pts.length; k += 3) {
    ctx.moveTo(pts[k] + pts[k + 2], pts[k + 1]);
    ctx.arc(pts[k], pts[k + 1], pts[k + 2], 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  for (let k = 0; k < pts.length; k += 3) {
    const r = pts[k + 2];
    ctx.moveTo(pts[k] - r * 0.3 + r * 0.22, pts[k + 1] - r * 0.35);
    ctx.arc(pts[k] - r * 0.3, pts[k + 1] - r * 0.35, r * 0.22, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = "rgba(20,70,80,0.9)";
  ctx.font = `700 ${Math.round(Math.max(8, 9.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let k = 0; k < pts.length; k += 6)
    if (pts[k + 2] > 9 * s) ctx.fillText("O₂", pts[k], pts[k + 1] + pts[k + 2] * 0.12);
  ctx.restore();
}

/* ---------- Kartlar ---------- */

/** Havadaki oksijen: 2,4 milyar yıl önce basamak, bugünkü düzey çok sonra. */
function o2Chart(f: SceneFrame) {
  const { ctx, w, h, t, s } = f;
  const [, b1, b2] = f.beats;
  const k = pop(t, b1 + 0.3, 0.6, b2 - 0.8, 0.5);
  if (k <= 0.01) return;
  const wide = w > h;
  const cw = Math.min(w * 0.92, 300 * s);
  const ch = 140 * s;
  const x = wide ? w * 0.04 : (w - cw) / 2;
  const y = wide ? h * 0.26 : h * 0.19;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(6,18,26,0.9)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 13.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Havadaki oksijen", 14 * s, 18 * s);
  const px0 = 30 * s;
  const px1 = cw - 14 * s;
  const py0 = ch - 26 * s;
  const py1 = 36 * s;
  ctx.strokeStyle = "rgba(200,210,220,0.5)";
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.moveTo(px0, py1);
  ctx.lineTo(px0, py0);
  ctx.lineTo(px1, py0);
  ctx.stroke();
  // Değer (bugünün yüzdesi), karekök ölçeğinde.
  const o2 = (ga: number) =>
    ga > 2.45
      ? 0.001
      : ga > 2.3
        ? 2 * ((2.45 - ga) / 0.15)
        : ga > 0.8
          ? 2 + (2.3 - ga)
          : ga > 0.4
            ? 3.5 + ((0.8 - ga) / 0.4) * 96.5
            : 100;
  const X = (ga: number) => px0 + ((4 - ga) / 4) * (px1 - px0);
  const Y = (v: number) => py0 - Math.sqrt(v / 100) * (py0 - py1);
  const now = 2.5 - 0.1 * phase(t, f.beats[0], b1, lin) - 0.4 * phase(t, b1, b2, lin);
  ctx.lineWidth = Math.max(1.5, 2.2 * s);
  ctx.strokeStyle = "#7fe0ff";
  ctx.beginPath();
  for (let ga = 4; ga >= now; ga -= 0.02) {
    if (ga === 4) ctx.moveTo(X(ga), Y(o2(ga)));
    else ctx.lineTo(X(ga), Y(o2(ga)));
  }
  ctx.stroke();
  ctx.setLineDash([3 * s, 4 * s]);
  ctx.strokeStyle = "rgba(127,224,255,0.4)";
  ctx.beginPath();
  for (let ga = now; ga >= 0; ga -= 0.02) {
    if (ga === now) ctx.moveTo(X(ga), Y(o2(ga)));
    else ctx.lineTo(X(ga), Y(o2(ga)));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  drawBalls(ctx, [X(now), Y(o2(now)), 4 * s], hex("ffd27a"), hex("a07a20"), hex("fff6e0"));
  ctx.fillStyle = "rgba(210,215,220,0.85)";
  ctx.font = `400 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("4", X(4), py0 + 5 * s);
  ctx.fillText("2,4", X(2.4), py0 + 5 * s);
  ctx.fillText("bugün", X(0) - 8 * s, py0 + 5 * s);
  ctx.textAlign = "left";
  ctx.fillText("milyar yıl önce", X(3.6), py0 + 5 * s);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd27a";
  ctx.font = `600 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Büyük Oksitlenme", X(2.4) + 6 * s, Y(3) - 12 * s);
  ctx.save();
  ctx.translate(12 * s, (py0 + py1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(210,215,220,0.8)";
  ctx.font = `400 ${Math.round(Math.max(8.5, 9.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("bugünkü düzeye oranla", 0, 0);
  ctx.restore();
  ctx.restore();
}

/** Bantlı demir yatağı: pas kırmızısı ve gri çört katmanları, alttan yukarı birikir. */
function bifCard(f: SceneFrame) {
  const { ctx, w, h, t, s } = f;
  const [, b1, b2] = f.beats;
  const k = pop(t, b1 + 1.4, 0.6, b2 - 0.6, 0.5);
  if (k <= 0.01) return;
  const wide = w > h;
  const cw = wide ? 200 * s : Math.min(w * 0.42, 170 * s);
  const ch = wide ? 150 * s : 128 * s;
  const x = wide ? w * 0.96 - cw : (w - cw) / 2;
  const y = wide ? h * 0.3 : h * 0.62;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,10,16,0.9)";
  roundRect(ctx, 0, 0, cw, ch, 14 * s);
  ctx.fill();
  const rx0 = 10 * s;
  const ry0 = 10 * s;
  const rw = cw - 20 * s;
  const rh = ch - 44 * s;
  ctx.save();
  roundRect(ctx, rx0, ry0, rw, rh, 8 * s);
  ctx.clip();
  ctx.fillStyle = "#2a2430";
  ctx.fillRect(rx0, ry0, rw, rh);
  const grow = phase(t, b1 + 1.6, b2 - 0.8, lin);
  const bands = 16;
  for (let q = 0; q < bands; q++) {
    if (q / bands > grow) break;
    const yb = ry0 + rh - ((q + 1) / bands) * rh;
    const col = q % 2 ? "#9a9aa6" : ["#c04a2e", "#a83a26", "#d0643a"][q % 3];
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(rx0, yb + rh / bands);
    for (let xx = 0; xx <= rw; xx += 6 * s) {
      ctx.lineTo(rx0 + xx, yb + Math.sin(xx * 0.05 + q) * 2 * s + hash(q * 9 + xx) * 1.5 * s);
    }
    ctx.lineTo(rx0 + rw, yb + rh / bands);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(255,250,240,0.96)";
  ctx.font = `600 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Bantlı demir yatağı", 12 * s, ch - 23 * s);
  ctx.fillStyle = "rgba(210,205,200,0.9)";
  ctx.font = `400 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("pas kırmızısı ve gri çört", 12 * s, ch - 10 * s);
  ctx.restore();
}

/* ---------- Ortaklık: mitokondri ve çekirdek ---------- */

function endosymbiosis(f: SceneFrame, G: Geo, alpha: number) {
  const { ctx, w, h, t, s } = f;
  const [, , b2] = f.beats;
  ctx.save();
  ctx.globalAlpha = alpha;
  const bg = ctx.createRadialGradient(
    w * 0.6,
    h * 0.45,
    0,
    w * 0.6,
    h * 0.45,
    Math.max(w, h) * 0.8,
  );
  bg.addColorStop(0, "#14505a");
  bg.addColorStop(1, "#061c24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(190,240,235,${0.08 + hash(i) * 0.12})`;
    ctx.beginPath();
    ctx.arc(
      (hash(i * 1.7) * w + t * 4 * s) % w,
      hash(i * 3.1) * h,
      (1 + hash(i * 2) * 2) * s,
      0,
      TAU,
    );
    ctx.fill();
  }
  const cx = w * (G.wide ? 0.6 : 0.5);
  const cy = h * (G.wide ? 0.45 : 0.38);
  const R = G.wide ? h * 0.26 : w * 0.34;
  // Bakteri yaklaşır, kolların arasına alınır, içeride mitokondriye dönüşür.
  const come = ease.inOut(phase(t, b2 + 0.2, b2 + 1.8));
  const wrap = ease.inOut(phase(t, b2 + 1.4, b2 + 2.6));
  const inside = ease.inOut(phase(t, b2 + 2.4, b2 + 3.4));
  const mito = ease.inOut(phase(t, b2 + 3.2, b2 + 4.2));
  const split = ease.inOut(phase(t, b2 + 4.6, b2 + 5.6));
  const nuc = ease.inOut(phase(t, b2 + 3.6, b2 + 4.8));
  const ba = -0.35;
  const bx0 = cx + Math.cos(ba) * R * 2.3;
  const by0 = cy + Math.sin(ba) * R * 2.3;
  const bx1 = cx + Math.cos(ba) * R * 1.12;
  const by1 = cy + Math.sin(ba) * R * 1.12;
  const bx2 = cx + R * 0.42;
  const by2 = cy - R * 0.08;
  const bx = bx0 + (bx1 - bx0) * come + (bx2 - bx1) * inside;
  const by = by0 + (by1 - by0) * come + (by2 - by1) * inside;
  // Konak: arke hücresi. Önce yüzeyinden uzanan yumuşak çıkıntılar (gövdenin arkasında).
  drawGlow(ctx, cx, cy, R * 1.6, hex("ff9a6a"), 0.2);
  ctx.lineCap = "round";
  for (let q = 0; q < 11; q++) {
    const a = (q / 11) * TAU + 0.2;
    const d = Math.atan2(Math.sin(a - ba), Math.cos(a - ba));
    const x0 = cx + Math.cos(a) * R * 0.88;
    const y0 = cy + Math.sin(a) * R * 0.88;
    const sw = Math.sin(t * 0.9 + q * 1.7) * 0.25;
    const len = R * (0.2 + 0.07 * Math.sin(t * 1.3 + q * 2));
    let x1 = cx + Math.cos(a + sw * 0.4) * (R + len);
    let y1 = cy + Math.sin(a + sw * 0.4) * (R + len);
    if (Math.abs(d) < 0.75) {
      // Bakteriyi iki yandan kavrayan uçlar.
      const side = d < 0 ? -1 : 1;
      const tx = bx - Math.sin(ba) * side * R * 0.26 + Math.cos(ba) * R * 0.16;
      const ty = by + Math.cos(ba) * side * R * 0.26 + Math.sin(ba) * R * 0.16;
      const k = wrap * (1 - inside);
      x1 += (tx - x1) * k;
      y1 += (ty - y1) * k;
    }
    const mx = (x0 + x1) / 2 - Math.sin(a) * sw * R * 0.2;
    const my = (y0 + y1) / 2 + Math.cos(a) * sw * R * 0.2;
    for (const [col, lw] of [
      ["#e0785a", 0.12],
      ["#f4a07a", 0.075],
    ] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = R * lw;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
    }
    drawBalls(ctx, [x1, y1, R * 0.06], hex("f4a07a"), hex("c06848"), hex("ffe0c8"));
  }
  ctx.save();
  ctx.fillStyle = "#e0785a";
  blob(ctx, cx, cy, R, 5, { n: 14, wobble: 0.06, t, live: 0.03 });
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "#f4a07a";
  blob(ctx, cx - R * 0.08, cy - R * 0.1, R * 0.98, 5, { n: 14, wobble: 0.06, t, live: 0.03 });
  ctx.fill();
  const inner = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  inner.addColorStop(0, "rgba(255,230,200,0.4)");
  inner.addColorStop(1, "rgba(255,230,200,0)");
  ctx.fillStyle = inner;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  // Konağın DNA'sı; sonra çevresinde çekirdek zarı belirir.
  const nx = cx - R * 0.28;
  const ny = cy + R * 0.12;
  const nr = R * 0.34;
  if (nuc > 0.01) {
    ctx.fillStyle = `rgba(120,80,170,${0.55 * nuc})`;
    ctx.beginPath();
    ctx.arc(nx, ny, nr * (0.6 + 0.4 * nuc), 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "#8a4ad0";
  ctx.lineWidth = R * 0.03;
  ctx.beginPath();
  for (let q = 0; q <= 160; q++) {
    const a = (q / 160) * TAU;
    const r0 = nr * (0.55 + 0.1 * Math.sin(a * 3 + t * 0.4));
    const x = nx + Math.cos(a) * r0 + Math.cos(a * 9 + t * 0.3) * nr * 0.16;
    const y = ny + Math.sin(a) * r0 + Math.sin(a * 9 + t * 0.3) * nr * 0.16;
    if (q) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  if (nuc > 0.01) {
    ctx.strokeStyle = `rgba(250,230,255,${0.9 * nuc})`;
    ctx.lineWidth = R * 0.025;
    ctx.setLineDash([R * 0.08, R * 0.025]);
    ctx.beginPath();
    ctx.arc(nx, ny, nr * (0.6 + 0.4 * nuc), 0, TAU * nuc);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Bakteri → mitokondri (ve bölünme).
  const count = split > 0.5 ? 2 : 1;
  for (let q = 0; q < count; q++) {
    const off = split * R * 0.26 * (q ? 1 : -1);
    mitochondrion(ctx, bx + off * 0.3, by + off, R * 0.2, mito, t + q, split);
  }
  ctx.restore();
}

/** Bakteri (yeşil çubuk, kamçılı) → mitokondri (turuncu fasulye, iç zar kıvrımlı). */
function mitochondrion(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  k: number,
  t: number,
  split: number,
) {
  const base: RGB = [127 + (255 - 127) * k, 208 + (138 - 208) * k, 120 + (92 - 120) * k];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.4 + Math.sin(t * 0.8) * 0.1);
  const sq = 1 - 0.25 * Math.sin(Math.PI * split);
  ctx.scale(1, sq);
  if (k < 0.6) {
    ctx.strokeStyle = rgba(base, 1 - k / 0.6);
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    for (let q = 0; q <= 12; q++) {
      const xx = r * 1.2 + q * r * 0.12;
      const yy = Math.sin(q * 1.1 + t * 7) * r * 0.15;
      if (q) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.fillStyle = rgba([base[0] * 0.6, base[1] * 0.6, base[2] * 0.6]);
  roundRect(ctx, -r * 1.2, -r * 0.55, r * 2.4, r * 1.1, r * 0.55);
  ctx.fill();
  ctx.fillStyle = rgba(base);
  roundRect(ctx, -r * 1.2, -r * 0.55, r * 2.3, r * 0.98, r * 0.5);
  ctx.fill();
  if (k > 0.05) {
    // Kıvrımlı iç zar (krista).
    ctx.strokeStyle = `rgba(255,220,190,${0.9 * k})`;
    ctx.lineWidth = r * 0.09;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let q = 0; q <= 8; q++) {
      const xx = -r * 0.95 + q * r * 0.24;
      ctx.lineTo(xx, q % 2 ? r * 0.3 : -r * 0.3);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, -r * 0.3, r * 0.4, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ---------- Etiketler ---------- */

function labels(f: SceneFrame, G: Geo, micro: number, cell: number) {
  const { ctx, t, w, h, s } = f;
  const [b0, b1, b2] = f.beats;
  const wide = G.wide;
  const sea = 1 - cell;
  const [hx, hy] = heroTop(f, G);
  callout(
    f,
    hx - 10 * s,
    hy - 2 * s,
    "Stromatolit",
    phase(t, b0 - 0.6, b0) * (1 - phase(t, b0 + 0.3, b0 + 0.6)),
    wide ? -1 : 1,
    "mikrop katmanlarından tepecik",
  );
  if (micro > 0.3) {
    callout(
      f,
      w * (wide ? 0.62 : 0.5),
      h * (wide ? 0.5 : 0.36) - G.m * 0.02,
      "Siyanobakteriler",
      phase(t, b0 + 1.5, b0 + 2.1) * (1 - phase(t, b0 + 3.3, b0 + 3.6)),
      -1,
      "ışıkla suyu parçalar, O₂ salar",
      wide ? 2 : 1.4,
    );
    const k = pop(t, b0 + 1.9, 0.6, b0 + 3.4, 0.4);
    if (k > 0.01) {
      const bw = Math.min(w * 0.9, 330 * s);
      const bx = wide ? w * 0.04 : (w - bw) / 2;
      const by = wide ? h * 0.13 : h * 0.1;
      ctx.save();
      ctx.translate(bx + bw / 2, by + 26 * s);
      ctx.scale(k, k);
      ctx.translate(-bw / 2, -26 * s);
      ctx.fillStyle = "rgba(6,30,34,0.88)";
      roundRect(ctx, 0, 0, bw, 52 * s, 14 * s);
      ctx.fill();
      ctx.fillStyle = "rgba(255,250,240,0.96)";
      ctx.font = `600 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Oksijenli fotosentez", bw / 2, 16 * s);
      ctx.fillStyle = "#9ff0d8";
      ctx.font = `500 ${Math.round(Math.max(10.5, 12 * s))}px Outfit, system-ui, sans-serif`;
      ctx.fillText("su + CO₂ + ışık → şeker + O₂", bw / 2, 36 * s);
      ctx.restore();
    }
  }
  if (sea > 0.01) {
    callout(
      f,
      w * (wide ? 0.5 : 0.3),
      G.wl + (G.floor - G.wl) * 0.35,
      "Çözünmüş demir",
      phase(t, b1 - 0.4, b1 + 0.2) * (1 - phase(t, b1 + 1.2, b1 + 1.6)) * sea,
      wide ? -1 : 1,
      "oksijenle paslanıp çöker",
    );
    callout(
      f,
      w * (wide ? 0.58 : 0.4),
      G.floor - 30 * s,
      "Oksijen zehirdir",
      phase(t, b1 + 3.8, b1 + 4.4) * (1 - phase(t, b2 - 0.8, b2 - 0.4)) * sea,
      -1,
      "oksijensiz yaşayanlar çamura çekilir",
      wide ? 2.4 : 1.4,
    );
  }
  if (cell > 0.5) {
    const cx = w * (wide ? 0.6 : 0.5);
    const cy = h * (wide ? 0.45 : 0.38);
    const R = wide ? h * 0.26 : w * 0.34;
    callout(
      f,
      cx - R * 0.7,
      cy - R * 0.72,
      "Arke hücresi",
      phase(t, b2 + 0.6, b2 + 1.2) * (1 - phase(t, b2 + 2.6, b2 + 3)),
      -1,
      "konak",
    );
    const ba = -0.35;
    callout(
      f,
      cx + Math.cos(ba) * R * 1.7,
      cy + Math.sin(ba) * R * 1.7,
      "Bakteri",
      phase(t, b2 + 0.8, b2 + 1.4) * (1 - phase(t, b2 + 1.8, b2 + 2.1)),
      wide ? 1 : -1,
      "alfa-proteobakteri",
    );
    callout(
      f,
      cx + R * 0.42,
      cy - R * 0.08 - R * 0.14,
      "Mitokondri",
      phase(t, b2 + 4, b2 + 4.6),
      1,
      "sindirilmedi, enerji ortağı oldu",
      wide ? 2.2 : 1.2,
    );
    callout(
      f,
      cx - R * 0.28,
      cy + R * 0.12 - R * 0.3,
      "Çekirdek",
      phase(t, b2 + 4.6, b2 + 5.2),
      -1,
      "DNA'yı saran zar",
      wide ? 2.2 : 1.2,
    );
  }
  // Kanıt kartı.
  const k = pop(t, b2 + 5, 0.6);
  if (k > 0.01) {
    const bw = Math.min(w * 0.9, 300 * s);
    const bh = 86 * s;
    const bx = wide ? w * 0.04 : (w - bw) / 2;
    const by = wide ? h * 0.13 : h * 0.64;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(k, k);
    ctx.translate(-bw / 2, -bh / 2);
    ctx.fillStyle = "rgba(6,24,30,0.9)";
    roundRect(ctx, 0, 0, bw, bh, 14 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,240,0.96)";
    ctx.font = `600 ${Math.round(Math.max(11, 12.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Mitokondrinin bakteri geçmişi", 14 * s, 18 * s);
    ctx.fillStyle = "rgba(215,225,220,0.92)";
    ctx.font = `400 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
    ["kendi küçük DNA'sı var", "bakteri tipi ribozomlar", "ikiye bölünerek çoğalır"].forEach(
      (line, q) => {
        ctx.fillStyle = "#ffb08a";
        ctx.fillText("•", 14 * s, (38 + q * 16) * s);
        ctx.fillStyle = "rgba(215,225,220,0.92)";
        ctx.fillText(line, 26 * s, (38 + q * 16) * s);
      },
    );
    ctx.restore();
  }
}
