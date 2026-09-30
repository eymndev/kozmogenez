import { bigBang } from "@/film/scenes/big-bang";
import { dino } from "@/film/scenes/dino";
import { earth } from "@/film/scenes/earth";
import { firstLight } from "@/film/scenes/first-light";
import { firstStars } from "@/film/scenes/first-stars";
import { galaxy } from "@/film/scenes/galaxy";
import { human } from "@/film/scenes/human";
import type { Scene } from "@/film/scenes/kit";
import { land } from "@/film/scenes/land";
import { luca } from "@/film/scenes/luca";
import { oxygen } from "@/film/scenes/oxygen";
import { rna } from "@/film/scenes/rna";
import { solar } from "@/film/scenes/solar";

/** Kodla çizilen bilimsel canlandırmalar; bölüm verisinde `scene` adıyla seçilir. */
export const SCENES = {
  bigBang,
  firstLight,
  firstStars,
  galaxy,
  solar,
  earth,
  rna,
  luca,
  oxygen,
  land,
  dino,
  human,
} satisfies Record<string, Scene>;

export type SceneId = keyof typeof SCENES;
