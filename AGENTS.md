# Kozmogenez — agent guide

Read this file fully before changing anything. It describes the project **as it
is now**; if the code and this file disagree, the code wins and this file must
be fixed (see the first rule).

---

## Rule 1: keep this file current (mandatory)

**Every agent must update `AGENTS.md` in the same change as any code, content,
asset, tooling or workflow change it makes.** If you add, remove, rename or
redesign something this file describes (a chapter, a scene, a module, a script,
a convention, a command, a deployment detail), edit the matching section here
in the same commit or PR. If the change introduces something new that a future
agent would need to know, add it.

- Do it before you call the work done; a PR that leaves this file stale is not
  finished.
- Keep the edit short and factual. Describe the current state, not the history
  (git log already has the history).
- If you find this file wrong while working on something else, fix it too.

---

## What Kozmogenez is

A Turkish-language, ~4.5-minute **scientific short film that runs in the
browser**: from the Big Bang to humans, in 12 chapters, with narration captions,
a cosmic-calendar HUD, a generative score and a "Nasıl biliyoruz?" (how do we
know?) evidence sheet with sources for every chapter.

All 12 chapters are **drawn in code on a `<canvas>`** in a flat, layered,
Kurzgesagt-like illustration style. There are no video clips any more (the
original AI-generated clips were replaced); the stage still supports a video per
shot, but no chapter uses it.

All user-facing text (UI, narration, facts, sources) is **Turkish**. Code
comments in `src/film` are Turkish too; match that. Commit messages are in
English.

The project started as a Grok App Builder export and has since been developed
with Claude Code. The Grok platform files are still in the repo (see
"Platform files" below).

---

## Stack

- **TanStack Start** (React 19, file routes in `src/routes/`), **Vite 8**,
  **Tailwind CSS v4** (tokens in `src/styles.css` `@theme`), TypeScript,
  Node 22.
- Radix Dialog for the panels, `lucide-react` icons. No game engine, no 3D
  library: scenes are plain Canvas 2D.
- Auth and database are **off** (`.grok/app-env.json`: `VITE_AUTH_ENABLED`
  `false`, `deploy.database` `false`). State lives in `localStorage` only. The
  pre-wired `src/lib/auth`, `src/lib/db.ts`, `src/lib/app-data` and
  `src/lib/multiplayer` helpers are unused template code; do not wire them in
  unless the user asks for accounts or shared data.
- Path alias: `@/` → `src/`.

---

## Code map

```text
src/routes/index.tsx        "/" renders <Film />
src/routes/__root.tsx       document shell (keep <PreviewHostBridge />, see below)
src/styles.css              theme tokens (bg, fg, primary amber, fonts) + film CSS
src/film/
  chapters.ts               ALL content: chapters, narration beats, facts,
                            evidence, sources, shots, per-chapter chord (Tone),
                            CLOSING_SOURCES. Edit text here.
  timeline.ts               derives timing from the text: title card (CARD 3.2 s)
                            + reading-paced beat lengths → SPANS, SHOTS, TOTAL;
                            years-ago interpolation, cosmic calendar, formatters
  engine.ts                 FilmEngine: the film clock (play/pause/seek/speed).
                            React subscribes to discrete Snapshots via
                            useSyncExternalStore; per-frame work uses onFrame
                            and writes to the DOM directly
  film.tsx                  top-level player: wires engine, stage, HUD, controls,
                            panels, score, keyboard shortcuts, resume, #hash
                            deep links, background-tab pause, reduced motion,
                            BOOMS (impact sound cue times)
  stage.tsx                 one layer per shot: canvas scene (or video+poster),
                            crossfades, dive/arrive zoom transitions, Ken Burns
  hud.tsx                   CosmicClock (years ago + Sagan calendar), Captions,
                            TitleCard
  controls.tsx              auto-hiding control bar, segmented timeline with
                            hover previews, speeds
  panels.tsx                ChapterIndex and InfoSheet dialogs, SHORTCUTS list
  overlays.tsx              Intro and Outro screens
  score.ts                  Web Audio generative music (pads, wind, chimes, booms)
  preload.ts                idle-time poster preloading (video shots only)
  scenes/
    index.ts                SCENES registry: SceneId → scene function
    kit.ts                  SceneFrame type and basic helpers (hash, wrap,
                            callout, badge, roundRect…)
    art.ts                  illustration toolkit: easing, phase/pop, cached glow
                            and ball sprites, cached world `sheet`s (capped at
                            8192 px per side), curves/blobs, shaded planets,
                            camera + parallax
    <chapter>.ts            one file per scene (see table)
public/cosmos/thumbs/       chapter thumbnails sahne-<id>.jpg (chapter index,
                            timeline hover)
public/cosmos/sim/cmb.webp  simulated CMB sky (Planck-like spectrum), used by
                            first-light.ts; labelled as a simulation on screen
public/og.jpg, x-banner.jpg, favicon.svg, src/lib/og/site.json   share card
```

### Chapters

