import {
  badge,
  board,
  callout,
  center,
  dot,
  fill,
  glow,
  hash,
  lerp,
  span,
  text,
  type SceneFrame,
} from "@/film/scenes/kit";

const PAIRS: [string, string, string, string][] = [
  ["A", "T", "rgb(255,138,92)", "rgb(214,120,240)"],
  ["G", "C", "rgb(242,207,107)", "rgb(155,224,127)"],
];

/**
 * DNA ve ortak ata: dönen bir çift sarmal (A–T, G–C); sonra bütün canlıların soy ağacı
 * LUCA’dan büyür ve iki büyük dala, bakterilere ve arkelere ayrılır.
 */
export function luca(f: SceneFrame) {
  const { t, beats } = f;
  const [, b1] = beats;
  fill(f, "rgb(5,7,12)");
  const helixOut = span(t, b1 - 0.3, b1 + 1.2);
  if (helixOut < 1) helix(f, 1 - helixOut);
  if (helixOut > 0) tree(f, helixOut);
}

function helix(f: SceneFrame, alpha: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0] = beats;
  const [cx, cy] = center(f);
  const L = Math.min(w * 0.84, 820 * s);
  const A = Math.min(h * 0.13, 74 * s);
  const steps = 120;
  const turn = 0.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  glow(ctx, cx, cy, L * 0.6, "rgba(90,120,200,0.16)");

  // Çift sarmal: iki omurga şeridi ve aralarındaki baz çiftleri. Arkadakiler önce çizilir.
  const items: { z: number; draw: () => void }[] = [];
  const at = (k: number, strand: 0 | 1) => {
    const phi = k * turn + t * 1.1 + strand * Math.PI;
    return { x: cx - L / 2 + (L * k) / steps, y: cy + Math.sin(phi) * A, z: Math.cos(phi) };
  };
  for (let k = 0; k < steps; k++) {
    for (const strand of [0, 1] as const) {
      const a = at(k, strand);
      const b = at(k + 1, strand);
      const z = (a.z + b.z) / 2;
      items.push({
        z,
        draw: () => {
          ctx.strokeStyle = `rgba(215,225,245,${0.3 + 0.7 * ((z + 1) / 2)})`;
          ctx.lineWidth = Math.max(1.5, (3.2 + 1.6 * z) * s);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        },
      });
    }
    if (k % 3 === 0) {
      const a = at(k, 0);
      const b = at(k, 1);
      const [, , c1, c2] = PAIRS[Math.floor(hash(k * 3.3) * 2)];
      const flip = hash(k * 5.1) > 0.5;
      const z = (a.z + b.z) / 2 - 0.05;
      const depth = 0.35 + 0.65 * Math.abs(Math.sin(k * turn + t * 1.1));
      items.push({
        z,
        draw: () => {
          ctx.globalAlpha = alpha * depth;
          ctx.lineWidth = Math.max(1.5, 3 * s);
          ctx.strokeStyle = flip ? c2 : c1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x, (a.y + b.y) / 2);
          ctx.stroke();
          ctx.strokeStyle = flip ? c1 : c2;
          ctx.beginPath();
          ctx.moveTo(a.x, (a.y + b.y) / 2);
          ctx.lineTo(a.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = alpha;
        },
      });
    }
  }
  ctx.lineCap = "round";
  items.sort((p, q) => p.z - q.z).forEach((i) => i.draw());
  ctx.restore();

  const labels = span(t, b0 + 0.6, b0 + 1.4) * alpha;
  const kx = Math.round(steps * 0.3);
  const top = at(kx, Math.sin(kx * turn + t * 1.1) < 0 ? 0 : 1);
  callout(f, top.x, top.y, "Şeker-fosfat omurgası", labels, 1);
  const rung = Math.round((steps * 0.62) / 3) * 3;
  const r0 = at(rung, 0);
  const r1 = at(rung, 1);
  callout(
    f,
    r0.x,
    (r0.y + r1.y) / 2,
    "Baz çiftleri",
    labels * span(t, b0 + 1.2, b0 + 2),
    1,
    "A–T · G–C",
  );
  badge(f, cx, h * (w < h ? 0.19 : 0.17), "DNA arşivler · RNA taşır · protein iş görür", labels);
}

