/* ===== Bayou Protocol mod: Frostline's cabin, the house beneath it and the tunnels ===== */
// The log cabin in the CT spawn, against the cliff (drawn by 63-frostline-christmas.js), now opens: press E at
// its plank door. Inside, a small entry and a grand stair going down along the back wall, and below it a house
// many times the cabin's size, 5 m under the CT spawn, with 4.4 m ceilings: the stair turns at a landing (the
// wine cellar opens off it, with its own stair down to the library) into an entrance hall; the library, the
// dining room (a table for twelve under two chandeliers) and the hall open onto a long gallery, and across it
// the lounge (a second fireplace), the great room (a big stone fireplace with a real fire, the Christmas tree
// and its presents) and a chef's kitchen. Every room has two ways in or more. Sofas, armchairs, tables,
// consoles, palms, busts, vases, a mirror and the chandeliers are Poly Haven models (the cinema's, already in
// the game); the rest is modelled here. One of the library's bookcases is a door (E again): behind it a stone
// room with a shaft and a ladder down to a network of tiled, lamp-lit service tunnels 9.6 m under the map. The
// tunnels meet at a junction hall and split three ways, each to a ladder that climbs to an iron hatch on the
// surface: on A Long (behind the snowbank), in Mid (by the snowman) and on B (in the back corner under the ice
// pavilion).
//
// Why it is built this way (the ground forced it):
//   - The map's ground is not a mesh you can cut: it is an implicit floor at y = 0. In the physics (34-physics.js)
//     it is one Rapier slab 2 m thick under the whole map, the player's own movement clamps everyone back up to
//     y = 0, the core's floor query (z4 / rm: blood, shells, the ragdoll's feet) answers 0 when there is no box,
//     the death ragdoll has a hard floor at 0, and bullets have no ground at all (they just stop being drawn).
//   - The map is clamped to x, z in 0.4 .. 127.6, so the house cannot carry on behind the cliff (there are only
//     3.6 m of rock behind the cabin before the edge of the map): the extra space has to be underneath.
//   So: everything below ground is made of ordinary map boxes (walls, floors and a solid ceiling up to y = 0 over
//   every room and tunnel, so bullets, grenades and line of sight treat the ground as solid exactly where there
//   is something under it), the Rapier slab gets holes only where a room passes through it (the house, the
//   stairs and the three exit shafts), and the few places that assume y >= 0 learn about the underground: the
//   player movement (no clamp below a room), z4 (the floor under a point), the ragdoll, smoke, the location
//   readout (areas are 2D in the core) and footstep surfaces. The snowfield's mesh has a hole only under each
//   hatch (so you can look down the shaft when the lid lifts); the hatch itself is solid to walk on.
//
// Ladders (new): one per shaft. Walk into a ladder at its foot (facing it) or press E to grab it; at the top
// walk forwards looking down into the hole, walk backwards onto it, or press E. On it: forwards climbs (or
// descends if you look steeply down), backwards descends, jump or E lets go. Gravity is off, you are drawn onto
// the rungs over a fifth of a second, and at the top you step off onto the floor with the game's own mantle
// move. Falling down a shaft you catch the ladder. It runs in the shared player update (Y8), so it behaves the
// same offline, for the online host and for online clients (each client moves its own player, as for all
// movement); everyone else sees your position, and the climbing animation is worked out from it. Only humans
// climb (bots never go underground), and only inside a ladder's own volume: no wall climbing anywhere else.
//
// Online: both doors (cabin and bookcase) are the core's own doors (Po.door), so they open and close exactly like
// the Jailbreak doors: the host decides, clients send their E press as a "door" action and everyone gets the
// door event; they are shut again every round. The hatch lids are cosmetic (they lift when someone is in the top
// of a shaft), worked out on each screen from players' positions.
//
// Bots never come in: the cabin's old solid box stays in the map switched off, so physics ignores it but the
// bots' walk grid (which does not look at `off`) still sees a solid cabin; everything below is a separate area of
// the walk grid, so 58-pathfinding.js refuses any goal down there at once. They also leave the two doors alone.
// Spawns are fixed points on the surface, so nobody respawns inside.
//
// Drawing: everything is merged by material into four groups (cabin, house, tunnels, hatches) that are only
// drawn when the camera could see them; the house and tunnel materials are told how far underground each pixel
// is, so the sun and sky do not light them (warm "baked" fill instead); the map's interior lamps light them for
// real (the nearest few, as on every map, within 59-lights.js's budget), with emissive fixtures everywhere else.
// Dev: window.__bpCabin() reports the state, window.__bpCabinGo(name) teleports you round the route.

// ---------------------------------------------------------------- layout (metres; x east, z south, y up)
// Heights: the cabin's floor and ceiling; the landing where the grand stair turns (and the wine cellar); the
// house's floor and ceiling (rooms 4.4 m high, the ground 0.6 m over them); the tunnels' floor and crown. Every
// stair and passage keeps at least 2.4 m of headroom over it and is at least 1.4 m wide (the character is
// 1.8 m tall and 0.72 m across: lower than that, its head catches the ceiling's edge on the way down).
const __FH_Y = { CF: 0.33, CC: 2.85, LDG: -3.09, HF: -5.0, HC: -0.6, TF: -9.6, TC: -6.0 };
// open spaces: id, x0, z0, x1, z1, y0, y1, style, callout, drawing group, flags
//   vault: a barrel vault along that axis; shaft: a vertical shaft; noShell: no walls made for it (the cabin);
//   noVis: not drawn by the generic room drawing; noCeil: no solid ceiling over it
const __FH_V = (() => {
  const { CF, CC, LDG, HF, HC, TF, TC } = __FH_Y,
    v = (id, x0, z0, x1, z1, y0, y1, st, a, g, o = {}) => ({ id, b: [x0, z0, x1, z1, y0, y1], st, a, g, ...o }),
    d = (id, x0, z0, x1, z1, h, a, o) => v(id, x0, z0, x1, z1, HF, HF + h, 'door', a, 'house', o);
  return [
    // the cabin; the grand stair: its first flight goes down westwards across the back of the cabin (open to the
    // cabin's ceiling all the way down), the landing (with the wine cellar's door), the second flight south into
    // the entrance hall
    v('C', 51.8, 4.3, 57.2, 7.3, CF, CC, 'cabin', 'Cabin', 'cabin', { noShell: 1, noVis: 1 }),
    v('S1', 51.8, 4.35, 57.2, 5.75, LDG, CC, 'stair', 'Grand Stair', 'cabin', { noCeil: 1, noFloorVis: 1, noCeilVis: 1, wallTop: CF, shellTop: 0 }),
    v('L', 49.4, 3.0, 51.8, 5.75, LDG, HC, 'stair', 'Grand Stair', 'cabin'),
    v('S2', 49.4, 5.75, 51.4, 8.85, HF, HC, 'stair', 'Grand Stair', 'house'),
    // the wine cellar off the landing, and its own stair down to the library (a second way into the house)
    v('DW', 49.0, 3.3, 49.4, 4.9, LDG, -0.65, 'door', 'Wine Cellar', 'cabin'),
    v('WC', 41.0, 1.6, 49.0, 5.75, LDG, HC, 'wine', 'Wine Cellar', 'house'),
    v('S3', 41.6, 5.75, 43.2, 8.85, HF, HC, 'stair', 'Cellar Stair', 'house'),
    // the house: entrance hall, library, dining room on the north side; a gallery across the middle; lounge,
    // great room and kitchen on the south side. Doors between neighbours and onto the gallery: every room has
    // two ways in or more
    v('GH', 46.5, 8.85, 58.5, 16.0, HF, HC, 'hall', 'Entrance Hall', 'house', { coffer: 1 }),
    v('LB', 36.5, 8.85, 46.1, 16.0, HF, HC, 'library', 'Library', 'house'),
    v('DR', 58.9, 8.85, 70.5, 16.0, HF, HC, 'dining', 'Dining Room', 'house', { coffer: 1 }),
    v('G', 36.5, 16.4, 74.5, 18.8, HF, -2.0, 'gallery', 'Gallery', 'house'),
    v('LG', 36.5, 19.2, 46.1, 27.5, HF, HC, 'lounge', 'Lounge', 'house'),
    v('GR', 46.5, 19.2, 62.0, 27.5, HF, HC, 'great', 'Great Room', 'house'),
    v('KT', 62.4, 19.2, 74.5, 27.5, HF, HC, 'kitchen', 'Kitchen', 'house'),
    d('D1', 46.1, 11.5, 46.5, 13.5, 2.8, 'Library'),
    d('D2', 58.5, 10.9, 58.9, 14.0, 3.2, 'Dining Room'),
    d('D3', 39.5, 16.0, 41.5, 16.4, 2.6, 'Gallery'),
    d('D5', 50.0, 16.0, 55.0, 16.4, 2.9, 'Gallery'),
    d('D6', 63.0, 16.0, 65.0, 16.4, 2.6, 'Gallery'),
    d('D7', 39.5, 18.8, 41.5, 19.2, 2.6, 'Gallery'),
    d('D8', 49.5, 18.8, 59.0, 19.2, 2.9, 'Gallery'),
    d('D9', 67.0, 18.8, 69.0, 19.2, 2.6, 'Gallery'),
    d('D10', 46.1, 21.5, 46.5, 24.5, 2.8, 'Great Room'),
    d('D11', 62.0, 21.5, 62.4, 24.5, 2.8, 'Kitchen'),
    // the secret: a bookcase in the library's west wall, a stone room behind it, a shaft down to the tunnels
    d('D4', 36.1, 11.75, 36.5, 13.25, 2.5, 'Secret Room', { secret: 1 }),
    v('SR', 31.0, 10.4, 36.1, 14.6, HF, -2.4, 'stone', 'Secret Room', 'house'),
    v('SH', 32.4, 12.3, 33.9, 13.8, TC, HF, 'stone', 'Secret Shaft', 'house', { shaft: 1, noFloorVis: 1, noCeilVis: 1 }),
    // the tunnels: chambers (square, coffered) joined by vaulted tunnels, 3.5 m wide and 3.6 m high
    v('C0', 31.15, 12.3, 35.15, 16.3, TF, TC, 'chamber', 'Tunnels – Shaft Foot', 'tun'),
    v('T1', 31.4, 16.3, 34.9, 27.0, TF, TC, 'tunnel', 'Tunnels – North', 'tun', { vault: 'z' }),
    v('J', 28.15, 27.0, 38.15, 37.0, TF, -5.5, 'chamber', 'Tunnels – Junction', 'tun', { grand: 1 }),
    v('W1', 17.25, 30.25, 28.15, 33.75, TF, TC, 'tunnel', 'Tunnels – West', 'tun', { vault: 'x' }),
    v('CW', 13.25, 30.0, 17.25, 34.0, TF, TC, 'chamber', 'Tunnels – West', 'tun'),
    v('W2', 13.5, 34.0, 17.0, 66.0, TF, TC, 'tunnel', 'Tunnels – West', 'tun', { vault: 'z' }),
    v('EL', 13.25, 66.0, 17.25, 70.0, TF, TC, 'chamber', 'Tunnels – A Long Exit', 'tun'),
    v('SL', 13.25, 67.75, 14.75, 69.25, TC, 0, 'shaft', 'Tunnels – A Long Exit', 'tun', { shaft: 1, noFloorVis: 1, noCeilVis: 1 }),
    v('SS', 31.4, 37.0, 34.9, 54.75, TF, TC, 'tunnel', 'Tunnels – South', 'tun', { vault: 'z' }),
    v('CS', 31.15, 54.75, 35.15, 58.75, TF, TC, 'chamber', 'Tunnels – South', 'tun'),
    v('TM', 35.15, 55.0, 67.2, 58.5, TF, TC, 'tunnel', 'Tunnels – Mid', 'tun', { vault: 'x' }),
    v('EM', 67.2, 54.75, 71.2, 58.75, TF, TC, 'chamber', 'Tunnels – Mid Exit', 'tun'),
    v('SM', 68.25, 57.25, 69.75, 58.75, TC, 0, 'shaft', 'Tunnels – Mid Exit', 'tun', { shaft: 1, noFloorVis: 1, noCeilVis: 1 }),
    v('E1', 38.15, 30.25, 74.0, 33.75, TF, TC, 'tunnel', 'Tunnels – East', 'tun', { vault: 'x' }),
    v('EV', 74.0, 29.0, 80.0, 35.0, TF, -5.7, 'chamber', 'Tunnels – East', 'tun'),
    v('E2', 80.0, 30.25, 110.5, 33.75, TF, TC, 'tunnel', 'Tunnels – East', 'tun', { vault: 'x' }),
    v('CE', 110.5, 30.0, 114.5, 34.0, TF, TC, 'chamber', 'Tunnels – East', 'tun'),
    v('E3', 110.75, 26.25, 114.25, 30.0, TF, TC, 'tunnel', 'Tunnels – East', 'tun', { vault: 'z' }),
    v('EB', 110.5, 22.25, 114.5, 26.25, TF, TC, 'chamber', 'Tunnels – B Exit', 'tun'),
    v('SB', 111.75, 22.25, 113.25, 23.75, TC, 0, 'shaft', 'Tunnels – B Exit', 'tun', { shaft: 1, noFloorVis: 1, noCeilVis: 1 }),
  ];
})();
// ladders: where the climber stands (x, z), the way they face (fx, fz: towards the rungs, and the way they step
// off at the top), the floors at the foot and the top, where the top step-off lands, the shaft's footprint (a
// faller inside it grabs the ladder), and the hatch (-1: none). Shafts are 1.5 m square.
const __FH_LAD = [
  { id: 'cellar', x: 33.15, z: 12.72, fx: 0, fz: -1, y0: __FH_Y.TF, y1: __FH_Y.HF, top: [33.15, __FH_Y.HF, 11.75], zone: [32.4, 12.3, 33.9, 13.8], hatch: -1, name: 'Secret shaft' },
  { id: 'long', x: 13.67, z: 68.5, fx: -1, fz: 0, y0: __FH_Y.TF, y1: 0.12, top: [12.52, 0.12, 68.5], zone: [13.25, 67.75, 14.75, 69.25], hatch: 0, name: 'A Long exit' },
  { id: 'mid', x: 69.0, z: 58.33, fx: 0, fz: 1, y0: __FH_Y.TF, y1: 0.12, top: [69.0, 0.12, 59.42], zone: [68.25, 57.25, 69.75, 58.75], hatch: 1, name: 'Mid exit' },
  { id: 'b', x: 112.5, z: 22.67, fx: 0, fz: -1, y0: __FH_Y.TF, y1: 0.12, top: [112.5, 0.12, 21.58], zone: [111.75, 22.25, 113.25, 23.75], hatch: 2, name: 'B exit' },
];
// furniture (solid): kind, centre x, z, quarter turns (0: its front faces +z, 1: +x, 2: -z, 3: -x), floor, width,
// flags. Kinds drawn with a Poly Haven model when it has loaded (sofa, arm, coffee, side, console, plant, bust):
// the model is scaled to the width here, so what you bump into is what you see.
const __FH_FS = { sofa: [2.2, 0.95, 0.95], arm: [0.85, 0.85, 1.05], coffee: [1.0, 1.0, 0.42], side: [0.55, 0.5, 0.55], sideboard: [2.0, 0.5, 0.9], clock: [0.55, 0.35, 2.1], tree: [1.2, 1.2, 3.6], fire: [2.4, 0.6, 1.4], fire2: [3.4, 0.8, 1.6], shelf: [2.5, 0.4, 2.9], desk: [1.8, 0.85, 0.78], globe: [0.6, 0.6, 1.1], island: [3.0, 1.0, 0.92], counter: [1, 0.65, 0.92], range: [1.2, 0.7, 0.92], fridge: [1.0, 0.72, 2.2], rtable: [1.0, 1.0, 0.76], rtable2: [1.4, 1.4, 0.78], dtable: [5.0, 1.2, 0.78], chair: [0.48, 0.48, 1.0], stool: [0.4, 0.4, 0.75], bench: [1.6, 0.45, 0.5], console: [1.3, 0.5, 0.82], coat: [0.45, 0.45, 1.8], crate: [0.8, 0.8, 0.8], work: [1.1, 0.7, 0.9], piano: [1.5, 0.6, 1.3], barrel: [0.6, 0.6, 0.95], tbench: [1.6, 0.45, 0.48], plant: [0.7, 0.7, 1.3], bust: [0.45, 0.45, 1.7], rack: [1.0, 0.4, 2.3] };
const __FH_F = (() => {
  const { CF, LDG, HF, TF } = __FH_Y;
  return [
    // the entrance hall: a round table under the chandelier, palms in the corners, busts by the gallery doors, a
    // console with a mirror
    ['rtable2', 52.5, 12.4, 0, HF], ['plant', 47.15, 9.5, 0, HF], ['plant', 57.85, 9.5, 0, HF], ['plant', 47.15, 15.35, 0, HF], ['plant', 57.85, 15.35, 0, HF],
    ['bust', 49.4, 15.6, 2, HF], ['bust', 55.6, 15.6, 2, HF], ['console', 54.8, 9.1, 0, HF],
    // the great room: a big stone fireplace, a sofa and armchairs round a table, the tree, palms
    ['fire2', 54.2, 27.1, 2, HF], ['sofa', 54.2, 23.2, 0, HF], ['coffee', 54.2, 24.85, 0, HF], ['arm', 52.0, 25.0, 1, HF], ['arm', 56.4, 25.0, 3, HF],
    ['side', 52.7, 23.2, 0, HF], ['side', 55.7, 23.2, 0, HF], ['tree', 60.2, 25.8, 0, HF], ['plant', 47.15, 19.85, 0, HF], ['plant', 61.35, 19.85, 0, HF], ['plant', 47.15, 26.85, 0, HF],
    // the lounge: a second fireplace in the west wall, a sofa facing it, armchairs, books, a palm
    ['fire', 36.8, 23.35, 1, HF], ['sofa', 40.3, 23.35, 3, HF], ['arm', 38.5, 21.35, 0, HF], ['arm', 38.5, 25.35, 2, HF], ['coffee', 38.6, 23.35, 0, HF],
    ['shelf', 42.6, 27.3, 2, HF, 3.0], ['plant', 45.45, 19.85, 0, HF], ['side', 41.2, 21.55, 0, HF],
    // the kitchen: units round two walls, a range, a tall fridge, an island with stools
    ['counter', 74.175, 21.0, 3, HF, 3.0, 'window'], ['counter', 74.175, 24.75, 3, HF, 4.5], ['counter', 65.0, 27.175, 2, HF, 4.0], ['range', 67.6, 27.15, 2, HF], ['counter', 70.6, 27.175, 2, HF, 4.8],
    ['fridge', 63.2, 19.56, 0, HF], ['island', 68.6, 23.3, 0, HF], ['stool', 67.8, 22.4, 0, HF], ['stool', 68.6, 22.4, 0, HF], ['stool', 69.4, 22.4, 0, HF],
    // the dining room: a long table for twelve, a sideboard, palms
    ['dtable', 64.7, 12.4, 0, HF], ['console', 64.7, 9.1, 0, HF], ['plant', 59.5, 9.45, 0, HF], ['plant', 69.9, 9.45, 0, HF], ['plant', 69.9, 15.4, 0, HF],
    ...[62.7, 63.7, 64.7, 65.7, 66.7].flatMap((x) => [['chair', x, 11.35, 0, HF], ['chair', x, 13.45, 2, HF]]), ['chair', 61.75, 12.4, 1, HF], ['chair', 67.65, 12.4, 3, HF],
    // the library: bookcases on three walls (the one in the middle of the west wall is the door), a desk, a
    // reading chair, a globe
    ['shelf', 39.0, 9.05, 0, HF, 4.6], ['shelf', 44.6, 9.05, 0, HF, 2.8], ['shelf', 37.95, 15.8, 2, HF, 2.7], ['shelf', 43.75, 15.8, 2, HF, 4.1],
    ['shelf', 36.7, 10.45, 1, HF, 2.6], ['shelf', 36.7, 14.4, 1, HF, 2.3], ['desk', 44.4, 10.6, 0, HF], ['chair', 44.4, 9.75, 0, HF], ['arm', 44.6, 14.6, 2, HF], ['globe', 39.0, 14.8, 0, HF],
    // the wine cellar: racks of bottles, barrels, a tasting table
    ['rack', 45.0, 1.8, 0, LDG, 7.6], ['rack', 41.2, 3.5, 1, LDG, 3.0], ['barrel', 48.4, 2.3, 0, LDG], ['barrel', 47.7, 2.3, 0, LDG], ['barrel', 48.4, 5.35, 0, LDG],
    ['rtable', 45.2, 3.3, 0, LDG], ['chair', 44.45, 3.3, 1, LDG], ['chair', 45.95, 3.3, 3, LDG],
    // the gallery's busts, the cabin's bench, the secret room
    ['bust', 36.95, 17.6, 1, HF], ['bust', 74.05, 17.6, 3, HF], ['bench', 52.03, 6.5, 1, CF, 1.1],
    ['work', 35.0, 14.25, 2, HF], ['crate', 31.5, 14.1, 0, HF], ['barrel', 31.4, 10.9, 0, HF],
    // the junction's and the vestibule's benches
    ['tbench', 28.375, 35.4, 1, TF], ['tbench', 37.925, 28.6, 3, TF], ['tbench', 77.0, 29.225, 0, TF],
  ];
})();
// railings (solid, waist high): along the cabin's stairwell and round the shaft in the secret room
const __FH_RAIL = [
  [51.8, 5.72, 55.8, 5.8, __FH_Y.CF],
  [33.9, 12.3, 33.98, 13.88, __FH_Y.HF], [32.4, 13.8, 33.98, 13.88, __FH_Y.HF], [32.32, 12.3, 32.4, 13.88, __FH_Y.HF],
];
// the map's interior lamps below ground (real lights; the nearest few are lit, as on every map)
const __FH_LIGHTS = [
  [53.5, -0.9, 5.0], [50.4, -1.1, 4.2], [45.0, -1.1, 3.6], [52.5, -1.2, 10.4], [52.5, -1.2, 14.6], [41.3, -1.2, 12.4], [64.7, -1.2, 11.2], [64.7, -1.2, 14.0],
  [42.0, -2.5, 17.6], [55.0, -2.5, 17.6], [68.0, -2.5, 17.6], [50.5, -1.2, 23.3], [58.0, -1.2, 23.3], [54.2, -4.2, 26.3], [41.3, -1.2, 23.3], [37.4, -4.4, 23.35], [68.5, -1.2, 23.3], [33.6, -2.9, 11.6],
  [33.15, -6.4, 14.6], [33.15, -6.4, 22], [33.15, -5.9, 32], [22.5, -6.4, 32], [15.25, -6.4, 32], [15.25, -6.4, 42], [15.25, -6.4, 51], [15.25, -6.4, 60], [15.25, -6.4, 68],
  [33.15, -6.4, 45.5], [33.15, -6.4, 56.75], [44, -6.4, 56.75], [52, -6.4, 56.75], [60, -6.4, 56.75], [69.2, -6.4, 56.2],
  [46, -6.4, 32], [54, -6.4, 32], [62, -6.4, 32], [70, -6.4, 32], [77, -6.1, 32], [87, -6.4, 32], [95, -6.4, 32], [103, -6.4, 32], [112.5, -6.4, 32], [112.5, -6.4, 25],
];
// the Poly Haven furniture (CC0, already in the game for the cinema: 72-cinema-view.js) used in the house, and
// the size each is scaled to (metres across, or tall when `h`)
const __FH_MODELS = { sofa: ['Sofa_01', 2.2], arm: ['ArmChair_01', 0.85], coffee: ['coffee_table_round_01', 1.0], side: ['side_table_01', 0.55], console: ['ClassicConsole_01', 1.3], plant: ['potted_plant_02', 1.3, 'h'], bust: ['marble_bust_01', 0.62, 'h'], vase: ['brass_vase_01', 0.45, 'h'], mirror: ['ornate_mirror_01', 0.95], chandelier: ['Chandelier_02', 1.3] };
const __FH = { tex: {}, planes: {}, cam: { x: 0, y: 50, z: 0 }, under: !1, lid: [0, 0, 0], anim: [0, 0], groups: null, fogUnder: !1, r1: !1, err: null };

