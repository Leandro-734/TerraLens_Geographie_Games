import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Keep a text input focused (cursor blinking) even while the user pans/zooms a
 * sibling MapLibre map. Reclaims focus only from the map or the page body — it
 * never steals focus from other buttons/inputs the user intends to click.
 */
export function useStickyFocus(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const reclaim = () => {
      const el = ref.current
      if (!el) return
      const ae = document.activeElement
      if (ae === el) return
      if (ae === document.body || (ae instanceof HTMLElement && ae.closest('.maplibregl-map'))) {
        el.focus({ preventScroll: true })
      }
    }
    const onEvent = () => setTimeout(reclaim, 0)
    window.addEventListener('focusout', onEvent)
    window.addEventListener('pointerup', onEvent, true)
    return () => {
      window.removeEventListener('focusout', onEvent)
      window.removeEventListener('pointerup', onEvent, true)
    }
  }, [ref])
}
