"""map.json for Ridgeback Pass v3 (gl coords: meters, +Y up, north = -Z)."""
import numpy as np, json, math
from common import *
cat = json.load(open('prop_catalog.json')); wm = json.load(open('out/world_meta.json')); tun = json.load(open('tunnels.json'))
props = json.load(open('out/props.json')); tm = json.load(open('/home/claude/v3/timings.json')); matj = json.load(open('out/mat/terrain_material.json'))
rng = np.random.default_rng(3)
r3 = lambda a: [round(float(v), 3) for v in a]
H = lambda x, y: float(sample(h, x, y))
col_pts = [(c['p'][0], -c['p'][2]) for c in wm['colliders'] if 'p' in c]
def free(x, y, r=1.4):
    return float(sample(fm, x, y)) > 0.9 and float(sample(slope, x, y)) < 14 and all((x - a) ** 2 + (y - b) ** 2 > r * r for a, b in col_pts)
def spawns(cx, cy, face, n=10):
    out = []; ring = [(0, 0)] + [(r * math.cos(a), r * math.sin(a)) for r, k in ((2.6, 4), (5.2, 6), (7.6, 8)) for a in np.linspace(0, 2 * np.pi, k, endpoint=False) + r]
    for ox, oy in ring:
        x, y = cx + ox, cy + oy
        if not free(x, y): continue
        yaw = math.atan2(-(face[0] - x), (face[1] - y))
        out.append({'p': r3(to_gl([x, y, H(x, y) + 0.05])), 'yaw': round(yaw, 3)})
        if len(out) == n: break
    assert len(out) == n, f'only {len(out)} spawns fit at {cx},{cy}'
    return out
T = meta['spawns']['T']; CT = meta['spawns']['CT']
dm = []
for x, y in rng.uniform(-80, 80, (6000, 2)):
    if free(x, y, 2.0) and float(sample(trail, x, y)) < 0.6 and all((x - a) ** 2 + (y - b) ** 2 > 14 ** 2 for a, b in dm): dm.append((x, y))
    if len(dm) >= 24: break
nice = {'T_spawn': 'T Spawn', 'CT_spawn': 'CT Spawn', 'site_A': 'A Site', 'A_overlook': 'Quarry Overlook', 'A_overlook_ramp': 'Overlook Ramp',
        'site_B': 'B Site', 'mid_T': 'Mid', 'mid_CT': 'Mid Doors', 'gorge': 'Creek Gorge', 'gorge_W': 'Gorge West', 'gorge_E': 'Gorge East',
        'A_main': 'A Main', 'A_ramp': 'A Ramp', 'B_approach': 'B Approach', 'B_lower': 'B Lower', 'B_window': 'B Window', 'CT_to_A': 'CT → A', 'CT_to_B': 'CT → B'}
callouts = [{'name': nice[k], 'points': [r3([p[0], -p[1]]) for p in v], 'widths': [p[3] for p in v]} for k, v in meta['lanes'].items() if len(v) > 1]
callouts += [{'name': n, 'points': [r3([p[0], -p[1]]) for p in [[0, -22.6], [0, 1.4]]], 'widths': [3.6, 3.6]} for n in ['Bridge']]
for k, nm in (('B_tunnels', 'B Tunnels'), ('smugglers_cave', "Smuggler's Cave"), ('old_drift', 'Old Drift')):
    P, z, s, i0, i1 = tunnel_path(k); callouts.append({'name': nm, 'points': [r3([p[0], -p[1]]) for p in P[::6]], 'widths': [3.6] * len(P[::6])})
callouts.sort(key=lambda c: c['name'] in ('Bridge', 'B Tunnels', "Smuggler's Cave", 'Old Drift'), reverse=True)   # specific areas win ties
assets = {}
for k in props:
    if k in cat: assets[k] = {'kind': 'prop', 'file': f"props/{cat[k]['file']}.glb", 'nodes': cat[k]['nodes']}
    else: assets[k] = {'kind': 'tree', 'file': f'trees/{k}.glb', 'billboard': f'trees/{k}_bb.glb'}
hulls = {k: cat[k]['hull'] for k in {c['asset'] for c in wm['colliders'] if c['type'] == 'hull'}}
d = {
    'name': 'Ridgeback Pass', 'version': 3, 'modes': ['defusal', 'deathmatch'], 'units': 'meters', 'up': '+y', 'north': '-z', 'size': 200,
    'bounds': {'min': [-100, round(float(h.min()) - 2, 2), -100], 'max': [100, round(float(h.max()) + 2, 2), 100], 'killY': -10},
    'player': {'recommendedMaxSlopeDeg': 45, 'eyeHeight': 1.65, 'note': 'walkable lanes <= 22 deg, gorge walls and cliffs >= 50 deg'},
    'spawns': {'T': spawns(*T, face=(0, 0)), 'CT': spawns(*CT, face=(0, 0)),
               'deathmatch': [{'p': r3(to_gl([x, y, H(x, y) + 0.05])), 'yaw': round(float(rng.uniform(-math.pi, math.pi)), 3)} for x, y in dm]},
    'bombSites': {k: {'center': r3(to_gl([v['center'][0], v['center'][1], H(*v['center'])])), 'radius': v['radius'], 'height': 7} for k, v in meta['bomb_sites'].items()},
    'secrets': {k: {'style': v['style'], 'length': v['length_m'], 'mouths': v['mouths']} for k, v in tun.items()},
    'lights': wm['lights'],
    'callouts': callouts,
    'chunks': [{'id': f'r{r}_c{c}', 'center': r3([-100 + 50 * c + 25, 0, -(-100 + 50 * r + 25)]), 'size': 50} for r in range(4) for c in range(4)],
    'terrainMaterial': {**matj, 'mapSize': 200, 'mapMin': [-100, -100]},
    'assets': assets,
    'colliders': wm['colliders'],
    'hulls': hulls,
    'sun': {'direction': r3(to_gl([math.cos(math.radians(110)) * 0.55, math.sin(math.radians(110)) * 0.55, 0.83])), 'color': '#fff2e2', 'intensity': 3.0},
    'fog': {'color': '#b2bfcc', 'near': 70, 'far': 420},
    'timingsSeconds': tm,
}
json.dump(d, open('out/map.json', 'w'), separators=(',', ':'))
print('spawns', {k: len(v) for k, v in d['spawns'].items()}, 'assets', len(assets), 'colliders', len(d['colliders']), 'callouts', len(callouts))