// ---------------------------------------------------------------- boxes: subtraction
// a box [x0, y0, z0, x1, y1, z1] less another: up to six pieces
function __fhSub3(a, h) {
  if (h[0] >= a[3] || h[3] <= a[0] || h[1] >= a[4] || h[4] <= a[1] || h[2] >= a[5] || h[5] <= a[2]) return [a];
  const out = [];
  let [x0, y0, z0, x1, y1, z1] = a;
  h[0] > x0 && (out.push([x0, y0, z0, h[0], y1, z1]), (x0 = h[0]));
  h[3] < x1 && (out.push([h[3], y0, z0, x1, y1, z1]), (x1 = h[3]));
  h[2] > z0 && (out.push([x0, y0, z0, x1, y1, h[2]]), (z0 = h[2]));
  h[5] < z1 && (out.push([x0, y0, h[5], x1, y1, z1]), (z1 = h[5]));
  h[1] > y0 && out.push([x0, y0, z0, x1, h[1], z1]);
  h[4] < y1 && out.push([x0, h[4], z0, x1, y1, z1]);
  return out;
}
const __fhSubAll = (list, holes) => {
  let cur = list;
  for (const h of holes) cur = cur.flatMap((a) => __fhSub3(a, h));
  return cur.filter((a) => a[3] - a[0] > 0.005 && a[4] - a[1] > 0.005 && a[5] - a[2] > 0.005);
};
// a rectangle [u0, w0, u1, w1] less another
const __fhSub2 = (r, h) => __fhSub3([r[0], 0, r[1], r[2], 1, r[3]], [h[0], -1, h[1], h[2], 2, h[3]]).map((q) => [q[0], q[2], q[3], q[5]]).filter((q) => q[2] - q[0] > 0.004 && q[3] - q[1] > 0.004);
const __fhB3 = (v) => [v.b[0], v.b[4], v.b[1], v.b[2], v.b[5], v.b[3]];
// the space a point is in (with a margin), or null
function __fhVolAt(x, y, z, m = 0, my = 0.35) {
  for (const v of __FH_V) {
    const [x0, z0, x1, z1, y0, y1] = v.b;
    if (x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m && y > y0 - my && y < y1 + my) return v;
  }
  return null;
}
// furniture footprint: [x0, z0, x1, z1, y0, y1]
function __fhFoot(f) {
  const [k, cx, cz, r, y0, w0] = f,
    s = __FH_FS[k],
    w = w0 || s[0],
    d = s[1],
    hx = (r % 2 ? d : w) / 2,
    hz = (r % 2 ? w : d) / 2;
  return [cx - hx, cz - hz, cx + hx, cz + hz, y0, y0 + s[2]];
}

// ---------------------------------------------------------------- the map (what the simulation sees)
function __fhMap(A) {
  if (A.__fh) return;
  const { CF, CC, HF, HC } = __FH_Y,
    w = new Po();
  w.m = A; // the core's map builder, writing into this map
  const n0 = A.boxes.length,
    bx = (b, kind, o) => w.box(b[0], b[1], b[2], b[3], b[4], b[5], kind, { pen: 0, mat: 'concrete', __fh: 1, ...o });
  // the cabin: its old solid box stays, switched off (no collision, no bullets) but still solid on the bots'
  // walk grid, which does not look at `off`; walls, a floor with the stairwell in it and a ceiling replace it
  const cab = A.boxes.find((b) => b.__cabin && Math.abs(b.min.x - 51.5) < 0.05 && Math.abs(b.min.z - 4) < 0.05);
  cab && ((cab.off = !0), (cab.__fhNav = 1));
  const logs = { mat: 'wood', pen: 12 };
  bx([51.5, 0, 4.0, 57.5, 3.2, 4.28], 'wall', logs);
  bx([51.5, 0, 4.0, 51.78, 3.2, 7.6], 'wall', logs);
  bx([57.22, 0, 4.0, 57.5, 3.2, 7.6], 'wall', logs);
  bx([51.5, 0, 7.32, 54.0, 3.2, 7.6], 'wall', logs);
  bx([55.0, 0, 7.32, 57.5, 3.2, 7.6], 'wall', logs);
  bx([54.0, 2.3, 7.32, 55.0, 3.2, 7.6], 'wall', logs);
  bx([51.5, CC, 4.0, 57.5, 4.4, 7.6], 'roof', { mat: 'wood', pen: 4 });
  const S1 = __fhB3(__FH_V[1]);
  for (const b of __fhSubAll([[51.78, -0.5, 4.28, 57.22, CF, 7.32], [54.0, 0, 7.32, 55.0, CF, 7.6]], [S1])) bx(b, 'floor', { mat: 'wood', pen: 3 });
  bx([53.75, 0, 7.6, 55.25, 0.18, 8.1], 'floor', { mat: 'concrete' }); // the stone step at the door
  // every space below ground: walls round it, a floor slab under it and solid ground over it up to y = 0, less
  // all the spaces (so doorways, stairwells and shafts open where spaces meet)
  const T = 0.5,
    shells = [];
  for (const v of __FH_V) {
    if (v.noShell) continue;
    const [x0, z0, x1, z1, y0, y1v] = v.b,
      // (the stairwell's walls stop at the ground: above it, in the cabin, the cabin's walls and floor take over,
      // and outside the cabin nothing may stand)
      y1 = v.shellTop ?? y1v,
      fy = y0 - 0.4,
      mat = v.st === 'tunnel' || v.st === 'chamber' || v.st === 'shaft' || v.st === 'stone' ? 'concrete' : 'plaster';
    shells.push(['wall', [x0 - T, fy, z0 - T, x0, y1, z1 + T], mat], ['wall', [x1, fy, z0 - T, x1 + T, y1, z1 + T], mat], ['wall', [x0, fy, z0 - T, x1, y1, z0], mat], ['wall', [x0, fy, z1, x1, y1, z1 + T], mat]);
    v.shaft || shells.push(['floor', [x0 - T, fy, z0 - T, x1 + T, y0, z1 + T], mat]);
    v.noCeil || y1 >= 0 || shells.push(['roof', [x0 - T, y1, z0 - T, x1 + T, 0, z1 + T], 'dirt']);
  }
  const all = __FH_V.map(__fhB3);
  for (const [kind, b, mat] of shells) for (const p of __fhSubAll([b], all)) bx(p, kind, { mat });
  // the stairs (steps the physics turns into smooth slopes, 34-physics.js): the first flight rises east from the
  // landing to the cabin floor, the second rises north from the hall to the landing
  for (const s of __fhSteps()) bx(s.b, 'stair', { mat: 'wood', pen: 3 });
  // furniture and railings
  for (const f of __FH_F) {
    const [x0, z0, x1, z1, y0, y1] = __fhFoot(f);
    bx([x0, y0, z0, x1, y1, z1], 'prop', { mat: 'wood', pen: 3, __fhFurn: f[0] });
  }
  for (const [x0, z0, x1, z1, y] of __FH_RAIL) bx([x0, y, z0, x1, y + 1.0, z1], 'prop', { mat: 'wood', pen: 4, __fhRail: 1 });
  // the hatches over the exit shafts: solid to walk on (the ladder takes you through), a step 12 cm high
  for (const L of __FH_LAD) {
    if (L.hatch < 0) continue;
    const cx = (L.zone[0] + L.zone[2]) / 2,
      cz = (L.zone[1] + L.zone[3]) / 2;
    bx([cx - 0.95, 0, cz - 0.95, cx + 0.95, 0.12, cz + 0.95], 'floor', { mat: 'metal', pen: 0, __fhHatch: L.hatch });
  }
  // the doors: the core's own (E to open, shut every round, synced online like every door). The cabin's opens
  // inwards; the bookcase swings into the secret room on a hinge at its south corner (drawn so; the core's
  // door record keeps its hinge at the north end, which only matters for who is near enough to press E)
  const dc = A.doors.length;
  w.door(!0, 54.03, 7.46, CF, 0.94, 1.97, 1, '#7a2a20');
  const db = A.doors.length;
  w.door(!1, 11.75, 36.1, HF, 1.5, 2.5, 1, '#5c3b24');
  const book = A.doors[db].box;
  book.min.x = 36.1;
  book.max.x = 36.44;
  book.mat = 'wood';
  // where each leaf rests when open: solid while open (switched in the view's tick, once nobody stands there)
  const lc = bx([53.96, CF, 6.48, 54.1, CF + 1.97, 7.46], 'door', { mat: 'wood', pen: 4, door: dc, off: !0, __leaf: 1 }),
    lb = bx([34.58, HF, 12.88, 36.1, HF + 2.5, 13.25], 'door', { mat: 'wood', pen: 4, door: db, off: !0, __leaf: 1 });
  A.doors[dc].__fhDoor = 'cabin';
  A.doors[db].__fhDoor = 'book';
  // holes in the physics' ground slab where a space passes through it (-2 .. 0)
  const holes = [];
  for (const v of __FH_V) if (!v.noShell && v.b[5] > -2.05 && v.b[4] < 0.05) holes.push([v.b[0] - T, v.b[1] - T, v.b[2] + T, v.b[3] + T]);
  // the map's lamps: the house and tunnel lamps are a separate list, used while the camera is below ground (so a
  // lamp up in the spawn never lights the floor of a room under it, and the other way round)
  let base = A.lights;
  const lamp = { pos: z(54.5, 2.45, 6.1), interior: !0 },
    under = [lamp, ...__FH_LIGHTS.map(([x, y, zz]) => ({ pos: z(x, y, zz), interior: !0 }))];
  base.push(lamp);
  Object.defineProperty(A, 'lights', {
    configurable: !0,
    enumerable: !0,
    get: () => (__FH.under ? under : base),
    set: (v) => (base = v),
  });
  A.__fh = { dc, db, lc, lb, holes, nBoxes: A.boxes.length - n0 };
  // bots open doors they walk into (the core's r1, replaced by 67-jailbreak.js): not the house's (the cabin's,
  // the bookcase, the kitchen fridge's: 65b-frostline-wonderland.js)
  if (!__FH.r1) {
    __FH.r1 = !0;
    const prevR1 = r1;
    r1 = function (st) {
      const m = aw(),
        F = m.__fh,
        mine = F ? m.doors.filter((d) => d && d.__fhDoor && !d.open) : [];
      for (const d of mine) d.open = !0;
      try {
        return prevR1.apply(this, arguments);
      } finally {
        for (const d of mine) d.open = !1;
      }
    };
  }
}
// the steps: { b: box, top, flight, run } (34-physics.js lays a smooth ramp over each flight, so the steps are
// walked up and down like a slope; the steps stay for the eye, bullets and the bots' walk grid)
function __fhSteps() {
  if (__FH.steps) return __FH.steps;
  const { CF, LDG, HF } = __FH_Y,
    out = [];
  // the grand stair's first flight: 17 steps of 19 cm from the cabin floor (east end, x 57.2) down to the landing
  const n1 = 17,
    run1 = (57.2 - 51.8) / n1,
    r1h = (CF - LDG) / (n1 + 1);
  for (let k = 1; k <= n1; k++) out.push({ b: [57.2 - run1 * k, LDG - 0.4, 4.35, 57.2 - run1 * (k - 1), CF - r1h * k, 5.75], top: CF - r1h * k, f: 1 });
  // the second flight (landing to the entrance hall) and the cellar stair (wine cellar to the library): 9 steps
  // each, going down southwards
  const n2 = 9,
    r2h = (LDG - HF) / (n2 + 1);
  for (const [f, x0, x1] of [[2, 49.4, 51.4], [3, 41.6, 43.2]])
    for (let k = 1; k <= n2; k++) out.push({ b: [x0, HF - 0.4, 5.75 + 0.31 * (k - 1), x1, LDG - r2h * k, 5.75 + 0.31 * k], top: LDG - r2h * k, f });
  return (__FH.steps = out);
}
{
  const prevBuild = XE.frostline;
  XE.frostline = function () {
    const A = prevBuild.apply(this, arguments);
    try {
      __fhMap(A);
    } catch (e) {
      __FH.err = String(e && e.stack);
      console.warn('[cabin] map', e);
    }
    return A;
  };
}

// ---------------------------------------------------------------- physics: holes in the ground slab
function __fhGround(m) {
  const P = __PHX,
    R = P.R,
    w = P.world,
    F = m.__fh;
  if (!F || !F.holes.length || !P.ground) return;
  w.removeCollider(P.ground, !1);
  const pieces = __fhSubAll([[-40, -2, -40, m.w + 40, 0, m.d + 40]], F.holes.map((h) => [h[0], -3, h[1], h[2], 1, h[3]]));
  P.ground = null;
  for (const [x0, , z0, x1, , z1] of pieces) {
    const c = w.createCollider(
      R.ColliderDesc.cuboid((x1 - x0) / 2, 1, (z1 - z0) / 2)
        .setTranslation((x0 + x1) / 2, -1, (z0 + z1) / 2)
        .setCollisionGroups(__cg(__CG.ENV, __CG.ALL))
        .setFriction(0.8),
    );
    P.ground || (P.ground = c);
  }
  w.step(P.events); // (scene queries see new colliders after a step)
}
{
  const prevPhxBuild = __phxBuild;
  __phxBuild = function (m) {
    prevPhxBuild.apply(this, arguments);
    try {
      m && m.__fh && __fhGround(m);
    } catch (e) {
      __FH.err = String(e && e.stack);
      console.warn('[cabin] ground', e);
    }
  };
}
// Movement below ground: 34-physics.js's character move, without its last line (which puts anyone below y = 0
// back up to 0). Used only inside the house and the tunnels.
function __fhMove(w, dt) {
  const P = __PHX,
    k = P.kcc,
    c = __phxChar(w);
  let hh = Math.max(0.05, tQ(w) / 2 - PQ);
  if (hh > c.hh + 0.004) {
    const cy = w.pos.y + PQ + hh + __KCC.offset;
    const blocked = P.world.intersectionWithShape({ x: w.pos.x, y: cy, z: w.pos.z }, __idQ, __phxCapsule(hh), P.R.QueryFilterFlags.EXCLUDE_SENSORS, __cg(__CG.ALL, __CG.ENV), void 0, void 0, __kccPred);
    if (blocked) {
      w.crouch = Math.min(1, Math.max(0, (kO - 2 * (c.hh + PQ)) / (kO - p4)));
      hh = c.hh;
    }
  }
  if (Math.abs(hh - c.hh) > 0.001) {
    c.probe.setHalfHeight(hh);
    c.hh = hh;
  }
  const lift = PQ + hh + __KCC.offset;
  c.probe.setTranslation({ x: w.pos.x, y: w.pos.y + lift, z: w.pos.z });
  const stick = w.onGround && w.vel.y <= 0;
  __kv.x = w.vel.x * dt;
  __kv.y = stick ? 0 : w.vel.y * dt;
  __kv.z = w.vel.z * dt;
  k.computeColliderMovement(c.probe, __kv, P.R.QueryFilterFlags.EXCLUDE_SENSORS, __CF.kcc, __kccPred);
  P.stats.kcc++;
  const mv = k.computedMovement();
  let nx = w.pos.x + mv.x,
    ny = w.pos.y + mv.y,
    nz = w.pos.z + mv.z;
  const stepped = stick && __phxStepUp(w, c, k, lift, mv);
  stepped && ((nx = stepped.x), (ny = stepped.y), (nz = stepped.z));
  for (let i = 0, n = stepped ? 0 : k.numComputedCollisions(); i < n; i++) {
    const h = k.computedCollision(i);
    if (!h) continue;
    const N = h.normal1;
    if (N.y > 0.6) continue;
    if (N.y < -0.6) {
      w.vel.y > 0 && (w.vel.y = 0);
      continue;
    }
    const L = Math.hypot(N.x, N.z) || 1,
      ex = N.x / L,
      ez = N.z / L,
      into = w.vel.x * ex + w.vel.z * ez;
    into < 0 && ((w.vel.x -= into * ex), (w.vel.z -= into * ez));
  }
  // other characters push apart (as above ground)
  const st = eA.state;
  if (st) {
    let px = 0,
      pz = 0;
    for (const o of st.players) {
      if (o === w || !o.alive) continue;
      const dy = o.pos.y - ny;
      if (dy > tQ(w) - 0.1 || -dy > tQ(o) - 0.1) continue;
      const dx = nx - o.pos.x,
        dz = nz - o.pos.z,
        d = Math.hypot(dx, dz),
        min = PQ * 2;
      if (d >= min) continue;
      const push = min - d;
      d > 1e-4 ? ((px += (dx / d) * push), (pz += (dz / d) * push)) : (px += push);
    }
    if (px || pz) {
      c.probe.setTranslation({ x: nx, y: ny + lift, z: nz });
      __kv.x = px;
      __kv.y = 0;
      __kv.z = pz;
      k.computeColliderMovement(c.probe, __kv, P.R.QueryFilterFlags.EXCLUDE_SENSORS, __CF.kcc, __kccPred);
      const m2 = k.computedMovement();
      nx += m2.x;
      nz += m2.z;
    }
  }
  stick && !stepped && w.pos.y - ny > 0.08 && w.pos.y - ny <= __KCC.snap + 0.01 && (w.__stepOff = Math.max(-0.5, (w.__stepOff || 0) - (w.pos.y - ny)));
  w.pos.x = nx;
  w.pos.y = ny;
  w.pos.z = nz;
  const grounded = k.computedGrounded() && w.vel.y <= 0.01;
  grounded ? (w.vel.y < 0 && (w.vel.y = 0), (w.onGround = !0)) : (w.onGround = !1);
}
// Over (or in) any space that goes below ground, whatever your height. (Testing only "below y = 0" was the bug
// that stopped people at the top of the grand stair: standing on the cabin floor you were above 0, so the
// usual move ran, put you on the first step down at y = -0.05, and its clamp lifted you straight back to 0,
// every frame: you hovered over the stairwell at floor height until the cabin's west wall stopped you.)
function __fhOverBelow(p) {
  for (const v of __FH_V) {
    const [x0, z0, x1, z1, y0, y1] = v.b;
    if (y0 >= -0.05) continue;
    if (p.x > x0 - 0.6 && p.x < x1 + 0.6 && p.z > z0 - 0.6 && p.z < z1 + 0.6 && p.y > y0 - 1 && p.y < Math.max(y1, 0.4) + 0.5) return !0;
  }
  return !1;
}
{
  const prevH4 = h4;
  h4 = function (w, A, i) {
    // on a ladder the ladder moves you (Y8 below)
    if (w && w.__fhLad) return;
    try {
      if (A > 0 && w.pos.y < 3.5 && aw().__fh && __phxOn() && i === __PHX.map.boxes && __fhOverBelow(w.pos)) return __fhMove(w, A);
    } catch (e) {
      __FH.err = String(e && e.stack);
    }
    return prevH4.apply(this, arguments);
  };
}
// the floor under a point (the core's z4, behind rm()): below ground there is no floor at 0, only the boxes
{
  const prevZ4 = z4;
  z4 = function (x, zz, y, boxes, B = 0.06) {
    if (!(y < -0.3) || !aw().__fh) return prevZ4.apply(this, arguments);
    let g = -1e9;
    Ge(boxes).query(x - 0.05, zz - 0.05, x + 0.05, zz + 0.05, (n) => {
      n.off || x < n.min.x || x > n.max.x || zz < n.min.z || zz > n.max.z || n.max.y > y + B || (g = Math.max(g, n.max.y));
    });
    return g > -1e8 ? g : prevZ4.apply(this, arguments);
  };
}
// the death ragdoll has a hard floor at y = 0 (made, and in every step): below ground the boxes are the floor
{
  const prevFrom = yZ.from;
  yZ.from = function (s) {
    let under = !1;
    try {
      const K = s && s.parent;
      under = !!(K && aw().__fh && K.position.y < -0.4);
    } catch (e) {}
    if (!under) return prevFrom.apply(this, arguments);
    const saved = Xb.slice();
    for (let k = 0; k < Xb.length; k++) Xb[k] = -1e9;
    let r;
    try {
      r = prevFrom.apply(this, arguments);
    } finally {
      for (let k = 0; k < Xb.length; k++) Xb[k] = saved[k];
    }
    r && (r.__fhUnder = 1);
    return r;
  };
  const prevCollide = yZ.prototype.collide;
  yZ.prototype.collide = function (A) {
    if (!this.__fhUnder) return prevCollide.apply(this, arguments);
    // the core's collide(), without its floor at y = 0
    const i = this.pos,
      I = this.prev;
    for (let B = 0; B < nC; B++) {
      const g = B * 3,
        n = Xb[B];
      let e = !1;
      const D = i[g],
        s = i[g + 2];
      A.query(D - n, s - n, D + n, s + n, (C) => {
        if (C.off) return;
        const o = i[g + 1];
        if (D < C.min.x - n || D > C.max.x + n || o < C.min.y - n || o > C.max.y + n || i[g + 2] < C.min.z - n || i[g + 2] > C.max.z + n) return;
        const l = i[g] - (C.min.x - n),
          c = C.max.x + n - i[g],
          t = o - (C.min.y - n),
          j = C.max.y + n - o,
          d = i[g + 2] - (C.min.z - n),
          f = C.max.z + n - i[g + 2],
          a = Math.min(l, c, t, j, d, f);
        a === j ? (i[g + 1] = C.max.y + n) : a === t ? (i[g + 1] = C.min.y - n) : a === l ? (i[g] = C.min.x - n) : a === c ? (i[g] = C.max.x + n) : a === d ? (i[g + 2] = C.min.z - n) : (i[g + 2] = C.max.z + n);
        e = !0;
      });
      e && ((I[g] += (i[g] - I[g]) * 0.35), (I[g + 2] += (i[g + 2] - I[g + 2]) * 0.35), I[g + 1] < i[g + 1] && (I[g + 1] += (i[g + 1] - I[g + 1]) * 0.5));
    }
  };
}
// smoke grenades are put at y >= 0 (34-physics.js): one thrown below ground smokes where it landed
{
  const prevQ1 = Q1;
  Q1 = function (w) {
    const n0 = w && w.smokes ? w.smokes.length : 0,
      low = w && aw().__fh ? w.grenades.filter((g) => g.pos.y < -0.3).map((g) => ({ ...g.pos })) : [];
    const r = prevQ1.apply(this, arguments);
    if (low.length)
      for (let k = n0; k < w.smokes.length; k++) {
        const s = w.smokes[k],
          g = low.find((p) => Math.hypot(p.x - s.pos.x, p.z - s.pos.z) < 0.6);
        g && s.pos.y === 0 && (s.pos.y = g.y - 0.06);
      }
    return r;
  };
}
// footstep surfaces (the core finds them from flat visuals): wood in the cabin and house, tile in the tunnels,
// iron on the hatches and ladders
{
  const prevTE = TE;
  TE = function (m, x, y, zz) {
    try {
      if (m && m.__fh) {
        const s = __fhSurf(x, y, zz);
        if (s) return s;
      }
    } catch (e) {}
    return prevTE.apply(this, arguments);
  };
}
function __fhSurf(x, y, zz) {
  for (const L of __FH_LAD) if (L.hatch >= 0 && Math.abs(y - 0.12) < 0.25 && Math.abs(x - (L.zone[0] + L.zone[2]) / 2) < 0.95 && Math.abs(zz - (L.zone[1] + L.zone[3]) / 2) < 0.95) return 'metal';
  if (x > 51.78 && x < 57.22 && zz > 4.28 && zz < 7.32 && y > 0.1 && y < 1) return 'wood';
  if (y > -0.2) return null;
  const v = __fhVolAt(x, y, zz, 0.05, 0.3);
  if (!v) return null;
  if (v.shaft) return 'metal';
  return v.st === 'kitchen' || v.st === 'tunnel' || v.st === 'chamber' || v.st === 'stone' || v.st === 'wonder' ? 'tile' : 'wood';
}
// the location readout (the core's areas are flat rectangles: below ground they would name the lane above)
function __fhAreaAt(p) {
  if (p.x > 51.78 && p.x < 57.22 && p.z > 4.28 && p.z < 7.32 && p.y > -0.1 && p.y < 3.2) return 'Cabin';
  if (p.y > -0.08) return null;
  const v = __fhVolAt(p.x, p.y, p.z, 0.1, 0.5);
  return v ? v.a : null;
}
{
  const prevLT = LT;
  LT = function (m, p) {
    try {
      if (m && m.__fh && p) {
        const n = __fhAreaAt(p);
        if (n) return n;
      }
    } catch (e) {}
    return prevLT.apply(this, arguments);
  };
}
// the core draws every door as a plain panel: on Frostline the two doors are drawn here instead
{
  const prevDoors = diA;
  diA = function () {
    return aw().__fh ? null : prevDoors.apply(this, arguments);
  };
}

