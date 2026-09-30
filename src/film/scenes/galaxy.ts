import {
  callout,
  dot,
  fill,
  glow,
  hash,
  lerp,
  nearest,
  span,
  text,
  type SceneFrame,
} from "@/film/scenes/kit";

const STARS = 2200;
const DWARFS = 9;
const TILT = 0.62;

/** Yatay ekranda galaksi altyazıların sağına kayar; dikeyde ortadadır. */
function frame(f: SceneFrame): { cx: number; cy: number; R: number } {
  if (f.w > f.h) return { cx: f.w * 0.6, cy: f.h * 0.4, R: Math.min(f.w * 0.34, f.h * 0.44) };
  return { cx: f.w * 0.5, cy: f.h * 0.44, R: Math.min(f.w * 0.46, f.h * 0.4) };
}

function dwarfAt(f: SceneFrame, d: number, time: number): [number, number] {
  const { cx, cy, R } = frame(f);
  const [, b1] = f.beats;
  const a0 = hash(d * 3.3) * Math.PI * 2 + time * 0.08;
  const r0 = R * (0.75 + hash(d + 1) * 0.6);
  const fall = span(time, b1 - 0.8 + hash(d + 7) * 1.4, b1 + 2.6 + hash(d + 7) * 1.8);
  const r = r0 * (1 - fall * 0.85);
  return [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * TILT];
}

/**
 * Samanyolu: karanlık madde halesi içinde cüce galaksiler birleşir, dönen bir disk ve
 * sarmal kollar oluşur; Güneş merkezden yarıçapın yaklaşık yarısında.
 */
