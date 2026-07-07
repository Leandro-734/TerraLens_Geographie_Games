import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  findCountry,
  isConnected,
  neighborsOf,
  pickPuzzle,
  searchCountries,
  shortestPath,
  shortestPathWithin,
} from './countries'

describe('countries dataset', () => {
  it('every neighbour references a known country', () => {
    const names = new Set(COUNTRIES.map((c) => c.name))
    for (const c of COUNTRIES) {
      for (const nb of c.neighbors) {
        expect(names.has(nb), `${c.name} -> ${nb}`).toBe(true)
      }
    }
  })

  it('adjacency is symmetric', () => {
    for (const c of COUNTRIES) {
      for (const nb of neighborsOf(c.name)) {
        expect(neighborsOf(nb), `${nb} should border ${c.name}`).toContain(c.name)
      }
    }
  })
})

describe('findCountry', () => {
  it('matches names and aliases (case/accent-insensitive)', () => {
    expect(findCountry('united states')?.name).toBe('United States')
    expect(findCountry('USA')?.name).toBe('United States')
    expect(findCountry('Türkiye')?.name).toBe('Türkiye')
    expect(findCountry('Turkey')?.name).toBe('Türkiye')
    expect(findCountry('nowhereland')).toBeUndefined()
  })
})

describe('searchCountries', () => {
  it('ranks beginning-of-name matches ahead of mid-word fuzzy matches', () => {
    expect(searchCountries('braz')[0]?.name).toBe('Brazil')

    const pa = searchCountries('pa')
    expect(pa.slice(0, 4).map((country) => country.name)).toEqual([
      'Pakistan',
      'Panama',
      'Papua New Guinea',
      'Paraguay',
    ])
    expect(pa.findIndex((country) => country.name === 'Spain')).toBeGreaterThanOrEqual(4)
  })
})

describe('shortestPath', () => {
  it('finds a valid chain of bordering countries', () => {
    const path = shortestPath('Portugal', 'Germany')
    expect(path).not.toBeNull()
    expect(path![0]).toBe('Portugal')
    expect(path![path!.length - 1]).toBe('Germany')
    for (let i = 0; i < path!.length - 1; i++) {
      expect(neighborsOf(path![i])).toContain(path![i + 1])
    }
  })

  it('returns null between disconnected components', () => {
    expect(shortestPath('Brazil', 'France')).toBeNull()
  })
})

describe('isConnected', () => {
  it('connects only when the chain is complete', () => {
    expect(isConnected(['Spain'], 'Portugal', 'France')).toBe(true)
    expect(isConnected([], 'Portugal', 'France')).toBe(false)
  })
})

describe('shortestPathWithin (redundancy)', () => {
  it('routes only through needed guesses, ignoring detours like Kuwait', () => {
    const allowed = new Set(['Yemen', 'Azerbaijan', 'Iran', 'Kuwait', 'Saudi Arabia', 'Iraq'])
    const path = shortestPathWithin('Yemen', 'Azerbaijan', allowed)
    expect(path).not.toBeNull()
    expect(path![0]).toBe('Yemen')
    expect(path![path!.length - 1]).toBe('Azerbaijan')
    // Kuwait is a dead-end detour — it must NOT be on the optimal connecting route.
    expect(path).not.toContain('Kuwait')
    for (let i = 0; i < path!.length - 1; i++) {
      expect(neighborsOf(path![i])).toContain(path![i + 1])
    }
  })
})

describe('pickPuzzle', () => {
  it('returns a solvable puzzle whose par matches the shortest path', () => {
    for (let i = 0; i < 25; i++) {
      const p = pickPuzzle()
      expect(p.par).toBeGreaterThanOrEqual(3)
      expect(p.par).toBeLessThanOrEqual(6)
      const path = shortestPath(p.start.name, p.end.name)
      expect(path).not.toBeNull()
      expect(path!.length - 1).toBe(p.par)
    }
  })
})
