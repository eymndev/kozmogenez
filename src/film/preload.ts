import { SHOTS } from "@/film/timeline";

/** Sıradaki bölümlerin afişlerini boşta önceden indirir; atlamalar anında görünür. */
export function preloadPosters() {
  const load = () => {
    for (const shot of SHOTS) {
      const img = new Image();
      img.decoding = "async";
      img.src = `/cosmos/${shot.name}.jpg`;
    }
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1200);
}
