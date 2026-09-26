import { useEffect, useRef, useState } from "react";
import { BookOpen, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import {
  CHAPTERS,
  TOTAL,
  beatIndex,
  chapterStart,
  formatClock,
  locate,
  type Chapter,
} from "@/cosmos/chapters";
import { drawFrame } from "@/cosmos/render";
import { preloadPlates } from "@/cosmos/plates";
import { bindVideo, clipSlots } from "@/cosmos/clips";

const SPEEDS = [1, 1.5, 2];

type Snap = {
  index: number;
  beat: number;
  playing: boolean;
  speed: number;
  ended: boolean;
  reduced: boolean;
  notes: boolean;
};

type Engine = Snap & { time: number };

function initialSnap(): Snap {
  return { index: 0, beat: 0, playing: true, speed: 1, ended: false, reduced: false, notes: false };
}

export function Film() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine>({ time: 0, ...initialSnap() });
  const [snap, setSnap] = useState<Snap>(initialSnap);

  useEffect(() => {
    preloadPlates();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      engine.current.playing = false;
      engine.current.reduced = true;
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastIndex = -1;
    let lastBeat = -1;

    const paintUi = (force: boolean) => {
      const e = engine.current;
      const loc = locate(e.time);
      const beat = beatIndex(CHAPTERS[loc.index].beats, loc.p);
      const ratio = TOTAL === 0 ? 0 : e.time / TOTAL;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${ratio})`;
      if (clockRef.current) clockRef.current.textContent = formatClock(e.time);
      if (trackRef.current) {
        trackRef.current.setAttribute("aria-valuenow", String(Math.round(ratio * 1000)));
        trackRef.current.setAttribute("aria-valuetext", CHAPTERS[loc.index].title);
      }
      acc += 1;
      const changed = loc.index !== lastIndex || beat !== lastBeat || force;
      if (changed || acc > 8) {
        acc = 0;
        lastIndex = loc.index;
        lastBeat = beat;
        setSnap({
          index: loc.index,
          beat,
          playing: e.playing,
          speed: e.speed,
          ended: e.ended,
          reduced: e.reduced,
          notes: e.notes,
        });
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const e = engine.current;
      if (e.playing && !e.ended) {
        e.time += dt * e.speed;
        if (e.time >= TOTAL) {
          e.time = TOTAL;
          e.ended = true;
          e.playing = false;
        }
      }
      const canvas = canvasRef.current;
      const loc = locate(e.time);
      const chapterNow = CHAPTERS[loc.index];
      const [clipA, clipB] = clipSlots(e.time);
      const rolling = e.playing && !e.ended;
      let cover = 0;
      const shownA = videoARef.current ? bindVideo(videoARef.current, clipA, e.speed, rolling) : 0;
      const shownB = videoBRef.current ? bindVideo(videoBRef.current, clipB, e.speed, rolling) : 0;
      if (clipA && clipB && videoARef.current && videoBRef.current) {
        if (shownA < 0.04 && clipA.opacity > 0.25 && shownB > 0.2) videoBRef.current.style.opacity = "1";
        else if (shownB < 0.04 && clipB.opacity > 0.25 && shownA > 0.2) videoARef.current.style.opacity = "1";
      }
      cover = shownA + shownB;
      if (canvas && cover < 0.92) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const pw = Math.max(1, Math.round(rect.width * dpr));
        const ph = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
        const ctx = canvas.getContext("2d");
        if (ctx && rect.width > 0 && rect.height > 0) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawFrame(ctx, rect.width, rect.height, chapterNow.id, loc.p);
        }
      }
      paintUi(false);
      raf = requestAnimationFrame(frame);
    };

    paintUi(true);
    raf = requestAnimationFrame(frame);

    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, a, input, textarea, summary")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const row = chipRef.current;
    const el = row?.querySelector<HTMLElement>(`[data-index="${snap.index}"]`);
    if (!row || !el) return;
    row.scrollTo({
      left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2,
      behavior: engine.current.reduced ? "auto" : "smooth",
    });
  }, [snap.index]);

  function publish() {
    const e = engine.current;
    const loc = locate(e.time);
    setSnap({
      index: loc.index,
      beat: beatIndex(CHAPTERS[loc.index].beats, loc.p),
      playing: e.playing,
      speed: e.speed,
      ended: e.ended,
      reduced: e.reduced,
      notes: e.notes,
    });
  }

  function togglePlay() {
    const e = engine.current;
    if (e.ended || e.time >= TOTAL - 0.05) {
      e.time = 0;
      e.ended = false;
      e.playing = true;
    } else {
      e.playing = !e.playing;
    }
    publish();
  }

  function goPrev() {
    const e = engine.current;
    const loc = locate(e.time);
    e.time = loc.local > 1.2 ? chapterStart(loc.index) : chapterStart(Math.max(0, loc.index - 1));
    e.ended = false;
    publish();
  }

  function goNext() {
    const e = engine.current;
    const loc = locate(e.time);
    if (loc.index >= CHAPTERS.length - 1) {
      e.time = TOTAL;
      e.ended = true;
      e.playing = false;
    } else {
      e.time = chapterStart(loc.index + 1);
      e.ended = false;
    }
    publish();
  }

  function goTo(index: number) {
    const e = engine.current;
    e.time = chapterStart(index);
    e.ended = false;
    publish();
  }

  function cycleSpeed() {
    const e = engine.current;
    const i = SPEEDS.indexOf(e.speed);
    e.speed = SPEEDS[(i + 1) % SPEEDS.length] ?? 1;
    publish();
  }

  function toggleNotes() {
    engine.current.notes = !engine.current.notes;
    publish();
  }

  function seekClient(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const e = engine.current;
    e.time = ratio * TOTAL;
    e.ended = ratio >= 0.999;
    if (e.ended) e.playing = false;
    publish();
  }

  const chapter: Chapter = CHAPTERS[snap.index] ?? CHAPTERS[0];
  const beat = chapter.beats[snap.beat] ?? chapter.beats[0];

  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-fg">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <video
        ref={videoARef}
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full origin-center object-cover opacity-0"
      />
      <video
        ref={videoBRef}
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full origin-center object-cover opacity-0"
      />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_rgba(7,8,12,0.45)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg via-bg/70 to-transparent" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 sm:items-center sm:px-8 sm:py-4">
        <div>
          <p className="font-display text-lg leading-none text-fg sm:text-xl">Kozmogenez</p>
          <p className="mt-1 hidden text-xs text-muted sm:block">Büyük Patlama’dan Homo sapiens’e</p>
          <a
            href="/site-paketi.zip"
            download="Kozmogenez-site.zip"
            className="mt-2 inline-flex h-8 items-center rounded-full border border-line bg-elev px-3 text-xs text-fg"
          >
            Siteyi indir
          </a>
        </div>
        <p className="max-w-36 text-right text-xs text-primary sm:max-w-none sm:text-sm">{chapter.kicker}</p>
      </header>

      <nav
        aria-label="Bölümler"
        className="absolute top-24 bottom-64 left-4 z-10 hidden w-64 overflow-y-auto rounded-2xl border border-line bg-bg/70 p-2 backdrop-blur-md lg:block"
      >
        <ol className="flex flex-col">
          {CHAPTERS.map((item, index) => {
            const active = index === snap.index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  className={
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left " +
                    (active ? "bg-elev text-fg" : "text-muted hover:bg-elev/70 hover:text-fg")
                  }
                >
                  <span className={"nums mt-0.5 text-xs " + (active ? "text-primary" : "text-muted")}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted">{item.when}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-transparent" />
        <div className="relative px-4 pt-6 pb-3 sm:px-8 sm:pt-12 sm:pb-6 lg:pl-80">
          <p className="text-xs tracking-wide text-primary uppercase">
            {String(snap.index + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
            <span className="ml-2 text-muted normal-case">{chapter.when}</span>
          </p>
          <h1 className="font-display mt-1 text-2xl leading-tight text-fg sm:text-4xl">{chapter.title}</h1>
          <p key={beat.text} className="beat-in mt-1 line-clamp-2 max-w-2xl text-sm leading-snug text-fg sm:mt-2 sm:line-clamp-none sm:text-base sm:leading-relaxed">
            {beat.text}
          </p>
          <p className="sr-only" aria-live="polite">
            {chapter.title}. {beat.text}
          </p>

          {snap.notes ? (
            <ul className="mt-3 max-h-36 max-w-2xl list-disc space-y-1 overflow-y-auto pl-4 text-sm text-muted">
              {chapter.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}

          {snap.reduced && !snap.playing ? (
            <p className="mt-2 text-xs text-muted">Hareket azaltıldı. Oynatabilir ya da çizgiyi kaydırabilirsin.</p>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Önceki bölüm"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-elev text-fg"
            >
              <SkipBack className="size-4" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={snap.ended ? "Baştan izle" : snap.playing ? "Duraklat" : "Oynat"}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-ink"
            >
              {snap.ended ? <RotateCcw className="size-5" /> : snap.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Sonraki bölüm"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-elev text-fg"
            >
              <SkipForward className="size-5" />
            </button>
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Hız ${snap.speed} kat`}
              className="nums h-11 rounded-full border border-line bg-elev px-3 text-sm text-fg"
            >
              {snap.speed}×
            </button>
            <button
              type="button"
              onClick={toggleNotes}
              aria-pressed={snap.notes}
              className={
                "flex h-11 items-center gap-2 rounded-full border px-3 text-sm " +
                (snap.notes ? "border-primary bg-primary text-ink" : "border-line bg-elev text-fg")
              }
            >
              <BookOpen className="size-4" />
              <span>Notlar</span>
            </button>
            <span className="nums ml-auto text-xs text-muted">
              <span ref={clockRef}>0:00</span>
              <span> / {formatClock(TOTAL)}</span>
            </span>
          </div>

          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Film zaman çizgisi"
            aria-valuemin={0}
            aria-valuemax={1000}
            aria-valuenow={0}
            className="mt-2 flex h-11 touch-none items-center"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              seekClient(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) seekClient(event.clientX);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                engine.current.time = Math.min(TOTAL, engine.current.time + 5);
                engine.current.ended = false;
                publish();
              } else if (event.key === "ArrowLeft") {
                engine.current.time = Math.max(0, engine.current.time - 5);
                engine.current.ended = false;
                publish();
              }
            }}
          >
            <div className="relative h-1 w-full rounded-full bg-line">
              <div ref={fillRef} className="h-full origin-left rounded-full bg-primary" style={{ transform: "scaleX(0)" }} />
              {CHAPTERS.map((item, index) => (
                <span
                  key={item.id}
                  className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-fg/30"
                  style={{ left: `${(chapterStart(index) / TOTAL) * 100}%` }}
                />
              ))}
            </div>
          </div>

          <div ref={chipRef} className="chip-row mt-1 flex gap-2 overflow-x-auto lg:hidden">
            {CHAPTERS.map((item, index) => {
              const active = index === snap.index;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={index}
                  onClick={() => goTo(index)}
                  className={
                    "h-11 shrink-0 rounded-full border px-3 text-sm " +
                    (active ? "border-primary bg-primary text-ink" : "border-line bg-elev text-muted")
                  }
                >
                  {item.title}
                </button>
              );
            })}
          </div>
          <p className="mt-2 hidden text-xs text-muted sm:block">Tarihler yaklaşıktır; yeni fosil ve ölçümlerle kayar. Bu bir merdiven değil, dallanan bir ağaç.</p>
        </div>
      </div>
    </div>
  );
}
