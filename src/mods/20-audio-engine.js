/* ===== Bayou Protocol mod: audio engine stability ===== */
// Fixes sound fading into crackle and then silence after some seconds of play.
// Cause: every sound built a new chain (gain, filters, HRTF panner, two reverb sends) that was never
// disconnected from the shared buses, so the audio thread processed an ever-growing graph
// (about 28k nodes a minute with bots firing) until it could no longer keep up.
// This replaces the core's voice router `xw` with one that:
//   - disconnects each voice chain once its sound has finished
//   - caps simultaneous voices, dropping the quietest/farthest sounds first (your own always play)
//   - uses HRTF panning only for a few nearby sounds, cheaper equal-power panning for the rest
//   - resumes the context when the browser suspends it (tab switch, device change, Safari interruptions)
const __AUD = {
  maxVoices: 56,
  maxHrtf: 10,
  voices: [], // { end, prio, nodes, hrtf }
  life: 4.5, // seconds a voice chain is kept before it is disconnected (longest tails, slow reloads, ~3.5s)
};
function __audReap(now) {
  const v = __AUD.voices;
  let w = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (x.end <= now) {
      for (const n of x.nodes) {
        try {
          n.disconnect();
        } catch {}
      }
    } else v[w++] = x;
  }
  v.length = w;
}
function __audDrop(prio) {
  // free a slot by cutting the lowest-priority voice if it is quieter than the new one
  const v = __AUD.voices;
  let k = -1,
    p = prio;
  for (let i = 0; i < v.length; i++) if (v[i].prio < p) (p = v[i].prio), (k = i);
  if (k < 0) return !1;
  const x = v[k];
  try {
    const t = $i.currentTime;
    x.nodes[0].gain.cancelScheduledValues(t);
    x.nodes[0].gain.setTargetAtTime(0, t, 0.015);
  } catch {}
  x.end = Math.min(x.end, $i.currentTime + 0.08);
  x.prio = -1;
  return !0;
}
xw = function (w, A, i = {}) {
  if (!$i || !yC || !aj || !Jj) return null;
  const I = $i,
    now = I.currentTime;
  __audReap(now);
  let n = 0;
  if (w) {
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.z)) return null;
    n = Math.hypot(w.x - In.pos.x, w.y - In.pos.y, w.z - In.pos.z);
    if (n > (i.maxDist ?? 160)) return null;
  }
  const gain = Number.isFinite(A) ? A : 0;
  // priority: your own sounds first, then loud and near sounds
  const prio = w ? gain / (1 + n / 12) : 10 + gain;
  const live = __AUD.voices.length;
  if (live >= __AUD.maxVoices && !__audDrop(prio)) return null;
  const B = I.createGain(),
    nodes = [B];
  let g = now + 0.005,
    e = !1,
    D = B,
    hrtf = !1;
  if (w) {
    i.travel && (g += n / F1);
    const c = I.createBiquadFilter();
    c.type = 'lowpass';
    c.frequency.value = Math.max(1800, 18e3 / (1 + n / 18));
    D.connect(c);
    D = c;
    nodes.push(c);
    if (i.occlude !== !1 && n > 2 && !Pg(In.pos, { ...w, y: w.y + 0.2 }, aw().boxes)) {
      e = !0;
      const j = I.createBiquadFilter();
      j.type = 'lowpass';
      j.frequency.value = 900;
      const d = I.createGain();
      d.gain.value = 0.45;
      D.connect(j).connect(d);
      D = d;
      nodes.push(j, d);
    }
    const t = I.createPanner();
    hrtf = n < 18 && __AUD.voices.reduce((s, x) => s + (x.hrtf ? 1 : 0), 0) < __AUD.maxHrtf;
    t.panningModel = hrtf ? 'HRTF' : 'equalpower';
    t.distanceModel = 'inverse';
    t.refDistance = 2.5;
    t.rolloffFactor = 1.05;
    t.maxDistance = 400;
    t.positionX.value = w.x;
    t.positionY.value = w.y;
    t.positionZ.value = w.z;
    D.connect(t);
    D = t;
    nodes.push(t);
  }
  B.gain.value = gain;
  D.connect(yC);
  const s = (i.reverb ?? 0.2) * (w ? Math.min(2.2, 0.6 + n / 25) : 1),
    C = w ? RE(w) : In.indoor;
  if (s > 0.001) {
    const o = I.createGain();
    o.gain.value = s * (C ? 0.35 : 1);
    const l = I.createGain();
    l.gain.value = s * (C ? 1 : 0.25);
    D.connect(o).connect(aj);
    D.connect(l).connect(Jj);
    nodes.push(o, l);
  }
  __AUD.voices.push({ end: g + __AUD.life, prio, nodes, hrtf });
  return { in: B, t: g, dist: n, occluded: e };
};
// The core's ramp helpers throw on a zero/negative target (exponential ramps need > 0); clamp instead
// so one silent layer can't abort the rest of a sound or the event loop that triggered it.
{
  const P = AudioParam.prototype,
    ex = P.exponentialRampToValueAtTime;
  P.exponentialRampToValueAtTime = function (v, t) {
    if (!(v > 0) || !Number.isFinite(v)) v = v < 0 ? -Math.max(1e-4, Math.abs(v) || 1e-4) : 1e-4;
    return ex.call(this, v, Number.isFinite(t) ? t : 0);
  };
}
// keep the context alive for the whole session
if (typeof window < 'u') {
  let touched = !1;
  const kick = () => {
    if (!$i || !touched) return;
    const st = $i.state;
    (st === 'suspended' || st === 'interrupted') && $i.resume().catch(() => {});
  };
  const mark = () => {
    touched = !0;
    kick();
  };
  window.addEventListener('pointerdown', mark, !0);
  window.addEventListener('keydown', mark, !0);
  document.addEventListener('visibilitychange', () => document.hidden || kick());
  window.addEventListener('focus', kick);
  setInterval(() => {
    kick();
    $i && __audReap($i.currentTime);
  }, 1000);
}
