import * as Dialog from "@radix-ui/react-dialog";
import { Check, Microscope, Play, X } from "lucide-react";
import { CHAPTERS } from "@/film/chapters";
import { SPANS, formatClock, pad2 } from "@/film/timeline";
import { cn } from "@/lib/cn";

const SHORTCUTS: [string, string][] = [
  ["Boşluk", "Oynat / duraklat"],
  ["← →", "Önceki / sonraki bölüm"],
  ["Shift + ← →", "5 sn geri / ileri"],
  ["M", "Sesi aç / kapat"],
  ["N", "Nasıl biliyoruz?"],
  ["B", "Bölümler"],
  ["F", "Tam ekran"],
];

function CloseButton({ label }: { label: string }) {
  return (
    <Dialog.Close
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-fg/15 bg-bg/40 text-fg transition hover:border-fg/35 hover:bg-fg/10"
    >
      <X className="size-4" />
    </Dialog.Close>
  );
}

/** Bütün bölümler, küçük resim ve izlenme durumuyla. */
export function ChapterIndex({
  open,
  onOpenChange,
  current,
  time,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: number;
  time: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-50 bg-bg/85 backdrop-blur-xl" />
        <Dialog.Content className="pop fixed inset-0 z-50 overflow-y-auto outline-none">
          <div className="mx-auto max-w-6xl px-4 pt-5 pb-10 sm:px-8 sm:pt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-display text-4xl leading-none font-medium sm:text-5xl">
                  Bölümler
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted">
                  13,8 milyar yıl, {CHAPTERS.length} bölüm, yaklaşık{" "}
                  {Math.round(SPANS[SPANS.length - 1].end / 60)} dakika.
                </Dialog.Description>
              </div>
              <CloseButton label="Bölümleri kapat" />
            </div>

            <ol className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
              {CHAPTERS.map((chapter, i) => {
                const span = SPANS[i];
                const watched = Math.min(
                  1,
                  Math.max(0, (time - span.start) / (span.end - span.start)),
                );
                const active = i === current;
                return (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "group block w-full overflow-hidden rounded-2xl border bg-surface/70 text-left transition duration-200",
                        active ? "border-primary/70" : "border-fg/10 hover:border-fg/30",
                      )}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={`/cosmos/thumbs/${chapter.shots[0].name}.jpg`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
                        <span className="nums absolute top-2 left-2 rounded-full bg-bg/70 px-2 py-0.5 text-xs text-fg backdrop-blur-md">
                          {pad2(i + 1)}
                        </span>
                        {active ? (
                          <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-ink">
                            Şu an
                          </span>
                        ) : watched >= 1 ? (
                          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-bg/70 text-primary backdrop-blur-md">
                            <Check className="size-3.5" aria-label="İzlendi" />
                          </span>
                        ) : null}
                        <span className="absolute inset-0 grid place-items-center opacity-0 transition duration-200 group-hover:opacity-100">
                          <span className="grid size-11 place-items-center rounded-full bg-primary text-ink">
                            <Play className="size-4 translate-x-px fill-current" />
                          </span>
                        </span>
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-fg/15">
                          <span
                            className="block h-full origin-left bg-primary"
                            style={{ transform: `scaleX(${watched})` }}
                          />
                        </span>
                      </div>
                      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <p className="text-sm leading-snug font-medium sm:text-base">
                          {chapter.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{chapter.when}</p>
                        <p className="nums mt-1 hidden text-xs text-muted/80 sm:block">
                          {formatClock(span.start)} – {formatClock(span.end)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 hidden border-t border-fg/10 pt-6 pointer-fine:md:block">
              <p className="text-xs tracking-widest text-muted uppercase">Klavye kısayolları</p>
              <dl className="mt-3 grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
                {SHORTCUTS.map(([key, what]) => (
                  <div key={key} className="flex items-center gap-2">
                    <dt className="nums rounded-md border border-fg/15 bg-surface px-1.5 py-0.5 text-xs text-fg">
                      {key}
                    </dt>
                    <dd className="text-muted">{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Bölümün arka planı: öne çıkan bilgiler, kanıtlar ve kaynaklar. */
export function InfoSheet({
  open,
  onOpenChange,
  index,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
}) {
  const chapter = CHAPTERS[index];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-50 bg-bg/50 md:bg-bg/20" />
        <Dialog.Content className="sheet info-sheet fixed z-50 flex flex-col border-fg/10 bg-surface/95 shadow-2xl shadow-bg backdrop-blur-xl outline-none">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
            <div>
              <p className="nums text-xs tracking-widest text-primary uppercase">
                Bölüm {pad2(index + 1)} · {chapter.when}
              </p>
              <Dialog.Title className="mt-2 font-display text-3xl leading-none font-medium sm:text-4xl">
                {chapter.title}
              </Dialog.Title>
            </div>
            <CloseButton label="Paneli kapat" />
          </div>

          <div className="mt-5 flex-1 overflow-y-auto px-5 pb-7 sm:px-7">
            <Dialog.Description className="sr-only">
              Bu bölümle ilgili bilgiler, kanıtlar ve kaynaklar.
            </Dialog.Description>
            <h3 className="text-xs tracking-widest text-muted uppercase">Öne çıkanlar</h3>
            <ul className="mt-3 space-y-3">
              {chapter.facts.map((fact) => (
                <li
                  key={fact}
                  className="flex gap-3 text-sm leading-relaxed text-fg/90 sm:text-base"
                >
                  <span
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-primary">
                <Microscope className="size-4" aria-hidden="true" />
                Nasıl biliyoruz?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fg/90 sm:text-base">
                {chapter.evidence}
              </p>
            </div>

            <h3 className="mt-6 text-xs tracking-widest text-muted uppercase">Kaynaklar</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {chapter.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
