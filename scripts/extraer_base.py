# Extrae la remera base (y el buzo) de clothes.glb a scripts/base/*.glb
# (solo geometria, sin las 27 texturas pesadas) y la analiza.
#   blender -b -P scripts/extraer_base.py
import bpy
import bmesh
import os
from math import radians
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r'C:\Users\Usuario\Downloads\clothes.glb'
BASE = os.path.join(ROOT, 'scripts', 'base')
os.makedirs(BASE, exist_ok=True)

PIEZAS = {'remera': 'Object_2', 'buzo': 'Object_6'}


def extraer(slug, nombre, alto_m):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    src = bpy.data.objects[nombre]
    mesh = src.data.copy()
    mesh.transform(src.matrix_world)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    obj = bpy.data.objects.new(slug, mesh)
    bpy.context.scene.collection.objects.link(obj)
    bb = [Vector(c) for c in (v.co for v in mesh.vertices)]
    lo = Vector((min(p.x for p in bb), min(p.y for p in bb), min(p.z for p in bb)))
    hi = Vector((max(p.x for p in bb), max(p.y for p in bb), max(p.z for p in bb)))
    k = alto_m / (hi.z - lo.z)
    ctr = Vector(((hi.x + lo.x) / 2, (hi.y + lo.y) / 2, lo.z))
    mesh.transform(__import__('mathutils').Matrix.Translation(-ctr))
    mesh.transform(__import__('mathutils').Matrix.Scale(k, 4))
    mesh.materials.clear()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    boundary = [e for e in bm.edges if e.is_boundary]
    print(slug, 'verts', len(bm.verts), 'tris', len(bm.faces), 'borde edges', len(boundary),
          'uv', [u.name for u in mesh.uv_layers])
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    path = os.path.join(BASE, slug + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_materials='NONE',
                              use_selection=True, export_yup=True)
    print('BASE', slug, os.path.getsize(path) // 1024, 'KB')


for slug, nombre in PIEZAS.items():
    extraer(slug, nombre, .75 if slug == 'remera' else .95)
