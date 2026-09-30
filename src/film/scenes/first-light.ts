import {
  badge,
  callout,
  center,
  dot,
  glow,
  hash,
  image,
  lerp,
  pick,
  span,
  type SceneFrame,
} from "@/film/scenes/kit";

const NUCLEI = 70;
const PHOTONS = 26;
const STEP = 0.2; // sn: bir fotonun iki saçılma arası
const MAP = "/cosmos/sim/cmb.webp";

/**
 * İlk ışık: opak plazmada zikzak çizen fotonlar; elektronlar çekirdeklere bağlanınca
 * sis kalkar, ışık düz gider. Sonra bugün her yönden gelen o ışığın gökyüzü haritası.
 */
export function firstLight(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [, b1, b2] = beats;
  const [cx, cy] = center(f);
  const clear = span(t, b1 + 0.6, b1 + 3.2); // saydamlaşma
  const toMap = span(t, b2, b2 + 2.2);

  // Sis: önce turuncu ve opak, sonra karanlık ve saydam.
  const fog = 1 - clear;
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.7);
  bg.addColorStop(
    0,
    `rgb(${Math.round(lerp(14, 150, fog))},${Math.round(lerp(12, 72, fog))},${Math.round(lerp(22, 30, fog))})`,
  );
  bg.addColorStop(
    1,
    `rgb(${Math.round(lerp(5, 70, fog))},${Math.round(lerp(6, 28, fog))},${Math.round(lerp(10, 16, fog))})`,
  );
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const plasma = 1 - toMap;
  if (plasma > 0.01) {
    ctx.save();
    ctx.globalAlpha = plasma;
    drawPlasma(f);
    drawPhotons(f, clear);
    ctx.restore();
  }

  if (fog > 0.02 && plasma > 0.01) {
    for (let i = 0; i < 10; i++) {
      const x = hash(i + 70) * w + Math.sin(t * 0.3 + i) * 30 * s;
      const y = hash(i + 90) * h + Math.cos(t * 0.25 + i) * 30 * s;
      glow(ctx, x, y, (150 + hash(i) * 120) * s, `rgba(255,170,90,${0.18 * fog * plasma})`);
    }
  }

  const top = h * (w < h ? 0.19 : 0.17);
  const hot = span(t, b1 + 0.2, b1 + 1) * (1 - span(t, b1 + 2.8, b1 + 3.3));
  badge(f, cx, top, "Sıcaklık ≈ 3.000 K", hot);
  const freed = span(t, b1 + 3.3, b1 + 3.9) * (1 - span(t, b2 - 0.8, b2));
  badge(f, cx, top, "Işık artık engelsiz, dümdüz yol alıyor", freed);

  if (toMap > 0.01) drawSky(f, toMap);
}

function nucleus(f: SceneFrame, i: number): [number, number] {
  const { w, h, t, s } = f;
  return [
    hash(i * 3.7) * w + Math.sin(t * 0.7 + i) * 6 * s,
    hash(i * 9.2) * h + Math.cos(t * 0.6 + i * 1.7) * 6 * s,
  ];
}

