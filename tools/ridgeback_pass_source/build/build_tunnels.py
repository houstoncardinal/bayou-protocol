"""Tunnel meshes (visual + collision) for the three secret passages, plus terrain cut mask.
Outputs out/raw/tunnel_<name>.glb, out/raw/tunnels_collision.glb, cut_mask.npy (per 1 m grid cell), tunnels.json"""
import numpy as np, json, os, trimesh
from PIL import Image
from common import *

os.makedirs('out/raw', exist_ok=True)
rng = np.random.default_rng(5)

def profile(style):
    """closed-ish cross-section from right floor edge -> wall -> arch -> left wall -> left floor edge, plus floor.
    returns list of (u lateral, v up) and per-point flag is_floor"""
    if style == 'aqueduct':   # dressed stone: vertical walls + round arch
        walls = [(HALF_W, 0.0), (HALF_W, WALL_H)]
        arch = [(HALF_W * np.cos(a), WALL_H + (CEIL_H - WALL_H) * np.sin(a)) for a in np.linspace(0, np.pi, 11)[1:-1]]
        left = [(-HALF_W, WALL_H), (-HALF_W, 0.0)]
    else:
        walls = [(HALF_W, 0.0), (HALF_W * 1.03, 1.2), (HALF_W, WALL_H)]
        arch = [(HALF_W * np.cos(a), WALL_H + (CEIL_H - WALL_H) * np.sin(a)) for a in np.linspace(0, np.pi, 9)[1:-1]]
        left = [(-HALF_W, WALL_H), (-HALF_W * 1.03, 1.2), (-HALF_W, 0.0)]
    ring = walls + arch + left
    floor = [(-HALF_W + 2 * HALF_W * k / 6, 0.0) for k in range(1, 6)]
    return ring + floor

PHT = '/home/claude/ph/textures'
def tile(name, size=1024):
    return (Image.open(f'{PHT}/{name}/{name}_diff_2k.jpg').convert('RGB').resize((size, size)),
            Image.open(f'{PHT}/{name}/{name}_nor_gl_2k.jpg').convert('RGB').resize((size, size)))