// ---------------------------------------------------------------- ladders
const __fhLadOff = (A) => ((A.__fhLad = null), (A.onLadder = !1));
// which ladder (index) this player grabs now, or -1
function __fhGrab(w, A, i, useEdge) {
  const look = cI(A.yaw, 0);
  for (let k = 0; k < __FH_LAD.length; k++) {
    const L = __FH_LAD[k],
      dx = A.pos.x - L.x,
      dz = A.pos.z - L.z,
      a = dx * L.fx + dz * L.fz, // + : towards the rungs (and, at the top, past them)
      b = Math.abs(-dx * L.fz + dz * L.fx),
      y = A.pos.y,
      facing = look.x * L.fx + look.z * L.fz, // 1: facing the rungs
      fwd = i.forward || 0,
      inZone = A.pos.x > L.zone[0] - 0.1 && A.pos.x < L.zone[2] + 0.1 && A.pos.z > L.zone[1] - 0.1 && A.pos.z < L.zone[3] + 0.1,
      atTop = Math.abs(y - L.y1) < 0.45 && a > -1.0 && a < 1.6 && b < 0.8,
      low = y > L.y0 - 0.3 && y < L.y1 - 0.3 && b < 0.55 && a > -1.05 && a < 0.5;
    if (useEdge && (atTop || low)) return k;
    // walking into it at the foot, facing it
    if (low && A.onGround && fwd > 0.3 && facing > 0.5 && y < L.y0 + 0.5) return k;
    // at the top: forwards while looking steeply down into the hole (any way on a hatch), or (the secret shaft)
    // backwards onto it looking down. Never just by walking over a hatch: it is solid, in the middle of a lane
    if (atTop && ((fwd > 0.3 && A.pitch < -0.6 && (L.hatch >= 0 ? b < 0.6 && Math.abs(a) < 0.7 : facing < -0.2)) || (L.hatch < 0 && fwd < -0.3 && facing > 0.2 && A.pitch < -0.3 && a < 1.2))) return k;
    // falling down the shaft: grab hold (a third of a second after letting go: about a metre's drop, so a jump
    // off near the top of an 8.6 m exit shaft does not end in a fall)
    if (inZone && !A.onGround && A.vel.y < -1 && y < L.y1 - 0.25 && y > L.y0 + 0.3 && w.t - (A.__fhJumpAt ?? -9) > 0.35) return k;
  }
  return -1;
}
const __fhLidPos = (L) => ({ x: (L.zone[0] + L.zone[2]) / 2, y: 0.1, z: (L.zone[1] + L.zone[3]) / 2 });
{
  const prevY8 = Y8;
  Y8 = function (w, A, i, I) {
    let m = null;
    try {
      m = aw();
    } catch (e) {}
    if (!m || !m.__fh || !A || A.isBot || !A.alive || !i || A.mantleT >= 0 || w.mode === 'range') {
      A && A.__fhLad && __fhLadOff(A);
      const r = prevY8.apply(this, arguments);
      A && A.__fhMantle && A.mantleT < 0 && ((A.__fhMantle = 0), (A.vel.x = A.vel.z = 0));
      return r;
    }
    const useEdge = !!i.use && !A.prevUseInput,
      jumpEdge = !!i.jump && !A.prevJumpInput;
    let st = A.__fhLad,
      L = st ? __FH_LAD[st.i] : null,
      consumed = !1;
    if (!L) {
      const k = __fhGrab(w, A, i, useEdge);
      if (k < 0) return prevY8.apply(this, arguments);
      L = __FH_LAD[k];
      st = A.__fhLad = { i: k, k: 0, t: 0, acc: 0 };
      A.onLadder = !0;
      A.vel.x = A.vel.z = A.vel.y = 0;
      A.sprinting = !1;
      A.pos.y = Math.min(A.pos.y, L.y1 - 0.02);
      consumed = useEdge;
      // a hatch creaks open as you go down through it
      L.hatch >= 0 && A.pos.y > -1 && w.fx.push({ type: 'door', pos: __fhLidPos(L), open: !0 });
    }
    const dt = I;
    st.t += dt;
    st.k = Math.min(1, st.k + dt / 0.22);
    // let go: jump (pushed off the rungs), E, or you are somewhere else entirely (respawned, teleported)
    const away = Math.hypot(A.pos.x - L.x, A.pos.z - L.z) > 2.2 || A.pos.y < L.y0 - 1 || A.pos.y > L.y1 + 1;
    if (away || jumpEdge || (useEdge && !consumed && st.t > 0.25)) {
      __fhLadOff(A);
      if (away) return prevY8.apply(this, arguments);
      A.__fhJumpAt = w.t;
      A.onGround = !1;
      A.vel.x = jumpEdge ? -L.fx * 2.6 : 0;
      A.vel.z = jumpEdge ? -L.fz * 2.6 : 0;
      A.vel.y = jumpEdge ? 3.0 : 0;
      const r = prevY8.call(this, w, A, { ...i, jump: !1, use: !1 }, I);
      A.prevJumpInput = !!i.jump;
      A.prevUseInput = !!i.use;
      return r;
    }
    // climb: forwards up (down if you look steeply down), backwards down
    const fwd = i.forward || 0;
    let dir = fwd > 0.3 ? (A.pitch < -0.55 ? -1 : 1) : fwd < -0.3 ? -1 : 0;
    w.phase === 'freeze' && (dir = 0);
    const spd = i.walk ? 1.4 : dir > 0 ? 2.9 : 3.4;
    let y = A.pos.y + dir * spd * dt;
    // the top: step off onto the floor (the game's mantle move, so it is smooth)
    if (dir > 0 && y >= L.y1 - 0.01 && st.k >= 1) {
      __fhLadOff(A);
      A.mantleFrom = { x: A.pos.x, y: L.y1, z: A.pos.z };
      A.mantleTo = { x: L.top[0], y: L.top[1], z: L.top[2] };
      A.mantleT = 0;
      A.vel = { x: 0, y: 0, z: 0 };
      A.__fhMantle = 1;
      A.fallSpeed = 0;
      L.hatch >= 0 && w.fx.push({ type: 'door', pos: __fhLidPos(L), open: !0 });
      return prevY8.apply(this, arguments);
    }
    // the foot: let go standing on the floor
    if (y <= L.y0) {
      y = L.y0;
      if (dir < 0) {
        __fhLadOff(A);
        A.pos.y = L.y0;
        A.vel.x = A.vel.z = A.vel.y = 0;
        A.onGround = !0;
        A.fallSpeed = 0;
        return prevY8.apply(this, arguments);
      }
    }
    y = Math.min(y, L.y1 - 0.01);
    const e = 1 - Math.exp(-dt * 16),
      dy = y - A.pos.y;
    A.pos.x += (L.x - A.pos.x) * e;
    A.pos.z += (L.z - A.pos.z) * e;
    A.pos.y = y;
    // a clank every half metre (the footstep sound, for the surface: iron)
    st.acc += Math.abs(dy);
    st.acc > 0.5 && ((st.acc = 0), i.walk || w.fx.push({ type: 'step', who: A.id, pos: { x: A.pos.x, y: A.pos.y, z: A.pos.z } }));
    const px = A.pos.x,
      py = A.pos.y,
      pz = A.pos.z;
    A.onGround = !0;
    // the rest of the update (aiming, shooting, reloading, switching) as usual, without walking or jumping
    const r = prevY8.call(this, w, A, { ...i, forward: 0, strafe: 0, jump: !1, sprint: !1, crouch: !1, use: consumed ? !1 : i.use }, I);
    A.pos.x = px;
    A.pos.y = py;
    A.pos.z = pz;
    A.vel.x = A.vel.z = 0;
    A.vel.y = dir * spd;
    A.onGround = !0;
    A.fallSpeed = 0;
    A.sprinting = !1;
    A.slideT = 0;
    A.onLadder = !!A.__fhLad;
    A.prevJumpInput = !!i.jump;
    A.prevUseInput = !!i.use;
    A.prevCrouchInput = !!i.crouch;
    return r;
  };
}
// the nearest ladder a (remote) player is climbing, from where they are: off the floor, on the rungs
function __fhLadderOf(p) {
  if (p.__fhLad) return __FH_LAD[p.__fhLad.i];
  for (const L of __FH_LAD) if (Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < 0.32 && p.pos.y > L.y0 + 0.12 && p.pos.y < L.y1 - 0.06) return L;
  return null;
}
// third person: the climbing animation (from the shared clip set), body turned to the rungs, paced by how fast
// the player really moves up or down (backwards when going down, still when hanging there)
{
  const prevLoco = __locoSpeed;
  __locoSpeed = function (v, K, dt) {
    const r = prevLoco.apply(this, arguments);
    try {
      const st = __locoState(v),
        y0 = st.__fhY;
      st.__fhY = v.pos.y;
      if (!v.onLadder || !v.alive || !aw().__fh) return r;
      const L = __fhLadderOf(v);
      if (!L) return r;
      const vy = (v.pos.y - (y0 ?? v.pos.y)) / Math.max(1e-3, Math.min(dt, 0.1));
      st.__fhVy = (st.__fhVy || 0) + (vy - (st.__fhVy || 0)) * Math.min(1, dt * 10);
      const R = jV.realistic;
      R.idle = R.walk = R.run = R.aim = 'ClimbingLadder';
      st.ts = { ClimbingLadder: Math.abs(st.__fhVy) < 0.15 ? 0 : Math.max(-1.6, Math.min(1.6, st.__fhVy / 1.2)) };
      st.yaw = Math.atan2(-L.fx, -L.fz) + Math.PI;
      K.rotation.y = st.yaw;
      return 0;
    } catch (e) {
      return r;
    }
  };
}

// ---------------------------------------------------------------- drawing: textures (canvas, made once, kept)
function __fhCanvas(key, W, H, draw) {
  if (__FH.tex[key]) return __FH.tex[key];
  const s = __LOWMEM ? 0.5 : 1,
    c = document.createElement('canvas');
  c.width = Math.round(W * s);
  c.height = Math.round(H * s);
  const g = c.getContext('2d');
  g.scale(s, s);
  draw(g, W, H);
  const t = new LI(c);
  t.wrapS = t.wrapT = 1e3;
  t.colorSpace = 'srgb';
  t.anisotropy = 8;
  return (__FH.tex[key] = t);
}
// glazed tiles (15 x 7.5 cm, running bond) with grout; one repeat = 0.6 m
const __fhTexTile = () =>
  __fhCanvas('tile', 256, 256, (g, S) => {
    g.fillStyle = '#8c887f';
    g.fillRect(0, 0, S, S);
    const tw = S / 4,
      th = S / 8;
    for (let r = 0; r < 8; r++)
      for (let c = -1; c < 5; c++) {
        const x = c * tw + (r % 2 ? tw / 2 : 0),
          y = r * th,
          gr = g.createLinearGradient(0, y, 0, y + th);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.15, '#f4f2ec');
        gr.addColorStop(0.85, '#e8e4da');
        gr.addColorStop(1, '#d6d2c8');
        g.fillStyle = gr;
        g.fillRect(x + 2, y + 2, tw - 4, th - 4);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(x + 4, y + 3, tw - 8, 2);
      }
  });
// polished marble, checkered in 30 cm squares (cream with grey veins, green-black with pale veins); 1.2 m repeat
const __fhTexMarble = () =>
  __fhCanvas('marble', 512, 512, (g, S) => {
    const n = 4,
      q = S / n;
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const dark = (r + c) % 2 === 1,
          x = c * q,
          y = r * q;
        g.fillStyle = dark ? '#18241f' : '#e8e0cf';
        g.fillRect(x, y, q, q);
        g.save();
        g.beginPath();
        g.rect(x, y, q, q);
        g.clip();
        for (let k = 0; k < 7; k++) {
          g.strokeStyle = dark ? `rgba(200,210,200,${0.08 + rnd() * 0.12})` : `rgba(120,115,105,${0.1 + rnd() * 0.18})`;
          g.lineWidth = 0.6 + rnd() * 1.8;
          g.beginPath();
          let px = x + rnd() * q,
            py = y;
          g.moveTo(px, py);
          for (let s = 0; s < 8; s++) (px += (rnd() - 0.5) * q * 0.35), (py += q / 7), g.lineTo(px, py);
          g.stroke();
        }
        g.restore();
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x, y, q, 1.5);
        g.fillRect(x, y, 1.5, q);
      }
  });
// damask wallpaper (greys, tinted per room by the vertex colour); 0.53 m repeat
const __fhTexPaper = () =>
  __fhCanvas('paper', 256, 256, (g, S) => {
    g.fillStyle = '#a4a4a4';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#c9c9c9';
    g.strokeStyle = '#c9c9c9';
    const motif = (cx, cy, s) => {
      g.save();
      g.translate(cx, cy);
      g.scale(s, s);
      g.beginPath();
      g.ellipse(0, 0, 10, 26, 0, 0, 6.29);
      g.fill();
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(sd * 20, -6, 6, 16, sd * 0.6, 0, 6.29);
        g.fill();
        g.beginPath();
        g.ellipse(sd * 16, 22, 5, 10, -sd * 0.7, 0, 6.29);
        g.fill();
      }
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, -32, 7, 0, 6.29);
      g.stroke();
      g.restore();
    };
    for (const [x, y] of [[64, 64], [192, 192], [192, -64], [-64, 192], [192, 64 + 256], [64 + 256, 192]]) motif(x, y, 1.2);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x < S; x += 16) g.fillRect(x, 0, 6, S);
  });
// the art atlas: four paintings (left half, 2 x 2) and two rugs (right half)
const __FH_ART = { alps: [0, 0, 256, 256], aurora: [256, 0, 512, 256], ship: [0, 256, 256, 512], map: [256, 256, 512, 512], rug: [512, 0, 1024, 256], runner: [512, 256, 1024, 512] };
const __fhTexArt = () =>
  __fhCanvas('art', 1024, 512, (g) => {
    let seed = 41;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
      cell = (r, f) => (g.save(), g.beginPath(), g.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]), g.clip(), g.translate(r[0], r[1]), f(r[2] - r[0], r[3] - r[1]), g.restore());
    // an alpine evening: a pink sky, snowy peaks, a dark band of firs, a cabin with a lit window
    cell(__FH_ART.alps, (W, H) => {
      const s = g.createLinearGradient(0, 0, 0, H * 0.6);
      s.addColorStop(0, '#3b4a7a');
      s.addColorStop(0.6, '#d98a7a');
      s.addColorStop(1, '#f2c79a');
      g.fillStyle = s;
      g.fillRect(0, 0, W, H);
      for (const [x, h, c] of [[40, 120, '#c9cfe0'], [140, 150, '#dfe3ef'], [220, 110, '#b9c1d6']]) {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(x - 110, H * 0.72);
        g.lineTo(x, H * 0.72 - h);
        g.lineTo(x + 110, H * 0.72);
        g.fill();
      }
      g.fillStyle = '#eef1f7';
      g.fillRect(0, H * 0.72, W, H);
      g.fillStyle = '#1d2b24';
      for (let x = -10; x < W + 10; x += 9) {
        const h = 26 + rnd() * 30;
        g.beginPath();
        g.moveTo(x - 9, H * 0.8);
        g.lineTo(x, H * 0.8 - h);
        g.lineTo(x + 9, H * 0.8);
        g.fill();
      }
      g.fillStyle = '#4a3020';
      g.fillRect(150, H * 0.8 - 18, 34, 18);
      g.fillStyle = '#ffb04a';
      g.fillRect(160, H * 0.8 - 12, 7, 6);
    });
    // northern lights over a frozen lake
    cell(__FH_ART.aurora, (W, H) => {
      g.fillStyle = '#081226';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff';
      for (let k = 0; k < 70; k++) g.fillRect(rnd() * W, rnd() * H * 0.6, 1.2, 1.2);
      for (let k = 0; k < 5; k++) {
        g.strokeStyle = `rgba(${60 + k * 20},255,${170 - k * 10},0.22)`;
        g.lineWidth = 18 - k * 2;
        g.beginPath();
        for (let x = 0; x <= W; x += 8) g.lineTo(x, 60 + k * 14 + Math.sin(x * 0.03 + k) * 22);
        g.stroke();
      }
      g.fillStyle = '#0d1a2e';
      g.beginPath();
      g.moveTo(0, H * 0.7);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.62 + rnd() * 18);
      g.lineTo(W, H);
      g.lineTo(0, H);
      g.fill();
      g.fillStyle = 'rgba(120,255,200,0.12)';
      g.fillRect(0, H * 0.8, W, H * 0.2);
    });
    // a ship under sail in a grey sea
    cell(__FH_ART.ship, (W, H) => {
      const s = g.createLinearGradient(0, 0, 0, H);
      s.addColorStop(0, '#6f7c86');
      s.addColorStop(0.55, '#c8c0a8');
      s.addColorStop(0.56, '#3d5560');
      s.addColorStop(1, '#22333a');
      g.fillStyle = s;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let k = 0; k < 30; k++) {
        const x = rnd() * W,
          y = H * 0.6 + rnd() * H * 0.4;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 12, y - 2);
        g.stroke();
      }
      g.fillStyle = '#2a1c14';
      g.beginPath();
      g.moveTo(70, 170);
      g.lineTo(190, 170);
      g.lineTo(175, 190);
      g.lineTo(85, 190);
      g.fill();
      g.fillStyle = '#efe6d0';
      for (const [x, w, h] of [[100, 26, 70], [135, 30, 90], [168, 22, 60]]) {
        g.fillRect(x - w / 2, 165 - h, w, h);
        g.fillRect(x - 1, 160 - h - 10, 2, h + 12);
      }
    });
    // the plan of the tunnels (hangs in the secret room)
    cell(__FH_ART.map, (W, H) => {
      g.fillStyle = '#e6d8b2';
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(120,90,40,0.18)';
      for (let k = 0; k < 40; k++) g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 1 + rnd() * 3);
      const k = W / 128;
      g.fillStyle = '#5b3a1a';
      for (const v of __FH_V) if (v.g === 'tun' && !v.shaft) g.fillRect(v.b[0] * k, v.b[1] * k, (v.b[2] - v.b[0]) * k, (v.b[3] - v.b[1]) * k);
      g.fillStyle = '#9a2018';
      for (const L of __FH_LAD) g.beginPath(), g.arc(L.x * k, L.z * k, 4, 0, 6.29), g.fill();
      g.fillStyle = '#3a2410';
      g.font = 'bold 13px Georgia, serif';
      g.fillText('CABIN', 40 * k, 9 * k);
      g.fillText('A LONG', 4 * k, 76 * k);
      g.fillText('MID', 64 * k, 64 * k);
      g.fillText('B', 116 * k, 20 * k);
      g.font = 'italic 15px Georgia, serif';
      g.fillText('The Service Tunnels', 8, H - 10);
    });
    // a Persian rug: madder-red field, navy border, gold bands, a central medallion
    const rug = (W, H, field, border) => {
      g.fillStyle = border;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#c8a050';
      g.fillRect(10, 10, W - 20, H - 20);
      g.fillStyle = field;
      g.fillRect(26, 26, W - 52, H - 52);
      g.strokeStyle = '#c8a050';
      g.lineWidth = 2;
      for (let x = 34; x < W - 34; x += 22) for (let y = 34; y < H - 34; y += 22) g.strokeRect(x, y, 6, 6);
      g.fillStyle = border;
      g.beginPath();
      g.moveTo(W / 2, H * 0.18);
      g.lineTo(W * 0.68, H / 2);
      g.lineTo(W / 2, H * 0.82);
      g.lineTo(W * 0.32, H / 2);
      g.fill();
      g.fillStyle = '#c8a050';
      g.beginPath();
      g.moveTo(W / 2, H * 0.3);
      g.lineTo(W * 0.6, H / 2);
      g.lineTo(W / 2, H * 0.7);
      g.lineTo(W * 0.4, H / 2);
      g.fill();
      g.fillStyle = field;
      g.beginPath();
      g.arc(W / 2, H / 2, H * 0.08, 0, 6.29);
      g.fill();
    };
    cell(__FH_ART.rug, (W, H) => rug(W, H, '#7a1416', '#1c2448'));
    cell(__FH_ART.runner, (W, H) => rug(W, H, '#1d3b2c', '#5a1a18'));
  });
// enamel direction signs: deep blue, cream letters and border, arrows drawn (not a font's)
const __FH_SIGNS = [
  ['THE CABIN', 'u'], ['A LONG', 'u'], ['MID', 'u'], ['B SITE', 'u'], ['A LONG', 'l'], ['JUNCTION', 'r'], ['MID', 'l'], ['B SITE', 'l'],
  ['EXIT · A LONG', 'u'], ['EXIT · MID', 'u'], ['EXIT · B SITE', 'u'], ['SERVICE TUNNELS', 'd'], ['B SITE', 'r'], ['JUNCTION', 'l'], ['THE CABIN', 'r'], ['JUNCTION', 'u'],
];
const __fhTexSigns = () =>
  __fhCanvas('signs', 512, 1024, (g, W, H) => {
    const rh = H / 16;
    __FH_SIGNS.forEach(([t, a], r) => {
      const y0 = r * rh,
        cy = y0 + rh / 2;
      g.fillStyle = '#152a52';
      g.fillRect(0, y0, W, rh);
      g.strokeStyle = '#e9dcb6';
      g.lineWidth = rh * 0.06;
      g.strokeRect(rh * 0.1, y0 + rh * 0.1, W - rh * 0.2, rh * 0.8);
      g.fillStyle = '#f3ead2';
      let fs = rh * 0.5;
      g.font = `bold ${fs}px Georgia, "Times New Roman", serif`;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      const aw = rh * 0.42,
        gap = rh * 0.25,
        maxW = W - rh * 0.8 - aw - gap;
      let tw = g.measureText(t).width;
      if (tw > maxW) ((fs *= maxW / tw), (g.font = `bold ${fs}px Georgia, "Times New Roman", serif`), (tw = maxW));
      const x0 = (W - tw - aw - gap) / 2,
        tri = (cx, d) => {
          const s = aw / 2;
          g.beginPath();
          d === 'l'
            ? (g.moveTo(cx - s, cy), g.lineTo(cx + s, cy - s * 0.8), g.lineTo(cx + s, cy + s * 0.8))
            : d === 'r'
              ? (g.moveTo(cx + s, cy), g.lineTo(cx - s, cy - s * 0.8), g.lineTo(cx - s, cy + s * 0.8))
              : d === 'u'
                ? (g.moveTo(cx, cy - s), g.lineTo(cx + s * 0.8, cy + s * 0.7), g.lineTo(cx - s * 0.8, cy + s * 0.7))
                : (g.moveTo(cx, cy + s), g.lineTo(cx + s * 0.8, cy - s * 0.7), g.lineTo(cx - s * 0.8, cy - s * 0.7));
          g.fill();
        };
      if (a === 'l') tri(x0 + aw / 2, 'l'), g.fillText(t, x0 + aw + gap, cy + 1);
      else g.fillText(t, x0, cy + 1), tri(x0 + tw + gap + aw / 2, a);
    });
  });
