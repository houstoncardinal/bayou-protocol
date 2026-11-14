"""Ridgeback Pass v3 world: hand-designed cover + structures (bridge, sawmill loft, quarry blocks, lumber, mine timbers)
and procedural nature scatter using the Poly Haven scans. World coords X east, Y north, Z up; exported in glTF/three coords.
Outputs: out/props.json, out/structures_raw.glb, out/world_meta.json (colliders, lights, tree positions for splat/grass)."""
import numpy as np, json, math, trimesh
from PIL import Image
from scipy.spatial.transform import Rotation as Rot
from common import *

rng = np.random.default_rng(2026)
cat = json.load(open('prop_catalog.json')); tunnels = json.load(open('tunnels.json'))
PHT = '/home/claude/ph/textures'
r3 = lambda a: [round(float(v), 3) for v in a]
M_ = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
def quat_gl(rx, ry, rz):
    return r3(Rot.from_matrix(M_ @ Rot.from_euler('xyz', [rx, ry, rz]).as_matrix() @ M_.T).as_quat())
H = lambda x, y: float(sample(h, x, y))
S = lambda x, y: float(sample(slope, x, y))
F = lambda x, y: float(sample(fm, x, y))
T = lambda x, y: float(sample(trail, x, y))
gx_, gy_ = np.gradient(h, CELL)

props = {}; colliders = []; lights = []; trees = []
def add(asset, x, y, z=None, s=1.0, yaw=None, tilt=0.0, sink=0.0, collide=None, ztop=None):
    """sink = fraction of the asset height pushed below ground"""
    if yaw is None: yaw = rng.uniform(0, 2 * np.pi)
    hgt = cat[asset]['size'][1] * s if asset in cat else 0
    if z is None: z = H(x, y)
    z = z - sink * hgt
    rx, ry = (rng.uniform(-tilt, tilt), rng.uniform(-tilt, tilt)) if tilt else (0.0, 0.0)
    q = quat_gl(rx, ry, yaw); p = r3(to_gl([x, y, z]))
    props.setdefault(asset, []).append({'p': p, 'q': q, 's': round(float(s), 3)})
    if collide == 'hull': colliders.append({'type': 'hull', 'asset': asset, 'p': p, 'q': q, 's': round(float(s), 3)})
    elif collide == 'tree': colliders.append({'type': 'capsule', 'p': r3(to_gl([x, y, z + 2.5])), 'halfHeight': 2.2, 'radius': round(0.28 * s, 2)})
    return p

# ======================= STRUCTURES (custom meshes with Poly Haven textures) =======================
def tex(name, size=1024):
    return (Image.open(f'{PHT}/{name}/{name}_diff_2k.jpg').convert('RGB').resize((size, size)),
            Image.open(f'{PHT}/{name}/{name}_nor_gl_2k.jpg').convert('RGB').resize((size, size)))
MATS = {}
def mat(name, rough=0.9):
    if name not in MATS:
        a, n = tex(name); MATS[name] = trimesh.visual.material.PBRMaterial(name=name, baseColorTexture=a, normalTexture=n, metallicFactor=0.0, roughnessFactor=rough)
    return MATS[name]
parts = {}          # material -> list of (V_world, F, UV)
def add_part(material, V, Fc, UV):
    parts.setdefault(material, []).append((np.asarray(V, float), np.asarray(Fc), np.asarray(UV, float)))
def box(material, center, size, yaw=0.0, tile=1.0, pitch=0.0, collide=True):
    """oriented box in world coords; UVs in meters / tile (planks run along the box's long horizontal axis)"""
    cx, cy, cz = center; sx, sy, sz = size
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    corners = np.array([[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]])
    R = Rot.from_euler('yz', [pitch, yaw]).as_matrix(); W = corners @ R.T + center
    faces = [(0, 1, 5, 4, sx, sz), (1, 2, 6, 5, sy, sz), (2, 3, 7, 6, sx, sz), (3, 0, 4, 7, sy, sz), (4, 5, 6, 7, sx, sy), (3, 2, 1, 0, sx, sy)]
    V, Fc, UV = [], [], []
    for a, b, c, d, w, hh in faces:
        base = len(V); V += [W[a], W[b], W[c], W[d]]
        UV += [[0, 0], [w / tile, 0], [w / tile, hh / tile], [0, hh / tile]]
        Fc += [[base, base + 1, base + 2], [base, base + 2, base + 3]]
    add_part(material, V, Fc, UV)
    if collide:
        colliders.append({'type': 'box', 'p': r3(to_gl(center)), 'q': quat_gl(0, pitch, yaw), 'half': r3([hx, hz, hy])})
