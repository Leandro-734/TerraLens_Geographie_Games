// Regenerates public/countries.geo.json, the world-border geometry used by
// Country Trail and Country Shapes.
//
// Source: world-atlas 1:10m (Natural Earth derived, TopoJSON), simplified while
// it is still topology. Simplifying shared arcs before GeoJSON conversion keeps
// small real borders connected and impossible borders separated (especially
// around Lake Chad) without shipping the full 10m dataset.
//
// Run: node scripts/build-borders.mjs
import earcut from 'earcut'
import { feature, mesh } from 'topojson-client'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const topo = require('world-atlas/countries-10m.json')
const worldCountries = require('world-countries')
const game = require('../src/data/countries.json')

const root = fileURLToPath(new URL('..', import.meta.url))
const OUT = `${root}public/countries.geo.json`
const PRECISION = 3 // decimal places (~110 m)
// At maximum map zoom this is less than one horizontal screen pixel at the
// equator. It removes roughly 80% of raw 10m coordinates while retaining the
// topology and useful border detail.
const SIMPLIFY_TOLERANCE = 0.02 // degrees (~2.2 km at the equator)
// Every visible map border (coastline and inland) uses this same detail grade.
// The individual polygons stay slightly finer because Country Shapes shares
// them, while the globe outline can be lighter without losing useful detail.
const MAP_OUTLINE_TOLERANCE = 0.1 // degrees (~11 km at the equator)

// Well-known nations with no land border, so they're absent from countries.json
// (the Travle neighbor graph) but are still playable in Shapes/Flags/Capitals/
// Dossier. Mirrors the EXTRA list in src/lib/world.ts — keep the two in sync.
const ISLAND_CODES = [
  'GB', 'IE', 'IS', 'JP', 'PH', 'AU', 'NZ', 'CU', 'JM', 'DO',
  'HT', 'MG', 'LK', 'TW', 'CY', 'FJ', 'BS', 'TT',
]

// The map only renders countries the game knows about, so omit the rest.
const gameCodes = new Set([...game.map((country) => country.code), ...ISLAND_CODES])
// Display names come from the game data (countries.json) so the generated
// geometry stays consistent with what the games show — e.g. current names like
// "North Macedonia"/"Türkiye" instead of the source's older "Macedonia"/"Turkey".
const gameNameByCode = new Map(game.map((country) => [country.code, country.name]))

// Numeric ISO (ccn3) -> ISO2 code.
const codeByNumeric = new Map()
for (const country of worldCountries) {
  if (country.ccn3) codeByNumeric.set(country.ccn3, country.cca2)
}
// Natural Earth leaves some partial-recognition states without a numeric id.
const codeByName = { Kosovo: 'XK', Somaliland: 'XS' }

const round = (number) => Math.round(number * 10 ** PRECISION) / 10 ** PRECISION
const roundCoords = (coordinates) =>
  typeof coordinates[0] === 'number'
    ? [round(coordinates[0]), round(coordinates[1])]
    : coordinates.map(roundCoords)

// MapLibre's globe draws a segment from +180° to -180° the long way around,
// which appears as concentric polar rings or a line across the whole globe.
// Split mesh paths at the date line so no such segment reaches the renderer.
function splitAtAntimeridian(geometry) {
  const sourceLines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
  const lines = []
  for (const sourceLine of sourceLines) {
    let line = [sourceLine[0]]
    for (let index = 1; index < sourceLine.length; index += 1) {
      const point = sourceLine[index]
      if (Math.abs(point[0] - sourceLine[index - 1][0]) > 180) {
        if (line.length > 1) lines.push(line)
        line = [point]
      } else {
        line.push(point)
      }
    }
    if (line.length > 1) lines.push(line)
  }
  return { type: 'MultiLineString', coordinates: lines }
}

function geometryCrossesAntimeridian(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some((polygon) => polygon.some((ring) =>
    ring.some((point, index) => index > 0 && Math.abs(point[0] - ring[index - 1][0]) > 180),
  ))
}

function clipVertical(points, longitude, keepGreater) {
  const output = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    const startInside = keepGreater ? start[0] >= longitude : start[0] <= longitude
    const endInside = keepGreater ? end[0] >= longitude : end[0] <= longitude
    if (startInside !== endInside) {
      const ratio = (longitude - start[0]) / (end[0] - start[0])
      output.push([longitude, start[1] + (end[1] - start[1]) * ratio])
    }
    if (endInside) output.push(end)
  }
  return output
}

