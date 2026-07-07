import { useEffect, useRef } from 'react'

/**
 * While `enabled`, pressing Enter or Space runs `action` — used to give the
 * primary button of a round (submit a guess, advance to the next round) a
 * keyboard shortcut that works the same in every game.
 *
 * The keystroke is ignored while a form field, button or link has focus, so it
 * never interrupts typing in the guess box and never doubles up that control's
 * own Enter/Space activation. Listens in the capture phase so it wins before
 * map/canvas handlers, and the latest `action` is read through a ref so the
 * listener doesn't need re-subscribing every render.
 */
export function useAdvanceKey(enabled: boolean, action: () => void): void {
  const actionRef = useRef(action)
  actionRef.current = action

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.code !== 'Space')) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (
        event.target instanceof Element &&
        event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      actionRef.current()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled])
}
