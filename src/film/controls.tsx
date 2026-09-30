import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  BookOpen,
  LayoutGrid,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CHAPTERS } from "@/film/chapters";
import type { FilmEngine, Snapshot } from "@/film/engine";
import { SPANS, TOTAL, clamp, formatClock, pad2 } from "@/film/timeline";
import { cn } from "@/lib/cn";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

const speedLabel = (s: number) => `${String(s).replace(".", ",")}×`;

type IconButtonProps = ComponentProps<"button"> & {
  label: string;
  active?: boolean;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border border-fg/15 bg-bg/45 text-fg backdrop-blur-md",
        "transition duration-200 hover:border-fg/35 hover:bg-fg/10 active:scale-95",
        active && "border-primary/70 bg-primary/15 text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function ControlBar({
  engine,
  snap,
  muted,
  fullscreen,
  canFullscreen,
  onMute,
  onFullscreen,
  onInfo,
  onChapters,
}: {
  engine: FilmEngine;
  snap: Snapshot;
  muted: boolean;
  fullscreen: boolean;
  canFullscreen: boolean;
  onMute: () => void;
  onFullscreen: () => void;
  onInfo: () => void;
  onChapters: () => void;
}) {
  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(snap.speed);
    engine.setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  };

  return (
    <div>
      <TimelineBar engine={engine} index={snap.index} />
      <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
        <IconButton label="Önceki bölüm (←)" onClick={() => engine.previous()}>
          <SkipBack className="size-4" />
        </IconButton>
        <button
          type="button"
          onClick={() => engine.toggle()}
          aria-label={
            snap.ended ? "Baştan izle" : snap.playing ? "Duraklat (boşluk)" : "Oynat (boşluk)"
          }
          title={snap.ended ? "Baştan izle" : snap.playing ? "Duraklat" : "Oynat"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-ink shadow-lg shadow-primary/20 transition duration-200 hover:brightness-110 active:scale-95"
        >
          {snap.ended ? (
            <RotateCcw className="size-5" />
          ) : snap.playing ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 translate-x-px fill-current" />
          )}
        </button>
        <IconButton label="Sonraki bölüm (→)" onClick={() => engine.next()}>
          <SkipForward className="size-4" />
        </IconButton>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <IconButton
            label={`Oynatma hızı: ${speedLabel(snap.speed)}`}
            onClick={cycleSpeed}
            active={snap.speed !== 1}
          >
            <span className="nums text-xs font-medium">{speedLabel(snap.speed)}</span>
          </IconButton>
          <IconButton label={muted ? "Sesi aç (M)" : "Sesi kapat (M)"} onClick={onMute}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
          <IconButton label="Nasıl biliyoruz? (N)" onClick={onInfo}>
            <BookOpen className="size-4" />
          </IconButton>
          <IconButton label="Bölümler (B)" onClick={onChapters}>
            <LayoutGrid className="size-4" />
          </IconButton>
          {canFullscreen ? (
            <IconButton
              label={fullscreen ? "Tam ekrandan çık (F)" : "Tam ekran (F)"}
              onClick={onFullscreen}
              className="hidden sm:grid"
            >
              {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </IconButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Hover = { left: number; index: number; time: number };

/** Bölümlere ayrılmış zaman çizelgesi; sürüklenebilir, klavyeyle kullanılabilir, üzerine gelince önizleme gösterir. */
export function TimelineBar({ engine, index }: { engine: FilmEngine; index: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clockRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    let lastSecond = -1;
    return engine.onFrame((time) => {
      SPANS.forEach((span, i) => {
        const el = fillRefs.current[i];
        if (el)
          el.style.transform = `scaleX(${clamp((time - span.start) / (span.end - span.start), 0, 1).toFixed(4)})`;
      });
      const second = Math.floor(time);
      if (second !== lastSecond) {
        lastSecond = second;
        if (clockRef.current) clockRef.current.textContent = formatClock(time);
        const track = trackRef.current;
        if (track) {
          track.setAttribute("aria-valuenow", String(second));
          let i = 0;
          while (i < SPANS.length - 1 && time >= SPANS[i].end) i++;
          track.setAttribute("aria-valuetext", `${formatClock(time)} · ${CHAPTERS[i].title}`);
        }
      }
    });
  }, [engine]);

  const timeAt = (clientX: number) => {
    const segs = segRefs.current;
    for (let i = 0; i < segs.length; i++) {
      const el = segs[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const gapEnd = segs[i + 1]?.getBoundingClientRect().left ?? r.right;
      if (clientX < gapEnd || i === segs.length - 1) {
        const u = clamp((clientX - r.left) / r.width, 0, 1);
        return { index: i, time: SPANS[i].start + u * (SPANS[i].end - SPANS[i].start) };
      }
    }
    return { index: 0, time: 0 };
  };

  const preview = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const at = timeAt(clientX);
    const left = clamp(clientX - rect.left, 88, Math.max(88, rect.width - 88));
    setHover({ left, index: at.index, time: at.time });
  };

  const hovered = hover ? CHAPTERS[hover.index] : null;

  return (
    <div className="flex items-center gap-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Zaman çizelgesi"
        aria-valuemin={0}
        aria-valuemax={Math.round(TOTAL)}
        aria-valuenow={0}
        aria-valuetext="0:00"
        className="group relative flex h-10 min-w-0 flex-1 touch-none items-center gap-0.5 sm:gap-1"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          engine.seek(timeAt(event.clientX).time);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            engine.seek(timeAt(event.clientX).time);
          if (event.pointerType === "mouse") preview(event.clientX);
        }}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(event) => {
          const actions: Record<string, () => void> = {
            ArrowLeft: () => engine.seek(engine.time - 5),
            ArrowRight: () => engine.seek(engine.time + 5),
            PageUp: () => engine.previous(),
            PageDown: () => engine.next(),
            Home: () => engine.seek(0),
            End: () => engine.seek(TOTAL),
          };
          const action = actions[event.key];
          if (!action) return;
          event.preventDefault();
          event.stopPropagation();
          action();
        }}
      >
        {SPANS.map((span, i) => (
          <div
            key={CHAPTERS[i].id}
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            className={cn(
              "relative h-1 overflow-hidden rounded-full transition-all duration-200 group-hover:h-1.5",
              i === index ? "bg-fg/30" : "bg-fg/15",
            )}
            style={{ flexGrow: span.end - span.start, flexBasis: 0 }}
          >
            <div
              ref={(el) => {
                fillRefs.current[i] = el;
              }}
              className="absolute inset-0 origin-left bg-primary"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        ))}

        {hover && hovered ? (
          <div
            className="pointer-events-none absolute bottom-full mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-fg/15 bg-surface/95 shadow-2xl shadow-bg/60 backdrop-blur-md"
            style={{ left: hover.left }}
          >
            <img
              src={`/cosmos/thumbs/${hovered.shots[0].name}.jpg`}
              alt=""
              className="aspect-video w-full object-cover"
            />
            <div className="px-3 py-2">
              <p className="nums text-xs text-primary">
                {pad2(hover.index + 1)} · {formatClock(hover.time)}
              </p>
              <p className="truncate text-sm font-medium">{hovered.title}</p>
            </div>
          </div>
        ) : null}
      </div>
      <span className="nums shrink-0 text-xs text-muted">
        <span ref={clockRef} className="text-fg/85">
          0:00
        </span>{" "}
        / {formatClock(TOTAL)}
      </span>
    </div>
  );
}
