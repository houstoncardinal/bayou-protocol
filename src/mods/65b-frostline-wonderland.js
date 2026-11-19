/* ===== Bayou Protocol mod: the kitchen fridge, and the secret condo behind it (Frostline) ===== */
// In the kitchen of the house under the cabin (65a-frostline-cabin.js) stands a tall stainless French-door fridge.
// Press E and both doors swing open on a window into another world: you see, live and in perspective, the
// Kaleidoscope room on the other side (rendered from where you would stand in it, so it moves as you move), its
// edges rippling with rainbow light. Walk into it: a rainbow flash, a rising chime, and you are there.
//
// The other side, 14 m under the map (under Banana, the ice tunnel and Outside B; well away from the house, the
// tunnels and the exit shafts):
//   - the Kaleidoscope (arrival): an LSD trip of a room. Walls and ceiling of flowing kaleidoscopic colour that
//     breathes, a floor of neon rings pulsing out from a giant iridescent torus knot turning overhead, glowing
//     giant mushrooms, floating crystals, rainbow sparkles, mirror columns, and the gate home in the south wall
//   - the Grand Salon: a royal living room, 7 m high. Marble floor with gold inlay and a gold medallion, cream
//     panelled walls with gilded mouldings and pilasters, a gold coffered ceiling, three crystal chandeliers, a
//     colonnade of marble columns with gold capitals, a carved marble fireplace under a gilt mirror, sofas and
//     armchairs, a backlit onyx bar, a black lacquer grand piano, busts, palms, paintings in gilt frames
//   - the Home Cinema: a large cinematic screen over a long linear fireplace, red velvet curtains in a gold frame,
//     three rows of leather recliners, velvet walls, a starlit ceiling. What the screen plays is set in the /admin
//     dashboard ("Frostline Condo Cinema"), like the cinema map's screens (70-screens.js)
//   - the Overlook: the secret room with the view. Its east wall is floor-to-ceiling glass on an alpine valley
//     (snow-capped peaks, forest, meadow: Poly Haven's "Alps Field", CC0), a sofa and lounge chairs facing it, a
//     telescope, a dining table for six
//   - the Master Suite: a gilded canopy bed, a tufted headboard, a wardrobe, a dresser with an ornate mirror
//   - the Private Garage: three covered cars (one on a turntable), a roller door, a hexagon LED ceiling
// Everything you see is solid where it looks solid: the rooms are spaces of the house's own system (walls, floors
// and ceilings made round them, doorways where they meet), the furniture has its own boxes.
//
// Online: the fridge's doors are one of the core's doors (synced like the cabin's, shut every round). Each
// player's own update moves them through a portal (offline, on the host, on guests alike); the host's check on
// guests' movement (__clampMove in 05-netcode-and-bots.js) accepts a portal jump only from a portal's trigger
// to that portal's arrival (__fhPortalOk below), the fridge's only while its doors are open. Bots never use it
// (they do not go into the house, and they leave the fridge's doors alone).
// Drawing: the condo is one group, drawn only while the camera is in it (or, from the kitchen, into the fridge's
// window: one extra render of it at reduced size, only while the doors are open and you are near and facing
// them). The Kaleidoscope, the portals and the view are small shaders; the rest is merged by material or
// instanced. Dev: __bpCabinGo('fridge' | 'wonderland' | 'wonderland-exit' | 'salon' | 'cinema' | 'overlook' |
// 'suite' | 'garage'), __bpWonder().

// ---------------------------------------------------------------- layout
const __FW_Y = { F: -14 }; // the condo's floor
const __FW_BOX = [78, 66, 122, 118]; // x0, z0, x1, z1: all of it is inside
// the fridge: against the kitchen's north wall, its front at z 19.95; the gate home in the Kaleidoscope's south wall
const __FW_FR = { x0: 62.75, x1: 63.65, z: 19.95, y: __FH_Y.HF, h: 1.85 };
const __FW_GATE = { x: 100, z: 115.85 };
// the fridge's window looks into the Kaleidoscope as if it were this plane (z) there, facing north
const __FW_WIN = 114;
const __FW_IN = [100, __FW_Y.F, 112.4, 0]; // where you arrive (facing north, into the room)
const __FW_OUT = [63.2, __FH_Y.HF, 21.45, Math.PI]; // where you come out in the kitchen (facing away from the fridge)
const __FW = { anim: 0, wasOpen: !1, flashAt: -9, flashEl: null, group: null, door: -1, err: null, room: null, portalFrames: 0, da: 0, dv: 0, warm: 0 };
// for the condo's other wings (65c-frostline-condo-wing.js): drawing functions run with this file's kit, furniture
// kinds they draw, extra solids, each room's haze, and things hidden while the fridge's window is drawn
const __FW_WINGS = [],
  __FW_KINDS = {},
  __FW_SOLIDX = [],
  __FW_FOG = { PV: [25, 90, '#1a0626'] },
  __FW_HIDE = [];
// the rooms (spaces of the house's system: walls, floor, ceiling and doorways made round them; drawn here) and the
// doorways between them (gap: 0.4 m deep, through the wall)
const __FW_V = (() => {
  const F = __FW_Y.F,
    // (st 'wonder': footsteps on stone and tile; 'wonder-soft': the carpeted and parquet rooms, as on wood)
    v = (id, x0, z0, x1, z1, h, a, o = {}) => ({ id, b: [x0, z0, x1, z1, F, F + h], st: o.soft ? 'wonder-soft' : 'wonder', a, g: 'won', noVis: 1, fw: 1, ...o });
  return [
    v('PV', 90, 102, 110, 116, 9, 'Condo – The Kaleidoscope', { style: 'trip' }),
    v('Q1', 97.5, 101.6, 102.5, 102, 4.6, 'Condo – The Kaleidoscope', { gap: 1 }),
    v('GS', 88, 84, 112, 101.6, 7, 'Condo – Grand Salon', { style: 'salon' }),
    v('Q2a', 94, 83.6, 96, 84, 3, 'Condo – Home Cinema', { gap: 1, soft: 1 }),
    v('Q2b', 104, 83.6, 106, 84, 3, 'Condo – Home Cinema', { gap: 1, soft: 1 }),
    v('HT', 92, 68, 108, 83.6, 6.5, 'Condo – Home Cinema', { style: 'cinema', soft: 1 }),
    v('Q3', 112, 88.5, 112.4, 95.5, 4.2, 'Condo – The Overlook', { gap: 1 }),
    v('OV', 112.4, 80, 121, 101, 5.5, 'Condo – The Overlook', { style: 'view', soft: 1 }),
    v('Q4', 87.6, 97.5, 88, 100, 3.2, 'Condo – Master Suite', { gap: 1 }),
    v('MS', 79, 86, 87.6, 101, 4.6, 'Condo – Master Suite', { style: 'suite', soft: 1 }),
    v('Q5', 88.6, 83.6, 91, 84, 3, 'Condo – Private Garage', { gap: 1 }),
    v('GA', 79, 67, 91.6, 83.6, 4.6, 'Condo – Private Garage', { style: 'garage' }),
  ];
})();
__FH_V.push(...__FW_V);
// furniture (solid): kind, centre x, z, quarter turns (0: its front faces +z, 1: +x, 2: -z, 3: -x), options;
// sizes [width, depth, height]
const __FW_FS = {
  sofa: [2.9, 1.0, 0.95], arm: [0.9, 0.9, 1.05], ctable: [1.3, 1.3, 0.45], side: [0.55, 0.5, 0.6], console: [1.6, 0.5, 0.85], col: [0.8, 0.8, 7], pcol: [0.7, 0.7, 9],
  plant: [0.8, 0.8, 1.6], bust: [0.5, 0.5, 1.75], fire: [3.8, 0.9, 1.7], bar: [4.4, 0.8, 1.12], backbar: [5.0, 0.5, 0.95], stool: [0.5, 0.5, 0.78], piano: [1.6, 2.1, 1.0],
  hearth: [12, 0.7, 1.25], recl: [7, 1.15, 1.05], bed: [2.2, 2.5, 0.7], stand: [0.6, 0.45, 0.62], ward: [4, 0.65, 2.6], dresser: [1.8, 0.55, 0.85], bench: [1.6, 0.5, 0.48],
  car: [2.0, 5.0, 1.6], shelf: [0.62, 0.5, 2.2], cart: [1.58, 1.09, 1.38], lounge: [1.0, 1.2, 1.0], scope: [0.8, 0.8, 1.6], dtable: [3.0, 1.1, 0.76], chair: [0.5, 0.5, 1.0],
  mush: [0.8, 0.8, 3],
};
const __FW_F = [
  // the Grand Salon: the fireplace (west wall) and the sofa, table and armchairs round it; a second group by the
  // Overlook's doorway; the colonnade; the bar (north-east) and its stools; the piano; busts by the Kaleidoscope's
  // arch; palms; a console between the cinema's doors
  ['fire', 88.45, 92.8, 1], ['sofa', 93.4, 92.8, 3], ['ctable', 91.3, 92.8, 0], ['arm', 91.2, 90.2, 0], ['arm', 91.2, 95.4, 2], ['side', 93.4, 90.85, 0], ['side', 93.4, 94.75, 0],
  ['sofa', 106, 89.9, 0], ['sofa', 106, 95.7, 2], ['ctable', 106, 92.8, 0], ['arm', 108.6, 92.8, 3],
  ['col', 96.8, 87.4, 0], ['col', 103.2, 87.4, 0], ['col', 96.8, 98.2, 0], ['col', 103.2, 98.2, 0],
  ['bar', 109.4, 85.6, 0], ['backbar', 109.3, 84.25, 0], ['stool', 108.0, 86.6, 2], ['stool', 109.4, 86.6, 2], ['stool', 110.8, 86.6, 2], ['piano', 108.6, 99.4, 2],
  ['bust', 95.6, 101.0, 2], ['bust', 104.4, 101.0, 2], ['plant', 88.7, 100.9, 0], ['plant', 111.3, 100.9, 0], ['plant', 111.4, 87.3, 0], ['plant', 92.2, 84.7, 0], ['console', 100, 84.35, 0],
  // the Home Cinema: the media wall with its fire under the screen, three rows of recliners facing it
  ['hearth', 100, 68.35, 0], ['recl', 100, 75.6, 2], ['recl', 100, 78.9, 2], ['recl', 100, 82.1, 2],
  // the Overlook: a sofa and lounge chairs facing the view, a telescope, a dining table for six, palms
  ['sofa', 117.0, 90.5, 1], ['ctable', 118.8, 90.5, 0], ['side', 117.0, 88.55, 0], ['side', 117.0, 92.45, 0], ['lounge', 118.7, 86.2, 1], ['lounge', 118.7, 94.8, 1], ['scope', 119.9, 98.8, 1],
  ['dtable', 116.5, 83.6, 0], ...[115.5, 116.5, 117.5].flatMap((x) => [['chair', x, 82.6, 0], ['chair', x, 84.6, 2]]),
  ['plant', 113.1, 80.7, 0], ['plant', 120.3, 80.7, 0], ['plant', 113.1, 100.3, 0], ['plant', 120.3, 100.3, 0],
  // the Master Suite: the bed against the west wall, nightstands, a bench at its foot, the wardrobe, a dresser,
  // an armchair, palms
  ['bed', 80.35, 93.5, 1], ['stand', 79.4, 91.75, 1], ['stand', 79.4, 95.25, 1], ['bench', 82.25, 93.5, 1], ['ward', 82.4, 86.35, 0], ['dresser', 87.3, 90.0, 3], ['arm', 84.2, 100.15, 2],
  ['plant', 79.6, 100.4, 0], ['plant', 86.9, 86.7, 0],
  // the Private Garage: three cars, shelving and a tool cart
  ['car', 81.6, 74.2, 0], ['car', 85.3, 74.2, 0], ['car', 89.0, 74.2, 0], ['shelf', 91.3, 79.0, 3], ['shelf', 91.3, 79.62, 3], ['shelf', 91.3, 80.24, 3], ['cart', 90.6, 81.8, 3],
  // the Kaleidoscope: four giant mushrooms (their stems: the caps are over your head), the mirror columns at the arch
  ['mush', 93.6, 105.3, 0, { h: 3.9, cap: 1.75, col: '#ff3cc8' }], ['mush', 106.4, 105.3, 0, { h: 4.5, cap: 1.85, col: '#3cf0ff' }],
  ['mush', 93.5, 112.1, 0, { h: 3.3, cap: 1.5, col: '#a6ff3c' }], ['mush', 106.5, 112.1, 0, { h: 4.1, cap: 1.55, col: '#ff9a2a' }],
  ['pcol', 96.6, 102.45, 0], ['pcol', 103.4, 102.45, 0],
];
// a piece's footprint: [x0, z0, x1, z1, y0, y1]
function __fwFoot(f) {
  const [k, cx, cz, r] = f,
    s = __FW_FS[k],
    w = s[0],
    d = s[1],
    hx = (r % 2 ? d : w) / 2,
    hz = (r % 2 ? w : d) / 2;
  return [cx - hx, cz - hz, cx + hx, cz + hz, __FW_Y.F, __FW_Y.F + s[2]];
}
// the map's interior lamps in the condo (real lights: the nearest few are lit, as everywhere below ground)
{
  const F = __FW_Y.F;
  __FH_LIGHTS.push([100, F + 6.2, 92.8], [93, F + 5.6, 92.8], [107, F + 5.6, 92.8], [100, F + 5.2, 99.6], [100, F + 5.4, 77], [100, F + 2.4, 70.5], [116.5, F + 4.6, 90.5], [83.3, F + 3.9, 93.5], [85.3, F + 4.0, 75.3], [100, F + 7.5, 108]);
}
// the new fridge replaces the old one in the kitchen (same spot, the size of a real 90 cm fridge)
__FH_FS.fridge2 = [0.9, 0.75, __FW_FR.h];
{
  const i = __FH_F.findIndex((f) => f[0] === 'fridge');
  i >= 0 && (__FH_F[i] = ['fridge2', 63.2, 19.575, 0, __FH_Y.HF]);
}
// the condo's furniture models (Poly Haven, CC0, from the cinema's folder: loaded with the house's) and the width
// each is scaled to
Object.assign(__FH_MODELS, { fwCar: ['covered_car', 1.95], fwShelf: ['steel_frame_shelves_02', 0.62], fwCart: ['industrial_storage_cart', 1.58], fwLounge: ['mid_century_lounge_chair', 1.0], fwStool: ['bar_chair_round_01', 0.5] });
Object.assign(__FH_GO, {
  fridge: [63.2, __FH_Y.HF, 21.2, 0],
  wonderland: [...__FW_IN],
  'wonderland-exit': [100, __FW_Y.F, 114.2, Math.PI],
  salon: [100, __FW_Y.F, 93, 0],
  cinema: [100, __FW_Y.F, 80.6, 0],
  overlook: [114.5, __FW_Y.F, 90.5, -Math.PI / 2],
  suite: [85.5, __FW_Y.F, 95, Math.PI / 2],
  garage: [85.3, __FW_Y.F, 81.5, 0],
});
// solid things in the condo: [x0, y0, z0, x1, y1, z1, kind, material]
function __fwSolids() {
  const F = __FW_Y.F,
    out = [];
  for (const f of __FW_F) {
    const [x0, z0, x1, z1, y0, y1] = __fwFoot(f),
      k = f[0];
    out.push([x0, y0, z0, x1, y1, z1, 'prop', k === 'car' || k === 'shelf' || k === 'cart' || k === 'scope' ? 'metal' : k === 'col' || k === 'pcol' || k === 'fire' || k === 'hearth' || k === 'bust' ? 'stone' : 'wood']);
  }
  // the gate home: its pillars (the portal is in the wall: you walk into it, not through it)
  const g = __FW_GATE;
  out.push([g.x - 1.35, F, g.z - 0.3, g.x - 0.9, F + 3.7, 116, 'wall', 'metal'], [g.x + 0.9, F, g.z - 0.3, g.x + 1.35, F + 3.7, 116, 'wall', 'metal']);
  // the Kaleidoscope's rounded corners: what lies between its curved wall and the room's box is solid (in 0.5 m
  // strips both ways, each reaching the curve at its nearer end)
  for (let x = 90; x < 110 - 1e-6; x += 0.5) {
    const dx = Math.min(Math.abs(x - 100), Math.abs(x + 0.5 - 100)) / 10,
      zz = 7 * Math.cbrt(Math.max(0, 1 - dx ** 3));
    7 - zz > 0.12 && out.push([x, F, 102, x + 0.5, F + 9, 109 - zz, 'wall', 'concrete'], [x, F, 109 + zz, x + 0.5, F + 9, 116, 'wall', 'concrete']);
  }
  for (let zq = 102; zq < 116 - 1e-6; zq += 0.5) {
    const dz = Math.min(Math.abs(zq - 109), Math.abs(zq + 0.5 - 109)) / 7,
      xx = 10 * Math.cbrt(Math.max(0, 1 - dz ** 3));
    10 - xx > 0.12 && out.push([90, F, zq, 100 - xx, F + 9, zq + 0.5, 'wall', 'concrete'], [100 + xx, F, zq, 110, F + 9, zq + 0.5, 'wall', 'concrete']);
  }
  for (const fn of __FW_SOLIDX) out.push(...fn());
  return out;
}
// ---------------------------------------------------------------- the map: the fridge's doors, the solids, the screen
{
  const prevBuild = XE.frostline;
  XE.frostline = function () {
    const A = prevBuild.apply(this, arguments);
    try {
      if (A.__fh && !A.__fw) {
        const w = new Po();
        w.m = A;
        // the fridge's doors: one core door across its front (E opens both leaves; shut every round)
        const id = A.doors.length;
        w.door(!0, __FW_FR.x0 + 0.01, __FW_FR.z + 0.025, __FW_FR.y, __FW_FR.x1 - __FW_FR.x0 - 0.02, __FW_FR.h, 1, '#c8ccd0');
        A.doors[id].__fhDoor = 'fridge';
        A.doors[id].box.mat = 'metal';
        for (const [x0, y0, z0, x1, y1, z1, kind, mat] of __fwSolids()) w.box(x0, y0, z0, x1, y1, z1, kind, { pen: kind === 'wall' ? 0 : 4, mat, __fh: 1, __fw: 1 });
        // the home cinema's screen (70-screens.js; what it plays is set in /admin as "Frostline Condo Cinema")
        const F = __FW_Y.F;
        (A.screens || (A.screens = [])).push({ id: 'condo', name: 'Home Cinema', x: 100, y: F + 3.85, z: 68.06, w: 8.4, h: 4.725, ry: 0, frame: 'none', room: { min: z(92, F, 68), max: z(108, F + 6.5, 83.6) }, hear: 16 });
        A.__fw = { door: id };
      }
    } catch (e) {
      __FW.err = String(e && e.stack);
      console.warn('[condo] map', e);
    }
    return A;
  };
}
// ---------------------------------------------------------------- portals
const __fwIn = (p, b) => p.x > b[0] && p.x < b[3] && p.y > b[1] && p.y < b[4] && p.z > b[2] && p.z < b[5];
const __fwNear = (c, r, dy = 1.6) => [c[0] - r, c[1] - 0.6, c[2] - r, c[0] + r, c[1] + dy, c[2] + r];
// trigger: where walking in sends you (the client's own update); from: what the host accepts as "was at the
// portal" (a little wider: guests report a few times a second); to: the arrival, as the host checks it
const __FW_PORTALS = [
  {
    id: 'fridge',
    trigger: [__FW_FR.x0 + 0.05, __FH_Y.HF - 0.3, __FW_FR.z, __FW_FR.x1 - 0.05, __FH_Y.HF + 0.6, __FW_FR.z + 0.5],
    from: [62.0, __FH_Y.HF - 0.6, 19.85, 64.4, __FH_Y.HF + 1.2, 21.7],
    open: (m) => !!(m.__fw && m.doors[m.__fw.door] && m.doors[m.__fw.door].open),
    to: __FW_IN,
  },
  {
    id: 'gate',
    trigger: [__FW_GATE.x - 0.85, __FW_Y.F - 0.3, __FW_GATE.z - 0.85, __FW_GATE.x + 0.85, __FW_Y.F + 0.6, __FW_GATE.z + 0.2],
    from: [__FW_GATE.x - 1.6, __FW_Y.F - 0.6, __FW_GATE.z - 2.6, __FW_GATE.x + 1.6, __FW_Y.F + 1.2, __FW_GATE.z + 0.2],
    open: () => !0,
    to: __FW_OUT,
  },
  {
    // a safety net: anyone who somehow ends up under the condo's floors (the pool's bottom included, 2.2 m down)
    // is set back at the arrival
    id: 'fall',
    trigger: [__FW_BOX[0], __FW_Y.F - 9, __FW_BOX[1], __FW_BOX[2], __FW_Y.F - 3.0, 130],
    from: [__FW_BOX[0], __FW_Y.F - 9, __FW_BOX[1], __FW_BOX[2], __FW_Y.F - 2.7, 130],
    open: () => !0,
    to: __FW_IN,
  },
];
// the host's check (05-netcode-and-bots.js, __clampMove): a guest's long step is a portal jump when the last
// accepted position was at a portal (open) and the new one is that portal's arrival
function __fhPortalOk(st, o, n) {
  try {
    const m = aw();
    if (!m || !m.__fw || !o || !n) return !1;
    for (const P of __FW_PORTALS) if (P.open(m) && __fwIn(o, P.from) && __fwIn(n, __fwNear(P.to, 1.8))) return !0;
  } catch (e) {}
  return !1;
}
// each player's own update: in a portal's trigger for a moment (0.12 s: so the host sees you there), you go
// through. Not on a ladder, not twice within a second
{
  const prevY8 = Y8;
  Y8 = function (w, A, i, I) {
    const r = prevY8.apply(this, arguments);
    try {
      const m = aw();
      if (!m || !m.__fw || !A || A.isBot || !A.alive || A.__fhLad || A.mantleT >= 0) return r;
      let P = null;
      for (const q of __FW_PORTALS) if (__fwIn(A.pos, q.trigger) && q.open(m)) P = q;
      if (!P) return (A.__fwDwell = 0), r;
      A.__fwDwell = (A.__fwDwell || 0) + (I || 1 / 60);
      if (A.__fwDwell < 0.12 || w.t - (A.__fwAt ?? -9) < 1) return r;
      const [x, y, z, yaw] = P.to;
      A.pos.x = x;
      A.pos.y = y + 0.02;
      A.pos.z = z;
      A.vel = { x: 0, y: 0, z: 0 };
      A.yaw = yaw;
      A.fallSpeed = 0;
      A.__stepOff = 0;
      A.__fwAt = w.t;
      A.__fwDwell = 0;
      // the flash and the sound, on this player's own screen
      const me = eA.human && eA.human();
      me === A && __fwPortalFx(P.id);
    } catch (e) {
      __FW.err = String(e && e.stack);
    }
    return r;
  };
}
// a rainbow flash over the screen, a rising shimmer of notes and a whoosh (the core's own synth); going home, the
// notes fall
function __fwPortalFx(id) {
  __FW.flashAt = performance.now();
  try {
    const g = xw(null, 0.5);
    if (!g) return;
    Cw(g.in, g.t, 1.4, 'bandpass', 500, 1.4, id === 'fall' ? 0.1 : 0.24, { attack: 0.3, sweepTo: 5200 });
    const notes = id === 'gate' ? [1760, 1397, 1175, 880, 698] : [523, 659, 784, 988, 1175, 1568];
    notes.forEach((f, k) => Ii(g.in, g.t + 0.06 + k * 0.08, 2.0, f, f * (id === 'gate' ? 0.985 : 1.02), 0.065, 'sine', 0.004));
    Ii(g.in, g.t, 2.4, 98, 196, 0.08, 'triangle', 0.3);
  } catch (e) {}
}
function __fwChime(pos) {
  try {
    const g = xw(pos, 0.45, { maxDist: 25, reverb: 0.3 });
    if (!g) return;
    [880, 1109, 1319, 1661, 2217].forEach((f, k) => Ii(g.in, g.t + k * 0.09, 2.4, f, f * 1.01, 0.045, 'sine', 0.004));
    Cw(g.in, g.t, 1.6, 'bandpass', 900, 1.0, 0.05, { attack: 0.4, sweepTo: 3600 });
  } catch (e) {}
}

