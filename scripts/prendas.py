# Genera los modelos 3D de la tienda CJA (azul marino / blanco / marron).
#   blender --background --python scripts/prendas.py [-- slug slug ...]
# Salida: public/modelos/<slug>.glb  (Y arriba, frente hacia +Z en three.js)
import bpy
import bmesh
import os
import sys
import shutil
import numpy as np
from math import sin, cos, pi, asin
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'modelos')
TMP = os.path.join(ROOT, 'scripts', '_tmp')
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

N = 72  # segmentos alrededor

NAVY = (27, 52, 92)
NAVY_D = (22, 42, 78)
NAVY_L = (48, 70, 124)
WHITE = (244, 244, 240)
BROWN = (72, 46, 31)
BLACK = (26, 26, 30)
GRAY = (120, 124, 132)


# ---------------------------------------------------------------- escudo

def load_escudo():
    img = bpy.data.images.load(os.path.join(ROOT, 'public', 'images', 'escudo.png'))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)
    f = max(1, w // 256)
    a = a[:h // f * f, :w // f * f].reshape(h // f, f, w // f, f, 4).mean(axis=(1, 3))
    bpy.data.images.remove(img)
    white = a[..., :3].min(axis=2) > 0.90
    if a[..., 3].min() < 0.9:
        alpha = a[..., 3].copy()
    else:
        bg = np.zeros_like(white)
        bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1] = white[0, :], white[-1, :], white[:, 0], white[:, -1]
        for _ in range(600):
            nb = bg.copy()
            nb[1:] |= bg[:-1]
            nb[:-1] |= bg[1:]
            nb[:, 1:] |= bg[:, :-1]
            nb[:, :-1] |= bg[:, 1:]
            nb &= white
            if (nb == bg).all():
                break
            bg = nb
        alpha = (~bg).astype(np.float32)
    out = np.zeros(a.shape, np.float32)
    out[..., :3] = a[..., :3] * 255
    out[..., 3] = alpha
    return out


ESCUDO = None


def resample(img, h, w):
    H, W = img.shape[:2]
    fy = np.linspace(0, H - 1, h)
    fx = np.linspace(0, W - 1, w)
    y0 = np.floor(fy).astype(int)
    x0 = np.floor(fx).astype(int)
    y1 = np.minimum(y0 + 1, H - 1)
    x1 = np.minimum(x0 + 1, W - 1)
    wy = (fy - y0)[:, None, None]
    wx = (fx - x0)[None, :, None]
    top = img[y0][:, x0] * (1 - wx) + img[y0][:, x1] * wx
    bot = img[y1][:, x0] * (1 - wx) + img[y1][:, x1] * wx
    return top * (1 - wy) + bot * wy


def paste(a, img, cx, cy, w, h):
    H, W = a.shape[:2]
    x0, x1 = int(cx - w / 2), int(cx + w / 2)
    y0, y1 = int(cy - h / 2), int(cy + h / 2)
    if x0 < 0 or y0 < 0 or x1 > W or y1 > H or x1 - x0 < 2 or y1 - y0 < 2:
        return
    s = resample(img, y1 - y0, x1 - x0)
    al = s[..., 3:4]
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - al) + s[..., :3] * al


# ---------------------------------------------------------------- texturas

class T:
    """Mapeo diseno(metros) -> pixeles de una textura envolvente."""

    def __init__(s, W, H, z0, z1, circ=1.76):
        s.W, s.H, s.z0, s.z1, s.circ = W, H, z0, z1, circ

    def x(s, xs):
        return (0.5 + asin(max(-1, min(1, xs))) / (2 * pi)) * s.W

    def y(s, z):
        return (z - s.z0) / (s.z1 - s.z0) * s.H

    def w(s, m):
        return m / s.circ * s.W

    def h(s, m):
        return m / (s.z1 - s.z0) * s.H


def grid(W, H):
    u = (np.arange(W) + .5) / W
    v = (np.arange(H) + .5) / H
    U, V = np.meshgrid(u, v)
    t = 2 * pi * (U - .5)
    return U, V, t, np.sin(t)


