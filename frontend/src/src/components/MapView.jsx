import { useEffect, useRef } from 'react'

// Leaflet is loaded via CDN in index.html
// We import lazily to avoid SSR issues
let L = null

// Chennai bounds as default centre
const DEFAULT_CENTER = [13.0827, 80.2707]
const DEFAULT_ZOOM = 12

/**
 * Mock coordinates — these will be replaced by real PostGIS data from Supabase.
 * The Supabase `GEOGRAPHY(POINT)` column returns GeoJSON via the API.
 */
function getBinCoords(bin, index) {
  // If PostGIS returns GeoJSON coordinates
  if (bin.location?.coordinates) {
    const [lng, lat] = bin.location.coordinates
    return [lat, lng]
  }
  // Fallback: distribute mock pins around Chennai
  const offsets = [
    [0.02, 0.01], [-0.01, 0.03], [0.04, -0.02],
    [-0.03, -0.01], [0.01, 0.05], [-0.05, 0.02],
  ]
  const [dlat, dlng] = offsets[index % offsets.length]
  return [DEFAULT_CENTER[0] + dlat, DEFAULT_CENTER[1] + dlng]
}

function getFillColor(pct) {
  if (pct >= 90) return '#ef4444'
  if (pct >= 60) return '#f59e0b'
  return '#39d353'
}

export default function MapView({ bins = [] }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamically import Leaflet (loaded via CDN in index.html)
    L = window.L
    if (!L || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    })

    // Dark-compatible tile layer (CartoDB Dark Matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map)

    mapInstanceRef.current = map
  }, [])

  // Update markers whenever bins data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    L = window.L

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    bins.forEach((bin, i) => {
      const coords = getBinCoords(bin, i)
      const fill = bin.fill_level_percentage ?? 0
      const color = getFillColor(fill)
      const shortId = bin.bin_id?.slice(0, 8) ?? 'N/A'

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:36px; height:36px;
            background:${color};
            border:3px solid rgba(0,0,0,0.5);
            border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-weight:700; font-size:11px; color:#000;
            box-shadow:0 0 ${fill >= 90 ? '12px' : '6px'} ${color}80;
          ">${fill}%</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker(coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif; padding:4px 0;">
            <b>Bin #${shortId}</b><br/>
            Fill: <b style="color:${color}">${fill}%</b><br/>
            Weight: <b>${bin.current_weight_kg ?? 0} kg</b><br/>
            Status: <b>${bin.needs_collection ? '🚨 Needs Collection' : '✅ OK'}</b>
          </div>
        `)

      markersRef.current.push(marker)
    })
  }, [bins])

  return <div className="map-container" ref={mapRef} />
}
