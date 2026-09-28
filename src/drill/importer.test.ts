import { DEFAULT_POSITION } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { italianGame } from './drills'
import { validateDrill } from './engine'
import { buildDrill, drillToInput, type DrillInput } from './importer'

const base: DrillInput = { name: 'Test', description: '', fen: '', moves: '', playerColor: 'auto' }
const italianFen = italianGame.fen

describe('buildDrill', () => {
  it('reads movetext from the standard start', () => {
    const result = buildDrill({ ...base, moves: '1. e4 e5 2. Nf3 Nc6' }, 'x')
    expect(result).toEqual({
      ok: true,
      drill: { id: 'x', mode: 'line', name: 'Test', description: '', fen: DEFAULT_POSITION, playerColor: 'white', line: ['e4', 'e5', 'Nf3', 'Nc6'] },
    })
  })

  it('accepts bare SAN without move numbers', () => {
    const result = buildDrill({ ...base, moves: 'e4 e5 Nf3' }, 'x')
    expect(result.ok && result.drill.mode === 'line' && result.drill.line).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('plays the line from the FEN field', () => {
    const result = buildDrill({ ...base, fen: italianFen, moves: '3. Bc4 Bc5 4. c3' }, 'x')
    expect(result.ok && result.drill).toMatchObject({ fen: italianFen, line: ['Bc4', 'Bc5', 'c3'] })
  })

  it('uses the FEN header of a full PGN and ignores comments and variations', () => {
    const pgn = `[Event "Club"]\n[SetUp "1"]\n[FEN "${italianFen}"]\n\n3. Bc4 {main} (3. Bb5 a6) Bc5! 4. c3 *`
    const result = buildDrill({ ...base, moves: pgn }, 'x')
    expect(result.ok && result.drill).toMatchObject({ fen: italianFen, line: ['Bc4', 'Bc5', 'c3'] })
  })

  it('picks the side to move for auto, and keeps an explicit side', () => {
    const blackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    const auto = buildDrill({ ...base, fen: blackToMove, moves: 'c5 Nf3' }, 'x')
    expect(auto.ok && auto.drill.playerColor).toBe('black')
    const white = buildDrill({ ...base, fen: blackToMove, moves: 'c5 Nf3', playerColor: 'white' }, 'x')
    expect(white.ok && white.drill.playerColor).toBe('white')
  })

  it('produces drills the engine accepts', () => {
    const result = buildDrill({ ...base, fen: italianFen, moves: italianGame.line.join(' ') }, 'x')
    if (!result.ok) throw new Error(result.error)
    expect(() => validateDrill(result.drill)).not.toThrow()
    expect(result.drill).toMatchObject({ line: italianGame.line })
  })

  it.each<[string, Partial<DrillInput>, string, RegExp]>([
    ['a bad FEN', { fen: 'not a fen', moves: 'e4' }, 'fen', /Invalid FEN/],
    ['an illegal move', { moves: '1. e4 e5 2. Ke3' }, 'moves', /Ke3 is not a legal move/],
    ['no moves', { moves: '' }, 'moves', /at least one move/],
    ['no player move', { moves: 'e4', playerColor: 'black' }, 'moves', /at least one black move/],
    ['conflicting FENs', { fen: DEFAULT_POSITION, moves: `[FEN "${italianFen}"]\n\nBc4` }, 'fen', /different positions/],
    ['a missing name', { name: '  ', moves: 'e4' }, 'name', /name/],
  ])('rejects %s', (_, input, field, error) => {
    const result = buildDrill({ ...base, ...input }, 'x')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.field).toBe(field)
      expect(result.error).toMatch(error)
    }
  })
})

describe('drillToInput', () => {
  it('round-trips a drill through the editor fields', () => {
    const input = drillToInput(italianGame)
    expect(input.fen).toBe(italianFen)
    expect(input.moves.startsWith('3. Bc4 Bc5 4. c3')).toBe(true)
    const result = buildDrill(input, italianGame.id)
    expect(result).toEqual({ ok: true, drill: italianGame })
  })

  it('round-trips a drill that starts with black to move', () => {
    const drill = { ...italianGame, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', line: ['c5', 'Nf3', 'd6'], playerColor: 'black' as const }
    expect(buildDrill(drillToInput(drill), drill.id)).toEqual({ ok: true, drill })
  })

  it('leaves the FEN field empty for the standard start', () => {
    const drill = { ...italianGame, fen: DEFAULT_POSITION, line: ['e4', 'e5'] }
    expect(drillToInput(drill)).toMatchObject({ fen: '', moves: '1. e4 e5' })
  })
})

describe('buildDrill for engine drills', () => {
  const engine: DrillInput = { ...base, mode: 'engine', goal: { kind: 'checkmate' } }
  const kqk = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1'

  it('builds from a set-up position and ignores the moves field', () => {
    const result = buildDrill({ ...engine, fen: kqk, moves: 'not moves' }, 'x')
    expect(result).toEqual({
      ok: true,
      drill: { id: 'x', mode: 'engine', name: 'Test', description: '', fen: kqk, playerColor: 'white', goal: { kind: 'checkmate' } },
    })
  })

  it('uses the standard start when no position is given', () => {
    const result = buildDrill(engine, 'x')
    expect(result.ok && result.drill.fen).toBe(DEFAULT_POSITION)
  })

  it('rejects positions without both kings or with the waiting side in check', () => {
    expect(buildDrill({ ...engine, fen: '8/8/8/8/8/8/8/3QK3 w - - 0 1' }, 'x')).toMatchObject({ ok: false, field: 'fen' })
    expect(buildDrill({ ...engine, fen: '3k4/8/8/8/8/8/8/3QK3 w - - 0 1' }, 'x')).toMatchObject({ ok: false, field: 'fen' })
  })

  it('rejects winning a piece the opponent does not have', () => {
    const result = buildDrill({ ...engine, fen: kqk, playerColor: 'black', goal: { kind: 'win-piece', piece: 'r' } }, 'x')
    expect(result).toMatchObject({ ok: false, field: 'goal', error: 'White has no rook to win.' })
  })

  it('round-trips through the editor', () => {
    const result = buildDrill({ ...engine, fen: kqk, goal: { kind: 'draw' }, playerColor: 'black' }, 'x')
    if (!result.ok) throw new Error(result.error)
    expect(buildDrill(drillToInput(result.drill), 'x')).toEqual(result)
  })
})
