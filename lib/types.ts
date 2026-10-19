export type ProjectStatus = "Planned" | "Approved" | "Ongoing" | "Completed";
export type RoadType = "Arterial" | "Residential";
export type ConflictSeverity = "High" | "Medium" | "Low";
export type ConflictStatus = "Awaiting Acknowledgment" | "Ready for Review" | "Resolved" | "Overridden" | "Closed";

export interface Project {
  id: string;
  name: string;
  department: string;
  project_type: string;
  description?: string;
  road_name: string;
  road_type: RoadType;
  latitude: number;
  longitude: number;
  end_latitude?: number | null;
  end_longitude?: number | null;
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
  conflict_reason: string;
  suggested_sequence: string;
  suggested_dates?: string;
  status: ConflictStatus;
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
  top_flagged_roads: { road_name: string; flagged_conflicts: number }[];
  department_distribution: { department: string; count: number }[];
  status_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
}

export type SimulatedRole =
  | "City Administrator (Approver)"
  | "Roads Department"
  | "Water Department"
  | "Electricity Department"
  | "Sewerage Department"
  | "Telecom Department"
  | "Gas Department";
