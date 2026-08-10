import { useEffect } from 'react'
import ParallaxHero from '../components/ParallaxHero'
import GamesSidebar from '../components/GamesSidebar'

export default function MenuScreen() {
  useEffect(() => {
    const ad = document.getElementById('menu-ad')
    if (!ad) return
    ad.hidden = false
    return () => {
      ad.hidden = true
    }
  }, [])

  return (
    <div className="screen menu">
      <GamesSidebar />
      <ParallaxHero />
    </div>
  )
}
