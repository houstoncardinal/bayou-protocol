// Entry point: styles first, then the engine core (mods are injected into it at build time).
import './styles/base.css';
import './styles/ui.css';
import './styles/home-luxe.css';
import './styles/menus-luxe.css';
import './styles/pause-luxe.css';
import '../core/game.core.js';
// ambient occlusion (n8ao), built on the core's three.js and postprocessing; used by src/mods/91-ao.js
import { N8AOPostPass } from 'n8ao';
globalThis.__BP_N8AO = N8AOPostPass;
// map packages (after the core: they use its three.js)
import './maps/ridgeback.js';
