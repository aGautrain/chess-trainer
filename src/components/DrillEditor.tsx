import { useId, useMemo, useState, type FormEvent } from 'react'
import { Chessboard } from 'react-chessboard'
import { DEFAULT_POSITION, validateFen } from 'chess.js'
import { formatLine } from '../drill/engine'
import { buildDrill, drillToInput, type DrillInput } from '../drill/importer'
import type { Drill } from '../drill/types'
import { NeutralEvalBar } from './EvalBar'

const emptyInput: DrillInput = { name: '', description: '', fen: '', moves: '', playerColor: 'auto' }

interface Props {
  /** The drill being edited, or undefined for a new one. */
  drill?: Drill
  id: string
  onSave: (drill: Drill) => void
  onCancel: () => void
}

export function DrillEditor({ drill, id, onSave, onCancel }: Props) {
  const [input, setInput] = useState<DrillInput>(() => (drill ? drillToInput(drill) : emptyInput))
  const [submitted, setSubmitted] = useState(false)
  const result = useMemo(() => buildDrill(input, id), [input, id])
  const fieldId = useId()

  // Position and move errors show as soon as there is something to check; a missing name waits for Save.
  const touched = input.fen.trim() !== '' || input.moves.trim() !== ''
  const error = !result.ok && (submitted || (touched && result.field !== 'name')) ? result : null

  const previewFen = result.ok
    ? result.drill.fen
    : input.fen.trim() && validateFen(input.fen.trim()).ok
      ? input.fen.trim()
      : DEFAULT_POSITION
  const orientation = result.ok ? result.drill.playerColor : input.playerColor === 'black' ? 'black' : 'white'

  function set<K extends keyof DrillInput>(key: K, value: DrillInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (result.ok) onSave(result.drill)
  }

  const errorFor = (field: string) =>
    error?.field === field ? (
      <p className="field-error" id={`${fieldId}-${field}-error`} role="alert">
        {error.error}
      </p>
    ) : null

  return (
    <section className="trainer">
      <div className="board-area">
        <NeutralEvalBar orientation={orientation} />
        <div className="board">
          <Chessboard options={{ id: `preview-${id}`, position: previewFen, boardOrientation: orientation, allowDragging: false }} />
        </div>
      </div>
      <form className="panel editor" onSubmit={submit} noValidate>
        <h2>{drill ? 'Edit drill' : 'New drill'}</h2>

        <label htmlFor={`${fieldId}-name`}>Name</label>
        <input
          id={`${fieldId}-name`}
          value={input.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Sicilian Najdorf, English Attack"
          aria-invalid={error?.field === 'name'}
        />
        {errorFor('name')}

        <label htmlFor={`${fieldId}-description`}>Description (optional)</label>
        <input id={`${fieldId}-description`} value={input.description} onChange={(e) => set('description', e.target.value)} />

        <label htmlFor={`${fieldId}-fen`}>Starting position (FEN, optional)</label>
        <input
          id={`${fieldId}-fen`}
          className="mono"
          value={input.fen}
          onChange={(e) => set('fen', e.target.value)}
          placeholder="Leave empty for the standard starting position"
          spellCheck={false}
          aria-invalid={error?.field === 'fen'}
        />
        {errorFor('fen')}

        <label htmlFor={`${fieldId}-moves`}>Line to drill (PGN)</label>
        <textarea
          id={`${fieldId}-moves`}
          className="mono"
          rows={5}
          value={input.moves}
          onChange={(e) => set('moves', e.target.value)}
          placeholder={'1. e4 c5 2. Nf3 d6 3. d4 cxd4\n\nMove text or a full PGN; comments and variations are ignored.'}
          spellCheck={false}
          aria-invalid={error?.field === 'moves'}
        />
        {errorFor('moves')}

        <fieldset className="side">
          <legend>Play as</legend>
          {(['auto', 'white', 'black'] as const).map((c) => (
            <label key={c}>
              <input type="radio" name={`${fieldId}-side`} checked={input.playerColor === c} onChange={() => set('playerColor', c)} />
              {c === 'auto' ? 'Side to move' : c === 'white' ? 'White' : 'Black'}
            </label>
          ))}
        </fieldset>

        {result.ok && (
          <p className="moves" data-testid="editor-preview">
            {result.drill.line.length} moves, you play {result.drill.playerColor}: {formatLine(result.drill, result.drill.line.length)}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="primary">
            Save drill
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
