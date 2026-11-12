/* ===== Bayou Protocol mod: world labels respect line of sight ===== */
const __losC = new Map();
function __losTo(pos, h, key) {
  const S = eA.state,
    me = eA.human();
  if (!S || !me || !pos) return !0;
  const k = key || pos.x.toFixed(1) + ',' + pos.z.toFixed(1),
    n = performance.now(),
    c = __losC.get(k);
  if (c && n - c.t < 120) return c.v;
  let v = !0;
  try {
    const eye = Hi(me),
      d = Math.hypot(pos.x - eye.x, pos.z - eye.z);
    v =
      d < 70 &&
      (d < 1.5 ||
        Pg(eye, { x: pos.x, y: pos.y + h, z: pos.z }, aw().boxes) ||
        Pg(eye, { x: pos.x, y: pos.y + h * 0.45, z: pos.z }, aw().boxes));
  } catch (e) {
    v = !0;
  }
  __losC.set(k, { t: n + Math.random() * 40, v });
  __losC.size > 200 && __losC.clear();
  return v;
}
