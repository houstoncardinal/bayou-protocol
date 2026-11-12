/* ===== Bayou Protocol mod: surface detail (relief on tiled world materials, sharper textures at grazing angles) ===== */
const __det = { tex: null, last: 0, done: new WeakSet(), aniso: new WeakSet() };
function __detTex() {
  if (__det.tex) return __det.tex;
  const N = 256,
    h = new Float32Array(N * N);
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let o = 0; o < 5; o++) {
    const g = 4 << o,
      amp = 1 / (1 << o),
      G = new Float32Array(g * g);
    for (let i = 0; i < g * g; i++) G[i] = rnd();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * g,
          fy = (y / N) * g,
          x0 = Math.floor(fx),
          y0 = Math.floor(fy),
          tx = fx - x0,
          ty = fy - y0,
          sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty),
          a = G[(y0 % g) * g + (x0 % g)],
          b = G[(y0 % g) * g + ((x0 + 1) % g)],
          c = G[((y0 + 1) % g) * g + (x0 % g)],
          d = G[((y0 + 1) % g) * g + ((x0 + 1) % g)];
        h[y * N + x] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
      }
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const cx = cv.getContext('2d'),
    im = cx.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const l = h[y * N + ((x + N - 1) % N)],
        r = h[y * N + ((x + 1) % N)],
        u = h[((y + N - 1) % N) * N + x],
        d = h[((y + 1) % N) * N + x];
      let nx = (l - r) * 2.2,
        ny = (u - d) * 2.2,
        nz = 1;
      const k = 1 / Math.hypot(nx, ny, nz),
        i = (y * N + x) * 4;
      im.data[i] = (nx * k * 0.5 + 0.5) * 255;
      im.data[i + 1] = (ny * k * 0.5 + 0.5) * 255;
      im.data[i + 2] = (nz * k * 0.5 + 0.5) * 255;
      im.data[i + 3] = 255;
    }
  cx.putImageData(im, 0, 0);
  const t = new LI(cv);
  t.wrapS = t.wrapT = FI;
  t.anisotropy = 8;
  __det.tex = t;
  return t;
}
function __detTick(g) {
  const now = performance.now();
  if (now - __det.last < 1500) return;
  __det.last = now;
  const q = Zw.getState().quality,
    touch = document.documentElement.classList.contains('swat-touch'),
    relief = q !== 'low' && !touch;
  let max = 8;
  try {
    max = Math.min(16, g.gl.capabilities.getMaxAnisotropy());
  } catch (e) {}
  let n = 0;
  g.scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || n > 400) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (!m || !m.isMeshStandardMaterial) continue;
      const mp = m.map;
      if (mp && !__det.aniso.has(mp)) {
        __det.aniso.add(mp);
        if (mp.anisotropy < max && mp.wrapS === FI) {
          mp.anisotropy = max;
          mp.needsUpdate = !0;
        }
      }
      if (!relief || __det.done.has(m)) continue;
      __det.done.add(m);
      if (!mp || mp.wrapS !== FI || m.normalMap || m.transparent || m.userData.noDetail) continue;
      const t = __detTex().clone();
      t.repeat.copy(mp.repeat).multiplyScalar(3.4);
      t.offset.copy(mp.offset);
      t.needsUpdate = !0;
      m.normalMap = t;
      m.normalScale = new aA(0.36, 0.36);
      m.needsUpdate = !0;
      n++;
    }
  });
}
