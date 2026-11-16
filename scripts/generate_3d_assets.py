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
                "roughnessFactor": m.get('roughness', 0.6)
            }
        })

        # 5. Mesh & Node
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
        nodes.append({
            "name": m.get('name', f"Node_{mesh_idx}"),
            "mesh": mesh_idx
        })

    gltf_dict = {
        "asset": {
            "version": "2.0",
            "generator": "CivicSync GenCity AI 3D Engine"
        },
        "scene": 0,
        "scenes": [{
            "nodes": list(range(len(nodes)))
        }],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{
            "byteLength": len(bin_buffer)
        }]
    }

    json_str = json.dumps(gltf_dict, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '
    while len(bin_buffer) % 4 != 0:
        bin_buffer.append(0)

    total_len = 12 + (8 + len(json_bytes)) + (8 + len(bin_buffer))
    header = struct.pack('<III', 0x46546C67, 2, total_len)
    chunk0_hdr = struct.pack('<II', len(json_bytes), 0x4E4F534A)
    chunk1_hdr = struct.pack('<II', len(bin_buffer), 0x004E4942)

    return header + chunk0_hdr + json_bytes + chunk1_hdr + bytes(bin_buffer)

def make_box(x0, y0, z0, dx, dy, dz, mat_name, color, metallic=0.2, roughness=0.5):
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
        'name': mat_name,
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_name': mat_name,
        'base_color': color,
        'metallic': metallic,
        'roughness': roughness
    }

def make_cylinder(cx, cz, y0, radius, height, segments, mat_name, color, axis='y', metallic=0.5, roughness=0.3):
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

        norms.extend([n0, n1, n1, n0])
        indices.extend([base_i, base_i+1, base_i+2, base_i, base_i+2, base_i+3])

    return {
        'name': mat_name,
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_name': mat_name,
        'base_color': color,
        'metallic': metallic,
        'roughness': roughness
    }

# 1. BUILD REALISTIC 3D BUILDING (Mira Road Commercial Tower)
def generate_mira_tower():
    meshes = []
    meshes.append(make_box(-12, 0, -12, 24, 0.4, 24, "PlazaPavement", [0.25, 0.28, 0.32, 1.0], 0.1, 0.8))
    meshes.append(make_box(-9, 0.4, -9, 18, 4.0, 18, "CommercialPodium", [0.75, 0.77, 0.80, 1.0], 0.3, 0.5))
    meshes.append(make_box(-5, 0.4, 8.8, 10, 3.5, 0.5, "GlassAtrium", [0.2, 0.7, 0.9, 0.9], 0.8, 0.1))
    meshes.append(make_box(-7, 4.4, -7, 14, 28.0, 14, "TowerGlassFacade", [0.12, 0.45, 0.85, 1.0], 0.85, 0.15))
    meshes.append(make_box(-7.2, 4.4, -7.2, 0.6, 28.0, 0.6, "CornerSteel1", [0.2, 0.22, 0.25, 1.0], 0.9, 0.3))
    meshes.append(make_box(6.6, 4.4, -7.2, 0.6, 28.0, 0.6, "CornerSteel2", [0.2, 0.22, 0.25, 1.0], 0.9, 0.3))
    meshes.append(make_box(6.6, 4.4, 6.6, 0.6, 28.0, 0.6, "CornerSteel3", [0.2, 0.22, 0.25, 1.0], 0.9, 0.3))
    meshes.append(make_box(-7.2, 4.4, 6.6, 0.6, 28.0, 0.6, "CornerSteel4", [0.2, 0.22, 0.25, 1.0], 0.9, 0.3))
    meshes.append(make_box(-5.5, 32.4, -5.5, 11, 6.0, 11, "PenthouseCrown", [0.85, 0.88, 0.92, 1.0], 0.4, 0.4))
    meshes.append(make_box(-3, 38.4, -3, 6, 3.0, 6, "RoofPlantRoom", [0.35, 0.38, 0.42, 1.0], 0.6, 0.5))
    meshes.append(make_cylinder(0, 0, 41.4, 0.2, 8.0, 12, "TelecomMast", [0.95, 0.25, 0.25, 1.0], axis='y', metallic=0.9, roughness=0.1))
    return build_glb(meshes)

