# Remeras 3D sobre la malla realista de clothes.glb (scripts/base/remera.glb).
# Cada diseno es una funcion que pinta en coordenadas de la prenda (metros),
# copiando las fotos oficiales de Fiume, y se "hornea" sobre las UV de la malla.
#   blender -b -P scripts/remeras.py [-- slug slug ...]   (sin args: todas)
import bpy
import bmesh
import os
import sys
import numpy as np
from math import pi, sin, cos

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prendas as P  # noqa: E402

ROOT = P.ROOT
BASE = os.path.join(ROOT, 'scripts', 'base')
FONTS = r'C:\Windows\Fonts'

NAVY = (28, 42, 86)
NAVY_O = (30, 46, 92)
AZUL = (47, 88, 132)
AZUL_T = (36, 88, 128)
BROWN = (92, 56, 40)
CHOC = (92, 58, 42)
CREMA = (228, 212, 188)
BLANCO = (246, 246, 243)
NEGRO = (24, 26, 34)


# ------------------------------------------------------------ horneado

def cargar_base(slug, sin_mangas=False):
    bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, slug + '.glb'))
    obj = [o for o in bpy.data.objects if o.type == 'MESH'][0]
    obj.data.transform(obj.matrix_world)
    obj.parent = None
    obj.matrix_world = obj.matrix_world.Identity(4)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    if sin_mangas:
        bad = [f for f in bm.faces if abs(f.calc_center_median().x) > .205 and f.calc_center_median().z > .38]
        bmesh.ops.delete(bm, geom=bad, context='FACES')
        seen, islas = set(), []
        for v in bm.verts:
            if v in seen or not v.link_faces:
                continue
            isla, pila = [], [v]
            seen.add(v)
            while pila:
                u = pila.pop()
                isla.append(u)
                for e in u.link_edges:
                    w = e.other_vert(u)
                    if w not in seen:
                        seen.add(w)
                        pila.append(w)
            islas.append(isla)
        islas.sort(key=len)
        for isla in islas[:-1]:
            bmesh.ops.delete(bm, geom=isla, context='VERTS')
    rims = [v.co.copy() for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
    bm.to_mesh(obj.data)
    bm.free()
    return obj, np.array([[v.x, v.y, v.z] for v in rims], np.float32)


def mapa_posiciones(mesh, W, H, dil=10):
    mesh.calc_loop_triangles()
    tris = mesh.loop_triangles
    n = len(tris)
    lp = np.empty(n * 3, np.int32)
    vi = np.empty(n * 3, np.int32)
    tris.foreach_get('loops', lp)
    tris.foreach_get('vertices', vi)
    uv = np.empty(len(mesh.loops) * 2, np.float32)
    mesh.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)[lp].reshape(n, 3, 2) * np.array([W, H], np.float32)
    co = np.empty(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[vi].reshape(n, 3, 3)
    pos = np.zeros((H, W, 3), np.float32)
    mask = np.zeros((H, W), bool)
    for t in range(n):
        a, b, c = uv[t]
        x0, x1 = int(max(min(a[0], b[0], c[0]) - 1, 0)), int(min(max(a[0], b[0], c[0]) + 1, W))
        y0, y1 = int(max(min(a[1], b[1], c[1]) - 1, 0)), int(min(max(a[1], b[1], c[1]) + 1, H))
        if x1 <= x0 or y1 <= y0:
            continue
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1) + .5, np.arange(y0, y1) + .5)
        l0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        l1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -.02) & (l1 >= -.02) & (l2 >= -.02)
        if not m.any():
            continue
        p = co[t]
        sub = pos[y0:y1, x0:x1]
        sub[m] = l0[m, None] * p[0] + l1[m, None] * p[1] + l2[m, None] * p[2]
        mask[y0:y1, x0:x1] |= m
    for _ in range(dil):
        m2, p2 = mask.copy(), pos.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sm = np.roll(mask, (dy, dx), (0, 1))
            sp = np.roll(pos, (dy, dx), (0, 1))
            take = sm & ~m2
            p2[take] = sp[take]
            m2 |= take
        pos, mask = p2, m2
    return pos, mask


# ------------------------------------------------------------ texto

