import type { CSSProperties } from 'react'
import { useAppStore, emptyStats } from '../store/appStore'
import { useGameNav } from '../lib/nav'
import { GAMES } from '../games/registry'
import { CITIES } from '../lib/cities'
import logoGlobe from '../assets/logo-globe.svg'

export default function MenuScreen() {
  const { openGame } = useGameNav()
  const stats = useAppStore((s) => s.stats)

  return (
    <div className="screen menu">
      <div className="menuInner">
        <header className="menuHeader">
          <img className="menuLogo" src={logoGlobe} alt="" />
          <h1 className="title">
            Geo <span className="titleAccent">Games</span>
          </h1>
          <p className="tagline">
            {GAMES.length} ways to test your geography · {CITIES.length} cities
          </p>
        </header>

        <div className="gameGrid">
          {GAMES.map((g) => {
            const st = stats[g.id] ?? emptyStats
            const best = g.headline === 'streak' ? st.bestStreak : st.bestScore
            const label = g.headline === 'streak' ? 'Best streak' : 'Best score'
            return (
              <button
                key={g.id}
                className="gameCard"
                style={{ '--card-accent': g.accent } as CSSProperties}
                onClick={() => openGame(g.id)}
              >
                <img className="gameIcon" src={g.icon} alt="" />
                <span className="gameTitle">{g.title}</span>
                <span className="gameTagline">{g.tagline}</span>
                <span className="gameFooter">
                  <span className="gameBest">
                    {label}: <strong>{best.toLocaleString()}</strong>
                  </span>
                  <span className="gamePlay">Play →</span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="footer">
          Imagery © Esri, Maxar, Earthstar Geographics. For educational / non-commercial use.
        </p>
      </div>
    </div>
  )
}
