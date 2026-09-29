import { describe, expect, it } from 'vitest'
import { formatTime, read, reset, start, stop, stopped } from './stopwatch'

describe('stopwatch', () => {
  it('counts only while started', () => {
    let w = start(stopped, 1000)
    expect(read(w, 1500)).toBe(500)
    w = stop(w, 2000)
    expect(read(w, 9000)).toBe(1000)
    w = start(w, 10_000)
    expect(read(w, 10_250)).toBe(1250)
  })

  it('ignores a second start or stop', () => {
    const w = start(start(stopped, 100), 500)
    expect(read(w, 600)).toBe(500)
    expect(stop(stop(w, 700), 900)).toEqual({ elapsed: 600, since: null })
  })

  it('resets to zero, keeping a running watch running', () => {
    expect(reset(stop(start(stopped, 0), 400), 1000)).toEqual(stopped)
    const running = reset(start(stopped, 0), 1000)
    expect(read(running, 1300)).toBe(300)
  })
})

describe('formatTime', () => {
  it('shows minutes, seconds and tenths', () => {
    expect(formatTime(0)).toBe('0:00.0')
    expect(formatTime(7_499)).toBe('0:07.4')
    expect(formatTime(750_000)).toBe('12:30.0')
    expect(formatTime(3_723_500)).toBe('1:02:03.5')
  })
})
