/* ===== Bayou Tactical mod: impact you can feel ===== */
// Getting shot, landing a hit and firing a magnum should each be felt, not just seen in a number.
//
// Getting shot (scaled by the damage; a headshot counts half again):
//   - the view is knocked away from where the bullet came from: pushed back and tipped up when hit from the
//     front, twisted and rolled to the side when hit from the side, a sharp shake on top; it springs back in a
//     quarter of a second. It moves the camera only, never your aim (what you shoot at is unchanged)
//   - a red hurt vignette that flashes in and fades (white-hot for a headshot)
//   - a body-impact thud, a metallic ping off armour, and after a big hit a ringing in the ears
//   - when you are low (30 health or less) your heartbeat thumps and the edges of the screen pulse red with it
// Landing a hit: a meaty impact under the hit marker (louder for bigger hits), a sharp crack for a headshot, a
//   deep thump and a small jolt of the view on a kill. (The victim's flinch also scales with the damage:
//   37-characters.js.)
// Firing the Rattler .44: a camera blast on top of its recoil, and a sub-bass boom under the recorded shot that
//   you feel in your chest (near it, others hear the boom too).
// Everything follows the "Screen shake" setting (0 turns the view effects off) and the game's volume.
const __IMF = {
  // view offsets (radians, metres) and their velocities: damped springs
  p: 0, vp: 0, y: 0, vy: 0, r: 0, vr: 0, px: 0, vpx: 0, py: 0, vpy: 0, pz: 0, vpz: 0,
  shake: 0,
  flash: 0, flashCol: 'red', low: 0, beatAt: 0,
  el: null, err: null, n: 0,
};
const __imfK = () => {
  try {
    return Math.max(0, Math.min(2, eA.settings.shake ?? 1));
  } catch (e) {
    return 1;
  }
};
// a kick: pitch, yaw, roll (radians/s of spring velocity) and a push (m/s, world)
function __imfKick(p, y, r, push) {
  const k = __imfK();
  __IMF.vp += p * k;
  __IMF.vy += y * k;
  __IMF.vr += r * k;
  if (push) {
    __IMF.vpx += push.x * k;
    __IMF.vpy += push.y * k;
    __IMF.vpz += push.z * k;
  }
}
// sounds (the core's synth, through the game's mix): Ii = a tone sweeping f0 -> f1, Cw = filtered noise
function __imfVoice(pos, gain, o) {
  try {
    return xw(pos || null, gain, o || {});
  } catch (e) {
    return null;
  }
}
function __imfHurtSound(dmg, head, shield) {
  const g = __imfVoice(null, 0.8);
  if (!g) return;
  const s = Math.min(1.4, dmg / 40);
  // the thud of the round hitting the body, the slap of it, a crack for the head
  Ii(g.in, g.t, 0.26, 105, 38, 0.32 * s, 'sine', 0.003);
  Ii(g.in, g.t, 0.12, 230, 90, 0.14 * s, 'triangle', 0.002);
  Cw(g.in, g.t, 0.07, 'bandpass', 850, 0.9, 0.22 * s, { attack: 0.002 });
  head && Cw(g.in, g.t, 0.05, 'highpass', 2600, 0.8, 0.18, { attack: 0.001 });
  shield && Ii(g.in, g.t + 0.005, 0.3, 2700, 2450, 0.06, 'sine', 0.002);
  // a big hit leaves your ears ringing
  if (dmg >= 45 || head) {
    const f = 3500 + Math.random() * 600;
    Ii(g.in, g.t + 0.05, 2.6, f, f * 0.995, 0.028 * Math.min(1.5, dmg / 50), 'sine', 0.08);
  }
}
function __imfHitSound(dmg, head) {
  const g = __imfVoice(null, 0.7);
  if (!g) return;
  const s = Math.min(1.3, 0.45 + dmg / 55);
  // the round going in: a wet slap and a low body thump, bigger for bigger hits
  Cw(g.in, g.t, 0.055, 'bandpass', 1500, 0.8, 0.13 * s, { attack: 0.001 });
  Ii(g.in, g.t, 0.11, 170, 65, 0.2 * s, 'sine', 0.002);
  if (head) {
    Cw(g.in, g.t, 0.04, 'highpass', 3600, 0.7, 0.14, { attack: 0.001 });
    Ii(g.in, g.t, 0.07, 950, 320, 0.05, 'square', 0.001);
  }
}
function __imfKillSound(head) {
  const g = __imfVoice(null, 0.75);
  if (!g) return;
  Ii(g.in, g.t + 0.02, 0.45, 82, 30, 0.36, 'sine', 0.004);
  Cw(g.in, g.t + 0.02, 0.22, 'lowpass', 420, 0.7, 0.12, { attack: 0.003 });
  head && Ii(g.in, g.t + 0.02, 0.12, 1400, 500, 0.05, 'triangle', 0.001);
}
// the magnum's boom under the recorded shot: felt up close, heard as a low roll further off
function __imfBoom(pos, self) {
  const g = __imfVoice(self ? null : pos, self ? 0.95 : 0.8, self ? {} : { maxDist: 220, travel: !0, reverb: 0.2 });
  if (!g) return;
  Ii(g.in, g.t, 0.55, 74, 31, self ? 0.6 : 0.45, 'sine', 0.002);
  Ii(g.in, g.t, 0.18, 150, 60, self ? 0.25 : 0.18, 'triangle', 0.001);
  Cw(g.in, g.t, 0.35, 'lowpass', 380, 0.8, self ? 0.22 : 0.16, { attack: 0.002 });
  self && Cw(g.in, g.t, 0.035, 'highpass', 3200, 0.7, 0.16, { attack: 0.0005 });
}
function __imfBeat(strength) {
  const g = __imfVoice(null, 0.6);
  if (!g) return;
  Ii(g.in, g.t, 0.14, 62, 40, 0.34 * strength, 'sine', 0.006);
  Ii(g.in, g.t + 0.17, 0.12, 58, 38, 0.24 * strength, 'sine', 0.006);
}
// the hurt overlay: a red vignette (white-hot for a headshot), and a low-health pulse
function __imfEl() {
  if (typeof document > 'u') return null;
  if (__IMF.el && __IMF.el.isConnected) return __IMF.el;
  const el = document.createElement('div');
  if (!el.style || !document.body) return null;
  el.id = 'bp-hurt';
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;opacity:0;transition:none;mix-blend-mode:normal;';
  document.body.appendChild(el);
  return (__IMF.el = el);
}
function __imfPaint(a, low, white) {
  const el = __imfEl();
  if (!el) return;
  const o = Math.max(a, low);
  if (o < 0.005) {
    el.style.opacity !== '0' && (el.style.opacity = '0');
    return;
  }
  const inner = white ? 'rgba(255,240,230,0)' : 'rgba(120,0,0,0)',
    edge = white ? `rgba(255,235,225,${Math.min(0.85, a * 0.9)})` : `rgba(150,0,0,${Math.min(0.85, o * 0.95)})`;
  el.style.background = `radial-gradient(ellipse at 50% 50%, ${inner} ${Math.round(58 - 22 * Math.min(1, o))}%, ${edge} 100%)`;
  el.style.opacity = '1';
}
// ---------------------------------------------------------------- events
typeof window < 'u' &&
  eA.on((list) => {
    try {
      const S = eA.state;
      if (!S || eA.attract) return;
      const me = eA.human && eA.human();
      if (!me) return;
      for (const e of Array.isArray(list) ? list : [list]) {
        if (!e) continue;
        if (e.type === 'hit' && e.victim === me.id && e.attacker !== me.id) {
          const dmg = e.dmg || 10,
            head = !!e.headshot,
            s = Math.min(1.6, (dmg * (head ? 1.5 : 1)) / 40),
            // the bullet's direction, in the view's frame: right of the view, and along it (+: from behind)
            d = e.dir || { x: 0, y: 0, z: 0 },
            right = { x: Math.cos(me.yaw), z: -Math.sin(me.yaw) },
            fwd = { x: -Math.sin(me.yaw), z: -Math.cos(me.yaw) },
            lat = d.x * right.x + (d.z || 0) * right.z,
            along = d.x * fwd.x + (d.z || 0) * fwd.z;
          // knocked back and up from the front, forward and down from behind, twisted away from the side
          __imfKick((along < 0 ? 1.0 : -0.6) * s + (head ? 1.4 : 0), -lat * 0.9 * s, -lat * 1.4 * s + (Math.random() - 0.5) * 0.6 * s, { x: d.x * 0.9 * s, y: 0.15 * s, z: (d.z || 0) * 0.9 * s });
          __IMF.shake = Math.min(1.6, __IMF.shake + 0.55 * s);
          __IMF.flash = Math.min(1, __IMF.flash + 0.35 + 0.4 * Math.min(1, s));
          __IMF.white = head;
          __imfHurtSound(dmg, head, !!e.shield);
        } else if (e.type === 'hit' && e.attacker === me.id && e.victim !== me.id) {
          __imfHitSound(e.dmg || 10, !!e.headshot);
          e.headshot && (__IMF.shake = Math.min(1, __IMF.shake + 0.08));
        } else if (e.type === 'kill' && e.killer === me.id && e.victim !== me.id) {
          __imfKillSound(!!e.headshot);
          __imfKick(0.25, 0, (Math.random() - 0.5) * 0.4, null);
          __IMF.shake = Math.min(1, __IMF.shake + 0.18);
        } else if (e.type === 'shot' && e.weapon === 'rattler' && !e.suppressed) {
          const self = e.shooter === me.id;
          if (self) {
            // the blast: the view thrown up and a little sideways, a hard shake, all settling in ~0.3 s
            const a = me.ads || 0;
            __imfKick(1.9 * (1 - 0.35 * a), (Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.9, { x: 0, y: 0.05, z: 0 });
            __IMF.shake = Math.min(1.6, __IMF.shake + 0.5);
            __imfBoom(null, !0);
          } else if (e.from && Math.hypot(e.from.x - me.pos.x, e.from.z - me.pos.z) < 160) __imfBoom(e.from, !1);
        }
      }
    } catch (err) {
      __IMF.err = String(err && err.stack);
    }
  });
// ---------------------------------------------------------------- every frame: the springs, the camera, the overlay
// (on the map's tree layer, after the core's camera (priority -2): offsets added to the pose it just set)
{
  const prevTrees = kwA;
  kwA = function () {
    QI((st, dt) => {
      try {
        dt = Math.min(dt || 0.016, 0.05);
        const I = __IMF,
          cam = st.camera,
          me = eA.human && eA.human(),
          live = !!(me && me.alive && !eA.attract && eA.state && eA.replayTime() === null);
        // springs: stiff, a little under-damped (a jolt with a small rebound)
        const spring = (x, v, k, c) => {
          v += (-k * x - c * v) * dt;
          return [x + v * dt, v];
        };
        [I.p, I.vp] = spring(I.p, I.vp, 260, 22);
        [I.y, I.vy] = spring(I.y, I.vy, 260, 22);
        [I.r, I.vr] = spring(I.r, I.vr, 220, 18);
        [I.px, I.vpx] = spring(I.px, I.vpx, 300, 26);
        [I.py, I.vpy] = spring(I.py, I.vpy, 300, 26);
        [I.pz, I.vpz] = spring(I.pz, I.vpz, 300, 26);
        I.shake *= Math.exp(-dt * 9);
        if (live && cam) {
          const k = __imfK(),
            sh = I.shake * k * 0.012;
          cam.rotation.x += Math.max(-0.12, Math.min(0.12, I.p)) + (Math.random() - 0.5) * sh;
          cam.rotation.y += Math.max(-0.1, Math.min(0.1, I.y)) + (Math.random() - 0.5) * sh;
          cam.rotation.z += Math.max(-0.1, Math.min(0.1, I.r)) + (Math.random() - 0.5) * sh * 0.6;
          cam.position.x += Math.max(-0.08, Math.min(0.08, I.px));
          cam.position.y += Math.max(-0.06, Math.min(0.06, I.py));
          cam.position.z += Math.max(-0.08, Math.min(0.08, I.pz));
          cam.updateMatrixWorld();
        }
        // the overlay: the flash fades over ~0.7 s; at 30 health or less the edges pulse with the heartbeat
        I.flash *= Math.exp(-dt * 3.2);
        const hp = live ? me.health : 100,
          lowK = live && hp <= 30 ? 1 - hp / 30 : 0,
          now = performance.now(),
          period = 1000 * (0.95 - 0.35 * lowK);
        let pulse = 0;
        if (lowK > 0) {
          if (now - I.beatAt > period) {
            I.beatAt = now;
            __imfBeat(0.6 + 0.6 * lowK);
          }
          const ph = (now - I.beatAt) / 1000;
          pulse = (0.18 + 0.22 * lowK) * (Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.17) * 9) * (ph > 0.17 ? 1 : 0)) + 0.12 + 0.12 * lowK;
        }
        __imfPaint(live ? I.flash : 0, pulse, I.white && I.flash > 0.25);
        I.n++;
      } catch (e) {
        __IMF.err = String(e && e.stack);
      }
    }, -1);
    return M.jsx(prevTrees, {});
  };
}
typeof window < 'u' &&
  (window.__bpImpact = () => ({ p: +__IMF.p.toFixed(3), y: +__IMF.y.toFixed(3), r: +__IMF.r.toFixed(3), shake: +__IMF.shake.toFixed(2), flash: +__IMF.flash.toFixed(2), frames: __IMF.n, err: __IMF.err }));
