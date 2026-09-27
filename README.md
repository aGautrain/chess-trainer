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
- A legal move that is off the line is rejected with feedback and counted as a mistake; the piece snaps back so you can try again. **Hint** highlights the piece to move.
- The checking logic is in `src/drill/engine.ts`, independent of the UI, and a unit test verifies every drill's line is legal.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` lints, tests and builds on every pull request, and deploys `dist/` to GitHub Pages on every push to `main`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

The build uses relative asset paths (`base: './'` in `vite.config.ts`), so it works at `https://<user>.github.io/chess-trainer/` or any other path.
