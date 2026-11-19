/* ===== Bayou Tactical mod: the Rattler .44 (Terrorist side) ===== */
// A Terrorist gun built from the owner's model (tools/build-new-guns.mjs; credits in CREDITS.md):
//   Rattler .44  a double-action revolver: the Terrorists' heavy pistol. Six rounds, slow, heavy recoil, and a
//                headshot kills from any range in its reach; two body shots up close. Its own red-dot sight shows
//                with the sight attachment. Punishes firing on the move. Fired one-handed: in first person the
//                free arm hangs at the side, out of view (52-fp-arms.js); in third person it hangs and swings
//                naturally (37-characters.js); reloads use both hands, as a real revolver reload does.
// A model gun like the Warden or the Bastion: drawn in other players' hands, given the game's reload, recoil and
// sound. Skins (88) apply to it like any gun. (The Jackal 7.62, an ACR, was tried and removed at the owner's
// choice: a saved choice of it becomes the Kodiak.)
const __NG = {

  rattler: {
    id: 'rattler',
    url: './game/models/weapon-rattler.glb',
    rotY: -Math.PI / 2,
    len: 0.27,
    grip: 0.2,
    gripTop: 0.26, // (low: a revolver's frame and cylinder stand well above the grip, unlike a pistol's slide)
    gz: 0.022,
    fore: 0.5,
    sight: 0.7,
    fb: 'warden',
  },
};
// ---------------------------------------------------------------- the models
// (loaded here: 02-weapon-models.js loads its own table when it runs, before this file)
function __ngAfterPrep(c) {
  const tpl = c.tpl,
    box = new xi(),
    v = new U(),
    meshes = [];
  tpl.updateMatrixWorld(!0);
  tpl.traverse((o) => o.isMesh && meshes.push(o));
  const bounds = (test) => {
    box.makeEmpty();
    for (const o of meshes) test(o.name) && box.expandByObject(o);
    return box.isEmpty() ? null : box.clone();
  };
  // the muzzle without the suppressor: the front of everything else, at the height of the vertices there
  const bare = bounds((n) => !/^sup/.test(n));
  if (bare) {
    let sy = 0,
      n = 0;
    for (const o of meshes) {
      if (/^sup/.test(o.name)) continue;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        v.z < bare.min.z + 0.02 && ((sy += v.y), n++);
      }
    }
    c.muzzleBare = new U(0, n ? sy / n : c.muzzle.y, bare.min.z);
  }
  // sight lines for aiming: through the optic's centre when it's fitted, along the top of the gun otherwise
  const opt = bounds((n) => /^optic/.test(n)),
    body = bounds((n) => /^body/.test(n));
  c.sightOpt = opt ? (opt.min.y + opt.max.y) / 2 : c.sightY;
  c.sightIron = body ? body.max.y - 0.006 : c.sightY;
  c.__ng = !0;
}
for (const [k, c] of Object.entries(__NG)) {
  __XG[k] = c;
  typeof window < 'u' &&
    __glbParse(
      c.url,
      (g) => {
        try {
          __xgPrep(g.scene, c);
          __ngAfterPrep(c);
          Gc += 1;
        } catch (e) {
          console.warn('[guns] model ' + k, e);
        }
      },
      (e) => console.warn('[guns] load ' + k, e),
    );
}
// attachments on these two: their own scope / red dot and suppressor, shown only when equipped (the builder is
// called once per attachment combination and cached)
{
  const coreBuild = wG;
  wG = function (w, A) {
    const r = coreBuild.apply(this, arguments),
      c = __XG[w];
    if (!c || !c.__ng || !r || !r.group) return r;
    const opt = !!(c.opticAlways || (A && A.optic)),
      sup = !!(A && A.suppressor);
    r.group.traverse((o) => {
      if (!o.isMesh) return;
      /^optic/.test(o.name) ? (o.visible = opt) : /^sup/.test(o.name) && (o.visible = sup);
    });
    !sup && c.muzzleBare && (r.muzzle = c.muzzleBare.clone());
    return r;
  };
  const coreSight = __xgSight;
  __xgSight = function (w) {
    const c = __XG[w];
    if (!c || !c.__ng) return coreSight.apply(this, arguments);
    const h = eA.human && eA.human();
    return c.opticAlways || (h && h.attach && h.attach.optic) ? c.sightOpt : c.sightIron;
  };
}
// ---------------------------------------------------------------- the guns
Object.assign(gw, {

  rattler: {
    id: 'rattler',
    name: 'Rattler .44',
    slot: 2,
    price: 700,
    damage: 58,
    rate: 0.36, // double action: a deliberate pull between shots
    auto: !1,
    mag: 6,
    reserve: 36,
    reload: 3.0, // a speed loader
    spread: 0.0026,
    moveSpread: 0.055,
    recoil: 0.044, // a .44 magnum kicks: the muzzle climbs hard and comes back down between shots
    pellets: 1,
    range: 75,
    falloff: 0.05,
    armorPen: 0.85,
    headMult: 3.6,
    speed: 6.2,
    killReward: 400,
    adsZoom: 1.3,
    pen: 1.2,
  },
});
Object.assign(qO, { rattler: 'pistol' });
// recoil patterns (as the other guns': when the climb starts, its sway, which way it leans) and view kick
Object.assign(iU, {
  rattler: { onset: 1, freq: 1, phase: 0, amp: 0.22, bias: 0.05, vert: 2.0 },
});
Object.assign(VwA, {
  rattler: [0.095, 0.36, 0.05, 0.12],
});
// sound: a magnum's crack and boom
Object.assign(z1, {
  rattler: { ...(z1.deagle || z1.pistol), blast: 1250, boom: [95, 30], boomGain: 1.3, vol: 1.15 },
});
// tracer speed and length (03-ballistic-fx.js)
typeof __TRV < 'u' && Object.assign(__TRV, { rattler: [470, 1.6] });
// ---------------------------------------------------------------- the shop, loadouts, bots, Gun Ladder
{
  const at = (id) => fQ.findIndex((x) => x.id === id);
  fQ.some((x) => x.id === 'rattler') ||
    fQ.splice(at('striker') + 1, 0, { id: 'rattler', label: 'Rattler .44', price: 700, hint: 'Six-shot .44 revolver. Headshots kill at any range', cat: 'pistols', team: 'T' });
  YwA.includes('rattler') || YwA.push('rattler');
  // Gun Ladder: the revolver after the burst pistol
  uI.includes('rattler') || uI.splice(uI.indexOf('striker') + 1, 0, 'rattler');
  // the Terrorist side's (93-arsenal.js): a Counter-Terrorist's saved choice of it becomes the Warden
  if (typeof __ARS < 'u') {
    Object.assign(__ARS.side, { rattler: 'T' });
    Object.assign(__ARS.swap.CT, { rattler: 'warden' });
  }
  // the retired Jackal: an old saved choice of it is given as the Kodiak
  typeof __ROSTER < 'u' && (__ROSTER.REMAP.jackal = 'ak47');
  // held in one hand (52-fp-arms.js, 37-characters.js)
  typeof __FA_ONE < 'u' && __FA_ONE.add('rattler');
  typeof __GH_ONE < 'u' && __GH_ONE.add('rattler');
}
// dev hook: hand a bot only the revolver (so it can't switch back to a rifle), to see the one-handed hold
typeof window < 'u' &&
  (window.__bpRattlerBot = () => {
    const S = eA.state,
      b = S && S.players.find((p) => p.isBot && p.alive);
    if (!b) return null;
    delete b.weapons[1];
    b.weapons[2] = null;
    wn(b, 'rattler');
    b.active = 2;
    return b.id;
  });