// a unit plane (facing +z) showing part of a texture: r = [px0, py0, px1, py1] of a W x H canvas
function __fhPlane(r, W, H) {
  const k = r.join(',') + '/' + W + 'x' + H;
  if (__FH.planes[k]) return __FH.planes[k];
  const g = new bB(1, 1),
    uv = g.attributes.uv,
    u0 = r[0] / W,
    u1 = r[2] / W,
    v0 = 1 - r[3] / H,
    v1 = 1 - r[1] / H;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return (__FH.planes[k] = g);
}

// ---------------------------------------------------------------- drawing: materials
// Indoors below ground: the sun and the sky (ambient, hemisphere) fade out with depth (gone 40 cm below the
// surface; dimmed in the cabin), a warm fill stands in for light bounced round the rooms, and reflections of
// the sky are turned down. tile: map the texture from world position (metres a repeat) instead of UVs.
function __fhIn(m, o = {}) {
  const prev = m.onBeforeCompile,
    key0 = m.customProgramCacheKey ? m.customProgramCacheKey() : '',
    fill = o.fill || [0.1, 0.075, 0.052],
    sky = o.sky ?? 0.35,
    tile = o.tile || 0,
    DIR = 'getDirectionalLightInfo( directionalLight, directLight );',
    AMB = 'vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );',
    HEMI = 'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );';
  m.onBeforeCompile = (sh, r) => {
    prev && prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFhW; varying vec3 vFhN;').replace(
      '#include <fog_vertex>',
      `#include <fog_vertex>
{ vec4 fhP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  fhP = instanceMatrix * fhP;
#endif
  vFhW = (modelMatrix * fhP).xyz; vFhN = normalize(mat3(modelMatrix) * objectNormal); }`,
    );
    let fs = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFhW; varying vec3 vFhN;');
    tile &&
      (fs = fs.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
{ vec3 fhN = normalize(vFhN);
  vec2 fhUv = abs(fhN.y) > 0.6 ? vFhW.xz : (abs(fhN.x) > abs(fhN.z) ? vec2(vFhW.z, vFhW.y) : vec2(vFhW.x, vFhW.y));
  diffuseColor *= texture2D(map, fhUv / ${tile.toFixed(3)}); }
#endif`,
      ));
    const lb = Lw.lights_fragment_begin
      .split(DIR)
      .join(DIR + '\n\t\tdirectLight.color *= fhSky;')
      .split(AMB)
      .join('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor ) * fhSky + fhFill;')
      .split(HEMI)
      .join('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ) * fhSky;');
    fs = fs.replace(
      '#include <lights_fragment_begin>',
      `float fhSky = clamp((vFhW.y + 0.4) * 2.0, 0.0, 1.0);
if (vFhW.x > 51.74 && vFhW.x < 57.26 && vFhW.z > 4.24 && vFhW.z < 7.36 && vFhW.y < 3.3) fhSky = min(fhSky, ${sky.toFixed(2)});
vec3 fhFill = vec3(${fill.map((x) => x.toFixed(3)).join(', ')}) * (1.0 - fhSky);
` + lb,
    );
    sh.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => key0 + '|fh' + tile + '|' + sky + '|' + fill.join(',');
  'envMapIntensity' in m && (m.envMapIntensity = o.env ?? 0.25);
  m.needsUpdate = !0;
  return __flOwn(m);
}
// lit things (bulbs, globes, flames' glow, windows): emissive in their vertex colour
function __fhGlowMat(k = 2.6) {
  const m = new Gw({ color: '#000000', roughness: 0.4, metalness: 0, vertexColors: !0 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * ${k.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'fh-glow-' + k;
  return __flOwn(m);
}
function __fhMats() {
  if (__FH.mats && !__FH.mats.wood.__gone) return __FH.mats;
  const wood = Object.assign(__flMat('brown_planks_05', 0.9, 2, 2, 3, '#ffffff'), { vertexColors: !0 }),
    stone = __flStoneMat(),
    M = {
      wood: __fhIn(wood),
      stone: __fhIn(stone),
      paper: __fhIn(new Gw({ map: __fhTexPaper(), roughness: 0.82, vertexColors: !0 }), { tile: 0.53 }),
      tile: __fhIn(new ri({ map: __fhTexTile(), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12, vertexColors: !0 }), { tile: 0.6, fill: [0.085, 0.075, 0.062], env: 0.4 }),
      marble: __fhIn(new ri({ map: __fhTexMarble(), roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.06, vertexColors: !0 }), { tile: 1.2, fill: [0.085, 0.075, 0.062], env: 0.45 }),
      plaster: __fhIn(new Gw({ color: '#ffffff', roughness: 0.88, vertexColors: !0 })),
      paint: __fhIn(new ri({ color: '#ffffff', roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.25, vertexColors: !0 })),
      cloth: __fhIn(new Gw({ color: '#ffffff', roughness: 0.95, vertexColors: !0 })),
      metal: __fhIn(new Gw({ color: '#ffffff', metalness: 1, roughness: 0.3, vertexColors: !0 }), { env: 0.5 }),
      art: __fhIn(new Gw({ map: __fhTexArt(), roughness: 0.62 })),
      sign: __fhIn(new Gw({ map: __fhTexSigns(), roughness: 0.3, metalness: 0.05, emissive: '#ffffff', emissiveMap: __fhTexSigns(), emissiveIntensity: 0.22 })),
      glow: __fhGlowMat(2.6),
      books: __fhIn(new Gw({ color: '#ffffff', roughness: 0.75 })),
    };
  return (__FH.mats = M);
}

// ---------------------------------------------------------------- drawing: builders
// buckets: one merged mesh per (group, material)
function __fhKit() {
  const K = {};
  return {
    K,
    B: (g, m) => (K[g + '|' + m] || (K[g + '|' + m] = { g, m, B: __flMB() })).B,
  };
}
const __fhC = (hex, k = 1) => {
  const c = new UA(hex);
  return [c.r * k, c.g * k, c.b * k];
};
const __FHC = {
  brass: __fhC('#c9a24a'), iron: __fhC('#2c2c2e'), copper: __fhC('#b8683c'), chrome: __fhC('#c8ccd0'), black: [0.02, 0.02, 0.02], white: [0.92, 0.9, 0.86],
  cream: __fhC('#ece2cc'), plaster: __fhC('#ece6da'), green: __fhC('#1f3d2c'), maroon: __fhC('#6a1a1e'), tileW: [1, 1, 1], vault: __fhC('#efe6d0'),
  leather: [0.3, 0.06, 0.04], velvet: [0.2, 0.05, 0.08], sage: __fhC('#56685c'), warm: __fhC('#ffcf8a'), warmDim: __fhC('#ffcf8a', 0.45), pale: __fhC('#dfe9ff', 0.55),
};
// a quad from four corners, turned so its front faces along n
function __fhQuad(B, a, b, c, d, n, col) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]],
    cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? B.quad(a, b, c, d, 1) : B.quad(a, d, c, b, 1);
  // (__flMB.quad takes one grey level: set the real colour on the four new vertices)
  const C = B.__col || (B.__col = []);
  C.push([B.count - 4, col]);
}
// boxes and cylinders by corners / end points
const __fhBox = (B, x0, y0, z0, x1, y1, z1, col, ry = 0) => B.add(__flUnit('box'), __flM((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), ry), col);
const __fhUp = new U(0, 1, 0);
function __fhCyl(B, a, b, r, col, unit = 'cyl') {
  const d = new U(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    len = d.length();
  if (len < 1e-4) return;
  B.add(__flUnit(unit), new _A().compose(new U((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new Kw().setFromUnitVectors(__fhUp, d.normalize()), new U(r, len, r)), col);
}
const __fhSph = (B, x, y, z, r, col, unit = 'sph6') => B.add(__flUnit(unit), __flM(x, y, z, r, r, r), col);
// a builder in an object's own frame: lx along its width, lz towards its front, y up from its floor
function __fhLocal(cx, cz, r, y0) {
  const th = (r * Math.PI) / 2,
    c = Math.cos(th),
    s = Math.sin(th),
    W = (lx, ly, lz) => [cx + lx * c + lz * s, y0 + ly, cz - lx * s + lz * c];
  return {
    W,
    th,
    box: (B, x0, y0_, z0, x1, y1, z1, col) => {
      const p = W((x0 + x1) / 2, (y0_ + y1) / 2, (z0 + z1) / 2);
      B.add(__flUnit('box'), __flM(p[0], p[1], p[2], Math.abs(x1 - x0), Math.abs(y1 - y0_), Math.abs(z1 - z0), th), col);
    },
    cyl: (B, a, b, rad, col, unit) => __fhCyl(B, W(...a), W(...b), rad, col, unit),
    sph: (B, x, y, z, rad, col, sy = 1) => {
      const p = W(x, y, z);
      B.add(__flUnit('sph'), __flM(p[0], p[1], p[2], rad, rad * sy, rad, th), col);
    },
  };
}
// a texture-mapped plane (paintings, rugs, signs) at a point, facing ry (0: +z), or lying flat (flat = 1)
function __fhPic(B, part, W, H, x, y, z, w, h, ry, flat = 0) {
  B.add(__fhPlane(part, W, H), flat ? __flM(x, y, z, w, h, 1, ry, -Math.PI / 2) : __flM(x, y, z, w, h, 1, ry), 1);
}
// a sign on a wall: enamel plate in a brass frame
function __fhSign(Kt, g, row, x, y, z, ry, w = 1.6, h = 0.2) {
  const n = [Math.sin(ry), Math.cos(ry)];
  __fhPic(Kt.B(g, 'sign'), [0, row * 64, 512, row * 64 + 64], 512, 1024, x + n[0] * 0.03, y, z + n[1] * 0.03, w, h, ry);
  Kt.B(g, 'metal').add(__flUnit('box'), __flM(x + n[0] * 0.012, y, z + n[1] * 0.012, w + 0.05, h + 0.05, 0.03, ry), __FHC.brass);
}
// a painting in a gilt frame on a wall (facing ry)
function __fhPainting(Kt, g, part, x, y, z, ry, w, h) {
  const n = [Math.sin(ry), Math.cos(ry)];
  __fhPic(Kt.B(g, 'art'), __FH_ART[part], 1024, 512, x + n[0] * 0.045, y, z + n[1] * 0.045, w, h, ry);
  const M = Kt.B(g, 'metal'),
    t = 0.07;
  for (const [ox, oy, sw, sh] of [[0, h / 2 + t / 2, w + 2 * t, t], [0, -h / 2 - t / 2, w + 2 * t, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h]])
    M.add(__flUnit('box'), __flM(x + n[0] * 0.03 + Math.cos(ry) * ox, y + oy, z + n[1] * 0.03 - Math.sin(ry) * ox, sw, sh, 0.06, ry), __FHC.brass);
}

// ---------------------------------------------------------------- drawing: the rooms and tunnels (generic)
// Every space's six faces, less wherever a neighbouring space opens onto it (doorways, stairwells, shafts,
// tunnel mouths). What is left is drawn in the space's own style. The same spaces made the collision boxes, so
// the walls you see are the walls you hit, and nothing is left open to the void.
const __FH_PAPER = { hall: __fhC('#c2a878'), stair: __fhC('#b9a27a'), great: __fhC('#3d5c48'), lounge: __fhC('#2f3f5e'), dining: __fhC('#6e2a30'), library: __fhC('#5a4630'), kitchen: __fhC('#d8cdb5'), gallery: __fhC('#9a7a52') };
function __fhFaces(Kt) {
  const e = 0.01;
  for (const v of __FH_V) {
    if (v.noVis) continue;
    const [x0, z0, x1, z1, y0, y1] = v.b;
    for (const [ax, sd] of [['x', -1], ['x', 1], ['z', -1], ['z', 1], ['y', -1], ['y', 1]]) {
      const P = ax === 'x' ? (sd < 0 ? x0 : x1) : ax === 'z' ? (sd < 0 ? z0 : z1) : sd < 0 ? y0 : y1;
      let rects = [ax === 'x' ? [z0, y0, z1, y1] : ax === 'z' ? [x0, y0, x1, y1] : [x0, z0, x1, z1]];
      for (const o of __FH_V) {
        if (o === v) continue;
        const [a0, c0, a1, c1, b0, b1] = o.b,
          q = P + sd * e,
          lo = ax === 'x' ? a0 : ax === 'z' ? c0 : b0,
          hi = ax === 'x' ? a1 : ax === 'z' ? c1 : b1;
        if (!(q > lo && q < hi)) continue;
        const h = ax === 'x' ? [c0, b0, c1, b1] : ax === 'z' ? [a0, b0, a1, b1] : [a0, c0, a1, c1];
        rects = rects.flatMap((r) => __fhSub2(r, h));
      }
      if (!rects.length) continue;
      if (ax === 'y') sd < 0 ? v.noFloorVis || __fhFloor(Kt, v, rects) : v.noCeilVis || v.vault || __fhCeil(Kt, v, rects);
      else __fhWall(Kt, v, ax, sd, P, rects);
    }
    v.vault && __fhVault(Kt, v);
  }
}
// one band of a wall (rect in the wall's own u (along), w (height) coordinates), set `off` into the room
function __fhWallQuad(B, ax, sd, P, r, col, off = 0) {
  const p = P - sd * off,
    n = ax === 'x' ? [-sd, 0, 0] : [0, 0, -sd],
    pt = (u, w) => (ax === 'x' ? [p, w, u] : [u, w, p]);
  __fhQuad(B, pt(r[0], r[1]), pt(r[2], r[1]), pt(r[2], r[3]), pt(r[0], r[3]), n, col);
}
function __fhWall(Kt, v, ax, sd, P, rects) {
  const [, , , , y0, y1] = v.b,
    g = v.g,
    st = v.st,
    spring = v.vault ? y0 + 2.5 : y1,
    // a vaulted tunnel's side walls stop at the springing of the vault; its ends belong to the chambers
    side = v.vault && ((v.vault === 'x' && ax === 'z') || (v.vault === 'z' && ax === 'x'));
  if (v.vault && !side) return;
  const band = (lo, hi, mat, col, off = 0) => {
    for (const r of rects) {
      const q = [r[0], Math.max(r[1], lo), r[2], Math.min(r[3], hi, side ? spring : 1e9, v.wallTop ?? 1e9)];
      q[3] - q[1] > 0.003 && __fhWallQuad(Kt.B(g, mat), ax, sd, P, q, col, off);
    }
  };
  if (st !== 'stair' && __FH_PAPER[st]) {
    // skirting, oak panelling to 1.2 m (tiles in the kitchen), a dado rail, damask paper, a picture rail, a
    // deep plaster cornice
    const paper = __FH_PAPER[st],
      wh = y1 - y0 > 3.5 ? 1.2 : 1.0;
    band(y0, y0 + 0.16, 'wood', [0.28, 0.17, 0.1], 0.018);
    st === 'kitchen' ? band(y0 + 0.16, y0 + wh, 'tile', __FHC.cream, 0.004) : band(y0 + 0.16, y0 + wh, 'wood', [0.58, 0.42, 0.3], 0.006);
    band(y0 + wh - 0.03, y0 + wh + 0.05, 'wood', [0.4, 0.27, 0.16], 0.03);
    band(y0 + wh, y1 - 0.24, 'paper', paper);
    y1 - y0 > 3.5 && band(y0 + 3.0, y0 + 3.05, 'wood', [0.4, 0.27, 0.16], 0.02);
    band(y1 - 0.24, y1, 'plaster', __FHC.plaster, 0.04);
  } else if (st === 'stair') {
    band(y0 - 3, y1 - 0.14, 'paper', __FH_PAPER.stair);
    band(y1 - 0.14, y1, 'plaster', __FHC.plaster, 0.02);
  } else if (st === 'door') band(y0, y1, 'paint', __FHC.cream);
  else if (st === 'stone' || st === 'wine') band(y0, y1, 'stone', st === 'wine' ? [0.85, 0.7, 0.6] : [0.95, 0.92, 0.88]);
  else if (st === 'shaft') {
    for (let y = y0; y < y1; y += 2) band(y, Math.min(y1, y + 1.8), 'tile', __FHC.tileW), band(y + 1.8, Math.min(y1, y + 2), 'tile', __FHC.maroon, 0.002);
  } else {
    // tunnels and chambers: green skirting, white tiles, a maroon band, white to the vault (a cream frieze in
    // the chambers)
    band(y0, y0 + 0.3, 'tile', __FHC.green, 0.004);
    band(y0 + 0.3, y0 + 1.15, 'tile', __FHC.tileW);
    band(y0 + 1.15, y0 + 1.35, 'tile', __FHC.maroon, 0.003);
    band(y0 + 1.35, st === 'chamber' ? y1 - 0.3 : spring, 'tile', __FHC.tileW);
    st === 'chamber' && band(y1 - 0.3, y1, 'plaster', __FHC.vault, 0.004);
  }
}
function __fhFloor(Kt, v, rects) {
  const y = v.b[4] + 0.002,
    st = v.st,
    mat = st === 'kitchen' || st === 'hall' || st === 'tunnel' || st === 'chamber' ? 'marble' : st === 'stone' || st === 'wine' ? 'stone' : 'wood',
    col = mat === 'wood' ? (st === 'door' ? [0.5, 0.36, 0.24] : [0.78, 0.6, 0.45]) : [1, 1, 1],
    B = Kt.B(v.g, mat);
  for (const r of rects) __fhQuad(B, [r[0], y, r[1]], [r[2], y, r[1]], [r[2], y, r[3]], [r[0], y, r[3]], [0, 1, 0], col);
}
function __fhCeil(Kt, v, rects) {
  const y = v.b[5] - 0.002,
    st = v.st,
    mat = st === 'stone' || st === 'wine' ? 'wood' : 'plaster',
    col = st === 'stone' || st === 'wine' ? [0.45, 0.32, 0.22] : __FHC.plaster,
    B = Kt.B(v.g, mat);
  for (const r of rects) __fhQuad(B, [r[0], y, r[1]], [r[2], y, r[1]], [r[2], y, r[3]], [r[0], y, r[3]], [0, -1, 0], col);
  // beams and coffers: oak beams across the house rooms, a plaster grid in the chambers, timbers in the stone room
  const [x0, z0, x1, z1] = v.b;
  if (v.coffer) {
    // coffers: a grid of oak beams with a gilded edge
    const W = Kt.B(v.g, 'wood'),
      Mt = Kt.B(v.g, 'metal'),
      nx = Math.max(2, Math.round((x1 - x0) / 1.8)),
      nz = Math.max(2, Math.round((z1 - z0) / 1.8));
    for (let k = 1; k < nx; k++) {
      const xx = x0 + ((x1 - x0) * k) / nx;
      __fhBox(W, xx - 0.12, y - 0.28, z0, xx + 0.12, y, z1, [0.4, 0.26, 0.15]);
      __fhBox(Mt, xx - 0.125, y - 0.29, z0, xx + 0.125, y - 0.27, z1, __FHC.brass);
    }
    for (let k = 1; k < nz; k++) {
      const zz = z0 + ((z1 - z0) * k) / nz;
      __fhBox(W, x0, y - 0.28, zz - 0.12, x1, y, zz + 0.12, [0.4, 0.26, 0.15]);
      __fhBox(Mt, x0, y - 0.29, zz - 0.125, x1, y - 0.27, zz + 0.125, __FHC.brass);
    }
  } else if (st === 'great' || st === 'lounge' || st === 'library' || st === 'kitchen' || st === 'gallery' || st === 'stone' || st === 'wine') {
    const W = Kt.B(v.g, 'wood'),
      along = x1 - x0 > z1 - z0,
      a0 = along ? x0 : z0,
      a1 = along ? x1 : z1;
    for (let a = a0 + 1.2; a < a1 - 0.6; a += 1.6) along ? __fhBox(W, a - 0.1, y - 0.2, z0, a + 0.1, y, z1, [0.42, 0.28, 0.17]) : __fhBox(W, x0, y - 0.2, a - 0.1, x1, y, a + 0.1, [0.42, 0.28, 0.17]);
  } else if (st === 'chamber') {
    const Pl = Kt.B(v.g, 'plaster'),
      n = v.grand ? 5 : 3;
    for (let k = 1; k < n; k++) {
      const xx = x0 + ((x1 - x0) * k) / n,
        zz = z0 + ((z1 - z0) * k) / n;
      __fhBox(Pl, xx - 0.09, y - 0.22, z0, xx + 0.09, y, z1, __FHC.vault);
      __fhBox(Pl, x0, y - 0.22, zz - 0.09, x1, y, zz + 0.09, __FHC.vault);
    }
  }
}
// a barrel vault over a tunnel (smooth, cream plaster), brass ribs every 4 m, and the spandrels at its ends (the
// chamber wall round the arch, which the chamber's own wall leaves open)
function __fhVault(Kt, v) {
  const [x0, z0, x1, z1, y0, y1] = v.b,
    X = v.vault === 'x',
    a0 = X ? x0 : z0,
    a1 = X ? x1 : z1,
    c0 = X ? z0 : x0,
    c1 = X ? z1 : x1,
    cc = (c0 + c1) / 2,
    hw = (c1 - c0) / 2,
    ys = y0 + 2.5,
    rise = y1 - ys,
    N = 16,
    P = [],
    Nn = [],
    I = [],
    pt = (a, c, y) => (X ? [a, y, c] : [c, y, a]);
  for (let k = 0; k <= N; k++) {
    const t = (k / N) * Math.PI,
      c = cc - hw * Math.cos(t),
      y = ys + rise * Math.sin(t),
      nc = (Math.cos(t) / hw) * rise,
      ny = -Math.sin(t),
      l = Math.hypot(nc, ny) || 1;
    for (const a of [a0, a1]) P.push(...pt(a, c, y)), Nn.push(...(X ? [0, ny / l, nc / l] : [nc / l, ny / l, 0]));
  }
  for (let k = 0; k < N; k++) {
    const i = k * 2;
    // (winding: facing down into the tunnel)
    X ? I.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) : I.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('normal', new gi(new Float32Array(Nn), 3));
  g.setIndex(I);
  // make sure the triangles face the way the normals do (into the tunnel)
  {
    const p = g.attributes.position,
      A = new U().fromBufferAttribute(p, I[0]),
      B2 = new U().fromBufferAttribute(p, I[1]),
      C = new U().fromBufferAttribute(p, I[2]),
      n = new U().subVectors(B2, A).cross(new U().subVectors(C, A)),
      want = new U().fromBufferAttribute(g.attributes.normal, I[0]);
    if (n.dot(want) < 0) for (let k = 0; k < I.length; k += 3) [I[k + 1], I[k + 2]] = [I[k + 2], I[k + 1]];
    g.setIndex(I);
  }
  Kt.B(v.g, 'plaster').add(g, new _A(), __FHC.vault);
  g.dispose();
  // ribs
  const M = Kt.B(v.g, 'metal');
  for (let a = a0 + 2; a < a1 - 1; a += 4) {
    const arc = [];
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * Math.PI;
      arc.push(pt(a, cc - (hw - 0.03) * Math.cos(t), ys + (rise - 0.03) * Math.sin(t)));
    }
    const tube = __xmTube(arc, 0.035, 5, 1);
    M.add(tube, new _A(), __FHC.brass);
    tube.dispose();
  }
  // spandrels at both ends, facing out of the tunnel
  const Pl = Kt.B(v.g, 'tile');
  for (const [a, sg] of [[a0, -1], [a1, 1]]) {
    const n = X ? [sg, 0, 0] : [0, 0, sg];
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI,
        t1 = ((k + 1) / N) * Math.PI,
        ca = cc - hw * Math.cos(t0),
        cb = cc - hw * Math.cos(t1),
        ya = ys + rise * Math.sin(t0),
        yb = ys + rise * Math.sin(t1);
      __fhQuad(Pl, pt(a, ca, ya), pt(a, cb, yb), pt(a, cb, y1), pt(a, ca, y1), n, __FHC.tileW);
    }
  }
}
// door casings round the house's doorways (both sides), and thresholds
function __fhCasings(Kt) {
  for (const v of __FH_V) {
    if (v.st !== 'door' || v.secret) continue;
    const [x0, z0, x1, z1, y0, y1] = v.b,
      X = x1 - x0 < z1 - z0, // the doorway goes through a wall along z (its thin side is x)
      B = Kt.B(v.g, 'wood'),
      col = [0.36, 0.23, 0.14],
      t = 0.1,
      d = 0.03;
    for (const [P, sd] of X ? [[x0, -1], [x1, 1]] : [[z0, -1], [z1, 1]]) {
      const u0 = X ? z0 : x0,
        u1 = X ? z1 : x1,
        q = P + sd * d,
        bx = (ua, ub, ya, yb) => (X ? __fhBox(B, Math.min(P, q), ya, ua, Math.max(P, q), yb, ub, col) : __fhBox(B, ua, ya, Math.min(P, q), ub, yb, Math.max(P, q), col));
      bx(u0 - t, u0, y0, y1 + t);
      bx(u1, u1 + t, y0, y1 + t);
      bx(u0 - t, u1 + t, y1, y1 + t);
    }
  }
}

// ---------------------------------------------------------------- drawing: stairs, railings, ladders
function __fhStairsDraw(Kt) {
  const { CF, LDG, HF } = __FH_Y,
    RUN = [0.42, 0.05, 0.06];
  for (const s of __fhSteps()) {
    const [x0, , z0, x1, y1, z1] = s.b,
      g = s.f === 1 ? 'cabin' : 'house',
      W = Kt.B(g, 'wood'),
      Pt = Kt.B(g, 'paint'),
      M = Kt.B(g, 'metal'),
      C = Kt.B(g, 'cloth'),
      cx = (x0 + x1) / 2;
    // oak treads with a nosing, painted risers, a red runner held by brass rods (the first flight goes down
    // westwards, so its nosings face west; the other two go down southwards)
    if (s.f === 1) {
      __fhBox(W, x0 - 0.03, y1 - 0.04, z0, x1, y1, z1, [0.62, 0.45, 0.3]);
      __fhBox(Pt, x0, y1 - 0.19, z0, x0 + 0.02, y1 - 0.04, z1, __FHC.cream);
      __fhBox(C, x0 - 0.03, y1, 4.65, x1, y1 + 0.008, 5.45, RUN);
      __fhCyl(M, [x0 + 0.02, y1 + 0.012, 4.62], [x0 + 0.02, y1 + 0.012, 5.48], 0.008, __FHC.brass, 'cyl6');
    } else {
      __fhBox(W, x0, y1 - 0.04, z0, x1, y1, z1 + 0.03, [0.62, 0.45, 0.3]);
      __fhBox(Pt, x0, y1 - 0.19, z1 - 0.02, x1, y1 - 0.04, z1, __FHC.cream);
      __fhBox(C, cx - 0.45, y1, z0, cx + 0.45, y1 + 0.008, z1 + 0.03, RUN);
      __fhCyl(M, [cx - 0.48, y1 + 0.012, z1 - 0.02], [cx + 0.48, y1 + 0.012, z1 - 0.02], 0.008, __FHC.brass, 'cyl6');
    }
  }
  // the edges where the landing and the wine cellar's floor drop to the next flight, the runner on the landing
  const r2 = (LDG - HF) / 10;
  __fhBox(Kt.B('cabin', 'paint'), 49.4, LDG - r2, 5.73, 51.4, LDG, 5.75, __FHC.cream);
  __fhBox(Kt.B('house', 'paint'), 41.6, LDG - r2, 5.73, 43.2, LDG, 5.75, __FHC.cream);
  __fhBox(Kt.B('cabin', 'cloth'), 49.95, LDG + 0.002, 4.65, 51.8, LDG + 0.01, 5.45, RUN);
  __fhBox(Kt.B('cabin', 'cloth'), 49.95, LDG + 0.002, 5.45, 50.85, LDG + 0.01, 5.75, RUN);
  // wall handrails (brass on brackets), following each flight; (wx, wz): the way to the wall it is fixed to
  const rail = (g, a, b, wx, wz) => {
    const M = Kt.B(g, 'metal');
    __fhCyl(M, a, b, 0.025, __FHC.brass);
    for (let t = 0.1; t < 1; t += 0.2) {
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      __fhCyl(M, p, [p[0] + wx * 0.07, p[1] - 0.06, p[2] + wz * 0.07], 0.008, __FHC.brass, 'cyl6');
    }
  };
  rail('cabin', [57.2, CF + 0.9, 4.43], [51.8, LDG + 1.09, 4.43], 0, -1);
  rail('house', [49.48, LDG + 0.9, 5.75], [49.48, HF + 1.09, 8.54], -1, 0);
  rail('house', [41.68, LDG + 0.9, 5.75], [41.68, HF + 1.09, 8.54], -1, 0);
}
// the railings round the cabin's stairwell (newel posts, turned balusters, an oak rail) and round the shaft
// in the secret room (brass)
function __fhRailsDraw(Kt) {
  for (const [x0, z0, x1, z1, y] of __FH_RAIL) {
    const cabin = y > 0,
      g = cabin ? 'cabin' : 'house',
      W = Kt.B(g, 'wood'),
      Pt = Kt.B(g, 'paint'),
      M = Kt.B(g, 'metal'),
      X = x1 - x0 > z1 - z0,
      cz = (z0 + z1) / 2,
      cx = (x0 + x1) / 2,
      a0 = X ? x0 : z0,
      a1 = X ? x1 : z1,
      at = (a, yy) => (X ? [a, yy, cz] : [cx, yy, a]);
    if (cabin) {
      __fhBox(W, x0 - 0.02, y + 0.92, z0 - 0.02, x1 + 0.02, y + 1.0, z1 + 0.02, [0.4, 0.25, 0.14]);
      __fhBox(W, x0, y, z0, x1, y + 0.06, z1, [0.4, 0.25, 0.14]);
      for (let a = a0 + 0.1; a < a1 - 0.05; a += 0.13) __fhCyl(Pt, at(a, y + 0.06), at(a, y + 0.92), 0.018, __FHC.white, 'cyl6');
      for (const a of [a0, a1]) {
        const p = at(a, 0);
        __fhBox(W, p[0] - 0.06, y, p[2] - 0.06, p[0] + 0.06, y + 1.12, p[2] + 0.06, [0.36, 0.22, 0.12]);
        __fhSph(W, p[0], y + 1.17, p[2], 0.06, [0.36, 0.22, 0.12]);
      }
    } else {
      __fhCyl(M, at(a0, y + 1.0), at(a1, y + 1.0), 0.03, __FHC.brass);
      __fhCyl(M, at(a0, y + 0.5), at(a1, y + 0.5), 0.015, __FHC.brass);
      for (let a = a0; a <= a1 + 1e-3; a += Math.max(0.3, (a1 - a0) / 3)) __fhCyl(M, at(a, y), at(a, y + 1.0), 0.022, __FHC.brass);
    }
  }
}
// ladders: brass stiles, iron rungs every 30 cm, wall brackets; grab handles above the secret shaft's top
function __fhLaddersDraw(Kt) {
  for (const L of __FH_LAD) {
    const M = Kt.B('tun', 'metal'),
      wx = L.x + L.fx * 0.4, // the rungs' line (the wall is 0.42 m in front of the climber)
      wz = L.z + L.fz * 0.4,
      sx = -L.fz, // sideways
      sz = L.fx,
      top = L.hatch < 0 ? L.y1 + 1.0 : -0.06,
      at = (s, y, o = 0) => [wx + sx * s + L.fx * o, y, wz + sz * s + L.fz * o];
    for (const s of [-0.24, 0.24]) {
      __fhCyl(M, at(s, L.y0), at(s, top), 0.022, __FHC.brass);
      for (let y = L.y0 + 0.6; y < Math.min(top, L.y1) - 0.2; y += 1.5) __fhCyl(M, at(s, y), at(s, y, 0.02), 0.03, __FHC.iron, 'cyl6');
    }
    for (let y = L.y0 + 0.3; y < Math.min(top, L.y1 + 0.02) - 0.05; y += 0.3) __fhCyl(M, at(-0.24, y), at(0.24, y), 0.016, __FHC.iron, 'cyl6');
    // the secret shaft's handles curve over onto the floor
    if (L.hatch < 0) for (const s of [-0.24, 0.24]) __fhCyl(M, at(s, top), at(s, top, 0.25), 0.022, __FHC.brass), __fhCyl(M, at(s, top, 0.25), at(s, L.y1, 0.25), 0.022, __FHC.brass);
  }
}
// ---------------------------------------------------------------- drawing: tunnel fittings
// Pendant lamps along every vault, wall sconces in the chambers, a chandelier and a clock in the junction,
// pipes (copper and iron) along one wall and a cable tray with cables along the other, signs.
function __fhTunnelDraw(Kt) {
  const M = Kt.B('tun', 'metal'),
    G = Kt.B('tun', 'glow'),
    low = Zw.getState().quality === 'low';
  for (const v of __FH_V) {
    if (v.g !== 'tun' || v.shaft) continue;
    const [x0, z0, x1, z1, y0, y1] = v.b;
    if (v.vault) {
      const X = v.vault === 'x',
        a0 = X ? x0 : z0,
        a1 = X ? x1 : z1,
        c0 = X ? z0 : x0,
        c1 = X ? z1 : x1,
        cc = (c0 + c1) / 2,
        pt = (a, c, y) => (X ? [a, y, c] : [c, y, a]);
      // pendants on the crown
      for (let a = a0 + 2; a < a1 - 0.5; a += 4) {
        __fhCyl(M, pt(a, cc, y1), pt(a, cc, y1 - 0.5), 0.012, __FHC.brass, 'cyl6');
        __fhCyl(M, pt(a, cc, y1 - 0.48), pt(a, cc, y1 - 0.58), 0.07, __FHC.brass);
        const p = pt(a, cc, y1 - 0.7);
        __fhSph(G, p[0], p[1], p[2], 0.12, __FHC.warm, 'sph');
      }
      // pipes along the low side (c0), cable tray along the high side (c1)
      const py = y0 + 2.05;
      __fhCyl(M, pt(a0, c0 + 0.14, py), pt(a1, c0 + 0.14, py), 0.055, __FHC.copper);
      __fhCyl(M, pt(a0, c0 + 0.16, py + 0.18), pt(a1, c0 + 0.16, py + 0.18), 0.075, __FHC.iron);
      for (let a = a0 + 1; a < a1; a += 2) __fhBox(M, ...(X ? [a - 0.03, py - 0.08, c0, a + 0.03, py + 0.28, c0 + 0.26] : [c0, py - 0.08, a - 0.03, c0 + 0.26, py + 0.28, a + 0.03]), __FHC.iron);
      const ty = y0 + 2.25;
      X ? __fhBox(M, a0, ty, c1 - 0.34, a1, ty + 0.025, c1 - 0.04, __FHC.iron) : __fhBox(M, c1 - 0.34, ty, a0, c1 - 0.04, ty + 0.025, a1, __FHC.iron);
      X ? __fhBox(M, a0, ty, c1 - 0.34, a1, ty + 0.07, c1 - 0.32, __FHC.iron) : __fhBox(M, c1 - 0.34, ty, a0, c1 - 0.32, ty + 0.07, a1, __FHC.iron);
      if (!low)
        for (const [o, col] of [[0.1, [0.03, 0.03, 0.03]], [0.17, [0.45, 0.04, 0.03]], [0.24, [0.6, 0.45, 0.08]]]) __fhCyl(M, pt(a0, c1 - 0.04 - o, ty + 0.045), pt(a1, c1 - 0.04 - o, ty + 0.045), 0.02, col, 'cyl6');
      for (let a = a0 + 1.5; a < a1; a += 3) __fhBox(M, ...(X ? [a - 0.025, ty - 0.12, c1 - 0.36, a + 0.025, ty, c1] : [c1 - 0.36, ty - 0.12, a - 0.025, c1, ty, a + 0.025]), __FHC.iron);
    } else {
      // chambers: a sconce on each wall (beside the openings), a ceiling globe; the junction: a chandelier,
      // an oculus, a clock and a compass rose in the floor
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2,
        sy = y0 + 2.3;
      for (const [x, zz, nx, nz] of [[x0, z0 + 0.9, 1, 0], [x1, z1 - 0.9, -1, 0], [x1 - 0.9, z0, 0, 1], [x0 + 0.9, z1, 0, -1]]) {
        // (not where the wall is open: a tunnel's mouth)
        if (__fhVolAt(x - nx * 0.05, sy, zz - nz * 0.05, 0, 0)) continue;
        M.add(__flUnit('box'), __flM(x + nx * 0.015, sy, zz + nz * 0.015, Math.abs(nz) * 0.12 + Math.abs(nx) * 0.03, 0.3, Math.abs(nx) * 0.12 + Math.abs(nz) * 0.03), __FHC.brass);
        __fhCyl(M, [x + nx * 0.03, sy, zz + nz * 0.03], [x + nx * 0.22, sy + 0.06, zz + nz * 0.22], 0.012, __FHC.brass, 'cyl6');
        __fhSph(G, x + nx * 0.24, sy + 0.16, zz + nz * 0.24, 0.09, __FHC.warm, 'sph');
      }
      if (v.grand) {
        // chandelier: a brass ring of twelve globes on a chain
        const cy = y1 - 1.3;
        __fhCyl(M, [cx, y1, cz], [cx, cy, cz], 0.015, __FHC.brass, 'cyl6');
        const ring = [];
        for (let k = 0; k <= 32; k++) ring.push([cx + Math.cos((k / 32) * 6.283) * 1.0, cy, cz + Math.sin((k / 32) * 6.283) * 1.0]);
        const t = __xmTube(ring, 0.03, 6, 1);
        M.add(t, new _A(), __FHC.brass);
        t.dispose();
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * 6.283,
            px = cx + Math.cos(a) * 1.0,
            pz = cz + Math.sin(a) * 1.0;
          __fhCyl(M, [cx, cy - 0.1, cz], [px, cy, pz], 0.01, __FHC.brass, 'cyl6');
          __fhSph(G, px, cy + 0.12, pz, 0.08, __FHC.warm, 'sph');
        }
        __fhSph(G, cx, cy - 0.15, cz, 0.16, __FHC.warm, 'sph');
        // the oculus: a glowing disc in the coffers
        G.add(__flUnit('cyl'), __flM(cx, y1 - 0.01, cz, 1.1, 0.02, 1.1), __fhC('#fff1d6', 0.5));
        M.add(new oI(1.15, 0.06, 6, 40), __flM(cx, y1 - 0.03, cz, 1, 1, 1, 0, Math.PI / 2), __FHC.brass);
        // the clock over the east mouth... on the north wall, west of the mouth
        const kx = 35.4,
          kz = z0 + 0.04,
          ky = y0 + 2.9;
        G.add(__flUnit('cyl'), __flM(kx, ky, kz + 0.02, 0.4, 0.02, 0.4, 0, Math.PI / 2), __fhC('#f6efe0', 0.35));
        M.add(new oI(0.42, 0.04, 6, 32), __flM(kx, ky, kz + 0.03, 1, 1, 1), __FHC.brass);
        __fhBox(M, kx - 0.012, ky, kz + 0.05, kx + 0.012, ky + 0.3, kz + 0.06, __FHC.black);
        __fhBox(M, kx, ky - 0.012, kz + 0.05, kx + 0.2, ky + 0.012, kz + 0.06, __FHC.black);
        // compass rose: a brass ring and the four points inlaid in the marble
        M.add(new oI(1.6, 0.03, 4, 48), __flM(cx, y0 + 0.004, cz, 1, 1, 0.12, 0, Math.PI / 2), __FHC.brass);
        __fhBox(M, cx - 1.6, y0, cz - 0.03, cx + 1.6, y0 + 0.006, cz + 0.03, __FHC.brass);
        __fhBox(M, cx - 0.03, y0, cz - 1.6, cx + 0.03, y0 + 0.006, cz + 1.6, __FHC.brass);
      }
    }
  }
  // signs: above the junction's four mouths, at each turn (both ways), in the vestibule, at the shaft foot,
  // at each exit, and in the secret room
  const { TF } = __FH_Y,
    sg = (row, x, y, z, ry, w) => __fhSign(Kt, 'tun', row, x, y, z, ry, w);
  sg(0, 33.15, -5.75, 27.0, 0);
  sg(1, 28.15, -5.75, 32.0, Math.PI / 2);
  sg(2, 33.15, -5.75, 37.0, Math.PI);
  sg(3, 38.15, -5.75, 32.0, -Math.PI / 2);
  sg(4, 13.25, TF + 1.9, 32.0, Math.PI / 2);
  sg(5, 15.25, TF + 1.9, 30.0, 0);
  sg(6, 33.15, TF + 1.9, 58.75, Math.PI);
  sg(5, 31.15, TF + 1.9, 56.75, Math.PI / 2);
  sg(7, 114.5, TF + 1.9, 32.0, -Math.PI / 2);
  sg(5, 112.5, TF + 1.9, 34.0, Math.PI);
  sg(12, 78.2, TF + 2.1, 29.0, 0, 1.4);
  sg(13, 75.8, TF + 2.1, 29.0, 0, 1.4);
  sg(7, 78.2, TF + 2.1, 35.0, Math.PI, 1.4);
  sg(5, 75.8, TF + 2.1, 35.0, Math.PI, 1.4);
  sg(14, 31.9, TF + 1.9, 12.3, 0, 1.2);
  sg(8, 15.25, TF + 1.9, 70.0, Math.PI, 1.4);
  sg(9, 71.2, TF + 1.9, 56.75, -Math.PI / 2, 1.4);
  sg(10, 114.5, TF + 1.9, 24.3, -Math.PI / 2, 1.4);
  __fhSign(Kt, 'house', 11, 33.15, -3.0, 10.4, 0, 1.5);
  // the junction's and the vestibule's benches (oak slats on iron legs)
  for (const f of __FH_F) if (f[0] === 'tbench') __fhFurnDraw(Kt, 'tun', f);
}