export function galaxy(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const { cx, cy, R } = frame(f);
  const form = span(t, b1 - 0.4, b2 - 0.2);
  const rot = t * 0.06;
  fill(f, "rgb(5,5,12)");

  // Arka plan yıldızları (galaksimizin dışı): sabit, soluk.
  for (let i = 0; i < 160; i++)
    dot(ctx, hash(i * 2.1) * w, hash(i * 5.7) * h, 0.8 * s, "rgba(220,220,255,0.35)");

  // Karanlık madde halesi.
  const halo = span(t, 0.2, b0 + 0.8);
  glow(ctx, cx, cy, R * 1.6, `rgba(120,90,200,${0.16 * halo})`);

  // Cüce galaksiler: dağınık; kütleçekimle içeri düşüp dağılır.
  for (let d = 0; d < DWARFS; d++) {
    const fall = span(t, b1 - 0.8 + hash(d + 7) * 1.4, b1 + 2.6 + hash(d + 7) * 1.8);
    const [x, y] = dwarfAt(f, d, t);
    const size = (14 + hash(d + 2) * 16) * s * (1 + fall * 1.5);
    const alpha = halo * (1 - fall);
    if (alpha < 0.02) continue;
    glow(ctx, x, y, size * 1.6, `rgba(200,210,255,${0.25 * alpha})`);
    for (let k = 0; k < 40; k++) {
      const ang = hash(d * 100 + k) * Math.PI * 2;
      const rr = size * Math.sqrt(hash(d * 100 + k + 0.5));
      dot(
        ctx,
        x + Math.cos(ang) * rr,
        y + Math.sin(ang) * rr * 0.8,
        1.1 * s,
        `rgba(235,235,255,${0.8 * alpha})`,
      );
    }
  }

  // Disk: iki ana sarmal kol, yaşlı sarı merkez, genç mavi-beyaz kollar ve gaz bulutları.
  if (form > 0.01) {
    glow(ctx, cx, cy, R * 0.34, `rgba(255,220,160,${0.55 * form})`);
    glow(ctx, cx, cy, R * 1.05, `rgba(150,160,220,${0.12 * form})`);
    for (let i = 0; i < STARS; i++) {
      const u = hash(i * 1.37);
      const r = R * Math.min(1, -Math.log(1 - 0.97 * u) / 3.2);
      const arm = i % 2;
      const spread = (hash(i * 4.1) - 0.5) * lerp(2.4, 0.5, Math.min(1, r / (R * 0.4)));
      const theta = arm * Math.PI + 2.3 * Math.log(1 + r / (0.14 * R)) + spread + rot;
      const born = span(t, b1 + hash(i) * 2.2, b1 + 1 + hash(i) * 2.2);
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r * TILT;
      const inner = r < R * 0.25;
      const color = inner ? "255,226,180" : hash(i + 9) > 0.8 ? "170,200,255" : "236,232,255";
      const a = 0.85 * form * born;
      if (!inner && i % 23 === 0) glow(ctx, x, y, 12 * s, `rgba(150,170,255,${0.1 * a})`);
      if (!inner && i % 61 === 0) glow(ctx, x, y, 5 * s, `rgba(255,120,150,${0.35 * a})`);
      dot(ctx, x, y, (hash(i + 3) > 0.94 ? 1.7 : 1.05) * s, `rgba(${color},${a})`);
    }
  }

  const side = (x: number) => (x > w * 0.55 ? -1 : 1);
  const haloLabel = span(t, b0 + 0.6, b0 + 1.4) * (1 - span(t, b1, b1 + 0.6));
  callout(
    f,
    cx - R * 0.95,
    cy - R * 0.25,
    "Karanlık madde halesi",
    haloLabel,
    1,
    "görünmez, ama kütlesi baskın",
  );
  const dw = nearest((d, time) => dwarfAt(f, d, time), 0, DWARFS, b0 + 2, [w * 0.62, h * 0.34]);
  const [dx, dy] = dwarfAt(f, dw, t);
  const dwLabel = span(t, b0 + 2, b0 + 2.8) * (1 - span(t, b1 + 1.2, b1 + 1.8));
  callout(f, dx, dy, "Cüce galaksi", dwLabel, side(dx), "birleşerek büyür");

  // Güneş: merkezden ~26.000 ışık yılı; disk yarıçapı ~50.000 ışık yılı.
  const sun = span(t, b2 + 0.4, b2 + 1.2);
  if (sun > 0.01) {
    const base = 2.3 * Math.log(1 + 0.52 / 0.14) + rot;
    // İki koldan, o an yana doğru bakanı seç: etiket merkezle çakışmasın.
    const arm = Math.abs(Math.cos(base + 0.35)) > Math.abs(Math.cos(base + 0.35 + Math.PI)) ? 0 : 1;
    const theta = base + 0.35 + arm * Math.PI;
    const x = cx + Math.cos(theta) * R * 0.52;
    const y = cy + Math.sin(theta) * R * 0.52 * TILT;
    const pulse = 1 + 0.25 * Math.sin(t * 4);
    ctx.save();
    ctx.globalAlpha = sun;
    ctx.strokeStyle = "rgba(255,200,110,0.95)";
    ctx.lineWidth = Math.max(1.2, 1.6 * s);
    ctx.beginPath();
    ctx.arc(x, y, 7 * s * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    dot(ctx, x, y, 2.6 * s, `rgba(255,220,140,${sun})`);
    const dir = x > cx ? 1 : -1;
    callout(
      f,
      x,
      y,
      "Güneş",
      sun * (1 - span(t, b2 + 3.6, b2 + 4)),
      dir,
      "merkezden ~26.000 ışık yılı",
    );
    callout(
      f,
      cx,
      cy,
      "Şişkin merkez",
      span(t, b2 + 4, b2 + 4.6),
      dir > 0 ? -1 : 1,
      "yaşlı, sarımsı yıldızlar",
    );

    const bar = R * 0.2;
    const bx = cx - R * 0.85;
    const by = cy - R * TILT - 14 * s;
    const scaleA = span(t, b2 + 1.8, b2 + 2.6);
    ctx.save();
    ctx.globalAlpha = scaleA;
    ctx.strokeStyle = "rgba(243,238,226,0.8)";
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bar, by);
    ctx.moveTo(bx, by - 4 * s);
    ctx.lineTo(bx, by + 4 * s);
    ctx.moveTo(bx + bar, by - 4 * s);
    ctx.lineTo(bx + bar, by + 4 * s);
    ctx.stroke();
    ctx.restore();
    text(f, bx + bar / 2, by + 14 * s, "10.000 ışık yılı", scaleA, { size: 11 });
  }
}
