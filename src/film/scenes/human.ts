import {
  badge,
  callout,
  hash,
  roundRect,
  wrap,
  type Ctx,
  type SceneFrame,
} from "@/film/scenes/kit";
import {
  applyCam,
  camera,
  curve,
  drawGlow,
  ease,
  hex,
  phase,
  pop,
  project,
  rgba,
  sheet,
  type Cam,
} from "@/film/scenes/art";

/**
 * İnsana giden dallar. Önce ortak atadan ayrılan iki kuzen: şempanzeler ve biz. Sonra ağaca
 * yakınlaşıp gün batımındaki savanaya: volkan külünde yürüyen Australopithecus'lar, ardından
 * ateşin başında taş yontan Homo erectus ve Afrika'dan çıkış. En sonda çoğu kolu tükenmiş
 * gür bir çalı olarak ağacın tamamı, Neandertallerden bize gen akışı.
 */
export function human(f: SceneFrame) {
  const { ctx, t, beats } = f;
  const [, b1, b2] = beats;
  const into = phase(t, b1 - 0.5, b1 + 0.4);
  const back = phase(t, b2 + 0.1, b2 + 0.8);
  const sav = into * (1 - back);
  if (sav < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - sav;
    tree(f, into, back);
    ctx.restore();
  }
  if (sav > 0) {
    ctx.save();
    ctx.globalAlpha *= sav;
    savanna(f);
    ctx.restore();
  }
}

const TAU = Math.PI * 2;
type Pt = [number, number];

/* ---------- Soy ağacı ---------- */

type Kind =
  | "ata"
  | "chimp"
  | "bonobo"
  | "hom"
  | "ardi"
  | "australo"
  | "paran"
  | "homo"
  | "habilis"
  | "erectus"
  | "sapiens"
  | "neander"
  | "deni";

type Branch = {
  id: Kind;
  /** Milyon yıl önce: dalın ayrıldığı ve bittiği an. */
  at: number;
  to: number;
  parent?: Kind;
  /** Yatay konum, genişliğin oranı: yatay ve dikey ekran için. Dikeyde -1 gizler. */
  xw: number;
  xp: number;
  color: string;
  /** Başta görünen ana dallar: ortak atadan şempanzeye ve bize giden çizgi. */
  main?: boolean;
  living?: boolean;
  name?: string;
  sub?: string;
  /** Yatay ekranda etiketin yeri: sağ (1), sol (-1) ya da rozetin üstü (2). */
  side?: 1 | -1 | 2;
};

const TREE: Branch[] = [
  { id: "ata", at: 7, to: 6.5, xw: 0.72, xp: 0.62, color: "#f3eee2", main: true },
  {
    id: "chimp",
    parent: "ata",
    at: 6.5,
    to: 0,
    xw: 0.9,
    xp: 0.88,
    color: "#9fb4d0",
    main: true,
    living: true,
    name: "Şempanze",
    side: -1,
  },
  {
    id: "bonobo",
    parent: "chimp",
    at: 1.8,
    to: 0,
    xw: 0.8,
    xp: -1,
    color: "#b9a8dc",
    living: true,
    name: "Bonobo",
    side: -1,
  },
  { id: "hom", parent: "ata", at: 6.5, to: 2.8, xw: 0.72, xp: 0.62, color: "#f0c878", main: true },
  {
    id: "ardi",
    parent: "hom",
    at: 5.6,
    to: 4.4,
    xw: 0.81,
    xp: -1,
    color: "#dca47c",
    name: "Ardipithecus",
    sub: "~4,4 milyon yıl",
    side: 1,
  },
  {
    id: "australo",
    parent: "hom",
    at: 2.8,
    to: 2,
    xw: 0.72,
    xp: 0.62,
    color: "#f0c878",
    name: "Australopithecus",
    side: -1,
  },
  {
    id: "paran",
    parent: "australo",
    at: 2.6,
    to: 1.2,
    xw: 0.81,
    xp: 0.84,
    color: "#e69a74",
    name: "Paranthropus",
    side: -1,
  },
  { id: "homo", parent: "hom", at: 2.8, to: 0.6, xw: 0.5, xp: 0.42, color: "#8ec8f2", main: true },
  {
    id: "habilis",
    parent: "homo",
    at: 2.3,
    to: 1.5,
    xw: 0.62,
    xp: -1,
    color: "#a8d49e",
    name: "Homo habilis",
    side: -1,
  },
  {
    id: "erectus",
    parent: "homo",
    at: 0.6,
    to: 0.11,
    xw: 0.5,
    xp: 0.42,
    color: "#8ec8f2",
    name: "Homo erectus",
    side: 1,
  },
  {
    id: "sapiens",
    parent: "homo",
    at: 0.6,
    to: 0,
    xw: 0.36,
    xp: 0.3,
    color: "#ffd27a",
    main: true,
    living: true,
    name: "Homo sapiens",
    side: 1,
  },
  {
    id: "neander",
    parent: "sapiens",
    at: 0.5,
    to: 0.04,
    xw: 0.24,
    xp: 0.08,
    color: "#c4a4ee",
    name: "Neandertal",
    side: 2,
  },
  {
    id: "deni",
    parent: "neander",
    at: 0.42,
    to: 0.05,
    xw: 0.12,
    xp: -1,
    color: "#eaa2ca",
    name: "Denisova",
    side: 2,
  },
];

const byId = (id: Kind) => TREE.find((b) => b.id === id)!;

function treeGeo(f: SceneFrame) {
  const wide = f.w > f.h;
  const y0 = f.h * (wide ? 0.25 : 0.2);
  const y1 = f.h * (wide ? 0.82 : 0.72);
  return {
    wide,
    y0,
    y1,
    Y: (my: number) => y0 + (y1 - y0) * Math.sqrt(Math.max(0, my) / 7),
    X: (b: Branch) => f.w * (wide ? b.xw : b.xp),
  };
}
type Geo = ReturnType<typeof treeGeo>;

const visible = (G: Geo, b: Branch) => G.wide || b.xp >= 0;

/** Dalın yolu: atasından ayrıldığı noktadan yumuşak bir kavisle kendi hizasına, sonra yukarı. */
function branchPath(f: SceneFrame, G: Geo, b: Branch) {
  const p = new Path2D();
  const x1 = G.X(b);
  const ya = G.Y(b.at);
  const yb = G.Y(b.to);
  if (!b.parent) {
    p.moveTo(x1, ya);
    p.lineTo(x1, yb);
    return p;
  }
  const x0 = G.X(byId(b.parent));
  const bend = Math.min(46 * f.s, (ya - yb) * 0.45);
  p.moveTo(x0, ya);
  p.bezierCurveTo(x0, ya - bend * 0.55, x1, ya - bend * 0.45, x1, ya - bend);
  p.lineTo(x1, yb);
  return p;
}