def log(material, p0, p1, radius, seg=10, collide=False):
    p0 = np.array(p0, float); p1 = np.array(p1, float); ax = p1 - p0; L = np.linalg.norm(ax); ax /= L
    t1 = np.cross(ax, [0, 0, 1.0]) if abs(ax[2]) < 0.9 else np.cross(ax, [1.0, 0, 0]); t1 /= np.linalg.norm(t1); t2 = np.cross(ax, t1)
    V, Fc, UV = [], [], []
    for k in range(seg + 1):
        a = 2 * np.pi * k / seg; d = np.cos(a) * t1 + np.sin(a) * t2
        V += [p0 + d * radius, p1 + d * radius]; UV += [[k / seg * 2 * np.pi * radius, 0], [k / seg * 2 * np.pi * radius, L]]
    for k in range(seg):
        i = 2 * k; Fc += [[i, i + 2, i + 3], [i, i + 3, i + 1]]
    add_part(material, V, Fc, UV)
    if collide:
        mid = (p0 + p1) / 2; colliders.append({'type': 'capsule_axis', 'a': r3(to_gl(p0)), 'b': r3(to_gl(p1)), 'radius': round(radius, 3)})

# ---------- 1. Mid bridge over the creek gorge ----------
yS, yN = -23.5, 2.2
zS, zN = 9.07, 9.07
L_ = yN - yS; nseg = 14
for k in range(nseg):                       # deck in segments so it follows the slight slope
    y0 = yS + L_ * k / nseg; y1 = yS + L_ * (k + 1) / nseg; z0 = zS + (zN - zS) * k / nseg; z1 = zS + (zN - zS) * (k + 1) / nseg
    box('weathered_planks', (0, (y0 + y1) / 2, (z0 + z1) / 2 - 0.12), (3.6, y1 - y0 + 0.02, 0.24), yaw=0.0, tile=2.0,
        pitch=0.0, collide=False)
colliders.append({'type': 'box', 'p': r3(to_gl([0, (yS + yN) / 2, (zS + zN) / 2 - 0.12])), 'q': quat_gl(math.atan2(zN - zS, L_), 0, 0), 'half': r3([1.8, 0.12, L_ / 2])})
for xb in (-1.35, 1.35):                    # log beams under the deck
    log('pine_bark', (xb, yS - 1.5, zS - 0.45), (xb, yN + 1.5, zN - 0.45), 0.24)
for yp in (yS + L_ / 3, yS + 2 * L_ / 3):   # piers down to the gorge floor
    zt = zS + (zN - zS) * (yp - yS) / L_ - 0.5
    for xb in (-1.35, 1.35):
        log('pine_bark', (xb, yp, H(xb, yp) - 0.4), (xb, yp, zt), 0.2, collide=True)
    log('rough_wood', (-1.35, yp, H(0, yp) + 1.0), (1.35, yp, zt - 0.4), 0.09)
for xr in (-1.72, 1.72):                    # railings: posts + top and mid rails (low cover, see-through)
    nposts = 9
    for k in range(nposts):
        y = yS + L_ * k / (nposts - 1); z = zS + (zN - zS) * k / (nposts - 1)
        box('rough_wood', (xr, y, z + 0.52), (0.13, 0.13, 1.05), tile=1.0, collide=False)
    for hr in (0.98, 0.55):
        log('rough_wood', (xr, yS, zS + hr), (xr, yN, zN + hr), 0.055)
    colliders.append({'type': 'box', 'p': r3(to_gl([xr, (yS + yN) / 2, (zS + zN) / 2 + 0.55])), 'q': quat_gl(math.atan2(zN - zS, L_), 0, 0), 'half': r3([0.08, 0.55, L_ / 2])})
