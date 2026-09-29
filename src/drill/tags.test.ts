import { describe, expect, it } from 'vitest'
import { classicDrills, drills, italianGame, mateDrills } from './drills'
import { availableTags, drillTags, filterDrills, paginate } from './tags'
import type { EngineDrill } from './types'

const notCustom = () => false

describe('drillTags', () => {
  it('derives mode, goal, randomized, side and source, then adds themes', () => {
    expect(drillTags(mateDrills[0], false)).toEqual(['engine', 'checkmate', 'randomized', 'white', 'built-in', 'endgame', 'basic-mate'])
    expect(drillTags(italianGame, false)).toEqual(['line', 'white', 'built-in', 'opening'])
  })

  it('tags a user-made drill without a goal piece as win material', () => {
    const drill: EngineDrill = { ...mateDrills[0], id: 'x', goal: { kind: 'win-piece', piece: 'q' }, randomize: false, themes: undefined, playerColor: 'black' }
    expect(drillTags(drill, true)).toEqual(['engine', 'win-material', 'black', 'mine'])
  })
})

describe('filterDrills', () => {
  it('keeps the drills carrying every selected tag', () => {
    const found = filterDrills(drills, notCustom, ['engine', 'draw'], '')
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((d) => d.mode === 'engine' && d.goal.kind === 'draw')).toBe(true)
    expect(filterDrills(drills, notCustom, ['line', 'draw'], '')).toEqual([])
  })

  it('matches every search word in the name, description or tags, ignoring case', () => {
    expect(filterDrills(drills, notCustom, [], 'LUCENA').map((d) => d.id)).toEqual(['classic-lucena'])
    expect(filterDrills(drills, notCustom, [], 'two bishops').map((d) => d.id)).toEqual(['mate-kbb-k'])
    expect(filterDrills(drills, notCustom, [], 'philidor draw').map((d) => d.id)).toEqual(['classic-philidor'])
    expect(filterDrills(drills, notCustom, [], '  ')).toHaveLength(drills.length)
  })
})

describe('availableTags', () => {
  it('lists only the tags some drill has, in chip order', () => {
    const tags = availableTags(drills, notCustom)
    expect(tags).not.toContain('mine')
    expect(tags.slice(0, 2)).toEqual(['line', 'engine'])
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 30 }, (_, i) => i)

  it('slices the requested page', () => {
    expect(paginate(items, 2)).toEqual({ items: items.slice(12, 24), page: 2, pages: 3 })
  })

  it('clamps pages out of range', () => {
    expect(paginate(items, 9).page).toBe(3)
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate([], 4)).toEqual({ items: [], page: 1, pages: 1 })
  })
})

describe('built-in drills', () => {
  it('fill at least three library pages', () => {
    expect(paginate(drills, 1).pages).toBeGreaterThanOrEqual(3)
  })

  it('have unique ids', () => {
    expect(new Set(drills.map((d) => d.id)).size).toBe(drills.length)
  })

  it('are all randomized engine drills among the classics', () => {
    expect(classicDrills.every((d) => d.mode === 'engine' && d.randomize && d.themes?.includes('endgame'))).toBe(true)
  })
})
