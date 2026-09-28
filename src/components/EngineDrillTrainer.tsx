import { Chess } from 'chess.js'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Lightbulb, RotateCcw, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { boardTheme } from './boardTheme'
import { sideToMove } from '../drill/engine'
import { goalLabel, goalStatus } from '../drill/goals'
import { hasTarget, storesTarget, summarize, tracksBest, type DrillProgress } from '../drill/progress'
import { randomizePosition } from '../drill/randomize'
import { computeTarget } from '../drill/targets'
import { legalTargets } from '../drill/legalMoves'
import type { EngineDrill } from '../drill/types'
import { playUci } from '../engine/moves'
import { getAnalysisEngine, getEngine } from '../engine/stockfish'
import type { EngineIdentity } from '../engine/uci'
import { captureRingStyle, hintStyle, lastMoveStyle, moveDotStyle, selectedStyle } from './boardStyles'
import { EvalBar } from './EvalBar'
import { MoveHistory } from './MoveHistory'
import { Concept, IconButton } from './PanelParts'
import { useBoardPosition } from './useBoardPosition'

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

interface Props {
  drill: EngineDrill
  /** Best result and move target, for drills that keep them. */
  progress?: DrillProgress | null
  /** Called once per successful run with the number of moves the player made and Stockfish's mate-in-N for that run's start. */
  onSolved?: (moves: number, target: number | null) => void
  /** Called when the target of a fixed drill has been searched, so it can be kept. */
  onTarget?: (target: number | null) => void
}

const plural = (n: number) => `${n} move${n === 1 ? '' : 's'}`