add('wooden_lantern_01', 1.72, yN - 0.4, zN + 1.05, s=1.0, yaw=0.3)
lights.append({'p': r3(to_gl([1.72, yN - 0.4, zN + 1.4])), 'color': '#ffb066', 'intensity': 3, 'distance': 9})

# ---------- 2. B site: sawmill loft (raised platform, high ground for B) ----------
lx0, lx1, ly0, ly1 = 42.4, 48.4, 34.4, 38.9
gmax = max(H(x, y) for x in (lx0, lx1) for y in (ly0, ly1)); deck = gmax + 3.0
box('weathered_planks', ((lx0 + lx1) / 2, (ly0 + ly1) / 2, deck - 0.12), (lx1 - lx0, ly1 - ly0, 0.24), tile=2.0)
for x in (lx0 + 0.3, (lx0 + lx1) / 2, lx1 - 0.3):
    for y in (ly0 + 0.3, ly1 - 0.3):
        log('pine_bark', (x, y, H(x, y) - 0.3), (x, y, deck - 0.2), 0.17, collide=True)
box('weathered_planks', ((lx0 + lx1) / 2, ly0 + 0.06, deck + 0.5), (lx1 - lx0, 0.12, 1.0), tile=2.0)       # south parapet (faces B entrances)
box('weathered_planks', (lx1 - 0.06, (ly0 + ly1) / 2, deck + 0.5), (0.12, ly1 - ly0, 1.0), yaw=0, tile=2.0)  # east parapet
rx0 = lx0 - 8.2; rz0 = H(rx0, 36.3)       # ramp down to the west (CT side access)
L_r = math.hypot(lx0 - rx0, deck - rz0); pitch = -math.atan2(deck - rz0, lx0 - rx0)
box('weathered_planks', ((lx0 + rx0) / 2, 36.3, (deck + rz0) / 2 - 0.12), (L_r, 1.7, 0.2), yaw=0, tile=2.0, pitch=pitch)
for x in np.linspace(rx0 + 1.5, lx0 - 0.5, 3):
    zt = rz0 + (deck - rz0) * (x - rx0) / (lx0 - rx0)
    for y in (35.55, 37.05): log('pine_bark', (x, y, H(x, y) - 0.2), (x, y, zt - 0.2), 0.1)
add('wooden_lantern_01', lx1 - 0.4, ly1 - 0.4, deck, yaw=1.0)
lights.append({'p': r3(to_gl([lx1 - 0.4, ly1 - 0.4, deck + 0.4])), 'color': '#ffb066', 'intensity': 3, 'distance': 10})

# ---------- 3. B site: lumber stacks, log piles, stumps (sawmill clearing) ----------
def lumber(x, y, yaw, layers=2):
    z = H(x, y)
    for k in range(layers):
        box('rough_wood', (x, y, z + 0.55 + k * 1.1 - 0.05), (2.6, 1.2, 1.1), yaw=yaw + k * 0.04, tile=1.5)
lumber(36.2, 30.4, 0.35, 2)          # central hard cover on B (plant behind it)
lumber(31.4, 25.6, -0.4, 1)          # low cover facing B window
lumber(41.6, 26.2, 1.2, 1)
def logpile(x, y, yaw):
    z = H(x, y); d = np.array([math.cos(yaw), math.sin(yaw)]); n = np.array([-d[1], d[0]])
    for off, dz in ((-0.55, 0.0), (0.55, 0.0), (0.0, 0.88)):
        px, py = x + n[0] * off, y + n[1] * off
        add('dead_tree_trunk_02', px, py, z + dz - 0.08, s=1.0, yaw=yaw, collide='hull')
logpile(39.0, 21.0, 0.5)             # entrance cover from B lower
logpile(29.0, 34.0, 1.9)
for x, y in ((33.0, 36.0), (40.5, 31.5), (35.0, 22.5), (27.5, 29.0), (45.0, 29.0), (31.0, 39.5)):
    add(rng.choice(['tree_stump_01', 'tree_stump_02']), x, y, s=rng.uniform(0.9, 1.15), sink=0.1, collide='hull')
