import { useMemo, useState } from 'react'
import { fenStringToPositionObject } from 'react-chessboard'

/**
 * The board position to hand react-chessboard, and a callback for drops outside the board.
 *
 * react-chessboard 5.12 marks a piece dropped outside the board as a manual drop even when the drop is
 * refused, and then shows the next position change, the next move, without its animation. Calling
 * `onDropOffBoard` hands the board a fresh copy of the same position, which clears that mark without any
 * visible change, so the next move animates again.
 */
export function useBoardPosition(fen: string) {
  const [offBoardDrops, setOffBoardDrops] = useState(0)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- a new object after each off-board drop is the point
  const position = useMemo(() => fenStringToPositionObject(fen, 8, 8), [fen, offBoardDrops])
  return { position, onDropOffBoard: () => setOffBoardDrops((n) => n + 1) }
}
