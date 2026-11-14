import json, os, sys, urllib.request, concurrent.futures as cf
OUT = '/home/claude/ph'
TEX = ['forest_ground_04', 'rocky_trail', 'rock_face_03', 'coast_sand_rocks_02', 'aerial_grass_rock', 'rocks_ground_02', 'leaves_forest_ground',
       'weathered_planks', 'pine_bark', 'river_small_rocks', 'rock_wall_08', 'stacked_stone_wall', 'sparse_grass', 'forest_leaves_04', 'mossy_rock', 'gravel_road', 'rough_wood']
MOD = ['pine_tree_01', 'fir_tree_01', 'fir_sapling_medium', 'boulder_01', 'rock_moss_set_01', 'rock_moss_set_02', 'fern_02',
       'grass_medium_01', 'dead_tree_trunk_02', 'tree_stump_01', 'dry_branches_medium_01',
       'wooden_crate_01', 'wooden_crate_02', 'wooden_military_crate', 'wooden_barrels_01', 'wooden_lantern_01', 'tree_stump_02', 'dead_tree_trunk',
       'rock_07', 'rock_09', 'rock_face_01', 'rock_face_02', 'stone_01', 'namaqualand_cliff_01', 'pine_sapling_small', 'shrub_03', 'shrub_04',
       'fir_sapling', 'wooden_axe', 'wooden_bucket_01']
def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'ridgeback-build/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f: f.write(r.read())
    return path
def files(aid):
    req = urllib.request.Request(f'https://api.polyhaven.com/files/{aid}', headers={'User-Agent': 'ridgeback-build/1.0'})
    return json.load(urllib.request.urlopen(req, timeout=60))
jobs = []; missing = []
for t in TEX:
    try: d = files(t)
    except Exception as e: missing.append((t, str(e))); continue
    for key, name in [('Diffuse', 'diff'), ('nor_gl', 'nor_gl'), ('Rough', 'rough'), ('AO', 'ao'), ('Displacement', 'disp')]:
        if key in d and '2k' in d[key]:
            jobs.append((d[key]['2k']['jpg']['url'] if 'jpg' in d[key]['2k'] else d[key]['2k']['png']['url'], f'{OUT}/textures/{t}/{t}_{name}_2k.jpg'))
for mdl in MOD:
    try: d = files(mdl)
    except Exception as e: missing.append((mdl, str(e))); continue
    if 'gltf' not in d: missing.append((mdl, 'no gltf')); continue
    res = '1k' if '1k' in d['gltf'] else sorted(d['gltf'].keys())[0]
    g = d['gltf'][res]['gltf']
    jobs.append((g['url'], f'{OUT}/models/{mdl}/{os.path.basename(g["url"])}'))
    for rel, inc in g.get('include', {}).items():
        jobs.append((inc['url'], f'{OUT}/models/{mdl}/{rel}'))
with cf.ThreadPoolExecutor(8) as ex:
    futs = {ex.submit(get, u, p): p for u, p in jobs}
    for f in cf.as_completed(futs):
        try: f.result()
        except Exception as e: missing.append((futs[f], str(e)))
print('downloaded files:', len(jobs) - len(missing), 'missing:', missing)