add('wooden_axe', 40.5, 31.5, H(40.5, 31.5) + 0.5, yaw=0.4)
for dx, dy in ((0, 0), (0.8, 0.2), (0.35, 0.75)):
    add(f'wooden_barrels_01_barrel0{1 + (dx > 0)}', 43.0 + dx, 33.0 + dy, collide='hull')
add('wooden_bucket_01', 41.6, 33.3); add('wooden_crate_02', 47.0, 33.4, yaw=0.2, collide='hull'); add('wooden_military_crate', 46.4, 39.8, yaw=1.7, collide='hull')

# ---------- 4. A site: quarry blocks + overlook wall ----------
def block(x, y, sx, sy, sz, yaw, stack=1):
    z = H(x, y)
    for k in range(stack):
        box('rock_wall_08', (x, y, z + sz / 2 + k * sz - 0.08), (sx - k * 0.2, sy - k * 0.15, sz), yaw=yaw + k * 0.05, tile=1.8)
block(-39.6, 30.4, 2.6, 1.5, 1.45, 0.25)               # central plant cover
block(-33.2, 33.8, 1.7, 1.7, 1.15, -0.3, stack=2)      # tall stack, CT-side angle
block(-43.4, 26.2, 3.2, 0.9, 1.05, 0.9)                # low wall vs A doors
block(-31.0, 28.6, 1.4, 1.2, 1.1, 0.6)
ov = [(-50.6, 41.4), (-48.0, 43.3), (-45.4, 45.0)]     # overlook parapet (waist-high, peek spots between blocks)
for (x, y) in ov: block(x, y, 1.9, 0.8, 1.0, -0.62)
add('boulder_01', -35.4, 25.4, s=1.25, sink=0.12, collide='hull')
add('rock_moss_set_01_rock04', -44.4, 34.6, s=1.1, sink=0.15, collide='hull')
add('rock_moss_set_01_rock02', -29.0, 22.2, s=1.0, sink=0.15, collide='hull')       # A ramp top
add('rock_face_02', -44.3, 17.0, s=1.25, sink=0.2, yaw=1.4, collide='hull')          # A doors frame
add('rock_face_02', -36.6, 18.3, s=1.15, sink=0.2, yaw=4.6, collide='hull')
for x, y in ((-41.0, 36.5), (-36.0, 37.8)):
    add('wooden_crate_02', x, y, yaw=rng.uniform(0, 3), collide='hull')

# ---------- 5. Mid ----------
add('rock_moss_set_01_rock01', -3.6, -46.0, s=1.1, sink=0.15, collide='hull')        # staggered cover on the T approach
add('rock_moss_set_01_rock05', 4.2, -38.0, s=1.05, sink=0.15, collide='hull')
add('dead_tree_trunk_02', -1.4, -30.6, s=1.0, yaw=1.25, collide='hull')            # fallen log: half cover, vaultable
add('rock_moss_set_01_rock04', 5.0, 9.2, s=1.35, sink=0.15, collide='hull')          # north plaza splitter
add('rock_moss_set_02_rock11', -2.2, 4.4, s=1.0, sink=0.1, collide='hull')
add('rock_face_02', 8.1, 20.8, s=1.2, sink=0.2, yaw=0.6, collide='hull')             # Mid Doors frame
add('rock_face_02', 14.8, 18.0, s=1.2, sink=0.2, yaw=3.7, collide='hull')
add('rock_moss_set_02_rock13', 6.0, 33.0, s=1.0, sink=0.1, collide='hull')

# ---------- 6. A Main / A Ramp ----------
for asset, x, y, s_ in (('rock_moss_set_02_rock11', -20.0, -63.0, 1.0), ('rock_moss_set_01_rock03', -37.0, -50.5, 1.1),
                        ('rock_moss_set_01_rock06', -51.6, -30.0, 1.0), ('rock_moss_set_02_rock13', -48.8, -2.0, 1.1),
                        ('rock_moss_set_01_rock02', -41.2, 10.0, 1.0), ('rock_moss_set_02_rock10', -12.0, 9.8, 1.0)):
    add(asset, x, y, s=s_, sink=0.15, collide='hull')
