import { describe, expect, it } from 'vitest'
import { formatDue } from './format'

describe('formatDue', () => {
  const now = 1_000_000_000_000
  it('reads naturally', () => {
    expect(formatDue(now - 1, now)).toBe('due now')
    expect(formatDue(now + 10 * 60 * 1000, now)).toBe('in 10 min')
    expect(formatDue(now + 20 * 60 * 60 * 1000, now)).toBe('tomorrow')
    expect(formatDue(now + 6 * 24 * 60 * 60 * 1000, now)).toBe('in 6 days')
  })
})