function unwrapRing(sourceRing, referenceLongitude = null) {
  const ring = sourceRing.slice(0, -1)
  const unwrapped = [ring[0].slice()]
  for (let index = 1; index < ring.length; index += 1) {
    let longitude = ring[index][0]
    const previous = unwrapped[index - 1][0]
    while (longitude - previous > 180) longitude -= 360
    while (longitude - previous < -180) longitude += 360
    unwrapped.push([longitude, ring[index][1]])
  }
  if (referenceLongitude !== null) {
    const average = unwrapped.reduce((sum, point) => sum + point[0], 0) / unwrapped.length
    const shift = Math.round((referenceLongitude - average) / 360) * 360
    for (const point of unwrapped) point[0] += shift
  }
  return unwrapped
}

function triangulateForGlobe(geometry) {
  const sourcePolygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const safePolygons = []
  for (const sourcePolygon of sourcePolygons) {
    const exterior = unwrapRing(sourcePolygon[0])
    const reference = exterior.reduce((sum, point) => sum + point[0], 0) / exterior.length
    const rings = [exterior, ...sourcePolygon.slice(1).map((ring) => unwrapRing(ring, reference))]
    const flat = []
    const holes = []
    for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
      if (ringIndex > 0) holes.push(flat.length / 2)
      for (const point of rings[ringIndex]) flat.push(point[0], point[1])
    }
    const indices = earcut(flat, holes, 2)
    for (let index = 0; index < indices.length; index += 3) {
      const triangle = [indices[index], indices[index + 1], indices[index + 2]].map((vertex) => [
        flat[vertex * 2],
        flat[vertex * 2 + 1],
      ])
      const minLongitude = Math.min(...triangle.map((point) => point[0]))
      const maxLongitude = Math.max(...triangle.map((point) => point[0]))
      const firstBand = Math.floor((minLongitude + 180) / 360)
      const lastBand = Math.floor((maxLongitude + 180) / 360)
      for (let band = firstBand; band <= lastBand; band += 1) {
        const lower = -180 + band * 360
        const upper = 180 + band * 360
        let clipped = clipVertical(triangle, lower, true)
        if (clipped.length >= 3) clipped = clipVertical(clipped, upper, false)
        if (clipped.length < 3) continue
        clipped = clipped.map((point) => [point[0] - band * 360, point[1]])
        const area = clipped.reduce((sum, point, pointIndex) => {
          const next = clipped[(pointIndex + 1) % clipped.length]
          return sum + point[0] * next[1] - next[0] * point[1]
        }, 0)
        if (Math.abs(area) < 1e-9) continue
        if (area < 0) clipped.reverse()
        safePolygons.push([[...clipped, clipped[0]]])
      }
    }
  }
  return { type: 'MultiPolygon', coordinates: safePolygons }
}
function distanceToSegmentSq(point, start, end, scaleX, scaleY) {
  let x = start[0] * scaleX
  let y = start[1] * scaleY
  let dx = (end[0] - start[0]) * scaleX
  let dy = (end[1] - start[1]) * scaleY
  if (dx || dy) {
    const t = Math.max(
      0,
      Math.min(
        1,
        (((point[0] - start[0]) * scaleX) * dx + ((point[1] - start[1]) * scaleY) * dy) /
          (dx * dx + dy * dy),
      ),
    )
    x += t * dx
    y += t * dy
  }
  dx = point[0] * scaleX - x
  dy = point[1] * scaleY - y
  return dx * dx + dy * dy
}

/** Douglas-Peucker on one shared TopoJSON arc, retaining both junctions. */
function simplifyArc(arc, tolerance, scaleX, scaleY) {
  if (arc.length <= 2) return arc

  let x = 0
  let y = 0
  const points = arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return [x, y]
  })
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const toleranceSq = tolerance * tolerance
  const stack = [[0, points.length - 1]]

  while (stack.length) {
    const [start, end] = stack.pop()
    let furthest = -1
    let maxDistanceSq = toleranceSq
    for (let i = start + 1; i < end; i += 1) {
      const distanceSq = distanceToSegmentSq(points[i], points[start], points[end], scaleX, scaleY)
      if (distanceSq > maxDistanceSq) {
        furthest = i
        maxDistanceSq = distanceSq
      }
    }
    if (furthest >= 0) {
      keep[furthest] = 1
      stack.push([start, furthest], [furthest, end])
    }
  }

  const simplified = []
  let previousX = 0
  let previousY = 0
  for (let i = 0; i < points.length; i += 1) {
    if (!keep[i]) continue
    simplified.push([points[i][0] - previousX, points[i][1] - previousY])
    previousX = points[i][0]
    previousY = points[i][1]
  }
  return simplified
}

const [scaleX, scaleY] = topo.transform.scale
topo.arcs = topo.arcs.map((arc) => simplifyArc(arc, SIMPLIFY_TOLERANCE, scaleX, scaleY))

