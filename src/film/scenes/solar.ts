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
  type SceneFrame,
} from "@/film/scenes/kit";

const DUST = 1700;
const TILT = 0.34;
const FROST = 0.46;

/** Gezegenler: yarıçap (disk yarıçapına oranla, ölçekli değil), boyut, renk, ad. */
const PLANETS: [number, number, string, string][] = [
  [0.14, 2.4, "rgb(180,170,160)", "Merkür"],
  [0.2, 3.4, "rgb(230,200,150)", "Venüs"],
  [0.27, 3.6, "rgb(110,160,230)", "Dünya"],
  [0.34, 2.8, "rgb(210,120,80)", "Mars"],
  [0.6, 10, "rgb(220,190,150)", "Jüpiter"],
  [0.8, 8.5, "rgb(230,210,160)", "Satürn"],
];

function frame(f: SceneFrame): { cx: number; cy: number; R: number } {
  if (f.w > f.h) return { cx: f.w * 0.6, cy: f.h * 0.42, R: Math.min(f.w * 0.4, f.h * 0.95) };
  return { cx: f.w * 0.5, cy: f.h * 0.44, R: f.w * 0.48 };
}

/** Kepler: açısal hız yarıçapın −3/2 kuvvetiyle orantılı; iç yörüngeler daha hızlı. */
const kepler = (rr: number) => Math.min(1.1, 0.03 * Math.pow(Math.max(rr, 0.1), -1.5));

/**
 * Güneş doğuyor: dönen bir bulut çöküp yassı bir diske dönüşür, merkezde füzyon başlar;
 * diskte içteki yörüngeler daha hızlı döner, kayalık gezegenler içeride, devler kar
 * çizgisinin ötesinde toplanır.
 */
