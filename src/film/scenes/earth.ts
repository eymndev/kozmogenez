import {
  callout,
  dot,
  fill,
  glow,
  hash,
  lerp,
  roundRect,
  span,
  sphere,
  text,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";

/**
 * Erken Dünya: erimiş gezegene Theia çarpar, enkazdan Ay toplanır; yüzey soğuyup kabuk
 * bağlar (zirkon kanıtı), okyanuslar dolar; sonra okyanus tabanında bir hidrotermal baca.
 */
export function earth(f: SceneFrame) {
  const { t, beats } = f;
  const [, , b2] = beats;
  const vent = span(t, b2 - 0.2, b2 + 1.4);
  if (vent < 1) planet(f, 1 - vent);
  if (vent > 0) hydrothermal(f, vent);
}

function frame(f: SceneFrame): { cx: number; cy: number; R: number } {
  if (f.w > f.h) return { cx: f.w * 0.6, cy: f.h * 0.42, R: Math.min(f.w, f.h) * 0.22 };
  return { cx: f.w * 0.5, cy: f.h * 0.46, R: f.w * 0.27 };
}

function planet(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const { cx, cy, R } = frame(f);
  ctx.save();
  ctx.globalAlpha = alpha;
  fill(f, "rgb(4,5,10)");
  for (let i = 0; i < 150; i++)
    dot(ctx, hash(i * 2.9) * w, hash(i * 4.3) * h, 0.8 * s, "rgba(220,220,255,0.3)");

  const impact = b0 + 2.2;
  const molten = 1 - span(t, b1 + 0.2, b1 + 3.6);
  const oceans = span(t, b1 + 3.2, b1 + 5.2);

  // Theia: Mars boyutunda bir gezegenimsi, sağ üstten yaklaşır.
  if (t < impact + 0.1) {
    const k = span(t, 0, impact);
    const tx = lerp(cx + R * 4, cx + R * 0.9, k);
    const ty = lerp(cy - R * 2.6, cy - R * 0.55, k);
    sphere(ctx, tx, ty, R * 0.5, "rgb(230,200,170)", "rgb(160,110,80)", "rgb(40,25,20)");
    const label = span(t, b0 - 0.8, b0) * (1 - span(t, impact - 0.4, impact));
    callout(f, tx, ty, "Theia", label, -1, "Mars boyutunda");
  }

  // Gezegen: lav → koyu bazalt kabuk → okyanuslar ve küçük ilk kara parçaları.
  glow(ctx, cx, cy, R * 1.6, `rgba(255,120,50,${0.35 * molten})`);
  glow(ctx, cx, cy, R * 1.25, `rgba(90,150,255,${0.18 * oceans})`);
  const r = Math.round(lerp(58, 235, molten));
  const g = Math.round(lerp(58, 95, molten));
  const b = Math.round(lerp(64, 40, molten));
  sphere(
    ctx,
    cx,
    cy,
    R,
    `rgb(${Math.min(255, r + 40)},${g + 40},${b + 20})`,
    `rgb(${r},${g},${b})`,
    "rgb(18,10,8)",
  );
  surface(ctx, cx, cy, R, molten, oceans, t, s);

  // Çarpışma: parlama ve yörüngeye saçılan enkaz; enkaz toplanıp Ay olur.
  const flash = Math.exp(-(((t - impact) / 0.35) ** 2));
  if (flash > 0.02)
    glow(ctx, cx + R * 0.8, cy - R * 0.5, R * 3 * flash, `rgba(255,240,210,${flash})`);
  const debris = span(t, impact, impact + 1.2);
  const gather = span(t, impact + 1.8, b1 - 0.2);
  const moonAng = 0.5 + t * 0.1;
  const mx = cx + Math.cos(moonAng) * R * 2.3;
  const my = cy + Math.sin(moonAng) * R * 2.3 * 0.4;
  if (debris > 0.01 && gather < 1) {
    for (let i = 0; i < 300; i++) {
      const ang = hash(i * 3.7) * Math.PI * 2 + t * 0.5;
      const rr = R * (1.3 + hash(i * 1.3) * 1.4) * debris;
      const x = lerp(cx + Math.cos(ang) * rr, mx, gather);
      const y = lerp(cy + Math.sin(ang) * rr * 0.42, my, gather);
      dot(
        ctx,
        x,
        y,
        1.4 * s,
        `rgba(255,${Math.round(lerp(170, 220, gather))},120,${0.8 * (1 - gather * 0.7)})`,
      );
    }
  }
  if (gather > 0.01) {
    ctx.save();
    ctx.globalAlpha = alpha * gather;
    sphere(ctx, mx, my, R * 0.27, "rgb(235,232,225)", "rgb(160,158,150)", "rgb(40,40,40)");
    ctx.restore();
    const moonLabel = span(t, b1 - 1.2, b1 - 0.4) * (1 - span(t, b1 + 2.5, b1 + 3));
    callout(f, mx, my, "Ay", moonLabel, mx > w * 0.7 ? -1 : 1, "çarpışma enkazından");
  }
  ctx.restore();

  const card = span(t, b1 + 1.4, b1 + 2.2) * (1 - span(t, b2 - 0.6, b2)) * alpha;
  if (card > 0.01) zircon(f, card);
  const oceanLabel = oceans * (1 - span(t, b2 - 0.6, b2)) * alpha;
  callout(
    f,
    cx - R * 0.55,
    cy + R * 0.2,
    "Okyanuslar dolar",
    oceanLabel,
    -1,
    "ilk kara parçaları küçük",
  );
}

/** Yüzey: kabuk plakaları, aralarındaki akkor çatlaklar, sonra okyanuslar. */
function surface(
  ctx: Ctx,
  cx: number,
  cy: number,
  R: number,
  molten: number,
  oceans: number,
  t: number,
  s: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  if (oceans > 0.01) {
    const sea = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    sea.addColorStop(0, `rgba(70,140,210,${oceans})`);
    sea.addColorStop(1, `rgba(20,55,110,${oceans})`);
    ctx.fillStyle = sea;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }

  // Kabuk plakaları: düzensiz çokgenler; okyanuslar dolunca küçük adalara dönüşür.
  for (let i = 0; i < 16; i++) {
    const px = cx + (hash(i * 5.1) - 0.5) * 1.8 * R;
    const py = cy + (hash(i * 8.3) - 0.5) * 1.8 * R;
    const pr = R * (0.16 + hash(i) * 0.2) * lerp(1, 0.4, oceans);
    const land =
      oceans > 0
        ? `rgba(${Math.round(lerp(40, 120, oceans))},${Math.round(lerp(30, 100, oceans))},${Math.round(lerp(28, 70, oceans))},0.95)`
        : "rgba(34,26,24,0.8)";
    ctx.fillStyle = land;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const rr = pr * (0.7 + hash(i * 13 + k) * 0.5);
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = oceans > 0 ? 1 : 0.45 + 0.55 * (1 - molten);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Akkor çatlaklar: plakaların arasından sızan lav; yumuşak kıvrımlı ve parlayan.
  if (molten > 0.02) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 12; i++) {
      let x = cx + (hash(i * 7.1) - 0.5) * 1.7 * R;
      let y = cy + (hash(i * 2.9) - 0.5) * 1.7 * R;
      const path: [number, number, number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const a = hash(i * 31 + k) * Math.PI * 2;
        const mx = x + Math.cos(a) * R * 0.1;
        const my = y + Math.sin(a) * R * 0.1;
        x = mx + Math.cos(a + 0.6) * R * 0.1;
        y = my + Math.sin(a + 0.6) * R * 0.1;
        path.push([mx, my, x, y]);
      }
      const start: [number, number] = [
        cx + (hash(i * 7.1) - 0.5) * 1.7 * R,
        cy + (hash(i * 2.9) - 0.5) * 1.7 * R,
      ];
      const heat = 0.6 + 0.4 * Math.sin(t * 2 + i);
      for (const [width, color] of [
        [7 * s, `rgba(255,110,40,${0.22 * molten})`],
        [1.4 * s, `rgba(255,${Math.round(190 + 50 * heat)},130,${0.8 * molten})`],
      ] as [number, string][]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, width);
        ctx.beginPath();
        ctx.moveTo(...start);
        for (const [qx, qy, ex, ey] of path) ctx.quadraticCurveTo(qx, qy, ex, ey);
        ctx.stroke();
      }
    }
  }

  // Gölge tarafı ve ince atmosfer.
  const shade = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.55, "rgba(0,0,0,0.1)");
  shade.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

