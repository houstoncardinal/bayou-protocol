# Frostline: how the map was designed

An alpine outpost in deep snow, at Christmas. The map is 128 x 128 m, built for 5 v 5 Bomb Defusal, and it
also works for Team Deathmatch and Free-for-All.

- Code:
  - `src/mods/61-frostline.js`: ground plan, collision, spawns, terrain, materials.
  - `62-frostline-detail.js`: cliff faces, caverns, arches, the pavilion and cover.
  - `63-frostline-christmas.js`: the decorations.
  - `64-frostline-rooms.js`: the hidden caverns' interiors.
- Assets: `tools/fetch-polyhaven.mjs`, which writes to `public/game/maps/frostline/`
- Download size: 13 MB

## What the classic maps have in common

de_dust2, de_nuke and de_inferno look nothing alike, but they share a structure. These are the rules taken
from them, written as things that can be measured:

| Rule | Dust2 | Nuke | Inferno | Frostline target |
|---|---|---|---|---|
| Three lanes: long-range, mid, close-quarters | Long A / Mid / B Tunnels | Outside / Ramp / Lobby | Apartments / Mid / Banana | A Long / Mid / Banana and the B Ice Tunnel |
| CTs reach a site first | about 7 s against 13-15 s | about 6 s | about 8 s | CT at 40-55 % of the T time |
| Ts win the race to mid's choke | Mid Doors | Outside | Second Mid | T reach Mid Doors first |
| Each site has several T entrances and its own CT entrance | A: Long, Short; B: Tunnels, Doors | A: Hut, Main, Squeaky | B: Banana, CT | 2-3 T entrances, 1 CT entrance per site |
| Short CT rotation, long T rotation | via CT Spawn / via Mid | via Hell / Outside | via CT / Mid | CT through their spawn; T through mid |
| Chokes onto sites 5-7 m wide | Long Doors, B Doors | Hut, Squeaky | Banana's end, Arch | Long Doors 7 m, Short Gap 6 m, B Entrance 6 m |
| No clear line much over 45-60 m | Long A about 60 m | Outside | Banana about 40 m | A Long about 44 m with cover; others under 30 m |
| Verticality | Catwalk | two floors | Balcony | a raised deck on A; part of B under a roof |

## The layout

```
            N
  +--------------------------------------------------+
  |      A Back ---(arch)-- CT SPAWN --- B Back      |
  |   +-------+          (arch)            +-------+ |
  |   | A SITE|(deck)    CT Mid            | B SITE|Lodge
  |   |       |-Short-(arch)|              |Pavilion|#|
  |   +-------+          |                 +-(ice arch)+
  |   A Long  Cavern####  MID ==Crevasse==B Ice Tunnel |
  |     |     ##########  |  Workshop###### (vaulted)  |
  |   Long Doors(arch)  Mid Doors(arch)      Banana    |
  |   Long Corner--T Ramp--T SPAWN--Outside B          |
  +--------------------------------------------------+
            S                ### = hidden, sealed by ice
```

The ground plan is smooth shapes: rounded rooms, lanes along curves (A Long bends, Banana curves like its
namesake, the Crevasse winds), oval caverns. Where two meet, the walls blend into a rounded fillet, never a
square corner.

- **A:** reached by A Long (rifles and snipers), through the stone arch at Long Doors, or by A Short and the
  arched Short Gap from mid. The site has a timber deck that overlooks both entrances, a container and
  stacked crates.
- **Mid:** the Terrorists fight through the arch at Mid Doors; the CTs hold it from CT Mid. The Crevasse runs
  east from mid to the ice tunnel, so Terrorists can split from mid to B.
- **B:** reached by Banana and the vaulted B Ice Tunnel (an arched ice portal at each end and where the
  Crevasse joins it), or from the Crevasse. The north-east corner of the site is under an ice pavilion: a
  barrel vault on three ice columns.
- **Spawns:** ten for each team, spread over each spawn so no two players start on top of each other. The map
  checks that every spawn is clear of rock and props and has a path to both sites (see "Checking it").

## Unique to Bayou Protocol: the ice

Three hidden caverns sit behind arched portals sealed with ice. A bullet shatters the ice and carries on
through it, as through glass, and a grenade blast shatters it too. The ice is whole again every round.

| Cavern | Ice walls | What opening it does |
|---|---|---|
| Santa's Workshop | one into Mid, one into Banana | a shortcut between mid and Banana for whoever breaks both |
| Crystal Cavern | one into A Long, one into Mid | a shortcut from A Long to mid |
| Fireside Lodge | one into B | a hiding place off B |

