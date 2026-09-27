import type { Drill } from './types'

export const italianGame: Drill = {
  id: 'italian-giuoco-piano',
  name: 'Italian Game: Giuoco Piano main line',
  description:
    'After 1.e4 e5 2.Nf3 Nc6, play the classical c3 and d4 plan as White and meet the Bb4+ check.',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playerColor: 'white',
  line: ['Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5'],
}

export const drills: Drill[] = [italianGame]
