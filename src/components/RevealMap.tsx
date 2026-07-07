import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { City } from '../lib/cities'
import { esriRasterStyle } from '../lib/esri'

/**
 * Small non-interactive locator shown on the result screen: the same satellite
 * imagery zoomed out, with a marker on the answer so the player sees where the
 * city actually is.
 */
export default function RevealMap({ city }: { city: City }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: esriRasterStyle(),
      center: [city.lon, city.lat],
      zoom: 4,
      interactive: false,
      attributionControl: false,
    })

    const marker = new maplibregl.Marker({ color: '#ff5a5f' })
      .setLngLat([city.lon, city.lat])
      .addTo(map)

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)

    return () => {
      ro.disconnect()
      marker.remove()
      map.remove()
    }
  }, [city.id, city.lat, city.lon])

  return <div className="revealMap" ref={ref} />
}
