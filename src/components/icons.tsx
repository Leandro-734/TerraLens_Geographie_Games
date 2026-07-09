/** Tiny inline SVG icons for the in-game HUD — crisper and more legible than
 *  text glyphs / emoji at small sizes. They inherit `currentColor`. */

export function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">
      <path
        d="M2 2l10 10M12 2L2 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M3 7.5v5h3.2L11 16V4L6.2 7.5H3z" fill="currentColor" />
      {muted ? (
        <path
          d="M13.5 7.5l4.5 5M18 7.5l-4.5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M13.5 7a4.2 4.2 0 0 1 0 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  )
}
