/* ===== Bayou Tactical mod: settings fixes ===== */
// Every setting in Settings, the in-match menu and its quick settings is wired to the system it controls and
// applies the moment it changes. The fixes that do not belong to another mod live here.

const __SFX = { fx: null };
{
  const coreFx = hiA;
  hiA = function (p) {
    __SFX.fx = !!eA.settings.filmFx;
    return coreFx.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- test probe (dev builds; removed in production
// with the other __bp hooks by 55-competitive.js)
typeof window < 'u' &&
  (window.__bpSettings = () => {
    const st = typeof __R3F < 'u' && __R3F && (__R3F.get ? __R3F.get() : __R3F),
      gl = st && st.gl,
      vm = window.__vmScene;
    let sun = null;
    st &&
      st.scene.traverse((o) => {
        !sun && o.isDirectionalLight && o.castShadow && (sun = o);
      });
    return {
      fov: st && st.camera.fov,
      cam: st && [st.camera.position.x, st.camera.position.y, st.camera.position.z, st.camera.rotation.z],
      dpr: gl && gl.getPixelRatio(),
      canvas: gl && [gl.domElement.width, gl.domElement.height],
      shadows: gl && gl.shadowMap.enabled,
      shadowSize: sun && sun.shadow.mapSize.x,
      master: typeof Ce < 'u' && Ce ? Ce.gain.value : null,
      amb: typeof oe < 'u' && oe ? oe.gain.value : null,
      ctx: typeof $i < 'u' && $i ? $i.state : null,
      hand: vm && vm.children.map((c) => c.scale.x),
      fx: __SFX.fx,
      sky: st && st.scene.background && st.scene.background.isColor ? st.scene.background.getHexString() : st && st.scene.fog && st.scene.fog.color.getHexString(),
      envI: st && +(st.scene.environmentIntensity || 0).toFixed(3),
      lights: st && (() => { const a = []; st.scene.traverse((o) => o.isLight && a.length < 6 && a.push(o.type[0] + ':' + o.intensity.toFixed(2) + ':' + o.color.getHexString())); return a.join(' '); })(),
    };
  });
// tests: the human killed by the nearest enemy, through the game's own death path
typeof window < 'u' &&
  (window.__bpSettingsDie = () => {
    const S = eA.state,
      me = eA.human(),
      k = S && me && S.players.find((p) => p.team !== me.team && p.alive);
    k && me.alive && o1(S, me, k, 'rifle', !1, { dir: { x: me.pos.x - k.pos.x, y: 0, z: me.pos.z - k.pos.z } });
    return !!k;
  });
// tests: what dynamic resolution does when the frame rate dips
typeof window < 'u' &&
  (window.__bpSettingsDrop = (v) => {
    const st = __R3F && (__R3F.get ? __R3F.get() : __R3F);
    eA.__dyn && (eA.__dyn.dpr = v);
    st.setDpr(v);
  });
