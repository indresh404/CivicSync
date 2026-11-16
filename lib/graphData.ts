import { Project, Conflict } from "./types";

export type GraphNodeType = "ROAD" | "DEPARTMENT" | "PROJECT" | "CONFLICT" | "UTILITY";

export interface GraphNode {
  id: string;
  name: string;
  type: GraphNodeType;
  department?: string;
  dept_color: string;
  status?: string; // "Planned" | "Approved" | "Ongoing" | "Completed"
  severity?: "Critical" | "High" | "Medium" | "Low";
  road_name?: string;
  road_type?: string;
  start_date?: string;
  end_date?: string;
  position: [number, number, number]; // [x, y, z] in 3D world space
  radius: number;
  iconName?: string;
  degree: number;
  conflictId?: string;
  metadata: Record<string, any>;
}

export type GraphEdgeType =
  | "ROAD_TO_DEPT"
  | "ROAD_TO_PROJECT"
  | "DEPT_TO_PROJECT"
  | "PROJECT_TO_CONFLICT"
  | "PROJECT_TO_UTILITY"
  | "INTER_PROJECT_SYNERGY";

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  source_name: string;
  target_name: string;
  type: GraphEdgeType;
  color: string;
  glowColor: string;
  tubeRadius: number;
  curveHeight: number;
  sidewaysOffset: number;
  particleCount: number;
  particleSpeed: number;
  distance3D: number;
  label?: string;
  costAvoided?: number;
  metadata: Record<string, any>;
}

export interface InfrastructureGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedRoadName: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    roadNodesCount: number;
    deptNodesCount: number;
    projectNodesCount: number;
    conflictNodesCount: number;
    utilityNodesCount: number;
    activeConflicts: number;
    reworkSavingsINR: number;
  };
}

export const DEPT_THEMES: Record<string, { color: string; glow: string; icon: string }> = {
  "Roads Department": { color: "#2563EB", glow: "#3b82f6", icon: "Road" },
  "Water Department": { color: "#06B6D4", glow: "#22d3ee", icon: "Droplets" },
  "Electricity Department": { color: "#F59E0B", glow: "#fbbf24", icon: "Zap" },
  "Sewerage Department": { color: "#10B981", glow: "#34d399", icon: "ShieldAlert" },
  "Telecom Department": { color: "#8B5CF6", glow: "#a78bfa", icon: "Radio" },
  "Gas Department": { color: "#EC4899", glow: "#f472b6", icon: "Flame" },
  "Municipal": { color: "#64748B", glow: "#94a3b8", icon: "Building" },
};

export const MIRA_ROAD_MAIN_ROADS = [
  "Mira Bhayandar Road",
  "Kanakia Road",
  "Shanti Park Main Avenue",
  "Beverly Park Avenue",
  "Station Road (Mira Road East)",
  "Silver Park Residential Lane",
  "150 Feet Road",
];

export const REGISTERED_UTILITY_RECORDS = [
  {
    id: "UTIL-001",
    name: "600mm DI Potable Water Trunk Main",
    road_name: "Mira Bhayandar Road",
    department: "Water Department",
    dept_color: "#06B6D4",
    depth_m: 2.2,
    material: "Ductile Iron Class K9",
    installed_on: "2018-03-15",
  },
  {
    id: "UTIL-002",
    name: "150mm Carbon Steel PNG Gas Trunk",
    road_name: "Mira Bhayandar Road",
    department: "Gas Department",
    dept_color: "#EC4899",
    depth_m: 1.4,
    material: "Carbon Steel High-Pressure",
    installed_on: "2021-11-10",
  },
  {
    id: "UTIL-003",
    name: "11kV 3-Core XLPE Underground Power Duct",
    road_name: "Kanakia Road",
    department: "Electricity Department",
    dept_color: "#F59E0B",
    depth_m: 1.8,
    material: "Reinforced HDPE Conduit",
    installed_on: "2019-07-22",
  },
  {
    id: "UTIL-004",
    name: "96-Core Armored Optical Fiber Backhaul",
    road_name: "Silver Park Residential Lane",
    department: "Telecom Department",
    dept_color: "#8B5CF6",
    depth_m: 0.9,
    material: "Dielectric Armored OFC",
    installed_on: "2023-01-14",
  },
  {
    id: "UTIL-005",
    name: "1200x1000 Precast RCC Stormwater Box Drain",
    road_name: "Shanti Park Main Avenue",
    department: "Sewerage Department",
    dept_color: "#10B981",
    depth_m: 2.8,
    material: "M40 Precast Concrete",
    installed_on: "2016-05-18",
  },
];

