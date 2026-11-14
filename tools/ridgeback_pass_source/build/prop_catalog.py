"""Prop catalog: id -> {file, nodes, bounds (gl, meters), hull (gl points, for Rapier convex hulls)}"""
import trimesh, numpy as np, json, os
from scipy.spatial import ConvexHull
D = '/tmp/dec'
WHOLE = ['boulder_01', 'dead_tree_trunk', 'dead_tree_trunk_02', 'namaqualand_cliff_01', 'rock_07', 'rock_09', 'rock_face_01', 'rock_face_02',
         'shrub_04', 'stone_01', 'tree_stump_01', 'tree_stump_02', 'wooden_axe', 'wooden_bucket_01', 'wooden_crate_01', 'wooden_crate_02',
         'wooden_lantern_01', 'wooden_military_crate']
SPLIT = ['rock_moss_set_01', 'rock_moss_set_02', 'fern_02', 'shrub_03', 'dry_branches_medium_01']
cat = {}
def info(meshes):
    V = np.vstack([m.vertices for m in meshes]); mn, mx = V.min(0), V.max(0)
    sub = V[np.random.default_rng(0).choice(len(V), min(len(V), 4000), replace=False)]
    hv = sub[ConvexHull(sub).vertices]
    if len(hv) > 40: hv = hv[np.linspace(0, len(hv) - 1, 40).astype(int)]
    return {'min': mn.round(3).tolist(), 'max': mx.round(3).tolist(), 'hull': hv.round(3).tolist()}
for f in WHOLE + SPLIT:
    sc = trimesh.load(f'{D}/{f}.glb', force='scene')
    nodes = {}
    for nn in sc.graph.nodes_geometry:
        T, gname = sc.graph[nn]; m = sc.geometry[gname].copy(); m.apply_transform(T); nodes[nn] = m
    if f in WHOLE:
        cat[f] = {'file': f, 'nodes': list(nodes), **info(list(nodes.values())), 'recenter': True}
    else:
        if f == 'wooden_barrels_01': pass
        for nn, m in nodes.items():
            c = m.vertices.mean(0)
            cat[nn] = {'file': f, 'nodes': [nn], **info([m]), 'recenter': True}
# barrels: individual barrels + debris pieces
sc = trimesh.load(f'{D}/wooden_barrels_01.glb', force='scene')
for nn in sc.graph.nodes_geometry:
    T, gname = sc.graph[nn]; m = sc.geometry[gname].copy(); m.apply_transform(T)
    if 'barrel0' in nn: cat[nn] = {'file': 'wooden_barrels_01', 'nodes': [nn], **info([m]), 'recenter': True}
for k, v in cat.items():
    s = np.array(v['max']) - np.array(v['min']); v['size'] = s.round(2).tolist()
json.dump(cat, open('/home/claude/v3/build/prop_catalog.json', 'w'))
for k, v in sorted(cat.items()): print(f'{k:34s} size(m) {v["size"]}')
