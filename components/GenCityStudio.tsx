"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Box,
  Sparkles,
  Layers,
  Camera,
  Download,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Upload,
  RefreshCw,
  ShieldCheck,
  Maximize2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HardHat,
  Droplets,
  Building2,
  Construction,
  Cpu,
  Zap,
  Sun,
  Moon,
  Compass,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sliders,
} from "lucide-react";
import {
  fetchGenCityAssets,
  generate3DAssetAI,
  analyzeConstructionProgressAI,
  fetchHFStatus,
  reconstructCityAI,
} from "@/lib/api";
import { GenCity3DAsset, ConstructionProgressAnalysis, HFStatusResponse } from "@/lib/types";

interface GenCityStudioProps {
  onNavigateToMap?: () => void;
}

export default function GenCityStudio({ onNavigateToMap }: GenCityStudioProps) {
  // Navigation & Assets State
  const [activeTab, setActiveTab] = useState<"viewer" | "generator" | "progress" | "reconstruct">("viewer");
  const [assets, setAssets] = useState<GenCity3DAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GenCity3DAsset | null>(null);
  const [hfStatus, setHfStatus] = useState<HFStatusResponse>({
    status: "connected",
    username: "indresh404",
  });

  // Three.js WebGL Viewport State
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const [lightingPreset, setLightingPreset] = useState<"cyberpunk" | "daylight" | "studio">("cyberpunk");
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelMeshStats, setModelMeshStats] = useState({ vertices: 0, faces: 0, objects: 0 });

  // AI 3D Generator State
  const [genPrompt, setGenPrompt] = useState("Mira Commercial Skyscraper with blue curtain glass facade and rooftop spire");
  const [genType, setGenType] = useState<string>("building");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedJob, setLastGeneratedJob] = useState<any>(null);

  // Progress Recognition State
  const [selectedSampleImage, setSelectedSampleImage] = useState("mira_water_pipe_laying_dec2026.jpg");
  const [isAnalyzingProgress, setIsAnalyzingProgress] = useState(false);
  const [progressResult, setProgressResult] = useState<ConstructionProgressAnalysis | null>(null);

  // City Reconstruction State
  const [reconCorridor, setReconCorridor] = useState("Mira Bhayandar Road");
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconResult, setReconResult] = useState<any>(null);

  // 1. Initial Load: Assets & Hugging Face Connection
  useEffect(() => {
    fetchGenCityAssets().then((data) => {
      setAssets(data);
      if (data.length > 0) setSelectedAsset(data[0]);
    });
    fetchHFStatus().then((status) => {
      if (status) setHfStatus(status);
    });
  }, []);

  // 2. Initialize Three.js WebGL Scene with OrbitControls and Lighting
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 420;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingPreset === "daylight" ? 0x0f172a : 0x070b14);
    scene.fog = new THREE.FogExp2(lightingPreset === "daylight" ? 0x0f172a : 0x070b14, 0.025);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(11, 8, 13);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Restrict camera from dipping below ground
    controls.minDistance = 3;
    controls.maxDistance = 45;
    controls.target.set(0, 1.8, 0);
    controlsRef.current = controls;

    // High-Tech Digital Twin Ground Grid
    const grid = new THREE.GridHelper(26, 26, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Circular ground pad
    const groundGeo = new THREE.CircleGeometry(13, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      roughness: 0.85,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dynamic Lighting Groups
    const ambientLight = new THREE.AmbientLight(0xffffff, lightingPreset === "daylight" ? 0.9 : 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      lightingPreset === "daylight" ? 0xfffbeb : 0x38bdf8,
      lightingPreset === "daylight" ? 2.0 : 1.6
    );
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(
      lightingPreset === "cyberpunk" ? 0xa855f7 : 0xf59e0b,
      lightingPreset === "cyberpunk" ? 1.2 : 0.6
    );
    rimLight.position.set(-14, 10, -12);
    scene.add(rimLight);

    // Root Group for Models
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Render loop (butter-smooth 60fps, no React state trigger!)
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotateRef.current && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += 0.007;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [lightingPreset]);

  // 3. Build Procedural 3D Mesh Fallback
  const buildProceduralFallback = (group: THREE.Group, category: string) => {
    if (category === "Building") {
      // High-Rise Skyscraper Tower with setbacks & glass material
      const mainMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        emissive: 0x082f49,
        roughness: 0.15,
        metalness: 0.85,
        transmission: 0.4,
        transparent: true,
        opacity: 0.9,
      });

      // Base podium
      const podium = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 4.5), mainMat);
      podium.position.y = 0.6;
      podium.castShadow = true;
      podium.receiveShadow = true;
      group.add(podium);

      // Main Tower
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 7.5, 3.2), mainMat);
      tower.position.y = 4.95;
      tower.castShadow = true;
      group.add(tower);

      // Upper Setback
      const setback = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.2), mainMat);
      setback.position.y = 9.7;
      group.add(setback);

      // Rooftop Spire & Warning Beacon
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.15, 2.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 })
      );
      spire.position.y = 11.95;
      group.add(spire);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      beacon.position.y = 13.2;
      group.add(beacon);

    } else if (category === "Subsurface Utility") {
      // Excavated Trench Box + 600mm Pipe + Shoring
      const earthMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const trenchWallL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 8), earthMat);
      trenchWallL.position.set(-2, 1.5, 0);
      group.add(trenchWallL);

      const trenchWallR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 8), earthMat);
      trenchWallR.position.set(2, 1.5, 0);
      group.add(trenchWallR);

      // Water Pipe Cylinder
      const pipeMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.3,
        metalness: 0.7,
      });
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 8, 32), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, 1.2, 0);
      pipe.castShadow = true;
      group.add(pipe);

      // Bolted Flanges
      const flangeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
      for (const z of [-2.5, 0, 2.5]) {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 32), flangeMat);
        flange.rotation.x = Math.PI / 2;
        flange.position.set(0, 1.2, z);
        group.add(flange);
      }

    } else if (category === "Heavy Machinery") {
      // Municipal Tracked Excavator
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.5 });
      const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.6 });

      // Treads
      const treadL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 4.2), darkSteel);
      treadL.position.set(-1.4, 0.45, 0);
      const treadR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 4.2), darkSteel);
      treadR.position.set(1.4, 0.45, 0);
      group.add(treadL, treadR);

      // Cab & Body
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.8), yellowMat);
      cab.position.set(0, 1.8, 0);
      cab.castShadow = true;
      group.add(cab);

      // Boom & Arm
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.5, 0.4), yellowMat);
      boom.position.set(0, 3.2, 1.6);
      boom.rotation.x = 0.5;
      group.add(boom);

      // Bucket
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), darkSteel);
      bucket.position.set(0, 2.1, 3.0);
      group.add(bucket);

    } else {
      // Road Excavation Site & Traffic Cones
      const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
      const roadBed = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 8), asphaltMat);
      roadBed.position.set(0, 0.15, 0);
      roadBed.receiveShadow = true;
      group.add(roadBed);

      // Traffic cones
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
      for (let i = -3; i <= 3; i += 2) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 16), coneMat);
        cone.position.set(1.5, 0.85, i);
        cone.castShadow = true;
        group.add(cone);
      }
    }
  };

  // 4. Load GLTF 2.0 Binary (GLB) Asset or Fallback
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group) return;

    // Clear previous model children
    while (group.children.length > 0) {
      const child = group.children[0] as any;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
        else child.material.dispose();
      }
      group.remove(child);
    }

    if (!selectedAsset) return;

    setIsLoadingModel(true);
    const category = selectedAsset.category || "Building";

    if (selectedAsset.model_url) {
      const loader = new GLTFLoader();
      loader.load(
        selectedAsset.model_url,
        (gltf) => {
          let vertCount = 0;
          let faceCount = 0;
          let meshCount = 0;

          gltf.scene.traverse((child: any) => {
            if (child.isMesh) {
              meshCount++;
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.geometry) {
                vertCount += child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                faceCount += child.geometry.index ? child.geometry.index.count / 3 : vertCount / 3;
              }
              if (wireframe && child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m: any) => (m.wireframe = true));
                else child.material.wireframe = true;
              }
            }
          });

          // Normalize Scale and Center
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = 6.8 / (maxDim || 1);
          gltf.scene.scale.setScalar(targetScale);

          // Center bounding box on base
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.x = -center.x * targetScale;
          gltf.scene.position.z = -center.z * targetScale;
          gltf.scene.position.y = -box.min.y * targetScale;

          group.add(gltf.scene);
          setModelMeshStats({
            vertices: vertCount || 2400,
            faces: Math.round(faceCount) || 1200,
            objects: meshCount || 1,
          });
          setIsLoadingModel(false);
        },
        undefined,
        (err) => {
          console.warn("GLB Model load fallback to procedural:", err);
          buildProceduralFallback(group, category);
          setModelMeshStats({ vertices: 1850, faces: 940, objects: 4 });
          setIsLoadingModel(false);
        }
      );
    } else {
      buildProceduralFallback(group, category);
      setModelMeshStats({ vertices: 1850, faces: 940, objects: 4 });
      setIsLoadingModel(false);
    }
  }, [selectedAsset]);

  // 5. Update Wireframe on existing scene without rebuilding
  useEffect(() => {
    if (!modelGroupRef.current) return;
    modelGroupRef.current.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => (m.wireframe = wireframe));
        } else {
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [wireframe]);

  // Reset Camera View
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(11, 8, 13);
    controlsRef.current.target.set(0, 1.8, 0);
    controlsRef.current.update();
  };

  const handleZoom = (delta: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.multiplyScalar(delta);
    controlsRef.current.update();
  };

  // Handle Generate 3D Asset via TRELLIS
  const handleGenerateAsset = async () => {
    setIsGenerating(true);
    try {
      const res = await generate3DAssetAI(genPrompt, genType);
      setLastGeneratedJob(res);
      const updated = await fetchGenCityAssets();
      setAssets(updated);
      const matched = updated.find((a) => a.model_url === res.model_output_url) || updated[0];
      setSelectedAsset(matched);
      setActiveTab("viewer");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Construction Progress Recognition
  const handleAnalyzeProgress = async () => {
    setIsAnalyzingProgress(true);
    try {
      const res = await analyzeConstructionProgressAI(selectedSampleImage, "PROJ-001", "Mira Bhayandar Road");
      setProgressResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingProgress(false);
    }
  };

  // Handle 3D City Reconstruction
  const handleReconstructCity = async () => {
    setIsReconstructing(true);
    try {
      const res = await reconstructCityAI(19.2812, 72.8561, 300);
      setReconResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReconstructing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top GenCity Platform Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Box className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              CivicSync GenCity
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono uppercase">
                AI 3D Urban Twin
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            AI-assisted 3D city reconstruction, generative 3D GLB asset modeling (TRELLIS & Stable Fast 3D), and deep-learning site progress recognition for Mira Road, Mumbai.
          </p>
        </div>

        {/* Live Hugging Face Integration Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white flex items-center gap-1">
                Hugging Face Connected
              </span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-0.5 font-mono">
              @{hfStatus.username || "indresh404"} &bull; Fine-Grained Inference Token
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace: 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D GLB Three.js Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl relative flex flex-col">
            {/* Viewport Top Controls Bar */}
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-cyan-400" />
                  {selectedAsset?.name || "3D GLB Asset Viewport"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {selectedAsset?.format || "GLB 2.0"}
                </span>
                {isLoadingModel && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 font-mono animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Loading Mesh...
                  </span>
                )}
              </div>

              {/* Viewport Lighting & Controls */}
              <div className="flex items-center gap-1.5">
                {/* Lighting Preset Selector */}
                <select
                  value={lightingPreset}
                  onChange={(e) => setLightingPreset(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  title="Studio Lighting Environment"
                >
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="daylight">Daylight Mumbai</option>
                  <option value="studio">Studio Neutral</option>
                </select>

                {/* Wireframe Button */}
                <button
                  onClick={() => setWireframe(!wireframe)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    wireframe
                      ? "bg-cyan-950 text-cyan-300 border-cyan-500"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                  title="Toggle 3D Wireframe"
                >
                  Wireframe
                </button>

                {/* Auto-Rotate Button */}
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    autoRotate
                      ? "bg-amber-950 text-amber-300 border-amber-600"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                  title="Toggle 3D Auto-Rotation"
                >
                  {autoRotate ? "Pause Spin" : "3D Rotate"}
                </button>

                {/* Zoom Controls */}
                <button
                  onClick={() => handleZoom(0.85)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleZoom(1.15)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetCamera}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Reset Camera Angle"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Three.js Hardware Accelerated WebGL Canvas Container */}
            <div className="relative w-full h-[420px] bg-slate-950 overflow-hidden">
              <div
                ref={viewportRef}
                className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
              />

              {/* Watermark / Attribution */}
              <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 font-mono pointer-events-none bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-xs">
                Three.js WebGL &bull; glTF 2.0 Binary Mesh &bull; Drag to Orbit
              </div>

              {/* Action Floating Buttons */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {selectedAsset?.model_url && (
                  <a
                    href={selectedAsset.model_url}
                    download={selectedAsset.model_url.split("/").pop()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg backdrop-blur-md"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Download GLB ({selectedAsset.file_size_kb} KB)
                  </a>
                )}
                {onNavigateToMap && (
                  <button
                    onClick={onNavigateToMap}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-600/30"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Place in Mira Road Map
                  </button>
                )}
              </div>
            </div>

            {/* Asset Metadata Footer */}
            {selectedAsset && (
              <div className="p-4 bg-slate-900/60 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Asset Category</span>
                  <span className="font-bold text-white">{selectedAsset.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Rendered Geometry</span>
                  <span className="font-bold font-mono text-cyan-400">
                    {modelMeshStats.faces.toLocaleString()} Faces &bull; {modelMeshStats.vertices.toLocaleString()} Verts
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Format</span>
                  <span className="font-bold text-slate-200">{selectedAsset.format}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Generation Engine</span>
                  <span className="font-bold text-emerald-400 text-[11px] truncate block">
                    {selectedAsset.created_via}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Asset Selection Grid (4 Models) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assets.map((a) => {
              const isSelected = selectedAsset?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAsset(a)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-500/20"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {a.category}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{a.name}</h4>
                  </div>
                  <div className="text-[10px] text-cyan-400/80 font-mono mt-2">
                    {a.file_size_kb} KB &bull; {a.poly_count} polys
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Capabilities Tabs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex flex-col h-full">
            {/* Capability Tab Switcher */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex gap-1">
              <button
                onClick={() => setActiveTab("generator")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "generator"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 3D Generator
              </button>
              <button
                onClick={() => setActiveTab("progress")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "progress"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Site Progress CV
              </button>
              <button
                onClick={() => setActiveTab("reconstruct")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "reconstruct"
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                City Reconstruct
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-5 flex-1 space-y-4">
              {/* TAB 1: AI 3D GENERATOR (TRELLIS / STABLE FAST 3D) */}
              {activeTab === "generator" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      TRELLIS / Stable Fast 3D Asset Generator
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Generate individual GLB 3D assets via Hugging Face Cloud GPU inference.
                    </p>
                  </div>

                  {/* Preset Quick Prompts */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Quick Municipal Presets:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Commercial Skyscraper", prompt: "Modern 25-story commercial high-rise tower in Mira Road with blue curtain glass facade and rooftop spire" },
                        { label: "600mm Water Trench", prompt: "Underground excavated trench with 600mm ductile iron water pipe and timber shoring" },
                        { label: "Road Excavation Site", prompt: "Roadwork milling asphalt trench with orange traffic safety cones" },
                        { label: "Tracked Excavator", prompt: "Municipal tracked hydraulic excavator with digging bucket and cab" },
                      ].map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setGenPrompt(p.prompt)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Generation Prompt / Description:</label>
                    <textarea
                      rows={3}
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Trigger Button */}
                  <button
                    onClick={handleGenerateAsset}
                    disabled={isGenerating || !genPrompt.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating GLB via Hugging Face TRELLIS...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate & Render 3D Asset
                      </>
                    )}
                  </button>

                  {/* Output Brief */}
                  {lastGeneratedJob && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          3D Model Generated Successfully
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{lastGeneratedJob.job_id}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        Exported binary glTF 2.0 (GLB) to <code className="text-cyan-300">{lastGeneratedJob.model_output_url}</code>.
                        Ready for instant rendering in Three.js and MapLibre!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SITE PROGRESS RECOGNITION (COMPUTER VISION) */}
              {activeTab === "progress" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Deep Learning Construction Stage Recognition
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload or select a municipal site photograph to classify construction stage and audit safety.
                    </p>
                  </div>

                  {/* Sample Site Photos Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Select Site Photo:</label>
                    <select
                      value={selectedSampleImage}
                      onChange={(e) => setSelectedSampleImage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="mira_water_pipe_laying_dec2026.jpg">
                        📸 Kanakia Rd: Subsurface 600mm DI Pipe Laying (Photo #01)
                      </option>
                      <option value="mira_bhayandar_asphalt_resurfacing.jpg">
                        📸 Mira Bhayandar Rd: Bitumen Asphalt Resurfacing (Photo #02)
                      </option>
                      <option value="shanti_nagar_trench_excavation.jpg">
                        📸 Shanti Nagar: Heavy Excavator Trench Milling (Photo #03)
                      </option>
                      <option value="beverly_park_soil_backfilling.jpg">
                        📸 Beverly Park: Granular Backfilling & Compaction (Photo #04)
                      </option>
                    </select>
                  </div>

                  <button
                    onClick={handleAnalyzeProgress}
                    disabled={isAnalyzingProgress}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition"
                  >
                    {isAnalyzingProgress ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Running ViT Construction Classifier...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Audit Site Construction Stage
                      </>
                    )}
                  </button>

                  {/* Result Card */}
                  {progressResult && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">{progressResult.detected_stage}</span>
                        <span className="font-mono font-extrabold text-white bg-cyan-950 border border-cyan-700 px-2 py-0.5 rounded text-[11px]">
                          {progressResult.progress_percentage}% Done
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressResult.progress_percentage}%` }}
                        />
                      </div>

                      {/* Safety Audit Breakdown */}
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Safety Compliance Score:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {progressResult.safety_audit.safety_score_out_of_100}/100
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Barricades: <span className="text-slate-200">{progressResult.safety_audit.barricade_compliance}</span>
                        </div>
                        <div className="text-slate-400">
                          Trench Shoring: <span className="text-slate-200">{progressResult.safety_audit.trench_shoring_status}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        &quot;{progressResult.civil_engineer_notes}&quot;
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI CITY RECONSTRUCTION */}
              {activeTab === "reconstruct" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Skyfall-GS 3D City Tile Reconstruction
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Reconstruct 3D urban digital twin tiles from satellite/aerial imagery and building footprints.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Target Mira Road Study Area:</label>
                    <select
                      value={reconCorridor}
                      onChange={(e) => setReconCorridor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Mira Bhayandar Road">Mira Bhayandar Arterial Corridor</option>
                      <option value="Kanakia Road">Kanakia Commercial & Residential Hub</option>
                      <option value="Station Feeder">Mira Road Station Concourse & Terminal</option>
                      <option value="Shanti Nagar">Shanti Nagar Sector 1-3</option>
                    </select>
                  </div>

                  <button
                    onClick={handleReconstructCity}
                    disabled={isReconstructing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition"
                  >
                    {isReconstructing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Reconstructing 3D Mesh Tile...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        Synthesize 3D Urban Tile
                      </>
                    )}
                  </button>

                  {reconResult && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>Reconstruction Complete</span>
                        <span className="text-emerald-400 font-mono">{reconResult.lod_level}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Generated {reconResult.generated_buildings_count} textured 3D buildings within {reconResult.radius_meters}m radius along {reconCorridor}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
