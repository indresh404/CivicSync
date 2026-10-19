"use client";

import React, { useEffect, useRef, useState } from "react";
import { Project, Conflict } from "@/lib/types";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  MapPin,
  Calendar,
  Filter,
} from "lucide-react";
import { getStatusBadgeClass } from "@/lib/utils";

interface MapComponentProps {
  projects: Project[];
  conflicts: Conflict[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project) => void;
  selectedConflict?: Conflict | null;
}

export default function MapComponent({
  projects,
  conflicts,
  selectedProjectId,
  onSelectProject,
  selectedConflict,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Conflict set for fast lookup
  const conflictingProjectIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.status !== "Closed") {
      conflictingProjectIds.add(c.project_a_id);
      conflictingProjectIds.add(c.project_b_id);
    }
  });

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    if (conflictOnly && !conflictingProjectIds.has(p.id)) return false;
    if (filterDepartment !== "ALL" && p.department !== filterDepartment) return false;
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    return true;
  });

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any = null;

    const initMap = async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;

        map = new maplibregl.Map({
          container: mapContainerRef.current!,
          style: {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: [
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "&copy; OpenStreetMap Contributors",
              },
            },
            layers: [
              {
                id: "osm-tiles-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [77.605, 12.975], // Metro City Center
          zoom: 13.2,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          mapInstanceRef.current = map;
          setMapLoaded(true);
        });

        map.on("error", (e: any) => {
          console.warn("MapLibre tile issue:", e);
        });
      } catch (err) {
        console.error("MapLibre init error:", err);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filteredProjects or selectedProjectId changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    // Remove existing markers
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    import("maplibre-gl").then(({ default: maplibregl }) => {
      filteredProjects.forEach((proj) => {
        const isConflicting = conflictingProjectIds.has(proj.id);
        const isSelected = selectedProjectId === proj.id;
        const isInSelectedConflict =
          selectedConflict &&
          (selectedConflict.project_a_id === proj.id ||
            selectedConflict.project_b_id === proj.id);

        // Custom HTML Marker
        const el = document.createElement("div");
        el.className = "cursor-pointer transition-transform duration-150 hover:scale-125";
        el.style.zIndex = isSelected || isInSelectedConflict ? "50" : isConflicting ? "30" : "10";

        // Determine pin colors
        let pinColor = "#2563EB"; // Planned
        if (proj.status === "Approved") pinColor = "#4338CA";
        if (proj.status === "Ongoing") pinColor = "#0891B2";
        if (proj.status === "Completed") pinColor = "#64748B";

        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${
              isConflicting
                ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(220, 38, 38, 0.25); border: 1.5px solid #DC2626;" class="animate-pulse-subtle"></div>`
                : ""
            }
            <div style="
              width: ${isSelected || isInSelectedConflict ? "30px" : "24px"};
              height: ${isSelected || isInSelectedConflict ? "30px" : "24px"};
              background-color: ${pinColor};
              border: 2px solid ${isConflicting ? "#DC2626" : "#FFFFFF"};
              border-radius: 8px;
              box-shadow: 0 4px 10px rgba(15, 23, 42, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 11px;
              font-weight: 700;
            ">
              ${isConflicting ? "!" : "•"}
            </div>
          </div>
        `;

        // Popup with rich information
        const popup = new maplibregl.Popup({ offset: 18, closeButton: true }).setHTML(`
          <div style="min-width: 210px; font-family: inherit;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; color: #2563EB; font-family: monospace;">${proj.id}</span>
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #EFF6FF; color: #1D4ED8;">${proj.status}</span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.25; margin-bottom: 6px;">
              ${proj.name}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
              <strong>Dept:</strong> ${proj.department}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
              <strong>Road:</strong> ${proj.road_name} (${proj.road_type})
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <strong>Dates:</strong> ${proj.start_date} to ${proj.end_date}
            </div>
            ${
              isConflicting
                ? `<div style="background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                    ⚠️ Active spatial/date conflict detected
                  </div>`
                : ""
            }
          </div>
        `);

        el.addEventListener("click", () => {
          if (onSelectProject) onSelectProject(proj);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([proj.longitude, proj.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current[proj.id] = marker;
      });
    });
  }, [filteredProjects, selectedProjectId, selectedConflict, mapLoaded]);

  // Center on selected project
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedProjectId) return;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (proj) {
      mapInstanceRef.current.flyTo({
        center: [proj.longitude, proj.latitude],
        zoom: 15,
        essential: true,
      });
      // Open popup if available
      if (markersRef.current[proj.id]) {
        markersRef.current[proj.id].togglePopup();
      }
    }
  }, [selectedProjectId]);

  // Fit bounds helper
  const handleFitBounds = () => {
    if (!mapInstanceRef.current || filteredProjects.length === 0) return;
    import("maplibre-gl").then(({ default: maplibregl }) => {
      const bounds = new maplibregl.LngLatBounds();
      filteredProjects.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      mapInstanceRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    });
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex flex-col">
      {/* Map Control Header / Filter Toolbar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-xs text-slate-800">
            Interactive City GIS Layer
          </span>
          <span className="text-[11px] text-slate-500">
            ({filteredProjects.length} of {projects.length} projects displayed)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            <option value="Roads Department">Roads Dept</option>
            <option value="Water Department">Water Dept</option>
            <option value="Electricity Department">Electricity Dept</option>
            <option value="Telecom Department">Telecom Dept</option>
            <option value="Gas Department">Gas Dept</option>
            <option value="Sewerage Department">Sewerage Dept</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Conflict-Only Toggle */}
          <button
            type="button"
            onClick={() => setConflictOnly(!conflictOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition ${
              conflictOnly
                ? "bg-red-50 text-red-700 border-red-300 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Conflicts Only ({conflicts.length})
          </button>

          {/* Fit to View */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium transition"
            title="Fit view to projects"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            Fit View
          </button>
        </div>
      </div>

      {/* Map Canvas / Fallback */}
      <div className="relative flex-1 w-full h-full min-h-[460px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Fallback Display if MapLibre fails */}
        {mapError && (
          <div className="absolute inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
            <h4 className="font-bold text-sm">OpenStreetMap Basemap Preview Mode</h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
              Using schematic GIS renderer due to client WebGL configuration. All project coordinates, proximity calculations, and conflict detections remain 100% active.
            </p>
            <div className="grid grid-cols-2 gap-2 text-left text-xs bg-slate-800 p-3 rounded-lg border border-slate-700">
              {filteredProjects.map((p) => (
                <div key={p.id} className="p-2 border border-slate-700 rounded bg-slate-900/60">
                  <div className="font-semibold text-blue-400">{p.id} — {p.road_name}</div>
                  <div className="text-slate-300 text-[11px]">{p.department} ({p.latitude}, {p.longitude})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs max-w-xs">
          <div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span>Map Legend</span>
            <span className="text-[10px] text-slate-500 font-normal">Metro Central</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-600" /> Planned
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-700" /> Approved
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-cyan-600" /> Ongoing
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-500" /> Completed
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center gap-1.5 font-semibold text-red-600">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-white" /> Conflicting Project (≤50m)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