function zircon(f: SceneFrame, alpha: number) {
  const { ctx, w, h, s } = f;
  const cw = 196 * s;
  const ch = 76 * s;
  const x = w > h ? w * 0.18 : w * 0.5 - cw / 2;
  const y = w > h ? h * 0.26 : h * 0.76;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(5,6,10,0.72)";
  roundRect(ctx, x, y, cw, ch, 12 * s);
  ctx.fill();
  const px = x + 30 * s;
  const py = y + ch / 2;
  ctx.fillStyle = "rgb(230,170,120)";
  ctx.beginPath();
  ctx.moveTo(px, py - 26 * s);
  ctx.lineTo(px + 10 * s, py - 14 * s);
  ctx.lineTo(px + 10 * s, py + 14 * s);
  ctx.lineTo(px, py + 26 * s);
  ctx.lineTo(px - 10 * s, py + 14 * s);
  ctx.lineTo(px - 10 * s, py - 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(px - 10 * s, py - 14 * s, 6 * s, 28 * s);
  ctx.restore();
  const muted = "rgba(168,161,148,1)";
  text(f, x + 56 * s, y + 22 * s, "Zirkon kristali", alpha, { align: "left", size: 13 });
  text(f, x + 56 * s, y + 40 * s, "4,4 milyar yaşında", alpha, {
    align: "left",
    size: 11.5,
    color: muted,
  });
  text(f, x + 56 * s, y + 56 * s, "sıvı suyun izini taşıyor", alpha, {
    align: "left",
    size: 11.5,
    color: muted,
  });
}

function hydrothermal(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  ctx.save();
  ctx.globalAlpha = alpha;
  const water = ctx.createLinearGradient(0, 0, 0, h);
  water.addColorStop(0, "rgb(6,22,40)");
  water.addColorStop(1, "rgb(2,8,16)");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, w, h);

  const floorY = h * (w < h ? 0.8 : 0.7);
  const vx = w > h ? w * 0.64 : w * 0.5;
  ctx.fillStyle = "rgb(28,24,22)";
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  for (let x = 0; x <= w; x += 20 * s)
    ctx.lineTo(x, floorY + Math.sin(x * 0.02) * 6 * s + hash(x) * 4 * s);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Baca: düzensiz bir mineral kulesi.
  const top = floorY - Math.min(w, h) * 0.32;
  ctx.fillStyle = "rgb(52,42,36)";
  ctx.beginPath();
  ctx.moveTo(vx - 48 * s, floorY + 4 * s);
  for (let k = 0; k <= 10; k++) {
    const y = lerp(floorY, top, k / 10);
    ctx.lineTo(vx - lerp(48, 12, k / 10) * s + (hash(k * 3.1) - 0.5) * 10 * s, y);
  }
  for (let k = 10; k >= 0; k--) {
    const y = lerp(floorY, top, k / 10);
    ctx.lineTo(vx + lerp(48, 12, k / 10) * s + (hash(k * 7.9) - 0.5) * 10 * s, y);
  }
  ctx.closePath();
  ctx.fill();
  glow(ctx, vx, top, 28 * s, "rgba(255,150,70,0.5)");

  // Siyah duman: mineralli sıcak su yükselip yayılır.
  for (let i = 0; i < 180; i++) {
    const life = (hash(i * 1.3) + (t - b2) * 0.18) % 1;
    const y = top - life * (top - h * 0.08);
    const spread =
      (hash(i * 5.3) - 0.5) * lerp(10, 150, life) * s + Math.sin(t * 1.5 + i) * 6 * s * life;
    const r = lerp(4, 22, life) * s;
    ctx.fillStyle = `rgba(${Math.round(lerp(90, 30, life))},${Math.round(lerp(70, 32, life))},${Math.round(lerp(60, 40, life))},${0.35 * (1 - life)})`;
    ctx.beginPath();
    ctx.arc(vx + spread, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const k = alpha * span(t, b2 + 1.4, b2 + 2.2);
  callout(f, vx + 20 * s, top + 40 * s, "Hidrotermal baca", k, 1, "~350 °C, mineral yüklü su");
  callout(
    f,
    w * (w > h ? 0.9 : 0.8),
    floorY + 10 * s,
    "Okyanus tabanı",
    k * span(t, b2 + 2, b2 + 2.8),
    -1,
    "güneş ışığı ulaşmaz",
  );
}
