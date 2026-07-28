# TerraLens Games 🌍 (Geographie Games)

A collection of **three geography mini-games** in one distributable web app, built with
**Vite + React + TypeScript**. No API keys, no backend, no signup — satellite imagery comes from
the free Esri World Imagery tile service, so anyone can host or run it.

The in-game UI is fully immersive: the satellite view, world map, and globe fill the whole
screen, with the HUD, prompts, and guess controls floating on top as translucent panels.

Pick a game from the menu:

| Game | Emoji | What you do |
| ---- | ----- | ----------- |
| **City from Satellite** | 🛰️ | Identify a city from a label-free satellite image. _Easy_ = multiple choice, _Hard_ = type the name (fuzzy, accent-aware). Timed, with a speed bonus and countdown sounds. |
| **Pin the City** | 📍 | We name a city; you click where it is on the world map. Scored by distance — closer is more points (max 5,000/round). |
| **Country Trail** | 🧭 | Connect a start and destination country by naming a chain of bordering countries (Travle-style), on a globe. Each trail scores up to 1000 (−100 per extra country or hint); hints unlock in stages; chain trails to grow your run. |

The city games share a **212-city** dataset; Country Trail uses a hand-built **country-borders
graph** plus a low-res **world-borders GeoJSON** for the globe. Each game tracks its own best
score in `localStorage`, sounds can be muted, and the app is an installable PWA with an offline
app shell.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command           | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot reload               |
| `npm run build`   | Type-check (`tsc`) and build the static site to `dist/` |
| `npm run preview` | Serve the production build locally                       |
| `npm test`        | Run the unit tests (Vitest)                              |

## Deploying

The build is fully static and uses **relative asset paths** (`base: './'`), so it works from any
host or sub-path with no configuration:

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, publish directory `dist`.
- **GitHub Pages:** publish the contents of `dist/` (works from a `user.github.io/repo/` sub-path).
- **Any static server:** `npm run build && npm run preview`, or serve `dist/` with anything.

## Project structure

```
src/
  App.tsx                 # routes between the menu and the active game
  store/
    appStore.ts           # navigation + per-game persisted stats (best score/streak)
    gameStore.ts          # the satellite game's own flow + settings
  games/
    registry.ts           # menu metadata for the three games
    SatelliteGame.tsx     # game 1 (uses screens/ + components/)
    locate/               # game 2: LocateGame + interactive LocateMap
    travle/               # game 3: TravleGame + globe TravleMap
  screens/                # MenuScreen + satellite Home/Round/Result/Summary
  components/             # SatelliteMap, RevealMap, GuessInput, Timer, ScoreBar, ...
  lib/
    cities.ts             # types, selection, distractors, flag/zoom helpers
    scoring.ts            # satellite points + Locate distance + trail scoring
    countries.ts          # country-borders graph for Country Trail
    matching.ts           # accent-insensitive matching + Fuse.js autocomplete
    geo.ts                # haversine distance + bounding-box helper
    esri.ts               # Esri World Imagery tile config
  data/cities.json        # the 212-city dataset
public/
  favicon.svg, manifest.webmanifest, sw.js
```

## Adding more games

Each game is a self-contained component that:

1. is listed in [`src/games/registry.ts`](src/games/registry.ts) (id, title, emoji, accent),
2. is given a route at `/<id>` in [`src/App.tsx`](src/App.tsx),
3. calls `useGameNav().exitToMenu()` to leave and `useAppStore().recordGame(id, { score, streak, ... })`
   to save a result.

Add the new id to the `GameId` union in [`src/store/appStore.ts`](src/store/appStore.ts) and you're
set.

## Adding more cities

Add entries to [`src/data/cities.json`](src/data/cities.json):

```json
{
  "id": "porto-pt", "name": "Porto", "country": "Portugal", "countryCode": "PT",
  "lat": 41.1579, "lon": -8.6291, "population": 240000, "continent": "Europe",
  "aliases": ["Oporto"]
}
```

`population` drives the satellite starting zoom, `continent` is used for plausible
multiple-choice distractors, `lat/lon` power the Locate game, and `aliases` are extra
spellings accepted when typing.

## Tech notes

- **Maps:** MapLibre GL JS rendering Esri World Imagery raster tiles, lazy-loaded into its own chunk
  so the menu and non-map screens load fast.
- **State:** Zustand with `persist` middleware (the satellite game keeps its settings; the app store
  keeps lifetime stats per game).
- **Offline:** a small service worker caches the app shell after the first visit (tiles still need
  the network).

## Imagery & licensing

Satellite imagery © **Esri, Maxar, Earthstar Geographics, and the GIS User Community**, served via
the public Esri World Imagery tile service and attributed in-app. Suitable for **educational /
non-commercial** use. For commercial distribution, review Esri's terms or swap the source in
[`src/lib/esri.ts`](src/lib/esri.ts).
