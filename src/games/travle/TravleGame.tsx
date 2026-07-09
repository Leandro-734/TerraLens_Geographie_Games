import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useGameNav } from '../../lib/nav'
import { recentKeys, useHistoryStore } from '../../store/historyStore'
import Flag from '../../components/Flag'
import { CloseIcon } from '../../components/icons'
import { useStickyFocus } from '../../lib/useStickyFocus'
import { travleTrailScore } from '../../lib/scoring'
import type { Puzzle } from '../../lib/countries'
import {
  connectedFrom,
  findCountry,
  getCountry,
  isConnected,
  pickPuzzle,
  searchCountries,
  shortestPath,
  shortestPathWithin,
} from '../../lib/countries'
import type { Hints } from './TravleMap'

const TravleMap = lazy(() => import('./TravleMap'))

type Phase = 'intro' | 'playing' | 'solved' | 'failed'

// Hint stages, revealed strictly in order.
const HINT_STAGES: { label: string }[] = [
  { label: '🗺️ Continents' },
  { label: '🔦 Next outline' },
  { label: '🌍 All outlines' },
  { label: '🔤 Initials' },
]

export default function TravleGame() {
  const { exitToMenu } = useGameNav()
  const recordGame = useAppStore((s) => s.recordGame)
  const best = useAppStore((s) => s.stats.travle.bestScore)

  const [phase, setPhase] = useState<Phase>('intro')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [guessed, setGuessed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [hintLevel, setHintLevel] = useState(0) // number of hint stages revealed (0–4)
  const [runScore, setRunScore] = useState(0)
  const [trailsSolved, setTrailsSolved] = useState(0)
  const [lastSolve, setLastSolve] = useState<{ score: number; extra: number; hints: number } | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [resultView, setResultView] = useState<'mine' | 'best'>('mine')
  const inputRef = useRef<HTMLInputElement>(null)
  useStickyFocus(inputRef)

  const budget = puzzle ? puzzle.par + 3 : 0
  const guessesLeft = Math.max(0, budget - guessed.length)
  const suggestions = useMemo(() => searchCountries(query, 6), [query])

  const hints: Hints = {
    continents: hintLevel >= 1,
    nextOutline: hintLevel >= 2,
    allOutlines: hintLevel >= 3,
    initials: hintLevel >= 4,
  }

  // Classify each guessed country for colouring: on the winning route (green),
  // connected but redundant (orange), or not linked to the start (grey).
  const cls = useMemo(() => {
    const empty = { route: [] as string[], redundant: [] as string[], off: [] as string[], solved: false }
    if (!puzzle) return empty
    const allowed = new Set([puzzle.start.name, puzzle.end.name, ...guessed])
    const reach = connectedFrom(puzzle.start.name, allowed)
    const solved = reach.has(puzzle.end.name)
    let routeSet = new Set<string>()
    if (solved) {
      const path = shortestPathWithin(puzzle.start.name, puzzle.end.name, allowed)
      if (path) routeSet = new Set(path.filter((n) => n !== puzzle.start.name && n !== puzzle.end.name))
    }
    const off = guessed.filter((n) => !reach.has(n))
    const route = solved ? guessed.filter((n) => routeSet.has(n)) : guessed.filter((n) => reach.has(n))
    const redundant = solved ? guessed.filter((n) => reach.has(n) && !routeSet.has(n)) : []
    return { route, redundant, off, solved }
  }, [puzzle, guessed])

  const nextCode = useMemo(() => {
    if (!puzzle) return null
    const path = shortestPath(puzzle.start.name, puzzle.end.name)
    const nextName = path?.find((n) => n !== puzzle.start.name && n !== puzzle.end.name && !guessed.includes(n))
    return nextName ? getCountry(nextName)!.code : null
  }, [puzzle, guessed])

  const toCodes = (names: string[]) => names.map((n) => getCountry(n)!.code)

  const newPuzzle = () => {
    const next = pickPuzzle(3, 6, recentKeys('travle'))
    // Remember the start and end so neither anchors a trail again too soon.
    useHistoryStore.getState().remember('travle', [next.start.code, next.end.code])
    setPuzzle(next)
    setGuessed([])
    setQuery('')
    setMessage('')
    setHintLevel(0)
    setLastSolve(null)
    setResultView('mine')
    setPhase('playing')
  }
  const startRun = () => {
    setRunScore(0)
    setTrailsSolved(0)
    setNewBest(false)
    newPuzzle()
  }
  const finalize = (finalScore: number, solved: number) =>
    setNewBest(recordGame('travle', { score: finalScore, roundsPlayed: solved, roundsCorrect: solved, streak: solved }))

  const submit = (text: string) => {
    if (!puzzle || phase !== 'playing') return
    const c = findCountry(text)
    setQuery('')
    inputRef.current?.focus()
    if (!c) {
      setMessage(`"${text.trim()}" isn't a country I know`)
      return
    }
    if (c.name === puzzle.start.name || c.name === puzzle.end.name) {
      setMessage("That's an endpoint — name countries between them")
      return
    }
    if (guessed.includes(c.name)) {
      setMessage(`${c.name} is already on the board`)
      return
    }
    const next = [...guessed, c.name]
    setGuessed(next)
    if (isConnected(next, puzzle.start.name, puzzle.end.name)) {
      const optimalBetween = puzzle.par - 1
      const extra = Math.max(0, next.length - optimalBetween)
      const score = travleTrailScore(next.length, optimalBetween, hintLevel)
      setRunScore((s) => s + score)
      setTrailsSolved((t) => t + 1)
      setLastSolve({ score, extra, hints: hintLevel })
      setMessage('')
      setPhase('solved')
    } else if (next.length >= budget) {
      finalize(runScore, trailsSolved)
      setMessage('')
      setPhase('failed')
    } else {
      const links = connectedFrom(
        puzzle.start.name,
        new Set([puzzle.start.name, puzzle.end.name, ...next]),
      ).has(c.name)
      setMessage(links ? `${c.name} — linked to the trail ✓` : `${c.name} — not linked yet`)
    }
  }

  const quit = () => {
    if ((runScore > 0 || trailsSolved > 0) && (phase === 'playing' || phase === 'solved')) {
      finalize(runScore, trailsSolved)
    }
    exitToMenu()
  }

  const surrender = () => {
    if (phase !== 'playing') return
    finalize(runScore, trailsSolved)
    setMessage('')
    setPhase('failed')
  }

  // ---- Intro ----
  if (phase === 'intro' || !puzzle) {
    return (
      <div className="screen">
        <div className="card">
          <button className="backBtn" onClick={exitToMenu}>
            ← All games
          </button>
          <h1 className="title">
            🧭 Country <span className="titleAccent">Trail</span>
          </h1>
          <p className="tagline">
            Link the two countries by naming a chain of bordering countries. Each trail is worth
            1000 points — lose 100 for every extra country and every hint.
          </p>
          <button className="btn btnPrimary btnBig" onClick={startRun}>
            ▶ Play
          </button>
          <div className="statsRow">
            <div className="stat">
              <span className="statValue">{best.toLocaleString()}</span>
              <span className="statLabel">Best score</span>
            </div>
          </div>
          <details className="howto">
            <summary>How to play</summary>
            <ul>
              <li>Only the start and destination are shown on the globe at first.</li>
              <li>Type any country that borders one already in your trail.</li>
              <li>
                <strong style={{ color: 'var(--good)' }}>Green</strong> = on the winning route,{' '}
                <strong style={{ color: '#ffb84d' }}>orange</strong> = connected but not needed.
              </li>
              <li>Hints unlock in order (continents → next → all outlines → initials), −100 each.</li>
            </ul>
          </details>
        </div>
      </div>
    )
  }

  const revealPath =
    phase === 'solved' || phase === 'failed'
      ? shortestPath(puzzle.start.name, puzzle.end.name)
      : null
  const optimalBetween = puzzle.par - 1
  // Best route's intermediate countries (endpoints stripped), used by both the
  // toggle's map highlight and its readable name list.
  const bestRoute = revealPath
    ? revealPath.filter((n) => n !== puzzle.start.name && n !== puzzle.end.name)
    : []
  // Only surface the best route when it's actually instructive: either the
  // player solved it but used more countries than the optimum (so the best
  // route is genuinely shorter), or they ran out of guesses and never linked
  // it. If they matched the optimal length, their own route *is* a best route —
  // showing a same-length alternative just confuses.
  const solvedOptimally = phase === 'solved' && lastSolve !== null && lastSolve.extra === 0
  const showToggle = (phase === 'solved' || phase === 'failed') && !solvedOptimally
  const showingBest = showToggle && resultView === 'best'

  // A single readable line summarising how the trail was solved.
  const solveCaption = (() => {
    if (phase !== 'solved' || !lastSolve) return ''
    const parts = [
      solvedOptimally
        ? 'Shortest possible route'
        : `${lastSolve.extra} extra ${lastSolve.extra === 1 ? 'country' : 'countries'}`,
    ]
    if (lastSolve.hints > 0)
      parts.push(`${lastSolve.hints} ${lastSolve.hints === 1 ? 'hint' : 'hints'}`)
    return parts.join(' · ')
  })()

  const hintBtn = (i: number) => {
    const revealed = hintLevel > i
    const isNext = hintLevel === i
    const extra = revealed ? ' hintOn' : isNext ? '' : ' hintLocked'
    return (
      <button
        key={i}
        className={`hintBtn${extra}`}
        disabled={!isNext}
        onClick={() => setHintLevel(i + 1)}
      >
        {HINT_STAGES[i].label}
      </button>
    )
  }

  const hasStatus =
    (phase === 'playing' && (message !== '' || guessed.length > 0)) ||
    phase === 'solved' ||
    phase === 'failed'

  return (
    <div className="round">
      <div className="travleMapWrap">
        <Suspense fallback={<div className="travleMap" />}>
          <TravleMap
            startCode={puzzle.start.code}
            endCode={puzzle.end.code}
            route={toCodes(showingBest ? bestRoute : cls.route)}
            redundant={toCodes(showingBest ? [] : cls.redundant)}
            off={toCodes(showingBest ? [] : cls.off)}
            nextCode={nextCode}
            hints={hints}
            revealAll={phase === 'solved' || phase === 'failed'}
          />
        </Suspense>
      </div>

      <div className="hud">
        <button className="iconBtn" onClick={quit} aria-label="Quit game" title="Quit game">
          <CloseIcon />
        </button>
        <div className="hudRight">
          <div className="statPill">
            <span className="statPillRound">{guessesLeft} left</span>
            <span className="statPillScore">{runScore.toLocaleString()} pts</span>
          </div>
        </div>
      </div>

      <div className="overlayPrompt">
        <div className="travleTop">
          <div className="travleRoute">
            <span className="travleNode">
              <Flag code={puzzle.start.code} size={20} />
              {puzzle.start.name}
            </span>
            <span className="travleArrow">→</span>
            <span className={`travleNode${cls.solved ? ' linked' : ''}`}>
              <Flag code={puzzle.end.code} size={20} />
              {puzzle.end.name}
            </span>
          </div>
          <p className="travlePar">Best route: {optimalBetween} countries between</p>
        </div>
      </div>

      <div className="guessPanel">
        {hasStatus && (
          <div className="travleStatus">
            {phase === 'playing' && message && <p className="travleMsg">{message}</p>}

        {phase === 'solved' && lastSolve && (
          <div className="travleResult">
            <span className="travleVerdict good">
              {lastSolve.score === 1000 ? 'Perfect' : 'Solved'}
            </span>
            <span className="travleResultBadge good">+{lastSolve.score.toLocaleString()} pts</span>
          </div>
        )}

        {phase === 'solved' && solveCaption && <p className="travleSubtle">{solveCaption}</p>}

        {phase === 'failed' && (
          <>
            <div className="travleResult">
              <span className="travleVerdict bad">Out of guesses</span>
              <span className="travleResultBadge muted">{runScore.toLocaleString()} pts</span>
            </div>
            {newBest && <div className="newBest">🏆 New best score!</div>}
          </>
        )}

        {showToggle && (
          <div className="travleToggle" role="tablist" aria-label="Route view">
            <button
              className={`travleToggleBtn${resultView === 'mine' ? ' active' : ''}`}
              role="tab"
              aria-selected={resultView === 'mine'}
              onClick={() => setResultView('mine')}
            >
              Your route
            </button>
            <button
              className={`travleToggleBtn${resultView === 'best' ? ' active' : ''}`}
              role="tab"
              aria-selected={resultView === 'best'}
              onClick={() => setResultView('best')}
            >
              Best route
            </button>
          </div>
        )}

        {showingBest ? (
          bestRoute.length > 0 ? (
            <p className="travlePath">
              {bestRoute.map((name, i) => (
                <span key={name} className="pathStep">
                  {i > 0 && <span className="pathArrow">→</span>}
                  <span className="tChip tChipGood">{name}</span>
                </span>
              ))}
            </p>
          ) : (
            <p className="travleMsg">These two countries share a border.</p>
          )
        ) : (
          guessed.length > 0 && (
            <div className="travleChips">
              {guessed.map((name) => {
                const role = cls.route.includes(name)
                  ? 'tChipGood'
                  : cls.redundant.includes(name)
                    ? 'tChipWarn'
                    : 'tChipDim'
                return (
                  <span key={name} className={`tChip ${role}`}>
                    <Flag code={getCountry(name)!.code} size={16} /> {name}
                  </span>
                )
              })}
            </div>
          )
        )}
          </div>
        )}

        {phase === 'playing' && (
          <>
            <div className="hintRow">
              <span className="hintLabel">Hints −100 each</span>
              {HINT_STAGES.map((_, i) => hintBtn(i))}
            </div>
            <div className="autocomplete">
              {suggestions.length > 0 && (
                <ul className="suggestions" role="listbox">
                  {suggestions.map((c) => (
                    <li key={c.code}>
                      <button className="suggestion" onClick={() => submit(c.name)}>
                        <Flag code={c.code} size={20} />
                        <span className="suggestionName">{c.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="inputRow">
                <input
                  ref={inputRef}
                  className="cityInput"
                  autoFocus
                  value={query}
                  placeholder="Name a country…"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submit(suggestions[0] ? suggestions[0].name : query)
                    }
                  }}
                />
                <button
                  className="btn btnPrimary"
                  onClick={() => submit(suggestions[0] ? suggestions[0].name : query)}
                >
                  Guess
                </button>
              </div>
            </div>
            <button className="linkBtn travleGiveUp" onClick={surrender}>
              Give up
            </button>
          </>
        )}

        {phase === 'solved' && (
          <button className="btn btnPrimary btnBig" onClick={newPuzzle}>
            Next trail →
          </button>
        )}

        {phase === 'failed' && (
          <div className="summaryButtons">
            <button className="btn btnPrimary btnBig" onClick={startRun}>
              Play again
            </button>
            <button className="btn btnGhost" onClick={exitToMenu}>
              ← All games
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
