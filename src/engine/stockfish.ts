import { parseBestMove, parseIdentity, parseInfo, type EngineIdentity, type InfoLine, type Score } from './uci'

/** The vendored Stockfish build in public/engine, see its README. */
export const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`

/**
 * Transposition table size of each engine, in MB. Stockfish's default of 16 MB is already enough for a move search of
 * a second or less, but the 10 s mate-target search fills it; 64 MB stays small next to the browser's memory.
 */
export const HASH_MB = 64

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

export interface EngineOptions {
  /** Transposition table size in MB. */
  hash?: number
}

/**
 * Stockfish running in a Web Worker, driven over UCI.
 * Searches are queued so callers never interleave `position`/`go` commands.
 */
export class StockfishEngine {
  private readonly worker: EngineWorker
  private listeners = new Set<LineListener>()
  private queue: Promise<unknown> = Promise.resolve()
  private readonly ready: Promise<void>
  private identity: EngineIdentity = { name: 'Unknown engine', options: {} }

  constructor(worker: EngineWorker = new Worker(ENGINE_URL) as unknown as EngineWorker, options: EngineOptions = {}) {
    this.worker = worker
    this.worker.onmessage = (event) => {
      const text = typeof event.data === 'string' ? event.data : String(event.data)
      for (const line of text.split('\n')) {
        if (line) for (const listener of [...this.listeners]) listener(line)
      }
    }
    this.ready = this.start(options)
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

  private async start({ hash }: EngineOptions): Promise<void> {
    await this.handshake()
    if (!hash) return
    await this.waitFor((line) => line === 'readyok', [`setoption name Hash value ${hash}`, 'isready'])
    this.identity.options.Hash = String(hash)
  }

  private async handshake(): Promise<void> {
    const lines: string[] = []
    await this.waitFor((line) => {
      lines.push(line)
      return line === 'uciok'
    }, ['uci'])
    this.identity = parseIdentity(lines)
    await this.waitFor((line) => line === 'readyok', ['isready'])
  }

  /** Resolves once the engine has loaded and answered the UCI handshake. */
  whenReady(): Promise<void> {
    return this.ready
  }

  /** The engine's name and current option values, once the handshake is done. */
  async describe(): Promise<EngineIdentity> {
    await this.ready
    return { name: this.identity.name, options: { ...this.identity.options } }
  }

  /** Sends a raw UCI option, e.g. setOption('Skill Level', 10). */
  setOption(name: string, value: string | number): Promise<void> {
    return this.enqueue(async () => {
      await this.ready
      await this.waitFor((line) => line === 'readyok', [`setoption name ${name} value ${value}`, 'isready'])
      this.identity.options[name] = String(value)
    })
  }

  /** Clears the engine's hash between unrelated positions. */
  newGame(): Promise<void> {
    return this.enqueue(async () => {
      await this.ready
      await this.waitFor((line) => line === 'readyok', ['ucinewgame', 'isready'])
    })
  }

  /**
   * Searches `fen` and returns the best move with its evaluation.
   * Aborting `signal` skips a search that has not started and stops a running one early; the caller should ignore its result.
   */
  search(fen: string, limits: SearchLimits = { depth: 12 }, signal?: AbortSignal): Promise<SearchResult> {
    return this.enqueue(async () => {
      await this.ready
      if (signal?.aborted) return { bestMove: null, score: { kind: 'cp', value: 0 }, depth: 0, pv: [] }
      // UCI `stop` makes Stockfish answer with its bestmove at once, which ends this search's wait below.
      const stop = () => this.worker.postMessage('stop')
      signal?.addEventListener('abort', stop, { once: true })
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
      ).finally(() => signal?.removeEventListener('abort', stop))
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
  shared ??= new StockfishEngine(undefined, { hash: HASH_MB })
  return shared
}

let analysis: StockfishEngine | null = null

/** A second engine for long background searches, so they never hold up the moves of the game being played. */
export function getAnalysisEngine(): StockfishEngine {
  analysis ??= new StockfishEngine(undefined, { hash: HASH_MB })
  return analysis
}
