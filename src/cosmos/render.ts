import { drawPlate } from "@/cosmos/plates";

type Ctx = CanvasRenderingContext2D;

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

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

function fx(w: number): number {
  return w < 960 ? w * 0.5 : w * 0.58;
}

function fy(w: number, h: number): number {
  if (w < 800) return h * 0.3;
  return h * 0.38;
}

function glow(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function starfield(ctx: Ctx, w: number, h: number, seed: number, count: number, alpha: number, p: number) {
  for (let i = 0; i < count; i++) {
    const x = hash(seed + i * 1.13) * w;
    const y = hash(seed + i * 2.71) * h;
    const mag = hash(seed + i * 4.2);
    const r = mag > 0.97 ? 1.8 : mag > 0.84 ? 1.15 : 0.55;
    const tw = 0.62 + 0.38 * Math.sin(i * 1.7 + p * 10 + seed);
    const tint = mag > 0.975 ? "186,210,232" : mag > 0.93 ? "232,196,150" : "243,239,228";
    ctx.fillStyle = `rgba(${tint},${alpha * (0.28 + mag * 0.72) * tw})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function vignette(ctx: Ctx, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.55, h * 0.38, Math.min(w, h) * 0.2, w * 0.5, h * 0.45, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function wash(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#07080c");
  g.addColorStop(1, "#10131a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sceneBang(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  const cx = fx(w);
  const cy = fy(w, h);
  const expansion = smooth(p / 0.9);
  const flash = Math.exp(-((p - 0.16) ** 2) * 70);
  if (flash > 0.02) {
    glow(ctx, cx, cy, Math.max(w, h) * 0.65, `rgba(255,246,230,${flash * 0.85})`, "rgba(255,140,50,0)");
  }
  const count = 640;
  const reach = Math.min(w, h) * 0.5;
  for (let i = 0; i < count; i++) {
    const ang = hash(i) * Math.PI * 2;
    const rad = Math.pow(hash(i + 9), 0.62);
    const dist = (0.02 + expansion * rad) * reach;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist * 0.9;
    const heat = clamp01(1.05 - rad * 0.45 - expansion * 0.35);
    const r = Math.floor(lerp(180, 255, heat));
    const g = Math.floor(lerp(70, 236, heat));
    const b = Math.floor(lerp(32, 210, heat));
    const alpha = 0.25 + (1 - rad) * 0.7;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    const s = (1 - rad) * 2.4 + 0.6;
    ctx.fillRect(x, y, s, s);
  }
  glow(ctx, cx, cy, 18 + (1 - expansion) * 36 + flash * 40, "rgba(255,250,240,0.95)", "rgba(255,170,70,0)");
  for (let k = 0; k < 3; k++) {
    const rp = p * 1.25 - k * 0.16;
    if (rp <= 0 || rp >= 1) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, rp * Math.min(w, h) * 0.46, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(243,220,180,${(1 - rp) * 0.28})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function sceneLight(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  const cell = Math.max(12, Math.sqrt((w * h) / 3200));
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const reveal = smooth(p / 0.22);
  const dissolve = smooth((p - 0.55) / 0.38);
  ctx.save();
  ctx.globalAlpha = reveal * (1 - dissolve * 0.94);
  const cw = w / cols;
  const rh = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = hash(x * 13.1 + y * 47.7);
      const m = hash(x * 3.7 + y * 9.1 + (x + y) * 0.17);
      const heat = n * 0.72 + m * 0.28;
      const r = 28 + heat * 200;
      const g = 48 + (1 - heat) * 70 + heat * 50;
      const b = 168 - heat * 130;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x * cw, y * rh, cw + 0.6, rh + 0.6);
    }
  }
  ctx.restore();
  const flash = Math.exp(-((p - 0.2) ** 2) * 90);
  if (flash > 0.02) {
    ctx.fillStyle = `rgba(255,244,220,${flash * 0.28})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (dissolve > 0.01) starfield(ctx, w, h, 4, Math.floor(200 * dissolve), dissolve, p);
}

function sceneStars(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  starfield(ctx, w, h, 8, 80, 0.35, p);
  const n = 48;
  let burstX = fx(w);
  let burstY = fy(w, h);
  for (let i = 0; i < n; i++) {
    const appear = smooth((p * 1.05 - hash(i) * 0.62) / 0.22);
    if (appear <= 0) continue;
    const x = hash(i + 20) * w * 0.86 + w * 0.07;
    const y = hash(i + 80) * h * 0.62 + h * 0.06;
    const big = i % 11 === 0;
    const rad = (big ? 2.4 : 1.1) * appear;
    glow(ctx, x, y, rad * (big ? 16 : 8), `rgba(255,244,220,${0.55 * appear})`, "rgba(255,180,80,0)");
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,248,236,${appear})`;
    ctx.fill();
    if (i === 11) {
      burstX = x;
      burstY = y;
    }
  }
  if (p > 0.68) {
    const u = smooth((p - 0.68) / 0.12);
    const fade = 1 - smooth((p - 0.9) / 0.1);
    glow(ctx, burstX, burstY, 20 + u * Math.min(w, h) * 0.28, `rgba(255,250,240,${0.9 * fade})`, "rgba(255,120,40,0)");
    const elements = ["C", "O", "Si", "Fe", "Ca"];
    for (let i = 0; i < elements.length; i++) {
      const ang = -Math.PI * 0.85 + i * 0.55;
      const dist = u * (70 + i * 28);
      const x = burstX + Math.cos(ang) * dist;
      const y = burstY + Math.sin(ang) * dist * 0.75;
      ctx.globalAlpha = u * fade;
      ctx.fillStyle = "#f3efe4";
      ctx.font = "600 13px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(elements[i], x, y);
      ctx.globalAlpha = 1;
    }
  }
}

function sceneGalaxy(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  starfield(ctx, w, h, 3, 120, 0.45, p);
  const cx = fx(w);
  const cy = fy(w, h);
  const grow = 0.35 + smooth(p / 0.8) * 0.65;
  const R = Math.min(w, h) * 0.38 * grow;
  const rot = p * 0.55;
  glow(ctx, cx, cy, R * 0.28, "rgba(255,230,190,0.85)", "rgba(212,140,60,0)");
  const merge = smooth((p - 0.35) / 0.55);
  const companion = lerp(R * 1.15, R * 0.05, merge);
  for (let pass = 0; pass < 2; pass++) {
    const count = pass === 0 ? 1100 : 220;
    for (let i = 0; i < count; i++) {
      const arm = i % 2;
      const u = Math.pow(hash(i + 4 + pass * 50), 0.52) * (pass === 0 ? 1 : 0.45);
      const theta = arm * Math.PI + u * 3.5 + rot * (0.35 + u) + pass * 1.2;
      const spread = (hash(i + 8) - 0.5) * 0.28 * (0.25 + u);
      const rr = u * (pass === 0 ? R : R * 0.42);
      const ox = pass === 0 ? 0 : companion;
      const oy = pass === 0 ? 0 : -R * 0.08 * (1 - merge);
      const x = cx + ox + Math.cos(theta + spread) * rr;
      const y = cy + oy + Math.sin(theta + spread) * rr * 0.4;
      const core = 1 - u;
      const a = (0.12 + core * 0.75) * (pass === 0 ? 1 : 0.8);
      ctx.fillStyle = core > 0.72 ? `rgba(255,236,214,${a})` : `rgba(212,168,104,${a * 0.9})`;
      const s = core > 0.8 ? 2 : 1.25;
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.15);
  ctx.scale(1, 0.38);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.78, R * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(7,8,12,0.28)";
  ctx.fill();
  ctx.restore();
  glow(ctx, cx, cy, 10 + R * 0.04, "rgba(255,250,240,0.95)", "rgba(255,220,180,0)");
}

type Planet = {
  orbit: number;
  r: number;
  color: string;
  ang: number;
  at: number;
  ring?: boolean;
  earth?: boolean;
};

const PLANETS: Planet[] = [
  { orbit: 0.28, r: 3, color: "#c2b6a8", ang: 0.5, at: 0.42 },
  { orbit: 0.4, r: 4, color: "#d2b48a", ang: 2.2, at: 0.46 },
  { orbit: 0.52, r: 4.5, color: "#6ea4c4", ang: 3.7, at: 0.5, earth: true },
  { orbit: 0.64, r: 3.4, color: "#b85a3e", ang: 5.4, at: 0.54 },
  { orbit: 0.78, r: 7.5, color: "#e0c49a", ang: 1.15, at: 0.58, ring: true },
  { orbit: 0.92, r: 5.5, color: "#e6d3b0", ang: 4.5, at: 0.62 },
];

function sceneSun(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  starfield(ctx, w, h, 6, 90, 0.4, p);
  const cx = fx(w);
  const cy = fy(w, h);
  const R = Math.min(w, h) * 0.36;
  const collapse = smooth(p / 0.48);
  for (let i = 0; i < 520; i++) {
    const ang = hash(i) * Math.PI * 2;
    const rad = Math.pow(hash(i + 2), 0.55);
    const dist = lerp(rad, Math.pow(rad, 1.8) * 0.28 + 0.015, collapse) * R * 1.85;
    const flat = lerp(0.85, 0.2, collapse);
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist * flat;
    const a = 0.08 + (1 - rad) * 0.28;
    ctx.fillStyle = `rgba(212,160,84,${a})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  const lit = smooth((p - 0.32) / 0.16);
  glow(ctx, cx, cy, 34 + lit * 22, `rgba(255,236,200,${0.4 + lit * 0.35})`, "rgba(160,70,20,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, 6 + lit * 5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff7ea";
  ctx.fill();
  for (const pl of PLANETS) {
    const appear = smooth((p - pl.at) / 0.07);
    if (appear <= 0) continue;
    const rx = pl.orbit * R * 1.7;
    const ry = rx * 0.22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(243,239,228,${0.14 * appear})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    const a = pl.ang + p * 0.9;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.save();
    ctx.globalAlpha = appear;
    if (pl.earth) glow(ctx, x, y, 16, "rgba(120,190,220,0.45)", "rgba(80,160,200,0)");
    if (pl.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5);
      ctx.scale(1, 0.36);
      ctx.beginPath();
      ctx.arc(0, 0, pl.r * 2.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,196,140,0.8)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(x, y, pl.r, 0, Math.PI * 2);
    ctx.fillStyle = pl.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawSphere(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  paint: (ctx: Ctx) => void,
  rim: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  paint(ctx);
  const shade = ctx.createLinearGradient(x - r, y, x + r, y);
  shade.addColorStop(0, "rgba(0,0,0,0.62)");
  shade.addColorStop(0.42, "rgba(0,0,0,0.05)");
  shade.addColorStop(1, "rgba(255,244,220,0.08)");
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  glow(ctx, x - r * 0.1, y, r * 1.18, "rgba(0,0,0,0)", rim);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(243,239,228,0.18)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
}

function sceneEarth(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  starfield(ctx, w, h, 9, 70, 0.28, p);
  const cx = fx(w);
  const cy = fy(w, h);
  const r = Math.min(w, h) * 0.27;
  const crust = smooth((p - 0.18) / 0.22);
  const ocean = smooth((p - 0.42) / 0.24);
  const vents = smooth((p - 0.72) / 0.2);

  if (vents < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - vents;
    drawSphere(
      ctx,
      cx,
      cy,
      r,
      (c) => {
        const magma = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        magma.addColorStop(0, crust < 0.5 ? "#ffb15a" : "#8d5a3a");
        magma.addColorStop(0.55, crust < 0.4 ? "#c2410c" : "#5c4034");
        magma.addColorStop(1, "#2a140e");
        c.fillStyle = magma;
        c.fillRect(cx - r, cy - r, r * 2, r * 2);
        if (crust > 0.05) {
          c.globalAlpha = crust;
          c.fillStyle = "#6b5344";
          for (let i = 0; i < 7; i++) {
            const a = hash(i + 3) * Math.PI * 2;
            const rr = hash(i + 11) * r * 0.55;
            c.beginPath();
            c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, r * (0.18 + hash(i) * 0.2), r * 0.12, a, 0, Math.PI * 2);
            c.fill();
          }
          c.globalAlpha = 1;
        }
        if (ocean > 0.02) {
          const level = lerp(cy + r, cy - r * 0.05, ocean);
          const sea = c.createLinearGradient(0, level, 0, cy + r);
          sea.addColorStop(0, "#1a7c86");
          sea.addColorStop(1, "#0b3c48");
          c.fillStyle = sea;
          c.fillRect(cx - r, level, r * 2, cy + r - level + 2);
          c.fillStyle = "#6f8f52";
          c.globalAlpha = ocean;
          c.beginPath();
          c.ellipse(cx - r * 0.25, cy - r * 0.05, r * 0.38, r * 0.18, -0.4, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.ellipse(cx + r * 0.28, cy + r * 0.16, r * 0.22, r * 0.12, 0.5, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
        }
      },
      ocean > 0.4 ? "rgba(90,180,190,0.22)" : "rgba(255,140,60,0.2)",
    );
    ctx.restore();

    if (p < 0.3) {
      const t = smooth(p / 0.22);
      const tx = cx + r * lerp(2.1, 0.92, t);
      const ty = cy - r * lerp(0.85, 0.05, t);
      glow(ctx, tx, ty, 22, "rgba(255,180,80,0.8)", "rgba(255,80,20,0)");
      ctx.beginPath();
      ctx.arc(tx, ty, 7 + (1 - t) * 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd7a1";
      ctx.fill();
      if (p > 0.18) {
        glow(ctx, cx + r * 0.45, cy - r * 0.1, 40 + (p - 0.18) * 200, "rgba(255,220,170,0.45)", "rgba(255,100,40,0)");
      }
    } else {
      const ang = -0.8 + p * 1.4;
      const mx = cx + Math.cos(ang) * r * 1.72;
      const my = cy + Math.sin(ang) * r * 0.42 - r * 0.15;
      ctx.beginPath();
      ctx.arc(mx, my, r * 0.27, 0, Math.PI * 2);
      ctx.fillStyle = "#c8c2b6";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx - r * 0.06, my - r * 0.04, r * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80,76,70,0.45)";
      ctx.fill();
    }
  }

  if (vents > 0.02) {
    ctx.save();
    ctx.globalAlpha = vents;
    drawVents(ctx, w, h, p);
    ctx.restore();
  }
}

function drawVents(ctx: Ctx, w: number, h: number, p: number) {
  const base = h * (w < 800 ? 0.5 : 0.62);
  const g = ctx.createLinearGradient(0, h * 0.08, 0, base);
  g.addColorStop(0, "#07141c");
  g.addColorStop(1, "#0c242c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#12100e";
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= w; x += 28) {
    ctx.lineTo(x, base - 8 - hash(x) * 26);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  const chimneys = [0.28, 0.46, 0.67];
  for (let i = 0; i < chimneys.length; i++) {
    const x = fx(w) + (chimneys[i] - 0.5) * Math.min(w, 640);
    const tall = 90 + i * 38;
    ctx.fillStyle = i === 1 ? "#3a2a22" : "#1a1816";
    ctx.beginPath();
    ctx.moveTo(x - 26, base);
    ctx.lineTo(x - 12, base - tall * 0.62);
    ctx.lineTo(x + 4, base - tall);
    ctx.lineTo(x + 22, base - tall * 0.7);
    ctx.lineTo(x + 30, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(x - 6, base - tall - 4, 16, 10);
    for (let k = 0; k < 18; k++) {
      const life = (p * 1.4 + k / 18 + i * 0.2) % 1;
      const px = x + 6 + Math.sin(life * 8 + k) * (8 + life * 16);
      const py = base - tall - life * (70 + i * 20);
      ctx.fillStyle = `rgba(226,226,220,${(1 - life) * 0.35})`;
      ctx.beginPath();
      ctx.arc(px, py, 2 + life * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function sceneRna(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  drawVents(ctx, w, h, p);
  const cx = fx(w);
  const cy = fy(w, h) + h * 0.02;
  const copy = smooth((p - 0.34) / 0.35);
  drawStrand(ctx, cx - 70, cy - 20, 150, 0.9 + p, 1, 0.15);
  if (copy > 0.05) {
    ctx.save();
    ctx.globalAlpha = copy;
    drawStrand(ctx, cx - 70 + copy * 46, cy - 8, 150, 1.3 + p, 0.85, 0);
    ctx.restore();
  }
  const vesicle = smooth((p - 0.62) / 0.25);
  if (vesicle > 0) {
    const x = cx + 120;
    const y = cy + 10;
    ctx.save();
    ctx.globalAlpha = vesicle;
    ctx.beginPath();
    ctx.ellipse(x, y, 54, 40, 0.2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(243,239,228,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, 46, 33, 0.2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(212,160,84,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawStrand(ctx, x - 28, y - 16, 54, p * 2, 0.55, 0);
    ctx.restore();
  }
}

function drawStrand(ctx: Ctx, x: number, y: number, len: number, phase: number, scale: number, split: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = t * len;
    const py = Math.sin(t * 6 + phase) * 16 + split * Math.sin(t * Math.PI) * 10;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = "rgba(243,239,228,0.9)";
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.stroke();
  for (let i = 1; i < steps; i += 2) {
    const t = i / steps;
    const px = t * len;
    const py = Math.sin(t * 6 + phase) * 16 + split * Math.sin(t * Math.PI) * 10;
    ctx.strokeStyle = i % 4 === 1 ? "rgba(212,160,84,0.95)" : "rgba(168,196,188,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 7, py - 9);
    ctx.stroke();
  }
  ctx.restore();
}

function sceneDna(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  starfield(ctx, w, h, 12, 40, 0.18, p);
  const cx = fx(w) - Math.min(120, w * 0.12);
  const cy = fy(w, h);
  const reveal = smooth(p / 0.45);
  drawHelix(ctx, cx, cy, Math.min(280, h * 0.46), reveal, p);
  const divide = smooth((p - 0.55) / 0.4);
  drawBacterium(ctx, fx(w) + Math.min(150, w * 0.16), cy + 8, divide);
}

function drawHelix(ctx: Ctx, cx: number, cy: number, height: number, reveal: number, p: number) {
  const amp = Math.min(34, height * 0.14);
  const steps = Math.floor(70 * reveal);
  const turns = 4.2;
  const a: { x: number; y: number; z: number }[] = [];
  const b: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / 70;
    const ang = t * Math.PI * 2 * turns + p * 0.8;
    const y = cy - height / 2 + t * height;
    a.push({ x: cx + Math.sin(ang) * amp, y, z: Math.cos(ang) });
    b.push({ x: cx + Math.sin(ang + Math.PI) * amp, y, z: Math.cos(ang + Math.PI) });
  }
  for (let i = 0; i < a.length; i += 3) {
    const depth = (a[i].z + 1) / 2;
    ctx.strokeStyle = `rgba(212,160,84,${0.2 + depth * 0.75})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a[i].x, a[i].y);
    ctx.lineTo(b[i].x, b[i].y);
    ctx.stroke();
  }
  strokeStrand(ctx, a, "#f3efe4");
  strokeStrand(ctx, b, "#f3efe4");
}

function strokeStrand(ctx: Ctx, pts: { x: number; y: number; z: number }[], color: string) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawBacterium(ctx: Ctx, x: number, y: number, divide: number) {
  const gap = divide * 28;
  const drawOne = (ox: number) => {
    ctx.beginPath();
    ctx.ellipse(x + ox, y, 36, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212,160,84,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(243,239,228,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + ox - 4, y, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(212,160,84,0.8)";
    ctx.stroke();
  };
  drawOne(-gap);
  if (divide > 0.08) {
    ctx.globalAlpha = divide;
    drawOne(gap);
    ctx.globalAlpha = 1;
  }
}

function sceneOxygen(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  const shift = smooth(p / 0.45);
  const zoom = smooth((p - 0.48) / 0.18);
  if (zoom < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - zoom;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, shift > 0.5 ? "#16344a" : "#3a2418");
    sky.addColorStop(1, shift > 0.5 ? "#0c1c28" : "#1a100c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const cx = fx(w) + w * 0.12;
    const cy = fy(w, h) - h * 0.02;
    const r = Math.min(w, h) * 0.2;
    drawSphere(
      ctx,
      cx,
      cy,
      r,
      (c) => {
        c.fillStyle = lerpColor(shift, "#6a3d28", "#1a6a78");
        c.fillRect(cx - r, cy - r, r * 2, r * 2);
        c.fillStyle = "#6d7f46";
        c.globalAlpha = 0.4 + shift * 0.5;
        c.beginPath();
        c.ellipse(cx - r * 0.15, cy, r * 0.45, r * 0.2, -0.3, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      },
      shift > 0.5 ? "rgba(120,190,210,0.25)" : "rgba(212,140,70,0.2)",
    );
    const rockX = fx(w) - Math.min(w * 0.28, 220);
    const rockY = fy(w, h) + 20;
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#6e3b2c" : "#d4b483";
      ctx.globalAlpha = smooth((p - 0.12) / 0.3);
      ctx.fillRect(rockX, rockY + i * 7, 92, 8);
    }
    ctx.globalAlpha = shift;
    ctx.strokeStyle = "#8ea85a";
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      ctx.beginPath();
      const y0 = rockY - 16 - row * 8;
      for (let x = 0; x <= 110; x += 4) {
        const y = y0 + Math.sin(x * 0.18 + p * 6 + row) * 3;
        if (x === 0) ctx.moveTo(rockX - 8 + x, y);
        else ctx.lineTo(rockX - 8 + x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  if (zoom > 0.02) {
    ctx.save();
    ctx.globalAlpha = zoom;
    drawEndosymbiosis(ctx, w, h, smooth((p - 0.58) / 0.4));
    ctx.restore();
  }
}

function lerpColor(t: number, a: string, b: string): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(lerp(pa[0], pb[0], t));
  const g = Math.round(lerp(pa[1], pb[1], t));
  const bl = Math.round(lerp(pa[2], pb[2], t));
  return `rgb(${r},${g},${bl})`;
}

function hex(value: string): [number, number, number] {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawEndosymbiosis(ctx: Ctx, w: number, h: number, p: number) {
  const cx = fx(w);
  const cy = fy(w, h);
  const R = Math.min(w, h) * 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,28,32,0.92)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(243,239,228,0.8)";
  ctx.stroke();
  const guestT = smooth(p / 0.65);
  const ang = lerp(Math.PI * 0.85, Math.PI * 0.15, guestT);
  const dist = lerp(R * 1.35, R * 0.28, guestT);
  const gx = cx + Math.cos(ang) * dist;
  const gy = cy + Math.sin(ang) * dist * 0.8;
  if (guestT > 0.35 && guestT < 0.85) {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(cx + R * 0.7, cy, cx + R * 0.15, cy + 6);
    ctx.strokeStyle = "rgba(243,239,228,0.35)";
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(gx, gy, 18, 10, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#d4a054";
  ctx.fill();
  if (guestT > 0.7) {
    ctx.beginPath();
    ctx.ellipse(gx, gy, 22, 13, 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(243,239,228,0.7)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  const nucleus = smooth((p - 0.55) / 0.35);
  if (nucleus > 0) {
    ctx.globalAlpha = nucleus;
    ctx.beginPath();
    ctx.arc(cx - R * 0.15, cy - R * 0.05, R * 0.28, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(243,239,228,0.75)";
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function sceneShore(ctx: Ctx, w: number, h: number, p: number) {
  const water = 1 - smooth((p - 0.22) / 0.2);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (water > 0.5) {
    sky.addColorStop(0, "#072028");
    sky.addColorStop(1, "#0e2c30");
  } else {
    sky.addColorStop(0, "#243044");
    sky.addColorStop(0.45, "#c9844a");
    sky.addColorStop(1, "#1d2420");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (water > 0.45) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#f3efe4";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.08 + i * 0.16), 0);
      ctx.lineTo(w * (0.14 + i * 0.16), h);
      ctx.lineTo(w * (0.2 + i * 0.16), h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    const ground = h * (w < 800 ? 0.48 : 0.58);
    ctx.fillStyle = "#14211f";
    ctx.fillRect(0, ground, w, h - ground);
    drawTrilobite(ctx, fx(w) - 70, ground - 18 + Math.sin(p * 8) * 3, 1, smooth(p / 0.2));
    drawJelly(ctx, fx(w) + 40, fy(w, h) - 30, 1.1, p * 6, smooth((p - 0.08) / 0.2));
    drawAnomalocaris(ctx, fx(w) + 10, ground - 70, smooth((p - 0.18) / 0.2), p);
  }
  if (water < 0.9) {
    ctx.save();
    ctx.globalAlpha = 1 - water;
    drawLand(ctx, w, h, p);
    ctx.restore();
  }
}

function drawTrilobite(ctx: Ctx, x: number, y: number, s: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#cbb892";
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40,28,16,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(28,18,10,0.45)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-32, i * 5);
    ctx.lineTo(32, i * 5);
    ctx.stroke();
  }
  ctx.fillStyle = "#b7a278";
  ctx.beginPath();
  ctx.ellipse(-18, 0, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawJelly(ctx: Ctx, x: number, y: number, s: number, phase: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + Math.sin(phase) * 8);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(243,239,228,0.16)";
  ctx.strokeStyle = "rgba(243,239,228,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 18, Math.PI, 0);
  ctx.quadraticCurveTo(12, 12, 0, 6);
  ctx.quadraticCurveTo(-12, 12, -18, 0);
  ctx.fill();
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, 4);
    ctx.quadraticCurveTo(i * 7 + Math.sin(phase + i) * 4, 24, i * 4, 40);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAnomalocaris(ctx: Ctx, x: number, y: number, alpha: number, p: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + Math.sin(p * 5) * 6);
  ctx.fillStyle = "#d4a054";
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 14, -0.1, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 12, 6, 8, 5, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212,160,84,0.7)";
    ctx.fill();
  }
  ctx.strokeStyle = "#f3efe4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-40, -4);
  ctx.quadraticCurveTo(-58, -18 + Math.sin(p * 9) * 4, -48, -28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-30, -8, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "#f3efe4";
  ctx.fill();
  ctx.restore();
}

function drawLand(ctx: Ctx, w: number, h: number, p: number) {
  const horizon = h * (w < 800 ? 0.4 : 0.5);
  const sea = ctx.createLinearGradient(0, horizon, 0, h * 0.7);
  sea.addColorStop(0, "#1c6470");
  sea.addColorStop(1, "#12343c");
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon + 10, w, h * 0.22);
  ctx.fillStyle = "#3d4636";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, horizon + 36);
  ctx.quadraticCurveTo(w * 0.35, horizon + 8, w * 0.62, horizon + 28);
  ctx.quadraticCurveTo(w * 0.82, horizon + 40, w, horizon + 18);
  ctx.lineTo(w, h);
  ctx.fill();
  const walk = smooth((p - 0.4) / 0.35);
  const gx = lerp(fx(w) - 40, fx(w) + 70, walk);
  const gy = horizon + 34;
  drawTetrapod(ctx, gx, gy, walk);
  ctx.strokeStyle = "#8ea85a";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = fx(w) + 90 + i * 28;
    const stem = 40 + (i % 3) * 16;
    const appear = smooth((p - 0.42 - i * 0.03) / 0.12);
    ctx.globalAlpha = appear;
    ctx.beginPath();
    ctx.moveTo(x, gy + 8);
    ctx.quadraticCurveTo(x + 4, gy - stem * 0.5, x - 2, gy - stem);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - 2, gy - stem, 8, 3.5, -0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTetrapod(ctx: Ctx, x: number, y: number, p: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e7d7b8";
  ctx.beginPath();
  ctx.ellipse(0, -8, 28, 9, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(24, -12, 10, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-26, -4, 12, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  const step = Math.sin(p * 18);
  ctx.strokeStyle = "#f3efe4";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const legs = [
    [-12, -2, -16, 10 + step * 3],
    [-2, -2, 2, 12 - step * 3],
    [8, -4, 14, 10 + step * 3],
    [16, -6, 22, 8 - step * 2],
  ];
  for (const [x1, y1, x2, y2] of legs) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(30, -14, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = "#f3efe4";
  ctx.fill();
  ctx.restore();
}

function sceneDino(ctx: Ctx, w: number, h: number, p: number) {
  const impact = smooth((p - 0.55) / 0.12);
  const ash = smooth((p - 0.7) / 0.2);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, ash > 0.2 ? "#2a241c" : "#24344a");
  sky.addColorStop(0.42, ash > 0.2 ? "#4a3424" : "#e0a15a");
  sky.addColorStop(0.55, "#1a1c18");
  sky.addColorStop(1, "#10110e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const ground = h * (w < 800 ? 0.46 : 0.56);
  ctx.fillStyle = "#171910";
  ctx.beginPath();
  ctx.moveTo(0, ground + 20);
  ctx.lineTo(w * 0.2, ground - 10);
  ctx.lineTo(w * 0.45, ground + 16);
  ctx.lineTo(w * 0.7, ground - 24);
  ctx.lineTo(w, ground + 8);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.fillStyle = "#12140e";
  ctx.fillRect(0, ground + 28, w, h);
  const stride = Math.sin(p * 10);
  ctx.fillStyle = "#c4a882";
  drawSauropod(ctx, fx(w) - 20, ground + 24, Math.min(1.15, w / 780));
  drawTheropod(ctx, fx(w) + Math.min(150, w * 0.18), ground + 30, 0.85, stride * (1 - ash));
  if (p > 0.48 && ash < 0.85) {
    const u = smooth((p - 0.48) / 0.2);
    const ax = lerp(w * 0.86, fx(w) + 30, u);
    const ay = lerp(h * 0.02, ground, u);
    glow(ctx, ax, ay, 18 + u * 20, "rgba(255,244,220,0.95)", "rgba(255,120,40,0)");
    ctx.strokeStyle = "rgba(255,220,180,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + 40, ay - 28);
    ctx.stroke();
  }
  if (impact > 0.4 && ash < 0.5) {
    const flash = Math.exp(-((p - 0.66) ** 2) * 180);
    ctx.fillStyle = `rgba(255,244,220,${flash * 0.8})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (ash > 0.02) {
    ctx.fillStyle = `rgba(40,28,18,${ash * 0.55})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = hash(i + 2) * w;
      const y = (hash(i + 5) * h + p * 80) % h;
      ctx.fillStyle = `rgba(180,160,130,${ash * 0.35})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    if (ash > 0.45) {
      drawMammal(ctx, fx(w) - 10, ground + 26, smooth((ash - 0.45) / 0.4));
      drawBird(ctx, fx(w) + 80, ground - 70, smooth((p - 0.86) / 0.12), p);
    }
  }
}

function drawSauropod(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-78, 2);
  ctx.quadraticCurveTo(-40, -6, -8, -16);
  ctx.quadraticCurveTo(24, -22, 46, -16);
  ctx.quadraticCurveTo(78, -36, 104, -78);
  ctx.quadraticCurveTo(118, -86, 116, -70);
  ctx.quadraticCurveTo(104, -66, 96, -58);
  ctx.quadraticCurveTo(74, -24, 52, -6);
  ctx.lineTo(58, 16);
  ctx.lineTo(44, 16);
  ctx.lineTo(40, -2);
  ctx.lineTo(22, 0);
  ctx.lineTo(18, 16);
  ctx.lineTo(4, 16);
  ctx.lineTo(2, -2);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-20, 16);
  ctx.lineTo(-34, 16);
  ctx.lineTo(-28, 0);
  ctx.quadraticCurveTo(-50, 4, -78, 2);
  ctx.fill();
  ctx.restore();
}

function drawTheropod(ctx: Ctx, x: number, y: number, s: number, step: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-36, 4);
  ctx.quadraticCurveTo(-10, -8, 8, -20);
  ctx.quadraticCurveTo(20, -28, 36, -24);
  ctx.lineTo(48, -30);
  ctx.lineTo(42, -18);
  ctx.quadraticCurveTo(24, -8, 16, 0);
  ctx.lineTo(22, 14 + step * 4);
  ctx.lineTo(12, 14);
  ctx.lineTo(6, 2);
  ctx.lineTo(-2, 14 - step * 4);
  ctx.lineTo(-12, 12);
  ctx.lineTo(-8, -2);
  ctx.quadraticCurveTo(-24, 2, -36, 4);
  ctx.fill();
  ctx.restore();
}

function drawMammal(ctx: Ctx, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.fillStyle = "#e4d2b0";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-16, 2, 8, 2.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBird(ctx: Ctx, x: number, y: number, alpha: number, p: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + Math.sin(p * 14) * 6);
  ctx.strokeStyle = "#f3efe4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.quadraticCurveTo(-4, -8, 0, 0);
  ctx.quadraticCurveTo(6, -10, 14, 3);
  ctx.stroke();
  ctx.restore();
}

const NODES: { x: number; y: number; label: string; sub: string; at: number; extinct?: boolean; hero?: boolean }[] = [
  { x: 0.06, y: 0.55, label: "Primatlar", sub: "66 myö", at: 0.05 },
  { x: 0.22, y: 0.55, label: "Homininler", sub: "yaklaşık 7 myö", at: 0.16 },
  { x: 0.4, y: 0.8, label: "Australopithecus", sub: "iki ayak · Lucy", at: 0.3 },
  { x: 0.58, y: 0.96, label: "Paranthropus", sub: "soyu tükendi", at: 0.42, extinct: true },
  { x: 0.42, y: 0.28, label: "Homo", sub: "aletler", at: 0.36 },
  { x: 0.6, y: 0.36, label: "H. erectus", sub: "ateş, Afrika dışı", at: 0.52 },
  { x: 0.8, y: 0.14, label: "Neandertal", sub: "soyu tükendi", at: 0.66, extinct: true },
  { x: 0.86, y: 0.5, label: "H. sapiens", sub: "yaklaşık 300 bin yıl", at: 0.74, hero: true },
];

const EDGES: [number, number, number][] = [
  [0, 1, 0.1],
  [1, 2, 0.24],
  [2, 3, 0.38],
  [1, 4, 0.3],
  [4, 5, 0.46],
  [5, 6, 0.6],
  [5, 7, 0.68],
];

function sceneHuman(ctx: Ctx, w: number, h: number, p: number) {
  wash(ctx, w, h);
  const starAlpha = smooth((p - 0.78) / 0.2);
  if (starAlpha > 0) starfield(ctx, w, h, 2, 160, starAlpha * 0.7, p);
  const boxW = Math.min(w * (w < 720 ? 0.88 : 0.62), 820);
  const left = fx(w) - boxW * 0.42;
  const top = h * 0.1;
  const boxH = h * 0.42;
  const pt = (nx: number, ny: number) => ({ x: left + nx * boxW, y: top + ny * boxH });

  for (const [a, b, at] of EDGES) {
    const show = smooth((p - at) / 0.08);
    if (show <= 0) continue;
    const A = pt(NODES[a].x, NODES[a].y);
    const B = pt(NODES[b].x, NODES[b].y);
    const extinct = NODES[b].extinct;
    ctx.strokeStyle = extinct ? `rgba(163,158,146,${0.45 * show})` : `rgba(212,160,84,${0.9 * show})`;
    ctx.lineWidth = extinct ? 1.4 : 2.2;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    const midX = (A.x + B.x) / 2;
    ctx.quadraticCurveTo(midX, A.y, lerp(A.x, B.x, show), lerp(A.y, B.y, show));
    ctx.stroke();
  }

  let latest = 0;
  NODES.forEach((node, i) => {
    if (node.at <= p) latest = i;
  });

  NODES.forEach((node, i) => {
    const show = smooth((p - node.at) / 0.06);
    if (show <= 0) return;
    const pos = pt(node.x, node.y);
    const hero = node.hero && p > 0.8;
    if (hero) glow(ctx, pos.x, pos.y, 28, "rgba(212,160,84,0.55)", "rgba(212,160,84,0)");
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, hero ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = node.extinct ? `rgba(163,158,146,${show})` : `rgba(243,239,228,${show})`;
    ctx.fill();
    if (node.hero) drawPerson(ctx, pos.x + 22, pos.y + 8, 0.55 * show);
    if (i === latest) {
      const narrow = w < 640;
      ctx.font = `${narrow ? 500 : 600} ${narrow ? 13 : 15}px Fraunces, Georgia, serif`;
      ctx.fillStyle = `rgba(243,239,228,${show})`;
      ctx.textAlign = "left";
      const labelX = Math.min(pos.x + 12, w - 160);
      const labelY = Math.max(28, pos.y - 16);
      ctx.fillText(node.label, labelX, labelY);
      ctx.font = "400 12px Outfit, sans-serif";
      ctx.fillStyle = `rgba(212,160,84,${show})`;
      ctx.fillText(node.sub, labelX, labelY + 16);
    }
  });

  if (p > 0.9) {
    const flame = (p - 0.9) / 0.1;
    const pos = pt(NODES[7].x, NODES[7].y);
    glow(ctx, pos.x + 22, pos.y + 18, 16 + flame * 8, `rgba(255,170,60,${0.35 + flame * 0.4})`, "rgba(255,80,20,0)");
  }
}

function drawPerson(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = "#f3efe4";
  ctx.fillStyle = "#f3efe4";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(0, -18);
  ctx.moveTo(0, -34);
  ctx.lineTo(-12, -24);
  ctx.moveTo(0, -34);
  ctx.lineTo(11, -22);
  ctx.moveTo(0, -18);
  ctx.lineTo(-8, 2);
  ctx.moveTo(0, -18);
  ctx.lineTo(8, 2);
  ctx.stroke();
  ctx.restore();
}

const SCENES: Record<string, (ctx: Ctx, w: number, h: number, p: number) => void> = {
  patlama: sceneBang,
  isik: sceneLight,
  yildiz: sceneStars,
  galaksi: sceneGalaxy,
  gunes: sceneSun,
  dunya: sceneEarth,
  rna: sceneRna,
  dna: sceneDna,
  oksijen: sceneOxygen,
  kara: sceneShore,
  dino: sceneDino,
  insan: sceneHuman,
};

export function drawFrame(ctx: Ctx, w: number, h: number, id: string, p: number) {
  const progress = clamp01(p);
  if (drawPlate(ctx, w, h, id, progress)) {
    vignette(ctx, w, h);
    return;
  }
  ctx.clearRect(0, 0, w, h);
  const scene = SCENES[id] ?? sceneBang;
  scene(ctx, w, h, progress);
  vignette(ctx, w, h);
}
