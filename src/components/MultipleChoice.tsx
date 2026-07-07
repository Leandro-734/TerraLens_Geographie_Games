import { useMemo } from 'react'
import type { City } from '../lib/cities'
import { buildOptions } from '../lib/cities'
import Flag from './Flag'

export default function MultipleChoice({
  city,
  pool,
  onGuess,
}: {
  city: City
  pool?: City[]
  onGuess: (label: string, correct: boolean) => void
}) {
  const options = useMemo(() => buildOptions(city, 4, pool), [city.id, pool])

  return (
    <div className="choiceGrid">
      {options.map((o) => (
        <button key={o.id} className="choice" onClick={() => onGuess(o.name, o.id === city.id)}>
          <Flag code={o.countryCode} size={22} />
          <span className="choiceName">{o.name}</span>
        </button>
      ))}
    </div>
  )
}
