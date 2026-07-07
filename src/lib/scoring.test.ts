import { describe, it, expect } from 'vitest'
import {
  computeScore,
  maxRoundScore,
  BASE_POINTS,
  ROUND_SECONDS,
  LOCATE_MAX_POINTS,
  scoreByDistanceKm,
  travleTrailScore,
} from './scoring'

describe('computeScore', () => {
  it('returns 0 for a wrong answer', () => {
    expect(computeScore(false, 'easy', ROUND_SECONDS)).toBe(0)
  })

  it('awards only base points with no time left', () => {
    expect(computeScore(true, 'easy', 0)).toBe(BASE_POINTS.easy)
  })

  it('awards base + full bonus with all the time left', () => {
    expect(computeScore(true, 'hard', ROUND_SECONDS)).toBe(maxRoundScore('hard'))
  })

  it('clamps secondsLeft above the total', () => {
    expect(computeScore(true, 'easy', 9999)).toBe(maxRoundScore('easy'))
  })

  it('scores hard rounds higher than easy', () => {
    expect(computeScore(true, 'hard', 0)).toBeGreaterThan(computeScore(true, 'easy', 0))
  })
})

describe('scoreByDistanceKm', () => {
  it('awards full points for a bullseye', () => {
    expect(scoreByDistanceKm(0)).toBe(LOCATE_MAX_POINTS)
    expect(scoreByDistanceKm(10)).toBe(LOCATE_MAX_POINTS)
  })

  it('decreases as the guess gets further away', () => {
    expect(scoreByDistanceKm(500)).toBeGreaterThan(scoreByDistanceKm(2000))
    expect(scoreByDistanceKm(2000)).toBeGreaterThan(scoreByDistanceKm(8000))
  })

  it('never goes below zero', () => {
    expect(scoreByDistanceKm(20000)).toBeGreaterThanOrEqual(0)
  })
})

describe('travleTrailScore', () => {
  it('awards 1000 for a perfect solve', () => {
    expect(travleTrailScore(3, 3, 0)).toBe(1000)
  })

  it('deducts 100 per extra country', () => {
    expect(travleTrailScore(4, 3, 0)).toBe(900)
    expect(travleTrailScore(6, 3, 0)).toBe(700)
  })

  it('deducts 100 per hint', () => {
    expect(travleTrailScore(3, 3, 2)).toBe(800)
  })

  it('combines penalties and never drops below 0', () => {
    expect(travleTrailScore(5, 3, 1)).toBe(700)
    expect(travleTrailScore(20, 3, 4)).toBe(0)
  })
})
