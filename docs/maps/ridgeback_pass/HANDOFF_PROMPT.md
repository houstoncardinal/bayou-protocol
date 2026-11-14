Paste this to your coding agent (Claude / Devin) inside the game project:

---

Replace Ridgeback Pass v3 with **Ridgeback Pass v4** (zip: `ridgeback_pass_v4`). v4 is a complete replacement (new assets and new loader). Do not keep any v3 map files or loader code.

1. Find where the game currently loads Ridgeback Pass: the folder holding `terrain/`, `collision/` and `data/map.json`, and the loader file (`loadRidgebackPass` or an adapted copy). Tell me both paths.
2. Delete the old map asset folder. Copy `ridgeback_pass_v4/public/maps/ridgeback_pass/` (all 10 subfolders: collision, data, environment, grass, materials, props, structures, terrain, trees, tunnels) into `public/maps/ridgeback_pass/` (or the folder the game already serves map files from).
3. Replace the loader with `ridgeback_pass_v4/src/maps/ridgebackPass/*` (all files). If the game used an adapted copy of the v3 loader, switch it to call the v4 `loadRidgebackPass` directly; do not port v3 logic.
4. Call it with `{ scene, world, RAPIER, renderer, loadGLB, quality: 'high' }`. If the assets are not at `/maps/ridgeback_pass/`, add `resolve: (p) => '<url prefix>/' + p`. `loadGLB` must use a GLTFLoader with `setMeshoptDecoder(MeshoptDecoder)`.
5. In the game loop, call `map.update(camera, elapsedSeconds)` every frame. This is required.
6. If the game adds its own sun / ambient / fog, pass `atmosphere: false`, or remove the game's lights when this map is active.
7. Spawns come from `map.getSpawn(team, i)`; bomb sites from `map.getBombSite(pos)`; callouts from `map.getCallout(pos)`. The minimap image is `data/radar.png` (see `map.data.radar`).
8. Stop the dev server, `rm -rf node_modules/.vite`, restart, and hard-refresh the browser.
9. Verify in DevTools > Network that `trees/fir_a_lod0.glb`, `props/namaqualand_boulder_04.glb` and `collision/clip_walls.glb` load (status 200) and that the console shows no `[ridgeback]` warnings. Report any errors.