// ---------------------------------------------------------------- drawing: furniture
function __fhFurnDraw(Kt, g, f, extra) {
  const [k, cx, cz, r, y0, w0] = f,
    S = __FH_FS[k],
    w = w0 || S[0],
    d = S[1],
    h = S[2],
    F = __fhLocal(cx, cz, r, y0),
    W = Kt.B(g, 'wood'),
    C = Kt.B(g, 'cloth'),
    Pt = Kt.B(g, 'paint'),
    M = Kt.B(g, 'metal'),
    G = Kt.B(g, 'glow'),
    hw = w / 2,
    hd = d / 2,
    DARK = [0.3, 0.19, 0.11],
    MID = [0.55, 0.38, 0.24],
    lamp = (lx, ly, lz, s = 1) => {
      F.cyl(M, [lx, ly, lz], [lx, ly + 0.32 * s, lz], 0.03 * s, __FHC.brass);
      F.cyl(M, [lx, ly, lz], [lx, ly + 0.03, lz], 0.08 * s, __FHC.brass);
      const p = F.W(lx, ly + 0.42 * s, lz);
      G.add(__flUnit('cone'), __flM(p[0], p[1], p[2], 0.17 * s, 0.22 * s, 0.17 * s), __FHC.warmDim);
    };
  switch (k) {
    case 'sofa':
    case 'arm': {
      // a Chesterfield (or a wing chair): skirted base, cushions, a high back, rolled arms, bun feet
      const col = k === 'sofa' ? __FHC.leather : [0.36, 0.07, 0.06],
        col2 = col.map((x) => x * 1.25);
      F.box(C, -hw, 0.08, -hd, hw, 0.42, hd, col);
      const n = k === 'sofa' ? 3 : 1;
      for (let i = 0; i < n; i++) F.box(C, -hw + 0.18 + ((w - 0.36) * i) / n + 0.01, 0.42, -hd + 0.22, -hw + 0.18 + ((w - 0.36) * (i + 1)) / n - 0.01, 0.55, hd - 0.02, col2);
      F.box(C, -hw, 0.42, -hd, hw, h, -hd + 0.24, col);
      for (const s of [-1, 1]) {
        F.box(C, s * hw - (s > 0 ? 0.2 : 0), 0.42, -hd, s * hw + (s < 0 ? 0.2 : 0), 0.68, hd, col);
        F.cyl(C, [s * (hw - 0.1), 0.68, -hd], [s * (hw - 0.1), 0.68, hd], 0.12, col2);
        k === 'arm' && F.box(C, s * hw - (s > 0 ? 0.16 : 0), 0.68, -hd, s * hw + (s < 0 ? 0.16 : 0), h, -hd + 0.4, col);
      }
      for (const [x, z] of [[-hw + 0.08, -hd + 0.08], [hw - 0.08, -hd + 0.08], [-hw + 0.08, hd - 0.08], [hw - 0.08, hd - 0.08]]) F.cyl(W, [x, 0, z], [x, 0.08, z], 0.045, DARK);
      // buttons on the back
      if (k === 'sofa') for (let x = -hw + 0.35; x < hw - 0.3; x += 0.3) for (const y of [0.65, 0.8]) F.sph(M, x, y, -hd + 0.245, 0.012, __FHC.brass);
      break;
    }
    case 'coffee': {
      F.box(W, -hw, h - 0.05, -hd, hw, h, hd, MID);
      for (const [x, z] of [[-hw + 0.05, -hd + 0.05], [hw - 0.05, -hd + 0.05], [-hw + 0.05, hd - 0.05], [hw - 0.05, hd - 0.05]]) F.box(W, x - 0.03, 0, z - 0.03, x + 0.03, h - 0.05, z + 0.03, DARK);
      F.box(W, -hw + 0.05, 0.1, -hd + 0.05, hw - 0.05, 0.13, hd - 0.05, DARK);
      // a silver tray, a teapot and cups, a candle
      F.box(M, -0.3, h, -0.18, 0.2, h + 0.015, 0.18, __FHC.chrome);
      F.sph(Pt, -0.1, h + 0.09, 0, 0.08, __FHC.white, 0.9);
      for (const x of [0.08, -0.22]) F.cyl(Pt, [x, h + 0.015, 0.08], [x, h + 0.07, 0.08], 0.035, __FHC.white);
      F.cyl(Pt, [0.45, h, 0], [0.45, h + 0.16, 0], 0.03, __FHC.cream);
      const p = F.W(0.45, h + 0.19, 0);
      G.add(__flUnit('sph6'), __flM(p[0], p[1], p[2], 0.015, 0.03, 0.015), __FHC.warm);
      break;
    }
    case 'side':
      F.box(W, -hw, h - 0.04, -hd, hw, h, hd, MID);
      F.cyl(W, [0, 0, 0], [0, h - 0.04, 0], 0.05, DARK);
      F.box(W, -0.18, 0, -0.18, 0.18, 0.04, 0.18, DARK);
      lamp(0, h, 0);
      break;
    case 'sideboard':
    case 'console': {
      F.box(k === 'sideboard' ? Pt : W, -hw, 0.1, -hd, hw, h - 0.04, hd, k === 'sideboard' ? [0.12, 0.2, 0.15] : MID);
      F.box(W, -hw - 0.02, h - 0.04, -hd - 0.02, hw + 0.02, h, hd + 0.02, DARK);
      for (const s of [-1, 1]) F.box(W, s * (hw - 0.04) - 0.03, 0, -hd + 0.03, s * (hw - 0.04) + 0.03, 0.1, hd - 0.03, DARK);
      if (k === 'sideboard') {
        for (let i = 0; i < 3; i++) F.box(M, -hw + (w * (i + 0.5)) / 3 - 0.02, 0.55, hd, -hw + (w * (i + 0.5)) / 3 + 0.02, 0.6, hd + 0.02, __FHC.brass);
        for (const x of [-0.7, 0.7]) {
          F.cyl(M, [x, h, 0], [x, h + 0.35, 0], 0.025, __FHC.brass);
          F.cyl(Pt, [x, h + 0.35, 0], [x, h + 0.55, 0], 0.02, __FHC.cream);
          const p = F.W(x, h + 0.58, 0);
          G.add(__flUnit('sph6'), __flM(p[0], p[1], p[2], 0.015, 0.03, 0.015), __FHC.warm);
        }
        extra && __xmPile(extra.presents, ...F.W(0, h, 0).filter((_, i) => i !== 1), 3, 0, 0.3, extra.rnd, y0 + h);
      } else {
        // a mirror over it, and a lamp
        const p = F.W(0, 1.6, -hd + 0.02);
        M.add(__flUnit('box'), __flM(p[0], p[1], p[2], 0.8, 0.95, 0.02, F.th), [0.75, 0.78, 0.8]);
        const q = F.W(0, 1.6, -hd + 0.005);
        Kt.B(g, 'metal').add(__flUnit('box'), __flM(q[0], q[1], q[2], 0.92, 1.07, 0.03, F.th), __FHC.brass);
        lamp(hw - 0.2, h, 0, 0.8);
      }
      break;
    }
    case 'clock': {
      F.box(W, -hw, 0, -hd, hw, h - 0.45, hd, DARK);
      F.box(W, -hw - 0.03, h - 0.45, -hd - 0.02, hw + 0.03, h, hd + 0.02, DARK);
      F.box(W, -hw - 0.05, h, -hd - 0.03, hw + 0.05, h + 0.06, hd + 0.03, MID);
      const p = F.W(0, h - 0.22, hd + 0.025);
      G.add(__flUnit('cyl'), __flM(p[0], p[1], p[2], 0.17, 0.01, 0.17, F.th, Math.PI / 2), __fhC('#f6efe0', 0.3));
      F.box(M, -0.12, 0.5, hd, 0.12, 1.35, hd + 0.01, __FHC.brass);
      F.cyl(M, [0, 0.75, hd + 0.015], [0, 0.75, hd + 0.025], 0.09, __FHC.brass);
      break;
    }
    case 'piano': {
      F.box(Pt, -hw, 0.1, -hd, hw, h, hd - 0.25, __FHC.black);
      F.box(Pt, -hw, 0.1, hd - 0.25, -hw + 0.06, 0.75, hd, __FHC.black);
      F.box(Pt, hw - 0.06, 0.1, hd - 0.25, hw, 0.75, hd, __FHC.black);
      F.box(Pt, -hw + 0.06, 0.68, hd - 0.25, hw - 0.06, 0.72, hd - 0.02, __FHC.white);
      for (let x = -hw + 0.12; x < hw - 0.1; x += 0.055) Math.round(x * 18) % 7 !== 2 && F.box(Pt, x, 0.72, hd - 0.25, x + 0.025, 0.74, hd - 0.12, __FHC.black);
      F.box(Pt, -hw, 0, -hd, hw, 0.1, hd, __FHC.black);
      for (const x of [-0.5, 0.5]) F.cyl(M, [x, h, -hd + 0.15], [x, h + 0.2, -hd + 0.15], 0.02, __FHC.brass);
      F.box(Pt, -0.25, h, -hd + 0.05, 0.15, h + 0.25, -hd + 0.07, __FHC.cream);
      break;
    }
    case 'shelf': {
      // a bookcase: frame, back, shelves every 0.42 m, books (instanced elsewhere: extra.books)
      F.box(W, -hw, 0, -hd, -hw + 0.04, h, hd, DARK);
      F.box(W, hw - 0.04, 0, -hd, hw, h, hd, DARK);
      F.box(W, -hw, 0, -hd, hw, h, -hd + 0.02, [0.22, 0.14, 0.08]);
      F.box(W, -hw - 0.02, h - 0.08, -hd, hw + 0.02, h, hd + 0.03, DARK);
      for (let y = 0.08; y < h - 0.2; y += 0.42) F.box(W, -hw + 0.04, y, -hd + 0.02, hw - 0.04, y + 0.03, hd, MID);
      extra && __fhBooks(extra.books, F, hw, hd, h, extra.rnd);
      break;
    }
    case 'desk': {
      F.box(W, -hw, h - 0.05, -hd, hw, h, hd, DARK);
      F.box(C, -hw + 0.15, h, -hd + 0.15, hw - 0.15, h + 0.004, hd - 0.12, [0.08, 0.2, 0.12]);
      for (const s of [-1, 1]) F.box(W, s * hw - (s > 0 ? 0.45 : 0), 0, -hd, s * hw + (s < 0 ? 0.45 : 0), h - 0.05, hd, MID);
      // banker's lamp, papers, an inkwell and pen
      F.cyl(M, [0.5, h, -0.15], [0.5, h + 0.3, -0.15], 0.012, __FHC.brass);
      F.box(M, 0.4, h, -0.25, 0.6, h + 0.02, -0.05, __FHC.brass);
      F.box(G, 0.36, h + 0.29, -0.2, 0.64, h + 0.35, -0.02, [0.05, 0.4, 0.15]);
      F.box(Pt, -0.4, h + 0.004, -0.1, -0.1, h + 0.008, 0.15, __FHC.white);
      F.box(Pt, -0.35, h + 0.008, -0.05, -0.05, h + 0.012, 0.18, [0.85, 0.8, 0.68]);
      F.cyl(Pt, [0.05, h, 0.1], [0.05, h + 0.05, 0.1], 0.03, __FHC.black);
      break;
    }
    case 'globe': {
      F.cyl(W, [0, 0, 0], [0, 0.04, 0], 0.25, DARK);
      F.cyl(W, [0, 0, 0], [0, 0.55, 0], 0.035, DARK);
      F.sph(Pt, 0, 0.82, 0, 0.26, [0.55, 0.45, 0.25]);
      const p = F.W(0, 0.82, 0);
      M.add(new oI(0.29, 0.012, 4, 32), __flM(p[0], p[1], p[2], 1, 1, 1, F.th + 0.4), __FHC.brass);
      break;
    }
    case 'island':
    case 'counter':
    case 'range': {
      // painted units (sage), a marble top, brass handles; the range in black iron with a copper hood
      const range = k === 'range';
      F.box(range ? M : Pt, -hw, 0.08, -hd, hw, h - 0.04, hd, range ? [0.05, 0.05, 0.05] : __FHC.sage);
      F.box(Pt, -hw, 0, -hd + 0.06, hw, 0.08, hd - 0.06, [0.1, 0.1, 0.1]);
      F.box(range ? M : Pt, -hw - 0.02, h - 0.04, -hd, hw + 0.02, h, hd + 0.02, range ? [0.08, 0.08, 0.08] : [0.88, 0.87, 0.84]);
      const n = Math.max(1, Math.round(w / 0.6));
      for (let i = 0; i < n; i++) {
        const x = -hw + (w * (i + 0.5)) / n;
        range || F.box(Pt, x - (w / n) / 2 + 0.03, 0.12, hd, x + (w / n) / 2 - 0.03, h - 0.08, hd + 0.01, __FHC.sage.map((c) => c * 0.85));
        F.box(M, x - 0.08, h - 0.16, hd + 0.01, x + 0.08, h - 0.14, hd + 0.03, __FHC.brass);
      }
      if (range) {
        F.box(M, -hw + 0.08, 0.2, hd, hw - 0.08, 0.55, hd + 0.01, [0.12, 0.12, 0.12]);
        F.cyl(M, [-hw + 0.05, 0.62, hd + 0.05], [hw - 0.05, 0.62, hd + 0.05], 0.012, __FHC.brass);
        for (const [x, z] of [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.15], [0.22, 0.15]]) F.cyl(M, [x, h, z], [x, h + 0.015, z], 0.1, [0.15, 0.15, 0.15]);
        // a copper pot on the hob, the hood above
        F.cyl(M, [-0.22, h + 0.015, 0.15], [-0.22, h + 0.2, 0.15], 0.12, __FHC.copper);
        F.box(M, -hw - 0.05, 1.7, -hd, hw + 0.05, 1.95, hd + 0.05, __FHC.copper);
        F.box(M, -0.25, 1.95, -hd, 0.25, __FH_Y.HC - y0, 0.0, __FHC.copper);
      } else if (k === 'counter' && f[6] !== 'window') {
        // upper cabinets, a tiled splashback (not on the run under the window)
        F.box(Pt, -hw, 1.5, -hd, hw, 2.3, -hd + 0.35, __FHC.sage);
        for (let i = 0; i < n; i++) {
          const x = -hw + (w * (i + 0.5)) / n;
          F.box(Pt, x - (w / n) / 2 + 0.03, 1.53, -hd + 0.35, x + (w / n) / 2 - 0.03, 2.27, -hd + 0.36, __FHC.sage.map((c) => c * 0.85));
        }
        F.box(Kt.B(g, 'tile'), -hw, h, -hd, hw, 1.5, -hd + 0.01, __FHC.tileW);
        // jars and a bread board
        for (let i = 0; i < 3; i++) F.cyl(Pt, [-hw + 0.25 + i * 0.16, h, -hd + 0.15], [-hw + 0.25 + i * 0.16, h + 0.22 - i * 0.04, -hd + 0.15], 0.06, [0.85, 0.8, 0.7]);
        F.box(W, hw - 0.6, h, -0.1, hw - 0.2, h + 0.03, 0.15, MID);
      } else if (k === 'island') {
        // the island: a copper pot rack over it, pendant lights
        for (const x of [-0.9, 0, 0.9]) {
          F.cyl(M, [x, 2.2, 0], [x, __FH_Y.HC - y0, 0], 0.01, __FHC.brass, 'cyl6');
          const p = F.W(x, 2.1, 0);
          G.add(__flUnit('sph'), __flM(p[0], p[1], p[2], 0.11, 0.11, 0.11), __FHC.warm);
          F.cyl(M, [x, 2.2, 0], [x, 2.28, 0], 0.13, __FHC.brass);
        }
        F.box(M, -0.9, 2.45, -0.05, 0.9, 2.48, 0.05, __FHC.iron);
        for (let x = -0.75; x <= 0.76; x += 0.3) F.cyl(M, [x, 2.2, 0], [x, 2.38, 0], 0.08 + (Math.round(x * 10) % 3) * 0.015, __FHC.copper);
      }
      break;
    }
    case 'rtable':
    case 'rtable2':
    case 'stool':
    case 'chair': {
      if (k === 'rtable' || k === 'rtable2') {
        F.cyl(W, [0, h - 0.04, 0], [0, h, 0], w / 2, MID);
        F.cyl(W, [0, 0, 0], [0, h - 0.04, 0], 0.06, DARK);
        F.cyl(W, [0, 0, 0], [0, 0.05, 0], 0.3, DARK);
        F.cyl(Pt, [0, h, 0], [0, h + 0.012, 0], 0.15, __FHC.white);
        break;
      }
      const sh = k === 'stool' ? 0.72 : 0.46;
      F.box(W, -hw + 0.02, sh - 0.04, -hd + 0.02, hw - 0.02, sh, hd - 0.02, MID);
      for (const [x, z] of [[-hw + 0.05, -hd + 0.05], [hw - 0.05, -hd + 0.05], [-hw + 0.05, hd - 0.05], [hw - 0.05, hd - 0.05]]) F.cyl(W, [x, 0, z], [x, sh - 0.04, z], 0.022, DARK);
      if (k === 'chair') {
        F.box(W, -hw + 0.03, sh, -hd + 0.02, hw - 0.03, h, -hd + 0.06, DARK);
        F.box(C, -hw + 0.04, sh, -hd + 0.06, hw - 0.04, sh + 0.04, hd - 0.04, [0.45, 0.08, 0.06]);
      }
      break;
    }
    case 'bench':
    case 'tbench': {
      const iron = k === 'tbench';
      for (let i = 0; i < 4; i++) F.box(W, -hw, h - 0.04, -hd + 0.02 + i * 0.105, hw, h, -hd + 0.1 + i * 0.105, MID);
      for (const x of [-hw + 0.1, hw - 0.1]) F.box(iron ? M : W, x - 0.03, 0, -hd, x + 0.03, h - 0.04, hd, iron ? __FHC.iron : DARK);
      iron && F.box(W, -hw, h + 0.1, -hd, hw, h + 0.4, -hd + 0.05, MID);
      break;
    }
    case 'coat': {
      F.cyl(W, [0, 0, 0], [0, h, 0], 0.03, DARK);
      F.cyl(W, [0, 0, 0], [0, 0.04, 0], 0.2, DARK);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * 6.283;
        F.cyl(M, [0, h - 0.15, 0], [Math.cos(a) * 0.14, h - 0.08, Math.sin(a) * 0.14], 0.01, __FHC.brass, 'cyl6');
      }
      F.box(C, -0.18, h - 1.0, 0.04, 0.12, h - 0.15, 0.18, [0.18, 0.2, 0.25]); // a coat
      F.box(C, 0.04, h - 0.8, -0.12, 0.12, h - 0.15, -0.02, [0.6, 0.06, 0.06]); // a scarf
      break;
    }
    case 'crate':
      F.box(W, -hw, 0, -hd, hw, h, hd, MID);
      for (const y of [0.05, h - 0.05]) F.box(W, -hw - 0.01, y - 0.04, -hd - 0.01, hw + 0.01, y + 0.04, hd + 0.01, DARK);
      break;
    case 'barrel':
      F.cyl(W, [0, 0, 0], [0, h, 0], 0.29, MID);
      for (const y of [0.15, 0.5, 0.8]) F.cyl(M, [0, y, 0], [0, y + 0.04, 0], 0.3, __FHC.iron, 'cyl');
      break;
    case 'work': {
      F.box(W, -hw, h - 0.06, -hd, hw, h, hd, MID);
      for (const [x, z] of [[-hw + 0.05, -hd + 0.05], [hw - 0.05, -hd + 0.05], [-hw + 0.05, hd - 0.05], [hw - 0.05, hd - 0.05]]) F.box(W, x - 0.04, 0, z - 0.04, x + 0.04, h - 0.06, z + 0.04, DARK);
      // a lantern (lit), a coil of rope, a toolbox
      const p = F.W(-0.25, h + 0.15, 0);
      G.add(__flUnit('cyl'), __flM(p[0], p[1], p[2], 0.07, 0.16, 0.07), __FHC.warm);
      F.cyl(M, [-0.25, h, 0], [-0.25, h + 0.02, 0], 0.09, __FHC.iron);
      F.cyl(M, [-0.25, h + 0.23, 0], [-0.25, h + 0.27, 0], 0.08, __FHC.iron);
      F.box(Pt, 0.1, h, -0.15, 0.45, h + 0.15, 0.1, [0.5, 0.06, 0.04]);
      break;
    }
    case 'dtable': {
      // the long dining table: a thick top, turned legs, a runner, candelabra and twelve places
      F.box(W, -hw, h - 0.06, -hd, hw, h, hd, DARK);
      for (const x of [-hw + 0.15, -hw / 3, hw / 3, hw - 0.15]) for (const z of [-hd + 0.12, hd - 0.12]) F.cyl(W, [x, 0, z], [x, h - 0.06, z], 0.05, DARK);
      F.box(C, -hw + 0.3, h, -0.2, hw - 0.3, h + 0.005, 0.2, [0.6, 0.48, 0.2]);
      for (const x of [-1.2, 0, 1.2]) {
        F.cyl(M, [x, h, 0], [x, h + 0.4, 0], 0.025, __FHC.brass);
        for (const dx of [-0.15, 0, 0.15]) {
          F.cyl(Pt, [x + dx, h + 0.4, 0], [x + dx, h + 0.58, 0], 0.016, __FHC.cream);
          const p = F.W(x + dx, h + 0.61, 0);
          G.add(__flUnit('sph6'), __flM(p[0], p[1], p[2], 0.012, 0.025, 0.012), __FHC.warm);
        }
        F.box(M, x - 0.17, h + 0.38, -0.02, x + 0.17, h + 0.4, 0.02, __FHC.brass);
      }
      for (const x of [-2.0, -1.0, 0, 1.0, 2.0])
        for (const z of [-hd + 0.25, hd - 0.25]) {
          F.cyl(Pt, [x, h, z], [x, h + 0.012, z], 0.14, __FHC.white);
          F.cyl(M, [x + 0.2, h, z], [x + 0.2, h + 0.17, z], 0.03, __FHC.chrome);
        }
      break;
    }
    case 'fridge':
      F.box(M, -hw, 0, -hd, hw, h, hd, __FHC.chrome);
      F.box(M, -0.005, 0.05, hd, 0.005, h - 0.05, hd + 0.005, [0.2, 0.2, 0.2]);
      for (const x of [-0.06, 0.06]) F.cyl(M, [x, 0.9, hd + 0.05], [x, 1.6, hd + 0.05], 0.012, __FHC.brass);
      break;
    case 'plant':
      // (when the Poly Haven palm has not loaded): a pot and a ball of leaves
      F.cyl(Pt, [0, 0, 0], [0, 0.45, 0], 0.26, [0.55, 0.3, 0.18]);
      for (let i = 0; i < 6; i++) F.sph(C, Math.cos(i) * 0.15, 0.75 + (i % 3) * 0.15, Math.sin(i) * 0.15, 0.22, [0.1, 0.3, 0.12]);
      break;
    case 'bust':
      // a marble pedestal (the bust on it is the Poly Haven model, or a plain head)
      F.box(Pt, -hw, 0, -hd, hw, 0.1, hd, [0.85, 0.84, 0.8]);
      F.box(Pt, -hw + 0.06, 0.1, -hd + 0.06, hw - 0.06, 0.98, hd - 0.06, [0.9, 0.89, 0.86]);
      F.box(Pt, -hw, 0.98, -hd, hw, 1.06, hd, [0.85, 0.84, 0.8]);
      extra && extra.noBust || (F.sph(Pt, 0, 1.3, 0, 0.13, [0.9, 0.89, 0.86], 1.2), F.box(Pt, -0.18, 1.06, -0.1, 0.18, 1.2, 0.1, [0.9, 0.89, 0.86]));
      break;
    case 'rack': {
      // a wine rack: an oak frame, diagonal lattice, bottles lying in it (instanced: extra.bottles)
      F.box(W, -hw, 0, -hd, hw, h, -hd + 0.03, DARK);
      for (let x = -hw; x <= hw + 1e-3; x += Math.max(0.5, w / Math.round(w / 0.9))) F.box(W, x - 0.03, 0, -hd, x + 0.03, h, hd, MID);
      for (let y = 0.0; y <= h; y += 0.33) F.box(W, -hw, y, -hd, hw, y + 0.025, hd, MID);
      if (extra && extra.bottles)
        for (let y = 0.1; y < h - 0.2; y += 0.33)
          for (let x = -hw + 0.08; x < hw - 0.06; x += 0.1) {
            if (extra.rnd() < 0.12) continue;
            const p = F.W(x, y + 0.045, hd - 0.15),
              q = F.W(x, y + 0.045, hd - 0.15 + 1);
            const col = ['#1d3a1e', '#2a1410', '#14240f', '#3a2a0a'][Math.floor(extra.rnd() * 4)];
            extra.bottles.push([new _A().compose(new U(...p), new Kw().setFromUnitVectors(__fhUp, new U(q[0] - p[0], 0, q[2] - p[2]).normalize()), new U(0.037, 0.3, 0.037)), col]);
          }
      break;
    }
    case 'fire':
    case 'fire2': {
      // a fireplace: stone piers and lintel round a black firebox, a hearth, an oak mantel with stockings,
      // candles and a lit garland, a chimney breast to the ceiling, and a log fire (real flames; the lamp in it
      // is one of the map's)
      const S = Kt.B(g, 'stone'),
        top = __FH_Y.HC - y0,
        st = [0.95, 0.92, 0.88];
      F.box(S, -hw, 0, -hd, -hw + 0.5, h - 0.25, hd, st);
      F.box(S, hw - 0.5, 0, -hd, hw, h - 0.25, hd, st);
      F.box(S, -hw, h - 0.45, -hd, hw, h - 0.25, hd, [0.9, 0.88, 0.84]);
      F.box(S, -hw + 0.3, h - 0.25, -hd, hw - 0.3, top, hd - 0.2, [0.92, 0.9, 0.86]);
      F.box(C, -hw + 0.5, 0, -hd, hw - 0.5, h - 0.45, hd - 0.35, __FHC.black);
      F.box(S, -hw - 0.2, 0, hd - 0.02, hw + 0.2, 0.07, hd + 0.5, [0.7, 0.68, 0.64]);
      F.box(W, -hw - 0.12, h - 0.25, -hd, hw + 0.12, h - 0.15, hd + 0.08, [0.36, 0.22, 0.12]);
      for (let i = 0; i < 3; i++) F.cyl(W, [-0.38, 0.12 + (i % 2) * 0.08, -hd + 0.2 + i * 0.08], [0.38, 0.1 + (i % 2) * 0.08, -hd + 0.18 + i * 0.08], 0.065, [0.4, 0.26, 0.15]);
      if (extra && extra.fire) {
        const p = F.W(0, 0.08, -hd + 0.28);
        __xmFire(extra.fire, p[0], p[1], p[2], extra.ticks, k === 'fire2' ? 0.75 : 0.55);
      }
      for (let i = 0; i < 3; i++) {
        const x = -0.75 + i * 0.75,
          col = i === 1 ? [0.05, 0.25, 0.1] : [0.5, 0.04, 0.04];
        F.box(C, x - 0.085, h - 0.62, hd + 0.04, x + 0.085, h - 0.26, hd + 0.12, col);
        F.box(C, x - 0.085, h - 0.75, hd + 0.04, x + 0.2, h - 0.62, hd + 0.12, col);
        F.box(C, x - 0.095, h - 0.36, hd + 0.03, x + 0.095, h - 0.26, hd + 0.13, __FHC.white);
      }
      for (const x of [-hw + 0.15, hw - 0.15]) {
        F.cyl(Pt, [x, h - 0.15, hd - 0.1], [x, h + 0.07, hd - 0.1], 0.03, __FHC.cream);
        const p = F.W(x, h + 0.11, hd - 0.1);
        G.add(__flUnit('sph6'), __flM(p[0], p[1], p[2], 0.018, 0.035, 0.018), __FHC.warm);
      }
      if (extra && extra.bulbs) {
        const pts = [];
        for (let x = -hw - 0.1; x <= hw + 0.1; x += 0.08) pts.push(F.W(x, h - 0.1 - 0.1 * Math.abs(Math.sin(((x + hw) / w) * Math.PI * 2)), hd + 0.1));
        const t = __xmTube(pts, (_, dd) => 0.065 + 0.02 * Math.sin(dd * 31), 6, 0.5);
        C.add(t, new _A(), [0.05, 0.17, 0.07]);
        t.dispose();
        for (let i = 1; i < pts.length; i += 2) extra.bulbs.push([pts[i][0], pts[i][1] - 0.05, pts[i][2], __XM_MULTI[i % 6], 0.7]);
      }
      break;
    }
    default:
      break;
  }
}
// books on a bookcase's shelves (instanced: [matrix, colour])
function __fhBooks(out, F, hw, hd, h, rnd) {
  const COL = ['#5a1a18', '#1d3b2c', '#1c2448', '#6b4a20', '#2a2a2a', '#7a5a2a', '#3a1d3a', '#8a2a1a'],
    low = Zw.getState().quality === 'low';
  for (let y = 0.11; y < h - 0.35; y += 0.42) {
    let x = -hw + 0.06;
    while (x < hw - 0.08) {
      const t = 0.025 + rnd() * 0.04,
        bh = 0.24 + rnd() * 0.12,
        bd = 0.18 + rnd() * 0.06,
        lean = rnd() < 0.06;
      if (rnd() < 0.08) {
        x += 0.08;
        continue;
      }
      if (!low || rnd() < 0.6) {
        const p = F.W(x + t / 2, y + bh / 2, hd - bd / 2 - 0.02);
        out.push([__flM(p[0], p[1], p[2], t, bh, bd, F.th, 0, lean ? 0.18 : 0), COL[Math.floor(rnd() * COL.length)]]);
      }
      x += t + 0.003;
    }
  }
}