// ---------------------------------------------------------------- drawing: shaders
const __FW_GLSL = `
float fwH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fwN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(fwH(i),fwH(i+vec2(1,0)),f.x),mix(fwH(i+vec2(0,1)),fwH(i+vec2(1,1)),f.x),f.y);}
float fwF(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*fwN(p);p*=2.03;a*=0.5;}return s;}
vec3 fwHue(float h){return 0.5+0.5*cos(6.2831853*(vec3(0.0,0.33,0.67)+h));}`;
const __FW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vP; varying vec3 vW; varying vec3 vN;
void main(){ vUv = uv; vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const __fwOut = `
#include <tonemapping_fragment>
#include <colorspace_fragment>`;
function __fwShader(frag, o = {}) {
  const u = { uT: { value: 0 }, uOpen: { value: 1 }, ...(o.u || {}) },
    m = new Qi({
      uniforms: u,
      vertexShader: __FW_VS,
      fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uT; uniform float uOpen; varying vec2 vUv; varying vec3 vP; varying vec3 vW; varying vec3 vN;${o.decl || ''}${__FW_GLSL}
void main(){
#include <logdepthbuf_fragment>
${frag}${__fwOut}
}`,
      side: o.side ?? 0,
      transparent: !!o.add || !!o.transparent,
      blending: o.add ? 2 : 1,
      depthWrite: !o.add && !o.transparent,
      fog: !1,
    });
  m.__u = u;
  return __flOwn(m);
}
// the Kaleidoscope's vault: one picture over the walls and the dome, laid out from the dome's crown (a
// stereographic view, so it has no seams): the twelve-fold kaleidoscope of flowing, domain-warped colour, slowly
// morphing into and out of a Julia set whose constant circles (so its shapes never stop changing), colours
// cycling, bright bands sweeping, all of it breathing. The walls themselves undulate (in the corners and the dome,
// above head height: what you can bump into stays where it is). Doorways are cut out of it.
const __FW_TRIP_PIC = `
vec3 tripPic(vec3 wp, float t){
  vec3 dir = normalize(wp - vec3(100.0, ${(-14 + 2).toFixed(1)}, 109.0));
  vec2 q = dir.xz / (1.0 + max(dir.y, -0.6)) * 3.2;
  float r = length(q); float a = atan(q.y, q.x) + t * 0.05; float seg = 6.2831853 / 12.0; a = mod(a, seg); a = abs(a - seg * 0.5);
  vec2 k = r * vec2(cos(a), sin(a));
  vec2 w = vec2(fwF(k * 2.6 + vec2(t * 0.11, 0.0)), fwF(k * 2.6 + vec2(5.2, -t * 0.09)));
  float f = fwF(k * 2.0 + w * 2.6 + vec2(t * 0.06, -t * 0.045));
  float bands = sin(f * 11.0 + r * 5.0 - t * 1.1);
  vec3 c1 = fwHue(f * 1.3 + r * 0.5 - t * 0.07) * (0.3 + 0.8 * smoothstep(-0.6, 1.0, bands)) + pow(max(bands, 0.0), 16.0) * 0.9;
  vec2 z = k * 1.1; vec2 cj = 0.7885 * vec2(cos(t * 0.07), sin(t * 0.09));
  float it = 0.0;
  for (int i = 0; i < 28; i++) { z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cj; if (dot(z, z) > 16.0) break; it += 1.0; }
  float sm = it - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
  vec3 c2 = fwHue(sm * 0.045 - t * 0.08 + r * 0.2) * (0.2 + 1.0 * smoothstep(1.0, 26.0, sm)) + pow(smoothstep(20.0, 28.0, sm), 3.0) * 0.6;
  vec3 col = mix(c1, c2, (0.5 + 0.5 * sin(t * 0.11 + r * 0.6)) * 0.8);
  return col * (0.82 + 0.18 * sin(t * 0.8 + r * 3.0));
}`;
function __fwVaultMat(holes, tops) {
  const F = __FW_Y.F,
    u = { uT: { value: 0 }, uH: { value: holes }, uHY: { value: tops } },
    m = new Qi({
      uniforms: u,
      vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uT; varying vec3 vW;
void main(){
  vec3 p = position; vec2 d = p.xz - vec2(100.0, 109.0); float an = atan(d.y, d.x);
  float corner = pow(abs(sin(2.0 * an)), 1.5);
  float amp = 0.55 * smoothstep(${(F + 2.6).toFixed(2)}, ${(F + 4.6).toFixed(2)}, p.y) * max(corner, smoothstep(${(F + 5.0).toFixed(2)}, ${(F + 7.5).toFixed(2)}, p.y));
  float wave = 0.5 + 0.5 * sin(uT * 0.8 + p.y * 1.1 + an * 4.0) * cos(uT * 0.53 + an * 3.0 - p.y * 0.7);
  p += normal * amp * wave;
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
      fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uT; uniform vec4 uH[4]; uniform float uHY[4]; varying vec3 vW;${__FW_GLSL}${__FW_TRIP_PIC}
void main(){
#include <logdepthbuf_fragment>
  for (int i = 0; i < 4; i++) { vec4 h = uH[i]; if (vW.x > h.x && vW.x < h.z && vW.z > h.y && vW.z < h.w && vW.y < uHY[i]) discard; }
  gl_FragColor = vec4(tripPic(vW, uT) * 0.9, 1.0);${__fwOut}
}`,
      fog: !1,
    });
  m.__u = u;
  return __flOwn(m);
}
// the floor: a Julia set turning slowly under your feet, neon rings pulsing out from the middle
const __fwTripFloor = () =>
  __fwShader(
    `vec2 d = vW.xz - vec2(100.0, 109.0); float r = length(d); float a0 = uT * 0.04;
vec2 z = mat2(cos(a0), -sin(a0), sin(a0), cos(a0)) * d * 0.17; vec2 cj = vec2(-0.8 + 0.08 * sin(uT * 0.05), 0.156 + 0.05 * cos(uT * 0.07));
float it = 0.0; for (int i = 0; i < 24; i++) { z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cj; if (dot(z, z) > 16.0) break; it += 1.0; }
float sm = it - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
vec3 base = fwHue(sm * 0.05 + uT * 0.05) * smoothstep(1.0, 22.0, sm) * 0.55;
float ring = pow(0.5 + 0.5 * sin(r * 2.4 - uT * 2.2), 18.0);
gl_FragColor = vec4(vec3(0.012, 0.0, 0.035) + base + fwHue(r * 0.06 - uT * 0.1) * ring * 0.8, 1.0);`,
  );
// the centrepiece: a Mandelbulb, ray-marched inside a sphere (its power breathing between 6.5 and 9.5, so it
// morphs; turning; coloured by how close each point's orbit came to the axis; a halo where the rays nearly hit)
const __fwBulb = (steps, iters) =>
  __fwShader(
    `vec3 ro = (cameraPosition - uC) / uR; vec3 rd = normalize(vW - cameraPosition);
float a = uT * 0.12; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a)); ro.xz = R * ro.xz; rd.xz = R * rd.xz;
float b = dot(ro, rd), c = dot(ro, ro) - 1.0, h = b * b - c; if (h < 0.0) discard;
float sq = sqrt(h), t = max(0.0, -b - sq), t1 = -b + sq, pw = 8.0 + 1.5 * sin(uT * 0.13), glow = 0.0, tr = 0.0, n = 0.0; bool hit = false;
for (int i = 0; i < ${steps}; i++) {
  vec3 p = (ro + rd * t) * 1.22; vec3 zz = p; float dr = 1.0, rr = 0.0, trap = 1e9;
  for (int j = 0; j < ${iters}; j++) { rr = length(zz); if (rr > 2.0) break; float th = acos(clamp(zz.z / rr, -1.0, 1.0)) * pw + uT * 0.25; float ph = atan(zz.y, zz.x) * pw;
    dr = pow(rr, pw - 1.0) * pw * dr + 1.0; zz = pow(rr, pw) * vec3(sin(th) * cos(ph), sin(ph) * sin(th), cos(th)) + p; trap = min(trap, length(zz.xy)); }
  float d = 0.5 * log(max(rr, 1e-4)) * rr / dr / 1.22;
  glow += exp(-d * 28.0) * 0.022;
  if (d < 0.0015 * (1.0 + t * 2.0)) { hit = true; tr = trap; break; }
  t += d * 0.85; n += 1.0; if (t > t1) break;
}
if (hit) { float ao = 1.0 - n / ${steps}.0; gl_FragColor = vec4(fwHue(tr * 0.9 + uT * 0.08 + t * 0.3) * (0.35 + 1.15 * ao) + pow(ao, 6.0) * 0.6, 1.0); }
else { float al = clamp(glow * 1.8, 0.0, 0.85); if (al < 0.01) discard; gl_FragColor = vec4(fwHue(uT * 0.1 + glow) * glow * 2.2, al); }`,
    { transparent: 1, decl: '\nuniform vec3 uC; uniform float uR;', u: { uC: { value: new U(100, __FW_Y.F + 5.7, 108.6) }, uR: { value: 1.9 } } },
  );
// glowing tendrils hanging from the dome, colour running down them
const __fwTendril = () => __fwShader(`gl_FragColor = vec4(fwHue(vW.y * 0.22 + vW.x * 0.04 + vW.z * 0.03 - uT * 0.35) * 1.5, 1.0);`);
// the vault's mesh: a superellipse in plan (exponent 3: between a rectangle and an ellipse) whose straight
// walls curve over into a dome; faces inwards
function __fwVaultGeo(cx, cz, ax, az, y0, y1, nu, nv) {
  const wallTop = y0 + (y1 - y0) * 0.55,
    dome = y1 - wallTop,
    P = [],
    UV = [],
    I = [],
    e = 2 / 3,
    sq = (t) => {
      const c = Math.cos(t),
        s = Math.sin(t);
      return [Math.sign(c) * Math.pow(Math.abs(c), e), Math.sign(s) * Math.pow(Math.abs(s), e)];
    };
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    let yy, r;
    if (v <= 0.45) (yy = y0 + (wallTop - y0) * (v / 0.45)), (r = 1);
    else {
      const a = ((v - 0.45) / 0.55) * Math.PI * 0.5;
      yy = wallTop + dome * Math.sin(a);
      r = Math.cos(a);
    }
    for (let i = 0; i <= nu; i++) {
      const [sx, sz] = sq((i / nu) * Math.PI * 2);
      P.push(cx + sx * ax * r, yy, cz + sz * az * r);
      UV.push(i / nu, v);
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i,
        b = a + 1,
        c = a + nu + 1,
        d = c + 1;
      I.push(a, b, c, b, d, c);
    }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('uv', new gi(new Float32Array(UV), 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}
// is (x, z) inside the vault's plan (with a margin)?
const __fwInVault = (x, z, m = 0) => Math.pow(Math.abs(x - 100) / (10 - m), 3) + Math.pow(Math.abs(z - 109) / (7 - m), 3) < 1;

// iridescent: the hue follows the surface's angle to you and drifts; rims glow
const __fwIri = () =>
  __fwShader(
    `vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(n, v)), 2.0);
vec3 col = fwHue(dot(n, vec3(0.3, 0.8, 0.5)) * 0.8 + fr * 1.2 + uT * 0.12 + vP.y * 0.3);
gl_FragColor = vec4(col * (0.45 + 0.9 * fr) + pow(fr, 4.0) * 1.4, 1.0);`,
  );
// the gate home: a rainbow spiral turning into a bright heart
const __fwGatePortal = () =>
  __fwShader(
    `vec2 p = vUv * 2.0 - 1.0; p.x *= 0.62; float r = length(p); float a = atan(p.y, p.x);
float sw = sin(a * 6.0 + 9.0 * log(r + 0.05) - uT * 3.0);
vec3 col = fwHue(r * 1.2 - uT * 0.25 + sw * 0.08) * (0.55 + 0.6 * sw) + (1.0 - smoothstep(0.0, 0.35, r)) * 1.6;
float edge = 1.0 - smoothstep(0.86, 1.0, max(abs(vUv.x * 2.0 - 1.0), abs(vUv.y * 2.0 - 1.0)));
gl_FragColor = vec4(col * edge, edge);`,
    { add: 1, side: 2 },
  );
// the fridge's window: the Kaleidoscope as seen from here (the render target, by screen position). It irises
// open from its centre behind a ring of rainbow fire; its edges ripple, split into colour and are fringed with
// rainbow; sparkles drift across it; until the first view is drawn it shows a spiral of colour
const __fwWindow = () =>
  __fwShader(
    `vec2 p = vUv * 2.0 - 1.0; float r = length(p * vec2(1.0, 0.62)); float a = atan(p.y, p.x);
float iris = uOpen * 1.3; float inI = smoothstep(iris, iris - 0.14, r);
vec2 e = vec2(min(vUv.x, 1.0 - vUv.x) * 1.4, min(vUv.y, 1.0 - vUv.y)); float ed = min(e.x, e.y);
float wob = 1.0 - smoothstep(0.0, 0.22, ed);
vec2 s = (gl_FragCoord.xy - uRect.xy) / uRect.zw, off = vec2(sin(vUv.y * 40.0 + uT * 3.0), cos(vUv.x * 34.0 - uT * 2.6)) * 0.006 * wob;
vec3 view = vec3(texture2D(uTex, s + off * 1.8).r, texture2D(uTex, s + off).g, texture2D(uTex, s + off * 0.3).b);
vec3 sw = fwHue(r * 1.4 - uT * 0.3 + 0.1 * sin(a * 5.0 - uT * 2.0)) * 1.1 + (1.0 - smoothstep(0.0, 0.5, r)) * 0.7;
vec3 col = mix(sw * 0.35, mix(sw, view, uHas), inI);
col += fwHue(r * 2.0 - uT * 0.6 + a * 0.3) * smoothstep(0.09, 0.0, abs(r - iris)) * 1.8 * (1.15 - uOpen);
col = mix(col, fwHue(ed * 4.0 - uT * 0.4 + vUv.y) * 1.8, (1.0 - smoothstep(0.0, 0.06, ed)) * 0.85);
vec2 g = floor(vUv * vec2(24.0, 36.0) + vec2(0.0, -uT * 2.0)); col += step(0.985, fwH(g)) * wob * 1.5;
gl_FragColor = vec4(col, 1.0);`,
    { decl: '\nuniform sampler2D uTex; uniform vec4 uRect; uniform float uHas;', u: { uTex: { value: null }, uRect: { value: new oi(0, 0, 1, 1) }, uHas: { value: 0 } } },
  );
// the Overlook's view: a panorama looked up by the direction from your eye (so it sits at infinity, like the sky)
const __fwVista = (map) =>
  __fwShader(
    `vec3 d = normalize(vW - cameraPosition); float u = 0.5 + atan(d.z, d.x) / 6.2831853 + uYaw; float v = 0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.14159265;
gl_FragColor = vec4(texture2D(uMap, vec2(u, v)).rgb * 1.05, 1.0);`,
    { side: 1, decl: '\nuniform sampler2D uMap; uniform float uYaw;', u: { uMap: { value: map }, uYaw: { value: 0 } } },
  );
// floating things turn and bob (instanced: by instance number), lit glows by instance colour
function __fwFloatMat(base, glow) {
  const u = { uT: { value: 0 } },
    m = glow ? new Gw({ color: '#000000', roughness: 0.4 }) : base;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev && prev.call(m, sh, r);
    Object.assign(sh.uniforms, u);
    const rot = `uniform float uT;
float fwA(){ float ph = float(gl_InstanceID) * 1.37; return uT * (0.3 + fract(ph * 0.173) * 0.5) + ph; }
vec3 fwR(vec3 v, float a){ return vec3(cos(a) * v.x + sin(a) * v.z, v.y, -sin(a) * v.x + cos(a) * v.z); }`;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + rot)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = fwR(objectNormal, fwA());')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = fwR(transformed, fwA()); transformed.y += sin(uT * 0.7 + float(gl_InstanceID) * 2.1) * 0.35;');
    glow && (sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * 2.4;'));
  };
  const k0 = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.customProgramCacheKey = () => k0 + '|fw-float' + (glow ? 'g' : '');
  m.__u = u;
  m.needsUpdate = !0;
  return __flOwn(m);
}
// sparkles (twinkling, drifting, mostly rising) in a box
function __fwSnow(n, box, o) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) p[i] = Math.random();
  const geo = new uw();
  geo.setAttribute('position', new gi(p, 3));
  geo.boundingSphere = new DB(new U((box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2), 60);
  const u = { uT: { value: 0 }, uB0: { value: new U(box[0], box[1], box[2]) }, uB1: { value: new U(box[3], box[4], box[5]) } },
    mat = __flOwn(new Dd({ color: o.color, size: o.size, map: bY(), transparent: !0, opacity: 0.95, depthWrite: !1, blending: o.add ? 2 : 1, fog: !1 }));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform vec3 uB0; uniform vec3 uB1; varying float vTw;').replace(
      '#include <begin_vertex>',
      `vec3 r = position; vec3 S = uB1 - uB0; float up = step(${(1 - o.rise).toFixed(2)}, fract(r.x * 7.31 + r.z * 3.7));
      float sp = ${o.speed.toFixed(2)} * (0.6 + r.z * 0.8);
      float yy = mod(r.y * S.y + (up > 0.5 ? uT * sp * 0.6 : -uT * sp), S.y);
      float sw = ${(o.sway ?? 0.6).toFixed(2)};
      vec3 transformed = uB0 + vec3(r.x * S.x + sin(uT * 0.5 + r.y * 30.0) * sw, yy, r.z * S.z + cos(uT * 0.4 + r.x * 25.0) * sw);
      vTw = 0.55 + 0.45 * sin(uT * (2.0 + r.y * 3.0) + r.x * 40.0);`,
    );
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTw;').replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor.a *= vTw;\n#include <premultiplied_alpha_fragment>');
  };
  mat.customProgramCacheKey = () => 'fw-snow-' + o.rise + o.speed + (o.sway ?? 0.6) + (o.add ? 'a' : 'n');
  const pts = new MZ(geo, mat);
  pts.frustumCulled = !1;
  pts.name = 'frost_fw_particles';
  return { pts, u };
}

