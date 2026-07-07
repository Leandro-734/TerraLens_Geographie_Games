// Shared loader/cache for the world-borders GeoJSON (in public/). Used by both
// the Country Trail map and the Country Shapes silhouettes, so it's fetched once.

type Feat = { type: 'Feature'; properties: Record<string, unknown>; geometry: unknown }
export type BordersFC = { type: 'FeatureCollection'; features: Feat[] }

let fcCache: Promise<BordersFC> | null = null

export function loadBordersFC(): Promise<BordersFC> {
  if (!fcCache) {
    fcCache = fetch(`${import.meta.env.BASE_URL}countries.geo.json?v=14`).then(
      (r) => r.json() as Promise<BordersFC>,
    )
  }
  return fcCache
}

/** Map of ISO2 code -> GeoJSON geometry. */
export async function loadGeometryByCode(): Promise<Map<string, unknown>> {
  const fc = await loadBordersFC()
  const m = new Map<string, unknown>()
  for (const f of fc.features) {
    const properties = f.properties as { code?: string; kind?: string }
    if (properties.code && !properties.kind) m.set(properties.code, f.geometry)
  }
  return m
}
