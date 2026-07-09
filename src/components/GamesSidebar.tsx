import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { GAMES } from '../games/registry'
import { useGameNav } from '../lib/nav'
import { useAppStore, emptyStats } from '../store/appStore'
import { CloseIcon } from './icons'

/**
 * Green brand rail on the left edge ("test your geography", as in the Figma
 * mock). Clicking it expands a full-height overlay panel listing the games.
 */
export default function GamesSidebar() {
  // 'closed' → not in the DOM; 'open' → sliding/settled in; 'closing' → playing
  // the reverse animation before unmounting (so the close is animated too).
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const { openGame } = useGameNav()
  const stats = useAppStore((s) => s.stats)

  const close = () => setPhase((p) => (p === 'open' ? 'closing' : p))

  useEffect(() => {
    if (phase !== 'open') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  return (
    <>
      <button
        className="sideRail"
        onClick={() => setPhase('open')}
        aria-label="Browse the games"
        aria-expanded={phase === 'open'}
      >
        <span className="sideRailArrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path
              d="M2 8h11M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="sideRailText">test your geography</span>
        <span className="sideRailGames">{GAMES.length} games</span>
      </button>

      {phase !== 'closed' && (
        <div
          className={`sideOverlay${phase === 'closing' ? ' sideOverlayClosing' : ''}`}
          onWheel={(e) => e.stopPropagation()}
        >
          <button className="sideScrim" aria-label="Close" onClick={close} />
          <aside
            className="sidePanel"
            // When the reverse slide itself finishes, drop the overlay from the
            // DOM. Guard on the animation name so bubbling child animations
            // (the staggered list items) can't unmount us early.
            onAnimationEnd={(e) => {
              if (phase === 'closing' && e.animationName === 'panelOut') setPhase('closed')
            }}
          >
            <header className="sidePanelHead">
              <span className="sidePanelTitle">Pick a game</span>
              <button className="sideClose" onClick={close} aria-label="Close">
                <CloseIcon />
              </button>
            </header>
            <ul className="sideGames">
              {GAMES.map((g, i) => {
                const st = stats[g.id] ?? emptyStats
                const best = g.headline === 'streak' ? st.bestStreak : st.bestScore
                const label = g.headline === 'streak' ? 'Best streak' : 'Best score'
                return (
                  <li key={g.id} style={{ '--i': i } as CSSProperties}>
                    <button className="sideGame" onClick={() => openGame(g.id)}>
                      <span className="sideGameIndex">0{i + 1}</span>
                      <span className="sideGameBody">
                        <span className="sideGameTitle">{g.title}</span>
                        <span className="sideGameTagline">{g.tagline}</span>
                      </span>
                      <span className="sideGameMeta">
                        <span className="sideGameBest">
                          {label} · {best.toLocaleString()}
                        </span>
                        <span className="sideGameGo" aria-hidden="true">
                          Play →
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="sidePanelFoot">
              Imagery © Esri, Maxar, Earthstar Geographics. For educational / non-commercial use.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
