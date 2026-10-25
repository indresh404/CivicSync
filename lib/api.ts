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
    title: "Mira Bhayandar Road Asphalt Resurfacing & Milling",
    name: "Mira Bhayandar Road Asphalt Resurfacing & Milling",
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
    title: "Mira Bhayandar Road 600mm Potable Water Trunk Main",
    name: "Mira Bhayandar Road 600mm Potable Water Trunk Main",
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
    title: "Silver Park 11kV Underground Power Ducting",
    name: "Silver Park 11kV Underground Power Ducting",
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
    title: "Silver Park 5G Fiber Optic Micro-Trenching",
    name: "Silver Park 5G Fiber Optic Micro-Trenching",
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
    title: "Kanakia Road Complete Asphalt Overlay",
    name: "Kanakia Road Complete Asphalt Overlay",
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
    title: "Kanakia Road Emergency Gas Pipeline Valve Replacement",
    name: "Kanakia Road Emergency Gas Pipeline Valve Replacement",
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
  {
    id: "PRJ-2026-006",
    title: "Pleasant Park Stormwater Culvert Desilting & RCC Lining",
    name: "Pleasant Park Stormwater Culvert Desilting & RCC Lining",
    department_id: "DEPT-SEWER",
    department: "Sewerage Department",
    project_type: "Sewerage",
    geometry_type: "point",
    description: "Culvert desilting and reinforced cement concrete relining for monsoon flood mitigation.",
    road_name: "Pleasant Park Link Road",
    road_type: "Residential",
    lat: 19.2692,
    lng: 72.8735,
    latitude: 19.2692,
    longitude: 72.8735,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-11-01",
    end_date: "2026-11-14",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-10-10T12:00:00Z",
    is_overridden: false,
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-007",
    title: "Western Express Highway Junction Kerb Pavers & Slip Road",
    name: "Western Express Highway Junction Kerb Pavers & Slip Road",
    department_id: "DEPT-ROADS",
    department: "Roads Department",
    project_type: "Resurfacing",
    geometry_type: "line",
    description: "Ongoing kerb paver installation and pedestrian crossing realignment on busy arterial interchange.",
    road_name: "Western Express Highway Junction",
    road_type: "Arterial",
    lat: 19.2625,
    lng: 72.8805,
    latitude: 19.2625,
    longitude: 72.8805,
    end_lat: 19.2640,
    end_lng: 72.8820,
    end_latitude: 19.2640,
    end_longitude: 72.8820,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-10-01",
    end_date: "2026-10-31",
    status: "Ongoing",
    conflict_check_performed: true,
    conflict_check_version: 1,
    conflict_check_at: "2026-09-25T09:00:00Z",
    is_overridden: false,
    created_at: "2026-09-25T09:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-008",
    title: "Station Road Feeder Line Chamber Overhaul",
    name: "Station Road Feeder Line Chamber Overhaul",
    department_id: "DEPT-WATER",
    department: "Water Department",
    project_type: "Pipeline",
    geometry_type: "point",
    description: "Pipeline rehabilitation and pressure stabilization valve chamber near Mira Road station.",
    road_name: "Station Road (Mira Road East)",
    road_type: "Residential",
    lat: 19.2810,
    lng: 72.8540,
    latitude: 19.2810,
    longitude: 72.8540,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-09-01",
    end_date: "2026-09-18",
    status: "Completed",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-09-18T17:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-009",
    title: "Beverly Park Substation Transformer Feeder Augmentation",
    name: "Beverly Park Substation Transformer Feeder Augmentation",
    department_id: "DEPT-ELEC",
    department: "Electricity Department",
    project_type: "Cabling",
    geometry_type: "point",
    description: "Reinforcing electrical feeder bus to handle peak evening residential grid loads.",
    road_name: "Beverly Park Avenue",
    road_type: "Arterial",
    lat: 19.2750,
    lng: 72.8640,
    latitude: 19.2750,
    longitude: 72.8640,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-11-22",
    end_date: "2026-12-05",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-14T11:00:00Z",
    updated_at: "2026-10-14T11:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-010",
    title: "Poonam Sagar Underground Sewage Main Interceptor",
    name: "Poonam Sagar Underground Sewage Main Interceptor",
    department_id: "DEPT-SEWER",
    department: "Sewerage Department",
    project_type: "Sewerage",
    geometry_type: "line",
    description: "Trenchless pipe-jacking of 900mm reinforced concrete gravity sewer main.",
    road_name: "Poonam Sagar Road",
    road_type: "Residential",
    lat: 19.2890,
    lng: 72.8550,
    latitude: 19.2890,
    longitude: 72.8550,
    end_lat: 19.2905,
    end_lng: 72.8570,
    end_latitude: 19.2905,
    end_longitude: 72.8570,
    radius_m: 30,
    radius_meters: 30,
    start_date: "2026-12-01",
    end_date: "2026-12-20",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-18T16:00:00Z",
    updated_at: "2026-10-18T16:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-011",
    title: "Hatkesh Udyog Nagar Optical Backhaul Connectivity",
    name: "Hatkesh Udyog Nagar Optical Backhaul Connectivity",
    department_id: "DEPT-TELE",
    department: "Telecom Department",
    project_type: "Cabling",
    geometry_type: "point",
    description: "Underground optical fiber laying connecting commercial industrial IT park.",
    road_name: "Hatkesh Main Road",
    road_type: "Arterial",
    lat: 19.2710,
    lng: 72.8680,
    latitude: 19.2710,
    longitude: 72.8680,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-10-18",
    end_date: "2026-11-04",
    status: "Ongoing",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-05T14:00:00Z",
    updated_at: "2026-10-18T09:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-012",
    title: "GCC Club Road Pothole Patching & Bituminous Seal",
    name: "GCC Club Road Pothole Patching & Bituminous Seal",
    department_id: "DEPT-ROADS",
    department: "Roads Department",
    project_type: "Resurfacing",
    geometry_type: "point",
    description: "Preventive micro-surfacing following pre-monsoon road network inspections.",
    road_name: "GCC Club Road",
    road_type: "Residential",
    lat: 19.2875,
    lng: 72.8740,
    latitude: 19.2875,
    longitude: 72.8740,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-09-10",
    end_date: "2026-09-25",
    status: "Completed",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-25T16:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-013",
    title: "Jangid Complex Domestic PNG Connection Grid",
    name: "Jangid Complex Domestic PNG Connection Grid",
    department_id: "DEPT-GAS",
    department: "Gas Department",
    project_type: "Gas line",
    geometry_type: "point",
    description: "Piped natural gas connections to 400 residential flats across Jangid towers.",
    road_name: "Jangid Complex Internal Road",
    road_type: "Residential",
    lat: 19.2860,
    lng: 72.8620,
    latitude: 19.2860,
    longitude: 72.8620,
    radius_m: 15,
    radius_meters: 15,
    start_date: "2026-11-12",
    end_date: "2026-11-28",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-11T09:30:00Z",
    updated_at: "2026-10-11T09:30:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-014",
    title: "Maxus Mall Junction Signal Smart Sensor Network",
    name: "Maxus Mall Junction Signal Smart Sensor Network",
    department_id: "DEPT-TELE",
    department: "Telecom Department",
    project_type: "Other",
    geometry_type: "point",
    description: "Municipal traffic surveillance camera fiber feeds and automated loop sensors.",
    road_name: "150 Feet Road",
    road_type: "Arterial",
    lat: 19.2940,
    lng: 72.8520,
    latitude: 19.2940,
    longitude: 72.8520,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-10-20",
    end_date: "2026-11-10",
    status: "Ongoing",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-02T11:00:00Z",
    updated_at: "2026-10-20T08:30:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-015",
    title: "Srishti Housing Sector 3 Water Sluice Valve Replacement",
    name: "Srishti Housing Sector 3 Water Sluice Valve Replacement",
    department_id: "DEPT-WATER",
    department: "Water Department",
    project_type: "Pipeline",
    geometry_type: "point",
    description: "Replacement of corroded municipal sluice gate valve chamber.",
    road_name: "Srishti Main Road",
    road_type: "Residential",
    lat: 19.2730,
    lng: 72.8790,
    latitude: 19.2730,
    longitude: 72.8790,
    radius_m: 15,
    radius_meters: 15,
    start_date: "2026-11-05",
    end_date: "2026-11-15",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-08T15:00:00Z",
    updated_at: "2026-10-08T15:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
  {
    id: "PRJ-2026-016",
    title: "Shanti Park Main Avenue Underground Stormwater Drain",
    name: "Shanti Park Main Avenue Underground Stormwater Drain",
    department_id: "DEPT-SEWER",
    department: "Sewerage Department",
    project_type: "Sewerage",
    geometry_type: "line",
    description: "Deep-level storm drain pipe-jacking along central Shanti Park arterial thoroughfare.",
    road_name: "Shanti Park Main Avenue",
    road_type: "Arterial",
    lat: 19.2815,
    lng: 72.8610,
    latitude: 19.2815,
    longitude: 72.8610,
    end_lat: 19.2830,
    end_lng: 72.8635,
    end_latitude: 19.2830,
    end_longitude: 72.8635,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-11-10",
    end_date: "2026-11-28",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-19T09:00:00Z",
    updated_at: "2026-10-19T09:00:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-017",
    title: "Shanti Park Distribution Substation Power Cabling",
    name: "Shanti Park Distribution Substation Power Cabling",
    department_id: "DEPT-ELEC",
    department: "Electricity Department",
    project_type: "Cabling",
    geometry_type: "line",
    description: "Trench excavation for high-capacity 22kV feeder bus interconnecting adjacent wards.",
    road_name: "Shanti Park Main Avenue",
    road_type: "Arterial",
    lat: 19.2818,
    lng: 72.8615,
    latitude: 19.2818,
    longitude: 72.8615,
    end_lat: 19.2832,
    end_lng: 72.8640,
    end_latitude: 19.2832,
    end_longitude: 72.8640,
    radius_m: 25,
    radius_meters: 25,
    start_date: "2026-11-16",
    end_date: "2026-11-30",
    status: "Planned",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-19T10:00:00Z",
    updated_at: "2026-10-19T10:00:00Z",
    active_conflicts_count: 1,
    has_conflicts: true,
  },
  {
    id: "PRJ-2026-018",
    title: "Mira Road Station Skywalk Lighting & Surveillance",
    name: "Mira Road Station Skywalk Lighting & Surveillance",
    department_id: "DEPT-TELE",
    department: "Telecom Department",
    project_type: "Other",
    geometry_type: "point",
    description: "Pedestrian commuter corridor LED lighting control conduits and optical security nodes.",
    road_name: "Station Road (Mira Road East)",
    road_type: "Arterial",
    lat: 19.2805,
    lng: 72.8535,
    latitude: 19.2805,
    longitude: 72.8535,
    radius_m: 20,
    radius_meters: 20,
    start_date: "2026-11-25",
    end_date: "2026-12-12",
    status: "Approved",
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: "2026-10-20T14:00:00Z",
    updated_at: "2026-10-20T14:00:00Z",
    active_conflicts_count: 0,
    has_conflicts: false,
  },
];

