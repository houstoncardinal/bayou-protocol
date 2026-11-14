"""Terrain splat maps (1024^2 over the whole map, row 0 = north) and layer atlases from Poly Haven scans.
splatA RGBA = grass, meadow, forest floor, trail      splatB RGBA = scree, mossy rock, creek bed, ambient occlusion
albedo atlas RGBA = albedo + height; normal atlas RGBA = normal.xy, roughness, AO. 4x2 tiles, wrap-padded.
Rock (layer 7) is chosen in the shader from slope (triplanar), so cliffs never stretch."""
import numpy as np, json, os
from PIL import Image
from scipy import ndimage
from common import *

os.makedirs('out/mat', exist_ok=True)
PHT = '/home/claude/ph/textures'
LAYERS = ['sparse_grass', 'aerial_grass_rock', 'forest_leaves_04', 'rocky_trail', 'rocks_ground_02', 'coast_sand_rocks_02', 'river_small_rocks', 'mossy_rock']
TILE_M = [2.6, 5.0, 3.0, 3.2, 3.0, 6.0, 2.4, 5.5]
wm = json.load(open('out/world_meta.json'))
R = 1024
jj, ii = np.meshgrid(np.arange(R), np.arange(R))
wx = -100 + (jj + 0.5) * 200 / R; wy = 100 - (ii + 0.5) * 200 / R
Smp = lambda a, o=1: sample(a, wx, wy, o)
z = Smp(h); sl = Smp(slope); fl = Smp(fm); tr = Smp(trail); ck = Smp(creek)
n1 = ndimage.gaussian_filter(np.random.default_rng(3).random((R, R)), 6); n1 = (n1 - n1.mean()) / n1.std()
n2 = ndimage.gaussian_filter(np.random.default_rng(4).random((R, R)), 22); n2 = (n2 - n2.mean()) / n2.std()
n3 = ndimage.gaussian_filter(np.random.default_rng(5).random((R, R)), 2.5); n3 = (n3 - n3.mean()) / n3.std()
ss = lambda a, b, t: np.clip((t - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((t - a) / (b - a), 0, 1))
# tree canopy influence (forest floor + darkening under trees)
canopy = np.zeros((R, R), np.float32)
for x, y, s in wm['trees']:
    j = int((x + 100) / 200 * R); i = int((100 - y) / 200 * R)
    if 0 <= i < R and 0 <= j < R: canopy[i, j] += 1
canopy = np.clip(ndimage.gaussian_filter(canopy, 9) * 260, 0, 1)
gentle = 1 - ss(24, 34, sl + 4 * n3)
w_grass = gentle * (1 - canopy) * np.clip(0.75 + 0.25 * n2, 0, 1)
w_meadow = gentle * (1 - canopy) * ss(-0.2, 0.9, n2 + 0.3 * n1) * 0.9
w_forest = np.clip(canopy * 1.3 + ss(0.4, 1.2, n2) * (1 - fl) * 0.6, 0, 1.2) * (1 - ss(36, 46, sl))
w_trail = ss(0.15, 0.85, tr + 0.15 * n3) * 1.6 + fl * ss(0.6, 1.4, n1 * 0.7 + n3 * 0.4) * 0.5
w_scree = ss(22, 34, sl + 5 * n3) * (1 - ss(40, 50, sl)) * 0.9 + (fl < 0.6) * (fl > 0.03) * ss(14, 26, sl) * 0.6
w_mossy = ss(30, 42, sl + 6 * n1) * (1 - ss(50, 62, sl)) * 0.8
w_creek = ss(0.25, 0.75, ck) * 2.5
W = np.stack([w_grass, w_meadow, w_forest, w_trail, w_scree, w_mossy, w_creek], -1).astype(np.float32) + 1e-4
W /= W.sum(-1, keepdims=True)
valley = np.clip(1 - 0.03 * np.maximum(0, Smp(ndimage.gaussian_filter(h, 6 / CELL)) - z), 0.6, 1)
crev = np.clip(1 + 0.55 * (z - Smp(ndimage.gaussian_filter(h, 1.2 / CELL))), 0.65, 1.05)
ao = np.clip(valley * crev * (1 - 0.25 * canopy), 0, 1)
splatA = (np.clip(W[..., :4], 0, 1) * 255).astype(np.uint8)
splatB = np.concatenate([np.clip(W[..., 4:7], 0, 1), ao[..., None]], -1); splatB = (splatB * 255).astype(np.uint8)
Image.fromarray(splatA, 'RGBA').save('out/mat/splatA.png'); Image.fromarray(splatB, 'RGBA').save('out/mat/splatB.png')
# preview of the dominant layer
pal = np.array([[90, 120, 50], [150, 150, 60], [120, 90, 50], [160, 130, 95], [120, 115, 105], [80, 100, 60], [70, 110, 130]])
prev = (W[..., :, None] * pal[None, None]).sum(2)
rockw = ss(40, 52, sl); prev = prev * (1 - rockw[..., None]) + np.array([140, 125, 110]) * rockw[..., None]
Image.fromarray(np.clip(prev * ao[..., None], 0, 255).astype(np.uint8)).save('out/mat/splat_preview.png')

def tile_set(name, T, P):
    C = T - 2 * P
    d = np.asarray(Image.open(f'{PHT}/{name}/{name}_diff_2k.jpg').convert('RGB').resize((C, C), Image.LANCZOS))
    n = np.asarray(Image.open(f'{PHT}/{name}/{name}_nor_gl_2k.jpg').convert('RGB').resize((C, C), Image.LANCZOS))
    def ld(suf, default):
        p = f'{PHT}/{name}/{name}_{suf}_2k.jpg'
        return np.asarray(Image.open(p).convert('L').resize((C, C), Image.LANCZOS)) if os.path.exists(p) else np.full((C, C), default, np.uint8)
    disp = ld('disp', 128); rough = ld('rough', 220); aoi = ld('ao', 255)
    alb = np.concatenate([d, disp[..., None]], -1); nor = np.stack([n[..., 0], n[..., 1], rough, aoi], -1)
    pad = lambda a: np.pad(a, ((P, P), (P, P), (0, 0)), mode='wrap')
    return pad(alb), pad(nor)
for T in (512, 1024):
    P = T // 16
    A = np.zeros((2 * T, 4 * T, 4), np.uint8); Nn = np.zeros((2 * T, 4 * T, 4), np.uint8)
    for k, name in enumerate(LAYERS):
        a, n = tile_set(name, T, P); r_, c_ = divmod(k, 4)
        A[r_ * T:(r_ + 1) * T, c_ * T:(c_ + 1) * T] = a; Nn[r_ * T:(r_ + 1) * T, c_ * T:(c_ + 1) * T] = n
    Image.fromarray(A, 'RGBA').save(f'out/mat/albedo_atlas_{T}.png'); Image.fromarray(Nn, 'RGBA').save(f'out/mat/normal_atlas_{T}.png')
json.dump({'layers': LAYERS, 'tileMeters': TILE_M, 'atlasCols': 4, 'atlasRows': 2, 'padFraction': 1 / 16,
           'splatA': ['grass', 'meadow', 'forest', 'trail'], 'splatB': ['scree', 'mossy', 'creek', 'ao'], 'rockLayer': 7}, open('out/mat/terrain_material.json', 'w'), indent=1)
print('splat + atlases written')