add('dead_tree_trunk_02', -44.8, -16.0, yaw=1.45, collide='hull')

# ---------- 7. B approach, mine entrance, B lower, B window ----------
for asset, x, y, s_ in (('rock_moss_set_02_rock10', 18.0, -62.0, 1.0), ('rock_moss_set_01_rock01', 46.6, -16.0, 1.0),
                        ('rock_moss_set_01_rock06', 41.0, -3.0, 1.0), ('rock_moss_set_02_rock09', 30.0, -56.5, 1.0)):
    add(asset, x, y, s=s_, sink=0.15, collide='hull')
add('dead_tree_trunk', 43.0, 10.0, yaw=0.3, collide='hull')
add('rock_face_02', 22.6, 12.6, s=1.15, sink=0.25, yaw=2.2, collide='hull')           # B window rock frame
mo = tunnels['B_tunnels']['mouths'][0]; mx, my = mo[0], -mo[2]
for dx, dy, a in ((-2.6, -1.0, 'wooden_military_crate'), (-3.2, 0.4, 'wooden_crate_02'), (2.7, -1.2, 'wooden_barrels_01_barrel01')):
    add(a, mx + dx, my + dy, yaw=rng.uniform(0, 3), collide='hull')

# ---------- 8. Mine timbers + lanterns inside the mine tunnels ----------
for name in ('B_tunnels', 'old_drift'):
    for fr in tunnels[name]['timber_frames']:
        x, y, z = fr['p'][0], -fr['p'][2], fr['p'][1]; yaw = -fr['yaw']
        d = np.array([math.cos(yaw), math.sin(yaw)]); n = np.array([-d[1], d[0]])
        for side in (-1.55, 1.55):
            box('rough_wood', (x + n[0] * side, y + n[1] * side, z + 1.25), (0.22, 0.22, 2.5), yaw=yaw, tile=1.0, collide=False)
        box('rough_wood', (x, y, z + 2.55), (0.24, 3.4, 0.24), yaw=yaw, tile=1.0, collide=False)
    for p in tunnels[name]['lights']:
        x, y, z = p[0], -p[2], p[1]
        add('wooden_lantern_01', x, y, z - 0.55, yaw=0.0)
        lights.append({'p': r3(to_gl([x, y, z])), 'color': '#ffb066', 'intensity': 4, 'distance': 12})
for p in tunnels['smugglers_cave']['lights'][:2]:
    lights.append({'p': r3(to_gl([p[0], -p[2], p[1] - 0.6])), 'color': '#9fb4ff', 'intensity': 1.2, 'distance': 10})   # dim cave light

# ---------- 9. Gorge creek bed ----------
for k in range(26):
    x = rng.uniform(-21, 21); y = -12 * 0.88 + 1.5 * math.sin(x / 9) + rng.uniform(-2.2, 2.2)
    if abs(x) < 3 and -23 < y < 2: continue
    asset = rng.choice(['rock_moss_set_02_rock07', 'rock_moss_set_02_rock08', 'rock_moss_set_02_rock12', 'rock_07', 'stone_01'])
    s_ = rng.uniform(0.5, 0.9) if 'moss' in asset else rng.uniform(5, 9)
    add(asset, x, y, s=s_, sink=0.3, collide='hull' if 'moss' in asset else None)

# ---------- 10. Spawns ----------
for x, y in ((-9.5, -70.0), (9.5, -71.0)): add('rock_moss_set_01_rock05', x, y, s=1.0, sink=0.15, collide='hull')
for dx, dy, a in ((-6.0, 55.5, 'wooden_military_crate'), (-5.4, 56.4, 'wooden_crate_01'), (7.5, 56.0, 'wooden_barrels_01_barrel02')):
    add(a, dx, dy, yaw=rng.uniform(0, 3), collide='hull')

