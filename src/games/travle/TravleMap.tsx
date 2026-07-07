import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { COUNTRIES } from '../../lib/countries'
import { loadBordersFC } from '../../lib/borders'

type Feat = { type: 'Feature'; properties: Record<string, unknown>; geometry: unknown }
type FC = { type: 'FeatureCollection'; features: Feat[] }

const CENTROID = new Map(COUNTRIES.map((c) => [c.code, [c.lon, c.lat] as [number, number]]))

const POINTS: FC = {
  type: 'FeatureCollection',
  features: COUNTRIES.map((c) => ({
    type: 'Feature',
    properties: { code: c.code },
    geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
  })),
}

const COLORS = {
  // Solid colors pre-blended against the map background. Keeping fill opacity
  // at 1 prevents semi-transparent globe tiles from forming dark triangular
  // overlap seams on narrow or concave countries.
  start: '#3b9eec',
  end: '#eb5481',
  route: '#26b879',
  redundant: '#cd9642',
  off: '#5b6779',
  baseContinents: '#142238',
}

export interface Hints {
  continents: boolean
  nextOutline: boolean
  allOutlines: boolean
  initials: boolean
}

interface Props {
  startCode: string
  endCode: string
  route: string[]
  redundant: string[]
  off: string[]
  nextCode: string | null
  hints: Hints
  /** Once the trail ends, reveal every country's outline + a faint fill so the
   *  real geography (who borders whom) is legible regardless of hints used. */
  revealAll: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillColor(p: Props): any {
  return [
    'case',
    ['==', ['get', 'code'], p.startCode], COLORS.start,
    ['==', ['get', 'code'], p.endCode], COLORS.end,
    ['in', ['get', 'code'], ['literal', p.route]], COLORS.route,
    ['in', ['get', 'code'], ['literal', p.redundant]], COLORS.redundant,
    ['in', ['get', 'code'], ['literal', p.off]], COLORS.off,
    COLORS.baseContinents,
  ]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillOpacity(p: Props, baseOpacity: number): any {
  return [
    'case',
    ['==', ['get', 'code'], p.startCode], 1,
    ['==', ['get', 'code'], p.endCode], 1,
    ['in', ['get', 'code'], ['literal', p.route]], 1,
    ['in', ['get', 'code'], ['literal', p.redundant]], 1,
    ['in', ['get', 'code'], ['literal', p.off]], 1,
    baseOpacity,
  ]
}

function baseFillOpacity(p: Props): number {
  return p.hints.continents || p.hints.allOutlines || p.revealAll ? 1 : 0
}

export default function TravleMap(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const readyRef = useRef(false)
  const polyCodesRef = useRef<Set<string>>(new Set())
  const bboxRef = useRef<Map<string, [number, number, number, number]>>(new Map())
  const lastFitRef = useRef('')

  const apply = () => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const p = propsRef.current
    map.setPaintProperty('country-fill', 'fill-color', fillColor(p))
    map.setPaintProperty('country-fill', 'fill-opacity', fillOpacity(p, baseFillOpacity(p)))
    map.setPaintProperty('country-dot', 'circle-color', fillColor(p))

    const highlighted = [p.startCode, p.endCode, ...p.route, ...p.redundant, ...p.off]
    const missing = highlighted.filter((c) => c && !polyCodesRef.current.has(c))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.setFilter('country-dot', ['in', ['get', 'code'], ['literal', missing]] as any)

    const vis = (id: string, on: boolean) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    vis('land-line', p.hints.continents || p.hints.allOutlines || p.revealAll)
    vis('country-line', p.hints.allOutlines || p.revealAll)
    vis('country-initials', p.hints.initials)
    const showNext = p.hints.nextOutline && !!p.nextCode
    vis('country-next', showNext)
    if (showNext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setFilter(
        'country-next',
        [
          'all',
          ['==', ['get', 'code'], p.nextCode],
          [
            'any',
            ['all', ['==', ['get', 'kind'], 'fill'], ['!', ['has', 'split']]],
            ['==', ['get', 'kind'], 'country-outline'],
          ],
        ] as any,
      )
    }

    // Auto-focus the globe on the start + destination countries — and re-focus
    // whenever the pair changes (i.e. on a new trail).
    const fitKey = `${p.startCode}_${p.endCode}`
    if (fitKey !== lastFitRef.current) {
      let w = Infinity
      let s = Infinity
      let e = -Infinity
      let n = -Infinity
      let any = false
      for (const c of [p.startCode, p.endCode]) {
        let span = bboxRef.current.get(c) ?? null
        // Antimeridian-crossing or enormous countries (Russia, Fiji) get a
        // degenerate full-width bbox — fall back to their centroid so the
        // globe still frames the pair tightly.
        if (span && span[2] - span[0] > 170) span = null
        if (!span) {
          const ce = CENTROID.get(c)
          span = ce ? ([ce[0], ce[1], ce[0], ce[1]] as [number, number, number, number]) : null
        }
        if (span) {
          any = true
          w = Math.min(w, span[0])
          s = Math.min(s, span[1])
          e = Math.max(e, span[2])
          n = Math.max(n, span[3])
        }
      }
      if (any) {
        const animate = lastFitRef.current !== ''
        // Record before fitBounds: a zero-duration fit can emit moveend synchronously.
        lastFitRef.current = fitKey
        map.fitBounds([[w, s], [e, n]] as maplibregl.LngLatBoundsLike, {
          padding: 55,
          maxZoom: 5,
          duration: animate ? 700 : 0,
        })
      }
    }
  }

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        // Render on a globe (MapLibre v5). Falls back to mercator if unsupported.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projection: { type: 'globe' } as any,
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#070d18' } }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      center: [20, 30],
      zoom: 1.3,
      minZoom: 1.1,
      maxZoom: 6,
      attributionControl: false,
      dragRotate: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.touchZoomRotate.disableRotation()
    map.getCanvas().removeAttribute('tabindex')

    map.on('load', async () => {
      const geo = await loadBordersFC()
      polyCodesRef.current = new Set(
        geo.features
          .filter((f) => !(f.properties as { kind?: string }).kind)
          .map((f) => (f.properties as { code?: string }).code)
          .filter(Boolean) as string[],
      )
      // Precompute each country's bounding box for accurate auto-focus.
      const bb = new Map<string, [number, number, number, number]>()
      for (const f of geo.features) {
        const properties = f.properties as { code?: string; kind?: string }
        const code = properties.code
        if (!code || properties.kind) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = f.geometry as any
        let w = Infinity
        let s = Infinity
        let e = -Infinity
        let n = -Infinity
        const scan = (ring: number[][]) => {
          for (const pt of ring) {
            if (pt[0] < w) w = pt[0]
            if (pt[0] > e) e = pt[0]
            if (pt[1] < s) s = pt[1]
            if (pt[1] > n) n = pt[1]
          }
        }
        if (g?.type === 'Polygon') (g.coordinates as number[][][]).forEach(scan)
        else if (g?.type === 'MultiPolygon') (g.coordinates as number[][][][]).forEach((poly) => poly.forEach(scan))
        if (Number.isFinite(w)) bb.set(code, [w, s, e, n])
      }
      bboxRef.current = bb
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource('countries', {
        type: 'geojson',
        data: geo as any,
        // Keep short shared borders visible when MapLibre builds its internal
        // tiles. The default 0.375px tolerance can erase the Lake Chad links.
        tolerance: 0.05,
      })

      map.addLayer({
        id: 'land-line',
        type: 'line',
        source: 'countries',
        filter: ['==', ['get', 'kind'], 'coastline'],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#4f617d', 'line-width': 0.8, 'line-opacity': 0.45 },
      })
      map.addLayer({
        id: 'country-fill',
        type: 'fill',
        source: 'countries',
        filter: ['==', ['get', 'kind'], 'fill'],
        paint: { 'fill-color': COLORS.baseContinents, 'fill-opacity': 0 },
      })
      // All-country borders — hidden until the "all outlines" hint.
      map.addLayer({
        id: 'country-line',
        type: 'line',
        source: 'countries',
        filter: ['==', ['get', 'kind'], 'outline'],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#7f93b3', 'line-width': 0.6, 'line-opacity': 0.5 },
      })
      // "Next country" outline hint.
      map.addLayer({
        id: 'country-next',
        type: 'line',
        source: 'countries',
        layout: { visibility: 'none' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: [
          'all',
          ['==', ['get', 'code'], '__none__'],
          [
            'any',
            ['all', ['==', ['get', 'kind'], 'fill'], ['!', ['has', 'split']]],
            ['==', ['get', 'kind'], 'country-outline'],
          ],
        ] as any,
        paint: {
          'line-color': '#9bacc5',
          'line-width': 1.25,
          'line-opacity': 0.75,
          'line-dasharray': [2, 2],
        },
      })
      // One stable label anchor per country. Using polygon features directly
      // makes MapLibre place a label on every island/component.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource('dots', { type: 'geojson', data: POINTS as any })
      // Country initials hint.
      map.addLayer({
        id: 'country-initials',
        type: 'symbol',
        source: 'dots',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'code'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
        },
        paint: { 'text-color': '#e8eef7', 'text-halo-color': '#070d18', 'text-halo-width': 1.2 },
      })
      map.addLayer({
        id: 'country-dot',
        type: 'circle',
        source: 'dots',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: ['in', ['get', 'code'], ['literal', []]] as any,
        paint: {
          'circle-radius': 6,
          'circle-color': COLORS.baseContinents,
          'circle-stroke-color': '#070d18',
          'circle-stroke-width': 1.5,
        },
      })

      readyRef.current = true
      apply()
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      readyRef.current = false
      lastFitRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.startCode,
    props.endCode,
    props.route.join(','),
    props.redundant.join(','),
    props.off.join(','),
    props.nextCode,
    props.hints.continents,
    props.hints.nextOutline,
    props.hints.allOutlines,
    props.hints.initials,
    props.revealAll,
  ])

  return <div className="travleMap" ref={ref} />
}
