/* ===== Bayou Protocol mod: the radar shows the real map from above ===== */
// The minimap used to be drawn from the map's collision boxes (grey rectangles). Now, once a map has loaded,
// the real scene is rendered once from straight above (an orthographic camera looking down, image top =
// north, the whole map), textures, light and all, and that picture is the radar. The camera's near plane is
// set a few metres over the main floor, so roofs and ceilings are cut away and you see the floors, walls and
// props under them (each map its own height: open-air maps are seen whole). People are left out. Ridgeback
// keeps its own radar picture (53b-ridgeback.js). The walls are traced faintly on top, so they read clearly.
const __RAD = { cache: new Map(), last: null, busyFor: null, readyAt: 0 };
// where the roofs are cut (metres): just over the main floor's ceilings; the Fortress and Frostline are open
const __RAD_CUT = { prison: 3.2, cinema: 4.4, frostline: 9, fortress: 60 };
const __radKey = (m) => m.id + ':' + (Zw.getState().timeOfDay || 'day');
// draw the picture into the minimap's canvas (map coordinates, PM pixels a metre), the walls faintly over it
function __radDraw(c, img, m) {
  const x = c.getContext('2d');
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, c.width, c.height);
  x.imageSmoothingQuality = 'high';
  x.filter = 'brightness(1.18) contrast(1.06) saturate(1.08)';
  x.drawImage(img, 0, 0, c.width, c.height);
  x.filter = 'none';
  x.scale(c.width / m.w, c.height / m.d);
  x.fillStyle = 'rgba(236,240,250,0.22)';
  for (const b of m.__mmBoxes || m.boxes)
    b.kind === 'wall' && b.min.y < 2.5 && b.max.x - b.min.x < m.w * 0.9 && x.fillRect(b.min.x, b.min.z, Math.max(0.2, b.max.x - b.min.x), Math.max(0.2, b.max.z - b.min.z));
  x.restore();
}
{
  const coreRadar = hV;
  hV = function () {
    const c = coreRadar.apply(this, arguments),
      m = aw();
    if (m.__terrain || typeof document > 'u') return c;
    __RAD.last = { c, m };
    const img = __RAD.cache.get(__radKey(m));
    img && __radDraw(c, img, m);
    return c;
  };
}
// render the map from above (once per map and time of day), after it has loaded
function __radRender(s, m) {
  const gl = s.gl,
    scene = s.scene,
    W = m.w,
    D = m.d,
    ppm = Math.min(10, 1600 / Math.max(W, D)),
    pw = Math.round(W * ppm),
    ph = Math.round(D * ppm),
    cut = __RAD_CUT[m.id] ?? 3.6,
    // looking straight down, image top = -z (north); x right
    cam = new Cn(0, W, 0, -D, 0.02, cut + 90);
  cam.position.set(0, cut, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, cut - 1, 0);
  cam.updateMatrixWorld(!0);
  cam.updateProjectionMatrix();
  const rt = new Ti(pw, ph);
  rt.texture.colorSpace = 'srgb';
  // people, the sky and the fog are left out
  const hidden = [];
  scene.traverse((o) => {
    if (o.visible && (o.isSkinnedMesh || o.isSprite || o.isPoints || /player|bot|char|weapon|gun|tracer|sky/i.test(o.name || ''))) hidden.push(o), (o.visible = !1);
  });
  typeof __PR < 'u' && __PR.skyMesh && __PR.skyMesh.visible && (hidden.push(__PR.skyMesh), (__PR.skyMesh.visible = !1));
  const fog = scene.fog,
    bg = scene.background,
    cc = gl.getClearColor(new UA()),
    ca = gl.getClearAlpha(),
    prevRT = gl.getRenderTarget(),
    sm = gl.shadowMap.autoUpdate;
  scene.fog = null;
  scene.background = null;
  gl.shadowMap.autoUpdate = !1;
  gl.setClearColor(0x0b0f18, 1);
  let out = null;
  try {
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(scene, cam);
    const buf = new Uint8Array(pw * ph * 4);
    gl.readRenderTargetPixels(rt, 0, 0, pw, ph, buf);
    // (the pixels come bottom row first)
    const cv = document.createElement('canvas');
    cv.width = pw;
    cv.height = ph;
    const x = cv.getContext('2d'),
      im = x.createImageData(pw, ph),
      row = pw * 4;
    for (let y = 0; y < ph; y++) im.data.set(buf.subarray((ph - 1 - y) * row, (ph - y) * row), y * row);
    x.putImageData(im, 0, 0);
    out = cv;
  } catch (e) {
    console.warn('[radar]', e);
  } finally {
    gl.setRenderTarget(prevRT);
    gl.setClearColor(cc, ca);
    gl.shadowMap.autoUpdate = sm;
    scene.fog = fog;
    scene.background = bg;
    for (const o of hidden) o.visible = !0;
    rt.dispose();
  }
  return out;
}
{
  const prevTrees = kwA;
  kwA = function () {
    QI((s) => {
      try {
        const m = aw();
        if (!m || m.__terrain || !eA.state || eA.attract) return;
        const L = window.__bpLoading && window.__bpLoading();
        if (!L || L.state !== 'shown') return void (__RAD.readyAt = 0);
        const key = __radKey(m);
        if (__RAD.cache.has(key)) return;
        // (a moment after the loading screen lifts: the last textures and the light are in)
        const now = performance.now();
        if (!__RAD.readyAt || __RAD.busyFor !== key) return void ((__RAD.readyAt = now), (__RAD.busyFor = key));
        if (now - __RAD.readyAt < 1200) return;
        const img = __radRender(s, m);
        __RAD.cache.set(key, img || null);
        img && __RAD.last && __RAD.last.m === m && __radDraw(__RAD.last.c, img, m);
      } catch (e) {}
    });
    return M.jsx(prevTrees, {});
  };
}
typeof window < 'u' && (window.__bpRadar = () => ({ cached: [...__RAD.cache.keys()], last: __RAD.last && __RAD.last.m.id }));
