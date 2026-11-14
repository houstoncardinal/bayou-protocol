"""Ridgeback Pass v2 - bomb defusal layout (T south, CT north, sites A west / B east).
Realistic mountains: domain-warped ridged noise, valleys carved along lanes, droplet hydraulic + thermal erosion.
Units meters, X east, Y north (row index increases northward). Outputs height.npy, meta.json"""
import numpy as np, json, time
from scipy import ndimage
from numba import njit

N = 801; HALF = 100.0; CELL = 2 * HALF / (N - 1)   # 0.25 m
xs = np.linspace(-HALF, HALF, N)
X, Y = np.meshgrid(xs, xs)

def smooth(a, b, t):
    t = np.clip((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def vnoise(px, py, freq, seed):
    r = np.random.default_rng(seed); g = int(2 * HALF * freq) + 8
    grid = r.random((g, g))
    return ndimage.map_coordinates(grid, [(py + HALF) * freq + 3, (px + HALF) * freq + 3], order=3, mode='reflect')

def fbm(px, py, f, octs, seed, ridged=False, gain=0.5):
    tot = 0; amp = 1; norm = 0; w = 1.0
    for o in range(octs):
        n = vnoise(px, py, f, seed + o * 13)
        if ridged:
            n = 1 - np.abs(2 * n - 1); n = n * n * w; w = np.clip(n * 1.6, 0, 1)
        tot = tot + amp * n; norm += amp; amp *= gain; f *= 2.03
    return tot / norm

# ---------------- mountains ----------------
wx = X + 28 * (fbm(X, Y, 1 / 110, 3, 100) - 0.5)
wy = Y + 28 * (fbm(X + 50, Y - 70, 1 / 110, 3, 200) - 0.5)
mtn = 26 + 40 * fbm(wx, wy, 1 / 70, 7, 300, ridged=True)
edge = np.maximum(np.abs(X) / 84, np.abs(Y) / 84)
mtn += 38 * smooth(0.72, 1.05, edge) * (0.6 + 0.6 * fbm(wx, wy, 1 / 40, 3, 400))

# ---------------- lane network ----------------
# (name, points[(x,y,z)], floor width, wall steepness k, exponent)
LANES = [   # (name, [(x, y, floor_z, floor_width)], wall k, wall exponent)
    ('T_spawn',   [(0, -80, 10, 26), (0, -70, 10, 22)], 1.3, 1.3),
    ('CT_spawn',  [(2, 58, 14, 20), (2, 66, 14, 18)], 1.3, 1.3),
    ('site_A',    [(-42, 32, 16, 22), (-36, 38, 16, 18), (-48, 40, 16, 16)], 1.5, 1.3),
    ('A_overlook',[(-61, 50, 19, 7), (-53, 55, 19, 6)], 2.0, 1.3),
    ('A_overlook_ramp', [(-34, 47.5, 16, 4.5), (-47, 55, 19, 4.5)], 2.0, 1.3),
    ('site_B',    [(42, 30, 12, 22), (48, 36, 12, 18), (36, 36, 12, 16)], 1.5, 1.3),
    ('mid_T',     [(0, -68, 10, 10), (2, -48, 9.5, 12), (0, -32, 9, 14), (0, -24, 9, 9)], 1.2, 1.3),
    ('mid_CT',    [(0, 0, 9, 9), (5, 10, 9.5, 13), (13, 22, 11, 6), (9, 35, 12.5, 8), (2, 54, 14, 10)], 1.2, 1.3),
    ('gorge',     [(-26, -13.2, 3.9, 8), (-18, -12, 3.5, 9), (0, -12, 3.0, 9), (18, -11, 3.2, 9), (26, -12.2, 3.6, 8)], 4.0, 1.0),
    ('gorge_W',   [(-30, -13.5, 4.0, 7), (-41, -12, 7.6, 7), (-52, -10.5, 11.5, 7)], 2.2, 1.2),
    ('gorge_E',   [(30, -12.5, 3.8, 7), (40, -11, 6.4, 7), (50, -9.5, 9, 7)], 2.2, 1.2),
    ('A_main',    [(-8, -74, 10, 10), (-32, -68, 10.5, 11), (-50, -50, 11, 10), (-56, -28, 11.5, 12),
                   (-54, -10, 12, 10), (-50, 8, 13.5, 9), (-46, 20, 15.5, 6), (-44, 26, 16, 7)], 1.6, 1.3),
    ('A_ramp',    [(-4, 2, 9, 7), (-18, 12, 11.5, 6), (-30, 22, 14.5, 6), (-38, 30, 16, 8)], 1.8, 1.3),
    ('B_approach',[(8, -74, 10, 10), (30, -66, 9.5, 10), (44, -60, 9, 9)], 1.6, 1.3),
    ('B_lower',   [(50, -26, 9, 10), (50, -10, 9, 12), (46, 6, 10.5, 10), (44, 18, 12, 8)], 1.6, 1.3),
    ('B_window',  [(6, 4, 9, 6), (20, 12, 10.5, 5), (32, 22, 12, 5), (38, 28, 12, 7)], 2.2, 1.3),
    ('CT_to_A',   [(0, 56, 14, 9), (-18, 52, 15, 8), (-32, 42, 16, 9)], 1.5, 1.3),
    ('CT_to_B',   [(6, 56, 14, 9), (22, 50, 13, 8), (34, 40, 12, 9)], 1.5, 1.3),
]
SCALE = 0.88
LANES = [(n, [(x * SCALE, y * SCALE, z, w) for x, y, z, w in pts], k, pw) for n, pts, k, pw in LANES]
SECRETS = {   # tunnels built as meshes; endpoints on lane floors
    'B_tunnels':      [(44 * SCALE, -58 * SCALE), (50 * SCALE, -28 * SCALE)],      # main T route into B lower (lit mine tunnel, not secret)
    'smugglers_cave': [(-4 * SCALE, -42 * SCALE), (-54 * SCALE, -36 * SCALE)],     # secret: mid (T side) <-> A main
    'old_drift':      [(5.5, 10.5), (-19.0, 43.5)],    # secret: lower Mid (north of bridge) <-> CT->A rotation         # secret: CT mid <-> back of B site (retake flank)
}


def lane_field(pts):
    """returns signed distance to the lane floor edge (<0 inside) and floor z (width varies along lane)"""
    best = np.full(X.shape, 1e9); zb = np.zeros(X.shape)
    for (x0, y0, z0, w0), (x1, y1, z1, w1) in zip(pts[:-1], pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy)) - (w0 + t * (w1 - w0)) / 2
        m = d < best; best = np.where(m, d, best); zb = np.where(m, z0 + t * (z1 - z0), zb)
    return best, zb

def smin(a, b, k):
    hh = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - hh) + a * hh - k * hh * (1 - hh)

