import {
  badge,
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

const BASE: Record<string, string> = {
  A: "rgb(255,138,92)",
  U: "rgb(127,208,255)",
  G: "rgb(242,207,107)",
  C: "rgb(155,224,127)",
};
const PAIR: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };
const TEMPLATE = "AUGGCUAACGUC";
const FREE = 90;
const LIPIDS = 64;

/**
 * RNA dünyası: serbest nükleotitler; bir kalıp iplik baz eşleşmesiyle (A–U, G–C)
 * kopyalanır; yağ asitleri kendiliğinden bir kesecik oluşturup ikisini içine alır.
 */
export function rna(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [b0, b1, b2] = beats;
  const [cx, cy] = center(f);
  fill(f, "rgb(6,10,16)");
  glow(ctx, cx, cy, Math.max(w, h) * 0.6, "rgba(40,80,90,0.25)");

  const n = TEMPLATE.length;
  const gap = Math.min(38 * s, (w * 0.8) / n);
  const x0 = cx - (gap * (n - 1)) / 2;
  const yTop = cy - 20 * s;
  const yBot = cy + 20 * s;
  const strand = span(t, b0 - 0.6, b0 + 0.8);

  // Serbest nükleotitler: sıvıda sürüklenir; bazıları kopyaya katılmak için yakalanır.
  for (let i = 0; i < FREE; i++) {
    const letter = "AUGC"[i % 4];
    const [x, y] = drift(f, i);
    dot(ctx, x, y, 3.2 * s, BASE[letter]);
    ctx.strokeStyle = "rgba(220,230,240,0.35)";
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 * s, y - 4 * s);
    ctx.stroke();
  }

  // Kalıp iplik.
  if (strand > 0.01) {
    ctx.save();
    ctx.globalAlpha = strand;
    backbone(f, x0, yTop - 18 * s, gap, n, n);
    for (let k = 0; k < n; k++) base(f, x0 + k * gap, yTop, TEMPLATE[k], -1);
    ctx.restore();
  }

  // Kopya: bazlar birer birer gelip eşleşir, yeni omurga peşlerinden örülür.
  let placed = 0;
  for (let k = 0; k < n; k++) {
    const at = b1 + 0.3 + k * 0.38;
    const m = span(t, at, at + 0.5);
    if (m <= 0) continue;
    placed = k + 1;
    const letter = PAIR[TEMPLATE[k]];
    const [fx, fy] = drift(f, k * 7 + 3);
    const x = lerp(fx, x0 + k * gap, m);
    const y = lerp(fy, yBot, m);
    if (m > 0.95) {
      ctx.strokeStyle = "rgba(243,238,226,0.45)";
      ctx.setLineDash([2 * s, 3 * s]);
      ctx.beginPath();
      ctx.moveTo(x, yTop + 8 * s);
      ctx.lineTo(x, yBot - 8 * s);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    base(f, x, y, letter, 1);
  }
  if (placed > 1) backbone(f, x0, yBot + 18 * s, gap, n, placed - 1);

  // Yağ asidi keseciği: moleküller içe dönük kuyruklarla çift katmanlı bir halka kurar.
  const vesicle = span(t, b2 + 0.2, b2 + 2.4);
  if (vesicle > 0.01) {
    const VR = gap * n * 0.62 + 30 * s;
    for (let i = 0; i < LIPIDS; i++) {
      const ang = (i / LIPIDS) * Math.PI * 2 + t * 0.05;
      for (const layer of [1, -1]) {
        const rr = VR + layer * 9 * s;
        const tx = cx + Math.cos(ang) * rr;
        const ty = cy + Math.sin(ang) * rr * 0.62;
        const [sx, sy] = drift(f, i * 3 + (layer > 0 ? 500 : 900));
        const m = span(t, b2 + 0.2 + hash(i + layer) * 1.4, b2 + 1 + hash(i + layer) * 1.4);
        const x = lerp(sx, tx, m);
        const y = lerp(sy, ty, m);
        const inward = ang + Math.PI * (layer > 0 ? 1 : 0);
        ctx.strokeStyle = "rgba(240,220,170,0.55)";
        ctx.lineWidth = Math.max(1, 1.2 * s);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(inward) * 7 * s, y + Math.sin(inward) * 7 * s * 0.62);
        ctx.stroke();
        dot(ctx, x, y, 2.6 * s, "rgb(250,230,180)");
      }
    }
    callout(
      f,
      cx + VR * 0.72,
      cy - VR * 0.62 * 0.72,
      "Yağ asidi keseciği",
      span(t, b2 + 2.2, b2 + 3),
      cx + VR > w * 0.8 ? -1 : 1,
      "kendiliğinden oluşan zar",
    );
  }

  const [nx, ny] = drift(f, pickFree(f));
  callout(
    f,
    nx,
    ny,
    "Nükleotit",
    span(t, 0.6, 1.4) * (1 - span(t, b0 + 1.6, b0 + 2.2)),
    nx > w * 0.55 ? -1 : 1,
    "RNA’nın yapı taşı",
  );
  text(f, x0 - 16 * s, yTop, "Kalıp", strand * (1 - vesicle), {
    align: "right",
    size: 12,
    color: "rgba(168,161,148,1)",
  });
  text(f, x0 - 16 * s, yBot, "Kopya", span(t, b1 + 0.6, b1 + 1.2) * (1 - vesicle), {
    align: "right",
    size: 12,
    color: "rgba(168,161,148,1)",
  });
  badge(
    f,
    cx,
    h * (w < h ? 0.19 : 0.17),
    "Eşleşme kuralı: A–U · G–C",
    span(t, b1 + 0.2, b1 + 1) * (1 - span(t, b2 - 0.4, b2)),
  );
}

function drift(f: SceneFrame, i: number): [number, number] {
  const { w, h, t, s } = f;
  return [
    (((hash(i * 2.7) * w + t * (hash(i) - 0.5) * 22 * s + Math.sin(t * 0.7 + i) * 12 * s) % w) +
      w) %
      w,
    (((hash(i * 6.1) * h + t * (hash(i + 3) - 0.5) * 22 * s + Math.cos(t * 0.6 + i) * 12 * s) % h) +
      h) %
      h,
  ];
}

function pickFree(f: SceneFrame): number {
  for (let i = 0; i < FREE; i++) {
    const [x, y] = drift({ ...f, t: 0.6 }, i);
    if (x > f.w * 0.2 && x < f.w * 0.8 && y > f.h * 0.25 && y < f.h * 0.5) return i;
  }
  return 0;
}

function base(f: SceneFrame, x: number, y: number, letter: string, dir: 1 | -1) {
  const { ctx, s } = f;
  ctx.fillStyle = BASE[letter];
  const bw = 22 * s;
  const bh = 16 * s;
  roundRect(ctx, x - bw / 2, dir < 0 ? y - bh : y, bw, bh, 3 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(10,12,18,0.9)";
  ctx.font = `700 ${Math.round(Math.max(10, 12 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, x, dir < 0 ? y - bh / 2 : y + bh / 2);
}

function backbone(f: SceneFrame, x0: number, y: number, gap: number, n: number, upto: number) {
  const { ctx, s } = f;
  ctx.strokeStyle = "rgba(220,225,235,0.8)";
  ctx.lineWidth = Math.max(1.5, 3 * s);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0 - gap * 0.4, y);
  ctx.lineTo(x0 + Math.min(n - 1, upto) * gap + gap * 0.4, y);
  ctx.stroke();
  for (let k = 0; k <= Math.min(n - 1, upto); k++)
    dot(ctx, x0 + k * gap, y, 3.2 * s, "rgb(220,225,235)");
}
