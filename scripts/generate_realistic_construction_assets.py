import struct
import json
import os
import math

def build_glb(meshes_data):
    bin_buffer = bytearray()
    buffer_views = []
    accessors = []
    materials = []
    nodes = []
    gltf_meshes = []

    for mesh_idx, m in enumerate(meshes_data):
        # 1. Vertices (FLOAT VEC3)
        vert_offset = len(bin_buffer)
        min_v = [float('inf')]*3
        max_v = [float('-inf')]*3
        for v in m['vertices']:
            for i in range(3):
                min_v[i] = min(min_v[i], v[i])
                max_v[i] = max(max_v[i], v[i])
            bin_buffer.extend(struct.pack('<fff', v[0], v[1], v[2]))
        while len(bin_buffer) % 4 != 0:
            bin_buffer.append(0)
        vert_len = len(bin_buffer) - vert_offset

        bv_vert_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": vert_offset,
            "byteLength": vert_len,
            "target": 34962
        })
        acc_vert_idx = len(accessors)
        accessors.append({
            "bufferView": bv_vert_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": len(m['vertices']),
            "type": "VEC3",
            "max": max_v,
            "min": min_v
        })

        # 2. Normals (FLOAT VEC3)
        norm_offset = len(bin_buffer)
        for n in m['normals']:
            bin_buffer.extend(struct.pack('<fff', n[0], n[1], n[2]))
        while len(bin_buffer) % 4 != 0:
            bin_buffer.append(0)
        norm_len = len(bin_buffer) - norm_offset

        bv_norm_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": norm_offset,
            "byteLength": norm_len,
            "target": 34962
        })
        acc_norm_idx = len(accessors)
        accessors.append({
            "bufferView": bv_norm_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": len(m['normals']),
            "type": "VEC3"
        })

        # 3. Indices (UNSIGNED_SHORT SCALAR)
        idx_offset = len(bin_buffer)
        for idx in m['indices']:
            bin_buffer.extend(struct.pack('<H', idx))
        while len(bin_buffer) % 4 != 0:
            bin_buffer.append(0)
        idx_len = len(bin_buffer) - idx_offset

        bv_idx_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_offset,
            "byteLength": idx_len,
            "target": 34963
        })
        acc_idx_idx = len(accessors)
        accessors.append({
            "bufferView": bv_idx_idx,
            "byteOffset": 0,
            "componentType": 5123,
            "count": len(m['indices']),
            "type": "SCALAR"
        })

        # 4. Material
        mat_idx = len(materials)
        materials.append({
            "name": m.get('material_name', f"Mat_{mesh_idx}"),
            "pbrMetallicRoughness": {
                "baseColorFactor": m.get('base_color', [0.8, 0.8, 0.8, 1.0]),
                "metallicFactor": m.get('metallic', 0.2),
                "roughnessFactor": m.get('roughness', 0.5)
            },
            "doubleSided": True
        })

        # 5. Mesh & Node
        gltf_mesh_idx = len(gltf_meshes)
        gltf_meshes.append({
            "name": m.get('name', f"Mesh_{mesh_idx}"),
            "primitives": [{
                "attributes": {
                    "POSITION": acc_vert_idx,
                    "NORMAL": acc_norm_idx
                },
                "indices": acc_idx_idx,
                "material": mat_idx
            }]
        })

        node_obj = {
            "name": m.get('name', f"Node_{mesh_idx}"),
            "mesh": gltf_mesh_idx
        }
        if 'translation' in m:
            node_obj['translation'] = m['translation']
        if 'rotation' in m:
            node_obj['rotation'] = m['rotation']
        nodes.append(node_obj)

    scene_nodes = list(range(len(nodes)))
    gltf_dict = {
        "asset": {"version": "2.0", "generator": "CivicSync-Realistic3D-Engine"},
        "scene": 0,
        "scenes": [{"name": "DefaultScene", "nodes": scene_nodes}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "buffers": [{"byteLength": len(bin_buffer)}],
        "bufferViews": buffer_views,
        "accessors": accessors
    }

    json_bytes = json.dumps(gltf_dict, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)
    header = struct.pack('<4sII', b'glTF', 2, total_len)
    chunk0_hdr = struct.pack('<II', len(json_bytes), 0x4E4F534A)
    chunk1_hdr = struct.pack('<II', len(bin_buffer), 0x004E4942)

    return header + chunk0_hdr + json_bytes + chunk1_hdr + bytes(bin_buffer)

def make_box(x0, y0, z0, dx, dy, dz, mat_name, color, metallic=0.2, roughness=0.5, name=None):
    verts = []
    norms = []
    indices = []

    faces = [
        ((0, 0, 1), [(x0, y0, z0+dz), (x0+dx, y0, z0+dz), (x0+dx, y0+dy, z0+dz), (x0, y0+dy, z0+dz)]),
        ((0, 0, -1), [(x0+dx, y0, z0), (x0, y0, z0), (x0, y0+dy, z0), (x0+dx, y0+dy, z0)]),
        ((-1, 0, 0), [(x0, y0, z0), (x0, y0, z0+dz), (x0, y0+dy, z0+dz), (x0, y0+dy, z0)]),
        ((1, 0, 0), [(x0+dx, y0, z0+dz), (x0+dx, y0, z0), (x0+dx, y0+dy, z0), (x0+dx, y0+dy, z0+dz)]),
        ((0, 1, 0), [(x0, y0+dy, z0+dz), (x0+dx, y0+dy, z0+dz), (x0+dx, y0+dy, z0), (x0, y0+dy, z0)]),
        ((0, -1, 0), [(x0, y0, z0), (x0+dx, y0, z0), (x0+dx, y0, z0+dz), (x0, y0, z0+dz)])
    ]

    for norm, corners in faces:
        base_i = len(verts)
        for c in corners:
            verts.append(c)
            norms.append(norm)
        indices.extend([base_i, base_i+1, base_i+2, base_i, base_i+2, base_i+3])

    return {
        'name': name or mat_name,
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_name': mat_name,
        'base_color': color,
        'metallic': metallic,
        'roughness': roughness
    }

def make_cylinder(cx, cz, y0, radius, height, segments, mat_name, color, axis='y', metallic=0.4, roughness=0.4, name=None):
    verts = []
    norms = []
    indices = []

    for i in range(segments):
        theta0 = 2 * math.pi * i / segments
        theta1 = 2 * math.pi * (i + 1) / segments

        if axis == 'y':
            x0 = cx + radius * math.cos(theta0)
            z0 = cz + radius * math.sin(theta0)
            x1 = cx + radius * math.cos(theta1)
            z1 = cz + radius * math.sin(theta1)
            n0 = (math.cos(theta0), 0, math.sin(theta0))
            n1 = (math.cos(theta1), 0, math.sin(theta1))
            base_i = len(verts)
            verts.extend([(x0, y0, z0), (x1, y0, z1), (x1, y0 + height, z1), (x0, y0 + height, z0)])
        elif axis == 'z':
            x0 = cx + radius * math.cos(theta0)
            y0_c = y0 + radius * math.sin(theta0)
            x1 = cx + radius * math.cos(theta1)
            y1_c = y0 + radius * math.sin(theta1)
            n0 = (math.cos(theta0), math.sin(theta0), 0)
            n1 = (math.cos(theta1), math.sin(theta1), 0)
            base_i = len(verts)
            verts.extend([(x0, y0_c, cz), (x1, y1_c, cz), (x1, y1_c, cz + height), (x0, y0_c, cz + height)])
        elif axis == 'x':
            y0_c = y0 + radius * math.cos(theta0)
            z0_c = cz + radius * math.sin(theta0)
            y1_c = y0 + radius * math.cos(theta1)
            z1_c = cz + radius * math.sin(theta1)
            n0 = (0, math.cos(theta0), math.sin(theta0))
            n1 = (0, math.cos(theta1), math.sin(theta1))
            base_i = len(verts)
            verts.extend([(cx, y0_c, z0_c), (cx + height, y0_c, z0_c), (cx + height, y1_c, z1_c), (cx, y1_c, z1_c)])

        norms.extend([n0, n1, n1, n0])
        indices.extend([base_i, base_i+1, base_i+2, base_i, base_i+2, base_i+3])

    return {
        'name': name or mat_name,
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_name': mat_name,
        'base_color': color,
        'metallic': metallic,
        'roughness': roughness
    }

# ==============================================================================
# 1. SITE A: HIGH-RISE UNDER CONSTRUCTION WITH ACTIVE TOWER CRANE
# ==============================================================================
def generate_highrise_under_construction():
    meshes = []
    # Ground excavation & foundation slab
    meshes.append(make_box(-16, -1.0, -16, 32, 1.2, 32, "FoundationEarth", [0.38, 0.32, 0.25, 1.0], 0.0, 0.95))
    meshes.append(make_box(-14, 0.2, -14, 28, 0.8, 28, "ConcreteRaftFoundation", [0.65, 0.67, 0.70, 1.0], 0.1, 0.8))

    # Completed floors 1 through 4 (exposed concrete slabs and columns)
    floor_height = 4.2
    for fl in range(4):
        y = 1.0 + fl * floor_height
        # Concrete floor slab
        meshes.append(make_box(-12, y, -12, 24, 0.45, 24, f"FloorSlab_{fl+1}", [0.68, 0.70, 0.72, 1.0], 0.1, 0.85))
        # Structural concrete columns
        for cx in [-10, -3.5, 3.5, 10]:
            for cz in [-10, -3.5, 3.5, 10]:
                meshes.append(make_box(cx-0.45, y+0.45, cz-0.45, 0.9, floor_height-0.45, 0.9, f"Column_{fl+1}_{cx}_{cz}", [0.62, 0.64, 0.66, 1.0], 0.1, 0.8))
        # Central elevator core
        meshes.append(make_box(-3.5, y+0.45, -3.5, 7.0, floor_height-0.45, 7.0, f"LiftCore_{fl+1}", [0.55, 0.58, 0.60, 1.0], 0.1, 0.85))

    # Floor 5: Active construction level with exposed rebar and timber formwork
    y5 = 1.0 + 4 * floor_height
    meshes.append(make_box(-12, y5, -12, 24, 0.45, 24, "FloorSlab_5_Formwork", [0.72, 0.52, 0.32, 1.0], 0.1, 0.7))
    for cx in [-10, -3.5, 3.5, 10]:
        for cz in [-10, -3.5, 3.5, 10]:
            # Exposed vertical steel rebar cages
            meshes.append(make_box(cx-0.3, y5+0.45, cz-0.3, 0.6, 3.5, 0.6, f"Rebar_{cx}_{cz}", [0.45, 0.25, 0.20, 1.0], 0.8, 0.4))
    # Green debris safety netting along exterior
    meshes.append(make_box(-12.2, 1.0, -12.2, 24.4, y5, 0.1, "SafetyNettingNorth", [0.08, 0.55, 0.25, 0.75], 0.0, 0.9))
    meshes.append(make_box(-12.2, 1.0, 12.1, 24.4, y5, 0.1, "SafetyNettingSouth", [0.08, 0.55, 0.25, 0.75], 0.0, 0.9))

    # Modular steel scaffolding on west facade
    for tier in range(5):
        sy = 1.0 + tier * 3.6
        meshes.append(make_box(-13.8, sy, -11, 1.4, 0.15, 22, f"ScaffoldDeck_{tier}", [0.7, 0.7, 0.72, 1.0], 0.6, 0.4))
        for sz in range(-10, 11, 4):
            meshes.append(make_cylinder(-13.8, sz, sy, 0.08, 3.6, 8, f"ScaffoldPipe_{tier}_{sz}", [0.85, 0.85, 0.88, 1.0], axis='y', metallic=0.9, roughness=0.2))

    # Tower Crane mounted in building core
    crane_base_y = y5 + 0.45
    crane_height = 18.0
    # Vertical lattice mast (yellow)
    meshes.append(make_box(-1.0, crane_base_y, -1.0, 2.0, crane_height, 2.0, "TowerCraneMast", [0.95, 0.75, 0.05, 1.0], 0.5, 0.4))
    # Operator cabin & slewing unit
    cabin_y = crane_base_y + crane_height
    meshes.append(make_box(-1.4, cabin_y, -1.4, 2.8, 2.2, 2.8, "CraneSlewingUnit", [0.15, 0.15, 0.18, 1.0], 0.7, 0.3))
    meshes.append(make_box(0.5, cabin_y+0.4, -0.8, 1.6, 1.6, 1.6, "CraneOperatorCab", [0.2, 0.6, 0.9, 0.8], 0.9, 0.1))

    # Rotating Horizontal Jib (named node "CraneJib" for dynamic animation)
    jib_y = cabin_y + 2.4
    meshes.append(make_box(-2.0, jib_y, -1.0, 28.0, 1.6, 2.0, "CraneJibTruss", [0.95, 0.75, 0.05, 1.0], 0.5, 0.4, name="CraneJib"))
    meshes.append(make_box(-12.0, jib_y, -1.0, 10.0, 1.6, 2.0, "CraneCounterJib", [0.95, 0.75, 0.05, 1.0], 0.5, 0.4, name="CraneJib"))
    meshes.append(make_box(-11.5, jib_y+0.2, -1.4, 4.0, 2.2, 2.8, "CounterweightBlocks", [0.5, 0.52, 0.55, 1.0], 0.1, 0.85, name="CraneJib"))
    # Hoist cable & suspended concrete bucket
    meshes.append(make_cylinder(14.0, 0, jib_y - 10.0, 0.04, 10.0, 6, "CraneHoistCable", [0.2, 0.2, 0.2, 1.0], axis='y', metallic=0.9, roughness=0.1, name="CraneJib"))
    meshes.append(make_cylinder(14.0, 0, jib_y - 11.8, 0.9, 1.8, 14, "SuspendedBucket", [0.95, 0.45, 0.05, 1.0], axis='y', metallic=0.6, roughness=0.3, name="CraneJib"))

    # Perimeter security barricade around site
    for bx in range(-15, 16, 6):
        meshes.append(make_box(bx, 0, -15.5, 5.8, 2.0, 0.2, f"SiteFenceN_{bx}", [0.85, 0.85, 0.88, 1.0], 0.7, 0.3))
        meshes.append(make_box(bx, 0, 15.3, 5.8, 2.0, 0.2, f"SiteFenceS_{bx}", [0.85, 0.85, 0.88, 1.0], 0.7, 0.3))

    return build_glb(meshes)

# ==============================================================================
# 2. SITE B: ROAD CONSTRUCTION SCENE WITH ROLLER, EXCAVATOR & ASPHALT PAVER
# ==============================================================================
def generate_road_construction_site():
    meshes = []
    # Existing 4-lane asphalt road strip (width 18m, length 40m)
    meshes.append(make_box(-9, 0, -20, 18, 0.4, 40, "BaseRoadAsphalt", [0.25, 0.26, 0.28, 1.0], 0.1, 0.8))
    # Milled bitumen work zone lane (length 24m)
    meshes.append(make_box(-8.5, 0.15, -12, 7.5, 0.22, 24, "MilledAsphaltSubgrade", [0.35, 0.28, 0.20, 1.0], 0.0, 0.95))
    # Fresh hot-mix black asphalt overlay behind paver (length 10m)
    meshes.append(make_box(-8.5, 0.38, 0, 7.5, 0.05, 10, "FreshPavedBitumen", [0.12, 0.13, 0.14, 1.0], 0.2, 0.6))

    # Road safety traffic cones along centerline dividing traffic
    for cz in range(-18, 19, 3):
        meshes.append(make_box(-0.4, 0.41, cz-0.4, 0.8, 0.06, 0.8, f"TrafficConeBase_{cz}", [0.95, 0.35, 0.05, 1.0], 0.1, 0.5))
        meshes.append(make_cylinder(0, cz, 0.47, 0.26, 0.95, 12, f"TrafficConeCone_{cz}", [0.98, 0.38, 0.05, 1.0], axis='y', metallic=0.1, roughness=0.4))
        meshes.append(make_cylinder(0, cz, 0.85, 0.22, 0.26, 12, f"ConeReflectiveBand_{cz}", [0.98, 0.98, 0.98, 1.0], axis='y', metallic=0.4, roughness=0.2))

    # Concrete safety barriers (Jersey barriers with chevron warning stripes)
    for bz in [-16, -10, -4, 2, 8, 14]:
        meshes.append(make_box(-8.8, 0.4, bz, 0.5, 1.1, 5.5, f"JerseyBarrierW_{bz}", [0.72, 0.74, 0.76, 1.0], 0.1, 0.8))
        meshes.append(make_box(-8.75, 0.7, bz+1.5, 0.55, 0.3, 2.5, f"BarrierChevron_{bz}", [0.95, 0.85, 0.05, 1.0], 0.2, 0.5))

    # Municipal LED Variable Message Sign (VMS) trailer
    meshes.append(make_box(6.0, 0.4, -15, 2.4, 1.0, 4.0, "VMSTrailerChassis", [0.95, 0.75, 0.05, 1.0], 0.4, 0.5))
    meshes.append(make_box(6.2, 1.4, -14, 2.0, 2.4, 0.3, "VMSDisplayScreen", [0.05, 0.05, 0.05, 1.0], 0.9, 0.1))
    meshes.append(make_box(6.5, 1.8, -13.9, 1.4, 1.6, 0.05, "VMSLedAmberText", [0.98, 0.65, 0.05, 1.0], 0.0, 0.1))

    return build_glb(meshes)

# ==============================================================================
# 3. SITE C: DEEP UNDERGROUND UTILITY INSTALLATION & PIPE TRENCH
# ==============================================================================
def generate_underground_utility_trench():
    meshes = []
    # Road surface with open excavation cutaway
    meshes.append(make_box(-12, 0, -15, 8.0, 0.45, 30, "RoadAsphaltLeft", [0.26, 0.28, 0.30, 1.0], 0.1, 0.8))
    meshes.append(make_box(4, 0, -15, 8.0, 0.45, 30, "RoadAsphaltRight", [0.26, 0.28, 0.30, 1.0], 0.1, 0.8))

    # Deep trench cut (depth 3.2m below road, width 8m, length 30m)
    meshes.append(make_box(-4.0, -3.2, -15, 8.0, 3.2, 30, "TrenchExcavatedEarth", [0.42, 0.30, 0.18, 1.0], 0.0, 0.95))
    # Trench bed bedding gravel
    meshes.append(make_box(-3.8, -3.2, -15, 7.6, 0.4, 30, "GravelBedding", [0.55, 0.52, 0.48, 1.0], 0.1, 0.9))

    # Steel trench shoring boxes (safety trench shields)
    for tz in [-10, 0, 10]:
        meshes.append(make_box(-3.9, -2.8, tz-4, 0.25, 3.2, 8.0, f"ShoringPlateL_{tz}", [0.95, 0.75, 0.05, 1.0], 0.6, 0.4))
        meshes.append(make_box(3.65, -2.8, tz-4, 0.25, 3.2, 8.0, f"ShoringPlateR_{tz}", [0.95, 0.75, 0.05, 1.0], 0.6, 0.4))
        # Heavy hydraulic cross-struts
        for sy in [-2.0, -0.6]:
            meshes.append(make_cylinder(-3.65, tz-1, sy, 0.12, 7.3, 12, f"Strut_{tz}_{sy}", [0.9, 0.1, 0.1, 1.0], axis='x', metallic=0.8, roughness=0.3))

    # 1. 600mm DI Potable Water Pipeline (Ductile Iron blue, class K9)
    meshes.append(make_cylinder(-1.5, -15, -2.2, 0.65, 30.0, 20, "DIWaterPipe600", [0.08, 0.52, 0.88, 1.0], axis='z', metallic=0.6, roughness=0.3))
    # Flanged coupling joints
    for fz in [-10, -2, 6, 14]:
        meshes.append(make_cylinder(-1.5, fz-0.3, -2.2, 0.82, 0.6, 20, f"WaterFlange_{fz}", [0.1, 0.35, 0.65, 1.0], axis='z', metallic=0.8, roughness=0.2))

    # 2. 900mm Reinforced Concrete Storm Sewer Pipe
    meshes.append(make_cylinder(1.5, -15, -2.0, 0.95, 30.0, 20, "RCCStormSewer900", [0.60, 0.62, 0.64, 1.0], axis='z', metallic=0.1, roughness=0.85))

    # Pipe sections staged on roadside awaiting installation
    for pz in [-8, -2, 4]:
        meshes.append(make_cylinder(6.5, pz, 0.45, 0.65, 5.5, 18, f"StagedWaterPipe_{pz}", [0.08, 0.52, 0.88, 1.0], axis='z', metallic=0.6, roughness=0.3))

    # Excavated soil spoil pile beside trench
    meshes.append(make_box(4.5, 0.45, -12, 4.0, 1.8, 18, "ExcavatedSoilBerm", [0.45, 0.32, 0.20, 1.0], 0.0, 0.95))

    # Safety perimeter guard rails with orange warning netting
    for rz in range(-14, 15, 4):
        meshes.append(make_box(-4.4, 0.45, rz, 0.15, 1.2, 3.8, f"TrenchGuardL_{rz}", [0.98, 0.45, 0.05, 1.0], 0.2, 0.5))
        meshes.append(make_box(4.25, 0.45, rz, 0.15, 1.2, 3.8, f"TrenchGuardR_{rz}", [0.98, 0.45, 0.05, 1.0], 0.2, 0.5))

    return build_glb(meshes)

# ==============================================================================
# 4. SITE D: COMMERCIAL CIVIC COMPLEX UNDER CONSTRUCTION
# ==============================================================================
def generate_commercial_construction_site():
    meshes = []
    # Site grading and gravel yard
    meshes.append(make_box(-18, 0, -18, 36, 0.3, 36, "CommercialSiteYard", [0.52, 0.50, 0.46, 1.0], 0.1, 0.9))

    # 3-Story Partially Framed Commercial Structure
    # Concrete ground slab
    meshes.append(make_box(-12, 0.3, -12, 24, 0.5, 24, "RetailGroundSlab", [0.65, 0.67, 0.70, 1.0], 0.1, 0.8))

    # Structural Steel I-Beam Framework (Red-oxide primer & steel grey)
    for lvl in range(2):
        ly = 0.8 + lvl * 4.5
        # Vertical steel columns
        for cx in [-10, -3.5, 3.5, 10]:
            for cz in [-10, -3.5, 3.5, 10]:
                meshes.append(make_box(cx-0.35, ly, cz-0.35, 0.7, 4.5, 0.7, f"SteelCol_{lvl}_{cx}_{cz}", [0.75, 0.22, 0.18, 1.0], 0.7, 0.3))
        # Horizontal steel girders
        for cx in [-10, 10]:
            meshes.append(make_box(cx-0.3, ly+4.2, -10, 0.6, 0.6, 20, f"GirderZ_{lvl}_{cx}", [0.75, 0.22, 0.18, 1.0], 0.7, 0.3))
        for cz in [-10, 10]:
            meshes.append(make_box(-10, ly+4.2, cz-0.3, 20, 0.6, 0.6, f"GirderX_{lvl}_{cz}", [0.75, 0.22, 0.18, 1.0], 0.7, 0.3))
        # Concrete floor decking (half installed on level 2)
        if lvl == 0:
            meshes.append(make_box(-10, ly+4.5, -10, 20, 0.3, 20, "Level2Deck", [0.62, 0.64, 0.66, 1.0], 0.1, 0.8))
        else:
            meshes.append(make_box(-10, ly+4.5, -10, 10, 0.3, 20, "Level3DeckPartial", [0.62, 0.64, 0.66, 1.0], 0.1, 0.8))

    # Material staging area: Pallets of aerated concrete blocks and rebar bundles
    for px in [-15, -11]:
        for pz in [8, 12]:
            meshes.append(make_box(px, 0.3, pz, 2.4, 0.15, 2.4, f"WoodPallet_{px}_{pz}", [0.68, 0.48, 0.28, 1.0], 0.1, 0.8))
            meshes.append(make_box(px+0.1, 0.45, pz+0.1, 2.2, 1.6, 2.2, f"AACBlocks_{px}_{pz}", [0.82, 0.84, 0.86, 1.0], 0.1, 0.85))

    # Steel rebar storage cages
    meshes.append(make_box(6, 0.3, 10, 3.5, 0.8, 6.0, "RebarStagingCages", [0.45, 0.25, 0.18, 1.0], 0.85, 0.35))

    return build_glb(meshes)

# ==============================================================================
# 5. MACHINERY 1: HEAVY HYDRAULIC TRACKED EXCAVATOR
# ==============================================================================
def generate_hydraulic_excavator():
    meshes = []
    # Left and right tracked crawler undercarriages
    meshes.append(make_box(-1.8, 0, -2.6, 0.75, 0.9, 5.2, "CrawlerTrackL", [0.15, 0.15, 0.16, 1.0], 0.6, 0.7))
    meshes.append(make_box(1.05, 0, -2.6, 0.75, 0.9, 5.2, "CrawlerTrackR", [0.15, 0.15, 0.16, 1.0], 0.6, 0.7))
    # Sprocket and idler rollers
    for tz in [-2.2, -1.0, 0.2, 1.4, 2.2]:
        meshes.append(make_cylinder(-1.42, tz, 0.45, 0.35, 0.76, 10, f"RollerL_{tz}", [0.2, 0.2, 0.22, 1.0], axis='x', metallic=0.7, roughness=0.3))
        meshes.append(make_cylinder(1.05, tz, 0.45, 0.35, 0.76, 10, f"RollerR_{tz}", [0.2, 0.2, 0.22, 1.0], axis='x', metallic=0.7, roughness=0.3))
    # Center turntable chassis
    meshes.append(make_cylinder(0, 0, 0.6, 1.1, 0.5, 18, "TurntableRing", [0.2, 0.2, 0.22, 1.0], axis='y', metallic=0.8, roughness=0.2))

    # Upper Rotating House/Deck (CAT Industrial Yellow) - Named node "ExcavatorDeck"
    meshes.append(make_box(-1.6, 1.1, -2.2, 3.2, 1.5, 4.0, "ExcavatorHouse", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4, name="ExcavatorDeck"))
    # Heavy rear counterweight
    meshes.append(make_box(-1.6, 1.2, -2.5, 3.2, 1.4, 0.6, "CounterweightBlock", [0.15, 0.16, 0.18, 1.0], 0.5, 0.5, name="ExcavatorDeck"))
    # Operator Glass Cabin
    meshes.append(make_box(-1.5, 1.5, 0.2, 1.2, 1.5, 1.6, "OperatorCab", [0.2, 0.7, 0.9, 0.8], 0.9, 0.1, name="ExcavatorDeck"))

    # Two-piece articulated hydraulic boom & arm - Named node "ExcavatorBoom"
    meshes.append(make_box(-0.35, 1.8, 1.0, 0.7, 3.8, 1.6, "MainBoomArm", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4, name="ExcavatorBoom"))
    # Dipper stick (arm)
    meshes.append(make_box(-0.3, 4.8, 2.2, 0.6, 1.1, 3.5, "DipperStick", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4, name="ExcavatorBoom"))
    # Heavy digging bucket with reinforced teeth
    meshes.append(make_box(-0.55, 4.2, 5.2, 1.1, 1.1, 1.3, "HeavyBucket", [0.18, 0.19, 0.22, 1.0], 0.8, 0.3, name="ExcavatorBoom"))
    # Hydraulic cylinder pistons
    meshes.append(make_cylinder(0, 1.8, 2.2, 0.12, 2.8, 12, "BoomHydraulicCylinder", [0.9, 0.9, 0.92, 1.0], axis='y', metallic=0.95, roughness=0.1, name="ExcavatorBoom"))

    return build_glb(meshes)

# ==============================================================================
# 6. MACHINERY 2: HEAVY CONCRETE MIXER TRUCK
# ==============================================================================
def generate_concrete_mixer():
    meshes = []
    # Heavy 3-axle carrier chassis frame
    meshes.append(make_box(-1.1, 0.6, -3.8, 2.2, 0.4, 7.6, "TruckChassisFrame", [0.15, 0.16, 0.18, 1.0], 0.7, 0.4))
    # 6 heavy construction wheels
    for wz in [-2.8, -1.4, 2.8]:
        meshes.append(make_cylinder(-1.4, wz, 0.5, 0.55, 0.45, 16, f"WheelL_{wz}", [0.12, 0.12, 0.13, 1.0], axis='x', metallic=0.2, roughness=0.8))
        meshes.append(make_cylinder(0.95, wz, 0.5, 0.55, 0.45, 16, f"WheelR_{wz}", [0.12, 0.12, 0.13, 1.0], axis='x', metallic=0.2, roughness=0.8))

    # Driver Cab & Engine Hood (Municipal White & Orange)
    meshes.append(make_box(-1.2, 1.0, 1.8, 2.4, 1.8, 2.0, "MixerDriverCab", [0.92, 0.93, 0.95, 1.0], 0.3, 0.4))
    meshes.append(make_box(-1.1, 1.4, 3.7, 2.2, 0.9, 0.1, "CabWindshield", [0.2, 0.7, 0.9, 0.8], 0.9, 0.1))
    meshes.append(make_box(-1.2, 0.8, 3.8, 2.4, 0.8, 0.2, "FrontBumper", [0.95, 0.45, 0.05, 1.0], 0.4, 0.5))

    # Water tank behind cab
    meshes.append(make_cylinder(0, 1.2, 1.8, 0.45, 1.8, 16, "WaterTank", [0.85, 0.85, 0.88, 1.0], axis='x', metallic=0.8, roughness=0.2))

    # Rotating Mixing Drum (Named node "MixerDrum" for continuous rotation animation)
    # Angled drum constructed from segmented cylinders
    meshes.append(make_cylinder(0, -1.0, 2.2, 1.4, 4.2, 20, "MixerDrumBody", [0.95, 0.45, 0.05, 1.0], axis='z', metallic=0.4, roughness=0.4, name="MixerDrum"))
    meshes.append(make_cylinder(0, 0.8, 2.2, 1.25, 2.0, 20, "MixerDrumConeFront", [0.95, 0.45, 0.05, 1.0], axis='z', metallic=0.4, roughness=0.4, name="MixerDrum"))
    meshes.append(make_cylinder(0, -2.8, 2.5, 0.75, 1.8, 18, "MixerDrumDischargeCone", [0.95, 0.45, 0.05, 1.0], axis='z', metallic=0.4, roughness=0.4, name="MixerDrum"))
    # Spiral mixing flight blades pattern on exterior
    meshes.append(make_box(-1.42, 2.1, -1.8, 2.84, 0.12, 1.6, "DrumFlightRib", [0.98, 0.98, 0.98, 1.0], 0.2, 0.4, name="MixerDrum"))

    # Discharge hopper and swivel chute at rear
    meshes.append(make_box(-0.6, 2.4, -3.2, 1.2, 1.1, 0.9, "DischargeHopper", [0.2, 0.22, 0.25, 1.0], 0.6, 0.4))
    meshes.append(make_box(-0.35, 1.4, -4.2, 0.7, 0.4, 1.8, "ConcreteChute", [0.85, 0.85, 0.88, 1.0], 0.7, 0.3))

    return build_glb(meshes)

# ==============================================================================
# 7. MACHINERY 3: TANDEM ASPHALT ROAD ROLLER
# ==============================================================================
def generate_road_roller():
    meshes = []
    # Front vibrating steel compaction drum - Named node "FrontDrum"
    meshes.append(make_cylinder(-1.2, 2.0, 0.65, 0.65, 2.4, 20, "FrontCompactionDrum", [0.75, 0.76, 0.78, 1.0], axis='x', metallic=0.9, roughness=0.2, name="FrontDrum"))
    # Rear vibrating steel compaction drum - Named node "RearDrum"
    meshes.append(make_cylinder(-1.2, -2.0, 0.65, 0.65, 2.4, 20, "RearCompactionDrum", [0.75, 0.76, 0.78, 1.0], axis='x', metallic=0.9, roughness=0.2, name="RearDrum"))

    # Articulated roller chassis frame (Construction Yellow)
    meshes.append(make_box(-0.9, 0.7, -1.8, 1.8, 0.9, 3.6, "RollerMainChassis", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4))
    # Engine hood enclosure
    meshes.append(make_box(-0.85, 1.2, -1.7, 1.7, 0.9, 1.8, "EngineHood", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4))

    # Operator platform and ROPS safety canopy
    meshes.append(make_box(-0.85, 1.6, 0.1, 1.7, 0.2, 1.5, "OperatorDeck", [0.2, 0.22, 0.25, 1.0], 0.7, 0.3))
    # Steering console and operator seat
    meshes.append(make_box(-0.3, 1.8, 0.3, 0.6, 0.7, 0.5, "SteeringConsole", [0.15, 0.15, 0.15, 1.0], 0.3, 0.6))
    meshes.append(make_box(-0.3, 1.8, 0.9, 0.6, 0.6, 0.5, "OperatorSeat", [0.1, 0.1, 0.1, 1.0], 0.1, 0.8))

    # ROPS Roll-over protection canopy frame
    for cx in [-0.8, 0.7]:
        meshes.append(make_cylinder(cx, 0.2, 1.8, 0.06, 1.8, 8, f"ROPSPostF_{cx}", [0.2, 0.2, 0.2, 1.0], axis='y', metallic=0.8, roughness=0.3))
        meshes.append(make_cylinder(cx, 1.5, 1.8, 0.06, 1.8, 8, f"ROPSPostR_{cx}", [0.2, 0.2, 0.2, 1.0], axis='y', metallic=0.8, roughness=0.3))
    meshes.append(make_box(-0.9, 3.6, 0.0, 1.8, 0.1, 1.7, "ROPSRoofCanopy", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4))
    # Flashing amber warning beacon on roof
    meshes.append(make_cylinder(0, 0.8, 3.7, 0.14, 0.25, 12, "AmberBeacon", [0.98, 0.65, 0.05, 1.0], axis='y', metallic=0.3, roughness=0.1))

    return build_glb(meshes)

# ==============================================================================
# 8. MACHINERY 4: HEAVY TIPPER DUMP TRUCK
# ==============================================================================
def generate_dump_truck():
    meshes = []
    # Heavy 3-axle truck chassis
    meshes.append(make_box(-1.1, 0.6, -3.6, 2.2, 0.4, 7.4, "DumpTruckChassis", [0.18, 0.19, 0.21, 1.0], 0.7, 0.3))
    # Heavy wheels
    for wz in [-2.6, -1.2, 2.6]:
        meshes.append(make_cylinder(-1.35, wz, 0.5, 0.52, 0.42, 16, f"DumpWheelL_{wz}", [0.12, 0.12, 0.14, 1.0], axis='x', metallic=0.2, roughness=0.8))
        meshes.append(make_cylinder(0.93, wz, 0.5, 0.52, 0.42, 16, f"DumpWheelR_{wz}", [0.12, 0.12, 0.14, 1.0], axis='x', metallic=0.2, roughness=0.8))

    # Heavy Day-Cab (CAT Yellow / Orange)
    meshes.append(make_box(-1.2, 1.0, 1.6, 2.4, 1.8, 2.1, "DumpCabBody", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4))
    meshes.append(make_box(-1.1, 1.5, 3.65, 2.2, 0.85, 0.1, "DumpWindshield", [0.2, 0.7, 0.9, 0.8], 0.9, 0.1))

    # Tipper Dump Bed (Named node "DumpBed" for hydraulic tipping motion)
    meshes.append(make_box(-1.25, 1.2, -3.6, 2.5, 1.4, 4.8, "TipperBox", [0.92, 0.45, 0.05, 1.0], 0.4, 0.4, name="DumpBed"))
    # Load inside dump bed: Excavated gravel and aggregate
    meshes.append(make_box(-1.15, 1.8, -3.4, 2.3, 0.7, 4.4, "GravelLoad", [0.45, 0.42, 0.38, 1.0], 0.0, 0.95, name="DumpBed"))
    # Safety cab protector canopy over front of dump bed
    meshes.append(make_box(-1.25, 2.6, 0.8, 2.5, 0.15, 1.2, "CabProtectorShield", [0.92, 0.45, 0.05, 1.0], 0.5, 0.4, name="DumpBed"))

    return build_glb(meshes)

# ==============================================================================
# 9. WORKERS & SAFETY EQUIPMENT GROUP
# ==============================================================================
def generate_construction_workers():
    meshes = []
    # Worker 1: Site Supervisor with clipboard and white helmet
    def make_worker(x, z, vest_color, helmet_color, name_prefix):
        w_parts = []
        # Boots
        w_parts.append(make_box(x-0.2, 0, z-0.1, 0.18, 0.25, 0.3, f"{name_prefix}_BootL", [0.15, 0.12, 0.10, 1.0], 0.1, 0.9))
        w_parts.append(make_box(x+0.02, 0, z-0.1, 0.18, 0.25, 0.3, f"{name_prefix}_BootR", [0.15, 0.12, 0.10, 1.0], 0.1, 0.9))
        # Blue denim work jeans
        w_parts.append(make_box(x-0.2, 0.25, z-0.1, 0.4, 0.75, 0.25, f"{name_prefix}_Jeans", [0.18, 0.28, 0.45, 1.0], 0.1, 0.8))
        # Torso with high-visibility safety vest
        w_parts.append(make_box(x-0.22, 1.0, z-0.12, 0.44, 0.65, 0.3, f"{name_prefix}_Vest", vest_color, 0.1, 0.5))
        # Silver retro-reflective stripes across vest
        w_parts.append(make_box(x-0.23, 1.25, z-0.13, 0.46, 0.12, 0.32, f"{name_prefix}_Reflective", [0.95, 0.95, 0.98, 1.0], 0.4, 0.2))
        # Head with hard hat safety helmet
        w_parts.append(make_cylinder(x, z, 1.65, 0.14, 0.22, 10, f"{name_prefix}_Head", [0.85, 0.68, 0.55, 1.0], axis='y', metallic=0.0, roughness=0.6))
        w_parts.append(make_cylinder(x, z, 1.82, 0.18, 0.16, 12, f"{name_prefix}_Helmet", helmet_color, axis='y', metallic=0.3, roughness=0.3))
        w_parts.append(make_box(x-0.18, 1.82, z-0.24, 0.36, 0.04, 0.38, f"{name_prefix}_HelmetBrim", helmet_color, 0.3, 0.3))
        return w_parts

    # 4 distinct workers in realistic positions
    # Supervisor (White helmet, orange vest)
    meshes.extend(make_worker(-2.0, 0, [0.98, 0.35, 0.05, 1.0], [0.98, 0.98, 0.98, 1.0], "Supervisor"))
    # Trench pipe installer (Yellow helmet, lime-green vest)
    meshes.extend(make_worker(-0.6, 0, [0.65, 0.92, 0.05, 1.0], [0.95, 0.85, 0.05, 1.0], "PipeWorker"))
    # Machine flagger/banksman (Yellow helmet, orange vest)
    meshes.extend(make_worker(0.8, 0, [0.98, 0.35, 0.05, 1.0], [0.95, 0.85, 0.05, 1.0], "Banksman"))
    # Surveyor with optical transit tripod
    meshes.extend(make_worker(2.2, 0, [0.98, 0.35, 0.05, 1.0], [0.98, 0.98, 0.98, 1.0], "Surveyor"))
    # Optical level tripod
    meshes.append(make_cylinder(2.2, -0.8, 0.85, 0.08, 0.4, 8, "SurveyTripodHead", [0.95, 0.75, 0.05, 1.0], axis='y', metallic=0.6, roughness=0.3))
    for leg_angle in [0, 2.1, 4.2]:
        lx = 2.2 + 0.35 * math.cos(leg_angle)
        lz = -0.8 + 0.35 * math.sin(leg_angle)
        meshes.append(make_box(lx-0.03, 0, lz-0.03, 0.06, 0.85, 0.06, f"TripodLeg_{leg_angle}", [0.85, 0.85, 0.88, 1.0], 0.8, 0.2))

    return build_glb(meshes)

def main():
    out_dirs = ['public/models', 'data/models']
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    assets = [
        ("highrise_under_construction.glb", generate_highrise_under_construction(), "High-Rise Construction with Active Tower Crane"),
        ("road_construction_site.glb", generate_road_construction_site(), "Arterial Road Milling & Paving Site"),
        ("water_pipeline_trench.glb", generate_underground_utility_trench(), "Deep 600mm Water Main Trench"),
        ("commercial_construction_site.glb", generate_commercial_construction_site(), "Commercial Complex Under Construction"),
        ("hydraulic_excavator.glb", generate_hydraulic_excavator(), "Tracked Hydraulic Excavator with Articulated Boom"),
        ("concrete_mixer.glb", generate_concrete_mixer(), "Heavy Concrete Mixer Truck with Rotating Drum"),
        ("road_roller.glb", generate_road_roller(), "Tandem Vibratory Road Roller with Compaction Drums"),
        ("dump_truck.glb", generate_dump_truck(), "Heavy Tipper Dump Truck with Hydraulic Bed"),
        ("construction_workers.glb", generate_construction_workers(), "Municipal Construction Crew & Surveyor Group")
    ]

    for fname, glb_bytes, desc in assets:
        for d in out_dirs:
            path = os.path.join(d, fname)
            with open(path, 'wb') as f:
                f.write(glb_bytes)
        print(f"Generated {fname} ({len(glb_bytes):,} bytes) - {desc}")

if __name__ == "__main__":
    main()
