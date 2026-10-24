"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Project, Conflict } from "@/lib/types";
import { searchPlace, PlaceSearchResult } from "@/lib/roads";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  MapPin,
  Calendar,
  Filter,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Search,
  Loader2,
  X,
  Compass,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MapComponentProps {
  projects: Project[];
  conflicts: Conflict[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project) => void;
  selectedConflict?: Conflict | null;
}

const DEPT_COLORS: Record<string, string> = {
  "Roads Department": "#2563EB",
  "Water Department": "#06B6D4",
  "Electricity Department": "#F59E0B",
  "Sewerage Department": "#10B981",
  "Telecom Department": "#8B5CF6",
  "Gas Department": "#EC4899",
  "Other": "#64748B",
};

const MUMBAI_HOTSPOTS = [
  { name: "Mira Bhayandar Road", lng: 72.8672, lat: 19.2852, zoom: 15.2 },
  { name: "Linking Road, Bandra", lng: 72.8340, lat: 19.0600, zoom: 15.5 },
  { name: "BKC Commercial Hub", lng: 72.8680, lat: 19.0675, zoom: 15.0 },
  { name: "Andheri West (SV Rd)", lng: 72.8420, lat: 19.1200, zoom: 15.2 },
  { name: "Western Express Hwy", lng: 72.8580, lat: 19.2150, zoom: 14.8 },
  { name: "Worli Sea Face", lng: 72.8150, lat: 19.0050, zoom: 15.0 },
];

