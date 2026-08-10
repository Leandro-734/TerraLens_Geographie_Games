import ParallaxHero from '../components/ParallaxHero'
import GamesSidebar from '../components/GamesSidebar'

const AD_SWAP_SITE_ID = 'uTO9Rm5crH5BnNYurm5j'

export default function MenuScreen() {
  return (
    <div className="screen menu">
      <GamesSidebar />
      <ParallaxHero />
      <aside className="menuAd" aria-label="Sponsored site">
        <iframe
          className="menuAdFrame"
          src={`https://ad-swap.web.app/frame.html?site=${AD_SWAP_SITE_ID}&theme=light&shape=pill`}
          title="Sponsored site"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="origin"
        />
      </aside>
    </div>
  )
}
