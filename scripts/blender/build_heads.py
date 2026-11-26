import bpy, bmesh, sys, math, random, mathutils
from mathutils import Vector
args = sys.argv[sys.argv.index('--')+1:]
SRC, OUT = args[0], args[1]
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)

def imp(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{SRC}/{name}.glb')
    return [o for o in bpy.data.objects if o not in before]

# ---- base rig from the Knight ----
objs = imp('Knight')
rig = [o for o in objs if o.type == 'ARMATURE'][0]
for o in objs:
    if o is not rig: bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
rig.name = 'Rig'

def bind(o):
    o.parent = rig
    for m in o.modifiers:
        if m.type == 'ARMATURE': m.object = rig

heads = {}
for model, headname in [('Knight', 'Knight_Head'), ('Mage', 'Mage_Head'), ('Barbarian', 'Barbarian_Head'), ('Rogue', 'Rogue_Head'), ('Rogue_Hooded', 'Rogue_Head_Hooded')]:
    objs = imp(model)
    h = [o for o in objs if o.name.startswith(headname)][0]
    for o in objs:
        if o is not h: bpy.data.objects.remove(o, do_unlink=True)
    h.name = 'Head_' + model
    bind(h); heads[model] = h
for a in list(bpy.data.actions): bpy.data.actions.remove(a)

# ---- texture sampling helpers ----
def sampler(obj):
    img = [n for n in obj.material_slots[0].material.node_tree.nodes if n.type == 'TEX_IMAGE'][0].image
    w, hgt = img.size; px = img.pixels[:]
    def col(u, v):
        x = int((u % 1) * w); y = int((v % 1) * hgt); i = (y * w + x) * 4
        return Vector(px[i:i + 3])
    return col
def face_colors(obj):
    col = sampler(obj); uv = obj.data.uv_layers.active.data; out = []
    for p in obj.data.polygons:
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total; v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        out.append(col(u, v))
    return out
def separate(obj, pick, newname):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
    n = 0
    for p in obj.data.polygons:
        p.select = pick(p); n += p.select
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    new = [o for o in bpy.context.selected_objects if o is not obj][0]; new.name = newname; bind(new)
    print('SEPARATED', newname, n)
    return new

hairmat = bpy.data.materials.new('Hair'); hairmat.use_nodes = True
hairmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1, 1, 1, 1)
hairmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.7
def to_hairmat(o):
    o.data.materials.clear(); o.data.materials.append(hairmat)

# ---- split hair from the faces ----
def fill_skull(h, skin_poly):
    # close the hole left by the hair with skin-coloured faces so short styles never show the inside
    uvl = h.data.uv_layers.active; su = uvl.data[skin_poly.loop_indices[0]].uv.copy()
    bm = bmesh.new(); bm.from_mesh(h.data)
    before = set(bm.faces)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    uv = bm.loops.layers.uv.active
    new = [f for f in bm.faces if f not in before]
    for f in new:
        for l in f.loops: l[uv].uv = su
    bmesh.ops.recalc_face_normals(bm, faces=new)
    bm.to_mesh(h.data); bm.free()
    print('FILLED', h.name, len(new))
def nose_poly(h):
    cand = [p for p in h.data.polygons if abs(p.center.x) < 0.08 and 1.45 < p.center.z < 1.8]
    return min(cand, key=lambda p: p.center.y)
colors = {}
for model in ['Knight', 'Mage', 'Rogue']:
    h = heads[model]; fc = face_colors(h)
    top = max(range(len(h.data.polygons)), key=lambda i: h.data.polygons[i].center.z)
    hc = fc[top]; sk = fc[nose_poly(h).index]
    colors[model] = (tuple(round(c, 3) for c in hc), tuple(round(c, 3) for c in sk))
    def is_hair(p, fc=fc, hc=hc, sk=sk):
        dh, ds = (fc[p.index] - hc).length, (fc[p.index] - sk).length
        face_zone = abs(p.center.x) < 0.4 and p.center.y < -0.36 and p.center.z < 1.83   # eyes, brows, mouth stay on the face
        return (dh < 0.28 and dh < ds * 0.6 and not face_zone) or p.center.z > 2.2
    hair = separate(h, is_hair, 'Hair_' + model)
    to_hairmat(hair); h.name = 'Face_' + model
    fill_skull(h, nose_poly(h))
print('HAIR_SKIN', colors)
# Barbarian: bald face; beard and brows become their own recolourable pieces
b = heads['Barbarian']; fc = face_colors(b)
chin = min((p for p in b.data.polygons if p.center.y < -0.3), key=lambda p: p.center.z)
bc = fc[chin.index]; sk = fc[nose_poly(b).index]; print('BEARD_SKIN', tuple(round(c, 3) for c in bc), tuple(round(c, 3) for c in sk))
greyish = lambda p, fc=fc: (fc[p.index] - bc).length < 0.25 and (fc[p.index] - bc).length < (fc[p.index] - sk).length * 0.7
beard = separate(b, lambda p: greyish(p) and p.center.z < 1.69, 'Beard'); to_hairmat(beard)
fc = face_colors(b)
greyish = lambda p, fc=fc: (fc[p.index] - bc).length < 0.25 and (fc[p.index] - bc).length < (fc[p.index] - sk).length * 0.7
brows = separate(b, greyish, 'Brows'); to_hairmat(brows)
b.name = 'Face_Bald'
fill_skull(b, nose_poly(b))
heads['Rogue_Hooded'].name = 'Head_Hooded'

