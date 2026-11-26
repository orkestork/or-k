# Custom pavilion furniture for the O R-K world: a modular lounge sofa (module + arm end) and a stand
# back-wall. Run headless:  blender -b --factory-startup -P build_furniture.py -- <out_dir>
# Blender axes: Z up, the front faces -Y (exports as glTF +Z). Units are metres.
import bpy, sys, math
OUT = sys.argv[sys.argv.index('--') + 1]

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color=(0.8, 0.8, 0.8, 1), metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color; b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m

def box(name, size, loc, material, bevel=0.02, segs=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = segs; b.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='bevel')
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = True
    return o

def cyl(name, r, h, loc, material, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc)
    o = bpy.context.active_object; o.name = name; o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = True
    return o

def finish(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=1.0)                     # metre-scale UVs so fabric/stucco tile evenly
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_auto_smooth(angle=math.radians(40)) if hasattr(bpy.ops.object, 'shade_auto_smooth') else None
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True)
    print('EXPORTED', path, len(o.data.polygons), 'polys')

# ---------------- sofa module (one seat, 1.2 m wide) ----------------
def sofa(arm, path):
    reset()
    fab = mat('Fabric', (0.45, 0.33, 0.75, 1), rough=0.95); met = mat('Metal', (0.15, 0.13, 0.18, 1), metal=0.9, rough=0.3)
    parts = [
        box('base', (1.2, 0.86, 0.26), (0, 0, 0.08 + 0.13), fab, bevel=0.035, segs=4),
        box('seat', (1.17, 0.74, 0.15), (0, -0.04, 0.34 + 0.075), fab, bevel=0.06, segs=6),
        box('back', (1.17, 0.22, 0.48), (0, 0.32, 0.36 + 0.24), fab, bevel=0.08, segs=6, rot=(math.radians(-9), 0, 0)),
    ]
    if arm:
        parts.append(box('arm', (0.16, 0.86, 0.36), (0.68, 0, 0.08 + 0.36 / 2 + 0.06), fab, bevel=0.06, segs=6))
    for x in (-0.52, 0.52):
        for y in (-0.34, 0.34):
            parts.append(cyl('leg', 0.022, 0.09, (x, y, 0.045), met))
    finish(parts, path)

# ---------------- stand back-wall (5.6 m) ----------------
def stand_wall(path):
    reset()
    shell = mat('Shell', (0.11, 0.09, 0.16, 1), metal=0.2, rough=0.5); face = mat('Face', (1, 1, 1, 1), rough=0.4)
    glow = mat('Glow', (1, 1, 1, 1)); base = mat('Base', (0.9, 0.88, 0.93, 1), rough=0.8)
    parts = [
        box('panel', (5.6, 0.3, 3.4), (0, 0, 0.14 + 1.7), shell, bevel=0.04),
        box('plinth', (6.0, 0.7, 0.14), (0, -0.12, 0.07), base, bevel=0.03),
        box('ledge', (4.4, 0.32, 0.06), (0, -0.3, 1.0), base, bevel=0.015),
        box('topStrip', (5.4, 0.05, 0.05), (0, -0.17, 0.14 + 3.32), glow, bevel=0),
    ]
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.152, 0.14 + 1.95), rotation=(math.radians(90), 0, 0))
    f = bpy.context.active_object; f.name = 'face'; f.scale = (5.1, 2.5, 1)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); f.data.materials.append(face)
    for s in (-1, 1):
        parts.append(box('fin', (0.14, 0.6, 3.7), (s * 2.95, -0.08, 0.14 + 1.85), shell, bevel=0.04))
        parts.append(box('finGlow', (0.04, 0.04, 3.4), (s * 2.95, -0.39, 0.14 + 1.85), glow, bevel=0))
    # the face keeps its own 0..1 UVs (it shows the service artwork), so export it joined but UV'd separately
    finish(parts, path.replace('.glb', '_tmp.glb'))
    shell_obj = bpy.context.active_object
    bpy.ops.object.select_all(action='DESELECT'); f.select_set(True); shell_obj.select_set(True); bpy.context.view_layer.objects.active = shell_obj
    bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True)
    print('EXPORTED', path)

sofa(False, f'{OUT}/sofa_module.glb')
sofa(True, f'{OUT}/sofa_arm.glb')
stand_wall(f'{OUT}/stand_wall.glb')
