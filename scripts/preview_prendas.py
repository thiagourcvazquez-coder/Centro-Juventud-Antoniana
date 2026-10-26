# Render de verificacion: todos los .glb en fila.
#   blender -b -P scripts/preview_prendas.py -- front|back [slug ...]
import bpy
import os
import sys
from math import radians
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOD = os.path.join(ROOT, 'public', 'modelos')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
vista = args[0] if args else 'front'
slugs = args[1:] or ['camiseta-oficial', 'camiseta-110', 'musculosa-azul', 'chomba', 'campera',
                     'rompevientos', 'bermuda', 'pantalon-largo', 'gorra', 'bolso']

bpy.ops.wm.read_factory_settings(use_empty=True)
x = 0.0
for slug in slugs:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MOD, slug + '.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    if vista == 'tq':
        for o in new:
            if o.parent is None:
                o.rotation_euler.z = radians(40)
        bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2
    print(slug, 'tamano', tuple(round(v, 2) for v in (hi - lo)))
    for o in new:
        if o.parent is None:
            o.location += Vector((x - ctr.x, -ctr.y, -ctr.z))
    x += 1.35

s = bpy.context.scene
s.render.engine = 'BLENDER_EEVEE'
s.render.resolution_x = 600 * len(slugs)
s.render.resolution_y = 720
s.world = bpy.data.worlds.new('w')
s.world.color = (.12, .13, .16)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('c'))
s.collection.objects.link(cam)
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 1.35 * len(slugs) + .2
cx = (x - 1.35) / 2
if vista == 'side':
    cam.location = (-5, 0, 0)
    cam.rotation_euler = (radians(90), 0, radians(-90))
elif vista == 'back':
    cam.location = (cx, 5, 0)
    cam.rotation_euler = (radians(90), 0, radians(180))
else:
    cam.location = (cx, -5, 0)
    cam.rotation_euler = (radians(90), 0, 0)
s.camera = cam
for loc, en in (((cx, -4, 4), 700), ((cx, 4, 3), 500)):
    L = bpy.data.objects.new('l', bpy.data.lights.new('l', 'AREA'))
    s.collection.objects.link(L)
    L.location = loc
    L.data.energy = en
    L.data.size = 8
    L.rotation_euler = (radians(60 if loc[1] < 0 else 120), 0, 0)
s.render.filepath = os.path.join(ROOT, 'scripts', '_tmp', f'preview_{vista}.png')
bpy.ops.render.render(write_still=True)
print('OK', s.render.filepath)
