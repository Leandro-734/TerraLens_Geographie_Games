import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { City } from '../lib/cities'
import { CITIES } from '../lib/cities'
import { createCityFuse, isCorrectGuess, searchCities } from '../lib/matching'
import { useStickyFocus } from '../lib/useStickyFocus'
import Flag from './Flag'

export default function AutocompleteInput({
  city,
  pool = CITIES,
  onGuess,
}: {
  city: City
  /** Cities the suggestions are drawn from — scoped to the round's region/type. */
  pool?: City[]
  onGuess: (label: string, correct: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  useStickyFocus(inputRef)

  // "Type anywhere": if the player starts typing while the map (or anything
  // else) has focus, capture the keystroke into the search box. This means you
  // can keep typing even while panning/zooming the satellite view, without
  // having to click back into the input first.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = inputRef.current
      if (!el || document.activeElement === el) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length === 1) {
        e.preventDefault()
        setQuery((q) => (e.key === ' ' && q === '' ? q : q + e.key))
        setActive(0)
        el.focus()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setQuery((q) => q.slice(0, -1))
        el.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fuse = useMemo(() => createCityFuse(pool), [pool])
  const suggestions = useMemo(() => searchCities(fuse, pool, query, 6), [fuse, pool, query])

  const submit = (text: string) => {
    if (!text.trim()) return
    onGuess(text, isCorrectGuess(text, city))
  }

  const submitActive = () => {
    const choice = suggestions[active]
    submit(choice ? choice.name : query)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, Math.max(0, suggestions.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submitActive()
    }
  }

  return (
    <div className="autocomplete">
      {suggestions.length > 0 && (
        <ul className="suggestions" role="listbox">
          {suggestions.map((c, i) => (
            <li key={c.id}>
              <button
                className={`suggestion${i === active ? ' suggestionActive' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => submit(c.name)}
                role="option"
                aria-selected={i === active}
              >
                <Flag code={c.countryCode} size={20} />
                <span className="suggestionName">{c.name}</span>
                <span className="suggestionCountry">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="inputRow">
        <input
          ref={inputRef}
          className="cityInput"
          value={query}
          placeholder="Type the city name…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          aria-label="City name"
        />
        <button className="btn btnPrimary" onClick={submitActive}>
          Guess
        </button>
      </div>

      <button className="linkBtn" onClick={() => onGuess('—', false)}>
        Skip this one
      </button>
    </div>
  )
}
