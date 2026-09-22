# 🎯 Darts Scorer

A Vue 3 web app for scoring darts games with an interactive dartboard. Click the
spot on the board where each dart lands and the app keeps score for you. Every
dart is recorded (with its exact board location) to a SQLite database so you can
review a heatmap of where each player throws over time.

## Features

- **Interactive SVG dartboard** — accurate standard layout (20 at the top,
  clockwise), with singles, doubles (outer ring), triples (inner ring), the
  outer bull (25) and bullseye (50). Click a segment to record the throw.
- **Misses count too** — clicking the black number band or anywhere off the
  scoring area registers a dart that missed the board (0). There's also an
  explicit **Missed the board (0)** button.
- **Two game modes:**
  - **X01** — 301, 501 or 701, with optional **Double Out** (must finish on a
    double or the bull). Bust detection (below zero / leaving 1 / bad finish),
    and **checkout suggestions** shown when a player is on a finish (≤170).
  - **Cricket** — close 15–20 and the bull by hitting each three times
    (single = 1 mark, double = 2, triple = 3). Once you've closed a number,
    extra hits score its value in points until every opponent closes it too.
    Win by closing everything while not trailing on points. A marks grid shows
    `╱` / `✕` / `⊗` per number and dims numbers that are closed by everyone.
  - **Killer** — each player is assigned a target number and starts with a set
    number of lives (default 3). Hit your own number three times to become a
    Killer, then hit opponents' numbers to knock out their lives. As a Killer,
    hitting your *own* number costs you lives. Last player standing wins.
    Target numbers can be assigned per player or shuffled randomly.
- **1–6 players** with custom names — names are saved to `localStorage`, so
  they're pre-filled the next time you open the app.
- **Best-of legs** — play a single leg or up to 7 (both modes).
- **Undo** any throw (works across turn boundaries) and **Rematch / New game**.
- **Dart tracking & heatmap** — every dart's segment *and* its exact board
  coordinate is saved to a SQLite database, tagged with the player and game mode.
  The **Throw heatmap & stats** page shows a density heatmap of the board,
  filterable by player and game, plus totals, board-accuracy, and most-hit spots.
  Player profiles for Jackson, Miles, Anton and Max are seeded automatically.

## Run it

```bash
npm install
npm run dev
```

`npm run dev` starts both the API server (Express + SQLite, port 3001) and the
Vite dev server (port 5173, which proxies `/api` to the server). Open
http://localhost:5173.

To build and run in production (the server also serves the built frontend):

```bash
npm run build
npm run server   # serves the app + API on http://localhost:3001
```

The SQLite file lives at `server/darts.db` and is created automatically on
first run (it's git-ignored).

## Project structure

Frontend (`src/`):
- `dartboard.js` — geometry: builds the SVG segment paths and number labels.
- `components/Dartboard.vue` — the clickable board; emits `throw` events with the
  segment *and* the click's board-space coordinate.
- `useGame.js` — game state and rules for all three modes (X01, Cricket, Killer),
  plus legs and undo.
- `components/GameSetup.vue` — game-mode and player configuration screen.
- `components/Scoreboard.vue` / `CricketBoard.vue` / `KillerBoard.vue` — the
  per-mode scoreboards.
- `components/HeatmapView.vue` — the throw heatmap + stats page (canvas heatmap
  over a static board, with player/game filters).
- `api.js` — thin, fail-soft client for the tracking API.
- `App.vue` — ties setup, board, scoreboards and the heatmap view together.

Backend (`server/`):
- `db.js` — SQLite schema (`players`, `throws`), seeding, and queries.
- `index.js` — Express API (`/api/players`, `/api/throws`) that also serves the
  built frontend in production.
