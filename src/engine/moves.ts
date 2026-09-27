import { Chess, type Move } from 'chess.js'

/** Plays a UCI move such as "e2e4" or "b7b8n" on a copy of `fen`. Returns null if it is illegal. */
export function playUci(fen: string, uci: string): { move: Move; fen: string } | null {
  const game = new Chess(fen)
  try {
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return { move, fen: game.fen() }
  } catch {
    return null
  }
}

/** SAN for a UCI move in `fen`, falling back to the UCI text if it is illegal. */
export function uciToSan(fen: string, uci: string): string {
  return playUci(fen, uci)?.move.san ?? uci
}
