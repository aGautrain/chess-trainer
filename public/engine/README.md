# Stockfish engine

`stockfish-19-lite-single.js` and `.wasm` are the single-threaded lite build of
[Stockfish.js 19](https://github.com/nmrugg/stockfish.js) (npm `stockfish@19.0.0`, `bin/`), copied unchanged.
They are vendored rather than installed because the npm package is about 160 MB of other builds.

The single-threaded build needs no cross-origin isolation headers, so it works on GitHub Pages.
It runs as a Web Worker; see `src/engine/stockfish.ts`.

Stockfish is licensed under the GNU GPL v3, see `COPYING.txt`.
To upgrade, copy the same two files from a newer `stockfish` package and update `ENGINE_URL`.
