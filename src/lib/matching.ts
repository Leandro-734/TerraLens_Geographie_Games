import Fuse from 'fuse.js'
import type { City } from './cities'

/**
 * Normalize free-text for comparison: lowercase, strip accents, collapse any
 * non-alphanumeric runs to single spaces. So "Sao Paulo", "sao  paulo!" and
 * "SAO PAULO" all compare equal. NFD splits accented letters into base letter +
 * combining mark, then \p{Mn} (nonspacing marks) removes the accents.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

type NamedSearchItem = { name: string; aliases: readonly string[] }

/**
 * Put exact and beginning-of-name matches ahead of looser fuzzy matches.
 * Fuse still supplies typo tolerance, but can no longer rank a mid-word match
 * such as Congo-Brazzaville above Brazil for "braz".
 */
export function prioritizeNamePrefixes<T extends NamedSearchItem>(
  query: string,
  items: readonly T[],
  fuzzyMatches: readonly T[],
  limit = 6,
): T[] {
  const q = normalize(query)
  if (!q) return []

  const rank = (item: T): number => {
    const name = normalize(item.name)
    const aliases = item.aliases.map(normalize)
    if (name === q) return 0
    if (aliases.some((alias) => alias === q)) return 1
    if (name.startsWith(q)) return 2
    if (aliases.some((alias) => alias.startsWith(q))) return 3
    return Number.POSITIVE_INFINITY
  }

  const prefixes = items
    .map((item) => ({ item, rank: rank(item) }))
    .filter((match) => Number.isFinite(match.rank))
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .map((match) => match.item)

  const ordered: T[] = []
  const seen = new Set<T>()
  for (const item of [...prefixes, ...fuzzyMatches]) {
    if (seen.has(item)) continue
    seen.add(item)
    ordered.push(item)
    if (ordered.length >= limit) break
  }
  return ordered
}

/** All accepted answer strings for a city (canonical name + aliases). */
export function cityAnswerStrings(city: City): string[] {
  return [city.name, ...city.aliases]
}

/** True if the typed guess matches the city's name or any alias (accent/case-insensitive). */
export function isCorrectGuess(input: string, city: City): boolean {
  const guess = normalize(input)
  if (!guess) return false
  return cityAnswerStrings(city).some((s) => normalize(s) === guess)
}

/** Build a Fuse index over the city list for the autocomplete dropdown. */
export function createCityFuse(cities: City[]): Fuse<City> {
  return new Fuse(cities, {
    keys: ['name', 'aliases', 'country'],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
}

/**
 * Search the city list for the autocomplete dropdown. Fuse supplies typo
 * tolerance, then prioritizeNamePrefixes pulls exact/prefix matches to the top
 * so "kyo" lists Kyoto above Tokyo — the same ordering the country games use.
 */
export function searchCities(
  fuse: Fuse<City>,
  cities: readonly City[],
  query: string,
  limit = 6,
): City[] {
  const q = query.trim()
  if (!q) return []
  const fuzzyMatches = fuse.search(q, { limit: limit * 2 }).map((r) => r.item)
  return prioritizeNamePrefixes(q, cities, fuzzyMatches, limit)
}
