import { Suspense, lazy } from 'react'
import { useGameStore } from '../store/gameStore'
import { useAdvanceKey } from '../lib/useAdvanceKey'
import Flag from '../components/Flag'

const RevealMap = lazy(() => import('../components/RevealMap'))

export default function ResultScreen() {
  const results = useGameStore((s) => s.results)
  const index = useGameStore((s) => s.index)
  const cities = useGameStore((s) => s.cities)
  const nextRound = useGameStore((s) => s.nextRound)
  useAdvanceKey(true, nextRound)

  const last = results[results.length - 1]
  if (!last) return null

  const isLast = index >= cities.length - 1
  const { city, correct, guessLabel, points } = last

  return (
    <div className="round">
      <div className="mapWrap">
        <Suspense fallback={<div className="revealMap" />}>
          <RevealMap city={city} correct={correct} />
        </Suspense>
      </div>

      <div className={`revealPanel ${correct ? 'revealGood' : 'revealBad'}`}>
        <div className="revealHead">
          <Flag code={city.countryCode} size={44} className="revealFlag" />
          <div className="revealHeadText">
            <h2 className="revealName">{city.name}</h2>
            <p className="revealCountry">
              {city.country} · {city.continent}
            </p>
          </div>
          <span className={`revealBadge ${points > 0 ? 'good' : 'muted'}`}>
            {points > 0 ? `+${points.toLocaleString()}` : '0'} pts
          </span>
        </div>

        <p className="revealVerdict">
          {correct ? (
            'Nice — you got it right.'
          ) : guessLabel === '—' ? (
            'No answer given.'
          ) : (
            <>
              Not quite — you guessed <strong>{guessLabel}</strong>.
            </>
          )}
        </p>

        <button className="btn btnPrimary btnBig" onClick={nextRound}>
          {isLast ? 'See results →' : 'Next round →'}
        </button>
      </div>
    </div>
  )
}
