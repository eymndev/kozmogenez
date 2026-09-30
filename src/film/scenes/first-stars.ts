import {
  badge,
  callout,
  center,
  dot,
  glow,
  hash,
  lerp,
  pick,
  span,
  type SceneFrame,
} from "@/film/scenes/kit";

const NODES = 22;
const GAS = 520;

/** Büyük bir yıldızın soğan katmanları: dıştan içe, füzyonun ürettiği sırayla. */
const SHELLS: [string, string, string][] = [
  ["H", "Hidrojen", "rgb(110,160,255)"],
  ["He", "Helyum", "rgb(160,205,255)"],
  ["C", "Karbon", "rgb(228,222,206)"],
  ["O", "Oksijen", "rgb(120,222,206)"],
  ["Si", "Silisyum", "rgb(240,204,104)"],
  ["Fe", "Demir", "rgb(255,138,88)"],
];

const EJECTA: [string, string][] = [
  ["C", "rgb(228,222,206)"],
  ["O", "rgb(120,222,206)"],
  ["Si", "rgb(240,204,104)"],
  ["Ca", "rgb(236,150,210)"],
  ["Fe", "rgb(255,138,88)"],
];

/**
 * İlk yıldızlar: karanlık madde ağının düğümlerinde gaz toplanır ve çöker, bir yıldız
 * yanar; çekirdeğinde katman katman ağır elementler birikir; süpernova onları saçar.
 */
export function firstStars(f: SceneFrame) {
  const { ctx, w, h, t, beats } = f;
  const [, b1, b2] = beats;
  ctx.fillStyle = "rgb(4,5,10)";
  ctx.fillRect(0, 0, w, h);

  const web = 1 - span(t, b1 - 0.2, b1 + 1.2);
  if (web > 0.01) drawWeb(f, web);
  const star = span(t, b1 - 0.6, b1 + 0.8) * (1 - span(t, b2 + 0.2, b2 + 0.9));
  if (star > 0.01) drawStar(f, star);
  if (t > b2) drawSupernova(f);
}

function node(f: SceneFrame, i: number): [number, number] {
  const [cx, cy] = center(f);
  if (i === 0) return [cx, cy];
  return [hash(i * 4.1) * f.w * 1.1 - f.w * 0.05, hash(i * 7.3) * f.h * 1.1 - f.h * 0.05];
}

function edges(f: SceneFrame): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < NODES; i++) {
    const [x, y] = node(f, i);
    const near = Array.from({ length: NODES }, (_, j) => j)
      .filter((j) => j !== i)
      .map((j) => {
        const [x2, y2] = node(f, j);
        return [j, Math.hypot(x2 - x, y2 - y)] as const;
      })
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);
    for (const [j] of near)
      if (i < j || !out.some(([a, b]) => a === j && b === i)) out.push([i, j]);
  }
  return out;
}