const STYLE_OPTIONS = [
  { id: "liberty", label: "OpenFreeMap Liberty (Vector)", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "bright", label: "OpenFreeMap Bright", url: "https://tiles.openfreemap.org/styles/bright" },
  { id: "positron", label: "OpenFreeMap Positron (Civic)", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "dark", label: "Dark Matter (Carto GL)", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
];

export default function MapComponent({
  projects,
  conflicts,
  selectedProjectId,
  onSelectProject,
  selectedConflict,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const hoverPopupRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("liberty");

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Time Horizon Playback slider state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDayOffset, setCurrentDayOffset] = useState<number>(15); // Days into Nov 2026

  // Conflict set for fast lookup
  const conflictingProjectIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.resolution !== "Overridden" && c.status !== "Closed") {
      conflictingProjectIds.add(c.project_a_id);
      conflictingProjectIds.add(c.project_b_id);
    }
  });

  // Calculate simulated timeline date (Base: 1 Nov 2026)
  const baseSimDate = new Date(2026, 10, 1);
  const activeSimDate = new Date(baseSimDate.getTime() + currentDayOffset * 24 * 60 * 60 * 1000);
  const activeDateStr = activeSimDate.toISOString().split("T")[0];

  // Play/pause time scrubber animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentDayOffset((prev) => {
        if (prev >= 45) return 0;
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Debounced search for Mumbai/India places
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
        console.warn("Place search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    if (conflictOnly && !conflictingProjectIds.has(p.id)) return false;
    if (filterDepartment !== "ALL" && p.department !== filterDepartment) return false;
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    return true;
  });

  // 1. Initialize MapLibre with OpenFreeMap vector style
  const currentStyleUrl =
    STYLE_OPTIONS.find((s) => s.id === selectedStyleId)?.url ||
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    "https://tiles.openfreemap.org/styles/liberty";

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any = null;

    const initMap = async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;

        map = new maplibregl.Map({
          container: mapContainerRef.current!,
          style: currentStyleUrl,
          center: [72.8620, 19.2810], // Centered on Mumbai MMR / Mira Road
          zoom: 14.2,
          pitch: 15,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

        map.on("load", () => {
          mapInstanceRef.current = map;
          setMapLoaded(true);

          // Force multiple resizes to guarantee canvas fills viewport
          map.resize();
          setTimeout(() => map.resize(), 100);
          setTimeout(() => map.resize(), 300);
          setTimeout(() => map.resize(), 600);
        });

        const resizeObserver = new ResizeObserver(() => {
          if (map) map.resize();
        });
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }

        map.on("error", (e: any) => {
          console.warn("MapLibre event:", e);
        });
      } catch (err) {
        console.error("MapLibre initialization error:", err);
      }
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [selectedStyleId]);

  // 2. Vector GeoJSON Data Source & Layers for Projects + Red Conflict Rings
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    import("maplibre-gl").then(({ default: maplibregl }) => {
      // Build FeatureCollection with points and line segments
      const features: GeoJSON.Feature[] = [];

      filteredProjects.forEach((proj) => {
        const startLat = proj.lat ?? proj.latitude;
        const startLng = proj.lng ?? proj.longitude;
        const endLat = proj.end_lat ?? proj.end_latitude;
        const endLng = proj.end_lng ?? proj.end_longitude;
        const hasConflict = conflictingProjectIds.has(proj.id) || proj.has_conflicts;
        const deptColor = DEPT_COLORS[proj.department] || "#2563EB";

        if (!startLat || !startLng || isNaN(startLat) || isNaN(startLng)) return;

        // Line feature if both start and end exist
        if (endLat && endLng && !isNaN(endLat) && !isNaN(endLng)) {
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [startLng, startLat],
                [endLng, endLat],
              ],
            },
            properties: {
              id: proj.id,
              name: proj.name,
              department: proj.department,
              project_type: proj.project_type,
              status: proj.status,
              road_name: proj.road_name,
              start_date: proj.start_date,
              end_date: proj.end_date,
              color: deptColor,
              has_conflict: hasConflict,
            },
          });
        }

        // Point feature
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [startLng, startLat],
          },
          properties: {
            id: proj.id,
            name: proj.name,
            department: proj.department,
            project_type: proj.project_type,
            status: proj.status,
            road_name: proj.road_name,
            start_date: proj.start_date,
            end_date: proj.end_date,
            color: deptColor,
            has_conflict: hasConflict,
          },
        });
      });

      const featureCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      if (map.getSource("projects")) {
        (map.getSource("projects") as any).setData(featureCollection);
      } else {
        // Add single GeoJSON source for all municipal projects
        map.addSource("projects", {
          type: "geojson",
          data: featureCollection,
        });

        // 1. Line conflict halo casing (red glow)
        map.addLayer({
          id: "proj-conflict-line",
          type: "line",
          source: "projects",
          filter: ["all", ["==", "$type", "LineString"], ["==", ["get", "has_conflict"], true]],
          paint: {
            "line-width": 12,
            "line-color": "#dc2626",
            "line-opacity": 0.45,
          },
        });

        // 2. Line projects: real vector street line
        map.addLayer({
          id: "proj-line",
          type: "line",
          source: "projects",
          filter: ["==", "$type", "LineString"],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-width": 6,
            "line-color": ["get", "color"],
            "line-opacity": 0.85,
          },
        });

        // 3. Red Conflict Ring around point projects (Step 4 requirement)
        map.addLayer({
          id: "proj-conflict",
          type: "circle",
          source: "projects",
          filter: ["all", ["==", "$type", "Point"], ["==", ["get", "has_conflict"], true]],
          paint: {
            "circle-radius": 18,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#dc2626",
          },
        });

        // 4. Point projects: department color circle with crisp white border
        map.addLayer({
          id: "proj-pt",
          type: "circle",
          source: "projects",
          filter: ["==", "$type", "Point"],
          paint: {
            "circle-radius": 9,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Interactive cursor
        map.on("mouseenter", "proj-pt", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "proj-pt", () => (map.getCanvas().style.cursor = ""));
        map.on("mouseenter", "proj-line", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "proj-line", () => (map.getCanvas().style.cursor = ""));

        // Click on project feature -> trigger selection
        const handleFeatureClick = (e: any) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const projId = feat.properties?.id;
          const matched = projects.find((p) => p.id === projId);
          if (matched && onSelectProject) {
            onSelectProject(matched);
          }
        };

        map.on("click", "proj-pt", handleFeatureClick);
        map.on("click", "proj-line", handleFeatureClick);
      }
    });
  }, [filteredProjects, mapLoaded, conflictingProjectIds]);

  // Fit bounds to all filtered projects
  const handleFitBounds = () => {
    if (!mapInstanceRef.current || filteredProjects.length === 0) return;
    import("maplibre-gl").then(({ default: maplibregl }) => {
      const bounds = new maplibregl.LngLatBounds();
      filteredProjects.forEach((p) => {
        const lat = p.lat ?? p.latitude;
        const lng = p.lng ?? p.longitude;
        if (lat && lng) bounds.extend([lng, lat]);
      });
      mapInstanceRef.current.fitBounds(bounds, { padding: 80, maxZoom: 16 });
    });
  };

  const flyToHotspot = (hotspot: { lng: number; lat: number; zoom: number }) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [hotspot.lng, hotspot.lat],
      zoom: hotspot.zoom,
      essential: true,
      pitch: 20,
    });
  };

  const handleSelectSearchResult = (place: PlaceSearchResult) => {
    const pLat = parseFloat(place.lat);
    const pLng = parseFloat(place.lon);
    if (!isNaN(pLat) && !isNaN(pLng) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [pLng, pLat],
        zoom: 16,
        essential: true,
        pitch: 20,
      });
      setSearchOpen(false);
      setSearchQuery(place.display_name.split(",")[0]);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[550px] rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100 flex flex-col shadow-sm">
      {/* Top Map Toolbar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-20">
        {/* Title & Place Search Box */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block leading-tight flex items-center gap-1.5">
                OpenFreeMap Vector Map
                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                  Real Roads & Buildings
                </span>
              </span>
              <span className="text-[10px] text-slate-500">
                {filteredProjects.length} of {projects.length} works visible &bull; Zero API Key
              </span>
            </div>
          </div>

          {/* Place Search Input */}
          <div className="relative flex-1 max-w-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Mumbai corridor (e.g. Linking Rd, Bandra)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50 focus:bg-white transition"
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

            {/* Place Autocomplete Results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((p) => (
                  <div
                    key={p.place_id}
                    onClick={() => handleSelectSearchResult(p)}
                    className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-slate-800 transition flex items-start gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="truncate">{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters & Style Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs text-xs"
          >
            <option value="ALL">All Departments</option>
            <option value="Roads Department">Roads Dept (Blue)</option>
            <option value="Water Department">Water Dept (Cyan)</option>
            <option value="Electricity Department">Electricity Dept (Amber)</option>
            <option value="Telecom Department">Telecom Dept (Purple)</option>
            <option value="Gas Department">Gas Dept (Pink)</option>
            <option value="Sewerage Department">Sewerage Dept (Emerald)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Conflict Filter */}
          <button
            type="button"
            onClick={() => setConflictOnly(!conflictOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition text-xs ${
              conflictOnly
                ? "bg-red-50 text-red-700 border-red-300 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Conflicts Only ({conflictingProjectIds.size})
          </button>

          {/* Vector Style Selector */}
          <select
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs shadow-xs"
          >
            {STYLE_OPTIONS.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>

          {/* Fit Bounds */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold transition text-xs shadow-xs"
            title="Fit view to all projects"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            Fit View
          </button>
        </div>
      </div>

      {/* Quick Corridor Navigation Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 flex items-center gap-2 overflow-x-auto text-[11px] z-10">
        <span className="font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-blue-600" /> Mumbai Corridors:
        </span>
        {MUMBAI_HOTSPOTS.map((spot) => (
          <button
            key={spot.name}
            type="button"
            onClick={() => flyToHotspot(spot)}
            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 font-medium shrink-0 transition"
          >
            {spot.name}
          </button>
        ))}
      </div>

      {/* Map View Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[420px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-[11px] uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Map Visual Encoding
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-red-600 bg-transparent flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              </span>
              <span className="text-red-700 font-bold">Red Ring: Conflict Collision</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-white shrink-0" />
              <span className="text-slate-700">Roads Dept (Surface)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-600 border border-white shrink-0" />
              <span className="text-slate-700">Water Dept (Pipeline)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-600 border border-white shrink-0" />
              <span className="text-slate-700">Electricity (Cabling)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-white shrink-0" />
              <span className="text-slate-700">Telecom Dept</span>
            </div>
          </div>
        </div>

        {/* Docked Time Scrubber Bar at Bottom */}
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-lg max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-xl text-white font-bold transition flex items-center gap-1.5 text-xs shadow-xs ${
                  isPlaying ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause" : "Play Timeline"}
              </button>
              <button
                type="button"
                onClick={() => setCurrentDayOffset(0)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                title="Reset Timeline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Active Simulated Date:
              </span>
              <span className="font-mono font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs">
                {formatDate(activeDateStr)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono font-semibold">1 Nov</span>
            <input
              type="range"
              min="0"
              max="45"
              value={currentDayOffset}
              onChange={(e) => setCurrentDayOffset(Number(e.target.value))}
              className="flex-1 accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono font-semibold">15 Dec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
