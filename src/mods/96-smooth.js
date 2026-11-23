/* ===== Bayou Tactical mod: smooth everywhere, sharp on big screens ===== */
// 1. No shader hitches. The first time three.js draws a material in a given way it compiles a shader for it, and
//    that stops the frame (a fraction of a second for one, seconds for a room full of new things: the fridge's
//    window froze the game this way). Which shader a material gets depends on where it is drawn: the world is
//    drawn into the effect chain's render target (no tone mapping, a linear target), not straight to the screen,
//    so warm-ups that compiled "for the screen" (38-performance.js, 54-speed.js, the condo's) compiled shaders the
//    game then never used. Now:
//      - the render target the world is drawn into is noted (the first frame of every scene)
//      - __smoothCompile(gl, object, camera, scene) compiles an object's materials for that target and for the
//        screen, in the background (the browser's parallel shader compiling)
//      - through a match, everything new in the scene (characters, guns, effects, map parts that load late) is
//        found within a second and a half and compiled the same way, a few subtrees at a time, before it is
//        first in view
// 2. Super-ultrawide screens. The field of view setting is vertical, and the view widens with the screen: 112
//    degrees across on 16:9, 126 on 21:9, but 143 on 32:9 (5120 x 1440, 3840 x 1080). At 143 degrees the game
//    draws far more of the world every frame (more objects, more shadow casters) for a picture that stretches at
//    its edges like a fisheye. Wider than 21:9, the view stays 126 degrees across (the extra width shows the same
//    view, larger): faster, and no distortion. 21:9 and narrower are unchanged.
// 3. Sharp on big screens. Each quality has a pixel budget (Low 1.6, Medium 2.6, High 3.7 million pixels), and a
//    bigger screen is drawn at that budget and scaled up, which softens it. The sharpening in the effect chain
//    (Medium and Low had it at a fixed strength, High had none) now follows the scale: none at native resolution,
//    stronger the more the picture is enlarged, so fine detail and edges stay crisp at no cost in frame rate.
const __SMOOTH = { rt: null, scene: null, seen: new WeakSet(), last: 0, matchAt: 0, match: null, n: 0, kpc: void 0, err: null };
// the render target the world is drawn into (three.js puts render() on each renderer, not on its prototype: the
// game's renderer is wrapped when it is first seen)
function __smoothHook(gl) {
  if (!gl || gl.__smooth) return;
  gl.__smooth = 1;
  const coreRender = gl.render;
  gl.render = function (scene, camera) {
    if (scene && scene === __SMOOTH.scene && !scene.overrideMaterial) {
      const rt = this.getRenderTarget();
      rt && rt !== __SMOOTH.rt && !rt.isXRRenderTarget && rt.texture && !rt.__fwWindow && (__SMOOTH.rt = rt);
    }
    return coreRender.apply(this, arguments);
  };
}
// The first-person view is a scene of its own inside the root scene, with its own lights, hidden while the world
// is drawn. A compile for the world collects lights from the whole root, so with the view showing (between frames)
// its lights were counted too, and the world's shaders came out for a light count it is never drawn with. World
// compiles (here, the loading screen's, 42-smooth's and 54-speed's) run with it hidden for that moment.
function __withoutVm(scene, fn) {
  const vm = typeof window < 'u' && window.__vmScene;
  if (!vm || vm === scene || !vm.visible) return fn();
  let inside = !1;
  for (let v = vm.parent; v; v = v.parent) if (v === scene) inside = !0;
  if (!inside) return fn();
  vm.visible = !1;
  try {
    return fn();
  } finally {
    vm.visible = !0;
  }
}
function __hasLight(o) {
  let f = !1;
  o.traverse((x) => x.isLight && (f = !0));
  return f;
}
function __lightFree(o, out = []) {
  for (const c of o.children) c.isLight ? 0 : __hasLight(c) ? __lightFree(c, out) : out.push(c);
  return out;
}
function __smoothCompile(gl, obj, camera, scene) {
  if (!gl || !obj || !camera || !scene || !gl.compileAsync) return;
  __SMOOTH.kpc === void 0 && (__SMOOTH.kpc = !!(gl.extensions && gl.extensions.has('KHR_parallel_shader_compile')));
  const prev = gl.getRenderTarget(),
    // (three.js counts the lights of both the object and the scene: an object holding lights (the sun's group)
    // had them counted twice, and its shaders came out for a count never drawn; such an object is compiled in
    // light-free parts)
    parts = obj !== scene && __hasLight(obj) ? __lightFree(obj) : [obj],
    run = () => __withoutVm(scene, () => { for (const o of parts) __SMOOTH.kpc ? gl.compileAsync(o, camera, scene).catch(() => {}) : gl.compile(o, camera, scene); });
  try {
    obj.updateMatrixWorld && obj.updateMatrixWorld(!0);
    // the world is drawn only into the effect chain's target, the first-person view only to the screen: each
    // compiled for its own (both for both was a second, unused set of every shader: slow on phones)
    const vm = typeof window < 'u' && window.__vmScene,
      first = !!vm && (scene === vm || obj === vm);
    if (__SMOOTH.rt && !first) {
      gl.setRenderTarget(__SMOOTH.rt);
      run();
    }
    if (first || !__SMOOTH.rt) {
      gl.setRenderTarget(null);
      run();
    }
    __SMOOTH.n++;
  } catch (e) {
    __SMOOTH.err = String(e && e.stack);
  } finally {
    gl.setRenderTarget(prev);
  }
}
// through a match: whatever is new in the scene, compiled before it is seen (only where the browser compiles in the
// background: elsewhere a compile blocks just as it would when first drawn)
function __smoothScan(st) {
  const gl = st.gl,
    sc = st.scene;
  if (!gl || !sc || !st.camera) return;
  __SMOOTH.scene = sc;
  if (!__SMOOTH.kpc) return void (__SMOOTH.kpc === void 0 && (__SMOOTH.kpc = !!(gl.extensions && gl.extensions.has('KHR_parallel_shader_compile'))));
  const seen = __SMOOTH.seen,
    todo = [];
  // (the first-person view is a scene of its own, drawn with its own lights, somewhere under the root: compiled
  // with the world, its lights were added to the world's and every shader came out for a light count never
  // drawn. A subtree holding it is opened up and its other branches compiled one by one.)
  const vm = typeof window < 'u' && window.__vmScene,
    holds = (o) => {
      for (let v = vm; v; v = v.parent) if (v === o) return !0;
      return !1;
    },
    tops = [];
  const open = (o) => {
    for (const c of o.children) c === vm || c.isScene ? 0 : vm && holds(c) ? open(c) : tops.push(c);
  };
  open(sc);
  for (const top of tops) {
    let fresh = !1;
    top.traverse((o) => {
      const m = o.material;
      if (!m) return;
      for (const x of Array.isArray(m) ? m : [m]) x && !seen.has(x) && (seen.add(x), (fresh = !0));
    });
    fresh && todo.push(top);
  }
  // a few subtrees a time (each compile walks the scene for its lights)
  for (const t of todo.slice(0, 3)) __smoothCompile(gl, t, st.camera, sc);
  // anything left over is picked up next time
  for (const t of todo.slice(3))
    t.traverse((o) => {
      const m = o.material;
      if (m) for (const x of Array.isArray(m) ? m : [m]) x && seen.delete(x);
    });
}
typeof window < 'u' &&
  setInterval(() => {
    try {
      const g = typeof __R3F < 'u' && __R3F,
        st = g && (g.get ? g.get() : g);
      if (!st || !st.scene) return;
      __SMOOTH.scene = st.scene;
      __smoothHook(st.gl);
      const m = eA.state;
      if (!m || eA.attract) return;
      m !== __SMOOTH.match && ((__SMOOTH.match = m), (__SMOOTH.matchAt = performance.now()));
      // every 1.5 s for the first two minutes of a match, every 5 s after
      const now = performance.now(),
        every = now - __SMOOTH.matchAt < 12e4 ? 1500 : 5000;
      if (now - __SMOOTH.last < every) return;
      __SMOOTH.last = now;
      __smoothScan(st);
    } catch (e) {
      __SMOOTH.err = String(e && e.stack);
    }
  }, 500);