// ---------------------------------------------------------------- drawing: the fridge
// A pro-style French-door fridge, 90 cm wide, 1.85 m tall: brushed stainless (a real grain running up the doors,
// reflecting the room) with rounded edges, long polished bar handles on standoffs, a black glass display that
// reads the temperature (and, once opened, an infinity sign in shifting colour), a freezer drawer with its own
// bar, a kick-plate grille, and a lit edge round the opening. Inside each door: a white liner with three clear
// door bins of bottles, their rims lit. Opened, the doors swing out on a spring (a touch past and back), cold
// mist spills out and rolls down to the floor, coloured sparkles drift out of the window, the light on the
// kitchen shifts through the spectrum, and the window irises open from its centre.
const __fwBrushed = () =>
  __fhCanvas('fw-brushed', 256, 256, (g, S) => {
    g.fillStyle = '#b8bcc2';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * S,
        v = 150 + Math.random() * 90;
      g.fillStyle = `rgba(${v},${v + 3},${v + 7},${0.08 + Math.random() * 0.18})`;
      g.fillRect(x, 0, 0.6 + Math.random() * 1.4, S);
    }
  });
const __fwDisplay = (on) =>
  __fhCanvas(on ? 'fw-disp-on' : 'fw-disp', 256, 128, (g, W, H) => {
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (on) {
      const gr = g.createLinearGradient(40, 0, 216, 0);
      ['#ff4fd8', '#ffb84f', '#f4ff4f', '#4fff9a', '#4fd8ff', '#8a4fff'].forEach((c, i) => gr.addColorStop(i / 5, c));
      g.fillStyle = gr;
      g.font = 'bold 92px sans-serif';
      g.fillText('∞', W / 2, H / 2 + 4);
    } else {
      g.fillStyle = '#7fd4ff';
      g.font = 'bold 64px sans-serif';
      g.fillText('37°', W / 2 - 18, H / 2 + 2);
      g.font = 'bold 26px sans-serif';
      g.fillText('F', W / 2 + 62, H / 2 - 14);
      g.fillStyle = 'rgba(127,212,255,0.55)';
      g.fillRect(30, H - 22, W - 60, 4);
    }
  });
