/* ===== Bayou Protocol mod: long-range shots register ===== */
// Before: each gun's bullet stopped at its "range" (pistol 60 m, SMG 50 m, rifles 120-160 m, shotgun 22 m).
// On a 200 m map a perfectly aimed shot at a player further away simply vanished, with no hit and no impact.
// Now:
//   - every bullet travels up to 800 m. Damage still falls with distance through each gun's own falloff
//     (damage x (1 - falloff)^(metres / 10)), so the closer you are the harder it hits. At 200 m a rifle
//     keeps about 72 % of its damage, a pistol about 29 %, an SMG about 12 %; shotgun pellets almost nothing.
//   - first-shot accuracy: standing still on the ground and not spraying, the first shot goes almost exactly
//     where the crosshair points (random spread x 0.15). The rifles' base spread (0.004 rad) alone was about
//     60 cm of scatter at 150 m, so even perfect aim missed half the time. Moving or spraying spreads as before.
//   - the knife, flamethrower and rockets keep their own reach.
const __LR = { reach: 800, firstShot: 0.15 };
{
  const coreBullet = l1;
  l1 = function (w, A, i, I, B) {
    const g = gw[B];
    if (!g || B === 'knife' || g.special) return coreBullet.apply(this, arguments);
    const r0 = g.range;
    g.range = Math.max(r0, __LR.reach);
    try {
      return coreBullet.apply(this, arguments);
    } finally {
      g.range = r0;
    }
  };
}
{
  const coreSpread = _O;
  _O = function (w, A, i, I, B, g, n) {
    const e = coreSpread.apply(this, arguments);
    // still (under 8 % of run speed), on the ground and no recoil built up: the first bullet goes true
    return (+A || 0) < 0.08 && i && (+B || 0) < 0.004 && !w.special && w.pellets <= 1 ? e * __LR.firstShot : e;
  };
}
// test hook: fire one bullet from a point in a direction, as the human would (returns the damage dealt)
typeof window < 'u' &&
  (window.__bpBullet = (from, dir, weapon = 'rifle') => {
    const S = eA.state,
      me = eA.human(),
      before = S.players.map((p) => p.health);
    l1(S, me, from, dir, weapon);
    return S.players.map((p, k) => ({ name: p.name, dmg: before[k] - p.health })).filter((x) => x.dmg);
  });
