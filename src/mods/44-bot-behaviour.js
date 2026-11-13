/* ===== Bayou Protocol mod: calmer, more believable bots ===== */
// What looked wrong: in a fight the bot AI re-rolled "crouch" every simulation tick (a coin flip at range,
// random flips while holding an angle), so bots bobbed up and down many times a second; and they strafed
// left-right at full running speed, flipping direction every 0.4-1.2 s while shooting.
// Now, applied to the bot's inputs before each update:
//   - crouch is a decision held for 1.5-3 s (planting and defusing still crouch at once)
//   - in a fight (has a target, or fired in the last 0.8 s) a bot moves at walking pace like a player
//     who wants to hit something, and keeps a strafe direction for at least 0.9-1.7 s
//   - knife, shotgun and flamethrower bots still rush in at full speed
// The aiming, reactions and difficulty settings are unchanged.
const __BOTB = new Map();
{
  const coreUpdate = Y8;
  Y8 = function (w, A, i, I) {
    try {
      if (A.isBot && A.alive && i && w.t !== void 0 && !(typeof window < 'u' && window.__botbOff)) {
        let c = __BOTB.get(A.id);
        c || __BOTB.set(A.id, (c = { cr: !1, crUntil: 0, sSign: 0, sUntil: 0 }));
        const b = w.brains && w.brains[A.id],
          wp = A.weapons[A.active],
          rush = wp && /knife|shotgun|mauler|flamer/.test(wp.id),
          fighting = !!(b && b.target) || w.t - (A.lastShotAt ?? -9) < 0.8;
        if (i.use && i.crouch) c.cr = !0;
        else if (w.t >= c.crUntil || i.crouch === c.cr) {
          if (i.crouch !== c.cr) c.cr = !!i.crouch;
          w.t >= c.crUntil && (c.crUntil = w.t + (c.cr ? 1.8 : 1.5) + Math.random() * 1.3);
        }
        i.crouch = c.cr;
        if (fighting && !rush) {
          const sg = Math.sign(i.strafe || 0);
          if (sg !== c.sSign && w.t >= c.sUntil) {
            c.sSign = sg;
            c.sUntil = w.t + 0.9 + Math.random() * 0.8;
          }
          i.strafe = c.sSign;
          if (i.strafe || i.forward) (i.walk = !0), (i.sprint = !1);
        } else c.sSign = Math.sign(i.strafe || 0);
      }
    } catch (e) {}
    return coreUpdate.apply(this, arguments);
  };
}
