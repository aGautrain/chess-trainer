import { useState } from 'react'
import { DrillEditor } from './components/DrillEditor'
import { DrillLibrary } from './components/DrillLibrary'
import { DrillTrainer } from './components/DrillTrainer'
import { EngineDrillTrainer } from './components/EngineDrillTrainer'
import { ReviewPanel } from './components/ReviewPanel'
import { drills as builtInDrills } from './drill/drills'
import { loadCustomDrills, newDrillId, saveCustomDrills } from './drill/storage'
import type { Drill } from './drill/types'
import { reviews } from './review/useReviews'

type View = { kind: 'play' } | { kind: 'edit'; drill?: Drill; id: string }

export default function App() {
  const [customDrills, setCustomDrills] = useState<Drill[]>(() => loadCustomDrills())
  const [selectedId, setSelectedId] = useState<string>(builtInDrills[0].id)
  const [view, setView] = useState<View>({ kind: 'play' })
  const [saveFailed, setSaveFailed] = useState(false)

  const allDrills = [...builtInDrills, ...customDrills]
  const selected = allDrills.find((d) => d.id === selectedId) ?? builtInDrills[0]

  function updateCustom(next: Drill[]) {
    setCustomDrills(next)
    setSaveFailed(!saveCustomDrills(next))
  }

  function play(drill: Drill) {
    setSelectedId(drill.id)
    setView({ kind: 'play' })
  }

  function save(drill: Drill) {
    const exists = customDrills.some((d) => d.id === drill.id)
    updateCustom(exists ? customDrills.map((d) => (d.id === drill.id ? drill : d)) : [...customDrills, drill])
    setSelectedId(drill.id)
    setView({ kind: 'play' })
  }

  function remove(drill: Drill) {
    updateCustom(customDrills.filter((d) => d.id !== drill.id))
    reviews.remove(drill.id)
    if (selectedId === drill.id) setSelectedId(builtInDrills[0].id)
    if (view.kind === 'edit' && view.id === drill.id) setView({ kind: 'play' })
  }

  return (
    <main>
      <header>
        <h1>Chess Trainer</h1>
        <p>Play the expected line from a setup, or play a position out against Stockfish. Everything runs in your browser.</p>
      </header>
      {saveFailed && (
        <p className="warning" role="alert">
          Your browser did not let this page save drills, so custom drills will be lost when you close the tab.
        </p>
      )}
      <div className="layout">
        <DrillLibrary
          builtIn={builtInDrills}
          custom={customDrills}
          selectedId={view.kind === 'play' ? selected.id : null}
          onSelect={play}
          onNew={() => setView({ kind: 'edit', id: newDrillId() })}
          onEdit={(d) => setView({ kind: 'edit', drill: d, id: d.id })}
          onDelete={remove}
        />
        {view.kind === 'edit' ? (
          <DrillEditor key={view.id} drill={view.drill} id={view.id} onSave={save} onCancel={() => setView({ kind: 'play' })} />
        ) : (
          // Keyed by content so switching or editing a drill starts it fresh.
          selected.mode === 'engine' ? (
            <EngineDrillTrainer key={`${selected.id}:${selected.fen}:${selected.playerColor}:${JSON.stringify(selected.goal)}`} drill={selected} />
          ) : (
            <DrillTrainer key={`${selected.id}:${selected.fen}:${selected.line.join(' ')}`} drill={selected} />
          )
        )}
      </div>
      <ReviewPanel drills={allDrills} onSelect={play} />
    </main>
  )
}