type Branch = { x1: number; y1: number; x2: number; y2: number; depth: number; start: number };

function tree(f: SceneFrame, alpha: number) {
  const { ctx, t, beats, s } = f;
  const [, b1, b2] = beats;
  const box = board(f);
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const rootX = box.x0 + bw * 0.5;
  const rootY = box.y1;
  const grow = span(t, b1 + 0.2, b2 + 2.4) * 1.15;

  const branches: Branch[] = [];
  branches.push({ x1: rootX, y1: rootY, x2: rootX, y2: rootY - bh * 0.24, depth: 0, start: 0 });
  const split = (
    x: number,
    y: number,
    dir: number,
    len: number,
    depth: number,
    start: number,
    seed: number,
  ) => {
    const ang = -Math.PI / 2 + dir * (0.35 + hash(seed) * 0.25);
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    branches.push({ x1: x, y1: y, x2, y2, depth, start });
    if (depth >= 4) return;
    const next = start + 0.19;
    split(x2, y2, -1, len * 0.72, depth + 1, next, seed * 1.7 + 1);
    split(x2, y2, 1, len * 0.72, depth + 1, next, seed * 2.3 + 2);
  };
  const forkY = rootY - bh * 0.24;
  split(rootX, forkY, -1.6, bh * 0.26, 1, 0.22, 3); // bakteriler
  split(rootX, forkY, 1.6, bh * 0.26, 1, 0.22, 7); // arkeler

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  for (const br of branches) {
    const k = Math.min(1, Math.max(0, (grow - br.start) / 0.2));
    if (k <= 0) continue;
    const left = br.x2 < rootX - 1;
    ctx.strokeStyle =
      br.depth === 0
        ? "rgba(243,238,226,0.9)"
        : left
          ? "rgba(120,200,255,0.85)"
          : "rgba(255,170,110,0.85)";
    ctx.lineWidth = Math.max(1, (5 - br.depth) * 1.1 * s);
    ctx.beginPath();
    ctx.moveTo(br.x1, br.y1);
    ctx.lineTo(lerp(br.x1, br.x2, k), lerp(br.y1, br.y2, k));
    ctx.stroke();
    if (k >= 1 && br.depth === 4)
      dot(ctx, br.x2, br.y2, 2.2 * s, left ? "rgb(120,200,255)" : "rgb(255,170,110)");
  }
  // Ökaryotlar, arkelerin içinden çıkar (sonraki bölümün konusu): kesikli bir filiz.
  const euk = span(t, b2 + 2.2, b2 + 3.2);
  if (euk > 0.01) {
    const from = branches.find((b) => b.depth === 2 && b.x2 > rootX) ?? branches[0];
    ctx.setLineDash([5 * s, 5 * s]);
    ctx.strokeStyle = "rgba(170,230,160,0.9)";
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.moveTo(from.x2, from.y2);
    ctx.lineTo(lerp(from.x2, from.x2 - bw * 0.08, euk), lerp(from.y2, box.y0 + bh * 0.1, euk));
    ctx.stroke();
    ctx.setLineDash([]);
    text(f, from.x2 - bw * 0.08, box.y0 + bh * 0.03, "Ökaryotlar (sonra)", euk, {
      size: 12,
      color: "rgba(170,230,160,1)",
    });
  }
  ctx.restore();

  glow(ctx, rootX, rootY, 26 * s, `rgba(243,238,226,${0.5 * alpha})`);
  dot(ctx, rootX, rootY, 4 * s, `rgba(243,238,226,${alpha})`);
  text(
    f,
    rootX,
    rootY + 16 * s,
    "LUCA · ~4,2 milyar yıl önce",
    alpha * span(t, b1 + 0.4, b1 + 1.2),
    { size: 12.5 },
  );
  const lab = span(t, b2 + 0.8, b2 + 1.6) * alpha;
  text(f, box.x0 + bw * 0.12, box.y0 + bh * 0.03, "Bakteriler", lab, {
    size: 14,
    weight: 600,
    color: "rgb(120,200,255)",
  });
  text(f, box.x1 - bw * 0.1, box.y0 + bh * 0.03, "Arkeler", lab, {
    size: 14,
    weight: 600,
    color: "rgb(255,170,110)",
  });
}
