-- ============================================================================
-- CivicSync — Intelligent Urban Infrastructure Coordination Platform
-- Mira Road (Mira-Bhayandar, Maharashtra, India) Edition
-- Supabase / PostgreSQL Schema & Initial Seed Data
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS acknowledgments CASCADE;
DROP TABLE IF EXISTS conflicts CASCADE;
DROP TABLE IF EXISTS project_history CASCADE;
DROP TABLE IF EXISTS utility_assets CASCADE;
DROP TABLE IF EXISTS road_segments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS configs CASCADE;

-- 1. DEPARTMENTS
CREATE TABLE departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DEPARTMENT_USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROAD SEGMENTS (Mira Road Corridor Network)
CREATE TABLE road_segments (
    id VARCHAR(50) PRIMARY KEY,
    road_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50) NOT NULL DEFAULT 'Residential', -- Arterial, Residential
    osm_id VARCHAR(50),
    length_meters DOUBLE PRECISION DEFAULT 500.0,
    geometry JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROJECTS
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL DEFAULT 'Roads Department',
    department VARCHAR(100) NOT NULL DEFAULT 'Roads Department',
    created_by VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) NOT NULL, -- Resurfacing, Pipeline, Cabling, Sewerage, Gas line, Other
    category VARCHAR(50) DEFAULT 'surface', -- surface, underground
    geometry_type VARCHAR(20) NOT NULL DEFAULT 'point', -- point, line
    
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    end_latitude DOUBLE PRECISION,
    end_longitude DOUBLE PRECISION,
    radius_m DOUBLE PRECISION DEFAULT 25.0,
    radius_meters DOUBLE PRECISION DEFAULT 25.0,

    road_name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50) NOT NULL DEFAULT 'Residential',
    description TEXT,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Planned', -- Planned, Approved, Ongoing, Completed
    
    has_conflict BOOLEAN DEFAULT FALSE,
    conflict_check_performed BOOLEAN DEFAULT FALSE,
    conflict_check_version INTEGER DEFAULT 0,
    conflict_check_at TIMESTAMP WITH TIME ZONE,
    
    is_overridden BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    override_by VARCHAR(100),
    override_at TIMESTAMP WITH TIME ZONE,
    cooldown_justification TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- 5. CONFLICTS
CREATE TABLE conflicts (
    id VARCHAR(50) PRIMARY KEY,
    project_a_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_b_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    calculated_distance DOUBLE PRECISION NOT NULL,
    threshold DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    overlap_start DATE NOT NULL,
    overlap_end DATE NOT NULL,
    overlapping_days INTEGER NOT NULL,
    
    severity_score DOUBLE PRECISION NOT NULL,
    severity_breakdown JSONB,
    suggested_sequence TEXT NOT NULL,
    suggested_dates TEXT,
    
    resolution VARCHAR(50) NOT NULL DEFAULT 'Pending',
    status VARCHAR(50) NOT NULL DEFAULT 'Awaiting Acknowledgment',
    
    ack_a BOOLEAN DEFAULT FALSE,
    ack_b BOOLEAN DEFAULT FALSE,
    ack_a_at TIMESTAMP WITH TIME ZONE,
    ack_b_at TIMESTAMP WITH TIME ZONE,
    ack_a_by VARCHAR(100),
    ack_b_by VARCHAR(100),

    proximity_score DOUBLE PRECISION DEFAULT 0.0,
    overlap_score DOUBLE PRECISION DEFAULT 0.0,
    road_importance_score DOUBLE PRECISION DEFAULT 0.0,
    severity_level VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High, Critical
    conflict_reason TEXT DEFAULT '',
    report_version INTEGER DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_conflict_pair UNIQUE (project_a_id, project_b_id)
);

