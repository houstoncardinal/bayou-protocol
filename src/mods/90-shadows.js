/* ===== Bayou Protocol mod: sun shadows (cascades, soft contact-hardening edges) ===== */
// Before: one shadow map for the sun (2048 x 2048 on Medium and on High with an ordinary GPU), stretched over a
// 96 m square that follows the camera. Each shadow texel was about 5 cm, filtered with three.js's fixed
// 17-tap PCF, so a crate's or a player's shadow was a faint smudge with stair-stepped edges, and nothing more
// than about 65 m ahead had a shadow at all. On Ridgeback Pass the rocks and trees cast none (the map package
// only turns their shadows on with its own "high" scenery, which only Pro / Max class GPUs get).
//
// Now, on Medium and High, the sun's shadow comes from cascades: several shadow maps of the same sun, each
// covering a bigger square round the player, so the shadow is sharpest where the player looks closely:
//   High    3 cascades: 22 m square at 2048 (1.1 cm a texel), 80 m at 2048 (3.9 cm),
//           280 m at 1536 (18 cm, redrawn every other frame: it is the one with the most to draw)
//   Medium  2 cascades: 26 m at 2048 (1.3 cm), 112 m at 2048 (5.5 cm)
//   Low     unchanged (phones): the core's single 1024 map
// Why cascades and not one sharp map that follows the player plus the old one for distance: that is the
// same thing with two cascades, and it needs the same shader change to choose between them (two lights
// each adding the sun's light would light the ground twice). Once the choice is in the shader, a third map
// for the far distance costs one more shadow pass and no extra work per pixel (each pixel reads one map,
// two only in the narrow band where one cascade hands over to the next). The cascades are fixed squares
// round the camera (pushed ahead of it, where the player looks), not fitted to the view each frame: their
// size never changes, so with their position snapped to whole texels in the sun's own frame, the shadows
// do not crawl or shimmer as the player walks and turns.
//
// How it fits in three.js: the game's own sun (the directional light in UiA) stays the light and stays the
// first cascade; the others are extra directional lights with no brightness that only own a shadow map
// (src/mods/89-sky.js or anything else that moves the sun is followed: every shadow pass reads the sun's
// direction from where the sun and its target actually are). three.js's lighting code (the shader chunk
// lights_fragment_begin) is patched for scenes with more than one sun shadow map: the first directional
// light gets the cascaded shadow, the cascade helpers add nothing, every other light is unchanged. Scenes
// with one or no sun shadow (Low, the first-person view, menu previews) compile the original code.
//
// The edges: a contact-hardening filter (PCSS). A few samples look round the pixel for whatever casts the
// shadow; the further that is from the surface, the wider the soft edge: a crate's shadow is crisp where it
// meets the ground and softens away from it, a tree's is soft. The widths are in metres, not texels, so
// they match where one cascade hands over to the next. Then 16 samples (12 on Medium) spread over that
// width, turned by a fixed per-pixel pattern. Pixels fully lit or fully in shadow stop after the first
// 9 samples. Bias: each cascade lifts the surface towards the sun by about one of its texels along the
// surface's normal (three.js's normalBias), and a slope-scaled bias grows with how far each sample reaches,
// so sloping ground and walls do not shadow themselves (acne). three.js draws the back faces of closed
// models into shadow maps, which keeps peter-panning (shadows detached from their casters) to about a texel.
//
// The menus' background match still redraws its shadows once a second (54-speed.js); Medium still redraws
// shadows every other frame (the core). When the scene is drawn more than once in a frame (another pass,
// the radar), the cascades are drawn only for the first.

const __CSM = {
  off: !1, // test hook: true = the core's single shadow, for before / after comparisons
  tier: '',
  scene: null,
  gl: null,
  sun: null,
  extra: [], // the cascade helper lights (index 1..)
  group: null,
  dir: null,
  placed: null,
  frame: 0,
  drawnFrame: '',
  n: 0,
  findAt: 0,
  stats: { passes: 0, skipped: 0 },
};
// Cascade squares: h is half the side in metres; size the shadow map; every: redrawn on every n-th shadow pass
const __SH_TIERS = {
  medium: [
    { h: 13, size: 2048, every: 1 },
    { h: 56, size: 2048, every: 1 },
  ],
  high: [
    { h: 11, size: 2048, every: 1 },
    { h: 40, size: 2048, every: 1 },
    { h: 140, size: 1536, every: 2 },
  ],
};
// the shadow cameras sit 300 m towards the sun from the square's centre and see 600 m deep: every cascade
// has the same depth range, so the shader turns a depth difference into metres with one constant
const __SH_BACK = 300,
  __SH_NEAR = 1,
  __SH_FAR = 600;
