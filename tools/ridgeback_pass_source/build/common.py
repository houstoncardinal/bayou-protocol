"""Shared data + helpers for the Ridgeback Pass build.
World (authoring) coords: X east, Y north, Z up, meters.
glTF / three.js coords: x = X, y = Z, z = -Y   (north is -z)."""
import numpy as np, json
from scipy import ndimage
from PIL import Image

MAP = '/home/claude/v3'
h = np.load(f'{MAP}/height.npy').astype(np.float64)
h_orig = h.copy()
fm = np.load(f'{MAP}/floor_mask.npy').astype(np.float64)
meta = json.load(open(f'{MAP}/meta.json'))
secrets = json.load(open(f'{MAP}/secrets_routed.json'))
N = h.shape[0]; HALF = 100.0; CELL = 2 * HALF / (N - 1)
xs = np.linspace(-HALF, HALF, N)
X, Y = np.meshgrid(xs, xs)

def to_gl(P):
    P = np.asarray(P, np.float64); return np.stack([P[..., 0], P[..., 2], -P[..., 1]], -1)

def sample(arr, x, y, order=1):
    x = np.asarray(x, float); y = np.asarray(y, float)
    if x.ndim == 0:
        fx = min(max((float(x) + HALF) / CELL, 0), N - 1.001); fy = min(max((float(y) + HALF) / CELL, 0), N - 1.001)
        j, i = int(fx), int(fy); a, b = fx - j, fy - i
        return float(arr[i, j] * (1 - a) * (1 - b) + arr[i, j + 1] * a * (1 - b) + arr[i + 1, j] * (1 - a) * b + arr[i + 1, j + 1] * a * b)
    return ndimage.map_coordinates(arr, [(y + HALF) / CELL, (x + HALF) / CELL], order=order, mode='nearest')

# ---------------- tunnels ----------------
TUNNEL_STYLE = {'B_tunnels': 'mine', 'smugglers_cave': 'cave', 'old_drift': 'mine'}
HALF_W = 1.8      # half floor width (3.6 m wide)
WALL_H = 2.4
CEIL_H = 3.7

def tunnel_path(name):
    """resampled centerline (every 0.5 m) with rounded corners; returns P (n,2), floor z (n,), s (n,), trim range"""
    pts = np.array(secrets[name]['path'], float); dip = secrets[name]['dip']
    # round the corner with a quadratic bezier
    if len(pts) == 3:
        A, W, B = pts
        a = W + (A - W) * min(10 / np.linalg.norm(A - W), 0.45); b = W + (B - W) * min(10 / np.linalg.norm(B - W), 0.45)
        tt = np.linspace(0, 1, 30)[:, None]
        curve = (1 - tt) ** 2 * a + 2 * (1 - tt) * tt * W + tt ** 2 * b
        pts = np.vstack([A, curve, B])
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.r_[0, np.cumsum(seg)]; L = cum[-1]
    s = np.linspace(0, L, int(L / 0.5) + 1)
    P = np.c_[np.interp(s, cum, pts[:, 0]), np.interp(s, cum, pts[:, 1])]
    hs = sample(h_orig, P[:, 0], P[:, 1])
    za, zb = hs[0], hs[-1]
    z = za + (zb - za) * s / L - dip * np.clip(np.minimum(s, L - s) / 10, 0, 1)
    # trim: geometry starts 2.5 m before the terrain rises above floor+2.5 at each end
    up = hs > z + 2.5
    i0 = max(int(np.argmax(up)) - 1, 0); i1 = min(len(s) - 1 - int(np.argmax(up[::-1])) + 1, len(s) - 1)
    return P, z, s, i0, i1


# carve approach ramps so the ground meets each tunnel floor at its portal (no step / bank in front of entrances)
def _carve():
    global h
    for name in TUNNEL_STYLE:
        P, z, s_, i0, i1 = tunnel_path(name)
        for rng_ in (range(0, min(i0 + 4, len(P))), range(max(i1 - 3, 0), len(P))):
            for i in rng_:
                d = np.hypot(X - P[i, 0], Y - P[i, 1])
                target = z[i] - 0.05 + np.clip(d - (HALF_W + 0.5), 0, None) * 2.2     # steep rock-cut trench walls
                w = np.clip(1 - (d - (HALF_W + 0.5)) / 3.5, 0, 1)
                h = np.where(w > 0, np.minimum(h, target), h)
_carve()
# flatten the bridge abutments (removes the rim lip in front of the deck)
_ab = ((np.abs(X) < 3.2) & (((Y > -24.5) & (Y < -16.6)) | ((Y > -6.2) & (Y < 3.0))))
h = np.where(_ab, np.minimum(h, 9.02), h)

# smoothed height used for mesh normals (and as the "low" frame for normal-map baking)
h_smooth = ndimage.gaussian_filter(h, 1.0 / CELL)
gyS, gxS = np.gradient(h_smooth, CELL)
gy, gx = np.gradient(h, CELL)
slope = np.degrees(np.arctan(np.hypot(gx, gy)))

# trail mask (dirt paths along lane centerlines)
_best = np.full(X.shape, 1e9)
for pts in meta['lanes'].values():
    for (x0, y0, *_), (x1, y1, *_) in zip(pts[:-1], pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        _best = np.minimum(_best, np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy)))
_wob = ndimage.gaussian_filter(np.random.default_rng(1).random(X.shape), 6)
_wob = (_wob - _wob.mean()) / _wob.std()
trail = np.clip(1 - (_best + _wob * 0.8 - 1.6) / 1.4, 0, 1)
creek_y = -12 * 0.88 + 1.5 * np.sin(X / 9)
creek = (1 - np.clip((np.abs(Y - creek_y) - 1.2) / 2, 0, 1)) * (1 - np.clip((np.abs(X) - 22.9) / 6, 0, 1))

def load_img(path, size=None):
    im = Image.open(path).convert('RGB')
    if size: im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255
