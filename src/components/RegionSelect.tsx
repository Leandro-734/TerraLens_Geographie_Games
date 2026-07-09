import { useEffect, useRef, useState } from 'react'
import { CONTINENTS, SUB_REGIONS } from '../lib/cities'
import type { Region, SubRegion } from '../lib/cities'
import Flag from './Flag'

/** Leading icon for each sub-region: a flag image (emoji flags don't render on
 * Windows) or a plain emoji where no single flag applies. */
const SUB_REGION_ICON: Record<SubRegion, { emoji?: string; flag?: string }> = {
  'Arabian Peninsula': { emoji: '🐪' },
  USA: { flag: 'us' },
  China: { flag: 'cn' },
}

type Value = Region | 'all'

interface Option {
  value: Value
  label: string
  emoji?: string
  flag?: string
}

interface Group {
  label?: string
  options: Option[]
}

const GROUPS: Group[] = [
  { options: [{ value: 'all', label: 'Whole world', emoji: '🌍' }] },
  { label: 'Continents', options: CONTINENTS.map((c) => ({ value: c, label: c })) },
  {
    label: 'Popular regions',
    options: SUB_REGIONS.map((r) => ({ value: r, label: r, ...SUB_REGION_ICON[r] })),
  },
]

const ALL_OPTIONS = GROUPS.flatMap((g) => g.options)

/** The leading icon slot for options that have a flag or emoji. Continents
 * have neither, so they render without one and sit flush left instead of
 * indented under an empty gutter. */
function OptionIcon({ emoji, flag }: { emoji?: string; flag?: string }) {
  if (!flag && !emoji) return null
  return (
    <span className="dropdownIcon">
      {flag ? <Flag code={flag} size={14} /> : emoji}
    </span>
  )
}

/**
 * A glass-styled replacement for the native region `<select>` — the OS-drawn
 * dropdown couldn't be themed to match the app. Closes on outside click or Esc.
 */
export default function RegionSelect({
  value,
  onChange,
}: {
  value: Value
  onChange: (value: Value) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = ALL_OPTIONS.find((o) => o.value === value) ?? ALL_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="dropdownBtn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dropdownValue">
          <OptionIcon emoji={current.emoji} flag={current.flag} />
          {current.label}
        </span>
        <span className={`dropdownCaret${open ? ' dropdownCaretOpen' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className="dropdownMenu" role="listbox">
          {GROUPS.map((group, gi) => (
            <li key={group.label ?? gi}>
              {group.label && <div className="dropdownGroupLabel">{group.label}</div>}
              <ul className="dropdownGroup">
                {group.options.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={opt.value === value}
                      className={`dropdownItem${opt.value === value ? ' dropdownItemActive' : ''}`}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                    >
                      <OptionIcon emoji={opt.emoji} flag={opt.flag} />
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
