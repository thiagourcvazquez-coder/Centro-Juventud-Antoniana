# Prendas 3D a partir de scans realistas (Downloads/*.glb): se decimadas, se
# pintan en azul CJA y se les estampan escudo / FIUME / "El Santo" como decals
# proyectados sobre la superficie.
#   blender -b -P scripts/ropa_scan.py [-- camperon-corto pantalon-largo]
import bpy
import bmesh
import os
import sys
import numpy as np
from math import radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prendas as P  # noqa: E402
import remeras as R  # noqa: E402

DL = os.path.join(os.path.expanduser('~'), 'Downloads')
NAVY = (30, 50, 98)
NAVY_D = (22, 36, 74)
CREMA = (232, 218, 192)
BLANCO = (246, 246, 243)


# ------------------------------------------------------------ utilidades

def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar(path, escala=1.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    nuevos = [o for o in bpy.data.objects if o not in before]
    bpy.context.view_layer.update()
    out = []
    for o in nuevos:
        if o.type != 'MESH':
            continue
        o.data.transform(o.matrix_world)
        o.parent = None
        o.matrix_world = o.matrix_world.Identity(4)
        if escala != 1.0:
            o.data.transform(__import__('mathutils').Matrix.Scale(escala, 4))
        out.append(o)
    for o in nuevos:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    return out


def activar(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def decimar(o, ratio):
    activar(o)
    m = o.modifiers.new('d', 'DECIMATE')
    m.ratio = ratio
    bpy.ops.object.modifier_apply(modifier='d')


def unir(objs, nombre):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = nombre
    return o


def suave(o):
    activar(o)
    bpy.ops.object.shade_smooth()


def mat_decal(name, rgba, rough=.7):
    h, w = rgba.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    px = np.empty((h, w, 4), np.float32)
    px[..., :3] = np.clip(rgba[..., :3], 0, 255) / 255.0
    px[..., 3] = np.clip(rgba[..., 3], 0, 1)
    img.pixels.foreach_set(px.ravel())
    img.pack()
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    t = m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = img
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    m.node_tree.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    m.use_backface_culling = True
    try:
        m.surface_render_method = 'BLENDED'
    except Exception:
        pass
    return m


def recortar(a):
    ys, xs = np.where(a[..., 3] > .02)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def texto(t, fuente, color, alto=160, ancho=1100):
    return recortar(R.render_texto(t, fuente, alto, ancho, color))


def decal(nombre, rgba, centro, ancho, eje, destino, offset=.0022, rough=.7, div=28):
    """Plano (con la proporcion del arte) proyectado sobre `destino`.
    eje = ('y', -1) frente / ('y', 1) espalda / ('x', 1|-1) costados.
    centro = (u, z): u es x (frente/espalda) o y (costados)."""
    h, w = rgba.shape[:2]
    alto = ancho * h / w
    ax, sg = eje
    bm = bmesh.new()
    bm.loops.layers.uv.new('UVMap')
    bmesh.ops.create_grid(bm, x_segments=div, y_segments=max(2, int(div * h / w)),
                          size=1.0, calc_uvs=True)
    bm.to_mesh(me := bpy.data.meshes.new(nombre))
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    for v in me.vertices:
        v.co.x *= ancho / 2
        v.co.y *= alto / 2
    # el grid esta en XY; lo giramos para quedar sobre el plano de proyeccion
    far = 1.2
    for v in me.vertices:
        gx, gy = v.co.x, v.co.y
        if ax == 'y':
            v.co = Vector((centro[0] + gx * (1 if sg < 0 else -1), sg * far, centro[1] + gy))
        else:
            v.co = Vector((sg * far, centro[0] - gx * (1 if sg > 0 else -1) * -1, centro[1] + gy))
    me.update()
    sw = ob.modifiers.new('sw', 'SHRINKWRAP')
    sw.target = destino
    sw.wrap_method = 'PROJECT'
    sw.use_project_x = ax == 'x'
    sw.use_project_y = ax == 'y'
    sw.use_project_z = False
    sw.use_negative_direction = True
    sw.use_positive_direction = True
    sw.cull_face = 'OFF'
    sw.offset = offset
    activar(ob)
    bpy.ops.object.modifier_apply(modifier='sw')
    ob.data.materials.append(mat_decal(nombre, rgba, rough))
    bpy.ops.object.shade_smooth()
    return ob


def parche(nombre, centro, w, h, eje, destino, mat, grosor=.007, offset=.003, div=14):
    """Parche con volumen (bolsillo cargo) proyectado sobre destino."""
    ax, sg = eje
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=div, y_segments=div, size=1.0)
    bm.to_mesh(me := bpy.data.meshes.new(nombre))
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    for v in me.vertices:
        gx, gy = v.co.x * w / 2, v.co.y * h / 2
        v.co = Vector((sg * 1.2, centro[0] + gx, centro[1] + gy)) if ax == 'x' else Vector((centro[0] + gx, sg * 1.2, centro[1] + gy))
    sw = ob.modifiers.new('sw', 'SHRINKWRAP')
    sw.target = destino
    sw.wrap_method = 'PROJECT'
    sw.use_project_x = ax == 'x'
    sw.use_project_y = ax == 'y'
    sw.use_project_z = False
    sw.use_negative_direction = True
    sw.use_positive_direction = True
    sw.cull_face = 'OFF'
    sw.offset = offset
    activar(ob)
    bpy.ops.object.modifier_apply(modifier='sw')
    so = ob.modifiers.new('so', 'SOLIDIFY')
    so.thickness = grosor
    so.offset = 1
    bpy.ops.object.modifier_apply(modifier='so')
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def exportar(slug):
    for o in list(bpy.data.objects):
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    for o in bpy.context.scene.objects:
        o.select_set(True)
    path = os.path.join(P.OUT, slug + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_image_format='AUTO',
                              export_yup=True, export_apply=True)
    print('GLB', slug, os.path.getsize(path) // 1024, 'KB')


# ------------------------------------------------------------ camperon corto

def camperon_corto():
    limpiar()
    objs = importar(os.path.join(DL, 'canada_goose_winter_jacket.glb'))
    navy = P.mat_plain('camperon', NAVY, .62)
    navyd = P.mat_plain('camperon_cierre', NAVY_D, .85)
    for o in objs:
        n = len(o.data.polygons)
        decimar(o, .11 if n > 5000 else .5)
        o.data.materials.clear()
        o.data.materials.append(navyd if n < 14000 and abs(o.dimensions.x) < .05 else navy)
    cuerpo = unir(objs, 'camperon-corto')
    suave(cuerpo)
    print('polys', len(cuerpo.data.polygons))
    escudo = R.P.ESCUDO
    fiume = texto('FIUME', 'arialbi.ttf', BLANCO)
    santo = texto('El Santo', 'segoesc.ttf', CREMA)
    # frente: FIUME pecho derecho del jugador (-x), escudo pecho izquierdo (+x)
    decal('fiume_pecho', fiume, (-.165, .715), .085, ('y', -1), cuerpo)
    decal('escudo_pecho', escudo, (.145, .69), .105, ('y', -1), cuerpo)
    # espalda: El Santo y escudo chico
    decal('santo_espalda', santo, (0, .76), .20, ('y', 1), cuerpo)
    decal('escudo_espalda', escudo, (0, .60), .12, ('y', 1), cuerpo)
    exportar('camperon-corto')


# ------------------------------------------------------------ pantalon cargo

def pantalon_cargo(slug='pantalon-largo', corte=None):
    limpiar()
    objs = importar(os.path.join(DL, 'jeans_denim_pants.glb'), .001)
    por = {o.name: o for o in objs}
    usar = [por[n] for n in ('Object_4', 'Object_3', 'Object_2') if n in por]
    for o in objs:
        if o not in usar:
            bpy.data.objects.remove(o)
    navy = P.mat_plain('pantalon', NAVY_D, .7)
    for o in usar:
        decimar(o, .3 if len(o.data.polygons) > 20000 else .6)
        o.data.materials.clear()
        o.data.materials.append(navy)
    cuerpo = unir(usar, slug)
    if corte:
        bm = bmesh.new()
        bm.from_mesh(cuerpo.data)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, corte),
                               plane_no=(0, 0, 1), clear_inner=True)
        bm.to_mesh(cuerpo.data)
        bm.free()
    suave(cuerpo)
    print('polys', len(cuerpo.data.polygons))
    fiume = texto('FIUME', 'arialbi.ttf', BLANCO)
    santo = texto('El Santo', 'segoesc.ttf', CREMA)
    navy_b = P.mat_plain('bolsillo', NAVY, .7)
    for sg in (-1, 1):
        parche('bolsillo_%d' % sg, (0.0, .60), .10, .17, ('x', sg), cuerpo, navy_b)
        parche('solapa_%d' % sg, (0.0, .675), .105, .035, ('x', sg), cuerpo, navy_b, .010, .0035, 10)
    decal('santo_bolsillo', santo, (0.0, .675), .075, ('x', -1), cuerpo, .0145)
    decal('fiume_muslo', fiume, (.14, .84), .065, ('y', -1), cuerpo)
    exportar(slug)


MODELOS = {'camperon-corto': camperon_corto, 'pantalon-largo': pantalon_cargo,
           'bermuda': lambda: pantalon_cargo('bermuda', .47)}

if __name__ == '__main__':
    P.ESCUDO = P.load_escudo()
    R.P.ESCUDO = P.ESCUDO
    pedidos = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(MODELOS)
    for s in pedidos:
        MODELOS[s]()
