import { useEffect, useRef } from "react";
import { CHAPTERS } from "@/film/chapters";
import type { FilmEngine } from "@/film/engine";
import {
  CARD,
  SPANS,
  cosmicCalendar,
  formatYearsAgo,
  pad2,
  smoothstep,
  yearsAgoAt,
} from "@/film/timeline";
import { cn } from "@/lib/cn";

const MONTH_TICKS = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334].map(
  (d) => (d / 365) * 100,
);

/** Sağ üstte: tasvir edilen anın kaç yıl önce olduğu ve Sagan’ın kozmik takvimindeki karşılığı. */
export function CosmicClock({ engine, className }: { engine: FilmEngine; className?: string }) {
  const yearsRef = useRef<HTMLParagraphElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastYears = "";
    let lastDate = "";
    return engine.onFrame((time) => {
      const ya = yearsAgoAt(time);
      const years = formatYearsAgo(ya);
      const cal = cosmicCalendar(ya);
      if (years !== lastYears && yearsRef.current) {
        yearsRef.current.textContent = years;
        lastYears = years;
      }
      if (cal.label !== lastDate && dateRef.current) {
        dateRef.current.textContent = cal.label;
        lastDate = cal.label;
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${cal.fraction.toFixed(4)})`;
      if (markRef.current) markRef.current.style.left = `${(cal.fraction * 100).toFixed(3)}%`;
    });
  }, [engine]);

  return (
    <div className={cn("text-right", className)}>
      <p className="hud-extra hidden text-xs tracking-widest text-muted uppercase sm:block">
        Kozmik takvim
      </p>
      <p
        ref={yearsRef}
        className="font-display text-lg leading-tight font-medium film-shadow sm:mt-1 sm:text-3xl"
      >
        {formatYearsAgo(CHAPTERS[0].beats[0].ya)}
      </p>
      <p ref={dateRef} className="nums mt-0.5 text-xs text-primary film-shadow sm:text-sm">
        1 Ocak, 00:00
      </p>
      <div className="hud-extra mt-2.5 ml-auto hidden w-48 sm:block" aria-hidden="true">
        <div className="relative h-1 rounded-full bg-fg/15">
          <div
            ref={fillRef}
            className="absolute inset-0 origin-left rounded-full bg-primary/60"
            style={{ transform: "scaleX(0)" }}
          />
          {MONTH_TICKS.map((left) => (
            <span
              key={left}
              className="absolute top-0 h-1 w-px bg-bg/70"
              style={{ left: `${left}%` }}
            />
          ))}
          <div
            ref={markRef}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg shadow-primary/40"
            style={{ left: "0%" }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>Oca</span>
          <span>Ara</span>
        </div>
      </div>
    </div>
  );
}

/** Her bölümün başında ortada beliren büyük başlık kartı. */
export function TitleCard({
  engine,
  index,
  active,
}: {
  engine: FilmEngine;
  index: number;
  active: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    return engine.onFrame((time) => {
      const el = cardRef.current;
      if (!el) return;
      let current = 0;
      while (current < SPANS.length - 1 && time >= SPANS[current].end) current++;
      const local = time - SPANS[current].start;
      const inT = smoothstep(local / 0.8);
      const outT = smoothstep((local - (CARD - 0.9)) / 0.9);
      const opacity = activeRef.current ? inT * (1 - outT) : 0;
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translateY(${((1 - inT) * 10 - outT * 8).toFixed(2)}px) scale(${(1.03 - inT * 0.03).toFixed(4)})`;
      el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
    });
  }, [engine]);

  const chapter = CHAPTERS[index];
  return (
    <div className="stage-frame pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center px-6">
      <div
        ref={cardRef}
        className="relative text-center"
        style={{ opacity: 0, visibility: "hidden" }}
        aria-hidden="true"
      >
        <div className="card-halo pointer-events-none absolute -inset-x-24 -inset-y-20 -z-10" />
        <p className="nums text-xs font-medium tracking-cosmic text-primary uppercase film-shadow sm:text-sm">
          Bölüm {pad2(index + 1)}
        </p>
        <p className="mt-3 font-display text-5xl leading-none font-medium text-balance film-shadow sm:text-7xl lg:text-8xl">
          {chapter.title}
        </p>
        <p className="mt-4 text-sm text-fg/90 film-shadow sm:text-base">{chapter.when}</p>
      </div>
    </div>
  );
}

/** Altyazı bloğu: bölüm künyesi, başlık ve o anki anlatı cümlesi. */
export function Captions({
  index,
  beat,
  hidden,
}: {
  index: number;
  beat: number;
  hidden: boolean;
}) {
  const chapter = CHAPTERS[index];
  const line = chapter.beats[beat] ?? chapter.beats[0];
  return (
    <div
      className={cn(
        "pointer-events-none max-w-3xl transition-all duration-700 ease-film",
        hidden ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <p className="nums flex items-center gap-3 text-xs tracking-widest text-primary uppercase film-shadow">
        <span>Bölüm {pad2(index + 1)}</span>
        <span className="h-px w-6 bg-primary/60" aria-hidden="true" />
        <span className="tracking-normal text-fg/70 normal-case">{chapter.subtitle}</span>
      </p>
      <h2 className="mt-2 font-display text-3xl leading-none font-medium film-shadow sm:text-5xl">
        {chapter.title}
      </h2>
      <p
        key={`${index}-${beat}`}
        className="rise-in mt-3 max-w-2xl text-base leading-relaxed text-fg film-shadow sm:mt-4 sm:text-xl sm:leading-relaxed"
      >
        {line.text}
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {chapter.beats.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === beat ? "w-6 bg-primary" : i < beat ? "w-1.5 bg-fg/60" : "w-1.5 bg-fg/25",
            )}
          />
        ))}
      </div>
    </div>
  );
}
