import { DrillTrainer } from './components/DrillTrainer'
import { drills } from './drill/drills'

export default function App() {
  const drill = drills[0]
  return (
    <main>
      <header>
        <h1>Chess Trainer</h1>
        <p>Play the expected line from the setup. Moves are checked in your browser.</p>
      </header>
      <DrillTrainer drill={drill} />
    </main>
  )
}
