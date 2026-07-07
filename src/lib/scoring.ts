export type Difficulty = 'easy' | 'hard'

export const ROUND_SECONDS = 30

/** Base points awarded for a correct answer, by difficulty. */
export const BASE_POINTS: Record<Difficulty, number> = {
  easy: 1000,
  hard: 1500,
}

/** A correct answer can earn up to this fraction of base as a speed bonus. */
export const TIME_BONUS_FACTOR = 0.5

/**
 * Score a single round.
 * - Wrong answer: 0 points.
 * - Correct: base points + a speed bonus that decays linearly with time left.
 * When the timer is disabled, pass secondsLeft = 0 so only the base is awarded.
 */
export function computeScore(
  correct: boolean,
  difficulty: Difficulty,
  secondsLeft: number,
  totalSeconds: number = ROUND_SECONDS,
): number {
  if (!correct) return 0
  const base = BASE_POINTS[difficulty]
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0
  return base + Math.round(base * TIME_BONUS_FACTOR * ratio)
}

/** Maximum achievable score for one round (used for "perfect" detection / UI). */
export function maxRoundScore(difficulty: Difficulty): number {
  return Math.round(BASE_POINTS[difficulty] * (1 + TIME_BONUS_FACTOR))
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy · Multiple choice',
  hard: 'Hard · Type the name',
}

// ---- Locate game (distance-based) ----

/** Maximum points for a perfect pin in the Locate game. */
export const LOCATE_MAX_POINTS = 5000

/** Within this distance a guess counts as a bullseye (full points). */
export const LOCATE_BULLSEYE_KM = 25

/**
 * Score a Locate guess by how close it landed. Full points for a near-perfect
 * pin, decaying exponentially with distance (≈1839 at 1500 km, ≈677 at 3000 km).
 */
export function scoreByDistanceKm(km: number): number {
  if (km <= LOCATE_BULLSEYE_KM) return LOCATE_MAX_POINTS
  return Math.round(LOCATE_MAX_POINTS * Math.exp(-km / 1500))
}

// ---- Country Trail (per-trail score) ----

export const TRAVLE_BASE_POINTS = 1000
export const TRAVLE_PENALTY = 100

/**
 * Score one solved trail: 1000 for a perfect solve, minus 100 for every country
 * used beyond the optimal route, minus 100 for every hint revealed. Never below 0.
 */
export function travleTrailScore(guessedCount: number, optimalBetween: number, hintsUsed: number): number {
  const extra = Math.max(0, guessedCount - optimalBetween)
  return Math.max(0, TRAVLE_BASE_POINTS - TRAVLE_PENALTY * (extra + hintsUsed))
}
