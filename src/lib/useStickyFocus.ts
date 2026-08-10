import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Keep a text input focused (cursor blinking) even while the user pans/zooms a
 * sibling MapLibre map. Reclaims focus only from the map or the page body — it
 * never steals focus from other buttons/inputs the user intends to click.
 */
export function useStickyFocus(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    if (window.matchMedia('(max-width: 700px), (pointer: coarse)').matches) return

    const input = ref.current
    const root = document.documentElement
    const viewport = window.visualViewport

    // Mobile browsers can pan the visual viewport to reveal a focused input.
    // Keep the game map anchored, then lift only the answer panel by the
    // keyboard's measured height (shared by City from Satellite and Country
    // Trail because they both use this input hook).
    const updateKeyboardViewport = () => {
      if (!input || document.activeElement !== input) {
        root.classList.remove('answerInputFocused')
        root.style.setProperty('--keyboard-inset', '0px')
        root.style.setProperty('--keyboard-viewport-offset', '0px')
        return
      }

      root.classList.add('answerInputFocused')
      const keyboardInset = Math.max(
        0,
        Math.round(window.innerHeight - (viewport?.height ?? window.innerHeight)),
      )
      root.style.setProperty('--keyboard-inset', `${keyboardInset}px`)
      root.style.setProperty('--keyboard-viewport-offset', `${Math.round(viewport?.offsetTop ?? 0)}px`)
    }

    const reclaim = () => {
      if (!input) return
      const ae = document.activeElement
      if (ae === input) return
      if (ae === document.body || (ae instanceof HTMLElement && ae.closest('.maplibregl-map'))) {
        input.focus({ preventScroll: true })
      }
    }
    const onEvent = () => setTimeout(reclaim, 0)

    input?.focus({ preventScroll: true })
    updateKeyboardViewport()
    window.addEventListener('focusout', onEvent)
    window.addEventListener('pointerup', onEvent, true)
    window.addEventListener('resize', updateKeyboardViewport)
    viewport?.addEventListener('resize', updateKeyboardViewport)
    viewport?.addEventListener('scroll', updateKeyboardViewport)
    input?.addEventListener('focus', updateKeyboardViewport)
    input?.addEventListener('blur', updateKeyboardViewport)
    return () => {
      window.removeEventListener('focusout', onEvent)
      window.removeEventListener('pointerup', onEvent, true)
      window.removeEventListener('resize', updateKeyboardViewport)
      viewport?.removeEventListener('resize', updateKeyboardViewport)
      viewport?.removeEventListener('scroll', updateKeyboardViewport)
      input?.removeEventListener('focus', updateKeyboardViewport)
      input?.removeEventListener('blur', updateKeyboardViewport)
      root.classList.remove('answerInputFocused')
      root.style.setProperty('--keyboard-inset', '0px')
      root.style.setProperty('--keyboard-viewport-offset', '0px')
    }
  }, [ref])
}
