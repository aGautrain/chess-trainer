import type { Drill, EngineDrill, LineDrill } from './types'

export const italianGame: LineDrill = {
  id: 'italian-giuoco-piano',
  mode: 'line',
  name: 'Italian Game: Giuoco Piano main line',
  description:
    'After 1.e4 e5 2.Nf3 Nc6, play the classical c3 and d4 plan as White and meet the Bb4+ check.',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playerColor: 'white',
  line: ['Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5'],
}

/** A classic basic mate: White has the material to force checkmate against a bare king, Stockfish defends. */
function mateDrill(id: string, name: string, description: string, fen: string): EngineDrill {
  return { id, mode: 'engine', name, description, fen, playerColor: 'white', goal: { kind: 'checkmate' } }
}

export const mateDrills: EngineDrill[] = [
  mateDrill(
    'mate-kq-k',
    'Mate with king and queen',
    'Use the queen to box the king toward an edge, bring your own king up, and mate without stalemating.',
    '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
  ),
  mateDrill(
    'mate-krr-k',
    'Mate with two rooks',
    'Roll the king to the edge with the two rooks taking turns, the "ladder" mate. Your king is not needed.',
    '8/8/3k4/8/8/8/8/R3K2R w - - 0 1',
  ),
  mateDrill(
    'mate-kr-k',
    'Mate with king and rook',
    'Shrink the box with the rook and use the opposition of the kings to push the king to the edge.',
    '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
  ),
  mateDrill(
    'mate-kbb-k',
    'Mate with two bishops',
    'Side by side, the bishops build a wall; drive the king into a corner with your king helping.',
    '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
  ),
  mateDrill(
    'mate-kbn-k',
    'Mate with bishop and knight',
    "The hardest basic mate: push the king into a corner of the bishop's colour. It takes up to 33 moves.",
    '8/8/8/4k3/8/8/8/1N2KB2 w - - 0 1',
  ),
]

export const drills: Drill[] = [italianGame, ...mateDrills]
