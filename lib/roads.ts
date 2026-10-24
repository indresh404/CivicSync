// lib/roads.ts
// Free OpenStreetMap road snapping, routing, and geocoding without API keys

const OSRM_BASE = "https://router.project-osrm.org";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export interface SnappedRoadResult {
  lng: number;
  lat: number;
  roadName: string;
  distanceToRoadMeters?: number;
}

export interface PlaceSearchResult {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
}

/**
 * Snap a coordinate click to the nearest real road via OSRM and extract its verified street name.
 * Safe fallback included if OSRM is unreachable.
 */
export async function snapToRoad(lng: number, lat: number): Promise<SnappedRoadResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${OSRM_BASE}/nearest/v1/driving/${lng},${lat}?number=1`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OSRM nearest responded ${res.status}`);
    const data = await res.json();
    const waypoint = data.waypoints?.[0];

    if (waypoint && Array.isArray(waypoint.location)) {
      const roadName = waypoint.name && waypoint.name.trim().length > 0 ? waypoint.name : "Unnamed road";
      return {
        lng: Number(waypoint.location[0].toFixed(6)),
        lat: Number(waypoint.location[1].toFixed(6)),
        roadName,
        distanceToRoadMeters: typeof waypoint.distance === "number" ? Math.round(waypoint.distance) : undefined,
      };
    }
  } catch (err) {
    console.warn("OSRM road snapping fallback to raw click coordinates:", err);
  }

  // Graceful fallback to clicked point
  return {
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
    roadName: "Selected Corridor",
  };
}

/**
 * Get the real road geometry between two clicks following actual street centerlines.
 */
export async function roadSegment(
  a: [number, number],
  b: [number, number]
): Promise<GeoJSON.LineString | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `${OSRM_BASE}/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OSRM route responded ${res.status}`);
    const data = await res.json();
    if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
      return data.routes[0].geometry as GeoJSON.LineString;
    }
  } catch (err) {
    console.warn("OSRM roadSegment routing fallback to straight line:", err);
  }

  // Fallback straight line between point A and B
  return {
    type: "LineString",
    coordinates: [
      [a[0], a[1]],
      [b[0], b[1]],
    ],
  };
}

/**
 * Debounced Nominatim Indian place search (e.g. "Linking Road, Bandra", "Mira Bhayandar")
 * Free OpenStreetMap service with countrycodes=in filter
 */
export async function searchPlace(query: string): Promise<PlaceSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `${NOMINATIM_BASE}/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(query.trim())}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "CivicSync-Municipal-Coordinator/1.0",
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Nominatim search responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Nominatim place search failed or timed out:", err);
    return [];
  }
}
