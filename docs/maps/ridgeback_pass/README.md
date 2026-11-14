# Ridgeback Pass v4

A compact (200 m) mountain bomb-defusal / deathmatch map for three.js + Rapier, built entirely from Poly Haven scans (CC0).
It replaces v3 completely. Do not mix v3 and v4 files.

## What is in this zip

```
ridgeback_pass_v4/
  public/maps/ridgeback_pass/      <- ALL map assets (118 GLBs + data). Copy the whole folder.
    collision/  data/  environment/  grass/  materials/  props/  structures/  terrain/  trees/  tunnels/
  src/maps/ridgebackPass/          <- loader code (replaces the v3 files of the same names)
    loadRidgebackPass.ts  terrainMaterial.ts  types.ts  manifest.ts (web)  manifest.native.ts (Expo/Metro)  example.ts
  src/maps/index.ts
  HANDOFF_PROMPT.md                <- paste this to your coding agent
  CREDITS.md
```

## Install (web / Vite, `npm run dev`)

1. **Delete the old map assets** wherever your game currently loads Ridgeback Pass from (v3 file names overlap with v4).
2. Copy `public/maps/ridgeback_pass/` into your project's `public/maps/` folder. The files should then be served at
   `http://localhost:5173/maps/ridgeback_pass/data/map.json`. Open that URL in the browser to check.
   - If your game keeps assets elsewhere, keep the folder there and pass `resolve: (p) => '<your url prefix>/' + p`.
3. Replace `src/maps/ridgebackPass/` with the v4 code (all files), and `src/maps/index.ts` if you use the registry.
4. Load the map, then call `map.update(camera, seconds)` **every frame**. v4 needs this: it switches tree and rock
   detail levels, culls off-screen instances, animates grass and moves the sun's shadow camera with the player.

```ts
import { loadRidgebackPass } from './maps/ridgebackPass/loadRidgebackPass';

const map = await loadRidgebackPass({
  scene, world, RAPIER, renderer,                          // pass the renderer: sharper textures + sky lighting
  loadGLB: (url) => new Promise((res, rej) => gltfLoader.load(url as string, res, undefined, rej)), // needs setMeshoptDecoder
  quality: 'high',                                         // 'medium' / 'low' for weaker GPUs
});
// game loop:
map.update(camera, clock.elapsedTime);
```

5. Restart the dev server after deleting the Vite cache (`rm -rf node_modules/.vite`), then hard-refresh the browser.

**Renderer settings** (for the intended look): `renderer.outputColorSpace = THREE.SRGBColorSpace`,
`renderer.toneMapping = THREE.ACESFilmicToneMapping`, `renderer.shadowMap.enabled = true`.
The map adds its own sun, sky light, fog and sky. If your game already adds lights, pass `atmosphere: false`,
or remove yours. Otherwise everything is lit twice.

**GLTFLoader** must have `setMeshoptDecoder(MeshoptDecoder)`. WebP textures work in every current browser.

## How to check that v4 is loaded
- DevTools > Network > filter `glb`: you should see `trees/fir_a_lod0.glb`, `props/namaqualand_boulder_04.glb`,
  `collision/clip_walls.glb`, `materials/terrain_materials_hq.glb`.
- The console warns `[ridgeback] data/map.json is not v4` if an old data file is still being served.
- In game: timber-framed mine portals with lanterns, dense conifer forest on the ridges, tall grass tufts with seed heads,
  and no floating rock slabs.

## Gameplay data (`map.data`)
- `getSpawn('T' | 'CT' | 'deathmatch', i)`, `getBombSite(pos)`, `getCallout(pos)`, `isOutOfBounds(pos)`
- `data.radar`: a top-down minimap image (`data/radar.png`). `u = (x + 100) / 200`, `v = (z + 100) / 200`, top = north.
- Player controller: max climb slope 45°, autostep 0.4 m. Invisible clip walls (`collision/clip_walls.glb`) stop players
  climbing cliffs, rocks and ridge tops.

## v4 changes (fixes for the v3 problems)
| v3 problem | v4 fix |
|---|---|
| Paper-thin floating rock shards | One-sided "rock face" scans removed. Only closed rock scans are used, each embedded so its lower third is underground with no overhang over a drop. Rock colours are matched to the terrain granite. |
| 2D, blotchy, tan trees | Trees rebuilt from the Poly Haven scans: 1,100–1,450 branch cards per tree, rasterised from the real needle geometry. Cards are two-sided geometry with crown normals. 3 LODs per tree (cards, coarse cards, 4-plane billboard). Mip-aware alpha so trees don't thin out at distance. |
| Black cardboard mountains | Textured distant mountains with baked lighting and haze. They are drawn unlit, so they look the same with any lighting setup. |
| Tunnel tubes poking out / black slits | Portals moved to where the hill covers the tube by ≥1.4 m. Approach cuttings now have rock headwalls, timber mine portals with lanterns, and rock-framed cave mouths. |
| Stretched / striped textures | 12 terrain layers. Steepness is read from the real surface, so every steep face is sampled triplanar. Two cliff rocks, plus a close-range detail layer within ~9 m. Max anisotropy. |
| Dark flat grass | Grass tufts rendered from the real grass scans (some with the dry-grass variant), natural brightness, wind, distance fade. |
| Trench-like, monotone | Interior ridges lowered to 10–16 m forested crests. More ground cover: ferns, shrubs, roots, bark, pebbles, stumps. |
| Could climb onto cliffs | Invisible clip walls around the playable area. Tested: they never cross a lane or tunnel. |

Verified headless: all spawns on solid ground; bridge, loft, 6 tunnel entrances and tunnel headroom; clip walls; see-through
hole scan; spawn and site sightlines blocked.