def render_texto(texto, fuente, alto_px=256, ancho_px=1400, color=(1, 1, 1)):
    """Rasteriza texto con una fuente del sistema -> RGBA float (0..255 en rgb)."""
    sc = bpy.data.scenes.new('txt')
    prev = bpy.context.window.scene if bpy.context.window else None
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = ancho_px, alto_px
    sc.display.shading.light = 'FLAT'
    sc.display.shading.color_type = 'SINGLE'
    sc.display.shading.single_color = color
    sc.view_settings.view_transform = 'Standard'
    cu = bpy.data.curves.new('t', 'FONT')
    cu.body = texto
    cu.font = bpy.data.fonts.load(os.path.join(FONTS, fuente))
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.size = 1.0
    ob = bpy.data.objects.new('t', cu)
    sc.collection.objects.link(ob)
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c'))
    sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ancho_px / alto_px * 1.5
    cam.location = (0, 0, 5)
    sc.camera = cam
    out = os.path.join(P.TMP, 'txt.png')
    sc.render.filepath = out
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    bpy.ops.render.render(write_still=True, scene=sc.name)
    img = bpy.data.images.load(out)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    a = px.reshape(h, w, 4).copy()
    a[..., :3] = np.array(color) * 255
    return a


def stamp_tile(tile, word, cx, cy, escala, ang):
    """Estampa `word` (RGBA) rotado/escalado en `tile` (RGBA float, 0..1 alpha)."""
    H, W = tile.shape[:2]
    h, w = word.shape[:2]
    r = int(max(w, h) * escala * .6) + 2
    x0, x1 = max(int(cx - r), 0), min(int(cx + r), W)
    y0, y1 = max(int(cy - r), 0), min(int(cy + r), H)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx, dy = (xx - cx) / escala, (yy - cy) / escala
    ca, sa = cos(ang), sin(ang)
    u = dx * ca + dy * sa + w / 2
    v = -dx * sa + dy * ca + h / 2
    ok = (u >= 0) & (u < w - 1) & (v >= 0) & (v < h - 1)
    ui, vi = np.clip(u, 0, w - 1).astype(int), np.clip(v, 0, h - 1).astype(int)
    al = word[vi, ui, 3] * ok
    sub = tile[y0:y1, x0:x1]
    sub[..., :3] = sub[..., :3] * (1 - al[..., None]) + word[vi, ui, :3] * al[..., None]
    sub[..., 3] = np.maximum(sub[..., 3], al)


# ------------------------------------------------------------ contexto

