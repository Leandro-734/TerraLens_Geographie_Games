import { describe, it, expect } from 'vitest'
import { angleDiffDeg, bboxAround, bearing, haversineKm } from './geo'

describe('haversineKm', () => {
  it('is 0 for identical points', () => {
    expect(haversineKm(48.85, 2.35, 48.85, 2.35)).toBeCloseTo(0, 5)
  })

  it('matches a known distance (Paris–London ≈ 344 km)', () => {
    const d = haversineKm(48.8566, 2.3522, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(330)
    expect(d).toBeLessThan(360)
  })

  it('is symmetric', () => {
    const a = haversineKm(35.68, 139.69, -33.87, 151.21)
    const b = haversineKm(-33.87, 151.21, 35.68, 139.69)
    expect(a).toBeCloseTo(b, 6)
  })
})

describe('bboxAround', () => {
  it('brackets the centre point', () => {
    const [[w, s], [e, n]] = bboxAround(40, -74)
    expect(w).toBeLessThan(-74)
    expect(e).toBeGreaterThan(-74)
    expect(s).toBeLessThan(40)
    expect(n).toBeGreaterThan(40)
  })
})

describe('bearing', () => {
  it('gives cardinal directions', () => {
    expect(bearing(0, 0, 0, 10)).toBeCloseTo(90, 0) // due east
    expect(bearing(0, 0, 10, 0)).toBeCloseTo(0, 0) // due north
    expect(bearing(0, 0, -10, 0)).toBeCloseTo(180, 0) // due south
  })
})

describe('angleDiffDeg', () => {
  it('is 0 for identical bearings', () => {
    expect(angleDiffDeg(123, 123)).toBe(0)
  })

  it('measures the short way around the seam', () => {
    expect(angleDiffDeg(350, 10)).toBe(20)
    expect(angleDiffDeg(10, 350)).toBe(20)
  })

  it('caps at 180 for opposite bearings', () => {
    expect(angleDiffDeg(0, 180)).toBe(180)
    expect(angleDiffDeg(90, 270)).toBe(180)
  })

  it('is symmetric', () => {
    expect(angleDiffDeg(40, 200)).toBe(angleDiffDeg(200, 40))
  })
})