// Filter settings (metres): the widest search for casters round a pixel, the soft edge's width per metre
// between caster and surface (about three times the real sun's 0.5 degrees: the sky's light softens it
// further), and the narrowest edge (keeps edges anti-aliased up close)
const __SH_SEARCH = 0.35,
  __SH_SOFT = 0.012,
  __SH_MIN = 0.012;

// ---------------------------------------------------------------- the shader
function __shDisk(n) {
  // a Vogel (sunflower) disk: n points spread evenly over a unit disk; z is each point's distance from the centre
  const p = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt((i + 0.5) / n),
      t = i * 2.399963;
    p.push(`vec3( ${(r * Math.cos(t)).toFixed(5)}, ${(r * Math.sin(t)).toFixed(5)}, ${r.toFixed(5)} )`);
  }
  return `vec3[ ${n} ]( ${p.join(', ')} )`;
}
const __SH_PARS = `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
	// Bayou Protocol (src/mods/90-shadows.js): the sun's shadow from ${'cascades'}, contact-hardening edges
	#define BP_RANGE ${(__SH_FAR - __SH_NEAR).toFixed(1)}
	#define BP_SEARCH ${__SH_SEARCH.toFixed(4)}
	#define BP_SOFT ${__SH_SOFT.toFixed(4)}
	#define BP_MIN ${__SH_MIN.toFixed(4)}
	#define BP_BAND 0.08
	#if NUM_DIR_LIGHT_SHADOWS > 2
		#define BP_TAPS 16
		const vec3 bpPcf[ 16 ] = ${__shDisk(16)};
	#else
		#define BP_TAPS 12
		const vec3 bpPcf[ 12 ] = ${__shDisk(12)};
	#endif
	const vec3 bpFind[ 8 ] = ${__shDisk(8)};
	float bpDepth( sampler2D m, vec2 uv ) {
		return unpackRGBAToDepth( textureLod( m, uv, 0.0 ) );
	}
	// one cascade: c = shadow-map position (xy) and depth (z, bias applied); boxW = the square's side in
	// metres; slope = tan of the angle between the surface and the sun (for the slope-scaled bias)
	float bpFilter( sampler2D m, vec2 mapSize, float boxW, vec3 c, float slope, mat2 rot ) {
		float texel = 1.0 / mapSize.x;
		float toUV = 1.0 / boxW;
		float k = boxW * slope / BP_RANGE;   // depth change per uv step along the slope
		float findR = max( BP_SEARCH * toUV, 3.0 * texel );
		// 1. what casts the shadow, and how far above the surface (its average depth)
		float sum = 0.0, n = 0.0;
		float z0 = c.z - texel * k;
		float b = bpDepth( m, c.xy );
		if ( b < z0 ) { sum += b; n += 1.0; }
		for ( int i = 0; i < 8; i ++ ) {
			vec3 d = bpFind[ i ];
			b = bpDepth( m, c.xy + rot * d.xy * findR );
			if ( b < c.z - ( texel + d.z * findR ) * k ) { sum += b; n += 1.0; }
		}
		if ( n < 0.5 ) return 1.0;   // nothing near: fully lit
		if ( n > 8.5 ) return 0.0;   // surrounded: fully in shadow
		// 2. the soft edge's width grows with the distance from the caster
		float soft = ( c.z - sum / n ) * BP_RANGE * BP_SOFT;
		float r = clamp( soft * toUV, max( BP_MIN * toUV, 1.2 * texel ), findR );
		float lit = 0.0;
		for ( int i = 0; i < BP_TAPS; i ++ ) {
			vec3 d = bpPcf[ i ];
			lit += step( c.z - ( texel + d.z * r ) * k, bpDepth( m, c.xy + rot * d.xy * r ) );
		}
		return lit / float( BP_TAPS );
	}
	// how far inside a cascade's square a shadow-map position is (in uv), less the filter's reach; negative outside
	float bpInside( vec3 c, float boxW ) {
		return c.z < 1.0 ? min( min( c.x, 1.0 - c.x ), min( c.y, 1.0 - c.y ) ) - ( BP_SEARCH + 0.05 ) / boxW : -1.0;
	}
	#define BP_CASCADE( i ) bpFilter( directionalShadowMap[ i ], directionalLightShadows[ i ].shadowMapSize, directionalLightShadows[ i ].shadowRadius, vDirectionalShadowCoord[ i ].xyz + vec3( 0.0, 0.0, directionalLightShadows[ i ].shadowBias ), slope, rot )
	// the sun's shadow at this pixel: n = the surface normal, l = the direction to the sun (view space)
	float bpSunShadow( vec3 n, vec3 l ) {
		float NoL = dot( n, l );
		if ( NoL <= 0.0 ) return 1.0;   // faces away: the sun adds nothing here anyway
		float slope = min( sqrt( max( 1.0 - NoL * NoL, 0.0 ) ) / NoL, 3.0 );
		// a fixed per-pixel turn of the sample pattern (interleaved gradient noise): the samples of
		// neighbouring pixels interleave, so a few samples give a smooth edge without banding
		float a = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
		mat2 rot = mat2( cos( a ), sin( a ), - sin( a ), cos( a ) );
		float s = 1.0, e, f;
		e = bpInside( vDirectionalShadowCoord[ 0 ].xyz, directionalLightShadows[ 0 ].shadowRadius );
		if ( e > 0.0 ) {
			s = BP_CASCADE( 0 );
			f = smoothstep( 0.0, BP_BAND, e );
			if ( f < 1.0 ) s = mix( BP_CASCADE( 1 ), s, f );
		} else {
			e = bpInside( vDirectionalShadowCoord[ 1 ].xyz, directionalLightShadows[ 1 ].shadowRadius );
			if ( e > 0.0 ) {
				s = BP_CASCADE( 1 );
				f = smoothstep( 0.0, BP_BAND, e );
				#if NUM_DIR_LIGHT_SHADOWS > 2
				if ( f < 1.0 ) s = mix( BP_CASCADE( 2 ), s, f );
				#else
				s = mix( 1.0, s, f );
				#endif
			}
			#if NUM_DIR_LIGHT_SHADOWS > 2
			else {
				e = bpInside( vDirectionalShadowCoord[ 2 ].xyz, directionalLightShadows[ 2 ].shadowRadius );
				if ( e > 0.0 ) s = mix( 1.0, BP_CASCADE( 2 ), smoothstep( 0.0, BP_BAND, e ) );
			}
			#endif
		}
		return mix( 1.0, s, directionalLightShadows[ 0 ].shadowIntensity );
	}
#endif
`;
// lights_fragment_begin: with cascades, light 0 (the sun) takes the cascaded shadow, the cascade helpers
// (1 .. NUM_DIR_LIGHT_SHADOWS - 1) are skipped, other directional lights are drawn as before
const __SH_DIR = `#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
	DirectionalLight directionalLight;
	float bpSun = receiveShadow ? bpSunShadow( geometryNormal, directionalLights[ 0 ].direction ) : 1.0;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		#if ( UNROLLED_LOOP_INDEX == 0 ) || ( UNROLLED_LOOP_INDEX >= NUM_DIR_LIGHT_SHADOWS )
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if ( UNROLLED_LOOP_INDEX == 0 )
		directLight.color *= bpSun;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		#endif
	}
	#pragma unroll_loop_end
#else
`;
{
  const begin = Lw.lights_fragment_begin,
    a = begin.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )'),
    b = a < 0 ? -1 : begin.indexOf('#endif', begin.indexOf('#pragma unroll_loop_end', a));
  if (a < 0 || b < 0 || !Lw.shadowmap_pars_fragment.includes('uniform DirectionalLightShadow directionalLightShadows')) {
    console.warn('[shadows] three.js shader chunks changed: cascades off');
    __CSM.broken = !0;
  } else {
    const end = b + '#endif'.length;
    Lw.lights_fragment_begin = begin.slice(0, a) + __SH_DIR + begin.slice(a, end) + '\n#endif' + begin.slice(end);
    Lw.shadowmap_pars_fragment += __SH_PARS;
  }
}

