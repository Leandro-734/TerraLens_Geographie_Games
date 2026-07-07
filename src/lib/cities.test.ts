import { describe, it, expect } from 'vitest'
import {
  CITIES,
  buildOptions,
  citiesInRegion,
  flagEmoji,
  orderByFreshness,
  pickDistractors,
  pickRounds,
  zoomForCity,
} from './cities'

describe('city dataset', () => {
  it('has a healthy number of cities with unique ids', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(50)
    const ids = new Set(CITIES.map((c) => c.id))
    expect(ids.size).toBe(CITIES.length)
  })

  it('has in-range coordinates for every city', () => {
    for (const c of CITIES) {
      expect(c.lat).toBeGreaterThanOrEqual(-90)
      expect(c.lat).toBeLessThanOrEqual(90)
      expect(c.lon).toBeGreaterThanOrEqual(-180)
      expect(c.lon).toBeLessThanOrEqual(180)
    }
  })
})

describe('pickRounds', () => {
  it('returns n unique cities', () => {
    const r = pickRounds(5)
    expect(r).toHaveLength(5)
    expect(new Set(r.map((c) => c.id)).size).toBe(5)
  })

  it('limits the pool to a continent', () => {
    const r = pickRounds(5, 'Europe')
    expect(r.every((c) => c.continent === 'Europe')).toBe(true)
  })

  it('limits the pool to the USA sub-region', () => {
    const r = pickRounds(5, 'USA')
    expect(r.every((c) => c.countryCode === 'US')).toBe(true)
  })

  it('limits the pool to the China sub-region', () => {
    const r = pickRounds(5, 'China')
    expect(r.every((c) => c.countryCode === 'CN')).toBe(true)
  })

  it('limits the pool to the Arabian Peninsula sub-region', () => {
    const r = pickRounds(5, 'Arabian Peninsula')
    const codes = new Set(['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE'])
    expect(r.every((c) => codes.has(c.countryCode))).toBe(true)
  })
})

describe('freshness', () => {
  it('avoids recently-seen cities while the pool has fresh ones', () => {
    const europe = citiesInRegion('Europe')
    const recent = europe.slice(0, 3).map((c) => c.id)
    // Ask for fewer than the number of remaining fresh cities.
    const picked = pickRounds(europe.length - 3, 'Europe', recent)
    expect(picked.some((c) => recent.includes(c.id))).toBe(false)
  })

  it('falls back to least-recently-seen once fresh cities run out', () => {
    const pool = citiesInRegion('Europe')
    // Everything is "recent"; oldest-first order should place the oldest first.
    const recent = pool.map((c) => c.id) // index 0 = oldest
    const ordered = orderByFreshness(pool, (c) => c.id, recent)
    expect(ordered).toHaveLength(pool.length)
    expect(ordered[0].id).toBe(recent[0])
    expect(ordered[ordered.length - 1].id).toBe(recent[recent.length - 1])
  })

  it('still returns n cities even when all are recent', () => {
    const all = CITIES.map((c) => c.id)
    expect(pickRounds(5, 'all', all)).toHaveLength(5)
  })
})

describe('citiesInRegion', () => {
  it('returns every city for "all"', () => {
    expect(citiesInRegion('all')).toHaveLength(CITIES.length)
  })

  it('covers every Arabian Peninsula country', () => {
    const codes = new Set(citiesInRegion('Arabian Peninsula').map((c) => c.countryCode))
    expect(codes).toEqual(new Set(['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE']))
  })

  it('only returns USA cities for the USA sub-region', () => {
    const cities = citiesInRegion('USA')
    expect(cities.length).toBeGreaterThanOrEqual(20)
    expect(cities.every((c) => c.countryCode === 'US')).toBe(true)
  })

  it('only returns Chinese cities for the China sub-region', () => {
    const cities = citiesInRegion('China')
    expect(cities.length).toBeGreaterThanOrEqual(10)
    expect(cities.every((c) => c.countryCode === 'CN')).toBe(true)
  })
})

describe('pickDistractors / buildOptions', () => {
  const answer = CITIES[0]

  it('never includes the answer and returns the requested count', () => {
    const d = pickDistractors(answer, 3)
    expect(d).toHaveLength(3)
    expect(d.some((c) => c.id === answer.id)).toBe(false)
  })

  it('buildOptions includes the answer among 4 unique options', () => {
    const opts = buildOptions(answer, 4)
    expect(opts).toHaveLength(4)
    expect(opts.some((c) => c.id === answer.id)).toBe(true)
    expect(new Set(opts.map((c) => c.id)).size).toBe(4)
  })

  it('buildOptions draws distractors from a restricted pool when given one', () => {
    const usaPool = citiesInRegion('USA')
    const usaAnswer = usaPool[0]
    const opts = buildOptions(usaAnswer, 4, usaPool)
    expect(opts).toHaveLength(4)
    expect(opts.every((c) => c.countryCode === 'US')).toBe(true)
  })
})

describe('flagEmoji', () => {
  it('converts an ISO code to a flag', () => {
    expect(flagEmoji('FR')).toBe('🇫🇷')
  })

  it('falls back for an invalid code', () => {
    expect(flagEmoji('')).toBe('🏳️')
  })
})

describe('zoomForCity', () => {
  it('uses a lower zoom for bigger cities', () => {
    expect(zoomForCity(10_000_000)).toBeLessThan(zoomForCity(100_000))
  })
})
