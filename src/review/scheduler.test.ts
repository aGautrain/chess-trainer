import { describe, expect, it } from 'vitest'
import { DAY_MS, ReviewSchedule, STORAGE_KEY, gradeFromRun, newCard, review, type KeyValueStore } from './scheduler'

const NOON = new Date(2026, 8, 27, 12, 0, 0).getTime()
const MIDNIGHT = new Date(2026, 8, 27, 0, 0, 0).getTime()

describe('review', () => {
  it('grows the interval with successive good reviews', () => {
    let card = newCard('d1', NOON)
    const intervals: number[] = []
    for (let i = 0; i < 4; i++) {
      card = review(card, 'good', NOON)
      intervals.push(card.intervalDays)
    }
    expect(intervals).toEqual([1, 6, 15, 38])
    expect(card.due).toBe(MIDNIGHT + 38 * DAY_MS)
  })

  it('sends a failed drill back within minutes and counts the lapse', () => {
    let card = review(review(newCard('d1', NOON), 'good', NOON), 'good', NOON)
    card = review(card, 'again', NOON)
    expect(card.streak).toBe(0)
    expect(card.lapses).toBe(1)
    expect(card.intervalDays).toBe(0)
    expect(card.due - NOON).toBe(10 * 60 * 1000)
    expect(card.ease).toBeCloseTo(2.3)
  })

  it('keeps ease above the floor', () => {
    let card = newCard('d1', NOON)
    for (let i = 0; i < 20; i++) card = review(card, 'again', NOON)
    expect(card.ease).toBe(1.3)
  })
})

describe('gradeFromRun', () => {
  it('maps a run to a grade', () => {
    expect(gradeFromRun({ mistakes: 1 })).toBe('again')
    expect(gradeFromRun({ mistakes: 0, offBookMoves: 1 })).toBe('hard')
    expect(gradeFromRun({ mistakes: 0 })).toBe('good')
  })
})

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('ReviewSchedule', () => {
  it('persists across instances and lists due drills', () => {
    const store = memoryStore()
    const a = new ReviewSchedule(store)
    a.record('d1', 'good', NOON)
    a.record('d2', 'again', NOON)
    expect(store.data.has(STORAGE_KEY)).toBe(true)

    const b = new ReviewSchedule(store)
    expect(b.get('d1')?.intervalDays).toBe(1)
    expect(b.due(NOON + 11 * 60 * 1000).map((c) => c.id)).toEqual(['d2'])
    expect(b.due(MIDNIGHT + DAY_MS).map((c) => c.id)).toEqual(['d2', 'd1'])
    expect(b.unseen(['d1', 'd2', 'd3'])).toEqual(['d3'])
  })

  it('survives corrupt storage', () => {
    const store = memoryStore()
    store.setItem(STORAGE_KEY, '{not json')
    expect(new ReviewSchedule(store).all()).toEqual([])
    expect(new ReviewSchedule(null).record('d1', 'good', NOON).streak).toBe(1)
  })
})
