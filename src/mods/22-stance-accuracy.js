/* ===== Bayou Protocol mod: stance and aim accuracy ===== */
// Replaces the core spread function `_O`. Same arguments, used by the shot code, bots and the crosshair:
//   (weapon, moveFrac, onGround, crouch 0..1, recoil, scoped, ads 0..1)
// Changes from the core version:
//   - crouching is always more accurate, including scoped and aimed-down-sights shots (it used to be
//     overridden by the scope branch, so a crouched sniper was no steadier than a standing one)
//   - crouching also steadies movement spread and recoil bloom
//   - aiming down sights tightens hip spread a little more (72% instead of 70%)
// The dynamic crosshair reads this same function, so it visibly closes in when you crouch or aim.
_O = function (w, A, i, I, B, g, n = 0) {
  const c = Math.max(0, Math.min(1, +I || 0)),
    ads = Math.max(0, Math.min(1, +n || 0)),
    mv = Math.min(1, (+A || 0) * 1.4);
  let e = w.spread + w.moveSpread * mv * (1 - 0.3 * c);
  i || (e += 0.12);
  if (w.scope && g) e = 0.0015 + w.moveSpread * (+A || 0) * 1.5 * (1 - 0.3 * c);
  else if (!w.scope) e *= 1 - 0.72 * ads;
  e *= 1 - 0.4 * c;
  e += Math.min(0.06, (+B || 0) * 0.25) * (1 - 0.38 * ads) * (1 - 0.3 * c);
  return e;
};
