/* ===== Bayou Tactical mod: the condo's new wing (Frostline, behind the fridge) ===== */
// Four more experiences round the Kaleidoscope (65b-frostline-wonderland.js), drawn with its kit (same buckets,
// materials and helpers), each a space of the house's system (walls, floors, ceilings and doorways made round it):
//   - The Club (east of the Kaleidoscope, and through from the Overlook): an LED dance floor that changes pattern on
//     every bar, a DJ booth with spinning decks and a live equaliser, a mirror ball throwing spots of light that
//     sweep over every wall, lasers fanning from the booth, moving-head beams through the haze, neon strips, VIP
//     booths, a champagne tower; and a beat (124 BPM, made by the game's synth) you hear from the hallway
//   - The Spa (west of the Kaleidoscope, and through from the Master Suite): a swimming pool of glass mosaic you
//     can walk down the steps into and swim under (the view turns aquamarine underwater, caustics dance on the
//     tiles), a hot tub bubbling and steaming, a water wall, loungers, palms, a ceiling painted as a summer sky
//   - The Vault Casino (off the Home Cinema, and through to the Overlook): a roulette wheel spinning with its ball,
//     a blackjack table, a row of slot machines with spinning reels (now and then they all hit the jackpot), and
//     the vault: shelves of gold bars, stacks of cash, diamonds on pedestals, the great round door standing open
//     and money raining down in front of it
//   - The Aquarium Tunnel (a 41 m hallway joining the Spa and the Club): a glass tunnel through deep water, schools
//     of fish in every colour, sharks and manta rays gliding past, glowing jellyfish, coral on the sand, light
//     falling through the water
// Everything you see is solid where it looks solid; the pool's steps are stairs. Dev: __bpCabinGo('club' | 'spa' |
// 'pool' | 'casino' | 'aquarium').
// ---------------------------------------------------------------- layout
{
  const F = __FW_Y.F,
    v = (id, x0, z0, x1, z1, h, a, o = {}) => ({ id, b: [x0, z0, x1, z1, o.y0 ?? F, (o.y0 ?? F) + h], st: o.soft ? 'wonder-soft' : 'wonder', a, g: 'won', noVis: 1, fw: 1, ...o }),
    vols = [
      v('NC', 110.4, 102.0, 121.5, 117.6, 6, 'Condo – The Club'),
      v('Q6', 110, 107.5, 110.4, 110.5, 3.6, 'Condo – The Club', { gap: 1 }),
      v('Q8', 116, 101, 118, 102, 3, 'Condo – The Club', { gap: 1 }),
      v('SP', 78.5, 101.4, 89.6, 117.6, 6, 'Condo – The Spa'),
      v('PL', 80.2, 104.2, 87.6, 113.2, 2.2, 'Condo – The Spa, in the pool', { y0: F - 2.2, pool: 1 }),
      v('Q7', 89.6, 107.5, 90, 110.5, 3.6, 'Condo – The Spa', { gap: 1 }),
      v('Q9', 80.5, 101, 83, 101.4, 3, 'Condo – The Spa', { gap: 1, soft: 1 }),
      v('CV', 108.4, 66.5, 121.5, 79.6, 5.5, 'Condo – The Vault Casino', { soft: 1 }),
      v('Q10', 108, 75, 108.4, 77.5, 3, 'Condo – The Vault Casino', { gap: 1, soft: 1 }),
      v('Q11', 114, 79.6, 116, 80, 3, 'Condo – The Vault Casino', { gap: 1, soft: 1 }),
      v('AQ', 80, 120.4, 121, 123.6, 3.4, 'Condo – Aquarium Tunnel'),
      v('Q12', 83, 117.6, 85, 120.4, 3, 'Condo – Aquarium Tunnel', { gap: 1 }),
      v('Q13', 114, 117.6, 116, 120.4, 3, 'Condo – Aquarium Tunnel', { gap: 1 }),
    ];
  __FW_V.push(...vols);
  __FH_V.push(...vols);
  __FW_BOX[3] = 128.5;
  __FH_LIGHTS.push([116, F + 5.2, 109.8], [84, F + 5.2, 107], [84, F + 5.2, 115], [115, F + 4.6, 73], [119.5, F + 4.2, 72.5], [90, F + 2.9, 122], [110, F + 2.9, 122]);
  Object.assign(__FW_FOG, { NC: [6, 34, '#1c0a33'], SP: [35, 140, '#d9eef0'], PL: [35, 140, '#d9eef0'], CV: [30, 140, '#1a1208'], AQ: [7, 40, '#05324a'], Q12: [10, 60, '#0a3a4a'], Q13: [10, 60, '#0a3a4a'] });
  Object.assign(__FH_GO, { club: [113, F, 109.8, -Math.PI / 2], spa: [88.8, F, 109, Math.PI / 2], pool: [84, F - 2.15, 108.5, 0], casino: [109.6, F, 76.2, -Math.PI / 2], aquarium: [84, F, 122, -Math.PI / 2] });
  // furniture: [width, depth, height]
  Object.assign(__FW_FS, {
    dj: [3.0, 1.2, 1.15], champ: [0.9, 0.9, 1.6], lounger: [0.75, 2.0, 0.5], tub: [2.6, 2.6, 0.55], roul: [2.6, 1.4, 0.95], bj: [2.4, 1.3, 0.95], slot: [0.8, 0.75, 1.9],
    gold: [6.0, 0.75, 2.6], vdoor: [3.2, 0.5, 3.2], gem: [0.6, 0.6, 1.15], cash: [1.4, 0.8, 0.95],
  });
  __FW_F.push(
    // the Club: the booth at the east end, VIP sofas and tables along the walls, the champagne tower
    ['dj', 120.5, 109.75, 3], ['sofa', 112.4, 102.6, 0], ['sofa', 119.8, 102.6, 0], ['sofa', 112.0, 117.0, 2], ['sofa', 118.8, 117.0, 2],
    ['ctable', 112.4, 104.0, 0], ['ctable', 119.8, 104.0, 0], ['ctable', 112.0, 115.6, 0], ['ctable', 118.8, 115.6, 0], ['champ', 120.6, 114.3, 0],
    // the Spa: loungers by the pool, the hot tub, palms
    ['lounger', 88.9, 103.4, 0], ['lounger', 88.9, 105.5, 0], ['lounger', 88.9, 112.5, 0], ['lounger', 88.9, 114.6, 0], ['tub', 86.4, 115.6, 0],
    ['plant', 79.1, 102.0, 0], ['plant', 79.1, 117.0, 0], ['plant', 88.9, 117.0, 0],
    // the Vault Casino: roulette, blackjack and its stools, the slots, the vault
    ['roul', 112.5, 72.5, 0], ['bj', 112.5, 76.8, 2], ['stool', 111.6, 75.65, 0], ['stool', 112.5, 75.5, 0], ['stool', 113.4, 75.65, 0],
    ...[110.0, 111.0, 112.0, 113.0, 114.0].map((x) => ['slot', x, 67.0, 0]),
    ['gold', 121.1, 72.5, 3], ['vdoor', 119.2, 77.4, 0], ['gem', 118.6, 69.2, 0], ['gem', 118.6, 71.2, 0], ['cash', 118.6, 74.4, 1],
  );
  // more solids: the pool's steps (stairs, rising to the south), the tunnel's side rails (open where the hallways
  // come in)
  __FW_SOLIDX.push(() => {
    const out = [];
    for (let i = 0; i < 7; i++) out.push([80.2, F - 2.2, 110.4 + 0.4 * i, 81.8, F - 2.2 + (2.2 / 7) * (i + 1), 113.2, 'stair', 'stone']);
    for (const [a, b] of [[80, 83], [85, 114], [116, 121]]) out.push([a, F, 120.4, b, F + 0.9, 120.75, 'prop', 'metal']);
    out.push([80, F, 123.25, 121, F + 0.9, 123.6, 'prop', 'metal']);
    return out;
  });
}
// ---------------------------------------------------------------- shaders
// glass mosaic (5 cm tiles, two colours and a scatter of gold), lit from above through water: caustics
const __fwMosaic = (A, B, gold, caus) =>
  __fwShader(
    `vec3 n = normalize(vN); vec2 p = abs(n.y) > 0.5 ? vW.xz : (abs(n.x) > 0.5 ? vW.zy : vW.xy);
vec2 g = p / 0.05; vec2 id = floor(g); vec2 f = fract(g);
float grout = smoothstep(0.0, 0.09, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
vec3 tile = mix(vec3(${A}), vec3(${B}), fwH(id)) * (0.85 + 0.3 * fwH(id + 3.1));
float gt = step(0.93, fwH(id + 9.7)) * ${gold.toFixed(2)}; tile = mix(tile, vec3(1.0, 0.78, 0.35), gt);
float cst = pow(max(0.0, fwN(p * 1.5 + uT * 0.35) + fwN(p * 2.1 - uT * 0.27) - 1.0), 2.0) * 2.5;
vec3 col = tile * (0.35 + 0.65 * grout) * 0.75 + vec3(0.6, 0.95, 1.0) * cst * ${caus.toFixed(2)} + gt * pow(fwH(id + floor(uT * 2.0)), 30.0) * 0.8;
gl_FragColor = vec4(col, 1.0);`,
  );