const arcIds = (value) =>
  typeof value === 'number' ? [value < 0 ? ~value : value] : value.flatMap(arcIds)

function sharesArc(firstCode, secondCode) {
  const geometries = topo.objects.countries.geometries
  const first = geometries.find((geometry) => codeByNumeric.get(String(geometry.id)) === firstCode)
  const second = geometries.find((geometry) => codeByNumeric.get(String(geometry.id)) === secondCode)
  if (!first || !second) return false
  const firstArcs = new Set(arcIds(first.arcs))
  return arcIds(second.arcs).some((arc) => firstArcs.has(arc))
}

// Coarse source geometry can erase Nigeria-Chad and visually imply a
// non-existent Cameroon-Niger border. Keep this sensitive junction guarded.
if (!sharesArc('CM', 'TD') || !sharesArc('NG', 'TD') || sharesArc('CM', 'NE')) {
  throw new Error('Border topology regression around Lake Chad')
}

const collection = feature(topo, topo.objects.countries)
const features = []
for (const sourceFeature of collection.features) {
  const code =
    codeByNumeric.get(String(sourceFeature.id)) ?? codeByName[sourceFeature.properties?.name]
  if (!code || !gameCodes.has(code)) continue
  features.push({
    type: 'Feature',
    properties: { code, name: gameNameByCode.get(code) ?? sourceFeature.properties?.name ?? code },
    geometry: {
      type: sourceFeature.geometry.type,
      coordinates: roundCoords(sourceFeature.geometry.coordinates),
    },
  })
}

const countryFeatureCount = features.length
// Render the normal map outlines from one shared topology mesh instead of
// drawing every polygon ring. Besides avoiding doubled borders, this removes
// the antimeridian/polar closure arcs that polygon line layers can produce on
// MapLibre's globe projection.
const outlineTopo = structuredClone(topo)
outlineTopo.arcs = outlineTopo.arcs.map((arc) =>
  simplifyArc(arc, MAP_OUTLINE_TOLERANCE, scaleX, scaleY),
)
const mapGeometries = outlineTopo.objects.countries.geometries.filter((geometry) => {
  const code = codeByNumeric.get(String(geometry.id)) ?? codeByName[geometry.properties?.name]
  return code && gameCodes.has(code)
})
const mapObject = { type: 'GeometryCollection', geometries: mapGeometries }
const outlineGeometry = splitAtAntimeridian(mesh(outlineTopo, mapObject))
features.push({
  type: 'Feature',
  properties: { kind: 'outline' },
  geometry: {
    type: outlineGeometry.type,
    coordinates: roundCoords(outlineGeometry.coordinates),
  },
})

const coastlineGeometry = splitAtAntimeridian(
  mesh(outlineTopo, mapObject, (first, second) => first === second),
)
features.push({
  type: 'Feature',
  properties: { kind: 'coastline' },
  geometry: {
    type: coastlineGeometry.type,
    coordinates: roundCoords(coastlineGeometry.coordinates),
  },
})

for (const sourceGeometry of mapGeometries) {
  const sourceFeature = feature(outlineTopo, sourceGeometry)
  const code =
    codeByNumeric.get(String(sourceFeature.id)) ?? codeByName[sourceFeature.properties?.name]
  if (!code || !gameCodes.has(code)) continue
  const crossesAntimeridian = geometryCrossesAntimeridian(sourceFeature.geometry)
  if (crossesAntimeridian) {
    const safeOutline = splitAtAntimeridian(mesh(outlineTopo, sourceGeometry))
    features.push({
      type: 'Feature',
      properties: { kind: 'country-outline', code },
      geometry: {
        type: safeOutline.type,
        coordinates: roundCoords(safeOutline.coordinates),
      },
    })
  }
  const geometry = crossesAntimeridian
    ? triangulateForGlobe(sourceFeature.geometry)
    : sourceFeature.geometry
  features.push({
    type: 'Feature',
    properties: { kind: 'fill', code, ...(crossesAntimeridian ? { split: true } : {}) },
    geometry: {
      type: geometry.type,
      coordinates: roundCoords(geometry.coordinates),
    },
  })
}

const output = JSON.stringify({ type: 'FeatureCollection', features })
writeFileSync(OUT, output)

const have = new Set(features.map((sourceFeature) => sourceFeature.properties.code))
const missing = game
  .filter((country) => !have.has(country.code))
  .map((country) => `${country.code} ${country.name}`)
const size = (Buffer.byteLength(output) / 1024).toFixed(0)

console.log(`Wrote ${countryFeatureCount} countries (${size} KB) -> public/countries.geo.json`)
console.log(
  missing.length
    ? `Missing ${missing.length} game countries: ${missing.join(', ')}`
    : 'All game countries present in geometry',
)