def blank(W, H, col):
    a = np.empty((H, W, 3), np.float32)
    a[:] = col
    return a


def rect(a, x0, y0, x1, y1, col):
    a[max(int(y0), 0):int(y1), max(int(x0), 0):int(x1)] = col


def ell(a, cx, cy, rx, ry, ang, col):
    H, W = a.shape[:2]
    r = int(max(rx, ry) * 1.5) + 2
    x0, x1 = max(int(cx) - r, 0), min(int(cx) + r, W)
    y0, y1 = max(int(cy) - r, 0), min(int(cy) + r, H)
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx, dy = xx - cx, yy - cy
    ca, sa = cos(ang), sin(ang)
    u = (dx * ca + dy * sa) / rx
    v = (-dx * sa + dy * ca) / ry
    a[y0:y1, x0:x1][(u * u + v * v) <= 1] = col


def laurel(a, cx, cy, R, col, n=8):
    for side in (1, -1):
        for k in range(n):
            th = np.radians(105 + k * (150 / (n - 1)))
            px = cx + side * R * cos(th) * -1
            py = cy + R * sin(th) * -1
            tang = th + pi / 2
            ang = tang if side == 1 else pi - tang
            ell(a, px, py, R * .30, R * .13, ang, col)


def digit(a, ch, x, y, w, h, s, col):
    if ch == '1':
        rect(a, x + w / 2 - s / 2, y, x + w / 2 + s / 2, y + h, col)
        rect(a, x + w / 2 - s * 1.8, y + h - s * 1.3, x + w / 2, y + h, col)
        rect(a, x + w / 2 - s * 1.5, y, x + w / 2 + s * 1.5, y + s * .8, col)
    else:
        rect(a, x, y, x + w, y + s, col)
        rect(a, x, y + h - s, x + w, y + h, col)
        rect(a, x, y, x + s, y + h, col)
        rect(a, x + w - s, y, x + w, y + h, col)


def make_image(name, arr):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = np.clip(arr, 0, 255) / 255.0
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TMP, name + '.png')
    img.file_format = 'PNG'
    img.save()
    img.pack()
    return img


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def mat_plain(name, col, rough=.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (lin(col[0]), lin(col[1]), lin(col[2]), 1)
    b.inputs['Roughness'].default_value = rough
    m.use_backface_culling = False
    return m


def mat_tex(name, arr, rough=.8):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    t = m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = make_image(name, arr)
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    m.use_backface_culling = False
    return m


# ---------------------------------------------------------------- geometria

def build_loft(name, rings, vs, mat, closed=True, cap_end=False, cap_start=False, cut=None):
    rings = np.asarray(rings, dtype=float)
    R, Nn = rings.shape[:2]
    bm = bmesh.new()
    verts = [[bm.verts.new(tuple(p)) for p in ring] for ring in rings]
    uvl = bm.loops.layers.uv.new('UVMap')
    seg = Nn if closed else Nn - 1
    for j in range(R - 1):
        for i in range(seg):
            i2 = (i + 1) % Nn
            f = bm.faces.new((verts[j][i], verts[j][i2], verts[j + 1][i2], verts[j + 1][i]))
            uvs = [(i / seg, vs[j]), ((i + 1) / seg, vs[j]), ((i + 1) / seg, vs[j + 1]), (i / seg, vs[j + 1])]
            for lp, uv in zip(f.loops, uvs):
                lp[uvl].uv = uv
    if closed:
        for ring_i, flag in ((R - 1, cap_end), (0, cap_start)):
            if flag:
                f = bm.faces.new(verts[ring_i])
                for lp in f.loops:
                    lp[uvl].uv = (.5, .5)
    if cut:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if cut(f.calc_center_median())], context='FACES_ONLY')
    bm.normal_update()
    c = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    s = sum(f.normal.dot(f.calc_center_median() - c) for f in bm.faces)
    if s < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def smooth(x, passes=3):
    x = x.copy()
    for _ in range(passes):
        x[1:-1] = (x[:-2] + 2 * x[1:-1] + x[2:]) / 4
    return x


