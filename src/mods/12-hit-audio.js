/* ===== Bayou Protocol mod: hit / headshot / kill confirmation audio ===== */
(function () {
  if (typeof window > 'u') return;
  let ac = null;
  const get = () => {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
    return ac;
  };
  const wake = () => {
    const a = get();
    a && a.state === 'suspended' && a.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', wake, !0);
  window.addEventListener('keydown', wake, !0);
  const blip = (f0, f1, dur, vol, type = 'triangle', delay = 0) => {
    const a = get();
    if (!a || a.state !== 'running') return;
    const t = a.currentTime + delay,
      o = a.createOscillator(),
      g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const v = vol * (eA.settings.volume ?? 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  let lastHit = 0;
  eA.on((ev) => {
    const S = eA.state;
    if (!S || eA.attract) return;
    const me = S.humanId;
    for (const e of ev) {
      if (e.type === 'hit' && e.attacker === me && e.victim !== me) {
        const n = performance.now();
        if (n - lastHit < 28) continue;
        lastHit = n;
        if (e.headshot) {
          blip(2300, 1500, 0.09, 0.34, 'square');
          blip(3400, 2600, 0.06, 0.16, 'sine', 0.012);
        } else if (e.shield) blip(900, 620, 0.06, 0.2, 'sine');
        else blip(1250, 820, 0.045, 0.22, 'triangle');
      } else if (e.type === 'kill' && e.killer === me && e.victim !== me) {
        blip(520, 300, 0.16, 0.34, 'sine', 0.03);
        blip(e.headshot ? 1560 : 1040, e.headshot ? 1180 : 780, 0.2, 0.26, 'triangle', 0.05);
        blip(e.headshot ? 2080 : 1560, e.headshot ? 1560 : 1180, 0.24, 0.18, 'sine', 0.11);
      }
    }
  });
})();