# ---- hair cap fitted to the bald skull ----
bald = b
zs = [v.co.z for v in bald.data.vertices]; ys = [v.co.y for v in bald.data.vertices]
zmin, zmax, ymin, ymax = min(zs), max(zs), min(ys), max(ys)
print('BALDBOX', round(zmin,3), round(zmax,3), round(ymin,3), round(ymax,3))
def make_cap(name, front_z, back_z, offset):
    bpy.ops.object.select_all(action='DESELECT'); bald.select_set(True); bpy.context.view_layer.objects.active = bald
    bpy.ops.object.duplicate(); cap = bpy.context.active_object; cap.name = name
    for m in list(cap.modifiers):
        if m.type != 'ARMATURE': cap.modifiers.remove(m)
    bm = bmesh.new(); bm.from_mesh(cap.data)
    kill = []
    midy = (ymin + ymax) / 2
    for f in bm.faces:
        c = f.calc_center_median(); ang = abs(math.atan2(c.x, -(c.y - midy)))          # 0 = front of the face, pi = back
        r = min(1.0, max(0.0, (ang - 1.35) / 1.25)); r = r * r * (3 - 2 * r)
        cut = front_z + (back_z - front_z) * r
        if c.z < cut: kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    for v in bm.verts: v.co += v.normal * offset
    bm.to_mesh(cap.data); bm.free()
    sol = cap.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.05; sol.offset = 1
    bpy.ops.object.select_all(action='DESELECT'); cap.select_set(True); bpy.context.view_layer.objects.active = cap
    bpy.ops.object.modifier_move_to_index(modifier='sol', index=0); bpy.ops.object.modifier_apply(modifier='sol')
    to_hairmat(cap); bind(cap)
    return cap
def head_weight(o):
    o.vertex_groups.clear(); g = o.vertex_groups.new(name='head'); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    if not any(m.type == 'ARMATURE' for m in o.modifiers): o.modifiers.new('arm', 'ARMATURE')
    bind(o)
def add_prim(kind, loc, scale, rot=(0, 0, 0), **kw):
    if kind == 'ico': bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=kw.get('sub', 2), radius=1, location=loc)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1, radius2=0, depth=2, location=loc)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1, depth=2, location=loc)
    elif kind == 'cube': bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    o = bpy.context.active_object; o.scale = scale; o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o
def finish(name, parts):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name
    for p in o.data.polygons: p.use_smooth = False
    to_hairmat(o); head_weight(o); return o

cx = 0.0; top = zmax; midy = (ymin + ymax) / 2; back = ymax
cap_full = make_cap('cap_tmp', 1.9, 1.4, 0.035)
# Rapado (buzz): thin cap only
buzz = make_cap('Hair_Buzz', 1.92, 1.5, 0.014); head_weight(buzz)
def capcopy(n):
    bpy.ops.object.select_all(action='DESELECT'); cap_full.select_set(True); bpy.context.view_layer.objects.active = cap_full
    bpy.ops.object.duplicate(); c = bpy.context.active_object; c.name = n; return c
# Coleta (ponytail)
c = capcopy('p1')
tie = add_prim('cyl', (cx, back + 0.02, 1.72), (0.09, 0.09, 0.05), (math.radians(90), 0, 0))
tail = add_prim('ico', (cx, back + 0.16, 1.42), (0.14, 0.13, 0.36), (math.radians(-18), 0, 0), sub=1)
pony = finish('Hair_Ponytail', [c, tie, tail])
# Moño (bun)
c = capcopy('b1')
bun = add_prim('ico', (cx, midy + 0.18, top + 0.12), (0.2, 0.2, 0.17), sub=2)
bunh = finish('Hair_Bun', [c, bun])
# Afro: a round cloud of soft lumps
c = capcopy('a1'); parts = [c, add_prim('ico', (cx, midy + 0.06, 1.84), (0.6, 0.56, 0.44), sub=2)]
for i in range(34):
    th = random.uniform(0, 2 * math.pi); ph = random.uniform(0.1, 1.45)
    x = math.sin(ph) * math.cos(th) * 0.57; y = math.sin(ph) * math.sin(th) * 0.54 + midy + 0.06; z = 1.84 + math.cos(ph) * 0.45
    if y < ymin + 0.2 and z < 2.0: continue
    s_ = random.uniform(0.15, 0.21); parts.append(add_prim('ico', (x, y, z), (s_, s_, s_ * 0.9), sub=2))
afro = finish('Hair_Afro', parts)
# Puntas (spiky)
c = capcopy('s1'); parts = [c]
for i, (x, y, tilt) in enumerate([(-0.3, -0.25, -0.5), (-0.1, -0.32, -0.15), (0.12, -0.3, 0.2), (0.32, -0.2, 0.5), (-0.2, 0.05, -0.3), (0.05, 0.0, 0.05), (0.28, 0.08, 0.35), (-0.05, 0.3, 0)]):
    parts.append(add_prim('cone', (x, y + midy, top + 0.08), (0.13, 0.13, 0.2), (math.radians(-25 if y < 0 else 15), tilt, 0)))
spiky = finish('Hair_Spiky', parts)
bpy.data.objects.remove(cap_full, do_unlink=True)

# ---- export ----
bpy.ops.object.select_all(action='DESELECT')
keep = [o for o in bpy.data.objects if o.type == 'ARMATURE' or o.name.startswith(('Face_', 'Hair_', 'Head_', 'Beard', 'Brows'))]
for o in keep: o.select_set(True)
for o in bpy.data.objects:
    if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
print('EXPORT', sorted(o.name for o in keep))
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_animations=False, export_skins=True, export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=OUT.replace('.glb', '.blend'))
