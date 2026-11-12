/* ===== Bayou Protocol mod: colliders for everything you can see ===== */
// An audit of every map (each drawn object checked against the collision boxes at body height) found
// solid-looking things with no collider, which players and bots walked straight through:
//   - placed models (map.statics) whose box was never added: 7 parked cars on City, traffic cones on
//     Terminal and Blackwater Penitentiary
//   - prickly pear cacti that 24-vegetation.js places against walls inside the desert maps
// Each now gets a box collider sized to the model (rotated footprint), added when the map is built, so the
// physics world, bullets, line of sight and the core's own box solver all see it. Thin wall-mounted fittings
// (under 25 cm deep) are left alone: the player's 36 cm capsule never reaches them.
// window.__bpCollisionAudit() lists what was added per map.
const __WC = { added: {} };
function __wcCoverage(m, a) {
  let c = 0;
  const vol = (a.max.x - a.min.x) * (a.max.y - a.min.y) * (a.max.z - a.min.z);
  for (const b of m.boxes) {
    if (b.kind === 'glass' || b.max.x < a.min.x || b.min.x > a.max.x || b.max.z < a.min.z || b.min.z > a.max.z) continue;
    c +=
      Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x)) *
      Math.max(0, Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y)) *
      Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z));
  }
  return c / Math.max(1e-9, vol);
}
// model footprints (metres, unrotated: width along x, height, depth along z) where map.statics has no size
const __WC_SIZE = { cone: [0.36, 0.7, 0.36], hydrant: [0.4, 0.8, 0.4], dumpster: [1.9, 1.3, 1.1], 'car-sedan': [4.4, 1.45, 1.85], 'car-van': [4.9, 2.0, 2.0], 'car-hatchback': [3.9, 1.5, 1.85] };
function __wcAdd(m) {
  const added = [];
  const push = (min, max, mat, what) => {
    const b = { min, max, kind: 'prop', solid: !0, mat, pen: mat === 'metal' ? 2 : 1 };
    m.boxes.push(b);
    added.push(what);
  };
  for (const s of m.statics || []) {
    const sz = s.size || __WC_SIZE[s.model];
    if (!sz) continue;
    const r = s.rotY || 0,
      c = Math.abs(Math.cos(r)),
      n = Math.abs(Math.sin(r)),
      // a car's body is narrower than its mirrors and lower at the bonnet: 92% of the footprint, full height
      hx = ((sz[0] * c + sz[2] * n) / 2) * 0.92,
      hz = ((sz[0] * n + sz[2] * c) / 2) * 0.92,
      y0 = s.y || 0,
      a = { min: { x: s.x - hx, y: y0 + 0.1, z: s.z - hz }, max: { x: s.x + hx, y: y0 + sz[1], z: s.z + hz } };
    __wcCoverage(m, a) < 0.5 && push({ x: a.min.x, y: y0, z: a.min.z }, a.max, /car|dumpster|hydrant/.test(s.model) ? 'metal' : 'plastic', s.model);
  }
  for (const p of m.__veg || []) {
    if (p.t !== 'pear' || p.x < 0 || p.z < 0 || p.x > m.w || p.z > m.d) continue;
    const h = 0.35 * (p.s || 1),
      a = { min: { x: p.x - h, y: 0, z: p.z - h }, max: { x: p.x + h, y: 0.85 * (p.s || 1), z: p.z + h } };
    __wcCoverage(m, a) < 0.5 && push(a.min, a.max, 'dirt', 'cactus');
  }
  __WC.added[m.id || '?'] = added;
}
for (const id of Object.keys(XE)) {
  const f = XE[id];
  XE[id] = () => {
    const m = f();
    m.id || (m.id = id);
    try {
      __wcAdd(m);
    } catch (e) {
      console.warn('[collision] ' + id, e);
    }
    return m;
  };
}
typeof window < 'u' &&
  (window.__bpCollisionAudit = () => {
    for (const id of Object.keys(XE)) vT(id);
    return Object.fromEntries(Object.entries(__WC.added).map(([k, v]) => [k, v.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {})]));
  });
typeof window < 'u' && window.__phx && (window.__phx.map = () => aw());