def build(name):
    style = TUNNEL_STYLE[name]
    P, z, s, i0, i1 = tunnel_path(name)
    P, z, s = P[i0:i1 + 1], z[i0:i1 + 1], s[i0:i1 + 1] - s[i0]
    n = len(P)
    d = np.gradient(P, axis=0); d /= np.linalg.norm(d, axis=1)[:, None]
    side = np.c_[d[:, 1], -d[:, 0]]                  # right-hand lateral
    prof = profile(style); m = len(prof)
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.array(prof), axis=0), axis=1))]
    V = np.zeros((n, m, 3)); UV = np.zeros((n, m, 2)); COL = np.zeros((n, m, 4))
    for i in range(n):
        for k, (u, v) in enumerate(prof):
            is_floor = v == 0.0
            uu, vv = u, v
            if style == 'cave' and not is_floor:
                amp = 0.35 * min(1, v / 0.6)
                nz = np.sin(s[i] * 0.9 + k * 1.7) * 0.5 + np.sin(s[i] * 0.37 + k * 0.6) * 0.5 + rng.normal(0, 0.15)
                uu = u * (1 + amp * nz / HALF_W); vv = v + amp * 0.6 * nz
            if style == 'mine' and not is_floor:
                uu = u * (1 + 0.04 * rng.normal()); vv = v + 0.05 * rng.normal()
            V[i, k] = [P[i, 0] + side[i, 0] * uu, P[i, 1] + side[i, 1] * uu, z[i] + vv + (0.06 if is_floor else 0)]
            UV[i, k] = [arc[k] / 2.5 if k < len(prof) - 5 else (u + HALF_W) / 2.5, s[i] / 2.5]
            if is_floor:
                COL[i, k] = [0.55, 0.47, 0.38, 1] if style != 'aqueduct' else [0.62, 0.6, 0.56, 1]
            else:
                t = {'mine': [0.78, 0.72, 0.64, 1], 'cave': [0.7, 0.68, 0.64, 1], 'aqueduct': [0.95, 0.92, 0.86, 1]}[style]
                dark = 0.85 + 0.15 * min(1, v / CEIL_H)
                COL[i, k] = [t[0] * dark, t[1] * dark, t[2] * dark, 1]
    ring_n = m - 5
    F = []; Ff = []
    for i in range(n - 1):
        for k in range(ring_n - 1):           # walls+arch strip (faces point inward)
            a, b, c, e = i * m + k, i * m + k + 1, (i + 1) * m + k + 1, (i + 1) * m + k
            F += [[a, e, c], [a, c, b]]
        fl = [ring_n - 1] + list(range(ring_n, m)) + [0]     # left edge -> floor pts -> right edge
        for q in range(len(fl) - 1):
            a, b = i * m + fl[q], i * m + fl[q + 1]; c, e = (i + 1) * m + fl[q + 1], (i + 1) * m + fl[q]
            Ff += [[a, e, c], [a, c, b]]
    F = np.array(F); Ff = np.array(Ff)
    Vw = V.reshape(-1, 3)
    # orient inward: check a ceiling face normal points down
    tm = trimesh.Trimesh(to_gl(Vw), F, process=False)
    ci = (n // 2) * m + ring_n // 2
    fidx = np.where((F == ci).any(1))[0][0]
    if tm.face_normals[fidx][1] > 0:
        F = F[:, ::-1]; Ff = Ff[:, ::-1]
    # portal collar at both ends: solid frame (front face + outer shell) that covers the terrain cut edges
    lipV, lipF, lipUV = [], [], []
    def outward(u, v):
        if v <= 0.01: return np.array([np.sign(u) * 1.0, 0.0])
        o = np.array([u, v - 1.3]); return o / (np.linalg.norm(o) + 1e-6)
    COLLAR = 1.0
    for ii, sign in [(0, -1), (n - 1, 1)]:
        fwd = np.array([d[ii, 0], d[ii, 1], 0.0]) * sign      # points out of the tunnel
        base = len(Vw) + len(lipV)
        for k in range(ring_n):
            u, v = prof[k]; o = outward(u, v)
            inner = V[ii, k] + fwd * 0.25
            ou, ov = u + o[0] * COLLAR, max(v + o[1] * COLLAR, -0.3 if v <= 0.01 else 0)
            outer_front = np.array([P[ii, 0] + side[ii, 0] * ou, P[ii, 1] + side[ii, 1] * ou, z[ii] + ov]) + fwd * 0.25
            outer_back = outer_front - fwd * 2.5
            lipV += [inner, outer_front, outer_back]
            lipUV += [[k / 3.0, 0], [k / 3.0, 0.4], [k / 3.0, 1.4]]
        for k in range(ring_n - 1):
            a0, a1 = base + 3 * k, base + 3 * (k + 1)
            # ring-edge -> collar inner (bridge 0.25 m), front face inner->outer_front, outer shell front->back
            r0, r1 = ii * m + k, ii * m + k + 1
            quads = [(r0, r1, a1, a0), (a0, a1, a1 + 1, a0 + 1), (a0 + 1, a1 + 1, a1 + 2, a0 + 2)]
            for q in quads:
                lipF += [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]
    lipV = np.array(lipV); allV = np.vstack([Vw, lipV]); lipF = np.array(lipF)
    allF = np.vstack([F, lipF]); allF2 = np.vstack([F, lipF[:, ::-1]])
    allUV = np.vstack([UV.reshape(-1, 2), np.array(lipUV)])
    allCOL = np.vstack([COL.reshape(-1, 4), np.tile([0.72, 0.68, 0.62, 1] if style != 'mine' else [0.62, 0.52, 0.4, 1], (len(lipV), 1))])
    alb, nrm = tile('mossy_rock')
    falb, fnrm = tile('gravel_road' if style == 'mine' else 'forest_ground_04')
    wmat = trimesh.visual.material.PBRMaterial(name=f'tunnel_walls_{style}', baseColorTexture=alb, normalTexture=nrm,
                                               metallicFactor=0.0, roughnessFactor=0.92, doubleSided=True)
    fmat = trimesh.visual.material.PBRMaterial(name=f'tunnel_floor_{style}', baseColorTexture=falb, normalTexture=fnrm,
                                               metallicFactor=0.0, roughnessFactor=0.95, doubleSided=False)
    uvt = allUV.copy(); uvt[:, 1] = 1 - uvt[:, 1]
    walls = trimesh.Trimesh(to_gl(allV), allF, visual=trimesh.visual.TextureVisuals(uv=uvt, material=wmat), process=False)
    flo = trimesh.Trimesh(to_gl(allV), Ff, visual=trimesh.visual.TextureVisuals(uv=uvt, material=fmat), process=False)
    for mm in (walls, flo): mm.remove_unreferenced_vertices()
    mesh = trimesh.Scene(); mesh.add_geometry(walls, node_name=f'tunnel_{name}_walls', geom_name=f'tunnel_{name}_walls')
    mesh.add_geometry(flo, node_name=f'tunnel_{name}_floor', geom_name=f'tunnel_{name}_floor')
    col = trimesh.Trimesh(to_gl(np.vstack([Vw, lipV])), np.vstack([F, Ff, lipF]), process=False)
    # mine timber frames (every 3 m) as separate prop instances
    frames = []
    if style == 'mine':
        for i in range(6, n - 6, 6):
            frames.append({'p': to_gl([P[i, 0], P[i, 1], z[i]]).round(3).tolist(),
                           'yaw': float(np.arctan2(-d[i, 1], d[i, 0]))})   # rotation about +y in gl space
    lights = [to_gl([P[i, 0], P[i, 1], z[i] + 2.9]).round(2).tolist() for i in range(10, n - 10, 24)]
    info = {'style': style, 'length_m': round(float(s[-1]), 1),
            'mouths': [to_gl([P[0, 0], P[0, 1], z[0]]).round(2).tolist(), to_gl([P[-1, 0], P[-1, 1], z[-1]]).round(2).tolist()],
            'lights': lights, 'timber_frames': frames}
    return mesh, col, info, (P, z)

def cut_mask(paths):
    """per 1 m terrain grid triangle-pair cell: True = remove (tunnel mouth opening)."""
    G = 401; gx = np.linspace(-100, 100, G); CX, CY = np.meshgrid((gx[:-1] + gx[1:]) / 2, (gx[:-1] + gx[1:]) / 2)
    cz = sample(h, CX, CY)
    cut = np.zeros(CX.shape, bool)
    for P, z in paths:
        for i in range(2, len(P) - 2):        # stay behind the portal face
            dx = CX - P[i, 0]; dy = CY - P[i, 1]
            dd = np.hypot(dx, dy)
            near = dd < HALF_W + 0.45
            low = (cz < z[i] + CEIL_H + 0.5) & (cz > z[i] + 0.35)   # only inside the collar's coverage
            cut |= near & low
    return cut

if __name__ == '__main__':
    infos = {}; paths = []; cols = []
    for name in TUNNEL_STYLE:
        mesh, col, info, path = build(name)
        mesh.export(f'out/raw/tunnel_{name}.glb'); cols.append(col); infos[name] = info; paths.append(path)
        print(name, info['style'], info['length_m'], 'm')
    trimesh.util.concatenate(cols).export('out/raw/tunnels_collision.glb')
    cm = cut_mask(paths); np.save('cut_mask.npy', cm); print('terrain cells cut', int(cm.sum()))
    json.dump(infos, open('tunnels.json', 'w'), indent=1)