// ---------------------------------------------------------------- drawing: the house
// a Poly Haven model's parts, its materials made indoor ones (no sun, warm fill) and its lamp glass lit; scale
// to the size in __FH_MODELS. null when the model did not load
function __fhModel(models, kind) {
  const spec = __FH_MODELS[kind],
    g = spec && models[spec[0]];
  if (!g) return null;
  __FH.mparts || (__FH.mparts = {});
  let P = __FH.mparts[kind];
  if (!P || P.g !== g) {
    const pp = __flParts(g);
    if (!pp.parts.length) return null;
    const size = pp.size,
      s = spec[2] === 'h' ? spec[1] / Math.max(1e-3, size.y) : spec[1] / Math.max(1e-3, size.x);
    P = __FH.mparts[kind] = { g, s, size, parts: pp.parts };
  }
  // (materials are made for each build, and released with it)
  const parts = P.parts.map((p) => {
    const m = p.mat.clone();
    /bulb|glass|candle|light/i.test(p.mat.name || '') && ((m.emissive = new UA('#ffcf8a')), (m.emissiveIntensity = 2.2));
    return { ...p, mat: __fhIn(m, { env: 0.45 }) };
  });
  return { s: P.s, size: P.size, parts };
}
function __fhHouseDraw(Kt, root, models, ticks, bulbs, presents, wreaths, lightsOut) {
  const { CF, CC, LDG, HF, HC } = __FH_Y,
    M = __fhMats(),
    H = root.__fhGroups.house,
    books = [],
    bottles = [],
    rnd = (() => {
      let s = 211;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })(),
    extra = { books, bottles, presents, rnd, fire: H, ticks, bulbs },
    inst = {}, // model kind -> [x, y, z, scale, turn]
    mdl = {};
  for (const k in __FH_MODELS) mdl[k] = __fhModel(models, k);
  const place = (k, x, y, z, ry = 0, s = 1) => mdl[k] && (inst[k] || (inst[k] = [])).push([x, y, z, mdl[k].s * s, ry]);
  // furniture: the Poly Haven model where there is one (sofas, armchairs, tables, consoles, palms, busts), else
  // modelled here
  for (const f of __FH_F) {
    const [k, cx, cz, r, y0] = f;
    if (k === 'tbench' || k === 'tree') continue;
    const g = y0 > 0 ? 'cabin' : 'house';
    if (mdl[k] && (k === 'sofa' || k === 'arm' || k === 'coffee' || k === 'console' || k === 'plant')) {
      place(k, cx, y0, cz, (r * Math.PI) / 2);
      continue;
    }
    if (k === 'side' && mdl.side) {
      place('side', cx, y0, cz, (r * Math.PI) / 2);
      // a lamp on it
      const F = __fhLocal(cx, cz, r, y0),
        top = mdl.side.size.y * mdl.side.s;
      F.cyl(Kt.B(g, 'metal'), [0, top, 0], [0, top + 0.3, 0], 0.025, __FHC.brass);
      F.cyl(Kt.B(g, 'metal'), [0, top, 0], [0, top + 0.03, 0], 0.08, __FHC.brass);
      const p = F.W(0, top + 0.4, 0);
      Kt.B(g, 'glow').add(__flUnit('cone'), __flM(p[0], p[1], p[2], 0.17, 0.22, 0.17), __FHC.warmDim);
      continue;
    }
    if (k === 'bust' && mdl.bust) {
      __fhFurnDraw(Kt, g, f, { noBust: 1 });
      place('bust', cx, y0 + 1.06, cz, (r * Math.PI) / 2);
      continue;
    }
    __fhFurnDraw(Kt, g, f, extra);
  }
  // vases on the hall's table and the consoles, a mirror over the hall's console
  place('vase', 52.5, HF + 0.78, 12.4, 0.3);
  place('vase', 54.35, HF + 0.82, 9.1, 0.1, 0.8);
  place('vase', 65.2, HF + 0.82, 9.1, 0.1, 0.8);
  mdl.mirror ? place('mirror', 54.8, HF + 1.05, 8.88, 0) : __fhPainting(Kt, 'house', 'alps', 54.8, HF + 1.9, 8.85, 0, 0.9, 1.1);
  // chandeliers: the hall, the dining room (two), the great room; a brass rose and chain from the ceiling
  for (const [x, z] of [[52.5, 12.4], [63.2, 12.4], [66.2, 12.4], [54.2, 23.6]]) {
    const Mm = Kt.B('house', 'metal');
    if (mdl.chandelier) {
      const h = mdl.chandelier.size.y * mdl.chandelier.s,
        y = HC - 0.45 - h;
      place('chandelier', x, y, z, 0);
      __fhCyl(Mm, [x, HC, z], [x, y + h - 0.02, z], 0.012, __FHC.brass, 'cyl6');
    } else {
      const y = HC - 1.2;
      __fhCyl(Mm, [x, HC, z], [x, y, z], 0.012, __FHC.brass, 'cyl6');
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * 6.283,
          px = x + Math.cos(a) * 0.55,
          pz = z + Math.sin(a) * 0.55;
        __fhCyl(Mm, [x, y, z], [px, y + 0.12, pz], 0.012, __FHC.brass, 'cyl6');
        Kt.B('house', 'glow').add(__flUnit('sph6'), __flM(px, y + 0.22, pz, 0.025, 0.05, 0.025), __FHC.warm);
      }
    }
    __fhCyl(Mm, [x, HC - 0.01, z], [x, HC - 0.06, z], 0.16, __FHC.brass);
  }
  // smaller brass chandeliers in the lounge, the library and the wine cellar (candle bulbs)
  for (const [x, z, y] of [[41.3, 23.35, HC - 1.1], [41.3, 12.4, HC - 1.1], [45.0, 3.6, HC - 0.75]]) {
    const Mm = Kt.B('house', 'metal');
    __fhCyl(Mm, [x, HC, z], [x, y, z], 0.012, __FHC.brass, 'cyl6');
    const ring = [];
    for (let k = 0; k <= 24; k++) ring.push([x + Math.cos((k / 24) * 6.283) * 0.45, y, z + Math.sin((k / 24) * 6.283) * 0.45]);
    const t = __xmTube(ring, 0.02, 5, 1);
    Mm.add(t, new _A(), __FHC.brass);
    t.dispose();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.283,
        px = x + Math.cos(a) * 0.45,
        pz = z + Math.sin(a) * 0.45;
      __fhCyl(Mm, [x, y - 0.05, z], [px, y, pz], 0.01, __FHC.brass, 'cyl6');
      __fhCyl(Kt.B('house', 'paint'), [px, y, pz], [px, y + 0.12, pz], 0.014, __FHC.cream, 'cyl6');
      Kt.B('house', 'glow').add(__flUnit('sph6'), __flM(px, y + 0.15, pz, 0.014, 0.03, 0.014), __FHC.warm);
    }
  }
  // the models, instanced (one draw per part per model)
  for (const k in inst) {
    const before = H.children.length;
    __flInstance(H, mdl[k].parts, inst[k], !1);
    for (let i = before; i < H.children.length; i++) H.children[i].name || (H.children[i].name = 'frost_fh_m_' + k);
  }
  // rugs: under the hall's table, the great room's sofa, the lounge's, in the library, under the dining table;
  // runners down the gallery, the landing, the cabin
  const art = (g, part, x, z, w, d, ry, y) => __fhPic(Kt.B(g, 'art'), __FH_ART[part], 1024, 512, x, y, z, w, d, ry, 1);
  art('house', 'rug', 52.5, 12.4, 4.2, 3.0, 0, HF + 0.006);
  art('house', 'rug', 54.2, 24.2, 4.8, 3.4, 0, HF + 0.006);
  art('house', 'rug', 38.9, 23.35, 3.4, 2.6, Math.PI / 2, HF + 0.006);
  art('house', 'rug', 41.3, 12.5, 3.6, 2.6, 0, HF + 0.006);
  art('house', 'runner', 64.7, 12.4, 6.2, 2.8, 0, HF + 0.006);
  for (let x = 39; x < 73; x += 6.5) art('house', 'runner', x + 2.8, 17.6, 5.6, 1.2, 0, HF + 0.006);
  art('cabin', 'runner', 54.5, 6.55, 2.0, 1.0, 0, CF + 0.006);
  art('house', 'runner', 34.4, 12.0, 2.2, 1.0, 0, HF + 0.006);
  art('house', 'runner', 45.2, 4.7, 3.0, 1.0, 0, LDG + 0.006);
  // paintings in gilt frames
  const P = (part, x, y, z, ry, w, h, g = 'house') => __fhPainting(Kt, g, part, x, y, z, ry, w, h);
  const ART = ['alps', 'aurora', 'ship'];
  P('ship', 46.5, HF + 2.2, 10.0, Math.PI / 2, 1.2, 0.9);
  P('alps', 46.5, HF + 2.2, 14.9, Math.PI / 2, 1.2, 0.9);
  P('aurora', 58.5, HF + 2.2, 15.1, -Math.PI / 2, 1.0, 0.8);
  P('alps', 48.0, HF + 2.3, 16.0, Math.PI, 1.3, 1.0);
  P('aurora', 57.0, HF + 2.3, 16.0, Math.PI, 1.3, 1.0);
  P('alps', 70.5, HF + 2.2, 12.4, -Math.PI / 2, 2.0, 1.3);
  P('ship', 61.0, HF + 2.1, 16.0, Math.PI, 1.2, 0.9);
  P('aurora', 68.5, HF + 2.1, 16.0, Math.PI, 1.2, 0.9);
  P('alps', 54.2, HF + 2.6, 26.9, Math.PI, 1.6, 1.0);
  P('ship', 46.5, HF + 2.2, 25.6, Math.PI / 2, 1.1, 0.8);
  P('aurora', 62.0, HF + 2.2, 26.2, -Math.PI / 2, 1.1, 0.8);
  P('aurora', 37.0, HF + 2.4, 23.35, Math.PI / 2, 1.2, 0.8);
  P('ship', 43.5, HF + 2.2, 19.2, 0, 1.2, 0.85);
  P('alps', 46.1, HF + 2.2, 26.3, -Math.PI / 2, 1.0, 0.75);
  P('map', 34.4, HF + 1.5, 10.4, 0, 0.9, 0.9);
  let ai = 0;
  for (const x of [44.0, 47.5, 58.0, 61.0, 68.0, 71.5]) P(ART[ai++ % 3], x, HF + 1.9, 16.4, 0, 1.0, 0.75);
  for (const x of [44.0, 47.5, 61.0, 64.5, 71.5]) P(ART[ai++ % 3], x, HF + 1.9, 18.8, Math.PI, 1.0, 0.75);
  P('aurora', 54.5, CF + 1.75, 4.28, 0, 0.7, 0.5, 'cabin');
  // the great room's tree: a fir from the pack (snow-free), 3.6 m, baubles, lights, a star, presents, a skirt
  if (models.firs) {
    const tx = 60.2,
      tz = 25.8,
      fir = __flParts(models.firs, 'Christmas tree_LOD1_');
    if (fir.parts.length) {
      const s = 3.5 / Math.max(0.5, fir.size.y),
        parts = fir.parts.map((p) => ({ ...p, mat: __fhIn(p.mat.clone()) })),
        before = H.children.length;
      __flInstance(H, parts, [[tx, HF, tz, s, 0.7]], !1);
      for (let i = before; i < H.children.length; i++) H.children[i].name || (H.children[i].name = 'frost_fh_tree');
      const crown = __xmCrown(fir.parts),
        Ht = crown.H * s,
        R = (h) => crown.r(h / s) * s,
        baubles = [];
      for (let k = 0; k < 110; k++) {
        const h = Ht * (0.12 + rnd() * 0.75),
          a = rnd() * 6.28,
          r = R(h) * 0.85,
          sz = 0.045 + rnd() * 0.03;
        baubles.push([__flM(tx + Math.cos(a) * r, HF + h, tz + Math.sin(a) * r, sz, sz, sz), ['#a8101a', '#d4a73a', '#c9ccd2', '#1d3d8f', '#7a1020'][k % 5]]);
      }
      __xmInst(H, __flUnit('sph'), __fhIn(new ri({ color: '#ffffff', metalness: 0.65, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }), { env: 0.6 }), baubles, 'frost_fh_baubles');
      for (let t = 0, last = null; t <= 1; t += 0.003) {
        const h = Ht * (0.08 + 0.82 * t),
          a = t * 6.5 * 6.283,
          r = R(h) * 0.95,
          p = [tx + Math.cos(a) * r, HF + h, tz + Math.sin(a) * r];
        if (last && Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) < 0.22) continue;
        last = p;
        bulbs.push([p[0], p[1] - 0.02, p[2], __XM_WARM[bulbs.length % 3], 0.65]);
      }
      __xmInst(H, __XM.star || (__XM.star = __xmStarGeo(1, 0.42, 0.2)), __flOwn(new Gw({ color: '#ffd36a', metalness: 0.7, roughness: 0.25, emissive: '#ffb22e', emissiveIntensity: 2.6 })), [[__flM(tx, HF + Ht + 0.12, tz, 0.2, 0.2, 0.2, 0.6), null]], 'frost_fh_star');
    }
  }
  Kt.B('house', 'cloth').add(__flUnit('cyl'), __flM(60.2, HF + 0.01, 25.8, 0.9, 0.02, 0.9), [0.5, 0.04, 0.04]);
  __xmPile(presents, 60.2, 25.8, 9, 0.55, 1.15, rnd, HF);
  __xmPile(presents, 38.6, 23.35, 3, 0, 0.3, rnd, HF + 0.42);
  __xmPile(presents, 52.5, 12.4, 2, 0.3, 0.45, rnd, HF + 0.78);
  wreaths.push([54.2, HF + 3.7, 26.85, Math.PI, 0.45], [37.05, HF + 3.4, 23.35, Math.PI / 2, 0.4], [52.5, HF + 3.6, 8.88, 0, 0.5]);
  // wall sconces: through the rooms, both sides of the gallery, the stairs, the cellar
  const sconce = (g, x, y, z, nx, nz) => {
    const Mx = Kt.B(g, 'metal');
    Mx.add(__flUnit('box'), __flM(x + nx * 0.012, y, z + nz * 0.012, Math.abs(nz) * 0.1 + Math.abs(nx) * 0.025, 0.24, Math.abs(nx) * 0.1 + Math.abs(nz) * 0.025), __FHC.brass);
    __fhCyl(Mx, [x, y, z], [x + nx * 0.18, y + 0.05, z + nz * 0.18], 0.01, __FHC.brass, 'cyl6');
    Kt.B(g, 'glow').add(__flUnit('cone'), __flM(x + nx * 0.18, y + 0.14, z + nz * 0.18, 0.1, 0.16, 0.1, 0, Math.PI), __FHC.warmDim);
  };
  const sy = HF + 2.4;
  for (const [x, z, nx, nz] of [
    [46.5, 11.0, 1, 0], [46.5, 14.0, 1, 0], [58.5, 9.6, -1, 0], [49.0, 16.0, 0, -1], [56.0, 16.0, 0, -1], // hall
    [58.9, 9.6, 1, 0], [58.9, 15.2, 1, 0], [70.5, 10.2, -1, 0], [70.5, 14.6, -1, 0], // dining room
    [46.5, 20.6, 1, 0], [62.0, 20.6, -1, 0], [62.0, 26.6, -1, 0], [50.0, 27.5, 0, -1], [58.4, 27.5, 0, -1], // great room
    [46.1, 20.4, -1, 0], [46.1, 26.4, -1, 0], [44.0, 19.2, 0, 1], // lounge
    [62.4, 26.6, 1, 0], [72.0, 19.2, 0, 1], // kitchen
    [46.1, 10.0, -1, 0], [46.1, 15.2, -1, 0], // library
  ])
    sconce('house', x, sy, z, nx, nz);
  for (let x = 38.5; x < 74; x += 5) {
    __fhVolAt(x, HF + 1, 16.35, 0, 0) && __fhVolAt(x, HF + 1, 16.35, 0, 0).st === 'door' || sconce('house', x, HF + 2.2, 16.4, 0, 1);
    __fhVolAt(x, HF + 1, 18.85, 0, 0) && __fhVolAt(x, HF + 1, 18.85, 0, 0).st === 'door' || sconce('house', x, HF + 2.2, 18.8, 0, -1);
  }
  sconce('house', 49.4, HF + 2.3, 7.2, 1, 0);
  sconce('house', 41.6, HF + 2.3, 7.2, 1, 0);
  sconce('house', 49.0, LDG + 2.0, 2.4, -1, 0);
  sconce('house', 41.0, LDG + 1.9, 5.2, 1, 0);
  sconce('house', 36.1, -3.0, 14.2, -1, 0);
  sconce('house', 31.0, -3.0, 12.0, 1, 0);
  sconce('cabin', 53.0, 0.0, 4.35, 0, 1);
  sconce('cabin', 50.6, LDG + 2.0, 3.0, 0, 1);
  // the kitchen's "window" over the sink (snow light: it is bigger on the inside), with muntins and curtains
  {
    const G = Kt.B('house', 'glow'),
      Pt = Kt.B('house', 'paint'),
      C = Kt.B('house', 'cloth'),
      x = 74.49,
      z0 = 20.0,
      z1 = 22.0,
      y0 = HF + 1.35,
      y1 = HF + 2.7;
    __fhQuad(G, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [-1, 0, 0], __FHC.pale);
    __fhBox(Pt, x - 0.06, y0 - 0.06, z0 - 0.06, x, y0, z1 + 0.06, __FHC.white);
    __fhBox(Pt, x - 0.04, y1, z0 - 0.06, x, y1 + 0.06, z1 + 0.06, __FHC.white);
    __fhBox(Pt, x - 0.03, y0, (z0 + z1) / 2 - 0.02, x, y1, (z0 + z1) / 2 + 0.02, __FHC.white);
    __fhBox(Pt, x - 0.03, (y0 + y1) / 2 - 0.02, z0, x, (y0 + y1) / 2 + 0.02, z1, __FHC.white);
    for (const z of [z0 - 0.22, z1 + 0.07]) __fhBox(C, x - 0.08, y0 - 0.1, z, x - 0.04, y1 + 0.2, z + 0.15, [0.55, 0.1, 0.08]);
    __fhBox(Pt, 73.9, HF + 0.86, 20.6, 74.4, HF + 0.93, 21.4, __FHC.white); // the sink
    __fhCyl(Kt.B('house', 'metal'), [74.38, HF + 0.92, 21.0], [74.38, HF + 1.22, 21.0], 0.015, __FHC.brass);
    __fhCyl(Kt.B('house', 'metal'), [74.38, HF + 1.22, 21.0], [74.18, HF + 1.2, 21.0], 0.015, __FHC.brass);
  }
  // books and bottles: one instanced draw each
  __xmInst(H, __flUnit('box'), M.books, books, 'frost_fh_books');
  __xmInst(H, __flUnit('cyl'), M.books, bottles, 'frost_fh_bottles');
  // string lights along the cabin's front wall, and over the dining room's sideboard
  lightsOut.push([[52.0, CC - 0.25, 7.05], [57.0, CC - 0.25, 7.05], 0.15, 'warm', 0.26]);
  lightsOut.push([[63.6, HF + 2.0, 8.95], [65.8, HF + 2.0, 8.95], 0.12, 'warm', 0.2]);
}
// the cabin's inside: plank floor and ceiling (the walls are the logs), beams, the windows seen from inside,
// coat hooks, door casing, a lantern
function __fhCabinDraw(Kt) {
  const { CF, CC } = __FH_Y,
    W = Kt.B('cabin', 'wood'),
    Pt = Kt.B('cabin', 'paint'),
    G = Kt.B('cabin', 'glow'),
    C = Kt.B('cabin', 'cloth'),
    M = Kt.B('cabin', 'metal'),
    hole = [51.8, 4.35, 57.2, 5.75];
  // the floor round the stairwell, and the ceiling (both reach a little under the logs)
  for (const r of __fhSub2([51.7, 4.2, 57.3, 7.62], hole)) __fhQuad(W, [r[0], CF, r[1]], [r[2], CF, r[1]], [r[2], CF, r[3]], [r[0], CF, r[3]], [0, 1, 0], [0.7, 0.52, 0.38]);
  __fhQuad(W, [51.7, CC, 4.2], [57.3, CC, 4.2], [57.3, CC, 7.4], [51.7, CC, 7.4], [0, -1, 0], [0.55, 0.4, 0.28]);
  for (const x of [53.0, 54.5, 56.0]) __fhBox(W, x - 0.09, CC - 0.18, 4.2, x + 0.09, CC, 7.4, [0.38, 0.25, 0.15]);
  // the windows from inside: frosted panes with daylight in them, a frame, curtains
  for (const xm of [52.7, 56.3]) {
    const a = xm - 0.45,
      b = xm + 0.45;
    __fhQuad(G, [a, 1.1, 7.31], [b, 1.1, 7.31], [b, 1.95, 7.31], [a, 1.95, 7.31], [0, 0, -1], __FHC.pale);
    __fhBox(Pt, a - 0.06, 1.04, 7.24, b + 0.06, 1.1, 7.33, __FHC.cream);
    __fhBox(Pt, a - 0.06, 1.95, 7.24, b + 0.06, 2.01, 7.33, __FHC.cream);
    __fhBox(Pt, xm - 0.02, 1.1, 7.27, xm + 0.02, 1.95, 7.31, __FHC.cream);
    for (const x of [a - 0.18, b + 0.03]) __fhBox(C, x, 1.0, 7.18, x + 0.15, 2.1, 7.24, [0.5, 0.06, 0.05]);
  }
  // the door's casing inside, coat hooks, a lantern on a hook from the middle beam
  __fhBox(W, 53.86, CF, 7.26, 54.0, 2.36, 7.32, [0.38, 0.25, 0.15]);
  __fhBox(W, 55.0, CF, 7.26, 55.14, 2.36, 7.32, [0.38, 0.25, 0.15]);
  __fhBox(W, 53.86, 2.3, 7.26, 55.14, 2.42, 7.32, [0.38, 0.25, 0.15]);
  __fhBox(W, 51.78, 1.62, 5.8, 51.82, 1.72, 7.1, [0.38, 0.25, 0.15]);
  for (let z = 5.95; z < 7.05; z += 0.25) __fhCyl(M, [51.82, 1.67, z], [51.95, 1.72, z], 0.01, __FHC.brass, 'cyl6');
  __fhBox(C, 51.84, 0.95, 6.0, 51.98, 1.67, 6.4, [0.2, 0.22, 0.3]);
  __fhBox(C, 51.84, 1.15, 6.6, 51.94, 1.67, 6.75, [0.6, 0.06, 0.06]);
  __fhCyl(M, [54.5, CC - 0.18, 6.2], [54.5, CC - 0.36, 6.2], 0.008, __FHC.iron, 'cyl6');
  __fhCyl(M, [54.5, CC - 0.36, 6.2], [54.5, CC - 0.4, 6.2], 0.09, __FHC.iron);
  __fhCyl(G, [54.5, CC - 0.62, 6.2], [54.5, CC - 0.4, 6.2], 0.07, __FHC.warm);
  __fhCyl(M, [54.5, CC - 0.66, 6.2], [54.5, CC - 0.62, 6.2], 0.09, __FHC.iron);
}