// ---------------------------------------------------------------- the lights
// the core's settings for its sun, put back on Low (TiA in the core: shadowSize from the canvas, s from it)
function __shCoreSun(sun, q) {
  const A = q === 'high' && __strongGpu() ? 3072 : q !== 'low' ? 2048 : 1024,
    s = A >= 4096 ? 64 : A >= 2048 ? 48 : 36,
    sh = sun.shadow,
    c = sh.camera;
  __shSize(sh, A);
  c.left = c.bottom = -s;
  c.right = c.top = s;
  c.near = 10;
  c.far = 260;
  c.updateProjectionMatrix();
  sh.bias = -25e-5;
  sh.normalBias = 0.05;
  sh.radius = 1;
  sh.autoUpdate = !0;
}
function __shSize(sh, n) {
  if (sh.mapSize.x === n && sh.mapSize.y === n && (!sh.map || sh.map.width === n)) return;
  sh.mapSize.set(n, n);
  // three.js only makes a shadow map when there is none: a new size needs the old one gone
  sh.map && (sh.map.dispose(), (sh.map = null));
}
function __shSetup(light, cfg) {
  const sh = light.shadow,
    c = sh.camera,
    texel = (2 * cfg.h) / cfg.size;
  __shSize(sh, cfg.size);
  if (c.right !== cfg.h || c.near !== __SH_NEAR || c.far !== __SH_FAR) {
    c.left = c.bottom = -cfg.h;
    c.right = c.top = cfg.h;
    c.near = __SH_NEAR;
    c.far = __SH_FAR;
    c.updateProjectionMatrix();
  }
  sh.radius = 2 * cfg.h; // read by the shader as the square's side in metres (radius is otherwise unused here)
  sh.normalBias = texel;
  sh.bias = -(0.5 * texel) / (__SH_FAR - __SH_NEAR);
  sh.autoUpdate = cfg.every <= 1;
}
function __shFindSun(scene) {
  let sun = null;
  scene.traverse((o) => {
    if (sun || !o.isDirectionalLight || o.userData.__shCascade) return;
    (o.castShadow || o.userData.__shSun) && (sun = o);
  });
  return sun;
}
function __shRemoveExtra() {
  for (const l of __CSM.extra) {
    l.removeFromParent();
    l.target.removeFromParent();
    l.dispose();
  }
  __CSM.extra.length = 0;
}
function __shApply(st) {
  const scene = st.scene,
    q = Zw.getState().quality,
    // (High's three cascades and wider filter only on a strong graphics card: on a base Apple M chip or
    // integrated graphics they cost about 4 ms a frame at 1600 x 900; there High gets Medium's two cascades)
    want = __CSM.off || __CSM.broken ? '' : q === 'high' ? (__strongGpu() ? 'high' : 'medium') : q === 'medium' ? 'medium' : '';
  if (scene !== __CSM.scene) {
    __shRemoveExtra();
    __CSM.group && __CSM.group.removeFromParent();
    __CSM.scene = scene;
    __CSM.group = null;
    __CSM.sun = null;
    __CSM.tier = '';
  }
  // the sun: found again when it has gone (time-of-day remounts, a new canvas)
  let sun = __CSM.sun;
  if (!sun || !sun.parent || sun.visible === !1) {
    const now = performance.now();
    if (now < __CSM.findAt) return;
    __CSM.findAt = now + 500;
    sun = __CSM.sun = __shFindSun(scene);
    __CSM.tier = '';
    __CSM.dir = null;
    if (!sun) return __shRemoveExtra();
    sun.userData.__shSun = 1;
  }
  if (want === __CSM.tier) {
    if (__CSM.tier) {
      __CSM.group.parent !== scene && scene.add(__CSM.group);
      // the core re-applies its own shadow size and square when its props change (quality, time of day)
      __shSetup(sun, __CSM.cfg[0]);
    }
    return;
  }
  __CSM.tier = want;
  if (!want) {
    __shRemoveExtra();
    __shCoreSun(sun, q);
    return;
  }
  const T = __SH_TIERS[want];
  __shSetup(sun, T[0]);
  if (!__CSM.group) {
    __CSM.group = new ji();
    __CSM.group.name = 'bp-sun-cascades';
  }
  // the helpers come after the sun in the scene (three.js numbers shadow-casting lights in scene order, and
  // the shader takes light 0 as the sun): the group is the scene's last child
  scene.add(__CSM.group);
  while (__CSM.extra.length > T.length - 1) {
    const l = __CSM.extra.pop();
    l.removeFromParent();
    l.target.removeFromParent();
    l.dispose();
  }
  while (__CSM.extra.length < T.length - 1) {
    const l = new Os('#000000', 0);
    l.name = 'bp-sun-cascade-' + (__CSM.extra.length + 1);
    l.castShadow = !0;
    l.userData.__shCascade = 1;
    __CSM.group.add(l, l.target);
    __CSM.extra.push(l);
  }
  __CSM.extra.forEach((l, i) => {
    __shSetup(l, T[i + 1]);
    l.shadow.needsUpdate = !0;
  });
  __CSM.cfg = T;
}
// ---------------------------------------------------------------- placing the cascades (every shadow pass)
const __shV = { a: new U(), b: new U(), x: new U(), y: new U(), z: new U(), f: new U(), c: new U(), up: new U(0, 1, 0) };
function __shPlace(light, target, cfg, cam) {
  const V = __shV,
    texel = (2 * cfg.h) / cfg.size;
  // the square's centre: ahead of the camera, where the player looks (0.45 of its half-side)
  V.c.copy(cam.position).addScaledVector(V.f, cfg.h * 0.45);
  // snapped to whole texels across the sun's view, so the map's texels stay put on the ground
  const cx = Math.round(V.c.dot(V.x) / texel) * texel,
    cy = Math.round(V.c.dot(V.y) / texel) * texel,
    cz = V.c.dot(V.z);
  V.c.copy(V.x).multiplyScalar(cx).addScaledVector(V.y, cy).addScaledVector(V.z, cz);
  V.a.copy(V.c).addScaledVector(V.z, __SH_BACK);
  light.parent ? light.position.copy(light.parent.worldToLocal(V.a)) : light.position.copy(V.a);
  V.b.copy(V.c);
  target.parent ? target.position.copy(target.parent.worldToLocal(V.b)) : target.position.copy(V.b);
  light.updateMatrixWorld();
  target.updateMatrixWorld();
}
function __shBeforeShadows(sm, lights, camera) {
  const sun = __CSM.sun;
  if (!__CSM.tier || !sun || !__CSM.cfg || !(sm.autoUpdate || sm.needsUpdate)) return !0;
  const st = __R3F && (__R3F.get ? __R3F.get() : __R3F);
  if (!st || camera !== st.camera) return !0; // another view (the radar): left as it is
  // drawn once a frame: a second render of the scene in the same frame reuses this frame's maps (a frame is
  // told apart by the game's tick count and the canvas clock, so neither one alone can freeze the shadows)
  const stamp = __CSM.frame + ':' + (st.clock ? st.clock.elapsedTime : performance.now());
  if (__CSM.drawnFrame === stamp) return !1;
  __CSM.drawnFrame = stamp;
  // the sun must be the first shadow-casting directional light (the shader's light 0)
  let first = null;
  for (const l of lights) if (l.isDirectionalLight) { first = l; break; }
  if (first !== sun) {
    __CSM.scene && __CSM.group && __CSM.scene.add(__CSM.group);
    __CSM.stats.order = (__CSM.stats.order || 0) + 1;
  }
  const V = __shV;
  // the sun's direction, from where the sun and its target are (the core, or anything else, moves them)
  V.a.setFromMatrixPosition(sun.matrixWorld);
  V.b.setFromMatrixPosition(sun.target.matrixWorld);
  if (!__CSM.placed || V.a.distanceToSquared(__CSM.placed) > 1e-8 || !__CSM.dir) {
    V.z.subVectors(V.a, V.b);
    V.z.lengthSq() > 1e-8 && (__CSM.dir = (__CSM.dir || new U()).copy(V.z.normalize()));
  }
  if (!__CSM.dir) return !0;
  V.z.copy(__CSM.dir);
  // the sun's view: the same axes three.js gives its shadow camera (lookAt with +Y up)
  V.x.crossVectors(V.up, V.z);
  V.x.lengthSq() < 1e-8 && V.x.set(1, 0, 0);
  V.x.normalize();
  V.y.crossVectors(V.z, V.x);
  // flat forward direction of the camera
  camera.getWorldDirection(V.f);
  V.f.y = 0;
  V.f.lengthSq() > 1e-6 ? V.f.normalize() : V.f.set(0, 0, 0);
  const n = ++__CSM.n,
    T = __CSM.cfg;
  __shPlace(sun, sun.target, T[0], camera);
  (__CSM.placed = __CSM.placed || new U()).setFromMatrixPosition(sun.matrixWorld);
  __CSM.extra.forEach((l, i) => {
    const cfg = T[i + 1];
    l.shadow.camera.layers.mask = sun.shadow.camera.layers.mask; // the maps' shadow-only casters (layer 1)
    if (cfg.every > 1 && n % cfg.every !== i % cfg.every && l.shadow.map) return; // not this pass: keeps its map and place
    cfg.every > 1 && (l.shadow.needsUpdate = !0);
    __shPlace(l, l.target, cfg, camera);
  });
  __CSM.stats.passes++;
  return !0;
}
function __shHook(gl) {
  const sm = gl.shadowMap;
  if (sm.__shHooked) return;
  sm.__shHooked = 1;
  const coreRender = sm.render;
  sm.render = function (lights, scene, camera) {
    let go = !0;
    try {
      go = __shBeforeShadows(this, lights, camera);
    } catch (e) {
      __CSM.err = String(e);
    }
    if (go) return coreRender.apply(this, arguments);
    // this frame's maps are already drawn: draw nothing (and leave the update flags as they were)
    __CSM.stats.skipped++;
    const au = this.autoUpdate,
      nu = this.needsUpdate;
    this.autoUpdate = this.needsUpdate = !1;
    try {
      return coreRender.apply(this, arguments);
    } finally {
      this.autoUpdate = au;
      this.needsUpdate = nu;
    }
  };
}