These keep the map balanced:
- They are slower than the main routes until opened.
- Breaking ice is loud and visible.
- They reset each round, so they reward a plan rather than becoming the default route.

Each cavern keeps a clear path straight through between its portals; its furniture stands against the
walls.
- **Santa's Workshop:** a workbench with a half-built toy train, shelves of toys, Santa's sleigh with a sack of
  presents, and timber beams with lights.
- **Crystal Cavern:** glowing crystal clusters, a frozen waterfall, an ice-crystal Christmas tree and hanging
  snowflakes.
- **Fireside Lodge:** a stone fireplace with a real fire and stockings, armchairs, a table with milk and
  cookies, and a tree.

## Measured

Path lengths come from the bots' own walk grid. Times are at 6.3 m/s running speed.

| Route | Length | Time | Target |
|---|---|---|---|
| CT spawn to A | 50 m | 7.9 s | |
| T spawn to A | 102 m | 16.2 s | CT 49 % of T |
| CT spawn to B | 47 m | 7.5 s | |
| T spawn to B | 104 m | 16.5 s | CT 45 % of T |
| T spawn to Mid Doors | 34 m | 5.4 s | T first |
| CT spawn to Mid Doors | 73 m | 11.5 s | |

In a five-a-side Bomb Defusal test with bots, the bots rotated between the sites and through the Crevasse
and the tunnel. A shot broke the Workshop's ice, and a player walked through it into the cavern.

## How it is built

- **One source for collision and visuals.** The shapes become a signed distance field on a 25 cm grid
  (`__flField`).
  - **Collision:** every 25 cm cell more than 10 cm behind the field's edge is rock. The cells are merged into
    about 750 boxes, so the rock face you see is the one that stops you, to within a few centimetres. The
    bots, bullets, wallbangs and minimap use these boxes as on every map.
  - **Visuals:** the cliff faces are traced along the same edge.
- **Overhead:** the caverns' vaults, the arches and the pavilion have collision too. Each is set at or just
  above the stone or ice drawn there, so a jump never meets an invisible ceiling.
- **What you see:**
  - Cliff faces stand on every edge of open ground: layered rock with snow on the ledges, bulges, cracks, a
    broken skyline and a snow cornice with icicles. Up to head height a face stays within 12 cm of the
    collision. Higher up it may step back as much as 1.6 m. Bullet holes are projected onto the rock.
  - Inside the caverns and the tunnel the walls are glacier ice, rock or timber, under vaults that rise from
    the walls to a crown.
  - Each portal is a rock face over an arch that follows the vault exactly, ringed by dressed stones (ice
    blocks in the ice caverns) with quoins and a keystone.
  - The stone arches over the chokes have voussoirs on both faces, a cornice with snow, and a garland with
    lights and a wreath.
  - Poly Haven textures are mapped from all three axes, and snow settles on every face that points up.
  - Firs (the game's fir pack, at two detail levels), Poly Haven rocks, crates, barrels and gear.
  - Falling snow (not inside the caverns), animated on the GPU, under the Poly Haven `snowy_hillside` sky.
- **Cover:**
  - Crates are built board by board.
  - Containers have corrugated walls, corner posts, rails and a door end with locking bars.
  - Snowbanks are the shape of their collision boxes, rounded and lumpy.
  - The ice sealing a portal fills its arch exactly.
- **Christmas** (`63-frostline-christmas.js`):
  - Decorated trees in the spawns and in quiet corners: baubles, twinkling lights, a gold garland, a lit
    star and presents. The four spawn crates are giant presents.
  - Three log cabins with lit windows, wreaths, snow-loaded roofs, icicles and smoking chimneys.
  - Strings of lights across the spawn exits and the lanes, along the tunnel and the pavilion.
  - Candy-striped lamp posts, candy canes at the chokes, snowmen, lanterns, and a campfire behind the T spawn.

## Checking it

During a match on the dev server, two commands in the browser console check the map:
- `window.__bpFrostline()` gives the route timings above.
- `window.__bpFrostCheck()` samples the whole map every 10 cm. It reports:
  - any open ground covered by a rock box (an invisible wall);
  - any drawn rock with no box behind it;
  - every cavern portal, which catches an outline straying into a lane;
  - the spawn counts, and any spawn that is blocked or has no path to a site.

The current result is no invisible walls, no holes, the eight intended portals, and 10 + 10 spawns, all
clear.

The assets come from `node tools/fetch-polyhaven.mjs`, which downloads and optimises them; all are Poly
Haven, CC0.