-- 6. ACKNOWLEDGMENTS
CREATE TABLE acknowledgments (
    id VARCHAR(50) PRIMARY KEY,
    conflict_id VARCHAR(50) NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    acknowledged_by VARCHAR(100) NOT NULL,
    report_version INTEGER DEFAULT 1,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. AUDIT LOGS (Append-only)
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    project_id VARCHAR(50),
    conflict_id VARCHAR(50),
    user_id VARCHAR(100),
    actor VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    note TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. UTILITY ASSETS (Subsurface Infrastructure Records)
CREATE TABLE utility_assets (
    id VARCHAR(50) PRIMARY KEY,
    road_name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    department_name VARCHAR(100) NOT NULL,
    utility_type VARCHAR(100) NOT NULL, -- Water Main, Optical Fiber, High-Voltage Power, Gas Line, Stormwater Drain
    label VARCHAR(255) NOT NULL,
    depth_m DOUBLE PRECISION DEFAULT 1.5,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    is_simulated BOOLEAN DEFAULT TRUE,
    installed_on DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PROJECT HISTORY (Time-Travel Status Audits)
CREATE TABLE project_history (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 10. SYSTEM CONFIGS
CREATE TABLE configs (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT
);

-- INDEXES FOR FAST SPATIAL & TEMPORAL LOOKUPS
CREATE INDEX idx_projects_dept ON projects(department);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_road ON projects(road_name);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_conflicts_a ON conflicts(project_a_id);
CREATE INDEX idx_conflicts_b ON conflicts(project_b_id);
CREATE INDEX idx_audit_project ON audit_logs(project_id);
CREATE INDEX idx_audit_time ON audit_logs(timestamp DESC);

-- ============================================================================
-- INITIAL SEED DATA (Mira Road, Mumbai MMR Context)
-- ============================================================================

-- Insert Departments
INSERT INTO departments (id, name, color) VALUES
('DEPT-ROADS', 'Roads Department', '#2563EB'),
('DEPT-WATER', 'Water Department', '#06B6D4'),
('DEPT-ELEC', 'Electricity Department', '#F59E0B'),
('DEPT-SEWER', 'Sewerage Department', '#10B981'),
('DEPT-TELECOM', 'Telecom Department', '#8B5CF6'),
('DEPT-GAS', 'Gas Department', '#EC4899')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color;

-- Insert System Configuration
INSERT INTO configs (key, value, description) VALUES
('distance_threshold_m', '50.0', 'Distance threshold in meters for spatial collision detection'),
('avg_dig_cost_inr', '350000.0', 'Assumed municipal rework cost per uncoordinated excavation (INR)'),
('cooldown_months', '24', 'Mandatory post-resurfacing moratorium period for newly surfaced roads'),
('monsoon_start', '06-01', 'Annual monsoon digging embargo start date (June 1)'),
('monsoon_end', '09-30', 'Annual monsoon digging embargo conclusion date (Sept 30)'),
('city_center_lat', '19.2812', 'Mira Road default latitude'),
('city_center_lng', '72.8561', 'Mira Road default longitude')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert Users (Password hash is for "Password123!")
INSERT INTO users (id, email, password_hash, name, department_id, role) VALUES
('USR-ADMIN', 'admin@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Mira Bhayandar Municipal Commissioner', NULL, 'ADMIN'),
('USR-ROADS', 'roads@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Executive Engineer (Roads)', 'DEPT-ROADS', 'DEPARTMENT_USER'),
('USR-WATER', 'water@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Superintendent (Water Supply)', 'DEPT-WATER', 'DEPARTMENT_USER'),
('USR-ELEC', 'electricity@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Chief Officer (MSEDCL / Electricity)', 'DEPT-ELEC', 'DEPARTMENT_USER'),
('USR-SEWER', 'sewerage@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Deputy Engineer (Sewerage)', 'DEPT-SEWER', 'DEPARTMENT_USER'),
('USR-TELECOM', 'telecom@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Nodal Officer (Telecom Infrastructure)', 'DEPT-TELECOM', 'DEPARTMENT_USER'),
('USR-GAS', 'gas@miraroad.gov.in', '$2b$12$K8qM9v0fB9T8nZf5x5B0EOgC6n3hJ3Q0r7g1y2u3i4o5p6a7s8d9f', 'Asset Manager (MGL / City Gas)', 'DEPT-GAS', 'DEPARTMENT_USER')
ON CONFLICT (id) DO NOTHING;

-- Insert Road Segments in Mira Road
INSERT INTO road_segments (id, road_id, name, road_type, osm_id, length_meters) VALUES
('RS-001', 'ROAD-MIRA-BHAYANDAR', 'Mira Bhayandar Road', 'Arterial', 'OSM-982144', 3200.0),
('RS-002', 'ROAD-KANAKIA', 'Kanakia Road', 'Residential', 'OSM-761230', 1450.0),
('RS-003', 'ROAD-SHANTI-NAGAR', 'Shanti Nagar Main Road', 'Residential', 'OSM-542190', 1100.0),
('RS-004', 'ROAD-STATION-FEEDER', 'Station Feeder Road', 'Arterial', 'OSM-332198', 750.0),
('RS-005', 'ROAD-BEVERLY-PARK', 'Beverly Park Internal Road', 'Residential', 'OSM-876120', 880.0),
('RS-006', 'ROAD-SILVER-PARK', 'Silver Park - Hatkesh Connector', 'Arterial', 'OSM-654123', 1600.0)
ON CONFLICT (id) DO NOTHING;

-- Insert Seed Projects (Includes 3 deliberate spatial-temporal conflicts)
INSERT INTO projects (
    id, department_id, department, created_by, title, name, project_type, category, geometry_type,
    lat, lng, latitude, longitude, end_lat, end_lng, end_latitude, end_longitude, radius_m, radius_meters,
    road_name, road_type, description, start_date, end_date, status, has_conflict, conflict_check_performed
) VALUES
-- CONFLICT 1: Water Main Replacement vs Arterial Asphalting on Mira Bhayandar Road (CRITICAL)
(
    'PROJ-001', 'DEPT-WATER', 'Water Department', 'USR-WATER',
    'Main Water Trunk Line 600mm Replacement (simulated)',
    'Main Water Trunk Line 600mm Replacement (simulated)',
    'Pipeline', 'underground', 'line',
    19.2845, 72.8660, 19.2845, 72.8660, 19.2862, 72.8685, 19.2862, 72.8685, 30.0, 30.0,
    'Mira Bhayandar Road', 'Arterial',
    'Excavation for replacing aging ductile iron water transmission mains supplying Kanakia and Shanti Park.',
    '2026-12-05', '2026-12-20', 'Planned', TRUE, TRUE
),
(
    'PROJ-002', 'DEPT-ROADS', 'Roads Department', 'USR-ROADS',
    'Arterial Asphalt Micro-Surfacing & Re-Carpeting (simulated)',
    'Arterial Asphalt Micro-Surfacing & Re-Carpeting (simulated)',
    'Resurfacing', 'surface', 'line',
    19.2848, 72.8664, 19.2848, 72.8664, 19.2865, 72.8688, 19.2865, 72.8688, 25.0, 25.0,
    'Mira Bhayandar Road', 'Arterial',
    'Complete bitumen re-carpeting and pedestrian crossing marking before the municipal civic summit.',
    '2026-12-12', '2026-12-28', 'Planned', TRUE, TRUE
),

-- CONFLICT 2: High-Voltage Feeder vs Telecom 5G Fiber Trenching on Kanakia Road (MEDIUM)
(
    'PROJ-003', 'DEPT-ELEC', 'Electricity Department', 'USR-ELEC',
    '11kV Underground Power Cable Installation (simulated)',
    '11kV Underground Power Cable Installation (simulated)',
    'Cabling', 'underground', 'point',
    19.2825, 72.8590, 19.2825, 72.8590, NULL, NULL, NULL, NULL, 35.0, 35.0,
    'Kanakia Road', 'Residential',
    'Laying new insulated feeder cables to alleviate local substation peak transformer load.',
    '2026-11-20', '2026-12-05', 'Planned', TRUE, TRUE
),
(
    'PROJ-004', 'DEPT-TELECOM', 'Telecom Department', 'USR-TELECOM',
    '5G Fiber Backhaul Duct Installation (simulated)',
    '5G Fiber Backhaul Duct Installation (simulated)',
    'Cabling', 'underground', 'point',
    19.2828, 72.8593, 19.2828, 72.8593, NULL, NULL, NULL, NULL, 25.0, 25.0,
    'Kanakia Road', 'Residential',
    'Underground micro-trenching for dark fiber connectivity supporting new 5G small cells.',
    '2026-11-25', '2026-12-08', 'Planned', TRUE, TRUE
),

-- CONFLICT 3: Gas Grid Extension vs Storm Sewer Upgradation on Shanti Nagar (LOW)
(
    'PROJ-005', 'DEPT-GAS', 'Gas Department', 'USR-GAS',
    'PNG Polyethylene Gas Pipeline Extension (simulated)',
    'PNG Polyethylene Gas Pipeline Extension (simulated)',
    'Gas line', 'underground', 'point',
    19.2785, 72.8540, 19.2785, 72.8540, NULL, NULL, NULL, NULL, 20.0, 20.0,
    'Shanti Nagar Main Road', 'Residential',
    'Connecting 400 new residential kitchens in Sector 3 to piped natural gas distribution.',
    '2026-11-15', '2026-11-28', 'Planned', TRUE, TRUE
),
(
    'PROJ-006', 'DEPT-SEWER', 'Sewerage Department', 'USR-SEWER',
    'Precast Stormwater Drain Reconstruction (simulated)',
    'Precast Stormwater Drain Reconstruction (simulated)',
    'Sewerage', 'underground', 'point',
    19.2789, 72.8544, 19.2789, 72.8544, NULL, NULL, NULL, NULL, 20.0, 20.0,
    'Shanti Nagar Main Road', 'Residential',
    'Remodeling concrete box culverts to mitigate localized waterlogging during monsoons.',
    '2026-11-22', '2026-12-10', 'Planned', TRUE, TRUE
),

-- Non-conflicting / Historical / Active Projects
(
    'PROJ-007', 'DEPT-ROADS', 'Roads Department', 'USR-ROADS',
    'Station Feeder Junction Concrete Pavers (simulated)',
    'Station Feeder Junction Concrete Pavers (simulated)',
    'Resurfacing', 'surface', 'point',
    19.2810, 72.8550, 19.2810, 72.8550, NULL, NULL, NULL, NULL, 20.0, 20.0,
    'Station Feeder Road', 'Arterial',
    'Heavy-duty interlocking concrete pavement installation at bus terminal entry.',
    '2026-10-01', '2026-10-25', 'Completed', FALSE, TRUE
),
(
    'PROJ-008', 'DEPT-WATER', 'Water Department', 'USR-WATER',
    'Beverly Park Sump Inlet Valve Replacement (simulated)',
    'Beverly Park Sump Inlet Valve Replacement (simulated)',
    'Pipeline', 'underground', 'point',
    19.2870, 72.8620, 19.2870, 72.8620, NULL, NULL, NULL, NULL, 20.0, 20.0,
    'Beverly Park Internal Road', 'Residential',
    'Replacement of 350mm motorized pressure control sluice valve.',
    '2026-11-05', '2026-11-18', 'Approved', FALSE, TRUE
),
(
    'PROJ-009', 'DEPT-ROADS', 'Roads Department', 'USR-ROADS',
    'Silver Park Arterial LED Smart Streetlighting (simulated)',
    'Silver Park Arterial LED Smart Streetlighting (simulated)',
    'Other', 'surface', 'line',
    19.2890, 72.8710, 19.2890, 72.8710, 19.2915, 72.8745, 19.2915, 72.8745, 20.0, 20.0,
    'Silver Park - Hatkesh Connector', 'Arterial',
    'Installation of central reservation solar-hybrid LED lighting poles.',
    '2026-12-01', '2026-12-25', 'Ongoing', FALSE, TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Insert Seed Conflicts
INSERT INTO conflicts (
    id, project_a_id, project_b_id, calculated_distance, threshold,
    overlap_start, overlap_end, overlapping_days, severity_score, severity_level,
    severity_breakdown, suggested_sequence, resolution, status,
    proximity_score, overlap_score, road_importance_score, conflict_reason
) VALUES
(
    'CONF-001', 'PROJ-001', 'PROJ-002', 18.5, 50.0,
    '2026-12-12', '2026-12-20', 9, 84.5, 'Critical',
    '{"closeness_score": 0.63, "overlap_score": 0.64, "road_importance_score": 1.0, "distance_m": 18.5, "overlap_days": 9}'::jsonb,
    'Deterministic Rule: Underground before Surface. Complete Water pipeline replacement (5–20 Dec) BEFORE Roads resurfacing starts (suggested: 21 Dec – 6 Jan).',
    'Pending', 'Awaiting Acknowledgment',
    0.63, 0.64, 1.0,
    'Direct collision between major Water transmission excavation and immediate Bitumen Resurfacing on an Arterial road corridor.'
),
(
    'CONF-002', 'PROJ-003', 'PROJ-004', 28.2, 50.0,
    '2026-11-25', '2026-12-05', 11, 46.8, 'Medium',
    '{"closeness_score": 0.44, "overlap_score": 0.78, "road_importance_score": 0.5, "distance_m": 28.2, "overlap_days": 11}'::jsonb,
    'Coordinate joint-trenching agreement between MSEDCL (Electricity) and Telecom backhaul to lay conduit concurrently in a shared right-of-way.',
    'Pending', 'Awaiting Acknowledgment',
    0.44, 0.78, 0.5,
    'Parallel underground trenching on residential corridor with 11 days overlapping construction window.'
),
(
    'CONF-003', 'PROJ-005', 'PROJ-006', 42.1, 50.0,
    '2026-11-22', '2026-11-28', 7, 24.2, 'Low',
    '{"closeness_score": 0.16, "overlap_score": 0.50, "road_importance_score": 0.5, "distance_m": 42.1, "overlap_days": 7}'::jsonb,
    'Maintain 1.5m vertical depth separation between gas pipeline and storm drain box culvert; sequence sewer construction first.',
    'Pending', 'Awaiting Acknowledgment',
    0.16, 0.50, 0.5,
    'Subsurface proximity near edge of 50m collision threshold.'
)
ON CONFLICT (id) DO NOTHING;

-- Insert Utility Assets (3D Subsurface Twin)
INSERT INTO utility_assets (id, road_name, department_id, department_name, utility_type, label, depth_m, lat, lng, end_lat, end_lng, is_simulated, installed_on) VALUES
('UTIL-001', 'Mira Bhayandar Road', 'DEPT-WATER', 'Water Department', 'Water Main', '600mm DI Potable Main', 2.2, 19.2842, 72.8658, 19.2868, 72.8690, TRUE, '2018-03-15'),
('UTIL-002', 'Mira Bhayandar Road', 'DEPT-GAS', 'Gas Department', 'Gas Line', '150mm Carbon Steel PNG High Pressure', 1.4, 19.2844, 72.8661, 19.2870, 72.8692, TRUE, '2021-11-10'),
('UTIL-003', 'Kanakia Road', 'DEPT-ELEC', 'Electricity Department', 'High-Voltage Power', '11kV 3-Core XLPE Cable Duct', 1.8, 19.2820, 72.8585, 19.2835, 72.8602, TRUE, '2019-07-22'),
('UTIL-004', 'Kanakia Road', 'DEPT-TELECOM', 'Telecom Department', 'Optical Fiber', '96-Core Armored OFC Trunk', 0.9, 19.2822, 72.8588, 19.2838, 72.8605, TRUE, '2023-01-14'),
('UTIL-005', 'Shanti Nagar Main Road', 'DEPT-SEWER', 'Sewerage Department', 'Stormwater Drain', '1200x1000 RCC Box Drain', 2.8, 19.2780, 72.8535, 19.2795, 72.8552, TRUE, '2016-05-18')
ON CONFLICT (id) DO NOTHING;

-- Insert Audit Logs
INSERT INTO audit_logs (id, action_type, project_id, conflict_id, user_id, actor, department, note) VALUES
('AUD-001', 'SYSTEM_INIT', NULL, NULL, 'USR-ADMIN', 'System Genesis', 'City Administration', 'CivicSync Supabase platform initialized for Mira Road study jurisdiction.'),
('AUD-002', 'CONFLICT_DETECTED', 'PROJ-002', 'CONF-001', 'SYSTEM', 'Deterministic Engine', 'Roads Department', 'Critical Conflict detected on Mira Bhayandar Road: 18.5m distance and 9 days overlap with PROJ-001.'),
('AUD-003', 'PROJECT_CREATED', 'PROJ-001', NULL, 'USR-WATER', 'Superintendent (Water)', 'Water Department', 'Registered Water Trunk Line 600mm Replacement on Mira Bhayandar Road.')
ON CONFLICT (id) DO NOTHING;

-- Insert Project History
INSERT INTO project_history (id, project_id, old_status, new_status, changed_by, reason) VALUES
('HIST-001', 'PROJ-007', 'Planned', 'Approved', 'USR-ADMIN', 'Technical inspection completed with 0 spatial conflicts.'),
('HIST-002', 'PROJ-007', 'Approved', 'Ongoing', 'USR-ROADS', 'Contractor mobilized on site.'),
('HIST-003', 'PROJ-007', 'Ongoing', 'Completed', 'USR-ROADS', 'Pavement works finalized and quality certificate issued.'),
('HIST-004', 'PROJ-009', 'Approved', 'Ongoing', 'USR-ROADS', 'Foundation pole civil work started on central divider.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. GENCITY 3D ASSETS (AI 3D Urban Twin GLB Models)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gencity_assets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    poly_count INTEGER NOT NULL,
    file_size_kb INTEGER NOT NULL,
    model_url VARCHAR(255) NOT NULL,
    format VARCHAR(64) NOT NULL,
    created_via VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    road_name VARCHAR(255),
    depth_m DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO gencity_assets (id, name, category, poly_count, file_size_kb, model_url, format, created_via, latitude, longitude, road_name, depth_m) VALUES
('asset-001', 'Mira Commercial Skyscraper', 'Building', 480, 16, '/models/mira_commercial_tower.glb', 'glTF 2.0 Binary (GLB)', 'TRELLIS / Hugging Face (@indresh404)', 19.2825, 72.8590, 'Kanakia Road', 0.0),
('asset-002', '600mm Subsurface Water Pipeline & Trench', 'Subsurface Utility', 820, 30, '/models/water_pipeline_trench.glb', 'glTF 2.0 Binary (GLB)', 'Stable Fast 3D / Hugging Face (@indresh404)', 19.2812, 72.8561, 'Mira Bhayandar Road', -2.4),
('asset-003', 'Active Road Excavation & Milling Zone', 'Construction Scene', 760, 30, '/models/road_excavation_site.glb', 'glTF 2.0 Binary (GLB)', 'TRELLIS / Hugging Face (@indresh404)', 19.2845, 72.8630, 'Mira Bhayandar Road', 0.0),
('asset-004', 'Municipal Hydraulic Tracked Excavator', 'Heavy Machinery', 640, 14, '/models/heavy_excavator.glb', 'glTF 2.0 Binary (GLB)', 'Stable Fast 3D / Hugging Face (@indresh404)', 19.2785, 72.8540, 'Shanti Nagar Sector 2', 0.0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    poly_count = EXCLUDED.poly_count,
    file_size_kb = EXCLUDED.file_size_kb,
    model_url = EXCLUDED.model_url,
    format = EXCLUDED.format,
    created_via = EXCLUDED.created_via,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    road_name = EXCLUDED.road_name,
    depth_m = EXCLUDED.depth_m;