# ======================= PROCEDURAL NATURE SCATTER =======================
designed_pts = [(v['p'][0], -v['p'][2]) for lst in props.values() for v in lst]
def far_from_designed(x, y, r):
    return all((x - a) ** 2 + (y - b) ** 2 > r * r for a, b in designed_pts)
mouths = [(m[0], -m[2]) for t in tunnels.values() for m in t['mouths']]
tpaths = [tunnel_path(n)[:2] for n in TUNNEL_STYLE]
def over_tunnel(x, y, pad=1.5):
    return any(np.min(np.hypot(P[:, 0] - x, P[:, 1] - y)) < HALF_W + pad for P, z in tpaths)
spawn_pts = [tuple(meta['spawns']['T']), tuple(meta['spawns']['CT'])]
forest = ndimage.gaussian_filter(np.random.default_rng(9).random(h.shape), 40); forest = (forest - forest.mean()) / forest.std()
Fo = lambda x, y: float(sample(forest, x, y))
TREE_BIG = ['fir_a', 'fir_b', 'fir_c', 'pine_a', 'pine_b', 'pine_c']
n_tree = 0
for _ in range(60000):
    x, y = rng.uniform(-99, 99, 2); z = H(x, y); s_ = S(x, y); f = F(x, y)
    if n_tree >= 620 or z > 62 or s_ > 40 or f > 0.12 or over_tunnel(x, y, 2.5) or not far_from_designed(x, y, 3): continue
    dens = np.clip(0.35 + 0.35 * Fo(x, y), 0.05, 0.9) * (1.0 if s_ < 30 else 0.45)
    if rng.random() > dens: continue
    if any((x - a) ** 2 + (y - b) ** 2 < 9 for a, b, _ in trees[-40:]): continue
    asset = rng.choice(TREE_BIG) if rng.random() < 0.8 else rng.choice(['firsap_a', 'firsap_b'])
    sc_ = rng.uniform(0.8, 1.15)
    add(asset, x, y, z - 0.25, s=sc_, tilt=0.03, collide='tree' if f > 0.01 else None)
    trees.append((x, y, sc_)); n_tree += 1
# lane-edge saplings & bushes (soften the valley edges, never on the walkable floor)
for _ in range(9000):
    x, y = rng.uniform(-95, 95, 2); f = F(x, y)
    if not (0.002 < f < 0.5) or S(x, y) > 38 or over_tunnel(x, y) or not far_from_designed(x, y, 4) or len(props.get('bush_fir_a', [])) + len(props.get('bush_pine_a', [])) > 260: continue
    if any((x - a) ** 2 + (y - b) ** 2 < 100 for a, b in spawn_pts): continue
    add(rng.choice(['bush_fir_a', 'bush_pine_a', 'firsap_b']) if rng.random() < 0.9 else 'firsap_a', x, y, s=rng.uniform(0.9, 1.6), tilt=0.05)
# cliff crags embedded in the walls
CR = ['rock_face_01', 'rock_face_02', 'namaqualand_cliff_01']
nc = 0
for _ in range(120000):
    x, y = rng.uniform(-98, 98, 2); f = F(x, y); s_ = S(x, y)
    if f > 0.004 or s_ < 44 or nc > 460 or over_tunnel(x, y, 3) or any((x - a) ** 2 + (y - b) ** 2 < 64 for a, b in mouths): continue
    if rng.random() > 0.12: continue
    g = np.array([sample(gx_, x, y), sample(gy_, x, y)]); g /= np.linalg.norm(g) + 1e-9
    asset = rng.choice(CR, p=[0.45, 0.45, 0.10]); sc_ = rng.uniform(1.0, 2.4) if asset != 'namaqualand_cliff_01' else rng.uniform(0.6, 1.0)
    w = max(cat[asset]['size'][0], cat[asset]['size'][2]) * sc_
    xx, yy = x + g[0] * 0.42 * w, y + g[1] * 0.42 * w
    add(asset, xx, yy, min(H(xx, yy), H(x, y) + 0.6 * cat[asset]['size'][1] * sc_) - 0.5 * cat[asset]['size'][1] * sc_, s=sc_, yaw=math.atan2(g[1], g[0]) + rng.uniform(-0.6, 0.6), tilt=0.25,
        collide='hull' if F(x, y) > 0 or any(F(x + dx, y + dy) > 0.2 for dx, dy in ((3, 0), (-3, 0), (0, 3), (0, -3))) else None)
    nc += 1
