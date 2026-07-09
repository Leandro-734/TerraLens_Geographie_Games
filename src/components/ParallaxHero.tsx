import { useEffect, useRef } from 'react'
import background from '../assets/hero/background.png'
import astronaut from '../assets/hero/astronaut.png'
import fog2 from '../assets/hero/fog2.png'
import fog3 from '../assets/hero/fog3.png'
import fog4 from '../assets/hero/fog4.png'

/**
 * Walk up the DOM to the nearest scrollable ancestor. Our screens scroll on the
 * `.screen` element (overflow-y: auto), not the window, so window.scrollY is
 * always 0 here — we have to listen on the real scroll container.
 */
function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return window
}

/**
 * Scroll-reactive parallax hero built from the layered Figma export.
 *
 * On scroll, each layer translates by its own fraction of the scroll offset
 * (`--sy` CSS var set here, `--speed` per layer in CSS). Mouse-wheel input is
 * intercepted and eased so the parallax glides instead of stepping.
 */
export default function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const scroller = getScrollParent(el)
    let raf = 0

    const update = () => {
      raf = 0
      const y = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop
      el.style.setProperty('--sy', `${y}px`)
      // Layers only carry transforms while scrolled: at rest the hero paints
      // as one flat layer, so the text keeps full-quality antialiasing.
      el.classList.toggle('heroScrolled', y > 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    // --- smooth wheel: glide toward the wheel target instead of jumping ---
    let wheelTarget: number | null = null
    let glideRaf = 0

    const glide = () => {
      glideRaf = 0
      if (wheelTarget === null || scroller === window) return
      const s = scroller as HTMLElement
      const diff = wheelTarget - s.scrollTop
      if (Math.abs(diff) < 0.6) {
        s.scrollTop = wheelTarget
        wheelTarget = null
        return
      }
      s.scrollTop += diff * 0.14
      glideRaf = requestAnimationFrame(glide)
    }

    const onWheel = (e: WheelEvent) => {
      if (scroller === window || e.ctrlKey) return // let pinch-zoom through
      const s = scroller as HTMLElement
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? s.clientHeight : 1
      const max = s.scrollHeight - s.clientHeight
      wheelTarget = Math.min(max, Math.max(0, (wheelTarget ?? s.scrollTop) + e.deltaY * unit))
      if (!glideRaf) glideRaf = requestAnimationFrame(glide)
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('wheel', onWheel as EventListener, { passive: false })
    update()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('wheel', onWheel as EventListener)
      if (raf) cancelAnimationFrame(raf)
      if (glideRaf) cancelAnimationFrame(glideRaf)
    }
  }, [])

  return (
    <div className="hero" ref={ref}>
      {/* Layer order mirrors the Figma stack (back → front): Background,
          lens, astronaut, fog 2, fog 3, fog 4, then Terra/games. */}
      <img className="heroLayer heroBg" src={background} alt="" aria-hidden="true" />

      {/* "lens" is the only text behind the astronaut (helmet overlaps it) */}
      <div className="heroLayer heroText heroTextBack" aria-hidden="true">
        <span className="heroLens">lens</span>
      </div>

      <img
        className="heroLayer heroAstronaut"
        src={astronaut}
        alt="Astronaut sitting on a flowering hill, holding a globe"
      />
      <img className="heroLayer heroFog heroFog2" src={fog2} alt="" aria-hidden="true" />
      <img className="heroLayer heroFog heroFog3" src={fog3} alt="" aria-hidden="true" />
      <img className="heroLayer heroFog heroFog4" src={fog4} alt="" aria-hidden="true" />

      {/* Terra and games sit above every image layer */}
      <div className="heroLayer heroText heroTextFront">
        <h1 className="heroMark" aria-label="Terra lens games">
          <span className="heroTerra" aria-hidden="true">Terra</span>
          <span className="heroGames" aria-hidden="true">games</span>
        </h1>
      </div>
    </div>
  )
}
