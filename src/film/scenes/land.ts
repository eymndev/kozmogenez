import {
  callout,
  glow,
  hash,
  lerp,
  nearest,
  roundRect,
  span,
  text,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";

/**
 * Denizden karaya: Ediyakara’nın yumuşak, yassı canlıları; Kambriyen’de gözler, kabuklar
 * ve avcılar; sonra kıyıda ilk kara bitkileri ve yüzgecinde kol kemikleri taşıyan Tiktaalik.
 */
export function land(f: SceneFrame) {
  const { t, beats } = f;
  const [, , b2] = beats;
  const shore = span(t, b2 - 0.2, b2 + 1.4);
  if (shore < 1) seafloor(f, 1 - shore);
  if (shore > 0) coast(f, shore);
}

/** Yatayda sahne altyazıların sağına yayılır; dikeyde bütün genişliği kullanır. */
function layout(f: SceneFrame) {
  const land = f.w > f.h;
  return {
    floor: f.h * (land ? 0.6 : 0.66),
    x0: land ? f.w * 0.42 : f.w * 0.04,
    x1: f.w * 0.98,
  };
}

function trilobiteAt(f: SceneFrame, i: number): [number, number] {
  const { t, beats, s } = f;
  const { floor, x0, x1 } = layout(f);
  const span_ = x1 - x0 + 80 * s;
  const x =
    x0 -
    40 * s +
    ((((hash(i * 3.1) * span_ + (t - beats[1]) * (16 + hash(i) * 12) * s) % span_) + span_) %
      span_);
  return [x, floor + (18 + hash(i + 9) * 34) * s];
}

function anomalocarisAt(f: SceneFrame): [number, number] {
  const { w, h, t, beats, s } = f;
  const k = ((((t - beats[1]) * 0.07) % 1) + 1) % 1;
  return [lerp(-150 * s, w + 150 * s, k), h * (w > h ? 0.34 : 0.3) + Math.sin(t) * 10 * s];
}

function seafloor(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1] = beats;
  const { floor, x0, x1 } = layout(f);
  ctx.save();
  ctx.globalAlpha = alpha;
  const water = ctx.createLinearGradient(0, 0, 0, h);
  water.addColorStop(0, "rgb(18,64,82)");
  water.addColorStop(1, "rgb(6,22,30)");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const x = w * (0.2 + i * 0.18) + Math.sin(t * 0.3 + i) * 20 * s;
    const g = ctx.createLinearGradient(x, 0, x + 80 * s, floor);
    g.addColorStop(0, "rgba(200,240,255,0.10)");
    g.addColorStop(1, "rgba(200,240,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, 0);
    ctx.lineTo(x + 30 * s, 0);
    ctx.lineTo(x + 130 * s, floor);
    ctx.lineTo(x + 50 * s, floor);
    ctx.fill();
  }
  ctx.fillStyle = "rgb(90,78,60)";
  ctx.beginPath();
  ctx.moveTo(0, floor);
  for (let x = 0; x <= w; x += 16 * s) ctx.lineTo(x, floor + Math.sin(x * 0.015) * 5 * s);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  const cambrian = span(t, b1 - 0.4, b1 + 1);
  // Ediyakara: Charnia yaprakları ve Dickinsonia diskleri; Kambriyen’le birlikte azalır.
  const ediacara = 1 - cambrian * 0.7;
  for (let i = 0; i < 6; i++) {
    const x = lerp(x0, x1, (i + 0.4) / 6) + hash(i) * 20 * s;
    frond(
      ctx,
      x,
      floor + 4 * s,
      (100 + hash(i + 2) * 70) * s,
      Math.sin(t * 0.8 + i) * 0.08,
      ediacara,
    );
  }
  for (let i = 0; i < 5; i++) {
    const x = lerp(x0, x1, (i + 0.9) / 6);
    dickinsonia(ctx, x, floor + (18 + hash(i) * 24) * s, (30 + hash(i + 5) * 14) * s, ediacara);
  }

  // Kambriyen: trilobitler tabanda yürür, bir Anomalocaris yukarıda yüzer.
  if (cambrian > 0.01) {
    for (let i = 0; i < 6; i++) {
      const [x, y] = trilobiteAt(f, i);
      trilobite(ctx, x, y, (26 + hash(i + 4) * 10) * s, cambrian);
    }
    const [ax, ay] = anomalocarisAt(f);
    anomalocaris(ctx, ax, ay, 150 * s, t, cambrian);
  }
  ctx.restore();

  const side = (x: number) => (x > w * 0.7 ? -1 : 1);
  const a0 = alpha * span(t, b0 + 0.6, b0 + 1.4) * (1 - cambrian);
  const fx = lerp(x0, x1, 1.4 / 6) + hash(1) * 20 * s;
  callout(f, fx, floor - 70 * s, "Charnia", a0, side(fx), "yaprak biçimli, ağızsız");
  const dx = lerp(x0, x1, 3.9 / 6);
  callout(
    f,
    dx,
    floor + (18 + hash(3) * 24) * s,
    "Dickinsonia",
    a0 * span(t, b0 + 1.2, b0 + 2),
    side(dx),
    "yassı, halkalı",
  );
  const a1 = alpha * span(t, b1 + 1, b1 + 1.8);
  const tr = nearest((i, time) => trilobiteAt({ ...f, t: time }, i), 0, 6, b1 + 1, [
    w * 0.66,
    floor,
  ]);
  const [tx, ty] = trilobiteAt(f, tr);
  callout(f, tx, ty, "Trilobit", a1, side(tx), "bileşik gözler, sert kabuk");
  const [ax, ay] = anomalocarisAt(f);
  callout(
    f,
    ax,
    ay,
    "Anomalocaris",
    a1 * span(t, b1 + 1.6, b1 + 2.4),
    side(ax),
    "ilk büyük avcılardan",
  );
}