const SEED_CONFLICTS: Conflict[] = [
  {
    id: "CONF-2026-001",
    project_a_id: "PRJ-2026-001",
    project_b_id: "PRJ-2026-002",
    project_a_name: "Mira Bhayandar Road Asphalt Resurfacing & Milling",
    project_a_dept: "Roads Department",
    project_a_type: "Resurfacing",
    project_b_name: "Mira Bhayandar Road 600mm Potable Water Trunk Main",
    project_b_dept: "Water Department",
    project_b_type: "Pipeline",
    calculated_distance: 22.4,
    threshold: 50.0,
    overlap_start: "2026-11-10",
    overlap_end: "2026-11-20",
    overlapping_days: 11,
    proximity_score: 0.552,
    overlap_score: 0.733,
    road_importance_score: 1.0,
    severity_score: 79.8,
    severity_level: "High",
    conflict_reason: "High severity overlap on Mira Bhayandar Road arterial corridor between Water pipeline and Roads resurfacing.",
    suggested_sequence: "Sequence Underground First: Water Department must finish pipe installation before Roads Department paves asphalt.",
    suggested_dates: "Pipeline: 10–25 Nov | Resurfacing: 27 Nov–12 Dec",
    status: "Awaiting Acknowledgment",
    resolution: "Pending",
    ack_a: false,
    ack_b: false,
    report_version: 1,
    created_at: "2026-10-16T14:25:00Z",
    updated_at: "2026-10-16T14:25:00Z",
    acknowledgments: [],
    road_name: "Mira Bhayandar Road",
  },
  {
    id: "CONF-2026-002",
    project_a_id: "PRJ-2026-003",
    project_b_id: "PRJ-2026-004",
    project_a_name: "Silver Park 11kV Underground Power Ducting",
    project_a_dept: "Electricity Department",
    project_a_type: "Cabling",
    project_b_name: "Silver Park 5G Fiber Optic Micro-Trenching",
    project_b_dept: "Telecom Department",
    project_b_type: "Cabling",
    calculated_distance: 28.5,
    threshold: 50.0,
    overlap_start: "2026-11-18",
    overlap_end: "2026-11-30",
    overlapping_days: 13,
    proximity_score: 0.43,
    overlap_score: 0.86,
    road_importance_score: 0.5,
    severity_score: 59.4,
    severity_level: "Medium",
    conflict_reason: "Medium severity concurrent excavation on Silver Park Residential Lane between Electricity and Telecom.",
    suggested_sequence: "Joint Trenching Opportunity: Propose unified trenching excavation with shared utility conduits.",
    suggested_dates: "Joint Trenching: 15 Nov–02 Dec",
    status: "Awaiting Acknowledgment",
    resolution: "Pending",
    ack_a: false,
    ack_b: false,
    report_version: 1,
    created_at: "2026-10-17T11:50:00Z",
    updated_at: "2026-10-17T11:50:00Z",
    acknowledgments: [],
    road_name: "Silver Park Residential Lane",
  },
  {
    id: "CONF-2026-003",
    project_a_id: "PRJ-2026-016",
    project_b_id: "PRJ-2026-017",
    project_a_name: "Shanti Park Main Avenue Underground Stormwater Drain",
    project_a_dept: "Sewerage Department",
    project_a_type: "Sewerage",
    project_b_name: "Shanti Park Distribution Substation Power Cabling",
    project_b_dept: "Electricity Department",
    project_b_type: "Cabling",
    calculated_distance: 18.2,
    threshold: 50.0,
    overlap_start: "2026-11-16",
    overlap_end: "2026-11-28",
    overlapping_days: 13,
    proximity_score: 0.636,
    overlap_score: 0.722,
    road_importance_score: 1.0,
    severity_score: 68.4,
    severity_level: "Medium",
    conflict_reason: "High-density arterial utility clash on Shanti Park Main Avenue between deep stormwater drainage and high-voltage power cabling.",
    suggested_sequence: "Deep Trenching Precedence: Sewerage Department deep-level concrete pipe installation must precede shallow electrical trenching.",
    suggested_dates: "Drainage: 10–25 Nov | Electrical: 26 Nov–10 Dec",
    status: "Awaiting Acknowledgment",
    resolution: "Pending",
    ack_a: false,
    ack_b: false,
    report_version: 1,
    created_at: "2026-10-19T10:15:00Z",
    updated_at: "2026-10-19T10:15:00Z",
    acknowledgments: [],
    road_name: "Shanti Park Main Avenue",
  },
];

