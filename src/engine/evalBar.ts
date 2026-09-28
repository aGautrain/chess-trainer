import { winChance } from './judge'
import type { Score } from './uci'

export interface EvalBarState {
  /** Share of the bar filled with white, 0 to 100. */
  whitePercent: number
  /** Short label as chess.com shows it: "0.5", "M3", "1-0". */
  label: string
  /** The side the evaluation favours; the label sits at that side's end of the bar. */
  favours: 'white' | 'black'
}

/** Turns a score from the side to move's point of view into what the eval bar shows. */
export function evalBarState(score: Score, turn: 'w' | 'b'): EvalBarState {
  if (score.kind === 'mate') {
    // Mate in 0: the side to move is already checkmated.
    const moverWins = score.value > 0
    const whiteWins = moverWins === (turn === 'w')
    return {
      whitePercent: whiteWins ? 100 : 0,
      label: score.value === 0 ? (whiteWins ? '1-0' : '0-1') : `M${Math.abs(score.value)}`,
      favours: whiteWins ? 'white' : 'black',
    }
  }
  const whiteCp = turn === 'w' ? score.value : -score.value
  return {
    whitePercent: winChance(whiteCp),
    label: (Math.abs(whiteCp) / 100).toFixed(1),
    favours: whiteCp >= 0 ? 'white' : 'black',
  }
}
