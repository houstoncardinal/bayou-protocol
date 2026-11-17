# Fortress

A sandstone citadel on a jungle island, ringed by ramparts over the sea, built from the owner's concept art
("Fortress: competitive, tactical, iconic"). 128 x 108 m, three levels. Plays Bomb Defusal, Team Deathmatch
and Free-for-All.

- Code: `src/mods/77-fortress.js` (layout, collision, routes, spawns, sites) and `78-fortress-view.js` (the kit and
  the detail), drawn by the prison's pipeline (`65-prison-view.js`).
- Assets: `node tools/fetch-polyhaven.mjs fortress` (about 10 MB in `public/game/maps/fortress/`), plus Frostline's and the
  prison's shared textures and models.

## Levels and areas

| Level | Areas |
|---|---|
| High ground, y 5.6 (north) | CT Spawn behind the grand stair; the Helipad (helicopter) and the lighthouse tower (NE); the arcaded Gallery over A (NW) |
| Main level, y 2.4 (middle) | A Site (NW), A Long down the west rampart (a hut halfway, Long Doors), A Main (a dog-leg up from the Market), A Short (the arch from Mid); Mid, a cobbled square round a fountain; the Mid Gate (three arches, the middle one open) and its terrace; the B Passage from Mid; B Site (E) with its shed; B Long down the east rampart; the Garden (B lower) |
| Lower level, y 0 (south) | T Spawn (SW) and the Market shed; Lower Mid (a garden of palms, the grand stair up to the Mid Gate); the ring road (SE) and the Tunnel up to B Long |

## Routes (measured along the bots' walk grid)

| | Terrorists | Counter-Terrorists |
|---|---|---|
| to A | 66 m (A Main), 62 m to the top of A Long | 46 m (the Gallery stair) |
| to B | 102 m (the Garden), 115 m (the Tunnel and B Long) | 58 m (the Helipad stair) |
| to Mid | 75 m (the grand stair, the gate's arch) | 36 m (the grand stair down) |

CTs reach A in 70 % of the Terrorists' distance and B in 57 %. B is the far site for the Terrorists, as in the
concept (T Spawn is in the south-west corner). In bot tests both sites were planted and rounds went both ways.

## Notes

- Stairs next to a wall are kept wider than the bots' path needs: the Garden stair, flush against the building
  beside it, caught the bomb carrier on its corner.
- `window.__bpFortress()` gives the build numbers.

## The island around the walls (decoration only, no collision)

- A ledge of rock under jungle floor all round the ramparts, then a lower step and Poly Haven's scanned coastal
  cliffs and rocks down to the sea, 30 m below the courtyards.
- On the ledge: palms (modelled: arching fronds with leaflets, old ones hanging and yellowing), island trees,
  pachira, shrubs and ferns (Poly Haven scans).
- The sea runs out to the camera's far plane so its edge is the horizon; one vertex-coloured disc under the island
  shades it from turquoise shallows to the deep teal offshore without a visible edge.
- Players see the island from the lighthouse and over the walls; the outside can't be reached.
