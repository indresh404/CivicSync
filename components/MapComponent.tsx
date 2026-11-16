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
  ArrowRight,
  Eye,
  Box,
  Layers3,
  Orbit,
  Flame,
  Zap,
  Droplets,
  Construction,
  Building2,
  CheckCircle2,
  ShieldCheck,
  RotateCw,
  Network,
  Share2,
  GitBranch,
  Activity,
  Car,
  Gauge,
  Clock,
  Route,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { formatDate } from "@/lib/utils";
import { buildConstructionMesh, MeshGraph, MeshNode, MeshLink } from "@/lib/meshNetwork";
import {
  simulateTrafficConditions,
  TrafficSegment,
  PeakPeriodPreset,
  PEAK_PERIOD_PRESETS,
  CityTrafficSnapshot,
} from "@/lib/trafficData";

// Generates smooth curved 3D Bézier arc coordinates between 2 spatial points on the map
function generateCurveCoordinates(
  p0: [number, number],
  p1: [number, number],
  arcOffset = 0.0016
): [number, number][] {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return [p0, p1];

  const nx = -dy / len;
  const ny = dx / len;

  const cx = (p0[0] + p1[0]) / 2 + nx * arcOffset;
  const cy = (p0[1] + p1[1]) / 2 + ny * arcOffset;

  const points: [number, number][] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * cx + t * t * p1[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * cy + t * t * p1[1];
    points.push([x, y]);
  }
  return points;
}

interface MapComponentProps {
  projects: Project[];
  conflicts: Conflict[];
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project) => void;
  selectedConflict?: Conflict | null;
  onOpenAICopilot?: () => void;
  onOpenGenCityStudio?: () => void;
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

const MIRA_ROAD_HOTSPOTS = [
  { name: "🚆 Mira Road Station Hub", lng: 72.8550, lat: 19.2810, zoom: 16.5, pitch: 58, bearing: -20 },
  { name: "🛣️ Mira Bhayandar Arterial", lng: 72.8665, lat: 19.2850, zoom: 16.0, pitch: 56, bearing: 30 },
  { name: "🏢 Kanakia Commercial Hub", lng: 72.8590, lat: 19.2825, zoom: 16.2, pitch: 55, bearing: -15 },
  { name: "🏘️ Shanti Nagar Sector", lng: 72.8540, lat: 19.2785, zoom: 16.0, pitch: 52, bearing: 10 },
  { name: "🌲 Beverly Park High-Rises", lng: 72.8615, lat: 19.2865, zoom: 16.2, pitch: 58, bearing: -40 },
  { name: "🏭 Silver Park - Hatkesh", lng: 72.8710, lat: 19.2885, zoom: 15.8, pitch: 50, bearing: 45 },
];

export const MIRA_ROAD_3D_ASSETS = [
  {
    id: "asset-001",
    name: "Mira Commercial Skyscraper",
    category: "Building",
    stats: "16 KB • 480 polys",
    modelUrl: "/models/mira_commercial_tower.glb",
    lng: 72.8590,
    lat: 19.2825,
    road_name: "Kanakia Road",
    tag: "3D TOWER",
    badgeColor: "#0284c7",
    icon: "🏢",
    depth: "Superstructure (+45m)",
    scale: 1.0,
    bearing: 0,
    start_date: "2026-11-01",
    end_date: "2026-12-15"
  },
  {
    id: "asset-002",
    name: "600mm Subsurface Water Pipeline & Trench",
    category: "Subsurface Utility",
    stats: "30 KB • 820 polys",
    modelUrl: "/models/water_pipeline_trench.glb",
    lng: 72.8561,
    lat: 19.2812,
    road_name: "Mira Bhayandar Road",
    tag: "3D PIPE TRENCH",
    badgeColor: "#06b6d4",
    icon: "💧",
    depth: "Subsurface (-2.4m)",
    scale: 1.2,
    bearing: Math.PI / 6,
    start_date: "2026-11-06",
    end_date: "2026-11-24"
  },
  {
    id: "asset-003",
    name: "Active Road Excavation & Milling Zone",
    category: "Construction Scene",
    stats: "30 KB • 760 polys",
    modelUrl: "/models/road_excavation_site.glb",
    lng: 72.8630,
    lat: 19.2845,
    road_name: "Mira Bhayandar Road East",
    tag: "3D MILLING SITE",
    badgeColor: "#2563eb",
    icon: "🚧",
    depth: "Surface (0.0m)",
    scale: 1.2,
    bearing: Math.PI / 4,
    start_date: "2026-11-10",
    end_date: "2026-11-30"
  },
  {
    id: "asset-004",
    name: "Municipal Hydraulic Tracked Excavator",
    category: "Heavy Machinery",
    stats: "14 KB • 640 polys",
    modelUrl: "/models/heavy_excavator.glb",
    lng: 72.8540,
    lat: 19.2785,
    road_name: "Shanti Nagar Sector 2",
    tag: "3D EXCAVATOR",
    badgeColor: "#eab308",
    icon: "🚜",
    depth: "Heavy Machinery",
    scale: 1.5,
    bearing: -Math.PI / 3,
    start_date: "2026-11-01",
    end_date: "2026-11-20"
  }
];

const STYLE_OPTIONS = [
  { id: "dark", label: "Dark Matter 3D (Command Center)", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id: "liberty", label: "OpenFreeMap Liberty (3D Buildings)", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "positron", label: "Positron 3D (Civic Blueprint)", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "bright", label: "OpenFreeMap Bright 3D", url: "https://tiles.openfreemap.org/styles/bright" },
];

function getProject3DModelInfo(project: Project) {
  const dept = (project.department || "").toLowerCase();
  const title = (project.title || project.name || "").toLowerCase();
  const type = (project.project_type || "").toLowerCase();

  if (dept.includes("water") || type.includes("water") || type.includes("pipeline") || title.includes("pipe")) {
    return {
      modelUrl: "/models/water_pipeline_trench.glb",
      category: "Subsurface Water Main & Trench",
      depth: "▼ -2.4m Below Road Surface",
      specs: "600mm Ductile Iron (Class K9) with timber shoring & sand envelope",
      color: "#06b6d4",
      tag: "WATER SUB-SURFACE",
      cooldown: "24-Month Re-Digging Moratorium Active"
    };
  } else if (dept.includes("electricity") || type.includes("cable") || title.includes("cable") || title.includes("11kv")) {
    return {
      modelUrl: "/models/water_pipeline_trench.glb",
      category: "11kV Subsurface Power Conduit",
      depth: "▼ -1.2m Below Road Surface",
      specs: "11kV XLPE High-Tension Underground Cable in 150mm reinforced HDPE ducts",
      color: "#f59e0b",
      tag: "ELECTRIC SUB-SURFACE",
      cooldown: "24-Month Re-Digging Moratorium Active"
    };
  } else if (dept.includes("telecom") || type.includes("fiber") || title.includes("5g")) {
    return {
      modelUrl: "/models/water_pipeline_trench.glb",
      category: "5G Optical Fiber Subsurface Duct",
      depth: "▼ -0.9m Below Road Surface",
      specs: "96-Core High-Speed Optical Fiber with 0.5m dielectric separation",
      color: "#8b5cf6",
      tag: "TELECOM SUB-SURFACE",
      cooldown: "24-Month Re-Digging Moratorium Active"
    };
  } else if (title.includes("excav") || type.includes("heavy") || title.includes("trench")) {
    return {
      modelUrl: "/models/heavy_excavator.glb",
      category: "Municipal Heavy Machinery",
      depth: "Surface 0.0m Operation",
      specs: "20-Ton Tracked Hydraulic Excavator with 0.8m³ trenching bucket & rollover safety cage",
      color: "#eab308",
      tag: "HEAVY MACHINERY",
      cooldown: "Active Excavation Operation"
    };
  } else if (dept.includes("roads") || type.includes("resurfacing") || title.includes("asphalt")) {
    return {
      modelUrl: "/models/road_excavation_site.glb",
      category: "Road Resurfacing & Cold Milling Zone",
      depth: "Surface 0.0m (40mm Wearing Course)",
      specs: "Bitumen VG-30 Dense Graded Overlay with high-visibility safety barricades",
      color: "#2563eb",
      tag: "SURFACE ROADWORK",
      cooldown: "Must strictly follow underground utilities"
    };
  } else {
    return {
      modelUrl: "/models/mira_commercial_tower.glb",
      category: "3D Urban Landmark Building",
      depth: "Superstructure (+45.0m)",
      specs: "Curtain-wall reinforced concrete framing with structural wind load compliance",
      color: "#0284c7",
      tag: "CIVIC LANDMARK",
      cooldown: "Permanent City Asset"
    };
  }
}

