import numpy as np, json, itertools
from scipy import ndimage
exec(open('route_tunnels.py').read().split('out = {}')[0])
L = m['lanes']
def lane_pts(name, step=4.0):
    p = np.array(L[name])[:, :2]; seg = np.linalg.norm(np.diff(p, axis=0), axis=1); cum = np.r_[0, np.cumsum(seg)]
    d = np.arange(0, cum[-1] + 0.01, step); return [(name, np.array([np.interp(t, cum, p[:, 0]), np.interp(t, cum, p[:, 1])])) for t in d]
names = ['mid_CT', 'CT_to_A', 'CT_to_B', 'site_A', 'site_B', 'A_overlook', 'CT_spawn', 'B_lower', 'A_ramp', 'B_window', 'A_main']
pts = [q for n in names if len(L[n]) > 1 for q in lane_pts(n)] + [(n, np.array(L[n][0][:2])) for n in names if len(L[n]) == 1]
res = []
for (na, a), (nb, b) in itertools.combinations(pts, 2):
    if na == nb: continue
    if {na, nb} <= {'site_A', 'A_overlook', 'CT_to_A'} or {na, nb} <= {'site_B', 'CT_to_B'}: continue
    L_ = np.linalg.norm(b - a)
    if not (14 < L_ < 45): continue
    A = snap(a); B = snap(b)
    c, Lt, gr = evaluate([A, B], 0)
    if c >= 6.5: res.append((c, Lt, na, nb, A.round(1).tolist(), B.round(1).tolist()))
res.sort(key=lambda r: (-min(r[0], 10), r[1]))
seen = set()
for r in res:
    k = tuple(sorted((r[2], r[3])))
    if k in seen: continue
    seen.add(k); print(f'{r[2]:10s} <-> {r[3]:10s} cover {r[0]:5.1f}  len {r[1]:5.1f}  {r[4]} -> {r[5]}')
