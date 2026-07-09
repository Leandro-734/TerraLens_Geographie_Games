import rawCities from '../data/cities.json'

export type Continent =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Oceania'

/** A named sub-region that cuts across the usual continent groupings, offered
 * as an extra filter alongside continents in the region picker. */
export type SubRegion = 'Arabian Peninsula' | 'USA' | 'China'

export type Region = Continent | SubRegion

export interface City {
  id: string
  name: string
  country: string
  /** ISO 3166-1 alpha-2 code, used for the flag emoji and region grouping. */
  countryCode: string
  lat: number
  lon: number
  population: number
  continent: Continent
  /** Alternate spellings / names accepted as correct guesses (e.g. "München"). */
  aliases: string[]
  /**
   * A real photo of the city (Wikipedia's lead image). Present in the dataset
   * for most cities — see scripts/fetch-city-photos.mjs.
   */
  photoUrl?: string
}

export const CITIES = rawCities as City[]

export const CONTINENTS = Array.from(new Set(CITIES.map((c) => c.continent))).sort() as Continent[]

const ARABIAN_PENINSULA_COUNTRY_CODES = new Set(['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE'])

const SUB_REGION_FILTERS: Record<SubRegion, (city: City) => boolean> = {
  'Arabian Peninsula': (city) => ARABIAN_PENINSULA_COUNTRY_CODES.has(city.countryCode),
  USA: (city) => city.countryCode === 'US',
  China: (city) => city.countryCode === 'CN',
}

export const SUB_REGIONS = Object.keys(SUB_REGION_FILTERS) as SubRegion[]

/** Which slice of the dataset a game draws from: a curated set of globally
 * iconic cities, or the full list. */
export type CityPool = 'famous' | 'all'

/** Hand-picked, widely-recognised cities — a gentler pool for players who want
 * the classics rather than all {@link CITIES}. Spans every continent. */
export const FAMOUS_CITY_IDS = new Set<string>([
  // Europe
  'paris-fr', 'london-gb', 'madrid-es', 'barcelona-es', 'rome-it', 'venice-it',
  'berlin-de', 'amsterdam-nl', 'vienna-at', 'prague-cz', 'athens-gr', 'lisbon-pt',
  'moscow-ru', 'istanbul-tr', 'dublin-ie', 'stockholm-se',
  // North America
  'new-york-us', 'los-angeles-us', 'chicago-us', 'san-francisco-us', 'las-vegas-us',
  'washington-us', 'miami-us', 'toronto-ca', 'vancouver-ca', 'mexico-city-mx',
  // South America
  'sao-paulo-br', 'rio-de-janeiro-br', 'buenos-aires-ar', 'lima-pe', 'bogota-co',
  // Asia
  'tokyo-jp', 'kyoto-jp', 'seoul-kr', 'beijing-cn', 'shanghai-cn', 'hong-kong-hk',
  'bangkok-th', 'singapore-sg', 'mumbai-in', 'delhi-in', 'dubai-ae', 'jerusalem-il',
  // Africa
  'cairo-eg', 'cape-town-za', 'marrakech-ma', 'nairobi-ke',
  // Oceania
  'sydney-au', 'melbourne-au', 'auckland-nz',
])

/** Number of curated cities actually present in the dataset (for UI labels). */
export const FAMOUS_CITY_COUNT = CITIES.filter((c) => FAMOUS_CITY_IDS.has(c.id)).length

/** Narrow a list of cities to the chosen pool. 'all' returns them unchanged. */
export function citiesInPool(cities: City[], pool: CityPool = 'all'): City[] {
  return pool === 'famous' ? cities.filter((c) => FAMOUS_CITY_IDS.has(c.id)) : cities
}

/** All cities matching a region filter; 'all' (or omitted) returns every city. */
export function citiesInRegion(region?: Region | 'all'): City[] {
  if (!region || region === 'all') return CITIES
  const subFilter = SUB_REGION_FILTERS[region as SubRegion]
  if (subFilter) return CITIES.filter(subFilter)
  return CITIES.filter((c) => c.continent === region)
}

/** Turn an ISO country code into its flag emoji (regional indicator letters). */
export function flagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase().replace(/[^A-Z]/g, '')
  if (cc.length !== 2) return '🏳️'
  return cc.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

/**
 * Default/min zoom for a city's satellite view. Bigger cities start a little
 * further out so the urban core fits; smaller cities start tighter. This is also
 * used as the map's minZoom so the player can't zoom out to reveal the continent.
 */
export function zoomForCity(population: number): number {
  if (population >= 8_000_000) return 11
  if (population >= 3_000_000) return 11.5
  if (population >= 1_000_000) return 12
  if (population >= 500_000) return 12.5
  return 13
}

/** Fisher–Yates shuffle, returns a new array. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Order a pool so unseen items come first (shuffled), then recently-seen ones
 * ordered least-recently-seen first. Picking off the front therefore avoids
 * repeats while a fresh pool lasts, and — once it's exhausted — reuses the
 * oldest sightings before the newest. `recent` is oldest-first / newest-last.
 */
export function orderByFreshness<T>(
  pool: readonly T[],
  keyOf: (item: T) => string,
  recent: readonly string[] = [],
): T[] {
  if (recent.length === 0) return shuffle(pool)
  const rank = new Map(recent.map((k, i) => [k, i]))
  const unseen: T[] = []
  const seen: T[] = []
  for (const item of pool) (rank.has(keyOf(item)) ? seen : unseen).push(item)
  seen.sort((a, b) => rank.get(keyOf(a))! - rank.get(keyOf(b))!)
  return [...shuffle(unseen), ...seen]
}

/**
 * Pick N unique cities for a game, optionally limited to a region. `recent` is a
 * list of recently-seen city ids (oldest first) that are pushed to the back so
 * the player is less likely to see the same city again soon.
 */
export function pickRounds(
  n: number,
  region?: Region | 'all',
  recent: readonly string[] = [],
  cityPool: CityPool = 'all',
): City[] {
  const pool = citiesInPool(citiesInRegion(region), cityPool)
  return orderByFreshness(pool, (c) => c.id, recent).slice(0, Math.min(n, pool.length))
}

/**
 * Pick plausible-but-wrong options for multiple-choice mode. Biased toward the
 * same continent (harder, fairer) and falls back to other continents if needed.
 * Never returns the answer or two cities sharing a display name.
 */
export function pickDistractors(answer: City, count: number, pool: City[] = CITIES): City[] {
  const sameContinent = shuffle(
    pool.filter((c) => c.id !== answer.id && c.continent === answer.continent),
  )
  const otherContinent = shuffle(
    pool.filter((c) => c.id !== answer.id && c.continent !== answer.continent),
  )
  const ordered = [...sameContinent, ...otherContinent]
  const picked: City[] = []
  for (const c of ordered) {
    if (picked.length >= count) break
    if (c.name === answer.name) continue
    if (picked.some((p) => p.name === c.name)) continue
    picked.push(c)
  }
  return picked
}

/** Build a shuffled set of multiple-choice options including the answer. */
export function buildOptions(answer: City, total = 4, pool: City[] = CITIES): City[] {
  return shuffle([answer, ...pickDistractors(answer, total - 1, pool)])
}
