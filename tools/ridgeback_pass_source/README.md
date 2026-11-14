# Build pipeline (not needed at runtime)
terrain/gen_v3.py (layout + eroded heightfield) -> terrain/route_tunnels.py -> node/fetch_ph.py (Poly Haven downloads)
-> assets/build_trees.sh (scanned trees -> branch-card trees + billboards) and assets/bl_decimate.py / node/simplify_parts.mjs (props)
-> build/build_tunnels.py, build_terrain_v3.py, build_world.py (cover design + scatter), build_materials.py, build_grass.py, build_env.py, build_mapdata.py
-> node/optimize_v3.mjs (simplify, LOD, meshopt, WebP) -> tests: test/physics_test.ts (Rapier), test/browser_harness.ts + node/shoot.mjs + node/holes.mjs (WebGL).
terrain/rebuild.sh runs the whole chain. Paths inside the scripts point at the original build folders; adjust before re-running.
Requires Python 3 (numpy, scipy, numba, pillow, trimesh, opencv, bpy) and Node 18+ (@gltf-transform/*, meshoptimizer, sharp, puppeteer-core).
