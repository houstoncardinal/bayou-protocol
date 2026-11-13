/* ===== Bayou Protocol mod: calmer, more believable bots ===== */
// What looked wrong: in a fight the bot AI re-rolled "crouch" every simulation tick (a coin flip at range,
// random flips while holding an angle), so bots bobbed up and down many times a second; and they strafed
// left-right at full running speed, flipping direction every 0.4-1.2 s while shooting.
// Now, applied to the bot's inputs before each update:
//   - in a fight, crouching is decided once (about a third of long-range fights) and held to the end;
//     outside fights a crouch is held for 1.5-3 s (planting and defusing still crouch at once)
//   - a bot whose gun is empty with no reserve switches to its sidearm, or the knife, instead of
//     dry-firing (the repeating high click players heard)
//   - in a fight (has a target, or fired in the last 0.8 s) a bot moves at walking pace like a player
//     who wants to hit something, and keeps a strafe direction for at least 0.9-1.7 s
//   - knife, shotgun and flamethrower bots still rush in at full speed
// The aiming, reactions and difficulty settings are unchanged.
const __BOTB = new Map();
{
  const coreUpdate = Y8;
  Y8 = function (w, A, i, I) {
    try {
      if (A.isBot && A.alive && i && w.t !== void 0 && w.mode !== 'range' && !(typeof window < 'u' && window.__botbOff)) {
        let c = __BOTB.get(A.id);
        c || __BOTB.set(A.id, (c = { cr: !1, crUntil: 0, sSign: 0, sUntil: 0 }));
        const b = w.brains && w.brains[A.id],
          wp = A.weapons[A.active],
          rush = wp && /knife|shotgun|mauler|flamer/.test(wp.id),
          fightNow = !!(b && b.target) || w.t - (A.lastShotAt ?? -9) < 0.8;
        // a fight lasts until 2 s after the last sign of one (targets flicker in and out of view)
        fightNow && (c.fightUntil = w.t + 2);
        const fighting = fightNow || w.t < (c.fightUntil || 0);
        // crouching: decided once per fight (a few long-range fights are taken crouched) and held until
        // the fight is over; outside fights the AI's own crouch (planting, defusing, holding an angle) is
        // held for 1.5-3 s at a time
        const tgt = b && b.target && w.players.find((p) => p.id === b.target),
          dist = tgt ? Math.hypot(tgt.pos.x - A.pos.x, tgt.pos.z - A.pos.z) : 0;
        if (i.use && i.crouch) c.cr = !0;
        else if (fighting) {
          if (!c.engaged) {
            c.engaged = !0;
            c.cr = !rush && dist > 16 && Math.random() < 0.3;
          }
        } else {
          c.engaged = !1;
          if (w.t >= c.crUntil) {
            c.cr = !!i.crouch;
            c.crUntil = w.t + (c.cr ? 1.8 : 1.5) + Math.random() * 1.3;
          }
        }
        i.crouch = c.cr;
        // out of ammo: never stand there dry-firing (that was the repeating click) - sidearm, then knife
        const cur = A.weapons[A.active],
          d = cur && gw[cur.id];
        if (d && d.mag > 0 && cur.mag === 0 && cur.reserve === 0 && !(A.reloadLeft > 0)) {
          const alt = [1, 2].find((sl) => sl !== A.active && A.weapons[sl] && (A.weapons[sl].mag > 0 || A.weapons[sl].reserve > 0));
          i.slot = alt || 3;
          i.fire = i.firePressed = !1;
        }
        // no sprinting for 8 s after a fight: bots jog between positions instead of dashing everywhere
        !fighting && w.t - (c.fightUntil || -99) < 8 && (i.sprint = !1);
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
// tagging: a hit slows the victim briefly (read by the movement code: __MV.tag / __MV.tagT)
{
  const coreDamage = Ee;
  Ee = function (w, A, i, I) {
    const r = coreDamage.apply(this, arguments);
    try {
      A && A.alive && I > 0 && (A.__tagT = w.t);
    } catch (e) {}
    return r;
  };
}