function __fwFridge(root, ticks) {
  const H = root.__fhGroups && root.__fhGroups.house;
  if (!H) return null;
  const M = __fhMats(),
    { x0, x1, z, y, h } = __FW_FR,
    steel = __fhIn(new ri({ map: __fwBrushed(), color: '#ffffff', metalness: 1, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.18, vertexColors: !0 }), { tile: 0.45, env: 0.95 }),
    chrome = __fhIn(new Gw({ color: '#ffffff', metalness: 1, roughness: 0.07, vertexColors: !0 }), { env: 1.3 }),
    liner = __fhIn(new ri({ color: '#ffffff', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1, vertexColors: !0 }), { fill: [0.3, 0.3, 0.32] }),
    acrylic = __flOwn(new ri({ color: '#e6f6ff', roughness: 0.05, transparent: !0, opacity: 0.28, depthWrite: !1, clearcoat: 1 })),
    dispOff = __fwDisplay(!1),
    dispOn = __fwDisplay(!0),
    dispMat = __flOwn(new Ni({ map: dispOff, toneMapped: !1 })),
    B = __flMB(),
    Bc = __flMB(),
    G = __flMB(),
    SS = [1, 1, 1],
    SD = [0.72, 0.73, 0.76],
    DK = [0.035, 0.035, 0.04],
    zb = 19.2,
    mesh = (geo, mat, name, cast) => {
      const o = new Ow(geo, mat);
      o.name = name;
      o.castShadow = !!cast;
      return o;
    };
  // the cabinet: sides, top, back, rounded front corners, the freezer drawer and its bar, a kick-plate grille
  __fhBox(B, x0, y, zb, x0 + 0.03, y + h, z, SS);
  __fhBox(B, x1 - 0.03, y, zb, x1, y + h, z, SS);
  __fhBox(B, x0, y + h - 0.03, zb, x1, y + h, z, SS);
  for (const x of [x0 + 0.018, x1 - 0.018]) __fhCyl(B, [x, y + 0.08, z - 0.012], [x, y + h - 0.01, z - 0.012], 0.019, SS);
  __fhBox(B, x0 + 0.01, y + 0.08, zb, x1 - 0.01, y + 0.62, z + 0.05, SS);
  __fhBox(B, x0 + 0.03, y + 0.6, z + 0.03, x1 - 0.03, y + 0.615, z + 0.052, DK);
  __fhCyl(Bc, [x0 + 0.12, y + 0.5, z + 0.1], [x1 - 0.12, y + 0.5, z + 0.1], 0.013, SS);
  for (const x of [x0 + 0.13, x1 - 0.13]) __fhCyl(Bc, [x, y + 0.5, z + 0.05], [x, y + 0.5, z + 0.1], 0.009, SS);
  __fhBox(B, x0 + 0.01, y, zb, x1 - 0.01, y + 0.08, z + 0.02, DK);
  for (let x = x0 + 0.06; x < x1 - 0.05; x += 0.04) __fhBox(G, x, y + 0.025, z + 0.021, x + 0.022, y + 0.055, z + 0.023, [0.04, 0.05, 0.06]);
  // the black glass top band with a slim light and the opening's lit edge
  __fhBox(B, x0 + 0.03, y + h - 0.08, z - 0.01, x1 - 0.03, y + h - 0.03, z + 0.012, DK);
  __fhBox(G, x0 + 0.08, y + h - 0.058, z + 0.012, x1 - 0.08, y + h - 0.05, z + 0.015, [0.55, 0.8, 1.0]);
  const RB = [[1, 0.3, 0.8], [0.3, 0.9, 1], [1, 0.85, 0.3]];
  __fhBox(G, x0 + 0.03, y + 0.62, z - 0.01, x0 + 0.045, y + h - 0.08, z + 0.003, RB[0]);
  __fhBox(G, x1 - 0.045, y + 0.62, z - 0.01, x1 - 0.03, y + h - 0.08, z + 0.003, RB[1]);
  __fhBox(G, x0 + 0.03, y + h - 0.095, z - 0.01, x1 - 0.03, y + h - 0.08, z + 0.003, RB[2]);
  H.add(mesh(B.build(), steel, 'frost_fw_fridge', !0), mesh(Bc.build(), chrome, 'frost_fw_fridgechrome'), mesh(G.build(), M.glow, 'frost_fw_fridgeled'));
  // the doors: the left one hinged at the left edge, the right at the right
  const leafH = h - 0.7,
    leaf = (side) => {
      const piv = new ji(),
        D = __flMB(),
        Dc = __flMB(),
        Dl = __flMB(),
        Dg = __flMB(),
        Da = __flMB(),
        w = (x1 - x0) / 2 - 0.006,
        s = side < 0 ? 1 : -1, // the leaf runs +x from the left hinge, -x from the right one
        X = (a, b) => [Math.min(a * s, b * s), Math.max(a * s, b * s)];
      piv.position.set(side < 0 ? x0 + 0.003 : x1 - 0.003, y + 0.625, z + 0.005);
      let [a, b] = X(0.004, w);
      // the panel, a darker seam round its face, a rounded outer edge
      __fhBox(D, a, 0.004, 0.0, b, leafH, 0.055, SS);
      [a, b] = X(0.012, w - 0.008);
      __fhBox(D, a, 0.012, 0.055, b, leafH - 0.008, 0.058, SD);
      __fhCyl(D, [s * 0.012, 0.01, 0.03], [s * 0.012, leafH - 0.004, 0.03], 0.024, SS);
      // the bar handle on two standoffs, near the inner edge
      const hx = s * (w - 0.055);
      __fhCyl(Dc, [hx, 0.18, 0.115], [hx, leafH - 0.16, 0.115], 0.013, SS);
      for (const yy of [0.2, leafH - 0.18]) __fhCyl(Dc, [hx, yy, 0.055], [hx, yy, 0.115], 0.01, SS);
      // the liner inside the door, its three bins with lit rims, bottles in them
      [a, b] = X(0.02, w - 0.01);
      __fhBox(Dl, a, 0.02, -0.035, b, leafH - 0.02, 0.0, [0.96, 0.97, 0.98]);
      const BOT = [[0.95, 0.95, 0.92], [1.0, 0.55, 0.1], [0.2, 0.55, 0.25], [0.85, 0.15, 0.2], [0.7, 0.85, 1.0]];
      for (let k = 0; k < 3; k++) {
        const yy = 0.12 + k * 0.36;
        [a, b] = X(0.04, w - 0.03);
        __fhBox(Da, a, yy, -0.13, b, yy + 0.13, -0.035, [1, 1, 1]);
        __fhBox(Dg, a, yy + 0.125, -0.135, b, yy + 0.135, -0.13, [0.55, 0.8, 1.0]);
        for (let j = 0; j < 3; j++) {
          const bx = s * (0.09 + j * 0.12),
            c = BOT[(k * 3 + j + (side > 0 ? 2 : 0)) % BOT.length],
            tall = 0.2 + ((k + j) % 2) * 0.06;
          __fhCyl(Dl, [bx, yy + 0.01, -0.085], [bx, yy + tall, -0.085], 0.032, c);
          __fhCyl(Dl, [bx, yy + tall, -0.085], [bx, yy + tall + 0.05, -0.085], 0.013, c.map((q) => q * 0.8));
        }
      }
      // the display in the left door: black glass, the temperature
      let disp = null;
      if (side < 0) {
        disp = new Ow(new bB(0.2, 0.1), dispMat);
        disp.position.set(0.22, leafH - 0.32, 0.0595);
        disp.name = 'frost_fw_fridgedisplay';
        __fhBox(D, 0.11, leafH - 0.38, 0.055, 0.33, leafH - 0.26, 0.059, DK);
      }
      piv.add(mesh(D.build(), steel, 'frost_fw_fridgedoor', !0), mesh(Dc.build(), chrome, 'frost_fw_fridgedoor'), mesh(Dl.build(), liner, 'frost_fw_fridgedoor'), mesh(Dg.build(), M.glow, 'frost_fw_fridgedoor'), mesh(Da.build(), acrylic, 'frost_fw_fridgebins'));
      disp && piv.add(disp);
      H.add(piv);
      return piv;
    };
  const left = leaf(-1),
    right = leaf(1);
  // the window, and its colour spilling out
  const pm = __fwWindow(),
    portal = new Ow(new bB(x1 - x0 - 0.06, h - 0.71), pm);
  portal.position.set((x0 + x1) / 2, y + 0.62 + (h - 0.71) / 2 + 0.005, z - 0.005);
  portal.name = 'frost_fw_portal';
  portal.visible = !1;
  H.add(portal);
  const spill = new Cc(new Io({ map: bY(), color: '#e0a8ff', transparent: !0, opacity: 0, blending: 2, depthWrite: !1 }));
  spill.material.__flOwn = 1;
  spill.scale.set(2.2, 2.4, 1);
  spill.position.set((x0 + x1) / 2, y + 1.2, z + 0.3);
  spill.name = 'frost_fw_spill';
  H.add(spill);
  const lowQ = Zw.getState().quality === 'low',
    sp = __fwSnow(lowQ ? 50 : 120, [x0 + 0.05, y + 0.7, z - 0.05, x1 - 0.05, y + 1.8, z + 1.4], { color: '#ffd0ff', size: 0.045, speed: 0.4, rise: 0.7, add: 1 }),
    // cold mist: soft puffs pouring out over the drawer and rolling down and out across the floor
    mist = __fwSnow(lowQ ? 30 : 70, [x0 - 0.15, y + 0.02, z - 0.02, x1 + 0.15, y + 1.3, z + 1.1], { color: '#eef8ff', size: 0.34, speed: 0.22, rise: 0, sway: 0.3, add: 0 });
  sp.pts.visible = mist.pts.visible = !1;
  H.add(sp.pts, mist.pts);
  // the glow on the kitchen: a light that is always in the scene (its brightness follows the doors), so the
  // number of lights never changes (59-lights.js); kept on the map's root, which is always drawn
  const light = new PD('#d8b0ff', 0, 7, 2);
  light.position.set((x0 + x1) / 2, y + 1.3, z + 0.7);
  root.add(light);
  return { left, right, portal, pm, spill, sp, mist, light, dispMat, dispOff, dispOn };
}

