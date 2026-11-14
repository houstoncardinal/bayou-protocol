"""Convert a Poly Haven scanned conifer (millions of needle triangles) into a game tree:
  - scanned trunk + branches, simplified (bark textures kept)
  - foliage as ~100-140 branch cards, each 'photographed' from the real needle geometry (point-splat raster)
  - far LOD: 3 crossed billboard planes rendered from the full scan
Usage: python tree_cards.py <gltf> <mesh_index> <out_prefix>
Writes <out_prefix>_cards.npz (card geometry + atlas images) and <out_prefix>_parts.npz (trunk/branch raw meshes for simplification)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from gltf_read import GLTF

path, mesh_i, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
g = GLTF(path); prims = g.prims(mesh_i)
twig = [p for p in prims if 'twig' in p['material']][0]
wood = [p for p in prims if 'twig' not in p['material']]
tex = np.asarray(Image.open(g.material_textures(twig['material'])['diff']).convert('RGB')).astype(np.float32) / 255
TH, TW = tex.shape[:2]

# ---------- per-triangle samples (centroid, normal, color) ----------
P, I, UV = twig['pos'], twig['idx'], twig['uv']
rng = np.random.default_rng(1)
if len(I) > 3_000_000:                                    # thin very dense scans (keeps silhouette, saves RAM)
    I = I[rng.random(len(I)) < 3_000_000 / len(I)]
a, b, c = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]
C = (a + b + c) / 3
Nn = np.cross(b - a, c - a); area = np.linalg.norm(Nn, axis=1) * 0.5; Nn /= (2 * area[:, None] + 1e-12)
uvc = (UV[I[:, 0]] + UV[I[:, 1]] + UV[I[:, 2]]) / 3
tx = np.clip((uvc[:, 0] % 1) * TW, 0, TW - 1).astype(int); ty = np.clip((uvc[:, 1] % 1) * TH, 0, TH - 1).astype(int)
col = tex[ty, tx]
del a, b, c
# fake self-shadowing: inner needles (near trunk) and underside darker
r = np.hypot(C[:, 0], C[:, 2]); y = C[:, 1]
ymin, ymax = np.percentile(y, 0.5), np.percentile(y, 99.5)
hb = np.clip(((y - ymin) / (ymax - ymin) * 40).astype(int), 0, 39)
rmax = ndimage.maximum(r, hb, index=np.arange(40)); rmax = np.maximum(np.array(rmax), 0.3)[hb]
shade = (0.42 + 0.58 * np.clip(r / rmax, 0, 1) ** 0.7) * (0.85 + 0.15 * np.clip(Nn[:, 1] * 0.5 + 0.5, 0, 1))
col = np.clip(col * shade[:, None], 0, 1)

# ---------- clusters: height bands x angular sectors ----------
Htree = float(np.percentile(y, 99.5))
BAND = max(0.12, 0.62 * Htree / 18.8); SECT = 10
theta = np.arctan2(C[:, 2], C[:, 0]); sec = ((theta + np.pi) / (2 * np.pi) * SECT).astype(int) % SECT
band = ((y - ymin) / BAND).astype(int)
key = band * SECT + sec
order = np.argsort(key, kind='stable'); ks = key[order]
bounds = np.r_[0, np.nonzero(np.diff(ks))[0] + 1, len(ks)]
PX = float(np.clip(54 * (18.8 / max(Htree, 1.0)) ** 0.75, 54, 260))                                   # texels per meter on cards
cards, images = [], []
for s0, s1 in zip(bounds[:-1], bounds[1:]):
    if s1 - s0 < max(60, 400 * (Htree / 18.8) ** 2): continue
    sel = order[s0:s1]; pts = C[sel]
    sub = pts[rng.choice(len(pts), min(len(pts), 20000), replace=False)]
    mu = sub.mean(0); cov = np.cov((sub - mu).T); w, V = np.linalg.eigh(cov)
    nrm0 = V[:, 0]; u0v = V[:, 2]
    radial = np.array([mu[0], 0, mu[2]]); radial /= (np.linalg.norm(radial) + 1e-9)
    if u0v @ radial < 0: u0v = -u0v
    if nrm0[1] < 0: nrm0 = -nrm0
    up = np.array([0.0, 1.0, 0.0])
    # card A: best-fit plane of the branch spray; card B: upright plane through the branch axis (volume from the side)
    hz = np.array([u0v[0], 0, u0v[2]]); hz /= (np.linalg.norm(hz) + 1e-9)
    nB = np.cross(hz, up); nB /= np.linalg.norm(nB)
    for (nrm, u) in ((nrm0, u0v), (nB, hz)):
        v = np.cross(nrm, u)
        q = pts - mu; pu, pv, pn = q @ u, q @ v, q @ nrm
        lo_u, hi_u = np.percentile(pu, [0.5, 99.5]); lo_v, hi_v = np.percentile(pv, [0.5, 99.5])
        lo_u -= 0.05; lo_v -= 0.05; hi_u += 0.05; hi_v += 0.05
        Wp = int(np.clip((hi_u - lo_u) * PX, 16, 256)); Hp = int(np.clip((hi_v - lo_v) * PX, 16, 256))
        ix = np.clip(((pu - lo_u) / (hi_u - lo_u) * Wp).astype(int), 0, Wp - 1); iy = np.clip(((pv - lo_v) / (hi_v - lo_v) * Hp).astype(int), 0, Hp - 1)
        flat = iy * Wp + ix
        cnt = np.bincount(flat, minlength=Wp * Hp).astype(np.float32)
        rgb = np.stack([np.bincount(flat, weights=col[sel, k], minlength=Wp * Hp) for k in range(3)], -1) / np.maximum(cnt, 1)[:, None]
        nl = Nn[sel]; tn = np.stack([nl @ u, nl @ v, np.abs(nl @ nrm)], -1)
        nsum = np.stack([np.bincount(flat, weights=tn[:, k], minlength=Wp * Hp) for k in range(3)], -1)
        cnt = cnt.reshape(Hp, Wp); rgb = rgb.reshape(Hp, Wp, 3); nsum = nsum.reshape(Hp, Wp, 3)
        cov_ = ndimage.maximum_filter(cnt, 3) > 0
        alpha = ndimage.gaussian_filter(cov_.astype(np.float32), 0.7)
        rgbf = rgb.copy()
        for _ in range(3):
            m = cnt > 0; blur = ndimage.uniform_filter(rgbf * m[..., None], (3, 3, 1)); wsum = ndimage.uniform_filter(m.astype(np.float32), 3)
            rgbf = np.where(m[..., None], rgbf, blur / np.maximum(wsum[..., None], 1e-6)); cnt = np.where(m, cnt, wsum > 0)
        nn = nsum / (np.linalg.norm(nsum, axis=-1, keepdims=True) + 1e-6); nn[..., 2] = np.maximum(nn[..., 2], 0.35)
        nn /= np.linalg.norm(nn, axis=-1, keepdims=True)
        img = np.concatenate([np.clip(rgbf, 0, 1), alpha[..., None]], -1)
        corners = np.array([mu + u * lo_u + v * lo_v, mu + u * hi_u + v * lo_v, mu + u * hi_u + v * hi_v, mu + u * lo_u + v * hi_v])
        cards.append({'corners': corners, 'nrm': nrm, 'size': (Wp, Hp)})
        images.append((img, nn * 0.5 + 0.5))

# ---------- shelf-pack card images into a 2048 atlas ----------
AT = 2048; x = y0 = shelf_h = 0; place = []
idx = sorted(range(len(images)), key=lambda i: -images[i][0].shape[0])
atlas = np.zeros((AT, AT, 4), np.float32); natlas = np.tile(np.array([0.5, 0.5, 1.0], np.float32), (AT, AT, 1))
uvs = [None] * len(images)
for i in idx:
    h_, w_ = images[i][0].shape[:2]
    if x + w_ + 2 > AT: x = 0; y0 += shelf_h + 2; shelf_h = 0
    if y0 + h_ > AT: raise SystemExit('atlas full')
    atlas[y0:y0 + h_, x:x + w_] = images[i][0]; natlas[y0:y0 + h_, x:x + w_] = images[i][1]
    uvs[i] = (x / AT, y0 / AT, (x + w_) / AT, (y0 + h_) / AT)
    x += w_ + 2; shelf_h = max(shelf_h, h_)
used_h = y0 + shelf_h
print(f'cards {len(cards)}  atlas rows used {used_h}/{AT}  twig tris sampled {len(I):,}')

# ---------- billboards (far LOD) from the full scan: 3 views ----------
woodpts = np.concatenate([p['pos'][p['idx']].mean(1) for p in wood])
wtex = {}
wcols = []
for p in wood:
    tp = g.material_textures(p['material']).get('diff')
    t = np.asarray(Image.open(tp).convert('RGB')).astype(np.float32) / 255 if tp else np.full((4, 4, 3), 0.3, np.float32)
    if 'uv' not in p:
        wcols.append(np.full((len(p['idx']), 3), 0.22, np.float32)); continue
    uvw = p['uv'][p['idx']].mean(1)
    wcols.append(t[np.clip((uvw[:, 1] % 1 * t.shape[0]).astype(int), 0, t.shape[0] - 1), np.clip((uvw[:, 0] % 1 * t.shape[1]).astype(int), 0, t.shape[1] - 1)] * 0.7)
wcols = np.concatenate(wcols)
allp = np.concatenate([C, woodpts]); allc = np.concatenate([col, wcols])
H_ = float(allp[:, 1].max()); R_ = float(np.percentile(np.hypot(allp[:, 0], allp[:, 2]), 99.5)) + 0.1
BW, BH = 256, 512
bbs = []
for k in range(3):
    ang = k * np.pi / 3; dirx = np.array([np.cos(ang), 0, np.sin(ang)]); depth = np.array([-np.sin(ang), 0, np.cos(ang)])
    px_ = allp @ dirx; dz = allp @ depth
    ix = np.clip(((px_ + R_) / (2 * R_) * BW).astype(int), 0, BW - 1); iy = np.clip(((H_ - allp[:, 1]) / H_ * BH).astype(int), 0, BH - 1)
    # painter: keep the nearest point per pixel
    o = np.argsort(dz); fl = (iy * BW + ix)[o]
    _, first = np.unique(fl, return_index=True)
    im = np.zeros((BH * BW, 4), np.float32); im[fl[first], :3] = allc[o][first]; im[fl[first], 3] = 1
    im = im.reshape(BH, BW, 4)
    m = im[..., 3] > 0
    for _ in range(2):
        blur = ndimage.uniform_filter(im[..., :3] * m[..., None], (3, 3, 1)); ws = ndimage.uniform_filter(m.astype(np.float32), 3)
        im[..., :3] = np.where(m[..., None], im[..., :3], blur / np.maximum(ws[..., None], 1e-6)); m = m | (ws > 0.3)
    im[..., 3] = ndimage.gaussian_filter((ndimage.maximum_filter(im[..., 3], 2) > 0).astype(np.float32), 0.6)
    bbs.append(im)
bb = np.concatenate(bbs, 1)

np.savez_compressed(f'{out}_cards.npz', corners=np.array([c_['corners'] for c_ in cards]), nrm=np.array([c_['nrm'] for c_ in cards]),
                    uvs=np.array(uvs), atlas=(np.clip(atlas[:used_h], 0, 1) * 255).astype(np.uint8),
                    natlas=(np.clip(natlas[:used_h], 0, 1) * 255).astype(np.uint8), atlas_full=AT, billboard=(bb * 255).astype(np.uint8),
                    height=H_, radius=R_)
np.savez_compressed(f'{out}_parts.npz', **{f'{k}_{p["material"]}': p[k] for p in wood for k in ('pos', 'idx', 'uv', 'nrm') if k in p})
print('height', round(H_, 2), 'radius', round(R_, 2))
