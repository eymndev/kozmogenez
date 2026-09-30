import { useEffect, useMemo, useRef } from "react";
import type { FilmEngine } from "@/film/engine";
import { CLIP_SECONDS, FADE, SHOTS, clamp, smoothstep, type ShotSpan } from "@/film/timeline";

type Layer = {
  root: HTMLDivElement;
  video: HTMLVideoElement;
  ready: boolean;
  /** iOS gibi ön yüklemeyi yok sayan tarayıcılarda yüklemeyi bir kez `play()` ile başlatır. */
  kicked: boolean;
};

const MIN_RATE = 0.45;
const MAX_RATE = 1;

/**
 * Çekimin videosu hangi hızda oynamalı ki görünür kaldığı süreyi doldursun.
 * Uzun çekimlerde ağır çekime geçer; kısa çekimlerde hızlanmaz, klip erken kesilir.
 */
function clipRate(shot: ShotSpan): number {
  const playable = shot.end + FADE - shot.holdUntil;
  return clamp(CLIP_SECONDS / Math.max(1, playable), MIN_RATE, MAX_RATE);
}

/**
 * Görüntü katmanı. Her çekim, afiş (jpg) üstüne video olarak çizilir; video hazır
 * olmadan afiş görünür, böylece yükleme sırasında ekran asla boş kalmaz.
 * Yalnızca şimdiki çekim ve komşuları DOM’dadır.
 */
export function Stage({
  engine,
  current,
  started,
  reduced,
}: {
  engine: FilmEngine;
  current: number;
  started: boolean;
  reduced: boolean;
}) {
  const layers = useRef(new Map<string, Layer>());
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const mounted = useMemo(() => {
    const out: ShotSpan[] = [];
    for (let i = Math.max(0, current - 1); i <= Math.min(SHOTS.length - 1, current + 1); i++)
      out.push(SHOTS[i]);
    return out;
  }, [current]);

  useEffect(() => {
    return engine.onFrame((time) => {
      for (const shot of SHOTS) {
        const layer = layers.current.get(shot.key);
        if (layer) paint(layer, shot, time, engine.playing, engine.speed, reducedRef.current);
      }
    });
  }, [engine]);

  return (
    <div
      className="stage-frame absolute inset-x-0 top-0 isolate overflow-hidden bg-bg"
      aria-hidden="true"
    >
      {mounted.map((shot) => (
        <ShotLayer
          key={shot.key}
          shot={shot}
          eager={shot === SHOTS[current] || (started && shot === SHOTS[current + 1])}
          register={(layer) => {
            if (layer) layers.current.set(shot.key, layer);
            else layers.current.delete(shot.key);
          }}
          onReady={() => {
            const layer = layers.current.get(shot.key);
            if (layer) {
              layer.ready = true;
              paint(layer, shot, engine.time, engine.playing, engine.speed, reducedRef.current);
            }
          }}
        />
      ))}
      <div className="stage-shade pointer-events-none absolute inset-0" />
      <div className="grain pointer-events-none absolute" />
    </div>
  );
}

function ShotLayer({
  shot,
  eager,
  register,
  onReady,
}: {
  shot: ShotSpan;
  eager: boolean;
  register: (layer: Layer | null) => void;
  onReady: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const registerRef = useRef(register);
  registerRef.current = register;

  // Kaynak efektte atanır: sunucu HTML’i video indirmez ve StrictMode’un çift çalıştırması güvenlidir.
  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;
    video.src = `/cosmos/${shot.name}.mp4`;
    registerRef.current({ root, video, ready: false, kicked: false });
    return () => {
      registerRef.current(null);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [shot.name]);

  const position = `${shot.focus[0] * 100}% ${shot.focus[1] * 100}%`;
  return (
    <div
      ref={rootRef}
      className="shot-layer absolute inset-0 will-change-transform"
      style={{ opacity: 0, transformOrigin: position }}
    >
      <img
        src={`/cosmos/${shot.name}.jpg`}
        alt=""
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: position }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        disablePictureInPicture
        preload={eager ? "auto" : "metadata"}
        onLoadedData={onReady}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700"
        style={{ objectPosition: position }}
      />
    </div>
  );
}

function paint(
  layer: Layer,
  shot: ShotSpan,
  time: number,
  playing: boolean,
  speed: number,
  reduced: boolean,
) {
  const first = shot === SHOTS[0];
  const visible = time >= shot.start - FADE && time < shot.end + FADE;
  const opacity = first ? 1 : smoothstep((time - (shot.start - FADE)) / (FADE * 2));
  layer.root.style.opacity = visible ? opacity.toFixed(3) : "0";
  layer.root.style.zIndex = String(SHOTS.indexOf(shot) + 1);

  const life = clamp((time - (shot.start - FADE)) / (shot.end - shot.start + FADE * 2), 0, 1);
  const scale = reduced ? 1.02 : shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * life;
  layer.root.style.transform = `scale(${scale.toFixed(4)})`;

  const video = layer.video;
  if (!layer.ready) {
    if (playing && visible && !layer.kicked) {
      layer.kicked = true;
      void video.play().catch(() => undefined);
    }
    return;
  }
  video.style.opacity = "1";

  const duration =
    Number.isFinite(video.duration) && video.duration > 0 ? video.duration : CLIP_SECONDS;
  const rate = clipRate(shot);
  const target = clamp((time - shot.holdUntil) * rate, 0, duration - 0.05);
  const rolling = playing && visible && time > shot.holdUntil && target < duration - 0.06;

  if (rolling) {
    const wanted = clamp(rate * speed, 0.25, 4);
    if (Math.abs(video.playbackRate - wanted) > 0.02) video.playbackRate = wanted;
    if (!video.seeking && Math.abs(video.currentTime - target) > 0.4) video.currentTime = target;
    if (video.paused) void video.play().catch(() => undefined);
  } else {
    if (!video.paused) video.pause();
    if (!video.seeking && Math.abs(video.currentTime - target) > 0.04) video.currentTime = target;
  }
}
