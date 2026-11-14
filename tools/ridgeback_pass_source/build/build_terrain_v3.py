"""v3 terrain: 4x4 chunks of 50 m, 0.5 m grid. Visual meshes carry only position/normal/uv (uv = map-wide 0..1, used for
the splat maps); all surface detail comes from the world-space terrain shader, so there are no per-chunk textures and no seams.
Outputs out/raw/terrain_r{r}_c{c}.glb and out/raw/terrain_collision_r{r}_c{c}.glb"""
import numpy as np, os, trimesh
from common import *

os.makedirs('out/raw', exist_ok=True)
CH = 4; CS = 50.0; STEP = 0.5; G = int(CS / STEP) + 1
cut = np.load('cut_mask.npy')            # 400 x 400 cells of 0.5 m over [-100, 100]
hs_n = ndimage.gaussian_filter(h, 0.35 / CELL)
gyN, gxN = np.gradient(hs_n, CELL)

def chunk(r, c, skirts):
    x0 = -100 + CS * c; y0 = -100 + CS * r
    gx_ = x0 + np.arange(G) * STEP; gy_ = y0 + np.arange(G) * STEP
    GX, GY = np.meshgrid(gx_, gy_)
    Z = sample(h, GX, GY)
    nx, ny = -sample(gxN, GX, GY), -sample(gyN, GX, GY)
    Nw = np.stack([nx, ny, np.ones_like(nx)], -1); Nw /= np.linalg.norm(Nw, axis=-1, keepdims=True)
    V = np.stack([GX, GY, Z], -1).reshape(-1, 3); Nw = Nw.reshape(-1, 3)
    UV = np.stack([(GX + 100) / 200, (GY + 100) / 200], -1).reshape(-1, 2)      # trimesh flips V -> v = (100 - y)/200 in glTF
    idx = np.arange(G * G).reshape(G, G)
    a, b, cc, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]
    keep = ~cut[int(r * CS / STEP):int(r * CS / STEP) + G - 1, int(c * CS / STEP):int(c * CS / STEP) + G - 1]
    F = np.concatenate([np.stack([a, b, cc], -1)[keep], np.stack([a, cc, d], -1)[keep]])
    if skirts:
        border = np.r_[idx[0, :], idx[1:, -1], idx[-1, -2::-1], idx[-2:0:-1, 0], idx[0, 0]]
        base = len(V); sk = V[border[:-1]].copy(); sk[:, 2] -= 0.8
        V = np.vstack([V, sk]); UV = np.vstack([UV, UV[border[:-1]]]); Nw = np.vstack([Nw, Nw[border[:-1]]])
        nb = len(border) - 1
        SF = [[border[k], base + k, base + (k + 1) % nb] for k in range(nb)] + [[border[k], base + (k + 1) % nb, border[k + 1]] for k in range(nb)]
        F = np.vstack([F, np.array(SF)])
    Vg, Ng = to_gl(V), to_gl(Nw)
    tm = trimesh.Trimesh(Vg, F, process=False)
    if tm.face_normals[:len(F) // 2, 1].mean() < 0: F = F[:, ::-1]
    return Vg, Ng, UV, F

for r in range(CH):
    for c in range(CH):
        V, N_, UV, F = chunk(r, c, True)
        mat = trimesh.visual.material.PBRMaterial(name='terrain', baseColorFactor=[0.35, 0.38, 0.25, 1], metallicFactor=0.0, roughnessFactor=0.95)
        tm = trimesh.Trimesh(V, F, vertex_normals=N_, visual=trimesh.visual.TextureVisuals(uv=UV, material=mat), process=False)
        tm.export(f'out/raw/terrain_r{r}_c{c}.glb')
        V, N_, UV, F = chunk(r, c, False)
        trimesh.Trimesh(V, F, process=False).export(f'out/raw/terrain_collision_r{r}_c{c}.glb')
        print('chunk', r, c, len(F), 'tris', flush=True)
