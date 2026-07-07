import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { City } from '../../lib/cities'
import { esriRasterStyle } from '../../lib/esri'

export type Guess = { lng: number; lat: number }

/**
 * World map for the Locate game.
 * - guess mode (default): interactive; click anywhere to drop/move a pin.
 * - reveal mode: shows the player's pin, the real location, and a dashed line
 *   between them, fit to both points.
 *
 * The component is mounted fresh per round/phase (via a `key`), so it sets up
 * once on mount; the latest onPick is read through a ref.
 */
export default function LocateMap({
  onPick,
  guess,
  city,
  reveal = false,
}: {
  onPick?: (g: Guess) => void
  guess?: Guess | null
  city?: City
  reveal?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: esriRasterStyle(),
      center: reveal && guess && city ? [(guess.lng + city.lon) / 2, (guess.lat + city.lat) / 2] : [0, 20],
      zoom: reveal ? 2 : 1.2,
      attributionControl: false,
      dragRotate: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.touchZoomRotate.disableRotation()

    let marker: maplibregl.Marker | null = null

    if (!reveal) {
      map.on('click', (e) => {
        if (!marker) marker = new maplibregl.Marker({ color: '#3fa9ff' }).setLngLat(e.lngLat).addTo(map)
        else marker.setLngLat(e.lngLat)
        onPickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      })
    } else if (guess && city) {
      const g: [number, number] = [guess.lng, guess.lat]
      const a: [number, number] = [city.lon, city.lat]
      // Markers and camera don't need the style — add them immediately so the
      // reveal is correct even before tiles finish loading.
      new maplibregl.Marker({ color: '#3fa9ff' }).setLngLat(g).addTo(map)
      new maplibregl.Marker({ color: '#ff5a5f' }).setLngLat(a).addTo(map)
      const bounds = new maplibregl.LngLatBounds(g, g)
      bounds.extend(a)
      map.fitBounds(bounds, { padding: 70, duration: 0, maxZoom: 6 })
      // The dashed connecting line is a style layer, so it must wait for load.
      const addLine = () => {
        if (map.getSource('guess-line')) return
        map.addSource('guess-line', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [g, a] } },
        })
        map.addLayer({
          id: 'guess-line',
          type: 'line',
          source: 'guess-line',
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] },
        })
      }
      if (map.isStyleLoaded()) addLine()
      else map.on('load', addLine)
    }

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)

    return () => {
      ro.disconnect()
      map.remove()
    }
    // Fixed for the lifetime of this mount (component is re-keyed per round/phase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="satMap" ref={ref} />
}