function frond(ctx: Ctx, x: number, y: number, len: number, sway: number, a: number) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.fillStyle = "rgba(200,170,120,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.55, len * 0.14, len * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,95,60,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 1; k < 10; k++) {
    const yy = -len * 0.1 - k * len * 0.09;
    ctx.moveTo(-len * 0.12, yy + len * 0.03);
    ctx.lineTo(0, yy);
    ctx.lineTo(len * 0.12, yy + len * 0.03);
  }
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.restore();
}

function dickinsonia(ctx: Ctx, x: number, y: number, r: number, a: number) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = "rgba(190,150,110,0.85)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(110,80,55,0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -5; k <= 5; k++) {
    ctx.moveTo(x + (k / 6) * r, y - r * 0.36 * Math.sqrt(1 - (k / 6) ** 2));
    ctx.lineTo(x + (k / 6) * r, y + r * 0.36 * Math.sqrt(1 - (k / 6) ** 2));
  }
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  ctx.restore();
}

function trilobite(ctx: Ctx, x: number, y: number, r: number, a: number) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = "rgb(110,92,74)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,30,22,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -3; k <= 4; k++) {
    ctx.moveTo(x + (k / 5) * r, y - r * 0.5);
    ctx.lineTo(x + (k / 5) * r, y + r * 0.5);
  }
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  ctx.fillStyle = "rgb(20,18,16)";
  ctx.beginPath();
  ctx.arc(x + r * 0.72, y - r * 0.22, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.72, y + r * 0.22, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function anomalocaris(ctx: Ctx, x: number, y: number, len: number, t: number, a: number) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.fillStyle = "rgb(150,90,70)";
  ctx.beginPath();
  ctx.ellipse(0, 0, len / 2, len / 7, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = -4; k <= 4; k++) {
    const flap = Math.sin(t * 5 + k * 0.7) * len * 0.05;
    ctx.fillStyle = "rgba(170,110,85,0.9)";
    ctx.beginPath();
    ctx.ellipse((k / 5) * len * 0.4, -len / 7 - flap, len * 0.05, len * 0.06, 0, 0, Math.PI * 2);
    ctx.ellipse((k / 5) * len * 0.4, len / 7 + flap, len * 0.05, len * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgb(150,90,70)";
  ctx.lineWidth = len * 0.04;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(len / 2, -len * 0.05);
  ctx.quadraticCurveTo(len * 0.72, -len * 0.05, len * 0.66, len * 0.14);
  ctx.moveTo(len / 2, len * 0.05);
  ctx.quadraticCurveTo(len * 0.74, len * 0.08, len * 0.7, len * 0.22);
  ctx.stroke();
  ctx.fillStyle = "rgb(20,18,16)";
  ctx.beginPath();
  ctx.arc(len * 0.42, -len * 0.12, len * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function coast(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  ctx.save();
  ctx.globalAlpha = alpha;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgb(60,70,90)");
  sky.addColorStop(0.5, "rgb(200,150,100)");
  sky.addColorStop(1, "rgb(60,40,30)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  glow(ctx, w * 0.82, h * 0.34, 120 * s, "rgba(255,210,150,0.55)");
  const shoreY = h * (w < h ? 0.6 : 0.56);
  // Su solda, kıyı sağda.
  ctx.fillStyle = "rgba(40,70,85,0.95)";
  ctx.fillRect(0, shoreY, w, h - shoreY);
  ctx.fillStyle = "rgb(92,76,56)";
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h);
  ctx.quadraticCurveTo(w * 0.5, shoreY + 10 * s, w * 0.62, shoreY);
  ctx.lineTo(w, shoreY - 8 * s);
  ctx.lineTo(w, h);
  ctx.fill();

  // Cooksonia: dallanan, yapraksız ilk kara bitkileri.
  for (let i = 0; i < 9; i++) {
    const x = w * (0.67 + i * 0.037);
    const grow = span(t, b2 + 0.8 + i * 0.12, b2 + 1.8 + i * 0.12);
    plant(ctx, x, shoreY - 6 * s + hash(i) * 6 * s, (40 + hash(i + 3) * 30) * s * grow, s);
  }
  // Tiktaalik: kıyıda, yassı kafa ve güçlü ön yüzgeçler.
  const len = Math.min(w, h) * 0.34;
  const tx = w * (w > h ? 0.54 : 0.4) + Math.sin(t * 0.6) * 4 * s;
  const ty = shoreY + 2 * s;
  tiktaalik(ctx, tx, ty, len, t);
  ctx.restore();

  callout(
    f,
    tx + len * 0.36,
    ty - len * 0.07,
    "Tiktaalik",
    alpha * span(t, b2 + 1.4, b2 + 2.2),
    -1,
    "~375 milyon yıl önce",
  );
  callout(
    f,
    w * 0.74,
    shoreY - 30 * s,
    "İlk kara bitkileri",
    alpha * span(t, b2 + 2, b2 + 2.8),
    1,
    "Cooksonia",
  );
  finCard(f, alpha * span(t, b2 + 3, b2 + 3.8));
}

function plant(ctx: Ctx, x: number, y: number, len: number, s: number) {
  if (len <= 1) return;
  ctx.strokeStyle = "rgb(80,120,60)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - len * 0.5);
  ctx.lineTo(x - len * 0.2, y - len);
  ctx.moveTo(x, y - len * 0.5);
  ctx.lineTo(x + len * 0.2, y - len);
  ctx.stroke();
  ctx.fillStyle = "rgb(190,150,70)";
  ctx.beginPath();
  ctx.arc(x - len * 0.2, y - len, 2.2 * s, 0, Math.PI * 2);
  ctx.arc(x + len * 0.2, y - len, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

function tiktaalik(ctx: Ctx, x: number, y: number, len: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  // Gövde: yassı, timsaha benzer kafa; sırtı koyu, karnı açık.
  const body = new Path2D();
  body.moveTo(len * 0.5, 0);
  body.quadraticCurveTo(len * 0.36, -len * 0.13, 0, -len * 0.1);
  body.quadraticCurveTo(-len * 0.38, -len * 0.07, -len * 0.58, 0.01 * len);
  body.quadraticCurveTo(-len * 0.38, len * 0.06, 0, len * 0.07);
  body.quadraticCurveTo(len * 0.36, len * 0.08, len * 0.5, 0);
  const g = ctx.createLinearGradient(0, -len * 0.12, 0, len * 0.08);
  g.addColorStop(0, "rgb(70,78,48)");
  g.addColorStop(1, "rgb(170,160,110)");
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.strokeStyle = "rgba(30,28,18,0.9)";
  ctx.lineWidth = Math.max(1, len * 0.008);
  ctx.stroke(body);
  // Pullar ve göz.
  ctx.strokeStyle = "rgba(40,40,24,0.5)";
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.arc(-len * 0.3 + k * len * 0.08, -len * 0.02, len * 0.035, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.fillStyle = "rgb(20,18,14)";
  ctx.beginPath();
  ctx.arc(len * 0.36, -len * 0.065, len * 0.02, 0, Math.PI * 2);
  ctx.fill();
  // Ön yüzgeç: dirsekte bükülüp zemine dayanır.
  const lift = Math.sin(t * 1.4) * len * 0.02;
  ctx.strokeStyle = "rgb(85,90,55)";
  ctx.lineWidth = len * 0.045;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(len * 0.18, len * 0.04);
  ctx.lineTo(len * 0.22, len * 0.13 + lift);
  ctx.lineTo(len * 0.31, len * 0.15 + lift);
  ctx.stroke();
  ctx.restore();
}

/** Yüzgeçteki kemikler: bizim kolumuzdaki düzenin aynısı. */
function finCard(f: SceneFrame, alpha: number) {
  if (alpha <= 0.01) return;
  const { ctx, w, h, s } = f;
  const cw = 200 * s;
  const ch = 96 * s;
  const x = w > h ? w * 0.7 : w * 0.5 - cw / 2;
  const y = h * (w < h ? 0.2 : 0.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(5,6,10,0.7)";
  roundRect(ctx, x, y, cw, ch, 12 * s);
  ctx.fill();
  const bx = x + 18 * s;
  const by = y + 58 * s;
  ctx.lineCap = "round";
  const bone = (x1: number, y1: number, x2: number, y2: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  bone(bx, by, bx + 44 * s, by, "rgb(240,200,120)");
  bone(bx + 50 * s, by - 5 * s, bx + 86 * s, by - 10 * s, "rgb(130,200,240)");
  bone(bx + 50 * s, by + 5 * s, bx + 86 * s, by + 8 * s, "rgb(130,200,240)");
  for (let k = 0; k < 4; k++)
    bone(
      bx + 94 * s,
      by - 9 * s + k * 6 * s,
      bx + 108 * s,
      by - 12 * s + k * 8 * s,
      "rgb(170,230,160)",
    );
  ctx.restore();
  text(f, x + cw / 2, y + 18 * s, "Yüzgeçte kol kemikleri", alpha, { size: 12.5 });
  text(f, bx + 22 * s, by + 22 * s, "üst kol", alpha, { size: 10, color: "rgb(240,200,120)" });
  text(f, bx + 68 * s, by + 22 * s, "ön kol", alpha, { size: 10, color: "rgb(130,200,240)" });
  text(f, bx + 104 * s, by + 22 * s, "bilek", alpha, { size: 10, color: "rgb(170,230,160)" });
}
