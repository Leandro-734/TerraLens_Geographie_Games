import { Suspense, lazy, useCallback, useReducer, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useGameNav } from '../../lib/nav'
import { useAdvanceKey } from '../../lib/useAdvanceKey'
import type { City } from '../../lib/cities'
import { pickRounds } from '../../lib/cities'
import { recentKeys, useHistoryStore } from '../../store/historyStore'
import { haversineKm } from '../../lib/geo'
import { LOCATE_MAX_POINTS, scoreByDistanceKm } from '../../lib/scoring'
import Flag from '../../components/Flag'
import type { Guess } from './LocateMap'

const LocateMap = lazy(() => import('./LocateMap'))

type RoundOutcome = { city: City; distanceKm: number; points: number }
type Phase = 'intro' | 'playing' | 'reveal' | 'summary'

interface State {
  phase: Phase
  cities: City[]
  index: number
  score: number
  results: RoundOutcome[]
  guess: Guess | null
}

type Action =
  | { type: 'start'; cities: City[] }
  | { type: 'pick'; guess: Guess }
  | { type: 'submit'; outcome: RoundOutcome }
  | { type: 'next' }
  | { type: 'finish' }

const initial: State = { phase: 'intro', cities: [], index: 0, score: 0, results: [], guess: null }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'start':
      return { phase: 'playing', cities: a.cities, index: 0, score: 0, results: [], guess: null }
    case 'pick':
      return { ...s, guess: a.guess }
    case 'submit':
      return { ...s, phase: 'reveal', score: s.score + a.outcome.points, results: [...s.results, a.outcome] }
    case 'next':
      return { ...s, phase: 'playing', index: s.index + 1, guess: null }
    case 'finish':
      return { ...s, phase: 'summary' }
    default:
      return s
  }
}

const ROUND_OPTIONS = [3, 5, 10]

export default function LocateGame() {
  const { exitToMenu } = useGameNav()
  const recordGame = useAppStore((s) => s.recordGame)
  const best = useAppStore((s) => s.stats.locate.bestScore)

  const [rounds, setRounds] = useState(5)
  const [newBest, setNewBest] = useState(false)
  const [state, dispatch] = useReducer(reducer, initial)

  const city = state.cities[state.index]
  const isLast = state.index >= state.cities.length - 1
  const lastOutcome = state.results[state.results.length - 1]

  // Pick a fresh set of cities, avoiding recently-seen ones, and record them.
  const startRun = useCallback(() => {
    const cities = pickRounds(rounds, 'all', recentKeys('locate'))
    useHistoryStore.getState().remember('locate', cities.map((c) => c.id))
    dispatch({ type: 'start', cities })
  }, [rounds])

  const submitGuess = useCallback(() => {
    if (!state.guess || !city) return
    const distanceKm = haversineKm(state.guess.lat, state.guess.lng, city.lat, city.lon)
    dispatch({ type: 'submit', outcome: { city, distanceKm, points: scoreByDistanceKm(distanceKm) } })
  }, [city, state.guess])

  // Enter/Space submits the placed pin while playing.
  useAdvanceKey(state.phase === 'playing' && !!state.guess, submitGuess)

  const proceed = () => {
    if (!isLast) {
      dispatch({ type: 'next' })
      return
    }
    const closeEnough = state.results.filter((r) => r.distanceKm <= 200).length
    setNewBest(
      recordGame('locate', {
        score: state.score,
        roundsPlayed: state.results.length,
        roundsCorrect: closeEnough,
      }),
    )
    dispatch({ type: 'finish' })
  }

  // Enter/Space advances from the reveal to the next round.
  useAdvanceKey(state.phase === 'reveal', proceed)

  // ---- Intro ----
  if (state.phase === 'intro') {
    return (
      <div className="screen">
        <div className="card">
          <button className="backBtn" onClick={exitToMenu}>
            ← All games
          </button>
          <h1 className="title">
            📍 Pin <span className="titleAccent">the City</span>
          </h1>
          <p className="tagline">
            We name a city — click where it is on the map. The closer your pin, the more points (up
            to {LOCATE_MAX_POINTS.toLocaleString()} per round).
          </p>

          <div className="field">
            <span className="fieldLabel">Rounds</span>
            <div className="segmented">
              {ROUND_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`segment${rounds === n ? ' segmentActive' : ''}`}
                  onClick={() => setRounds(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btnPrimary btnBig"
            onClick={startRun}
          >
            ▶ Play
          </button>

          <div className="statsRow">
            <div className="stat">
              <span className="statValue">{best.toLocaleString()}</span>
              <span className="statLabel">Best score</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Summary ----
  if (state.phase === 'summary') {
    const avgKm = state.results.length
      ? Math.round(state.results.reduce((a, r) => a + r.distanceKm, 0) / state.results.length)
      : 0
    return (
      <div className="screen">
        <div className="card">
          <h1 className="title">Round complete</h1>
          {newBest && <div className="newBest">🏆 New best score!</div>}
          <div className="finalScore">
            {state.score.toLocaleString()}
            <span className="finalScoreUnit"> pts</span>
          </div>
          <p className="tagline">Average miss: {avgKm.toLocaleString()} km</p>

          <ul className="recap">
            {state.results.map((r, i) => (
              <li key={i} className="recapItem">
                <Flag code={r.city.countryCode} size={18} />
                <span className="recapName">{r.city.name}</span>
                <span className="recapBadge good">
                  {Math.round(r.distanceKm).toLocaleString()} km · +{r.points.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>

          <div className="summaryButtons">
            <button
              className="btn btnPrimary btnBig"
              onClick={() => {
                setNewBest(false)
                startRun()
              }}
            >
              Play again
            </button>
            <button className="btn btnGhost" onClick={exitToMenu}>
              ← All games
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Playing / Reveal ----
  if (!city) return null

  return (
    <div className="round">
      <div className="mapWrap">
        <Suspense fallback={<div className="satMap" />}>
          {state.phase === 'playing' ? (
            <LocateMap key={`guess-${state.index}`} onPick={(g) => dispatch({ type: 'pick', guess: g })} />
          ) : (
            <LocateMap key={`reveal-${state.index}`} guess={state.guess} city={city} reveal />
          )}
        </Suspense>
      </div>

      <div className="hud">
        <button className="iconBtn" onClick={exitToMenu} aria-label="Quit game" title="Quit game">
          ✕
        </button>
        <div className="hudRight">
          <div className="statPill">
            <span className="statPillRound">
              Round {state.index + 1}/{state.cities.length}
            </span>
            <span className="statPillScore">{state.score.toLocaleString()} pts</span>
          </div>
        </div>
      </div>

      <div className="overlayPrompt">
        <p className="locatePrompt">
          {state.phase === 'playing' ? 'Where is ' : 'It was '}
          <strong>
            <Flag code={city.countryCode} size={20} /> {city.name}
          </strong>
          , {city.country}
          {state.phase === 'playing' ? '?' : ''}
        </p>
      </div>

      <div className="guessPanel">
        {state.phase === 'playing' ? (
          <button className="btn btnPrimary btnBig" disabled={!state.guess} onClick={submitGuess}>
            {state.guess ? 'Submit guess' : 'Tap the map to place your pin'}
          </button>
        ) : (
          <>
            <p className="locateResult">
              <strong>{Math.round(lastOutcome?.distanceKm ?? 0).toLocaleString()} km</strong> away ·{' '}
              <span className="pointsInline">+{(lastOutcome?.points ?? 0).toLocaleString()} pts</span>
            </p>
            <button className="btn btnPrimary btnBig" onClick={proceed}>
              {isLast ? 'See results →' : 'Next round →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
