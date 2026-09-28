import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { attemptMove, expectedMove, formatLine, positionAt, sideToMove } from '../drill/engine'
import { legalTargets } from '../drill/legalMoves'
import type { Drill } from '../drill/types'

const OPPONENT_DELAY_MS = 400

type Feedback = { tone: 'info' | 'good' | 'bad' | 'done'; text: string }

const lastMoveStyle: CSSProperties = { background: 'rgba(255, 214, 0, 0.45)' }
const hintStyle: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(40, 140, 255, 0.85)' }
const selectedStyle: CSSProperties = { background: 'rgba(20, 85, 30, 0.5)' }
const moveDotStyle: CSSProperties = {
  background: 'radial-gradient(circle, rgba(20, 85, 30, 0.5) 22%, transparent 24%)',
  cursor: 'pointer',
}
const captureRingStyle: CSSProperties = {
  background: 'radial-gradient(circle, transparent 72%, rgba(20, 85, 30, 0.5) 74%)',
  cursor: 'pointer',
}

export function DrillTrainer({ drill }: { drill: Drill }) {
  const [ply, setPly] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hint, setHint] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ tone: 'info', text: 'Your move.' })
  // Square of the piece picked up by click or drag; its legal moves are shown on the board.
  const [selected, setSelected] = useState<string | null>(null)

  const fen = useMemo(() => positionAt(drill, ply).fen(), [drill, ply])
  const expected = useMemo(() => expectedMove(drill, ply), [drill, ply])
  const lastMove = useMemo(() => (ply > 0 ? expectedMove(drill, ply - 1) : null), [drill, ply])
  const finished = expected === null
  const playerToMove = !finished && sideToMove(fen) === drill.playerColor
  const targets = useMemo(() => (selected && playerToMove ? legalTargets(fen, selected) : []), [fen, selected, playerToMove])

  // Play the opponent's reply from the line automatically.
  useEffect(() => {
    if (finished || playerToMove) return
    const timer = setTimeout(() => setPly((p) => p + 1), OPPONENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finished, playerToMove, ply])

  /** Plays `from`-`to` against the drill line; returns whether the board should keep the move. */
  function tryMove(from: string, to: string): boolean {
    const result = attemptMove(drill, ply, { from, to })
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

  function selectable(square: string): boolean {
    return playerToMove && legalTargets(fen, square).length > 0
  }

  function onPieceDrag({ square }: PieceHandlerArgs) {
    setSelected(square)
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    // Dropping a piece back where it was keeps it selected, so the move can be finished by clicking.
    if (targetSquare === sourceSquare) return false
    setSelected(null)
    if (!playerToMove || !targetSquare) return false
    return tryMove(sourceSquare, targetSquare)
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (selected && targets.some((t) => t.to === square)) {
      setSelected(null)
      tryMove(selected, square)
    } else if (square !== selected && selectable(square)) {
      setSelected(square)
    } else {
      setSelected(null)
    }
  }

  function restart() {
    setPly(0)
    setMistakes(0)
    setHint(false)
    setSelected(null)
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
  if (selected && playerToMove) {
    squareStyles[selected] = { ...squareStyles[selected], ...selectedStyle }
    for (const { to, capture } of targets) squareStyles[to] = { ...squareStyles[to], ...(capture ? captureRingStyle : moveDotStyle) }
  }

  return (
    <section className="trainer">
      <div className="board">
        <Chessboard
          options={{
            id: drill.id,
            position: fen,
            boardOrientation: drill.playerColor,
            onPieceDrag,
            onPieceDrop,
            onPieceDragCancel: () => setSelected(null),
            onSquareClick,
            canDragPiece: ({ square }) => square !== null && selectable(square),
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