// ---------------------------------------------------------------- drawing: doors and hatches (moving parts)
// The cabin door (red planks, a Z brace, an iron ring, the wreath outside) and the bookcase door (a full
// bookcase on the library side, planks and iron straps on the secret room's), each on its own pivot.
function __fhDoorLeaves(parent, M) {
  const { CF, HF } = __FH_Y,
    out = [];
  // cabin door: leaf along local +x (0.94 wide), 1.97 high, thickness on z (front: +z, outside)
  {
    const piv = new ji(),
      W = __flMB(),
      Mt = __flMB(),
      RED = [0.42, 0.06, 0.04];
    piv.position.set(54.03, CF, 7.46);
    for (let i = 0; i < 5; i++) __fhBox(W, 0.005 + i * 0.188, 0, -0.03, 0.188 * (i + 1) - 0.003, 1.97, 0.03, RED.map((c) => c * (0.85 + ((i * 37) % 10) / 33)));
    for (const z of [0.035, -0.035]) {
      for (const y of [0.35, 1.62]) __fhBox(W, 0.05, y - 0.06, z - 0.006, 0.89, y + 0.06, z + 0.006, RED.map((c) => c * 0.75));
      W.add(__flUnit('box'), __flM(0.47, 0.985, z, 1.18, 0.11, 0.012, 0, 0, Math.atan2(1.27, 0.84)), RED.map((c) => c * 0.75));
    }
    for (const z of [0.05, -0.05]) Mt.add(new oI(0.05, 0.009, 6, 14), __flM(0.78, 1.0, z, 1, 1, 1), __FHC.iron);
    for (const y of [0.3, 1.65]) __fhBox(Mt, 0, y - 0.025, 0.031, 0.32, y + 0.025, 0.036, __FHC.iron);
    const a = new Ow(W.build(), M.wood),
      b = new Ow(Mt.build(), M.metal),
      wr = new Ow(__xmWreathGeo(), __flOwn(new Gw({ color: '#ffffff', roughness: 0.85, vertexColors: !0 })));
    a.name = 'frost_fh_doorleaf';
    b.name = 'frost_fh_doorleaf';
    wr.name = 'frost_fh_wreath';
    wr.position.set(0.47, 1.25, 0.09);
    wr.scale.setScalar(0.96);
    a.castShadow = b.castShadow = !0;
    piv.add(a, b, wr);
    parent.cabin.add(piv);
    out.push({ piv, base: 0, swing: 1 });
    piv.rotation.y = 0;
  }
  // the bookcase: pivot at the doorway's south corner on the secret room's side; leaf along local +x (1.5 wide,
  // turned to run north), its depth on local +z (towards the library), shelves facing the library, 2.5 high.
  // Open, it turns a further quarter into the secret room and rests along the doorway's south jamb
  {
    const piv = new ji(),
      W = __flMB(),
      Mt = __flMB(),
      B2 = __flMB(),
      DARK = [0.3, 0.19, 0.11],
      MID = [0.55, 0.38, 0.24],
      Wd = 1.5,
      Ht = 2.5,
      Dp = 0.34;
    piv.position.set(36.1, HF, 13.25);
    __fhBox(W, 0, 0, 0, 0.04, Ht, Dp, DARK);
    __fhBox(W, Wd - 0.04, 0, 0, Wd, Ht, Dp, DARK);
    __fhBox(W, 0, Ht - 0.07, 0, Wd, Ht, Dp + 0.03, DARK);
    __fhBox(W, 0, 0, 0, Wd, Ht, 0.02, [0.22, 0.14, 0.08]);
    for (let y = 0.06; y < Ht - 0.2; y += 0.42) __fhBox(W, 0.04, y, 0.02, Wd - 0.04, y + 0.03, Dp, MID);
    for (const y of [0.25, 1.25, 2.25]) __fhBox(Mt, 0.02, y - 0.03, -0.008, Wd - 0.02, y + 0.03, 0, __FHC.iron);
    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647,
      COL = ['#5a1a18', '#1d3b2c', '#1c2448', '#6b4a20', '#2a2a2a', '#7a5a2a'];
    for (let y = 0.09; y < Ht - 0.45; y += 0.42)
      for (let x = 0.07; x < Wd - 0.08; ) {
        const t = 0.025 + rnd() * 0.04,
          bh = 0.24 + rnd() * 0.12,
          bd = 0.2 + rnd() * 0.06;
        B2.add(__flUnit('box'), __flM(x + t / 2, y + bh / 2, Dp - 0.02 - bd / 2, t, bh, bd), __fhC(COL[Math.floor(rnd() * COL.length)]));
        x += t + 0.004;
      }
    const a = new Ow(W.build(), M.wood),
      b = new Ow(Mt.build(), M.metal),
      c = new Ow(B2.build(), M.cloth);
    a.name = b.name = c.name = 'frost_fh_bookcase';
    piv.add(a, b, c);
    parent.house.add(piv);
    out.push({ piv, base: Math.PI / 2, swing: 1 });
    piv.rotation.y = Math.PI / 2;
  }
  return out;
}
// hatches: a stone kerb and an iron coaming round the opening; the lid (iron, brass rim, ring handle) hinged on
// the side away from where you climb out
function __fhHatches(Kt, parent, M) {
  const lids = [];
  for (const L of __FH_LAD) {
    if (L.hatch < 0) continue;
    const cx = (L.zone[0] + L.zone[2]) / 2,
      cz = (L.zone[1] + L.zone[3]) / 2,
      S = Kt.B('hatch', 'stone'),
      Mt = Kt.B('hatch', 'metal');
    for (const [x0, z0, x1, z1] of [[-0.95, -0.95, 0.95, -0.5], [-0.95, 0.5, 0.95, 0.95], [-0.95, -0.5, -0.5, 0.5], [0.5, -0.5, 0.95, 0.5]]) __fhBox(S, cx + x0, -0.02, cz + z0, cx + x1, 0.09, cz + z1, [0.82, 0.8, 0.78]);
    for (const [x0, z0, x1, z1] of [[-0.6, -0.6, 0.6, -0.5], [-0.6, 0.5, 0.6, 0.6], [-0.6, -0.5, -0.5, 0.5], [0.5, -0.5, 0.6, 0.5]]) __fhBox(Mt, cx + x0, 0.0, cz + z0, cx + x1, 0.12, cz + z1, __FHC.iron);
    // the lid, built in its hinge's frame: x across the hinge line, z away from it (the opening side)
    const hx = -L.fx,
      hz = -L.fz, // hinge side: opposite to the way you climb out
      piv = new ji(),
      B = __flMB();
    piv.position.set(cx + hx * 0.49, 0.12, cz + hz * 0.49);
    piv.rotation.order = 'YXZ'; // turn to face across the opening, then lift about the hinge line
    piv.rotation.y = Math.atan2(-hx, -hz); // local +z points from the hinge across the lid
    __fhBox(B, -0.49, -0.04, 0.0, 0.49, 0.0, 0.98, __FHC.iron);
    for (const [x0, z0, x1, z1] of [[-0.49, 0, 0.49, 0.04], [-0.49, 0.94, 0.49, 0.98], [-0.49, 0, -0.45, 0.98], [0.45, 0, 0.49, 0.98]]) __fhBox(B, x0, 0, z0, x1, 0.012, z1, __FHC.brass);
    __fhBox(B, -0.45, 0, 0.47, 0.45, 0.01, 0.51, __FHC.iron);
    __fhBox(B, -0.02, 0, 0.04, 0.02, 0.01, 0.94, __FHC.iron);
    B.add(new oI(0.06, 0.01, 6, 14), __flM(0, 0.012, 0.85, 1, 1, 1, 0, Math.PI / 2), __FHC.brass);
    for (const x of [-0.3, 0.3]) __fhCyl(B, [x - 0.08, -0.02, 0], [x + 0.08, -0.02, 0], 0.025, __FHC.iron);
    const lid = new Ow(B.build(), M.metal);
    lid.name = 'frost_fh_lid';
    lid.castShadow = !0;
    piv.add(lid);
    parent.hatch.add(piv);
    lids.push({ piv, L });
  }
  return lids;
}