export function buildInfrastructureGraph(
  projects: Project[],
  conflicts: Conflict[],
  selectedRoad: string = "Mira Bhayandar Road"
): InfrastructureGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgePairSet = new Set<string>();

  const nodeMap = new Map<string, GraphNode>();

  // 1. Central Road Node (The Anchor of the Radial 3D Universe at [0, 0, 0])
  const roadNode: GraphNode = {
    id: `road-${selectedRoad.replace(/\s+/g, "-").toLowerCase()}`,
    name: selectedRoad,
    type: "ROAD",
    dept_color: "#38bdf8",
    road_name: selectedRoad,
    road_type: "Arterial Corridor",
    position: [0, 0, 0],
    radius: 3.8,
    degree: 0,
    metadata: {
      headline: "Central Corridor Arterial Backbone",
      muncipalCode: "MBMC-CORR-01",
      city: "Mira Road (Mira-Bhayandar)",
    },
  };
  nodes.push(roadNode);
  nodeMap.set(roadNode.id, roadNode);

  // 2. Department Nodes (Orbiting Central Road radially at Radius ~ 22)
  const departments = [
    "Roads Department",
    "Water Department",
    "Electricity Department",
    "Sewerage Department",
    "Telecom Department",
    "Gas Department",
  ];

  const DEPT_RADIUS = 22;
  const deptNodeMap = new Map<string, GraphNode>();

  departments.forEach((deptName, idx) => {
    const angle = (idx / departments.length) * Math.PI * 2;
    // Radial position in X-Z plane, with slight vertical modulation
    const x = Math.cos(angle) * DEPT_RADIUS;
    const y = Math.sin(idx * 1.5) * 2.5; // slight staggered vertical wave
    const z = Math.sin(angle) * DEPT_RADIUS;

    const theme = DEPT_THEMES[deptName] || DEPT_THEMES["Municipal"];
    const dNode: GraphNode = {
      id: `dept-${deptName.replace(/\s+/g, "-").toLowerCase()}`,
      name: deptName,
      type: "DEPARTMENT",
      department: deptName,
      dept_color: theme.color,
      position: [x, y, z],
      radius: 2.7,
      degree: 0,
      metadata: {
        activeStaff: 14,
        inspectionStatus: "Active Oversight",
      },
    };
    nodes.push(dNode);
    nodeMap.set(dNode.id, dNode);
    deptNodeMap.set(deptName, dNode);

    // Edge from Central Road to Department
    const edgeId = `edge-road-${dNode.id}`;
    if (!edgePairSet.has(edgeId)) {
      edgePairSet.add(edgeId);
      edges.push({
        id: edgeId,
        source_id: roadNode.id,
        target_id: dNode.id,
        source_name: roadNode.name,
        target_name: dNode.name,
        type: "ROAD_TO_DEPT",
        color: theme.color,
        glowColor: theme.glow,
        tubeRadius: 0.18,
        curveHeight: 5.5,
        sidewaysOffset: (idx % 2 === 0 ? 1 : -1) * 2.5,
        particleCount: 3,
        particleSpeed: 0.45,
        distance3D: DEPT_RADIUS,
        label: `Corridor Coordination Channel`,
        metadata: {
          flowDirection: "Bilateral",
        },
      });
      roadNode.degree++;
      dNode.degree++;
    }
  });

  // 3. Project Nodes (Arranged in 3D around their departments and road alignment)
  // We prioritize projects related to selectedRoad, while placing others in background orbital shells
  const PROJECT_RADIUS_BASE = 42;
  const projectNodeMap = new Map<string, GraphNode>();

  // Filter or prioritize projects on selected road
  const roadProjects = projects.filter(
    (p) => (p.road_name || "").toLowerCase() === selectedRoad.toLowerCase()
  );
  const otherProjects = projects.filter(
    (p) => (p.road_name || "").toLowerCase() !== selectedRoad.toLowerCase()
  );

  // Group road projects by department
  const sortedProjects = [...roadProjects, ...otherProjects.slice(0, 12)];

  sortedProjects.forEach((proj, idx) => {
    const deptNode = deptNodeMap.get(proj.department) || deptNodeMap.get("Roads Department")!;
    const isOnActiveRoad = (proj.road_name || "").toLowerCase() === selectedRoad.toLowerCase();

    // Compute angular fan around the department node
    const deptAngle = Math.atan2(deptNode.position[2], deptNode.position[0]);
    const spreadAngle = (idx % 4 - 1.5) * 0.35;
    const distanceMult = isOnActiveRoad ? 1.0 : 1.35;
    const currentRadius = PROJECT_RADIUS_BASE * distanceMult;

    const x = Math.cos(deptAngle + spreadAngle) * currentRadius + (Math.sin(idx * 3) * 3);
    const y = (idx % 3 === 0 ? 4 : idx % 3 === 1 ? -4 : 0) + (isOnActiveRoad ? 2 : -2);
    const z = Math.sin(deptAngle + spreadAngle) * currentRadius + (Math.cos(idx * 3) * 3);

    const theme = DEPT_THEMES[proj.department] || DEPT_THEMES["Municipal"];
    const pNode: GraphNode = {
      id: proj.id,
      name: proj.title || proj.name || proj.id,
      type: "PROJECT",
      department: proj.department,
      dept_color: theme.color,
      status: proj.status || "Planned",
      road_name: proj.road_name,
      road_type: proj.road_type,
      start_date: proj.start_date,
      end_date: proj.end_date,
      position: [x, y, z],
      radius: isOnActiveRoad ? 2.1 : 1.7,
      degree: 0,
      metadata: {
        project_type: proj.project_type,
        active_conflicts: proj.active_conflicts_count || 0,
        has_conflicts: proj.has_conflicts || false,
        contractor: "MBMC Authorized Contractor",
      },
    };
    nodes.push(pNode);
    nodeMap.set(pNode.id, pNode);
    projectNodeMap.set(pNode.id, pNode);

    // Edge from Department to Project
    const deptEdgeId = `edge-dept-${deptNode.id}-${pNode.id}`;
    if (!edgePairSet.has(deptEdgeId)) {
      edgePairSet.add(deptEdgeId);
      const dist = Math.hypot(
        pNode.position[0] - deptNode.position[0],
        pNode.position[1] - deptNode.position[1],
        pNode.position[2] - deptNode.position[2]
      );
      edges.push({
        id: deptEdgeId,
        source_id: deptNode.id,
        target_id: pNode.id,
        source_name: deptNode.name,
        target_name: pNode.name,
        type: "DEPT_TO_PROJECT",
        color: theme.color,
        glowColor: theme.glow,
        tubeRadius: 0.14,
        curveHeight: Math.max(4, dist * 0.25),
        sidewaysOffset: ((idx % 3) - 1) * 2.2,
        particleCount: 2,
        particleSpeed: 0.55,
        distance3D: dist,
        label: `${proj.department} Execution`,
        metadata: {
          project_status: proj.status,
        },
      });
      deptNode.degree++;
      pNode.degree++;
    }

    // Direct road-to-project connection if on active road
    if (isOnActiveRoad) {
      const roadEdgeId = `edge-road-${pNode.id}`;
      if (!edgePairSet.has(roadEdgeId)) {
        edgePairSet.add(roadEdgeId);
        const dist = Math.hypot(...pNode.position);
        edges.push({
          id: roadEdgeId,
          source_id: roadNode.id,
          target_id: pNode.id,
          source_name: roadNode.name,
          target_name: pNode.name,
          type: "ROAD_TO_PROJECT",
          color: "#38bdf8",
          glowColor: "#0284c7",
          tubeRadius: 0.16,
          curveHeight: 7.0,
          sidewaysOffset: ((idx % 4) - 1.5) * 3,
          particleCount: 3,
          particleSpeed: 0.6,
          distance3D: dist,
          label: `Corridor Work Scope`,
          metadata: {
            road_name: proj.road_name,
          },
        });
        roadNode.degree++;
        pNode.degree++;
      }
    }
  });

  // 4. Conflict Nodes (Elevated in 3D space with High Arc Curvature & Concentric Warnings)
  conflicts.forEach((conf, cIdx) => {
    const pANode = projectNodeMap.get(conf.project_a_id);
    const pBNode = projectNodeMap.get(conf.project_b_id);

    if (pANode && pBNode) {
      // Place conflict node midway between the two conflicting projects, elevated vertically (Y + 12 to 16)
      const midX = (pANode.position[0] + pBNode.position[0]) / 2;
      const midZ = (pANode.position[2] + pBNode.position[2]) / 2;
      const elevatedY = Math.max(pANode.position[1], pBNode.position[1]) + 12 + (cIdx % 3) * 2;

      const isCritical = conf.severity_level === "High" || (conf.severity_level as any) === "Critical";
      const conflictNodeId = `conflict-${conf.id}`;

      const cNode: GraphNode = {
        id: conflictNodeId,
        name: `Conflict ${conf.id} (${conf.severity_level})`,
        type: "CONFLICT",
        dept_color: isCritical ? "#ef4444" : "#f97316",
        severity: isCritical ? "Critical" : "Medium",
        road_name: conf.road_name || selectedRoad,
        position: [midX, elevatedY, midZ],
        radius: 2.4,
        degree: 0,
        conflictId: conf.id,
        metadata: {
          calculated_distance: conf.calculated_distance,
          overlapping_days: conf.overlapping_days,
          suggested_sequence: conf.suggested_sequence,
          conflict_reason: conf.conflict_reason,
          project_a_name: pANode.name,
          project_b_name: pBNode.name,
          resolution: conf.resolution,
          rework_saved: 350000,
        },
      };
      nodes.push(cNode);
      nodeMap.set(cNode.id, cNode);

      // Connection from Project A to Conflict Node (Crimson High-Voltage Arc)
      const edgeAId = `edge-conf-${conf.id}-pA`;
      if (!edgePairSet.has(edgeAId)) {
        edgePairSet.add(edgeAId);
        const distA = Math.hypot(
          cNode.position[0] - pANode.position[0],
          cNode.position[1] - pANode.position[1],
          cNode.position[2] - pANode.position[2]
        );
        edges.push({
          id: edgeAId,
          source_id: pANode.id,
          target_id: cNode.id,
          source_name: pANode.name,
          target_name: cNode.name,
          type: "PROJECT_TO_CONFLICT",
          color: isCritical ? "#ef4444" : "#f97316",
          glowColor: isCritical ? "#dc2626" : "#ea580c",
          tubeRadius: 0.22,
          curveHeight: 8.5,
          sidewaysOffset: -3.5,
          particleCount: 5,
          particleSpeed: 0.85, // Faster energy pulse for conflicts
          distance3D: distA,
          costAvoided: 350000,
          label: `⚡ ${conf.severity_level} Collision (${Math.round(conf.calculated_distance)}m)`,
          metadata: {
            severity: conf.severity_level,
            overlapping_days: conf.overlapping_days,
          },
        });
        pANode.degree++;
        cNode.degree++;
      }

      // Connection from Project B to Conflict Node
      const edgeBId = `edge-conf-${conf.id}-pB`;
      if (!edgePairSet.has(edgeBId)) {
        edgePairSet.add(edgeBId);
        const distB = Math.hypot(
          cNode.position[0] - pBNode.position[0],
          cNode.position[1] - pBNode.position[1],
          cNode.position[2] - pBNode.position[2]
        );
        edges.push({
          id: edgeBId,
          source_id: pBNode.id,
          target_id: cNode.id,
          source_name: pBNode.name,
          target_name: cNode.name,
          type: "PROJECT_TO_CONFLICT",
          color: isCritical ? "#ef4444" : "#f97316",
          glowColor: isCritical ? "#dc2626" : "#ea580c",
          tubeRadius: 0.22,
          curveHeight: 8.5,
          sidewaysOffset: 3.5,
          particleCount: 5,
          particleSpeed: 0.85,
          distance3D: distB,
          costAvoided: 350000,
          label: `⚡ Sequencing Rule Enforced`,
          metadata: {
            severity: conf.severity_level,
            suggested_sequence: conf.suggested_sequence,
          },
        });
        pBNode.degree++;
        cNode.degree++;
      }
    }
  });

  // 5. Utility Nodes (Subsurface Infrastructure Nodes Placed at Negative Depth Y: -8 to -12)
  REGISTERED_UTILITY_RECORDS.forEach((uRec, uIdx) => {
    const angle = ((uIdx + 0.5) / REGISTERED_UTILITY_RECORDS.length) * Math.PI * 2;
    const UTILITY_RADIUS = 30;
    const x = Math.cos(angle) * UTILITY_RADIUS;
    const y = -10 - (uRec.depth_m * 1.5); // Subterranean depth profile
    const z = Math.sin(angle) * UTILITY_RADIUS;

    const uNode: GraphNode = {
      id: uRec.id,
      name: uRec.name,
      type: "UTILITY",
      department: uRec.department,
      dept_color: uRec.dept_color,
      road_name: uRec.road_name,
      position: [x, y, z],
      radius: 1.8,
      degree: 0,
      metadata: {
        depth_m: uRec.depth_m,
        material: uRec.material,
        installed_on: uRec.installed_on,
        is_registered: true,
      },
    };
    nodes.push(uNode);
    nodeMap.set(uNode.id, uNode);

    // Connect utility node to central road if road matches
    if ((uRec.road_name || "").toLowerCase() === selectedRoad.toLowerCase()) {
      const uEdgeId = `edge-util-${uNode.id}`;
      if (!edgePairSet.has(uEdgeId)) {
        edgePairSet.add(uEdgeId);
        const dist = Math.hypot(...uNode.position);
        edges.push({
          id: uEdgeId,
          source_id: roadNode.id,
          target_id: uNode.id,
          source_name: roadNode.name,
          target_name: uNode.name,
          type: "PROJECT_TO_UTILITY",
          color: uRec.dept_color,
          glowColor: uRec.dept_color,
          tubeRadius: 0.12,
          curveHeight: -4.0, // dips into subsurface
          sidewaysOffset: (uIdx % 2 === 0 ? 2 : -2),
          particleCount: 2,
          particleSpeed: 0.4,
          distance3D: dist,
          label: `Subsurface Asset Profile (-${uRec.depth_m}m)`,
          metadata: {
            depth_m: uRec.depth_m,
          },
        });
        roadNode.degree++;
        uNode.degree++;
      }
    }
  });

  const conflictCount = conflicts.length;
  const totalSavings = conflictCount * 350000;

  return {
    nodes,
    edges,
    selectedRoadName: selectedRoad,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      roadNodesCount: nodes.filter((n) => n.type === "ROAD").length,
      deptNodesCount: nodes.filter((n) => n.type === "DEPARTMENT").length,
      projectNodesCount: nodes.filter((n) => n.type === "PROJECT").length,
      conflictNodesCount: nodes.filter((n) => n.type === "CONFLICT").length,
      utilityNodesCount: nodes.filter((n) => n.type === "UTILITY").length,
      activeConflicts: conflictCount,
      reworkSavingsINR: totalSavings,
    },
  };
}
