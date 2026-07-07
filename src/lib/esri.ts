// Esri "World Imagery" basemap — free, no API key required.
// This is the IMAGERY-ONLY layer (no place labels), which is exactly what we
// want so players can't simply read the city name off the map.
//
// Usage of these tiles requires attribution to be displayed (see ESRI_ATTRIBUTION).
// Rather than an on-map control over every game, we credit it once in the app
// footer (see MenuScreen). For commercial use, review Esri's terms of service.
export const ESRI_WORLD_IMAGERY_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export const ESRI_ATTRIBUTION =
  'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'

// Highest zoom level the World Imagery service serves tiles for.
export const ESRI_MAX_NATIVE_ZOOM = 19

import type { StyleSpecification } from 'maplibre-gl'

/**
 * Build a static satellite image URL (Esri World Imagery "export" endpoint, no
 * key required) centred on a point. Used as the photo background for the
 * Higher/Lower cards. The bbox is computed in Web Mercator (EPSG:3857) so the
 * image isn't distorted, and sized to match the requested width/height.
 */
export function esriStaticImageUrl(
  lat: number,
  lon: number,
  { w = 640, h = 800, halfHeightM = 9000 } = {},
): string {
  const x = (lon * 20037508.34) / 180
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (20037508.34 / 180)
  const halfH = halfHeightM
  const halfW = halfH * (w / h)
  const bbox = `${x - halfW},${y - halfH},${x + halfW},${y + halfH}`
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${w},${h}&format=jpg&f=image`
}

/** A minimal MapLibre style that shows only the Esri World Imagery raster layer. */
export function esriRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: [ESRI_WORLD_IMAGERY_TILES],
        tileSize: 256,
        maxzoom: ESRI_MAX_NATIVE_ZOOM,
        attribution: ESRI_ATTRIBUTION,
      },
    },
    layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
  }
}