// ---------------------------------------------------------------- drawing: the condo
// Poly Haven textures already in the game (the cinema's), tiled in world space by __fhIn
function __fwTex(n) {
  const t = new jd().load('./game/maps/cinema/tex/' + n + '.webp');
  t.wrapS = t.wrapT = 1e3;
  t.colorSpace = 'srgb';
  t.anisotropy = 8;
  return t;
}
// a room's four walls, less the doorways onto its neighbours: { ax, sd, P, rects: [[u0, y0, u1, y1]] } (u: x on
// a wall across z, z on a wall across x)
function __fwWalls(v) {
  const [x0, z0, x1, z1, y0, y1] = v.b,
    out = [];
  for (const [ax, sd] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]]) {
    const P = ax === 'x' ? (sd < 0 ? x0 : x1) : sd < 0 ? z0 : z1;
    let rects = [ax === 'x' ? [z0, y0, z1, y1] : [x0, y0, x1, y1]];
    for (const o of __FW_V) {
      if (!o.gap) continue;
      const b = o.b,
        lo = ax === 'x' ? b[0] : b[1],
        hi = ax === 'x' ? b[2] : b[3];
      if (!(lo < P + 0.45 && hi > P - 0.45)) continue;
      const hole = ax === 'x' ? [b[1], b[4], b[3], b[5]] : [b[0], b[4], b[2], b[5]];
      rects = rects.flatMap((r) => __fhSub2(r, hole));
    }
    out.push({ ax, sd, P, rects, top: y1 });
  }
  return out;
}
const __FWC = {
  gold: [1.0, 0.77, 0.36], goldD: [0.78, 0.56, 0.22], cream: __fhC('#e9dcc0'), ivory: __fhC('#f3ead8'), champ: __fhC('#e6d2b0'), white: [0.96, 0.95, 0.93], black: [0.02, 0.02, 0.025],
  onyx: [0.08, 0.07, 0.065], burg: __fhC('#6a1222'), burgD: __fhC('#3c0912'), navy: __fhC('#0a0f24'), red: __fhC('#9a1424'), slate: __fhC('#2c3036'), char: __fhC('#15171b'),
  warm: __fhC('#ffd49a'), seat: [1.2, 0.42, 0.42], seatD: [0.72, 0.22, 0.24], amber: [1.0, 0.6, 0.22], blush: __fhC('#e8c4bc'), lilac: __fhC('#d9c8f0'), brown: __fhC('#3a2416'), wood: [1, 1, 1],
};
function __fwWorld(root, models, ticks) {
  const F = __FW_Y.F,
    low = Zw.getState().quality === 'low',
    G = new ji(),
    C = __FWC,
    fill = [0.15, 0.115, 0.08],
    day = [0.36, 0.36, 0.38],
    cool = [0.12, 0.12, 0.14],
    T = { marble: __fwTex('marble_01_diff'), parq: __fwTex('herringbone_parquet_diff'), wool: __fwTex('poly_wool_herringbone_diff'), leather: __fwTex('leather_red_02_diff'), rose: __fwTex('rosewood_veneer1_diff'), jac: __fwTex('quatrefoil_jacquard_fabric_diff') },
    MAT = {
      marble: __fhIn(new ri({ map: T.marble, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, vertexColors: !0 }), { tile: 2.4, fill, env: 0.55 }),
      parquet: __fhIn(new Gw({ map: T.parq, roughness: 0.4, vertexColors: !0 }), { tile: 1.6, fill: day }),
      parquetIn: __fhIn(new Gw({ map: T.parq, roughness: 0.4, vertexColors: !0 }), { tile: 1.6, fill }),
      carpet: __fhIn(new Gw({ map: T.wool, roughness: 0.95, vertexColors: !0 }), { tile: 0.9, fill, env: 0.05 }),
      leather: __fhIn(new ri({ map: T.leather, roughness: 0.5, clearcoat: 0.12, vertexColors: !0 }), { tile: 0.7, fill: [0.2, 0.1, 0.08], env: 0.08 }),
      rose: __fhIn(new ri({ map: T.rose, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, vertexColors: !0 }), { tile: 1.4, fill }),
      jac: __fhIn(new Gw({ map: T.jac, roughness: 0.8, vertexColors: !0 }), { tile: 0.8, fill }),
      paint: __fhIn(new ri({ color: '#ffffff', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, vertexColors: !0 }), { fill }),
      paintDay: __fhIn(new ri({ color: '#ffffff', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4, vertexColors: !0 }), { fill: day }),
      epoxy: __fhIn(new ri({ color: '#ffffff', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, vertexColors: !0 }), { fill: cool, env: 0.7 }),
      gold: __fhIn(new Gw({ color: '#ffffff', metalness: 1, roughness: 0.2, vertexColors: !0 }), { fill, env: 1.1 }),
      chrome: __fhIn(new Gw({ color: '#ffffff', metalness: 1, roughness: 0.05, vertexColors: !0 }), { fill, env: 1.3 }),
      velvet: __fhIn(new ri({ color: '#ffffff', roughness: 0.9, sheen: 1, sheenRoughness: 0.35, sheenColor: '#ffb4bc', vertexColors: !0 }), { fill }),
      cloth: __fhIn(new Gw({ color: '#ffffff', roughness: 0.92, vertexColors: !0 }), { fill }),
      lacquer: __fhIn(new ri({ color: '#ffffff', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03, vertexColors: !0 }), { fill, env: 0.6 }),
      glow: __fhGlowMat(2.6),
      soft: __fhGlowMat(1.2),
      art: __fhMats().art,
      glass: __flOwn(new ri({ color: '#e4f0ff', roughness: 0.03, metalness: 0, transparent: !0, opacity: 0.08, depthWrite: !1, clearcoat: 1, envMapIntensity: 0.8 })),
      sheer: __flOwn(new Gw({ color: '#fff4e2', roughness: 1, transparent: !0, opacity: 0.32, side: 2, depthWrite: !1 })),
    },
    BK = {},
    Bk = (m) => BK[m] || (BK[m] = __flMB()),
    bx = (m, x0, y0, z0, x1, y1, z1, col, ry = 0) => __fhBox(Bk(m), x0, y0, z0, x1, y1, z1, col, ry),
    cy = (m, a, b, r, col, unit) => __fhCyl(Bk(m), a, b, r, col, unit),
    sp = (m, x, y, z, r, col, unit = 'sph') => __fhSph(Bk(m), x, y, z, r, col, unit),
    tube = (m, pts, r, col) => {
      const t = __xmTube(pts, r, 6, 1);
      Bk(m).add(t, new _A(), col);
      t.dispose();
    },
    ring = (m, x, y, z, R, r, col, n = 48) => tube(m, Array.from({ length: n + 1 }, (_, k) => [x + Math.cos((k / n) * 6.2832) * R, y, z + Math.sin((k / n) * 6.2832) * R]), r, col),
    Kt = { B: (g, m) => Bk(m === 'metal' ? 'gold' : m) },
    // a box on a wall face: u along it, y up, d0..d1 out from the wall into the room
    wb = (f, m, u0, y0, u1, y1, d0, d1, col) => (f.ax === 'z' ? bx(m, u0, y0, f.P - f.sd * d0, u1, y1, f.P - f.sd * d1, col) : bx(m, f.P - f.sd * d0, y0, u0, f.P - f.sd * d1, y1, u1, col)),
    // the way a wall faces (for pictures on it)
    fry = (f) => (f.ax === 'z' ? (f.sd < 0 ? 0 : Math.PI) : f.sd < 0 ? Math.PI / 2 : -Math.PI / 2),
    fpt = (f, u, y, d) => (f.ax === 'z' ? [u, y, f.P - f.sd * d] : [f.P - f.sd * d, y, u]),
    V = Object.fromEntries(__FW_V.map((v) => [v.id, v]));
  G.name = 'fw_world';
  G.visible = !1;
  root.add(G);
  // the Poly Haven models, instanced
  const mdl = {},
    inst = {};
  for (const k of ['sofa', 'arm', 'coffee', 'side', 'console', 'plant', 'bust', 'vase', 'mirror', 'chandelier', 'fwCar', 'fwShelf', 'fwCart', 'fwLounge', 'fwStool']) mdl[k] = __fhModel(models, k);
  const place = (k, x, y, z, ry, want) => {
    const m = mdl[k];
    if (!m) return !1;
    (inst[k] || (inst[k] = [])).push([x, y, z, m.s * (want ? want / __FH_MODELS[k][1] : 1), ry]);
    return !0;
  };
  const mH = (k, want) => (mdl[k] ? mdl[k].size.y * mdl[k].s * (want ? want / __FH_MODELS[k][1] : 1) : 0);
  // a doorway's threshold, reveals and casing on both sides
  const doorway = (g, mat, col, trim) => {
    const [x0, z0, x1, z1, y0, y1] = g.b,
      X = x1 - x0 < z1 - z0; // the doorway goes through a wall across x
    bx('marble', x0, y0 - 0.05, z0, x1, y0 + 0.004, z1, C.onyx);
    if (X) {
      bx(mat, x0, y0, z0, x1, y1, z0 + 0.04, col);
      bx(mat, x0, y0, z1 - 0.04, x1, y1, z1, col);
      bx(mat, x0, y1 - 0.04, z0, x1, y1, z1, col);
      for (const x of [x0 - 0.05, x1 + 0.05]) {
        bx(trim, x - 0.03, y0, z0 - 0.14, x + 0.03, y1 + 0.14, z0, C.gold);
        bx(trim, x - 0.03, y0, z1, x + 0.03, y1 + 0.14, z1 + 0.14, C.gold);
        bx(trim, x - 0.03, y1, z0 - 0.14, x + 0.03, y1 + 0.14, z1 + 0.14, C.gold);
      }
    } else {
      bx(mat, x0, y0, z0, x0 + 0.04, y1, z1, col);
      bx(mat, x1 - 0.04, y0, z0, x1, y1, z1, col);
      bx(mat, x0, y1 - 0.04, z0, x1, y1, z1, col);
      for (const z of [z0 - 0.05, z1 + 0.05]) {
        bx(trim, x0 - 0.14, y0, z - 0.03, x0, y1 + 0.14, z + 0.03, C.gold);
        bx(trim, x1, y0, z - 0.03, x1 + 0.14, y1 + 0.14, z + 0.03, C.gold);
        bx(trim, x0 - 0.14, y1, z - 0.03, x1 + 0.14, y1 + 0.14, z + 0.03, C.gold);
      }
    }
  };
  for (const g of __FW_V) g.gap && doorway(g, 'paint', C.ivory, 'gold');
  // the kit the wings draw with (65c-frostline-condo-wing.js): the same buckets, materials and helpers
  const K = { F, low, G, C, MAT, Bk, bx, cy, sp, tube, ring, wb, fry, fpt, place, mH, Kt, V, ticks, models, fill, day, cool, mat: (n, m) => (MAT[n] = m) };

  // ================================================================ the Grand Salon
  {
    const v = V.GS,
      [x0, z0, x1, z1, , top] = v.b;
    // floor: polished marble, a dark marble border between gold lines, a medallion of rings and a star
    bx('marble', x0, F - 0.05, z0, x1, F, z1, C.white);
    for (const [a0, b0, a1, b1] of [[x0 + 0.6, z0 + 0.6, x1 - 0.6, z0 + 1.1], [x0 + 0.6, z1 - 1.1, x1 - 0.6, z1 - 0.6], [x0 + 0.6, z0 + 1.1, x0 + 1.1, z1 - 1.1], [x1 - 1.1, z0 + 1.1, x1 - 0.6, z1 - 1.1]]) bx('marble', a0, F, b0, a1, F + 0.003, b1, C.onyx);
    for (const d of [0.56, 1.14]) {
      bx('gold', x0 + d, F, z0 + d, x1 - d, F + 0.005, z0 + d + 0.04, C.gold);
      bx('gold', x0 + d, F, z1 - d - 0.04, x1 - d, F + 0.005, z1 - d, C.gold);
      bx('gold', x0 + d, F, z0 + d, x0 + d + 0.04, F + 0.005, z1 - d, C.gold);
      bx('gold', x1 - d - 0.04, F, z0 + d, x1 - d, F + 0.005, z1 - d, C.gold);
    }
    const mx = 100,
      mz = 92.8;
    Bk('marble').add(__flUnit('cyl'), __flM(mx, F + 0.0015, mz, 2.5, 0.003, 2.5), C.onyx);
    for (const R of [2.5, 2.2, 1.2, 0.5]) ring('gold', mx, F + 0.004, mz, R, 0.025, C.gold, 64);
    for (let k = 0; k < 8; k++) bx('gold', mx - 0.06, F + 0.002, mz - 2.1, mx + 0.06, F + 0.006, mz + 2.1, k % 2 ? C.goldD : C.gold, (k * Math.PI) / 8);
    // walls: cream; a dado of raised panels under a gilt chair rail and gilt skirting; pilasters with gilt
    // capitals and gilt-framed panels between them; a gilt and cream crown
    const W = __fwWalls(v);
    for (const f of W)
      for (const r of f.rects) {
        const [u0, y0, u1, y1] = r;
        wb(f, 'paint', u0, y0, u1, y1, 0, 0.02, C.cream);
        if (y0 <= F + 0.01) {
          wb(f, 'gold', u0, F, u1, F + 0.18, 0.02, 0.07, C.gold);
          wb(f, 'paint', u0, F + 0.18, u1, Math.min(y1, F + 1.05), 0.02, 0.05, C.ivory);
          y1 > F + 1.13 && wb(f, 'gold', u0, F + 1.05, u1, F + 1.13, 0.02, 0.08, C.gold);
        }
        if (y1 >= top - 0.01) {
          wb(f, 'gold', u0, top - 0.42, u1, top - 0.3, 0.02, 0.14, C.gold);
          wb(f, 'paint', u0, top - 0.3, u1, top, 0.02, 0.22, C.ivory);
        }
        if (y0 <= F + 0.01 && y1 >= top - 0.01 && u1 - u0 > 1.4) {
          const n = Math.max(1, Math.round((u1 - u0) / 3.2)),
            st = (u1 - u0) / n;
          for (let i = 0; i <= n; i++) {
            const u = Math.min(u1 - 0.3, Math.max(u0 + 0.3, u0 + i * st));
            wb(f, 'paint', u - 0.25, F + 1.13, u + 0.25, top - 0.42, 0.02, 0.1, C.ivory);
            wb(f, 'gold', u - 0.3, top - 0.8, u + 0.3, top - 0.42, 0.02, 0.14, C.gold);
            wb(f, 'gold', u - 0.29, F + 1.13, u + 0.29, F + 1.32, 0.02, 0.12, C.gold);
            if (i < n) {
              const a = u + 0.55,
                b = Math.min(u1 - 0.3, u0 + (i + 1) * st) - 0.55,
                lo = F + 1.75,
                hi = top - 1.25;
              if (b - a > 0.6)
                for (const [p0, q0, p1, q1] of [[a, lo, b, lo + 0.05], [a, hi - 0.05, b, hi], [a, lo, a + 0.05, hi], [b - 0.05, lo, b, hi]]) wb(f, 'gold', p0, q0, p1, q1, 0.02, 0.05, C.gold);
            }
          }
        }
      }
    // ceiling: cream, gilt coffers, a glowing oval of warm light in the centre in a gilt frame
    bx('paint', x0, top, z0, x1, top + 0.05, z1, C.ivory);
    for (let x = x0 + 3; x < x1 - 0.5; x += 3) bx('gold', x - 0.11, top - 0.3, z0, x + 0.11, top, z1, C.gold);
    for (let z = z0 + 2.93; z < z1 - 0.5; z += 2.93) bx('gold', x0, top - 0.3, z - 0.11, x1, top, z + 0.11, C.gold);
    Bk('soft').add(__flUnit('cyl'), __flM(mx, top - 0.02, mz, 2.9, 0.02, 2.0), [0.95, 0.78, 0.52]);
    tube('gold', Array.from({ length: 65 }, (_, k) => [mx + Math.cos((k / 64) * 6.2832) * 3.0, top - 0.06, mz + Math.sin((k / 64) * 6.2832) * 2.1]), 0.07, C.gold);
    // chandeliers: a great one in the centre, two smaller
    for (const [x, z, s] of [[mx, mz, 2.6], [93.6, mz, 1.6], [106.4, mz, 1.6]]) {
      const h = mH('chandelier', s),
        y = top - 0.7 - h;
      if (place('chandelier', x, y, z, 0, s)) cy('gold', [x, top, z], [x, y + h - 0.02, z], 0.015, C.gold, 'cyl6');
      else for (let k = 0; k < 10; k++) sp('glow', x + Math.cos(k * 0.628) * 0.5 * s, top - 1.4, z + Math.sin(k * 0.628) * 0.5 * s, 0.05, C.warm, 'sph6');
      cy('gold', [x, top - 0.01, z], [x, top - 0.08, z], 0.2 * s, C.gold);
    }
    // a rug under each seating group
    __fhPic(Bk('art'), __FH_ART.rug, 1024, 512, 91.6, F + 0.006, mz, 4.6, 3.8, Math.PI / 2, 1);
    __fhPic(Bk('art'), __FH_ART.rug, 1024, 512, 106.2, F + 0.006, mz, 4.8, 4.4, 0, 1);
    // paintings in gilt frames: over the console between the cinema's doors, either side of the arch
    __fhPainting(Kt, 'w', 'alps', 100, F + 3.7, z0 + 0.03, 0, 3.4, 2.1);
    __fhPainting(Kt, 'w', 'aurora', 92.3, F + 3.4, z1 - 0.03, Math.PI, 2.2, 1.5);
    __fhPainting(Kt, 'w', 'ship', 107.7, F + 3.4, z1 - 0.03, Math.PI, 2.2, 1.5);
    __fhPainting(Kt, 'w', 'alps', x1 - 0.03, F + 3.4, 99.0, -Math.PI / 2, 1.6, 1.1);
  }

  // ================================================================ the Home Cinema
  {
    const v = V.HT,
      [x0, z0, x1, z1, , top] = v.b;
    bx('carpet', x0, F - 0.05, z0, x1, F, z1, [0.62, 0.13, 0.17]);
    const W = __fwWalls(v);
    for (const f of W)
      for (const r of f.rects) {
        const [u0, y0, u1, y1] = r,
          screen = f.ax === 'z' && f.sd < 0;
        if (screen) {
          wb(f, 'paint', u0, y0, u1, y1, 0, 0.015, C.black);
          continue;
        }
        wb(f, 'velvet', u0, y0, u1, y1, 0, 0.02, C.burg);
        if (y0 <= F + 0.01) {
          wb(f, 'rose', u0, F, u1, Math.min(y1, F + 1.0), 0.02, 0.06, C.wood);
          y1 > F + 1.06 && wb(f, 'gold', u0, F + 1.0, u1, F + 1.06, 0.02, 0.08, C.gold);
        }
        y1 >= top - 0.01 && wb(f, 'gold', u0, top - 0.2, u1, top, 0.02, 0.1, C.gold);
        if (y0 <= F + 0.01 && y1 >= top - 0.01)
          for (let u = u0 + 0.8; u < u1 - 0.4; u += 1.6) {
            wb(f, 'gold', u - 0.02, F + 1.06, u + 0.02, top - 0.2, 0.02, 0.05, C.gold);
            // a sconce on every other strip of the side walls
            if (f.ax === 'x' && Math.round((u - u0 - 0.8) / 1.6) % 2 === 0) {
              wb(f, 'gold', u - 0.16, F + 2.9, u + 0.16, F + 3.5, 0.02, 0.06, C.gold);
              wb(f, 'glow', u - 0.12, F + 3.0, u + 0.12, F + 3.4, 0.06, 0.16, C.amber);
            }
          }
      }
    // the starlit ceiling (fibre-optic stars, twinkling) on deep navy
    bx('paint', x0, top, z0, x1, top + 0.05, z1, C.navy);
    const st = __fwSnow(low ? 260 : 700, [x0 + 0.2, top - 0.04, z0 + 0.2, x1 - 0.2, top - 0.02, z1 - 0.2], { color: '#fff4e0', size: 0.045, speed: 0, rise: 0, sway: 0, add: 1 });
    G.add(st.pts);
    ticks.push((dt) => (st.u.uT.value += Math.min(dt, 0.1)));
    // the screen's gilt frame, the curtains and a valance
    const sx0 = 95.8,
      sx1 = 104.2,
      sy0 = F + 1.487,
      sy1 = F + 6.212;
    for (const [a, b, c, d] of [[sx0 - 0.08, sy0 - 0.08, sx1 + 0.08, sy0], [sx0 - 0.08, sy1, sx1 + 0.08, sy1 + 0.08], [sx0 - 0.08, sy0, sx0, sy1], [sx1, sy0, sx1 + 0.08, sy1]]) bx('gold', a, b, z0, c, d, z0 + 0.1, C.gold);
    for (const [a, b] of [[x0 + 0.6, sx0 - 0.25], [sx1 + 0.25, x1 - 0.6]])
      for (let x = a, k = 0; x < b; x += 0.19, k++) cy('velvet', [x, F, z0 + 0.32 + (k % 2) * 0.08], [x, top - 0.1, z0 + 0.32 + (k % 2) * 0.08], 0.12, k % 2 ? C.red : C.burg);
    bx('velvet', x0, top - 0.32, z0 + 0.05, x1, top, z0 + 0.62, C.red);
    bx('gold', x0, top - 0.36, z0 + 0.6, x1, top - 0.3, z0 + 0.66, C.gold);
    // step lights along both aisles
    for (let z = z0 + 2; z < z1 - 0.5; z += 1.2) for (const x of [95.9, 104.1]) bx('glow', x - 0.05, F, z - 0.03, x + 0.05, F + 0.025, z + 0.03, C.amber);
  }

  // ================================================================ the Overlook
  {
    const v = V.OV,
      [x0, z0, x1, z1, , top] = v.b;
    bx('parquet', x0, F - 0.05, z0, x1, F, z1, C.wood);
    const W = __fwWalls(v);
    for (const f of W) {
      if (f.ax === 'x' && f.sd > 0) continue; // the glass wall
      for (const r of f.rects) {
        const [u0, y0, u1, y1] = r;
        wb(f, 'paintDay', u0, y0, u1, y1, 0, 0.02, C.ivory);
        y0 <= F + 0.01 && wb(f, 'gold', u0, F, u1, F + 0.12, 0.02, 0.05, C.gold);
        y1 >= top - 0.01 && wb(f, 'gold', u0, top - 0.1, u1, top, 0.02, 0.06, C.gold);
      }
    }
    bx('paintDay', x0, top, z0, x1, top + 0.05, z1, C.ivory);
    for (let z = z0 + 1.2; z < z1; z += 2.4) bx('rose', x0, top - 0.32, z - 0.14, x1, top, z + 0.14, C.wood);
    // the glass wall: panes between gilt mullions, a sill and a transom
    const gx = x1 - 0.02;
    bx('glass', gx - 0.01, F, z0, gx, top, z1, [1, 1, 1]);
    for (let z = z0; z <= z1 + 1e-3; z += (z1 - z0) / 10) bx('gold', gx - 0.12, F, z - 0.045, gx + 0.02, top, z + 0.045, C.gold);
    for (const [y, h] of [[F, 0.14], [F + 4.15, 0.08], [top - 0.1, 0.1]]) bx('gold', gx - 0.14, y, z0, gx + 0.02, y + h, z1, C.gold);
    // the view: a panorama looked up by direction (so it sits at infinity), painted on the inside of a box that
    // stands wholly outside the glass (nothing else is out there, so it is only ever seen through it)
    const vt = new jd().load(__FL.base + 'condo-view.webp');
    vt.colorSpace = 'srgb';
    vt.anisotropy = 8;
    const vm = __fwVista(vt),
      dome = new Ow(new _i(1, 1, 1), vm);
    dome.material.__flTex = vt;
    dome.position.set(x1 + 15.1, F, (z0 + z1) / 2);
    dome.scale.set(30, 22, 80);
    dome.renderOrder = 2;
    dome.name = 'frost_fw_view';
    G.add(dome);
  }

  // ================================================================ the Master Suite
  {
    const v = V.MS,
      [x0, z0, x1, z1, , top] = v.b;
    bx('parquetIn', x0, F - 0.05, z0, x1, F, z1, C.wood);
    const W = __fwWalls(v);
    for (const f of W)
      for (const r of f.rects) {
        const [u0, y0, u1, y1] = r;
        wb(f, 'jac', u0, y0, u1, y1, 0, 0.02, C.champ);
        y0 <= F + 0.01 && wb(f, 'gold', u0, F, u1, F + 0.16, 0.02, 0.06, C.gold);
        y1 >= top - 0.01 && wb(f, 'gold', u0, top - 0.24, u1, top, 0.02, 0.12, C.gold);
        if (y0 <= F + 0.01 && y1 >= top - 0.01)
          for (let u = u0 + 1.5; u < u1 - 0.5; u += 3) wb(f, 'gold', u - 0.03, F + 0.16, u + 0.03, top - 0.24, 0.02, 0.05, C.gold);
      }
    // a tray ceiling: a recess with a warm cove light round it
    bx('paint', x0, top, z0, x1, top + 0.05, z1, C.ivory);
    bx('paint', x0, top - 0.3, z0, x1, top, z0 + 1.0, C.ivory);
    bx('paint', x0, top - 0.3, z1 - 1.0, x1, top, z1, C.ivory);
    bx('paint', x0, top - 0.3, z0 + 1.0, x0 + 1.0, top, z1 - 1.0, C.ivory);
    bx('paint', x1 - 1.0, top - 0.3, z0 + 1.0, x1, top, z1 - 1.0, C.ivory);
    for (const [a, b, c, d] of [[x0 + 1.0, z0 + 1.0, x1 - 1.0, z0 + 1.06], [x0 + 1.0, z1 - 1.06, x1 - 1.0, z1 - 1.0], [x0 + 1.0, z0 + 1.0, x0 + 1.06, z1 - 1.0], [x1 - 1.06, z0 + 1.0, x1 - 1.0, z1 - 1.0]]) bx('glow', a, top - 0.31, b, c, top - 0.29, d, C.warm);
    const h = mH('chandelier', 1.1);
    place('chandelier', 83.3, top - 0.4 - h, 93.5, 0, 1.1) && cy('gold', [83.3, top, 93.5], [83.3, top - 0.42, 93.5], 0.012, C.gold, 'cyl6');
    __fhPic(Bk('art'), __FH_ART.rug, 1024, 512, 82.0, F + 0.006, 93.5, 3.2, 3.6, Math.PI / 2, 1);
    __fhPainting(Kt, 'w', 'aurora', x0 + 0.03, F + 3.2, 93.5, Math.PI / 2, 1.6, 0.9);
  }

  // ================================================================ the Private Garage
  {
    const v = V.GA,
      [x0, z0, x1, z1, , top] = v.b;
    bx('epoxy', x0, F - 0.05, z0, x1, F, z1, C.char);
    // the bays' lines, a gold one down the middle of each
    for (const x of [83.45, 87.15]) bx('epoxy', x - 0.04, F, 70.8, x + 0.04, F + 0.003, 77.6, [0.85, 0.85, 0.85]);
    const W = __fwWalls(v);
    for (const f of W)
      for (const r of f.rects) {
        const [u0, y0, u1, y1] = r;
        wb(f, 'paint', u0, y0, u1, y1, 0, 0.02, C.slate);
        y0 <= F + 0.01 && wb(f, 'chrome', u0, F, u1, F + 0.15, 0.02, 0.04, [0.6, 0.6, 0.62]);
        // vertical LED strips on the side walls
        if (f.ax === 'x' && y0 <= F + 0.01) for (let u = u0 + 1.0; u < u1 - 0.5; u += 2.2) wb(f, 'glow', u - 0.025, F + 0.3, u + 0.025, top - 0.3, 0.02, 0.04, [0.75, 0.85, 1.0]);
      }
    bx('paint', x0, top, z0, x1, top + 0.05, z1, C.char);
    // the roller door (north wall)
    for (let y = F + 0.02, k = 0; y < F + 3.4; y += 0.12, k++) bx('chrome', 80.8, y, z0 + 0.02, 89.8, y + 0.1, z0 + 0.08, k % 2 ? [0.55, 0.56, 0.58] : [0.62, 0.63, 0.66]);
    bx('gold', 80.6, F, z0 + 0.02, 80.8, F + 3.6, z0 + 0.14, C.gold);
    bx('gold', 89.8, F, z0 + 0.02, 90.0, F + 3.6, z0 + 0.14, C.gold);
    bx('gold', 80.6, F + 3.4, z0 + 0.02, 90.0, F + 3.6, z0 + 0.14, C.gold);
    // the hexagon LED ceiling over the cars
    const hr = 0.85,
      hv = [];
    for (let k = 0; k < 6; k++) hv.push([Math.cos((k / 6) * 6.2832) * hr, Math.sin((k / 6) * 6.2832) * hr]);
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 7; i++) {
        const cx = 80.4 + i * hr * 1.5,
          cz = 69.0 + j * hr * 1.732 + (i % 2 ? hr * 0.866 : 0);
        if (cx > x1 - 0.6 || cz > z1 - 1.2) continue;
        for (let k = 0; k < 6; k++) {
          const a = hv[k],
            b = hv[(k + 1) % 6];
          cy('glow', [cx + a[0], top - 0.06, cz + a[1]], [cx + b[0], top - 0.06, cz + b[1]], 0.022, [0.9, 0.95, 1.0], 'cyl6');
        }
      }
    // the turntable under the middle car
    Bk('chrome').add(__flUnit('cyl'), __flM(85.3, F + 0.012, 74.2, 2.9, 0.024, 2.9), [0.3, 0.3, 0.32]);
    ring('glow', 85.3, F + 0.026, 74.2, 2.92, 0.025, C.gold, 72);
    // an emblem over the door to the salon: a gilt diamond on a lit panel
    bx('soft', 88.8, F + 3.2, z1 - 0.06, 90.8, F + 3.9, z1 - 0.03, [0.9, 0.7, 0.4]);
    Bk('gold').add(__flUnit('box'), __flM(89.8, F + 3.55, z1 - 0.08, 0.42, 0.42, 0.04, 0, 0, Math.PI / 4), C.gold);
  }

  // ================================================================ the Kaleidoscope
  const gate = new ji();
  gate.name = 'fw_gate';
  G.add(gate);
  {
    const v = V.PV,
      [x0, z0, x1, z1, , top] = v.b,
      hi = Zw.getState().quality === 'high',
      // the doorways cut out of the vault: every gap that opens onto this room (reaching 0.9 m into the room along
      // its depth, so the curved wall is cut wherever it passes)
      gaps = __FW_V.filter((g) => g.gap && g.b[0] < x1 + 0.5 && g.b[2] > x0 - 0.5 && g.b[1] < z1 + 0.5 && g.b[3] > z0 - 0.5).slice(0, 4),
      holes = [0, 1, 2, 3].map((i) => {
        const g = gaps[i];
        if (!g) return new oi(0, 0, 0, 0);
        const thinX = g.b[2] - g.b[0] < g.b[3] - g.b[1];
        return new oi(g.b[0] - (thinX ? 0.9 : 0.02), g.b[1] - (thinX ? 0.02 : 0.9), g.b[2] + (thinX ? 0.9 : 0.02), g.b[3] + (thinX ? 0.02 : 0.9));
      }),
      tops = [0, 1, 2, 3].map((i) => (gaps[i] ? gaps[i].b[5] : -99)),
      vm = __fwVaultMat(holes, tops),
      vault = new Ow(__fwVaultGeo(100, 109, 10, 7, F, top, low ? 72 : 144, low ? 20 : 36), vm),
      fm = __fwTripFloor(),
      floor = new Ow(new bB(x1 - x0, z1 - z0), fm);
    vault.name = 'frost_fw_vault';
    floor.name = 'frost_fw_tripfloor';
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, F, (z0 + z1) / 2);
    G.add(vault, floor);
    // the centrepiece: the morphing Mandelbulb (on Low, the iridescent torus knot), gold rings orbiting it
    const C0 = new U(100, F + 5.7, 108.6);
    let cm, centre;
    if (low) {
      cm = __fwIri();
      centre = new Ow(new Qd(1.6, 0.4, 160, 16, 2, 3), cm);
    } else {
      cm = __fwBulb(hi ? 60 : 44, hi ? 6 : 5);
      centre = new Ow(new bi(1.9, 48, 32), cm);
      centre.renderOrder = 3;
    }
    centre.position.copy(C0);
    centre.name = 'frost_fw_bulb';
    const og = __fhIn(new Gw({ color: '#ffc861', metalness: 1, roughness: 0.18, emissive: '#5a3a08', emissiveIntensity: 0.8 }), { fill, env: 1.2 }),
      orb = new ji();
    orb.position.copy(C0);
    for (let k = 0; k < 3; k++) {
      const t = new Ow(new oI(2.45 + k * 0.32, 0.035, 6, 96), og);
      t.rotation.set(Math.PI / 2 + k * 0.5, k * 0.9, 0);
      orb.add(t);
    }
    G.add(centre, orb);
    // glowing tendrils hanging from the dome, swaying a little, colour running down them
    const tm = __fwTendril(),
      TB = __flMB();
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
      cc = new UA();
    for (let k = 0; k < (low ? 8 : 16); k++) {
      const a = (k / (low ? 8 : 16)) * Math.PI * 2 + rnd() * 0.3,
        s = 0.5 + rnd() * 0.22,
        bx0 = 100 + Math.cos(a) * 10 * s,
        bz0 = 109 + Math.sin(a) * 7 * s,
        yTop = F + 4.95 + 4.05 * Math.sqrt(Math.max(0, 1 - s * s)) - 0.35,
        len = 1.4 + rnd() * 1.6,
        pts = [];
      if (bz0 > __FW_WIN - 0.4) continue;
      for (let i = 0; i <= 14; i++) {
        const q = i / 14;
        pts.push([bx0 + Math.sin(q * 5 + k) * 0.25 * q, yTop - q * len, bz0 + Math.cos(q * 4 + k) * 0.25 * q]);
      }
      const t = __xmTube(pts, 0.05 * (1 - 0.5 * 0), 6, 1);
      TB.add(t, new _A(), 1);
      t.dispose();
      __fhSph(Bk('glow'), pts[14][0], pts[14][1], pts[14][2], 0.11, (cc.setHSL(rnd(), 1, 0.6), [cc.r, cc.g, cc.b]), 'sph6');
    }
    const tendrils = new Ow(TB.build(), tm);
    tendrils.name = 'frost_fw_tendrils';
    G.add(tendrils);
    // floating crystals in every colour, turning and bobbing (only inside the rounded room, short of the window)
    const shapes = [new HQ(0.32, 0), new bQ(0.36, 0), new ld(0.3, 0)],
      lists = [[], [], []];
    for (let k = 0, n = 0; k < 400 && n < (low ? 24 : 54); k++) {
      const x = x0 + 1 + rnd() * (x1 - x0 - 2),
        z = z0 + 0.8 + rnd() * (__FW_WIN - 0.6 - z0 - 0.8),
        y = F + 2.6 + rnd() * 4.2,
        s = 0.6 + rnd() * 0.9;
      if (!__fwInVault(x, z, 1.3) || Math.hypot(x - C0.x, y - C0.y, z - C0.z) < 3.1) continue;
      cc.setHSL(rnd(), 1, 0.42);
      lists[n++ % 3].push([__flM(x, y, z, s, s, s), '#' + cc.getHexString()]);
    }
    const flm = __fwFloatMat(null, !0);
    shapes.forEach((g, k) => __xmInst(G, g, flm, lists[k], 'frost_fw_float'));
    // rainbow sparkles drifting up
    const spk = ['#ff70e0', '#70f0ff', '#ffe070'].map((c) => __fwSnow(low ? 70 : 170, [x0 + 0.5, F + 0.2, z0 + 0.5, x1 - 0.5, top - 0.4, __FW_WIN - 0.4], { color: c, size: 0.06, speed: 0.35, rise: 0.8, add: 1 }));
    for (const s of spk) G.add(s.pts);
    // a neon rainbow round each doorway
    for (const g of gaps) {
      const thinX = g.b[2] - g.b[0] < g.b[3] - g.b[1],
        P = thinX ? (Math.abs(g.b[0] - x1) < 0.6 || Math.abs(g.b[2] - x1) < 0.6 ? x1 : x0) : Math.abs(g.b[1] - z0) < 0.6 || Math.abs(g.b[3] - z0) < 0.6 ? z0 : z1,
        sg = P === x1 || P === z1 ? -1 : 1,
        u0 = thinX ? g.b[1] : g.b[0],
        u1 = thinX ? g.b[3] : g.b[2],
        ht = g.b[5],
        strip = (a0, y0, a1, y1, c) => (thinX ? bx('glow', P + sg * 0.03, y0, a0, P + sg * 0.06, y1, a1, c) : bx('glow', a0, y0, P + sg * 0.03, a1, y1, P + sg * 0.06, c));
      for (let k = 0; k < 6; k++) {
        cc.setHSL(k / 6, 1, 0.55);
        const c = [cc.r, cc.g, cc.b],
          o = 0.12 + k * 0.07;
        strip(u0 - o - 0.03, F, u0 - o, ht + o, c);
        strip(u1 + o, F, u1 + o + 0.03, ht + o, c);
        strip(u0 - o - 0.03, ht + o, u1 + o + 0.03, ht + o + 0.03, c);
      }
    }
    // the gate home: fluted gold pillars, an arch hung with coloured lights, the portal in the wall
    const g = __FW_GATE,
      GB = __flMB(),
      GL = __flMB();
    for (const sx of [-1.125, 1.125]) {
      __fhCyl(GB, [g.x + sx, F, g.z - 0.05], [g.x + sx, F + 3.6, g.z - 0.05], 0.22, C.gold);
      __fhBox(GB, g.x + sx - 0.3, F, g.z - 0.35, g.x + sx + 0.3, F + 0.25, g.z + 0.15, C.gold);
      for (let k = 0; k < 10; k++) __fhCyl(GB, [g.x + sx + Math.cos(k * 0.628) * 0.22, F + 0.3, g.z - 0.05 + Math.sin(k * 0.628) * 0.22], [g.x + sx + Math.cos(k * 0.628) * 0.22, F + 3.4, g.z - 0.05 + Math.sin(k * 0.628) * 0.22], 0.025, C.goldD, 'cyl6');
    }
    const ap = Array.from({ length: 41 }, (_, k) => [g.x - 1.125 * Math.cos((k / 40) * Math.PI), F + 3.6 + 1.125 * Math.sin((k / 40) * Math.PI), g.z - 0.05]),
      at = __xmTube(ap, 0.12, 8, 1);
    GB.add(at, new _A(), C.gold);
    at.dispose();
    for (let k = 1; k < ap.length - 1; k += 2) {
      cc.setHSL(k / ap.length, 1, 0.6);
      __fhSph(GL, ap[k][0], ap[k][1], ap[k][2] - 0.14, 0.06, [cc.r, cc.g, cc.b], 'sph6');
    }
    const gm = __fwGatePortal(),
      gp = new Ow(new bB(2.0, 4.6), gm);
    gp.position.set(g.x, F + 2.3, g.z + 0.1);
    gp.rotation.y = Math.PI;
    gp.name = 'frost_fw_gateportal';
    gate.add(new Ow(GB.build(), MAT.gold), new Ow(GL.build(), MAT.glow), gp);
    ticks.push((dt) => {
      const d = Math.min(dt, 0.1);
      for (const m of [vm, fm, cm, gm, flm, tm]) m.__u.uT.value += d;
      for (const s of spk) s.u.uT.value += d;
      low && ((centre.rotation.y += d * 0.25), (centre.rotation.x = Math.sin(performance.now() / 4000) * 0.35));
      orb.rotation.y -= d * 0.4;
      orb.rotation.z += d * 0.15;
    });
  }

  // ================================================================ the furniture
  for (const f of __FW_F) {
    const [k, cx, cz, r, o = {}] = f,
      ry = (r * Math.PI) / 2,
      L = __fhLocal(cx, cz, r, F),
      lb = (m, a, b, c, d, e, g, col) => L.box(Bk(m), a, b, c, d, e, g, col),
      lc = (m, a, b, rad, col, unit) => L.cyl(Bk(m), a, b, rad, col, unit),
      W = L.W;
    switch (k) {
      case 'sofa':
        place('sofa', cx, F, cz, ry, 2.9) || (lb('velvet', -1.45, 0, -0.5, 1.45, 0.45, 0.5, C.ivory), lb('velvet', -1.45, 0.45, -0.5, 1.45, 0.95, -0.25, C.ivory));
        break;
      case 'arm':
        place('arm', cx, F, cz, ry, 0.9) || lb('velvet', -0.45, 0, -0.45, 0.45, 0.9, 0.45, C.blush);
        break;
      case 'ctable':
        place('coffee', cx, F, cz, ry, 1.3) || (lb('marble', -0.65, 0.4, -0.65, 0.65, 0.45, 0.65, C.white), lc('gold', [0, 0, 0], [0, 0.4, 0], 0.08, C.gold));
        break;
      case 'side': {
        const top = place('side', cx, F, cz, ry, 0.55) ? mH('side', 0.55) : (lb('rose', -0.27, 0, -0.25, 0.27, 0.6, 0.25, C.wood), 0.6);
        lc('gold', [0, top, 0], [0, top + 0.32, 0], 0.025, C.gold);
        lc('gold', [0, top, 0], [0, top + 0.03, 0], 0.09, C.gold);
        const p = W(0, top + 0.42, 0);
        Bk('glow').add(__flUnit('cone'), __flM(p[0], p[1], p[2], 0.18, 0.22, 0.18), [0.9, 0.7, 0.45]);
        break;
      }
      case 'console': {
        place('console', cx, F, cz, ry, 1.6) || lb('rose', -0.8, 0, -0.25, 0.8, 0.85, 0.25, C.wood);
        const p = W(0, mH('console', 1.6) || 0.85, 0);
        place('vase', p[0], p[1], p[2], ry, 0.6);
        break;
      }
      case 'col':
        lb('marble', -0.4, 0, -0.4, 0.4, 0.5, 0.4, C.white);
        lb('gold', -0.42, 0.42, -0.42, 0.42, 0.5, 0.42, C.gold);
        lc('marble', [0, 0.5, 0], [0, 6.25, 0], 0.3, C.white);
        for (let i = 0; i < 12; i++) lc('gold', [Math.cos(i * 0.5236) * 0.3, 0.7, Math.sin(i * 0.5236) * 0.3], [Math.cos(i * 0.5236) * 0.3, 6.05, Math.sin(i * 0.5236) * 0.3], 0.018, C.goldD, 'cyl6');
        lc('gold', [0, 0.5, 0], [0, 0.66, 0], 0.36, C.gold);
        lc('gold', [0, 6.05, 0], [0, 6.25, 0], 0.35, C.gold);
        lc('gold', [0, 6.25, 0], [0, 6.55, 0], 0.42, C.gold);
        lb('gold', -0.48, 6.55, -0.48, 0.48, 6.75, 0.48, C.gold);
        lb('marble', -0.45, 6.75, -0.45, 0.45, 7.0, 0.45, C.white);
        break;
      case 'pcol':
        lc('chrome', [0, 0, 0], [0, 9, 0], 0.32, [0.9, 0.9, 0.95]);
        for (const y of [0.0, 0.35, 8.55, 8.85]) lc('gold', [0, y, 0], [0, y + 0.15, 0], 0.4, C.gold);
        break;
      case 'plant':
        place('plant', cx, F, cz, ry, 1.6) || (lc('gold', [0, 0, 0], [0, 0.5, 0], 0.28, C.gold), sp('cloth', W(0, 1.1, 0)[0], F + 1.1, W(0, 1.1, 0)[2], 0.5, [0.15, 0.35, 0.15]));
        break;
      case 'bust':
        lb('marble', -0.25, 0, -0.25, 0.25, 0.12, 0.25, C.white);
        lc('marble', [0, 0.12, 0], [0, 0.95, 0], 0.17, C.white);
        lb('marble', -0.24, 0.95, -0.24, 0.24, 1.06, 0.24, C.white);
        lc('gold', [0, 0.12, 0], [0, 0.17, 0], 0.2, C.gold);
        lc('gold', [0, 0.9, 0], [0, 0.95, 0], 0.2, C.gold);
        place('bust', cx, F + 1.06, cz, ry);
        break;
      case 'fire': {
        // the grand fireplace: white marble with gilt trim and a gilt keystone, a black marble hearth, a log
        // fire; a chimney breast to the ceiling with an ornate mirror on it
        for (const s of [-1, 1]) {
          lb('marble', s * 1.3, 0, -0.45, s * 1.9, 1.45, 0.45, C.white);
          lb('gold', s * 1.62 - 0.03, 0.1, 0.45, s * 1.62 + 0.03, 1.35, 0.47, C.gold);
          lb('gold', s * 1.9 - (s > 0 ? 0.04 : -0.04), 0, -0.45, s * 1.9, 1.45, 0.47, C.gold);
        }
        lb('marble', -1.3, 1.1, -0.45, 1.3, 1.45, 0.45, C.white);
        lb('gold', -0.16, 1.12, 0.45, 0.16, 1.43, 0.5, C.gold);
        lb('marble', -1.3, 0, -0.45, 1.3, 1.1, -0.38, C.onyx);
        lb('marble', -1.95, 0, 0.45, 1.95, 0.05, 1.15, C.onyx);
        lb('marble', -2.05, 1.45, -0.45, 2.05, 1.6, 0.6, C.white);
        lb('gold', -2.05, 1.43, 0.6, 2.05, 1.47, 0.63, C.gold);
        lb('paint', -1.8, 1.6, -0.45, 1.8, 7.0, -0.05, C.cream);
        for (const [a, b, c, d] of [[-1.6, 1.85, 1.6, 1.9], [-1.6, 6.3, 1.6, 6.35], [-1.6, 1.85, -1.55, 6.35], [1.55, 1.85, 1.6, 6.35]]) lb('gold', a, b, -0.05, c, d, -0.01, C.gold);
        lb('glow', -1.2, 0.05, -0.379, 1.2, 0.85, -0.37, [0.45, 0.16, 0.04]);
        for (let i = 0; i < 3; i++) lc('cloth', [-0.6 + i * 0.12, 0.08 + i * 0.07, -0.2 + (i % 2) * 0.12], [0.6 - i * 0.1, 0.08 + i * 0.07, -0.1 - (i % 2) * 0.1], 0.07, C.brown);
        const p = W(0, 0.06, -0.12);
        __xmFire(G, p[0], p[1], p[2], ticks, 0.75);
        const mp = W(0, 2.1, -0.04);
        place('mirror', mp[0], mp[1], mp[2], ry, 1.7) || __fhPainting(Kt, 'w', 'alps', mp[0], F + 3.2, mp[2], ry, 1.6, 1.1);
        break;
      }
      case 'bar':
        lb('lacquer', -2.2, 0, -0.4, 2.2, 1.05, 0.36, C.onyx);
        lb('glow', -2.15, 0.12, 0.36, 2.15, 0.95, 0.375, [0.95, 0.55, 0.2]);
        for (let x = -2.1; x <= 2.11; x += 0.42) lb('gold', x - 0.02, 0.1, 0.375, x + 0.02, 0.97, 0.41, C.gold);
        lb('marble', -2.3, 1.05, -0.45, 2.3, 1.12, 0.5, C.white);
        lb('gold', -2.3, 1.05, 0.5, 2.3, 1.12, 0.53, C.gold);
        lc('gold', [-2.1, 0.2, 0.55], [2.1, 0.2, 0.55], 0.025, C.gold);
        break;
      case 'backbar': {
        lb('rose', -2.5, 0, -0.25, 2.5, 0.92, 0.25, C.wood);
        lb('marble', -2.52, 0.92, -0.25, 2.52, 0.97, 0.27, C.white);
        lb('chrome', -2.5, 0.97, -0.26, 2.5, 3.0, -0.24, [0.85, 0.82, 0.78]);
        const BC = [[1.0, 0.62, 0.2], [0.35, 0.9, 0.45], [0.95, 0.95, 1.0], [0.9, 0.15, 0.2], [0.65, 0.35, 0.12]];
        for (const [y, n] of [[1.35, 0], [1.85, 1], [2.35, 2]]) {
          lb('gold', -2.4, y - 0.02, -0.24, 2.4, y, -0.02, C.gold);
          lb('glow', -2.4, y - 0.035, -0.24, 2.4, y - 0.02, -0.2, [0.9, 0.7, 0.45]);
          for (let x = -2.25, i = n; x < 2.3; x += 0.17, i++) lc('glow', [x, y, -0.13], [x, y + 0.24 + (i % 3) * 0.04, -0.13], 0.033, BC[i % BC.length].map((c) => c * 0.55));
        }
        break;
      }
      case 'stool':
        place('fwStool', cx, F, cz, ry, 0.5) || (lc('gold', [0, 0, 0], [0, 0.7, 0], 0.04, C.gold), lc('velvet', [0, 0.7, 0], [0, 0.78, 0], 0.22, C.red));
        break;
      case 'piano': {
        // a black lacquer grand: body and its curved tail, the keys towards the room, the lid propped open
        lb('lacquer', -0.8, 0.62, -1.05, 0.8, 0.95, 0.6, C.black);
        const tp = W(0.0, 0.62, -0.5);
        Bk('lacquer').add(__flUnit('cyl'), __flM(tp[0], F + 0.785, tp[2], 0.8, 0.33, 0.6, ry), C.black);
        lb('lacquer', -0.78, 0.7, 0.6, 0.78, 0.74, 1.02, C.black);
        lb('cloth', -0.74, 0.74, 0.62, 0.74, 0.77, 0.98, C.white);
        for (let x = -0.7; x < 0.72; x += 0.06) Math.floor((x + 0.7) / 0.06) % 7 !== 2 && lb('lacquer', x, 0.77, 0.62, x + 0.025, 0.8, 0.82, C.black);
        lb('lacquer', -0.78, 0.77, 0.58, 0.78, 0.98, 0.62, C.black);
        for (const [x, z] of [[-0.65, 0.4], [0.65, 0.4], [0, -0.95]]) {
          lc('lacquer', [x, 0, z], [x, 0.62, z], 0.06, C.black);
          lc('gold', [x, 0, z], [x, 0.06, z], 0.07, C.gold);
        }
        lc('gold', [0, 0.05, 0.35], [0, 0.6, 0.35], 0.02, C.gold);
        const lp = W(0.18, 1.32, -0.3);
        Bk('lacquer').add(__flUnit('box'), __flM(lp[0], lp[1], lp[2], 1.5, 0.03, 1.55, ry, 0, -0.62), C.black);
        break;
      }
      case 'hearth': {
        // the cinema's media wall: black marble, a long fire behind glass in a slot under the screen
        const BM = C.onyx;
        lb('marble', -6, 0, -0.35, 6, 0.35, 0.35, BM);
        lb('marble', -6, 1.05, -0.35, 6, 1.25, 0.35, BM);
        lb('marble', -6, 0.35, -0.35, -3.5, 1.05, 0.35, BM);
        lb('marble', 3.5, 0.35, -0.35, 6, 1.05, 0.35, BM);
        lb('paint', -3.5, 0.35, -0.35, 3.5, 1.05, -0.3, C.black);
        lb('glow', -3.4, 0.35, -0.25, 3.4, 0.4, 0.15, [0.9, 0.35, 0.08]);
        for (let x = -3.3; x < 3.31; x += 0.22) {
          const p = W(x, 0.42, -0.05 + Math.sin(x * 7) * 0.1);
          __fhSph(Bk('glow'), p[0], p[1], p[2], 0.035, x % 0.44 < 0.22 ? [1.0, 0.75, 0.4] : [0.8, 0.9, 1.0], 'sph6');
        }
        for (let x = -2.8; x < 2.81; x += 1.4) {
          const p = W(x, 0.37, -0.05);
          __xmFire(G, p[0], p[1], p[2], ticks, 0.42);
        }
        lb('glass', -3.5, 0.35, 0.33, 3.5, 1.05, 0.34, [1, 1, 1]);
        lb('gold', -6, 1.22, 0.35, 6, 1.25, 0.37, C.gold);
        for (const [a, b, c, d] of [[-3.55, 0.3, 3.55, 0.35], [-3.55, 1.05, 3.55, 1.1], [-3.55, 0.3, -3.5, 1.1], [3.5, 0.3, 3.55, 1.1]]) lb('gold', a, b, 0.35, c, d, 0.38, C.gold);
        break;
      }
      case 'recl':
        // four leather recliners in a row, gilt cup holders, a soft glow beneath
        lb('leather', -3.5, 0.05, -0.575, 3.5, 0.42, 0.5, C.seat);
        for (let i = 0; i < 4; i++) {
          const x = -2.625 + i * 1.75;
          lb('leather', x - 0.66, 0.42, -0.35, x + 0.66, 0.56, 0.55, C.seat);
          lb('leather', x - 0.68, 0.42, -0.575, x + 0.68, 1.05, -0.3, C.seat);
          lb('leather', x - 0.55, 0.82, -0.32, x + 0.55, 1.02, -0.22, C.seatD);
        }
        for (let i = 0; i < 5; i++) {
          const x = -3.5 + i * 1.75,
            a = Math.max(-3.5, x - 0.14),
            b = Math.min(3.5, x + 0.14);
          lb('leather', a, 0.42, -0.575, b, 0.68, 0.55, C.seatD);
          lc('gold', [(a + b) / 2, 0.68, 0.32], [(a + b) / 2, 0.69, 0.32], 0.07, C.gold);
        }
        lb('gold', -3.5, 0.02, 0.5, 3.5, 0.06, 0.52, C.gold);
        lb('glow', -3.4, 0.0, 0.52, 3.4, 0.02, 0.6, C.amber);
        break;
      case 'bed': {
        // a canopy bed: champagne base with gilt trim, white linen, an ivory duvet and a gold throw, a tall tufted
        // headboard in a gilt frame, gilt posts with sheer drapes
        lb('jac', -1.1, 0, -1.15, 1.1, 0.35, 1.25, C.champ);
        lb('gold', -1.11, 0.33, -1.15, 1.11, 0.36, 1.26, C.gold);
        lb('cloth', -1.05, 0.35, -1.1, 1.05, 0.6, 1.2, C.white);
        lb('cloth', -1.08, 0.5, -0.4, 1.08, 0.66, 1.22, C.ivory);
        lb('velvet', -1.1, 0.62, 0.55, 1.1, 0.68, 0.95, C.gold.map((c) => c * 0.75));
        for (const x of [-0.55, 0.55]) {
          L.sph(Bk('cloth'), x, 0.72, -0.85, 0.36, C.white, 0.35);
          L.sph(Bk('velvet'), x * 0.9, 0.78, -0.62, 0.26, C.champ, 0.4);
        }
        lb('jac', -1.25, 0.3, -1.25, 1.25, 2.3, -1.13, C.champ);
        for (const [a, b, c, d] of [[-1.3, 0.3, -1.25, 2.35], [1.25, 0.3, 1.3, 2.35], [-1.3, 2.3, 1.3, 2.42]]) lb('gold', a, b, -1.27, c, d, -1.1, C.gold);
        for (let x = -1.0; x <= 1.01; x += 0.25) for (let y = 0.8; y <= 2.1; y += 0.26) L.sph(Bk('gold'), x, y, -1.12, 0.022, C.gold, 1);
        for (const [x, z] of [[-1.15, -1.2], [1.15, -1.2], [-1.15, 1.25], [1.15, 1.25]]) {
          lc('gold', [x, 0, z], [x, 2.9, z], 0.04, C.gold);
          lb('sheer', x - 0.25, 0.4, z - 0.02, x + 0.25, 2.85, z + 0.02, [1, 1, 1]);
        }
        lb('gold', -1.2, 2.86, -1.24, 1.2, 2.94, -1.16, C.gold);
        lb('gold', -1.2, 2.86, 1.21, 1.2, 2.94, 1.29, C.gold);
        lb('gold', -1.2, 2.86, -1.24, -1.12, 2.94, 1.29, C.gold);
        lb('gold', 1.12, 2.86, -1.24, 1.2, 2.94, 1.29, C.gold);
        break;
      }
      case 'stand': {
        lb('rose', -0.3, 0, -0.225, 0.3, 0.6, 0.225, C.wood);
        for (const y of [0.18, 0.42]) lb('gold', -0.08, y, 0.225, 0.08, y + 0.025, 0.24, C.gold);
        lc('gold', [0, 0.6, 0], [0, 0.95, 0], 0.02, C.gold);
        lc('gold', [0, 0.6, 0], [0, 0.63, 0], 0.08, C.gold);
        const p = W(0, 1.02, 0);
        Bk('glow').add(__flUnit('cone'), __flM(p[0], p[1], p[2], 0.15, 0.18, 0.15), [0.85, 0.66, 0.42]);
        break;
      }
      case 'ward':
        lb('paint', -2, 0, -0.325, 2, 2.6, 0.3, C.ivory);
        for (let i = 0; i < 4; i++) {
          const a = -2 + i + 0.08,
            b = -1 + i - 0.08;
          for (const [p0, q0, p1, q1] of [[a, 0.15, b, 0.19], [a, 2.3, b, 2.34], [a, 0.15, a + 0.04, 2.34], [b - 0.04, 0.15, b, 2.34]]) lb('gold', p0, q0, 0.3, p1, q1, 0.32, C.gold);
          lc('gold', [i % 2 ? a + 0.12 : b - 0.12, 1.0, 0.33], [i % 2 ? a + 0.12 : b - 0.12, 1.45, 0.33], 0.014, C.gold);
        }
        lb('gold', -2.05, 2.5, -0.33, 2.05, 2.6, 0.35, C.gold);
        break;
      case 'dresser': {
        lb('rose', -0.9, 0, -0.275, 0.9, 0.8, 0.275, C.wood);
        lb('marble', -0.92, 0.8, -0.28, 0.92, 0.85, 0.29, C.white);
        for (const y of [0.18, 0.42, 0.66]) for (const x of [-0.45, 0.45]) lb('gold', x - 0.09, y, 0.275, x + 0.09, y + 0.025, 0.29, C.gold);
        const p = W(0, 1.0, -0.24);
        place('mirror', p[0], p[1], p[2], ry, 1.1);
        break;
      }
      case 'bench':
        lb('velvet', -0.8, 0.3, -0.25, 0.8, 0.48, 0.25, C.blush);
        for (const [x, z] of [[-0.72, -0.18], [0.72, -0.18], [-0.72, 0.18], [0.72, 0.18]]) lc('gold', [x, 0, z], [x, 0.3, z], 0.025, C.gold);
        break;
      case 'car':
        place('fwCar', cx, F + (Math.abs(cx - 85.3) < 0.1 ? 0.025 : 0), cz, ry, 1.95) || lb('cloth', -1.0, 0, -2.5, 1.0, 1.4, 2.5, [0.7, 0.7, 0.72]);
        break;
      case 'shelf':
        place('fwShelf', cx, F, cz, ry, 0.62) || lb('chrome', -0.3, 0, -0.25, 0.3, 2.1, 0.25, [0.5, 0.5, 0.52]);
        break;
      case 'cart':
        place('fwCart', cx, F, cz, ry, 1.58) || lb('chrome', -0.79, 0, -0.55, 0.79, 1.3, 0.55, [0.6, 0.1, 0.1]);
        break;
      case 'lounge':
        place('fwLounge', cx, F, cz, ry, 1.0) || lb('leather', -0.5, 0, -0.6, 0.5, 0.9, 0.6, C.brown);
        break;
      case 'scope': {
        // a brass telescope on a tripod, pointed at the peaks
        const hub = [0, 1.05, 0];
        for (const [x, z] of [[-0.32, -0.28], [0.32, -0.28], [0, 0.36]]) lc('gold', hub, [x, 0, z], 0.018, C.goldD, 'cyl6');
        lc('gold', [0, 1.05, -0.35], [0, 1.32, 0.45], 0.065, C.gold);
        lc('gold', [0, 1.32, 0.45], [0, 1.36, 0.56], 0.085, C.gold);
        lc('lacquer', [0, 1.05, -0.35], [0, 1.0, -0.5], 0.03, C.black);
        break;
      }
      case 'dtable': {
        lb('rose', -1.5, 0.72, -0.55, 1.5, 0.78, 0.55, C.wood);
        lb('gold', -1.5, 0.7, -0.56, 1.5, 0.72, 0.56, C.gold);
        for (const x of [-0.95, 0.95]) {
          lc('gold', [x, 0, 0], [x, 0.7, 0], 0.06, C.gold);
          lb('gold', x - 0.3, 0, -0.35, x + 0.3, 0.04, 0.35, C.gold);
        }
        const p = W(0, 0.78, 0);
        place('vase', p[0], p[1], p[2], ry, 0.42);
        for (const x of [-0.55, 0.55]) {
          lc('gold', [x, 0.78, 0], [x, 1.02, 0], 0.012, C.gold);
          const q = W(x, 1.06, 0);
          __fhSph(Bk('glow'), q[0], q[1], q[2], 0.02, C.warm, 'sph6');
        }
        break;
      }
      case 'chair':
        lb('velvet', -0.23, 0.42, -0.23, 0.23, 0.5, 0.23, C.champ);
        lb('velvet', -0.22, 0.5, -0.25, 0.22, 1.0, -0.19, C.champ);
        lb('gold', -0.23, 0.97, -0.26, 0.23, 1.01, -0.18, C.gold);
        for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) lc('gold', [x, 0, z], [x, 0.42, z], 0.018, C.gold, 'cyl6');
        break;
      case 'mush': {
        // a giant glowing mushroom: a pale stem, a glowing cap with bright spots, darker glowing gills
        const h = o.h,
          R = o.cap,
          cc = new UA(o.col),
          col = [cc.r, cc.g, cc.b];
        lc('paint', [0, 0, 0], [0, 0.4, 0], 0.55, C.lilac);
        lc('paint', [0, 0.4, 0], [0, h - 0.1, 0], 0.36, C.lilac);
        const capGeo = __FW.capGeo || (__FW.capGeo = new bi(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2));
        Bk('glow').add(capGeo, __flM(cx, F + h - 0.15, cz, R, R * 0.55, R), col.map((c) => c * 0.42));
        Bk('glow').add(__flUnit('cyl'), __flM(cx, F + h - 0.17, cz, R * 0.97, 0.03, R * 0.97), col.map((c) => c * 0.16));
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4 + h,
            p = 0.35 + (i % 3) * 0.3;
          __fhSph(Bk('glow'), cx + Math.sin(p) * Math.cos(a) * R * 0.98, F + h - 0.15 + Math.cos(p) * R * 0.55 * 0.98, cz + Math.sin(p) * Math.sin(a) * R * 0.98, 0.1 + (i % 3) * 0.05, [0.75, 0.75, 0.75], 'sph6');
        }
        break;
      }
      default:
        // kinds the wings draw (65c-frostline-condo-wing.js)
        try {
          __FW_KINDS[k] && __FW_KINDS[k](K, f, L, lb, lc, W, ry);
        } catch (e) {
          __FW.err = String(e && e.stack);
        }
    }
  }
  // the wings
  for (const fn of __FW_WINGS)
    try {
      fn(K);
    } catch (e) {
      __FW.err = String(e && e.stack);
      console.warn('[condo] wing', e);
    }
  // the models, instanced (one draw per part per model)
  for (const k in inst) {
    const before = G.children.length;
    __flInstance(G, mdl[k].parts, inst[k], !1);
    for (let i = before; i < G.children.length; i++) G.children[i].name || (G.children[i].name = 'frost_fw_m_' + k);
  }
  // every bucket, one mesh
  for (const m in BK) BK[m].count && __flMesh(G, BK[m].build(), MAT[m], 'frost_fw_' + m, !1);
  G.traverse((o) => o.isMesh && ((o.castShadow = !1), (o.receiveShadow = !1)));
  return { G, gate };
}

