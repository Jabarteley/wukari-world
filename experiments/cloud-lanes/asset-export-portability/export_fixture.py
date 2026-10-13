"""Original static fixture only. Run with Blender 4.3.2, never the body builder."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy

LANE = Path(__file__).resolve().parent


def linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def build(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    root = bpy.data.objects.new(spec["id"], None)
    scene.collection.objects.link(root)
    root["units"] = "meters"
    root["route"] = "static"
    root["license"] = spec["license"]
    mat = bpy.data.materials.new("beacon_pbr")
    mat.use_nodes = True
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = spec["pbr"]["metallicFactor"]
    bsdf.inputs["Roughness"].default_value = spec["pbr"]["roughnessFactor"]
    colors = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    colors.layer_name = "Col"
    mat.node_tree.links.new(colors.outputs["Color"], bsdf.inputs["Base Color"])
    # Avoid Blender-specific specular/IOR extensions: this proof uses core metallic-roughness.
    bsdf.inputs["IOR"].default_value = 1.5
    for tier, settings in spec["lod"].items():
        n = settings["segments"]
        profile = spec["profileZR"]
        vertices = [(r * math.cos(2 * math.pi * j / n), r * math.sin(2 * math.pi * j / n), z)
                    for z, r in profile for j in range(n)]
        faces, palette_indices = [], []
        for ring in range(len(profile) - 1):
            for j in range(n):
                a, b = ring * n + j, ring * n + (j + 1) % n
                faces.extend([(a, b, b + n), (a, b + n, a + n)])
                palette_indices.extend([spec["sidePalette"][ring]] * 2)
        for j in range(1, n - 1):
            faces.append((0, j + 1, j))
            palette_indices.append(0)
            offset = (len(profile) - 1) * n
            faces.append((offset, offset + j, offset + j + 1))
            palette_indices.append(2)
        assert len(faces) == settings["triangles"]
        mesh = bpy.data.meshes.new("beacon_" + tier)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        mesh.materials.append(mat)
        attr = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
        mesh.color_attributes.active_color = attr
        for face, palette_index in zip(mesh.polygons, palette_indices):
            rgba = [linear(v) for v in spec["srgbPalette"][palette_index]] + [1]
            for loop in face.loop_indices:
                attr.data[loop].color = rgba  # .color is linear, unlike .color_srgb.
        obj = bpy.data.objects.new("beacon_" + tier, mesh)
        scene.collection.objects.link(obj)
        obj.parent = root
        obj["lod"] = tier
    for name, (x, y, z) in spec["anchors"].items():
        obj = bpy.data.objects.new(name, None)
        scene.collection.objects.link(obj)
        obj.parent = root
        obj.location = (x, -z, y)  # exact inverse of glTF's Z-up to Y-up conversion
        obj.empty_display_size = 0.06


def export(out, spec):
    for obj in bpy.context.scene.objects:
        obj.hide_set(False)
    for tier in spec["lod"]:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in bpy.context.scene.objects:
            if obj.type == "EMPTY" or obj.name == "beacon_" + tier:
                obj.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=str(out / ("beacon-" + tier + ".glb")), export_format="GLB",
            use_selection=True, export_yup=True, export_apply=False,
            export_normals=True, export_texcoords=False, export_materials="EXPORT",
            export_vertex_color="ACTIVE", export_all_vertex_colors=False,
            export_skins=False, export_morph=False, export_animations=False,
            export_cameras=False, export_lights=False, export_extras=True,
            export_draco_mesh_compression_enable=False)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.data.objects["beacon_far"].hide_set(True)
    bpy.data.objects["beacon_near"].select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["beacon_near"]


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--out", required=True)
    args.add_argument("--from-blend", action="store_true", help="Re-export already-open saved source; do not regenerate it")
    options = args.parse_args(sys.argv[sys.argv.index("--") + 1:])
    out = Path(options.out).resolve()
    # This lane cannot accidentally write to shipped assets or another owner's files.
    if LANE not in out.parents or out == LANE:
        raise ValueError("Output must be a subdirectory of this lane")
    out.mkdir(parents=True, exist_ok=True)
    spec = json.loads((LANE / "fixture.json").read_text())
    if not options.from_blend:
        build(spec)
    else:
        assert bpy.context.scene.unit_settings.scale_length == 1
        assert all(name in bpy.data.objects for name in [spec["id"], "beacon_near", "beacon_far", *spec["anchors"]])
    export(out, spec)
    if not options.from_blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(out / "original-meter-beacon.blend"))
    receipt = {
        "blender": bpy.app.version_string, "fromBlend": options.from_blend,
        "fixture": spec["id"], "units": "meters", "draco": False,
        "outputs": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                    for p in sorted(out.iterdir()) if p.suffix in (".blend", ".glb")}}
    (out / "export-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