function drawWeb(f: SceneFrame, alpha: number) {
  const { ctx, t, beats, s } = f;
  const [b0, b1] = beats;
  const [cx, cy] = center(f);
  const zoom = 1 + 0.9 * span(t, b1 - 0.8, b1 + 1.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  const links = edges(f);
  // Karanlık madde iplikleri: görünmez; burada soluk mor bir iskelet olarak çizilir.
  ctx.lineCap = "round";
  for (const [a, b] of links) {
    const [x1, y1] = node(f, a);
    const [x2, y2] = node(f, b);
    ctx.strokeStyle = "rgba(120,90,200,0.10)";
    ctx.lineWidth = 16 * s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(150,120,230,0.28)";
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }
  for (let i = 0; i < NODES; i++) {
    const [x, y] = node(f, i);
    glow(ctx, x, y, (i === 0 ? 70 : 34) * s, "rgba(140,110,230,0.28)");
  }

  // Gaz: ipliklerden düğümlere akar; merkezdeki bulut döne döne büzülür.
  const collapse = span(t, b0, b1 - 0.4);
  for (let i = 0; i < GAS; i++) {
    const [a, b] = links[i % links.length];
    const [x1, y1] = node(f, a);
    const [x2, y2] = node(f, b);
    const u = (hash(i * 1.7) + t * 0.05 * (0.6 + hash(i))) % 1;
    const j = (hash(i * 3.3) - 0.5) * 10 * s;
    let x = lerp(x1, x2, u) + j;
    let y = lerp(y1, y2, u) - j;
    if (i % 5 === 0) {
      const r = lerp(150, 16, collapse) * s * (0.3 + hash(i + 2) * 0.7);
      const ang = hash(i) * Math.PI * 2 + t * (0.4 + collapse * 2.5);
      x = cx + Math.cos(ang) * r;
      y = cy + Math.sin(ang) * r * 0.6;
    }
    dot(ctx, x, y, 1.6 * s, "rgba(130,190,255,0.7)");
  }
  glow(ctx, cx, cy, lerp(90, 30, collapse) * s, `rgba(150,200,255,${0.25 + 0.35 * collapse})`);
  const ignite = span(t, b1 - 0.9, b1 - 0.2);
  if (ignite > 0.01) glow(ctx, cx, cy, 120 * s * ignite, `rgba(235,245,255,${ignite})`);
  ctx.restore();

  // İpliğin ortasından bir nokta: güvenli bölgede kalan ilk kenar.
  const mid = (i: number): [number, number] => {
    const [a, b] = links[i % links.length];
    const [x1, y1] = node(f, a);
    const [x2, y2] = node(f, b);
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  };
  const [lx, ly] = mid(pick(f, mid, 1, links.length - 1, 0));
  callout(
    f,
    lx,
    ly,
    "Karanlık madde ipliği",
    span(t, b0 + 0.6, b0 + 1.4) * alpha * (1 - span(t, b0 + 2, b0 + 2.6)),
    lx > f.w * 0.55 ? -1 : 1,
    "görünmez iskelet",
  );
  callout(
    f,
    cx + 18 * s,
    cy,
    "Hidrojen bulutu çöker",
    span(t, b0 + 2.4, b0 + 3.2) * alpha * (1 - ignite),
    1,
  );
}

function drawStar(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, b1, b2] = beats;
  const [cx, cy] = center(f);
  const R = Math.min(w, h) * 0.26 * lerp(0.4, 1, span(t, b1 - 0.4, b1 + 1));
  const x = w > h ? cx - w * 0.08 : cx;
  const pulse = 1 + Math.sin(t * 3) * 0.01;

  ctx.save();
  ctx.globalAlpha = alpha;
  glow(ctx, x, cy, R * 2.4, "rgba(170,205,255,0.35)");
  const surface = ctx.createRadialGradient(x - R * 0.3, cy - R * 0.3, R * 0.1, x, cy, R);
  surface.addColorStop(0, "rgb(245,250,255)");
  surface.addColorStop(0.7, "rgb(185,215,255)");
  surface.addColorStop(1, "rgb(110,150,240)");
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(x, cy, R * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Kesit: sağ üst çeyrek açılır, katmanlar dıştan içe birer birer belirir.
  const open = span(t, b1 + 0.6, b1 + 1.6);
  if (open > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.arc(x, cy, R * pulse + 1, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * open);
    ctx.closePath();
    ctx.clip();
    SHELLS.forEach(([, , color], k) => {
      const appear = span(t, b1 + 1 + k * 0.7, b1 + 1.6 + k * 0.7);
      const r = R * (1 - k * 0.15);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * (k === 0 ? 1 : appear);
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `500 ${Math.round(Math.max(11, 13 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    SHELLS.forEach(([sym, name], k) => {
      const appear = span(t, b1 + 1.1 + k * 0.7, b1 + 1.7 + k * 0.7) * (1 - span(t, b2 - 0.4, b2));
      if (appear <= 0.01) return;
      const r = R * (1 - k * 0.15 - 0.075);
      const ang = -Math.PI / 4 - 0.12 + k * 0.08;
      const px = x + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      const lx = x + R * 1.25;
      const ly = cy - R * 0.85 + k * 24 * s;
      ctx.globalAlpha = alpha * appear;
      ctx.strokeStyle = "rgba(243,238,226,0.55)";
      ctx.lineWidth = Math.max(1, s);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(lx - 8 * s, ly);
      ctx.stroke();
      dot(ctx, px, py, 2 * s, "rgba(243,238,226,0.9)");
      ctx.fillStyle = SHELLS[k][2];
      ctx.textAlign = "left";
      ctx.fillText(sym, lx, ly);
      ctx.fillStyle = "rgba(243,238,226,0.9)";
      ctx.fillText(name, lx + 26 * s, ly);
    });
    ctx.restore();
  }
  ctx.restore();

  badge(
    f,
    x,
    cy - R - 30 * s,
    "Kütle: Güneş’in onlarca, belki yüzlerce katı",
    span(t, b1 + 0.4, b1 + 1.2) * (1 - span(t, b2 - 0.6, b2)) * alpha,
  );
}

function drawSupernova(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  const [cx0, cy] = center(f);
  const cx = w > h ? cx0 - w * 0.08 * (1 - span(t, b2, b2 + 3)) : cx0;
  const age = t - b2;
  const flash = Math.exp(-(((age - 0.35) / 0.35) ** 2));
  const reach = Math.max(w, h) * 0.55 * (1 - Math.exp(-age * 0.55));

  ctx.save();
  glow(ctx, cx, cy, Math.max(w, h) * 0.6 * flash, `rgba(255,250,240,${0.9 * flash})`);
  // Şok dalgası kabuğu.
  ctx.strokeStyle = `rgba(255,190,140,${0.5 * Math.exp(-age * 0.3)})`;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, reach, 0, Math.PI * 2);
  ctx.stroke();
  glow(ctx, cx, cy, reach, "rgba(255,120,80,0.10)");

  for (let i = 0; i < 700; i++) {
    const [, color] = EJECTA[i % EJECTA.length];
    const ang = hash(i * 2.9) * Math.PI * 2;
    const r = reach * (0.35 + 0.65 * hash(i * 5.7)) * (0.92 + Math.sin(ang * 7 + i) * 0.08);
    dot(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1.8 * s, color);
  }
  ctx.restore();

  const legend = span(t, b2 + 1.6, b2 + 2.4);
  if (legend > 0.01) {
    const y = h * (w < h ? 0.19 : 0.17);
    const gap = 58 * s;
    ctx.save();
    ctx.globalAlpha = legend;
    ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    EJECTA.forEach(([sym, color], k) => {
      const x = cx0 - ((EJECTA.length - 1) * gap) / 2 + k * gap - 10 * s;
      dot(ctx, x, y, 5 * s, color);
      ctx.fillStyle = "rgba(243,238,226,0.95)";
      ctx.fillText(sym, x + 10 * s, y);
    });
    ctx.restore();
  }
  callout(
    f,
    cx + reach * 0.5,
    cy - reach * 0.2,
    "Süpernova",
    span(t, b2 + 1, b2 + 1.8),
    1,
    "elementler uzaya saçılır",
  );
}
