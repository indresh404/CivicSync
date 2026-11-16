import { Project, Conflict } from "./types";

export interface MeshNode {
  id: string;
  name: string;
  department: string;
  dept_color: string;
  lat: number;
  lng: number;
  road_name: string;
  road_type: string;
  status: string;
  start_date: string;
  end_date: string;
  has_conflict: boolean;
  project_type: string;
  category: "project" | "twin_asset";
  degree: number;
  connected_node_ids: string[];
}

export interface MeshLink {
  id: string;
  source_id: string;
  target_id: string;
  source_name: string;
  target_name: string;
  source_dept: string;
  target_dept: string;
  source_coords: [number, number]; // [lng, lat]
  target_coords: [number, number]; // [lng, lat]
  type: "CONFLICT" | "CORRIDOR" | "JOINT_TRENCH" | "GRID";
  severity?: "High" | "Medium" | "Low";
  distance_m: number;
  overlapping_days?: number;
  suggested_sequence?: string;
  cost_avoided_inr: number;
  color: string;
  glow_color: string;
  label: string;
  description: string;
}

export interface MeshGraph {
  nodes: MeshNode[];
  links: MeshLink[];
  stats: {
    total_nodes: number;
    total_links: number;
    conflict_links: number;
    corridor_links: number;
    joint_trench_links: number;
    grid_links: number;
    total_savings_inr: number;
    mesh_sync_score: number;
  };
}

const DEPT_COLORS: Record<string, string> = {
  "Roads Department": "#2563EB",
  "Water Department": "#06B6D4",
  "Electricity Department": "#F59E0B",
  "Sewerage Department": "#10B981",
  "Telecom Department": "#8B5CF6",
  "Gas Department": "#EC4899",
  Other: "#64748B",
};

// Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function buildConstructionMesh(
  projects: Project[],
  conflicts: Conflict[],
  twinAssets: any[] = []
): MeshGraph {
  const nodeMap = new Map<string, MeshNode>();
  const links: MeshLink[] = [];
  const linkPairSet = new Set<string>();

  const conflictingProjectIds = new Set<string>();
  conflicts.forEach((c) => {
    if (c.resolution !== "Overridden" && c.status !== "Closed") {
      conflictingProjectIds.add(c.project_a_id);
      conflictingProjectIds.add(c.project_b_id);
    }
  });

  // 1. Ingest Projects as Nodes
  projects.forEach((p) => {
    const lat = p.lat ?? p.latitude;
    const lng = p.lng ?? p.longitude;
    if (lat && lng) {
      nodeMap.set(p.id, {
        id: p.id,
        name: p.name || p.title || p.id,
        department: p.department || "Municipal",
        dept_color: DEPT_COLORS[p.department] || "#3b82f6",
        lat,
        lng,
        road_name: p.road_name || "Mira Road Network",
        road_type: p.road_type || "Arterial",
        status: p.status || "Planned",
        start_date: p.start_date || "2026-11-01",
        end_date: p.end_date || "2026-11-30",
        has_conflict: conflictingProjectIds.has(p.id),
        project_type: p.project_type || "Civil Infrastructure",
        category: "project",
        degree: 0,
        connected_node_ids: [],
      });
    }
  });

  // 2. Ingest 3D Twin Assets as Nodes
  twinAssets.forEach((asset) => {
    if (asset.lat && asset.lng && !nodeMap.has(asset.id)) {
      nodeMap.set(asset.id, {
        id: asset.id,
        name: asset.name,
        department: asset.category,
        dept_color: asset.badgeColor || "#06b6d4",
        lat: asset.lat,
        lng: asset.lng,
        road_name: asset.road_name || "Mira Road",
        road_type: "Arterial",
        status: "Active 3D Twin",
        start_date: "2026-11-01",
        end_date: "2026-12-31",
        has_conflict: false,
        project_type: asset.category,
        category: "twin_asset",
        degree: 0,
        connected_node_ids: [],
      });
    }
  });

  function addLink(link: MeshLink) {
    const pairKey = [link.source_id, link.target_id].sort().join("<->");
    if (linkPairSet.has(pairKey)) return;
    linkPairSet.add(pairKey);
    links.push(link);

    const sNode = nodeMap.get(link.source_id);
    const tNode = nodeMap.get(link.target_id);
    if (sNode) {
      sNode.degree += 1;
      sNode.connected_node_ids.push(link.target_id);
    }
    if (tNode) {
      tNode.degree += 1;
      tNode.connected_node_ids.push(link.source_id);
    }
  }

  // 3. Build Conflict Clash Arcs (Highest Priority - Red / Orange Glowing Arcs)
  conflicts.forEach((c) => {
    const sNode = nodeMap.get(c.project_a_id);
    const tNode = nodeMap.get(c.project_b_id);
    if (sNode && tNode) {
      const dist = c.calculated_distance || haversineMeters(sNode.lat, sNode.lng, tNode.lat, tNode.lng);
      const isHigh = c.severity_level === "High" || c.severity_level === ("Critical" as any);
      addLink({
        id: `mesh-conf-${c.id}`,
        source_id: sNode.id,
        target_id: tNode.id,
        source_name: sNode.name,
        target_name: tNode.name,
        source_dept: sNode.department,
        target_dept: tNode.department,
        source_coords: [sNode.lng, sNode.lat],
        target_coords: [tNode.lng, tNode.lat],
        type: "CONFLICT",
        severity: isHigh ? "High" : "Medium",
        distance_m: dist,
        overlapping_days: c.overlapping_days || 12,
        suggested_sequence: c.suggested_sequence || "Underground utilities must precede surface resurfacing.",
        cost_avoided_inr: 350000,
        color: isHigh ? "#ef4444" : "#f97316",
        glow_color: isHigh ? "#dc2626" : "#ea580c",
        label: `⚡ ${isHigh ? "High" : "Medium"} Clash (${Math.round(dist)}m)`,
        description: `${c.conflict_reason || "Spatial-temporal conflict detected"}`,
      });
    }
  });

  // 4. Build Corridor Synergy Trunks (Arterial Backbone Links - Cyan)
  const roadGroups = new Map<string, MeshNode[]>();
  nodeMap.forEach((node) => {
    if (node.category === "project" && node.road_name) {
      const normRoad = node.road_name.trim();
      if (!roadGroups.has(normRoad)) {
        roadGroups.set(normRoad, []);
      }
      roadGroups.get(normRoad)!.push(node);
    }
  });

  roadGroups.forEach((groupNodes, road) => {
    if (groupNodes.length >= 2) {
      // Sort geographically along longitude to create continuous corridor trunk
      const sorted = [...groupNodes].sort((a, b) => a.lng - b.lng);
      for (let i = 0; i < sorted.length - 1; i++) {
        const nA = sorted[i];
        const nB = sorted[i + 1];
        const dist = haversineMeters(nA.lat, nA.lng, nB.lat, nB.lng);
        addLink({
          id: `mesh-corr-${nA.id}-${nB.id}`,
          source_id: nA.id,
          target_id: nB.id,
          source_name: nA.name,
          target_name: nB.name,
          source_dept: nA.department,
          target_dept: nB.department,
          source_coords: [nA.lng, nA.lat],
          target_coords: [nB.lng, nB.lat],
          type: "CORRIDOR",
          distance_m: dist,
          cost_avoided_inr: 150000,
          color: "#06b6d4",
          glow_color: "#0284c7",
          label: `🛣️ ${road} Trunk (${dist}m)`,
          description: `Linear corridor synchronization on ${road}. Coordinated traffic diversion and phased execution.`,
        });
      }
    }
  });

  // 5. Build Joint Trenching Channels (Subsurface Co-location Links - Emerald Neon)
  const undergroundNodes = Array.from(nodeMap.values()).filter(
    (n) =>
      n.project_type === "Pipeline" ||
      n.project_type === "Cabling" ||
      n.project_type === "Sewerage" ||
      n.project_type === "Gas line" ||
      n.category === "twin_asset"
  );

  for (let i = 0; i < undergroundNodes.length; i++) {
    for (let j = i + 1; j < undergroundNodes.length; j++) {
      const uA = undergroundNodes[i];
      const uB = undergroundNodes[j];
      if (uA.department !== uB.department) {
        const dist = haversineMeters(uA.lat, uA.lng, uB.lat, uB.lng);
        // If within 250m and on compatible road / district
        if (dist <= 250 && dist > 5) {
          addLink({
            id: `mesh-jt-${uA.id}-${uB.id}`,
            source_id: uA.id,
            target_id: uB.id,
            source_name: uA.name,
            target_name: uB.name,
            source_dept: uA.department,
            target_dept: uB.department,
            source_coords: [uA.lng, uA.lat],
            target_coords: [uB.lng, uB.lat],
            type: "JOINT_TRENCH",
            distance_m: dist,
            cost_avoided_inr: 175000,
            color: "#10b981",
            glow_color: "#059669",
            label: `🔧 Joint Trench Channel (${dist}m)`,
            description: `Cross-utility co-location opportunity between ${uA.department} and ${uB.department}. Shared excavation saves ₹1.75L.`,
          });
        }
      }
    }
  }

  // 6. Build Inter-District Grid Backbone (Delaunay-style Proximity Web - Indigo)
  const allNodes = Array.from(nodeMap.values());
  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i];
    // Connect each node to its 2 nearest neighbors if not already connected
    const neighbors = allNodes
      .filter((other) => other.id !== node.id)
      .map((other) => ({
        other,
        dist: haversineMeters(node.lat, node.lng, other.lat, other.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    neighbors.forEach(({ other, dist }) => {
      if (dist < 600) {
        addLink({
          id: `mesh-grid-${node.id}-${other.id}`,
          source_id: node.id,
          target_id: other.id,
          source_name: node.name,
          target_name: other.name,
          source_dept: node.department,
          target_dept: other.department,
          source_coords: [node.lng, node.lat],
          target_coords: [other.lng, other.lat],
          type: "GRID",
          distance_m: dist,
          cost_avoided_inr: 50000,
          color: "#6366f1",
          glow_color: "#4f46e5",
          label: `🌐 District Mesh (${dist}m)`,
          description: `Municipal coordination grid backbone connecting adjacent project clusters.`,
        });
      }
    });
  }

  const nodes = Array.from(nodeMap.values());

  const conflictCount = links.filter((l) => l.type === "CONFLICT").length;
  const corridorCount = links.filter((l) => l.type === "CORRIDOR").length;
  const jointCount = links.filter((l) => l.type === "JOINT_TRENCH").length;
  const gridCount = links.filter((l) => l.type === "GRID").length;
  const totalSavings = links.reduce((sum, l) => sum + (l.cost_avoided_inr || 0), 0);

  return {
    nodes,
    links,
    stats: {
      total_nodes: nodes.length,
      total_links: links.length,
      conflict_links: conflictCount,
      corridor_links: corridorCount,
      joint_trench_links: jointCount,
      grid_links: gridCount,
      total_savings_inr: totalSavings,
      mesh_sync_score: Math.min(98.5, Math.round(85 + (corridorCount + jointCount) * 0.8)),
    },
  };
}
