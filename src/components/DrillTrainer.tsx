import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Lightbulb, RotateCcw } from 'lucide-react'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { attemptMove, expectedMove, formatLine, positionAt, sideToMove } from '../drill/engine'
import { legalTargets } from '../drill/legalMoves'
import type { LineDrill } from '../drill/types'
import { judgeMove, type MoveJudgement } from '../engine/judge'
import { playUci, uciToSan } from '../engine/moves'
import { getEngine } from '../engine/stockfish'
import { formatScore } from '../engine/uci'
import { captureRingStyle, hintStyle, lastMoveStyle, moveDotStyle, selectedStyle } from './boardStyles'
import { EvalBar } from './EvalBar'
import { Concept, IconButton } from './PanelParts'
import { useBoardPosition } from './useBoardPosition'

const OPPONENT_DELAY_MS = 400
/** Think time for Stockfish's replies once the line is over. */
const OPPONENT_MOVETIME_MS = 500

type Feedback = { tone: 'info' | 'good' | 'bad' | 'done'; text: string }

const VERDICT_TEXT: Record<MoveJudgement['verdict'], string> = {
  best: 'the engine move',
  good: 'a good move',
  inaccuracy: 'an inaccuracy',
  mistake: 'a mistake',
  blunder: 'a blunder',
}

/** "Bb5 is a good move (+0.31)." or "Qh5 is a blunder (-3.10); Stockfish prefers Nf3." */
function describe(san: string, judgement: MoveJudgement, fenBefore: string): string {
  const text = `${san} is ${VERDICT_TEXT[judgement.verdict]} (${formatScore(judgement.playedScore)})`
  if (judgement.verdict === 'best' || !judgement.bestMove) return `${text}.`
  return `${text}; Stockfish prefers ${uciToSan(fenBefore, judgement.bestMove)}.`
}

