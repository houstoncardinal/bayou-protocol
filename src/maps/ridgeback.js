// Ridgeback Pass v4: the package's own loader (src/maps/ridgebackPass, unchanged from the v4 zip), handed to
// the game's map mod (src/mods/53b-ridgeback.js), which calls it with the game's scene, renderer and model
// loader and adds the game's side: spawns, bomb sites, callouts, bot walk grid, bullet surfaces, physics.
import { loadRidgebackPass } from './ridgebackPass/loadRidgebackPass';

(globalThis.__BP_MAPS || (globalThis.__BP_MAPS = {})).ridgeback = loadRidgebackPass;