// ---------------------------------------------------------------- super-ultrawide: the view no wider than 21:9's
{
  const CAP = 2.4,
    coreFov = nl;
  nl = function (cam, fov) {
    const a = (cam && cam.aspect) || 1;
    if (a > CAP && fov > 0) {
      const across = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * CAP);
      fov = (2 * Math.atan(Math.tan(across / 2) / a) * 180) / Math.PI;
    }
    return coreFov.call(this, cam, fov);
  };
}
// ---------------------------------------------------------------- sharpening that follows the upscale
{
  const prevFx = hiA;
  hiA = function (props) {
    const q = props.quality,
      mine = S.useMemo(() => (q === 'high' ? new Z_(0) : null), [q]),
      ref = S.useRef(null);
    S.useEffect(() => () => mine && mine.dispose && mine.dispose(), [mine]);
    QI((st) => {
      const fx = ref.current;
      if (!fx || !st.gl) return;
      const up = (window.devicePixelRatio || 1) / Math.max(0.1, st.gl.getPixelRatio()),
        over = Math.max(0, up - 1),
        amt = q === 'high' ? (up > 1.08 ? Math.min(0.6, 0.18 + over * 0.5) : 0) : Math.min(1, 0.55 + over * 0.5),
        u = fx.uniforms && fx.uniforms.get('uAmount');
      u && Math.abs(u.value - amt) > 0.005 && (u.value = amt);
    });
    const el = prevFx.apply(this, arguments);
    if (!el || !el.props) return el;
    const kids = [].concat(el.props.children || []);
    // the chain's own sharpening (Medium, Low), or ours added last (High)
    const own = kids.find((c) => c && c.props && c.props.object instanceof Z_);
    ref.current = own ? own.props.object : mine;
    if (own || !mine) return el;
    return S.cloneElement(el, null, ...kids, M.jsx('primitive', { object: mine, dispose: null }, 'sharp-up'));
  };
}
typeof window < 'u' &&
  (window.__bpSmooth = () => {
    const g = typeof __R3F < 'u' && __R3F,
      st = g && (g.get ? g.get() : g);
    return {
      target: __SMOOTH.rt ? { type: __SMOOTH.rt.texture.type, colorSpace: __SMOOTH.rt.texture.colorSpace, w: __SMOOTH.rt.width, h: __SMOOTH.rt.height } : null,
      compiles: __SMOOTH.n,
      parallel: __SMOOTH.kpc,
      programs: st && st.gl.info.programs ? st.gl.info.programs.length : null,
      fov: st && +st.camera.fov.toFixed(1),
      aspect: st && +st.camera.aspect.toFixed(2),
      dpr: st && +st.gl.getPixelRatio().toFixed(2),
      err: __SMOOTH.err,
    };
  });