# 2. BUILD UNDERGROUND WATER PIPELINE TRENCH SCENE
def generate_water_trench():
    meshes = []
    meshes.append(make_box(-10, 0, -10, 7.5, 0.5, 20, "RoadAsphaltLeft", [0.2, 0.22, 0.25, 1.0], 0.1, 0.8))
    meshes.append(make_box(2.5, 0, -10, 7.5, 0.5, 20, "RoadAsphaltRight", [0.2, 0.22, 0.25, 1.0], 0.1, 0.8))
    meshes.append(make_box(-2.5, -2.5, -10, 5.0, 2.5, 20, "ExcavatedEarth", [0.45, 0.32, 0.22, 1.0], 0.0, 0.9))
    meshes.append(make_box(-2.5, -2.4, -10, 0.25, 2.5, 20, "TimberShoringLeft", [0.65, 0.45, 0.25, 1.0], 0.1, 0.7))
    meshes.append(make_box(2.25, -2.4, -10, 0.25, 2.5, 20, "TimberShoringRight", [0.65, 0.45, 0.25, 1.0], 0.1, 0.7))
    for z in [-6, 0, 6]:
        meshes.append(make_box(-2.3, -1.0, z, 4.6, 0.3, 0.3, f"Strut_{z}", [0.9, 0.8, 0.1, 1.0], 0.8, 0.3))
    meshes.append(make_cylinder(0, -10, -1.8, 0.6, 20.0, 18, "WaterMainDI600", [0.05, 0.72, 0.90, 1.0], axis='z', metallic=0.7, roughness=0.2))
    for z in [-5, 0, 5]:
        meshes.append(make_cylinder(0, z-0.2, -1.8, 0.78, 0.4, 18, f"Flange_{z}", [0.1, 0.4, 0.7, 1.0], axis='z', metallic=0.9, roughness=0.2))
    for z in [-7, -2, 3]:
        meshes.append(make_box(-2.9, 0.5, z, 0.2, 1.0, 2.5, f"BarrierLeft_{z}", [0.95, 0.45, 0.05, 1.0], 0.2, 0.5))
        meshes.append(make_box(2.7, 0.5, z, 0.2, 1.0, 2.5, f"BarrierRight_{z}", [0.95, 0.45, 0.05, 1.0], 0.2, 0.5))
    return build_glb(meshes)

# 3. BUILD ROAD CONSTRUCTION EXCAVATION SCENE
def generate_road_construction():
    meshes = []
    meshes.append(make_box(-8, 0, -10, 16, 0.4, 20, "RoadAsphaltSurface", [0.22, 0.24, 0.26, 1.0], 0.1, 0.7))
    meshes.append(make_box(-0.15, 0.41, -10, 0.3, 0.02, 20, "LaneMarkingYellow", [0.95, 0.85, 0.1, 1.0], 0.1, 0.6))
    meshes.append(make_box(-6, 0.1, -5, 5.0, 0.3, 10, "MilledBitumenTrench", [0.35, 0.28, 0.22, 1.0], 0.0, 0.95))
    for z in [-7, -3, 1, 5]:
        meshes.append(make_box(-0.9, 0.42, z, 0.6, 0.08, 0.6, f"ConeBase_{z}", [0.95, 0.35, 0.05, 1.0], 0.1, 0.5))
        meshes.append(make_cylinder(-0.6, z+0.3, 0.5, 0.22, 0.8, 12, f"ConeBody_{z}", [0.98, 0.38, 0.05, 1.0], axis='y', metallic=0.1, roughness=0.4))
        meshes.append(make_cylinder(-0.6, z+0.3, 0.8, 0.19, 0.25, 12, f"ConeReflective_{z}", [0.98, 0.98, 0.98, 1.0], axis='y', metallic=0.3, roughness=0.2))
    meshes.append(make_box(-5.5, 0.42, 6.5, 3.5, 2.0, 0.2, "WarningSignboard", [0.95, 0.80, 0.05, 1.0], 0.2, 0.4))
    meshes.append(make_box(-5.2, 0.42, 6.55, 0.3, 1.5, 0.1, "SignLeg1", [0.3, 0.3, 0.3, 1.0], 0.8, 0.2))
    meshes.append(make_box(-2.3, 0.42, 6.55, 0.3, 1.5, 0.1, "SignLeg2", [0.3, 0.3, 0.3, 1.0], 0.8, 0.2))
    return build_glb(meshes)