# boulders at cliff feet (edge of lane floors)
MOSS = [k for k in cat if k.startswith('rock_moss_set')]
nb = 0
for _ in range(60000):
    x, y = rng.uniform(-96, 96, 2); f = F(x, y)
    if not (0.08 < f < 0.7) or T(x, y) > 0.1 or nb > 170 or over_tunnel(x, y) or not far_from_designed(x, y, 3.5): continue
    if any((x - a) ** 2 + (y - b) ** 2 < 144 for a, b in spawn_pts + mouths): continue
    if rng.random() > 0.35: continue
    add(rng.choice(MOSS), x, y, s=rng.uniform(0.55, 1.05), sink=0.2, tilt=0.15, collide='hull'); nb += 1
# ground cover: ferns, dry branches, small stones, stumps (decor, no collision)
FERN = [k for k in cat if k.startswith('fern_02')]; BR = [k for k in cat if k.startswith('dry_branches')]
for _ in range(14000):
    x, y = rng.uniform(-97, 97, 2); f = F(x, y); s_ = S(x, y)
    if s_ > 34 or over_tunnel(x, y, 0.5) or len(props.get('fern_02_a', [])) + len(props.get('fern_02_b', [])) + len(props.get('fern_02_c', [])) + len(props.get('fern_02_d', [])) > 900: continue
    edge = 0.02 < f < 0.6; forest_floor = f < 0.02 and Fo(x, y) > 0.2
    if not (edge or forest_floor) or T(x, y) > 0.05: continue
    add(rng.choice(FERN), x, y, s=rng.uniform(0.8, 1.5), tilt=0.1)
for _ in range(4000):
    x, y = rng.uniform(-97, 97, 2); f = F(x, y)
    if f < 0.3 or T(x, y) > 0.3 or over_tunnel(x, y, 0) or len(props.get('dry_branches_medium_01_a', [])) > 120: continue
    if rng.random() < 0.5: add(rng.choice(BR), x, y, s=rng.uniform(0.8, 1.3), yaw=None)
    else: add(rng.choice(['rock_07', 'stone_01', 'rock_09']), x, y, s=rng.uniform(2, 6), sink=0.3)
for _ in range(3000):
    x, y = rng.uniform(-95, 95, 2)
    if F(x, y) > 0.02 or S(x, y) > 30 or len(props.get('tree_stump_01', [])) + len(props.get('dead_tree_trunk', [])) > 70: continue
    add(rng.choice(['tree_stump_01', 'tree_stump_02', 'dead_tree_trunk']), x, y, s=rng.uniform(0.8, 1.2), sink=0.1, tilt=0.1)

# ======================= EXPORT =======================
scene = trimesh.Scene()
for mname, plist in parts.items():
    Vs, Fs, UVs, off = [], [], [], 0
    for V, Fc, UV in plist: Vs.append(V); Fs.append(Fc + off); UVs.append(UV); off += len(V)
    V = np.vstack(Vs); Fc = np.vstack(Fs); UV = np.vstack(UVs)
    tm = trimesh.Trimesh(to_gl(V), Fc, process=False)
    tm.visual = trimesh.visual.TextureVisuals(uv=UV, material=mat(mname))
    tm.fix_normals()
    scene.add_geometry(tm, node_name=f'struct_{mname}', geom_name=f'struct_{mname}')
scene.export('out/raw/structures.glb')
json.dump(props, open('out/props.json', 'w'), separators=(',', ':'))
json.dump({'colliders': colliders, 'lights': lights, 'trees': trees}, open('out/world_meta.json', 'w'))
print({k: len(v) for k, v in sorted(props.items())})
print('instances', sum(len(v) for v in props.values()), 'colliders', len(colliders), 'lights', len(lights), 'structure tris', sum(len(g.faces) for g in scene.geometry.values()))
