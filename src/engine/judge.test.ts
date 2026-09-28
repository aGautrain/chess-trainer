import { describe, expect, it } from 'vitest'
import { classify, judgeMove, winChance } from './judge'
import { StockfishEngine, type EngineWorker } from './stockfish'

describe('winChance', () => {
  it('is 50 at equality and saturates', () => {
    expect(winChance(0)).toBeCloseTo(50)
    expect(winChance(10_000)).toBeGreaterThan(97)
    expect(winChance(-10_000)).toBeLessThan(3)
  })
})

describe('classify', () => {
  const cp = (value: number) => ({ kind: 'cp' as const, value })

  it('calls the engine move best even if the eval moved', () => {
    expect(classify(cp(50), cp(50), true).verdict).toBe('best')
  })

  it('accepts small losses', () => {
    const j = classify(cp(50), cp(20), false)
    expect(j.verdict).toBe('good')
    expect(j.acceptable).toBe(true)
  })

  it('grades bigger losses', () => {
    expect(classify(cp(50), cp(-60), false).verdict).toBe('inaccuracy')
    expect(classify(cp(50), cp(-200), false).verdict).toBe('mistake')
    expect(classify(cp(50), cp(-500), false).verdict).toBe('blunder')
    expect(classify(cp(50), cp(-500), false).acceptable).toBe(false)
  })

  it('treats missing a mate for a won position as fine but walking into mate as a blunder', () => {
    expect(classify({ kind: 'mate', value: 2 }, cp(900), false).verdict).toBe('good')
    expect(classify(cp(0), { kind: 'mate', value: -1 }, false).verdict).toBe('blunder')
  })
})

/** A scripted engine: answers the handshake and replies to each `go` from a per-FEN table. */
function fakeWorker(answers: Record<string, { best: string; score: string }>): EngineWorker & { sent: string[] } {
  let fen = ''
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
      else if (command.startsWith('position fen ')) fen = command.slice('position fen '.length)
      else if (command.startsWith('go')) {
        const a = answers[fen]
        reply(`info depth 12 multipv 1 score ${a.score} pv ${a.best}\nbestmove ${a.best}`)
      }
    },
  }
  return worker
}

describe('judgeMove', () => {
  const before = 'fen-before'
  const after = 'fen-after'

  it('skips the second search when the move is the engine move', async () => {
    const worker = fakeWorker({ [before]: { best: 'e2e4', score: 'cp 30' } })
    const j = await judgeMove(new StockfishEngine(worker), before, 'e2e4', after)
    expect(j.verdict).toBe('best')
    expect(worker.sent.filter((c) => c.startsWith('go'))).toHaveLength(1)
  })

  it('scores the reply position from the mover side', async () => {
    const worker = fakeWorker({
      [before]: { best: 'e2e4', score: 'cp 30' },
      // Opponent to move and winning by 4 pawns: the move was a blunder.
      [after]: { best: 'd8h4', score: 'cp 400' },
    })
    const j = await judgeMove(new StockfishEngine(worker), before, 'g2g4', after)
    expect(j.playedScore).toEqual({ kind: 'cp', value: -400 })
    expect(j.bestMove).toBe('e2e4')
    expect(j.verdict).toBe('blunder')
  })
})
