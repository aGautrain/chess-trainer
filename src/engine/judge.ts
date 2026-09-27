import type { SearchLimits, StockfishEngine } from './stockfish'
import { negate, scoreToCp, type Score } from './uci'

export type Verdict = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export interface MoveJudgement {
  verdict: Verdict
  /** True when the move keeps the position: best or good. */
  acceptable: boolean
  /** The engine's preferred move in UCI notation. */
  bestMove: string | null
  /** Evaluation before the move, from the mover's side. */
  bestScore: Score
  /** Evaluation after the move, from the mover's side. */
  playedScore: Score
  /** How much of the mover's winning chances the move gave away, 0 to 100. */
  winChanceLoss: number
}

/** Lichess' centipawn to win-chance curve, scaled to 0..100 for the side the score belongs to. */
export function winChance(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1)
}

// Same thresholds Lichess uses for its annotations, on the 0..100 scale.
const THRESHOLDS: [Verdict, number][] = [
  ['blunder', 30],
  ['mistake', 20],
  ['inaccuracy', 10],
]

/** Classifies a move from the evaluations before and after it, both from the mover's side. */
export function classify(bestScore: Score, playedScore: Score, playedIsBest: boolean): MoveJudgement {
  const loss = Math.max(0, winChance(scoreToCp(bestScore)) - winChance(scoreToCp(playedScore)))
  let verdict: Verdict = playedIsBest ? 'best' : 'good'
  if (!playedIsBest) {
    for (const [name, threshold] of THRESHOLDS) {
      if (loss >= threshold) {
        verdict = name
        break
      }
    }
  }
  return {
    verdict,
    acceptable: verdict === 'best' || verdict === 'good',
    bestMove: null,
    bestScore,
    playedScore,
    winChanceLoss: Math.round(loss * 10) / 10,
  }
}

/**
 * Asks the engine how good `uciMove` was.
 * `fenBefore` is the position the user moved in, `fenAfter` the position their move produced.
 */
export async function judgeMove(
  engine: StockfishEngine,
  fenBefore: string,
  uciMove: string,
  fenAfter: string,
  limits: SearchLimits = { depth: 12 },
): Promise<MoveJudgement> {
  const before = await engine.search(fenBefore, limits)
  const playedIsBest = before.bestMove === uciMove
  // The best move needs no second search: its score is the one we already have.
  const playedScore = playedIsBest ? before.score : negate((await engine.search(fenAfter, limits)).score)
  return { ...classify(before.score, playedScore, playedIsBest), bestMove: before.bestMove }
}
