type Ctx = CanvasRenderingContext2D;

type Shot = {
  src: string;
  z0: number;
  z1: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

const SHOTS: Record<string, Shot[]> = {
  patlama: [{ src: "/cosmos/patlama.jpg", z0: 1.42, z1: 1.04, x0: 0, y0: 0.02, x1: 0, y1: 0 }],
  isik: [{ src: "/cosmos/isik.jpg", z0: 1.08, z1: 1.2, x0: -0.02, y0: 0, x1: 0.03, y1: 0 }],
  yildiz: [{ src: "/cosmos/yildiz.jpg", z0: 1.05, z1: 1.22, x0: -0.02, y0: 0, x1: 0.06, y1: -0.01 }],
  galaksi: [{ src: "/cosmos/galaksi.jpg", z0: 1.16, z1: 1.02, x0: 0.02, y0: 0, x1: -0.02, y1: 0 }],
  gunes: [{ src: "/cosmos/gunes.jpg", z0: 1.28, z1: 1.04, x0: 0, y0: 0.02, x1: 0, y1: 0 }],
  dunya: [
    { src: "/cosmos/dunya.jpg", z0: 1.2, z1: 1.05, x0: 0.02, y0: 0, x1: -0.01, y1: 0 },
    { src: "/cosmos/bacalar.jpg", z0: 1.08, z1: 1.2, x0: 0, y0: 0.04, x1: 0, y1: -0.02 },
  ],
  rna: [{ src: "/cosmos/rna.jpg", z0: 1.06, z1: 1.18, x0: 0.02, y0: 0.02, x1: -0.01, y1: -0.02 }],
  dna: [{ src: "/cosmos/dna.jpg", z0: 1.12, z1: 1.02, x0: 0, y0: 0.05, x1: 0, y1: -0.03 }],
  oksijen: [{ src: "/cosmos/hucre.jpg", z0: 1.16, z1: 1.02, x0: 0.03, y0: 0, x1: -0.02, y1: 0 }],
  kara: [
    { src: "/cosmos/kambriyen.jpg", z0: 1.04, z1: 1.16, x0: -0.02, y0: 0.02, x1: 0.02, y1: 0 },
    { src: "/cosmos/kita.jpg", z0: 1.14, z1: 1.04, x0: 0.03, y0: 0, x1: -0.02, y1: 0 },
  ],
  dino: [
    { src: "/cosmos/dino.jpg", z0: 1.08, z1: 1.18, x0: -0.03, y0: 0, x1: 0.02, y1: 0 },
    { src: "/cosmos/carpisma.jpg", z0: 1.12, z1: 1.02, x0: 0, y0: 0.02, x1: 0, y1: -0.01 },
  ],
  insan: [{ src: "/cosmos/insan.jpg", z0: 1.14, z1: 1.02, x0: 0.02, y0: 0.04, x1: -0.01, y1: -0.03 }],
};

const ready = new Map<string, HTMLImageElement>();
let started = false;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function preloadPlates(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const srcs = new Set<string>();
  for (const shots of Object.values(SHOTS)) {
    for (const shot of shots) srcs.add(shot.src);
  }
  for (const src of srcs) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      ready.set(src, img);
    };
  }
}

function paintShot(ctx: Ctx, img: HTMLImageElement, shot: Shot, w: number, h: number, t: number) {
  const zoom = lerp(shot.z0, shot.z1, t);
  const shiftX = lerp(shot.x0, shot.x1, t);
  const shiftY = lerp(shot.y0, shot.y1, t);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2 + shiftX * w, (h - dh) / 2 + shiftY * h, dw, dh);
}

export function drawPlate(ctx: Ctx, w: number, h: number, id: string, p: number): boolean {
  const shots = SHOTS[id];
  if (!shots) return false;
  const first = ready.get(shots[0].src);
  if (!first) return false;
  const second = shots[1] ? ready.get(shots[1].src) : undefined;

  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (!second) {
    paintShot(ctx, first, shots[0], w, h, p);
    return true;
  }

  const cut = smooth((p - 0.4) / 0.18);
  paintShot(ctx, first, shots[0], w, h, Math.min(1, p / 0.55));
  if (cut > 0.004) {
    ctx.save();
    ctx.globalAlpha = cut;
    paintShot(ctx, second, shots[1], w, h, smooth((p - 0.4) / 0.6));
    ctx.restore();
  }
  return true;
}
