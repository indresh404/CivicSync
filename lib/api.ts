import {
  Project,
  Conflict,
  AuditLog,
  DashboardStats,
  Acknowledgment,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Seed Fallback Data (Deterministic Local Fallback) ---
const SEED_PROJECTS: Project[] = [
  {
    id: "PRJ-2026-001",
    name: "MG Road Asphalt Resurfacing & Milling [DEMO]",
    department: "Roads Department",
    project_type: "Resurfacing",
    description: "Comprehensive asphalt milling and bituminous concrete resurfacing for central corridor.",
    road_name: "MG Road",
    road_type: "Arterial",
    latitude: 12.9752,
    longitude: 77.6095,
    end_latitude: 12.9758,
    end_longitude: 77.6110,
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
    name: "MG Road Trunk Water Pipeline Replacement [DEMO]",
    department: "Water Department",
    project_type: "Pipeline",
    description: "Replacement of aged 450mm cast-iron potable water main with ductile iron piping.",
    road_name: "MG Road",
    road_type: "Arterial",
    latitude: 12.9754,
    longitude: 77.6098,
    end_latitude: 12.9760,
    end_longitude: 77.6112,
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
    name: "Commercial Street 11kV Underground Cabling [DEMO]",
    department: "Electricity Department",
    project_type: "Cabling",
    description: "Undergrounding overhead HT cables to eliminate safety hazards in market area.",
    road_name: "Commercial Street",
    road_type: "Arterial",
    latitude: 12.9822,
    longitude: 77.6083,
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
    name: "Commercial Street Metro 5G Fiber Trenching [DEMO]",
    department: "Telecom Department",
    project_type: "Cabling",
    description: "Micro-trenching for civic smart sensors and carrier neutral fiber optic backhaul.",
    road_name: "Commercial Street",
    road_type: "Arterial",
    latitude: 12.9825,
    longitude: 77.6086,
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
    id: "PRJ-2026-005",
    name: "Indiranagar 100ft Gas Main Pipeline Reinforcement [DEMO]",
    department: "Gas Department",
    project_type: "Gas line",
    description: "Priority valve replacement and cathodic corrosion mitigation on medium-pressure distribution grid.",
    road_name: "Indiranagar 100ft Road",
    road_type: "Arterial",
    latitude: 12.9784,
    longitude: 77.6408,
    radius_meters: 20,
    start_date: "2026-10-25",
    end_date: "2026-11-08",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-12T16:00:00Z",
    is_overridden: true,
    override_reason: "Critical public safety override: aging medium-pressure gas valve leak hazard confirmed by safety inspector. Work expedited ahead of monsoon resurfacing window.",
    override_by: "City Administrator (Simulated)",
    override_at: "2026-10-14T11:15:00Z",
    created_at: "2026-10-12T15:30:00Z",
    updated_at: "2026-10-14T11:15:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-006",
    name: "Park Boulevard Stormwater Drain De-silting & Lining [DEMO]",
    department: "Sewerage Department",
    project_type: "Sewerage",
    description: "Preventative stormwater culvert cleaning and reinforced cement concrete relining.",
    road_name: "Park Boulevard",
    road_type: "Residential",
    latitude: 12.9645,
    longitude: 77.6190,
    radius_meters: 20,
    start_date: "2026-11-01",
    end_date: "2026-11-14",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-10T14:00:00Z",
    is_overridden: false,
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T14:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-007",
    name: "Residency Road Pedestrian Walkway & Kerb Reconstruction [DEMO]",
    department: "Roads Department",
    project_type: "Resurfacing",
    description: "Active civil works for non-motorized transport corridor and tactile paving.",
    road_name: "Residency Road",
    road_type: "Arterial",
    latitude: 12.9698,
    longitude: 77.6015,
    radius_meters: 25,
    start_date: "2026-10-01",
    end_date: "2026-10-31",
    status: "Ongoing",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-09-28T10:00:00Z",
    is_overridden: false,
    created_at: "2026-09-25T09:00:00Z",
    updated_at: "2026-09-28T10:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-008",
    name: "Brigade Avenue Distribution Feeder Repair [DEMO]",
    department: "Water Department",
    project_type: "Pipeline",
    description: "Completed pipe joint relining and water pressure stabilization chamber.",
    road_name: "Brigade Avenue",
    road_type: "Residential",
    latitude: 12.9712,
    longitude: 77.6074,
    radius_meters: 20,
    start_date: "2026-09-01",
    end_date: "2026-09-18",
    status: "Completed",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-08-25T11:00:00Z",
    is_overridden: false,
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-09-18T18:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
];

const SEED_CONFLICTS: Conflict[] = [
  {
    id: "CONF-2026-001",
    project_a_id: "PRJ-2026-001",
    project_b_id: "PRJ-2026-002",
    calculated_distance: 22.4,
    threshold: 50.0,
    overlap_start: "2026-11-10",
    overlap_end: "2026-11-20",
    overlapping_days: 11,
    proximity_score: 55.2,
    overlap_score: 100.0,
    road_importance_score: 100.0,
    severity_score: 79.84,
    severity_level: "High",
    conflict_reason: "Spatial proximity 22.4m <= 50m threshold on Arterial corridor 'MG Road', with 11 days overlapping execution schedule.",
    suggested_sequence: "Domain Precedence Rule: Underground utility work (Water Department Pipeline) must be completed before road surface resurfacing (Roads Department Resurfacing). This prevents premature excavation of newly asphalted roadway. Proposed execution sequence: Complete MG Road Trunk Water Pipeline Replacement first, followed by MG Road Asphalt Resurfacing.",
    suggested_dates: "Phase 1 (Water Department): 10 Nov 2026 – 25 Nov 2026; Phase 2 (Roads Department): 27 Nov 2026 – 12 Dec 2026",
    status: "Awaiting Acknowledgment",
    report_version: 1,
    created_at: "2026-10-16T14:25:00Z",
    updated_at: "2026-10-18T09:30:00Z",
    acknowledgments: [
      {
        id: "ACK-2026-001",
        conflict_id: "CONF-2026-001",
        department: "Roads Department",
        acknowledged_by: "E. Sharma (Chief Road Engineer - Demo)",
        report_version: 1,
        note: "Roads Department agrees to hold resurfacing until Water Dept finishes trunk pipeline installation.",
        created_at: "2026-10-18T09:30:00Z",
      },
    ],
    project_a_name: "MG Road Asphalt Resurfacing & Milling [DEMO]",
    project_a_dept: "Roads Department",
    project_a_type: "Resurfacing",
    project_b_name: "MG Road Trunk Water Pipeline Replacement [DEMO]",
    project_b_dept: "Water Department",
    project_b_type: "Pipeline",
    road_name: "MG Road",
  },
  {
    id: "CONF-2026-002",
    project_a_id: "PRJ-2026-003",
    project_b_id: "PRJ-2026-004",
    calculated_distance: 31.8,
    threshold: 50.0,
    overlap_start: "2026-11-18",
    overlap_end: "2026-11-30",
    overlapping_days: 13,
    proximity_score: 36.4,
    overlap_score: 100.0,
    road_importance_score: 100.0,
    severity_score: 71.38,
    severity_level: "High",
    conflict_reason: "Dual subterranean excavation 31.8m apart on 'Commercial Street', with 13 days simultaneous digging schedule.",
    suggested_sequence: "Both projects (Electricity Department Cabling and Telecom Department Cabling) involve underground utility infrastructure. No automatic precedence rule is configured. Recommendation: Joint trench-sharing coordination meeting between Electricity Department and Telecom Department to determine duct/pipe depth hierarchy and unified traffic management.",
    suggested_dates: "Requires inter-departmental scheduling agreement.",
    status: "Awaiting Acknowledgment",
    report_version: 1,
    created_at: "2026-10-17T11:50:00Z",
    updated_at: "2026-10-17T11:50:00Z",
    acknowledgments: [],
    project_a_name: "Commercial Street 11kV Underground Cabling [DEMO]",
    project_a_dept: "Electricity Department",
    project_a_type: "Cabling",
    project_b_name: "Commercial Street Metro 5G Fiber Trenching [DEMO]",
    project_b_dept: "Telecom Department",
    project_b_type: "Cabling",
    road_name: "Commercial Street",
  },
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "AUD-2026-001",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-001",
    actor: "E. Sharma",
    department: "Roads Department",
    note: "Registered project 'MG Road Asphalt Resurfacing & Milling' on MG Road.",
    created_at: "2026-10-15T10:00:00Z",
  },
  {
    id: "AUD-2026-002",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-002",
    actor: "R. Menon",
    department: "Water Department",
    note: "Registered project 'MG Road Trunk Water Pipeline Replacement' on MG Road.",
    created_at: "2026-10-16T14:00:00Z",
  },
  {
    id: "AUD-2026-003",
    action_type: "CONFLICT_DETECTED",
    project_id: "PRJ-2026-002",
    conflict_id: "CONF-2026-001",
    actor: "System (Deterministic Conflict Engine)",
    department: "CivicSync Core",
    note: "Deterministic conflict detected between PRJ-2026-001 (Roads) and PRJ-2026-002 (Water) on MG Road (Distance ~22m, Overlap 11 days).",
    created_at: "2026-10-16T14:25:00Z",
  },
  {
    id: "AUD-2026-004",
    action_type: "REPORT_GENERATED",
    project_id: "PRJ-2026-001",
    conflict_id: "CONF-2026-001",
    actor: "System (CivicSync Engine)",
    department: "CivicSync Core",
    note: "Conflict Report v1 generated. Precedence rule applied: Underground utility work must precede resurfacing.",
    created_at: "2026-10-16T14:26:00Z",
  },
  {
    id: "AUD-2026-005",
    action_type: "DEPARTMENT_ACKNOWLEDGED",
    project_id: "PRJ-2026-001",
    conflict_id: "CONF-2026-001",
    actor: "E. Sharma",
    department: "Roads Department",
    note: "Roads Department acknowledged conflict CONF-2026-001 report v1. Water Department acknowledgment pending.",
    created_at: "2026-10-18T09:30:00Z",
  },
  {
    id: "AUD-2026-006",
    action_type: "ADMIN_OVERRIDE",
    project_id: "PRJ-2026-005",
    actor: "City Administrator (Simulated)",
    department: "Executive Administration",
    note: "Approval override granted for PRJ-2026-005. Reason: 'Critical public safety override: aging medium-pressure gas valve leak hazard confirmed by safety inspector.'",
    created_at: "2026-10-14T11:15:00Z",
  },
  {
    id: "AUD-2026-007",
    action_type: "APPROVAL_GRANTED",
    project_id: "PRJ-2026-006",
    actor: "City Administrator (Simulated)",
    department: "Executive Administration",
    note: "Project 'Park Boulevard Stormwater Drain De-silting & Lining' approved after clean conflict check report.",
    created_at: "2026-10-10T14:05:00Z",
  },
];

// Fallback in-memory state if backend is offline
let localProjects = [...SEED_PROJECTS];
let localConflicts = [...SEED_CONFLICTS];
let localAuditLogs = [...SEED_AUDIT_LOGS];

export async function fetchProjects(params?: {
  department?: string;
  status?: string;
  project_type?: string;
  search?: string;
}): Promise<Project[]> {
  try {
    const query = new URLSearchParams();
    if (params?.department) query.append("department", params.department);
    if (params?.status) query.append("status", params.status);
    if (params?.project_type) query.append("project_type", params.project_type);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`${API_BASE_URL}/api/projects?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch {
    // Return local fallback state
    return localProjects.filter((p) => {
      if (params?.department && p.department !== params.department) return false;
      if (params?.status && p.status !== params.status) return false;
      if (params?.project_type && p.project_type !== params.project_type) return false;
      if (params?.search) {
        const s = params.search.toLowerCase();
        return (
          p.name.toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s) ||
          p.road_name.toLowerCase().includes(s) ||
          p.department.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Not found");
    return await res.json();
  } catch {
    return localProjects.find((p) => p.id === id) || null;
  }
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create project");
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) throw err;
    // Local fallback creation
    const newProj: Project = {
      id: `PRJ-2026-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name || "Untitled Project",
      department: data.department || "Roads Department",
      project_type: data.project_type || "Resurfacing",
      description: data.description,
      road_name: data.road_name || "Central Avenue",
      road_type: data.road_type || "Residential",
      latitude: data.latitude || 12.9716,
      longitude: data.longitude || 77.5946,
      radius_meters: data.radius_meters || 25,
      start_date: data.start_date || "2026-11-01",
      end_date: data.end_date || "2026-11-15",
      status: "Planned",
      conflict_check_performed: true,
      conflict_check_version: 1,
      is_overridden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_conflicts_count: 0,
      has_conflicts: false,
    };
    localProjects.unshift(newProj);
    return newProj;
  }
}

