import {
  board,
  callout,
  dot,
  fill,
  glow,
  lerp,
  span,
  text,
  type SceneFrame,
} from "@/film/scenes/kit";

type Lineage = {
  name: string;
  /** Milyon yıl önce: dalın başladığı ve bittiği an (0 = bugün). */
  from: number;
  to: number;
  /** Yatay konum (0–1) ve dalın çıktığı ata. */
  x: number;
  parent?: string;
  extinct?: boolean;
  /** Etiket dalın hangi yanında dursun. */
  side?: 1 | -1;
  color: string;
};

const TREE: Lineage[] = [
  { name: "ortak ata", from: 7, to: 6.5, x: 0.45, color: "rgb(243,238,226)" },
  { name: "Şempanze", from: 6.5, to: 0, x: 0.1, parent: "ortak ata", color: "rgb(160,160,170)" },
  {
    name: "Australopithecus",
    from: 4.2,
    to: 2,
    x: 0.5,
    parent: "ortak ata",
    extinct: true,
    color: "rgb(240,200,120)",
  },
  {
    name: "Paranthropus",
    from: 2.7,
    to: 1.2,
    x: 0.34,
    parent: "Australopithecus",
    extinct: true,
    side: -1,
    color: "rgb(220,150,110)",
  },
  {
    name: "Homo erectus",
    from: 1.9,
    to: 0.11,
    x: 0.68,
    parent: "Australopithecus",
    extinct: true,
    color: "rgb(150,200,240)",
  },
  {
    name: "Neandertal",
    from: 0.4,
    to: 0.04,
    x: 0.52,
    parent: "Homo erectus",
    extinct: true,
    side: -1,
    color: "rgb(190,160,230)",
  },
  {
    name: "Homo sapiens",
    from: 0.3,
    to: 0,
    x: 0.86,
    parent: "Homo erectus",
    color: "rgb(255,210,120)",
  },
];

/** Zaman ekseni doğrusal değil: son yüz binlerce yıl okunabilsin diye karekök ölçeği. */
const scale = (my: number) => Math.sqrt(my / 7);

/**
 * İnsana giden dallar: 7 milyon yıllık, dallanan ve çoğu kolu tükenmiş bir soy ağacı.
 * Ağaç, filmin saatiyle birlikte bugüne doğru büyür.
 */
export function human(f: SceneFrame) {
  const { ctx, t, beats, s, dur } = f;
  const [b0, b1, b2] = beats;
  fill(f, "rgb(6,6,10)");
  const box = board(f);
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const X = (x: number) => box.x0 + bw * (0.12 + x * 0.82);
  const Y = (my: number) => box.y0 + bh * scale(my);
  glow(ctx, X(0.5), Y(3), bh * 0.7, "rgba(200,150,90,0.08)");

  // Ekranın “şimdi”si: 7 milyon yıldan bugüne doğru ilerler.
  const now = Math.max(0, lerp(7, 0, span(t, b0 - 0.8, dur - 1.2) ** 0.6));

  // Zaman ekseni.
  ctx.strokeStyle = "rgba(243,238,226,0.2)";
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.moveTo(box.x0, Y(7));
  ctx.lineTo(box.x0, Y(0));
  ctx.stroke();
  for (const [my, label] of [
    [7, "7 milyon"],
    [4, "4"],
    [2, "2"],
    [1, "1"],
    [0.3, "300 bin"],
    [0, "bugün"],
  ] as [number, string][]) {
    ctx.beginPath();
    ctx.moveTo(box.x0, Y(my));
    ctx.lineTo(box.x0 + 6 * s, Y(my));
    ctx.stroke();
    text(f, box.x0 + 10 * s, Y(my), label, 0.7, {
      align: "left",
      size: 10,
      color: "rgba(168,161,148,1)",
    });
  }
  // Ağaç kökten yukarı büyür: altta 7 milyon yıl önce, üstte bugün.

  const end = (l: Lineage) => Math.max(l.to, now);
  for (const l of TREE) {
    if (now > l.from) continue;
    const parent = TREE.find((p) => p.name === l.parent);
    ctx.lineCap = "round";
    ctx.strokeStyle = l.color;
    ctx.lineWidth = Math.max(1.5, 3 * s);
    if (parent) {
      ctx.beginPath();
      ctx.moveTo(X(parent.x), Y(l.from));
      ctx.lineTo(X(l.x), Y(l.from));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(X(l.x), Y(l.from));
    ctx.lineTo(X(l.x), Y(end(l)));
    ctx.stroke();
    const done = now <= l.to;
    if (done && l.extinct) {
      ctx.strokeStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(X(l.x) - 6 * s, Y(l.to));
      ctx.lineTo(X(l.x) + 6 * s, Y(l.to));
      ctx.stroke();
    }
    if (!done) dot(ctx, X(l.x), Y(end(l)), 3.5 * s, l.color);
    if (l.name !== "ortak ata") {
      const ly = Y(Math.max(l.to, now, l.from - (l.from - l.to) * 0.5));
      const side = l.side ?? 1;
      const align = side > 0 ? "left" : "right";
      text(f, X(l.x) + side * 8 * s, ly, l.name, span(7 - now, 7 - l.from, 7 - l.from + 0.25), {
        align,
        size: 13,
        color: l.color,
      });
      if (done && l.extinct)
        text(f, X(l.x) + side * 8 * s, Y(l.to) - 10 * s, "soyu tükendi", 0.8, {
          align,
          size: 9.5,
          color: "rgba(168,161,148,1)",
        });
    }
  }
  dot(ctx, X(0.45), Y(7), 4 * s, "rgb(243,238,226)");

  // Neandertallerden bize gen akışı (melezleşme).
  const flow = span(t, b2 + 2.2, b2 + 3.2);
  if (flow > 0.01) {
    const ne = TREE.find((l) => l.name === "Neandertal")!;
    const sa = TREE.find((l) => l.name === "Homo sapiens")!;
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.strokeStyle = `rgba(190,160,230,${flow})`;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.moveTo(X(ne.x), Y(0.06));
    ctx.lineTo(lerp(X(ne.x), X(sa.x), flow), Y(0.05));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  callout(
    f,
    X(0.45),
    Y(7),
    "Ortak ata",
    span(t, b0 + 0.2, b0 + 1),
    1,
    "şempanzelerle ~7 milyon yıl önce",
  );
  const er = TREE.find((l) => l.name === "Homo erectus")!;
  callout(
    f,
    X(er.x),
    Y(1.5),
    "Afrika’dan çıkış",
    span(t, b1 + 2, b1 + 2.8) * (1 - span(t, b2 + 1, b2 + 1.6)),
    1,
    "~1,9 milyon yıl önce",
  );
  text(f, lerp(X(0.52), X(0.86), 0.5), Y(0.05) - 12 * s, "Melezleşme: DNA’mızın ~%1–2’si", flow, {
    size: 10.5,
    color: "rgba(190,160,230,1)",
  });
  text(f, box.x0, box.y1 + 22 * s, "Zaman ölçeği doğrusal değil", 0.6, {
    align: "left",
    size: 9.5,
    color: "rgba(168,161,148,1)",
  });
}
