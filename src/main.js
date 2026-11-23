// Entry point: styles first, then the engine core (mods are injected into it at build time).
import './styles/base.css';
import './styles/ui.css';
import './styles/home-luxe.css';
import './styles/menus-luxe.css';
import './styles/pause-luxe.css';
import '../core/game.core.js';
// GPU-compressed textures (KTX2 / Basis Universal) for the phone set of models: src/mods/01b-ktx2.js
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
globalThis.__BP_KTX2 = KTX2Loader;
// maps, models and sounds kept on the device between visits (public/sw.js): the published site only
if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol === 'https:')
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));
// ambient occlusion (n8ao), built on the core's three.js and postprocessing; used by src/mods/91-ao.js
import { N8AOPostPass } from 'n8ao';
globalThis.__BP_N8AO = N8AOPostPass;
// map packages (after the core: they use its three.js)
import './maps/ridgeback.js';
