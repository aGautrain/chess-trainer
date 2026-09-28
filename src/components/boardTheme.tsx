import type { ChessboardOptions, PieceRenderObject } from 'react-chessboard'

// Keyed by file name ("wp", "bk"...) so adding a set means dropping 12 PNGs in the folder.
const images = import.meta.glob<string>('../assets/pieces/*.png', { eager: true, import: 'default' })

const pieces: PieceRenderObject = {}
for (const color of ['w', 'b']) {
  for (const type of ['p', 'n', 'b', 'r', 'q', 'k']) {
    const src = images[`../assets/pieces/${color}${type}.png`]
    pieces[`${color}${type.toUpperCase()}`] = (props) => (
      <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', ...props?.svgStyle }} />
    )
  }
}

const light = '#edd6b0'
const dark = '#b88762'

/** Piece set and square colours shared by every board in the app. */
export const boardTheme = {
  pieces,
  lightSquareStyle: { backgroundColor: light },
  darkSquareStyle: { backgroundColor: dark },
  lightSquareNotationStyle: { color: dark },
  darkSquareNotationStyle: { color: light },
} satisfies ChessboardOptions
