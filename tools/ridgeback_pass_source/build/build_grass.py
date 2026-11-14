"""Grass: sprite atlas from the Poly Haven grass_medium_01 render sheet, 5 crossed-card clump meshes, and per-chunk instance
points (GLB point primitives with POSITION + _GRASS = (yaw, scale, variant)). Outputs out/raw/grass_clumps.glb, out/raw/grass_instances.glb"""
import numpy as np, json, trimesh
from PIL import Image
from scipy import ndimage
from common import *
SRC = '/home/claude/ph/models/grass_medium_01/textures/grass_medium_01_diff_1k.jpg'
NRM = '/home/claude/ph/models/grass_medium_01/textures/grass_medium_01_nor_gl_1k.jpg'
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32) / 255
SPR = [(205, 765, 500, 893), (605, 775, 830, 872), (30, 890, 195, 1000), (245, 910, 505, 1003), (590, 885, 805, 1012)]
CW, CH_ = 256, 160
atlas = np.zeros((CH_, CW * len(SPR), 4), np.float32)
aspect = []
for k, (x0, y0, x1, y1) in enumerate(SPR):
    c = im[y0:y1, x0:x1]
    lum = c.max(-1); a = np.clip((lum - 0.06) / 0.10, 0, 1)
    a = ndimage.gaussian_filter(a, 0.4)
    rgb = c / np.maximum(a[..., None], 0.35)                    # un-premultiply the black background
    rgb = np.clip(rgb, 0, 1)
    sp = np.concatenate([rgb, a[..., None]], -1)
    spi = np.asarray(Image.fromarray((sp * 255).astype(np.uint8), 'RGBA').resize((CW, CH_), Image.LANCZOS)).astype(np.float32) / 255
    atlas[:, k * CW:(k + 1) * CW] = spi; aspect.append((x1 - x0) / (y1 - y0))
# fill transparent texels with nearby colour (avoids dark fringes when mipmapping)
m = atlas[..., 3] > 0.3
for _ in range(6):
    blur = ndimage.uniform_filter(atlas[..., :3] * m[..., None], (5, 5, 1)); ws = ndimage.uniform_filter(m.astype(np.float32), 5)
    atlas[..., :3] = np.where(m[..., None], atlas[..., :3], blur / np.maximum(ws[..., None], 1e-5)); m = m | (ws > 0.05)
atlas_img = Image.fromarray((np.clip(atlas, 0, 1) * 255).astype(np.uint8), 'RGBA')
atlas_img.save('out/mat/grass_atlas.png')

# clump meshes: 3 crossed vertical quads, height ~0.45-0.6 m, normals tilted up for soft lighting
scene = trimesh.Scene()
mat = trimesh.visual.material.PBRMaterial(name='grass', baseColorTexture=atlas_img, metallicFactor=0.0, roughnessFactor=0.9,
                                          alphaMode='MASK', alphaCutoff=0.5, doubleSided=True)
for k, asp in enumerate(aspect):
    Hh = 0.55; Ww = Hh * asp * 0.9
    V, F, UV, Nn = [], [], [], []
    for q in range(3):
        a = q * np.pi / 3 + 0.3; d = np.array([np.cos(a), 0, np.sin(a)]) * Ww / 2
        b = len(V); V += [-d, d, d + [0, Hh, 0], -d + [0, Hh, 0]]
        u0, u1 = k / len(SPR), (k + 1) / len(SPR)
        UV += [[u0, 0], [u1, 0], [u1, 1], [u0, 1]]        # trimesh bottom-left origin: v=0 bottom of sprite
        F += [[b, b + 1, b + 2], [b, b + 2, b + 3]]
        Nn += [[0, 1, 0]] * 4
    tm = trimesh.Trimesh(np.array(V), np.array(F), vertex_normals=np.array(Nn, float), process=False,
                         visual=trimesh.visual.TextureVisuals(uv=np.array(UV, float), material=mat))
    scene.add_geometry(tm, node_name=f'grass_clump_{k}', geom_name=f'grass_clump_{k}')
scene.export('out/raw/grass_clumps.glb')

# instance placement: density from meadow/grass weight, never on trails, steep ground, creek, tunnel floors or structures
sA = np.asarray(Image.open('out/mat/splatA.png')).astype(np.float32) / 255
R = sA.shape[0]
def splat(x, y):
    j = np.clip(((x + 100) / 200 * R).astype(int), 0, R - 1); i = np.clip(((100 - y) / 200 * R).astype(int), 0, R - 1)
    return sA[i, j]
rng = np.random.default_rng(77)
N0 = 400000
x = rng.uniform(-99, 99, N0); y = rng.uniform(-99, 99, N0)
sp = splat(x, y); dens = sp[:, 0] * 1.0 + sp[:, 1] * 0.8 + sp[:, 2] * 0.15
sl = sample(slope, x, y); tr = sample(trail, x, y); zz = sample(h, x, y)
dens *= (sl < 28) * (tr < 0.35) * (zz < 60) * (sample(creek, x, y) < 0.2)
# thin near designed cover so it stays readable, keep fuller on lane edges
keep = rng.random(N0) < dens * 0.55
x, y, zz = x[keep], y[keep], zz[keep]
P = to_gl(np.stack([x, y, zz - 0.04], -1)).astype(np.float32)
attr = np.stack([rng.uniform(0, 2 * np.pi, len(x)), rng.uniform(0.75, 1.35, len(x)), rng.integers(0, len(SPR), len(x))], -1).astype(np.float32)
# GLB with one point primitive per chunk (raw glTF via trimesh PointCloud doesn't carry custom attributes -> write by hand)
import struct, base64
chunks = {}
for r in range(4):
    for c in range(4):
        sel = (x >= -100 + 50 * c) & (x < -50 + 50 * c) & (y >= -100 + 50 * r) & (y < -50 + 50 * r)
        chunks[f'grass_r{r}_c{c}'] = (P[sel], attr[sel])
buf = bytearray(); bviews = []; accs = []; meshes = []; nodes = []
for name, (pp, aa) in chunks.items():
    for arr, typ in ((pp, 'VEC3'), (aa, 'VEC3')):
        off = len(buf); buf += arr.tobytes(); bviews.append({'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes})
        acc = {'bufferView': len(bviews) - 1, 'componentType': 5126, 'count': len(arr), 'type': typ}
        if arr is pp and len(pp): acc['min'] = pp.min(0).tolist(); acc['max'] = pp.max(0).tolist()
        accs.append(acc)
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': len(accs) - 2, '_GRASS': len(accs) - 1}, 'mode': 0}]})
    nodes.append({'name': name, 'mesh': len(meshes) - 1})
while len(buf) % 4: buf += b'\0'
gj = {'asset': {'version': '2.0', 'generator': 'ridgeback-grass'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes,
      'meshes': meshes, 'accessors': accs, 'bufferViews': bviews, 'buffers': [{'byteLength': len(buf)}]}
js = json.dumps(gj).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(buf), 0x004E4942) + bytes(buf)
open('out/raw/grass_instances.glb', 'wb').write(glb)
print('grass clumps', len(x), {k: len(v[0]) for k, v in chunks.items()})