def profile(keys, n=44):
    k = np.array(keys, float)
    z = np.linspace(k[0, 0], k[-1, 0], n)
    cols = [smooth(np.interp(z, k[:, 0], k[:, c])) for c in (1, 2, 3)]
    return z, cols[0], cols[1], cols[2]


def body_rings(keys, n=44):
    z, a, b, yc = profile(keys, n)
    t = 2 * pi * (np.arange(N) / N - .5)
    rings = np.zeros((n, N, 3))
    for j in range(n):
        rings[j, :, 0] = a[j] * np.sin(t)
        rings[j, :, 1] = yc[j] - b[j] * np.cos(t)
        rings[j, :, 2] = z[j]
    return rings, (z - z[0]) / (z[-1] - z[0])


def ring_pts(cx, cy, z, a, b, t0=None, m=40):
    if t0 is None:
        t = 2 * pi * (np.arange(N) / N - .5)
    else:
        t = np.linspace(t0, 2 * pi - t0, m)
    return np.stack([cx + a * np.sin(t), cy - b * np.cos(t), np.full_like(t, z)], axis=1)


def collar(name, mat, z, a, b, yc=0.0, h=.035, flare=1.1, gap=None):
    r = [ring_pts(0, yc, z - .004, a, b, gap), ring_pts(0, yc, z + h, a * flare, b * flare, gap)]
    return build_loft(name, r, [0, 1], mat, closed=gap is None)


def sleeve_rings(start, d, length, r0, r1, k=10, flat=1.0):
    d = Vector(d).normalized()
    ref = Vector((0, 0, 1)) if abs(d.z) < .9 else Vector((0, 1, 0))
    e1 = d.cross(ref).normalized()
    e2 = d.cross(e1).normalized()
    out = []
    for j in range(k):
        s = j / (k - 1)
        c = Vector(start) + d * length * s
        r = r0 + (r1 - r0) * s
        out.append([tuple(c + e1 * cos(th) * r + e2 * sin(th) * r * flat)
                    for th in np.linspace(0, 2 * pi, N, endpoint=False)])
    return out, np.linspace(0, 1, k)


def sleeves(name, mat, start_x, z, d_out, length, r0, r1, y=0.0, flat=1.0):
    for sx in (1, -1):
        d = (sx * d_out[0], d_out[1], d_out[2])
        rings, vs = sleeve_rings((sx * start_x, y, z), d, length, r0, r1, flat=flat)
        build_loft(f'{name}_{"d" if sx > 0 else "i"}', rings, vs, mat)


def hood(name, mat, zn, a0, b0, yc, height=.22, front_open=.34 * pi):
    K = 16
    rings, vs = [], []
    for k in range(K + 1):
        s = k / K
        ang = s * pi / 2
        c = max(cos(ang), .05)
        rings.append(ring_pts(0, yc + .02 + .075 * sin(ang), zn + height * sin(ang),
                              a0 * 1.6 * c, b0 * 2.0 * c, front_open, 44))
        vs.append(s)
    return build_loft(name, rings, vs, mat, closed=False)