class Ctx:
    def __init__(s, pos, mask, rims):
        s.X, s.Y, s.Z = pos[..., 0], pos[..., 1], pos[..., 2]
        s.mask = mask
        s.front = s.Y < 0
        s.XV = np.where(s.front, s.X, -s.X)
        s.H, s.W = mask.shape
        s.canvas = np.zeros((s.H, s.W, 3), np.float32)
        s.rims = rims
        s._d = {}

    def dist(s, nombre, sel):
        """Distancia (m) de cada texel al borde `nombre` (neck|cuff|hem)."""
        if nombre in s._d:
            return s._d[nombre]
        r = s.rims[sel(s.rims)]
        d = np.full((s.H, s.W), 9.0, np.float32)
        if len(r):
            lo, hi = r.min(axis=0) - .12, r.max(axis=0) + .12
            m = s.mask & (s.X > lo[0]) & (s.X < hi[0]) & (s.Y > lo[1]) & (s.Y < hi[1]) & (s.Z > lo[2]) & (s.Z < hi[2])
            px, py, pz = s.X[m], s.Y[m], s.Z[m]
            best = np.full(px.shape, 9.0, np.float32)
            for q in r[::max(1, len(r) // 220)]:
                best = np.minimum(best, (px - q[0]) ** 2 + (py - q[1]) ** 2 + (pz - q[2]) ** 2)
            d[m] = np.sqrt(best)
        s._d[nombre] = d
        return d

    def cuello(s, ancho):
        return s.dist('neck', lambda r: (np.abs(r[:, 0]) < .17) & (r[:, 2] > .6)) < ancho

    def puno(s, ancho, desde=0.0):
        d = s.dist('cuff', lambda r: np.abs(r[:, 0]) > .3)
        return (d < ancho) & (d >= desde)

    def ruedo(s, ancho):
        return s.dist('hem', lambda r: r[:, 2] < .15) < ancho

    def fill(s, col):
        s.canvas[:] = col

    def paint(s, m, col):
        s.canvas[m & s.mask] = col

    def banda(s, p0, p1, ancho, off=0.0):
        dx, dz = p1[0] - p0[0], p1[1] - p0[1]
        L = (dx * dx + dz * dz) ** .5
        d = ((s.XV - p0[0]) * dz - (s.Z - p0[1]) * dx) / L - off
        return (np.abs(d) < ancho / 2) & s.front, d

    def stamp(s, img, cx, cz, w, h, side='front'):
        sx = (s.XV - cx) / w + .5
        sy = (s.Z - cz) / h + .5
        ok = (sx > 0) & (sx < 1) & (sy > 0) & (sy < 1) & s.mask
        ok &= s.front if side == 'front' else ~s.front
        Hh, Ww = img.shape[:2]
        fx, fy = np.clip(sx, 0, 1) * (Ww - 1), np.clip(sy, 0, 1) * (Hh - 1)
        x0, y0 = np.floor(fx).astype(int), np.floor(fy).astype(int)
        x1, y1 = np.minimum(x0 + 1, Ww - 1), np.minimum(y0 + 1, Hh - 1)
        wx, wy = (fx - x0)[..., None], (fy - y0)[..., None]
        sm = (img[y0, x0] * (1 - wx) * (1 - wy) + img[y0, x1] * wx * (1 - wy)
              + img[y1, x0] * (1 - wx) * wy + img[y1, x1] * wx * wy)
        a = sm[..., 3:4] * ok[..., None]
        s.canvas = s.canvas * (1 - a) + sm[..., :3] * a

    def escudo(s, cx, cz, w=.075, side='front'):
        s.stamp(P.ESCUDO, cx, cz, w, w * 1.13, side)

    def escudo_blanco(s, cx, cz, w=.12, side='front'):
        e = P.ESCUDO.copy()
        claro = e[..., :3].min(axis=2) > 205
        e[..., :3] = np.where(claro[..., None], np.array(NAVY, np.float32), np.array(BLANCO, np.float32))
        s.stamp(e, cx, cz, w, w * 1.13, side)


# ------------------------------------------------------------ disenios

def sash_oficial(c, col_izq, col_der, p0, p1, ancho_izq, ancho_der):
    m1, d = c.banda(p0, p1, ancho_izq * 2, -ancho_izq)
    c.paint(m1 & (d < 0) & (d > -ancho_izq * 2) & c.front, col_izq)
    m2, d2 = c.banda(p0, p1, ancho_der * 2, ancho_der)
    c.paint(m2 & (d2 >= 0) & c.front, col_der)


def oficial_2026(c):
    c.fill(BLANCO)
    m, d = c.banda((.15, .74), (-.22, .0), .13)
    c.paint(m & (d < .003), BROWN)
    c.paint(m & (d >= .003), AZUL)
    c.paint(c.cuello(.022), NAVY)
    for sx in (1, -1):
        m, _ = c.banda((sx * .09, .745), (0, .64), .018)
        c.paint(m & c.front & ((c.XV * sx) > 0), NAVY)
    c.paint(c.puno(.04), NAVY)
    c.paint(c.puno(.045, .035), BROWN)
    c.escudo(.105, .585, .078)


def alternativa_2026(c):
    c.fill(CHOC)
    ragl = np.abs(c.X) > .10 + (.74 - c.Z) * .68
    ragl &= c.Z > .40
    c.paint(ragl, (238, 230, 220))
    ln = np.abs(np.sin(c.Z * 34 + np.sin(c.X * 30) * 2.2 + c.X * 6)) < .09
    c.paint(ragl & ln, (176, 156, 146))
    ln2 = np.abs(np.sin(c.Z * 21 - np.sin(c.X * 22 + 1) * 2.6)) < .06
    c.paint(ragl & ln2, (196, 178, 166))
    c.paint(c.cuello(.02), AZUL)
    c.paint(c.puno(.04), AZUL)
    c.paint(c.puno(.046, .036), (230, 230, 235))
    c.escudo(.07, .60, .08)


def tercera_2025(c):
    c.fill(BROWN)
    m, d = c.banda((.13, .74), (-.17, .02), .06)
    c.paint(m, BLANCO)
    m2, d2 = c.banda((.13, .74), (-.17, .02), .035, .045)
    c.paint(m2, AZUL_T)
    c.paint(c.cuello(.022), AZUL_T)
    for sx in (1, -1):
        mm, _ = c.banda((sx * .09, .745), (0, .64), .016)
        c.paint(mm & c.front & ((c.XV * sx) > 0), BLANCO)
    c.paint(c.puno(.04), AZUL_T)
    c.escudo(.13, .60, .07)


def retro_110(c):
    c.fill(BLANCO)
    m, _ = c.banda((.17, .74), (-.22, .03), .16)
    c.paint(m, NAVY)
    c.paint(c.cuello(.028), NAVY)
    c.paint(c.puno(.04), NAVY)
    c.escudo(.115, .595, .08)
    cx, cz, R = -.115, .60, .036
    for side in (1, -1):
        for k in range(7):
            th = np.radians(115 + k * 21)
            px, pz = cx + side * R * cos(th) * -1 * 1.0, cz + R * sin(th) * -1
            mm = ((c.XV - px) ** 2 / (.011 ** 2) + (c.Z - pz) ** 2 / (.0052 ** 2)) < 1
            c.paint(mm & c.front, NAVY)
    w = render_texto('110', 'arialbd.ttf', 256, 700, (1, 1, 1))
    w[..., :3] = NAVY
    c.stamp(w, cx, cz, .05, .05 * 256 / 700)


def polo(c):
    c.fill(CREMA)
    c.paint(c.cuello(.026), (44, 66, 112))
    c.paint(c.puno(.026), (36, 52, 100))
    c.paint((np.abs(c.XV) < .012) & (c.Z > .60) & (c.Z < .72) & c.front, (200, 184, 160))
    for z in (.705, .665):
        c.paint((((c.XV) ** 2 + (c.Z - z) ** 2) < .0075 ** 2) & c.front, (210, 196, 176))
    c.escudo(.105, .565, .052)


def prematch_2026(c):
    c.fill(CREMA)
    a = np.abs(c.X) - .075
    zt = .752 - .20 * a
    yoke = (a > 0) & (a < .21) & (c.Z > zt - .05 * (1 - a / .21))
    c.paint(yoke, NAVY)
    c.escudo(0, .56, .05)


def entreno_2026(c):
    c.fill(NAVY_O)
    c.escudo(.105, .58, .065)


def entreno_2027(c):
    c.fill(CREMA)
    c.paint((np.abs(c.X) > .22) & (np.abs(c.X) < .285) & (c.Z < .46), NAVY)
    c.escudo(.105, .58, .065)


def premium_salida(c):
    c.fill((28, 38, 72))
    c.paint(c.puno(.047, .035), BLANCO)
    c.escudo(.105, .58, .065)


def musculosa_premium(c):
    c.fill((30, 32, 42))
    c.escudo_blanco(0, .50, .14)
    w = render_texto('ANTONIANO', 'arialbd.ttf', 256, 1500, (1, 1, 1))
    c.stamp(w, 0, .335, .17, .17 * 256 / 1500)
    w2 = render_texto('1916', 'arialbd.ttf', 256, 700, (1, 1, 1))
    c.stamp(w2, 0, .29, .06, .06 * 256 / 700)


def entreno_sin_mangas(c):
    c.fill(NAVY_O)
    c.paint((np.abs(c.X) > .20) & (c.Z < .55), (232, 234, 238))
    c.escudo(.105, .58, .065)


def el_santo(c):
    c.fill(NAVY_O)
    word = render_texto('El Santo', 'segoesc.ttf', 256, 1100, (1, 1, 1))
    TS = 1536
    tile = np.zeros((TS, TS, 4), np.float32)
    rng = np.random.RandomState(7)
    for _ in range(15):
        stamp_tile(tile, word, rng.uniform(0, TS), rng.uniform(0, TS), rng.uniform(.7, 1.15),
                   rng.choice([-1, 1]) * rng.uniform(.0, 1.45))
    tw = .42
    u = (((c.XV * cos(.3) - c.Z * sin(.3)) / tw) % 1.0) * (TS - 1)
    v = (((c.XV * sin(.3) + c.Z * cos(.3)) / tw) % 1.0) * (TS - 1)
    a = tile[v.astype(int), u.astype(int), 3:4]
    c.canvas = c.canvas * (1 - a) + np.array(BLANCO, np.float32) * a
    c.paint(np.abs(c.X) > .30, NAVY_O)
    c.paint(c.cuello(.03), NAVY_O)
    c.escudo(.105, .56, .065)


def buzo(c):
    c.fill(NAVY_O)
    c.escudo(.10, .60, .07)
    c.paint(c.puno(.05), (22, 34, 70))
    c.paint(c.ruedo(.06), (22, 34, 70))


DISENIOS = {
    # slug: (funcion, base, sin_mangas)
    'camiseta-oficial': (oficial_2026, False),
    'camiseta-alternativa': (alternativa_2026, False),
    'camiseta-tercera': (tercera_2025, False),
    'camiseta-110': (retro_110, False),
    'chomba': (polo, False),
    'remera-prematch': (prematch_2026, False),
    'remera-el-santo': (el_santo, False),
    'remera-entreno': (entreno_2026, False),
    'remera-entreno-crema': (entreno_2027, False),
    'remera-premium-salida': (premium_salida, False),
    'musculosa-premium': (musculosa_premium, True),
    'musculosa-azul': (entreno_sin_mangas, True),
    'buzo-deportivo': (buzo, False, 'buzo'),
}


def hornear(slug, disenio, sin_mangas, base='remera', W=2048, H=2048):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obj, rims = cargar_base(base, sin_mangas)
    pos, mask = mapa_posiciones(obj.data, W, H)
    c = Ctx(pos, mask, rims)
    disenio(c)
    obj.data.materials.clear()
    obj.data.materials.append(P.mat_tex(slug, c.canvas, .8))
    obj.name = slug
    P.export(slug)


if __name__ == '__main__':
    P.ESCUDO = P.load_escudo()
    pedidos = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(DISENIOS)
    for s in pedidos:
        f, sm, *base = DISENIOS[s]
        hornear(s, f, sm, *base)
