/* ===== Bayou Protocol mod: weapon skins (Finish) on the model guns ===== */
// The loadout screen's "Finish" (the profile's `camo`: Woodland, Urban, Tiger, Gold, Diamond, Dark Matter) was
// only ever applied to the old guns built from code: the core hands the finish to its gun builder as a material
// set, and every gun is a GLB model now, so the choice never showed. Here it is put on the models:
//   - first person: guns drawn from a static model (Warden, Bastion, Rampart, Midas, and the world models used
//     when a rig is not available) are skinned as they are built; animated rigs (Kodiak, Hornet, Mauler,
//     Kestrel, Anvil, Striker, Phantom, Sentinel) are one shared model each, so their gun meshes get the
//     skinned material when the rig is handed out and their own materials back when another finish (or
//     Factory) is chosen
//   - the loadout picture (the large gun above the Finish buttons) is skinned the same way
//   - other players' guns, the buy menu and the gun cards stay factory (the core asks for those without a
//     finish)
// What gets the finish: the gun's body materials (receiver, handguard, stock, slide, frame, barrel, magazine).
// Never the arms, gloves or sleeves (the rigs' arm meshes, by the same rule their mods use to tell arms from
// gun), anything see-through or glowing (lenses, red dots, reticles), lens or glass parts, sights, and rounds
// (bullets, shells, slugs, the belt). The knife and grenades keep their own look.
// Each model material is cloned once per finish, keeping its normal, roughness and occlusion maps so the
// model's detail survives:
//   - Gold / Diamond / Dark Matter: the colour, metalness and glow of the core's finishes (zu)
//   - Woodland / Urban / Tiger: a small tiling pattern (128 px, drawn once per finish) as the colour map. GLB
//     guns use texture atlases whose scale varies by model, so the pattern's repeat is set per material from
//     how much texture space the gun uses per metre: blobs come out the same size on a pistol and an LMG.
//     Models without texture coordinates (Bastion, Talon) get box-projected ones, in metres.
// Only the current finish's clones are kept; choosing another finish releases them (materials and pattern
// textures), so switching costs no memory over time.
const __WS = {
  skin: null, // the finish the cache is for
  mats: new Map(), // model material -> its skinned clone (for __WS.skin)
  base: null, // the pattern texture for __WS.skin (patterns only)
  dens: new WeakMap(), // model material -> texture units per metre on the gun
  rig: new Map(), // rig mesh -> its own material (while it wears a clone)
  pend: null, // guns built inside the first-person builder, skinned once it returns
  talon: null, // stand-in material for the Talon's painted parts (the core paints it with a flat colour)
  n: { built: 0, rigs: 0, mats: 0, freed: 0 },
};
const __WS_FINISH = {
  gold: { color: '#d9a92a', met: 1, rough: 0.22 },
  diamond: { color: '#cdeeff', met: 0.9, rough: 0.08, em: '#3a6a8a', ei: 0.35 },
  darkmatter: { color: '#1a0f2a', met: 0.7, rough: 0.3, em: '#7a2cff', ei: 0.6 },
};
// the core's camo colours (zu): base, then three blob colours
const __WS_PATTERN = {
  woodland: ['#3b4a2a', '#5a6b3a', '#2a2a1e', '#7a6a45'],
  urban: ['#4a4d52', '#6e7278', '#2c2e32', '#9a9ea4'],
  tiger: ['#c46a1e', '#1a1410', '#e08a30', '#1a1410'],
};
// one pattern tile on the gun, in metres
const __WS_TILE = 0.16;
// parts that never take a finish: glass, sights, glow, rounds; and arms (by material or mesh name)
const __WS_SKIP = /lens|glass|reticle|holo|laser|sight|flash|glow|tracer|bullet|slug|shell|casing|cartridge|ammo|brass/i;
// (not "hand": the carbine's charging handle is a gun part called "handle")
const __WS_ARMS = /arms|armmesh|glove|sleeve|shirt|\bskin\b|finger/i;
const __WS_NOSKIN = /^(knife|grenade|frag|flash|smoke|molotov|decoy)$/;

