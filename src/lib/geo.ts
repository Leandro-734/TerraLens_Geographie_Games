// Geographic helpers shared by the map components.

// MapLibre LngLatBounds-like value: [[west, south], [east, north]] in [lng, lat].
export type BoundsLike = [[number, number], [number, number]]

/**
 * Build a bounding box centered on a point. Used as the satellite map's
 * `maxBounds` so the player can explore the metro area but cannot pan away to a
 * neighbouring (possibly identifiable) city. The longitude span is widened by
 * 1/cos(lat) so the box stays roughly square in real-world distance.
 */
export function bboxAround(lat: number, lon: number, halfLatDeg = 0.16): BoundsLike {
  const cos = Math.cos((lat * Math.PI) / 180)
  const halfLonDeg = halfLatDeg / Math.max(0.15, Math.abs(cos))
  return [
    [lon - halfLonDeg, lat - halfLatDeg],
    [lon + halfLonDeg, lat + halfLatDeg],
  ]
}

/** Great-circle distance in kilometres between two lat/lon points (haversine). */
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const la1 = toRad(aLat)
  const la2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial compass bearing in degrees (0–360, 0 = north) from point A to point B. */
export function bearing(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const p1 = toRad(aLat)
  const p2 = toRad(bLat)
  const dl = toRad(bLon - aLon)
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/**
 * Smallest angle between two compass bearings, in degrees (0–180). Wraps around
 * the 360°/0° seam, so e.g. 350° and 10° are 20° apart. Used by the True North
 * game to measure how far a guessed bearing is from the real one.
 */
export function angleDiffDeg(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return Math.min(d, 360 - d)
}
