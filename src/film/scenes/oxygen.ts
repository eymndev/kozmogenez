import {
  callout,
  center,
  dot,
  fill,
  glow,
  hash,
  lerp,
  roundRect,
  span,
  text,
  type SceneFrame,
} from "@/film/scenes/kit";

/**
 * Oksijen, sonra çekirdek: siyanobakteriler suyu parçalayıp O₂ salar; oksijen denizdeki
 * demiri paslandırır ve bantlı demir yatakları birikir; sonra bir hücre bir bakteriyi
 * yutar, bakteri mitokondriye dönüşür.
 */
export function oxygen(f: SceneFrame) {
  const { t, beats } = f;
  const [, , b2] = beats;
  const cell = span(t, b2 - 0.2, b2 + 1.3);
  if (cell < 1) sea(f, 1 - cell);
  if (cell > 0) endosymbiosis(f, cell);
}

function sea(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1] = beats;
  ctx.save();
  ctx.globalAlpha = alpha;
  const water = ctx.createLinearGradient(0, 0, 0, h);
  water.addColorStop(0, "rgb(20,70,90)");
  water.addColorStop(0.55, "rgb(8,34,48)");
  water.addColorStop(1, "rgb(4,14,20)");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);
  // Işık huzmeleri.
  for (let i = 0; i < 6; i++) {
    const x = w * (0.1 + i * 0.17) + Math.sin(t * 0.3 + i) * 20 * s;
    const g = ctx.createLinearGradient(x, 0, x + 60 * s, h * 0.7);
    g.addColorStop(0, "rgba(200,240,255,0.10)");
    g.addColorStop(1, "rgba(200,240,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, 0);
    ctx.lineTo(x + 30 * s, 0);
    ctx.lineTo(x + 120 * s, h * 0.7);
    ctx.lineTo(x + 40 * s, h * 0.7);
    ctx.fill();
  }

  // Bantlı demir: kırmızı pas ve gri çört katmanları sırayla çöker; bir kaya kesitinde.
  const col =
    w > h
      ? { x: w * 0.62, y: h * 0.3, cw: w * 0.17, ch: h * 0.4 }
      : { x: w * 0.28, y: h * 0.5, cw: w * 0.44, ch: h * 0.3 };
  const reveal = span(t, b1, b1 + 0.6);

  // Siyanobakteri iplikleri: yeşil boncuk zincirleri, sallanır.
  const colonies = 7;
  for (let c = 0; c < colonies; c++) {
    const bx = w * (0.1 + c * 0.13);
    const by = h * (0.25 + hash(c) * 0.3);
    for (let k = 0; k < 9; k++) {
      const x = bx + k * 7 * s + Math.sin(t * 1.2 + c + k * 0.4) * 4 * s;
      const y = by + Math.sin(k * 0.8 + t + c) * 6 * s;
      dot(ctx, x, y, 3.4 * s, `rgba(80,${Math.round(190 + 30 * Math.sin(k))},110,0.95)`);
    }
    // O₂ kabarcıkları yükselir.
    for (let k = 0; k < 6; k++) {
      const life = (hash(c * 10 + k) + t * 0.18) % 1;
      const x = bx + 30 * s + Math.sin(t * 2 + k) * 6 * s;
      const y = by - life * by * 0.9;
      ctx.strokeStyle = `rgba(210,240,255,${0.7 * (1 - life)})`;
      ctx.lineWidth = Math.max(1, s);
      ctx.beginPath();
      ctx.arc(x, y, (2 + life * 3) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (reveal > 0.01) {
    ctx.globalAlpha = alpha * reveal;
    ctx.fillStyle = "rgba(5,6,10,0.6)";
    roundRect(ctx, col.x - 8 * s, col.y - 8 * s, col.cw + 16 * s, col.ch + 16 * s, 10 * s);
    ctx.fill();
    const bands = 10;
    const bandH = col.ch / bands;
    for (let k = 0; k < bands; k++) {
      const a = span(t, b1 + 0.4 + k * 0.4, b1 + 0.9 + k * 0.4);
      if (a <= 0.01) continue;
      const y = col.y + col.ch - (k + 1) * bandH - (1 - a) * 14 * s;
      ctx.globalAlpha = alpha * reveal * a;
      ctx.fillStyle = k % 2 === 0 ? "rgb(168,60,38)" : "rgb(122,122,128)";
      ctx.beginPath();
      ctx.moveTo(col.x, y + Math.sin(k) * 2 * s);
      for (let x = 0; x <= col.cw; x += 8 * s)
        ctx.lineTo(col.x + x, y + Math.sin(x * 0.05 + k) * 2 * s);
      ctx.lineTo(col.x + col.cw, y + bandH + 1);
      ctx.lineTo(col.x, y + bandH + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
  }
  ctx.restore();

  // Havadaki oksijen göstergesi.
  const level = lerp(0.02, 0.32, span(t, b0, b1 + 4));
  const gx = w * (w < h ? 0.88 : 0.9);
  const gy0 = h * 0.26;
  const gy1 = h * (w < h ? 0.7 : 0.62);
  ctx.save();
  ctx.globalAlpha = alpha * span(t, b0 + 0.4, b0 + 1.2);
  ctx.fillStyle = "rgba(5,6,10,0.5)";
  ctx.fillRect(gx - 5 * s, gy0, 10 * s, gy1 - gy0);
  ctx.fillStyle = "rgba(170,230,255,0.95)";
  ctx.fillRect(gx - 5 * s, gy1 - (gy1 - gy0) * level, 10 * s, (gy1 - gy0) * level);
  ctx.restore();
  text(f, gx, gy0 - 14 * s, "Havada O₂", alpha * span(t, b0 + 0.4, b0 + 1.2), { size: 11.5 });
  text(f, gx - 10 * s, gy0 + 6 * s, "bugün", alpha * span(t, b0 + 0.4, b0 + 1.2) * 0.8, {
    size: 10,
    align: "right",
    color: "rgba(168,161,148,1)",
  });

  callout(
    f,
    w * 0.23 + 28 * s,
    h * (0.25 + hash(1) * 0.3),
    "Siyanobakteri",
    alpha * span(t, b0 + 0.6, b0 + 1.4) * (1 - span(t, b1 + 1, b1 + 1.6)),
    1,
    "suyu parçalar, O₂ salar",
  );
  const wide = w > h;
  callout(
    f,
    wide ? col.x : col.x + col.cw * 0.3,
    wide ? col.y + col.ch * 0.45 : col.y - 8 * s,
    "Bantlı demir yatağı",
    alpha * span(t, b1 + 2.2, b1 + 3),
    wide ? -1 : 1,
    "O₂ + çözünmüş demir → pas",
  );
}

function endosymbiosis(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  const [cx, cy] = center(f);
  const R = Math.min(w * 0.3, h * 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  fill(f, "rgb(8,12,14)");
  glow(ctx, cx, cy, R * 2.4, "rgba(60,110,100,0.25)");

  const engulf = span(t, b2 + 0.8, b2 + 3.2);
  const become = span(t, b2 + 3.2, b2 + 4.6);
  const nucleus = span(t, b2 + 4.4, b2 + 5.6);

  // Konak hücre: dalgalanan zar.
  ctx.beginPath();
  for (let k = 0; k <= 80; k++) {
    const a = (k / 80) * Math.PI * 2;
    const bump = Math.exp(-(((a - 0.2) / 0.35) ** 2)) * 0.18 * Math.sin(engulf * Math.PI);
    const r = R * (1 + 0.03 * Math.sin(a * 5 + t) + bump);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.82;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(120,180,170,0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(170,230,215,0.8)";
  ctx.lineWidth = Math.max(1.5, 2.5 * s);
  ctx.stroke();

  // Bakteri: dışarıdan gelir, içeri alınır, kıvrımlı iç zarlarıyla mitokondri olur.
  const bx = lerp(cx + R * 1.9, cx + R * 0.35, engulf);
  const by = lerp(cy - R * 0.5, cy + R * 0.1, engulf);
  const len = R * 0.42;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.3 + engulf * 0.5);
  ctx.fillStyle = `rgb(${Math.round(lerp(200, 230, become))},${Math.round(lerp(150, 120, become))},${Math.round(lerp(90, 80, become))})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, len / 2, len / 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (become > 0.01) {
    ctx.strokeStyle = `rgba(255,220,180,${become})`;
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = -len / 2.6 + k * (len / 7.5);
      ctx.moveTo(x, -len / 7);
      ctx.quadraticCurveTo(x + len / 30, 0, x, len / 7);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Çekirdek: çift zarlı, DNA’yı saklayan bölme.
  if (nucleus > 0.01) {
    ctx.globalAlpha = alpha * nucleus;
    ctx.fillStyle = "rgba(140,120,200,0.35)";
    ctx.strokeStyle = "rgba(190,170,255,0.9)";
    ctx.lineWidth = Math.max(1, 1.6 * s);
    ctx.beginPath();
    ctx.arc(cx - R * 0.35, cy - R * 0.05, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - R * 0.35, cy - R * 0.05, R * 0.3 + 4 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const side = (x: number) => (x > w * 0.55 ? -1 : 1);
  callout(
    f,
    cx - R * 0.7,
    cy + R * 0.55,
    "Konak hücre",
    alpha * span(t, b2 + 0.8, b2 + 1.6),
    1,
    "bir arke",
  );
  callout(
    f,
    bx,
    by,
    "Alfa-proteobakteri",
    alpha * span(t, b2 + 1, b2 + 1.8) * (1 - become),
    side(bx),
  );
  callout(f, bx, by, "Mitokondri", alpha * become, side(bx), "hücrenin enerji santrali");
  callout(
    f,
    cx - R * 0.35,
    cy - R * 0.05,
    "Çekirdek",
    alpha * span(t, b2 + 5.4, b2 + 6),
    1,
    "ökaryot hücre",
  );
}
