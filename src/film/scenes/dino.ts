import {
  badge,
  callout,
  dot,
  fill,
  glow,
  hash,
  lerp,
  span,
  sphere,
  text,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";

const ERAS: [string, number, number][] = [
  ["Triyas", 252, 201],
  ["Jura", 201, 145],
  ["Kretase", 145, 66],
];

/**
 * Dinozorlar ve bir taş: Mezozoyik bir ufukta dinozorlar ve küçük bir memeli; sonra
 * Yucatán’a çarpan göktaşı; sonra karanlık ve yok oluş, kuşlar ve yayılan memeliler.
 */
export function dino(f: SceneFrame) {
  const { t, beats } = f;
  const [, b1, b2] = beats;
  const globe = span(t, b1 - 0.4, b1 + 0.8) * (1 - span(t, b2 - 0.2, b2 + 1));
  const after = span(t, b2 - 0.2, b2 + 1);
  if (globe < 1 && after < 0.99 && t < b2) landscape(f, 1 - globe, false);
  if (globe > 0.01) impact(f, globe);
  if (after > 0.01) landscape(f, after, true);
}

function landscape(f: SceneFrame, alpha: number, aftermath: boolean) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, , b2] = beats;
  ctx.save();
  ctx.globalAlpha = alpha;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (aftermath) {
    sky.addColorStop(0, "rgb(24,20,22)");
    sky.addColorStop(0.6, "rgb(70,46,34)");
    sky.addColorStop(1, "rgb(20,14,12)");
  } else {
    sky.addColorStop(0, "rgb(40,50,80)");
    sky.addColorStop(0.55, "rgb(230,150,90)");
    sky.addColorStop(1, "rgb(60,34,24)");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const ground = h * (w < h ? 0.7 : 0.64);
  if (!aftermath) glow(ctx, w * 0.62, ground - 40 * s, 140 * s, "rgba(255,210,140,0.6)");
  ctx.fillStyle = aftermath ? "rgb(22,16,14)" : "rgb(34,24,20)";
  ctx.beginPath();
  ctx.moveTo(0, ground);
  for (let x = 0; x <= w; x += 30 * s)
    ctx.lineTo(x, ground - Math.sin(x * 0.006) * 14 * s - hash(x) * 6 * s);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Eğrelti ve sikas silüetleri.
  for (let i = 0; i < 10; i++) {
    const x = w * (i / 9) + hash(i) * 20 * s;
    cycad(ctx, x, ground + 2 * s, (24 + hash(i + 1) * 26) * s, aftermath ? 0.35 : 1);
  }

  if (!aftermath) {
    const wide = w > h;
    const walk = (t - b0) * 9 * s;
    sauropod(ctx, w * (wide ? 0.9 : 0.8) - walk, ground - 2 * s, Math.min(w, h) * 0.36, t);
    theropod(
      ctx,
      w * (wide ? 0.58 : 0.3) + Math.sin(t * 0.4) * 24 * s,
      ground - 2 * s,
      Math.min(w, h) * 0.2,
      t,
    );
    mammal(ctx, mammalX(f), ground + 8 * s, 14 * s);
  } else {
    // Yok oluşun ardından: kuşlar uçar, memeliler çoğalır.
    for (let i = 0; i < 6; i++) {
      const k = span(t, b2 + 1 + i * 0.3, b2 + 2 + i * 0.3);
      const [x, y] = birdAt(f, i, k);
      bird(ctx, x, y, 12 * s, t + i, k);
    }
    for (let i = 0; i < 7; i++) {
      const k = span(t, b2 + 2.4 + i * 0.35, b2 + 3 + i * 0.35);
      if (k > 0) {
        ctx.globalAlpha = alpha * k;
        mammal(ctx, spreadX(f, i), ground + 8 * s + hash(i) * 10 * s, (14 + hash(i + 3) * 9) * s);
        ctx.globalAlpha = alpha;
      }
    }
  }
  ctx.restore();

  if (!aftermath) {
    // Çağ çubuğu: Triyas, Jura, Kretase.
    const box = {
      x: w * 0.5 - Math.min(w * 0.4, 240 * s),
      y: h * (w < h ? 0.19 : 0.17),
      len: Math.min(w * 0.8, 480 * s),
    };
    const a = alpha * span(t, b0 + 0.2, b0 + 1);
    const total = 252 - 66;
    ERAS.forEach(([name, from, to], k) => {
      const x = box.x + ((252 - from) / total) * box.len;
      const wdt = ((from - to) / total) * box.len;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = ["rgba(200,120,90,0.8)", "rgba(120,170,120,0.8)", "rgba(110,150,200,0.8)"][k];
      ctx.fillRect(x + 1, box.y, wdt - 2, 6 * s);
      ctx.restore();
      text(f, x + wdt / 2, box.y + 18 * s, name, a, { size: 11.5 });
    });
    text(f, box.x, box.y - 12 * s, "252 milyon yıl önce", a, {
      size: 10,
      align: "left",
      color: "rgba(168,161,148,1)",
    });
    text(f, box.x + box.len, box.y - 12 * s, "66", a, {
      size: 10,
      align: "right",
      color: "rgba(168,161,148,1)",
    });
    const mx = mammalX(f);
    callout(
      f,
      mx,
      ground + 2 * s,
      "Memeli",
      alpha * span(t, b0 + 1.4, b0 + 2.2),
      mx > w * 0.7 ? -1 : 1,
      "dinozorlarla aynı çağda, küçük",
    );
  } else {
    badge(
      f,
      w / 2,
      h * (w < h ? 0.19 : 0.17),
      "Türlerin yaklaşık dörtte üçü yok oldu",
      alpha * span(t, b2 + 0.4, b2 + 1.2),
    );
    const [bx, by] = birdAt(f, 2, 1);
    callout(
      f,
      bx,
      by,
      "Kuşlar",
      alpha * span(t, b2 + 2.4, b2 + 3),
      bx > w * 0.7 ? -1 : 1,
      "yaşayan dinozorlar",
    );
    const sx = spreadX(f, 3);
    callout(
      f,
      sx,
      ground + 4 * s,
      "Memeliler yayılır",
      alpha * span(t, b2 + 4, b2 + 4.6),
      sx > w * 0.7 ? -1 : 1,
    );
  }
}

