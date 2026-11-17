# Blackwater Penitentiary: how the map is built, and the Jailbreak mode

An 1898 penitentiary on the bayou, in the middle of a jailbreak. The map is 128 x 104 m. It plays Bomb
Defusal, Team Deathmatch, Capture the Flag and Domination, and the **Jailbreak** mode, which only runs on this
map.

- Code:
  - `src/mods/35-prison.js`: the layout and collision, and a record of what every shape is.
  - `65-prison-view.js`: materials, the light volume, the sky.
  - `66-prison-detail.js`: architecture and metalwork.
  - `66b-prison-props.js`: furniture, fixtures, signs, the riot.
  - `67-jailbreak.js`: the mode.
- Assets: `node tools/fetch-polyhaven.mjs prison` writes them to `public/game/maps/prison/`. They are 9.5 MB,
  all Poly Haven, CC0.

## The layout

The layout is unchanged from the previous version, so spawns, bomb sites, bot routes and callouts stay as
they were.

| Area | Where | What is there |
|---|---|---|
| Visitor lot | north, outside the wall | Terrorist spawn; the getaway van; a roadblock of concrete barriers and burning tyres |
| Gatehouse | north wall | Gothic granite front with a pointed-arch portal, "A.D. 1898" and the prison's name carved on it, crenellations, two octagonal turrets with spires. Inside: metal detector, X-ray belt, control booth with CCTV screens |
| Breach | north-west wall | Blown-out wall: ragged stumps with bent rebar, rubble, scorch marks |
| A Block | west | Brick cell house under a barrel vault with steel arch trusses, a skylight and half-round gable windows. 52 cells on two tiers around the dayroom, plus the glass control picket. A large caged TV high on the dayroom's north wall plays the dayroom's programme with its sound (`70-screens.js`; set in `/admin` as "Blackwater Dayroom TV") |
| Administration and Visitation | centre | Brick, granite-trimmed; booths with glass partitions and handsets |
| Exercise yard | centre | Chain-link under razor wire, basketball court, weight pit, aluminium bleachers, planters, a gun tower with a sweeping searchlight |
| Infirmary, Laundry | east | Beds and privacy curtains; front-loading washers, carts, steam pipes |
| Cafeteria and kitchen | south (bombsite A) | Long tables with fixed stools, serving line, range and hood, steam kettles, walk-in freezer, dish pit |
| Solitary (SHU) | south-west | 14 single cells behind steel doors |
| Service dock | south | Counter-Terrorist spawn; loading dock with bumpers |

## How it is drawn

- **One source for collision and visuals.**
  - Every box in `35-prison.js` names a surface: brick, block, plaster, floor, tile, concrete, granite,
    paint, plate, asphalt, grass, mud, rubber, roof or corrugated iron.
  - `65-prison-view.js` draws every collision box with that surface's material, instead of the core's
    flat-coloured boxes, so the wall you see is the wall you hit.
  - Shapes that are not boxes are recorded in `A.__pr` and modelled inside their collision boxes. These
    include bars, chain-link, razor wire, rails, stairs, round tables, bunks, toilets, towers, lamps, the
    vault, arches and turrets.
- **Materials.**
  - Poly Haven textures are sampled from all three axes, so nothing stretches.
  - Walls take the wall texture, tops the floor texture, and undersides (ceilings, slab bottoms) the wall
    texture.
  - Painted surfaces (cell block walls, steel) are greyed and repainted with the box's paint colour.
  - Every surface gets soft stains, streaks and grime at the foot of walls.
- **Light.** A coarse light volume (1 m x 0.75 m cells) is worked out from the collision boxes when the map
  loads, in about 40 ms.
  - **Open sky:** daylight comes in through doors, windows and the skylight, and fades into the rooms.
  - **Lamp light:** each fixture lights its own room and never shines through a wall.
  - All the prison's materials use it for their ambient light, so interiors are darker than the yard and
    lamps throw pools of light. The game's own nearby lamps (`59-lights.js`) still add highlights.
- **Lamps glow** brighter at dusk and at night. Searchlight beams show at dusk and night; the alarm beacons
  turn all the time.
- **Doors.** The prison draws its own doors instead of the core's wooden house door (`66b-prison-props.js`;
  the core's door drawing is skipped on this map). They are the same door objects, so E, bots and online
  play work as on every map.
  - Cell gates: every shut cell's gate is a real door that slides behind the fixed bars. E opens and closes
    it. Bots don't open cell gates as they walk past (`r1` in `67-jailbreak.js`).
  - Steel doors: pressed panels, a wired-glass vision panel (with its wire mesh), a kick plate, levers, a
    push bar, a closer at the head, a number plate and hinges. Solitary's doors have a barred window and a
    food slot. The office doors are panelled timber.
  - Open doors are solid: each swinging door has a second collision box where its leaf rests when open,
    switched on while the door is open (once nobody stands in the swing). The core turns a door's collision
    off while it is open, so before this you walked through the open leaf.
  - The cell house's granite base course and string course stop at the doorways, and every doorway has a
    steel frame and (outside) a stone threshold.
  - Doorways: a steel frame round every opening and a threshold plate. The wide entrances (cell house,
    dining hall, gatehouse, laundry) have a barred gate racked open on its track inside, with a yellow
    warning band.
