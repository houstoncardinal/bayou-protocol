"""Route each tunnel so that rock cover is >= 6 m over the centerline and >= 4 m over both side walls everywhere
between the portals (the old see-through hole came from thin cover at the sides)."""
import numpy as np, json
from scipy import ndimage
h = np.load('height.npy'); fm = np.load('floor_mask.npy'); m = json.load(open('meta.json'))
N = h.shape[0]; C = 200 / (N - 1); xs = np.linspace(-100, 100, N); X, Y = np.meshgrid(xs, xs)
Hs = lambda P: ndimage.map_coordinates(h, [(P[:, 1] + 100) / C, (P[:, 0] + 100) / C], order=1)
HALF_W, CEIL = 1.8, 3.7
def snap(p):
    d = np.hypot(X - p[0], Y - p[1]); d[fm < 0.97] = 1e9; i = np.unravel_index(np.argmin(d), d.shape); return np.array([X[i], Y[i]])
def evaluate(pts, dip):
    pts = np.array(pts, float); seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); L = seg.sum(); cum = np.r_[0, np.cumsum(seg)]
    d = np.linspace(0, L, int(L * 2) + 2); P = np.c_[np.interp(d, cum, pts[:, 0]), np.interp(d, cum, pts[:, 1])]
    tan = np.gradient(P, axis=0); tan /= np.linalg.norm(tan, axis=1)[:, None]; side = np.c_[tan[:, 1], -tan[:, 0]]
    hc = Hs(P); za, zb = hc[0], hc[-1]; t = d / L
    floor = za + (zb - za) * t - dip * np.clip(np.minimum(d, L - d) / 10, 0, 1)
    ceil = floor + CEIL
    hl = Hs(P + side * (HALF_W + 1.2)); hr = Hs(P - side * (HALF_W + 1.2))
    covered = (hc - ceil > 2.0)
    if not covered.any(): return -99, L, None
    i0 = np.argmax(covered); i1 = len(covered) - 1 - np.argmax(covered[::-1])
    inner = slice(i0 + 6, i1 - 5)          # skip ~3 m at each portal
    if inner.start >= inner.stop: return -99, L, None
    cover = min((hc - ceil)[inner].min(), (hl - ceil)[inner].min() + 2, (hr - ceil)[inner].min() + 2)
    frac = (i1 - i0) / len(d)
    if frac < 0.6: cover -= (0.6 - frac) * 40
    grade = np.degrees(np.arctan(np.abs(np.diff(floor)).max() / (d[1] - d[0])))
    return cover - max(0, grade - 14) * 2, L, grade
out = {}
for k, (a, b) in m['secrets'].items():
    A = snap(a); B = snap(b); mid = (A + B) / 2; al = (B - A) / np.linalg.norm(B - A); perp = np.array([-al[1], al[0]])
    best = None
    for dip in (0, 1.5, 3.0):
        cands = [[A, B]] + [[A, mid + perp * o + al * s, B] for o in np.arange(-16, 17, 2) for s in np.arange(-8, 9, 4)]
        for pts in cands:
            c, L, gr = evaluate(pts, dip)
            score = (c >= 6, -L - dip * 6 if c >= 6 else c)
            if best is None or score > best[0]: best = (score, c, L, [list(map(float, p)) for p in pts], dip, gr)
    _, c, L, pts, dip, gr = best
    print(f'{k:15s} cover {c:5.1f} m  length {L:5.1f} m  dip {dip}  max grade {gr:.1f} deg  {"OK" if c >= 6 else "THIN"}')
    out[k] = {'path': pts, 'dip': dip}
json.dump(out, open('secrets_routed.json', 'w'), indent=1)
