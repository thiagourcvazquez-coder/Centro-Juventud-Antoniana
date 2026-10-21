# Genera una camiseta 3D estilizada de Juventud Antoniana y la exporta
# como GLB. Corre headless: blender --background --python modelo_camiseta.py
import bpy
import os
import struct
import zlib
import bmesh

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_GLB = os.path.join(ROOT, 'public', 'modelos', 'camiseta.glb')
OUT_PNG = os.path.join(ROOT, 'public', 'modelos', '_rayas.png')
DEPTH = 0.14

# ---------- Textura de rayas (PNG escrito a mano) ----------

def png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(b for x in range(w) for b in px(x)) for _ in range(h))
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    blob = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(blob)

BLANCO = (245, 248, 252)
CELESTE = (86, 183, 240)
AZUL = (13, 27, 61)
CICLO, FILETE = 128, 6

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
png(OUT_PNG, 1024, 1024,
    lambda x: AZUL if x % CICLO < FILETE else (CELESTE if x % CICLO < CICLO // 2 else BLANCO))

# ---------- Escena limpia ----------

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# ---------- Silueta de la camiseta (planta, eje Y arriba) ----------

P = [
    (0.09, 1.00),    # cuello der
    (0.26, 0.92),    # hombro der
    (0.58, 0.64),    # manga der superior
    (0.64, 0.54),    # punta manga der
    (0.52, 0.42),    # manga der inferior
    (0.31, 0.50),    # axila der
    (0.30, 0.00),    # ruedo der
    (-0.30, 0.00),   # ruedo izq
    (-0.31, 0.50),   # axila izq
    (-0.52, 0.42),   # manga izq inferior
    (-0.64, 0.54),   # punta manga izq
    (-0.58, 0.64),   # manga izq superior
    (-0.26, 0.92),   # hombro izq
    (-0.09, 1.00),   # cuello izq
    (-0.04, 0.91),   # escote izq
    (0.00, 0.89),    # escote centro
    (0.04, 0.91),    # escote der
]
n = len(P)

# Curva 2D con relleno + extrusión + bisel: Blender resuelve la topología
cu = bpy.data.curves.new('camiseta', 'CURVE')
cu.dimensions = '2D'
cu.fill_mode = 'BOTH'
cu.extrude = DEPTH / 2
cu.bevel_depth = 0.04
cu.bevel_resolution = 4
cu.resolution_u = 2
sp = cu.splines.new('POLY')
sp.points.add(n - 1)
for i, (x, y) in enumerate(P):
    sp.points[i].co = (x, y, 0, 1)
sp.use_cyclic_u = True

obj = bpy.data.objects.new('camiseta', cu)
bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.ops.object.convert(target='MESH')
mesh = obj.data
mesh.update()

# Suavizar solo laterales y bisel; frente/dorso quedan planos
for p in mesh.polygons:
    p.use_smooth = abs(p.normal.z) < 0.9

# ---------- UV ----------
# Caras de frente/dorso (|normal.z| alto): mapeo plano -> rayas verticales.
# Laterales y bisel: UV fijo en la banda celeste -> vivo celeste uniforme.
xs = [p[0] for p in P]
ys = [p[1] for p in P]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
CELESTE_UV = (0.04, 0.5)
while mesh.uv_layers:
    mesh.uv_layers.remove(mesh.uv_layers[0])
uv = mesh.uv_layers.new(name='UVMap')
for poly in mesh.polygons:
    lateral = abs(poly.normal.z) < 0.7
    for li in poly.loop_indices:
        if lateral:
            uv.data[li].uv = CELESTE_UV
        else:
            v = mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = ((v.x - x0) / (x1 - x0), (v.y - y0) / (y1 - y0))

# ---------- Material ----------

mat = bpy.data.materials.new('tela')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Roughness'].default_value = 0.75
tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
img = bpy.data.images.load(OUT_PNG)
img.pack()
tex.image = img
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
obj.data.materials.append(mat)

# Centrar y exportar
obj.location = (0, -(y0 + y1) / 2, 0)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    export_apply=True,
)
print('GLB ->', OUT_GLB)
