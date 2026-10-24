import {
  Project,
  Conflict,
  AuditLog,
  DashboardStats,
  Acknowledgment,
  PreviewConflictResponse,
  RoadHistoryResponse,
  User,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// --- Seed Fallback Data (Deterministic Mira Road, Mumbai MMR) ---
const SEED_PROJECTS: Project[] = [
  {
    id: "PRJ-2026-001",
    title: "Mira Bhayandar Road Asphalt Resurfacing & Milling [Scenario A]",
    name: "Mira Bhayandar Road Asphalt Resurfacing & Milling [Scenario A]",
    department_id: "DEPT-ROADS",
    department: "Roads Department",
    project_type: "Resurfacing",
    geometry_type: "line",
    description: "Heavy-duty bituminous milling and mastic resurfacing on the central Mira Bhayandar arterial corridor.",
    road_name: "Mira Bhayandar Road",
    road_type: "Arterial",
    lat: 19.2848,
    lng: 72.8665,
    latitude: 19.2848,
    longitude: 72.8665,
    end_lat: 19.2855,
    end_lng: 72.8682,
    end_latitude: 19.2855,
    end_longitude: 72.8682,
    radius_m: 30,
    radius_meters: 30,
    start_date: "2026-11-05",
    end_date: "2026-11-20",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-15T10:30:00Z",
    is_overridden: false,
    created_at: "2026-10-15T10:00:00Z",
    updated_at: "2026-10-15T10:30:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-002",
    title: "Mira Bhayandar Road 600mm Potable Water Trunk Main [Scenario A]",
    name: "Mira Bhayandar Road 600mm Potable Water Trunk Main [Scenario A]",
    department_id: "DEPT-WATER",
    department: "Water Department",
    project_type: "Pipeline",
    geometry_type: "line",
    description: "Laying 600mm ductile iron potable water supply pipeline to enhance water pressure to Mira Road East.",
    road_name: "Mira Bhayandar Road",
    road_type: "Arterial",
    lat: 19.2850,
    lng: 72.8668,
    latitude: 19.2850,
    longitude: 72.8668,
    end_lat: 19.2857,
    end_lng: 72.8685,
    end_latitude: 19.2857,
    end_longitude: 72.8685,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-11-10",
    end_date: "2026-11-25",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-16T14:20:00Z",
    is_overridden: false,
    created_at: "2026-10-16T14:00:00Z",
    updated_at: "2026-10-16T14:20:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-003",
    title: "Silver Park 11kV Underground Power Ducting [Scenario B]",
    name: "Silver Park 11kV Underground Power Ducting [Scenario B]",
    department_id: "DEPT-ELEC",
    department: "Electricity Department",
    project_type: "Cabling",
    geometry_type: "point",
    description: "Underground ducting of power distribution lines to eliminate overhead wiring.",
    road_name: "Silver Park Residential Lane",
    road_type: "Residential",
    lat: 19.2828,
    lng: 72.8580,
    latitude: 19.2828,
    longitude: 72.8580,
    radius_m: 35,
    radius_meters: 35,
    start_date: "2026-11-15",
    end_date: "2026-11-30",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-17T09:15:00Z",
    is_overridden: false,
    created_at: "2026-10-17T09:00:00Z",
    updated_at: "2026-10-17T09:15:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-004",
    title: "Silver Park 5G Fiber Optic Micro-Trenching [Scenario B]",
    name: "Silver Park 5G Fiber Optic Micro-Trenching [Scenario B]",
    department_id: "DEPT-TELE",
    department: "Telecom Department",
    project_type: "Cabling",
    geometry_type: "point",
    description: "Micro-trenching for civic smart sensors and carrier-neutral fiber optic backhaul.",
    road_name: "Silver Park Residential Lane",
    road_type: "Residential",
    lat: 19.2830,
    lng: 72.8582,
    latitude: 19.2830,
    longitude: 72.8582,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-11-18",
    end_date: "2026-12-02",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-17T11:45:00Z",
    is_overridden: false,
    created_at: "2026-10-17T11:00:00Z",
    updated_at: "2026-10-17T11:45:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-000",
    title: "Kanakia Road Complete Asphalt Overlay [Completed 3 Mos Ago]",
    name: "Kanakia Road Complete Asphalt Overlay [Completed 3 Mos Ago]",
    department_id: "DEPT-ROADS",
    department: "Roads Department",
    project_type: "Resurfacing",
    geometry_type: "line",
    description: "Full-depth asphalt surfacing completed under municipal capital works budget.",
    road_name: "Kanakia Road",
    road_type: "Arterial",
    lat: 19.2780,
    lng: 72.8710,
    latitude: 19.2780,
    longitude: 72.8710,
    end_lat: 19.2790,
    end_lng: 72.8720,
    end_latitude: 19.2790,
    end_longitude: 72.8720,
    radius_m: 30,
    radius_meters: 30,
    start_date: "2026-06-15",
    end_date: "2026-07-20",
    status: "Completed",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-06-05T09:00:00Z",
    updated_at: "2026-07-20T17:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-005",
    title: "Kanakia Road Emergency Gas Pipeline Valve Replacement [Scenario C]",
    name: "Kanakia Road Emergency Gas Pipeline Valve Replacement [Scenario C]",
    department_id: "DEPT-GAS",
    department: "Gas Department",
    project_type: "Gas line",
    geometry_type: "point",
    description: "Medium-pressure gas line valve replacement due to safety inspection leak alerts.",
    road_name: "Kanakia Road",
    road_type: "Arterial",
    lat: 19.2785,
    lng: 72.8715,
    latitude: 19.2785,
    longitude: 72.8715,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-10-25",
    end_date: "2026-11-08",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-12T16:00:00Z",
    is_overridden: true,
    override_reason: "EMERGENCY SAFETY OVERRIDE: Certified underground valve seal failure detected by municipal gas audit. Immediate excavation authorized under Municipal Disaster Management Act.",
    override_by: "Rajesh Sharma (City Commissioner)",
    override_at: "2026-10-14T11:15:00Z",
    cooldown_justification: "Safety emergency: valve leak threatens residential society blocks nearby. Cold-patch restoration bond posted.",
    created_at: "2026-10-12T15:30:00Z",
    updated_at: "2026-10-14T11:15:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
];

let inMemoryProjects = [...SEED_PROJECTS];

export async function fetchProjects(filters?: {
  department?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  road_name?: string;
}): Promise<Project[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.department && filters.department !== "ALL") query.append("department", filters.department);
    if (filters?.status && filters.status !== "ALL") query.append("status", filters.status);
    if (filters?.date_from) query.append("date_from", filters.date_from);
    if (filters?.date_to) query.append("date_to", filters.date_to);
    if (filters?.road_name) query.append("road_name", filters.road_name);

    const res = await fetch(`${API_BASE_URL}/api/projects?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend unavailable, using local mock data:", err);
  }
  return inMemoryProjects;
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchProjectById failed, falling back:", err);
  }
  return inMemoryProjects.find((p) => p.id === id) || null;
}

export async function previewConflicts(payload: {
  project_type: string;
  geometry_type: string;
  lat: number;
  lng: number;
  end_lat?: number | null;
  end_lng?: number | null;
  radius_m: number;
  road_name: string;
  road_type: string;
  start_date: string;
  end_date: string;
  department?: string;
}): Promise<PreviewConflictResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/preview-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("previewConflicts fallback:", err);
  }
  return { has_conflicts: false, conflict_count: 0, conflicts: [] };
}

export async function createProject(projectData: Partial<Project>): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
    if (res.ok) {
      const created = await res.json();
      inMemoryProjects.unshift(created);
      return created;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to create project");
    }
  } catch (err: any) {
    console.warn("createProject error:", err);
    throw err;
  }
}

export async function submitProjectAndDetectConflicts(projectId: string): Promise<Conflict[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/submit`, {
      method: "POST",
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("submitProject fallback:", err);
  }
  return [];
}

export async function fetchConflicts(filters?: {
  status?: string;
  severity?: string;
}): Promise<Conflict[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.status && filters.status !== "ALL") query.append("status", filters.status);
    if (filters?.severity && filters.severity !== "ALL") query.append("severity", filters.severity);

    const res = await fetch(`${API_BASE_URL}/api/conflicts?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchConflicts fallback:", err);
  }
  return [];
}

export async function acknowledgeConflict(
  conflictId: string,
  department: string,
  acknowledged_by: string,
  note?: string
): Promise<Conflict> {
  const res = await fetch(`${API_BASE_URL}/api/conflicts/${conflictId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ department, acknowledged_by, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to acknowledge conflict");
  }
  return await res.json();
}

export async function proposeJointTrench(conflictId: string, notes?: string): Promise<Conflict> {
  const res = await fetch(`${API_BASE_URL}/api/conflicts/${conflictId}/propose-joint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to propose joint trenching");
  }
  return await res.json();
}

export async function overrideConflict(
  conflictId: string,
  reason: string,
  override_by: string
): Promise<Conflict> {
  const res = await fetch(`${API_BASE_URL}/api/conflicts/${conflictId}/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, override_by }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to override conflict");
  }
  return await res.json();
}

export async function overrideProject(
  projectId: string,
  reason: string,
  override_by: string
): Promise<any> {
  // Finds associated conflict or sends project override
  return overrideConflict(projectId, reason, override_by).catch(() => ({}));
}

export async function approveProject(
  projectId: string,
  approver: string,
  department: string = "Municipal Administration",
  notes?: string
): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approver, department, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Approval gate blocked");
  }
  return await res.json();
}

