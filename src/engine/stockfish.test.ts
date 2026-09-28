import { describe, expect, it } from 'vitest'
import { StockfishEngine, type EngineWorker } from './stockfish'

/** An engine that answers the handshake and only replies to `go` when told to `stop`, like a long search. */
function slowWorker(): EngineWorker & { sent: string[] } {
  const worker = {
    sent: [] as string[],
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null,
    terminate() {},
    postMessage(command: string) {
      worker.sent.push(command)
      const reply = (data: string) => queueMicrotask(() => worker.onmessage?.({ data } as MessageEvent))
      if (command === 'uci') reply('id name Fake\nuciok')
      else if (command === 'isready') reply('readyok')
      else if (command === 'stop') reply('info depth 3 multipv 1 score cp 10 pv e2e4\nbestmove e2e4')
    },
  }
  return worker
}

describe('StockfishEngine.search with an abort signal', () => {
  it('stops a running search when aborted', async () => {
    const worker = slowWorker()
    const engine = new StockfishEngine(worker)
    const abort = new AbortController()
    const result = engine.search('some-fen', { movetime: 60_000 }, abort.signal)
    await engine.whenReady()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(worker.sent).toContain('go movetime 60000')
    abort.abort()
    expect((await result).bestMove).toBe('e2e4')
    expect(worker.sent).toContain('stop')
  })

  it('skips a queued search that was aborted before it started', async () => {
    const worker = slowWorker()
    const engine = new StockfishEngine(worker)
    const abort = new AbortController()
    abort.abort()
    const result = await engine.search('some-fen', { movetime: 60_000 }, abort.signal)
    expect(result.bestMove).toBeNull()
    expect(worker.sent.some((c) => c.startsWith('go'))).toBe(false)
  })
})
