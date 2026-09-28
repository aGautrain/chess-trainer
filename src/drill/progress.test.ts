import { describe, expect, it } from 'vitest'
import {
  PROGRESS_KEY,
  hasTarget,
  isCompleted,
  loadProgress,
  mateTarget,
  progressFor,
  saveProgress,
  summarize,
  withResult,
  withTarget,
  withoutDrill,
} from './progress'
import type { EngineDrill } from './types'

const drill: EngineDrill = {
  id: 'my-mate',
  mode: 'engine',
  name: 'Rook mate',
  description: '',
  fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
  playerColor: 'white',
  goal: { kind: 'checkmate' },
}

function memoryStore(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(PROGRESS_KEY, initial)
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('mateTarget', () => {
  it('counts the player moves of a mate for the player', () => {
    expect(mateTarget({ kind: 'mate', value: 15 }, drill.fen, 'white')).toBe(15)
    // Black to move and getting mated in 3 of its moves: White mates on its third move.
    expect(mateTarget({ kind: 'mate', value: -3 }, '8/8/8/4k3/8/8/8/4K2R b - - 0 1', 'white')).toBe(3)
  })

  it('ignores mates against the player and non-mate scores', () => {
    expect(mateTarget({ kind: 'mate', value: -4 }, drill.fen, 'white')).toBeNull()
    expect(mateTarget({ kind: 'cp', value: 900 }, drill.fen, 'white')).toBeNull()
    expect(mateTarget({ kind: 'mate', value: 0 }, drill.fen, 'white')).toBeNull()
  })
})

describe('drill progress', () => {
  it('keeps the fewest moves of a successful finish', () => {
    let map = withResult({}, drill, 20)
    map = withResult(map, drill, 24)
    expect(progressFor(map, drill)?.best).toBe(20)
    map = withResult(map, drill, 16)
    expect(progressFor(map, drill)?.best).toBe(16)
  })

  it('starts over when the drill is edited', () => {
    const map = withTarget(withResult({}, drill, 20), drill, 15)
    expect(progressFor(map, { ...drill, fen: '8/8/8/3k4/8/8/8/4K2R w - - 0 1' })).toBeNull()
    expect(progressFor(map, { ...drill, name: 'Renamed' })?.best).toBe(20)
  })

  it('has targets only for checkmate goals', () => {
    const draw: EngineDrill = { ...drill, goal: { kind: 'draw' } }
    expect(hasTarget(draw)).toBe(false)
    expect(withTarget({}, draw, 5)).toEqual({})
    expect(progressFor(withResult({}, draw, 5), draw)?.best).toBe(5)
  })

  it('forgets a deleted drill', () => {
    expect(withoutDrill(withResult({}, drill, 20), drill.id)).toEqual({})
  })
})

describe('summarize', () => {
  const base = { signature: 'x' }
  it('shows Completed once a run matched the target, else the best so far', () => {
    expect(summarize({ ...base, best: 20, target: 14 })).toEqual({ completed: false, text: 'Best 20 moves' })
    expect(summarize({ ...base, best: 14, target: 14 })).toEqual({ completed: true, text: 'Completed' })
    expect(summarize({ ...base, best: 12 })).toEqual({ completed: false, text: 'Best 12 moves' })
    expect(summarize({ ...base, bestOver: 1 })).toEqual({ completed: false, text: 'Best 1 move over' })
    expect(summarize({ ...base, bestOver: 0 })).toEqual({ completed: true, text: 'Completed' })
    expect(summarize({ ...base, target: 14 })).toBeNull()
    expect(summarize(null)).toBeNull()
  })
})

describe('randomized drills', () => {
  const random: EngineDrill = { ...drill, randomize: true }
  it('keep the fewest moves beyond each run\'s own target', () => {
    let map = withResult({}, random, 20, 15)
    expect(progressFor(map, random)?.bestOver).toBe(5)
    map = withResult(map, random, 12, 10)
    expect(progressFor(map, random)?.bestOver).toBe(2)
    map = withResult(map, random, 30, 20)
    expect(progressFor(map, random)?.bestOver).toBe(2)
    map = withResult(map, random, 9, 9)
    expect(isCompleted(progressFor(map, random))).toBe(true)
    expect(progressFor(map, random)?.best).toBeUndefined()
  })

  it('record nothing without a target, and never store one', () => {
    expect(withResult({}, random, 20, null)).toEqual({})
    expect(withTarget({}, random, 12)).toEqual({})
    expect(hasTarget(random)).toBe(true)
  })
})

describe('progress storage', () => {
  it('round-trips, keeping a searched target with no mate apart from an unsearched one', () => {
    const store = memoryStore()
    const map = withTarget(withResult({}, drill, 20), drill, null)
    expect(saveProgress(map, store)).toBe(true)
    const loaded = loadProgress(store)
    expect(loaded).toEqual(map)
    expect(progressFor(loaded, drill)?.target).toBeNull()
  })

  it('ignores corrupt data', () => {
    expect(loadProgress(memoryStore('{not json'))).toEqual({})
    expect(loadProgress(memoryStore('[]'))).toEqual({})
    expect(loadProgress(memoryStore('{"a":{"best":3},"b":{"signature":"s","best":-2,"target":"x"}}'))).toEqual({ b: { signature: 's' } })
    expect(loadProgress(null)).toEqual({})
  })
})
