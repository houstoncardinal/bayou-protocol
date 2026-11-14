"""Creek water strip, distant mountain backdrop (proper rough material -> no mirror reflections), sky panorama from the
Poly Haven alpine HDRI. Outputs out/raw/water_creek.glb, out/raw/backdrop.glb, out/raw/sky.glb"""
import numpy as np, trimesh, cv2
from PIL import Image
from scipy import ndimage
from common import *
rng = np.random.default_rng(5)

# ---- creek water: follows the creek bed through the gorge ----
xs_ = np.linspace(-24, 24, 97); cy = -12 * 0.88 + 1.5 * np.sin(xs_ / 9)
bed = np.array([min(sample(h, x, y + o) for o in (-0.8, 0, 0.8)) for x, y in zip(xs_, cy)])
lvl = ndimage.uniform_filter1d(bed, 9) + 0.32
V, F, UV = [], [], []
for i, (x, y, z) in enumerate(zip(xs_, cy, lvl)):
    for o in (-2.6, 2.6): V.append([x, y + o, z]); UV.append([x / 4, (y + o) / 4])
for i in range(len(xs_) - 1):
    a, b, c, d = 2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2; F += [[a, d, c], [a, c, b]]
wm = trimesh.Trimesh(to_gl(np.array(V)), np.array(F), process=False)
if wm.face_normals[:, 1].mean() < 0: wm.faces = wm.faces[:, ::-1]
wn = Image.open('/home/claude/ph/textures/river_small_rocks/river_small_rocks_nor_gl_2k.jpg').convert('RGB').resize((512, 512))
wm.visual = trimesh.visual.TextureVisuals(uv=np.array(UV), material=trimesh.visual.material.PBRMaterial(
    name='water', baseColorFactor=[0.06, 0.12, 0.11, 0.62], metallicFactor=0.0, roughnessFactor=0.05, alphaMode='BLEND', normalTexture=wn))
wm.export('out/raw/water_creek.glb')

# ---- backdrop mountains: ring from the map edge out to 500 m, vertex coloured, ROUGH material ----
G = 81; ext = 500; g = np.linspace(-ext, ext, G); BX, BY = np.meshgrid(g, g)
def ridged(px, py, f, seed, octs=6):
    tot = 0; amp = 1; nrm = 0
    for o in range(octs):
        grid = np.random.default_rng(seed + o).random((96, 96))
        n = ndimage.map_coordinates(grid, [(py + 700) * f, (px + 700) * f], order=3, mode='wrap')
        n = (1 - np.abs(2 * n - 1)) ** 2; tot += amp * n; nrm += amp; amp *= 0.5; f *= 2.1
    return tot / nrm
dist = np.maximum(np.abs(BX), np.abs(BY))
BZ = 30 + 230 * ridged(BX, BY, 1 / 170, 900) * np.clip((dist - 100) / 160, 0.2, 1.0) + 0.08 * (dist - 100)
edge_h = sample(h, np.clip(BX, -99.5, 99.5), np.clip(BY, -99.5, 99.5))
w = np.clip((dist - 100) / 40, 0, 1); BZ = edge_h * (1 - w) + np.maximum(BZ, edge_h) * w - 1.0 * (1 - w)
inside = (np.abs(BX) < 100 - 12.5) & (np.abs(BY) < 100 - 12.5)
idx = np.arange(G * G).reshape(G, G); FF = []
for i in range(G - 1):
    for j in range(G - 1):
        if inside[i:i + 2, j:j + 2].all(): continue
        a, b, c, d = idx[i, j], idx[i, j + 1], idx[i + 1, j + 1], idx[i + 1, j]; FF += [[a, b, c], [a, c, d]]
BV = np.stack([BX, BY, BZ], -1).reshape(-1, 3)
bm = trimesh.Trimesh(to_gl(BV), np.array(FF), process=False)
if bm.face_normals[:, 1].mean() < 0: bm.faces = bm.faces[:, ::-1]
up = bm.vertex_normals[:, 1]; zz = BV[:, 2]; nz = rng.random(len(zz)) * 0.06
rock = np.array([0.30, 0.29, 0.27]); forest = np.array([0.07, 0.11, 0.065]); snow = np.array([0.86, 0.88, 0.92])
t_snow = np.clip((zz - 170) / 40 + (up - 0.7) * 2.5, 0, 1)[:, None]
t_for = (np.clip((140 - zz) / 50, 0, 1) * np.clip((up - 0.62) * 4, 0, 1))[:, None]
col = rock * (1 - t_for) + forest * t_for; col = col * (1 - t_snow) + snow * t_snow; col = np.clip(col + nz[:, None] - 0.03, 0, 1)
bm.visual = trimesh.visual.TextureVisuals(uv=np.zeros((len(BV), 2)), material=trimesh.visual.material.PBRMaterial(
    name='backdrop', baseColorFactor=[1, 1, 1, 1], metallicFactor=0.0, roughnessFactor=1.0))
bm.visual.vertex_attributes['color'] = (np.c_[col, np.ones(len(col))] * 255).astype(np.uint8)
bm.export('out/raw/backdrop.glb')

# ---- sky: tone-map the alpine HDRI to an LDR equirect panorama (used as background + image-based lighting) ----
hdr = cv2.imread('/home/claude/ph/hdri/immenstadter_horn_1k.hdr', cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)[..., ::-1]
lum = hdr.mean(-1, keepdims=True); hdr = hdr * 0.9
ldr = (hdr * (1 + hdr / 6.0)) / (1 + hdr); ldr = np.clip(ldr, 0, 1) ** (1 / 2.2)
sky = Image.fromarray((ldr * 255).astype(np.uint8)).resize((2048, 1024), Image.LANCZOS)
sky.save('out/mat/sky.jpg', quality=92)
sm = trimesh.Trimesh(np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1.0]]), np.array([[0, 2, 1]]), process=False,
                     visual=trimesh.visual.TextureVisuals(uv=np.array([[0, 0], [1, 0], [0, 1.0]]), material=trimesh.visual.material.PBRMaterial(name='sky', emissiveTexture=sky, emissiveFactor=[1, 1, 1])))
sc = trimesh.Scene(); sc.add_geometry(sm, node_name='sky_carrier', geom_name='sky_carrier'); sc.export('out/raw/sky.glb')
print('water level range', round(float(lvl.min()), 2), round(float(lvl.max()), 2), 'backdrop tris', len(bm.faces))
