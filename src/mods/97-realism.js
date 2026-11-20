/* ===== Bayou Tactical mod: realism (bounced light, temporal AA, reflections, light shafts, eye adaptation) ===== */
// 1. Bounced light (global illumination from light probes). Indoors the game lit everything with a flat "fill" colour
//    plus the few nearest lamps, so every room looked lit the same way. Now each indoor space gets a light probe: a
//    tiny 16 x 16 picture of the room is taken in all six directions (one direction a frame, read back from the
//    graphics card asynchronously, so no frame ever waits), turned into a few numbers that describe the light
//    arriving from every direction (spherical harmonics), and every surface and every character in that space is lit
//    by it: the warm spill from a fireplace, the colour bounced off red velvet or green felt, the gloom of a tunnel,
//    the glow of a screen. Probes blend softly across doorways. Rooms also stop reflecting the open sky: their sky
//    reflections are scaled to the room's own light.
//      Where: Frostline's house, tunnels and condo (every room), and every map's indoor areas (callout areas with a
//      floor or roof over them). Up to 96 probes a map, captured in the background as the match starts (about six
//      seconds), nearest first.
// 2. Temporal anti-aliasing. Each frame the camera is moved by a fraction of a pixel (an 8-step Halton pattern) and
//    the frame is blended with the last ones, reprojected through the depth buffer, with the history clamped to the
//    colours round each pixel (no ghost trails). Foliage, fences, wires and distant edges stop shimmering and gain
//    detail no single frame has. Off on Low. (No jitter while a YouTube screen is playing: its player sits behind
//    the game and cannot be jittered with it.)
// 3. Screen-space reflections (High). Glossy surfaces (marble, polished floors, lacquer, chrome, gold, water, wet
//    tiles: roughness under 0.42) reflect what is actually on screen: a ray is marched through last frame's depth and
//    the reflected colour taken from last frame's picture, faded at the screen's edges and with roughness, tinted by
//    the material (gold reflects gold), stronger at grazing angles.
// 4. Light shafts. Where the sky shows between trees, beams, rooftops and canyon walls, the sun's light streams out
//    from it across the picture (radial sampling of the sky in the depth buffer, smoothed by the temporal AA).
// 5. Eye adaptation. The average brightness of the picture is measured on the graphics card every frame and the
//    exposure eases towards it: step from blinding snow into the cabin and your eyes open up over a second or so;
//    step out and the glare settles back. Gentle limits, so the look the maps were made with is kept.
// Quality: High all of it; Medium bounced light, temporal AA, light shafts (lighter) and eye adaptation; Low none.
// Switches for testing: window.__fxOff = 'gi,taa,ssr,rays,exposure' (any of them).
const __RL = {
  P: [new oi(), new oi(), new oi(), new oi(), new oi()], // [gi on, strength, fade, n] [ssr on, strength] [near, far] [union min] [union max]
  M: [new _A()], // last frame's view-projection (for the reflections)
  BMIN: Array.from({ length: 16 }, () => new oi()),
  BMAX: Array.from({ length: 16 }, () => new oi()),
  SH: Array.from({ length: 64 }, () => new oi()),
  col: new Ti(1, 1, { type: 1016, depthBuffer: !1 }),
  // one channel (R32F), nearest: a quarter of an RGBA float copy
  dep: new Ti(1, 1, { type: 1015, format: 1028, minFilter: 1003, magFilter: 1003, depthBuffer: !1 }),
  probes: [],
  map: null,
  bake: null,
  pass: null,
  frame: 0,
  jit: [0, 0],
  vpUn: new _A(),
  stats: {},
  err: null,
};
const __rlOff = (k) => typeof window < 'u' && (window.__fxOff || '').includes(k);
// On (Medium and High; Low has none of it). localStorage.setItem('bp-realism', '0') and a reload switch it off
// entirely (the shaders unchanged), window.__fxOff any part of it live.
const __RL_ON = (() => {
  try {
    return !(typeof localStorage < 'u' && localStorage.getItem('bp-realism') === '0');
  } catch (e) {
    return !0;
  }
})();
// ---------------------------------------------------------------- the shaders every lit material uses
// (three.js builds each material's shader from its shader library when it first draws it: changing the library
// now, before anything is drawn, gives every material the code, with no extra compiles. The uniforms are arrays,
// which three.js copies by reference, so one set of values here feeds every material.)
__RL_ON && (() => {
  const decl = `
varying vec3 vRlW;
uniform vec4 rlP[5]; uniform vec4 rlBmin[16]; uniform vec4 rlBmax[16]; uniform vec4 rlSH[64];`;
  const vtx = `
{ vec4 rlPos = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  rlPos = instanceMatrix * rlPos;
#endif
  vRlW = ( modelMatrix * rlPos ).xyz; }`;
  const gi = `
if ( rlP[0].x > 0.5 && all( greaterThan( vRlW, rlP[3].xyz ) ) && all( lessThan( vRlW, rlP[4].xyz ) ) ) {
  vec3 rlN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 rlSum = vec3( 0.0 ); float rlWs = 0.0;
  for ( int i = 0; i < 16; i ++ ) {
    if ( float( i ) >= rlP[0].w ) break;
    vec3 d = max( max( rlBmin[i].xyz - vRlW, vRlW - rlBmax[i].xyz ), 0.0 );
    float w = 1.0 - smoothstep( 0.0, rlP[0].z, length( d ) );
    if ( w <= 0.0 ) continue;
    vec3 e = rlSH[i * 4].rgb * 0.886227 + 1.023328 * ( rlSH[i * 4 + 1].rgb * rlN.y + rlSH[i * 4 + 2].rgb * rlN.z + rlSH[i * 4 + 3].rgb * rlN.x );
    rlSum += max( e, vec3( 0.0 ) ) * w; rlWs += w;
  }
  if ( rlWs > 0.001 ) {
    float k = clamp( rlWs, 0.0, 1.0 ) * rlP[0].y;
    vec3 rlGi = rlSum / rlWs;
    irradiance = mix( irradiance, rlGi, k );
#ifdef STANDARD
    float rlSky = dot( iblIrradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) + 1e-4, rlRoom = dot( rlGi, vec3( 0.2126, 0.7152, 0.0722 ) );
    iblIrradiance *= 1.0 - k * 0.9;
    radiance *= mix( 1.0, clamp( rlRoom / rlSky, 0.03, 1.5 ), k );
#endif
  }
}`;
  const ssr = `
#ifdef STANDARD
if ( rlP[1].x > 0.5 && material.roughness < 0.42 ) {
  vec3 rN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 rV = normalize( vRlW - cameraPosition ), rR = reflect( rV, rN );
  float hit = 0.0, t = 0.12, st = 0.18; vec2 huv = vec2( 0.0 );
  for ( int i = 0; i < 24; i ++ ) {
    vec4 cp = rlM[0] * vec4( vRlW + rR * t, 1.0 );
    if ( cp.w <= 0.0 ) break;
    vec3 nd = cp.xyz / cp.w; vec2 uv = nd.xy * 0.5 + 0.5;
    if ( uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 ) break;
    float sz = texture2D( rlDep[0], uv ).r, rz = nd.z * 0.5 + 0.5;
    if ( rz > sz ) {
      float n = rlP[2].x, f = rlP[2].y;
      float ls = 2.0 * n * f / ( f + n - ( sz * 2.0 - 1.0 ) * ( f - n ) ), lr = 2.0 * n * f / ( f + n - ( rz * 2.0 - 1.0 ) * ( f - n ) );
      if ( lr - ls < 0.35 + t * 0.06 ) { hit = 1.0; huv = uv; }
      break;
    }
    t += st; st *= 1.16;
  }
  if ( hit > 0.5 ) {
    vec2 ed = min( huv, 1.0 - huv );
    float fade = smoothstep( 0.0, 0.08, min( ed.x, ed.y ) ) * ( 1.0 - smoothstep( 0.12, 0.42, material.roughness ) );
    float fr = pow( 1.0 - clamp( dot( -rV, rN ), 0.0, 1.0 ), 5.0 );
    outgoingLight += texture2D( rlCol[0], huv ).rgb * mix( material.specularColor, vec3( 1.0 ), fr ) * fade * rlP[1].y;
  }
}
#endif`;
  const U0 = () => ({ rlP: { value: __RL.P }, rlBmin: { value: __RL.BMIN }, rlBmax: { value: __RL.BMAX }, rlSH: { value: __RL.SH } });
  for (const k of ['standard', 'physical', 'lambert', 'phong']) {
    const L = Nn[k];
    if (!L || L.__rl) continue;
    L.__rl = 1;
    const std = k === 'standard' || k === 'physical';
    Object.assign(L.uniforms, U0(), std ? { rlM: { value: __RL.M }, rlCol: { value: [__RL.col.texture] }, rlDep: { value: [__RL.dep.texture] } } : {});
    L.vertexShader = L.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRlW;').replace('#include <project_vertex>', '#include <project_vertex>' + vtx);
    let f = L.fragmentShader.replace('#include <common>', '#include <common>' + decl + (std ? '\nuniform mat4 rlM[1]; uniform sampler2D rlCol[1]; uniform sampler2D rlDep[1];' : ''));
    f = f.replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>' + gi);
    std && (f = f.replace('#include <opaque_fragment>', ssr + '\n#include <opaque_fragment>'));
    L.fragmentShader = f;
  }
})();
// ---------------------------------------------------------------- the effect pass: temporal AA, light shafts, exposure
const __RL_VS = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }';
const __rlMat = (frag, uniforms) => new Qi({ vertexShader: __RL_VS, fragmentShader: frag, uniforms, depthWrite: !1, depthTest: !1, toneMapped: !1 });
class __RealismPass extends QB {
  constructor(q) {
    super('RealismPass');
    this.needsDepthTexture = !0;
    this.q = q;
    const H = () => new Ti(1, 1, { type: 1016, depthBuffer: !1 });
    this.hist = [H(), H()];
    this.hi = 0;
    this.has = 0;
    this.lum = new Ti(64, 64, { type: 1016, depthBuffer: !1, generateMipmaps: !0, minFilter: 1008 });
    // sampled at their one texel: nearest (float textures need not be filterable)
    const A1 = () => new Ti(1, 1, { type: 1015, depthBuffer: !1, minFilter: 1003, magFilter: 1003 });
    this.adapt = [A1(), A1()];
    this.ai = 0;
    this.depthTexture = null;
    this.t0 = performance.now();
    this.prevVP = new _A();
    this.invVP = new _A();
    this.sun = null;
    const rays = q === 'high' ? 28 : 16;
    this.resolve = __rlMat(
      `uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tHist; uniform mat4 uInvVP; uniform mat4 uPrevVP;
uniform vec2 uTexel; uniform float uHas; uniform float uTaa; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uFrame; varying vec2 vUv;
vec3 tm( vec3 c ) { return c / ( 1.0 + max( c.r, max( c.g, c.b ) ) ); }
vec3 itm( vec3 c ) { return c / max( 1e-4, 1.0 - max( c.r, max( c.g, c.b ) ) ); }
vec3 ycc( vec3 c ) { return vec3( 0.25 * c.r + 0.5 * c.g + 0.25 * c.b, 0.5 * c.r - 0.5 * c.b, -0.25 * c.r + 0.5 * c.g - 0.25 * c.b ); }
vec3 rgb( vec3 c ) { return vec3( c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z ); }
vec3 cur( vec2 uv ) {
  vec3 c = texture2D( tColor, uv ).rgb;
  if ( uSun.z > 0.0 ) {
    vec2 d = ( uSun.xy - uv ) / ${rays}.0; float n = fract( 52.9829189 * fract( dot( gl_FragCoord.xy + uFrame * 5.588, vec2( 0.06711056, 0.00583715 ) ) ) );
    vec2 p = uv + d * n; float acc = 0.0, w = 1.0, ws = 0.0;
    for ( int i = 0; i < ${rays}; i ++ ) { acc += step( 0.99999, texture2D( tDepth, p ).r ) * w; ws += w; w *= 0.93; p += d; }
    c += uSunCol * ( acc / ws ) * uSun.z * ( 1.0 - smoothstep( 0.0, 0.85, length( uSun.xy - uv ) ) );
  }
  return c;
}
void main() {
  vec4 c0 = texture2D( tColor, vUv );
  vec3 c = cur( vUv );
  if ( uTaa < 0.5 ) { gl_FragColor = vec4( c, c0.a ); return; }
  vec3 mn = vec3( 1e9 ), mx = vec3( -1e9 ), cy = ycc( tm( c ) );
  for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) {
    vec3 s = ( x == 0 && y == 0 ) ? cy : ycc( tm( texture2D( tColor, vUv + vec2( float( x ), float( y ) ) * uTexel ).rgb ) );
    mn = min( mn, s ); mx = max( mx, s );
  }
  float z = texture2D( tDepth, vUv ).r;
  vec4 wp = uInvVP * vec4( vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0 ); wp /= wp.w;
  vec4 pp = uPrevVP * wp; vec2 puv = pp.xy / pp.w * 0.5 + 0.5;
  bool ok = uHas > 0.5 && pp.w > 0.0 && puv.x > 0.0 && puv.x < 1.0 && puv.y > 0.0 && puv.y < 1.0;
  vec3 h = ok ? clamp( ycc( tm( texture2D( tHist, puv ).rgb ) ), mn, mx ) : cy;
  float motion = length( ( puv - vUv ) / uTexel );
  float a = ok ? mix( 0.1, 0.3, clamp( motion / 24.0, 0.0, 1.0 ) ) : 1.0;
  gl_FragColor = vec4( itm( rgb( mix( h, cy, a ) ) ), c0.a );
}`,
      {
        tColor: { value: null }, tDepth: { value: null }, tHist: { value: null }, uInvVP: { value: this.invVP }, uPrevVP: { value: this.prevVP },
        uTexel: { value: new aA(1, 1) }, uHas: { value: 0 }, uTaa: { value: 1 }, uSun: { value: new U() }, uSunCol: { value: new U() }, uFrame: { value: 0 },
      },
    );
    this.lumMat = __rlMat(
      `uniform sampler2D tSrc; varying vec2 vUv;
void main() { vec3 c = vec3( 0.0 ); for ( int i = 0; i < 4; i ++ ) { vec2 o = vec2( float( i - 2 ) + 0.5, float( ( i * 3 ) % 4 - 2 ) + 0.5 ) / 256.0; c += texture2D( tSrc, vUv + o ).rgb; }
  float l = dot( c * 0.25, vec3( 0.2126, 0.7152, 0.0722 ) ); gl_FragColor = vec4( log( max( l, 1e-4 ) ), 0.0, 0.0, 1.0 ); }`,
      { tSrc: { value: null } },
    );
    this.adaptMat = __rlMat(
      `uniform sampler2D tLum; uniform sampler2D tPrev; uniform float uDt; uniform float uFirst; uniform vec4 uK; varying vec2 vUv;
void main() { float avg = exp( textureLod( tLum, vec2( 0.5 ), 6.0 ).r );
  float target = clamp( pow( uK.x / max( avg, 1e-4 ), 0.5 ), uK.y, uK.z );
  float prev = uFirst > 0.5 ? target : texture2D( tPrev, vec2( 0.5 ) ).r;
  float rate = target > prev ? 1.1 : 2.2;
  gl_FragColor = vec4( mix( prev, target, 1.0 - exp( -uDt * rate ) ), avg, 0.0, 1.0 ); }`,
      { tLum: { value: null }, tPrev: { value: null }, uDt: { value: 0.016 }, uFirst: { value: 1 }, uK: { value: new oi(0.22, 0.8, 1.75, 0) } },
    );
    this.outMat = __rlMat(
      `uniform sampler2D tSrc; uniform sampler2D tExp; uniform float uExpOn; varying vec2 vUv;
void main() { vec4 c = texture2D( tSrc, vUv ); float e = uExpOn > 0.5 ? texture2D( tExp, vec2( 0.5 ) ).r : 1.0; gl_FragColor = vec4( c.rgb * e, c.a ); }`,
      { tSrc: { value: null }, tExp: { value: null }, uExpOn: { value: 1 } },
    );
    this.copyDepth = __rlMat(`uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = vec4( texture2D( tDepth, vUv ).r, 0.0, 0.0, 1.0 ); }`, { tDepth: { value: null } });
    this.copyCol = __rlMat(`uniform sampler2D tSrc; varying vec2 vUv; void main() { gl_FragColor = texture2D( tSrc, vUv ); }`, { tSrc: { value: null } });
  }
  setDepthTexture(t) {
    this.depthTexture = t;
  }
  setSize(w, h) {
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));
    for (const r of this.hist) r.setSize(w, h);
    // last frame's depth and picture are only kept for the reflections (High)
    const k = this.q === 'high' ? 1 : 0;
    __RL.dep.setSize(Math.max(1, w * k), Math.max(1, h * k));
    __RL.col.setSize(Math.max(1, w * k), Math.max(1, h * k));
    this.has = 0;
    this.resolve.uniforms.uTexel.value.set(1 / w, 1 / h);
  }
  draw(renderer, mat, target) {
    this.fullscreenMaterial = mat;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }
  render(renderer, inputBuffer, outputBuffer) {
    const cam = __RL.cam;
    if (!cam || !this.depthTexture) {
      this.copyCol.uniforms.tSrc.value = inputBuffer.texture;
      return this.draw(renderer, this.copyCol, this.renderToScreen ? null : outputBuffer);
    }
    const q = this.q,
      taa = q !== 'low' && !__rlOff('taa'),
      now = performance.now(),
      dt = Math.min(0.1, (now - this.t0) / 1000);
    this.t0 = now;
    __RL.frame++;
    // the sun: the strongest shadow-casting directional light
    if (!this.sun || !this.sun.parent || __RL.frame % 120 === 0) {
      this.sun = null;
      __RL.scene &&
        __RL.scene.traverse((o) => {
          o.isDirectionalLight && o.castShadow && o.intensity > 0 && (!this.sun || o.intensity > this.sun.intensity) && (this.sun = o);
        });
    }
    const R = this.resolve.uniforms;
    R.tColor.value = inputBuffer.texture;
    R.tDepth.value = this.depthTexture;
    R.tHist.value = this.hist[this.hi].texture;
    R.uHas.value = this.has;
    R.uTaa.value = taa ? 1 : 0;
    R.uFrame.value = __RL.frame % 64;
    this.invVP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
    // light shafts: where the sun is on (or near) the screen
    R.uSun.value.z = 0;
    if (this.sun && q !== 'low' && !__rlOff('rays')) {
      const d = __rlV.copy(this.sun.position).sub(this.sun.target.position).normalize(),
        sp = __rlV2.copy(cam.position).addScaledVector(d, 1000).applyMatrix4(__RL.vpUn),
        f = __rlV3.set(0, 0, -1).applyQuaternion(cam.quaternion).dot(d);
      if (f > 0.05) {
        const u = sp.x * 0.5 + 0.5,
          v = sp.y * 0.5 + 0.5,
          off = Math.max(0, Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) - 0.5);
        R.uSun.value.set(u, v, (q === 'high' ? 0.55 : 0.4) * Math.min(1, f * 2) * Math.max(0, 1 - off * 1.6));
        const c = this.sun.color,
          k = Math.min(1.5, this.sun.intensity * 0.18);
        R.uSunCol.value.set(c.r * k, c.g * k * 0.95, c.b * k * 0.85);
      }
    }
    // resolve into the new history
    const ni = 1 - this.hi;
    this.draw(renderer, this.resolve, this.hist[ni]);
    this.hi = ni;
    this.has = 1;
    // eye adaptation
    const expOn = !__rlOff('exposure') && q !== 'low';
    if (expOn) {
      this.lumMat.uniforms.tSrc.value = this.hist[ni].texture;
      this.draw(renderer, this.lumMat, this.lum);
      const A = this.adaptMat.uniforms,
        na = 1 - this.ai;
      A.tLum.value = this.lum.texture;
      A.tPrev.value = this.adapt[this.ai].texture;
      A.uDt.value = dt;
      this.draw(renderer, this.adaptMat, this.adapt[na]);
      A.uFirst.value = 0;
      this.ai = na;
    }
    this.outMat.uniforms.tSrc.value = this.hist[ni].texture;
    this.outMat.uniforms.tExp.value = this.adapt[this.ai].texture;
    this.outMat.uniforms.uExpOn.value = expOn ? 1 : 0;
    this.draw(renderer, this.outMat, this.renderToScreen ? null : outputBuffer);
    // for next frame's reflections: this frame's depth and picture, and its view-projection
    if (__RL.P[1].x > 0.5) {
      this.copyDepth.uniforms.tDepth.value = this.depthTexture;
      this.draw(renderer, this.copyDepth, __RL.dep);
      this.copyCol.uniforms.tSrc.value = this.hist[ni].texture;
      this.draw(renderer, this.copyCol, __RL.col);
      __RL.M[0].copy(__RL.vpUn);
    }
    this.prevVP.copy(__RL.vpUn);
  }
  dispose() {
    for (const r of [...this.hist, this.lum, ...this.adapt]) r.dispose();
    for (const m of [this.resolve, this.lumMat, this.adaptMat, this.outMat, this.copyDepth, this.copyCol]) m.dispose();
    super.dispose && super.dispose();
  }
}
const __rlV = new U(),
  __rlV2 = new U(),
  __rlV3 = new U(),
  __RL_HAL = Array.from({ length: 8 }, (_, i) => {
    const h = (n, b) => {
      let f = 1,
        r = 0;
      for (; n > 0; n = Math.floor(n / b)) (f /= b), (r += f * (n % b));
      return r;
    };
    return [h(i + 1, 2) - 0.5, h(i + 1, 3) - 0.5];
  });
