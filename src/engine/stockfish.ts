import { parseBestMove, parseInfo, type InfoLine, type Score } from './uci'

/** The vendored Stockfish build in public/engine, see its README. */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`

export interface SearchLimits {
  /** Fixed search depth. */
  depth?: number
  /** Time budget in milliseconds. Used when depth is not set. */
  movetime?: number
}

export interface SearchResult {
  bestMove: string | null
  /** Score of the best line, from the side to move's point of view. */
  score: Score
  depth: number
  pv: string[]
}

/** The subset of Worker the engine needs, so tests can pass a fake. */
export interface EngineWorker {
  postMessage(message: string): void
  terminate(): void
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
}

type LineListener = (line: string) => void

/**
 * Stockfish running in a Web Worker, driven over UCI.
 * Searches are queued so callers never interleave `position`/`go` commands.
 */
export class StockfishEngine {
  private readonly worker: EngineWorker
  private listeners = new Set<LineListener>()
  private queue: Promise<unknown> = Promise.resolve()
  private readonly ready: Promise<void>

  constructor(worker: EngineWorker = new Worker(ENGINE_URL) as unknown as EngineWorker) {
    this.worker = worker
    this.worker.onmessage = (event) => {
      const text = typeof event.data === 'string' ? event.data : String(event.data)
      for (const line of text.split('\n')) {
        if (line) for (const listener of [...this.listeners]) listener(line)
      }
    }
    this.ready = this.handshake()
    this.worker.onerror = () => {
      for (const listener of [...this.listeners]) listener('error')
    }
  }

  private waitFor(match: (line: string) => boolean, send: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const listener = (line: string) => {
        if (line === 'error') {
          this.listeners.delete(listener)
          reject(new Error('Stockfish worker failed to load'))
        } else if (match(line)) {
          this.listeners.delete(listener)
          resolve()
        }
      }
      this.listeners.add(listener)
      for (const command of send) this.worker.postMessage(command)
    })
  }

  private async handshake(): Promise<void> {
    await this.waitFor((line) => line === 'uciok', ['uci'])
    await this.waitFor((line) => line === 'readyok', ['isready'])
  }

  /** Resolves once the engine has loaded and answered the UCI handshake. */
  whenReady(): Promise<void> {
    return this.ready
  }

  /** Sends a raw UCI option, e.g. setOption('Skill Level', 10). */
  setOption(name: string, value: string | number): Promise<void> {
    return this.enqueue(async () => {
      await this.ready
      await this.waitFor((line) => line === 'readyok', [`setoption name ${name} value ${value}`, 'isready'])
    })
  }

  /** Clears the engine's hash between unrelated positions. */
  newGame(): Promise<void> {
    return this.enqueue(async () => {
      await this.ready
      await this.waitFor((line) => line === 'readyok', ['ucinewgame', 'isready'])
    })
  }

  /** Searches `fen` and returns the best move with its evaluation. */
  search(fen: string, limits: SearchLimits = { depth: 12 }): Promise<SearchResult> {
    return this.enqueue(async () => {
      await this.ready
      let last: InfoLine | null = null
      let bestMove: string | null = null
      const go = limits.depth ? `go depth ${limits.depth}` : `go movetime ${limits.movetime ?? 500}`
      await this.waitFor(
        (line) => {
          const info = parseInfo(line)
          if (info && info.multipv === 1) last = info
          const best = parseBestMove(line)
          if (best === undefined) return false
          bestMove = best
          return true
        },
        [`position fen ${fen}`, go],
      )
      const final = last as InfoLine | null
      return {
        bestMove,
        // No info line means the game is already over: mated (no move) or a draw.
        score: final?.score ?? (bestMove === null ? { kind: 'mate', value: 0 } : { kind: 'cp', value: 0 }),
        depth: final?.depth ?? 0,
        pv: final?.pv ?? [],
      }
    })
  }

  terminate(): void {
    this.worker.terminate()
    this.listeners.clear()
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }
}

let shared: StockfishEngine | null = null

/** One engine for the whole app; the worker and its WASM load on first use. */
export function getEngine(): StockfishEngine {
  shared ??= new StockfishEngine()
  return shared
}
