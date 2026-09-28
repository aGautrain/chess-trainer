import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { formatMoves, sideToMove } from '../drill/engine'
import { goalLabel, goalStatus } from '../drill/goals'
import { randomizePosition } from '../drill/randomize'
import { legalTargets } from '../drill/legalMoves'
import type { EngineDrill } from '../drill/types'
import { playUci } from '../engine/moves'
import { getEngine } from '../engine/stockfish'
import type { EngineIdentity } from '../engine/uci'
import { formatDue } from '../review/format'
import { gradeFromRun } from '../review/scheduler'
import { useNow, useReviews } from '../review/useReviews'
import { captureRingStyle, hintStyle, lastMoveStyle, moveDotStyle, selectedStyle } from './boardStyles'
import { EvalBar } from './EvalBar'

/** Think time for Stockfish's moves. */
const ENGINE_MOVETIME_MS = 1000
/** Think time for the hint. */
const HINT_MOVETIME_MS = 500
/** Search depth used to compare a shuffled position with the original. */
const SHUFFLE_DEPTH = 10

/** One quiet line with the engine and the settings its moves are searched with. */
function engineParams(identity: EngineIdentity | null, depth: number | null): string {
  const parts = [identity?.name ?? 'Stockfish', 'best move', `${ENGINE_MOVETIME_MS / 1000} s per move`]
  if (depth) parts.push(`depth ${depth}`)
  const { Threads, Hash, 'Skill Level': skill } = identity?.options ?? {}
  if (Threads) parts.push(`${Threads} thread${Threads === '1' ? '' : 's'}`)
  if (Hash) parts.push(`${Hash} MB hash`)
  if (skill) parts.push(`skill ${skill}`)
  return parts.join(' · ')
}

type Feedback = { tone: 'info' | 'good' | 'bad' | 'done'; text: string }

