import { describe, it, expect } from 'vitest'
import { normalize, isCorrectGuess, createCityFuse, searchCities } from './matching'
import type { City } from './cities'

const munich: City = {
  id: 'munich-de',
  name: 'Munich',
  country: 'Germany',
  countryCode: 'DE',
  lat: 48.13,
  lon: 11.58,
  population: 1_500_000,
  continent: 'Europe',
  aliases: ['München', 'Muenchen'],
}

describe('normalize', () => {
  it('strips accents and lowercases', () => {
    expect(normalize('São Paulo')).toBe('sao paulo')
    expect(normalize('  MÜNCHEN ')).toBe('munchen')
  })

  it('collapses punctuation to spaces', () => {
    expect(normalize('Washington, D.C.')).toBe('washington d c')
  })
})

describe('isCorrectGuess', () => {
  it('accepts the canonical name in any case', () => {
    expect(isCorrectGuess('munich', munich)).toBe(true)
    expect(isCorrectGuess('MUNICH', munich)).toBe(true)
  })

  it('accepts accented and alias spellings', () => {
    expect(isCorrectGuess('München', munich)).toBe(true)
    expect(isCorrectGuess('muenchen', munich)).toBe(true)
  })

  it('rejects a different city', () => {
    expect(isCorrectGuess('Berlin', munich)).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isCorrectGuess('   ', munich)).toBe(false)
  })
})

describe('searchCities', () => {
  const city = (id: string, name: string): City => ({
    id,
    name,
    country: 'Japan',
    countryCode: 'JP',
    lat: 0,
    lon: 0,
    population: 1_000_000,
    continent: 'Asia',
    aliases: [],
  })
  const cities = [city('tokyo-jp', 'Tokyo'), city('kyoto-jp', 'Kyoto'), city('osaka-jp', 'Osaka')]
  const fuse = createCityFuse(cities)

  it('ranks a name-prefix match above a mid-word match', () => {
    const results = searchCities(fuse, cities, 'kyo')
    expect(results[0]?.name).toBe('Kyoto')
    expect(results.map((c) => c.name)).toContain('Tokyo')
  })

  it('returns nothing for blank input', () => {
    expect(searchCities(fuse, cities, '  ')).toEqual([])
  })
})