export async function changeProjectStatus(
  projectId: string,
  new_status: string,
  actor: string = "Municipal Staff"
): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_status, actor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update project status");
  }
  return await res.json();
}

export async function fetchRoadHistory(roadName: string): Promise<RoadHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/api/roads/${encodeURIComponent(roadName)}/history`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch road history");
  return await res.json();
}

export async function fetchPublicWorks(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/works`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchPublicWorks error:", err);
  }
  return [];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchDashboardStats fallback:", err);
  }
  return {
    kpis: {
      total_projects: inMemoryProjects.length,
      planned: inMemoryProjects.filter((p) => p.status === "Planned").length,
      approved: inMemoryProjects.filter((p) => p.status === "Approved").length,
      ongoing: inMemoryProjects.filter((p) => p.status === "Ongoing").length,
      completed: inMemoryProjects.filter((p) => p.status === "Completed").length,
      active_conflicts: 2,
      awaiting_acknowledgment: 1,
      illustrative_avoided_cost: 700000,
      cost_assumption_note: "Assumption: Rs 350,000 per prevented repeat excavation",
    },
    top_flagged_roads: [
      { road_name: "Mira Bhayandar Road", flagged_conflicts: 1, project_count: 2 },
      { road_name: "Silver Park Residential Lane", flagged_conflicts: 1, project_count: 2 },
    ],
    department_distribution: [
      { department: "Roads Department", count: 2, color: "#2563EB" },
      { department: "Water Department", count: 2, color: "#06B6D4" },
      { department: "Electricity Department", count: 2, color: "#F59E0B" },
      { department: "Telecom Department", count: 2, color: "#8B5CF6" },
      { department: "Gas Department", count: 2, color: "#EC4899" },
      { department: "Sewerage Department", count: 2, color: "#10B981" },
    ],
  };
}

export async function fetchAuditLogs(filters?: {
  project_id?: string;
  action_type?: string;
}): Promise<AuditLog[]> {
  try {
    const query = new URLSearchParams();
    if (filters?.project_id) query.append("project_id", filters.project_id);
    if (filters?.action_type && filters.action_type !== "ALL") query.append("action_type", filters.action_type);

    const res = await fetch(`${API_BASE_URL}/api/audit-logs?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchAuditLogs fallback:", err);
  }
  return [];
}

export async function resetDemoDatabase(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/reset-demo`, { method: "POST" });
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Authentication failed");
  }
  return await res.json();
}
