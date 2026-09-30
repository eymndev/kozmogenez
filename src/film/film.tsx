import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CHAPTERS } from "@/film/chapters";
import { ControlBar } from "@/film/controls";
import { FilmEngine } from "@/film/engine";
import { Captions, CosmicClock, TitleCard } from "@/film/hud";
import { Intro, Outro } from "@/film/overlays";
import { ChapterIndex, InfoSheet } from "@/film/panels";
import { Score } from "@/film/score";
import { preloadPosters } from "@/film/preload";
import { Stage } from "@/film/stage";
import { SPANS, TOTAL, locate, shotIndexAt } from "@/film/timeline";
import { cn } from "@/lib/cn";

const KEY_TIME = "kozmogenez:t";
const KEY_MUTED = "kozmogenez:muted";

/** Göktaşının Yucatán’a çarptığı an: "Dinozorlar" bölümünün ikinci cümlesi. */
const IMPACT = SPANS[CHAPTERS.findIndex((c) => c.id === "dino")].beats[1].start;

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* gizli sekme vb. */
  }
}

type Panel = "chapters" | "info" | null;

export function Film() {
  const [engine] = useState(() => new FilmEngine());
  const [score] = useState(() => new Score());
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  const [started, setStarted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [entry, setEntry] = useState<number | null>(null);
  const [chrome, setChrome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const startedRef = useRef(false);
  const resumeAfterPanel = useRef(false);
  const overControls = useRef(false);
  const idleTimer = useRef(0);

  useEffect(() => {
    engine.start();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);

    setMuted(readStore(KEY_MUTED) === "1");
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);

    // Bağlantıdaki bölüm (#gunes gibi) ya da en son kalınan an; ikisi aynı bölümdeyse kalınan an kazanır.
    const hashIndex = CHAPTERS.findIndex((c) => `#${c.id}` === window.location.hash);
    const saved = Number(readStore(KEY_TIME));
    const hasSaved =
      readStore(KEY_TIME) !== null && Number.isFinite(saved) && saved > 8 && saved < TOTAL - 8;
    if (hasSaved && (hashIndex < 0 || locate(saved).index === hashIndex)) {
      engine.seek(saved);
      setResumeAt(saved);
    } else if (hashIndex >= 0) {
      engine.seek(SPANS[hashIndex].start);
      setEntry(hashIndex);
    }

    // Tarayıcılar sesi ancak bir etkileşimden sonra açar; her dokunuşta bağlamı uyandır.
    const unlock = () => {
      if (startedRef.current) score.unlock();
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    // Sekme arka plana geçince filmi duraklat, dönünce kaldığı yerden sürdür.
    let autoPaused = false;
    const onVisibility = () => {
      if (document.hidden && engine.playing) {
        engine.pause();
        autoPaused = true;
      } else if (!document.hidden && autoPaused) {
        autoPaused = false;
        engine.play();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      engine.stop();
      score.dispose();
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [engine, score]);

  // Müzik ipuçları ve kaldığın yeri hatırlama.
  useEffect(() => {
    return engine.onFrame((time, prev) => {
      if (!engine.playing || time <= prev || time - prev > 0.5) return;
      const crossed = (at: number) => prev < at && time >= at;
      if (crossed(0.12) || crossed(IMPACT)) score.boom();
      for (let i = 1; i < SPANS.length; i++) {
        if (crossed(SPANS[i].start + 0.05)) score.chime();
      }
      if (Math.floor(time / 2) !== Math.floor(prev / 2)) writeStore(KEY_TIME, time.toFixed(1));
    });
  }, [engine, score]);

  useEffect(() => {
    score.setTone(CHAPTERS[snap.index].tone);
  }, [score, snap.index]);

  useEffect(() => {
    score.setActive(started && snap.playing);
  }, [score, started, snap.playing]);

  useEffect(() => {
    score.setMuted(muted);
  }, [score, muted]);

  useEffect(() => {
    if (snap.ended) writeStore(KEY_TIME, null);
  }, [snap.ended]);

  // Adres çubuğu o anki bölümü gösterir; bağlantı paylaşılınca oradan açılır.
  useEffect(() => {
    if (!started) return;
    const hash = `#${CHAPTERS[snap.index].id}`;
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, "", hash);
  }, [started, snap.index]);

  // Fareyle izlerken kontroller birkaç saniye hareketsizlikte çekilir; dokunmatik ekranda hep görünür.
  const poke = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idleTimer.current);
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    idleTimer.current = window.setTimeout(() => {
      if (engine.playing && !overControls.current) setChrome(false);
    }, 3000);
  }, [engine]);

  useEffect(() => {
    window.addEventListener("pointermove", poke);
    window.addEventListener("pointerdown", poke);
    window.addEventListener("keydown", poke);
    return () => {
      window.removeEventListener("pointermove", poke);
      window.removeEventListener("pointerdown", poke);
      window.removeEventListener("keydown", poke);
      window.clearTimeout(idleTimer.current);
    };
  }, [poke]);

  useEffect(() => {
    if (snap.playing) poke();
    else {
      window.clearTimeout(idleTimer.current);
      setChrome(true);
    }
  }, [snap.playing, poke]);

  function start(time: number) {
    score.ensure();
    score.setMuted(muted);
    score.setTone(CHAPTERS[locate(time).index].tone, true);
    engine.seek(time);
    engine.play();
    startedRef.current = true;
    setStarted(true);
    setResumeAt(null);
    preloadPosters();
  }

  function togglePlay() {
    if (!startedRef.current) start(resumeAt ?? (entry !== null ? SPANS[entry].start : 0));
    else engine.toggle();
  }

  function toggleMute() {
    const next = !muted;
    if (!next) score.ensure();
    setMuted(next);
    writeStore(KEY_MUTED, next ? "1" : null);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  function openPanel(next: Exclude<Panel, null>) {
    if (panel === next) return;
    if (panel === null) resumeAfterPanel.current = engine.playing;
    engine.pause();
    setPanel(next);
  }

  function closePanel() {
    setPanel(null);
    if (resumeAfterPanel.current && startedRef.current) engine.play();
    resumeAfterPanel.current = false;
  }

  function selectChapter(index: number) {
    resumeAfterPanel.current = false;
    setPanel(null);
    if (!startedRef.current) {
      start(SPANS[index].start);
      return;
    }
    engine.goTo(index);
    engine.play();
  }

  // Klavye: güncel durumu görmesi için her çizimde yenilenen tek bir dinleyici.
  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || panel) return;
    const target = event.target;
    const onControl =
      target instanceof HTMLElement &&
      target.closest("button, a, input, textarea, select, summary, [role='slider']");
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      if (onControl && key === " ") return;
      event.preventDefault();
      togglePlay();
      return;
    }
    if (!startedRef.current) {
      if (key === "b") openPanel("chapters");
      return;
    }
    if (key === "arrowright") {
      event.preventDefault();
      if (event.shiftKey) engine.seek(engine.time + 5);
      else engine.next();
    } else if (key === "arrowleft") {
      event.preventDefault();
      if (event.shiftKey) engine.seek(engine.time - 5);
      else engine.previous();
    } else if (key === "m") toggleMute();
    else if (key === "f") toggleFullscreen();
    else if (key === "n") openPanel("info");
    else if (key === "b") openPanel("chapters");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chapter = CHAPTERS[snap.index];
  const hideChrome = started && snap.playing && !chrome && panel === null;
  const showFilmUi = started && !snap.ended;

  return (
    <div
      className={cn(
        "relative h-dvh w-full overflow-hidden bg-bg text-fg select-none",
        hideChrome && "cursor-none",
      )}
    >
      <Stage
        engine={engine}
        current={shotIndexAt(engine.time)}
        started={started}
        reduced={reduced}
      />

      <div
        className="absolute inset-0 z-10"
        aria-hidden="true"
        onPointerUp={(event) => {
          if (!showFilmUi) return;
          if (event.pointerType === "mouse") {
            if (event.button === 0) engine.toggle();
          } else {
            poke();
          }
        }}
      />

      <TitleCard engine={engine} index={snap.index} active={started} />

      <header
        className={cn(
          "safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-4 transition-opacity duration-700 sm:px-8",
          showFilmUi ? "opacity-100" : "opacity-0",
        )}
      >
        <p
          className={cn(
            "font-display text-base tracking-cosmic uppercase film-shadow transition-opacity duration-500 sm:text-lg",
            hideChrome && "opacity-0",
          )}
        >
          Kozmogenez
        </p>
        <CosmicClock engine={engine} />
      </header>

      <div
        className={cn(
          "safe-bottom absolute inset-x-0 bottom-0 z-30 px-4 transition-opacity duration-500 sm:px-8",
          showFilmUi ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        inert={!showFilmUi}
      >
        <Captions index={snap.index} beat={snap.beat} hidden={snap.inCard} />
        <div
          className={cn(
            "mt-4 transition-opacity duration-500 sm:mt-6",
            hideChrome && "pointer-events-none opacity-0",
          )}
          onPointerEnter={() => {
            overControls.current = true;
          }}
          onPointerLeave={() => {
            overControls.current = false;
          }}
        >
          <ControlBar
            engine={engine}
            snap={snap}
            muted={muted}
            fullscreen={fullscreen}
            canFullscreen={canFullscreen}
            onMute={toggleMute}
            onFullscreen={toggleFullscreen}
            onInfo={() => openPanel("info")}
            onChapters={() => openPanel("chapters")}
          />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {showFilmUi
          ? `${chapter.title}. ${snap.inCard ? chapter.when : chapter.beats[snap.beat].text}`
          : ""}
      </p>

      {!started ? (
        <Intro
          resumeAt={resumeAt}
          entry={entry}
          onStart={start}
          onChapters={() => openPanel("chapters")}
        />
      ) : null}

      {started && snap.ended ? (
        <Outro
          onReplay={() => {
            engine.seek(0);
            engine.play();
          }}
          onChapters={() => openPanel("chapters")}
        />
      ) : null}

      <ChapterIndex
        open={panel === "chapters"}
        onOpenChange={(open) => (open ? openPanel("chapters") : closePanel())}
        current={snap.index}
        time={started ? engine.time : -1}
        onSelect={selectChapter}
      />
      <InfoSheet
        open={panel === "info"}
        onOpenChange={(open) => (open ? openPanel("info") : closePanel())}
        index={snap.index}
      />
    </div>
  );
}
