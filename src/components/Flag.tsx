/**
 * Real flag image (from the free flagcdn.com service) instead of a flag emoji —
 * Windows/Chromium renders flag emoji as plain letters, so images look correct
 * on every platform. Falls back to the country code text via the alt attribute.
 */
const SPECIAL_FLAGS: Record<string, string> = {
  // Somaliland uses the app-specific code XS and therefore has no FlagCDN
  // entry. Wikimedia's public-domain SVG is sourced from its government.
  XS: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Flag_of_Somaliland.svg',
}

export default function Flag({
  code,
  size = 18,
  className,
}: {
  code: string
  /** Rendered height in px (width keeps the flag's aspect ratio). */
  size?: number
  className?: string
}) {
  const normalizedCode = code.toUpperCase()
  const specialSrc = SPECIAL_FLAGS[normalizedCode]
  const cc = normalizedCode.toLowerCase()
  return (
    <img
      className={className}
      src={specialSrc ?? `https://flagcdn.com/h40/${cc}.png`}
      srcSet={specialSrc ? undefined : `https://flagcdn.com/h80/${cc}.png 2x`}
      alt={code}
      loading="lazy"
      style={{
        height: size,
        width: 'auto',
        borderRadius: 3,
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
      }}
    />
  )
}
