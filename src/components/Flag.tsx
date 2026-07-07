/**
 * Real flag image (from the free flagcdn.com service) instead of a flag emoji —
 * Windows/Chromium renders flag emoji as plain letters, so images look correct
 * on every platform. Falls back to the country code text via the alt attribute.
 */
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
  const cc = code.toLowerCase()
  return (
    <img
      className={className}
      src={`https://flagcdn.com/h40/${cc}.png`}
      srcSet={`https://flagcdn.com/h80/${cc}.png 2x`}
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
