import { useEffect, useMemo, useRef } from "react";
import type { FilmEngine } from "@/film/engine";
import { SCENES } from "@/film/scenes";
import { CLIP_SECONDS, FADE, SHOTS, clamp, smoothstep, type ShotSpan } from "@/film/timeline";

type Layer = {
  root: HTMLDivElement;
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
  ready: boolean;
  /** iOS gibi ön yüklemeyi yok sayan tarayıcılarda yüklemeyi bir kez `play()` ile başlatır. */
  kicked: boolean;
};

const MIN_RATE = 0.45;
const MAX_RATE = 1;
/** Geçişte giden çekimin ne kadar büyüyeceği: kameranın içine dalıyormuş gibi. */
const DIVE = 0.7;
/** Gelen çekim bu ölçekten 1’e oturur. */
const ARRIVE = 1.22;

/**
 * Çekimin videosu hangi hızda oynamalı ki görünür kaldığı süreyi doldursun.
 * Uzun çekimlerde ağır çekime geçer; kısa çekimlerde hızlanmaz, klip erken kesilir.
 */
function clipRate(shot: ShotSpan): number {
  const playable = shot.end + FADE - shot.holdUntil;
  return clamp(CLIP_SECONDS / Math.max(1, playable), MIN_RATE, MAX_RATE);
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Görüntü katmanı. Her çekim ya kodla çizilen bir sahne (canvas) ya da afiş üstünde bir
 * videodur. Geçişlerde giden çekim büyüyerek bulanıklaşır, gelen çekim biraz büyükten
 * yerine oturur: zamanın içinde ileri uçuyormuş hissi. Yalnızca şimdiki çekim ve
 * komşuları DOM’dadır.
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const registerRef = useRef(register);
  registerRef.current = register;

  // Kaynak efektte atanır: sunucu HTML’i video indirmez ve StrictMode’un çift çalıştırması güvenlidir.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video) video.src = `/cosmos/${shot.name}.mp4`;
    registerRef.current({ root, video, canvas, ready: Boolean(canvas), kicked: false });
    return () => {
      registerRef.current(null);
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [shot.name]);

  const position = `${shot.focus[0] * 100}% ${shot.focus[1] * 100}%`;
  return (
    <div
      ref={rootRef}
      className="absolute inset-0 will-change-transform"
      style={{ opacity: 0, transformOrigin: position }}
    >
      {shot.scene ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <>
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
        </>
      )}
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
  const index = SHOTS.indexOf(shot);
  const first = index === 0;
  const last = index === SHOTS.length - 1;
  const visible = time >= shot.start - FADE && time < shot.end + FADE;
  const arrive = first ? 1 : smoothstep((time - (shot.start - FADE)) / (FADE * 2));
  const leave = last ? 0 : smoothstep((time - (shot.end - FADE)) / (FADE * 2));

  layer.root.style.opacity = visible ? arrive.toFixed(3) : "0";
  layer.root.style.zIndex = String(index + 1);

  const life = clamp((time - (shot.start - FADE)) / (shot.end - shot.start + FADE * 2), 0, 1);
  let scale = shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * life;
  if (reduced) scale = 1.02;
  else {
    scale *= 1 + (ARRIVE - 1) * (1 - easeOut(arrive));
    scale *= 1 + DIVE * leave * leave;
  }
  layer.root.style.transform = `scale(${scale.toFixed(4)})`;

  if (layer.canvas) {
    if (visible) drawScene(layer.canvas, shot, time);
    return;
  }

  const video = layer.video;
  if (!video) return;
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

function drawScene(canvas: HTMLCanvasElement, shot: ShotSpan, time: number) {
  const scene = shot.scene ? SCENES[shot.scene] : null;
  if (!scene) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  // Küçük ekranlarda keskinlik için 2×, büyük ekranlarda akıcılık için 1,5× piksel yoğunluğu.
  const dpr = Math.min(w < 700 ? 2 : 1.5, window.devicePixelRatio || 1);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  scene({
    ctx,
    w,
    h,
    t: time - shot.start,
    dur: shot.end - shot.start,
    beats: shot.beats,
    s: Math.max(0.6, Math.min(1.4, Math.min(w, h) / 800)),
    dpr,
  });
}
