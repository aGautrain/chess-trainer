import { DEFAULT_POSITION } from 'chess.js'
import { Chessboard, ChessboardProvider, SparePiece, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { boardTheme } from './boardTheme'
import { EMPTY_BOARD, editSetup, fromPlacement, setupPlacement, setupTurn } from '../drill/setup'

const PIECE_TYPES = ['K', 'Q', 'R', 'B', 'N', 'P']

/** react-chessboard names pieces "wQ", "bn"...; FEN uses "Q" for white and "q" for black. */
function fenLetter(pieceType: string): string {
  return pieceType[0] === 'w' ? pieceType[1].toUpperCase() : pieceType[1].toLowerCase()
}

interface Props {
  id: string
  /** The editor's FEN field; empty means the standard start. */
  fen: string
  orientation: 'white' | 'black'
  onChange: (fen: string) => void
}

/**
 * A board where pieces can be placed freely: drag pieces around or off the board to remove them,
 * drag new ones in from the trays, right-click a square to clear it.
 */
export function SetupBoard({ id, fen, orientation, onChange }: Props) {
  function onPieceDrop({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (piece.isSparePiece && !targetSquare) return false
    onChange(editSetup(fen, { piece: fenLetter(piece.pieceType), from: piece.isSparePiece ? null : sourceSquare, to: targetSquare }))
    return true
  }

  function onSquareRightClick({ piece, square }: SquareHandlerArgs) {
    if (piece) onChange(editSetup(fen, { piece: fenLetter(piece.pieceType), from: square, to: null }))
  }

  const tray = (color: 'w' | 'b') => (
    <div className="spare-pieces" aria-label={`${color === 'w' ? 'White' : 'Black'} pieces to add`}>
      {PIECE_TYPES.map((p) => (
        <div key={p} className="spare-piece" title={`Drag to add a ${color === 'w' ? 'white' : 'black'} piece`}>
          <SparePiece pieceType={`${color}${p}`} />
        </div>
      ))}
    </div>
  )
  const top = orientation === 'white' ? 'b' : 'w'

  return (
    <div className="setup-board" data-testid="setup-board">
      <ChessboardProvider
        options={{
          ...boardTheme,
          id,
          position: setupPlacement(fen),
          boardOrientation: orientation,
          allowDragOffBoard: true,
          allowDrawingArrows: false,
          onPieceDrop,
          onSquareRightClick,
        }}
      >
        {tray(top)}
        <Chessboard />
        {tray(top === 'w' ? 'b' : 'w')}
      </ChessboardProvider>
      <div className="actions setup-actions">
        <button type="button" className="small" onClick={() => onChange(DEFAULT_POSITION)}>
          Starting position
        </button>
        <button type="button" className="small" onClick={() => onChange(fromPlacement(EMPTY_BOARD, setupTurn(fen)))}>
          Clear board
        </button>
      </div>
    </div>
  )
}
