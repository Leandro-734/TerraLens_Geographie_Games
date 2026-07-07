import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GameId = 'satellite' | 'locate' | 'travle'

export interface GameStats {
  bestScore: number
  gamesPlayed: number
  roundsPlayed: number
  roundsCorrect: number
  bestStreak: number
}

export const emptyStats: GameStats = {
  bestScore: 0,
  gamesPlayed: 0,
  roundsPlayed: 0,
  roundsCorrect: 0,
  bestStreak: 0,
}

export interface GameResult {
  score: number
  roundsPlayed?: number
  roundsCorrect?: number
  streak?: number
}

interface AppStore {
  stats: Record<GameId, GameStats>
  /** Roll a finished game's result into lifetime stats. Returns true on a new best. */
  recordGame: (id: GameId, result: GameResult) => boolean
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      stats: {
        satellite: { ...emptyStats },
        locate: { ...emptyStats },
        travle: { ...emptyStats },
      },

      recordGame: (id, result) => {
        const prev = get().stats[id] ?? emptyStats
        const newBest = result.score > prev.bestScore
        set((s) => ({
          stats: {
            ...s.stats,
            [id]: {
              bestScore: Math.max(prev.bestScore, result.score),
              gamesPlayed: prev.gamesPlayed + 1,
              roundsPlayed: prev.roundsPlayed + (result.roundsPlayed ?? 0),
              roundsCorrect: prev.roundsCorrect + (result.roundsCorrect ?? 0),
              bestStreak: Math.max(prev.bestStreak, result.streak ?? 0),
            },
          },
        }))
        return newBest
      },
    }),
    {
      name: 'geo-games',
      version: 1,
      partialize: (s) => ({ stats: s.stats }),
      // Backfill stats for any game missing from an older save, and drop stats
      // for games that no longer exist, so reads never hit undefined keys.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { stats?: Partial<Record<GameId, GameStats>> }
        const stats = { ...current.stats }
        for (const id of Object.keys(stats) as GameId[]) {
          if (p.stats?.[id]) stats[id] = p.stats[id]!
        }
        return { ...current, stats }
      },
    },
  ),
)
