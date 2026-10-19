# Put a photo on a wall of the house as its texture, in Blender (house skill, docs/HOUSE-FROM-PHOTOS.md).
#
#   blender house.blend --background --python project_photos.py -- <wall object name> <photo.jpg> [out.blend]
#
# The wall gets a material whose base colour is the photo, mapped once across the wall's face (crop and straighten the photo first:
# one wall, edge to edge, no people, numbers or signs). Run it once per wall, then save. Big photos: scale them to 2048 px first.
import sys
import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(argv) < 2:
    raise SystemExit('Usage: blender house.blend --background --python project_photos.py -- <wall object> <photo.jpg> [out.blend]')
name, photo = argv[0], argv[1]
out = argv[2] if len(argv) > 2 else bpy.data.filepath
obj = bpy.data.objects.get(name)
if obj is None or obj.type != 'MESH':
    raise SystemExit(f'No mesh named {name}. Wall objects from build_house.py are named like "Wall front 0".')

mat = bpy.data.materials.new(f'{name} photo')
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes.get('Principled BSDF')
image = nodes.new('ShaderNodeTexImage')
image.image = bpy.data.images.load(photo)
links.new(image.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.85
obj.data.materials.clear()
obj.data.materials.append(mat)

# One picture across the wall's biggest face: a box projection from the wall's own size.
bpy.context.view_layer.objects.active = obj
for o in bpy.context.selected_objects:
    o.select_set(False)
obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.cube_project(cube_size=max(obj.dimensions), correct_aspect=True, scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=out)
print(f'Put {photo} on {name}; saved {out}.')
