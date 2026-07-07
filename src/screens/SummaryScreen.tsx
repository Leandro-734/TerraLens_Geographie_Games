import { useGameStore } from '../store/gameStore'
import { useGameNav } from '../lib/nav'
import Flag from '../components/Flag'

export default function SummaryScreen() {
  const score = useGameStore((s) => s.score)
  const results = useGameStore((s) => s.results)
  const newBest = useGameStore((s) => s.newBest)
  const startGame = useGameStore((s) => s.startGame)
  const quitToHome = useGameStore((s) => s.quitToHome)
  const { exitToMenu } = useGameNav()

  const correct = results.filter((r) => r.correct).length
  const total = results.length

  return (
    <div className="screen summary">
      <div className="card">
        <h1 className="title">Game over</h1>
        {newBest && <div className="newBest">🏆 New best score!</div>}

        <div className="finalScore">
          {score.toLocaleString()}
          <span className="finalScoreUnit"> pts</span>
        </div>
        <p className="tagline">
          {correct} / {total} correct
        </p>

        <ul className="recap">
          {results.map((r, i) => (
            <li key={i} className="recapItem">
              <Flag code={r.city.countryCode} size={18} />
              <span className="recapName">{r.city.name}</span>
              <span className={`recapBadge ${r.correct ? 'good' : 'bad'}`}>
                {r.correct
                  ? `+${r.points.toLocaleString()}`
                  : r.guessLabel === '—'
                    ? 'skipped'
                    : r.guessLabel}
              </span>
            </li>
          ))}
        </ul>

        <div className="summaryButtons">
          <button className="btn btnPrimary btnBig" onClick={startGame}>
            Play again
          </button>
          <button className="btn btnGhost" onClick={quitToHome}>
            Change settings
          </button>
          <button className="btn btnGhost" onClick={exitToMenu}>
            ← All games
          </button>
        </div>
      </div>
    </div>
  )
}