export default function MapComponent({
  projects,
  conflicts,
  selectedProjectId,
  onSelectProject,
  selectedConflict,
  onOpenAICopilot,
  onOpenGenCityStudio,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const hoverPopupRef = useRef<any>(null);
  const selectionMarkerRef = useRef<any>(null);
  const orbitAnimRef = useRef<number | null>(null);
  const assetMarkersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("dark");

  // 3D Specific States
  const [is3DMode, setIs3DMode] = useState(true);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [showUtilities, setShowUtilities] = useState(true);
  const [showBuildings3D, setShowBuildings3D] = useState(true);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);
  const [subsurfaceXRay, setSubsurfaceXRay] = useState(false);

  // 3D Construction Coordination Mesh Network States
  const [meshNetworkActive, setMeshNetworkActive] = useState(true);
  const [meshFilter, setMeshFilter] = useState<"ALL" | "CONFLICTS" | "CORRIDORS" | "JOINT_TRENCH">("ALL");
  const [selectedMeshNodeId, setSelectedMeshNodeId] = useState<string | null>(null);
  const [selectedMeshLink, setSelectedMeshLink] = useState<MeshLink | null>(null);

  const meshGraph = React.useMemo(
    () => buildConstructionMesh(projects, conflicts, MIRA_ROAD_3D_ASSETS),
    [projects, conflicts]
  );

  // Live Urban Traffic & Peak Hours Engine States
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficHour, setTrafficHour] = useState<number>(8.5); // Default: Morning Peak (08:30 AM)
  const [selectedTrafficSegment, setSelectedTrafficSegment] = useState<TrafficSegment | null>(null);
  const [trafficHudCollapsed, setTrafficHudCollapsed] = useState(true);

  const trafficSnapshot = React.useMemo(
    () => simulateTrafficConditions(trafficHour, projects, conflicts),
    [trafficHour, projects, conflicts]
  );

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

  // Calculate active timeline date in UTC (Base: 1 Nov 2026, avoiding local timezone drift)
  const activeSimDate = new Date(Date.UTC(2026, 10, 1 + currentDayOffset));
  const activeDateStr = activeSimDate.toISOString().split("T")[0];

  // Play/pause time scrubber animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentDayOffset((prev) => {
        if (prev >= 45) return 0;
        return prev + 1;
      });
    }, 750);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Debounced search for places
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

  // 1. Initialize MapLibre with High-Precision 3D Pitch & Camera Controls
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
          center: [72.8595, 19.2825], // Centered on Mira Road Station / Kanakia Hub
          zoom: 15.6,
          pitch: is3DMode ? 55 : 0,
          bearing: is3DMode ? -20 : 0,
          maxPitch: 70,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

        map.on("load", () => {
          mapInstanceRef.current = map;
          setMapLoaded(true);

          // Configure 3D Realistic Sunlight & Directional Shading
          try {
            map.setLight({
              anchor: "viewport",
              color: "#ffffff",
              intensity: 0.52,
              position: [1.5, 180, 50],
            });
          } catch (lightErr) {
            console.warn("MapLibre 3D light setup:", lightErr);
          }

          // Configure 3D Building Extrusions from Vector Style
          try {
            const layers = map.getStyle().layers;
            let labelLayerId: string | undefined = undefined;
            for (let i = 0; i < layers.length; i++) {
              if (layers[i].type === "symbol" && layers[i].layout && layers[i].layout["text-field"]) {
                labelLayerId = layers[i].id;
                break;
              }
            }

            // Check if openmaptiles building source exists
            if (map.getSource("openmaptiles") && !map.getLayer("osm-3d-buildings")) {
              map.addLayer(
                {
                  id: "osm-3d-buildings",
                  source: "openmaptiles",
                  "source-layer": "building",
                  type: "fill-extrusion",
                  minzoom: 13,
                  paint: {
                    "fill-extrusion-color": [
                      "interpolate",
                      ["linear"],
                      ["coalesce", ["get", "render_height"], 15],
                      0, "#1e293b",
                      20, "#334155",
                      45, "#0284c7",
                      80, "#38bdf8"
                    ],
                    "fill-extrusion-height": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      13, 0,
                      14, ["coalesce", ["get", "render_height"], ["get", "height"], ["*", ["get", "levels"], 3.2], 16]
                    ],
                    "fill-extrusion-base": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      13, 0,
                      14, ["coalesce", ["get", "render_min_height"], 0]
                    ],
                    "fill-extrusion-opacity": 0.85,
                    "fill-extrusion-vertical-gradient": true
                  }
                },
                labelLayerId
              );
            }

            // In addition, load custom Mira Road 3D Landmark Buildings GeoJSON
            fetch("/data/miraroad_3d_buildings.json")
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (!data || !map) return;
                if (!map.getSource("miraroad-3d-buildings")) {
                  map.addSource("miraroad-3d-buildings", {
                    type: "geojson",
                    data,
                  });

                  map.addLayer(
                    {
                      id: "miraroad-3d-landmarks",
                      type: "fill-extrusion",
                      source: "miraroad-3d-buildings",
                      paint: {
                        "fill-extrusion-color": [
                          "interpolate",
                          ["linear"],
                          ["get", "height"],
                          14, "#0f172a",
                          25, "#0369a1",
                          45, "#0284c7",
                          65, "#06b6d4",
                          85, "#38bdf8",
                          105, "#818cf8"
                        ],
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-opacity": 0.92,
                        "fill-extrusion-vertical-gradient": true
                      }
                    },
                    labelLayerId
                  );

                  // Interactive 3D Building Tooltip
                  map.on("mouseenter", "miraroad-3d-landmarks", (e: any) => {
                    map.getCanvas().style.cursor = "pointer";
                    const p = e.features?.[0]?.properties;
                    if (!p) return;
                    if (hoverPopupRef.current) hoverPopupRef.current.remove();
                    hoverPopupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12, className: "civicsync-map-popup" })
                      .setLngLat(e.lngLat)
                      .setHTML(`
                        <div style="background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; padding: 8px 10px; min-width: 155px; color: #f8fafc; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);">
                          <div style="font-weight: 700; color: #38bdf8; margin-bottom: 3px; font-size: 12px;">${p.name}</div>
                          <div style="color: #e2e8f0; font-weight: 600;">Height: <span style="color: #38bdf8;">${p.height}m</span> (${p.levels} Floors)</div>
                          <div style="color: #94a3b8; font-size: 10px; margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #06b6d4;"></span>
                            ${p.building_type?.toUpperCase()} &bull; ${p.height_source}
                          </div>
                        </div>
                      `)
                      .addTo(map);
                  });

                  map.on("mouseleave", "miraroad-3d-landmarks", () => {
                    map.getCanvas().style.cursor = "";
                    if (hoverPopupRef.current) hoverPopupRef.current.remove();
                  });
                }
              })
              .catch((err) => console.warn("Custom 3D buildings load error:", err));

            // Render real 3D glTF/GLB models directly into the 3D Map canvas with high-precision matrices
            const glbCustom3DLayer: any = {
              id: "miraroad-3d-glb-models",
              type: "custom",
              renderingMode: "3d",
              items: [] as Array<{ scene: THREE.Scene; matrix: THREE.Matrix4 }>,
              onAdd: function (m: any, gl: WebGLRenderingContext) {
                this.camera = new THREE.Camera();
                this.items = [];

                const loader = new GLTFLoader();
                MIRA_ROAD_3D_ASSETS.forEach((asset) => {
                  const itemScene = new THREE.Scene();

                  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
                  itemScene.add(ambientLight);

                  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.8);
                  dirLight1.position.set(50, 100, 80);
                  itemScene.add(dirLight1);

                  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.4);
                  dirLight2.position.set(-50, -80, 50);
                  itemScene.add(dirLight2);

                  const coord = maplibregl.MercatorCoordinate.fromLngLat(
                    [asset.lng, asset.lat],
                    0
                  );
                  const meter = coord.meterInMercatorCoordinateUnits();
                  const s = asset.scale || 1.0;

                  // High-precision model transform matrix:
                  // Translates directly in Mercator space and scales to metric coordinates
                  const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
                  const rotZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), asset.bearing || 0);

                  const transformMatrix = new THREE.Matrix4()
                    .makeTranslation(coord.x, coord.y, coord.z)
                    .scale(new THREE.Vector3(meter * s, -meter * s, meter * s))
                    .multiply(rotX)
                    .multiply(rotZ);

                  loader.load(
                    asset.modelUrl,
                    (gltf) => {
                      const model = gltf.scene;
                      model.position.set(0, 0, 0);

                      model.traverse((child: any) => {
                        if (child.isMesh) {
                          child.castShadow = true;
                          child.receiveShadow = true;
                          if (child.material) {
                            child.material.depthWrite = true;
                            child.material.depthTest = true;
                          }
                        }
                      });

                      itemScene.add(model);
                      this.items.push({ scene: itemScene, matrix: transformMatrix });
                      m.triggerRepaint();
                    },
                    undefined,
                    (err) => console.warn("Notice loading GLB into map:", asset.name, err)
                  );
                });

                this.renderer = new THREE.WebGLRenderer({
                  canvas: m.getCanvas(),
                  context: gl,
                  antialias: true,
                });
                this.renderer.autoClear = false;
              },
              render: function (gl: WebGLRenderingContext, matrix: number[]) {
                if (!this.renderer || !this.items || this.items.length === 0) return;

                const baseMatrix = new THREE.Matrix4().fromArray(matrix);

                for (let i = 0; i < this.items.length; i++) {
                  const item = this.items[i];
                  this.camera.projectionMatrix = baseMatrix.clone().multiply(item.matrix);
                  this.renderer.resetState();
                  this.renderer.render(item.scene, this.camera);
                }
              },
            };

            try {
              if (!map.getLayer("miraroad-3d-glb-models")) {
                map.addLayer(glbCustom3DLayer, labelLayerId);
              }
            } catch (e) {
              console.warn("Notice adding 3D GLB layer to map:", e);
            }

          } catch (layerErr) {
            console.warn("3D Building layer setup notice:", layerErr);
          }

          // Force multiple resizes to guarantee canvas fills viewport
          map.resize();
          setTimeout(() => map.resize(), 100);
          setTimeout(() => map.resize(), 400);
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
      if (orbitAnimRef.current) {
        cancelAnimationFrame(orbitAnimRef.current);
        orbitAnimRef.current = null;
      }
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [selectedStyleId]);

  // Toggle 3D Mode Camera Pitch
  const toggle3DMode = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (is3DMode) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      setIs3DMode(false);
    } else {
      map.easeTo({ pitch: 58, bearing: -20, duration: 800 });
      setIs3DMode(true);
    }
  };

  // Toggle Slow Orbit Animation with time delta for silky smooth 60fps rotation
  const toggleOrbitAnimation = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (isOrbiting) {
      if (orbitAnimRef.current) cancelAnimationFrame(orbitAnimRef.current);
      orbitAnimRef.current = null;
      setIsOrbiting(false);
    } else {
      setIsOrbiting(true);
      let lastTime = performance.now();
      const orbitStep = (now: number) => {
        if (!mapInstanceRef.current) return;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        const currentBearing = map.getBearing();
        // Rotate continuously at 8 degrees per second without modulo jump
        map.setBearing(currentBearing + dt * 8);
        orbitAnimRef.current = requestAnimationFrame(orbitStep);
      };
      orbitAnimRef.current = requestAnimationFrame(orbitStep);
    }
  };

  // 2. Vector GeoJSON Data Source & Layers for Projects + Glowing Corridors + Red Conflict Links
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    const renderProjectLayers = () => {
      if (!map.isStyleLoaded()) return;

      import("maplibre-gl").then(({ default: maplibregl }) => {
        const features: GeoJSON.Feature[] = [];
        const conflictLines: GeoJSON.Feature[] = [];

        filteredProjects.forEach((proj) => {
          const startLat = proj.lat ?? proj.latitude;
          const startLng = proj.lng ?? proj.longitude;
          const endLat = proj.end_lat ?? proj.end_latitude;
          const endLng = proj.end_lng ?? proj.end_longitude;
          const hasConflict = conflictingProjectIds.has(proj.id) || proj.has_conflicts;
          const deptColor = DEPT_COLORS[proj.department] || "#2563EB";

          if (!startLat || !startLng || isNaN(startLat) || isNaN(startLng)) return;

          // Compute 4D Timeline Phase for the current simulated date
          const start = proj.start_date || "2026-11-01";
          const end = proj.end_date || "2026-11-30";
          let timelinePhase = "active";
          let phaseColor = deptColor;
          let phaseOpacity = 0.95;
          let lineWidth = 7;
          let circleRadius = 11;

          if (activeDateStr < start) {
            timelinePhase = "planned";
            phaseColor = "#64748b"; // Blueprint slate
            phaseOpacity = 0.40;
            lineWidth = 3;
            circleRadius = 6;
          } else if (activeDateStr > end) {
            timelinePhase = "completed";
            phaseColor = "#475569"; // Restored road asphalt
            phaseOpacity = 0.65;
            lineWidth = 5;
            circleRadius = 7;
          } else {
            timelinePhase = "active"; // Currently active construction
            phaseColor = deptColor;
            phaseOpacity = 1.0;
            lineWidth = 8;
            circleRadius = 12;
          }

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
                color: phaseColor,
                has_conflict: hasConflict && timelinePhase === "active",
                timeline_phase: timelinePhase,
                phase_opacity: phaseOpacity,
                line_width: lineWidth,
                circle_radius: circleRadius
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
              color: phaseColor,
              has_conflict: hasConflict && timelinePhase === "active",
              timeline_phase: timelinePhase,
              phase_opacity: phaseOpacity,
              line_width: lineWidth,
              circle_radius: circleRadius
            },
          });
        });

        // Build Conflict Connection Lines between clashes (filtered by active timeline window)
        conflicts.forEach((c) => {
          const pA = projects.find((p) => p.id === c.project_a_id);
          const pB = projects.find((p) => p.id === c.project_b_id);
          const latA = pA?.lat ?? pA?.latitude;
          const lngA = pA?.lng ?? pA?.longitude;
          const latB = pB?.lat ?? pB?.latitude;
          const lngB = pB?.lng ?? pB?.longitude;

          const isOverlapActive = !c.overlap_start || (activeDateStr >= c.overlap_start && activeDateStr <= c.overlap_end);

          if (latA && lngA && latB && lngB) {
            conflictLines.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [lngA, latA],
                  [lngB, latB],
                ],
              },
              properties: {
                id: c.id,
                severity: c.severity_level,
                color: c.severity_level === "High" ? "#dc2626" : c.severity_level === "Medium" ? "#ea580c" : "#f59e0b",
                is_active: isOverlapActive,
                line_opacity: isOverlapActive ? 0.95 : 0.20,
              },
            });
          }
        });

        const featureCollection: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features,
        };

        const conflictCollection: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: conflictLines,
        };

        // 1. Projects Source
        if (map.getSource("projects")) {
          (map.getSource("projects") as any).setData(featureCollection);
        } else {
          map.addSource("projects", {
            type: "geojson",
            data: featureCollection,
          });

          // Glowing 3D road underlay
          map.addLayer({
            id: "proj-line-glow",
            type: "line",
            source: "projects",
            filter: ["==", "$type", "LineString"],
            paint: {
              "line-width": 14,
              "line-color": ["get", "color"],
              "line-opacity": ["case", ["==", ["get", "timeline_phase"], "active"], 0.45, 0.15],
              "line-blur": 4,
            },
          });

          // Core road construction line
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
              "line-width": ["get", "line_width"],
              "line-color": ["get", "color"],
              "line-opacity": ["get", "phase_opacity"],
            },
          });

          // Pulsing red conflict ring for points
          map.addLayer({
            id: "proj-conflict-pulse",
            type: "circle",
            source: "projects",
            filter: ["all", ["==", "$type", "Point"], ["==", ["get", "has_conflict"], true]],
            paint: {
              "circle-radius": 22,
              "circle-color": "rgba(220, 38, 38, 0.15)",
              "circle-stroke-width": 2.5,
              "circle-stroke-color": "#dc2626",
            },
          });

          // Crisp 3D pin point
          map.addLayer({
            id: "proj-pt",
            type: "circle",
            source: "projects",
            filter: ["==", "$type", "Point"],
            paint: {
              "circle-radius": ["get", "circle_radius"],
              "circle-color": ["get", "color"],
              "circle-opacity": ["get", "phase_opacity"],
              "circle-stroke-width": 2.5,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Cursor interactions
          map.on("mouseenter", "proj-pt", () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", "proj-pt", () => (map.getCanvas().style.cursor = ""));
          map.on("mouseenter", "proj-line", () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", "proj-line", () => (map.getCanvas().style.cursor = ""));

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

        // 2. Conflict Collision Lines
        if (map.getSource("conflict-links")) {
          (map.getSource("conflict-links") as any).setData(conflictCollection);
        } else {
          map.addSource("conflict-links", {
            type: "geojson",
            data: conflictCollection,
          });

          map.addLayer({
            id: "conflict-links-glow",
            type: "line",
            source: "conflict-links",
            paint: {
              "line-width": 8,
              "line-color": "#dc2626",
              "line-opacity": ["case", ["==", ["get", "is_active"], true], 0.65, 0.0],
              "line-blur": 3,
            },
          });

          map.addLayer({
            id: "conflict-links-core",
            type: "line",
            source: "conflict-links",
            paint: {
              "line-width": 3,
              "line-color": "#dc2626",
              "line-dasharray": [3, 2],
              "line-opacity": ["case", ["==", ["get", "is_active"], true], 0.95, 0.0],
            },
          });
        }
      });
    };

    if (map.isStyleLoaded()) {
      renderProjectLayers();
    } else {
      map.once("styledata", renderProjectLayers);
    }
  }, [filteredProjects, mapLoaded, conflictingProjectIds, conflicts, activeDateStr]);

  // 3. Anchor 4 Real 3D Digital Twin Construction Markers directly onto the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    assetMarkersRef.current.forEach((m) => m.remove());
    assetMarkersRef.current = [];

    import("maplibre-gl").then(({ default: maplibregl }) => {
      MIRA_ROAD_3D_ASSETS.forEach((asset) => {
        const isActive = activeDateStr >= asset.start_date && activeDateStr <= asset.end_date;
        const isUpcoming = activeDateStr < asset.start_date;
        const statusText = isActive ? "ACTIVE SITE" : isUpcoming ? "PLANNED" : "RESTORED";
        const statusColor = isActive ? "#10b981" : isUpcoming ? "#38bdf8" : "#94a3b8";

        const el = document.createElement("div");
        el.className = "gencity-3d-pin cursor-pointer";
        el.style.transform = "translate(-50%, -100%)";
        el.innerHTML = `
          <div style="transform: perspective(600px) rotateX(15deg); transition: transform 0.2s ease; display: inline-flex; flex-direction: column; align-items: center;" class="hover:scale-110">
            <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border: 1.5px solid ${asset.badgeColor}; border-radius: 10px; padding: 4px 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.7), 0 0 14px ${asset.badgeColor}50; display: flex; align-items: center; gap: 6px; white-space: nowrap; pointer-events: auto;">
              <span style="font-size: 15px;">${asset.icon}</span>
              <div>
                <div style="font-weight: 800; font-size: 11px; color: #ffffff;">${asset.name}</div>
                <div style="font-size: 9px; color: ${asset.badgeColor}; font-family: monospace; font-weight: 700;">${asset.stats} &bull; ${asset.depth}</div>
              </div>
              <div style="background: ${statusColor}25; border: 1px solid ${statusColor}; border-radius: 5px; padding: 1.5px 5px; font-size: 8.5px; font-weight: 800; color: ${statusColor}; display: flex; align-items: center; gap: 3px;">
                ${isActive ? '<span style="width: 5px; height: 5px; border-radius: 50%; background: #10b981;"></span>' : ''}
                ${statusText}
              </div>
            </div>
            <div style="width: 2px; height: 12px; background: ${asset.badgeColor}; box-shadow: 0 0 8px ${asset.badgeColor};"></div>
            <div style="width: 7px; height: 7px; border-radius: 50%; background: ${asset.badgeColor}; box-shadow: 0 0 10px ${asset.badgeColor};"></div>
          </div>
        `;

        el.addEventListener("click", () => {
          map.flyTo({
            center: [asset.lng, asset.lat],
            zoom: 17.5,
            pitch: 62,
            bearing: 25,
            duration: 1200,
          });
          const matched = projects.find((p) => p.road_name === asset.road_name) || {
            id: asset.id,
            name: asset.name,
            title: asset.name,
            department: asset.category,
            project_type: asset.category,
            road_name: asset.road_name,
            start_date: asset.start_date,
            end_date: asset.end_date,
            lat: asset.lat,
            lng: asset.lng,
            latitude: asset.lat,
            longitude: asset.lng,
            status: isActive ? "Ongoing" : isUpcoming ? "Planned" : "Completed",
          };
          if (onSelectProject) {
            onSelectProject(matched as any);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([asset.lng, asset.lat])
          .addTo(map);

        assetMarkersRef.current.push(marker);
      });
    });

    return () => {
      assetMarkersRef.current.forEach((m) => m.remove());
      assetMarkersRef.current = [];
    };
  }, [mapLoaded, projects, activeDateStr]);

  // Dynamic Subsurface 3D Cutaway Mode: Translucent buildings & vivid subterranean conduits
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;
    if (!map.isStyleLoaded()) return;

    try {
      if (map.getLayer("miraroad-3d-landmarks")) {
        map.setPaintProperty("miraroad-3d-landmarks", "fill-extrusion-opacity", subsurfaceXRay ? 0.22 : 0.9);
      }
      if (map.getLayer("osm-3d-buildings")) {
        map.setPaintProperty("osm-3d-buildings", "fill-extrusion-opacity", subsurfaceXRay ? 0.18 : 0.85);
      }
      if (map.getLayer("proj-line-glow")) {
        map.setPaintProperty("proj-line-glow", "line-width", subsurfaceXRay ? 24 : 14);
        map.setPaintProperty("proj-line-glow", "line-opacity", subsurfaceXRay ? 0.7 : 0.35);
      }
    } catch (e) {
      console.warn("Subsurface X-Ray style change notice:", e);
    }
  }, [subsurfaceXRay, mapLoaded]);

  // 3D Construction Mesh Network Layer Management
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;
    if (!map.isStyleLoaded()) return;

    if (!meshNetworkActive) {
      if (map.getSource("mesh-network-links")) {
        (map.getSource("mesh-network-links") as any).setData({ type: "FeatureCollection", features: [] });
      }
      if (map.getSource("mesh-network-nodes")) {
        (map.getSource("mesh-network-nodes") as any).setData({ type: "FeatureCollection", features: [] });
      }
      return;
    }

    const filteredLinks = meshGraph.links.filter((l) => {
      if (meshFilter === "CONFLICTS") return l.type === "CONFLICT";
      if (meshFilter === "CORRIDORS") return l.type === "CORRIDOR";
      if (meshFilter === "JOINT_TRENCH") return l.type === "JOINT_TRENCH";
      return true;
    });

    const linkFeatures = filteredLinks.map((link) => {
      const isIncident =
        selectedMeshNodeId &&
        (link.source_id === selectedMeshNodeId || link.target_id === selectedMeshNodeId);
      const opacity = selectedMeshNodeId
        ? isIncident
          ? 0.95
          : 0.12
        : link.type === "CONFLICT"
        ? 0.95
        : link.type === "CORRIDOR"
        ? 0.8
        : 0.7;
      const lineWidth = isIncident
        ? 4.5
        : link.type === "CONFLICT"
        ? 3.5
        : link.type === "CORRIDOR"
        ? 2.8
        : 2.2;

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: generateCurveCoordinates(link.source_coords, link.target_coords),
        },
        properties: {
          id: link.id,
          type: link.type,
          color: link.color,
          glow_color: link.glow_color,
          line_width: lineWidth,
          line_opacity: opacity,
          glow_opacity: opacity * 0.5,
          label: link.label,
          source_id: link.source_id,
          target_id: link.target_id,
          distance_m: link.distance_m,
          description: link.description,
        },
      };
    });

    const nodeFeatures = meshGraph.nodes.map((node) => {
      const isSelected = selectedMeshNodeId === node.id;
      const isNeighbor =
        selectedMeshNodeId && node.connected_node_ids.includes(selectedMeshNodeId);
      const isFaded = selectedMeshNodeId && !isSelected && !isNeighbor;
      const opacity = isFaded ? 0.25 : 1.0;
      const radius = isSelected ? 10 : node.has_conflict ? 8.5 : 7.0;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [node.lng, node.lat],
        },
        properties: {
          id: node.id,
          name: node.name,
          department: node.department,
          color: node.dept_color,
          has_conflict: node.has_conflict,
          is_selected: isSelected,
          radius: radius,
          pulse_radius: radius + 14,
          opacity: opacity,
        },
      };
    });

    const linkCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: linkFeatures as any,
    };

    const nodeCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: nodeFeatures as any,
    };

    // 1. Links Source & Layers
    if (map.getSource("mesh-network-links")) {
      (map.getSource("mesh-network-links") as any).setData(linkCollection);
    } else {
      map.addSource("mesh-network-links", {
        type: "geojson",
        data: linkCollection,
      });

      map.addLayer({
        id: "mesh-links-glow",
        type: "line",
        source: "mesh-network-links",
        paint: {
          "line-width": 12,
          "line-color": ["get", "glow_color"],
          "line-opacity": ["get", "glow_opacity"],
          "line-blur": 4,
        },
      });

      map.addLayer({
        id: "mesh-links-core",
        type: "line",
        source: "mesh-network-links",
        paint: {
          "line-width": ["get", "line_width"],
          "line-color": ["get", "color"],
          "line-opacity": ["get", "line_opacity"],
          "line-dasharray": [3, 2],
        },
      });

      map.on("mouseenter", "mesh-links-core", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "mesh-links-core", () => (map.getCanvas().style.cursor = ""));

      map.on("click", "mesh-links-core", (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const linkId = e.features[0].properties?.id;
        const linkObj = meshGraph.links.find((l) => l.id === linkId);
        if (linkObj) {
          setSelectedMeshLink(linkObj);
          const midLng = (linkObj.source_coords[0] + linkObj.target_coords[0]) / 2;
          const midLat = (linkObj.source_coords[1] + linkObj.target_coords[1]) / 2;
          map.flyTo({ center: [midLng, midLat], zoom: 16.8, pitch: 56, duration: 1000 });
        }
      });
    }

    // 2. Nodes Source & Layers
    if (map.getSource("mesh-network-nodes")) {
      (map.getSource("mesh-network-nodes") as any).setData(nodeCollection);
    } else {
      map.addSource("mesh-network-nodes", {
        type: "geojson",
        data: nodeCollection,
      });

      map.addLayer({
        id: "mesh-nodes-pulse",
        type: "circle",
        source: "mesh-network-nodes",
        paint: {
          "circle-radius": ["get", "pulse_radius"],
          "circle-color": "transparent",
          "circle-stroke-width": 2,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": ["get", "opacity"],
        },
      });

      map.addLayer({
        id: "mesh-nodes-core",
        type: "circle",
        source: "mesh-network-nodes",
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": ["get", "color"],
          "circle-opacity": ["get", "opacity"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("mouseenter", "mesh-nodes-core", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "mesh-nodes-core", () => (map.getCanvas().style.cursor = ""));

      map.on("click", "mesh-nodes-core", (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const nodeId = e.features[0].properties?.id;
        setSelectedMeshNodeId((prev) => (prev === nodeId ? null : nodeId));
        const coords = e.features[0].geometry.coordinates;
        map.flyTo({ center: coords, zoom: 16.5, pitch: 58, duration: 1000 });
      });
    }
  }, [mapLoaded, meshGraph, meshNetworkActive, meshFilter, selectedMeshNodeId]);

  // Live Urban Traffic Corridors and Detour Layer Management
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;
    if (!map.isStyleLoaded()) return;

    if (!showTraffic) {
      if (map.getSource("traffic-corridors")) {
        (map.getSource("traffic-corridors") as any).setData({ type: "FeatureCollection", features: [] });
      }
      if (map.getSource("traffic-detours")) {
        (map.getSource("traffic-detours") as any).setData({ type: "FeatureCollection", features: [] });
      }
      return;
    }

    const corridorFeatures = trafficSnapshot.segments.map((seg) => {
      let color = seg.color;

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: seg.coordinates,
        },
        properties: {
          id: seg.id,
          name: seg.road_name,
          current_speed_kmh: seg.current_speed_kmh,
          free_flow_speed_kmh: seg.base_speed_kmh,
          delay_minutes: seg.delay_mins,
          congestion_ratio: seg.congestion_score,
          is_bottleneck: seg.level === "CRITICAL_BOTTLENECK",
          active_roadwork: seg.is_construction_impacted,
          roadwork_details: seg.cause,
          detour_name: seg.alternate_detour_name || "",
          detour_extra_min: seg.delay_mins,
          color: color,
        },
      };
    });

    const detourFeatures = trafficSnapshot.segments
      .filter((s) => s.detour_coordinates && s.detour_coordinates.length > 0)
      .map((s) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: s.detour_coordinates!,
        },
        properties: {
          id: `detour-${s.id}`,
          name: s.alternate_detour_name || "Alternate Bypass",
          corridor_name: s.road_name,
          extra_minutes: s.delay_mins,
          description: `Alternate detour bypassing roadwork on ${s.road_name}`,
        },
      }));

    const corridorCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: corridorFeatures as any,
    };

    const detourCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: detourFeatures as any,
    };

    // 1. Traffic Corridors Source & Layers
    if (map.getSource("traffic-corridors")) {
      (map.getSource("traffic-corridors") as any).setData(corridorCollection);
    } else {
      map.addSource("traffic-corridors", {
        type: "geojson",
        data: corridorCollection,
      });

      // Dark Casing
      map.addLayer({
        id: "traffic-corridors-casing",
        type: "line",
        source: "traffic-corridors",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#020617",
          "line-width": 8,
          "line-opacity": 0.85,
        },
      });

      // Flow Line
      map.addLayer({
        id: "traffic-corridors-flow",
        type: "line",
        source: "traffic-corridors",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4.5,
          "line-opacity": 0.95,
        },
      });

      // Interactive Tooltip & Click
      map.on("mouseenter", "traffic-corridors-flow", (e: any) => {
        map.getCanvas().style.cursor = "pointer";
        const p = e.features?.[0]?.properties;
        if (!p) return;
        if (hoverPopupRef.current) hoverPopupRef.current.remove();

        import("maplibre-gl").then(({ default: maplibregl }) => {
          hoverPopupRef.current = new maplibregl.Popup({
            closeButton: false,
            offset: 14,
            className: "civicsync-map-popup",
          })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(12px); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 10px; font-family: system-ui, sans-serif; font-size: 11px; padding: 9px 12px; min-width: 180px; color: #f8fafc; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);">
                <div style="font-weight: 700; color: #fbbf24; margin-bottom: 3px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <span>${p.name}</span>
                  <span style="font-size: 10px; color: ${p.is_bottleneck ? '#f87171' : '#34d399'}; font-weight: 800;">
                    ${p.is_bottleneck ? 'BOTTLENECK' : 'NORMAL'}
                  </span>
                </div>
                <div style="color: #e2e8f0; font-weight: 600;">Speed: <span style="color: ${p.color}; font-weight: 700;">${p.current_speed_kmh} km/h</span> (Free: ${p.free_flow_speed_kmh} km/h)</div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Delay: <span style="color: #f87171; font-weight: 700;">+${p.delay_minutes} min</span></div>
                ${p.active_roadwork ? `<div style="margin-top: 5px; padding: 4px 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #fca5a5; font-size: 9.5px;">⚠️ ${p.roadwork_details}</div>` : ''}
                ${p.detour_name ? `<div style="margin-top: 4px; color: #38bdf8; font-size: 9.5px;">🔄 Alt: ${p.detour_name} (+${p.detour_extra_min}m)</div>` : ''}
              </div>
            `)
            .addTo(map);
        });
      });

      map.on("mouseleave", "traffic-corridors-flow", () => {
        map.getCanvas().style.cursor = "";
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
      });

      map.on("click", "traffic-corridors-flow", (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const segmentId = e.features[0].properties?.id;
        const seg = trafficSnapshot.segments.find((s) => s.id === segmentId);
        if (seg) {
          setSelectedTrafficSegment(seg);
        }
      });
    }

    // 2. Detour Routes Source & Layers
    if (map.getSource("traffic-detours")) {
      (map.getSource("traffic-detours") as any).setData(detourCollection);
    } else {
      map.addSource("traffic-detours", {
        type: "geojson",
        data: detourCollection,
      });

      map.addLayer({
        id: "traffic-detours-glow",
        type: "line",
        source: "traffic-detours",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#38bdf8",
          "line-width": 3.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });
    }
  }, [mapLoaded, showTraffic, trafficSnapshot]);

  // Reactive Effect: Pan and focus map on selected project
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    if (selectionMarkerRef.current) {
      selectionMarkerRef.current.remove();
      selectionMarkerRef.current = null;
    }

    if (!selectedProjectId) return;

    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    const pLat = proj.lat ?? proj.latitude;
    const pLng = proj.lng ?? proj.longitude;
    if (!pLat || !pLng || isNaN(pLat) || isNaN(pLng)) return;

    import("maplibre-gl").then(({ default: maplibregl }) => {
      const el = document.createElement("div");
      el.className = "civic-selection-ping";
      el.innerHTML = `
        <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: #2563EB; opacity: 0.4; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #FFFFFF; background: #2563EB; box-shadow: 0 4px 20px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF;"></div>
          </div>
        </div>
      `;

      selectionMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([pLng, pLat])
        .addTo(map);

      map.flyTo({
        center: [pLng, pLat],
        zoom: 16.5,
        essential: true,
        pitch: 58,
        bearing: -15,
      });
    });
  }, [selectedProjectId, mapLoaded, projects]);

  // Reactive Effect: Zoom to conflict bounds when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !selectedConflict) return;
    const map = mapInstanceRef.current;

    const projA = projects.find((p) => p.id === selectedConflict.project_a_id);
    const projB = projects.find((p) => p.id === selectedConflict.project_b_id);

    const latA = projA?.lat ?? projA?.latitude;
    const lngA = projA?.lng ?? projA?.longitude;
    const latB = projB?.lat ?? projB?.latitude;
    const lngB = projB?.lng ?? projB?.longitude;

    if (latA && lngA && latB && lngB) {
      import("maplibre-gl").then(({ default: maplibregl }) => {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([lngA, latA]);
        bounds.extend([lngB, latB]);
        map.fitBounds(bounds, { padding: 130, maxZoom: 17, pitch: 58, bearing: -20 });
      });
    }
  }, [selectedConflict, mapLoaded, projects]);

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
      mapInstanceRef.current.fitBounds(bounds, { padding: 90, maxZoom: 16, pitch: is3DMode ? 55 : 0 });
    });
  };

  const flyToHotspot = (hotspot: { lng: number; lat: number; zoom: number; pitch: number; bearing: number }) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [hotspot.lng, hotspot.lat],
      zoom: hotspot.zoom,
      pitch: hotspot.pitch,
      bearing: hotspot.bearing,
      essential: true,
      duration: 1200,
    });
  };

  const handleSelectSearchResult = (place: PlaceSearchResult) => {
    const pLat = parseFloat(place.lat);
    const pLng = parseFloat(place.lon);
    if (!isNaN(pLat) && !isNaN(pLng) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [pLng, pLat],
        zoom: 16.2,
        pitch: 55,
        bearing: -15,
        essential: true,
      });
      setSearchOpen(false);
      setSearchQuery(place.display_name.split(",")[0]);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[560px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl">
      {/* Sleek Minimal Map Command Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 text-white">
        {/* Brand & Place Search Box */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-xs text-white tracking-wide">
              Mira Road 3D Map & Infrastructure Graph
            </span>
          </div>

          {/* Place Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Mira Road street or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-slate-950/80 text-white placeholder-slate-400 transition"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                className="text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Place Autocomplete Results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((p) => (
                  <div
                    key={p.place_id}
                    onClick={() => handleSelectSearchResult(p)}
                    className="p-2 hover:bg-slate-800 cursor-pointer text-xs text-slate-200 transition flex items-start gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="truncate">{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* 3D / 2D Tilt Toggle Button */}
          <button
            type="button"
            onClick={toggle3DMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition text-xs shadow-xs ${
              is3DMode
                ? "bg-cyan-950 border-cyan-500/60 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle 3D Extruded Perspective View"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            {is3DMode ? "3D View" : "2D"}
          </button>

          {/* 3D Construction Mesh Network Toggle (In Map Only) */}
          <button
            type="button"
            onClick={() => setMeshNetworkActive(!meshNetworkActive)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition text-xs shadow-xs ${
              meshNetworkActive
                ? "bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50 shadow-sm shadow-emerald-950"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle 3D Infrastructure Network Graph directly on Map"
          >
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            3D Graph
          </button>

          {/* Live Urban Traffic Toggle */}
          <button
            type="button"
            onClick={() => setShowTraffic(!showTraffic)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition text-xs shadow-xs ${
              showTraffic
                ? "bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500/50"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle Live Urban Traffic Flow"
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            Traffic
          </button>

          {/* Conflict Filter */}
          <button
            type="button"
            onClick={() => setConflictOnly(!conflictOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition text-xs ${
              conflictOnly
                ? "bg-red-950 text-red-300 border-red-700 shadow-xs"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Conflicts ({conflictingProjectIds.size})
          </button>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs"
          >
            <option value="ALL">All Departments</option>
            <option value="Roads Department">Roads Dept</option>
            <option value="Water Department">Water Dept</option>
            <option value="Electricity Department">Electricity</option>
            <option value="Telecom Department">Telecom</option>
            <option value="Gas Department">Gas Dept</option>
            <option value="Sewerage Department">Sewerage</option>
          </select>

          {/* Fit Bounds */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Fit view to all projects"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map View Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[420px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Left Floating Overlays: 3D Legend & Live Traffic HUD */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2.5 max-w-[310px] pointer-events-none">
          {/* 3D Legend & Encoding Overlay */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl text-xs pointer-events-auto text-slate-300 transition-all">
            <div className="p-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80">
              <span className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 3D Digital Twin Encoding
              </span>
              <button
                type="button"
                onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                className="text-slate-400 hover:text-white text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                title={isLegendCollapsed ? "Expand legend" : "Collapse legend"}
              >
                {isLegendCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>

            {!isLegendCollapsed && (
              <div className="p-3 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center shrink-0 animate-ping">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-red-400 font-bold">Red Pulse: Spatial Collision</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-cyan-500 border border-cyan-300 shrink-0" />
                  <span className="text-slate-200">3D Extruded Buildings (Levels x 3m)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-white shrink-0" />
                  <span className="text-slate-300">Roads Dept (Surface Resurfacing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-white shrink-0" />
                  <span className="text-slate-300">Water Dept (Subsurface Pipeline)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white shrink-0" />
                  <span className="text-slate-300">Electricity (11kV Subsurface Cabling)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-400 border border-white shrink-0" />
                  <span className="text-slate-300">Telecom (5G Optical Fiber)</span>
                </div>
              </div>
            )}
          </div>

          {/* Live Urban Traffic & Peak Hours Engine HUD */}
          {showTraffic && (
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-amber-500/40 shadow-2xl text-xs pointer-events-auto text-white transition-all overflow-hidden max-w-[310px]">
              {/* Header */}
              <div className="p-2.5 bg-gradient-to-r from-amber-950/60 to-slate-900 flex items-center justify-between border-b border-amber-500/30">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Car className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[11px] uppercase tracking-wider">Traffic & Peak Hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950 border border-amber-800/80 text-amber-300 font-extrabold">
                    {trafficSnapshot.timeString}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTrafficHudCollapsed(!trafficHudCollapsed)}
                    className="text-slate-400 hover:text-white text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                  >
                    {trafficHudCollapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>

              {!trafficHudCollapsed && (
                <div className="p-3 space-y-2.5 text-[11px]">
                  {/* Peak Period Presets */}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Rush Hour Scenarios:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PEAK_PERIOD_PRESETS.map((preset) => {
                        const isSelected = Math.abs(trafficHour - preset.hour) < 0.25;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setTrafficHour(preset.hour);
                              setSelectedTrafficSegment(null);
                            }}
                            className={`p-1.5 rounded-lg border text-left transition ${
                              isSelected
                                ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-sm shadow-amber-950"
                                : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300"
                            }`}
                          >
                            <div className="font-bold text-[10px] truncate">{preset.label}</div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {preset.timeDisplay} &bull; {preset.periodName}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 24-Hour Slider */}
                  <div className="pt-1 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Simulation Clock (24h)</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {String(Math.floor(trafficHour)).padStart(2, "0")}:
                        {String(Math.round((trafficHour % 1) * 60)).padStart(2, "0")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="23.5"
                      step="0.5"
                      value={trafficHour}
                      onChange={(e) => {
                        setTrafficHour(parseFloat(e.target.value));
                        setSelectedTrafficSegment(null);
                      }}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>00:00 (Night)</span>
                      <span>08:30 (AM Peak)</span>
                      <span>19:00 (PM Peak)</span>
                    </div>
                  </div>

                  {/* City-Wide Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
                    <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-400 block">Congestion</span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          trafficSnapshot.cityCongestionScore >= 65
                            ? "text-red-400"
                            : trafficSnapshot.cityCongestionScore >= 40
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {trafficSnapshot.cityCongestionScore}/100
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-400 block">Avg Speed</span>
                      <span className="text-xs font-bold font-mono text-cyan-300">
                        {trafficSnapshot.avgSpeedKmh} km/h
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-400 block">Bottlenecks</span>
                      <span className="text-xs font-bold font-mono text-red-400">
                        {trafficSnapshot.activeBottlenecksCount} Sites
                      </span>
                    </div>
                  </div>

                  {/* Selected Corridor Inspection & Detour Recommendation */}
                  {selectedTrafficSegment ? (
                    <div className="p-2 rounded-xl bg-slate-950 border border-amber-500/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-[11px] truncate">{selectedTrafficSegment.road_name}</strong>
                        <button
                          type="button"
                          onClick={() => setSelectedTrafficSegment(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Current Speed:</span>
                        <span
                          className={`font-mono font-bold ${
                            selectedTrafficSegment.level === "CRITICAL_BOTTLENECK" ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {selectedTrafficSegment.current_speed_kmh} km/h (Free: {selectedTrafficSegment.base_speed_kmh} km/h)
                        </span>
                      </div>
                      {selectedTrafficSegment.is_construction_impacted && (
                        <div className="p-1.5 rounded bg-red-950/40 border border-red-800/60 text-[9.5px] text-red-200">
                          ⚠️ {selectedTrafficSegment.cause}
                        </div>
                      )}
                      {selectedTrafficSegment.alternate_detour_name && (
                        <div className="p-1.5 rounded bg-cyan-950/40 border border-cyan-800/60 text-[9.5px] text-cyan-200 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <Route className="w-3 h-3 text-cyan-400" />
                              {selectedTrafficSegment.alternate_detour_name}
                            </span>
                            <span className="text-emerald-400">+{selectedTrafficSegment.delay_mins} min</span>
                          </div>
                          <p className="text-[9px] text-slate-300">
                            Alternate bypass route active due to municipal digging.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Critical Bottlenecks Quick Navigator */
                    trafficSnapshot.activeBottlenecksCount > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono text-red-400 font-bold block">
                          Restricted Corridors ({trafficSnapshot.activeBottlenecksCount}):
                        </span>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                          {trafficSnapshot.segments
                            .filter((s) => s.level === "CRITICAL_BOTTLENECK" || s.current_speed_kmh < 18)
                            .map((seg) => (
                              <div
                                key={seg.id}
                                onClick={() => {
                                  setSelectedTrafficSegment(seg);
                                  if (mapInstanceRef.current && seg.coordinates.length > 0) {
                                    const mid = seg.coordinates[Math.floor(seg.coordinates.length / 2)];
                                    mapInstanceRef.current.flyTo({
                                      center: mid,
                                      zoom: 16.2,
                                      pitch: 58,
                                      duration: 1000,
                                    });
                                  }
                                }}
                                className="p-1.5 rounded bg-slate-950/80 border border-red-800/50 hover:border-red-500 cursor-pointer flex items-center justify-between transition text-[10px]"
                              >
                                <span className="font-semibold text-slate-200 truncate max-w-[170px]">{seg.road_name}</span>
                                <span className="font-mono text-red-400 font-bold">{seg.current_speed_kmh} km/h</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimal 3D Network Telemetry Pill */}
        {meshNetworkActive && !selectedMeshLink && !selectedMeshNodeId && !selectedProjectId && (
          <div className="absolute top-3 right-3 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs flex items-center gap-2 pointer-events-auto text-white shadow-lg shadow-black/40">
            <Network className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-300 text-[11px] font-semibold">
              3D Graph: {meshGraph.stats.total_nodes} Nodes &bull; {meshGraph.stats.total_links} Coordination Arcs
            </span>
          </div>
        )}

        {/* Unified Minimal Inspector Card (Top Right) */}
        {(() => {
          if (meshNetworkActive && selectedMeshLink) {
            return (
              <div className="absolute top-3 right-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/50 shadow-2xl text-xs space-y-2 animate-in fade-in slide-in-from-right-2 pointer-events-auto text-white">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedMeshLink.label}
                  </span>
                  <button
                    onClick={() => setSelectedMeshLink(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">{selectedMeshLink.description}</p>
                {selectedMeshLink.suggested_sequence && (
                  <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[10px] text-amber-200">
                    <strong>Recommended Sequence:</strong> {selectedMeshLink.suggested_sequence}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Municipal Avoidance:</span>
                  <span className="font-bold">₹{selectedMeshLink.cost_avoided_inr.toLocaleString()} INR</span>
                </div>
              </div>
            );
          }

          if (meshNetworkActive && selectedMeshNodeId) {
            const node = meshGraph.nodes.find((n) => n.id === selectedMeshNodeId);
            if (!node) return null;
            const incidentLinks = meshGraph.links.filter(
              (l) => l.source_id === node.id || l.target_id === node.id
            );
            return (
              <div className="absolute top-3 right-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/50 shadow-2xl text-xs space-y-2 animate-in fade-in slide-in-from-right-2 pointer-events-auto text-white">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: node.dept_color }} />
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider truncate max-w-[170px]">
                      {node.department}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedMeshNodeId(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{node.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {node.road_name} &bull; {node.start_date} to {node.end_date}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                    3D Graph Connections ({incidentLinks.length})
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {incidentLinks.map((l) => (
                      <div
                        key={l.id}
                        className={`p-1.5 rounded-lg border text-[10px] ${
                          l.type === "CONFLICT"
                            ? "bg-red-950/40 border-red-800/60 text-red-200"
                            : l.type === "JOINT_TRENCH"
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                            : "bg-cyan-950/40 border-cyan-800/60 text-cyan-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{l.label}</span>
                          <span>{l.distance_m}m</span>
                        </div>
                        <p className="text-[9px] text-slate-300 mt-0.5 line-clamp-1">{l.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo({ center: [node.lng, node.lat], zoom: 17, pitch: 62, duration: 1000 });
                      }
                    }}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-lg text-[10px] transition flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Compass className="w-3 h-3" /> Focus Node
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMeshNodeId(null)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] border border-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          }

          if (selectedProjectId) {
            const activeProj = projects.find((p) => p.id === selectedProjectId);
            if (!activeProj) return null;
            const isClashing = conflictingProjectIds.has(activeProj.id);
            return (
              <div className="absolute top-3 right-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/40 shadow-2xl text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 pointer-events-auto text-white">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded text-[11px]">
                    {activeProj.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isClashing
                          ? "bg-red-950 text-red-300 border border-red-700"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      }`}
                    >
                      {isClashing ? "Conflict Flagged" : activeProj.status}
                    </span>
                    <button
                      onClick={() => onSelectProject && onSelectProject(null as any)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm leading-snug">
                    {activeProj.title || activeProj.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-white">{activeProj.road_name}</span>
                    <span>&bull;</span>
                    <span>{activeProj.department}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {formatDate(activeProj.start_date)} – {formatDate(activeProj.end_date)}
                  </span>
                  <span className="font-semibold text-cyan-300">{activeProj.project_type}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const lat = activeProj.lat ?? activeProj.latitude;
                    const lng = activeProj.lng ?? activeProj.longitude;
                    if (lat && lng && mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo({
                        center: [lng, lat],
                        zoom: 17.5,
                        pitch: 62,
                        bearing: 25,
                        duration: 1200,
                      });
                    }
                  }}
                  className="w-full mt-1.5 py-1.5 px-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-md shadow-cyan-600/25"
                >
                  <Box className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Fly to 3D Model On Map</span>
                </button>
              </div>
            );
          }

          return null;
        })()}

        {/* Docked Time-Travel 4D Scrubber Bar */}
        {(() => {
          let activeCount = 0;
          let plannedCount = 0;
          let completedCount = 0;
          let collisionCountToday = 0;

          filteredProjects.forEach((p) => {
            const s = p.start_date || "2026-11-01";
            const e = p.end_date || "2026-11-30";
            if (activeDateStr < s) plannedCount++;
            else if (activeDateStr > e) completedCount++;
            else activeCount++;
          });

          conflicts.forEach((c) => {
            if (!c.overlap_start || (activeDateStr >= c.overlap_start && activeDateStr <= c.overlap_end)) {
              if (c.resolution !== "Overridden" && c.status !== "Closed") {
                collisionCountToday++;
              }
            }
          });

          return (
            <div className="absolute bottom-5 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-2xl border border-cyan-500/30 shadow-2xl max-w-2xl mx-auto flex flex-col gap-2.5 text-white pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-2 rounded-xl text-white font-bold transition flex items-center gap-1.5 text-xs shadow-md ${
                      isPlaying
                        ? "bg-amber-600 hover:bg-amber-500"
                        : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/25"
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? "Pause 4D Twin" : "Play 4D Timeline"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDayOffset(0)}
                    className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                    title="Reset Timeline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Simulated Municipal Date:
                  </span>
                  <span className="font-mono font-extrabold text-cyan-300 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-lg text-xs">
                    {formatDate(activeDateStr)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono font-semibold">1 Nov 2026</span>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={currentDayOffset}
                  onChange={(e) => setCurrentDayOffset(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-mono font-semibold">15 Dec 2026</span>
              </div>

              {/* Dynamic 4D Construction Status Strip */}
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className="text-emerald-400">{activeCount} Sites Active Today</strong>
                </span>
                <span className="text-slate-400">{plannedCount} Upcoming</span>
                <span className="text-slate-500">{completedCount} Restored Roadways</span>
                {collisionCountToday > 0 ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    {collisionCountToday} Conflict Active
                  </span>
                ) : (
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Clear Flow
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