- **Spawns** face into the compound (`A.spawnFaceCenter`). By the core's rule (T facing north, CT south)
  both teams faced the outer walls here.

## Performance

At 1600 x 900 on Medium, with dynamic resolution on and bots fighting, the map runs at 60–100 fps on a base
M-series Mac. With the simulation paused, every view reaches the 120 fps display cap. GPU time for the main
pass is 3–4 ms, so frames are limited by CPU work, not drawing. What keeps it there:

- **One mesh per material.** The boxes and details are merged per surface, not per tile: about 190 meshes,
  down from about 480. Draw calls are what these frames spend their CPU time on, and the map is too small
  for tiles to cull.
- **Frozen matrices.** The scenery never moves, so its matrices are computed once (`matrixAutoUpdate` and
  `matrixWorldAutoUpdate` off). Only the parts marked `userData.dyn` (beacons, searchlights) update. The
  vegetation layer does the same on every map (`69-static-scenery.js`).
- **Inmates.**
  - Eight scenery inmates.
  - Their arms are posed from rotations alone, with no forced skeleton matrix updates (`__prsRel` in
    `50-prisoners.js`).
  - Inmates out of sight are taken out of the scene graph until they're seen again.
  - They cast shadows only within 16 m.
  - Jailbreak's inmates are out of the scene in the other modes.
- **Thin rods** (bars, balusters, rails, wires) use a plain painted-steel material and cast no shadow.
- **The Jailbreak HUD** changes the page only when its text changes, and moves markers with transforms.

### Things to keep when editing

- **Static scenery.** Anything added to the view that moves after it is built needs `userData.dyn = 1`, or it
  will never move: the view freezes matrices once it is built.

- **Fans of triangles** (arches, lunettes, fanlights) must go through `__prQuad`, which gives a fan's last
  triangle its own normal.
- **Colours for quads** go through `__prQuadRaw`, which takes `[r, g, b]`. The Frostline builder's `quad()`
  takes only a number.
- Either mistake gives NaN shading. The bloom pass then smears NaN over the whole frame, which shows as a
  solid blue screen.
- **No transmission on glass.** Glass with transmission makes three.js draw the scene twice per frame.
  `__prLit` turns it off on every model's glass.

## Jailbreak

The mode runs as Bomb Defusal (one life a round, buy menu, economy) with no bomb.

- **Inmates:** four are locked up, all on the guards' half of the map:
  - cell 112 at the south end of A Block's lower tier, west side;
  - cell 224 on the upper tier, east side;
  - two cells in Solitary.
- **Freeing an inmate:** the crew (Terrorists) holds E at a lock for 3.5 seconds. The cell's gate (or
  solitary door) slides or swings open, and the inmate follows whoever cut it, walking the bots' path grid.
  Until then the door is locked: E does nothing on it, and guards see "Locked".
- **Winning for the crew:** lead two inmates into the visitor lot (the getaway van) or eliminate the guards.
- **Lost escorts:** if the leader dies or gets more than 16 m ahead, the inmate stops with his hands on his
  head. Any Terrorist presses E by him to take over.
- **Winning for the guards:** hold out for 2:30 or eliminate the crew. Inmates can't be hurt, so guards
  can't deny them by shooting them.
- **Bots:**
  - The crew splits between cutting locks, collecting waiting inmates and covering escorts. Leaders head
    straight for the van.
  - The guards hold posts at the cells and in Solitary, and chase anyone leading an inmate.
- **HUD:**
  - an objective bar ("Rescued 0/2 · Freed 1/4");
  - a prompt and progress bar at locks;
  - markers over nearby locked cells and over freed inmates;
  - the getaway van when you lead someone;
  - the exit zone, cells and inmates on the minimap.
- **Online:** the host runs it. Clients receive the inmates' states and positions (status field `JB`) and
  send their lock cuts and pickups as actions (`j`).

In bot-only test rounds, rescues took 80–100 seconds, and both sides won rounds.

## Checking it

During a match on the dev server, these commands are available in the browser console:

- `window.__bpPrison()`: the view's build numbers (boxes, light-volume time, detail triangles).
- `window.__bpPrisonLight(x, y, z)`: the open-sky and lamp light at a point.
- `window.__bpJail()`: the inmates' states. `window.__bpJailBots()`: what each bot is heading for.
