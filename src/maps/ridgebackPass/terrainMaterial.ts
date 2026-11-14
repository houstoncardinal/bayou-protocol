/**
 * World-space terrain material for Ridgeback Pass (v4).
 * 12 photo-scanned layers (Poly Haven) in a 4x3 atlas + three map-wide splat maps.
 *  - every layer is sampled in world space (no per-chunk textures -> no seams)
 *  - height-based blending, anti-tiling (rotated second sample + noise), macro variation
 *  - steepness is taken from the *geometric* surface (screen derivatives), so small steep faces never get a stretched
 *    top-down projection: ground layers switch to triplanar on steep ground, cliffs are always triplanar
 *  - two cliff rocks (lichen granite / weathered granite) mixed by a painted map, plus a close-range detail layer
 * Bound textures: 2 atlases + 3 splats = 5 (safe on every WebGL2 device).
 */
import * as THREE from 'three';

export interface TerrainTextures {
  albedoAtlas: THREE.Texture;   // RGB albedo, A height
  normalAtlas: THREE.Texture;   // RG normal (GL), B roughness, A ambient occlusion
  splatA: THREE.Texture;        // grass, meadow, forest floor, trail
  splatB: THREE.Texture;        // scree, rocky slope, creek bed, macro AO
  splatC?: THREE.Texture | null; // forest edge, mud, grass-rock, cliff variant
}
export interface TerrainMaterialParams {
  tileMeters: number[];         // 12 layer tile sizes in meters
  padFraction: number;
  atlasCols?: number; atlasRows?: number;
  mapMin: [number, number];
  mapSize: number;
  quality?: 'high' | 'medium' | 'low';
  anisotropy?: number;
}

export function createTerrainMaterial(tex: TerrainTextures, p: TerrainMaterialParams): THREE.MeshStandardMaterial {
  const cols = p.atlasCols ?? 4, rows = p.atlasRows ?? 3;
  for (const t of [tex.albedoAtlas, tex.normalAtlas]) {
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = p.anisotropy ?? 8;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  }
  const splats = [tex.splatA, tex.splatB, tex.splatC ?? tex.splatB];
  for (const t of splats) { t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; }
  tex.albedoAtlas.colorSpace = THREE.SRGBColorSpace;
  tex.normalAtlas.colorSpace = THREE.NoColorSpace;
  const q = p.quality ?? 'high';
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const tile = p.tileMeters.slice(0, 12); while (tile.length < 12) tile.push(4);
  const uniforms = {
    tAlb: { value: tex.albedoAtlas }, tNrm: { value: tex.normalAtlas }, tSplatA: { value: splats[0] }, tSplatB: { value: splats[1] }, tSplatC: { value: splats[2] },
    uTile: { value: tile }, uPad: { value: p.padFraction }, uGrid: { value: new THREE.Vector2(cols, rows) },
    uMapMin: { value: new THREE.Vector2(p.mapMin[0], p.mapMin[1]) }, uMapSize: { value: p.mapSize },
    uHasC: { value: tex.splatC ? 1 : 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.defines = { ...(shader.defines || {}), TERRAIN_ANTITILE: q === 'low' ? 0 : 1, TERRAIN_DETAIL: q === 'high' ? 1 : 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTWorld;\nvarying vec3 vTNormal;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvTWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvTNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vTWorld; varying vec3 vTNormal;
uniform sampler2D tAlb; uniform sampler2D tNrm; uniform sampler2D tSplatA; uniform sampler2D tSplatB; uniform sampler2D tSplatC;
uniform float uTile[12]; uniform float uPad; uniform vec2 uGrid; uniform vec2 uMapMin; uniform float uMapSize; uniform float uHasC;
vec2 tAtlasUV(int layer, vec2 uv) {
  int c = int(uGrid.x); float col = float(layer - (layer / c) * c); float row = float(layer / c);
  vec2 inner = fract(uv) * (1.0 - 2.0 * uPad) + uPad;
  return (vec2(col, row) + inner) / uGrid;
}
void tLayer(int layer, vec2 uv, out vec4 alb, out vec4 nrm) {
  vec2 g = (1.0 - 2.0 * uPad) / uGrid;
  vec2 dx = dFdx(uv) * g; vec2 dy = dFdy(uv) * g; vec2 a = tAtlasUV(layer, uv);
  alb = textureGrad(tAlb, a, dx, dy); nrm = textureGrad(tNrm, a, dx, dy);
}
float tHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1, 0)), f.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), f.x), f.y); }
// planar (top-down) sample with anti-tiling; returns albedo+height and a WORLD-space normal
void tTop(int layer, vec2 wp, vec3 N, out vec4 alb, out vec3 nw, out vec2 ra) {
  float t = uTile[layer]; vec4 nrm;
  tLayer(layer, wp / t, alb, nrm);
#if TERRAIN_ANTITILE
  vec2 r = mat2(0.8, -0.6, 0.6, 0.8) * wp / (t * 1.73) + 0.37;
  vec4 a2, n2; tLayer(layer, r, a2, n2);
  float m = smoothstep(0.35, 0.65, tNoise(wp * 0.045 + float(layer) * 7.1));
  alb = mix(alb, a2, m); nrm = mix(nrm, n2, m);
#endif
  vec2 d = nrm.xy * 2.0 - 1.0; nw = normalize(N + vec3(d.x, 0.0, -d.y) * 0.9); ra = nrm.ba;
}
// triplanar sample; bw = blend weights from the geometric normal
void tTri(int layer, vec3 P, vec3 N, vec3 G, vec3 bw, float scale, out vec4 alb, out vec3 nw, out vec2 ra) {
  float t = uTile[layer] * scale;
  vec4 ax, nx, ay, ny, az, nz;
  tLayer(layer, P.zy / t, ax, nx); tLayer(layer, P.xz / t, ay, ny); tLayer(layer, P.xy / t, az, nz);
  alb = ax * bw.x + ay * bw.y + az * bw.z;
  vec2 dX = nx.xy * 2.0 - 1.0; vec2 dY = ny.xy * 2.0 - 1.0; vec2 dZ = nz.xy * 2.0 - 1.0;
  // tangent frames: T = +u direction, B = image-up (= -v, glTF textures are not flipped) for each projection
  vec3 wx = vec3(0.0, -dX.y, dX.x); vec3 wy = vec3(dY.x, 0.0, -dY.y); vec3 wz = vec3(dZ.x, -dZ.y, 0.0);
  nw = normalize(N + (wx * bw.x + wy * bw.y + wz * bw.z) * 1.1);
  ra = nx.ba * bw.x + ny.ba * bw.y + nz.ba * bw.z;
}
`)
      .replace('#include <map_fragment>', `