h = mtn.copy(); lane_min = np.full_like(h, 1e9); floor_mask = np.zeros_like(h); floor_z = np.zeros_like(h)
fz_acc = np.zeros_like(h); fw_acc = np.zeros_like(h)
jag = fbm(X, Y, 1 / 9, 3, 500)          # wobbles valley edges so they aren't ruler-straight
for name, pts, k, p in LANES:
    d, z = lane_field(pts)
    d = d + 3.0 * (jag - 0.5) * smooth(-2, 2, d)
    valley = z + k * np.maximum(0, d) ** p
    lane_min = np.minimum(lane_min, valley)
    m = 1 - smooth(-1.5, 1.5, d)
    fz_acc += m * z; fw_acc += m; floor_mask = np.maximum(floor_mask, m)

floor_z = fz_acc / np.maximum(fw_acc, 1e-6)
h = smin(h, lane_min, 3.0)

# creek channel across mid
creek_y = -12 * SCALE + 1.5 * np.sin(X / 9)
creek = (1 - smooth(1.2, 3.2, np.abs(Y - creek_y))) * (1 - smooth(26 * SCALE, 33 * SCALE, np.abs(X)))

# ---------------- rock detail on everything that isn't a lane floor ----------------
outside = ndimage.distance_transform_edt(floor_mask < 0.5) * CELL      # meters from nearest floor
wall = smooth(0.5, 9, outside)
# jagged ridged detail (buttresses, gullies)
det = fbm(wx * 1.0, wy * 1.6, 1 / 16, 6, 700, ridged=True)
h += wall * 6.0 * (det - 0.35)
# sedimentary strata: stepped ledges, tilted slightly, mixed in on steep walls only
tilt = h + 0.08 * X - 0.05 * Y + 6 * fbm(X, Y, 1 / 60, 2, 800)
step = 3.2
fr = (tilt / step) % 1.0
terr = (np.floor(tilt / step) + smooth(0.0, 1.0, fr) ** 3) * step - (0.08 * X - 0.05 * Y + 6 * fbm(X, Y, 1 / 60, 2, 800))
h = h * (1 - 0.55 * wall) + terr * 0.55 * wall
# fine fracture noise
h += wall * 1.6 * (fbm(X, Y, 1 / 4, 4, 900) - 0.5)
h0 = h.copy()

