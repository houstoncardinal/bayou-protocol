/* ===== Bayou Protocol mod: Capture the Flag ===== */
function __ctfInit(m) {
  const o = {};
  for (const X of ['CT', 'T']) {
    const z = m.spawnZones[X],
      c = { x: (z.min.x + z.max.x) / 2, y: Math.max(0, z.min.y), z: (z.min.z + z.max.z) / 2 },
      h = a1(c);
    o[X] = { home: { ...h }, pos: { ...h }, state: 'home', carrier: null, dropAt: 0 };
  }
  return o;
}
function __ctfHome(f) {
  f.state = 'home';
  f.carrier = null;
  f.pos = { ...f.home };
}
function __ctfAnn(w, text, team) {
  w.fx.push({ type: 'announce', text, team });
}
function __ctfTick(w, dt) {
  const C = w.ctf;
  if (!C) return;
  for (const X of ['CT', 'T']) {
    const f = C[X],
      E = D1(X),
      tn = ii[X].name;
    if (f.state === 'carried') {
      const c = XB(w, f.carrier);
      if (!c || !c.alive) {
        f.state = 'dropped';
        f.carrier = null;
        f.dropAt = w.t;
        f.pos = { x: (c || f).pos.x, y: Math.max(0, (c || f).pos.y), z: (c || f).pos.z };
        __ctfAnn(w, `${tn} flag dropped`, X);
        continue;
      }
      f.pos = { x: c.pos.x, y: c.pos.y, z: c.pos.z };
      const mine = C[E];
      if (mine.state === 'home' && Ci(c.pos, mine.home) < 2.4 && Math.abs(c.pos.y - mine.home.y) < 2) {
        w.score[E] += 1;
        c.captures = (c.captures || 0) + 1;
        un(w, c, je.capture * 2, 'Flag captured');
        w.fx.push({ type: 'medal', who: c.id, text: 'Flag Captured' });
        w.fx.push({ type: 'capture', flag: 'F', team: E, who: c.id });
        __ctfAnn(w, `${ii[E].name} captured the flag!`, E);
        __ctfHome(f);
      }
      continue;
    }
    const near = w.players.filter((p) => p.alive && Ci(p.pos, f.pos) < 1.5 && Math.abs(p.pos.y - f.pos.y) < 2.2);
    if (f.state === 'dropped') {
      if (w.t - f.dropAt > 20) {
        __ctfHome(f);
        __ctfAnn(w, `${tn} flag returned`, X);
        continue;
      }
      const own = near.find((p) => p.team === X);
      if (own) {
        __ctfHome(f);
        un(w, own, 50, 'Flag returned');
        __ctfAnn(w, `${tn} flag returned`, X);
        continue;
      }
    }
    const en = near.find((p) => p.team === E);
    if (en) {
      f.state = 'carried';
      f.carrier = en.id;
      un(w, en, 50, 'Flag taken');
      __ctfAnn(w, `${ii[E].name} took the ${tn} flag`, E);
    }
  }
}
function __ctfGoal(w, A, i, e) {
  const X = A.team,
    E = D1(X),
    my = w.ctf[X],
    en = w.ctf[E],
    keep = (p) =>
      i.goal && w.t < i.patrolAt && Ci(i.goal, A.pos) > 2 ? i.goal : ((i.patrolAt = w.t + 6 + Dw(w) * 6), p);
  if (en.carrier === A.id) return { ...my.home };
  if (my.state === 'carried') {
    const c = XB(w, my.carrier);
    if (c && e % 3 !== 2) return { ...c.pos };
  }
  if (my.state === 'dropped' && e % 2 === 0) return { ...my.pos };
  if (e % 3 === 2) return keep(Fo(w, my.home, 6));
  if (en.state === 'carried') {
    const c = XB(w, en.carrier);
    return c && e % 2 === 0 ? Fo(w, c.pos, 4) : keep(Fo(w, en.home, 8));
  }
  return { ...en.pos };
}
function __ctfPack(A) {
  const S = ['home', 'carried', 'dropped'];
  return ['CT', 'T'].map((X) => {
    const f = A.ctf[X];
    return [
      S.indexOf(f.state),
      Sw(f.pos.x),
      Sw(f.pos.y),
      Sw(f.pos.z),
      f.carrier || '',
      Math.round(Math.max(0, 20 - (A.t - f.dropAt))),
    ];
  });
}
function __ctfUnpack(A, a) {
  if (!A.ctf || !Array.isArray(a)) return;
  const S = ['home', 'carried', 'dropped'];
  ['CT', 'T'].forEach((X, k) => {
    const r = a[k];
    if (!Array.isArray(r)) return;
    const f = A.ctf[X];
    f.state = S[Nw(r[0])] || 'home';
    f.pos = { x: si(r[1]), y: si(r[2]), z: si(r[3]) };
    f.carrier = Ri(r[4], 16) || null;
    f.dropAt = A.t - (20 - Nw(r[5]));
  });
}
// 3D flags
const __flag = { objs: null };
function __flagTick(t) {
  const S = eA.state,
    g = __fx.g;
  if (!g) return;
  if (!S || S.mode !== 'ctf' || !S.ctf) {
    if (__flag.objs) for (const o of __flag.objs) o.root.visible = !1;
    return;
  }
  if (!__flag.objs) {
    __flag.objs = ['CT', 'T'].map((X) => {
      const root = new ji(),
        col = new UA(ii[X].main);
      const pole = new Ow(new Rw(0.03, 0.03, 2.8, 8), new Gw({ color: '#d8d8d8', metalness: 0.8, roughness: 0.3 }));
      pole.position.y = 1.4;
      const cg = new bB(1.3, 0.8, 14, 4);
      cg.translate(0.65, 0, 0);
      const cloth = new Ow(
        cg,
        new Gw({ color: col, side: Vi, roughness: 0.7, emissive: col, emissiveIntensity: 0.25 }),
      );
      cloth.position.y = 2.35;
      const beam = new Ow(
        new Rw(0.18, 0.18, 40, 12, 1, !0),
        new Ni({ color: col, transparent: !0, opacity: 0.3, depthWrite: !1, blending: Ao, toneMapped: !1 }),
      );
      beam.position.y = 20;
      const ring = new Ow(new oI(1.4, 0.05, 8, 40), new Ni({ color: col, toneMapped: !1 }));
      ring.rotation.x = Math.PI / 2;
      root.add(pole, cloth, beam);
      g.add(root, ring);
      return { X, root, cloth, ring, base: cg.attributes.position.array.slice() };
    });
  }
  for (const o of __flag.objs) {
    const f = S.ctf[o.X];
    o.root.visible = !0;
    o.ring.position.set(f.home.x, f.home.y + 0.05, f.home.z);
    o.ring.visible = f.state !== 'home';
    o.root.position.set(f.pos.x, f.pos.y + (f.state === 'carried' ? 0.6 : 0), f.pos.z);
    o.root.scale.setScalar(f.state === 'carried' ? 0.6 : 1);
    const p = o.cloth.geometry.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = o.base[k * 3];
      p.setZ(k, Math.sin(t * 6 + x * 6) * 0.08 * x);
    }
    p.needsUpdate = !0;
    o.cloth.geometry.computeVertexNormals();
    o.root.rotation.y = Math.sin(t * 0.4) * 0.3;
  }
}