// the pool's surface: ripples, a bright sheen at grazing angles, clearer from below
const __fwPoolWater = () =>
  __fwShader(
    `vec3 v = normalize(cameraPosition - vW); float rp = fwN(vW.xz * 2.5 + uT * 0.6) + fwN(vW.xz * 4.0 - uT * 0.5) * 0.5;
float fr = pow(1.0 - abs(v.y), 3.0); bool below = cameraPosition.y < vW.y;
vec3 col = (below ? vec3(0.35, 0.8, 0.9) : vec3(0.0, 0.5, 0.6)) * (0.6 + 0.45 * rp) + vec3(0.8, 0.95, 1.0) * fr * 0.6 + pow(rp * 0.67, 6.0) * 0.8;
gl_FragColor = vec4(col, below ? 0.5 : mix(0.42, 0.85, fr));`,
    { transparent: 1, side: 2 },
  );
// the hot tub: boiling water, foam
const __fwTub = () =>
  __fwShader(
    `vec2 p = vW.xz * 3.0; float b = fwN(p + vec2(uT * 1.7, -uT * 1.3)) * fwN(p * 1.7 - vec2(uT * 1.1, uT * 2.0));
gl_FragColor = vec4(mix(vec3(0.0, 0.45, 0.55), vec3(0.85, 0.97, 1.0), smoothstep(0.32, 0.55, b)) + vec3(0.0, 0.1, 0.12), 1.0);`,
  );
// a sheet of falling water
const __fwFallMat = () =>
  __fwShader(
    `float s = fwF(vec2(vUv.x * 30.0, vUv.y * 2.5 + uT * 1.6)); float s2 = fwN(vec2(vUv.x * 70.0, vUv.y * 10.0 + uT * 3.0));
vec3 col = mix(vec3(0.1, 0.45, 0.6), vec3(0.85, 0.97, 1.0), pow(s, 1.6)) * (0.5 + 1.2 * pow(s2, 3.0));
gl_FragColor = vec4(col, 0.85);`,
    { transparent: 1 },
  );
// a summer sky on the ceiling, clouds drifting
const __fwSkyCeil = () =>
  __fwShader(
    `vec2 p = vW.xz * 0.12 + vec2(uT * 0.012, uT * 0.004); float cl = fwF(p * 1.6) * 0.7 + fwF(p * 3.7) * 0.3;
vec3 sky = mix(vec3(0.32, 0.6, 0.95), vec3(0.72, 0.86, 1.0), 0.5 + 0.5 * sin(vW.z * 0.12));
gl_FragColor = vec4(mix(sky, vec3(1.0, 0.99, 0.97), smoothstep(0.45, 0.78, cl) * 0.9), 1.0);`,
  );
// the club's LED floor: 60 cm tiles, a new pattern on every bar (124 BPM), pulsing on the beat
const __fwDance = () =>
  __fwShader(
    `vec2 g = (vW.xz - vec2(112.8, 105.8)) / 0.6; vec2 id = floor(g); vec2 f = fract(g);
float bt = uT * 124.0 / 60.0, beat = fract(bt), bi = floor(bt), bar = mod(floor(bt / 4.0), 4.0);
float on; vec2 c0 = vec2(5.0, 6.5); float d = length(id - c0);
if (bar < 1.0) on = step(0.5, fract((id.x + id.y) * 0.5 + bi * 0.5));
else if (bar < 2.0) on = 1.0 - smoothstep(0.0, 1.2, abs(d - mod(bi * 1.5, 9.0)));
else if (bar < 3.0) on = step(0.55, fwH(id + bi));
else on = 0.5 + 0.5 * sin(id.x * 0.9 - uT * 6.0 + id.y * 0.4);
vec3 c = fwHue(fwH(id) * 0.25 + bi * 0.13 + id.y * 0.04);
float edge = smoothstep(0.0, 0.07, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
gl_FragColor = vec4(c * on * edge * (0.55 + 1.5 * (1.0 - beat)) + vec3(0.02, 0.015, 0.03), 1.0);`,
  );
// the mirror ball: square facets turning, each catching the light now and then
const __fwMirrorBall = () =>
  __fwShader(
    `vec3 n = normalize(vP); float th = atan(n.z, n.x) + uT * 0.6, ph = acos(clamp(n.y, -1.0, 1.0));
vec2 g = vec2(th, ph) * 12.0 / 3.14159; vec2 id = floor(g); vec2 f = fract(g);
float edge = smoothstep(0.0, 0.12, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
float sp = pow(fwH(id + floor(uT * 7.0)), 16.0) * 4.0;
gl_FragColor = vec4((vec3(0.6) * (0.35 + 0.65 * fwH(id)) + sp * fwHue(fwH(id + 1.0) + uT * 0.2)) * edge, 1.0);`,
  );
// a light beam: bright at its source, fading along it and at its edges (additive)
const __fwBeam = () =>
  __fwShader(
    `float k = vUv.y; float e = 1.0 - abs(vUv.x * 2.0 - 1.0);
gl_FragColor = vec4(uCol * pow(k, 1.6) * 0.5 * (0.35 + 0.65 * e), 1.0);`,
    { add: 1, side: 2, decl: '\nuniform vec3 uCol;', u: { uCol: { value: new U(1, 0.4, 1) } } },
  );
// the roulette wheel: 37 pockets (one green) round a gold centre, turning
const __fwWheel = () =>
  __fwShader(
    `vec2 p = vP.xz / 0.46; float r = length(p); float a = atan(p.y, p.x) + uT * 1.6;
float seg = floor((a + 6.2831853 * 4.0) / 6.2831853 * 37.0); seg = mod(seg, 37.0);
vec3 c = seg < 0.5 ? vec3(0.0, 0.45, 0.15) : (mod(seg, 2.0) < 1.0 ? vec3(0.6, 0.02, 0.04) : vec3(0.025));
float fret = smoothstep(0.03, 0.0, abs(fract((a + 6.2831853 * 4.0) / 6.2831853 * 37.0) - 0.5) - 0.47);
c = mix(c, vec3(1.0, 0.8, 0.4), fret * step(0.55, r));
if (r < 0.55) c = mix(vec3(0.9, 0.7, 0.3), vec3(0.35, 0.18, 0.08), smoothstep(0.2, 0.5, r)) * (0.8 + 0.4 * sin(a * 8.0));
if (r > 0.92) c = vec3(0.3, 0.15, 0.06);
gl_FragColor = vec4(c, 1.0);`,
  );
// slot machine reels: three columns of symbols rolling, stopping on a jackpot every eight seconds or so
const __fwReels = () =>
  __fwShader(
    `float col = floor(vUv.x * 3.0); float cyc = mod(uT + uSeed * 3.0, 8.0); float spin = cyc < 6.0 ? 1.0 : 0.0;
float stopAt = 5.0 + col * 0.4; float run = min(cyc, stopAt);
float y = vUv.y * 3.0 + run * (7.0 + col) * spin + (cyc >= stopAt && cyc < 8.0 ? 0.0 : 0.0);
float sym = cyc > stopAt + 0.01 ? 2.0 : mod(floor(y), 5.0);
vec2 f = vec2(fract(vUv.x * 3.0), fract(y)) - 0.5;
vec3 c = vec3(0.98);
float sh = sym < 1.0 ? length(f) - 0.28 : sym < 2.0 ? max(abs(f.x) - 0.32, abs(f.y) - 0.12) : sym < 3.0 ? abs(f.x) + abs(f.y) - 0.34 : sym < 4.0 ? length(f - vec2(0.0, 0.05)) - 0.22 : max(abs(f.x) - 0.2, abs(f.y) - 0.3);
vec3 sc = sym < 1.0 ? vec3(0.9, 0.05, 0.1) : sym < 2.0 ? vec3(0.1) : sym < 3.0 ? vec3(0.2, 0.75, 1.0) : sym < 4.0 ? vec3(1.0, 0.75, 0.1) : vec3(0.85, 0.1, 0.6);
c = mix(sc, c, smoothstep(0.0, 0.03, sh));
float win = cyc > 6.2 ? 0.5 + 0.5 * sin(uT * 18.0) : 0.0;
float edge = smoothstep(0.0, 0.04, min(fract(vUv.x * 3.0), 1.0 - fract(vUv.x * 3.0)));
c = c * (0.4 + 0.6 * edge) + fwHue(uT * 0.5) * win * 0.6 * (1.0 - smoothstep(0.0, 0.1, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y))));
gl_FragColor = vec4(c * 1.15, 1.0);`,
    { decl: '\nuniform float uSeed;', u: { uSeed: { value: 0 } } },
  );