# ---------------- hydraulic erosion (droplets) ----------------
@njit(cache=True)
def erode(hm, n_drops, seed, cell):
    np.random.seed(seed)
    H, W = hm.shape
    inertia, cap_f, min_cap, dep, ero, evap, grav, max_steps = 0.08, 6.0, 0.01, 0.25, 0.45, 0.015, 4.0, 90
    for _ in range(n_drops):
        x = np.random.random() * (W - 2); y = np.random.random() * (H - 2)
        dx = 0.0; dy = 0.0; vel = 1.0; water = 1.0; sed = 0.0
        for _s in range(max_steps):
            ix = int(x); iy = int(y); fx = x - ix; fy = y - iy
            h00 = hm[iy, ix]; h10 = hm[iy, ix + 1]; h01 = hm[iy + 1, ix]; h11 = hm[iy + 1, ix + 1]
            gx = ((h10 - h00) * (1 - fy) + (h11 - h01) * fy) / cell
            gy = ((h01 - h00) * (1 - fx) + (h11 - h10) * fx) / cell
            hcur = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            dx = dx * inertia - gx * (1 - inertia); dy = dy * inertia - gy * (1 - inertia)
            l = (dx * dx + dy * dy) ** 0.5
            if l < 1e-9: break
            dx /= l; dy /= l
            nx = x + dx; ny = y + dy
            if nx < 0 or ny < 0 or nx >= W - 1 or ny >= H - 1: break
            jx = int(nx); jy = int(ny); gfx = nx - jx; gfy = ny - jy
            hn = (hm[jy, jx] * (1 - gfx) * (1 - gfy) + hm[jy, jx + 1] * gfx * (1 - gfy)
                  + hm[jy + 1, jx] * (1 - gfx) * gfy + hm[jy + 1, jx + 1] * gfx * gfy)
            dh = hn - hcur
            cap = max(-dh * vel * water * cap_f, min_cap)
            if sed > cap or dh > 0:
                amt = min(dh, sed) if dh > 0 else (sed - cap) * dep
                sed -= amt
                hm[iy, ix] += amt * (1 - fx) * (1 - fy); hm[iy, ix + 1] += amt * fx * (1 - fy)
                hm[iy + 1, ix] += amt * (1 - fx) * fy; hm[iy + 1, ix + 1] += amt * fx * fy
            else:
                amt = min((cap - sed) * ero, -dh)
                # spread erosion over a 3x3 brush for smoother gullies
                for oy in range(-1, 2):
                    for ox in range(-1, 2):
                        yy = iy + oy; xx = ix + ox
                        if 0 <= yy < H and 0 <= xx < W:
                            wgt = 0.25 if (ox == 0 and oy == 0) else (0.125 if (ox == 0 or oy == 0) else 0.0625)
                            hm[yy, xx] -= amt * wgt
                sed += amt
            vel = (max(vel * vel + dh * grav, 0.0)) ** 0.5
            water *= (1 - evap)
            x = nx; y = ny
    return hm

def thermal(hm, talus_deg, iters, rate=0.4):
    t = np.tan(np.radians(talus_deg)) * CELL
    for _ in range(iters):
        pad = np.pad(hm, 1, mode='edge'); delta = np.zeros_like(hm)
        for oy, ox in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nb = pad[1 + oy:1 + oy + hm.shape[0], 1 + ox:1 + ox + hm.shape[1]]
            diff = hm - nb - t
            mv = np.where(diff > 0, diff * rate * 0.25, 0)
            delta -= mv
            delta += np.roll(np.roll(mv, oy, 0), ox, 1)
        hm = hm + delta
    return hm

t0 = time.time()
hm = h.astype(np.float64).copy()
hm = erode(hm, 2200000, 42, CELL)
hm = thermal(hm, 64, 12)
hm = ndimage.gaussian_filter(hm, 0.3)
print('erosion', round(time.time() - t0, 1), 's')

# restore walkable floors (keep a little erosion texture), carve creek
fm = ndimage.gaussian_filter(floor_mask, 3.0)
micro = 0.35 * (fbm(X, Y, 1 / 5, 3, 600) - 0.5)
hm = hm * (1 - 0.88 * fm) + (floor_z + micro) * 0.88 * fm
hm -= 0.8 * creek
hm = hm * (1 - fm) + ndimage.gaussian_filter(hm, 1.0) * fm
band = ndimage.gaussian_filter(((fm > 0.02) & (fm < 0.98)).astype(float), 3) * 1.6
band = np.clip(band, 0, 1)
hm = hm * (1 - band) + ndimage.gaussian_filter(hm, 1.6) * band
hm = hm * fm + ndimage.gaussian_filter(hm, 0.45) * (1 - fm)