const __wsWanted = (s) => s in __WS_FINISH || s in __WS_PATTERN;
function __wsOk(mesh, m) {
  return !!(
    m &&
    m.isMeshStandardMaterial &&
    !m.transparent &&
    m.opacity >= 1 &&
    !(m.alphaTest > 0) &&
    !(m.transmission > 0) &&
    !m.emissiveMap &&
    !(m.emissive && m.emissiveIntensity > 0 && (m.emissive.r > 0.02 || m.emissive.g > 0.02 || m.emissive.b > 0.02)) &&
    !__WS_SKIP.test(m.name || '') &&
    !__WS_ARMS.test(m.name || '') &&
    !__WS_SKIP.test(mesh.name || '') &&
    !__WS_ARMS.test(mesh.name || '')
  );
}
// the cache follows one finish; another finish releases the old clones and pattern
function __wsUse(skin) {
  if (__WS.skin === skin) return;
  for (const c of __WS.mats.values()) {
    c.map && c.map !== __WS.base && c.map.dispose();
    c.dispose();
    __WS.n.freed++;
  }
  __WS.mats.clear();
  __WS.base && __WS.base.dispose();
  __WS.base = null;
  __WS.skin = skin;
}
// a tiling camo tile: the core's blobs, larger canvas, wrapped round the edges so tiles join without seams.
// Seeded, so the pattern is the same every time it is drawn.
function __wsPattern(skin) {
  if (__WS.base) return __WS.base;
  const P = __WS_PATTERN[skin],
    N = 128,
    cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  let seed = skin.length * 7919 + skin.charCodeAt(0) * 131;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), (seed - 1) / 2147483646);
  g.fillStyle = P[0];
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 30; i++) {
    const x = rnd() * N,
      y = rnd() * N,
      tiger = skin === 'tiger',
      rx = tiger ? 26 + rnd() * 10 : 8 + rnd() * 18,
      ry = tiger ? 4 + rnd() * 2 : 6 + rnd() * 12,
      a = tiger ? 0.5 + (rnd() - 0.5) * 0.3 : rnd() * 3;
    g.fillStyle = P[1 + (i % 3)];
    for (const ox of [-N, 0, N])
      for (const oy of [-N, 0, N]) {
        g.beginPath();
        g.ellipse(x + ox, y + oy, rx, ry, a, 0, 7);
        g.fill();
      }
  }
  const t = new LI(cv);
  t.colorSpace = Tw;
  t.wrapS = t.wrapT = FI;
  t.anisotropy = 4;
  t.name = 'bp-camo-' + skin;
  return (__WS.base = t);
}
// texture units per metre for a material over the given meshes (positions measured in `root`'s space, after
// skinning), from up to ~3000 of their triangles: sqrt(texture area / surface area)
const __wsT = { a: new U(), b: new U(), c: new U(), e: new U(), f: new U(), inv: new _A() };
function __wsDensity(mat, meshes, root) {
  if (__WS.dens.has(mat)) return __WS.dens.get(mat);
  const t = __wsT;
  root.updateMatrixWorld(!0);
  t.inv.copy(root.matrixWorld).invert();
  let wa = 0,
    ua = 0;
  const P3 = [t.a, t.b, t.c],
    uv = [0, 0, 0, 0, 0, 0];
  for (const o of meshes) {
    const G = o.geometry,
      P = G.attributes.position,
      T = G.attributes.uv;
    if (!P || !T) continue;
    const I = G.index,
      n = (I ? I.count : P.count) / 3,
      step = Math.max(1, Math.floor(n / 3000));
    o.isSkinnedMesh && o.skeleton && o.skeleton.update();
    for (let k = 0; k < n; k += step) {
      for (let j = 0; j < 3; j++) {
        const i = I ? I.getX(k * 3 + j) : k * 3 + j;
        P3[j].fromBufferAttribute(P, i);
        o.isSkinnedMesh && o.applyBoneTransform(i, P3[j]);
        P3[j].applyMatrix4(o.matrixWorld).applyMatrix4(t.inv);
        uv[j * 2] = T.getX(i);
        uv[j * 2 + 1] = T.getY(i);
      }
      wa += t.e.subVectors(t.b, t.a).cross(t.f.subVectors(t.c, t.a)).length() / 2;
      ua += Math.abs((uv[2] - uv[0]) * (uv[5] - uv[1]) - (uv[4] - uv[0]) * (uv[3] - uv[1])) / 2;
    }
  }
  const d = wa > 1e-9 && ua > 1e-12 ? Math.sqrt(ua / wa) : 0;
  __WS.dens.set(mat, d);
  return d;
}
// box-projected texture coordinates, in metres, for a model that has none (Bastion, Talon); kept on the
// geometry (shared with the model's template: harmless for its own materials, which use no maps)
function __wsGenUV(o, root) {
  const G = o.geometry;
  if (G.attributes.uv || !G.attributes.position) return;
  G.attributes.normal || G.computeVertexNormals();
  root.updateMatrixWorld(!0);
  const k = o.matrixWorld.getMaxScaleOnAxis() / (root.matrixWorld.getMaxScaleOnAxis() || 1),
    P = G.attributes.position,
    N = G.attributes.normal,
    out = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) * k,
      y = P.getY(i) * k,
      z = P.getZ(i) * k,
      ax = Math.abs(N.getX(i)),
      ay = Math.abs(N.getY(i)),
      az = Math.abs(N.getZ(i));
    ax >= ay && ax >= az ? ((out[i * 2] = z), (out[i * 2 + 1] = y)) : ay >= az ? ((out[i * 2] = x), (out[i * 2 + 1] = z)) : ((out[i * 2] = x), (out[i * 2 + 1] = y));
  }
  G.setAttribute('uv', new gi(out, 2));
}
// the skinned clone of a model material (made once per finish)
function __wsMat(orig, skin, meshes, root) {
  let c = __WS.mats.get(orig);
  if (c) return c;
  // userData is copied through JSON: the Kodiak rig keeps its textures there (10-weapon-rigs.js), and
  // serialising those would read back the whole image
  const ud = orig.userData;
  orig.userData = {};
  try {
    c = orig.clone();
  } finally {
    orig.userData = ud;
  }
  c.userData = { bpSkin: skin };
  // a shader patch put on the original by another mod goes with it
  Object.prototype.hasOwnProperty.call(orig, 'onBeforeCompile') && (c.onBeforeCompile = orig.onBeforeCompile);
  Object.prototype.hasOwnProperty.call(orig, 'customProgramCacheKey') && (c.customProgramCacheKey = orig.customProgramCacheKey);
  c.name = (orig.name || 'gun') + ' [' + skin + ']';
  const F = __WS_FINISH[skin];
  if (F) {
    // metal finish over the model's shape: its normal, roughness and occlusion maps stay; the roughness map
    // is scaled so the finish's own roughness is about the average
    c.map = null;
    c.color.set(F.color);
    c.metalness = F.met;
    c.metalnessMap = null;
    c.roughness = orig.roughnessMap ? Math.min(1, F.rough / 0.6) : F.rough;
    c.emissive.set(F.em || '#000000');
    c.emissiveIntensity = F.ei || 0;
  } else {
    // painted: the pattern as the colour, the model's own roughness detail, not metallic
    const d = __wsDensity(orig, meshes, root),
      r = d > 0 ? Math.max(0.5, Math.min(48, 1 / (__WS_TILE * d))) : 4,
      t = __wsPattern(skin).clone();
    t.repeat.set(r, r);
    t.needsUpdate = !0; // a clone starts at version 0, which three.js treats as "no image yet"
    c.map = t;
    c.color.set('#ffffff');
    c.metalness = 0.12;
    c.metalnessMap = null;
    c.roughness = orig.roughnessMap ? 1 : 0.62;
  }
  c.needsUpdate = !0;
  __WS.mats.set(orig, c);
  __WS.n.mats++;
  return c;
}
// put the finish on a list of gun meshes (materials swapped on the meshes; the models' own are not changed)
function __wsApply(meshes, skin, root, onSwap) {
  if (!__wsWanted(skin)) return;
  __wsUse(skin);
  const pattern = skin in __WS_PATTERN,
    byMat = new Map();
  for (const o of meshes) {
    const ms = [].concat(o.material || []);
    if (!ms.some((m) => __wsOk(o, m))) continue;
    pattern && __wsGenUV(o, root);
    for (const m of ms) __wsOk(o, m) && (byMat.get(m) || byMat.set(m, []).get(m)).push(o);
  }
  for (const o of meshes) {
    const ms = o.material;
    if (Array.isArray(ms)) {
      if (!ms.some((m) => byMat.has(m))) continue;
      onSwap && onSwap(o);
      o.material = ms.map((m) => (byMat.has(m) ? __wsMat(m, skin, byMat.get(m), root) : m));
    } else if (byMat.has(ms)) {
      onSwap && onSwap(o);
      o.material = __wsMat(ms, skin, byMat.get(ms), root);
    }
  }
}
// ---------------------------------------------------------------- which finish
// the core reads the profile's finish through HwA() (checked against unlocks, re-read every 2 s) and rebuilds
// the first-person gun when it changes; the material set it hands the gun builder is made by zu(finish):
// tag it, so the builder hook knows which finish was asked for
{
  const coreZu = zu;
  zu = function (id) {
    const m = coreZu.apply(this, arguments);
    try {
      m && (m.userData.bpCamo = id);
    } catch (e) {}
    return m;
  };
  // choosing a finish (the loadout screen saves the profile): re-read it now rather than up to 2 s later
  const coreFu = Fu;
  Fu = function () {
    const r = coreFu.apply(this, arguments);
    try {
      Um.at = -1e9;
    } catch (e) {}
    return r;
  };
}
const __wsSetSkin = (set) => (set && set.main && set.main.userData && set.main.userData.bpCamo) || 'none';
// ---------------------------------------------------------------- guns built from a model (first person, loadout picture)
{
  const coreBuild = wG;
  wG = function (w, A, set) {
    const r = coreBuild.apply(this, arguments);
    try {
      const skin = __wsSetSkin(set);
      if (!r || !r.group || __WS_NOSKIN.test(w) || !__wsWanted(skin)) return r;
      const meshes = [];
      r.group.traverse((o) => o.isMesh && meshes.push(o));
      let job;
      if (w === 'hk416') {
        // the Talon is the one model gun the core already paints (its body takes the finish's material), but it
        // has no texture coordinates, so a pattern came out as one flat colour: patterns go on with coordinates
        // of their own; the metal finishes are left as the core made them
        if (!(skin in __WS_PATTERN)) return r;
        __WS.talon || ((__WS.talon = new Gw({ color: '#ffffff', roughness: 0.62, metalness: 0.12 })), (__WS.talon.name = 'talon-body'));
        const body = meshes.filter((o) => o.material === set.main);
        for (const o of body) o.material = __WS.talon;
        job = { meshes: body, skin, root: r.group };
      } else job = { meshes, skin, root: r.group };
      // inside the first-person builder: wait until it returns (see below)
      __WS.pend ? __WS.pend.push(job) : __wsApply(job.meshes, job.skin, job.root);
      __WS.n.built++;
    } catch (e) {
      console.warn('[skins] ' + w, e);
    }
    return r;
  };
  // The first-person builder (xu) builds the gun through wG, then adds the arms. 42-smooth.js keeps a list of
  // the materials made during that call and frees them when the next gun is built; skinning after the call
  // keeps the cached finish materials off that list (they live as long as the finish is chosen).
  const coreXu = xu;
  xu = function () {
    const outer = __WS.pend;
    __WS.pend = [];
    let jobs, r;
    try {
      r = coreXu.apply(this, arguments);
    } finally {
      jobs = __WS.pend;
      __WS.pend = outer;
    }
    for (const j of jobs)
      try {
        __wsApply(j.meshes, j.skin, j.root);
      } catch (e) {
        console.warn('[skins] first person', e);
      }
    return r;
  };
}
// ---------------------------------------------------------------- animated rigs (one shared model per gun)
// which of a rig's meshes are the gun: the same split the rigs' own mods use (39-animated-weapons.js: the
// arms are the skinned mesh; the Kodiak, 10-weapon-rigs.js: the gun's materials are "Material.*")
function __wsRigGun(c, o) {
  const ms = [].concat(o.material || []);
  if (typeof __AW < 'u' && Object.values(__AW).includes(c)) return c.gunMat ? ms.some((m) => c.gunMat.test(m.name || '')) : !o.isSkinnedMesh;
  if (c === __RIG.ak47) return ms.every((m) => /^Material/.test(m.name || ''));
  return !o.isSkinnedMesh;
}
// rig meshes back to their own materials
function __wsRigRestore() {
  for (const [o, m] of __WS.rig) o.material = m;
  __WS.rig.clear();
}
{
  const coreRigFor = __rigFor;
  __rigFor = function (id) {
    // first: the Midas gilds the Kodiak's own materials in place, so they must be on the meshes again
    __wsRigRestore();
    const r = coreRigFor.apply(this, arguments);
    try {
      const c = r && r.rig,
        R = c && c.rig;
      if (!R || __WS_NOSKIN.test(id)) return r;
      const skin = HwA();
      if (!__wsWanted(skin)) return r;
      const meshes = [];
      R.root.traverse((o) => o.isMesh && __wsRigGun(c, o) && meshes.push(o));
      __wsApply(meshes, skin, R.wrap, (o) => __WS.rig.has(o) || __WS.rig.set(o, o.material));
      __WS.n.rigs++;
    } catch (e) {
      console.warn('[skins] rig ' + id, e);
    }
    return r;
  };
  // the third-person Kodiak / knife are lifted out of their rigs once (45-weapon-roster.js): from the rigs' own
  // materials, never a finish
  if (typeof __rigWorld == 'function') {
    const coreWorld = __rigWorld;
    __rigWorld = function () {
      const keep = [...__WS.rig].map(([o]) => [o, o.material]);
      __wsRigRestore();
      try {
        return coreWorld.apply(this, arguments);
      } finally {
        for (const [o, m] of keep) __WS.rig.set(o, o.material), (o.material = m);
      }
    };
  }
}
// test probe (dev builds; removed in production with the other __bp hooks by 55-competitive.js)
typeof window < 'u' &&
  (window.__bpSkins = () => ({
    skin: __WS.skin,
    chosen: HwA(),
    cached: [...__WS.mats.entries()].map(([o, c]) => [o.name, c.map ? +c.map.repeat.x.toFixed(2) : null]),
    rigMeshes: __WS.rig.size,
    ...__WS.n,
  }));