// ---------------------------------------------------------------- light probes: where, and capturing them
// a probe for every indoor space: Frostline's rooms (split every 9 m along a long one), and every map's callout
// areas that have a floor or roof over them
function __rlPlace(m) {
  const out = [],
    add = (x0, y0, z0, x1, y1, z1) => out.length < 96 && out.push({ min: new U(x0, y0, z0), max: new U(x1, y1, z1), pos: new U((x0 + x1) / 2, Math.min(y0 + 1.7, (y0 + y1) / 2), (z0 + z1) / 2), sh: null, face: 0, acc: null });
  if (m.__fh && typeof __FH_V < 'u')
    for (const v of __FH_V) {
      if (v.gap || v.st === 'door' || v.shaft || v.noShell) continue;
      const [x0, z0, x1, z1, y0, y1] = v.b,
        lx = x1 - x0,
        lz = z1 - z0,
        n = Math.max(1, Math.ceil(Math.max(lx, lz) / 9));
      for (let i = 0; i < n; i++)
        lx >= lz ? add(x0 + (lx * i) / n, y0, z0, x0 + (lx * (i + 1)) / n, y1, z1) : add(x0, y0, z0 + (lz * i) / n, x1, y1, z0 + (lz * (i + 1)) / n);
    }
  for (const a of m.areas || []) {
    const cx = (a.min.x + a.max.x) / 2,
      cz = (a.min.z + a.max.z) / 2,
      y = Math.max(a.min.y, -50) + 0.2;
    if (a.max.x - a.min.x > 60 || a.max.z - a.min.z > 60) continue;
    try {
      if (!RE({ x: cx, y, z: cz })) continue;
    } catch (e) {
      continue;
    }
    if (out.some((p) => cx > p.min.x && cx < p.max.x && cz > p.min.z && cz < p.max.z && y > p.min.y - 1 && y < p.max.y)) continue;
    add(a.min.x, y - 0.3, a.min.z, a.max.x, y + 5.5, a.max.z);
  }
  return out;
}
// one face of one probe a frame: rendered at 16 x 16 into a float target, read back without waiting, folded into
// the probe's spherical harmonics (the first two bands: the light's average and its main direction)
const __RL_FACES = [[1, 0, 0, 0, -1, 0], [-1, 0, 0, 0, -1, 0], [0, 1, 0, 0, 0, 1], [0, -1, 0, 0, 0, -1], [0, 0, 1, 0, -1, 0], [0, 0, -1, 0, -1, 0]];
function __rlBakeStep(st) {
  const B = __RL.bake;
  if (!B || B.busy || !st.gl.readRenderTargetPixelsAsync) return;
  // the nearest unbaked probe within 30 m (rooms are baked as you come near them: then they are drawn and their
  // lamps are among the lit ones, as they will be when you are in them); re-sorted every second
  const c = st.camera.position,
    now = performance.now();
  if (!B.cur || B.cur.sh) {
    if (now - (B.sorted || 0) > 1000 || !B.near) {
      B.sorted = now;
      B.near = __RL.probes.filter((p) => !p.sh && p.pos.distanceTo(c) < 30).sort((a, b) => a.pos.distanceTo(c) - b.pos.distanceTo(c));
    }
    while (B.near.length && B.near[0].sh) B.near.shift();
    B.cur = B.near[0] || null;
  }
  const P = B.cur;
  if (!P) return;
  const gl = st.gl,
    f = P.face,
    F = __RL_FACES[f],
    cam = B.cam;
  cam.position.copy(P.pos);
  cam.up.set(F[3], F[4], F[5]);
  cam.lookAt(P.pos.x + F[0], P.pos.y + F[1], P.pos.z + F[2]);
  cam.updateMatrixWorld(!0);
  const prev = gl.getRenderTarget(),
    sm = gl.shadowMap.autoUpdate,
    giOn = __RL.P[0].x;
  gl.shadowMap.autoUpdate = !1;
  const shown = [];
  if (typeof __FH < 'u' && __FH.groups && P.pos.y < -0.5) for (const k in __FH.groups) __FH.groups[k].visible || (shown.push(__FH.groups[k]), (__FH.groups[k].visible = !0));
  if (typeof __FW < 'u' && __FW.group && !__FW.group.visible && P.pos.y < -6) shown.push(__FW.group), (__FW.group.visible = !0);
  try {
    gl.setRenderTarget(B.rt);
    gl.clear();
    gl.render(st.scene, cam);
  } finally {
    gl.setRenderTarget(prev);
    gl.shadowMap.autoUpdate = sm;
    __RL.P[0].x = giOn;
    for (const o of shown) o.visible = !1;
  }
  B.busy = !0;
  const q = cam.quaternion.clone();
  gl.readRenderTargetPixelsAsync(B.rt, 0, 0, 16, 16, B.buf)
    .then(() => {
      B.busy = !1;
      const acc = P.acc || (P.acc = { c: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], w: 0 }),
        d = new U();
      for (let j = 0; j < 16; j++)
        for (let i = 0; i < 16; i++) {
          const x = ((i + 0.5) / 16) * 2 - 1,
            y = ((j + 0.5) / 16) * 2 - 1,
            w = 1 / Math.pow(1 + x * x + y * y, 1.5),
            o = (j * 16 + i) * 4;
          d.set(x, y, -1).normalize().applyQuaternion(q);
          const Y = [0.282095, 0.488603 * d.y, 0.488603 * d.z, 0.488603 * d.x];
          for (let k = 0; k < 4; k++) for (let c = 0; c < 3; c++) acc.c[k * 3 + c] += B.buf[o + c] * Y[k] * w;
          acc.w += w;
        }
      P.face++;
      if (P.face >= 6) {
        const s = (4 * Math.PI) / acc.w;
        P.sh = [0, 1, 2, 3].map((k) => new U(acc.c[k * 3] * s, acc.c[k * 3 + 1] * s, acc.c[k * 3 + 2] * s));
        P.acc = null;
        __RL.stats.baked = (__RL.stats.baked || 0) + 1;
      }
    })
    .catch(() => (B.busy = !1));
}
// each frame: the 16 probes nearest the camera into the shaders' arrays
function __rlChoose(cam) {
  const P = __RL.P,
    ready = __RL.probes.filter((p) => p.sh);
  if (!ready.length || __rlOff('gi')) return void (P[0].x = 0);
  const c = cam.position,
    dist = (p) => Math.hypot(Math.max(p.min.x - c.x, 0, c.x - p.max.x), Math.max(p.min.y - c.y, 0, c.y - p.max.y), Math.max(p.min.z - c.z, 0, c.z - p.max.z));
  ready.sort((a, b) => dist(a) - dist(b));
  const n = Math.min(16, ready.length);
  P[3].set(1e9, 1e9, 1e9, 0);
  P[4].set(-1e9, -1e9, -1e9, 0);
  for (let i = 0; i < n; i++) {
    const p = ready[i];
    __RL.BMIN[i].set(p.min.x, p.min.y, p.min.z, 0);
    __RL.BMAX[i].set(p.max.x, p.max.y, p.max.z, 0);
    for (let k = 0; k < 4; k++) __RL.SH[i * 4 + k].set(p.sh[k].x, p.sh[k].y, p.sh[k].z, 0);
    P[3].set(Math.min(P[3].x, p.min.x - 1.5), Math.min(P[3].y, p.min.y - 1.5), Math.min(P[3].z, p.min.z - 1.5), 0);
    P[4].set(Math.max(P[4].x, p.max.x + 1.5), Math.max(P[4].y, p.max.y + 1.5), Math.max(P[4].z, p.max.z + 1.5), 0);
  }
  P[0].set(1, 1, 1.3, n);
}
// ---------------------------------------------------------------- in the effect chain, and every frame
__RL_ON && (() => {
  const prevFx = hiA;
  hiA = function (props) {
    const q = props.quality,
      pass = S.useMemo(() => (q !== 'low' ? new __RealismPass(q) : null), [q]);
    S.useEffect(() => ((__RL.pass = pass), () => pass && pass.dispose()), [pass]);
    QI((st) => {
      try {
        const cam = st.camera,
          gl = st.gl;
        __RL.cam = cam;
        __RL.scene = st.scene;
        if (!cam || !gl) return;
        const live = !!eA.state && !eA.attract;
        // the camera: clean projection, its unjittered view-projection kept, then this frame's sub-pixel offset
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld();
        __RL.vpUn.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        const yt = typeof __SCR < 'u' && __SCR.live && __SCR.live.some((s) => s.active);
        if (pass && q !== 'low' && live && !yt && !__rlOff('taa')) {
          gl.getDrawingBufferSize(__rlSz);
          const h = __RL_HAL[__RL.frame % 8],
            e = cam.projectionMatrix.elements;
          e[8] += (h[0] * 2) / __rlSz.x;
          e[9] += (h[1] * 2) / __rlSz.y;
          cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
        }
        // reflections: High only
        __RL.P[1].set(q === 'high' && live && !__rlOff('ssr') ? 1 : 0, 0.75, 0, 0);
        __RL.P[2].set(cam.near, cam.far, 0, 0);
        // light probes: placed when a map is first seen, captured in the background, chosen every frame
        const m = live ? aw() : null;
        if (m !== __RL.map) {
          __RL.map = m;
          __RL.probes = m && q !== 'low' ? __rlPlace(m) : [];
          __RL.stats = { probes: __RL.probes.length };
          if (__RL.probes.length) {
            const B = __RL.bake || (__RL.bake = { rt: new Ti(16, 16, { type: 1015, depthBuffer: !0 }), buf: new Float32Array(16 * 16 * 4), cam: new ui(90, 1, 0.05, 80), busy: !1 });
            B.cur = null;
            B.near = null;
          }
        }
        if (__RL.probes.length) __rlBakeStep(st);
        __rlChoose(cam);
      } catch (e) {
        __RL.err = String(e && e.stack);
      }
    });
    const el = prevFx.apply(this, arguments);
    if (!pass || !el || !el.props) return el;
    // right after the ambient occlusion (before bloom and tone mapping)
    const kids = [].concat(el.props.children || []),
      at = kids.findIndex((c) => c && c.key === 'n8ao');
    kids.splice(at + 1, 0, M.jsx('primitive', { object: pass, dispose: null }, 'realism'));
    return S.cloneElement(el, null, ...kids);
  };
})();
const __rlSz = new aA();
typeof window < 'u' &&
  (window.__bpRealism = () => ({
    pass: !!__RL.pass,
    probes: __RL.probes.length,
    baked: __RL.probes.filter((p) => p.sh).length,
    gi: __RL.P[0].toArray().map((v) => +v.toFixed(2)),
    ssr: __RL.P[1].x,
    frame: __RL.frame,
    err: __RL.err,
    sample: __RL.probes.filter((p) => p.sh).slice(0, 3).map((p) => [p.pos.toArray().map((v) => +v.toFixed(1)), p.sh[0].toArray().map((v) => +v.toFixed(3))]),
  }));