# 4. BUILD HEAVY MUNICIPAL EXCAVATOR
def generate_excavator():
    meshes = []
    meshes.append(make_box(-1.8, 0, -2.5, 0.8, 0.8, 5.0, "TrackLeft", [0.15, 0.15, 0.15, 1.0], 0.5, 0.7))
    meshes.append(make_box(1.0, 0, -2.5, 0.8, 0.8, 5.0, "TrackRight", [0.15, 0.15, 0.15, 1.0], 0.5, 0.7))
    meshes.append(make_box(-1.0, 0.4, -1.8, 2.0, 0.6, 3.6, "Undercarriage", [0.2, 0.2, 0.2, 1.0], 0.7, 0.3))
    meshes.append(make_box(-1.5, 1.0, -2.0, 3.0, 1.4, 3.8, "BodyCabin", [0.95, 0.75, 0.05, 1.0], 0.4, 0.4))
    meshes.append(make_box(-1.4, 1.4, 0.2, 1.1, 1.4, 1.5, "GlassCabin", [0.2, 0.7, 0.9, 0.8], 0.8, 0.1))
    meshes.append(make_box(-1.5, 1.1, -2.3, 3.0, 1.2, 0.5, "Counterweight", [0.15, 0.15, 0.18, 1.0], 0.6, 0.5))
    meshes.append(make_box(-0.3, 1.8, 1.0, 0.6, 3.5, 1.5, "BoomArm", [0.95, 0.75, 0.05, 1.0], 0.5, 0.4))
    meshes.append(make_box(-0.25, 4.5, 2.2, 0.5, 1.0, 3.2, "DipperStick", [0.95, 0.75, 0.05, 1.0], 0.5, 0.4))
    meshes.append(make_box(-0.5, 3.8, 5.0, 1.0, 1.0, 1.2, "ExcavatorBucket", [0.18, 0.18, 0.2, 1.0], 0.8, 0.3))
    meshes.append(make_cylinder(0, 1.5, 2.0, 0.1, 2.5, 12, "HydraulicCylinder", [0.85, 0.85, 0.85, 1.0], axis='y', metallic=0.95, roughness=0.1))
    return build_glb(meshes)

def main():
    out_dirs = ['public/models', 'data/models']
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    assets = [
        ("mira_commercial_tower.glb", generate_mira_tower(), "Mira Commercial Skyscraper (AI 3D Building)"),
        ("water_pipeline_trench.glb", generate_water_trench(), "600mm Water Pipeline Trench (AI Subsurface Asset)"),
        ("road_excavation_site.glb", generate_road_construction(), "Road Work & Milling Zone (AI Construction Scene)"),
        ("heavy_excavator.glb", generate_excavator(), "Municipal Hydraulic Excavator (AI Equipment Asset)")
    ]

    for fname, glb_bytes, desc in assets:
        for d in out_dirs:
            path = os.path.join(d, fname)
            with open(path, 'wb') as f:
                f.write(glb_bytes)
        print(f"Generated {fname} ({len(glb_bytes)} bytes) - {desc}")

if __name__ == "__main__":
    main()