def export(slug):
    for o in bpy.context.scene.objects:
        o.select_set(True)
    path = os.path.join(OUT, slug + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_image_format='JPEG',
                              export_jpeg_quality=88, export_yup=True, export_apply=True)
    print('GLB', slug, os.path.getsize(path) // 1024, 'KB')


# ---------------------------------------------------------------- prendas

def campera_base(slug, keys, col, zip_x, hem_z, long=True, escudo_z=.55, hood_h=.30):
    W, z0, z1 = 2048, hem_z, .78
    H = int(1300 * (z1 - z0))
    t = T(W, H, z0, z1)
    U, V, tt, XS = grid(W, H)
    a = blank(W, H, col)
    front = np.cos(tt) > 0
    a[(np.abs(XS - zip_x) < .013) & front] = WHITE
    a[(np.abs(XS - zip_x) < .022) & (np.abs(XS - zip_x) >= .013) & front] = tuple(np.array(col) * .72)
    if long:
        for sx in (1, -1):
            a[(np.abs(XS - sx * .90) < .008)] = WHITE
    paste(a, ESCUDO, t.x(.46), t.y(escudo_z), t.w(.08), t.h(.09))
    body = mat_tex(slug + '_cuerpo', a, .55)
    rings, vs = body_rings(keys, 56)
    build_loft('cuerpo', rings, vs, body)
    plain = mat_plain(slug + '_tela', col, .55)
    hood('capucha', plain, .765, .105, .09, .0, hood_h)
    collar('cuello', plain, .77, .112, .098, .0, .03, 1.1, gap=.30 * pi)
    sleeves('manga', plain, .235, .625, (.20, -.05, -.98), .60 if long else .52, .112 if long else .105, .074 if long else .062, flat=1.0)
    export(slug)


def campera():
    keys = [(-.48, .29, .185, 0), (-.20, .30, .19, 0), (.2, .305, .19, 0), (.55, .31, .18, 0),
            (.66, .30, .165, 0), (.725, .255, .14, 0), (.765, .15, .105, .005), (.78, .115, .09, .005)]
    campera_base('campera', keys, (24, 44, 86), 0.0, -.48, True, .52, .22)


def rompevientos():
    keys = [(.02, .255, .165, 0), (.10, .285, .175, 0), (.4, .30, .175, 0), (.6, .30, .165, 0),
            (.69, .29, .15, 0), (.735, .24, .13, 0), (.765, .14, .10, .005), (.78, .108, .088, .005)]
    campera_base('rompevientos', keys, NAVY_L, -.06, .02, False, .55, .20)


def legs(slug, hem_z, r_hem, escudo_xs, escudo_z, cuff=False):
    wk = [(0, .20, .112, 0), (-.04, .202, .114, 0), (-.12, .205, .116, 0), (-.20, .205, .116, 0)]
    Wt, Ht = 1024, 1024
    cloth = mat_plain(slug + '_tela', NAVY, .7)
    rings, vs = body_rings(wk, 20)
    build_loft('cintura', rings, vs, cloth)
    build_loft('pretina', [ring_pts(0, 0, -.02, .203, .114), ring_pts(0, 0, .03, .205, .115)], [0, 1],
               mat_plain(slug + '_pretina', NAVY_D, .6))
    zs = np.linspace(-.17, hem_z, 18)
    for sx in (1, -1):
        a = blank(Wt, Ht, NAVY)
        if sx == escudo_xs:
            tl = T(Wt, Ht, hem_z, -.17, circ=.65)
            paste(a, ESCUDO, tl.x(0), tl.y(escudo_z), tl.w(.08), tl.h(.09))
        m = mat_tex(f'{slug}_pierna{sx}', a, .7)
        rr = []
        for z in zs:
            s = (-.17 - z) / (-.17 - hem_z)
            r = (.095 + (.105 - .095) * min(1, s * 8)) * (1 - s) + r_hem * s
            if cuff and s > .88:
                r *= .9
            rr.append(ring_pts(sx * (.105 - .03 * s), 0, z, r, r * 1.02))
        build_loft(f'pierna{sx}', rr, 1 - np.linspace(0, 1, len(zs)), m)
    for sx in (1, -1):
        pts = [(sx * (.03 + .004 * k), -.115, -.005 - .02 * k) for k in range(6)]
        rr, vv = [], []
        for j, p in enumerate(pts):
            rr.append([(p[0] + .004 * cos(th), p[1] + .004 * sin(th), p[2]) for th in np.linspace(0, 2 * pi, 8, endpoint=False)])
            vv.append(j / 5)
        build_loft(f'cordon{sx}', rr, vv, mat_plain('cordon', WHITE))
    export(slug)


def bermuda():
    legs('bermuda', -.58, .118, 1, -.30)


def pantalon_largo():
    legs('pantalon-largo', -1.10, .068, -1, -.30, cuff=True)


def gorra():
    W, H = 1024, 512
    t = T(W, H, 0, .14, circ=.66)
    a = blank(W, H, NAVY)
    paste(a, ESCUDO, t.x(0), t.y(.065), t.w(.062), t.h(.058))
    m = mat_tex('gorra_cupula', a, .8)
    K = 16
    rings, vs = [], []
    for k in range(K + 1):
        ang = k / K * pi / 2
        c = max(cos(ang), .02)
        rings.append(ring_pts(0, 0, .095 * sin(ang), .098 * c, .108 * c))
        vs.append(k / K)
    build_loft('cupula', rings, vs, m, cap_end=True)
    plain = mat_plain('gorra_visera', NAVY_D, .7)
    t1 = np.linspace(-1.30, 1.30, 28)

    def arc(a_, b_, z):
        return np.stack([a_ * np.sin(t1), -b_ * np.cos(t1), np.full_like(t1, z)], axis=1)
    build_loft('visera', [arc(.098, .108, .0), arc(.118, .165, -.006), arc(.105, .215, -.022)], [0, .5, 1], plain, closed=False)
    export('gorra')


def bolso():
    W, H, L, ry, rz = 2048, 1024, .56, .12, .125
    U, V, tt, XS = grid(W, H)
    X = (V - .5) * L
    Zd = rz * np.sin(tt)
    front = np.cos(tt) > 0
    a = blank(W, H, NAVY)
    for sx in (-.12, .12):
        a[np.abs(X - sx) < .022] = (30, 30, 34)
    wm, hm = .15, .165
    sx_ = (X - 0.0) / wm + .5
    sy_ = (Zd - (-.005)) / hm + .5
    ok = front & (sx_ > 0) & (sx_ < 1) & (sy_ > 0) & (sy_ < 1)
    Hh, Ww = ESCUDO.shape[:2]
    fi = np.clip((sy_ * (Hh - 1)).astype(int), 0, Hh - 1)
    fj = np.clip((sx_ * (Ww - 1)).astype(int), 0, Ww - 1)
    s = ESCUDO[fi, fj]
    lite = s[..., :3].min(axis=2) > 205
    paint = np.where(lite[..., None], np.array(NAVY, np.float32), np.array(WHITE, np.float32))
    al = (s[..., 3] > .5) & ok
    a[al] = paint[al]
    body = mat_tex('bolso_cuerpo', a, .65)
    n_r = 36
    xs = np.linspace(-L / 2, L / 2, n_r)
    t = 2 * pi * (np.arange(N) / N - .5)
    rings = []
    for x in xs:
        e = abs(x) - (L / 2 - .06)
        m = 1.0 if e <= 0 else max(sqrt_(1 - (e / .06) ** 2), .03)
        rings.append(np.stack([np.full_like(t, x), -ry * m * np.cos(t), .125 + rz * m * np.sin(t)], axis=1))
    build_loft('cuerpo', rings, (xs + L / 2) / L, body, cap_start=True, cap_end=True)
    black = mat_plain('bolso_asa', BLACK, .6)
    for sx in (1, -1):
        pts = []
        for s_ in np.linspace(0, 1, 14):
            pts.append(Vector((sx * .12 * (1 - s_), 0, .25 + .17 * (1 - (1 - s_) ** 2))))
        rr = []
        for j, p in enumerate(pts):
            d = (pts[min(j + 1, 13)] - pts[max(j - 1, 0)]).normalized()
            e2 = Vector((0, 1, 0))
            e1 = d.cross(e2).normalized()
            rr.append([tuple(p + e1 * cos(th) * .006 + e2 * sin(th) * .022) for th in np.linspace(0, 2 * pi, 10, endpoint=False)])
        build_loft(f'asa{sx}', rr, np.linspace(0, 1, 14), black)
    export('bolso')


def sqrt_(x):
    return max(x, 0) ** .5


MODELOS = {
    'campera': campera, 'rompevientos': rompevientos, 'bermuda': bermuda,
    'pantalon-largo': pantalon_largo, 'gorra': gorra, 'bolso': bolso,
}

if __name__ == '__main__':
    pedidos = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(MODELOS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ESCUDO = load_escudo()
    for slug in pedidos:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        MODELOS[slug]()
