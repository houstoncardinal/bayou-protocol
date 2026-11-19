/* ===== Bayou Tactical mod: ambient occlusion ===== */
// Ambient occlusion: the soft darkening where surfaces meet and where light can't reach (under crates, where
// a wall meets the ground, between rocks, inside doorways and window frames, under characters' feet). Without
// it objects looked pasted onto the ground. This is N8AO (n8ao, ISC licence), a screen-space AO with its own
// denoiser, added as the first pass in the game's effect chain (before tone mapping and the colour grade):
//   - High: full resolution, 16 samples, 8 denoise samples
//   - Medium: half resolution, 8 samples, 4 denoise samples (about a quarter of High's cost)
//   - Low: none (phones and weak graphics)
// The library is loaded by src/main.js against the core's own three.js and postprocessing (src/engine/three.js,
// src/engine/postprocessing.js), so its pass is an instance of the core's Pass class and the core's composer
// adds it like any of its own passes. In the menus (the background match behind a dark overlay) it is off.
const __AO = { on: !0 };
// the world is in metres: a player is 1.8 m tall
const __AO_CFG = {
  high: { halfRes: !1, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, aoRadius: 1.8, distanceFalloff: 1, intensity: 2.2 },
  highHalf: { halfRes: !0, aoSamples: 12, denoiseSamples: 6, denoiseRadius: 12, aoRadius: 1.8, distanceFalloff: 1, intensity: 2.2 },
  medium: { halfRes: !0, aoSamples: 8, denoiseSamples: 4, denoiseRadius: 10, aoRadius: 1.8, distanceFalloff: 1, intensity: 2.0 },
};
function __aoPass(scene, camera, w, h, q) {
  const N8 = typeof globalThis < 'u' && globalThis.__BP_N8AO;
  if (!N8 || !__AO_CFG[q]) return null;
  // full-resolution AO only on a strong graphics card; elsewhere High uses half resolution with more samples
  // (full resolution cost 3.6 ms a frame at 1600 x 900 on a base Apple M chip)
  q === 'high' && !__strongGpu() && (q = 'highHalf');
  const p = new N8(scene, camera, Math.max(1, w), Math.max(1, h));
  // the game has many transparent materials (foliage cards, glass, smoke): N8AO's transparency mode would
  // draw the scene twice more every frame; AO under foliage and smoke is not worth that
  p.autoDetectTransparency = !1;
  Object.assign(p.configuration, __AO_CFG[q], {
    transparencyAware: !1,
    gammaCorrection: !1, // the effect chain's last pass does the output conversion
    screenSpaceRadius: !1,
    color: new UA(0, 0, 0),
  });
  return p;
}
{
  const coreFx = hiA;
  hiA = function (props) {
    const q = props.quality,
      scene = gI((s) => s.scene),
      camera = gI((s) => s.camera),
      size = gI((s) => s.size),
      pass = S.useMemo(() => __aoPass(scene, camera, size.width, size.height, q), [scene, camera, q]);
    S.useEffect(() => () => pass && pass.dispose && pass.dispose(), [pass]);
    // off in the menus' background match; on in a match, also while paused (the match shows behind the menu)
    QI(() => {
      pass && (pass.enabled = __AO.on && !eA.attract);
    });
    const el = coreFx.apply(this, arguments);
    if (!pass || !el || !el.props) return el;
    const kids = [].concat(el.props.children || []);
    return S.cloneElement(el, null, M.jsx('primitive', { object: pass, dispose: null }, 'n8ao'), ...kids);
  };
}
typeof window < 'u' && (window.__bpAO = (on) => (on === void 0 ? { on: __AO.on, lib: !!globalThis.__BP_N8AO } : ((__AO.on = !!on), { on: __AO.on })));
