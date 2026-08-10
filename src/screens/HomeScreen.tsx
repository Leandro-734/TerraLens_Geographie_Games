import { useGameStore } from '../store/gameStore'
import { useAppStore } from '../store/appStore'
import { useGameNav } from '../lib/nav'
import { CITIES, FAMOUS_CITY_COUNT } from '../lib/cities'
import type { CityPool, Region } from '../lib/cities'
import type { Difficulty } from '../lib/scoring'
import { unlockAudio } from '../lib/sound'
import RegionSelect from '../components/RegionSelect'

const ROUND_OPTIONS = [3, 5, 10]

export default function HomeScreen() {
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const startGame = useGameStore((s) => s.startGame)
  const stats = useAppStore((s) => s.stats.satellite)
  const { exitToMenu } = useGameNav()

  const accuracy =
    stats.roundsPlayed > 0 ? Math.round((stats.roundsCorrect / stats.roundsPlayed) * 100) : 0

  // Older persisted settings may predate the city-pool toggle.
  const cityPool: CityPool = settings.cityPool ?? 'all'

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

        <div className="fieldGrid">
          <div className="field">
            <span className="fieldLabel">Answer</span>
            <div className="segmented">
              {(['easy', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`segment${settings.difficulty === d ? ' segmentActive' : ''}`}
                  onClick={() => setSettings({ difficulty: d })}
                >
                  {d === 'easy' ? 'Choice' : 'Type'}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="fieldLabel">Cities</span>
            <div className="segmented">
              {(['famous', 'all'] as CityPool[]).map((p) => (
                <button
                  key={p}
                  className={`segment${cityPool === p ? ' segmentActive' : ''}`}
                  onClick={() => setSettings({ cityPool: p })}
                >
                  {p === 'famous' ? 'Famous' : 'All'}
                  <span className="cityPoolCount">
                    {p === 'famous' ? ` ${FAMOUS_CITY_COUNT}` : ` ${CITIES.length}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fieldGrid">
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
            <span className="fieldLabel">Region</span>
            <RegionSelect
              value={settings.region}
              onChange={(region) => setSettings({ region: region as Region | 'all' })}
            />
          </div>
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