function drawPlasma(f: SceneFrame) {
  const { ctx, t, beats, s } = f;
  const [, b1] = beats;
  for (let i = 0; i < NUCLEI; i++) {
    const [nx, ny] = nucleus(f, i);
    const helium = hash(i + 11) > 0.92;
    dot(ctx, nx, ny, (helium ? 4.2 : 3.2) * s, helium ? "rgb(235,208,150)" : "rgb(255,128,96)");

    // Elektron: önce serbest ve hızlı, sonra çekirdeğin çevresine bağlanır.
    const ex = nx + Math.sin(t * 5.3 + i * 2.1) * 34 * s + Math.cos(t * 3.1 + i) * 20 * s;
    const ey = ny + Math.cos(t * 4.7 + i * 1.3) * 34 * s + Math.sin(t * 2.9 + i) * 20 * s;
    const bind = span(t, b1 + 0.4 + hash(i + 5) * 1.6, b1 + 1.4 + hash(i + 5) * 1.6);
    const ang = t * 2.4 + i;
    const ox = nx + Math.cos(ang) * 11 * s;
    const oy = ny + Math.sin(ang) * 11 * s;
    if (bind > 0.02) {
      ctx.strokeStyle = `rgba(150,200,255,${0.35 * bind})`;
      ctx.lineWidth = Math.max(1, 0.8 * s);
      ctx.beginPath();
      ctx.arc(nx, ny, 11 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    dot(ctx, lerp(ex, ox, bind), lerp(ey, oy, bind), 1.7 * s, "rgb(160,210,255)");
  }
  const at = (i: number, time: number) => nucleus({ ...f, t: time }, i);
  const probe = nucleus(f, pick(f, at, 0, NUCLEI, b1 + 2.4));
  callout(
    f,
    probe[0],
    probe[1],
    "Atom",
    span(t, b1 + 2.4, b1 + 3.2),
    probe[0] > f.w * 0.55 ? -1 : 1,
    "çekirdek + elektron",
  );
}

/** Foton yolu: saçılmalar arasında rastgele yön; saydamlaşınca son yönünde dümdüz. */
function photonPath(
  f: SceneFrame,
  i: number,
  free: number,
): { head: [number, number]; trail: [number, number][] } {
  const { w, h, t, s } = f;
  const L = 24 * s;
  let x = hash(i * 5.3) * w;
  let y = hash(i * 8.1) * h;
  const trail: [number, number][] = [[x, y]];
  const walkEnd = Math.min(t, free);
  const steps = Math.floor(walkEnd / STEP);
  let ang = 0;
  for (let k = 0; k <= steps; k++) {
    ang = hash(i * 131 + k * 17.3) * Math.PI * 2;
    const len = k < steps ? L : L * ((walkEnd - steps * STEP) / STEP);
    x += Math.cos(ang) * len;
    y += Math.sin(ang) * len;
    trail.push([x, y]);
  }
  if (t > free) {
    // Serbest kalan ışık: dümdüz ve ekranda dolaşarak akmaya devam eder.
    const run = (t - free) * 200 * s;
    const hx = x + Math.cos(ang) * run;
    const hy = y + Math.sin(ang) * run;
    const wx = ((hx % w) + w) % w;
    const wy = ((hy % h) + h) % h;
    const tail = Math.min(run, 90 * s);
    const fade = Math.min(1, run / (60 * s));
    const walk = trail.slice(-12).map(([px, py]) => [px, py] as [number, number]);
    return fade < 1
      ? { head: [hx, hy], trail: [...walk, [hx, hy]] }
      : {
          head: [wx, wy],
          trail: [
            [wx - Math.cos(ang) * tail, wy - Math.sin(ang) * tail],
            [wx, wy],
          ],
        };
  }
  return { head: [x, y], trail: trail.slice(-12) };
}

function drawPhotons(f: SceneFrame, clear: number) {
  const { ctx, t, beats, s } = f;
  const [, b1] = beats;
  const free = b1 + 1.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < PHOTONS; i++) {
    const { head, trail } = photonPath(f, i, free);
    ctx.strokeStyle = `rgba(255,248,220,${lerp(0.45, 0.7, clear)})`;
    ctx.lineWidth = Math.max(1, 1.3 * s);
    ctx.beginPath();
    trail.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    glow(ctx, head[0], head[1], 7 * s, "rgba(255,252,235,0.95)");
  }
  const side = (x: number) => (x > f.w * 0.55 ? -1 : 1);
  const at = (i: number, time: number) => photonPath({ ...f, t: time }, i, free).head;
  const p = photonPath(f, pick(f, at, 0, PHOTONS, beats[0] + 0.8), free).head;
  callout(
    f,
    p[0],
    p[1],
    "Foton",
    span(t, beats[0] + 0.8, beats[0] + 1.6) * (1 - span(t, b1, b1 + 0.6)),
    side(p[0]),
    "her an bir elektrona çarpar",
  );
}

function drawSky(f: SceneFrame, k: number) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  const img = image(MAP);
  const [cx, cy] = center(f);
  const fitW = Math.min(w * 0.9, h * 0.5 * 2);
  const zoom = lerp(3.2, 1, k) * (1 + 0.03 * span(t, b2 + 2.2, f.dur));
  const mw = fitW * zoom;
  const mh = mw / 2;
  ctx.save();
  ctx.globalAlpha = k;
  if (img) ctx.drawImage(img, cx - mw / 2, cy - mh / 2, mw, mh);
  ctx.strokeStyle = "rgba(243,238,226,0.35)";
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const legend = span(t, b2 + 2.2, b2 + 3.2);
  if (legend <= 0.01) return;
  const lw = Math.min(fitW * 0.5, 260 * s);
  const lx = cx - lw / 2;
  const ly = cy + fitW / 4 + 26 * s;
  ctx.save();
  ctx.globalAlpha = legend;
  const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
  [
    [0, "rgb(0,0,150)"],
    [0.19, "rgb(0,110,250)"],
    [0.36, "rgb(125,205,255)"],
    [0.5, "rgb(255,238,218)"],
    [0.65, "rgb(255,176,72)"],
    [0.82, "rgb(236,72,22)"],
    [1, "rgb(110,0,0)"],
  ].forEach(([o, c]) => g.addColorStop(o as number, c as string));
  ctx.fillStyle = g;
  ctx.fillRect(lx, ly, lw, 6 * s);
  ctx.fillStyle = "rgba(243,238,226,0.9)";
  ctx.font = `500 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("−300 µK", lx, ly + 11 * s);
  ctx.textAlign = "right";
  ctx.fillText("+300 µK", lx + lw, ly + 11 * s);
  ctx.textAlign = "center";
  ctx.fillText("Ortalama 2,725 K", lx + lw / 2, ly + 28 * s);
  ctx.fillStyle = "rgba(168,161,148,0.85)";
  ctx.font = `400 ${Math.round(Math.max(9, 10 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Planck güç spektrumuyla simülasyon", lx + lw / 2, ly + 46 * s);
  ctx.restore();

  badge(f, cx, cy - fitW / 4 - 26 * s, "Bütün gökyüzü · kozmik mikrodalga arka plan", legend);
}