// the aquarium's water (on the inside of a box round the tunnel): deep blue below to bright above, sand on the
// bottom with caustics, shafts of light, a shimmering surface; doorways cut out where the hallways come in
const __fwWater = (holes) =>
  __fwShader(
    `for (int i = 0; i < 2; i++) { vec4 h = uH[i]; if (vW.z < 118.6 && vW.x > h.x && vW.x < h.z && vW.y < h.w) discard; }
float depth = clamp((vW.y - ${(__FW_Y.F - 1.6).toFixed(2)}) / 7.6, 0.0, 1.0);
vec3 deep = vec3(0.0, 0.06, 0.15), col = mix(deep, vec3(0.04, 0.4, 0.6), pow(depth, 1.3));
if (vW.y < ${(__FW_Y.F - 1.5).toFixed(2)}) { float cst = pow(max(0.0, fwN(vW.xz * 1.6 + uT * 0.4) + fwN(vW.xz * 2.3 - uT * 0.3) - 1.0), 2.0) * 3.0; col = vec3(0.55, 0.5, 0.38) * 0.32 + vec3(0.5, 0.9, 1.0) * cst * 0.35; }
float ray = pow(fwN(vec2(vW.x * 0.35 + vW.z * 0.25 + uT * 0.05, uT * 0.03)), 3.0);
col += vec3(0.4, 0.8, 1.0) * ray * depth * 0.4;
col += smoothstep(0.88, 1.0, depth) * vec3(0.6, 0.9, 1.0) * (0.3 + 0.35 * fwN(vW.xz * 0.8 + uT * 0.3));
col = mix(col, deep * 1.3, smoothstep(4.0, 24.0, length(vW - cameraPosition)) * 0.55);
gl_FragColor = vec4(col, 1.0);`,
    { side: 1, decl: '\nuniform vec4 uH[2];', u: { uH: { value: holes } } },
  );
// the tunnel's walkway: dark stone under moving caustics
const __fwCausFloor = () =>
  __fwShader(
    `float cst = pow(max(0.0, fwN(vW.xz * 1.8 + uT * 0.45) + fwN(vW.xz * 2.6 - uT * 0.35) - 1.0), 2.0) * 3.0;
float edge = smoothstep(1.35, 1.5, abs(vW.z - 122.0));
gl_FragColor = vec4(vec3(0.03, 0.05, 0.07) + vec3(0.3, 0.75, 1.0) * cst * 0.45 + vec3(0.2, 0.7, 1.0) * edge * 1.2, 1.0);`,
  );
