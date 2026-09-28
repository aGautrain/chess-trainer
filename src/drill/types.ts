export type Color = 'white' | 'black'

/** A piece type the player can be asked to win, in chess.js letters. */
export type GoalPiece = 'q' | 'r' | 'b' | 'n' | 'p'

/** When an engine drill ends in success. */
export type EngineGoal = { kind: 'checkmate' } | { kind: 'draw' } | { kind: 'win-piece'; piece: GoalPiece }

interface DrillBase {
  id: string
  name: string
  description: string
  /** Starting position in FEN. */
  fen: string
  /** The side the user plays. The other side's moves are played automatically. */
  playerColor: Color
}

/** A setup to drill by playing an exact line from it. */
export interface LineDrill extends DrillBase {
  mode: 'line'
  /** Expected moves in SAN, alternating sides, starting with the side to move in `fen`. */
  line: string[]
}

/** A position played out against Stockfish's best moves until the goal is met or missed. */
export interface EngineDrill extends DrillBase {
  mode: 'engine'
  goal: EngineGoal
}

export type Drill = LineDrill | EngineDrill

export type DrillMode = Drill['mode']
