// Fetches each city's Wikipedia lead photo — the same image a search engine's
// knowledge panel shows for that city — and bakes the URL into
// src/data/cities.json as `photoUrl`. Used by Higher/Lower so it can show a
// real photo of the city instead of the satellite tile the rest of the app
// uses.
//
// For each city we try a couple of candidate Wikipedia titles and validate
// the match by comparing the page's own coordinates to our dataset's lat/lon
// (rejecting anything more than MAX_DISTANCE_KM away). This catches wrong
// disambiguation — e.g. "Perth" landing on Perth, Scotland — without having
// to hand-list every one of the 150+ cities.
//
// Cities we can't confidently resolve are left without a photoUrl, and the
// game falls back to the satellite image for those.
//
// Wikipedia's anonymous API quota is enforced at the edge (Envoy) and gives
// an explicit `retry-after` header when exceeded — we sleep exactly that
// long (no extra backoff multiplier) and otherwise pace requests well under
// the limit. Progress is written to disk after every city, so killing and
// re-running this script picks up where it left off.
//
// Run: node scripts/fetch-city-photos.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DATA_PATH = `${root}src/data/cities.json`

const cities = JSON.parse(readFileSync(DATA_PATH, 'utf8'))

const THUMB_WIDTH = 720
const MAX_DISTANCE_KM = 150
const REQUEST_DELAY_MS = 1200
const MAX_RETRIES = 4
const USER_AGENT = 'CityHigherLowerPhotoFetch/1.0 (one-off script for a local geography game)'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Wikipedia's plain-name title isn't the right city for these — either a
// disambiguation page or a different primary topic entirely.
const TITLE_OVERRIDES = {
  'washington-us': 'Washington, D.C.',
  'salvador-br': 'Salvador, Bahia',
  'gold-coast-au': 'Gold Coast, Queensland',
  // Plain "Columbus" is a disambiguation page (and the explorer); the Ohio
  // capital is the city we mean.
  'columbus-us': 'Columbus, Ohio',
  // "New York" alone is the state; the city's article is titled "New York City".
  'new-york-us': 'New York City',
  // City-state pages are templated like a country's, so pageimages picks the
  // flag — route to a landmark article that actually has a skyline photo.
  'hong-kong-hk': 'Victoria Harbour',
  'singapore-sg': 'Marina Bay, Singapore',
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function fetchPage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title,
  )}&prop=pageimages|coordinates|pageprops&pithumbsize=${THUMB_WIDTH}&redirects=1&format=json`
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 + 500 : 5000
      console.log(`  rate-limited, waiting ${Math.round(waitMs / 1000)}s...`)
      await sleep(waitMs)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return Object.values(json.query?.pages ?? {})[0]
  }
  throw new Error('HTTP 429 (exhausted retries)')
}

async function resolvePhoto(city) {
  const candidates = [TITLE_OVERRIDES[city.id], city.name, `${city.name}, ${city.country}`].filter(
    Boolean,
  )
  for (const title of candidates) {
    let page
    try {
      page = await fetchPage(title)
    } catch (err) {
      console.warn(`  [${city.id}] fetch failed for "${title}": ${err.message}`)
      continue
    }
    if (!page || page.missing !== undefined) continue
    if (page.pageprops?.disambiguation !== undefined) continue
    if (!page.thumbnail?.source) continue
    // Territory-styled pages (city-states, etc.) often lead with the flag,
    // coat of arms, or a locator map — all SVG source files. Reject those;
    // a real photo is always a raster original (jpg/png/...).
    if (/\.svg$/i.test(page.pageimage ?? '')) continue
    const coord = page.coordinates?.[0]
    if (coord) {
      const distance = haversineKm(city.lat, city.lon, coord.lat, coord.lon)
      if (distance > MAX_DISTANCE_KM) {
        console.warn(`  [${city.id}] "${title}" is ${Math.round(distance)}km away — rejected`)
        continue
      }
    }
    return page.thumbnail.source
  }
  return null
}

const results = cities.map((c) => ({ ...c }))
const missing = []
let okCount = 0
let skipCount = 0

console.log(`Fetching photos for ${cities.length} cities...`)
for (let i = 0; i < cities.length; i++) {
  const city = cities[i]
  // Resumable: a previous run may have already resolved this one.
  if (city.photoUrl) {
    okCount++
    skipCount++
    continue
  }
  const photoUrl = await resolvePhoto(city)
  if (photoUrl) {
    results[i].photoUrl = photoUrl
    okCount++
    console.log(`[${i + 1}/${cities.length}] ${city.name} -> ok`)
  } else {
    missing.push(`${city.id} (${city.name}, ${city.country})`)
    console.log(`[${i + 1}/${cities.length}] ${city.name} -> no confident match`)
  }
  // Save after every city so a kill/crash never loses progress.
  writeFileSync(DATA_PATH, `${JSON.stringify(results, null, 2)}\n`)
  await sleep(REQUEST_DELAY_MS)
}
if (skipCount) console.log(`(skipped ${skipCount} that already had a photoUrl from a previous run)`)

console.log(`Done: ${okCount}/${cities.length} cities got a photo -> src/data/cities.json`)
if (missing.length) {
  console.log(`No confident match for ${missing.length} (will use the satellite image instead):`)
  for (const m of missing) console.log(`  - ${m}`)
}
