import { useGameStore } from '../store/gameStore'
import { useAppStore } from '../store/appStore'
import { useGameNav } from '../lib/nav'
import { CITIES, CONTINENTS, SUB_REGIONS } from '../lib/cities'
import type { Region, SubRegion } from '../lib/cities'
import { DIFFICULTY_LABELS } from '../lib/scoring'
import type { Difficulty } from '../lib/scoring'
import { unlockAudio } from '../lib/sound'

const ROUND_OPTIONS = [3, 5, 10]

const SUB_REGION_EMOJI: Record<SubRegion, string> = {
  'Arabian Peninsula': '🐪',
  USA: '🇺🇸',
  China: '🇨🇳',
}

export default function HomeScreen() {
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const startGame = useGameStore((s) => s.startGame)
  const stats = useAppStore((s) => s.stats.satellite)
  const { exitToMenu } = useGameNav()

  const accuracy =
    stats.roundsPlayed > 0 ? Math.round((stats.roundsCorrect / stats.roundsPlayed) * 100) : 0

  return (
    <div className="screen home">
      <div className="card">
        <button className="backBtn" onClick={exitToMenu}>
          ← All games
        </button>
        <h1 className="title">
          City <span className="titleAccent">from Satellite</span>
        </h1>
        <p className="tagline">
          You get a satellite image — name the city. {CITIES.length} cities worldwide.
        </p>

        <div className="field">
          <span className="fieldLabel">Difficulty</span>
          <div className="segmented">
            {(['easy', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                className={`segment${settings.difficulty === d ? ' segmentActive' : ''}`}
                onClick={() => setSettings({ difficulty: d })}
              >
                {d === 'easy' ? 'Easy' : 'Hard'}
              </button>
            ))}
          </div>
          <p className="fieldHint">{DIFFICULTY_LABELS[settings.difficulty]}</p>
        </div>

        <div className="field">
          <span className="fieldLabel">Rounds</span>
          <div className="segmented">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                className={`segment${settings.totalRounds === n ? ' segmentActive' : ''}`}
                onClick={() => setSettings({ totalRounds: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="fieldLabel" htmlFor="region">
            Region
          </label>
          <select
            id="region"
            className="select"
            value={settings.region}
            onChange={(e) => setSettings({ region: e.target.value as Region | 'all' })}
          >
            <option value="all">🌍 Whole world</option>
            <optgroup label="Continents">
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
            <optgroup label="Popular regions">
              {SUB_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {SUB_REGION_EMOJI[r]} {r}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="field fieldRow">
          <label className="fieldLabel" htmlFor="timerToggle">
            Round timer · 30s, speed bonus
          </label>
          <input
            id="timerToggle"
            type="checkbox"
            className="toggle"
            checked={settings.useTimer}
            onChange={(e) => setSettings({ useTimer: e.target.checked })}
          />
        </div>

        <div className="field fieldRow">
          <label className="fieldLabel" htmlFor="soundToggle">
            Countdown sounds
          </label>
          <input
            id="soundToggle"
            type="checkbox"
            className="toggle"
            checked={settings.sound}
            onChange={(e) => setSettings({ sound: e.target.checked })}
          />
        </div>

        <button
          className="btn btnPrimary btnBig"
          onClick={() => {
            unlockAudio()
            startGame()
          }}
        >
          ▶ Play
        </button>

        <div className="statsRow">
          <div className="stat">
            <span className="statValue">{stats.bestScore.toLocaleString()}</span>
            <span className="statLabel">Best score</span>
          </div>
          <div className="stat">
            <span className="statValue">{stats.gamesPlayed}</span>
            <span className="statLabel">Games</span>
          </div>
          <div className="stat">
            <span className="statValue">{accuracy}%</span>
            <span className="statLabel">Accuracy</span>
          </div>
        </div>

        <details className="howto">
          <summary>How to play</summary>
          <ul>
            <li>You're shown a satellite image of a city — with no place labels.</li>
            <li>Pan and zoom in to spot rivers, coastlines, stadiums and street grids.</li>
            <li>
              <strong>Easy:</strong> pick from four options. <strong>Hard:</strong> type the name
              (accents optional, common aliases accepted).
            </li>
            <li>With the timer on, answering faster earns a bigger bonus.</li>
          </ul>
        </details>

        <p className="footer">
          Imagery © Esri, Maxar, Earthstar Geographics. For educational / non-commercial use.
        </p>
      </div>
    </div>
  )
}
