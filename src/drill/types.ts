export type Color = 'white' | 'black'

/** A setup to drill: a starting position and the exact line to play from it. */
export interface Drill {
  id: string
  name: string
  description: string
  /** Starting position in FEN. */
  fen: string
  /** The side the user plays. The other side's moves are played automatically. */
  playerColor: Color
  /** Expected moves in SAN, alternating sides, starting with the side to move in `fen`. */
  line: string[]
}
