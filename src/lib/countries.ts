import Fuse from 'fuse.js'
import raw from '../data/countries.json'
import { normalize, prioritizeNamePrefixes } from './matching'

export interface Country {
  name: string
  code: string
  lat: number
  lon: number
  aliases: string[]
  neighbors: string[]
}

export const COUNTRIES = raw as Country[]

const nameToCountry = new Map<string, Country>()
const lookup = new Map<string, Country>() // normalized name/alias -> country
const adj = new Map<string, Set<string>>()

for (const c of COUNTRIES) {
  nameToCountry.set(c.name, c)
  lookup.set(normalize(c.name), c)
  for (const al of c.aliases) lookup.set(normalize(al), c)
  if (!adj.has(c.name)) adj.set(c.name, new Set())
}
// Build the adjacency as an undirected graph (union both directions), so a
// missing reverse edge in the data can't break connectivity.
for (const c of COUNTRIES) {
  for (const nb of c.neighbors) {
    if (!nameToCountry.has(nb)) continue
    adj.get(c.name)!.add(nb)
    if (!adj.has(nb)) adj.set(nb, new Set())
    adj.get(nb)!.add(c.name)
  }
}

export function getCountry(name: string): Country | undefined {
  return nameToCountry.get(name)
}

export function findCountry(input: string): Country | undefined {
  return lookup.get(normalize(input))
}

export function neighborsOf(name: string): string[] {
  return [...(adj.get(name) ?? [])]
}

export function bfsDistances(start: string): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    const d = dist.get(cur)!
    for (const nb of adj.get(cur) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1)
        queue.push(nb)
      }
    }
  }
  return dist
}

export function shortestPath(start: string, end: string): string[] | null {
  if (start === end) return [start]
  const prev = new Map<string, string>()
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur) ?? []) {
      if (seen.has(nb)) continue
      seen.add(nb)
      prev.set(nb, cur)
      if (nb === end) {
        const path = [end]
        let p = end
        while (prev.has(p)) {
          p = prev.get(p)!
          path.unshift(p)
        }
        return path
      }
      queue.push(nb)
    }
  }
  return null
}

/** Shortest path from start to end using ONLY nodes in `allowed` as stepping stones. */
export function shortestPathWithin(start: string, end: string, allowed: Set<string>): string[] | null {
  if (start === end) return [start]
  const prev = new Map<string, string>()
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur) ?? []) {
      if (!allowed.has(nb) || seen.has(nb)) continue
      seen.add(nb)
      prev.set(nb, cur)
      if (nb === end) {
        const path = [end]
        let p = end
        while (prev.has(p)) {
          p = prev.get(p)!
          path.unshift(p)
        }
        return path
      }
      queue.push(nb)
    }
  }
  return null
}

/** Nodes reachable from `start` stepping only through nodes in `allowed`. */
export function connectedFrom(start: string, allowed: Set<string>): Set<string> {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur) ?? []) {
      if (allowed.has(nb) && !seen.has(nb)) {
        seen.add(nb)
        queue.push(nb)
      }
    }
  }
  return seen
}

/** True if start and end are linked using the guessed countries as stepping stones. */
export function isConnected(guessed: Iterable<string>, start: string, end: string): boolean {
  const allowed = new Set<string>([start, end, ...guessed])
  return connectedFrom(start, allowed).has(end)
}

export interface Puzzle {
  start: Country
  end: Country
  /** Length of the shortest path (number of border crossings). */
  par: number
}

/**
 * Pick a solvable start→end puzzle whose shortest path length is in [minLen,
 * maxLen]. `recentStarts` is a list of recently-used start-country codes; we draw
 * the start from countries not in that list when enough remain, so trails don't
 * begin from the same place twice in a row.
 */
export function pickPuzzle(minLen = 3, maxLen = 6, recentStarts: readonly string[] = []): Puzzle {
  const recent = new Set(recentStarts)
  const fresh = COUNTRIES.filter((c) => !recent.has(c.code))
  // Keep a healthy margin so we still have room to find a solvable puzzle.
  const startPool = fresh.length >= 10 ? fresh : COUNTRIES
  for (let attempt = 0; attempt < 60; attempt++) {
    const start = startPool[Math.floor(Math.random() * startPool.length)]
    const dist = bfsDistances(start.name)
    const candidates = [...dist.entries()].filter(([, d]) => d >= minLen && d <= maxLen)
    if (candidates.length) {
      const [endName, d] = candidates[Math.floor(Math.random() * candidates.length)]
      return { start, end: nameToCountry.get(endName)!, par: d }
    }
  }
  // Fallback: the farthest reachable country from the first entry.
  const start = COUNTRIES[0]
  const dist = bfsDistances(start.name)
  const [farName, far] = [...dist.entries()].filter(([, d]) => d >= 2).sort((a, b) => b[1] - a[1])[0]
  return { start, end: nameToCountry.get(farName)!, par: far }
}

const fuse = new Fuse(COUNTRIES, {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

export function searchCountries(query: string, limit = 6): Country[] {
  const q = query.trim()
  if (!q) return []
  const fuzzyMatches = fuse.search(q, { limit: limit * 2 }).map((result) => result.item)
  return prioritizeNamePrefixes(q, COUNTRIES, fuzzyMatches, limit)
}
