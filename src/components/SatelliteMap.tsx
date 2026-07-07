import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { City } from '../lib/cities'
import { zoomForCity } from '../lib/cities'
import { esriRasterStyle } from '../lib/esri'
import { bboxAround } from '../lib/geo'

/**
 * The mystery satellite view. Locked down so the player can inspect the city but
 * cannot cheat:
 *  - minZoom prevents zooming out far enough to reveal the continent/coastline
 *  - maxBounds prevents panning away to a neighbouring city
 *  - rotation/pitch disabled
 * Uses the Esri World Imagery layer, which has no place labels.
 */
export default function SatelliteMap({ city }: { city: City }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const initialZoom = zoomForCity(city.population)
    const map = new maplibregl.Map({
      container,
      style: esriRasterStyle(),
      center: [city.lon, city.lat],
      zoom: initialZoom,
      minZoom: Math.max(10, initialZoom - 1),
      maxZoom: 16.5,
      maxBounds: bboxAround(city.lat, city.lon) as maplibregl.LngLatBoundsLike,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.touchZoomRotate.disableRotation()
    map.keyboard.disable()
    // Don't let the canvas steal focus from the guess input when panning/zooming.
    map.getCanvas().removeAttribute('tabindex')

    // Keep the canvas sized to its (flex) container.
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)

    return () => {
      ro.disconnect()
      map.remove()
    }
  }, [city.id, city.lat, city.lon, city.population])

  return (
    <div
      className="satMap"
      ref={ref}
      role="img"
      aria-label="Satellite view of a mystery city"
    />
  )
}