/** Ağacın büyüme cephesi (milyon yıl): kökten bugüne, ekranda eşit hızla ilerler. */
function frontier(t: number, a: number, b: number) {
  const k = phase(t, a, b, ease.inOut);
  return 7 * (1 - k) ** 2;
}

function tree(f: SceneFrame, into: number, back: number) {
  const { ctx, w, h, t, s, beats } = f;
  const [b0, b1, b2] = beats;
  const G = treeGeo(f);

  // Arka plan: koyu lacivertten mora, ortada ağacın yumuşak ışığı ve yavaşça süzülen toz.
  sheet(f, "insan-gok", 0, 0, w, h, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0d0b1f");
    grad.addColorStop(0.6, "#1a1030");
    grad.addColorStop(1, "#120a18");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    drawGlow(g, w * (G.wide ? 0.62 : 0.5), h * 0.45, Math.max(w, h) * 0.5, hex("5a3a8a"), 0.35);
    drawGlow(g, w * (G.wide ? 0.72 : 0.62), G.y1, Math.max(w, h) * 0.3, hex("b0703a"), 0.18);
  });
  ctx.fillStyle = "rgba(255,240,220,0.35)";
  ctx.beginPath();
  for (let i = 0; i < 50; i++) {
    const x = wrap(hash(i * 3.3) * w + Math.sin(t * 0.2 + i) * 20 * s, w);
    const y = wrap(hash(i * 7.1) * h - t * (3 + hash(i) * 5) * s, h);
    const r = (0.6 + hash(i * 1.7) * 1.2) * s;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();

  // Savanaya dalış ve dönüş: Australopithecus hizasına yakınlaşan kamera.
  const fx = G.X(byId("hom"));
  const fy = G.Y(3.4);
  const returning = back > 0;
  const z = returning ? 1 + 0.5 * (1 - ease.out(back)) : 1 + 2.2 * ease.in(into);
  // Dalışta odak noktası ekranda sabit kalır; dönüşte ağaç ortadan küçülerek yerine oturur.
  const cam: Cam = returning
    ? { x: 0, y: 0, z }
    : { x: ((fx / w - 0.5) * (z - 1)) / z, y: ((fy / h - 0.5) * (z - 1)) / z, z };

  ctx.save();
  applyCam(f, cam);
  // Zaman çizgileri: sağ kenarda etiketli, ağacın arkasında silik.
  const ticks: [number, string][] = [
    [7, "7 milyon yıl önce"],
    [4, "4"],
    [2, "2"],
    [1, "1 milyon"],
    [0.3, "300 bin"],
    [0, "bugün"],
  ];
  const tickA = phase(t, b0 - 1, b0);
  ctx.save();
  ctx.globalAlpha *= tickA;
  ctx.strokeStyle = "rgba(243,238,226,0.08)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2 * s, 6 * s]);
  for (const [my] of ticks) {
    ctx.beginPath();
    ctx.moveTo(w * (G.wide ? 0.3 : 0.03), G.Y(my));
    ctx.lineTo(w * 0.97, G.Y(my));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(200,190,176,0.7)";
  ctx.font = `500 ${Math.round(Math.max(10, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  for (const [my, label] of ticks) ctx.fillText(label, w * 0.97, G.Y(my) - 3 * s);
  ctx.restore();

  const f0 = frontier(t, b0 - 1, b0 + 1.4);
  const f2 = frontier(t, b2 + 0.8, b2 + 2.5);
  const reach = (b: Branch) => (b.main ? f0 : f2);

  // Dallar: önce geniş, yumuşak bir ışık; üstünde renkli çekirdek.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pass of [0, 1]) {
    for (const b of TREE) {
      if (!visible(G, b)) continue;
      const fr = reach(b);
      if (fr >= b.at) continue;
      const cut = G.Y(Math.max(fr, b.to));
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, cut - 1, w * 3, h * 2);
      ctx.clip();
      const path = branchPath(f, G, b);
      const width = (b.main ? 6 : 4) * s;
      if (pass === 0) {
        ctx.strokeStyle = b.color;
        ctx.globalAlpha *= 0.16;
        ctx.lineWidth = width * 3.2;
      } else {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = width;
      }
      ctx.stroke(path);
      ctx.restore();
      // Büyüyen ucun parıltısı.
      if (pass === 1 && fr > b.to) {
        const x = G.X(b);
        drawGlow(ctx, x, cut, 16 * s, hex("fff4dc"), 0.9);
      }
    }
  }

  // Ortak ata: kökte soru işaretli rozet.
  const ata = byId("ata");
  const rootK = pop(t, b0 - 0.6, 0.6);
  head(ctx, G.X(ata), G.Y(7), 22 * s * rootK, "ata", ata.color, false);

  // Dal uçlarındaki rozetler ve adlar.
  for (const b of TREE) {
    if (!b.name || !visible(G, b)) continue;
    const fr = reach(b);
    const done = fr <= b.to + 0.001;
    const k = pop(t, doneTime(b, b0, b2, done), 0.55);
    if (!done || k <= 0.01) continue;
    const x = G.X(b);
    const y = G.Y(b.to);
    const big = b.id === "sapiens" || (b.id === "chimp" && t < b2);
    const r = (big ? 24 : 16) * s * k;
    if (b.living) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + x);
      drawGlow(ctx, x, y, r * 2.4, hex(b.color.slice(1)), 0.35 + 0.2 * pulse);
    }
    head(ctx, x, y, r, b.id, b.color, !b.living);
  }
  ctx.restore();

  // Etiketler ekran koordinatında: kamera dalışında birlikte kaybolur.
  const labelA = 1 - Math.max(into, 0) * (1 - back);
  if (labelA > 0.01) {
    const P = (x: number, y: number) => project(f, cam, x, y);
    ctx.save();
    ctx.globalAlpha *= labelA;
    for (const b of TREE) {
      if (!b.name || !visible(G, b)) continue;
      const fr = reach(b);
      if (fr > b.to + 0.001) continue;
      const beat0 = t < b1;
      if (!b.main && beat0) continue;
      const at = doneTime(b, b0, b2, true);
      const k = phase(t, at + 0.2, at + 0.8);
      const [x, y] = P(G.X(b), G.Y(b.to));
      let name = b.name;
      let sub = b.sub ?? (b.living ? "bugün" : "soyu tükendi");
      if (b.id === "sapiens" && beat0) {
        name = "İnsan";
        sub = "7 milyon yıllık kendi yolu";
      } else if (b.id === "sapiens") sub = "~300 bin yıl önce, Afrika";
      if (b.id === "chimp" && beat0) sub = "o da 7 milyon yıl evrildi";
      const big = b.id === "sapiens" || (b.id === "chimp" && beat0);
      const side = G.wide ? (b.side ?? 1) : b.id === "sapiens" ? 1 : 0;
      tipLabel(f, x, y, (big ? 24 : 16) * s, name, sub, b.color, side, k);
    }
    ctx.restore();

    const [ax, ay] = P(G.X(ata), G.Y(7));
    callout(
      f,
      ax - 20 * s,
      ay,
      "Ortak ata",
      phase(t, b0 - 0.2, b0 + 0.6) * (1 - phase(t, b1 - 1, b1 - 0.5)),
      -1,
      "~7 milyon yıl önce",
    );
    badge(
      f,
      w / 2,
      h * (G.wide ? 0.14 : 0.1),
      "Şempanze atamız değil, kuzenimiz",
      phase(t, b0 + 1.8, b0 + 2.4) * (1 - phase(t, b1 - 1, b1 - 0.5)),
    );
    geneFlow(f, G, cam, phase(t, b2 + 3, b2 + 4));
    dnaCard(f, G, pop(t, b2 + 3.8, 0.7), phase(t, b2 + 4.2, b2 + 5.4));
  }
}

/** Rozetin belirdiği an: dalın ucu cepheye ulaştığında. */
function doneTime(b: Branch, b0: number, b2: number, done: boolean) {
  if (!done) return Infinity;
  const [a, e] = b.main ? [b0 - 1, b0 + 1.4] : [b2 + 0.8, b2 + 2.5];
  // Cephe bu dalın ucuna hangi anda vardı: frontier'in tersi.
  const k = 1 - Math.sqrt(Math.max(0, b.to) / 7);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    if (ease.inOut(m) < k) lo = m;
    else hi = m;
  }
  return a + (e - a) * lo;
}

function tipLabel(
  f: SceneFrame,
  x: number,
  y: number,
  r: number,
  name: string,
  sub: string,
  color: string,
  side: 1 | -1 | 0 | 2,
  k: number,
) {
  if (k <= 0.01) return;
  const { ctx, s } = f;
  ctx.save();
  ctx.globalAlpha *= k;
  const nameFont = `600 ${Math.round(Math.max(11, 13 * s))}px Outfit, system-ui, sans-serif`;
  const subFont = `400 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.font = nameFont;
  const nw = ctx.measureText(name).width;
  ctx.font = subFont;
  const sw = ctx.measureText(sub).width;
  const bw = Math.max(nw, sw) + 16 * s;
  const bh = 36 * s;
  let bx: number;
  let by: number;
  if (side === 0) {
    bx = x - bw / 2;
    by = y + r + 6 * s;
  } else if (side === 2) {
    bx = x - bw / 2;
    by = y - r - 6 * s - bh;
  } else {
    bx = side > 0 ? x + r + 8 * s : x - r - 8 * s - bw;
    by = y - bh / 2;
  }
  bx = Math.max(6 * s, Math.min(f.w - bw - 6 * s, bx));
  ctx.fillStyle = "rgba(10,8,22,0.72)";
  roundRect(ctx, bx, by, bw, bh, 9 * s);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(bx + 6 * s, by + 8 * s, 2 * s, bh - 16 * s);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = nameFont;
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.fillText(name, bx + 12 * s, by + 12.5 * s);
  ctx.font = subFont;
  ctx.fillStyle = "rgba(210,202,190,0.9)";
  ctx.fillText(sub, bx + 12 * s, by + 25.5 * s);
  ctx.restore();
}

/**
 * Yuvarlak rozette yandan kafa silueti. Beyin kutusunun yüksekliği, alnın eğimi, kaş çıkıntısı,
 * yüzün öne çıkışı ve çenenin varlığı türe göre değişir: fosil kafataslarının ana farkları.
 */
function head(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  kind: Kind,
  color: string,
  extinct: boolean,
) {
  if (r <= 0.5) return;
  type Shape = {
    vault: number;
    fore: number;
    brow: number;
    nose: number;
    lip: number;
    chin: number;
    occ: number;
    crest?: boolean;
    ear?: boolean;
  };
  const SH: Partial<Record<Kind, Shape>> = {
    ata: {
      vault: -0.02,
      fore: 0.12,
      brow: 0.46,
      nose: 0.5,
      lip: 0.72,
      chin: 0.3,
      occ: -0.55,
      ear: true,
    },
    chimp: {
      vault: -0.02,
      fore: 0.12,
      brow: 0.48,
      nose: 0.52,
      lip: 0.74,
      chin: 0.3,
      occ: -0.55,
      ear: true,
    },
    bonobo: {
      vault: 0.02,
      fore: 0.16,
      brow: 0.44,
      nose: 0.5,
      lip: 0.66,
      chin: 0.3,
      occ: -0.55,
      ear: true,
    },
    ardi: { vault: 0, fore: 0.14, brow: 0.46, nose: 0.5, lip: 0.66, chin: 0.3, occ: -0.55 },
    australo: { vault: 0.02, fore: 0.16, brow: 0.46, nose: 0.52, lip: 0.64, chin: 0.3, occ: -0.56 },
    paran: {
      vault: 0.04,
      fore: 0.14,
      brow: 0.5,
      nose: 0.52,
      lip: 0.6,
      chin: 0.36,
      occ: -0.56,
      crest: true,
    },
    habilis: { vault: 0.08, fore: 0.22, brow: 0.46, nose: 0.54, lip: 0.56, chin: 0.34, occ: -0.6 },
    erectus: { vault: 0.08, fore: 0.24, brow: 0.54, nose: 0.6, lip: 0.52, chin: 0.34, occ: -0.66 },
    neander: { vault: 0.16, fore: 0.3, brow: 0.54, nose: 0.68, lip: 0.5, chin: 0.36, occ: -0.74 },
    deni: { vault: 0.14, fore: 0.28, brow: 0.52, nose: 0.62, lip: 0.5, chin: 0.36, occ: -0.7 },
    sapiens: { vault: 0.24, fore: 0.4, brow: 0.46, nose: 0.6, lip: 0.46, chin: 0.44, occ: -0.62 },
  };
  const S = SH[kind] ?? SH.sapiens!;
  const base = hex(color.slice(1));
  const tone = extinct ? base.map((c) => c * 0.62 + 40) : base;
  ctx.save();
  ctx.fillStyle = rgba(tone as [number, number, number]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = extinct ? "rgba(20,14,30,0.5)" : "rgba(255,250,240,0.85)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.96, 0, TAU);
  ctx.clip();
  const u = r * 0.82;
  const P = (px: number, py: number): Pt => [x + px * u, y + 0.05 * u + py * u];
  const pts: Pt[] = [
    P(-0.12, 1.3),
    P(-0.3, 0.62),
    P(S.occ, 0.08),
    P(S.occ * 0.72, -0.42 - S.vault * 0.4),
    P(-0.08, -0.6 - S.vault),
  ];
  if (S.crest) pts.push(P(0.02, -0.74), P(0.1, -0.6));
  pts.push(
    P(S.fore, -0.38 - S.vault * 0.3),
    P(S.brow, -0.16),
    P(S.brow - 0.07, -0.07),
    P(S.nose, 0.1),
    P(S.nose - 0.1, 0.2),
    P(S.lip, 0.27),
    P(S.lip - 0.08, 0.38),
    P(S.chin, 0.52),
    P(0.12, 0.64),
    P(0.22, 1.3),
  );
  ctx.fillStyle = extinct ? "rgba(30,22,40,0.78)" : "rgba(28,20,40,0.88)";
  ctx.beginPath();
  curve(ctx, pts, true);
  ctx.fill();
  if (S.ear) {
    ctx.fillStyle = "rgba(50,40,64,0.9)";
    ctx.beginPath();
    ctx.ellipse(x - 0.16 * u, y + 0.02 * u, 0.13 * u, 0.17 * u, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,250,240,0.85)";
  ctx.beginPath();
  ctx.arc(x + (S.brow - 0.2) * u, y - 0.02 * u, Math.max(0.8, 0.045 * u), 0, TAU);
  ctx.fill();
  if (kind === "ata") {
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.font = `700 ${Math.round(r * 0.9)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x - 0.05 * u, y - 0.1 * u);
  }
  ctx.restore();
}

/** Neandertallerden bize gen akışı: kesikli, akan bir kavis. */
function geneFlow(f: SceneFrame, G: Geo, cam: Cam, k: number) {
  if (k <= 0.01) return;
  const { ctx, t, s } = f;
  const ne = byId("neander");
  const sa = byId("sapiens");
  const [x0, y0] = project(f, cam, G.X(ne), G.Y(0.07));
  const [x1, y1] = project(f, cam, G.X(sa), G.Y(0.04));
  const mx = (x0 + x1) / 2;
  const my = Math.max(y0, y1) + 24 * s;
  ctx.save();
  ctx.strokeStyle = `rgba(196,164,238,${0.95 * k})`;
  ctx.lineWidth = Math.max(1.5, 2.2 * s);
  ctx.setLineDash([5 * s, 5 * s]);
  ctx.lineDashOffset = -t * 18 * s;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const ex = x0 + (x1 - x0) * k;
  const ey = y0 + (y1 - y0) * k;
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Neandertal mirası: DNA şeridinde küçük mor parçalar. */
function dnaCard(f: SceneFrame, G: Geo, k: number, fill: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, t, s } = f;
  const cw = Math.min(w * 0.9, 300 * s);
  const ch = 96 * s;
  const x = G.wide ? w * 0.05 : (w - cw) / 2;
  const y = G.wide ? h * 0.44 : h * 0.76;
  ctx.save();
  ctx.translate(x + cw / 2, y + ch / 2);
  ctx.scale(k, k);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.fillStyle = "rgba(14,10,30,0.86)";
  roundRect(ctx, 0, 0, cw, ch, 16 * s);
  ctx.fill();
  ctx.strokeStyle = "rgba(196,164,238,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Neandertal mirası", 16 * s, 20 * s);
  ctx.fillStyle = "rgba(215,208,196,0.92)";
  ctx.font = `400 ${Math.round(Math.max(10, 11 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("Afrika dışı kökenli insanlarda DNA’nın ~%1–2’si", 16 * s, 38 * s);
  // Çift sarmal: iki iplik ve basamaklar; birkaç kısa bölüm mor.
  const x0 = 16 * s;
  const x1 = cw - 16 * s;
  const cy = 68 * s;
  const amp = 9 * s;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const px = x0 + (x1 - x0) * u;
    const a = u * Math.PI * 7 + t * 1.2;
    const neander = [9, 21, 33].includes(i) && u <= fill;
    ctx.strokeStyle = neander ? "rgba(196,164,238,1)" : "rgba(255,210,122,0.55)";
    ctx.lineWidth = Math.max(1, (neander ? 3 : 1.6) * s);
    ctx.beginPath();
    ctx.moveTo(px, cy + Math.sin(a) * amp);
    ctx.lineTo(px, cy - Math.sin(a) * amp);
    ctx.stroke();
  }
  for (const sign of [1, -1]) {
    ctx.strokeStyle = sign > 0 ? "rgba(255,226,170,0.95)" : "rgba(255,200,120,0.7)";
    ctx.lineWidth = Math.max(1.2, 2 * s);
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const u = i / 90;
      const px = x0 + (x1 - x0) * u;
      const py = cy + sign * Math.sin(u * Math.PI * 7 + t * 1.2) * amp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Savana: Australopithecus, sonra Homo erectus ---------- */

type Body = {
  thigh: number;
  shin: number;
  torso: number;
  head: number;
  upper: number;
  fore: number;
  lean: number;
  girth: number;
  muzzle: number;
};

/** Australopithecus: kısa bacaklar, uzun kollar, küçük beyin, öne çıkık yüz. */
const AUS: Body = {
  thigh: 0.21,
  shin: 0.2,
  torso: 0.31,
  head: 0.1,
  upper: 0.21,
  fore: 0.2,
  lean: 0.12,
  girth: 0.12,
  muzzle: 0.55,
};
/** Homo erectus: uzun bacaklar, bugünkü insana yakın beden oranları. */
const ERE: Body = {
  thigh: 0.26,
  shin: 0.25,
  torso: 0.29,
  head: 0.075,
  upper: 0.17,
  fore: 0.16,
  lean: 0.04,
  girth: 0.085,
  muzzle: 0.3,
};

function savGeo(f: SceneFrame) {
  const wide = f.w > f.h;
  return { wide, horizon: f.h * (wide ? 0.58 : 0.5), ground: f.h * (wide ? 0.8 : 0.66) };
}

function savanna(f: SceneFrame) {
  const { ctx, w, h, t, s, beats } = f;
  const [, b1, b2] = beats;
  const S = savGeo(f);
  const pan = phase(t, b1 + 3.1, b1 + 4.2, ease.inOut);
  const cam: Cam = camera(t, [
    [b1 - 0.6, 0, 0, 1.18],
    [b1 + 0.6, 0, 0, 1.04],
    [b1 + 3.1, 0.02, 0, 1],
    [b1 + 4.2, 1, 0, 1],
    [b2 + 0.9, 1.06, 0, 1.08],
  ]);

  // Gökyüzü: gün batımı; kamp tarafına geçerken gece iner.
  ctx.save();
  applyCam(f, cam, 0.1);
  sheet(f, "savana-gok", -0.2 * w, -0.1 * h, 1.4 * w, S.horizon + 0.05 * h, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, S.horizon);
    grad.addColorStop(0, "#2b1d4f");
    grad.addColorStop(0.4, "#6e3a6c");
    grad.addColorStop(0.72, "#d8695a");
    grad.addColorStop(1, "#f6b36a");
    g.fillStyle = grad;
    g.fillRect(-0.2 * w, -0.1 * h, 1.6 * w, S.horizon + 0.2 * h);
    drawGlow(g, w * 0.62, S.horizon - h * 0.06, w * 0.55, hex("ffb070"), 0.55);
    g.fillStyle = "#ffe2a8";
    g.beginPath();
    g.arc(w * 0.62, S.horizon - h * 0.05, Math.min(w, h) * 0.075, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(255,200,160,0.35)";
    g.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const y = h * (0.12 + i * 0.05);
      const x = w * (hash(i * 3.1) * 1.3 - 0.1);
      g.lineWidth = (3 + hash(i) * 4) * s;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (80 + hash(i * 5.5) * 160) * s, y);
      g.stroke();
    }
  });
  ctx.restore();
  const night = pan;
  if (night > 0.01) {
    const g = ctx.createLinearGradient(0, 0, 0, S.horizon);
    g.addColorStop(0, `rgba(10,8,34,${0.8 * night})`);
    g.addColorStop(1, `rgba(40,20,60,${0.55 * night})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, S.horizon + 2);
    ctx.save();
    ctx.globalAlpha *= night;
    for (let i = 0; i < 40; i++) {
      const x = hash(i * 2.7) * w;
      const y = hash(i * 5.9) * S.horizon * 0.8;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      ctx.fillStyle = `rgba(255,250,235,${0.3 + 0.5 * tw})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.6 + hash(i) * 1.2) * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Uzak tepeler ve dumanı tüten Sadiman yanardağı: Laetoli izlerini onun külü korudu.
  ctx.save();
  applyCam(f, cam, 0.3);
  sheet(f, "savana-tepe", -0.2 * w, S.horizon - 0.25 * h, 1.6 * w, S.horizon + 0.04 * h, (g) => {
    g.fillStyle = "#8a4a6a";
    g.beginPath();
    g.moveTo(-0.2 * w, S.horizon + 0.04 * h);
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const x = -0.2 * w + (1.8 * w * i) / 18;
      pts.push([
        x,
        S.horizon - h * (0.03 + 0.03 * Math.sin(i * 1.3) + 0.02 * Math.sin(i * 0.5 + 1)),
      ]);
    }
    curve(g, pts);
    g.lineTo(1.6 * w, S.horizon + 0.04 * h);
    g.fill();
    const vx = w * 0.22;
    const vy = S.horizon;
    const vw = w * 0.2;
    const vh = h * 0.17;
    g.fillStyle = "#6e3a5e";
    g.beginPath();
    g.moveTo(vx - vw, vy + 2);
    g.quadraticCurveTo(vx - vw * 0.3, vy - vh * 0.6, vx - vw * 0.12, vy - vh);
    g.lineTo(vx + vw * 0.1, vy - vh);
    g.quadraticCurveTo(vx + vw * 0.35, vy - vh * 0.55, vx + vw, vy + 2);
    g.fill();
    g.fillStyle = "#5a2e50";
    g.beginPath();
    g.moveTo(vx + vw * 0.1, vy - vh);
    g.quadraticCurveTo(vx + vw * 0.35, vy - vh * 0.55, vx + vw, vy + 2);
    g.lineTo(vx + vw * 0.2, vy + 2);
    g.quadraticCurveTo(vx + vw * 0.12, vy - vh * 0.5, vx + vw * 0.02, vy - vh);
    g.fill();
  });
  // Duman: yavaşça yükselip genişleyen, gün batımında pembe bulutlar.
  for (let i = 0; i < 12; i++) {
    const life = (hash(i * 1.9) + t * 0.05) % 1;
    const x = w * 0.22 + life * w * 0.12 + Math.sin(i + t * 0.3) * 6 * s;
    const y = S.horizon - h * 0.17 - life * h * 0.22;
    const r = (14 + life * 50) * s;
    drawGlow(ctx, x, y, r, hex("b87a8a"), 0.5 * (1 - life));
  }
  ctx.restore();

  // Akasyalar: düz tepeli, geniş taçlı siluetler.
  ctx.save();
  applyCam(f, cam, 0.6);
  sheet(f, "savana-akasya", -0.2 * w, S.horizon - 0.2 * h, 2.1 * w, S.horizon + 0.06 * h, (g) => {
    for (let i = 0; i < 9; i++) {
      const x = -0.1 * w + i * 0.25 * w + hash(i * 3.7) * 0.08 * w;
      acacia(g, x, S.horizon + 0.02 * h, (0.08 + hash(i * 1.3) * 0.06) * h, i);
    }
  });
  ctx.restore();

  // Zemin: otlar, önde volkan külünden açık renkli düzlük.
  ctx.save();
  applyCam(f, cam);
  sheet(f, "savana-zemin", -0.2 * w, S.horizon - 0.01 * h, 2.3 * w, h * 1.1, (g) => {
    const grad = g.createLinearGradient(0, S.horizon, 0, h);
    grad.addColorStop(0, "#a0585a");
    grad.addColorStop(0.35, "#7a4450");
    grad.addColorStop(1, "#3e2434");
    g.fillStyle = grad;
    g.fillRect(-0.2 * w, S.horizon, 2.5 * w, h);
    // Kül düzlüğü.
    g.fillStyle = "rgba(214,176,150,0.55)";
    g.beginPath();
    g.ellipse(w * 0.62, S.ground + 0.02 * h, w * 0.55, h * 0.07, 0, 0, TAU);
    g.fill();
    // Ot öbekleri.
    for (let i = 0; i < 160; i++) {
      const x = -0.2 * w + hash(i * 2.3) * 2.5 * w;
      const d = hash(i * 4.9);
      const y = S.horizon + d * d * (h - S.horizon);
      const hh = (4 + d * 16) * s;
      g.strokeStyle = d > 0.5 ? "rgba(60,30,40,0.7)" : "rgba(150,90,80,0.6)";
      g.lineWidth = Math.max(1, (0.8 + d) * s);
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        g.moveTo(x + k * 2 * s, y);
        g.lineTo(x + k * 3.5 * s, y - hh * (0.7 + hash(i + k) * 0.3));
      }
      g.stroke();
    }
  });

  // Australopithecus çifti: kül üstünde iki ayak üstünde yürür, arkada izler kalır.
  const walkU = t - (b1 - 1.2);
  const H1 = h * (S.wide ? 0.26 : 0.2);
  const x1 = w * (S.wide ? 0.44 : 0.22) + walkU * H1 * 0.62;
  const x2 = x1 - H1 * 0.55;
  const g1 = S.ground;
  const g2 = S.ground - 10 * s;
  // Kamera kampa kayarken bu sahne geride kalır: çift ve izler solar.
  const stay = 1 - pan;
  if (stay > 0.01) {
    ctx.save();
    ctx.globalAlpha *= stay;
    footprints(ctx, w * 0.3, x2 - H1 * 0.05, g2 + 2 * s, H1 * 0.26, s, 0.85);
    footprints(ctx, w * 0.3, x1 - H1 * 0.05, g1 + 2 * s, H1 * 0.3, s, 1);
    walker(ctx, x2, g2, H1 * 0.84, walkU * 5.2 + 1.3, AUS);
    walker(ctx, x1, g1, H1, walkU * 4.8, AUS);
    ctx.restore();
  }

  // Erectus kampı: ateş, taş yontan biri ve ufka bakan biri.
  const fireX = w * (S.wide ? 1.66 : 1.62);
  const H2 = h * (S.wide ? 0.3 : 0.22);
  const heat = phase(t, b1 + 3.3, b1 + 4.3);
  firelight(ctx, fireX, S.ground, H2, t, heat);
  knapper(ctx, fireX - H2 * 0.62, S.ground, H2, t, s);
  const leave = Math.max(0, t - (b1 + 3.6));
  const standX = fireX + H2 * (S.wide ? 0.75 : 0.55) + leave * H2 * 0.32;
  walker(ctx, standX, S.ground, H2, leave * 4.2, ERE);
  ctx.restore();

  // Önde sallanan uzun otlar.
  ctx.save();
  applyCam(f, cam, 1.3);
  for (let i = 0; i < 26; i++) {
    const x = -0.1 * w + hash(i * 6.1) * 2.9 * w;
    const hh = (0.1 + hash(i * 2.2) * 0.12) * h;
    const sway = Math.sin(t * 1.2 + i) * 0.12;
    ctx.strokeStyle = "rgba(28,14,24,0.92)";
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      const bx = x + k * 6 * s;
      ctx.moveTo(bx, h * 1.02);
      ctx.quadraticCurveTo(
        bx + k * 4 * s,
        h * 1.02 - hh * 0.6,
        bx + (k * 0.15 + sway) * hh,
        h * 1.02 - hh * (0.8 + hash(i + k) * 0.3),
      );
    }
    ctx.stroke();
  }
  ctx.restore();

  // Etiketler.
  const P = (x: number, y: number) => project(f, cam, x, y);
  const out1 = 1 - phase(t, b1 + 2.9, b1 + 3.2);
  {
    const [ax, ay] = P(x1 + H1 * 0.05, g1 - H1 * 0.9);
    callout(
      f,
      ax,
      ay,
      "Australopithecus",
      phase(t, b1 + 0.2, b1 + 0.9) * out1,
      1,
      "iki ayak üstünde yürür",
    );
  }
  {
    const fp = x1 - H1 * 1.4;
    const [ax, ay] = P(fp, g1 + 4 * s);
    callout(
      f,
      ax,
      ay,
      "Laetoli ayak izleri",
      phase(t, b1 + 0.9, b1 + 1.6) * out1,
      -1,
      "~3,7 milyon yıl, volkan külünde",
    );
  }
  const out2 = 1 - phase(t, b2 - 0.3, b2 + 0.1);
  {
    const [ax, ay] = P(standX, S.ground - H2 * 0.95);
    callout(
      f,
      ax,
      ay,
      "Homo erectus",
      phase(t, b1 + 4.2, b1 + 4.9) * out2,
      -1,
      "uzun bacaklar, büyük beyin",
    );
  }
  {
    const [ax, ay] = P(fireX - H2 * 0.3, S.ground - H2 * 0.3);
    callout(
      f,
      ax,
      ay,
      "Taş alet ve ateş",
      phase(t, b1 + 4.8, b1 + 5.5) * out2,
      -1,
      "el baltası, ~1,7 milyon yıl",
    );
  }
  outOfAfrica(f, pop(t, b1 + 4.4, 0.7) * out2, phase(t, b1 + 4.8, b1 + 6.2));
}

function acacia(g: Ctx, x: number, y: number, H: number, seed: number) {
  g.strokeStyle = "#4a2440";
  g.fillStyle = "#4a2440";
  g.lineCap = "round";
  g.lineWidth = H * 0.06;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + H * 0.05, y - H * 0.5, x - H * 0.02, y - H * 0.78);
  g.moveTo(x + H * 0.02, y - H * 0.45);
  g.quadraticCurveTo(x + H * 0.25, y - H * 0.6, x + H * 0.35, y - H * 0.8);
  g.stroke();
  const wd = H * (1.1 + hash(seed) * 0.5);
  g.beginPath();
  g.ellipse(x + H * 0.1, y - H * 0.88, wd * 0.5, H * 0.13, 0, 0, TAU);
  g.fill();
  g.fillStyle = "rgba(255,170,120,0.25)";
  g.beginPath();
  g.ellipse(x + H * 0.15, y - H * 0.95, wd * 0.4, H * 0.05, 0, 0, TAU);
  g.fill();
}

/** Kül üstündeki izler: yürüyene yakın olanlar belirgin, gerideki silik. */
function footprints(
  ctx: Ctx,
  from: number,
  to: number,
  y: number,
  stride: number,
  s: number,
  size: number,
) {
  const n = Math.floor((to - from) / stride);
  for (let k = 0; k < n; k++) {
    const x = from + k * stride;
    const a = Math.min(1, 0.25 + (k / Math.max(1, n)) * 0.75);
    const dy = (k % 2 ? 3 : -3) * s;
    ctx.fillStyle = `rgba(70,40,40,${0.55 * a})`;
    ctx.beginPath();
    ctx.ellipse(x, y + dy, 7 * s * size, 2.6 * s * size, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,220,190,${0.35 * a})`;
    ctx.beginPath();
    ctx.ellipse(x - 1 * s, y + dy - 1.4 * s, 6 * s * size, 1.4 * s * size, 0, 0, TAU);
    ctx.fill();
  }
}

/**
 * Yandan yürüyen figür: gün batımına karşı siluet, güneş yanında ince ışık kenarı. `p` yürüyüş
 * evresi; `still` verilirse ayakta durur.
 */
function walker(ctx: Ctx, x: number, y: number, H: number, p: number, B: Body, still = 0) {
  const draw = (ox: number, oy: number, dark: string, far: string) => {
    const bob = still ? 0 : Math.abs(Math.cos(p)) * 0.012 * H;
    const hipX = x + ox;
    const hipY = y + oy - (B.thigh + B.shin) * H * 0.97 - bob;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const leg = (ph: number, color: string) => {
      const a = still ? (ph > 1 ? -0.08 : 0.08) : 0.42 * Math.sin(ph);
      const bend = still ? 0 : 0.55 * Math.max(0, Math.sin(ph + 1.9));
      const kx = hipX + Math.sin(a) * B.thigh * H;
      const ky = hipY + Math.cos(a) * B.thigh * H;
      const b = a - bend;
      const fx = kx + Math.sin(b) * B.shin * H;
      const fy = ky + Math.cos(b) * B.shin * H;
      ctx.strokeStyle = color;
      ctx.lineWidth = B.girth * H * 0.75;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.lineTo(fx + 0.07 * H, fy + 0.005 * H);
      ctx.stroke();
    };
    const shX = hipX + Math.sin(B.lean) * B.torso * H;
    const shY = hipY - Math.cos(B.lean) * B.torso * H;
    const arm = (ph: number, color: string) => {
      const up = still ? 0.06 : -0.38 * Math.sin(ph);
      const fore = up + 0.3;
      const ex = shX + Math.sin(up) * B.upper * H;
      const ey = shY + Math.cos(up) * B.upper * H;
      ctx.strokeStyle = color;
      ctx.lineWidth = B.girth * H * 0.55;
      ctx.beginPath();
      ctx.moveTo(shX, shY);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex + Math.sin(fore) * B.fore * H, ey + Math.cos(fore) * B.fore * H);
      ctx.stroke();
    };
    leg(p + Math.PI, far);
    arm(p, far);
    ctx.strokeStyle = dark;
    ctx.lineWidth = B.girth * H * 1.45;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shX, shY);
    ctx.stroke();
    // Baş: beyin kutusu, öne çıkık yüz, kaş çıkıntısı.
    const hr = B.head * H;
    const hx = shX + Math.sin(B.lean * 1.5) * hr * 1.2;
    const hy = shY - hr * 1.15;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr, hr * 0.95, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.75, hy + hr * 0.35, hr * B.muzzle, hr * 0.42, 0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(shX - hr * 0.2, shY);
    ctx.lineTo(hx, hy + hr * 0.6);
    ctx.lineWidth = hr * 0.8;
    ctx.strokeStyle = dark;
    ctx.stroke();
    leg(p, dark);
    arm(p + Math.PI, dark);
  };
  draw(H * 0.012, -H * 0.004, "rgba(255,170,110,0.9)", "rgba(255,150,100,0.5)");
  draw(0, 0, "#2a1428", "#3a1e34");
}

/** Oturmuş, taş yontan erectus: bir elde çekirdek taş, öteki elde çekiç taşı; her vuruşta yongalar. */
function knapper(ctx: Ctx, x: number, y: number, H: number, t: number, s: number) {
  const B = ERE;
  const dark = "#24122a";
  const hipY = y - 0.1 * H;
  const shX = x + 0.1 * H;
  const shY = hipY - B.torso * H * 0.95;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ateş ışığı: ateşe bakan yüzde turuncu kenar.
  for (const [ox, color] of [
    [H * 0.012, "rgba(255,150,70,0.85)"],
    [0, dark],
  ] as [number, string][]) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = B.girth * H * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + ox, hipY);
    ctx.lineTo(x + 0.26 * H + ox, hipY - 0.06 * H);
    ctx.lineTo(x + 0.3 * H + ox, y);
    ctx.stroke();
    ctx.lineWidth = B.girth * H * 1.5;
    ctx.beginPath();
    ctx.moveTo(x + ox, hipY);
    ctx.lineTo(shX + ox, shY);
    ctx.stroke();
    const hr = B.head * H;
    ctx.beginPath();
    ctx.ellipse(shX + hr * 0.7 + ox, shY - hr * 0.9, hr, hr * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(shX + hr * 1.4 + ox, shY - hr * 0.55, hr * 0.35, hr * 0.35, 0, 0, TAU);
    ctx.fill();
  }
  // Çekirdek taşı tutan kol.
  const cx = x + 0.34 * H;
  const cy = hipY - 0.12 * H;
  ctx.strokeStyle = dark;
  ctx.lineWidth = B.girth * H * 0.55;
  ctx.beginPath();
  ctx.moveTo(shX, shY + 0.02 * H);
  ctx.lineTo(x + 0.2 * H, hipY - 0.08 * H);
  ctx.lineTo(cx - 0.02 * H, cy);
  ctx.stroke();
  ctx.fillStyle = "#b8a080";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 0.01 * H, 0.05 * H, 0.03 * H, -0.4, 0, TAU);
  ctx.fill();
  // Çekiç taşını indirip kaldıran kol.
  const cyc = (t * 1.5) % 1;
  const lift = cyc < 0.7 ? ease.inOut(cyc / 0.7) : 1 - ease.in((cyc - 0.7) / 0.3);
  const hx = cx + 0.02 * H;
  const hy = cy - 0.05 * H - lift * 0.16 * H;
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(shX + 0.12 * H, shY + 0.06 * H - lift * 0.08 * H);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = "#8a7a6a";
  ctx.beginPath();
  ctx.arc(hx, hy, 0.028 * H, 0, TAU);
  ctx.fill();
  // Son vuruştan fırlayan yongalar ve kıvılcımlar.
  const since = cyc < 0.7 ? cyc / 1.5 + 0.2 : (cyc - 1) / 1.5 + 0.2;
  const hit = (t * 1.5 - (cyc < 0.7 ? 0 : 1)) | 0;
  if (since < 0.5) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * (0.2 + hash(hit * 7 + i) * 0.6);
      const v = (60 + hash(hit + i * 3) * 80) * s;
      const px = cx + Math.cos(a) * v * since;
      const py = cy + Math.sin(a) * v * since + 300 * s * since * since;
      ctx.fillStyle = i % 2 ? "rgba(255,220,150,0.9)" : "rgba(200,180,150,0.9)";
      ctx.beginPath();
      ctx.arc(px, py, (i % 2 ? 1.2 : 2) * s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Ateş: titreşen alev katmanları, geniş turuncu ışık ve yükselen kıvılcımlar. */
function firelight(ctx: Ctx, x: number, y: number, H: number, t: number, k: number) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  drawGlow(ctx, x, y - H * 0.12, H * 2.2 * k, hex("ff8a3c"), 0.35 * (0.9 + 0.1 * Math.sin(t * 9)));
  drawGlow(ctx, x, y - H * 0.1, H * 0.7 * k, hex("ffc070"), 0.5);
  ctx.restore();
  ctx.save();
  // Odunlar.
  ctx.strokeStyle = "#3a2018";
  ctx.lineCap = "round";
  ctx.lineWidth = H * 0.045;
  ctx.beginPath();
  ctx.moveTo(x - H * 0.18, y);
  ctx.lineTo(x + H * 0.14, y - H * 0.05);
  ctx.moveTo(x + H * 0.18, y);
  ctx.lineTo(x - H * 0.12, y - H * 0.06);
  ctx.stroke();
  const flames: [string, number, number][] = [
    ["#e8452c", 0.38, 0.2],
    ["#ff8a2c", 0.3, 0.15],
    ["#ffd35a", 0.2, 0.09],
  ];
  flames.forEach(([color, fh, fw], i) => {
    for (let j = -1; j <= 1; j++) {
      const flick = Math.sin(t * (9 + i * 2) + j * 2.3) * 0.12 + Math.sin(t * 5.3 + j) * 0.08;
      const hh = H * fh * k * (1 - Math.abs(j) * 0.35) * (1 + flick);
      const ww = H * fw * (1 - Math.abs(j) * 0.3);
      const bx = x + j * ww * 0.7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx - ww * 0.5, y - H * 0.02);
      ctx.quadraticCurveTo(
        bx - ww * 0.6,
        y - hh * 0.5,
        bx + Math.sin(t * 7 + j) * ww * 0.25,
        y - hh,
      );
      ctx.quadraticCurveTo(bx + ww * 0.6, y - hh * 0.5, bx + ww * 0.5, y - H * 0.02);
      ctx.fill();
    }
  });
  for (let i = 0; i < 18; i++) {
    const life = (hash(i * 3.7) + t * (0.5 + hash(i) * 0.4)) % 1;
    const px = x + (hash(i * 1.9) - 0.5) * H * 0.3 + Math.sin(t * 3 + i) * H * 0.05 * life;
    const py = y - H * 0.2 - life * H * 0.9;
    ctx.fillStyle = `rgba(255,${180 + Math.round(60 * (1 - life))},90,${(1 - life) * k})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.8, H * 0.008 * (1 - life)), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Afrika'dan çıkış: yuvarlak harita ve Doğu Afrika'dan Kafkasya'ya, Java'ya uzanan yol. */
function outOfAfrica(f: SceneFrame, k: number, draw: number) {
  if (k <= 0.01) return;
  const { ctx, w, h, t, s } = f;
  const wide = w > h;
  const r = wide ? h * 0.15 : w * 0.2;
  const cx = wide ? w * 0.2 : w * 0.5;
  const cy = wide ? h * 0.32 : h * 0.26;
  const lon0 = 55;
  const lat0 = 12;
  const sc = (r * 1.9) / 150;
  const M = (lon: number, lat: number): Pt => [cx + (lon - lon0) * sc, cy - (lat - lat0) * sc];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
  drawGlow(ctx, cx, cy, r * 1.5, hex("3a7ab0"), 0.3);
  ctx.fillStyle = "#123a52";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const land = (pts: Pt[]) => {
    ctx.beginPath();
    curve(
      ctx,
      pts.map(([lo, la]) => M(lo, la)),
      true,
    );
    ctx.fill();
  };
  ctx.fillStyle = "#d9b27c";
  land([
    [-17, 21],
    [-10, 31],
    [-5, 36],
    [10, 37],
    [20, 32],
    [32, 31],
    [35, 27],
    [43, 12],
    [51, 11],
    [41, -2],
    [40, -15],
    [34, -25],
    [27, -34],
    [18, -34],
    [12, -18],
    [9, -2],
    [8, 4],
    [-8, 5],
    [-17, 14],
  ]);
  ctx.fillStyle = "#c9a06c";
  land([
    [35, 31],
    [48, 30],
    [57, 24],
    [58, 19],
    [52, 14],
    [44, 13],
    [39, 21],
  ]);
  land([
    [-10, 37],
    [0, 44],
    [12, 45],
    [22, 40],
    [28, 41],
    [36, 37],
    [44, 40],
    [52, 42],
    [62, 38],
    [68, 25],
    [73, 20],
    [78, 8],
    [82, 17],
    [90, 22],
    [98, 16],
    [104, 2],
    [108, 12],
    [118, 24],
    [125, 36],
    [132, 44],
    [140, 55],
    [100, 70],
    [40, 68],
    [10, 58],
    [-8, 50],
  ]);
  land([
    [104, -6],
    [114, -7],
    [116, -9],
    [106, -8],
  ]);
  land([
    [95, 5],
    [104, -2],
    [106, -5],
    [99, 2],
  ]);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,250,240,0.8)";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  // Yol: kesikli, akan çizgiler.
  const routes: Pt[][] = [
    [
      [36, 0],
      [37, 18],
      [35, 32],
      [40, 38],
      [44, 41],
    ],
    [
      [35, 32],
      [50, 30],
      [65, 26],
      [78, 20],
      [92, 20],
      [100, 8],
      [110, -7],
    ],
  ];
  ctx.strokeStyle = "#ffd27a";
  ctx.lineWidth = Math.max(1.4, 2.4 * s);
  ctx.setLineDash([4 * s, 4 * s]);
  ctx.lineDashOffset = -t * 16 * s;
  routes.forEach((rt, i) => {
    const kk = Math.min(1, Math.max(0, draw * 2 - i));
    if (kk <= 0) return;
    const pts = rt.map(([lo, la]) => M(lo, la));
    const n = Math.max(2, Math.ceil(pts.length * kk));
    ctx.beginPath();
    curve(ctx, pts.slice(0, n));
    ctx.stroke();
  });
  ctx.setLineDash([]);
  const place = (lo: number, la: number, label: string, at: number, side: 1 | -1) => {
    const a = Math.min(1, Math.max(0, (draw - at) * 4));
    if (a <= 0) return;
    const [px, py] = M(lo, la);
    ctx.fillStyle = `rgba(255,210,122,${a})`;
    ctx.beginPath();
    ctx.arc(px, py, 3.2 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,240,${a})`;
    ctx.font = `600 ${Math.round(Math.max(9.5, 10.5 * s))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = side > 0 ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + side * 6 * s, py);
  };
  place(36, 0, "Doğu Afrika", 0, -1);
  place(44, 41, "Dmanisi 1,8", 0.45, 1);
  place(110, -7, "Java", 0.95, -1);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = "rgba(255,250,240,0.98)";
  ctx.font = `600 ${Math.round(Math.max(12, 14 * s))}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6 * s;
  ctx.fillText("Afrika’dan çıkış", cx, cy + r + 18 * s);
  ctx.fillStyle = "rgba(220,212,200,0.95)";
  ctx.font = `400 ${Math.round(Math.max(10, 11.5 * s))}px Outfit, system-ui, sans-serif`;
  ctx.fillText("~1,9 milyon yıl önce", cx, cy + r + 35 * s);
  ctx.restore();
}