| # | id (`#hash`) | Title | Scene id | File |
|---|---|---|---|---|
| 1 | `patlama` | Büyük Patlama | `bigBang` | `big-bang.ts` |
| 2 | `isik` | İlk ışık | `firstLight` | `first-light.ts` |
| 3 | `yildiz` | İlk yıldızlar | `firstStars` | `first-stars.ts` |
| 4 | `galaksi` | Samanyolu | `galaxy` | `galaxy.ts` |
| 5 | `gunes` | Güneş doğuyor | `solar` | `solar.ts` |
| 6 | `dunya` | Erken Dünya | `earth` | `earth.ts` |
| 7 | `rna` | RNA dünyası | `rna` | `rna.ts` |
| 8 | `dna` | DNA ve ortak ata | `luca` | `luca.ts` |
| 9 | `oksijen` | Oksijen, sonra çekirdek | `oxygen` | `oxygen.ts` |
| 10 | `kara` | Denizden karaya | `land` | `land.ts` |
| 11 | `dino` | Dinozorlar ve bir taş | `dino` | `dino.ts` |
| 12 | `insan` | İnsana giden dallar | `human` | `human.ts` |

---

## Conventions that matter

- **Content lives in `chapters.ts`; timing is never hand-written.** Changing a
  narration sentence changes its duration and shifts everything after it
  (`timeline.ts`). Scenes receive `beats` (beat start times relative to the
  shot), so key moments in a scene should be keyed to `f.beats[i]`, not to
  absolute seconds. `BOOMS` in `film.tsx` are also beat-relative.
- **Scenes are pure functions of time.** `Scene = (f: SceneFrame) => void`
  draws frame `f.t` from scratch; seeking or rewinding must produce the same
  frame. No accumulated state, no `Math.random()` (use `hash()`). Scale by
  `f.s` (1 at an 800 px short side) so layouts work on phones and 4K.
- **Performance:** draw expensive static layers once into cached sprites /
  `sheet`s (`art.ts`) and stamp them; keep scene labels clear of the header,
  HUD (top right) and captions (bottom).
- **Scientific accuracy is the point.** Facts, evidence and sources in
  `chapters.ts` must be real and current; cite the source when adding a claim.
  Simulations or artistic liberties are labelled on screen.
- **Adding a chapter or scene:** add the scene file, register it in
  `scenes/index.ts`, add the chapter (with `scene`, `tone`, facts, evidence,
  sources) in `chapters.ts`, add `public/cosmos/thumbs/sahne-<id>.jpg`, and
  update the chapter table above.
- **After redrawing a scene, refresh its thumbnail** in
  `public/cosmos/thumbs/` (a screenshot of a representative frame).
- `localStorage` keys: `kozmogenez:t` (resume position), `kozmogenez:muted`.
  Wrap storage access in try/catch, as `film.tsx` does.
- Keyboard shortcuts are listed in `panels.tsx` (`SHORTCUTS`); keep that list in
  sync with the handlers in `film.tsx`.
- Respect `prefers-reduced-motion` (handled in `film.tsx` / `stage.tsx`).

---

## Running and checking

```sh
npm install
npm run dev         # vite dev on 0.0.0.0:8080 (via scripts/with-app-env.mjs)
npm run typecheck
npm run lint
npm run build       # production build (+ db:migrate, a no-op with the DB off)
npm test            # template/platform script tests
```

Always start Vite through the npm scripts, never `npx vite` directly: the
scripts inject `.grok/app-env.json` into the environment.

Before calling a change done: `npm run typecheck` and `npm run build` pass,
and the film actually renders in a real browser (Playwright/Chromium is
available; `node scripts/browser-smoke.mjs` audits desktop and mobile against
the dev server). For scene work, screenshot the frames you changed, on desktop
and on a ~390×844 phone viewport, and look at them. Save QA screenshots under
`screenshots/`.

---

## Deployment

Deployed to **Vercel** through TanStack Start + nitro (`vercel.json` installs
with `--omit=dev`, so runtime code must not depend on `devDependencies`).
`.vercel/output/` is build output and is git-ignored. No env vars or secrets
are needed; never commit a `.env` file.

Vercel refuses to deploy versions of `@tanstack/react-start` with known
vulnerabilities (the 1.168.58 XSS advisory blocked deploys). Keep
`@tanstack/react-start`, `@tanstack/react-router` and `@tanstack/router-plugin`
updated together (currently 1.168.60 / 1.170.41 / 1.168.42). Never set
`DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS` to get around it.

---

## Platform files (from the Grok App Builder export)

These are still in the repo and still used by the build or the Grok preview.
Do not delete or rewrite them unless the user asks:

- `public/__grok/`, `server/`, `scripts/grok-pwa-*`, `scripts/with-app-env.mjs`,
  `scripts/preview*.mjs`, `scripts/browser-smoke*.mjs`, the pre-wired
  `src/lib` helpers, and `vite.config.ts` / `tsconfig.json` (keep the
  `grokPwaPlugin()` and the build-gated nitro plugin).
- `<PreviewHostBridge />` in `src/routes/__root.tsx` (silent outside the Grok
  preview), and no `og:*` / `twitter:card` tags in `__root.tsx` (the PWA
  injector writes them).
- `startup.sh` is the Grok sandbox restart script (it assumes `/workspace`);
  keep it if the app's start command changes.
- `.grok/skills/` and `.grok/references/` are Grok-era guidance (many assume
  Grok-only image tools). Useful as background, but this file is the source of
  truth for this project.
- `artifacts/` holds the old AI-generated images and videos from the Grok
  phase; they are no longer used by the film.
