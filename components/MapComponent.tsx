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
  Download,
  CheckCircle2,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { formatDate } from "@/lib/utils";

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

const STYLE_OPTIONS = [
  { id: "liberty", label: "OpenFreeMap Liberty (3D Buildings)", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "dark", label: "Dark Matter 3D (Command Center)", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
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

interface InMap3DViewerProps {
  project: Project;
  onClose: () => void;
  onFlyToSite?: () => void;
}

function InMap3DViewer({ project, onClose, onFlyToSite }: InMap3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const [lightingPreset, setLightingPreset] = useState<"cyberpunk" | "daylight">("cyberpunk");
  const modelInfo = getProject3DModelInfo(project);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === "daylight" ? 0x0f172a : 0x070b14);
    scene.fog = new THREE.FogExp2(lightingPreset === "daylight" ? 0x0f172a : 0x070b14, 0.03);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 3;
    controls.maxDistance = 35;
    controls.target.set(0, 1.4, 0);

    // 3D Grid & ground
    const grid = new THREE.GridHelper(20, 20, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, lightingPreset === "daylight" ? 0.9 : 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(
      lightingPreset === "daylight" ? 0xfffbeb : 0x38bdf8,
      lightingPreset === "daylight" ? 2.0 : 1.5
    );
    dirLight.position.set(10, 20, 12);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.9);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Attempt to load GLTF 2.0 Binary (GLB)
    const loader = new GLTFLoader();
    loader.load(
      modelInfo.modelUrl,
      (gltf) => {
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (wireframe && child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m: any) => (m.wireframe = true));
              else child.material.wireframe = true;
            }
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6.0 / (maxDim || 1);
        gltf.scene.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.x = -center.x * scale;
        gltf.scene.position.z = -center.z * scale;
        gltf.scene.position.y = -box.min.y * scale;
        modelGroup.add(gltf.scene);
      },
      undefined,
      () => {
        // Fallback procedural model
        const geo = new THREE.CylinderGeometry(0.8, 0.8, 6, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, metalness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = 1;
        modelGroup.add(mesh);
      }
    );

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotateRef.current) {
        modelGroup.rotation.y += 0.007;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animId);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [modelInfo.modelUrl, lightingPreset]);

  // Handle wireframe dynamic update
  const toggleWireframe = () => {
    setWireframe((prev) => !prev);
  };

  return (
    <div className="absolute inset-2 sm:inset-6 z-40 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto text-white animate-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Box className="w-5 h-5 text-cyan-200" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                {project.title || project.name}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold uppercase">
                {modelInfo.tag}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">{project.road_name}</span>
              <span>&bull;</span>
              <span>{project.department}</span>
              <span>&bull;</span>
              <span className="font-mono text-emerald-400 font-bold">{modelInfo.depth}</span>
            </div>
          </div>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLightingPreset((l) => (l === "cyberpunk" ? "daylight" : "cyberpunk"))}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {lightingPreset === "cyberpunk" ? "Daylight Mode" : "Cyberpunk Mode"}
          </button>
          <button
            onClick={() => setAutoRotate((r) => !r)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              autoRotate ? "bg-amber-950 border-amber-600 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            {autoRotate ? "Pause Spin" : "Auto-Rotate"}
          </button>
          <button
            onClick={toggleWireframe}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              wireframe ? "bg-cyan-950 border-cyan-500 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            Wireframe
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition"
            title="Close 3D View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: 3D Canvas + Technical Civil Engineering Specs */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Three.js Interactive WebGL Viewport */}
        <div className="flex-1 h-full min-h-[300px] relative bg-slate-950">
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" />
          <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 font-mono pointer-events-none bg-slate-950/80 px-2.5 py-1 rounded-md backdrop-blur-xs border border-slate-800">
            Three.js WebGL &bull; glTF 2.0 Binary Mesh &bull; Orbit: Left Click & Drag | Pan: Right Click
          </div>
        </div>

        {/* Technical Civil Engineering Specifications Sidebar */}
        <div className="w-full lg:w-80 p-4 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between space-y-4 overflow-y-auto text-xs">
          <div className="space-y-3">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Subsurface Twin Specifications
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Excavation Depth Profile</span>
                <span className="font-bold text-cyan-300 font-mono text-sm">{modelInfo.depth}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Conduit & Asset Grade</span>
                <p className="text-slate-200 text-[11px] mt-0.5 leading-snug">{modelInfo.specs}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">MBMC Regulatory Cooldown</span>
                <span className="font-semibold text-emerald-400 text-[11px] block mt-0.5">{modelInfo.cooldown}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Sequencing Protocol</span>
                <span className="text-amber-300 text-[11px] font-semibold block mt-0.5">
                  Rule #1: Underground utilities precede surface road restoration
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {onFlyToSite && (
              <button
                type="button"
                onClick={onFlyToSite}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 text-xs"
              >
                <Compass className="w-4 h-4" />
                Fly Map Camera to Site
              </button>
            )}
            <a
              href={modelInfo.modelUrl}
              download={modelInfo.modelUrl.split("/").pop()}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5 text-xs"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download Binary glTF (.glb)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
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

  const [mapLoaded, setMapLoaded] = useState(false);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("liberty");

  // 3D Specific States
  const [is3DMode, setIs3DMode] = useState(true);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [showUtilities, setShowUtilities] = useState(true);
  const [showBuildings3D, setShowBuildings3D] = useState(true);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [subsurfaceXRay, setSubsurfaceXRay] = useState(false);
  const [inspected3DProject, setInspected3DProject] = useState<Project | null>(null);

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

  // Calculate active timeline date (Base: 1 Nov 2026)
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
                          12, "#1e293b",
                          25, "#0284c7",
                          50, "#06b6d4",
                          75, "#38bdf8"
                        ],
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-opacity": 0.9,
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

        // Build Conflict Connection Lines between clashes
        conflicts.forEach((c) => {
          const pA = projects.find((p) => p.id === c.project_a_id);
          const pB = projects.find((p) => p.id === c.project_b_id);
          const latA = pA?.lat ?? pA?.latitude;
          const lngA = pA?.lng ?? pA?.longitude;
          const latB = pB?.lat ?? pB?.latitude;
          const lngB = pB?.lng ?? pB?.longitude;

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
              "line-opacity": 0.35,
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
              "line-width": 6,
              "line-color": ["get", "color"],
              "line-opacity": 0.95,
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
              "circle-radius": 10,
              "circle-color": ["get", "color"],
              "circle-stroke-width": 3,
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
              "line-opacity": 0.4,
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
              "line-opacity": 0.9,
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
  }, [filteredProjects, mapLoaded, conflictingProjectIds, conflicts]);

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
      {/* Top Map Command Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-20 text-white">
        {/* Title & Place Search Box */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block leading-tight flex items-center gap-1.5">
                Mira Road 3D Digital Twin
                <span className="bg-cyan-950 text-cyan-400 text-[10px] px-1.5 py-0.2 rounded border border-cyan-800/60 font-semibold uppercase">
                  3D Extrusions Active
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                {filteredProjects.length} of {projects.length} municipal projects visible
              </span>
            </div>
          </div>

          {/* Place Search Input */}
          <div className="relative flex-1 max-w-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Mira Road street or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-slate-950/80 text-white placeholder-slate-400 transition"
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
            </div>

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

        {/* 3D Controls, Filters, & Style Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 3D / 2D Tilt Toggle Button */}
          <button
            type="button"
            onClick={toggle3DMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold transition text-xs shadow-xs ${
              is3DMode
                ? "bg-cyan-950 border-cyan-500/60 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle 3D Extruded Perspective View"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            {is3DMode ? "3D Pitch: 58°" : "2D Plan"}
          </button>

          {/* 3D Orbit Button */}
          <button
            type="button"
            onClick={toggleOrbitAnimation}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition text-xs shadow-xs ${
              isOrbiting
                ? "bg-amber-950 border-amber-500/60 text-amber-300 animate-pulse"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Slow 3D Orbit Camera Rotation"
          >
            <Orbit className="w-3.5 h-3.5 text-amber-400" />
            {isOrbiting ? "Orbiting..." : "3D Orbit"}
          </button>

          {/* Subsurface 3D Cutaway (X-Ray) Mode */}
          <button
            type="button"
            onClick={() => setSubsurfaceXRay(!subsurfaceXRay)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold transition text-xs shadow-xs ${
              subsurfaceXRay
                ? "bg-purple-950 border-purple-500 text-purple-300 ring-1 ring-purple-500 shadow-md shadow-purple-950"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle Subsurface 3D Cutaway (X-Ray view of underground utilities)"
          >
            <Layers3 className="w-3.5 h-3.5 text-purple-400" />
            {subsurfaceXRay ? "Subsurface: X-Ray ON" : "Subsurface Cutaway"}
          </button>

          {/* GenCity 3D Studio Button */}
          {onOpenGenCityStudio && (
            <button
              type="button"
              onClick={onOpenGenCityStudio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-300 font-bold transition text-xs shadow-md shadow-cyan-950"
              title="Open GenCity 3D AI Studio"
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>GenCity 3D Studio</span>
            </button>
          )}

          {/* Ask AI Copilot Button */}
          {onOpenAICopilot && (
            <button
              type="button"
              onClick={onOpenAICopilot}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition text-xs shadow-md shadow-cyan-600/25"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              Ask AI Copilot
            </button>
          )}

          {/* Conflict Filter */}
          <button
            type="button"
            onClick={() => setConflictOnly(!conflictOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold transition text-xs ${
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
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs"
          >
            <option value="ALL">All Departments</option>
            <option value="Roads Department">Roads Dept (Blue)</option>
            <option value="Water Department">Water Dept (Cyan)</option>
            <option value="Electricity Department">Electricity Dept (Amber)</option>
            <option value="Telecom Department">Telecom Dept (Purple)</option>
            <option value="Gas Department">Gas Dept (Pink)</option>
            <option value="Sewerage Department">Sewerage Dept (Emerald)</option>
          </select>

          {/* Vector Style Selector */}
          <select
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-xs"
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
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Fit view to all projects"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Mira Road Hotspots Corridor Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center gap-2 overflow-x-auto text-[11px] z-10 text-white">
        <span className="font-bold text-cyan-400 shrink-0 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-cyan-400" /> Mira Road 3D Hotspots:
        </span>
        {MIRA_ROAD_HOTSPOTS.map((spot) => (
          <button
            key={spot.name}
            type="button"
            onClick={() => flyToHotspot(spot)}
            className="px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-medium shrink-0 transition"
          >
            {spot.name}
          </button>
        ))}
      </div>

      {/* Map View Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[420px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* 3D Legend & Encoding Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl text-xs pointer-events-auto text-slate-300 transition-all">
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

        {/* Selected Project Floating Inspection Card */}
        {selectedProjectId && (() => {
          const activeProj = projects.find((p) => p.id === selectedProjectId);
          if (!activeProj) return null;
          const isClashing = conflictingProjectIds.has(activeProj.id);
          return (
            <div className="absolute top-3 right-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/40 shadow-2xl text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 pointer-events-auto text-white">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded text-[11px]">
                  {activeProj.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isClashing
                      ? "bg-red-950 text-red-300 border border-red-700"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  }`}
                >
                  {isClashing ? "Conflict Collision Flagged" : activeProj.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm leading-snug">
                  {activeProj.title || activeProj.name}
                </h4>
                <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-white">{activeProj.road_name}</span>
                  <span>•</span>
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

              {/* Direct In-Map 3D Digital Twin Viewer Button */}
              <button
                type="button"
                onClick={() => setInspected3DProject(activeProj)}
                className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-cyan-600/30"
              >
                <Box className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>View 3D Digital Twin Model</span>
              </button>

              {onSelectProject && (
                <button
                  type="button"
                  onClick={() => onSelectProject(activeProj)}
                  className="w-full mt-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 text-xs"
                >
                  <span>Open Full Specifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })()}

        {/* Interactive In-Map 3D Digital Twin Viewer Modal */}
        {inspected3DProject && (
          <InMap3DViewer
            project={inspected3DProject}
            onClose={() => setInspected3DProject(null)}
            onFlyToSite={() => {
              const lat = inspected3DProject.lat ?? inspected3DProject.latitude;
              const lng = inspected3DProject.lng ?? inspected3DProject.longitude;
              if (lat && lng && mapInstanceRef.current) {
                mapInstanceRef.current.flyTo({
                  center: [lng, lat],
                  zoom: 17,
                  pitch: 62,
                  bearing: -15,
                  duration: 1200,
                });
              }
              setInspected3DProject(null);
            }}
          />
        )}

        {/* Docked Time-Travel 4D Scrubber Bar */}
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
        </div>
      </div>
    </div>
  );
}
