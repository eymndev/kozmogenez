import { bigBang } from "@/film/scenes/big-bang";
import { firstLight } from "@/film/scenes/first-light";
import { firstStars } from "@/film/scenes/first-stars";
import type { Scene } from "@/film/scenes/kit";

/** Kodla çizilen bilimsel canlandırmalar; bölüm verisinde `scene` adıyla seçilir. */
export const SCENES = {
  bigBang,
  firstLight,
  firstStars,
} satisfies Record<string, Scene>;

export type SceneId = keyof typeof SCENES;
