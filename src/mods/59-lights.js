/* ===== Bayou Protocol mod: light budget ===== */
// three.js works out every point light in the scene for every pixel of every lit surface, whether the light
// is on or not. The game keeps 17 in the scene: the map's nearest lamps (6) and pools for effects that are
// almost always dark (6 impact flashes, 4 fire lights, 1 explosion). On the M4's GPU at 3840 x 1080 that was
// about a fifth of the whole frame on Ridgeback Pass.
// Now a fixed number are drawn: the nearest map lamps and the brightest effect lights, the rest hidden.
//   Low: 3 lamps + 1 effect    Medium: 4 + 2    High: 6 + 2
// The count never changes during play (dark effect lights fill unused slots), because a change in the
// number of lights makes three.js recompile every material's shader: a long stall.
const __LB = { list: [], n: 0, cam: null };
function __lightBudget(g) {
  const sc = g.scene;
  if (!sc) return;
  if (__LB.n++ % 45 === 0 || __LB.scene !== sc) {
    __LB.scene = sc;
    __LB.list.length = 0;
    sc.traverse((o) => o.isPointLight && __LB.list.push(o));
  }
  const q = Zw.getState().quality,
    kMap = q === 'high' ? 6 : q === 'low' ? 3 : 4,
    kFx = q === 'low' ? 1 : 2,
    cp = g.camera.position,
    maps = [],
    fx = [];
  for (const l of __LB.list) {
    if (!l.parent) continue;
    // lit lamps by nearness to the camera; effect lights by brightness; dark ones last
    const d2 = (l.position.x - cp.x) ** 2 + (l.position.y - cp.y) ** 2 + (l.position.z - cp.z) ** 2;
    l.__s = l.intensity > 0 ? (l.__mapLight ? 1e6 - d2 : l.intensity / (1 + d2 * 0.002)) : -1;
    (l.__mapLight ? maps : fx).push(l);
  }
  maps.sort((a, b) => b.__s - a.__s);
  fx.sort((a, b) => b.__s - a.__s);
  // if a map has fewer lamps than its share, effect lights take the spare slots (the total stays the same)
  const nMap = Math.min(kMap, maps.length),
    nFx = kFx + (kMap - nMap);
  maps.forEach((l, i) => (l.visible = i < nMap));
  fx.forEach((l, i) => (l.visible = i < nFx));
}
{
  const coreDet = __detTick;
  __detTick = function (g) {
    try {
      __lightBudget(g);
    } catch (e) {}
    return coreDet.apply(this, arguments);
  };
}
