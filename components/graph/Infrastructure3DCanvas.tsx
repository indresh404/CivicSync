"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GraphNode, GraphEdge, InfrastructureGraphData } from "@/lib/graphData";
import { AlertTriangle, Compass, Layers, Zap, Flame, Radio, Droplets, ShieldCheck, Box } from "lucide-react";

interface Infrastructure3DCanvasProps {
  graphData: InfrastructureGraphData;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  hoveredNodeId: string | null;
  onHoverNode: (node: GraphNode | null, mousePos?: { x: number; y: number }) => void;
  autoOrbit: boolean;
  filterDepartment: string;
  filterStatus: string;
}

interface ParticleInfo {
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  offset: number;
  edgeId: string;
}

interface TubeInfo {
  mesh: THREE.Mesh;
  edge: GraphEdge;
  initialOpacity: number;
  glowColor: THREE.Color;
}

export default function Infrastructure3DCanvas({
  graphData,
  selectedNodeId,
  onSelectNode,
  hoveredNodeId,
  onHoverNode,
  autoOrbit,
  filterDepartment,
  filterStatus,
}: Infrastructure3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const nodeMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const tubeMeshesRef = useRef<Map<string, TubeInfo>>(new Map());
  const particlesRef = useRef<ParticleInfo[]>([]);
  const ringMeshesRef = useRef<THREE.Mesh[]>([]);

  // Camera lerp targets for smooth focus transition
  const cameraTargetRef = useRef<{
    active: boolean;
    camPos: THREE.Vector3;
    lookAt: THREE.Vector3;
    progress: number;
  }>({
    active: false,
    camPos: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    progress: 0,
  });

  // Track raycasting
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Focus camera smoothly on a target 3D coordinate
  const focusOnCoordinates = useCallback(
    (targetCoord: [number, number, number], distance: number = 26) => {
      if (!cameraRef.current || !controlsRef.current) return;
      const tVec = new THREE.Vector3(...targetCoord);
      const offset = new THREE.Vector3(distance * 0.7, distance * 0.5, distance * 0.7);
      const newCamPos = tVec.clone().add(offset);

      cameraTargetRef.current = {
        active: true,
        camPos: newCamPos,
        lookAt: tVec,
        progress: 0,
      };
    },
    []
  );

  // Initialize Three.js Scene, Camera, Controls, Lights & Spatial Grid
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#020617");
    scene.fog = new THREE.FogExp2("#020617", 0.007);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 1000);
    camera.position.set(0, 38, 75);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 220;
    controls.minDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // avoid going completely below floor
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight("#38bdf8", 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight("#ffffff", 1.8);
    dirLight1.position.set(45, 65, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight("#06b6d4", 0.9);
    dirLight2.position.set(-40, -20, -35);
    scene.add(dirLight2);

    const centerPointLight = new THREE.PointLight("#38bdf8", 2.2, 90);
    centerPointLight.position.set(0, 2, 0);
    scene.add(centerPointLight);

    // 6. Holographic Ground Grid (Communication of true spatial depth)
    const gridHelper = new THREE.GridHelper(160, 80, "#0284c7", "#1e293b");
    gridHelper.position.y = -16;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    scene.add(gridHelper);

    // Concentric depth rings on the floor
    const floorRingsGroup = new THREE.Group();
    floorRingsGroup.position.y = -15.8;
    floorRingsGroup.rotation.x = -Math.PI / 2;

    [22, 42, 65, 90].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.25, radius + 0.25, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#0369a1",
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      floorRingsGroup.add(ring);
    });
    scene.add(floorRingsGroup);

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update Auto-Orbit Setting
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoOrbit;
      controlsRef.current.autoRotateSpeed = 0.75;
    }
  }, [autoOrbit]);

  // Construct 3D Nodes, Curved Tubes & Animated Particle Trails
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous dynamic meshes
    nodeMeshesRef.current.forEach((group) => scene.remove(group));
    nodeMeshesRef.current.clear();

    tubeMeshesRef.current.forEach((info) => {
      scene.remove(info.mesh);
      info.mesh.geometry.dispose();
      (info.mesh.material as THREE.Material).dispose();
    });
    tubeMeshesRef.current.clear();

    particlesRef.current.forEach((p) => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    particlesRef.current = [];
    ringMeshesRef.current = [];

    // Filter nodes by department/status if needed
    const activeNodes = graphData.nodes.filter((node) => {
      if (filterDepartment !== "ALL" && node.department && node.department !== filterDepartment) {
        if (node.type !== "ROAD") return false;
      }
      if (filterStatus !== "ALL" && node.status && node.status !== filterStatus) {
        return false;
      }
      return true;
    });

    const activeNodeIdSet = new Set(activeNodes.map((n) => n.id));

    // 1. Build 3D Spherical Nodes
    activeNodes.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...node.position);

      const color = new THREE.Color(node.dept_color);

      if (node.type === "ROAD") {
        // A. Central Road Node: Translucent Dark Core + Glowing Outer Shell + Cyan Ring
        const coreGeo = new THREE.SphereGeometry(node.radius * 0.85, 32, 32);
        const coreMat = new THREE.MeshStandardMaterial({
          color: "#0f172a",
          roughness: 0.15,
          metalness: 0.9,
          emissive: "#0369a1",
          emissiveIntensity: 0.35,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.userData = { node, isNode: true };
        nodeGroup.add(coreMesh);

        // Glassy outer sphere
        const glassGeo = new THREE.SphereGeometry(node.radius, 32, 32);
        const glassMat = new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          roughness: 0.1,
          metalness: 0.2,
          transparent: true,
          opacity: 0.35,
          wireframe: false,
        });
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.userData = { node, isNode: true };
        nodeGroup.add(glassMesh);

        // Rotating bright cyan orbital ring
        const ringGeo = new THREE.TorusGeometry(node.radius * 1.35, 0.14, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          emissive: "#0284c7",
          emissiveIntensity: 1.2,
          roughness: 0.2,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.5;
        nodeGroup.add(ringMesh);
        ringMeshesRef.current.push(ringMesh);

        // Soft radial glow disc under road node
        const haloGeo = new THREE.RingGeometry(node.radius * 1.5, node.radius * 2.6, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: "#0284c7",
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.rotation.x = -Math.PI / 2;
        haloMesh.position.y = -node.radius - 0.2;
        nodeGroup.add(haloMesh);

      } else if (node.type === "DEPARTMENT") {
        // B. Department Node: Transparent glass shell + Glowing department colored core + orbital ring
        const coreGeo = new THREE.SphereGeometry(node.radius * 0.78, 28, 28);
        const coreMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.65,
          roughness: 0.25,
          metalness: 0.8,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.userData = { node, isNode: true };
        nodeGroup.add(coreMesh);

        const shellGeo = new THREE.SphereGeometry(node.radius, 28, 28);
        const shellMat = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.22,
          roughness: 0.1,
          metalness: 0.1,
        });
        const shellMesh = new THREE.Mesh(shellGeo, shellMat);
        shellMesh.userData = { node, isNode: true };
        nodeGroup.add(shellMesh);

        // Inclined orbital ring
        const ringGeo = new THREE.TorusGeometry(node.radius * 1.3, 0.08, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: color });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 3;
        ringMesh.rotation.y = Math.PI / 6;
        nodeGroup.add(ringMesh);
        ringMeshesRef.current.push(ringMesh);

      } else if (node.type === "CONFLICT") {
        // D. Conflict Node: Red glowing central sphere + concentric pulsing warning rings
        const coreGeo = new THREE.SphereGeometry(node.radius, 24, 24);
        const coreMat = new THREE.MeshStandardMaterial({
          color: "#ef4444",
          emissive: "#dc2626",
          emissiveIntensity: 1.6,
          roughness: 0.2,
          metalness: 0.5,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.userData = { node, isNode: true };
        nodeGroup.add(coreMesh);

        // Concentric warning rings
        [1.4, 1.85, 2.3].forEach((scale, rIdx) => {
          const warnRingGeo = new THREE.TorusGeometry(node.radius * scale, 0.08, 16, 48);
          const warnRingMat = new THREE.MeshBasicMaterial({
            color: "#f87171",
            transparent: true,
            opacity: 0.8 - rIdx * 0.25,
          });
          const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
          warnRing.rotation.x = (rIdx * Math.PI) / 4;
          warnRing.rotation.z = (rIdx * Math.PI) / 3;
          nodeGroup.add(warnRing);
          ringMeshesRef.current.push(warnRing);
        });

      } else if (node.type === "UTILITY") {
        // E. Subterranean Utility Node: Octahedron faceted crystal diamond
        const octGeo = new THREE.OctahedronGeometry(node.radius, 0);
        const octMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.7,
          wireframe: false,
        });
        const octMesh = new THREE.Mesh(octGeo, octMat);
        octMesh.userData = { node, isNode: true };
        nodeGroup.add(octMesh);

        const wireMat = new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.4 });
        const wireMesh = new THREE.Mesh(octGeo, wireMat);
        nodeGroup.add(wireMesh);

      } else {
        // C. Project Node: Glowing sphere + Status Indicator Ring
        const pGeo = new THREE.SphereGeometry(node.radius, 24, 24);
        const pMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.6,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.userData = { node, isNode: true };
        nodeGroup.add(pMesh);

        // Status indicator ring (Planned=Blue, Approved=Cyan, Ongoing=Orange, Completed=Green)
        const statusColors: Record<string, string> = {
          Planned: "#2563EB",
          Approved: "#06B6D4",
          Ongoing: "#F59E0B",
          Completed: "#10B981",
        };
        const sColor = statusColors[node.status || "Planned"] || "#38bdf8";

        const statusRingGeo = new THREE.TorusGeometry(node.radius * 1.35, 0.08, 12, 36);
        const statusRingMat = new THREE.MeshBasicMaterial({ color: sColor });
        const statusRing = new THREE.Mesh(statusRingGeo, statusRingMat);
        statusRing.rotation.x = Math.PI / 2.2;
        nodeGroup.add(statusRing);
        ringMeshesRef.current.push(statusRing);
      }

      scene.add(nodeGroup);
      nodeMeshesRef.current.set(node.id, nodeGroup);
    });

    // 2. Build 3D Parabolic Curved Tubes & Animated Light Particles
    const activeEdges = graphData.edges.filter(
      (e) => activeNodeIdSet.has(e.source_id) && activeNodeIdSet.has(e.target_id)
    );

    activeEdges.forEach((edge) => {
      const sNode = activeNodes.find((n) => n.id === edge.source_id);
      const tNode = activeNodes.find((n) => n.id === edge.target_id);
      if (!sNode || !tNode) return;

      const vS = new THREE.Vector3(...sNode.position);
      const vT = new THREE.Vector3(...tNode.position);

      // Compute Parabolic Control Point in genuine 3D space
      const vMid = vS.clone().add(vT).multiplyScalar(0.5);
      const dist = vS.distanceTo(vT);
      const dir = vT.clone().sub(vS).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const vCtrl = vMid.clone();
      vCtrl.y += edge.curveHeight;
      vCtrl.addScaledVector(perp, edge.sidewaysOffset);

      // Construct Smooth 3D Quadratic Bézier Curve
      const curve = new THREE.QuadraticBezierCurve3(vS, vCtrl, vT);

      // Generate Real 3D Tube Geometry
      const tubeGeo = new THREE.TubeGeometry(curve, 48, edge.tubeRadius, 8, false);
      const edgeColor = new THREE.Color(edge.color);
      const glowColor = new THREE.Color(edge.glowColor);

      const isConflict = edge.type === "PROJECT_TO_CONFLICT";

      const tubeMat = new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: glowColor,
        emissiveIntensity: isConflict ? 1.4 : 0.85,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: isConflict ? 0.95 : 0.8,
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);

      tubeMeshesRef.current.set(edge.id, {
        mesh: tubeMesh,
        edge,
        initialOpacity: tubeMat.opacity,
        glowColor,
      });

      // Animated Light Particles traveling along the 3D curve
      const particleGeo = new THREE.SphereGeometry(isConflict ? 0.45 : 0.32, 12, 12);
      const particleMat = new THREE.MeshBasicMaterial({
        color: isConflict ? "#ffffff" : glowColor,
      });

      for (let i = 0; i < edge.particleCount; i++) {
        const pMesh = new THREE.Mesh(particleGeo, particleMat);
        const offset = i / edge.particleCount;
        const initialPos = curve.getPointAt(offset);
        pMesh.position.copy(initialPos);
        scene.add(pMesh);

        particlesRef.current.push({
          mesh: pMesh,
          curve,
          speed: edge.particleSpeed * (isConflict ? 1.4 : 1.0),
          offset,
          edgeId: edge.id,
        });
      }
    });

  }, [graphData, filterDepartment, filterStatus]);

  // Handle Focus Transition when selectedNodeId changes
  useEffect(() => {
    if (!selectedNodeId) return;
    const targetNode = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (targetNode) {
      focusOnCoordinates(targetNode.position, targetNode.type === "ROAD" ? 34 : 24);
    }
  }, [selectedNodeId, graphData.nodes, focusOnCoordinates]);

  // Main 60 FPS Render & Animation Loop
  useEffect(() => {
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // 1. Rotate Node Orbital Rings
      ringMeshesRef.current.forEach((ring, idx) => {
        ring.rotation.z += (idx % 2 === 0 ? 0.015 : -0.018);
      });

      // 2. Animate Light Particles along 3D Parabolic Curves
      const isAnyFocus = !!(selectedNodeId || hoveredNodeId);
      const focusId = selectedNodeId || hoveredNodeId;

      particlesRef.current.forEach((p) => {
        // Boost particle speed if its edge is connected to active focus node
        const edgeInfo = tubeMeshesRef.current.get(p.edgeId);
        const isIncident =
          isAnyFocus &&
          edgeInfo &&
          (edgeInfo.edge.source_id === focusId || edgeInfo.edge.target_id === focusId);

        const currentSpeed = isIncident ? p.speed * 2.2 : p.speed;
        const t = (elapsedTime * currentSpeed * 0.28 + p.offset) % 1.0;
        const pos = p.curve.getPointAt(t);
        p.mesh.position.copy(pos);

        // Particle scale animation: pulse slightly near curve midpoint apex
        const pulse = 1.0 + Math.sin(t * Math.PI) * 0.45;
        p.mesh.scale.setScalar(isIncident ? pulse * 1.4 : pulse);
      });

      // 3. Smooth Camera Lerp Transition when focusing on nodes
      if (cameraTargetRef.current.active && cameraRef.current && controlsRef.current) {
        const ct = cameraTargetRef.current;
        ct.progress += delta * 1.8; // smoothly transitions over ~0.8s
        const easeT = Math.min(1.0, 1 - Math.pow(1 - ct.progress, 3)); // cubic ease-out

        cameraRef.current.position.lerp(ct.camPos, 0.08);
        controlsRef.current.target.lerp(ct.lookAt, 0.08);

        if (ct.progress >= 1.0) {
          ct.active = false;
        }
      }

      // 4. Update Controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // 5. Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [selectedNodeId, hoveredNodeId]);

  // Hover & Selection Highlight Engine (Dimm unrelated nodes, boost active paths)
  useEffect(() => {
    const focusId = selectedNodeId || hoveredNodeId;

    // A. Update Nodes Opacity & Scale
    nodeMeshesRef.current.forEach((group, nodeId) => {
      const isSelected = selectedNodeId === nodeId;
      const isHovered = hoveredNodeId === nodeId;
      const isTarget = nodeId === focusId;

      // Check if this node is connected to the focused node
      let isConnected = false;
      if (focusId) {
        tubeMeshesRef.current.forEach((info) => {
          if (
            (info.edge.source_id === focusId && info.edge.target_id === nodeId) ||
            (info.edge.target_id === focusId && info.edge.source_id === nodeId)
          ) {
            isConnected = true;
          }
        });
      }

      const shouldDim = focusId && !isTarget && !isConnected;

      group.children.forEach((child) => {
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = shouldDim ? 0.22 : 1.0;
        }
      });

      // Scale target node up
      if (isTarget) {
        group.scale.setScalar(1.22);
      } else {
        group.scale.setScalar(1.0);
      }
    });

    // B. Update Curved Tubes Opacity & Emissive Intensity
    tubeMeshesRef.current.forEach((info) => {
      const isIncident =
        focusId && (info.edge.source_id === focusId || info.edge.target_id === focusId);
      const shouldDim = focusId && !isIncident;

      const mat = info.mesh.material as THREE.MeshStandardMaterial;
      if (isIncident) {
        mat.opacity = 1.0;
        mat.emissiveIntensity = 1.8;
      } else if (shouldDim) {
        mat.opacity = 0.12;
        mat.emissiveIntensity = 0.2;
      } else {
        mat.opacity = info.initialOpacity;
        mat.emissiveIntensity = info.edge.type === "PROJECT_TO_CONFLICT" ? 1.4 : 0.85;
      }
    });
  }, [selectedNodeId, hoveredNodeId]);

  // Raycasting on Mouse Move & Click
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mousePosRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);

    // Raycast against all node groups
    const interactables: THREE.Object3D[] = [];
    nodeMeshesRef.current.forEach((grp) => {
      grp.children.forEach((c) => {
        if (c.userData && c.userData.isNode) interactables.push(c);
      });
    });

    const intersects = raycasterRef.current.intersectObjects(interactables, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const node = hit.userData.node as GraphNode;
      if (node) {
        containerRef.current.style.cursor = "pointer";
        onHoverNode(node, { x: e.clientX, y: e.clientY });
        return;
      }
    }

    containerRef.current.style.cursor = "grab";
    onHoverNode(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const interactables: THREE.Object3D[] = [];
    nodeMeshesRef.current.forEach((grp) => {
      grp.children.forEach((c) => {
        if (c.userData && c.userData.isNode) interactables.push(c);
      });
    });

    const intersects = raycasterRef.current.intersectObjects(interactables, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const node = hit.userData.node as GraphNode;
      if (node) {
        onSelectNode(node.id === selectedNodeId ? null : node);
        return;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className="w-full h-full relative cursor-grab active:cursor-grabbing outline-none overflow-hidden select-none"
    />
  );
}