// ---------------------------------------------------------------- the view
// The fridge's window: while its doors are open and you are near it, in front of it and it is on screen, the condo
// is drawn once more from where you would be if the fridge's opening were the plane z = __FW_WIN in the
// Kaleidoscope (the same view direction, moved by a fixed offset), and only the rectangle of the screen the
// window covers (a view offset: when the fridge fills a tenth of the screen, a tenth of the pixels; at most
// 1024 px a side, half that on Low), which the window shows by screen position: so you see into the other room,
// in perspective, and it moves as you move.
// No freeze when it opens: three.js compiles a separate shader for each material for every way it is drawn (to
// the screen, into a render target, with clipping...). The window is drawn into a target of the same kind as the
// one the game draws the world into (96-smooth.js finds it), without clipping, so it uses exactly the shaders the
// condo uses anyway; and a few seconds after the map is built all of them are compiled in the background
// (__smoothCompile), before anyone opens the fridge or walks in.
function __fwView(root, models, ticks) {
  const m = aw();
  if (!m.__fw) return;
  const fr = __fwFridge(root, ticks),
    Wd = __fwWorld(root, models, ticks),
    G = Wd.G;
  __FW.group = G;
  __FW.anim = __FW.da = __FW.dv = 0;
  __FW.wasOpen = !1;
  __FW.warm = 0;
  __FW.rt && __FW.rt.dispose();
  __FW.rt = null;
  const fp = { x: (__FW_FR.x0 + __FW_FR.x1) / 2, y: __FW_FR.y + 1.2, z: __FW_FR.z + 0.3 },
    vcam = new ui(),
    v1 = new U(),
    v2 = new U(),
    v3 = new U(),
    sz = new aA(),
    fogC = new UA(),
    pw = fr ? fr.portal.geometry.parameters.width / 2 : 0,
    ph = fr ? fr.portal.geometry.parameters.height / 2 : 0,
    corner = new U(),
    off = fr ? new U(100 - fr.portal.position.x, __FW_Y.F - __FH_Y.HF, __FW_WIN - fr.portal.position.z) : null;
  const windowView = (s) => {
    const gl = s.gl,
      cam = s.camera,
      sc = s.scene;
    if (!gl || !cam || !sc) return;
    cam.getWorldPosition(v1);
    fr.portal.getWorldPosition(v2);
    if (v1.z < __FW_FR.z + 0.05 || v1.distanceTo(v2) > 14) return;
    // its rectangle on screen (drawing-buffer pixels, from the bottom-left), from its four corners
    gl.getDrawingBufferSize(sz);
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9,
      behind = 0;
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corner.set(v2.x + dx * pw, v2.y + dy * ph, v2.z).project(cam);
      if (corner.z > 1) behind++;
      const px = ((corner.x + 1) / 2) * sz.x,
        py = ((corner.y + 1) / 2) * sz.y;
      (x0 = Math.min(x0, px)), (x1 = Math.max(x1, px)), (y0 = Math.min(y0, py)), (y1 = Math.max(y1, py));
    }
    if (behind === 4) return;
    behind && ((x0 = 0), (y0 = 0), (x1 = sz.x), (y1 = sz.y)); // very close: corners behind the eye
    x0 = Math.max(0, Math.floor(x0 - 4));
    y0 = Math.max(0, Math.floor(y0 - 4));
    x1 = Math.min(sz.x, Math.ceil(x1 + 4));
    y1 = Math.min(sz.y, Math.ceil(y1 + 4));
    const rw = x1 - x0,
      rh = y1 - y0;
    if (rw < 2 || rh < 2) return;
    const lowQ = Zw.getState().quality === 'low',
      k = Math.min(lowQ ? 0.5 : 1, (lowQ ? 512 : 1024) / Math.max(rw, rh)),
      w = Math.max(16, Math.round(rw * k)),
      h = Math.max(16, Math.round(rh * k));
    let rt = __FW.rt;
    if (!rt) rt = __FW.rt = __fwTarget(w, h);
    else if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    vcam.copy(cam, !1);
    cam.getWorldQuaternion(vcam.quaternion);
    vcam.position.copy(v1).add(off);
    vcam.scale.set(1, 1, 1);
    vcam.setViewOffset(sz.x, sz.y, x0, sz.y - y1, rw, rh);
    vcam.updateProjectionMatrix();
    vcam.updateMatrixWorld(!0);
    // only the condo, and only what lies beyond the window's plane: the gate home and the aquarium (south of that
    // plane, between the eye and the window) are hidden
    const hid = [];
    if (__FH.groups) for (const g in __FH.groups) __FH.groups[g].visible && (hid.push(__FH.groups[g]), (__FH.groups[g].visible = !1));
    G.visible = !0;
    Wd.gate.visible = !1;
    for (const o of __FW_HIDE) o.visible && (hid.push(o), (o.visible = !1));
    const fog = sc.fog && sc.fog.isFog ? sc.fog : null,
      fn = fog && fog.near,
      ff = fog && fog.far;
    fog && (fogC.copy(fog.color), fog.color.set('#1a0626'), (fog.near = 25), (fog.far = 90));
    const sm = gl.shadowMap.autoUpdate,
      prev = gl.getRenderTarget();
    gl.shadowMap.autoUpdate = !1;
    try {
      gl.setRenderTarget(rt);
      gl.clear();
      gl.render(sc, vcam);
    } finally {
      gl.setRenderTarget(prev);
      gl.shadowMap.autoUpdate = sm;
      fog && (fog.color.copy(fogC), (fog.near = fn), (fog.far = ff));
      for (const g of hid) g.visible = !0;
      G.visible = !1;
      Wd.gate.visible = !0;
    }
    fr.pm.__u.uTex.value = rt.texture;
    fr.pm.__u.uRect.value.set(x0, y0, rw, rh);
    fr.pm.__u.uHas.value = 1;
  };
  // the door's sounds: the seal letting go with a soft thump, the compressor's hum, then the chime
  const doorSound = (open) => {
    try {
      const g = xw(fp, 0.5, { maxDist: 20, reverb: 0.2 });
      if (!g) return;
      Cw(g.in, g.t, open ? 0.12 : 0.09, 'lowpass', open ? 380 : 260, 0.8, open ? 0.25 : 0.32, { attack: 0.003 });
      open && Ii(g.in, g.t + 0.05, 0.8, 58, 60, 0.05, 'sawtooth', 0.15);
      open || Ii(g.in, g.t, 0.12, 120, 60, 0.18, 'sine', 0.002);
    } catch (e) {}
  };
  ticks.push((dt, s) => {
    try {
      dt = Math.min(dt, 0.1);
      const d = m.doors[m.__fw.door],
        open = !!(d && d.open);
      // the doors on a spring (a little past open, and back); the window irises open a beat behind them
      const want = open ? 1 : 0;
      __FW.dv += ((want - __FW.da) * 90 - __FW.dv * (open ? 11 : 14)) * dt;
      __FW.da += __FW.dv * dt;
      if (!open && __FW.da < 0) (__FW.da = 0), (__FW.dv = 0);
      __FW.anim += (want - __FW.anim) * Math.min(1, dt * (open ? 3.2 : 6));
      Math.abs(__FW.anim - want) < 0.001 && (__FW.anim = want);
      if (open !== __FW.wasOpen) {
        doorSound(open);
        open && setTimeout(() => __fwChime(fp), 160);
      }
      __FW.wasOpen = open;
      // the condo is drawn only from inside it (and then the house and tunnels are not)
      const c = s.camera.position,
        inW = c.x > __FW_BOX[0] - 1 && c.x < __FW_BOX[2] + 1 && c.z > __FW_BOX[1] - 1 && c.z < __FW_BOX[3] + 1 && c.y < -6;
      __FW.inW = inW;
      G.visible = inW;
      if (inW && __FH.groups) for (const k in __FH.groups) __FH.groups[k].visible = !1;
      __FW.room = inW ? __fhVolAt(c.x, c.y, c.z, 0.2, 1) : null;
      if (fr) {
        const k = __FW.anim,
          a = Math.max(0, __FW.da);
        fr.left.rotation.y = -a * 1.85;
        fr.right.rotation.y = a * 1.85;
        fr.portal.visible = fr.sp.pts.visible = fr.mist.pts.visible = a > 0.01;
        fr.pm.__u.uOpen.value = k;
        fr.pm.__u.uT.value += dt;
        fr.sp.u.uT.value += dt;
        fr.mist.u.uT.value += dt;
        fr.mist.pts.material.opacity = 0.16 * Math.min(1, a);
        fr.spill.material.opacity = 0.22 * k;
        fr.light.intensity = 8 * k;
        fr.light.color.setHSL((performance.now() / 6000) % 1, 0.7, 0.7);
        fr.spill.material.color.copy(fr.light.color);
        const disp = k > 0.5 ? fr.dispOn : fr.dispOff;
        fr.dispMat.map !== disp && ((fr.dispMat.map = disp), (fr.dispMat.needsUpdate = !0));
        k < 0.01 && (fr.pm.__u.uHas.value = 0);
        if (a > 0.01 && !inW)
          try {
            windowView(s);
          } catch (e) {
            __FW.err = String(e && e.stack);
          }
      }
      // compile the condo's and the fridge's materials in the background, once, a few seconds in (in the variant
      // the game draws with: 96-smooth.js)
      if (!__FW.warm && s.gl && s.gl.compileAsync && (__FW.warmT = (__FW.warmT || 0) + dt) > 3 && typeof __smoothCompile === 'function') {
        __FW.warm = 1;
        const was = G.visible;
        G.visible = !0;
        try {
          __smoothCompile(s.gl, G, s.camera, s.scene);
          fr && __smoothCompile(s.gl, fr.portal.parent, s.camera, s.scene);
          __FW.rt || (__FW.rt = __fwTarget(64, 64));
        } catch (e) {}
        G.visible = was;
      }
      // the flash after going through a portal
      const el = __fwFlashEl(),
        t = (performance.now() - __FW.flashAt) / 1000;
      if (el) el.style.opacity = t < 0.08 ? String(t / 0.08) : t < 0.9 ? String(Math.max(0, 1 - (t - 0.08) / 0.82)) : '0';
    } catch (e) {
      __FW.err = String(e && e.stack);
    }
  });
}
// a render target like the one the game draws the world into (its pixel type and colour space decide which shader
// variant every material uses: the same here means no new compiles)
function __fwTarget(w, h) {
  const ref = typeof __SMOOTH < 'u' && __SMOOTH.rt,
    rt = new Ti(w, h, { type: ref ? ref.texture.type : 1016, samples: 0 });
  ref && (rt.texture.colorSpace = ref.texture.colorSpace);
  rt.__fwWindow = 1;
  return rt;
}
function __fwFlashEl() {
  if (typeof document > 'u') return null;
  if (__FW.flashEl && __FW.flashEl.isConnected) return __FW.flashEl;
  const el = document.createElement('div');
  if (!el.style || !document.body) return null;
  el.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0) 60%), conic-gradient(from 0deg, #ff4fd8, #ffb84f, #f4ff4f, #4fff9a, #4fd8ff, #8a4fff, #ff4fd8);';
  document.body.appendChild(el);
  return (__FW.flashEl = el);
}
// built after the house (65a-frostline-cabin.js), inside 64-frostline-rooms.js's builder
{
  const prevRooms = __flRooms;
  __flRooms = function (root, models, ticks) {
    prevRooms.apply(this, arguments);
    try {
      __fwView(root, models, ticks);
    } catch (e) {
      __FW.err = String(e && e.stack);
      console.warn('[condo] view', e);
    }
  };
}
// in the condo: its own haze (after 65a's fog: this component is its parent, so its frame callback runs later): a
// violet one in the Kaleidoscope, a faint warm one elsewhere
{
  const prevTrees = kwA;
  kwA = function () {
    QI((s) => {
      try {
        const sc = s.scene;
        if (__FW.inW && __FW.group && __FW.group.visible && sc && sc.fog && sc.fog.isFog) {
          const fg = (__FW.room && __FW_FOG[__FW.room.id]) || [40, 220, '#20170f'];
          sc.fog.near = fg[0];
          sc.fog.far = fg[1];
          sc.fog.color.set(fg[2]);
        }
      } catch (e) {}
    });
    return M.jsx(prevTrees, {});
  };
}
typeof window < 'u' &&
  (window.__bpWonder = () => {
    const m = aw(),
      h = eA.human && eA.human();
    return {
      fridge: m.__fw ? (m.doors[m.__fw.door].open ? 'open' : 'shut') : 'missing',
      anim: +__FW.anim.toFixed(2),
      inCondo: !!__FW.inW,
      room: __FW.room ? __FW.room.a : null,
      drawn: !!(__FW.group && __FW.group.visible),
      window: __FW.rt ? [__FW.rt.width, __FW.rt.height] : null,
      at: h ? [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)] : null,
      area: h ? LT(m, h.pos) : null,
      lastPortal: h && h.__fwAt !== void 0 ? +(eA.state.t - h.__fwAt).toFixed(1) + ' s ago' : null,
      err: __FW.err,
    };
  });
