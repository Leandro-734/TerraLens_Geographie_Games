import ParallaxHero from '../components/ParallaxHero'
import GamesSidebar from '../components/GamesSidebar'

export default function MenuScreen() {
  return (
    <div className="screen menu">
      <GamesSidebar />
      <ParallaxHero />
    </div>
  )
}
