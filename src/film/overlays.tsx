import type { ReactNode } from "react";
import { Clock, Headphones, Layers, LayoutGrid, Play, RotateCcw } from "lucide-react";
import { CHAPTERS, CLOSING_SOURCES } from "@/film/chapters";
import { SPANS, TOTAL, cosmicCalendar, formatClock, locate } from "@/film/timeline";

const MINUTES = Math.round(TOTAL / 60);

/** Açılış ekranı: sahnenin ilk karesinin üstünde başlık ve başlatma düğmeleri. */
export function Intro({
  resumeAt,
  entry,
  onStart,
  onChapters,
}: {
  resumeAt: number | null;
  entry: number | null;
  onStart: (time: number) => void;
  onChapters: () => void;
}) {
  const resumeChapter = resumeAt !== null ? CHAPTERS[locate(resumeAt).index] : null;
  const entryChapter = entry !== null ? CHAPTERS[entry] : null;

  return (
    <div className="intro-shade fade-in absolute inset-0 z-40 flex flex-col overflow-y-auto">
      <div className="mt-auto flex flex-col items-center px-6 pt-10 pb-12 text-center sm:my-auto sm:pb-10">
        <p className="text-xs tracking-cosmic text-primary uppercase">Bilimsel bir kısa film</p>
        <h1 className="mt-4 font-display text-5xl leading-none font-medium tracking-widest uppercase film-shadow sm:text-6xl sm:tracking-cosmic md:text-7xl xl:text-8xl">
          Kozmogenez
        </h1>
        <p className="mt-5 max-w-md text-base text-balance text-fg/85 film-shadow sm:text-lg">
          Büyük Patlama’dan Homo sapiens’e: 13,8 milyar yıllık hikâye, {CHAPTERS.length} bölümde.
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" /> ~{MINUTES} dakika
          </li>
          <li className="flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden="true" /> {CHAPTERS.length} bölüm
          </li>
          <li className="flex items-center gap-1.5">
            <Headphones className="size-4" aria-hidden="true" /> Sesle daha iyi
          </li>
        </ul>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          {resumeAt !== null && resumeChapter ? (
            <PrimaryButton onClick={() => onStart(resumeAt)}>
              <Play className="size-4 fill-current" /> Kaldığın yerden devam et
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => onStart(entry !== null ? SPANS[entry].start : 0)}>
              <Play className="size-4 fill-current" />{" "}
              {entryChapter ? `Başlat: ${entryChapter.title}` : "Filmi başlat"}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={onChapters}>
            <LayoutGrid className="size-4" /> Bölümler
          </SecondaryButton>
        </div>
        {resumeAt !== null && resumeChapter ? (
          <p className="mt-4 text-sm text-muted">
            {resumeChapter.title} · {formatClock(resumeAt)} ·{" "}
            <button
              type="button"
              onClick={() => onStart(0)}
              className="text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg"
            >
              Baştan başla
            </button>
          </p>
        ) : null}
        <p className="mt-10 hidden text-xs text-muted/80 pointer-fine:block">
          Boşluk: oynat / duraklat · ← →: bölümler · M: ses · F: tam ekran
        </p>
      </div>
    </div>
  );
}

const MILESTONES: [number, string][] = [
  [13.8e9, "Büyük Patlama"],
  [4.57e9, "Güneş doğar"],
  [4.2e9, "Son evrensel ortak ata"],
  [2.4e9, "Büyük Oksitlenme"],
  [538e6, "Kambriyen"],
  [66e6, "Dinozorların sonu"],
  [3e5, "Homo sapiens"],
  [5.2e3, "Yazının icadı"],
];

/** Kapanış: kozmik takvimin özeti, bir alıntı ve bütün kaynaklar. */
export function Outro({ onReplay, onChapters }: { onReplay: () => void; onChapters: () => void }) {
  const sources = [...new Set([...CHAPTERS.flatMap((c) => c.sources), ...CLOSING_SOURCES])];
  return (
    <div className="fade-in absolute inset-0 z-40 overflow-y-auto bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
        <p className="nums text-xs tracking-cosmic text-primary uppercase">
          Kozmik takvimde gece yarısı
        </p>
        <h2 className="mt-4 font-display text-5xl leading-none font-medium sm:text-7xl">
          Ve şimdi, sen.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-fg/85 sm:text-lg">
          Evrenin bütün tarihini tek bir yıla sığdırsaydık, insanlık yılbaşına yaklaşık on bir
          dakika kala sahneye çıkardı. Yazıyla kaydedilmiş bütün tarih, son on iki saniyeye sığardı.
        </p>

        <ol className="mt-8 grid grid-cols-1 gap-x-8 border-t border-fg/10 sm:grid-cols-2">
          {MILESTONES.map(([ya, label]) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-fg/10 py-2.5"
            >
              <span className="text-sm text-fg/90 sm:text-base">{label}</span>
              <span className="nums shrink-0 text-sm text-primary">{cosmicCalendar(ya).label}</span>
            </li>
          ))}
        </ol>

        <blockquote className="mt-10 border-l-2 border-primary/60 pl-5">
          <p className="font-display text-2xl leading-snug italic sm:text-3xl">
            “Biz, evrenin kendini tanımasının bir yoluyuz.”
          </p>
          <footer className="mt-2 text-sm text-muted">Carl Sagan, Cosmos (1980)</footer>
        </blockquote>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <PrimaryButton onClick={onReplay}>
            <RotateCcw className="size-4" /> Baştan izle
          </PrimaryButton>
          <SecondaryButton onClick={onChapters}>
            <LayoutGrid className="size-4" /> Bölümler
          </SecondaryButton>
        </div>

        <details className="group mt-10 border-t border-fg/10 pt-5">
          <summary className="cursor-pointer text-sm text-muted transition hover:text-fg">
            Kaynaklar ({sources.length})
          </summary>
          <ul className="mt-3 columns-1 gap-8 space-y-1.5 text-sm text-muted sm:columns-2">
            {sources.map((source) => (
              <li key={source} className="break-inside-avoid">
                {source}
              </li>
            ))}
          </ul>
        </details>
        <p className="mt-6 text-xs leading-relaxed text-muted/80">
          Tarihler yaklaşıktır; yeni fosiller ve ölçümlerle güncellenir. Görüntüler yapay zekâ ile
          üretilmiş canlandırmalardır. Evrim bir merdiven değil, dallanan bir ağaçtır.
        </p>
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-medium text-ink shadow-lg shadow-primary/25 transition duration-200 hover:brightness-110 active:scale-98"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-fg/20 bg-bg/40 px-7 text-fg backdrop-blur-md transition duration-200 hover:border-fg/40 hover:bg-fg/10 active:scale-98"
    >
      {children}
    </button>
  );
}