export function DrillTrainer({ drill }: { drill: LineDrill }) {
  const [ply, setPly] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hint, setHint] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ tone: 'info', text: 'Your move.' })
  /** True while Stockfish judges an off-line move; the board is locked meanwhile. */
  const [checking, setChecking] = useState(false)
  const [engineError, setEngineError] = useState(false)
  /** Moves played against Stockfish after the line ends, in SAN; null until the user chooses to play on. */
  const [sparring, setSparring] = useState<string[] | null>(null)
  // Square of the piece picked up by click or drag; its legal moves are shown on the board.
  const [selected, setSelected] = useState<string | null>(null)
  /** Bumped on restart so late engine answers from the previous run are dropped. */
  const run = useRef(0)

  const game = useMemo(() => {
    const g = positionAt(drill, ply)
    for (const san of sparring ?? []) g.move(san)
    return g
  }, [drill, ply, sparring])
  const fen = game.fen()
  const { position, onDropOffBoard } = useBoardPosition(fen)
  const expected = useMemo(() => expectedMove(drill, ply), [drill, ply])
  const lastMove = useMemo(() => {
    if (sparring?.length) return game.history({ verbose: true }).at(-1) ?? null
    return ply > 0 ? expectedMove(drill, ply - 1) : null
  }, [drill, ply, sparring, game])
  const finished = expected === null
  const gameOver = game.isGameOver()
  const playerTurn = sideToMove(fen) === drill.playerColor
  const playerToMove = !checking && !gameOver && playerTurn && (!finished || sparring !== null)
  const targets = useMemo(() => (selected && playerToMove ? legalTargets(fen, selected) : []), [fen, selected, playerToMove])

  // Play the opponent's reply from the line automatically.
  useEffect(() => {
    if (finished || playerTurn) return
    const timer = setTimeout(() => setPly((p) => p + 1), OPPONENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finished, playerTurn, ply])

  // After the line, Stockfish plays the opponent.
  useEffect(() => {
    if (sparring === null || playerTurn || gameOver) return
    const runId = run.current
    let cancelled = false
    getEngine()
      .search(fen, { movetime: OPPONENT_MOVETIME_MS })
      .then(({ bestMove }) => {
        if (cancelled || runId !== run.current || !bestMove) return
        const played = playUci(fen, bestMove)
        if (played) setSparring((moves) => [...(moves ?? []), played.move.san])
      })
      .catch(() => setEngineError(true))
    return () => {
      cancelled = true
    }
  }, [sparring, playerTurn, gameOver, fen])

  /** Asks Stockfish about a move and reports back, unless the drill was restarted meanwhile. */
  function judge(fenBefore: string, uci: string, fenAfter: string, onResult: (j: MoveJudgement) => void, onError: () => void) {
    const runId = run.current
    judgeMove(getEngine(), fenBefore, uci, fenAfter)
      .then((j) => runId === run.current && onResult(j))
      .catch(() => {
        if (runId !== run.current) return
        setEngineError(true)
        onError()
      })
  }

  /** Plays `from`-`to` against the drill line, or against Stockfish after it; returns whether the board should keep the move. */
  function tryMove(from: string, to: string): boolean {
    if (sparring !== null) return playOn(from, to)

    const result = attemptMove(drill, ply, { from, to })
    switch (result.kind) {
      case 'illegal':
        return false
      case 'wrong': {
        const off = new Chess(fen)
        const move = off.move(result.san)
        const rejectPlain = () => {
          setMistakes((m) => m + 1)
          setFeedback({ tone: 'bad', text: `${result.san} is not the move here. Try again.` })
        }
        if (engineError) {
          rejectPlain()
          return false
        }
        setChecking(true)
        setFeedback({ tone: 'info', text: `${result.san} is off the line. Asking Stockfish…` })
        judge(
          fen,
          move.lan,
          off.fen(),
          (j) => {
            setChecking(false)
            if (j.acceptable) {
              setFeedback({ tone: 'info', text: `${describe(result.san, j, fen)} It is not the line though, try again.` })
            } else {
              setMistakes((m) => m + 1)
              setFeedback({ tone: 'bad', text: `${describe(result.san, j, fen)} Try again.` })
            }
          },
          () => {
            setChecking(false)
            rejectPlain()
          },
        )
        return false
      }
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
    if (!targetSquare) {
      onDropOffBoard()
      return false
    }
    if (!playerToMove) return false
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

  /** A free move against Stockfish after the line: always played, then judged. */
  function playOn(from: string, to: string): boolean {
    const played = playUci(fen, `${from}${to}q`) ?? playUci(fen, `${from}${to}`)
    if (!played) return false
    const { move } = played
    setSparring((moves) => [...(moves ?? []), move.san])
    setFeedback({ tone: 'info', text: `${move.san} played. Stockfish is judging it…` })
    judge(
      fen,
      move.lan,
      played.fen,
      (j) => setFeedback({ tone: j.acceptable ? 'good' : 'bad', text: describe(move.san, j, fen) }),
      () => setFeedback({ tone: 'info', text: 'Stockfish is unavailable, so moves are not judged.' }),
    )
    return true
  }

  function restart() {
    run.current++
    setPly(0)
    setMistakes(0)
    setHint(false)
    setChecking(false)
    setSparring(null)
    setSelected(null)
    setFeedback({ tone: 'info', text: 'Your move.' })
  }

  function showHint() {
    setHint(true)
  }

  let shownFeedback: Feedback = feedback
  if (finished && sparring === null) {
    const summary =
      mistakes === 0 ? 'Line complete with no mistakes!' : `Line complete with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`
    shownFeedback = { tone: 'done', text: summary }
  } else if (gameOver) {
    const text = game.isCheckmate()
      ? `Checkmate. ${playerTurn ? 'Stockfish wins.' : 'You win!'}`
      : 'The game is drawn.'
    shownFeedback = { tone: 'done', text }
  }

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
      <div className="board-area">
        <EvalBar fen={fen} orientation={drill.playerColor} />
        <div className="board">
          <Chessboard
            options={{
              id: drill.id,
              position,
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
      </div>
      <aside className="panel">
        <h2>{drill.name}</h2>
        <Concept text={drill.description} />
        <p className={`feedback feedback-${shownFeedback.tone}`} role="status" data-testid="feedback">
          {shownFeedback.text}
        </p>
        {engineError && <p className="engine-note">Stockfish could not load, so off-line moves count as mistakes.</p>}
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
          {sparring?.length ? ` | ${sparring.join(' ')}` : ''}
        </p>
        <div className="actions">
          {finished && sparring === null ? (
            <button type="button" onClick={() => setSparring([])} disabled={gameOver}>
              Play on vs Stockfish
            </button>
          ) : (
            <IconButton label="Hint" onClick={showHint} disabled={finished || !playerToMove || hint}>
              <Lightbulb aria-hidden size={20} />
            </IconButton>
          )}
          <IconButton label="Restart" onClick={restart}>
            <RotateCcw aria-hidden size={20} />
          </IconButton>
        </div>
      </aside>
    </section>
  )
}