/** Plays a position out against Stockfish's best moves until the drill's goal is met or can no longer be. */
export function EngineDrillTrainer({ drill }: { drill: EngineDrill }) {
  /** The position this run starts from: the drill's own, or a shuffle of it. Null while shuffling. */
  const [startFen, setStartFen] = useState<string | null>(drill.randomize ? null : drill.fen)
  /** Bumped to ask for a new shuffle. */
  const [shuffle, setShuffle] = useState(0)
  /** Moves played from the drill position, in SAN. */
  const [moves, setMoves] = useState<string[]>([])
  /** The square of the piece Stockfish would move, for the position it was asked about. */
  const [hint, setHint] = useState<{ fen: string; square: string } | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [engineError, setEngineError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [identity, setIdentity] = useState<EngineIdentity | null>(null)
  /** Depth Stockfish reached on its last move. */
  const [lastDepth, setLastDepth] = useState<number | null>(null)
  /** Bumped on restart so late engine answers from the previous run are dropped. */
  const run = useRef(0)
  /** The run whose result was last written to the review schedule. */
  const recordedRun = useRef(-1)
  const reviews = useReviews()
  const now = useNow()

  const shuffling = startFen === null
  const game = useMemo(() => {
    const g = new Chess(startFen ?? drill.fen)
    for (const san of moves) g.move(san)
    return g
  }, [startFen, drill.fen, moves])
  const fen = game.fen()
  const status = useMemo(() => goalStatus(game, drill.playerColor, drill.goal), [game, drill.playerColor, drill.goal])
  const over = !shuffling && status.state !== 'playing'
  const lastMove = moves.length ? (game.history({ verbose: true }).at(-1) ?? null) : null
  const playerTurn = sideToMove(fen) === drill.playerColor
  const playerToMove = !shuffling && !over && playerTurn
  const hintSquare = hint?.fen === fen ? hint.square : null
  const targets = useMemo(() => (selected && playerToMove ? legalTargets(fen, selected) : []), [fen, selected, playerToMove])

  useEffect(() => {
    let cancelled = false
    getEngine()
      .describe()
      .then((id) => !cancelled && setIdentity(id))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // A randomized drill starts from a shuffle of its position that Stockfish rates about the same.
  useEffect(() => {
    if (!drill.randomize) return
    let cancelled = false
    const engine = getEngine()
    const evaluate = async (candidate: string) => {
      // Stop searching once this shuffle is no longer wanted (restart or unmount).
      if (cancelled) throw new Error('cancelled')
      return (await engine.search(candidate, { depth: SHUFFLE_DEPTH })).score
    }
    randomizePosition(drill.fen, drill.playerColor, evaluate)
      .then(({ fen: shuffled }) => !cancelled && setStartFen(shuffled))
      // Without Stockfish the shuffle cannot be checked; the drill cannot be played either, so show that error.
      .catch(() => {
        if (cancelled) return
        setStartFen(drill.fen)
        setEngineError(true)
      })
    return () => {
      cancelled = true
    }
  }, [drill.randomize, drill.fen, drill.playerColor, shuffle])

  // Stockfish answers with its best move.
  useEffect(() => {
    if (shuffling || over || playerTurn || engineError) return
    const runId = run.current
    let cancelled = false
    getEngine()
      .search(fen, { movetime: ENGINE_MOVETIME_MS })
      .then(({ bestMove, depth }) => {
        if (cancelled || runId !== run.current || !bestMove) return
        setLastDepth(depth)
        const played = playUci(fen, bestMove)
        if (played) setMoves((m) => [...m, played.move.san])
      })
      .catch(() => runId === run.current && setEngineError(true))
    return () => {
      cancelled = true
    }
  }, [shuffling, over, playerTurn, engineError, fen])

  // Once the drill ends, schedule its next review: a missed goal counts as a failed run.
  useEffect(() => {
    if (!over || recordedRun.current === run.current) return
    recordedRun.current = run.current
    reviews.record(drill.id, gradeFromRun({ mistakes: status.state === 'lost' ? 1 : 0, hintsUsed }))
  }, [over, status.state, reviews, drill.id, hintsUsed])

  function tryMove(from: string, to: string): boolean {
    // Promotions always make a queen.
    const played = playUci(fen, `${from}${to}q`) ?? playUci(fen, `${from}${to}`)
    if (!played) return false
    setMoves((m) => [...m, played.move.san])
    return true
  }

  function selectable(square: string): boolean {
    return playerToMove && legalTargets(fen, square).length > 0
  }

  function onPieceDrag({ square }: PieceHandlerArgs) {
    setSelected(square)
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
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

  function showHint() {
    const runId = run.current
    const hintFen = fen
    setHintsUsed((n) => n + 1)
    getEngine()
      .search(hintFen, { movetime: HINT_MOVETIME_MS })
      .then(({ bestMove }) => {
        if (runId === run.current && bestMove) setHint({ fen: hintFen, square: bestMove.slice(0, 2) })
      })
      .catch(() => runId === run.current && setEngineError(true))
  }

  function restart() {
    run.current++
    setMoves([])
    setHint(null)
    setHintsUsed(0)
    setSelected(null)
    setEngineError(false)
    setLastDepth(null)
    if (drill.randomize) {
      setStartFen(null)
      setShuffle((n) => n + 1)
    }
  }

  let feedback: Feedback
  if (shuffling) {
    feedback = { tone: 'info', text: 'Shuffling the pieces…' }
  } else if (status.state !== 'playing') {
    const card = reviews.get(drill.id)
    const next = card ? ` Next review ${formatDue(card.due, now)}.` : ''
    feedback = { tone: status.state === 'won' ? 'done' : 'bad', text: status.reason + next }
  } else if (engineError) {
    feedback = { tone: 'bad', text: 'Stockfish could not load, so this drill cannot be played.' }
  } else if (playerTurn) {
    feedback = { tone: 'info', text: moves.length ? `Stockfish played ${moves.at(-1)}. Your move.` : 'Your move.' }
  } else {
    feedback = { tone: 'info', text: 'Stockfish is thinking…' }
  }

  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = lastMoveStyle
    squareStyles[lastMove.to] = lastMoveStyle
  }
  if (hintSquare && playerToMove) squareStyles[hintSquare] = { ...squareStyles[hintSquare], ...hintStyle }
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
          <p className="engine-params" data-testid="engine-params">
            {engineParams(identity, lastDepth)}
          </p>
        </div>
      </div>
      <aside className="panel">
        <h2>{drill.name}</h2>
        <p className="description">{drill.description}</p>
        <p className={`feedback feedback-${feedback.tone}`} role="status" data-testid="feedback">
          {feedback.text}
        </p>
        <dl className="stats">
          <dt>Goal</dt>
          <dd data-testid="goal">{goalLabel(drill.goal)}</dd>
          {drill.randomize && (
            <>
              <dt>Position</dt>
              <dd>Randomized</dd>
            </>
          )}
          <dt>Opponent</dt>
          <dd>Stockfish, best moves</dd>
          <dt>Hints</dt>
          <dd data-testid="hints">{hintsUsed}</dd>
        </dl>
        <p className="moves" data-testid="moves">
          {formatMoves(startFen ?? drill.fen, moves) || 'No moves played yet.'}
        </p>
        <div className="actions">
          <button type="button" onClick={showHint} disabled={!playerToMove || engineError || hint?.fen === fen}>
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
