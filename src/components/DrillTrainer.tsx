import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'
import { attemptMove, expectedMove, formatLine, positionAt, sideToMove } from '../drill/engine'
import type { Drill } from '../drill/types'

const OPPONENT_DELAY_MS = 400

type Feedback = { tone: 'info' | 'good' | 'bad' | 'done'; text: string }

const lastMoveStyle: CSSProperties = { background: 'rgba(255, 214, 0, 0.45)' }
const hintStyle: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(40, 140, 255, 0.85)' }

export function DrillTrainer({ drill }: { drill: Drill }) {
  const [ply, setPly] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hint, setHint] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ tone: 'info', text: 'Your move.' })

  const fen = useMemo(() => positionAt(drill, ply).fen(), [drill, ply])
  const expected = useMemo(() => expectedMove(drill, ply), [drill, ply])
  const lastMove = useMemo(() => (ply > 0 ? expectedMove(drill, ply - 1) : null), [drill, ply])
  const finished = expected === null
  const playerToMove = !finished && sideToMove(fen) === drill.playerColor

  // Play the opponent's reply from the line automatically.
  useEffect(() => {
    if (finished || playerToMove) return
    const timer = setTimeout(() => setPly((p) => p + 1), OPPONENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finished, playerToMove, ply])

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!playerToMove || !targetSquare) return false
    const result = attemptMove(drill, ply, { from: sourceSquare, to: targetSquare })
    switch (result.kind) {
      case 'illegal':
        return false
      case 'wrong':
        setMistakes((m) => m + 1)
        setFeedback({ tone: 'bad', text: `${result.san} is not the move here. Try again.` })
        return false
      case 'correct':
        setHint(false)
        setFeedback({ tone: 'good', text: `${result.san} is correct.` })
        setPly(ply + 1)
        return true
    }
  }

  function restart() {
    setPly(0)
    setMistakes(0)
    setHint(false)
    setFeedback({ tone: 'info', text: 'Your move.' })
  }

  const shownFeedback: Feedback = finished
    ? {
        tone: 'done',
        text: mistakes === 0 ? 'Line complete with no mistakes!' : `Line complete with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`,
      }
    : feedback

  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = lastMoveStyle
    squareStyles[lastMove.to] = lastMoveStyle
  }
  if (hint && expected && playerToMove) squareStyles[expected.from] = { ...squareStyles[expected.from], ...hintStyle }

  return (
    <section className="trainer">
      <div className="board">
        <Chessboard
          options={{
            id: drill.id,
            position: fen,
            boardOrientation: drill.playerColor,
            onPieceDrop,
            allowDragging: playerToMove,
            squareStyles,
          }}
        />
      </div>
      <aside className="panel">
        <h2>{drill.name}</h2>
        <p className="description">{drill.description}</p>
        <p className={`feedback feedback-${shownFeedback.tone}`} role="status" data-testid="feedback">
          {shownFeedback.text}
        </p>
        <dl className="stats">
          <dt>Progress</dt>
          <dd data-testid="progress">
            {Math.min(ply, drill.line.length)} / {drill.line.length} moves
          </dd>
          <dt>Mistakes</dt>
          <dd data-testid="mistakes">{mistakes}</dd>
        </dl>
        <p className="moves" data-testid="moves">
          {formatLine(drill, ply) || 'No moves played yet.'}
        </p>
        <div className="actions">
          <button type="button" onClick={() => setHint(true)} disabled={!playerToMove || hint}>
            Hint
          </button>
          <button type="button" onClick={restart}>
            Restart
          </button>
        </div>
      </aside>
    </section>
  )
}