vec2 tWP = vec2(vTWorld.x, vTWorld.z);
vec2 sUV = vec2((vTWorld.x - uMapMin.x) / uMapSize, (vTWorld.z - (-(uMapMin.y + uMapSize))) / uMapSize);
vec4 sA = texture2D(tSplatA, sUV); vec4 sB = texture2D(tSplatB, sUV); vec4 sC = uHasC > 0.5 ? texture2D(tSplatC, sUV) : vec4(0.0);
vec3 tN = normalize(vTNormal);
// geometric normal: catches small steep faces that the smoothed vertex normals hide
vec3 gN = normalize(cross(dFdx(vTWorld), dFdy(vTWorld))); if (dot(gN, tN) < 0.0) gN = -gN;
vec3 sN = normalize(mix(tN, gN, 0.65));
vec3 bw = pow(abs(sN), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
bool steepG = bw.y < 0.93;
int ids[10]; ids[0] = 0; ids[1] = 1; ids[2] = 2; ids[3] = 3; ids[4] = 4; ids[5] = 5; ids[6] = 6; ids[7] = 9; ids[8] = 10; ids[9] = 11;
float w[10]; w[0] = sA.r; w[1] = sA.g; w[2] = sA.b; w[3] = sA.a; w[4] = sB.r; w[5] = sB.g; w[6] = sB.b; w[7] = sC.r; w[8] = sC.g; w[9] = sC.b;
vec4 La[10]; vec3 Ln[10]; vec2 Lr[10]; float hw[10]; float best = 0.0;
for (int i = 0; i < 10; i++) {
  La[i] = vec4(0.0); Ln[i] = tN; Lr[i] = vec2(0.9, 1.0); hw[i] = 0.0;
  if (w[i] > 0.02) {
    if (steepG) tTri(ids[i], vTWorld, tN, sN, bw, 1.0, La[i], Ln[i], Lr[i]);
    else tTop(ids[i], tWP, tN, La[i], Ln[i], Lr[i]);
    hw[i] = w[i] + La[i].a * 0.6; best = max(best, hw[i]);
  }
}
vec4 gA = vec4(0.0); vec3 gNw = vec3(0.0); vec2 gR = vec2(0.0); float wsum = 0.0;
for (int i = 0; i < 10; i++) { float k = max(hw[i] - best + 0.25, 0.0); gA += La[i] * k; gNw += Ln[i] * k; gR += Lr[i] * k; wsum += k; }
gA /= max(wsum, 1e-4); gNw = normalize(gNw + tN * 1e-4); gR /= max(wsum, 1e-4);
// cliffs: triplanar granite (two variants), slope from the geometric normal so every steep face is rock
float steep = min(tN.y, mix(tN.y, gN.y, 0.6));
float rockF = smoothstep(0.78, 0.60, steep + (tNoise(tWP * 0.35) - 0.5) * 0.12);
vec4 rA = vec4(0.0); vec3 rNw = tN; vec2 rR = vec2(0.9, 1.0);
if (rockF > 0.01) {
  vec4 a7, a8; vec3 n7, n8; vec2 r7, r8;
  float vB = clamp(sC.a + (tNoise(vTWorld.xy * 0.08 + vTWorld.zz * 0.05) - 0.5) * 0.5, 0.0, 1.0);
  vB = smoothstep(0.3, 0.7, vB);
  if (vB < 0.99) tTri(7, vTWorld, tN, sN, bw, 1.0, a7, n7, r7); else { a7 = vec4(0.0); n7 = tN; r7 = vec2(0.9, 1.0); }
  if (vB > 0.01) tTri(8, vTWorld, tN, sN, bw, 1.0, a8, n8, r8); else { a8 = vec4(0.0); n8 = tN; r8 = vec2(0.9, 1.0); }
  rA = mix(a7, a8, vB); rNw = normalize(mix(n7, n8, vB)); rR = mix(r7, r8, vB);
#if TERRAIN_ANTITILE
  { // break up cliff tiling: blend a 2.37x larger copy of the dominant rock through low-frequency noise
    float am = smoothstep(0.32, 0.68, tNoise(vTWorld.xz * 0.035 + vTWorld.y * 0.02));
    if (am > 0.01) { vec4 aa; vec3 an; vec2 ar; tTri(vB > 0.5 ? 8 : 7, vTWorld + 13.7, tN, sN, bw, 2.37, aa, an, ar);
      rA = mix(rA, aa, am * 0.75); rNw = normalize(mix(rNw, an, am * 0.75)); rR = mix(rR, ar, am * 0.75); }
  }
#endif
#if TERRAIN_DETAIL
  // close-range detail: the same rock at 1/4 scale, faded in within ~9 m so walls stay crisp when you hug them
  float camD = length(vTWorld - cameraPosition);
  float dk = 1.0 - smoothstep(4.0, 10.0, camD);
  if (dk > 0.01) {
    vec4 da; vec3 dn; vec2 dr; tTri(vB > 0.5 ? 8 : 7, vTWorld, tN, sN, bw, 0.23, da, dn, dr);
    float l0 = dot(rA.rgb, vec3(0.333)) + 1e-3; float l1 = dot(da.rgb, vec3(0.333));
    rA.rgb *= mix(1.0, clamp(l1 / l0, 0.6, 1.5), 0.45 * dk);
    rNw = normalize(rNw + (dn - tN) * 0.6 * dk);
  }
#endif
  // strata tint so big walls read as layered rock, not wallpaper
  rA.rgb *= 0.92 + 0.16 * tNoise(vec2(vTWorld.y * 0.9, (vTWorld.x + vTWorld.z) * 0.03));
}
float macro = 0.86 + 0.28 * tNoise(tWP * 0.02) * tNoise(tWP * 0.007 + 3.1);
vec3 groundCol = gA.rgb * macro;
vec3 terrCol = mix(groundCol, rA.rgb * (0.9 + 0.2 * tNoise(tWP * 0.05)), rockF);
float terrAO = mix(gR.y, rR.y, rockF) * sB.a;
diffuseColor.rgb *= terrCol * mix(0.55, 1.0, terrAO);
float tRough = mix(gR.x, rR.x, rockF);
vec3 tNormalWorld = normalize(mix(gNw, rNw, rockF));
`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(tRough * 1.05, 0.55, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(tNormalWorld, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'ridgeback-terrain-v4-' + q;
  return mat;
}
