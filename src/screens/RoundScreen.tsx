import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useGameNav } from '../lib/nav'
import { citiesInRegion } from '../lib/cities'
import { ROUND_SECONDS, computeScore } from '../lib/scoring'
import { playTick, playTimeUp } from '../lib/sound'
import GuessInput from '../components/GuessInput'
import ScoreBar from '../components/ScoreBar'
import Timer from '../components/Timer'

// MapLibre is heavy; load it only once a round actually starts.
const SatelliteMap = lazy(() => import('../components/SatelliteMap'))

export default function RoundScreen() {
  const settings = useGameStore((s) => s.settings)
  const cities = useGameStore((s) => s.cities)
  const index = useGameStore((s) => s.index)
  const score = useGameStore((s) => s.score)
  const streak = useGameStore((s) => s.streak)
  const submitGuess = useGameStore((s) => s.submitGuess)
  const setSettings = useGameStore((s) => s.setSettings)
  const { exitToMenu } = useGameNav()

  const city = cities[index]
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const answeredRef = useRef(false)
  // Keep multiple-choice distractors on-theme with the chosen region.
  const pool = useMemo(() => citiesInRegion(settings.region), [settings.region])

  // Reset state at the start of each round.
  useEffect(() => {
    answeredRef.current = false
    setSecondsLeft(ROUND_SECONDS)
  }, [city?.id])

  const handleGuess = (label: string, correct: boolean) => {
    if (answeredRef.current || !city) return
    answeredRef.current = true
    const points = computeScore(correct, settings.difficulty, settings.useTimer ? secondsLeft : 0)
    submitGuess({
      city,
      guessLabel: label,
      correct,
      points,
      secondsLeft: settings.useTimer ? secondsLeft : ROUND_SECONDS,
    })
  }

  // Countdown tick.
  useEffect(() => {
    if (!settings.useTimer || !city) return
    const t = setInterval(() => setSecondsLeft((p) => Math.max(0, p - 1)), 1000)
    return () => clearInterval(t)
  }, [city?.id, settings.useTimer])

  // Auto-submit a miss when time runs out.
  useEffect(() => {
    if (settings.useTimer && secondsLeft === 0 && !answeredRef.current) {
      handleGuess('—', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, settings.useTimer])

  // Countdown audio cues for the final seconds.
  useEffect(() => {
    if (!settings.useTimer || !settings.sound) return
    if (secondsLeft > 0 && secondsLeft <= 5) playTick()
    else if (secondsLeft === 0) playTimeUp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  if (!city) return null

  return (
    <div className="round">
      <div className="mapWrap">
        <Suspense fallback={<div className="satMap" />}>
          <SatelliteMap city={city} />
        </Suspense>
      </div>
      <ScoreBar
        round={index + 1}
        total={cities.length}
        score={score}
        streak={streak}
        onQuit={exitToMenu}
        muted={!settings.sound}
        onToggleMute={() => setSettings({ sound: !settings.sound })}
      />
      {settings.useTimer && (
        <div className="timerOverlay">
          <Timer secondsLeft={secondsLeft} total={ROUND_SECONDS} />
        </div>
      )}
      <div className="guessPanel">
        <p className="guessPrompt">Which city is this?</p>
        <GuessInput city={city} difficulty={settings.difficulty} pool={pool} onGuess={handleGuess} />
      </div>
    </div>
  )
}