function mammalX(f: SceneFrame) {
  return f.w * (f.w > f.h ? 0.78 : 0.62);
}

function spreadX(f: SceneFrame, i: number) {
  return f.w > f.h ? f.w * (0.48 + i * 0.07) : f.w * (0.1 + i * 0.13);
}

function birdAt(f: SceneFrame, i: number, k: number): [number, number] {
  const { w, h, t, s } = f;
  const target = w > h ? w * (0.5 + i * 0.07) : w * (0.15 + i * 0.13);
  return [
    lerp(-30 * s, target, k) + Math.sin(t + i) * 8 * s,
    h * (0.26 + hash(i) * 0.12) + Math.sin(t * 2 + i) * 4 * s,
  ];
}

function impact(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, b1] = beats;
  const cx = w > h ? w * 0.6 : w * 0.5;
  const cy = h * (w > h ? 0.42 : 0.44);
  const R = Math.min(w, h) * 0.26;
  const hit = b1 + 1.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  fill(f, "rgb(4,5,10)");
  for (let i = 0; i < 120; i++)
    dot(ctx, hash(i * 3.9) * w, hash(i * 1.7) * h, 0.8 * s, "rgba(220,220,255,0.3)");
  sphere(ctx, cx, cy, R, "rgb(120,170,220)", "rgb(40,90,140)", "rgb(6,14,28)");
  // Kaba kıtalar; Yucatán işaretli.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  // Kıtalar: kıyıları girintili çıkıntılı, düzensiz kara parçaları.
  for (let i = 0; i < 7; i++) {
    const px = cx + (hash(i * 4.4) - 0.5) * R * 1.5;
    const py = cy + (hash(i * 6.6) - 0.5) * R * 1.4;
    const pr = R * (0.14 + hash(i) * 0.16);
    ctx.fillStyle = i % 3 === 0 ? "rgba(150,140,90,0.95)" : "rgba(92,122,70,0.95)";
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const rr = pr * (0.6 + hash(i * 17 + k) * 0.7) * (k % 2 ? 1 : 0.85);
      const x = px + Math.cos(a) * rr * 1.2;
      const y = py + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  const yx = cx - R * 0.25;
  const yy = cy - R * 0.05;
  const age = t - hit;
  // Çarpışma sonrası: toz perdesi yayılıp gezegeni karartır.
  if (age > 0) {
    const veil = Math.min(1, age / 3.5);
    ctx.fillStyle = `rgba(40,28,20,${0.8 * veil})`;
    ctx.beginPath();
    ctx.arc(yx, yy, R * 2.4 * veil, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,170,90,${0.8 * (1 - veil)})`;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(yx, yy, R * 2.4 * veil, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Göktaşı: sağ üstten yaklaşan parlak iz.
  if (age < 0) {
    const k = span(t, b1 - 0.4, hit);
    const ax = lerp(cx + R * 3, yx, k);
    const ay = lerp(cy - R * 2.6, yy, k);
    ctx.strokeStyle = "rgba(255,220,160,0.8)";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + R * 0.6, ay - R * 0.5);
    ctx.stroke();
    glow(ctx, ax, ay, 12 * s, "rgba(255,240,210,1)");
  }
  const flash = Math.exp(-((age / 0.3) ** 2));
  if (flash > 0.02) glow(ctx, yx, yy, R * 3 * flash, `rgba(255,245,220,${flash})`);
  ctx.restore();

  const labelA = alpha * span(t, hit + 0.8, hit + 1.6);
  dot(ctx, yx, yy, 3 * s, `rgba(255,200,120,${labelA})`);
  callout(f, yx, yy, "Chicxulub", labelA, -1, "~10 km çaplı göktaşı");
}

function cycad(ctx: Ctx, x: number, y: number, size: number, a: number) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = "rgb(24,18,14)";
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size * 0.6);
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI / 2 + (k - 3) * 0.4;
    ctx.moveTo(x, y - size * 0.6);
    ctx.quadraticCurveTo(
      x + Math.cos(ang) * size * 0.4,
      y - size * 0.6 + Math.sin(ang) * size * 0.4 - size * 0.1,
      x + Math.cos(ang) * size * 0.7,
      y - size * 0.6 + Math.sin(ang) * size * 0.5,
    );
  }
  ctx.stroke();
  ctx.restore();
}

function sauropod(ctx: Ctx, x: number, y: number, size: number, t: number) {
  ctx.save();
  ctx.fillStyle = "rgb(30,22,18)";
  ctx.strokeStyle = "rgb(30,22,18)";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.3, size * 0.32, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.07;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.25, y - size * 0.35);
  ctx.quadraticCurveTo(x - size * 0.45, y - size * 0.9, x - size * 0.58, y - size * 0.95);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x - size * 0.61, y - size * 0.95, size * 0.06, size * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y - size * 0.32);
  ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.25, x + size * 0.8, y - size * 0.12);
  ctx.stroke();
  ctx.lineWidth = size * 0.07;
  for (let k = 0; k < 4; k++) {
    const lx = x + (k < 2 ? -size * 0.18 : size * 0.16) + (k % 2) * size * 0.06;
    const step = Math.sin(t * 1.6 + k * 1.6) * size * 0.03;
    ctx.beginPath();
    ctx.moveTo(lx, y - size * 0.25);
    ctx.lineTo(lx + step, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** İki ayaklı etçil: yatay gövde, iri kafa, dengeleyici uzun kuyruk, kısa kollar. */
function theropod(ctx: Ctx, x: number, y: number, size: number, t: number) {
  const hip = y - size * 0.62;
  ctx.save();
  ctx.fillStyle = "rgb(30,22,18)";
  ctx.strokeStyle = "rgb(30,22,18)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Gövde + kuyruk tek parça, kuyruk incelerek geriye uzanır.
  ctx.beginPath();
  ctx.moveTo(x + size * 0.32, hip - size * 0.2);
  ctx.quadraticCurveTo(x - size * 0.1, hip - size * 0.3, x - size * 0.4, hip - size * 0.12);
  ctx.quadraticCurveTo(x - size * 0.85, hip - size * 0.02, x - size * 1.25, hip + size * 0.06);
  ctx.quadraticCurveTo(x - size * 0.85, hip + size * 0.1, x - size * 0.35, hip + size * 0.14);
  ctx.quadraticCurveTo(x + size * 0.05, hip + size * 0.22, x + size * 0.34, hip + size * 0.02);
  ctx.closePath();
  ctx.fill();
  // Boyun ve iri kafa.
  ctx.lineWidth = size * 0.16;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, hip - size * 0.1);
  ctx.quadraticCurveTo(x + size * 0.42, hip - size * 0.3, x + size * 0.48, hip - size * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.38, hip - size * 0.5);
  ctx.lineTo(x + size * 0.78, hip - size * 0.44);
  ctx.lineTo(x + size * 0.76, hip - size * 0.34);
  ctx.lineTo(x + size * 0.5, hip - size * 0.3);
  ctx.closePath();
  ctx.fill();
  // Kısa kollar.
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, hip + size * 0.02);
  ctx.lineTo(x + size * 0.4, hip + size * 0.1);
  ctx.stroke();
  // Güçlü arka bacaklar: diz öne, ayak bileği geriye bükülür.
  for (let k = 0; k < 2; k++) {
    const step = Math.sin(t * 2.2 + k * Math.PI) * size * 0.12;
    ctx.lineWidth = size * (k === 0 ? 0.13 : 0.11);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.06, hip + size * 0.08);
    ctx.lineTo(x + size * 0.08 + step * 0.5, hip + size * 0.34);
    ctx.lineTo(x - size * 0.02 + step, y - size * 0.04);
    ctx.lineTo(x + size * 0.1 + step, y);
    ctx.stroke();
  }
  ctx.restore();
}

function mammal(ctx: Ctx, x: number, y: number, size: number) {
  ctx.fillStyle = "rgb(26,20,16)";
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.4, size * 0.7, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size * 0.7, y - size * 0.55, size * 0.3, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgb(26,20,16)";
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y - size * 0.4);
  ctx.quadraticCurveTo(x - size * 1.2, y - size * 0.5, x - size * 1.3, y - size * 0.1);
  ctx.stroke();
}

function bird(ctx: Ctx, x: number, y: number, size: number, t: number, a: number) {
  if (a <= 0.01) return;
  const flap = Math.sin(t * 6) * size * 0.4;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = "rgb(20,16,14)";
  ctx.lineWidth = Math.max(1, size * 0.18);
  ctx.beginPath();
  ctx.moveTo(x - size, y - flap);
  ctx.quadraticCurveTo(x - size * 0.4, y - size * 0.2, x, y);
  ctx.quadraticCurveTo(x + size * 0.4, y - size * 0.2, x + size, y - flap);
  ctx.stroke();
  ctx.restore();
}
