import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Lightbulb, RotateCcw } from 'lucide-react'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { boardTheme } from './boardTheme'
import { DrillTimer } from './DrillTimer'
import { attemptMove, expectedMove, sideToMove } from '../drill/engine'
import { legalTargets } from '../drill/legalMoves'
import type { LineDrill } from '../drill/types'
import { judgeMove, type MoveJudgement } from '../engine/judge'
import { playUci, uciToSan } from '../engine/moves'
import { getEngine } from '../engine/stockfish'
import { formatScore } from '../engine/uci'
import { captureRingStyle, hintArrowColor, hintStyle, lastMoveStyle, moveDotStyle, selectedStyle } from './boardStyles'
import { EvalBar } from './EvalBar'
import { HistoryButtons, MoveHistory } from './MoveHistory'
import { Concept, IconButton, PanelTitle } from './PanelParts'
import { useDrillTimer } from '../timer/useDrillTimer'
import { usePhoneLayout } from '../usePhoneLayout'
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
  const phone = usePhoneLayout()
  const [ply, setPly] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  /** 0 without a hint, 1 marks the piece to move, 2 also draws the move as an arrow. */
  const [hint, setHint] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ tone: 'info', text: 'Your move.' })
  /** True while Stockfish judges an off-line move; the board is locked meanwhile. */
  const [checking, setChecking] = useState(false)
  const [engineError, setEngineError] = useState(false)
  /** Moves played against Stockfish after the line ends, in SAN; null until the user chooses to play on. */
  const [sparring, setSparring] = useState<string[] | null>(null)
  /** How many moves the board shows while stepping back through them; null follows the game. */
  const [view, setView] = useState<number | null>(null)
  /** The view a move was last tried in, so its feedback shows there instead of the viewing note. */
  const [feedbackView, setFeedbackView] = useState<number | null>(null)
  // Square of the piece picked up by click or drag; its legal moves are shown on the board.
  const [selected, setSelected] = useState<string | null>(null)
  /** Bumped on restart so late engine answers from the previous run are dropped. */
  const run = useRef(0)

  /** Every move played: the line so far, then the moves against Stockfish. */
  const history = useMemo(() => [...drill.line.slice(0, ply), ...(sparring ?? [])], [drill, ply, sparring])
  const shown = view ?? history.length
  /** True when the board shows the latest move rather than an earlier one. */
  const live = shown === history.length
  /** The position on the board, which is the live one unless the player stepped back. */
  const game = useMemo(() => {
    const g = new Chess(drill.fen)
    for (const san of history.slice(0, shown)) g.move(san)
    return g
  }, [drill.fen, history, shown])
  const fen = game.fen()
  const { position, onDropOffBoard } = useBoardPosition(fen)
  /** The line's move at the shown position, or null past the end of the line. */
  const expected = useMemo(() => expectedMove(drill, shown), [drill, shown])
  const lastMove = shown ? (game.history({ verbose: true }).at(-1) ?? null) : null
  const finished = ply >= drill.line.length
  const gameOver = game.isGameOver()
  const playerTurn = sideToMove(fen) === drill.playerColor
  const playerToMove = !checking && !gameOver && playerTurn && (expected !== null || sparring !== null)
  const targets = useMemo(() => (selected && playerToMove ? legalTargets(fen, selected) : []), [fen, selected, playerToMove])
  // Thinking time for the line; moves played on against Stockfish after it are not timed.
  const timer = useDrillTimer(playerToMove && !finished, fen)

  // Play the opponent's reply from the line automatically.
  useEffect(() => {
    if (!live || finished || playerTurn) return
    const timer = setTimeout(() => setPly((p) => p + 1), OPPONENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [live, finished, playerTurn, ply])

  // After the line, Stockfish plays the opponent. Stepping back stops its search; it starts over on returning to the latest move.
  useEffect(() => {
    if (!live || sparring === null || playerTurn || gameOver) return
    const runId = run.current
    let cancelled = false
    const abort = new AbortController()
    getEngine()
      .search(fen, { movetime: OPPONENT_MOVETIME_MS }, abort.signal)
      .then(({ bestMove }) => {
        if (cancelled || runId !== run.current || !bestMove) return
        const played = playUci(fen, bestMove)
        if (played) setSparring((moves) => [...(moves ?? []), played.move.san])
      })
      .catch(() => setEngineError(true))
    return () => {
      cancelled = true
      abort.abort()
    }
  }, [live, sparring, playerTurn, gameOver, fen])

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

  /**
   * Plays `from`-`to` on the shown position, against the drill line or against Stockfish after it; returns whether the
   * board should keep the move. A move kept from an earlier position drops the moves after it.
   */
  function tryMove(from: string, to: string): boolean {
    setFeedbackView(view)
    if (expected === null) return playOn(from, to)

    const result = attemptMove(drill, shown, { from, to })
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
        setHint(0)
        setFeedback({ tone: 'good', text: `${result.san} is correct.` })
        setPly(shown + 1)
        setSparring(null)
        setView(null)
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
    setSparring([...(sparring ?? []).slice(0, shown - ply), move.san])
    setView(null)
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
    setHint(0)
    setChecking(false)
    setSparring(null)
    setView(null)
    setSelected(null)
    setFeedback({ tone: 'info', text: 'Your move.' })
    timer.reset()
  }

  function showHint() {
    setHint((h) => Math.min(h + 1, 2))
  }

  /** Shows the position after the first `n` moves; the latest one returns to the game. */
  function showMove(n: number) {
    const clamped = Math.max(0, Math.min(history.length, n))
    setView(clamped === history.length ? null : clamped)
    setSelected(null)
    setHint(0)
  }

  let shownFeedback: Feedback = feedback
  if (!live && feedbackView !== view) {
    const where = shown === 0 ? 'the start position' : `move ${shown} of ${history.length}`
    shownFeedback = { tone: 'info', text: `Viewing ${where}. ${playerToMove ? 'Play a move to continue from here, or' : phone ? 'Tap' : 'Press'} ${phone ? '›' : '→'} to go forward.` }
  } else if (finished && sparring === null) {
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
  const arrows =
    hint === 2 && expected && playerToMove ? [{ startSquare: expected.from, endSquare: expected.to, color: hintArrowColor }] : []
  if (selected && playerToMove) {
    squareStyles[selected] = { ...squareStyles[selected], ...selectedStyle }
    for (const { to, capture } of targets) squareStyles[to] = { ...squareStyles[to], ...(capture ? captureRingStyle : moveDotStyle) }
  }

  // Hint and Restart sit in the panel, or on phones right under the board with the move arrows, bigger and labelled.
  const actions = (
    <>
      {finished && sparring === null ? (
        <button type="button" onClick={() => setSparring([])} disabled={!live || gameOver}>
          Play on vs Stockfish
        </button>
      ) : (
        <IconButton labelled={phone} label={hint ? 'Show best move' : 'Hint'} onClick={showHint} disabled={expected === null || !playerToMove || hint === 2}>
          <Lightbulb aria-hidden size={20} />
        </IconButton>
      )}
      <IconButton labelled={phone} label="Restart" onClick={restart}>
        <RotateCcw aria-hidden size={20} />
      </IconButton>
    </>
  )

  return (
    <section className="trainer">
      <div className="board-column">
        <div className="board-area">
          <EvalBar fen={fen} orientation={drill.playerColor} />
          <div className="board">
            <Chessboard
              options={{
                ...boardTheme,
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
                arrows,
              }}
            />
          </div>
        </div>
        {phone && (
          <div className="board-controls">
            <HistoryButtons shown={shown} total={history.length} onShow={showMove} size={22} />
            {actions}
          </div>
        )}
      </div>
      <aside className="panel">
        <PanelTitle name={drill.name} phone={phone} />
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
        <MoveHistory fen={drill.fen} moves={history} shown={shown} onShow={showMove} lineEnd={sparring?.length ? ply : undefined} nav={!phone} />
        {!phone && <div className="actions">{actions}</div>}
      </aside>
      <DrillTimer elapsed={timer.elapsed} running={timer.running} done={finished} />
    </section>
  )
}