/** Plays a position out against Stockfish's best moves until the drill's goal is met or can no longer be. */
export function EngineDrillTrainer({ drill, progress = null, onSolved, onTarget }: Props) {
  /** The position this run starts from: the drill's own, or a shuffle of it. Null while shuffling. */
  const [startFen, setStartFen] = useState<string | null>(drill.randomize ? null : drill.fen)
  /** Bumped to ask for a new shuffle. */
  const [shuffle, setShuffle] = useState(0)
  /** Moves played from the drill position, in SAN. */
  const [moves, setMoves] = useState<string[]>([])
  /** How many of those moves the board shows while stepping back through them; null follows the game. */
  const [view, setView] = useState<number | null>(null)
  /** Whether the player went back and played a different move this run, which keeps a win out of their best. */
  const [tookBack, setTookBack] = useState(false)
  /** The square of the piece Stockfish would move, for the position it was asked about. */
  const [hint, setHint] = useState<{ fen: string; square: string } | null>(null)
  const [engineError, setEngineError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [identity, setIdentity] = useState<EngineIdentity | null>(null)
  /** Depth Stockfish reached on its last move. */
  const [lastDepth, setLastDepth] = useState<number | null>(null)
  /** The moves of the finished game whose result card was closed, so it stays closed until a game ends differently. */
  const [dismissed, setDismissed] = useState<string | null>(null)
  /** Stockfish's mate-in-N for the player from the position this run started from. */
  const [searchedTarget, setSearchedTarget] = useState<{ fen: string; value: number | null } | null>(null)
  /** Bumped on restart so late engine answers from the previous run are dropped. */
  const run = useRef(0)

  const shuffling = startFen === null
  const shown = view ?? moves.length
  /** True when the board shows the latest move rather than an earlier one. */
  const live = shown === moves.length
  const liveGame = useMemo(() => {
    const g = new Chess(startFen ?? drill.fen)
    for (const san of moves) g.move(san)
    return g
  }, [startFen, drill.fen, moves])
  /** The position on the board, which is the live one unless the player stepped back. */
  const game = useMemo(() => {
    if (live) return liveGame
    const g = new Chess(startFen ?? drill.fen)
    for (const san of moves.slice(0, shown)) g.move(san)
    return g
  }, [live, liveGame, startFen, drill.fen, moves, shown])
  const fen = game.fen()
  const { position, onDropOffBoard } = useBoardPosition(fen)
  const status = useMemo(() => goalStatus(liveGame, drill.playerColor, drill.goal), [liveGame, drill.playerColor, drill.goal])
  const over = !shuffling && status.state !== 'playing'
  // An earlier position may be played from if the goal was still open there.
  const shownOpen = useMemo(
    () => (live ? status.state === 'playing' : goalStatus(game, drill.playerColor, drill.goal).state === 'playing'),
    [live, status, game, drill.playerColor, drill.goal],
  )
  const lastMove = shown ? (game.history({ verbose: true }).at(-1) ?? null) : null
  const playerTurn = sideToMove(fen) === drill.playerColor
  const playerToMove = !shuffling && shownOpen && playerTurn
  const playerMoves = liveGame.history({ verbose: true }).filter((m) => m.color === drill.playerColor[0]).length
  /** Identifies the game as played so far, for the result card. */
  const gameKey = moves.join(' ')
  const solved = !shuffling && status.state === 'won'
  const storedTarget = storesTarget(drill) ? progress?.target : undefined
  /** Undefined while Stockfish is still searching this run's start. */
  const runTarget = storedTarget !== undefined ? storedTarget : searchedTarget?.fen === startFen ? searchedTarget.value : undefined
  // A randomized drill's best is measured against each run's target, so it needs one.
  const keepsBest = tracksBest(drill) && (!drill.randomize || hasTarget(drill))
  /** Completed, the best result so far, or nothing when the drill was never solved. */
  const best = summarize(progress)
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

  // Search the shortest mate from the position this run starts from, unless a fixed drill already knows it.
  useEffect(() => {
    if (!hasTarget(drill) || startFen === null || storedTarget !== undefined) return
    let cancelled = false
    const engine = getAnalysisEngine()
    computeTarget(startFen, drill.playerColor, (fen, limits) => engine.search(fen, limits))
      .then((value) => {
        if (cancelled) return
        setSearchedTarget({ fen: startFen, value })
        if (storesTarget(drill)) onTarget?.(value)
      })
      // Without Stockfish there is no target to show; the drill still plays as before.
      .catch(() => !cancelled && setSearchedTarget({ fen: startFen, value: null }))
    return () => {
      cancelled = true
    }
    // onTarget is a new function on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, startFen, storedTarget])

  // Keep the result of a successful run, once, while it is the current run.
  // A randomized drill waits for its run's target, since its result is counted against it.
  const showResult = over && live && dismissed !== gameKey

  // Escape closes the result card.
  useEffect(() => {
    if (!showResult) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDismissed(gameKey)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showResult, gameKey])

  // A win is celebrated once per run. Reduced-motion users get no confetti.
  const celebrated = useRef(-1)
  useEffect(() => {
    if (!solved || celebrated.current === run.current) return
    celebrated.current = run.current
    // Fewer ticks and more gravity than the defaults (200, 1) so the pieces clear away in about a second.
    void confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, ticks: 80, gravity: 1.6, disableForReducedMotion: true })
  }, [solved])

  const reported = useRef(-1)
  useEffect(() => {
    if (!solved || tookBack || reported.current === run.current) return
    if (drill.randomize && hasTarget(drill) && runTarget === undefined) return
    reported.current = run.current
    onSolved?.(playerMoves, runTarget ?? null)
  }, [solved, tookBack, playerMoves, onSolved, drill, runTarget])

  // Stockfish answers with its best move. Stepping back stops its search; it starts over on returning to the latest move.
  useEffect(() => {
    if (shuffling || over || !live || playerTurn || engineError) return
    const runId = run.current
    let cancelled = false
    const abort = new AbortController()
    getEngine()
      .search(fen, { movetime: ENGINE_MOVETIME_MS }, abort.signal)
      .then(({ bestMove, depth }) => {
        if (cancelled || runId !== run.current || !bestMove) return
        setLastDepth(depth)
        const played = playUci(fen, bestMove)
        if (played) setMoves((m) => [...m, played.move.san])
      })
      .catch(() => runId === run.current && setEngineError(true))
    return () => {
      cancelled = true
      abort.abort()
    }
  }, [shuffling, over, live, playerTurn, engineError, fen])

  /** Plays a move on the shown position; from an earlier position, the moves after it are dropped. */
  function tryMove(from: string, to: string): boolean {
    // Promotions always make a queen.
    const played = playUci(fen, `${from}${to}q`) ?? playUci(fen, `${from}${to}`)
    if (!played) return false
    if (!live) setTookBack(true)
    setMoves([...moves.slice(0, shown), played.move.san])
    setView(null)
    return true
  }

  /** Shows the position after the first `n` moves; the latest one returns to the game. */
  function showMove(n: number) {
    const clamped = Math.max(0, Math.min(moves.length, n))
    setView(clamped === moves.length ? null : clamped)
    setSelected(null)
    if (over) setDismissed(gameKey)
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

  function showHint() {
    const runId = run.current
    const hintFen = fen
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
    setView(null)
    setTookBack(false)
    setDismissed(null)
    setHint(null)
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
  } else if (!live) {
    const where = shown === 0 ? 'the start position' : `move ${shown} of ${moves.length}`
    feedback = { tone: 'info', text: `Viewing ${where}. ${playerToMove ? 'Play a move to continue from here, or' : 'Press'} → to go forward.` }
  } else if (status.state !== 'playing') {
    feedback = { tone: status.state === 'won' ? 'done' : 'bad', text: status.reason }
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
          <div className="board-frame">
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
              }}
            />
            {showResult && (
              <div className="result-backdrop" onClick={() => setDismissed(gameKey)} data-testid="result-backdrop">
                <div
                  className={`result result-${status.state}`}
                  role="dialog"
                  aria-labelledby="result-title"
                  data-testid="result"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" className="result-close" aria-label="Close" title="Close" onClick={() => setDismissed(gameKey)}>
                    <X aria-hidden size={18} />
                  </button>
                  <h2 id="result-title">{status.state === 'won' ? 'Win!' : 'Lost'}</h2>
                  <p className="description">{status.reason}</p>
                  {solved && tookBack && tracksBest(drill) && (
                    <p className="description" data-testid="took-back">
                      You took moves back, so this win does not count toward your best.
                    </p>
                  )}
                  <dl className="stats">
                    {typeof runTarget === 'number' && (
                      <>
                        <dt>Target</dt>
                        <dd>{plural(runTarget)}</dd>
                      </>
                    )}
                    <dt>Your moves</dt>
                    <dd>{playerMoves}</dd>
                  </dl>
                  <button type="button" className="primary retry" onClick={restart}>
                    <RotateCcw aria-hidden size={18} />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="engine-params" data-testid="engine-params">
            {engineParams(identity, lastDepth)}
          </p>
        </div>
      </div>
      <aside className="panel">
        <h2>{drill.name}</h2>
        <Concept text={drill.description} />
        <p className={`feedback feedback-${feedback.tone}`} role="status" data-testid="feedback">
          {feedback.text}
        </p>
        <dl className="stats">
          <dt>Goal</dt>
          <dd data-testid="goal">{goalLabel(drill.goal)}</dd>
          {hasTarget(drill) && (
            <>
              <dt>Target</dt>
              <dd data-testid="target">
                {shuffling || runTarget === undefined
                  ? 'Stockfish is looking for the shortest mate…'
                  : runTarget === null
                    ? 'Stockfish found no forced mate to count'
                    : `Mate in ${plural(runTarget)}`}
              </dd>
            </>
          )}
          {tracksBest(drill) && (
            <>
              <dt>Your moves</dt>
              <dd data-testid="player-moves">{playerMoves}</dd>
            </>
          )}
          {keepsBest && (
            <>
              <dt>Best</dt>
              <dd data-testid="best">
                <span className={best?.completed ? 'progress-tag completed' : 'progress-tag'}>{best?.text ?? 'First time'}</span>
              </dd>
            </>
          )}
        </dl>
        <MoveHistory fen={startFen ?? drill.fen} moves={moves} shown={shown} onShow={showMove} />
        <div className="actions">
          <IconButton label="Hint" onClick={showHint} disabled={!playerToMove || engineError || hint?.fen === fen}>
            <Lightbulb aria-hidden size={20} />
          </IconButton>
          <IconButton label="Restart" onClick={restart}>
            <RotateCcw aria-hidden size={20} />
          </IconButton>
        </div>
      </aside>
    </section>
  )
}
