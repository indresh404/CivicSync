export type ProjectStatus = "Planned" | "Approved" | "Ongoing" | "Completed";
export type RoadType = "Arterial" | "Residential";
export type ConflictSeverity = "High" | "Medium" | "Low";
export type ConflictResolution = "Pending" | "Sequenced" | "JointTrench" | "Overridden";
export type ConflictStatus = "Awaiting Acknowledgment" | "Ready for Review" | "Resolved" | "Overridden" | "Closed";

export interface User {
  id: string;
  email: string;
  name: string;
  department_id?: string;
  department_name?: string;
  role: "ADMIN" | "DEPARTMENT_USER";
}

export interface Project {
  id: string;
  title?: string;
  name: string;
  department_id?: string;
  department: string;
  project_type: string;
  geometry_type?: "point" | "line";
  description?: string;
  road_name: string;
  road_type: RoadType;
  lat?: number;
  lng?: number;
  latitude: number;
  longitude: number;
  end_lat?: number | null;
  end_lng?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  radius_m?: number;
  radius_meters: number;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  conflict_check_performed: boolean;
  conflict_check_version: number;
  conflict_check_at?: string;
  is_overridden: boolean;
  override_reason?: string;
  override_by?: string;
  override_at?: string;
  cooldown_justification?: string;
  created_at: string;
  updated_at: string;
  active_conflicts_count?: number;
  has_conflicts?: boolean;
}

export interface Acknowledgment {
  id: string;
  conflict_id: string;
  department: string;
  acknowledged_by: string;
  report_version: number;
  note?: string;
  created_at: string;
}

export interface Conflict {
  id: string;
  project_a_id: string;
  project_b_id: string;
  calculated_distance: number;
  threshold: number;
  overlap_start: string;
  overlap_end: string;
  overlapping_days: number;
  proximity_score: number;
  overlap_score: number;
  road_importance_score: number;
  severity_score: number;
  severity_level: ConflictSeverity;
  severity_breakdown?: {
    closeness: number;
    days_overlapping: number;
    road_importance: number;
    raw_distance_m: number;
    raw_overlapping_days: number;
    is_arterial: boolean;
    weights: { w1_closeness: number; w2_overlap: number; w3_road: number };
    formula: string;
  };
  conflict_reason: string;
  suggested_sequence: string;
  suggested_dates?: string;
  resolution?: ConflictResolution;
  status: ConflictStatus;
  ack_a?: boolean;
  ack_b?: boolean;
  ack_a_by?: string;
  ack_b_by?: string;
  report_version: number;
  created_at: string;
  updated_at: string;
  acknowledgments: Acknowledgment[];
  project_a_name?: string;
  project_a_dept?: string;
  project_a_type?: string;
  project_b_name?: string;
  project_b_dept?: string;
  project_b_type?: string;
  road_name?: string;
}

export interface AuditLog {
  id: string;
  action_type: string;
  project_id?: string;
  conflict_id?: string;
  actor: string;
  department: string;
  note: string;
  previous_state?: string;
  new_state?: string;
  timestamp?: string;
  created_at: string;
}

export interface DashboardKPIs {
  total_projects: number;
  planned: number;
  approved: number;
  ongoing: number;
  completed: number;
  active_conflicts: number;
  awaiting_acknowledgment: number;
  illustrative_avoided_cost: number;
  cost_assumption_note: string;
}

export interface DashboardStats {
  kpis: DashboardKPIs;
  top_flagged_roads: { road_name: string; conflict_count?: number; flagged_conflicts?: number; project_count?: number }[];
  department_distribution: { department: string; count?: number; project_count?: number; color?: string }[];
  status_distribution?: Record<string, number>;
  severity_distribution?: Record<string, number>;
}

export interface PotentialConflictItem {
  existing_project_id: string;
  existing_project_title: string;
  existing_department: string;
  existing_project_type: string;
  distance_meters: number;
  overlapping_days: number;
  severity_score: number;
  severity_level: string;
  suggested_sequence: string;
  severity_breakdown?: any;
}

export interface PreviewConflictResponse {
  has_conflicts: boolean;
  conflict_count: number;
  conflicts: PotentialConflictItem[];
  cooldown_warning?: {
    has_warning: boolean;
    months_ago: number;
    cooldown_months: number;
    warning: string;
    requires_justification: boolean;
  } | null;
  monsoon_warning?: {
    has_warning: boolean;
    monsoon_window: string;
    warning: string;
  } | null;
}

export interface RoadHistoryResponse {
  road_name: string;
  headline_stat: string;
  excavations_last_12_months: number;
  total_projects: number;
  projects: Project[];
  conflicts: Conflict[];
}

export type DepartmentRole =
  | "City Administrator (Approver)"
  | "Roads Department"
  | "Water Department"
  | "Electricity Department"
  | "Sewerage Department"
  | "Telecom Department"
  | "Gas Department";

export type SimulatedRole = DepartmentRole;

// --- CivicSync GenCity AI 3D Urban Digital Twin Types ---
export interface GenCity3DAsset {
  id: string;
  name: string;
  category: "Building" | "Subsurface Utility" | "Construction Scene" | "Heavy Machinery" | "Other";
  description: string;
  model_url: string;
  file_size_kb: number;
  format: string;
  poly_count: number;
  scale: [number, number, number];
  created_via: string;
  created_at: string;
}

export interface GenCityAIJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress_percent: number;
  prompt: string;
  asset_type: string;
  model_output_url?: string;
  asset_name?: string;
  poly_count?: number;
  format?: string;
  engine?: string;
  created_at: string;
  metadata?: any;
}

export interface ConstructionProgressAnalysis {
  status: string;
  image_analyzed: string;
  project_id: string;
  road_corridor: string;
  detected_stage: string;
  progress_percentage: number;
  schedule_status: string;
  safety_audit: {
    safety_score_out_of_100: number;
    barricade_compliance: string;
    trench_shoring_status: string;
    ppe_compliance: string;
  };
  civil_engineer_notes: string;
  analyzed_at: string;
  engine: string;
}

export interface HFStatusResponse {
  status: "connected" | "unconfigured" | "invalid_token" | "error";
  username?: string;
  fullname?: string;
  token_type?: string;
  error?: string;
}

