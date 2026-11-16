-- ============================================================================
-- CivicSync — Supabase SQL Query Commands & Operational Playbook
-- Use these in the Supabase SQL Editor (https://supabase.com/dashboard/project/jybmayzghguojngtyjdk/sql)
-- ============================================================================

-- 1. OVERVIEW: Check Total Projects, Active Conflicts, and Departments
SELECT 
    (SELECT COUNT(*) FROM departments) AS total_departments,
    (SELECT COUNT(*) FROM projects) AS total_projects,
    (SELECT COUNT(*) FROM conflicts WHERE status != 'Closed') AS active_conflicts,
    (SELECT COUNT(*) FROM utility_assets) AS registered_utility_assets,
    (SELECT COUNT(*) FROM audit_logs) AS total_audit_entries;

-- 2. DETECT CONFLICTS: View All Unresolved Spatial-Temporal Conflicts with Project Names
SELECT 
    c.id AS conflict_id,
    c.severity_level,
    c.severity_score,
    c.calculated_distance AS distance_meters,
    c.overlapping_days,
    pa.name AS project_a_name,
    pa.department AS dept_a,
    pb.name AS project_b_name,
    pb.department AS dept_b,
    c.suggested_sequence,
    c.ack_a AS dept_a_acknowledged,
    c.ack_b AS dept_b_acknowledged,
    c.status
FROM conflicts c
JOIN projects pa ON c.project_a_id = pa.id
JOIN projects pb ON c.project_b_id = pb.id
ORDER BY c.severity_score DESC;

-- 3. MUNICIPAL COST AVOIDED: Estimated INR Saved via Proactive Conflict Detection
-- Formula: (Caught Conflicts) * Assumed Cost per Rework (Rs 3,50,000)
SELECT 
    COUNT(*) AS prevented_redigs,
    COUNT(*) * 350000.0 AS estimated_inr_saved,
    TO_CHAR(COUNT(*) * 350000.0, 'FM99,99,99,999') || ' INR' AS formatted_savings
FROM conflicts;

-- 4. ROAD CORRIDOR DNA: Projects and History by Road Name
SELECT 
    p.road_name,
    p.road_type,
    COUNT(p.id) AS total_projects,
    STRING_AGG(DISTINCT p.department, ', ') AS departments_involved,
    COUNT(CASE WHEN p.status = 'Planned' THEN 1 END) AS planned,
    COUNT(CASE WHEN p.status = 'Approved' THEN 1 END) AS approved,
    COUNT(CASE WHEN p.status = 'Ongoing' THEN 1 END) AS ongoing,
    COUNT(CASE WHEN p.status = 'Completed' THEN 1 END) AS completed
FROM projects p
GROUP BY p.road_name, p.road_type
ORDER BY total_projects DESC;

-- 5. ACKNOWLEDGE A CONFLICT (Simulate Department User Action)
-- Replace 'CONF-001' and 'USR-ROADS' as needed:
/*
UPDATE conflicts 
SET 
    ack_b = TRUE,
    ack_b_at = CURRENT_TIMESTAMP,
    ack_b_by = 'USR-ROADS',
    status = CASE WHEN ack_a = TRUE THEN 'Ready for Approval' ELSE 'Pending Dept A Ack' END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'CONF-001';

INSERT INTO audit_logs (id, action_type, conflict_id, actor, department, note)
VALUES ('AUD-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 'ACKNOWLEDGE_CONFLICT', 'CONF-001', 'Executive Engineer (Roads)', 'Roads Department', 'Acknowledged conflict and agreed to sequential resurfacing schedule.');
*/

-- 6. APPROVE A PROJECT (Gatekeeper: Only if 0 unacknowledged conflicts)
/*
UPDATE projects
SET 
    status = 'Approved',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'PROJ-001';

INSERT INTO project_history (id, project_id, old_status, new_status, changed_by, reason)
VALUES ('HIST-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 'PROJ-001', 'Planned', 'Approved', 'USR-ADMIN', 'All department acknowledgments satisfied.');
*/

-- 7. AUDIT TRAIL: Inspect Recent Immutable Actions
SELECT 
    timestamp,
    actor,
    department,
    action_type,
    note,
    project_id,
    conflict_id
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 20;

-- 8. SUBSURFACE 3D TWIN: List Registered Utility Assets along Mira Bhayandar Road
SELECT 
    label,
    utility_type,
    department_name,
    depth_m,
    lat, lng,
    installed_on
FROM utility_assets
WHERE road_name = 'Mira Bhayandar Road'
ORDER BY depth_m ASC;

-- 9. GENCITY 3D DIGITAL TWIN: Inspect Registered 3D Construction & Urban Mesh Assets
SELECT 
    id,
    name,
    category,
    glb_url,
    poly_count,
    file_size_kb,
    lat,
    lng,
    road_name,
    depth_m,
    is_active
FROM gencity_assets
ORDER BY created_at ASC;

-- 10. 3D ASSET METRICS & POLYGON BUDGET ANALYSIS
SELECT 
    category,
    COUNT(*) AS asset_count,
    SUM(poly_count) AS total_polygons,
    ROUND(AVG(poly_count), 0) AS avg_polygons_per_model,
    SUM(file_size_kb) || ' KB' AS total_mesh_payload,
    STRING_AGG(name, ', ') AS registered_models
FROM gencity_assets
GROUP BY category;

