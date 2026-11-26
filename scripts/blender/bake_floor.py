# Bakes the pavilion floor lighting (sky through the dome, low sun, stand spots, neon & screens) into a lightmap.
#   blender -b --factory-startup -P bake_floor.py -- <scene.glb> <out_dir> [size] [samples]
# Re-baking after the stands change:
#   1. copy scripts/blender/dev-bake-route.ts.txt to app/api/dev-bake/route.ts (dev-only endpoint)
#   2. with `npm run dev` running, open /experiencias/or-k/mundo.html?auto&still&bakeexport&cam=0,6,12,0,4,0
#      -> writes output/ork-bake/scene.glb
#   3. blender -b --factory-startup -P scripts/blender/bake_floor.py -- output/ork-bake/scene.glb public/experiencias/or-k/entorno/bake 2048 512
#   4. convert floor_bake.png to floor_bake.jpg (sips -s format jpeg -s formatOptions 88 ...) and delete the route again
# Output: floor_bake.png + .json
import bpy, sys, math, json
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
SIZE = int(args[2]) if len(args) > 2 else 2048
SAMPLES = int(args[3]) if len(args) > 3 else 384
R = 60.0                                   # HALL.R in terrain.js

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
old = bpy.data.objects.get('HALL_FLOOR')
if old: bpy.data.objects.remove(old, do_unlink=True)

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
for dev in ('METAL', 'OPTIX', 'CUDA', 'HIP'):
    try:
        prefs.compute_device_type = dev; prefs.get_devices()
        if any(d.type == dev for d in prefs.devices):
            for d in prefs.devices: d.use = True
            sc.cycles.device = 'GPU'; print('DEVICE', dev); break
    except Exception: pass
sc.cycles.samples = SAMPLES
sc.cycles.max_bounces = 5; sc.cycles.diffuse_bounces = 4
sc.cycles.use_denoising = False

# ---- lighting ----
world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.22, 0.25, 0.42, 1); bg.inputs[1].default_value = 1.2   # blue-hour sky
def light(kind, loc, energy, color=(1, 1, 1), size=1.0, aim=None):
    ld = bpy.data.lights.new(kind + '_l', kind); ld.energy = energy; ld.color = color
    if kind in ('POINT', 'SPOT'): ld.shadow_soft_size = size
    if kind == 'SUN': ld.angle = math.radians(2.5)
    ob = bpy.data.objects.new(kind, ld); sc.collection.objects.link(ob); ob.location = loc
    if aim is not None: ob.rotation_euler = aim.to_track_quat('-Z', 'Y').to_euler()
    return ob
sun_from = Vector((-0.95, 0.1, 0.16)).normalized()          # matches the sky shader's sunset (glTF -> Blender axes)
light('SUN', (0, 0, 50), 2.2, (1.0, 0.82, 0.66), aim=-sun_from)
for i in range(8):
    a = math.pi / 2 + math.pi / 8 + i * math.pi / 4
    light('POINT', (math.cos(a) * 37, -math.sin(a) * 37, 13), 2600, (1.0, 0.93, 0.85), size=1.5)
light('POINT', (0, 0, 24), 9000, (1.0, 0.9, 0.8), size=3)

# ---- bake target: a 2R square plane whose 0..1 UVs match three's CircleGeometry floor ----
bpy.ops.mesh.primitive_plane_add(size=2 * R, location=(0, 0, 0.0))
plane = bpy.context.active_object; plane.name = 'BAKE_FLOOR'
m = bpy.data.materials.new('floor'); m.use_nodes = True
bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1); bsdf.inputs['Roughness'].default_value = 1.0
img = bpy.data.images.new('floor_bake', SIZE, SIZE, float_buffer=True)
tex = m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
m.node_tree.nodes.active = tex
plane.data.materials.append(m)
bpy.ops.object.select_all(action='DESELECT'); plane.select_set(True); bpy.context.view_layer.objects.active = plane

sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False
sc.render.bake.margin = 8
print('BAKING', SIZE, SAMPLES)
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=8)

# ---- normalise, soften noise, save ----
px = np.array(img.pixels[:], dtype=np.float32).reshape(SIZE, SIZE, 4)[:, :, :3]
for _ in range(2):                                           # light 3x3 box blur: removes Monte-Carlo grain
    p = np.pad(px, ((1, 1), (1, 1), (0, 0)), mode='edge')
    px = sum(p[1 + dy:SIZE + 1 + dy, 1 + dx:SIZE + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9.0
yy, xx = np.mgrid[0:SIZE, 0:SIZE]
inside = (np.hypot((xx + 0.5) / SIZE * 2 - 1, (yy + 0.5) / SIZE * 2 - 1) < (R - 1) / R)
lum = px @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
mean = float(lum[inside].mean())
out = np.clip(px * (0.5 / mean), 0, 1)                      # floor average maps to 0.5 -> gain 2 in three
rgba = np.concatenate([out, np.ones((SIZE, SIZE, 1), np.float32)], axis=2)
png = bpy.data.images.new('floor_bake_png', SIZE, SIZE, alpha=False)
png.pixels = rgba.ravel()
png.filepath_raw = f'{OUT}/floor_bake.png'; png.file_format = 'PNG'; png.save()
json.dump({'size': SIZE, 'samples': SAMPLES, 'gain': 2.0, 'mean_linear': mean, 'R': R}, open(f'{OUT}/floor_bake.json', 'w'))
print('SAVED', f'{OUT}/floor_bake.png', 'mean', mean)