let inMemoryProjects = [...SEED_PROJECTS];
let inMemoryConflicts = [...SEED_CONFLICTS];

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
  return inMemoryConflicts.filter((c) => {
    if (filters?.status && filters.status !== "ALL" && c.status !== filters.status) return false;
    if (filters?.severity && filters.severity !== "ALL" && c.severity_level !== filters.severity) return false;
    return true;
  });
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
  try {
    const res = await fetch(`${API_BASE_URL}/api/roads/${encodeURIComponent(roadName)}/history`, {
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("fetchRoadHistory fallback:", err);
  }

  const matchingProjects = inMemoryProjects.filter(
    (p) => p.road_name.toLowerCase() === roadName.toLowerCase()
  );
  const matchingConflicts: Conflict[] = inMemoryConflicts.filter((c) =>
    (c.road_name || "").toLowerCase().includes(roadName.toLowerCase()) ||
    roadName.toLowerCase().includes((c.road_name || "").toLowerCase())
  );

  return {
    road_name: roadName,
    headline_stat: `${matchingProjects.length} Infrastructure Projects on Corridor`,
    excavations_last_12_months: matchingProjects.filter((p) => p.status === "Completed" || p.status === "Ongoing").length,
    total_projects: matchingProjects.length,
    projects: matchingProjects,
    conflicts: matchingConflicts,
  };
}

export async function fetchPublicWorks(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/works`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("fetchPublicWorks error:", err);
  }
  return inMemoryProjects
    .filter((p) => p.status === "Approved" || p.status === "Ongoing" || p.status === "Planned")
    .map((w) => ({
      id: w.id,
      title: w.title || w.name,
      department: w.department,
      road_name: w.road_name,
      project_type: w.project_type,
      start_date: w.start_date,
      end_date: w.end_date,
      status: w.status,
      lat: w.latitude ?? w.lat,
      lng: w.longitude ?? w.lng,
      end_lat: w.end_latitude ?? w.end_lat,
      end_lng: w.end_longitude ?? w.end_lng,
      description: w.description,
    }));
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
      active_conflicts: inMemoryConflicts.filter((c) => c.status !== "Resolved" && c.status !== "Closed").length,
      awaiting_acknowledgment: inMemoryConflicts.filter((c) => c.status === "Awaiting Acknowledgment").length,
      illustrative_avoided_cost: 1050000,
      cost_assumption_note: "Assumption: Rs 350,000 per prevented repeat excavation",
    },
    top_flagged_roads: [
      { road_name: "Mira Bhayandar Road", flagged_conflicts: 1, project_count: 2 },
      { road_name: "Silver Park Residential Lane", flagged_conflicts: 1, project_count: 2 },
      { road_name: "Shanti Park Main Avenue", flagged_conflicts: 1, project_count: 2 },
    ],
    department_distribution: [
      { department: "Roads Department", count: inMemoryProjects.filter(p => p.department === "Roads Department").length, color: "#2563EB" },
      { department: "Water Department", count: inMemoryProjects.filter(p => p.department === "Water Department").length, color: "#06B6D4" },
      { department: "Electricity Department", count: inMemoryProjects.filter(p => p.department === "Electricity Department").length, color: "#F59E0B" },
      { department: "Telecom Department", count: inMemoryProjects.filter(p => p.department === "Telecom Department").length, color: "#8B5CF6" },
      { department: "Gas Department", count: inMemoryProjects.filter(p => p.department === "Gas Department").length, color: "#EC4899" },
      { department: "Sewerage Department", count: inMemoryProjects.filter(p => p.department === "Sewerage Department").length, color: "#10B981" },
    ],
  };
}

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "AUD-2026-001",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-001",
    actor: "Amit Patil",
    department: "Roads Department",
    note: "Registered project 'Mira Bhayandar Road Asphalt Resurfacing & Milling' on Mira Bhayandar Road.",
    created_at: "2026-10-15T10:00:00Z",
  },
  {
    id: "AUD-2026-002",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-002",
    actor: "Priya Deshmukh",
    department: "Water Department",
    note: "Registered project 'Mira Bhayandar Road 600mm Potable Water Trunk Main' on Mira Bhayandar Road.",
    created_at: "2026-10-16T14:00:00Z",
  },
  {
    id: "AUD-2026-003",
    action_type: "CONFLICT_DETECTED",
    project_id: "PRJ-2026-002",
    conflict_id: "CONF-2026-001",
    actor: "CivicSync Deterministic Conflict Engine",
    department: "Municipal Grid",
    note: "High-severity conflict detected on Mira Bhayandar Road between PRJ-2026-001 and PRJ-2026-002 (22.4m separation, 11 days overlap).",
    created_at: "2026-10-16T14:25:00Z",
  },
  {
    id: "AUD-2026-004",
    action_type: "REPORT_GENERATED",
    project_id: "PRJ-2026-001",
    conflict_id: "CONF-2026-001",
    actor: "CivicSync Engine",
    department: "Municipal Grid",
    note: "Conflict Report v1 generated. Precedence rule applied: Underground pipeline work must precede asphalt resurfacing.",
    created_at: "2026-10-16T14:26:00Z",
  },
  {
    id: "AUD-2026-005",
    action_type: "DEPARTMENT_ACKNOWLEDGED",
    project_id: "PRJ-2026-001",
    conflict_id: "CONF-2026-001",
    actor: "Amit Patil",
    department: "Roads Department",
    note: "Roads Department acknowledged conflict report. Awaiting Water Department reciprocal acknowledgment.",
    created_at: "2026-10-18T09:30:00Z",
  },
  {
    id: "AUD-2026-006",
    action_type: "ADMIN_OVERRIDE",
    project_id: "PRJ-2026-005",
    actor: "Rajesh Sharma (City Commissioner)",
    department: "Municipal Administration",
    note: "Approval override granted for PRJ-2026-005 on Kanakia Road despite 3-month cooldown. Reason: Emergency public safety gas valve leak repair.",
    created_at: "2026-10-14T11:15:00Z",
  },
  {
    id: "AUD-2026-007",
    action_type: "PROJECT_APPROVED",
    project_id: "PRJ-2026-005",
    actor: "Rajesh Sharma (City Commissioner)",
    department: "Municipal Administration",
    note: "Project PRJ-2026-005 approved following executive emergency override.",
    created_at: "2026-10-14T11:16:00Z",
  },
  {
    id: "AUD-2026-008",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-003",
    actor: "Rohan Mehta",
    department: "Electricity Department",
    note: "Registered project 'Silver Park 11kV Underground Power Ducting' on Silver Park Residential Lane.",
    created_at: "2026-10-17T09:00:00Z",
  },
  {
    id: "AUD-2026-009",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-004",
    actor: "Sneha Iyer",
    department: "Telecom Department",
    note: "Registered project 'Silver Park 5G Fiber Optic Micro-Trenching' on Silver Park Residential Lane.",
    created_at: "2026-10-17T11:00:00Z",
  },
  {
    id: "AUD-2026-010",
    action_type: "CONFLICT_DETECTED",
    project_id: "PRJ-2026-004",
    conflict_id: "CONF-2026-002",
    actor: "CivicSync Deterministic Conflict Engine",
    department: "Municipal Grid",
    note: "Medium-severity conflict detected on Silver Park Residential Lane (28.5m separation, 13 days overlap). Proposing Joint Trenching.",
    created_at: "2026-10-17T11:50:00Z",
  },
  {
    id: "AUD-2026-011",
    action_type: "PROJECT_CREATED",
    project_id: "PRJ-2026-016",
    actor: "Vikas Nair",
    department: "Sewerage Department",
    note: "Registered project 'Shanti Park Main Avenue Underground Stormwater Drain' on Shanti Park Main Avenue.",
    created_at: "2026-10-19T09:00:00Z",
  },
  {
    id: "AUD-2026-012",
    action_type: "CONFLICT_DETECTED",
    project_id: "PRJ-2026-017",
    conflict_id: "CONF-2026-003",
    actor: "CivicSync Deterministic Conflict Engine",
    department: "Municipal Grid",
    note: "Medium-severity conflict detected on Shanti Park Main Avenue between Sewerage and Electricity (18.2m separation). Precedence: Deep trenching required first.",
    created_at: "2026-10-19T10:15:00Z",
  },
];

let inMemoryAuditLogs = [...SEED_AUDIT_LOGS];

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
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("fetchAuditLogs fallback:", err);
  }
  return inMemoryAuditLogs.filter((log) => {
    if (filters?.project_id && log.project_id !== filters.project_id) return false;
    if (filters?.action_type && filters.action_type !== "ALL" && log.action_type !== filters.action_type) return false;
    return true;
  });
}

export async function resetSystemBaseline(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reset-baseline`, { method: "POST" });
    if (!res.ok) {
      await fetch(`${API_BASE_URL}/api/reset-demo`, { method: "POST" });
    }
  } catch (err) {
    try {
      await fetch(`${API_BASE_URL}/api/reset-demo`, { method: "POST" });
    } catch (_) {}
  }
}

export const resetDemoDatabase = resetSystemBaseline;

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
