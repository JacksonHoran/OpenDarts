# 🎯 Darts Scorer

A Vue 3 web app for scoring darts games with an interactive dartboard. Click the
spot on the board where each dart lands and the app keeps score for you.

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
- **1–6 players** with custom names — names are saved to `localStorage`, so
  they're pre-filled the next time you open the app.
- **Best-of legs** — play a single leg or up to 7 (both modes).
- **Undo** any throw (works across turn boundaries) and **Rematch / New game**.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

To build for production:

```bash
npm run build && npm run preview
```

## Project structure

- `src/dartboard.js` — geometry: builds the SVG segment paths and number labels.
- `src/components/Dartboard.vue` — the clickable board, emits `throw` events (incl. misses).
- `src/useGame.js` — game state and rules for both modes (X01 scoring/bust/checkouts
  and Cricket marks/points/closing), plus legs and undo.
- `src/components/GameSetup.vue` — game-mode and player configuration screen.
- `src/components/Scoreboard.vue` — per-player score cards (X01).
- `src/components/CricketBoard.vue` — the marks/points grid (Cricket).
- `src/App.vue` — ties setup, board and the mode-specific scoreboard together.
