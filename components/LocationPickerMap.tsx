"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { snapToRoad, roadSegment, searchPlace, PlaceSearchResult } from "@/lib/roads";
import {
  MapPin,
  Check,
  X,
  Search,
  Loader2,
  Navigation,
  Compass,
  CornerDownRight,
  Route,
} from "lucide-react";

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  lat?: number;
  lng?: number;
  endLat?: number | null;
  endLng?: number | null;
  geometryType?: "point" | "line";
  radiusMeters?: number;
  onConfirm?: (lat: number, lng: number) => void;
  onCancel?: () => void;
  onLocationChange?: (lat: number, lng: number) => void;
  onEndLocationChange?: (endLat: number | null, endLng: number | null) => void;
  onRoadSnapped?: (roadName: string) => void;
}

const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

export default function LocationPickerMap({
  initialLat,
  initialLng,
  lat,
  lng,
  endLat,
  endLng,
  geometryType = "point",
  radiusMeters = 25,
  onConfirm,
  onCancel,
  onLocationChange,
  onEndLocationChange,
  onRoadSnapped,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  const startLat = lat ?? initialLat ?? 19.2848;
  const startLng = lng ?? initialLng ?? 72.8665;
  const validLat = startLat > 15 && startLat < 25 ? startLat : 19.2848;
  const validLng = startLng > 70 && startLng < 75 ? startLng : 72.8665;

  const [currentLat, setCurrentLat] = useState<number>(validLat);
  const [currentLng, setCurrentLng] = useState<number>(validLng);
  const [currentEndLat, setCurrentEndLat] = useState<number | null>(endLat ?? null);
  const [currentEndLng, setCurrentEndLng] = useState<number | null>(endLng ?? null);

  const [snappedRoad, setSnappedRoad] = useState<string>("Locating road...");
  const [isSnapping, setIsSnapping] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlace(searchQuery);
        setSearchResults(results);
        setSearchOpen(true);
      } catch (e) {
        console.warn("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Road snapping handler
  const handleSnapLocation = useCallback(
    async (rawLng: number, rawLat: number, isEndPoint: boolean = false) => {
      setIsSnapping(true);
      try {
        const snapped = await snapToRoad(rawLng, rawLat);
        if (isEndPoint) {
          setCurrentEndLat(snapped.lat);
          setCurrentEndLng(snapped.lng);
          onEndLocationChange?.(snapped.lat, snapped.lng);
          if (endMarkerRef.current) {
            endMarkerRef.current.setLngLat([snapped.lng, snapped.lat]);
          }
        } else {
          setCurrentLat(snapped.lat);
          setCurrentLng(snapped.lng);
          onLocationChange?.(snapped.lat, snapped.lng);
          if (startMarkerRef.current) {
            startMarkerRef.current.setLngLat([snapped.lng, snapped.lat]);
          }
        }

        if (snapped.roadName && snapped.roadName !== "Unnamed road") {
          setSnappedRoad(snapped.roadName);
          onRoadSnapped?.(snapped.roadName);
        }
      } catch (err) {
        console.warn("Snap failed:", err);
      } finally {
        setIsSnapping(false);
      }
    },
    [onLocationChange, onEndLocationChange, onRoadSnapped]
  );

  // 1. Initialize MapLibre with OpenFreeMap vector style
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any = null;

    const initMap = async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;

        map = new maplibregl.Map({
          container: mapContainerRef.current!,
          style: MAP_STYLE_URL,
          center: [validLng, validLat],
          zoom: 15.2,
          pitch: 0,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

        // Custom start marker element (Blue pin)
        const startEl = document.createElement("div");
        startEl.className = "cursor-grab active:cursor-grabbing";
        startEl.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #2563EB; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #2563EB; margin-top: -1px;"></div>
          </div>
        `;

        const startMarker = new maplibregl.Marker({ element: startEl, draggable: true })
          .setLngLat([validLng, validLat])
          .addTo(map);

        startMarker.on("dragend", async () => {
          const lngLat = startMarker.getLngLat();
          await handleSnapLocation(lngLat.lng, lngLat.lat, false);
        });

        startMarkerRef.current = startMarker;

        // Click handler on map
        map.on("click", async (e: any) => {
          const { lng, lat } = e.lngLat;
          if (geometryType === "line" && currentLat && !currentEndLat) {
            // Place end marker for line segment
            await handleSnapLocation(lng, lat, true);
          } else {
            // Place/snap start marker
            await handleSnapLocation(lng, lat, false);
          }
        });

        map.on("load", () => {
          mapInstanceRef.current = map;
          map.resize();
          // Initial snap on load to identify current road
          handleSnapLocation(validLng, validLat, false);
        });

        // ResizeObserver
        const ro = new ResizeObserver(() => {
          if (map) map.resize();
        });
        if (mapContainerRef.current) ro.observe(mapContainerRef.current);
      } catch (err) {
        console.error("LocationPickerMap init error:", err);
      }
    };

    initMap();

    return () => {
      if (map) map.remove();
    };
  }, []); // Run once on mount

  // 2. Manage End Marker for Line Geometry
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (geometryType === "line") {
        if (!endMarkerRef.current) {
          const endEl = document.createElement("div");
          endEl.className = "cursor-grab active:cursor-grabbing";
          endEl.innerHTML = `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #0891B2; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
                <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 20l-5.447-2.724A2 2 0 013 15.485V5.515a2 2 0 011.053-1.768l6-3a2 2 0 011.894 0l6 3A2 2 0 0119 5.515v9.97a2 2 0 01-1.053 1.768L12 20"></path></svg>
              </div>
              <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #0891B2; margin-top: -1px;"></div>
            </div>
          `;

          // Default end point slightly offset from start point
          const targetEndLng = currentEndLng ?? currentLng + 0.002;
          const targetEndLat = currentEndLat ?? currentLat + 0.001;

          const endMarker = new maplibregl.Marker({ element: endEl, draggable: true })
            .setLngLat([targetEndLng, targetEndLat])
            .addTo(map);

          endMarker.on("dragend", async () => {
            const lngLat = endMarker.getLngLat();
            await handleSnapLocation(lngLat.lng, lngLat.lat, true);
          });

          endMarkerRef.current = endMarker;
          setCurrentEndLat(targetEndLat);
          setCurrentEndLng(targetEndLng);
          onEndLocationChange?.(targetEndLat, targetEndLng);
        }
      } else {
        // Point geometry - remove end marker if exists
        if (endMarkerRef.current) {
          endMarkerRef.current.remove();
          endMarkerRef.current = null;
          setCurrentEndLat(null);
          setCurrentEndLng(null);
          onEndLocationChange?.(null, null);
        }
      }
    });
  }, [geometryType]);

  // 3. Draw Real Road Route Curvature for Line Geometry
  useEffect(() => {
    if (!mapInstanceRef.current || geometryType !== "line" || !currentEndLat || !currentEndLng) return;
    const map = mapInstanceRef.current;

    let active = true;
    async function updateRoadLine() {
      const lineGeom = await roadSegment(
        [currentLng, currentLat],
        [currentEndLng!, currentEndLat!]
      );
      if (!active || !lineGeom) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: lineGeom,
            properties: {},
          },
        ],
      };

      if (map.getSource("active-road-segment")) {
        (map.getSource("active-road-segment") as any).setData(geojson);
      } else {
        map.addSource("active-road-segment", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "active-road-segment-line",
          type: "line",
          source: "active-road-segment",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#2563EB",
            "line-width": 5,
            "line-opacity": 0.85,
          },
        });
      }
    }

    updateRoadLine();
    return () => {
      active = false;
    };
  }, [geometryType, currentLat, currentLng, currentEndLat, currentEndLng]);

  // Search selection fly-to
  const handleSelectPlace = (place: PlaceSearchResult) => {
    const pLat = parseFloat(place.lat);
    const pLng = parseFloat(place.lon);
    if (!isNaN(pLat) && !isNaN(pLng) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [pLng, pLat],
        zoom: 16,
        essential: true,
      });
      handleSnapLocation(pLng, pLat, false);
      setSearchOpen(false);
      setSearchQuery(place.display_name.split(",")[0]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-h-[290px] border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner relative">
      {/* Header with Search and Snapped Road Indicator */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
        {/* Place Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Mumbai/MMR road (e.g. Linking Road, Mira Bhayandar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50 focus:bg-white transition"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {searchResults.map((p) => (
                <div
                  key={p.place_id}
                  onClick={() => handleSelectPlace(p)}
                  className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-slate-800 transition flex items-start gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="truncate">{p.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snapped Road Badge */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold text-[11px]">
            {isSnapping ? (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
            ) : (
              <Route className="w-3 h-3 text-emerald-600" />
            )}
            <span className="truncate max-w-[180px]">{snappedRoad}</span>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[220px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Bottom floating helper tip */}
        <div className="absolute bottom-2 left-2 z-10 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-medium shadow-sm flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-blue-400 shrink-0" />
          {geometryType === "line"
            ? "Drag Blue pin (Start) and Cyan pin (End) to follow road geometry"
            : "Click or drag pin — snaps automatically to nearest road"}
        </div>
      </div>

      {/* Footer Actions */}
      {(onCancel || onConfirm) && (
        <div className="bg-white border-t border-slate-200 p-2.5 flex items-center justify-between gap-2 z-10">
          <span className="text-[11px] text-slate-500 font-medium">
            Verified coordinate: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          </span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            {onConfirm && (
              <button
                type="button"
                onClick={() => onConfirm(currentLat, currentLng)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Location
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
