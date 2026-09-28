# Chess Trainer

Drill specific chess setups in the browser. Each drill is a starting position (FEN) plus the exact line of moves to play from it. You play one side; the other side's replies are played automatically, and every move you make is checked against the line. Everything runs client-side, with no server.

Built with Vite, React, TypeScript, [chess.js](https://github.com/jhlywa/chess.js) for the rules and [react-chessboard](https://github.com/Clariity/react-chessboard) for the board.

## Getting started

```sh
npm install
npm run dev      # start the dev server
npm test         # run unit tests (Vitest)
npm run lint     # lint (oxlint)
npm run build    # type-check and build the static site into dist/
npm run preview  # serve the production build locally
```

## How a drill works

Drills live in `src/drill/drills.ts`:

```ts
{
  id: 'italian-giuoco-piano',
  name: 'Italian Game: Giuoco Piano main line',
  description: '...',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playerColor: 'white',
  line: ['Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', /* ... */],
}
```

- `line` is in SAN and alternates sides, starting with the side to move in `fen`.
- If the side to move is not `playerColor`, the first move is played automatically.
- A legal move that is off the line is judged by Stockfish (see below). The piece snaps back either way so you can play the line move. **Hint** highlights the piece to move.
- The checking logic is in `src/drill/engine.ts`, independent of the UI, and a unit test verifies every drill's line is legal.

## Engine checks

[Stockfish 19](https://github.com/nmrugg/stockfish.js) (the 1.8 MB single-threaded lite WASM build, GPLv3) runs in a Web Worker, vendored in `public/engine/`.

- An off-line move is compared with the engine's best move at depth 12, using Lichess' win-chance thresholds: *best* or *good* moves are accepted as sound (not a mistake, but the drill still asks for the line move); *inaccuracies*, *mistakes* and *blunders* count as mistakes, with the engine's preferred move shown.
- When the line is finished, **Play on vs Stockfish** continues the game from the final position with the engine playing the other side, and each of your moves is judged.
- If the engine fails to load, off-line moves fall back to counting as mistakes.

Code: `src/engine/stockfish.ts` (UCI over the worker), `src/engine/judge.ts` (classification).

## Spaced review

Finishing a drill schedules its next review with a small SM-2 scheduler (`src/review/scheduler.ts`), stored in `localStorage` under `chess-trainer:reviews:v1`.

- Any mistake: *again*, due in 10 minutes and the interval resets.
- No mistakes but a hint or a sound off-line move: *hard*, the interval grows slowly.
- Clean run: *good*, intervals go 1, 6, then about 2.5× each time.

The **Reviews** list under the board shows each drill with when it is next due.

## Custom drills

Click **New drill** to create your own:

- **Starting position**: a FEN, or leave it empty for the standard starting position. A full PGN with a `[FEN]` header works too.
- **Line to drill**: PGN movetext (`1. e4 c5 2. Nf3 d6`), bare SAN (`e4 c5 Nf3`) or a pasted PGN. Comments, NAGs and variations are ignored; only the main line is kept.
- **Play as**: White, Black, or the side to move.

The position and every move are validated with chess.js as you type, with the first problem shown under its field. Saved drills are stored in your browser's `localStorage` (key `chess-trainer.customDrills.v1`), listed under **My drills**, and can be edited or deleted there. They stay on this device and browser only. Parsing lives in `src/drill/importer.ts` and storage in `src/drill/storage.ts`.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` lints, tests and builds on every pull request, and deploys `dist/` to GitHub Pages on every push to `main`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

The build uses relative asset paths (`base: './'` in `vite.config.ts`), so it works at `https://<user>.github.io/chess-trainer/` or any other path.
