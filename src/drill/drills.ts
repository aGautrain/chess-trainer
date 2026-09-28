import type { Color, Drill, EngineDrill, EngineGoal, LineDrill, Theme } from './types'

export const italianGame: LineDrill = {
  id: 'italian-giuoco-piano',
  mode: 'line',
  name: 'Italian Game: Giuoco Piano main line',
  description:
    'After 1.e4 e5 2.Nf3 Nc6, play the classical c3 and d4 plan as White and meet the Bb4+ check.',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playerColor: 'white',
  line: ['Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5'],
  themes: ['opening'],
}

/** A classic basic mate: White has the material to force checkmate against a bare king, Stockfish defends. The pieces start on random squares. */
function mateDrill(id: string, name: string, description: string, fen: string): EngineDrill {
  return {
    id,
    mode: 'engine',
    name,
    description,
    fen,
    playerColor: 'white',
    goal: { kind: 'checkmate' },
    randomize: true,
    themes: ['endgame', 'basic-mate'],
  }
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

interface ClassicSpec {
  id: string
  name: string
  description: string
  /** The textbook position; each run starts from a shuffle of it that Stockfish rates about the same. */
  fen: string
  playerColor: Color
  goal: EngineGoal
  themes: Theme[]
}

const classic = (spec: ClassicSpec): EngineDrill => ({ mode: 'engine', randomize: true, ...spec, themes: ['endgame', ...spec.themes] })

const checkmate: EngineGoal = { kind: 'checkmate' }
const draw: EngineGoal = { kind: 'draw' }

/**
 * Classic endgames played out against Stockfish from shuffled positions: convert the win, hold the draw, or win material.
 * Each base position was checked with Stockfish to be won (or drawn, for the draw goal) for the player.
 */
export const classicDrills: EngineDrill[] = [
  classic({
    id: 'classic-kp-k',
    name: 'King and pawn against king',
    description: 'Lead with your king, take the opposition, and escort the pawn to promotion, then mate.',
    fen: '8/8/3k4/8/4K3/4P3/8/8 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['pawn-ending'],
  }),
  classic({
    id: 'classic-kp-k-black',
    name: 'King and pawn against king, as Black',
    description: 'The same technique with the board turned around: king in front of the pawn, opposition, promote and mate.',
    fen: '8/8/4p3/4k3/8/3K4/8/8 b - - 0 1',
    playerColor: 'black',
    goal: checkmate,
    themes: ['pawn-ending'],
  }),
  classic({
    id: 'classic-k-kp-draw',
    name: 'Stop the pawn: king against king and pawn',
    description: 'Keep your king in front of the pawn and take the opposition at the right moment to hold the draw.',
    fen: '8/8/8/4k3/8/4P3/4K3/8 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['pawn-ending'],
  }),
  classic({
    id: 'classic-lucena',
    name: 'Rook and pawn against rook: the Lucena',
    description: 'Get your king out from in front of the pawn and "build a bridge" with the rook to shield it from checks.',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['rook-ending'],
  }),
  classic({
    id: 'classic-philidor',
    name: 'Rook against rook and pawn: the Philidor',
    description: 'Keep your rook on the third rank until the pawn advances, then check from behind to hold the draw.',
    fen: '3k4/7R/8/3PK3/8/8/8/r7 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['rook-ending'],
  }),
  classic({
    id: 'classic-kr-kp',
    name: 'Rook against pawn',
    description: 'Cut the enemy king off with the rook and bring your own king back in time to stop the pawn.',
    fen: '8/8/8/8/3pk3/8/5K2/R7 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['rook-ending'],
  }),
  classic({
    id: 'classic-krr-kr',
    name: 'Two rooks against rook',
    description: 'Trade a pair of rooks or use the extra rook to force the king to the edge.',
    fen: '8/8/8/3k4/8/2r5/8/R3K2R w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['rook-ending'],
  }),
  classic({
    id: 'classic-krb-kr',
    name: 'Rook against rook and bishop',
    description: 'A theoretical draw that is easy to lose: keep your king away from the edge and check from a distance.',
    fen: '8/8/8/3k4/8/8/1r6/4KB1R b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['rook-ending', 'minor-pieces'],
  }),
  classic({
    id: 'classic-kb-kr',
    name: 'Bishop against rook',
    description: 'Run your king to the corner the bishop cannot cover and hold on to the draw.',
    fen: '8/8/4kb2/8/8/8/3K4/5R2 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['rook-ending', 'minor-pieces'],
  }),
  classic({
    id: 'classic-kn-kr',
    name: 'Knight against rook',
    description: 'Keep the knight next to your king, away from the edges, so the rook can never cut it off.',
    fen: '8/8/4kn2/8/8/8/3K4/5R2 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['rook-ending', 'minor-pieces'],
  }),
  classic({
    id: 'classic-kq-kr',
    name: 'Queen against rook',
    description: 'Push the king and rook to the edge, reach the Philidor position, and win the rook with forks.',
    fen: '8/8/2k5/3r4/8/8/4Q3/4K3 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['queen-ending'],
  }),
  classic({
    id: 'classic-kq-kr-win-rook',
    name: 'Queen against rook: win the rook',
    description: 'Separate the rook from the king, then pick it up with a fork or a skewer.',
    fen: '8/8/2k5/3r4/8/8/8/4K2Q w - - 0 1',
    playerColor: 'white',
    goal: { kind: 'win-piece', piece: 'r' },
    themes: ['queen-ending'],
  }),
  classic({
    id: 'classic-kq-kr-black',
    name: 'Queen against rook, as Black',
    description: 'Push the king and rook to the edge with checks, then win the rook with a fork and mate.',
    fen: '4k3/4q3/8/8/3R4/2K5/8/8 b - - 0 1',
    playerColor: 'black',
    goal: checkmate,
    themes: ['queen-ending'],
  }),
  classic({
    id: 'classic-kp7-kq-draw',
    name: 'Rook pawn against queen',
    description: 'With a rook pawn on the seventh, head for the corner: taking the pawn away from you is stalemate.',
    fen: '7K/8/8/8/8/5Q2/p7/1k6 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['queen-ending'],
  }),
  classic({
    id: 'classic-kq-kb',
    name: 'Queen against bishop',
    description: 'Drive the king to the edge; the bishop falls to a fork sooner or later.',
    fen: '8/8/3kb3/8/8/8/2Q5/4K3 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['queen-ending', 'minor-pieces'],
  }),
  classic({
    id: 'classic-kq-kn-win-knight',
    name: 'Queen against knight: win the knight',
    description: 'Knights are clumsy near their king. Restrict it with the queen and win it with a fork or a pin.',
    fen: '8/8/3kn3/8/8/8/2Q5/4K3 w - - 0 1',
    playerColor: 'white',
    goal: { kind: 'win-piece', piece: 'n' },
    themes: ['queen-ending', 'minor-pieces'],
  }),
  classic({
    id: 'classic-kbp-k',
    name: 'Bishop and pawn against king',
    description: 'Shepherd the pawn with king and bishop and promote it, then mate with the new queen.',
    fen: '8/8/8/3k4/8/3KP3/3B4/8 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['minor-pieces'],
  }),
  classic({
    id: 'classic-knp-k',
    name: 'Knight and pawn against king',
    description: 'Keep the knight guarding the pawn and your king in front of it to promote, then mate.',
    fen: '8/8/8/4k3/8/4K3/4P3/4N3 w - - 0 1',
    playerColor: 'white',
    goal: checkmate,
    themes: ['minor-pieces'],
  }),
  classic({
    id: 'classic-wrong-bishop',
    name: 'The wrong bishop',
    description: 'Against a rook pawn and a bishop that cannot cover the promotion square, reach the corner and hold.',
    fen: 'k7/8/8/P7/8/2K1B3/8/8 b - - 0 1',
    playerColor: 'black',
    goal: draw,
    themes: ['minor-pieces'],
  }),
  classic({
    id: 'classic-kr-kp-win-pawn',
    name: 'Rook against pawn: win the pawn',
    description: 'Get behind the pawn with the rook and bring your king back before it can promote.',
    fen: '8/8/8/8/3pk3/8/5K2/R7 w - - 0 1',
    playerColor: 'white',
    goal: { kind: 'win-piece', piece: 'p' },
    themes: ['rook-ending'],
  }),
]

export const drills: Drill[] = [italianGame, ...mateDrills, ...classicDrills]

/** The drills starred into My drills on a first visit, so the sidebar starts short. */
export const starterDrills: Drill[] = [italianGame, ...mateDrills]
