import {
  badge,
  callout,
  hash,
  lerp,
  roundRect,
  wrap,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";
import {
  applyCam,
  blob,
  camera,
  curve,
  drawGlow,
  drawLayer,
  ease,
  hex,
  layer,
  mix,
  phase,
  planet,
  pop,
  project,
  rgba,
  spaceLayer,
  twinkles,
  type Cam,
  type RGB,
} from "@/film/scenes/art";

const LAVA = hex("ff6a3d");
const LAVA_HOT = hex("ffd36b");
const BASALT = hex("3b3542");
const OCEAN = hex("2f7fd8");
const LAND = hex("7a6656");
const MOON = hex("cdd2dc");
const THEIA = hex("b8a08a");
const SHADE = hex("150a24");

type Pt = { x: number; y: number; z: number };

/** Kürenin üstündeki bir noktanın (boylam, enlem) ekrandaki izdüşümü; biraz eğik eksenle döner. */
function onSphere(lon: number, lat: number, rot: number, tilt = 0.32): Pt {
  const l = lon + rot;
  const x = Math.cos(lat) * Math.sin(l);
  const y = -Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(l);
  return {
    x,
    y: y * Math.cos(tilt) - z * Math.sin(tilt),
    z: y * Math.sin(tilt) + z * Math.cos(tilt),
  };
}

const lonOf = (i: number, seed: number) => hash(i * 7.31 + seed) * Math.PI * 2;
const latOf = (i: number, seed: number) => Math.asin(hash(i * 3.17 + seed) * 2 - 1) * 0.92;

function frame(f: SceneFrame) {
  const wide = f.w > f.h;
  return {
    cx: wide ? f.w * 0.6 : f.w * 0.5,
    cy: f.h * (wide ? 0.44 : 0.46),
    R: wide ? Math.min(f.w, f.h) * 0.25 : f.w * 0.3,
  };
}

/**
 * Erken Dünya: erimiş gezegene Theia çarpar, enkaz halkası Ay’a dönüşür; yüzey soğuyup
 * kabuk bağlar, buhar yağmura, yağmur okyanusa döner; sonra okyanus tabanında bir baca.
 */
export function earth(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [, , b2] = beats;
  const under = phase(t, b2 + 0.1, b2 + 1.1);
  if (under < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - under;
    orbit(f);
    ctx.restore();
  }
  if (under > 0) {
    ctx.save();
    ctx.globalAlpha = under;
    vent(f);
    ctx.restore();
  }
}

function orbit(f: SceneFrame) {
  const { ctx, t, beats, dur } = f;
  const [b0, b1, b2] = beats;
  const { cx, cy, R } = frame(f);
  const impact = b0 + 2.2;
  const shake = Math.exp(-(((t - impact - 0.15) / 0.35) ** 2));
  const cam: Cam = camera(t, [
    [0, 0.05, -0.03, 1.12],
    [impact - 0.2, 0.02, -0.01, 1.05],
    [impact + 1.4, 0, 0, 0.9],
    [b1 - 0.5, 0, 0, 0.92],
    [b1 + 1.5, 0, 0, 1.02],
    [b2 - 0.9, 0, 0, 1.04],
    [b2 + 0.4, -0.02, 0.02, 5.5],
    [dur, -0.02, 0.02, 5.5],
  ]);
  cam.x += Math.sin(t * 60) * 0.006 * shake;
  cam.y += Math.cos(t * 53) * 0.006 * shake;

  const bg = layer(
    f,
    "earth-space",
    spaceLayer(
      hex("0a0f2e"),
      hex("1a0d2c"),
      [
        [0.15, 0.1, 0.5, hex("ffb070"), 0.22],
        [0.85, 0.8, 0.45, hex("6040c0"), 0.25],
        [0.6, 0.2, 0.35, hex("3060c0"), 0.18],
      ],
      6,
    ),
    0.1,
  );
  drawLayer(f, bg, 0.1, -cam.x * f.w * 0.15, -cam.y * f.h * 0.15);
  twinkles(f, 6, 16);

  ctx.save();
  applyCam(f, cam);
  const molten = 1 - phase(t, b1 + 0.2, b1 + 3.2);
  const oceans = phase(t, b1 + 3, b1 + 5.4);
  // Kabuk bağlarken aradaki çatlaklar bir süre daha akkor kalır.
  const heat = (1 - phase(t, b1 + 1.6, b1 + 4.4)) * (1 - oceans);
  const rot = t * 0.12;

  // Ay: yörüngesinin arka yarısındayken gezegenin arkasında kalır.
  const moonA = 0.4 + t * 0.14;
  const moonR = R * 2.35;
  const mx = cx + Math.cos(moonA) * moonR;
  const my = cy + Math.sin(moonA) * moonR * 0.36;
  const gather = phase(t, impact + 1.6, b1 - 0.2);
  const moonK = pop(t, b1 - 1.2, 0.8);
  const behind = Math.sin(moonA) < 0;
  if (behind && moonK > 0) moon(ctx, mx, my, R * 0.27 * moonK);

  debris(f, cx, cy, R, impact, gather, mx, my, true);
  // Gezegen: erimişken koyu kabuk adacıkları magma denizinde yüzer; soğudukça levhalar
  // büyüyüp birleşir, aralarındaki çatlaklar kararır; sonra okyanus.
  const base = oceans > 0 ? mix(BASALT, OCEAN, oceans) : mix(BASALT, LAVA, molten);
  const crust = plates(cx, cy, R, rot, 1 + (1 - molten) * 0.45);
  const crack = cracks(cx, cy, R, rot);
  planet(ctx, cx, cy, R, {
    base,
    shade: SHADE,
    rim: oceans > 0.5 ? hex("bfe6ff") : hex("ffe0b0"),
    atmo: mix(hex("ff8a5c"), hex("7fc4ff"), oceans),
    atmoAlpha: 0.5,
    night: 0.8,
    detail: (g) => surface(g, f, cx, cy, R, rot, molten, heat, oceans, crust, crack),
  });
  lavaGlow(ctx, f, cx, cy, R, rot, heat, molten, crust, crack);
  // Çarpışma bölgesi bir süre daha akkor kalır.
  const scar = phase(t, impact, impact + 0.4) * (1 - phase(t, impact + 3, impact + 8));
  if (scar > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    drawGlow(ctx, cx + R * 0.75, cy - R * 0.5, R * 0.9, LAVA_HOT, 0.7 * scar);
    ctx.restore();
  }
  debris(f, cx, cy, R, impact, gather, mx, my, false);
  if (!behind && moonK > 0) moon(ctx, mx, my, R * 0.27 * moonK);

  // Theia: Mars boyutunda; sağ üstten gelip gezegenin kenarına çarpar.
  if (t < impact + 0.05) {
    const [tx, ty] = theiaAt(t, impact, cx, cy, R);
    const k = phase(t, 0, impact, ease.in);
    drawGlow(ctx, tx + R * 0.35, ty - R * 0.25, R * 0.9, hex("ffb080"), 0.12 * k);
    planet(ctx, tx, ty, R * 0.52, {
      base: THEIA,
      shade: SHADE,
      rim: hex("fff0dc"),
      atmo: hex("ffcaa0"),
      atmoAlpha: 0.2,
      detail: (g) => craters(g, tx, ty, R * 0.52, 5, hex("9a8470")),
    });
  }
  const flash = Math.exp(-(((t - impact) / 0.28) ** 2));
  if (flash > 0.01) {
    drawGlow(ctx, cx + R * 0.8, cy - R * 0.55, R * 3.2 * flash, hex("fff2d0"), flash);
  }
  ctx.restore();

  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,244,220,${0.45 * flash})`;
    ctx.fillRect(0, 0, f.w, f.h);
  }

  // Etiketler.
  const side = (x: number) => (x > f.w * 0.62 ? -1 : 1);
  if (t < impact) {
    const [tx, ty] = theiaAt(t, impact, cx, cy, R);
    const [x, y] = project(f, cam, tx - R * 0.36, ty + R * 0.36);
    callout(
      f,
      x,
      y,
      "Theia",
      phase(t, b0 + 0.2, b0 + 1) * (1 - phase(t, impact - 0.7, impact - 0.2)),
      -1,
      "Mars boyutunda bir gezegen",
    );
  }
  const [px, py] = project(f, cam, mx, my);
  callout(
    f,
    px,
    py,
    "Ay",
    phase(t, b1 - 0.9, b1 + 0.2) * (1 - phase(t, b1 + 2.4, b1 + 3)),
    side(px),
    "çarpışma enkazından toplandı",
  );
  const [ox, oy] = project(f, cam, cx - R * 0.35, cy + R * 0.25);
  callout(
    f,
    ox,
    oy,
    "Okyanuslar dolar",
    oceans * (1 - phase(t, b2 - 1.2, b2 - 0.8)),
    -1,
    "yağmur yüz binlerce yıl sürer",
  );
  zircon(f, pop(t, b1 + 1.4, 0.7, b2 - 1.4, 0.5));
  badge(
    f,
    f.w / 2,
    f.h * (f.w < f.h ? 0.19 : 0.16),
    "Dev çarpışma: Ay’ın doğuşu",
    phase(t, impact + 0.8, impact + 1.4) * (1 - phase(t, b1 - 1, b1 - 0.5)),
  );
}

/** Theia’nın yolu: sağ üstten görünür biçimde yaklaşır, sona doğru hızlanır. */
function theiaAt(t: number, impact: number, cx: number, cy: number, R: number): [number, number] {
  const k =
    ease.inOut(Math.min(1, Math.max(0, t / impact))) * 0.7 + phase(t, 0, impact, ease.in) * 0.3;
  return [lerp(cx + R * 2.5, cx + R * 1.05, k), lerp(cy - R * 1.7, cy - R * 0.7, k)];
}

type Plate = { path: Path2D; a: number; tone: number };

/**
 * Kabuk levhaları: kürenin üstünde köşeli çokgenler. Soğudukça büyüyüp birleşir, aralarında
 * akkor kanallar kalır. Kenara yaklaşan levhalar yumuşakça kaybolur.
 */
function plates(cx: number, cy: number, R: number, rot: number, grow: number): Plate[] {
  const out: Plate[] = [];
  for (let i = 0; i < 40; i++) {
    const lon = lonOf(i, 1);
    const lat = latOf(i, 1);
    const c = onSphere(lon, lat, rot);
    if (c.z < 0.02) continue;
    const size = (0.13 + hash(i * 2.9) * 0.15) * grow;
    const path = new Path2D();
    const n = 8;
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (hash(i * 13 + k) - 0.5) * 0.6;
      const r = size * (0.6 + hash(i * 7 + k * 3) * 0.6);
      const p = onSphere(
        lon + (Math.cos(a) * r) / Math.max(0.35, Math.cos(lat)),
        lat + Math.sin(a) * r,
        rot,
      );
      pts.push([cx + p.x * R, cy + p.y * R]);
    }
    curve(path, pts, true);
    const edge = Math.min(1, Math.max(0, (c.z - 0.02) / 0.25));
    out.push({ path, a: edge * edge * (3 - 2 * edge), tone: hash(i * 4.7) });
  }
  return out;
}

/** Akkor çatlaklar: kürenin yüzeyinde dallanan, dönen çizgiler. */
function cracks(cx: number, cy: number, R: number, rot: number): Path2D {
  const path = new Path2D();
  for (let i = 0; i < 26; i++) {
    let lon = lonOf(i, 5);
    let lat = latOf(i, 5);
    let drawing = false;
    for (let k = 0; k < 7; k++) {
      const p = onSphere(lon, lat, rot);
      if (p.z < 0.04) drawing = false;
      else {
        if (!drawing) path.moveTo(cx + p.x * R, cy + p.y * R);
        else path.lineTo(cx + p.x * R, cy + p.y * R);
        drawing = true;
      }
      const a = hash(i * 31 + k) * Math.PI * 2;
      lon += Math.cos(a) * 0.15;
      lat += Math.sin(a) * 0.11;
    }
  }
  return path;
}

/** Levha kenarları ve çatlaklar: dışta yumuşak turuncu ışıma, içte ince beyazımsı çizgi. */
function glowLines(g: Ctx, crust: Plate[], crack: Path2D, R: number, heat: number, seams: number) {
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [color, alpha, width] of [
    [LAVA, 0.4, Math.max(2, R * 0.03)],
    [LAVA_HOT, 0.95, Math.max(1, R * 0.007)],
  ] as [RGB, number, number][]) {
    g.strokeStyle = rgba(color, alpha * heat);
    g.lineWidth = width;
    g.stroke(crack);
    if (seams <= 0.02) continue;
    g.strokeStyle = rgba(color, alpha * seams);
    for (const P of crust) {
      g.globalAlpha = P.a;
      g.stroke(P.path);
    }
    g.globalAlpha = 1;
  }
}

/** Yüzey: magma akıntıları, kabuk levhaları, akkor çatlaklar, okyanus, ilk kara parçaları, buhar. */
function surface(
  g: Ctx,
  f: SceneFrame,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  molten: number,
  heat: number,
  oceans: number,
  crust: Plate[],
  crack: Path2D,
) {
  const { t } = f;
  // Magma akıntıları: dönen sıcak şeritler; erimiş yüzeyin aktığını gösterir.
  if (molten > 0.05 && oceans < 0.01) {
    g.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const lat = latOf(i, 11) * 0.95;
      const lon = lonOf(i, 11) + t * 0.05 * (hash(i) - 0.5);
      let prev: Pt | null = null;
      for (let k = 0; k < 8; k++) {
        const p = onSphere(lon + k * 0.11, lat + Math.sin(k * 0.8 + i + t * 0.6) * 0.04, rot);
        if (prev && p.z > 0.05 && prev.z > 0.05) {
          g.strokeStyle = rgba(LAVA_HOT, 0.28 * molten * p.z);
          g.lineWidth = R * (0.02 + 0.02 * hash(i * 3 + k)) * p.z;
          g.beginPath();
          g.moveTo(cx + prev.x * R, cy + prev.y * R);
          g.lineTo(cx + p.x * R, cy + p.y * R);
          g.stroke();
        }
        prev = p;
      }
    }
  }
  // Kabuk levhaları: iki tonlu koyu bazalt; okyanusla birlikte suyun altında kalan, yalnızca
  // hafifçe seçilen deniz tabanı.
  for (const P of crust) {
    const dry = mix(hex("3b2f3a"), hex("54444f"), P.tone);
    const wet = mix(hex("2468b6"), hex("1d5aa3"), P.tone);
    g.globalAlpha = P.a * (1 - oceans * 0.7);
    g.fillStyle = rgba(mix(dry, wet, oceans));
    g.fill(P.path);
  }
  g.globalAlpha = 1;
  if (heat > 0.02) glowLines(g, crust, crack, R, heat, Math.min(heat, molten));
  // Okyanus yükselirken ilk küçük kara parçaları.
  if (oceans > 0.01) {
    for (let i = 0; i < 9; i++) {
      const p = onSphere(lonOf(i, 9), latOf(i, 9) * 0.7, rot);
      if (p.z < -0.1) continue;
      const size = R * (0.06 + hash(i * 4.1) * 0.08) * (0.4 + 0.6 * Math.max(0, p.z));
      g.fillStyle = rgba(hex("6fb8e0"), oceans * 0.5);
      blob(g, cx + p.x * R, cy + p.y * R, size * 1.35, i + 40, { wobble: 0.35, n: 8 });
      g.fill();
      g.fillStyle = rgba(LAND, oceans);
      blob(g, cx + p.x * R, cy + p.y * R, size, i + 40, { wobble: 0.35, n: 8 });
      g.fill();
      g.fillStyle = rgba(hex("a38b76"), oceans * 0.8);
      blob(g, cx + p.x * R - size * 0.2, cy + p.y * R - size * 0.2, size * 0.55, i + 60, {
        wobble: 0.3,
        n: 7,
      });
      g.fill();
    }
  }
  // Buhar bulutları: soğurken yoğunlaşır, yağmurla incelir.
  const steam =
    phase(t, f.beats[1] + 0.8, f.beats[1] + 2.6) *
    (1 - 0.6 * phase(t, f.beats[1] + 4.5, f.beats[1] + 6));
  if (steam > 0.01) {
    for (let i = 0; i < 16; i++) {
      const p = onSphere(lonOf(i, 3), latOf(i, 3), rot * 1.4 + t * 0.05);
      if (p.z < 0) continue;
      const size = R * (0.14 + hash(i * 6.1) * 0.12) * (0.35 + 0.65 * p.z);
      g.fillStyle = `rgba(255,255,255,${0.5 * steam})`;
      blob(g, cx + p.x * R, cy + p.y * R, size, i + 70, {
        wobble: 0.25,
        n: 9,
        t,
        live: 0.08,
        sy: 0.6,
      });
      g.fill();
    }
  }
}

/** Gece yüzünde de parlayan lav: gölgenin üstüne eklenen ışık. */
function lavaGlow(
  ctx: Ctx,
  f: SceneFrame,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  heat: number,
  molten: number,
  crust: Plate[],
  crack: Path2D,
) {
  if (heat <= 0.02) return;
  const { t } = f;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  glowLines(ctx, crust, crack, R, heat * 0.55, Math.min(heat, molten) * 0.55);
  // Sıcak noktalar: yanardağ ağızları gibi titreşen ışıklar.
  for (let i = 0; i < 10; i++) {
    const p = onSphere(lonOf(i, 17), latOf(i, 17), rot);
    if (p.z < 0.05) continue;
    const k = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
    drawGlow(ctx, cx + p.x * R, cy + p.y * R, R * 0.09 * p.z, LAVA_HOT, 0.55 * heat * k);
  }
  ctx.restore();
}

function craters(g: Ctx, x: number, y: number, r: number, n: number, color: RGB) {
  for (let i = 0; i < n; i++) {
    const a = hash(i * 5.3 + 1) * Math.PI * 2;
    const d = Math.sqrt(hash(i * 2.1 + 3)) * r * 0.7;
    const cr = r * (0.1 + hash(i * 9.7) * 0.12);
    g.fillStyle = rgba(color, 0.85);
    g.beginPath();
    g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.beginPath();
    g.arc(
      x + Math.cos(a) * d - cr * 0.25,
      y + Math.sin(a) * d - cr * 0.25,
      cr * 0.6,
      0,
      Math.PI * 2,
    );
    g.fill();
  }
}

function moon(ctx: Ctx, x: number, y: number, r: number) {
  planet(ctx, x, y, r, {
    base: MOON,
    shade: SHADE,
    rim: hex("ffffff"),
    atmo: hex("c8d4ff"),
    atmoAlpha: 0.18,
    detail: (g) => craters(g, x, y, r, 6, hex("a3aabb")),
  });
}

/** Çarpışma enkazı: önce yörüngeye saçılır, sonra Ay’da toplanır. `back`: arka yarı. */
function debris(
  f: SceneFrame,
  cx: number,
  cy: number,
  R: number,
  impact: number,
  gather: number,
  mx: number,
  my: number,
  back: boolean,
) {
  const { ctx, t, s } = f;
  const launch = phase(t, impact, impact + 1.3, ease.out);
  if (launch <= 0 || gather >= 1) return;
  const ix = cx + R * 0.8;
  const iy = cy - R * 0.55;
  for (let i = 0; i < 340; i++) {
    const a0 = hash(i * 1.7) * Math.PI * 2;
    const a = a0 + t * (0.35 + hash(i * 3.3) * 0.2);
    const rr = R * (1.45 + hash(i * 5.1) * 1.1);
    const rx = cx + Math.cos(a) * rr;
    const ry = cy + Math.sin(a) * rr * 0.36 + (hash(i * 7.7) - 0.5) * R * 0.08;
    if (Math.sin(a) < 0 !== back) continue;
    let x = lerp(ix, rx, launch);
    let y = lerp(iy, ry, launch);
    const g = ease.inOut(Math.min(1, Math.max(0, gather * 1.3 - hash(i) * 0.3)));
    x = lerp(x, mx, g);
    y = lerp(y, my, g);
    const cool = phase(t, impact + 1, impact + 5);
    const color = mix(LAVA_HOT, hex("a86a58"), cool);
    ctx.fillStyle = rgba(color, 0.9 * (1 - g * 0.6));
    ctx.beginPath();
    ctx.arc(x, y, (1.2 + hash(i * 2.2) * 1.8) * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bilgi kartı: Jack Hills zirkonu. */
function zircon(f: SceneFrame, k: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, s } = f;
  const cw = 214 * s;
  const ch = 92 * s;
  const wide = w > h;
  const x = wide ? w * 0.08 : w / 2 - cw / 2;
  const y = wide ? h * 0.24 : h * 0.8;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(10,12,32,0.78)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  // Kristal: sivri uçlu dörtgen prizma, yüzeyleri farklı tonlarda.
  const px = 40 * s;
  const py = ch / 2;
  const u = 11 * s;
  const face = (pts: [number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([a, b], i) =>
      i === 0 ? ctx.moveTo(px + a * u, py + b * u) : ctx.lineTo(px + a * u, py + b * u),
    );
    ctx.closePath();
    ctx.fill();
  };
  drawGlow(ctx, px, py, 34 * s, hex("ffb070"), 0.35);
  face(
    [
      [0, -3],
      [1, -1.6],
      [1, 1.6],
      [0, 3],
    ],
    "#d98a4f",
  );
  face(
    [
      [0, -3],
      [-1, -1.6],
      [-1, 1.6],
      [0, 3],
    ],
    "#f2b278",
  );
  face(
    [
      [-1, -1.6],
      [0, -3],
      [1, -1.6],
      [0, -1.1],
    ],
    "#ffd9a8",
  );
  face(
    [
      [-0.7, -1.2],
      [-0.3, -1.6],
      [-0.3, 1.4],
      [-0.7, 1.2],
    ],
    "rgba(255,255,255,0.35)",
  );
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Zirkon kristali", 72 * s, 26 * s);
  ctx.fillStyle = "rgba(220,215,205,0.95)";
  ctx.font = `400 ${Math.round(Math.max(10.5, 12 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Batı Avustralya, Jack Hills", 72 * s, 46 * s);
  ctx.fillText("4,4 milyar yaşında", 72 * s, 62 * s);
  ctx.fillText("sıvı suyun izini taşıyor", 72 * s, 78 * s);
  ctx.restore();
}

/* ---------- Okyanus tabanı ---------- */

function vent(f: SceneFrame) {
  const { ctx, w, h, t, beats, s } = f;
  const [, , b2] = beats;
  const u = t - b2;
  const wide = w > h;
  const drift = phase(t, b2, f.dur);
  const floor = h * (wide ? 0.74 : 0.8);
  const vx = wide ? w * 0.66 : w * 0.56;
  const top = floor - Math.min(w, h) * (wide ? 0.42 : 0.44);

  const deep = layer(
    f,
    "earth-deep",
    (g, W, H) => {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgb(12,58,94)");
      grad.addColorStop(0.55, "rgb(6,28,52)");
      grad.addColorStop(1, "rgb(3,10,22)");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      drawGlow(g, W * 0.5, -H * 0.1, W * 0.7, hex("3aa0d8"), 0.25);
      // Uzakta, soluk baca siluetleri; birkaçının ağzı hâlâ kor gibi.
      for (let i = 0; i < 8; i++) {
        const x = W * (0.03 + i * 0.135 + hash(i) * 0.05);
        const tip = H * (0.45 + hash(i * 3.3) * 0.17);
        g.fillStyle = "rgba(16,48,76,0.9)";
        g.beginPath();
        g.moveTo(x - 30, H * 0.8);
        for (let k = 0; k <= 8; k++) {
          const y = lerp(H * 0.8, tip, k / 8);
          g.lineTo(x - lerp(30, 8, k / 8) + (hash(i * 10 + k) - 0.5) * 8, y);
        }
        for (let k = 8; k >= 0; k--) {
          const y = lerp(H * 0.8, tip, k / 8);
          g.lineTo(x + lerp(30, 8, k / 8) + (hash(i * 20 + k) - 0.5) * 8, y);
        }
        g.fill();
        if (hash(i * 7.7) > 0.5) drawGlow(g, x, tip, 22, hex("ff8a40"), 0.35);
      }
      g.fillStyle = "rgb(12,30,46)";
      g.fillRect(0, H * 0.79, W, H * 0.21);
    },
    0.08,
  );
  drawLayer(f, deep, 0.08, 0, -drift * 20 * s);

  // Asılı mineral tozu.
  ctx.fillStyle = "rgba(170,220,255,0.35)";
  for (let i = 0; i < 70; i++) {
    const x = wrap(hash(i * 3.7) * w + Math.sin(t * 0.3 + i) * 20 * s, w);
    const y = wrap(hash(i * 5.3) * h - t * (6 + hash(i) * 8) * s, h);
    ctx.beginPath();
    ctx.arc(x, y, (0.8 + hash(i * 2.1) * 1.4) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Uzakta soluk, beyaz karbonat kulesi: alkali bacalar sıcak değil ılıktır, duman çıkarmaz.
  carbonate(ctx, wide ? w * 0.2 : w * 0.14, floor - 6 * s, floor - Math.min(w, h) * 0.32, s, t);

  // Deniz tabanı: yastık lavlar ve tortu.
  ctx.fillStyle = "rgb(20,28,42)";
  ctx.beginPath();
  ctx.moveTo(0, floor);
  for (let x = 0; x <= w + 20; x += 24 * s)
    ctx.lineTo(x, floor + Math.sin(x * 0.012) * 8 * s + hash(Math.round(x)) * 6 * s);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const x = hash(i * 4.3) * w;
    const y = floor + (6 + hash(i * 2.9) * 40) * s;
    const r = (14 + hash(i * 7.1) * 22) * s;
    pillow(ctx, x, y, r, i, vx, top);
  }

  chimney(ctx, vx - w * 0.2, floor, (top + floor) / 2 + 30 * s, 0.6 * s, t, 3);
  plume(ctx, vx - w * 0.2, (top + floor) / 2 + 30 * s, u, s, 0.55, h);
  chimney(
    ctx,
    vx + w * (wide ? 0.17 : 0.3),
    floor + 4 * s,
    floor - Math.min(w, h) * 0.16,
    0.42 * s,
    t,
    7,
  );
  plume(ctx, vx + w * (wide ? 0.17 : 0.3), floor - Math.min(w, h) * 0.16, u + 3, s, 0.35, h);
  chimney(ctx, vx, floor, top, s, t, 0);
  plume(ctx, vx, top, u, s, 1, h);
  shimmer(ctx, vx, top, s, t);

  // Kimya baloncukları: bacadan yükselen maddeler.
  const chems = ["H₂", "CO₂", "H₂S", "Fe²⁺", "CH₄"];
  chems.forEach((label, i) => {
    const life = (u * 0.13 + i * 0.2) % 1;
    const k = pop(u, 1.2 + i * 0.35, 0.5);
    if (k <= 0.01) return;
    const x = vx + (i % 2 ? 1 : -1) * (40 + i * 16) * s + Math.sin(u + i) * 12 * s;
    const y = top - life * (top - h * 0.12);
    const a = k * (1 - Math.max(0, (life - 0.8) / 0.2));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = `700 ${Math.round(Math.max(11, 13 * s))}px Outfit, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(120,220,255,0.18)";
    ctx.strokeStyle = "rgba(160,230,255,0.8)";
    ctx.lineWidth = Math.max(1, 1.4 * s);
    roundRect(ctx, x - tw / 2 - 10 * s, y - 12 * s, tw + 20 * s, 24 * s, 12 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(230,248,255,0.98)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
    ctx.restore();
  });

  const k = phase(u, 1.6, 2.6);
  callout(f, vx + 18 * s, top + 50 * s, "Hidrotermal baca", k, 1, "~350 °C, mineral yüklü su");
  callout(
    f,
    w * (wide ? 0.9 : 0.84),
    floor + 12 * s,
    "Okyanus tabanı",
    phase(u, 2.6, 3.6),
    -1,
    "güneş ışığı yok",
  );
  badge(f, w / 2, h * (w < h ? 0.19 : 0.16), "Işık yok: enerji kimyadan gelir", phase(u, 3.6, 4.4));
}

/** Yastık lav: suyun altında soğuyan lavın yuvarlak kütleleri; bacaya bakan yüzü turuncu ışık alır. */
function pillow(ctx: Ctx, x: number, y: number, r: number, seed: number, vx: number, top: number) {
  ctx.save();
  ctx.fillStyle = "rgb(24,20,34)";
  blob(ctx, x, y, r, seed + 90, { sy: 0.55, wobble: 0.15, n: 9 });
  ctx.fill();
  ctx.fillStyle = "rgb(46,40,60)";
  blob(ctx, x - r * 0.12, y - r * 0.1, r * 0.82, seed + 90, { sy: 0.5, wobble: 0.15, n: 9 });
  ctx.fill();
  const near = Math.max(0, 1 - Math.hypot(x - vx, y - top) / (r * 22));
  if (near > 0.02) {
    ctx.strokeStyle = `rgba(255,150,80,${0.55 * near})`;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    const dir = Math.atan2(top - y, vx - x);
    ctx.ellipse(x, y, r * 0.9, r * 0.5, 0, dir - 0.9, dir + 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(140,170,220,0.22)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Topaklı mineral kulesi: renkli mineral katmanları, yan tomurcuklar ve akkor ağız. */
function chimney(
  ctx: Ctx,
  x: number,
  floor: number,
  top: number,
  s: number,
  t: number,
  seed: number,
) {
  const n = 12;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const y = lerp(floor, top, k / n);
    const wdt = lerp(58, 14, (k / n) ** 0.8) * s;
    left.push([x - wdt + (hash(k * 3.1 + seed * 11 + x) - 0.5) * 16 * s, y]);
    right.push([x + wdt + (hash(k * 7.9 + seed * 13 + x) - 0.5) * 16 * s, y]);
  }
  const shape = new Path2D();
  shape.moveTo(left[0][0], left[0][1]);
  for (const p of left) shape.lineTo(p[0], p[1]);
  for (let k = right.length - 1; k >= 0; k--) shape.lineTo(right[k][0], right[k][1]);
  shape.closePath();
  const grad = ctx.createLinearGradient(x - 60 * s, 0, x + 60 * s, 0);
  grad.addColorStop(0, "rgb(104,76,66)");
  grad.addColorStop(0.45, "rgb(62,48,54)");
  grad.addColorStop(1, "rgb(26,22,30)");
  ctx.fillStyle = grad;
  ctx.fill(shape);
  ctx.save();
  ctx.clip(shape);
  // Mineral lekeleri: demir sülfür, pas, kükürt, anhidrit.
  const minerals = ["#b0642e", "#d49a45", "#8c4a2c", "#e3c460", "#cfc4b2"];
  for (let k = 1; k < n; k++) {
    for (let j = 0; j < 2; j++) {
      const [lx, ly] = left[k];
      const [rx] = right[k];
      const c = minerals[Math.floor(hash(k * 5.3 + j + seed) * minerals.length)];
      ctx.globalAlpha = 0.3 + hash(k * 2.1 + j + seed) * 0.35;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(
        lx + (rx - lx) * (0.2 + hash(k * 9.1 + j * 3 + seed) * 0.5),
        ly + (hash(k * 1.7 + j) - 0.5) * 8 * s,
        (rx - lx) * (0.12 + hash(k * 3.3 + j) * 0.18),
        (3 + hash(k + j * 5) * 4) * s,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Ağızdaki ısının vurduğu üst kısım ve gölgede kalan sağ yüz.
  const heat = ctx.createLinearGradient(0, top, 0, lerp(top, floor, 0.45));
  heat.addColorStop(0, "rgba(255,140,60,0.45)");
  heat.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = heat;
  ctx.fillRect(x - 80 * s, top - 10 * s, 160 * s, floor - top);
  ctx.fillStyle = "rgba(8,6,18,0.35)";
  ctx.fillRect(x + 6 * s, top - 10 * s, 80 * s, floor - top + 20 * s);
  ctx.restore();
  ctx.strokeStyle = "rgba(20,14,18,0.5)";
  ctx.lineWidth = Math.max(1, 2 * s);
  for (let k = 1; k < n; k++) {
    ctx.beginPath();
    ctx.moveTo(left[k][0], left[k][1]);
    ctx.quadraticCurveTo(x, left[k][1] + 6 * s, right[k][0], right[k][1]);
    ctx.stroke();
  }
  // Yan tomurcuklar: küçük ikincil bacalar, uçları kor gibi.
  for (let j = 0; j < 3; j++) {
    const k = 3 + j * 3;
    const side = j % 2 ? 1 : -1;
    const [bx, by] = side < 0 ? left[k] : right[k];
    const len = (16 + hash(j + seed) * 12) * s;
    const tx = bx + side * len * 0.7;
    const ty = by - len;
    ctx.fillStyle = "rgb(70,54,58)";
    ctx.beginPath();
    ctx.moveTo(bx - 6 * s, by + 4 * s);
    ctx.quadraticCurveTo(bx + side * len * 0.2, by - len * 0.5, tx - 3 * s, ty);
    ctx.lineTo(tx + 3 * s, ty);
    ctx.quadraticCurveTo(bx + side * len * 0.5, by - len * 0.3, bx + 6 * s, by + 4 * s);
    ctx.fill();
    drawGlow(ctx, tx, ty, 9 * s, hex("ff9a4a"), 0.6 + 0.3 * Math.sin(t * 4 + j));
  }
  const pulse = 0.8 + 0.2 * Math.sin(t * 3 + seed);
  drawGlow(ctx, x, top, 42 * s, hex("ff9a4a"), 0.7 * pulse);
  drawGlow(ctx, x, top, 14 * s, hex("ffe0a0"), 0.9);
}

/** Alkali baca: soluk karbonat kulesi, yumrulu tepeler; suyu sıcak değil ılık, duman yok. */
function carbonate(ctx: Ctx, x: number, floor: number, top: number, s: number, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  const tower = (cx: number, base: number, tip: number, wd: number, seed: number) => {
    const n = 10;
    const pts: [number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const y = lerp(base, tip, k / n);
      pts.push([cx - lerp(wd, wd * 0.35, k / n) + (hash(k * 4.1 + seed) - 0.5) * 10 * s, y]);
    }
    for (let k = n; k >= 0; k--) {
      const y = lerp(base, tip, k / n);
      pts.push([cx + lerp(wd, wd * 0.35, k / n) + (hash(k * 6.7 + seed) - 0.5) * 10 * s, y]);
    }
    const g = ctx.createLinearGradient(cx - wd, 0, cx + wd, 0);
    g.addColorStop(0, "rgb(170,190,200)");
    g.addColorStop(0.5, "rgb(120,140,160)");
    g.addColorStop(1, "rgb(60,80,104)");
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(210,225,232,0.45)";
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(
        cx - wd * 0.3 + hash(k + seed) * wd * 0.2,
        lerp(base, tip, 0.2 + k * 0.22),
        wd * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };
  tower(x - 26 * s, floor, top + 40 * s, 26 * s, 1);
  tower(x + 22 * s, floor, top + 70 * s, 20 * s, 2);
  tower(x, floor, top, 34 * s, 3);
  ctx.restore();
  // Ilık, berrak su: titreşen, ince ışık dalgaları.
  ctx.save();
  ctx.strokeStyle = "rgba(200,235,255,0.14)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const y = top - k * 10 * s;
      const px = x + (j - 1) * 10 * s + Math.sin(k * 0.9 - t * 3 + j) * 4 * s;
      if (k === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Bacanın ağzı üstünde sıcak suyun titreşimi. */
function shimmer(ctx: Ctx, x: number, top: number, s: number, t: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,210,170,0.18)";
  ctx.lineWidth = Math.max(1, 1.4 * s);
  for (let j = 0; j < 4; j++) {
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const y = top - 8 * s - k * 9 * s;
      const px = x + (j - 1.5) * 9 * s + Math.sin(k * 1.1 - t * 5 + j * 1.7) * (3 + k * 0.4) * s;
      if (k === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Siyah duman: sıcak, mineral yüklü su yükselir, genişler ve yana savrulur. */
function plume(ctx: Ctx, x: number, top: number, u: number, s: number, scale: number, h: number) {
  for (let i = 0; i < 46; i++) {
    const life = (hash(i * 1.3) + u * 0.16) % 1;
    const y = top - life * (top - h * 0.02) * scale;
    const spread =
      (hash(i * 5.3) - 0.5) * lerp(8, 160, life) * s * scale + life * life * 60 * s * scale;
    const r = lerp(9, 48, life) * s * scale;
    const warm = Math.max(0, 1 - life * 3);
    const fade = (1 - life) ** 1.1;
    // Gövde: koyu kahve-gri; üst kenar biraz daha açık, derinlik için.
    drawGlow(ctx, x + spread, y, r, mix(hex("3d3440"), hex("ff8a40"), warm * 0.55), 0.9 * fade);
    drawGlow(ctx, x + spread - r * 0.2, y - r * 0.25, r * 0.6, hex("7a6e78"), 0.35 * fade);
  }
}
