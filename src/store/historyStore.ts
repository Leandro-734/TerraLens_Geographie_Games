import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * A "deck" is any pool we draw rounds from and want to avoid repeating. We keep
 * one history list per deck (per game), so e.g. satellite and locate cities are
 * tracked independently.
 */
export type Deck = 'satellite' | 'locate' | 'travle'

/**
 * How many recently-seen keys to remember per deck. Big enough to space repeats
 * out over several games, small enough that region-limited pools still rotate.
 * The pickers fall back gracefully when the whole (small) pool is "recent".
 */
const HISTORY_CAP = 60

interface HistoryStore {
  /** deck -> keys seen, oldest first / newest last. */
  recent: Record<Deck, string[]>
  /** Append keys just shown to the player (called after picking a game). */
  remember: (deck: Deck, keys: string[]) => void
  /** Wipe a deck's history (or all decks when omitted). */
  reset: (deck?: Deck) => void
}

const emptyRecent = (): Record<Deck, string[]> => ({ satellite: [], locate: [], travle: [] })

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      recent: emptyRecent(),

      remember: (deck, keys) =>
        set((s) => {
          // Drop any prior sightings of these keys, then re-append them as the
          // newest, keeping the list free of duplicates and capped in size.
          const fresh = new Set(keys)
          const kept = (s.recent[deck] ?? []).filter((k) => !fresh.has(k))
          const next = [...kept, ...keys].slice(-HISTORY_CAP)
          return { recent: { ...s.recent, [deck]: next } }
        }),

      reset: (deck) =>
        set((s) => (deck ? { recent: { ...s.recent, [deck]: [] } } : { recent: emptyRecent() })),
    }),
    {
      name: 'geo-games-history',
      version: 1,
      // Tolerate older saves / added decks so reads never hit undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { recent?: Partial<Record<Deck, string[]>> }
        return { ...current, recent: { ...emptyRecent(), ...p.recent } }
      },
    },
  ),
)

/** Read a deck's history without subscribing (for use inside event handlers). */
export function recentKeys(deck: Deck): string[] {
  return useHistoryStore.getState().recent[deck] ?? []
}
