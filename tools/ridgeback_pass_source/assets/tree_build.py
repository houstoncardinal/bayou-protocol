"""Assemble a game tree GLB (raw, before simplification) from tree_cards.py output.
python tree_build.py <prefix> <gltf> <name>  -> out/<name>_raw.glb (trunk, branches, cards) + out/<name>_bb_raw.glb (billboard LOD)"""
import sys, numpy as np, trimesh
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from gltf_read import GLTF

prefix, gpath, name = sys.argv[1:4]
d = np.load(f'{prefix}_cards.npz'); parts = np.load(f'{prefix}_parts.npz')
g = GLTF(gpath)
scene = trimesh.Scene()

def pbr(nm, diff, nor=None, rough=0.85, alpha=None, double=False):
    kw = dict(name=nm, baseColorTexture=diff, metallicFactor=0.0, roughnessFactor=rough, doubleSided=double)
    if nor is not None: kw['normalTexture'] = nor
    if alpha: kw.update(alphaMode='MASK', alphaCutoff=alpha)
    return trimesh.visual.material.PBRMaterial(**kw)

# ---- wood parts (trunk + branches), scanned geometry with original textures ----
mats = sorted({k.split('_', 1)[1] for k in parts.files if k.startswith('pos_')})
for m in mats:
    P = parts[f'pos_{m}']; I = parts[f'idx_{m}']; UV = parts[f'uv_{m}'] if f'uv_{m}' in parts else np.zeros((len(P), 2))
    tx = g.material_textures(m)
    mat = pbr(m, Image.open(tx['diff']).convert('RGB').resize((512, 512)), Image.open(tx['nor']).convert('RGB').resize((512, 512)) if 'nor' in tx else None, 0.9)
    uvt = UV.copy(); uvt[:, 1] = 1 - uvt[:, 1]          # glTF (top-left) -> trimesh (bottom-left)
    mesh = trimesh.Trimesh(P, I, visual=trimesh.visual.TextureVisuals(uv=uvt, material=mat), process=False)
    role = 'trunk' if 'trunk' in m else 'branches'
    scene.add_geometry(mesh, node_name=f'{name}_{role}_{m}', geom_name=f'{name}_{role}_{m}')

# ---- branch cards ----
atlas = d['atlas']; natlas = d['natlas'].copy(); AT = int(d['atlas_full']); used = atlas.shape[0]
natlas[..., 1] = 255 - natlas[..., 1]                 # card v axis points down the image; glTF normal maps use +V up
V, F, UVs = [], [], []
for k, (cor, uv) in enumerate(zip(d['corners'], d['uvs'])):
    x0, y0, x1, y1 = uv; y0 *= AT / used; y1 *= AT / used
    quad_uv = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])
    base = len(V); V += list(cor); UVs += list(quad_uv)
    F += [[base, base + 1, base + 2], [base, base + 2, base + 3]]
UVs = np.array(UVs); UVs[:, 1] = 1 - UVs[:, 1]
cards = trimesh.Trimesh(np.array(V), np.array(F), process=False,
                        visual=trimesh.visual.TextureVisuals(uv=UVs, material=pbr(f'{name}_needles', Image.fromarray(atlas, 'RGBA'),
                                                                                   Image.fromarray(natlas, 'RGB'), 0.8, alpha=0.45, double=True)))
# vertex normals: blend card normal with radial direction for soft, rounded crown lighting
nv = []
for cor, n in zip(d['corners'], d['nrm']):
    for p in cor:
        radial = np.array([p[0], 0.25, p[2]]); radial /= (np.linalg.norm(radial) + 1e-6)
        v = 0.45 * n + 0.55 * radial; nv.append(v / np.linalg.norm(v))
cards.vertex_normals = np.array(nv)
scene.add_geometry(cards, node_name=f'{name}_needles', geom_name=f'{name}_needles')
scene.export(f'out/{name}_raw.glb')

# ---- billboard LOD: 3 crossed planes ----
H = float(d['height']); R = float(d['radius']); bb = d['billboard']
V, F, UVs = [], [], []
for k in range(3):
    ang = k * np.pi / 3; ax = np.array([np.cos(ang), 0, np.sin(ang)])
    base = len(V)
    V += [-ax * R, ax * R, ax * R + [0, H, 0], -ax * R + [0, H, 0]]
    UVs += [[k / 3, 1], [(k + 1) / 3, 1], [(k + 1) / 3, 0], [k / 3, 0]]
    F += [[base, base + 1, base + 2], [base, base + 2, base + 3]]
UVs = np.array(UVs, float); UVs[:, 1] = 1 - UVs[:, 1]
bbm = trimesh.Trimesh(np.array(V, float), np.array(F), process=False,
                      visual=trimesh.visual.TextureVisuals(uv=UVs, material=pbr(f'{name}_billboard', Image.fromarray(bb, 'RGBA'), None, 0.9, alpha=0.45, double=True)))
bbm.vertex_normals = np.tile([0, 1, 0], (len(V), 1)) * 0.3 + np.array([[0, 0.7, 0]] * len(V))
s2 = trimesh.Scene(); s2.add_geometry(bbm, node_name=f'{name}_billboard', geom_name=f'{name}_billboard'); s2.export(f'out/{name}_bb_raw.glb')
print(name, 'cards', len(d['corners']), 'H', round(H, 1))
