import { useEffect, useState } from 'react'
import { BOARD_ANIMATION_MS } from '../components/boardTheme'
import { read, reset, start, stop, stopped, type Stopwatch } from './stopwatch'

/** How often the shown time is refreshed while it runs. */
const TICK_MS = 100

/**
 * The player's thinking time for one drill run. It runs while `counting` is true, but only once the move that
 * brought the board to `fen` has finished animating, so the opponent's move never counts as thinking time.
 */
export function useDrillTimer(counting: boolean, fen: string) {
  const [watch, setWatch] = useState<Stopwatch>(stopped)
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (!counting) return
    const wait = setTimeout(() => setWatch((w) => start(w, performance.now())), BOARD_ANIMATION_MS)
    return () => {
      clearTimeout(wait)
      setWatch((w) => stop(w, performance.now()))
    }
  }, [counting, fen])

  const running = watch.since !== null
  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => setNow(performance.now()), TICK_MS)
    return () => clearInterval(tick)
  }, [running])

  return {
    /** Milliseconds of thinking time so far. */
    elapsed: read(watch, now),
    running,
    /** Back to zero, for a new run of the drill. */
    reset: () => setWatch((w) => reset(w, performance.now())),
  }
}
