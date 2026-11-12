/* ===== Bayou Protocol mod: ballistic FX (bullets, flashes, shells, smoke) ===== */
const __fx = { g: null, ready: !1, flashes: [], cas: [], smoke: [], nf: 0, nc: 0, ns: 0 };
function __fxTex(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  if (kind === 'star') {
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,230,1)');
    gr.addColorStop(0.18, 'rgba(255,214,120,.95)');
    gr.addColorStop(0.45, 'rgba(255,140,40,.45)');
    gr.addColorStop(1, 'rgba(255,90,20,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'lighter';
    x.translate(64, 64);
    for (let i = 0; i < 7; i++) {
      x.rotate((Math.PI * 2) / 7 + Math.random() * 0.3);
      const l = 40 + Math.random() * 22;
      const g2 = x.createLinearGradient(0, 0, l, 0);
      g2.addColorStop(0, 'rgba(255,235,170,.9)');
      g2.addColorStop(1, 'rgba(255,140,40,0)');
      x.fillStyle = g2;
      x.beginPath();
      x.moveTo(0, -5);
      x.lineTo(l, 0);
      x.lineTo(0, 5);
      x.fill();
    }
  } else if (kind === 'glow') {
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(0.25, 'rgba(255,220,150,.7)');
    gr.addColorStop(1, 'rgba(255,160,60,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
  } else {
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(220,220,215,.55)');
    gr.addColorStop(1, 'rgba(200,200,195,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
  }
  const t = new LI(c);
  t.colorSpace = Tw;
  return t;
}
let __glowMat = null;
function __fxGlowMat() {
  return (
    __glowMat ||
    (__glowMat = new Io({
      map: __fxTex('glow'),
      color: '#ffd9a0',
      transparent: !0,
      depthWrite: !1,
      blending: Ao,
      toneMapped: !1,
    }))
  );
}
function __fxInit(g) {
  if (__fx.ready && __fx.g === g) return;
  __fx.g = g;
  __fx.ready = !0;
  const sm = new Io({ map: __fxTex('star'), transparent: !0, depthWrite: !1, blending: Ao, toneMapped: !1 });
  __fx.flashes = [...Array(24)].map(() => {
    const s = new Cc(sm.clone());
    s.visible = !1;
    g.add(s);
    return { s, life: 0, max: 0.05 };
  });
  const cg = new Rw(0.0045, 0.0045, 0.02, 6).rotateZ(Math.PI / 2),
    cm = new Gw({ color: '#c9a24a', metalness: 1, roughness: 0.3 });
  __fx.cas = [...Array(60)].map(() => {
    const m = new Ow(cg, cm);
    m.visible = !1;
    m.castShadow = !1;
    g.add(m);
    return { m, v: new U(), spin: new U(), life: 0, floor: 0, b: 0 };
  });
  const smm = new Io({ map: __fxTex('smoke'), transparent: !0, depthWrite: !1 });
  __fx.smoke = [...Array(40)].map(() => {
    const s = new Cc(smm.clone());
    s.visible = !1;
    g.add(s);
    return { s, v: new U(), life: 0, max: 1 };
  });
}
function __fxShot(g, j, Z, local) {
  if (!g) return;
  __fxInit(g);
  if (j.weapon === 'knife' || j.weapon === 'grenade' || j.weapon === 'flamer') return;
  const w = gw[j.weapon] || gw.rifle,
    sup = j.suppressed,
    b = Hi(Z),
    u = cI(Z.yaw, Z.pitch),
    r = { x: Math.cos(Z.yaw), z: -Math.sin(Z.yaw) };
  const pis = w.slot === 2,
    mz = {
      x: b.x + u.x * (pis ? 0.55 : 0.85) + r.x * 0.14,
      y: b.y - 0.2 + u.y * 0.8,
      z: b.z + u.z * (pis ? 0.55 : 0.85) + r.z * 0.14,
    };
  if (!local && !sup) {
    const f = __fx.flashes[__fx.nf++ % __fx.flashes.length];
    f.s.position.set(mz.x, mz.y, mz.z);
    const k =
      (w.special === 'rocket' ? 2.2 : w.pellets > 1 ? 1.5 : w.damage > 40 ? 1.25 : 1) * (0.8 + Math.random() * 0.4);
    f.s.scale.setScalar(0.42 * k);
    f.s.material.rotation = Math.random() * 6.28;
    f.s.material.opacity = 1;
    f.s.visible = !0;
    f.life = f.max = 0.045 + Math.random() * 0.02;
  }
  if (w.mag > 0 && w.pellets === 1 && w.special !== 'rocket' && !local) {
    const c = __fx.cas[__fx.nc++ % __fx.cas.length];
    c.m.position.set(mz.x - u.x * 0.55 + r.x * 0.05, mz.y + 0.04, mz.z - u.z * 0.55 + r.z * 0.05);
    c.v.set(
      r.x * (1.6 + Math.random()) - u.x * 0.4,
      1.4 + Math.random() * 0.8,
      r.z * (1.6 + Math.random()) - u.z * 0.4,
    );
    c.spin.set(Math.random() * 30, Math.random() * 30, Math.random() * 30);
    c.life = 2.2;
    c.b = 0;
    c.floor = rm({ x: mz.x, y: Z.pos.y + 0.1, z: mz.z });
    c.m.visible = !0;
  }
  if (!sup) {
    const s = __fx.smoke[__fx.ns++ % __fx.smoke.length];
    s.s.position.set(mz.x + u.x * 0.1, mz.y, mz.z + u.z * 0.1);
    s.v.set(u.x * 0.6 + (Math.random() - 0.5) * 0.2, 0.35, u.z * 0.6 + (Math.random() - 0.5) * 0.2);
    s.life = s.max = 0.55 + Math.random() * 0.3;
    s.s.scale.setScalar(0.12);
    s.s.material.opacity = 0.35;
    s.s.visible = !0;
  }
}
function __fxTick(dt) {
  if (!__fx.ready) return;
  for (const f of __fx.flashes)
    if (f.life > 0) {
      f.life -= dt;
      if (f.life <= 0) {
        f.s.visible = !1;
        continue;
      }
      f.s.material.opacity = f.life / f.max;
    }
  for (const c of __fx.cas)
    if (c.life > 0) {
      c.life -= dt;
      c.v.y -= 9.8 * dt;
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.spin.x * dt;
      c.m.rotation.y += c.spin.y * dt;
      c.m.rotation.z += c.spin.z * dt;
      if (c.m.position.y < c.floor + 0.005) {
        c.m.position.y = c.floor + 0.005;
        if (c.b < 2 && c.v.y < -0.6) {
          c.v.y *= -0.35;
          c.v.x *= 0.5;
          c.v.z *= 0.5;
          c.spin.multiplyScalar(0.5);
          c.b++;
        } else {
          c.v.set(0, 0, 0);
          c.spin.set(0, 0, 0);
        }
      }
      if (c.life <= 0) c.m.visible = !1;
    }
  for (const s of __fx.smoke)
    if (s.life > 0) {
      s.life -= dt;
      if (s.life <= 0) {
        s.s.visible = !1;
        continue;
      }
      const k = 1 - s.life / s.max;
      s.s.position.addScaledVector(s.v, dt);
      s.s.scale.setScalar(0.12 + k * 0.55);
      s.s.material.opacity = 0.32 * (1 - k);
    }
}
const __TRV = {
  sniper: [900, 6],
  phantom: [300, 2.2],
  lmg: [640, 3],
  ak47: [620, 2.6],
  midas: [620, 2.6],
  bastion: [680, 3],
  rampart: [670, 2.8],
  br: [650, 2.4],
  m16: [700, 2.4],
  rifle: [660, 2.4],
  hk416: [660, 2.4],
  sentinel: [660, 2.4],
  smg: [470, 1.8],
  pistol: [430, 1.4],
  warden: [440, 1.4],
  deagle: [480, 1.8],
  shotgun: [420, 1.1],
};
