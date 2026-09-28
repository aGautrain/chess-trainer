import { useEffect, useRef, useState } from 'react'
import { evalBarState, type EvalBarState } from '../engine/evalBar'
import { getEngine } from '../engine/stockfish'

/** Search depth for the bar; shallow so it stays quick and does not hold up move judging on the shared engine. */
const EVAL_DEPTH = 12

/**
 * Stockfish's evaluation of `fen`, refreshed as the position changes.
 * Only one search runs at a time: positions that went by meanwhile are skipped.
 */
function useEvaluation(fen: string): { state: EvalBarState | null; error: boolean } {
  const [state, setState] = useState<EvalBarState | null>(null)
  const [error, setError] = useState(false)
  const latest = useRef(fen)
  const busy = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    latest.current = fen
    if (busy.current) return
    busy.current = true
    void (async () => {
      try {
        for (;;) {
          const target = latest.current
          const { score } = await getEngine().search(target, { depth: EVAL_DEPTH })
          if (!mounted.current) return
          if (latest.current === target) {
            setState(evalBarState(score, target.split(' ')[1] === 'b' ? 'b' : 'w'))
            return
          }
        }
      } catch {
        if (mounted.current) setError(true)
      } finally {
        busy.current = false
      }
    })()
  }, [fen])

  return { state, error }
}

/** Vertical bar beside the board, filled with white and black in proportion to Stockfish's evaluation. */
export function EvalBar({ fen, orientation }: { fen: string; orientation: 'white' | 'black' }) {
  const { state, error } = useEvaluation(fen)
  const whitePercent = state?.whitePercent ?? 50
  const labelAtBottom = state?.favours === orientation
  const description = error
    ? 'Stockfish evaluation unavailable'
    : state
      ? `Stockfish evaluation: ${state.label} for ${state.favours}`
      : 'Stockfish is evaluating'

  return (
    <div
      className={`eval-bar${error ? ' eval-bar-off' : ''}`}
      role="img"
      aria-label={description}
      title={description}
      data-testid="eval-bar"
    >
      <div
        className="eval-bar-white"
        style={{ height: `${whitePercent}%`, [orientation === 'white' ? 'bottom' : 'top']: 0 }}
      />
      {state && !error && (
        <span
          className={`eval-bar-label eval-bar-label-${state.favours} ${labelAtBottom ? 'eval-bar-label-bottom' : 'eval-bar-label-top'}`}
        >
          {state.label}
        </span>
      )}
    </div>
  )
}