// ---------------------------------------------------------------- casters the maps leave out
// Ridgeback Pass: the package casts its rocks' and trees' shadows only with its "high" scenery (Pro / Max
// GPUs). Here the near rocks cast on Medium and High, and the near trees (full-detail, within 26-36 m) on High:
// their needles are alpha-tested, so the shadow is the shape of the branches. Small ground cover stays
// without (ferns, pebbles, roots: the package's decoration list, which it never lets cast).
const __SH_RB_DECOR = /^(fern_|dry_branches|rock_07|rock_09|stone_01|shrub_0[234]|namaqualand_rocks|root_cluster_02|single_root|bark_debris|pine_roots)/;
function __shRidgeback(q) {
  const v = typeof __RB < 'u' && __RB.view,
    data = typeof __RB < 'u' && __RB.data;
  if (!v || !v.group || !data || !data.assets) return;
  const key = q + ':' + __CSM.tier;
  if (v.group.userData.__shCast === key) return;
  v.group.userData.__shCast = key;
  v.group.traverse((o) => {
    if (!o.isInstancedMesh) return;
    const m = /^(.+)@lod(\d)$/.exec(o.name);
    if (!m || __SH_RB_DECOR.test(m[1])) return;
    const info = data.assets[m[1]];
    if (!info) return;
    o.userData.__shCast0 === void 0 && (o.userData.__shCast0 = o.castShadow);
    const tree = info.kind === 'tree',
      lod = +m[2];
    let cast = o.userData.__shCast0;
    if (__CSM.tier && lod === 0) cast = tree ? __CSM.tier === 'high' : !0;
    o.castShadow = cast;
  });
}