export async function fetchConflicts(params?: {
  severity?: string;
  status?: string;
  department?: string;
}): Promise<Conflict[]> {
  try {
    const query = new URLSearchParams();
    if (params?.severity) query.append("severity", params.severity);
    if (params?.status) query.append("status", params.status);
    if (params?.department) query.append("department", params.department);

    const res = await fetch(`${API_BASE_URL}/api/conflicts?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch {
    return localConflicts.filter((c) => {
      if (params?.severity && c.severity_level !== params.severity) return false;
      if (params?.status && c.status !== params.status) return false;
      if (
        params?.department &&
        c.project_a_dept !== params.department &&
        c.project_b_dept !== params.department
      )
        return false;
      return true;
    });
  }
}

export async function acknowledgeConflict(
  conflictId: string,
  data: { department: string; acknowledged_by: string; note?: string }
): Promise<Acknowledgment> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/conflicts/${conflictId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Acknowledgment failed");
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) throw err;
    // Local fallback
    const conf = localConflicts.find((c) => c.id === conflictId);
    if (!conf) throw new Error("Conflict not found");
    const newAck: Acknowledgment = {
      id: `ACK-${Math.floor(100 + Math.random() * 900)}`,
      conflict_id: conflictId,
      department: data.department,
      acknowledged_by: data.acknowledged_by,
      report_version: conf.report_version,
      note: data.note,
      created_at: new Date().toISOString(),
    };
    conf.acknowledgments.push(newAck);
    conf.status = "Ready for Review";
    return newAck;
  }
}

export async function approveProject(
  projectId: string,
  approvedBy: string
): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_by: approvedBy }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Approval blocked");
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) throw err;
    const proj = localProjects.find((p) => p.id === projectId);
    if (!proj) throw new Error("Project not found");
    proj.status = "Approved";
    return proj;
  }
}

export async function overrideProject(
  projectId: string,
  reason: string,
  overrideBy: string
): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override_reason: reason, override_by: overrideBy }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Override failed");
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) throw err;
    const proj = localProjects.find((p) => p.id === projectId);
    if (!proj) throw new Error("Project not found");
    proj.status = "Approved";
    proj.is_overridden = true;
    proj.override_reason = reason;
    proj.override_by = overrideBy;
    proj.override_at = new Date().toISOString();
    return proj;
  }
}

export async function changeProjectStatus(
  projectId: string,
  newStatus: string,
  changedBy: string
): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_status: newStatus, changed_by: changedBy }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Status change failed");
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) throw err;
    const proj = localProjects.find((p) => p.id === projectId);
    if (!proj) throw new Error("Project not found");
    proj.status = newStatus as any;
    return proj;
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch {
    const total = localProjects.length;
    const planned = localProjects.filter((p) => p.status === "Planned").length;
    const approved = localProjects.filter((p) => p.status === "Approved").length;
    const ongoing = localProjects.filter((p) => p.status === "Ongoing").length;
    const completed = localProjects.filter((p) => p.status === "Completed").length;
    const activeConflicts = localConflicts.length;
    const awaitingAck = localConflicts.filter(
      (c) => c.status === "Awaiting Acknowledgment"
    ).length;

    return {
      kpis: {
        total_projects: total,
        planned,
        approved,
        ongoing,
        completed,
        active_conflicts: activeConflicts,
        awaiting_acknowledgment: awaitingAck,
        illustrative_avoided_cost: activeConflicts * 45000,
        cost_assumption_note:
          "Illustrative metric based on prevented re-dig events × $45,000 assumed average municipal excavation & restoration cost.",
      },
      top_flagged_roads: [
        { road_name: "MG Road", flagged_conflicts: 2 },
        { road_name: "Commercial Street", flagged_conflicts: 2 },
        { road_name: "Indiranagar 100ft Road", flagged_conflicts: 1 },
      ],
      department_distribution: [
        { department: "Roads Department", count: 2 },
        { department: "Water Department", count: 2 },
        { department: "Electricity Department", count: 1 },
        { department: "Telecom Department", count: 1 },
        { department: "Gas Department", count: 1 },
        { department: "Sewerage Department", count: 1 },
      ],
      status_distribution: {
        Planned: planned,
        Approved: approved,
        Ongoing: ongoing,
        Completed: completed,
      },
      severity_distribution: {
        High: 2,
        Medium: 0,
        Low: 0,
      },
    };
  }
}

export async function fetchAuditLogs(params?: {
  action_type?: string;
  department?: string;
  search?: string;
}): Promise<AuditLog[]> {
  try {
    const query = new URLSearchParams();
    if (params?.action_type) query.append("action_type", params.action_type);
    if (params?.department) query.append("department", params.department);
    if (params?.search) query.append("search", params.search);

    const res = await fetch(`${API_BASE_URL}/api/audit-logs?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch {
    return localAuditLogs.filter((l) => {
      if (params?.action_type && l.action_type !== params.action_type) return false;
      if (params?.department && l.department !== params.department) return false;
      if (params?.search) {
        const s = params.search.toLowerCase();
        return (
          l.note.toLowerCase().includes(s) ||
          l.actor.toLowerCase().includes(s) ||
          l.id.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }
}

export async function resetDemoDatabase(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/reset-demo`, { method: "POST" });
  } catch {
    localProjects = [...SEED_PROJECTS];
    localConflicts = [...SEED_CONFLICTS];
    localAuditLogs = [...SEED_AUDIT_LOGS];
  }
}