export function solar(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const { cx, cy, R } = frame(f);
  fill(f, "rgb(5,5,10)");
  for (let i = 0; i < 140; i++)
    dot(ctx, hash(i * 2.3) * w, hash(i * 6.1) * h, 0.8 * s, "rgba(220,220,255,0.3)");

  const collapse = span(t, 0.3, b1 + 0.6);
  const ignite = span(t, b1 + 0.4, b1 + 1.4);
  const clear = span(t, b2 + 0.6, b2 + 3.5); // gaz temizlenir, gezegenler belirir

  // Molekül bulutu: büyük, bulanık kümeler merkeze doğru toplanır ve yassılaşır.
  for (let i = 0; i < 9; i++) {
    const ang = hash(i * 5.5) * Math.PI * 2 + t * 0.05 * (1 + collapse * 3);
    const r0 = R * (0.35 + hash(i + 4) * 0.7);
    const r = lerp(r0, r0 * 0.35, collapse);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r * lerp(0.8, TILT, collapse);
    glow(ctx, x, y, R * lerp(0.45, 0.25, collapse), `rgba(150,90,60,${0.2 * (1 - clear)})`);
  }

  // Yassı disk: elips biçimli, iç kısmı daha sıcak ve parlak.
  const disk = span(t, b0, b1) * (1 - clear * 0.6);
  if (disk > 0.01) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, TILT);
    const g = ctx.createRadialGradient(0, 0, R * 0.03, 0, 0, R);
    g.addColorStop(0, `rgba(255,200,140,${0.5 * disk})`);
    g.addColorStop(0.35, `rgba(220,140,90,${0.32 * disk})`);
    g.addColorStop(0.7, `rgba(150,110,120,${0.16 * disk})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Toz ve gaz tanecikleri: önce küresel bulut, sonra dönen yassı disk.
  for (let i = 0; i < DUST; i++) {
    const u = hash(i * 1.9);
    const rr = 0.1 + 0.95 * Math.sqrt(u);
    const r = R * rr * lerp(1.2, 1, collapse);
    const ang = hash(i * 7.7) * Math.PI * 2 + t * kepler(rr) * (0.3 + collapse);
    const lift = (hash(i * 3.1) - 0.5) * 2 * R * rr * lerp(0.9, 0.04, collapse);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r * lerp(0.9, TILT, collapse) + lift * TILT;
    const a = lerp(0.7, 0.55, collapse) * (1 - clear * 0.7);
    const warm = rr < FROST ? "236,180,130" : "175,195,235";
    dot(ctx, x, y, 1.3 * s, `rgba(${warm},${a})`);
  }

  // Merkez: önce kırmızımsı ön-yıldız, füzyonla birlikte sarı-beyaz Güneş.
  const coreR = lerp(9, 17, ignite) * s * lerp(1.4, 1, collapse);
  glow(
    ctx,
    cx,
    cy,
    lerp(50, 130, ignite) * s,
    `rgba(${Math.round(lerp(220, 255, ignite))},${Math.round(lerp(90, 210, ignite))},${Math.round(lerp(50, 120, ignite))},${0.5 + 0.35 * collapse})`,
  );
  sphere(
    ctx,
    cx,
    cy,
    coreR,
    "rgb(255,250,230)",
    `rgb(255,${Math.round(lerp(120, 205, ignite))},${Math.round(lerp(70, 90, ignite))})`,
    `rgb(${Math.round(lerp(150, 240, ignite))},${Math.round(lerp(50, 140, ignite))},40)`,
  );
  const flash = Math.exp(-(((t - b1 - 0.9) / 0.4) ** 2));
  if (flash > 0.02) glow(ctx, cx, cy, 240 * s * flash, `rgba(255,250,235,${0.8 * flash})`);

  // Kar çizgisi: buzların donabildiği sınır.
  if (clear > 0.01) {
    ctx.save();
    ctx.globalAlpha = clear * 0.8;
    ctx.setLineDash([6 * s, 6 * s]);
    ctx.strokeStyle = "rgba(170,210,255,0.7)";
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * FROST, R * FROST * TILT, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Gezegenler: yörüngeleri ve Kepler’e uyan hızlarıyla.
  const pos: Record<string, [number, number]> = {};
  PLANETS.forEach(([rr, size, color, name], k) => {
    const a = span(t, b2 + 1 + k * 0.35, b2 + 1.8 + k * 0.35);
    if (a <= 0.01) return;
    const ang = hash(k * 11.3) * Math.PI * 2 + t * kepler(rr);
    const x = cx + Math.cos(ang) * R * rr;
    const y = cy + Math.sin(ang) * R * rr * TILT;
    pos[name] = [x, y];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(243,238,226,0.14)";
    ctx.lineWidth = Math.max(1, 0.8 * s);
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * rr, R * rr * TILT, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (name === "Satürn") {
      ctx.strokeStyle = "rgba(230,215,170,0.8)";
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.ellipse(x, y, size * 2 * s, size * 0.6 * s, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    sphere(ctx, x, y, size * s, "rgba(255,255,255,0.95)", color, "rgba(20,20,30,1)");
    ctx.restore();
  });

  const side = (x: number) => (x > w * 0.7 ? -1 : 1);
  if (pos.Dünya) {
    const [x, y] = pos.Dünya;
    callout(
      f,
      x,
      y,
      "Dünya",
      span(t, b2 + 2.6, b2 + 3.2) * (1 - span(t, b2 + 4.4, b2 + 4.8)),
      side(x),
      "kayalık iç bölgede",
    );
  }
  if (pos.Jüpiter) {
    const [x, y] = pos.Jüpiter;
    callout(
      f,
      x,
      y,
      "Gaz devleri",
      span(t, b2 + 4.8, b2 + 5.4),
      side(x),
      "kar çizgisinin ötesinde",
    );
  }
  text(f, cx + R * FROST, cy - R * FROST * TILT - 12 * s, "Kar çizgisi", clear, {
    size: 12,
    color: "rgba(170,210,255,0.95)",
  });
  callout(
    f,
    cx + 30 * s,
    cy - 8 * s,
    "Ön-yıldız",
    span(t, b0 + 1, b0 + 1.8) * (1 - ignite),
    1,
    "çöken bulutun sıcak merkezi",
  );
  const top = h * (w < h ? 0.19 : 0.17);
  badge(
    f,
    cx,
    top,
    "Çekirdekte hidrojen füzyonu başlar",
    span(t, b1 + 1, b1 + 1.8) * (1 - span(t, b2 - 0.6, b2)),
  );
  badge(f, cx, top, "İç yörüngeler daha hızlı döner · ölçekli değil", span(t, b2 + 0.2, b2 + 1));
}