// ---------------------------------------------------------------- holding it
// In first person the game places guns it does not know as rifles (small, close to the face, turned inwards), so
// the revolver sat low in the middle of the view with its barrel tipped up, held from underneath. It is placed
// as a real one-handed hold: the shooting arm reaching forward from the right shoulder, the gun at the bottom
// right of the view at pistol scale, its barrel pointed where you aim (barely turned in), its top canted a
// touch towards the centre the way a wrist naturally turns. Aiming brings it up to the eye on the same line.
// (__armVm is the core's hook for a gun's place in the view: position at the hip, and scale.)
const __ARMVM = { rattler: { hip: [0.12, -0.12, -0.45], scale: 0.86 } };
function __armVm(id, key) {
  const v = __ARMVM[id];
  return v && v[key] != null ? v[key] : null;
}
{
  const coreVm = __vmExtra;
  __vmExtra = function (m, G, c, t) {
    coreVm.apply(this, arguments);
    if (m && m.id === 'rattler' && c) {
      const h = 1 - (c.ads || 0);
      // (the core turns guns it takes for rifles 0.13 rad inwards at the hip)
      G.rotation.y += (0.12 - 0.13) * h;
      G.rotation.z += 0.05 * h;
      G.rotation.x += -0.06 * h;
    }
  };
}
// after each shot: the muzzle flips up and the wrist rolls a little, then it all settles back (on top of the
// view's recoil spring): the hand absorbing a magnum
typeof __CYC < 'u' && Object.assign(__CYC, { rattler: { s: 0, d: 0.4, roll: 0.09, pitch: 0.3, yaw: 0.03, dip: -0.015, back: 0.05, side: 0.012 } });