// swimming things: each instance swims along x through the water (wrapping at the ends), weaving and bobbing,
// its body bending as it swims (the tail more than the head)
function __fwSwimMat(x0, span, speed, wig) {
  const u = { uT: { value: 0 } },
    m = new Gw({ color: '#ffffff', roughness: 0.45, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; float fwh1(float n){return fract(sin(n*12.9898)*43758.5453);}')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nfloat fid = float(gl_InstanceID); transformed.z += sin(uT * ${(6 * wig).toFixed(2)} + fid + transformed.x * 5.0) * 0.18 * smoothstep(0.3, -0.6, transformed.x) * ${wig.toFixed(2)};`)
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
float dir = sign(instanceMatrix[0][0]); float wx = instanceMatrix[3][0];
float sp = (0.6 + fwh1(fid + 7.0) * 0.8) * ${speed.toFixed(2)};
float px = mod(wx - ${x0.toFixed(2)} + dir * uT * sp, ${span.toFixed(2)}) + ${x0.toFixed(2)};
mvPosition.x += px - wx; mvPosition.y += sin(uT * 0.7 + fid) * 0.25; mvPosition.z += sin(uT * 0.45 + fid * 1.3) * 0.35;
#endif
mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`,
      );
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = diffuseColor.rgb * 0.35;');
  };
  m.customProgramCacheKey = () => 'fw-swim-' + x0 + span + speed + wig;
  m.__u = u;
  return __flOwn(m);
}
// the mirror ball's spots of light: points on the room's walls, ceiling and floor along rays from the ball,
// turning with it
function __fwSpots(n, c, b0, b1) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      y = Math.random() * 2 - 1,
      r = Math.sqrt(1 - y * y);
    p.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
  }
  const geo = new uw();
  geo.setAttribute('position', new gi(p, 3));
  geo.boundingSphere = new DB(c.clone(), 30);
  const u = { uT: { value: 0 } },
    mat = __flOwn(new Dd({ color: '#ffffff', size: 0.16, map: bY(), transparent: !0, depthWrite: !1, blending: 2, fog: !1 }));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace(
      '#include <begin_vertex>',
      `vec3 d = normalize(position); float a = uT * 0.6; d.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * d.xz;
      vec3 C = vec3(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)});
      vec3 t0 = (vec3(${b0.join(',')}) - C) / d, t1 = (vec3(${b1.join(',')}) - C) / d, tm = max(t0, t1);
      vec3 transformed = C + d * min(min(tm.x, tm.y), tm.z) * 0.99;`,
    );
  };
  mat.customProgramCacheKey = () => 'fw-spots';
  const pts = new MZ(geo, mat);
  pts.frustumCulled = !1;
  pts.name = 'frost_fw_spots';
  return { pts, u };
}
// ---------------------------------------------------------------- the beat: kick, off-beat hats, a clap on two and
// four, a rolling bass line (the core's synth), heard from the booth while you are anywhere in the condo near it
const __FWB = { next: 0, n: 0 };
function __fwBeat(cam) {
  const pos = { x: 120.3, y: __FW_Y.F + 1.4, z: 109.75 },
    d = Math.hypot(cam.x - pos.x, cam.z - pos.z),
    now = performance.now(),
    beat = 60000 / 124;
  if (d > 34) return void (__FWB.next = 0);
  if (!__FWB.next) __FWB.next = now + 50;
  if (now < __FWB.next - 110) return;
  try {
    const g = xw(pos, 0.6, { maxDist: 36, reverb: 0.25 });
    if (g) {
      const t = g.t + Math.max(0, (__FWB.next - now) / 1000),
        h = beat / 2000,
        k = __FWB.n % 4,
        BASS = [55, 55, 65.4, 49];
      Ii(g.in, t, 0.22, 150, 42, 0.5, 'sine', 0.002);
      Cw(g.in, t + h, 0.05, 'highpass', 7000, 0.8, 0.07, { attack: 0.001 });
      (k === 1 || k === 3) && Cw(g.in, t, 0.12, 'bandpass', 1400, 1.1, 0.12, { attack: 0.002 });
      const f = BASS[Math.floor(__FWB.n / 4) % 4];
      Ii(g.in, t + h, h * 0.9, f, f, 0.12, 'sawtooth', 0.01);
    }
  } catch (e) {}
  __FWB.n++;
  __FWB.next += beat;
}
// ---------------------------------------------------------------- the furniture kinds
Object.assign(__FW_KINDS, {
  dj(K, f, L, lb, lc, W) {
    const { C, Bk } = K;
    // the booth: black lacquer, a lit front of equaliser bars (drawn by the wing), two decks spinning, a mixer
    lb('lacquer', -1.5, 0, -0.6, 1.5, 1.05, 0.6, C.black);
    lb('gold', -1.52, 1.05, -0.62, 1.52, 1.1, 0.62, C.gold);
    for (let i = 0; i < 4; i++) lb('glow', -1.45 + i * 0.75, 1.1, -0.55, -1.4 + i * 0.75, 1.13, 0.55, [0.6, 0.2, 1.0]);
    for (const x of [-0.85, 0.85]) {
      const p = W(x, 1.11, -0.05);
      Bk('lacquer').add(__flUnit('cyl'), __flM(p[0], p[1], p[2], 0.25, 0.03, 0.25), C.black);
      (K.decks || (K.decks = [])).push(W(x, 1.135, -0.05));
    }
    lb('lacquer', -0.32, 1.1, -0.4, 0.32, 1.16, 0.25, [0.06, 0.06, 0.07]);
    for (let i = 0; i < 12; i++) {
      const p = W(-0.25 + (i % 6) * 0.1, 1.17, -0.3 + Math.floor(i / 6) * 0.12);
      __fhSph(Bk('glow'), p[0], p[1], p[2], 0.018, i % 3 ? [0.2, 0.9, 1.0] : [1.0, 0.3, 0.6], 'sph6');
    }
    K.djFront = { p: W(0, 0.55, 0.61), ry: L.th };
  },
  champ(K, f, L, lb, lc, W) {
    // a champagne tower: a gold table, glass coupes in five tiers, golden wine glowing in them
    lc('gold', [0, 0, 0], [0, 0.85, 0], 0.08, K.C.gold);
    lc('marble', [0, 0.85, 0], [0, 0.9, 0], 0.45, K.C.white);
    for (let t = 0; t < 5; t++) {
      const n = 5 - t;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = (i - (n - 1) / 2) * 0.13,
            z = (j - (n - 1) / 2) * 0.13,
            y = 0.9 + t * 0.12;
          lc('glass', [x, y, z], [x, y + 0.11, z], 0.06, [1, 1, 1]);
          const p = W(x, y + 0.085, z);
          K.Bk('soft').add(__flUnit('cyl'), __flM(p[0], p[1], p[2], 0.05, 0.02, 0.05), [1.0, 0.78, 0.35]);
        }
    }
  },
  lounger(K, f, L, lb, lc) {
    const { C } = K;
    lb('rose', -0.37, 0.18, -1.0, 0.37, 0.26, 1.0, C.wood);
    lb('cloth', -0.34, 0.26, -0.3, 0.34, 0.36, 0.98, C.ivory);
    lb('cloth', -0.34, 0.3, -0.98, 0.34, 0.75, -0.55, C.ivory);
    for (const [x, z] of [[-0.32, -0.9], [0.32, -0.9], [-0.32, 0.9], [0.32, 0.9]]) lc('gold', [x, 0, z], [x, 0.18, z], 0.025, C.gold);
    lc('cloth', [-0.3, 0.42, 0.75], [0.3, 0.42, 0.75], 0.07, [0.95, 0.85, 0.7]);
  },
  tub(K, f, L, lb, lc, W) {
    const { C } = K;
    lc('marble', [0, 0, 0], [0, 0.55, 0], 1.3, C.white);
    lc('gold', [0, 0.55, 0], [0, 0.58, 0], 1.32, C.gold);
    K.tubAt = W(0, 0.5, 0);
  },
  roul(K, f, L, lb, lc, W) {
    const { C } = K;
    lb('rose', -1.3, 0, -0.7, 1.3, 0.8, 0.7, C.wood);
    lb('paint', -1.28, 0.8, -0.68, 1.28, 0.83, 0.68, [0.02, 0.32, 0.12]);
    for (let i = 0; i < 4; i++) lb('paint', -1.2, 0.831, -0.5 + i * 0.33, 0.35, 0.834, -0.49 + i * 0.33, [0.92, 0.92, 0.88]);
    for (let i = 0; i < 6; i++) lb('paint', -1.2 + i * 0.31, 0.831, -0.5, -1.19 + i * 0.31, 0.834, 0.5, [0.92, 0.92, 0.88]);
    lb('gold', -1.32, 0.78, -0.72, 1.32, 0.84, -0.68, C.gold);
    lb('gold', -1.32, 0.78, 0.68, 1.32, 0.84, 0.72, C.gold);
    lc('rose', [0.85, 0.83, 0], [0.85, 0.95, 0], 0.5, C.wood);
    K.wheelAt = W(0.85, 0.955, 0);
    // chips stacked on the layout
    const CH = [[0.9, 0.1, 0.1], [0.1, 0.3, 0.9], [0.1, 0.6, 0.2], [0.95, 0.95, 0.95], [0.1, 0.1, 0.1]];
    for (let i = 0; i < 7; i++) {
      const x = -1.0 + i * 0.22,
        z = -0.3 + (i % 3) * 0.25,
        hgt = 0.02 + (i % 4) * 0.025;
      lc('lacquer', [x, 0.834, z], [x, 0.834 + hgt, z], 0.025, CH[i % CH.length]);
    }
  },
  bj(K, f, L, lb, lc, W) {
    const { C } = K;
    lb('rose', -1.2, 0, -0.65, 1.2, 0.8, 0.65, C.wood);
    lb('paint', -1.18, 0.8, -0.63, 1.18, 0.83, 0.63, [0.02, 0.32, 0.12]);
    lb('gold', -1.22, 0.78, 0.6, 1.22, 0.85, 0.66, C.gold);
    lb('leather', -1.22, 0.78, -0.66, 1.22, 0.86, -0.56, [0.6, 0.25, 0.25]);
    for (let i = 0; i < 5; i++) {
      const x = -0.8 + i * 0.4;
      lb('paint', x - 0.04, 0.832, -0.2, x + 0.04, 0.836, -0.08, [0.95, 0.95, 0.95]);
      lb('paint', x - 0.03, 0.836, -0.18, x + 0.05, 0.84, -0.06, [0.95, 0.95, 0.95]);
    }
    lb('lacquer', 0.6, 0.83, 0.3, 0.8, 0.95, 0.5, [0.08, 0.08, 0.1]);
  },
  slot(K, f, L, lb, lc, W, ry) {
    const { C } = K;
    lb('lacquer', -0.4, 0, -0.375, 0.4, 1.55, 0.3, [0.5, 0.04, 0.08]);
    lb('gold', -0.42, 1.55, -0.38, 0.42, 1.62, 0.32, C.gold);
    lb('lacquer', -0.33, 0.82, 0.3, 0.33, 1.32, 0.33, [0.02, 0.02, 0.02]);
    lb('gold', -0.36, 0.79, 0.3, 0.36, 0.82, 0.36, C.gold);
    lb('gold', -0.36, 1.32, 0.3, 0.36, 1.35, 0.36, C.gold);
    lb('lacquer', -0.38, 0.6, 0.3, 0.38, 0.66, 0.5, [0.06, 0.06, 0.07]);
    lc('chrome', [0.43, 1.0, 0.0], [0.43, 1.45, 0.0], 0.02, [0.9, 0.9, 0.9]);
    const kb = W(0.43, 1.48, 0);
    __fhSph(K.Bk('glow'), kb[0], kb[1], kb[2], 0.05, [1.0, 0.1, 0.15], 'sph6');
    (K.reels || (K.reels = [])).push({ p: W(0, 1.07, 0.335), ry });
    (K.toppers || (K.toppers = [])).push(W(0, 1.75, 0));
  },
  gold(K, f, L, lb, lc, W, ry) {
    const { C } = K;
    // the vault's shelves: gilded uprights and five shelves of gold bars, stacked like bricks
    for (const x of [-3, -1.5, 0, 1.5, 3]) lb('gold', x - 0.04, 0, -0.37, x + 0.04, 2.6, 0.37, C.goldD);
    for (let s = 0; s < 5; s++) {
      const y = 0.15 + s * 0.5;
      lb('chrome', -3, y - 0.03, -0.37, 3, y, 0.37, [0.75, 0.75, 0.78]);
      for (let x = -2.88; x < 2.9; x += 0.27)
        for (let z = -0.25; z < 0.3; z += 0.17)
          for (let h = 0; h < 2; h++) {
            const p = W(x + (h ? 0.12 : 0), y + 0.035 + h * 0.07, z);
            (K.bars || (K.bars = [])).push(__flM(p[0], p[1], p[2], 0.24, 0.065, 0.1, ry));
          }
    }
  },
  vdoor(K, f, L, lb, lc, W, ry) {
    const { C } = K;
    // the great round vault door, standing open: a steel disc, a gold rim, bolts round its edge, a wheel
    const c = W(0, 1.6, 0);
    K.Bk('chrome').add(__flUnit('cyl'), __flM(c[0], c[1], c[2], 1.5, 0.45, 1.5, ry, Math.PI / 2), [0.7, 0.72, 0.75]);
    const rim = [];
    for (let i = 0; i <= 64; i++) rim.push(W(Math.cos((i / 64) * 6.283) * 1.5, 1.6 + Math.sin((i / 64) * 6.283) * 1.5, 0.24));
    K.tube('gold', rim, 0.06, C.gold);
    for (let i = 0; i < 16; i++) lc('chrome', [Math.cos(i * 0.3927) * 1.35, 1.6 + Math.sin(i * 0.3927) * 1.35, 0.2], [Math.cos(i * 0.3927) * 1.35, 1.6 + Math.sin(i * 0.3927) * 1.35, 0.36], 0.05, [0.85, 0.85, 0.88]);
    for (let i = 0; i < 4; i++) lc('gold', [0, 1.6, 0.3], [Math.cos(i * 0.785) * 0.55, 1.6 + Math.sin(i * 0.785) * 0.55, 0.3], 0.03, C.gold);
    const wheel = [];
    for (let i = 0; i <= 40; i++) wheel.push(W(Math.cos((i / 40) * 6.283) * 0.55, 1.6 + Math.sin((i / 40) * 6.283) * 0.55, 0.3));
    K.tube('gold', wheel, 0.035, C.gold);
    lb('gold', -0.2, 0, -0.25, 0.2, 0.12, 0.25, C.gold);
  },
  gem(K, f, L, lb, lc, W) {
    const { C } = K;
    lc('marble', [0, 0, 0], [0, 0.95, 0], 0.18, C.white);
    lc('gold', [0, 0.95, 0], [0, 1.0, 0], 0.24, C.gold);
    lc('glass', [0, 1.0, 0], [0, 1.4, 0], 0.17, [1, 1, 1]);
    (K.gems || (K.gems = [])).push(W(0, 1.18, 0));
  },
  cash(K, f, L, lb, lc, W, ry) {
    const { C } = K;
    lb('rose', -0.7, 0, -0.4, 0.7, 0.8, 0.4, C.wood);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++)
        for (let h = 0; h < 3 + ((i + j) % 3); h++) {
          const p = W(-0.55 + i * 0.22, 0.83 + h * 0.06, -0.25 + j * 0.25);
          (K.cash || (K.cash = [])).push(__flM(p[0], p[1], p[2], 0.16, 0.055, 0.07, ry));
        }
  },
});
// ---------------------------------------------------------------- drawing the wing
__FW_WINGS.push(function (K) {
  const { F, low, G, C, MAT, Bk, bx, cy, sp, wb, V, ticks } = K,
    hi = Zw.getState().quality === 'high',
    V3 = (a) => new U(a[0], a[1], a[2]),
    up = [];
  for (const k of ['decks', 'reels', 'toppers', 'bars', 'cash', 'gems']) K[k] || (K[k] = []);
  // a room's floor, ceiling and walls (less its doorways), with a skirting and a crown
  const shell = (v, o) => {
    const [x0, z0, x1, z1, y0, top] = v.b;
    o.floor && bx(o.floor[0], x0, y0 - 0.05, z0, x1, y0, z1, o.floor[1]);
    o.ceil && bx(o.ceil[0], x0, top, z0, x1, top + 0.05, z1, o.ceil[1]);
    for (const f of __fwWalls(v)) {
      if (o.skip && o.skip(f)) continue;
      for (const r of f.rects) {
        wb(f, o.wall[0], r[0], r[1], r[2], r[3], 0, 0.02, o.wall[1]);
        o.skirt && r[1] <= y0 + 0.01 && wb(f, o.skirt[0], r[0], y0, r[2], y0 + 0.14, 0.02, 0.06, o.skirt[1]);
        o.crown && r[3] >= top - 0.01 && wb(f, o.crown[0], r[0], top - 0.16, r[2], top, 0.02, 0.1, o.crown[1]);
        o.deco && o.deco(f, r);
      }
    }
  };
  const mesh = (geo, mat, name, parent = G) => {
    const m = new Ow(geo, mat);
    m.name = name;
    parent.add(m);
    return m;
  };
  // ================================================================ the Club
  {
    const v = V.NC,
      [x0, z0, x1, z1, , top] = v.b,
      cx = 116,
      cz = 109.75;
    K.mat('neon', __fwTendril());
    up.push(MAT.neon);
    shell(v, {
      floor: ['epoxy', [0.02, 0.02, 0.025]],
      ceil: ['paint', [0.015, 0.015, 0.02]],
      wall: ['lacquer', [0.03, 0.03, 0.035]],
      crown: ['gold', C.gold],
      deco: (f, r) => {
        // quilted purple velvet panels between neon strips
        if (r[1] > F + 0.01 || r[3] < top - 0.01) return;
        for (let u = r[0] + 0.6; u < r[2] - 0.5; u += 1.8) {
          wb(f, 'neon', u - 0.02, F + 0.2, u + 0.02, top - 0.3, 0.02, 0.05, [1, 1, 1]);
          u + 1.75 < r[2] && wb(f, 'velvet', u + 0.15, F + 1.1, u + 1.65, F + 3.9, 0.02, 0.07, [0.28, 0.06, 0.42]);
        }
      },
    });
    // the dance floor, its gold frame
    const df = __fwDance(),
      dfl = mesh(new bB(6.4, 7.8), df, 'frost_fw_dancefloor');
    dfl.rotation.x = -Math.PI / 2;
    dfl.position.set(116, F + 0.004, 109.7);
    up.push(df);
    for (const [a, b, c, d] of [[112.75, 105.75, 119.25, 105.81], [112.75, 113.59, 119.25, 113.65], [112.75, 105.75, 112.81, 113.65], [119.19, 105.75, 119.25, 113.65]]) bx('gold', a, F, b, c, F + 0.012, d, C.gold);
    // the truss over it, the mirror ball, its spots on every surface
    for (const z of [106.5, 113]) cy('chrome', [112.5, top - 0.6, z], [119.5, top - 0.6, z], 0.05, [0.7, 0.7, 0.72]);
    for (const x of [112.5, 119.5]) cy('chrome', [x, top - 0.6, 106.5], [x, top - 0.6, 113], 0.05, [0.7, 0.7, 0.72]);
    cy('chrome', [cx, top, cz], [cx, F + 4.85, cz], 0.012, [0.7, 0.7, 0.72]);
    const mb = __fwMirrorBall(),
      ball = mesh(new bi(0.42, 32, 24), mb, 'frost_fw_mirrorball');
    ball.position.set(cx, F + 4.4, cz);
    up.push(mb);
    const spots = __fwSpots(low ? 90 : 220, new U(cx, F + 4.4, cz), [x0 + 0.03, F + 0.01, z0 + 0.03], [x1 - 0.03, top - 0.03, z1 - 0.03]);
    G.add(spots.pts);
    up.push(spots);
    // moving-head beams from the truss, and lasers fanning from the booth
    const beams = [];
    for (const [x, z] of [[112.8, 106.5], [119.2, 106.5], [112.8, 113], [119.2, 113]]) {
      const bm = __fwBeam(),
        piv = new ji(),
        cone = new Ow(new Oc(0.55, 5.2, 20, 1, !0).translate(0, -2.6, 0), bm);
      piv.position.set(x, top - 0.7, z);
      piv.add(cone);
      G.add(piv);
      cy('lacquer', [x, top - 0.6, z], [x, top - 0.8, z], 0.12, [0.05, 0.05, 0.06]);
      beams.push({ piv, bm, ph: beams.length * 1.7 });
      up.push(bm);
    }
    const lasers = [];
    for (let i = 0; i < (low ? 5 : 10); i++) {
      const piv = new ji(),
        lm = __flOwn(new Ni({ color: '#ff3cf0', transparent: !0, blending: 2, depthWrite: !1 })),
        ln = new Ow(new _i(10, 0.012, 0.012).translate(-5, 0, 0), lm);
      piv.position.set(120.0, F + 2.2, cz);
      piv.add(ln);
      G.add(piv);
      lasers.push({ piv, lm, i });
    }
    // haze: soft drifting light in the air
    const haze = __fwSnow(low ? 30 : 80, [x0 + 0.5, F + 0.5, z0 + 0.5, x1 - 0.5, top - 0.5, z1 - 0.5], { color: '#6a3a9a', size: 1.6, speed: 0.05, rise: 0.5, sway: 0.8, add: 1 });
    haze.pts.material.opacity = 0.06;
    G.add(haze.pts);
    up.push(haze);
    // the booth's equaliser
    const eq = __fwShader(
        `float b = floor(vUv.x * 24.0); float h = 0.25 + 0.7 * abs(sin(uT * (3.0 + fwH(vec2(b, 1.0)) * 5.0) + b)) * (0.6 + 0.4 * (1.0 - fract(uT * 124.0 / 60.0)));
float on = step(vUv.y, h) * step(0.15, fract(vUv.x * 24.0)); float seg = step(0.25, fract(vUv.y * 14.0));
gl_FragColor = vec4(fwHue(vUv.y * 0.35 + 0.6) * on * seg * 1.6 + vec3(0.01), 1.0);`,
      ),
      ef = K.djFront;
    if (ef) {
      const eqm = mesh(new bB(2.8, 0.9), eq, 'frost_fw_eq');
      eqm.position.set(ef.p[0], ef.p[1], ef.p[2]);
      eqm.rotation.y = ef.ry;
      up.push(eq);
    }
    // the decks: platters spinning with a light on their edge
    const decks = K.decks.map((p) => {
      const d = mesh(new Rw(0.23, 0.23, 0.012, 32), __flOwn(new Gw({ color: '#111', roughness: 0.3, metalness: 0.5 })), 'frost_fw_deck');
      d.position.set(...p);
      const dot = new Ow(new bi(0.015, 8, 6), MAT.glow);
      dot.position.set(0.19, 0.01, 0);
      d.add(dot);
      return d;
    });
    ticks.push((dt, s) => {
      const t = performance.now() / 1000,
        bt = (t * 124) / 60,
        c = new UA();
      ball.rotation.y += dt * 0.6;
      for (const b of beams) {
        b.piv.rotation.set(Math.sin(t * 0.7 + b.ph) * 0.55, 0, Math.cos(t * 0.55 + b.ph) * 0.55);
        c.setHSL((t * 0.07 + b.ph * 0.1) % 1, 1, 0.55);
        b.bm.__u.uCol.value.set(c.r, c.g, c.b);
      }
      for (const L of lasers) {
        L.piv.rotation.set(0, (L.i - 4.5) * 0.09 + Math.sin(t * 1.3 + L.i * 0.3) * 0.25, Math.sin(t * 0.9 + L.i) * 0.12 - 0.05);
        c.setHSL((Math.floor(bt / 4) * 0.17 + L.i * 0.02) % 1, 1, 0.55);
        L.lm.color.copy(c);
        L.lm.opacity = 0.55 + 0.45 * (1 - (bt % 1));
      }
      for (const d of decks) d.rotation.y += dt * 3.5;
      try {
        __FW.inW && s && s.camera && __fwBeat(s.camera.position);
      } catch (e) {}
    });
  }
  // ================================================================ the Spa
  {
    const v = V.SP,
      pv = V.PL,
      [x0, z0, x1, z1, , top] = v.b,
      [px0, pz0, px1, pz1] = pv.b;
    // the floor round the pool (not over it), marble with a gold border and travertine coping round the pool
    for (const [a, b, c, d] of [[x0, z0, x1, pz0], [x0, pz1, x1, z1], [x0, pz0, px0, pz1], [px1, pz0, x1, pz1]]) bx('marble', a, F - 0.05, b, c, F, d, C.white);
    for (const [a, b, c, d] of [[px0 - 0.35, pz0 - 0.35, px1 + 0.35, pz0], [px0 - 0.35, pz1, px1 + 0.35, pz1 + 0.35], [px0 - 0.35, pz0, px0, pz1], [px1, pz0, px1 + 0.35, pz1]]) bx('marble', a, F, b, c, F + 0.03, d, [0.93, 0.86, 0.72]);
    shell(v, { ceil: null, wall: ['paint', C.ivory], skirt: ['gold', C.gold], crown: ['gold', C.gold], skip: null });
    // the ceiling: a summer sky in a deep gilt frame
    bx('paint', x0, top, z0, x1, top + 0.05, z1, C.ivory);
    const sky = __fwSkyCeil(),
      sk = mesh(new bB(x1 - x0 - 2, z1 - z0 - 2), sky, 'frost_fw_skyceil');
    sk.rotation.x = Math.PI / 2;
    sk.position.set((x0 + x1) / 2, top - 0.25, (z0 + z1) / 2);
    up.push(sky);
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 1], [x0, z1 - 1, x1, z1], [x0, z0 + 1, x0 + 1, z1 - 1], [x1 - 1, z0 + 1, x1, z1 - 1]]) bx('paint', a, top - 0.3, b, c, top, d, C.ivory);
    for (const [a, b, c, d] of [[x0 + 1, z0 + 1, x1 - 1, z0 + 1.06], [x0 + 1, z1 - 1.06, x1 - 1, z1 - 1], [x0 + 1, z0 + 1, x0 + 1.06, z1 - 1], [x1 - 1.06, z0 + 1, x1 - 1, z1 - 1]]) bx('gold', a, top - 0.36, b, c, top - 0.28, d, C.gold);
    // the pool: glass mosaic inside, its surface, underwater lights
    const mz = __fwMosaic('0.0, 0.42, 0.5', '0.02, 0.22, 0.55', 1, 1),
      PB = __flMB(),
      pl = new bB(1, 1),
      y0 = F - 2.2;
    PB.add(pl, __flM((px0 + px1) / 2, y0 + 0.002, (pz0 + pz1) / 2, px1 - px0, pz1 - pz0, 1, 0, -Math.PI / 2), 1);
    PB.add(pl, __flM((px0 + px1) / 2, y0 + 1.1, pz0 + 0.002, px1 - px0, 2.2, 1, 0), 1);
    PB.add(pl, __flM((px0 + px1) / 2, y0 + 1.1, pz1 - 0.002, px1 - px0, 2.2, 1, Math.PI), 1);
    PB.add(pl, __flM(px0 + 0.002, y0 + 1.1, (pz0 + pz1) / 2, pz1 - pz0, 2.2, 1, Math.PI / 2), 1);
    PB.add(pl, __flM(px1 - 0.002, y0 + 1.1, (pz0 + pz1) / 2, pz1 - pz0, 2.2, 1, -Math.PI / 2), 1);
    mesh(PB.build(), mz, 'frost_fw_pool');
    up.push(mz);
    for (let i = 0; i < 7; i++) bx('marble', 80.2, y0, 110.4 + 0.4 * i, 81.8, y0 + (2.2 / 7) * (i + 1), 113.2, [0.93, 0.9, 0.85]);
    for (const z of [105.5, 108.7, 111.9]) bx('glow', px1 - 0.03, y0 + 1.0, z - 0.3, px1, y0 + 1.3, z + 0.3, [0.6, 0.95, 1.0]);
    for (const x of [82.5, 85.5]) bx('glow', x - 0.3, y0 + 1.0, pz0, x + 0.3, y0 + 1.3, pz0 + 0.03, [0.6, 0.95, 1.0]);
    const wm = __fwPoolWater(),
      wsurf = mesh(new bB(px1 - px0, pz1 - pz0), wm, 'frost_fw_poolwater');
    wsurf.rotation.x = -Math.PI / 2;
    wsurf.position.set((px0 + px1) / 2, F - 0.15, (pz0 + pz1) / 2);
    wsurf.renderOrder = 5;
    up.push(wm);
    pl.dispose();
    // the hot tub's water, its glow and steam
    if (K.tubAt) {
      const tw = __fwTub(),
        tm = mesh(new Rw(1.18, 1.18, 0.02, 40), tw, 'frost_fw_tubwater');
      tm.position.set(K.tubAt[0], K.tubAt[1], K.tubAt[2]);
      up.push(tw);
      K.ring('glow', K.tubAt[0], F + 0.3, K.tubAt[2], 1.31, 0.02, [0.5, 0.9, 1.0]);
      const steam = __fwSnow(low ? 20 : 50, [K.tubAt[0] - 1, F + 0.6, K.tubAt[2] - 1, K.tubAt[0] + 1, F + 2.6, K.tubAt[2] + 1], { color: '#ffffff', size: 0.5, speed: 0.3, rise: 1, sway: 0.4, add: 0 });
      steam.pts.material.opacity = 0.1;
      G.add(steam.pts);
      up.push(steam);
    }
    // the water wall (west wall), its gilt frame and lit trough; gold mosaic behind the hot tub
    const fw = __fwFallMat(),
      wall = mesh(new bB(8, 4.6), fw, 'frost_fw_waterwall');
    wall.rotation.y = Math.PI / 2;
    wall.position.set(x0 + 0.06, F + 2.4, 108.5);
    up.push(fw);
    bx('gold', x0 + 0.02, F + 4.7, 104.4, x0 + 0.2, F + 4.85, 112.6, C.gold);
    bx('gold', x0 + 0.02, F, 104.4, x0 + 0.2, F + 4.85, 104.5, C.gold);
    bx('gold', x0 + 0.02, F, 112.5, x0 + 0.2, F + 4.85, 112.6, C.gold);
    bx('glow', x0 + 0.02, F + 0.05, 104.5, x0 + 0.35, F + 0.12, 112.5, [0.5, 0.9, 1.0]);
    const gm = __fwMosaic('0.95, 0.72, 0.3', '0.62, 0.44, 0.16', 0, 0.12),
      gw2 = mesh(new bB(6, 4.2), gm, 'frost_fw_goldmosaic');
    gw2.rotation.y = Math.PI;
    gw2.position.set(86.0, F + 2.4, z1 - 0.025);
    up.push(gm);
    // candles along the coping
    for (let z = pz0 + 0.4; z < pz1; z += 1.1) {
      cy('paint', [px1 + 0.18, F + 0.03, z], [px1 + 0.18, F + 0.13, z], 0.03, C.ivory);
      sp('glow', px1 + 0.18, F + 0.16, z, 0.02, C.warm, 'sph6');
    }
  }
  // ================================================================ the Vault Casino
  {
    const v = V.CV,
      [x0, z0, x1, z1, , top] = v.b;
    shell(v, {
      floor: ['carpet', [0.55, 0.06, 0.09]],
      ceil: ['paint', [0.05, 0.04, 0.03]],
      wall: ['lacquer', [0.04, 0.035, 0.03]],
      skirt: ['gold', C.gold],
      crown: ['gold', C.gold],
      deco: (f, r) => {
        // art deco: gilt fins, and a gilt sunburst over each panel
        if (r[1] > F + 0.01 || r[3] < top - 0.01) return;
        for (let u = r[0] + 0.9; u < r[2] - 0.6; u += 2.2) {
          wb(f, 'gold', u - 0.03, F + 0.14, u + 0.03, top - 0.16, 0.02, 0.09, C.gold);
          const m = u + 1.1;
          if (m + 0.8 > r[2]) continue;
          for (let i = 0; i < 9; i++) {
            const a = (i / 8) * Math.PI,
              p = K.fpt(f, m + Math.cos(a) * 0.45, top - 0.9 + Math.sin(a) * 0.45, 0.05);
            Bk('gold').add(__flUnit('box'), __flM(p[0], p[1], p[2], 0.035, 0.9, 0.03, K.fry(f), 0, Math.PI / 2 - a), C.gold);
          }
        }
      },
    });
    for (const [a, b, c, d] of [[x0 + 0.5, z0 + 0.5, x1 - 0.5, z0 + 0.56], [x0 + 0.5, z1 - 0.56, x1 - 0.5, z1 - 0.5], [x0 + 0.5, z0 + 0.5, x0 + 0.56, z1 - 0.5], [x1 - 0.56, z0 + 0.5, x1 - 0.5, z1 - 0.5]]) bx('gold', a, F, b, c, F + 0.006, d, C.gold);
    for (let x = x0 + 2.2; x < x1 - 1; x += 2.2) bx('gold', x - 0.1, top - 0.25, z0, x + 0.1, top, z1, C.gold);
    bx('soft', 111, top - 0.02, 70, 117, top - 0.01, 76, [0.9, 0.7, 0.42]);
    for (const [x, z] of [[112.5, 72.5], [112.5, 76.8]]) {
      const h = K.mH('chandelier', 1.8),
        y = top - 0.4 - h;
      K.place('chandelier', x, y, z, 0, 1.8) && cy('gold', [x, top, z], [x, y + h - 0.02, z], 0.012, C.gold, 'cyl6');
    }
    // the roulette wheel and its ball
    if (K.wheelAt) {
      const wm = __fwWheel(),
        wh = mesh(new Rw(0.46, 0.46, 0.02, 48), wm, 'frost_fw_roulette'),
        ballP = new ji(),
        b = new Ow(new bi(0.02, 10, 8), __flOwn(new Gw({ color: '#ffffff', roughness: 0.2 })));
      wh.position.set(...K.wheelAt);
      ballP.position.set(...K.wheelAt);
      b.position.set(0.4, 0.03, 0);
      ballP.add(b);
      G.add(ballP);
      up.push(wm);
      ticks.push((dt) => (ballP.rotation.y -= dt * 3.1));
    }
    // the slot machines' reels and toppers
    K.reels.forEach((r, i) => {
      const rm = __fwReels();
      rm.__u.uSeed.value = i * 0.37;
      const m = mesh(new bB(0.6, 0.46), rm, 'frost_fw_reels');
      m.position.set(r.p[0], r.p[1], r.p[2]);
      m.rotation.y = r.ry;
      up.push(rm);
    });
    for (const p of K.toppers) {
      const t = mesh(new bi(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.neon || __fwTendril(), 'frost_fw_topper');
      t.position.set(p[0], p[1] - 0.12, p[2]);
      t.scale.set(1, 0.6, 0.6);
    }
    // the vault's gold, cash and diamonds; money raining down in front of it
    const goldM = __fhIn(new Gw({ color: '#ffc75a', metalness: 1, roughness: 0.22, emissive: '#3a2200', emissiveIntensity: 0.6 }), { fill: K.fill, env: 1.3 }),
      cashM = __fhIn(new Gw({ color: '#5aa060', roughness: 0.75 }), { fill: K.fill }),
      inst = (list, geo, m, name) => list.length && __xmInst(G, geo, m, list.map((M) => [M, null]), name);
    inst(K.bars, __flUnit('box'), goldM, 'frost_fw_goldbars');
    inst(K.cash, __flUnit('box'), cashM, 'frost_fw_cash');
    const gemM = __fwFloatMat(null, !0),
      gl = K.gems.map((p, i) => [__flM(p[0], p[1], p[2], 0.14, 0.2, 0.14), i ? '#9fe8ff' : '#ffd0f4']);
    __xmInst(G, new bQ(1, 0), gemM, gl, 'frost_fw_gems');
    up.push(gemM);
    const rain = __fwSnow(low ? 40 : 110, [117.6, F + 0.1, 68.6, 120.4, top - 0.2, 76.4], { color: '#9fd89a', size: 0.09, speed: 0.45, rise: 0, sway: 0.4, add: 0 });
    G.add(rain.pts);
    up.push(rain);
    bx('soft', x1 - 0.06, F + 0.3, 69.4, x1 - 0.03, F + 2.7, 75.6, [0.9, 0.7, 0.35]);
  }
  // ================================================================ the Aquarium Tunnel
  const aq = new ji();
  aq.name = 'fw_aquarium';
  G.add(aq);
  __FW_HIDE.push(aq);
  {
    const v = V.AQ,
      [x0, z0, x1, z1, , top] = v.b,
      zc = (z0 + z1) / 2,
      // its own buckets (in the aquarium's group, which the fridge's window hides: it lies beyond the window)
      AB = { chrome: __flMB(), glow: __flMB(), gold: __flMB() },
      abx = (m, a, b, c, d, e, f, col) => __fhBox(AB[m], a, b, c, d, e, f, col);
    // the walkway: dark stone under caustics, glowing edges
    const cf = __fwCausFloor(),
      fl = mesh(new bB(x1 - x0, z1 - z0), cf, 'frost_fw_aqfloor', aq);
    fl.rotation.x = -Math.PI / 2;
    fl.position.set((x0 + x1) / 2, F + 0.002, zc);
    up.push(cf);
    // the glass arch (an ellipse in section) and gold ribs every 2.5 m
    const P = [],
      I = [],
      nu = 40,
      nx = 2;
    for (let i = 0; i <= nu; i++) {
      const a = (i / nu) * Math.PI;
      for (let j = 0; j < nx; j++) P.push(j ? x1 : x0, F + Math.sin(a) * 3.35, zc + Math.cos(a) * 1.6);
    }
    for (let i = 0; i < nu; i++) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const ag = new uw();
    ag.setAttribute('position', new gi(new Float32Array(P), 3));
    ag.setIndex(I);
    ag.computeVertexNormals();
    const glassM = __flOwn(new ri({ color: '#cfefff', roughness: 0.02, transparent: !0, opacity: 0.1, depthWrite: !1, side: 2, clearcoat: 1 }));
    mesh(ag, glassM, 'frost_fw_aqglass', aq).renderOrder = 4;
    for (let x = x0 + 1.25; x < x1; x += 2.5) {
      const rib = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI;
        rib.push([x, F + Math.sin(a) * 3.33, zc + Math.cos(a) * 1.58]);
      }
      const t = __xmTube(rib, 0.035, 6, 1);
      AB.gold.add(t, new _A(), C.gold);
      t.dispose();
    }
    for (const [a, b] of [[80, 83], [85, 114], [116, 121]]) {
      abx('chrome', a, F, z0, b, F + 0.9, z0 + 0.35, [0.25, 0.27, 0.3]);
      abx('glow', a, F + 0.88, z0 + 0.33, b, F + 0.9, z0 + 0.36, [0.3, 0.8, 1.0]);
    }
    abx('chrome', x0, F, z1 - 0.35, x1, F + 0.9, z1, [0.25, 0.27, 0.3]);
    abx('glow', x0, F + 0.88, z1 - 0.36, x1, F + 0.9, z1 - 0.33, [0.3, 0.8, 1.0]);
    for (const m in AB) mesh(AB[m].build(), MAT[m], 'frost_fw_aq_' + m, aq);
    // the water round it all (the tunnel's own walls and ceiling are not drawn: glass and water instead)
    const wb0 = [79.6, F - 1.6, 118.45, 121.4, F + 6, 128],
      wm = __fwWater([new oi(82.6, 0, 85.4, F + 3.1), new oi(113.6, 0, 116.4, F + 3.1)]),
      water = mesh(new _i(wb0[3] - wb0[0], wb0[4] - wb0[1], wb0[5] - wb0[2]), wm, 'frost_fw_water', aq);
    water.position.set((wb0[0] + wb0[3]) / 2, (wb0[1] + wb0[4]) / 2, (wb0[2] + wb0[5]) / 2);
    up.push(wm);
    // what swims: lanes outside the tunnel (and over the hallways), never inside it
    let seed = 31;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
      lane = (minY, maxY) => {
        for (let k = 0; k < 50; k++) {
          const y = F + minY + rnd() * (maxY - minY),
            z = 118.7 + rnd() * 9.0;
          if (Math.abs(z - zc) < 1.95 && y < F + 3.75) continue;
          if (z < z0 && y < F + 3.3) continue;
          return [y, z];
        }
        return [F + 5, 126];
      },
      span = 41.4,
      fishGeo = (() => {
        const B = __flMB();
        B.add(__flUnit('sph'), __flM(0, 0, 0, 0.26, 0.11, 0.06), 1);
        B.add(__flUnit('cone'), __flM(-0.3, 0, 0, 0.09, 0.14, 0.012, 0, 0, Math.PI / 2), 1);
        B.add(__flUnit('cone'), __flM(0.02, 0.1, 0, 0.06, 0.08, 0.01, 0, 0, -0.4), 1);
        return B.build();
      })(),
      sharkGeo = (() => {
        const B = __flMB();
        B.add(__flUnit('sph'), __flM(0, 0, 0, 1.1, 0.24, 0.22), 1);
        B.add(__flUnit('cone'), __flM(-1.2, 0.05, 0, 0.22, 0.45, 0.03, 0, 0, Math.PI / 2 - 0.2), 1);
        B.add(__flUnit('cone'), __flM(0.05, 0.32, 0, 0.18, 0.32, 0.03, 0, 0, -0.35), 1);
        B.add(__flUnit('cone'), __flM(0.25, -0.12, 0.2, 0.14, 0.32, 0.02, 0, Math.PI / 2, 0), 1);
        B.add(__flUnit('cone'), __flM(0.25, -0.12, -0.2, 0.14, 0.32, 0.02, 0, -Math.PI / 2, 0), 1);
        return B.build();
      })(),
      rayGeo = (() => {
        const B = __flMB();
        B.add(__flUnit('sph'), __flM(0, 0, 0, 0.55, 0.06, 0.9), 1);
        B.add(__flUnit('cyl'), __flM(-0.9, 0, 0, 0.012, 0.8, 0.012, 0, 0, Math.PI / 2), 1);
        return B.build();
      })(),
      FISH = ['#ff7a1a', '#ffd21a', '#1ad0ff', '#ff3c8c', '#7a5cff', '#2aff9a', '#ffffff', '#3c7aff'],
      school = [],
      sharks = [],
      rays = [];
    for (let s = 0; s < (low ? 10 : 22); s++) {
      const [y, z] = lane(-1.2, 5.6),
        col = FISH[s % FISH.length],
        dir = rnd() < 0.5 ? 1 : -1,
        x = x0 + rnd() * span,
        n = low ? 5 : 8;
      for (let k = 0; k < n; k++) {
        const sc = 0.8 + rnd() * 0.5,
          M = __flM(x + (rnd() - 0.5) * 1.6, y + (rnd() - 0.5) * 0.6, z + (rnd() - 0.5) * 0.6, sc * dir, sc, sc);
        school.push([M, col]);
      }
    }
    for (let s = 0; s < 3; s++) {
      const [y, z] = lane(0.5, 5.2),
        dir = s % 2 ? 1 : -1;
      sharks.push([__flM(x0 + rnd() * span, y, z, dir, 1, 1), '#7d8b96']);
    }
    for (let s = 0; s < 5; s++) {
      const [y, z] = lane(-0.8, 5.4),
        dir = s % 2 ? 1 : -1;
      rays.push([__flM(x0 + rnd() * span, y, z, dir, 1, 1), '#3d4a5c']);
    }
    const fm1 = __fwSwimMat(79.6, span, 1.0, 1),
      fm2 = __fwSwimMat(79.6, span, 0.45, 0.5),
      fm3 = __fwSwimMat(79.6, span, 0.35, 0.3);
    __xmInst(aq, fishGeo, fm1, school, 'frost_fw_fish');
    __xmInst(aq, sharkGeo, fm2, sharks, 'frost_fw_sharks');
    __xmInst(aq, rayGeo, fm3, rays, 'frost_fw_rays');
    up.push(fm1, fm2, fm3);
    // jellyfish: glowing bells drifting and turning
    const jl = [];
    for (let s = 0; s < (low ? 6 : 14); s++) {
      const [y, z] = lane(0.5, 5.6),
        c = new UA().setHSL(0.75 + rnd() * 0.35, 1, 0.6);
      jl.push([__flM(x0 + rnd() * span, y, z, 0.35, 0.3, 0.35), '#' + c.getHexString()]);
    }
    const jm = __fwFloatMat(null, !0);
    __xmInst(aq, new bi(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), jm, jl, 'frost_fw_jelly');
    up.push(jm);
    // coral and anemones on the sand; bubbles rising
    const coral = [],
      CO = ['#ff5a6a', '#ff9a3c', '#c44cff', '#ffd23c', '#3cffc8', '#ff6ad0'];
    for (let k = 0; k < (low ? 50 : 130); k++) {
      const x = x0 + rnd() * span,
        z = rnd() < 0.75 ? 124.4 + rnd() * 3.4 : 118.7 + rnd() * 1.5,
        s = 0.2 + rnd() * 0.5;
      coral.push([__flM(x, F - 1.6 + s * 0.5, z, s * (0.6 + rnd()), s * (0.8 + rnd() * 1.4), s * (0.6 + rnd())), CO[k % CO.length]]);
    }
    __xmInst(aq, __flUnit('sph6'), __fhIn(new Gw({ color: '#ffffff', roughness: 0.8, emissive: '#331018', emissiveIntensity: 0.5 }), { fill: [0.12, 0.2, 0.25] }), coral, 'frost_fw_coral');
    const bub = __fwSnow(low ? 60 : 160, [x0, F - 1.5, 124.2, x1, F + 5.8, 127.8], { color: '#cfefff', size: 0.06, speed: 0.6, rise: 1, sway: 0.3, add: 1 });
    aq.add(bub.pts);
    up.push(bub);
  }
  // every frame: time for everything that moves
  ticks.push((dt) => {
    const d = Math.min(dt, 0.1);
    for (const m of up) m && m.__u ? (m.__u.uT.value += d) : m && m.u && (m.u.uT.value += d);
  });
});
// ---------------------------------------------------------------- underwater
// in the pool, below its surface: an aquamarine haze close round you (after 65b's haze: this wraps it, so its
// frame callback runs later)
{
  const prevTrees = kwA;
  kwA = function () {
    QI((s) => {
      try {
        const sc = s.scene,
          c = s.camera && s.camera.position;
        const P = __FW_V.find((v) => v.id === 'PL'),
          under = !!(__FW.inW && c && P && c.x > P.b[0] && c.x < P.b[2] && c.z > P.b[1] && c.z < P.b[3] && c.y < __FW_Y.F - 0.15);
        if (under && sc && sc.fog && sc.fog.isFog) {
          sc.fog.near = 0.5;
          sc.fog.far = 13;
          sc.fog.color.set('#0b6f7c');
        }
        // the water over your eyes: an aquamarine tint, darker and bluer at the edges, light rippling across it
        let el = __FWB.uw;
        if (!el && typeof document < 'u' && document.body) {
          el = __FWB.uw = document.createElement('div');
          el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:29;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at 50% 40%, rgba(40,190,200,0.28) 0%, rgba(10,110,140,0.5) 60%, rgba(2,40,70,0.78) 100%);';
          document.body.appendChild(el);
        }
        if (el) {
          el.style.opacity = under ? '1' : '0';
          under && (el.style.filter = `hue-rotate(${(Math.sin(performance.now() / 900) * 8).toFixed(1)}deg)`);
        }
      } catch (e) {}
    });
    return M.jsx(prevTrees, {});
  };
}