// ---------------------------------------------------------------- every frame
{
  const coreDet = __detTick;
  __detTick = function (g) {
    try {
      __CSM.frame++;
      if (g && g.scene && g.gl) {
        g.gl !== __CSM.gl && ((__CSM.gl = g.gl), __shHook(g.gl));
        __shApply(g);
        (__CSM.frame & 31) === 0 && Zw.getState().map === 'ridgeback' && __shRidgeback(Zw.getState().quality);
      }
    } catch (e) {
      __CSM.err = String(e);
    }
    return coreDet.apply(this, arguments);
  };
}
// test hook: window.__bpShadows() for the state; __bpShadows('off') / ('on') switch to the core's shadow and back
typeof window < 'u' &&
  (window.__bpShadows = (cmd) => {
    cmd === 'off' && (__CSM.off = !0);
    cmd === 'on' && (__CSM.off = !1);
    const s = __CSM.sun;
    return {
      tier: __CSM.tier,
      off: __CSM.off,
      broken: !!__CSM.broken,
      err: __CSM.err || null,
      sun: s ? { size: s.shadow.mapSize.x, half: s.shadow.camera.right, cast: s.castShadow, dir: __CSM.dir && __CSM.dir.toArray().map((x) => +x.toFixed(3)) } : null,
      extra: __CSM.extra.map((l) => ({ size: l.shadow.mapSize.x, half: l.shadow.camera.right, auto: l.shadow.autoUpdate })),
      ...__CSM.stats,
    };
  });
