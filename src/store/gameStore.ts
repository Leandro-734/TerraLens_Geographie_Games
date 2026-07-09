import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { City, CityPool, Region } from '../lib/cities'
import { pickRounds } from '../lib/cities'
import type { Difficulty } from '../lib/scoring'
import { useAppStore } from './appStore'
import { recentKeys, useHistoryStore } from './historyStore'

export type Phase = 'home' | 'round' | 'result' | 'summary'

export interface RoundResult {
  city: City
  /** What the player picked/typed, or "—" if skipped or timed out. */
  guessLabel: string
  correct: boolean
  points: number
  secondsLeft: number
}

export interface Settings {
  difficulty: Difficulty
  cityPool: CityPool
  totalRounds: number
  useTimer: boolean
  region: Region | 'all'
  sound: boolean
}

const defaultSettings: Settings = {
  difficulty: 'easy',
  cityPool: 'all',
  totalRounds: 5,
  useTimer: true,
  region: 'all',
  sound: true,
}

interface GameStore {
  // persisted
  settings: Settings

  // transient (per game)
  phase: Phase
  cities: City[]
  index: number
  score: number
  streak: number
  gameBestStreak: number
  results: RoundResult[]
  newBest: boolean

  setSettings: (partial: Partial<Settings>) => void
  startGame: () => void
  submitGuess: (result: RoundResult) => void
  nextRound: () => void
  quitToHome: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      phase: 'home',
      cities: [],
      index: 0,
      score: 0,
      streak: 0,
      gameBestStreak: 0,
      results: [],
      newBest: false,

      setSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),

      startGame: () =>
        set((s) => {
          const cities = pickRounds(
            s.settings.totalRounds,
            s.settings.region,
            recentKeys('satellite'),
            s.settings.cityPool,
          )
          useHistoryStore.getState().remember('satellite', cities.map((c) => c.id))
          return {
            phase: 'round',
            cities,
            index: 0,
            score: 0,
            streak: 0,
            gameBestStreak: 0,
            results: [],
            newBest: false,
          }
        }),

      submitGuess: (result) =>
        set((s) => {
          const streak = result.correct ? s.streak + 1 : 0
          return {
            phase: 'result',
            score: s.score + result.points,
            streak,
            gameBestStreak: Math.max(s.gameBestStreak, streak),
            results: [...s.results, result],
          }
        }),

      nextRound: () =>
        set((s) => {
          if (s.index < s.cities.length - 1) {
            return { phase: 'round', index: s.index + 1 }
          }
          // Finalize: roll the result into lifetime stats via the app store.
          const correct = s.results.filter((r) => r.correct).length
          const newBest = useAppStore.getState().recordGame('satellite', {
            score: s.score,
            roundsPlayed: s.results.length,
            roundsCorrect: correct,
            streak: s.gameBestStreak,
          })
          return { phase: 'summary', newBest }
        }),

      quitToHome: () => set({ phase: 'home' }),
    }),
    {
      name: 'city-from-satellite',
      // Persist only the player's preferred settings; the active game resets.
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
)