# rock breakup on cliffs only (2-7 m scale buttresses, ledges and cracks); floors untouched
_gy, _gx = np.gradient(hm, CELL); _sl = np.degrees(np.arctan(np.hypot(_gx, _gy)))
_wm = (1 - smooth(0.0, 0.06, fm)) * smooth(32, 48, _sl)
_wm = ndimage.gaussian_filter(_wm, 1.0 / CELL)
hm += _wm * (1.8 * (fbm(wx, wy, 1 / 2.6, 3, 1100, ridged=True) - 0.35) + 1.4 * (fbm(X, Y, 1 / 6.5, 3, 1200) - 0.5))
# slope limiter on walkable floors: relax any floor patch steeper than 22 deg
for _it in range(6):
    gy_, gx_ = np.gradient(hm, CELL); sl_ = np.degrees(np.arctan(np.hypot(gx_, gy_)))
    bad = (fm > 0.6) & (sl_ > 22)
    if bad.sum() == 0: break
    reg = ndimage.gaussian_filter(ndimage.binary_dilation(bad, iterations=int(3 / CELL)).astype(float), 2) * (fm > 0.3)
    hm = hm * (1 - reg) + ndimage.gaussian_filter(hm, 1.5 / CELL) * reg
# A overlook: quarry ledge with a vertical rock step (only reachable via its ramp)
def _lane_d(pts):
    best = np.full(X.shape, 1e9)
    for (x0, y0, z0, w0), (x1, y1, z1, w1) in zip(pts[:-1], pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy)) - (w0 + t * (w1 - w0)) / 2)
    return best
L_ = dict((n, p_) for n, p_, *_ in LANES)
d_ov = _lane_d(L_['A_overlook']); d_rp = _lane_d(L_['A_overlook_ramp']); d_site = _lane_d(L_['site_A'])
ledge = (d_ov < 0.6)
hm = np.where(ledge, np.maximum(hm, 19.4), hm)
step_band = (d_ov >= 0.6) & (d_ov < 1.6) & (d_rp > 0.8) & (d_site < 6)
hm = np.where(step_band, np.minimum(hm, 16.2), hm)
# gorge banks: steepen into rock walls (no climbing out except the W/E ramps)
d_g = _lane_d(L_['gorge']); d_gw = _lane_d(L_['gorge_W']); d_ge = _lane_d(L_['gorge_E'])
_, gz = None, None
best = np.full(X.shape, 1e9); gfz = np.zeros(X.shape)
for (x0, y0, z0, w0), (x1, y1, z1, w1) in zip(L_['gorge'][:-1], L_['gorge'][1:]):
    dx, dy = x1 - x0, y1 - y0
    t = np.clip(((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
    dd = np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy)); m_ = dd < best; best = np.where(m_, dd, best); gfz = np.where(m_, z0 + t * (z1 - z0), gfz)
band = (d_g > 0) & (d_g < 5) & (d_gw > 1.5) & (d_ge > 1.5)
top = ndimage.maximum_filter(hm, size=int(5 / CELL))
wall_h = np.minimum(gfz + d_g * 3.0, top)
hm = np.where(band, np.maximum(hm, wall_h), hm)
np.save('height.npy', hm.astype(np.float32)); np.save('floor_mask.npy', fm.astype(np.float32))
np.save('pre_erosion.npy', h0.astype(np.float32))

gy, gx = np.gradient(hm, CELL); slope = np.degrees(np.arctan(np.hypot(gx, gy)))
report = {}
for name, pts, k, p in LANES:
    d, _ = lane_field(pts); m = d < -2
    report[name] = round(float(np.percentile(slope[m], 97)), 1)
print('lane slope p97', report)
# wall check: band just outside lane floors
band = (fm < 0.05) & (ndimage.binary_dilation(fm > 0.5, iterations=12))
print('wall slope median', round(float(np.median(slope[band])), 1), 'p10', round(float(np.percentile(slope[band], 10)), 1))

meta = dict(name='Ridgeback Pass', mode='bomb defusal / deathmatch', size_m=200, samples=N, meters_per_sample=CELL,
            height_min=float(hm.min()), height_max=float(hm.max()),
            spawns={'T': [0, -76 * SCALE], 'CT': [2 * SCALE, 60 * SCALE]},
            bomb_sites={'A': {'center': [-42 * SCALE, 35 * SCALE], 'radius': 8}, 'B': {'center': [42 * SCALE, 33 * SCALE], 'radius': 8}},
            lanes={n: [[float(a), float(b), float(c), float(w)] for a, b, c, w in pts] for n, pts, *_ in LANES},
            secrets={k: [list(map(float, a)) for a in v] for k, v in SECRETS.items()})
json.dump(meta, open('meta.json', 'w'), indent=1)
