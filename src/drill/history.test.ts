import { describe, expect, it } from 'vitest'
import { formatMoves } from './engine'
import { numberMoves, stepHistory } from './history'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

function text(fen: string, moves: string[]): string {
  return numberMoves(fen, moves)
    .map(({ number, san }) => (number ? `${number} ${san}` : san))
    .join(' ')
}

describe('numberMoves', () => {
  it('numbers moves the same way formatMoves does', () => {
    for (const [fen, moves] of [
      [START, ['e4', 'e5', 'Nf3']],
      [BLACK_TO_MOVE, ['e5', 'Nf3', 'Nc6']],
      [START, []],
    ] as const) {
      expect(text(fen, [...moves])).toBe(formatMoves(fen, [...moves]))
    }
  })

  it('shows a number only before White moves and a first Black move', () => {
    expect(numberMoves(BLACK_TO_MOVE, ['e5', 'Nf3']).map((m) => m.number)).toEqual(['1...', '2.'])
  })
})

describe('stepHistory', () => {
  it('steps one move back and forward within the game', () => {
    expect(stepHistory(3, 5, 'ArrowLeft')).toBe(2)
    expect(stepHistory(0, 5, 'ArrowLeft')).toBe(0)
    expect(stepHistory(3, 5, 'ArrowRight')).toBe(4)
    expect(stepHistory(5, 5, 'ArrowRight')).toBe(5)
  })

  it('jumps to the start and the end', () => {
    expect(stepHistory(3, 5, 'Home')).toBe(0)
    expect(stepHistory(3, 5, 'End')).toBe(5)
  })
})
