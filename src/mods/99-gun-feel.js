/* ===== Bayou Tactical mod: gun feel (every gun its own voice, weight and kick) ===== */
// An audit of every gun's sound and handling found guns sharing recordings, no low end, no mechanism, silent
// near misses, dry indoor fire, and no kick on firing anything but the Rattler. This, with the changes in
// 29-audio-samples.js (the shot handler), 20-audio-engine.js (the voices) and the core (recoil recovery, aim
// speed, flash size):
//   Sound
//   - each gun voiced on its own (__GF_VOICE): pitch and EQ that set apart the guns that share recordings
//     (Kestrel / Striker / Warden; Sentinel / Talon; Kodiak / Midas), applied to every shot
//   - the body of each calibre: a low sweep and thump under the recording (9 mm light and snappy, 7.62 deep,
//     12-gauge a punch in the chest), yours full, others' within 30 m at half and delayed by distance
//   - the mechanism: the action's clack just after each shot (yours, and anyone's within 10 m)
//   - near misses: the crack of a supersonic round passing (rifles, the LMG, the Phantom) and its whiz, placed
//     where the bullet passed you (no recording existed, so none played)
//   - indoors: a short room tail under every shot (there were no indoor tails)
//   - brass: casings ring as they bounce off the floor near you; shotgun hulls thud
//   Feel
//   - every gun kicks the view when you fire it (it was only the Rattler): 9 mm a flick, rifles a push, the
//     12-gauge and the Phantom a shove, all lighter aiming down sights; the screen shakes with the big ones
//   - aiming speed per gun (__GF_ADS): pistols snap up, rifles settle, the Anvil and the Phantom are heavy
//   - muzzle flash per gun (pistols smaller, the 12-gauge and 7.62 bigger), tracers for the guns that had none,
//     the Talon's own viewmodel kick
// Window hook: __bpGunFeel() reports what played.
const __GF = { last: {}, n: { kick: 0, boom: 0, click: 0, whiz: 0, room: 0, brass: 0 }, err: null, brassAt: 0 };
// ---------------------------------------------------------------- the voices (played by 29-audio-samples.js)
const __GF_VOICE = {
  kestrel: { rate: 1.03, eq: [['peaking', 3000, 3, 1.2]] },
  striker: { rate: 0.99, eq: [['peaking', 1600, 2, 1.1], ['lowpass', 9000, 0, 0.7]] },
  warden: { rate: 0.97, eq: [['peaking', 200, 3, 1]] },
  rattler: { rate: 0.94, eq: [['peaking', 90, 4, 0.9], ['highshelf', 5000, -3]] },
  hornet: { rate: 0.93, eq: [['lowshelf', 150, 4], ['lowpass', 7000, 0, 0.7]] },
  mauler: { rate: 0.97, eq: [['lowshelf', 110, 3], ['peaking', 2400, -2, 1]] },
  sentinel: { rate: 1.03, eq: [['peaking', 3500, 3, 1.1]] },
  hk416: { rate: 0.98, eq: [['peaking', 1200, 2, 1], ['highshelf', 8000, -2]] },
  midas: { rate: 1.02, eq: [['peaking', 2500, 2, 1.1]] },
  ak47: { rate: 0.98, eq: [['peaking', 250, 3, 0.9]] },
  anvil: { rate: 0.95, eq: [['peaking', 110, 3, 0.9]] },
  bastion: { rate: 0.97, eq: [] },
  phantom: { rate: 0.94, eq: [['lowshelf', 90, 3]] },
};
// ---------------------------------------------------------------- each calibre's weight
// boom: [start Hz, end Hz, seconds, gain]; kick: the view's push (rad/s, see 95-impact.js); shake; click: the
// action's clack (Hz, gain); crack: supersonic
const __GF_CAL = { kestrel: '9', striker: '9', warden: '9', rattler: '44', hornet: '45', mauler: '12g', ak47: '762', midas: '762', bastion: '762s', sentinel: '556', hk416: '556', anvil: '762l', phantom: '127s' };
const __GF_K = {
  9: { boom: [118, 48, 0.13, 0.15], kick: 0.32, shake: 0.05, click: [2600, 0.05], crack: 0 },
  45: { boom: [100, 42, 0.16, 0.17], kick: 0.17, shake: 0.035, click: [2300, 0.05], crack: 0 },
  44: { boom: null, kick: 0, shake: 0, click: [1700, 0.06], crack: 1 },
  556: { boom: [92, 38, 0.18, 0.24], kick: 0.2, shake: 0.05, click: [3000, 0.055], crack: 1 },
  762: { boom: [80, 34, 0.22, 0.32], kick: 0.32, shake: 0.08, click: [2100, 0.065], crack: 1 },
  '762l': { boom: [78, 32, 0.24, 0.3], kick: 0.26, shake: 0.07, click: [1900, 0.065], crack: 1 },
  '762s': { boom: [75, 32, 0.2, 0.26], kick: 0.3, shake: 0.07, click: [2100, 0.06], crack: 1 },
  '12g': { boom: [68, 28, 0.32, 0.5], kick: 1.05, shake: 0.32, click: null, crack: 0 },
  '127s': { boom: [58, 26, 0.38, 0.52], kick: 1.35, shake: 0.38, click: null, crack: 1 },
};
const __gfCal = (id) => {
  if (__GF_CAL[id]) return __GF_K[__GF_CAL[id]];
  const c = typeof __wClass < 'u' ? __wClass(id) : 'rifle';
  return __GF_K[c === 'pistol' ? '9' : c === 'smg' ? '45' : c === 'shotgun' ? '12g' : c === 'sniper' ? '127s' : c === 'lmg' ? '762l' : '556'];
};
// ---------------------------------------------------------------- handling
const __GF_ADS = { kestrel: 18, striker: 18, warden: 18, rattler: 15, hornet: 15, mauler: 12, sentinel: 12.5, hk416: 12.5, ak47: 11, midas: 11, bastion: 10.5, anvil: 7.5, phantom: 6 };
for (const id in __GF_ADS) gw[id] && (gw[id].adsRate = __GF_ADS[id]);
// muzzle flash size per gun (the core sized it by retired ids: every new pistol got a rifle's flash)
const __FLASH_K = { kestrel: 0.75, striker: 0.75, warden: 0.75, hornet: 0.9, mauler: 1.6, ak47: 1.15, midas: 1.15, anvil: 1.25, sentinel: 1, hk416: 1, bastion: 1 };
typeof __TRV < 'u' && Object.assign(__TRV, { kestrel: [430, 1.4], striker: [430, 1.4], hornet: [400, 1.6], mauler: [420, 0.9], anvil: [640, 3] });
typeof VwA < 'u' && !VwA.hk416 && (VwA.hk416 = [0.026, 0.042, 0.014, 0.028]);
// ---------------------------------------------------------------- sound layers
function __gfVoice(pos, gain, o) {
  try {
    return typeof xw < 'u' ? xw(pos || null, gain, o || {}) : null;
  } catch (e) {
    return null;
  }
}
function __gfBoom(K, pos, self) {
  if (!K.boom) return;
  const [f0, f1, dur, g] = K.boom,
    v = __gfVoice(pos, 1, self ? { life: dur + 0.4 } : { maxDist: 30, travel: !0, reverb: 0.15, life: dur + 0.5 });
  if (!v) return;
  const k = self ? 1 : 0.5;
  Ii(v.in, v.t, dur * 1.4, f0, f1, g * k, 'sine', 0.0015);
  Cw(v.in, v.t, Math.min(0.14, dur * 0.6), 'lowpass', 320, 0.7, g * 0.45 * k, { attack: 0.001 });
  __GF.n.boom++;
}
function __gfClick(K, pos, self) {
  if (!K.click) return;
  const v = __gfVoice(pos, 1, self ? { life: 0.3 } : { maxDist: 12, travel: !0, reverb: 0.05, life: 0.35 });
  if (!v) return;
  const [f, g] = K.click;
  Cw(v.in, v.t + 0.02 + Math.random() * 0.008, 0.014, 'bandpass', f * (0.95 + Math.random() * 0.1), 2.5, g * (self ? 1 : 0.7), { attack: 0.0005 });
  Cw(v.in, v.t + 0.045 + Math.random() * 0.01, 0.01, 'bandpass', f * 1.35, 3, g * 0.55 * (self ? 1 : 0.7), { attack: 0.0005 });
  __GF.n.click++;
}
// a bullet passing you: the crack of a supersonic round (a sharp snap) and the whiz of its passing
function __gfWhiz(at, id, dist) {
  const K = __gfCal(id),
    v = __gfVoice(at, 1, { maxDist: 8, reverb: 0.06, life: 0.5 });
  if (!v) return;
  const near = Math.max(0.15, 1 - dist / 2.6);
  K.crack && Cw(v.in, v.t, 0.006, 'highpass', 5200, 0.7, 0.6 * near, { attack: 0.0003 });
  Cw(v.in, v.t + 0.004, 0.17, 'bandpass', 3200, 3, 0.22 * near, { attack: 0.01, sweepTo: 900 });
  Ii(v.in, v.t, 0.15, 1500, 650, 0.03 * near, 'sine', 0.004);
  __GF.n.whiz++;
}
// indoors, a short room tail under a shot (the samples have none for inside)
function __gfRoomTail(pos, cl, self) {
  const key = pos ? Math.round(pos.x) + ',' + Math.round(pos.z) : 'me',
    now = performance.now();
  if (now - (__GF.last['rt' + key] || 0) < 70) return;
  __GF.last['rt' + key] = now;
  const g = ({ pistol: 0.11, smg: 0.11, rifle: 0.16, lmg: 0.18, shotgun: 0.22, sniper: 0.24 }[cl] || 0.15) * (self ? 1 : 0.8),
    v = __gfVoice(pos, 1, { reverb: 0.9, travel: !0, maxDist: 120, life: 0.9 });
  if (!v) return;
  Cw(v.in, v.t + 0.006, 0.42, 'bandpass', 700, 0.45, g, { attack: 0.004, sweepTo: 380 });
  Cw(v.in, v.t + 0.016, 0.07, 'highpass', 1800, 0.7, g * 0.55, { attack: 0.001 });
  __GF.n.room++;
}
// brass on the floor (called by 39-animated-weapons.js on each bounce): a ring, or a shotgun hull's thud
function __gfBrass(p, speed, t) {
  if (speed < 0.6 || typeof In > 'u') return;
  const now = performance.now();
  if (now - __GF.brassAt < 25 || Math.hypot(p.x - In.pos.x, p.y - In.pos.y, p.z - In.pos.z) > 10) return;
  __GF.brassAt = now;
  const v = __gfVoice({ x: p.x, y: p.y, z: p.z }, 1, { maxDist: 12, reverb: 0.08, life: 0.35 });
  if (!v) return;
  const k = Math.min(1, speed / 2.2);
  if (t && t.box) Cw(v.in, v.t, 0.05, 'lowpass', 900, 0.8, 0.08 * k, { attack: 0.001 });
  else {
    const f = 2700 + Math.random() * 1600;
    Ii(v.in, v.t, 0.09, f, f * 0.985, 0.045 * k, 'sine', 0.0005);
    Ii(v.in, v.t, 0.05, f * 2.71, f * 2.69, 0.02 * k, 'sine', 0.0005);
  }
  __GF.n.brass++;
}
// ---------------------------------------------------------------- every shot
typeof window < 'u' &&
  eA.on((list) => {
    try {
      const S = eA.state;
      if (!S || eA.attract || typeof $i > 'u' || !$i) return;
      const me = eA.human && eA.human();
      if (!me) return;
      for (const e of Array.isArray(list) ? list : [list]) {
        if (!e || e.type !== 'shot' || e.weapon === 'knife' || e.weapon === 'grenade') continue;
        // one per trigger pull (a shotgun sends one event per pellet)
        const now = performance.now(),
          lk = 'sh' + e.shooter;
        if ((gw[e.weapon] && gw[e.weapon].pellets) > 1 && now - (__GF.last[lk] || 0) < 30) continue;
        __GF.last[lk] = now;
        const K = __gfCal(e.weapon),
          self = e.shooter === me.id,
          d = self ? 0 : e.from ? Math.hypot(e.from.x - me.pos.x, e.from.y - me.pos.y, e.from.z - me.pos.z) : 999;
        if (self) {
          if (e.weapon !== 'rattler' && typeof __imfKick < 'u') {
            const a = me.ads || 0,
              k = K.kick * (1 - 0.35 * a) * (0.9 + Math.random() * 0.2);
            __imfKick(k, (Math.random() - 0.5) * K.kick * 0.35, (Math.random() - 0.5) * K.kick * 0.5, null);
            __IMF.shake = Math.min(1.2, __IMF.shake + K.shake * (1 - 0.3 * a));
            __GF.n.kick++;
          }
          __gfBoom(K, null, !0);
          __gfClick(K, null, !0);
        } else {
          d < 30 && __gfBoom(K, e.from, !1);
          d < 10 && __gfClick(K, e.from, !1);
        }
      }
    } catch (err) {
      __GF.err = String(err && err.stack);
    }
  });
typeof window < 'u' && (window.__bpGunFeel = () => ({ ...__GF.n, err: __GF.err }));
