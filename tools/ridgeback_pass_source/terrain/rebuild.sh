#!/bin/bash
set -e
cd /home/claude/v3/build
python3 build_tunnels.py | tail -1
python3 build_terrain_v3.py | tail -1
python3 build_world.py | tail -1
python3 build_materials.py
python3 build_grass.py | cut -c1-40
python3 build_env.py
python3 - <<'PY'
import numpy as np, trimesh
from PIL import Image
im = np.asarray(Image.open('out/mat/sky.jpg')).astype(np.float32)
for q, T in (('hq', 1024), ('lq', 512)):
    mat = trimesh.visual.material.PBRMaterial(name=f'terrain_layers_{q}', baseColorTexture=Image.open(f'out/mat/albedo_atlas_{T}.png'),
        normalTexture=Image.open(f'out/mat/normal_atlas_{T}.png'), occlusionTexture=Image.open('out/mat/splatA.png'), metallicRoughnessTexture=Image.open('out/mat/splatB.png'))
    m = trimesh.Trimesh(np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1.0]]), np.array([[0, 2, 1]]), process=False, visual=trimesh.visual.TextureVisuals(uv=np.array([[0, 0], [1, 0], [0, 1.0]]), material=mat))
    sc = trimesh.Scene(); sc.add_geometry(m, node_name='terrain_material_carrier', geom_name='terrain_material_carrier'); sc.export(f'out/raw/terrain_materials_{q}.glb')
# sky haze below horizon
H_ = im.shape[0]; rows = np.arange(H_)[:, None, None] / H_; w = np.clip((rows - 0.49) / 0.05, 0, 1)
out = im * (1 - w) + np.array([178, 190, 204], np.float32) * w
Image.fromarray(out.astype(np.uint8)).save('out/mat/sky.jpg', quality=92)
sky = Image.open('out/mat/sky.jpg')
sm = trimesh.Trimesh(np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1.0]]), np.array([[0, 2, 1]]), process=False, visual=trimesh.visual.TextureVisuals(uv=np.array([[0, 0], [1, 0], [0, 1.0]]), material=trimesh.visual.material.PBRMaterial(name='sky', emissiveTexture=sky, emissiveFactor=[1, 1, 1])))
sc = trimesh.Scene(); sc.add_geometry(sm, node_name='sky_carrier', geom_name='sky_carrier'); sc.export('out/raw/sky.glb')
PY
python3 build_mapdata.py
cd /home/claude/node && rm -rf /home/claude/v3/pkg/ridgeback_pass && node optimize_v3.mjs /home/claude/v3/build /home/claude/v3/pkg/ridgeback_pass 2>&1 | grep -E "KB|copied" | tail -3
cp /home/claude/v3/build/out/map.json /home/claude/v3/build/out/props.json /home/claude/v3/pkg/ridgeback_pass/data/
cd /home/claude/v3/web && rm -rf rb && cp -r ../code/src/maps/ridgebackPass rb && cp test_manifest.ts rb/manifest.ts && NODE_PATH=/home/claude/node/node_modules /home/claude/node/node_modules/.bin/esbuild main.ts --bundle --format=esm --outfile=bundle.js --log-level=warning && cp bundle.js /home/claude/v3/serve/
echo REBUILT