// ---------------------------------------------------------------- the view: build, then every frame
function __fhView(root, models, ticks, lights, bulbs, presents, wreaths) {
  const m = aw();
  if (!m.__fh) return;
  __FH.under = !1;
  const M = __fhMats(),
    Kt = __fhKit(),
    groups = { cabin: new ji(), house: new ji(), tun: new ji(), hatch: new ji() };
  for (const k in groups) (groups[k].name = 'fh_' + k), root.add(groups[k]);
  root.__fhGroups = groups;
  // the old cabin's dark inside, its painted-on door and that door's wreath (63-frostline-christmas.js) go:
  // the cabin is hollow now, and its door moves
  __fhCull(root, 'frost_xm_dark', [51.55, 0.25, 4.2, 57.45, 3.0, 7.4]);
  __fhCull(root, 'frost_xm_trim', [53.995, 0.25, 7.38, 55.005, 2.31, 7.565]);
  // ...and its stone footing, one solid slab under the whole cabin, which would close the stairwell: drawn again
  // as a ring round the walls
  __fhCull(root, 'frost_xm_stone', [51.4, -0.05, 3.9, 57.6, 0.35, 7.7]);
  for (const [x0, z0, x1, z1] of [[51.45, 3.95, 57.55, 4.25], [51.45, 7.35, 57.55, 7.65], [51.45, 4.25, 51.75, 7.35], [57.25, 4.25, 57.55, 7.35]]) __fhBox(Kt.B('hatch', 'stone'), x0, -0.01, z0, x1, 0.31, z1, [1, 1, 1]);
  for (let i = wreaths.length - 1; i >= 0; i--) Math.abs(wreaths[i][0] - 54.5) < 0.05 && Math.abs(wreaths[i][2] - 7.5) < 0.05 && wreaths.splice(i, 1);
  __fhFaces(Kt);
  __fhCasings(Kt);
  __fhStairsDraw(Kt);
  __fhRailsDraw(Kt);
  __fhLaddersDraw(Kt);
  __fhCabinDraw(Kt);
  __fhTunnelDraw(Kt);
  __fhHouseDraw(Kt, root, models, ticks, bulbs, presents, wreaths, lights);
  const lids = __fhHatches(Kt, groups, M),
    leaves = __fhDoorLeaves(groups, M);
  // merged meshes: one per group and material
  for (const key in Kt.K) {
    const { g, m: mat, B } = Kt.K[key];
    if (!B.count) continue;
    const geo = B.build();
    if (B.__col) {
      const c = geo.attributes.color;
      for (const [k, col] of B.__col) for (let j = 0; j < 4; j++) c.setXYZ(k + j, col[0], col[1], col[2]);
    }
    const o = __flMesh(groups[g], geo, M[mat], 'frost_fh_' + g + '_' + mat, g === 'cabin' || g === 'hatch');
    o.receiveShadow = g === 'cabin' || g === 'hatch';
  }
  for (const k of ['house', 'tun']) groups[k].traverse((o) => o.isMesh && ((o.castShadow = !1), (o.receiveShadow = !1)));
  __FH.groups = groups;
  // every frame
  const doors = [m.doors[m.__fh.dc], m.doors[m.__fh.db]],
    leafBoxes = [m.__fh.lc, m.__fh.lb];
  ticks.push((dt, s) => {
    try {
      __fhTick(dt, s, m, groups, lids, leaves, doors, leafBoxes);
    } catch (e) {
      __FH.err = String(e && e.stack);
    }
  });
}
// cut the triangles of one of 63's meshes that lie wholly inside a box
function __fhCull(root, name, b) {
  root.traverse((o) => {
    if (!o.isMesh || o.name !== name || !o.geometry.index) return;
    const p = o.geometry.attributes.position,
      idx = o.geometry.index.array,
      keep = [],
      inside = (i) => {
        const x = p.getX(i),
          y = p.getY(i),
          zz = p.getZ(i);
        return x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && zz >= b[2] && zz <= b[5];
      };
    for (let k = 0; k < idx.length; k += 3) (inside(idx[k]) && inside(idx[k + 1]) && inside(idx[k + 2])) || keep.push(idx[k], idx[k + 1], idx[k + 2]);
    keep.length < idx.length && o.geometry.setIndex(p.count > 65535 ? new gi(new Uint32Array(keep), 1) : new gi(new Uint16Array(keep), 1));
  });
}
function __fhTick(dt, s, m, groups, lids, leaves, doors, leafBoxes) {
  dt = Math.min(dt, 0.1);
  const cam = s.camera.position,
    st = eA.state;
  __FH.cam.x = cam.x;
  __FH.cam.y = cam.y;
  __FH.cam.z = cam.z;
  const under = cam.y < -0.25,
    inCabin = cam.x > 51.5 && cam.x < 57.5 && cam.z > 4 && cam.z < 7.6 && cam.y < 3.3;
  __FH.under = under;
  // doors: swing towards open or shut; the open leaf is solid once it is out of the way of everyone
  doors.forEach((d, k) => {
    if (!d) return;
    const want = d.open ? 1 : 0;
    __FH.anim[k] += (want - __FH.anim[k]) * Math.min(1, dt * 7);
    Math.abs(__FH.anim[k] - want) < 0.001 && (__FH.anim[k] = want);
    const lf = leaves[k];
    lf && (lf.piv.rotation.y = lf.base + lf.swing * __FH.anim[k] * Math.PI * 0.5);
    const b = leafBoxes[k];
    if (!b) return;
    const on = !!d.open && __FH.anim[k] > 0.85;
    if (on === !b.off) return;
    if (on && st && st.players.some((p) => p.alive && p.pos.x > b.min.x - 0.4 && p.pos.x < b.max.x + 0.4 && p.pos.z > b.min.z - 0.4 && p.pos.z < b.max.z + 0.4 && p.pos.y < b.max.y && p.pos.y + 1.8 > b.min.y)) return;
    b.off = !on;
  });
  // who is on a ladder (for the climbing animation and the feet), and the hatch lids: up while anyone is in the
  // top of a shaft
  const open = [0, 0, 0];
  if (st)
    for (const p of st.players) {
      const L = p.alive ? __fhLadderOf(p) : null;
      p.onLadder = !!L;
      if (!p.alive) continue;
      for (const Lh of __FH_LAD) if (Lh.hatch >= 0 && p.pos.y > -3.4 && p.pos.y < 0.06 && p.pos.x > Lh.zone[0] - 0.3 && p.pos.x < Lh.zone[2] + 0.3 && p.pos.z > Lh.zone[1] - 0.3 && p.pos.z < Lh.zone[3] + 0.3) open[Lh.hatch] = 1;
    }
  let lidOpen = !1;
  for (const { piv, L } of lids) {
    const k = L.hatch;
    __FH.lid[k] += (open[k] - __FH.lid[k]) * Math.min(1, dt * (open[k] ? 9 : 4));
    piv.rotation.x = -__FH.lid[k] * 1.85;
    __FH.lid[k] > 0.02 && Math.hypot(cam.x - piv.position.x, cam.z - piv.position.z) < 30 && (lidOpen = !0);
  }
  // what is drawn: the cabin when near it; the house from the cabin down; the tunnels below ground or through an
  // open hatch; the house's rooms only from the house or the shaft under it
  const nearCabin = Math.hypot(cam.x - 54.5, cam.z - 6) < 45,
    houseArea = cam.x > 30 && cam.x < 76 && cam.z > 1 && cam.z < 28.5,
    inSecret = cam.x < 36.2 && cam.z > 10 && cam.z < 15;
  groups.cabin.visible = nearCabin && (cam.y < 6 || inCabin);
  groups.house.visible = (under && houseArea) || inCabin;
  groups.tun.visible = (under && (!houseArea || inSecret || cam.y < __FH_Y.HF - 0.3)) || lidOpen;
  groups.hatch.visible = !0;
  // below ground and in the cabin: no snow falling
  __FL.snowPts && (under || inCabin) && (__FL.snowPts.visible = !1);
}
// below ground: a warm dark haze instead of the winter fog. Set after 61-frostline.js's own frame update (which
// puts the winter fog back every half second): this component is that one's parent, and a parent's frame
// callback runs after its child's
function __fhFog(s) {
  const sc = s.scene;
  if (!sc || !sc.fog || !sc.fog.isFog) return;
  if (__FH.under && aw().__fh) {
    __FH.fogUnder || ((__FH.fog = [sc.fog.near, sc.fog.far, sc.fog.color.getHex()]), (__FH.fogUnder = !0));
    sc.fog.near = 14;
    sc.fog.far = 110;
    sc.fog.color.set('#1a1510');
  } else if (__FH.fogUnder) {
    __FH.fogUnder = !1;
    // (left the map from below ground: that map sets its own fog)
    aw().__fh && __FH.fog && ((sc.fog.near = __FH.fog[0]), (sc.fog.far = __FH.fog[1]), sc.fog.color.setHex(__FH.fog[2]));
  }
}
{
  const prevTrees = kwA;
  kwA = function () {
    QI((s) => {
      try {
        __fhFog(s);
      } catch (e) {}
    });
    return M.jsx(prevTrees, {});
  };
}
// the house's Poly Haven furniture loads with Frostline's own models (61-frostline.js), from the cinema's folder
// (about 1.3 MB; already cached if the cinema has been played). A model that fails to load is drawn by hand
{
  const prevModels = __flModels;
  __flModels = function (cb) {
    const want = [...new Set(Object.values(__FH_MODELS).map((m) => m[0]))],
      extra = {};
    let base = null,
      left = want.length + 1;
    const done = () => --left || cb(Object.assign(base || {}, extra));
    prevModels.call(this, (g) => ((base = g), done()));
    for (const n of want)
      __glbParse(
        './game/maps/cinema/models/' + n + '.glb',
        (g) => ((extra[n] = g), done()),
        () => done(),
      );
  };
}
// built with the rest of Frostline's interiors (64-frostline-rooms.js), sharing its bulbs, presents and wreaths
{
  const prevRooms = __flRooms;
  __flRooms = function (root, models, ticks, lights, bulbs, presents, wreaths) {
    prevRooms.apply(this, arguments);
    try {
      __fhView(root, models, ticks, lights, bulbs, presents, wreaths);
    } catch (e) {
      __FH.err = String(e && e.stack);
      console.warn('[cabin] view', e);
    }
  };
}
// the snowfield has a hole under each hatch (in 0.5 m cells: exactly the 1 m opening the kerb frames) and under
// the cabin's stairwell (every cell that touches it: the rest of that hole is under the cabin's floor)
{
  const prevHG = __flHeightGeo;
  __flHeightGeo = function (x0, z0, x1, z1, step, skip, relief) {
    if (step > 0.6) return prevHG.apply(this, arguments);
    const holes = [...__FH_LAD.filter((L) => L.hatch >= 0).map((L) => L.zone), [51.8 - 0.26, 4.35 - 0.26, 57.2 + 0.26, 5.75 + 0.26]],
      sk = (x, zz) => holes.some((h) => x > h[0] && x < h[2] && zz > h[1] && zz < h[3]) || (skip ? skip(x, zz) : !1);
    return prevHG.call(this, x0, z0, x1, z1, step, sk, relief);
  };
}

// ---------------------------------------------------------------- dev hooks
const __FH_GO = {
  door: [54.5, 0, 9.2, 0],
  cabin: [54.5, __FH_Y.CF, 6.6, 0],
  stairs: [56.9, __FH_Y.CF - 0.19, 5.05, Math.PI / 2],
  landing: [50.6, __FH_Y.LDG, 4.4, Math.PI],
  cellar: [47.5, __FH_Y.LDG, 4.2, Math.PI / 2],
  hall: [52.5, __FH_Y.HF, 10.0, Math.PI],
  library: [44.5, __FH_Y.HF, 12.5, Math.PI / 2],
  dining: [61.0, __FH_Y.HF, 15.3, -Math.PI / 2],
  gallery: [45.0, __FH_Y.HF, 17.6, -Math.PI / 2],
  great: [54.2, __FH_Y.HF, 20.5, Math.PI],
  lounge: [42.5, __FH_Y.HF, 22.0, Math.PI / 2],
  kitchen: [65.5, __FH_Y.HF, 21.0, -Math.PI / 2],
  secret: [38.0, __FH_Y.HF, 12.5, Math.PI / 2],
  secretroom: [35.2, __FH_Y.HF, 12.0, Math.PI / 2],
  shafttop: [33.15, __FH_Y.HF, 11.6, Math.PI],
  shaftbottom: [33.15, __FH_Y.TF, 14.2, 0],
  junction: [33.15, __FH_Y.TF, 32, Math.PI],
  longbottom: [15.5, __FH_Y.TF, 68.5, Math.PI / 2],
  longtop: [12.2, 0, 68.5, -Math.PI / 2],
  midbottom: [69.0, __FH_Y.TF, 56.6, Math.PI],
  midtop: [69.0, 0, 59.8, 0],
  bbottom: [112.5, __FH_Y.TF, 24.8, 0],
  btop: [112.5, 0, 24.5, 0],
};
typeof window < 'u' &&
  ((window.__bpCabin = () => {
    const m = aw(),
      F = m.__fh,
      h = eA.human && eA.human();
    if (!F) return { map: m.id, note: 'not Frostline (or the cabin failed to build)', err: __FH.err };
    const d = (id) => (m.doors[id] ? (m.doors[id].open ? 'open' : 'shut') : 'missing'),
      L = h && h.__fhLad ? __FH_LAD[h.__fhLad.i] : null,
      G = __FH.groups;
    return {
      map: m.id,
      cabinDoor: d(F.dc),
      secretDoor: d(F.db),
      leafBoxes: [F.lc.off ? 'off' : 'on', F.lb.off ? 'off' : 'on'],
      hatches: __FH_LAD.filter((x) => x.hatch >= 0).map((x) => x.id + ': ' + ((__FH.lid[x.hatch] || 0) > 0.5 ? 'open' : 'shut')),
      ladder: L ? { id: L.id, name: L.name, y: +h.pos.y.toFixed(2), grab: +h.__fhLad.k.toFixed(2) } : null,
      at: h ? [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)] : null,
      area: h ? LT(m, h.pos) : null,
      onGround: h ? !!h.onGround : null,
      physics: typeof __phxOn === 'function' ? __phxOn() : null,
      groundPieces: F.holes.length,
      boxesAdded: F.nBoxes,
      underLights: __FH.under,
      drawn: G ? Object.fromEntries(Object.entries(G).map(([k, g]) => [k, g.visible])) : null,
      err: __FH.err,
    };
  }),
  (window.__bpCabinGo = (name) => {
    const p = __FH_GO[name],
      h = eA.human && eA.human();
    if (!p || !h) return 'places: ' + Object.keys(__FH_GO).join(', ');
    __fhLadOff(h);
    h.pos.x = p[0];
    h.pos.y = p[1] + 0.02;
    h.pos.z = p[2];
    h.vel = { x: 0, y: 0, z: 0 };
    h.yaw = p[3];
    h.pitch = 0;
    h.onGround = !1;
    h.fallSpeed = 0;
    return name + ' ' + p.slice(0, 3).join(', ');
  }));
