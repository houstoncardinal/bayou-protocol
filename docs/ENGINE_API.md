# Engine internals used by the mods

The core is compiled, so its names are short. These are the ones the mods use.
All of them are in scope inside any file in `src/mods`.

## Game state and control

| Name | What it is |
|---|---|
| `eA` | Game controller. `eA.state` (current match), `eA.human()` (local player), `eA.settings`, `eA.input`, `eA.on(fn)` (event stream), `eA.start(opts)`, `eA.tick(dt)`, `eA.net` (online session). Also on `window.cds`. |
| `Zw` | UI store (zustand). `Zw.getState()` has `screen`, `quality`, `paused`, `buyOpen`, `setScreen()`, `setup()`, `flash()`. Also on `window.cdsUi`. |
| `aw()` | The current map: `boxes`, `spawns`, `spawnZones`, `sites`, `areas`, `w`, `d`. |
| `XB(state, id)` | Find a player by id. |
| `un(state, player, points, label)` | Award score with a pop-up label. |
| `se(state, team, reason)` | End the round for a team. |
| `Ee(state, victim, attacker, dmg, armorDmg, weapon, headshot, info)` | Apply damage. |
| `D1(team)` | The opposing team id (`"CT"` or `"T"`). |
| `ii` | Team info: `ii.CT` / `ii.T` with `name`, `main`, `light`. |

## Data tables

| Name | What it is |
|---|---|
| `gw` | Weapon stats by id (damage, rate, mag, recoil, range, price, ...). |
| `fQ` | Shop items (label, price, hint, category). |
| `iU` | Recoil pattern per weapon. `VwA` is on-screen kick. `z1` is gunshot sound. |
| `qO` | Weapon class per id (rifle, smg, pistol, sniper, heavy). |
| `BG` | Level unlocks. `OwA` / `YwA` are primary / secondary loadout lists. |
| `Eg` | Mode names. `gF` is the offline mode list, `CN` the online one. |
| `Ch` | Grid map definitions. `XE` is the map registry, `BD` the map list shown in menus. |

## Geometry helpers

| Name | What it is |
|---|---|
| `Hi(player)` | Eye position. |
| `cI(yaw, pitch)` | Unit direction vector. |
| `Pg(a, b, boxes)` | True when there is a clear line between two points. |
| `Ci(a, b)` | Horizontal distance. |
| `rm(pos)` | Floor height under a point. |

## three.js and React

| Name | Class |
|---|---|
| `U`, `aA` | Vector3, Vector2 |
| `ji`, `Ow` | Group, Mesh |
| `Gw`, `Ni` | MeshStandardMaterial, MeshBasicMaterial |
| `Rw`, `bB`, `oI` | CylinderGeometry, PlaneGeometry, TorusGeometry |
| `xi` | Box3 |
| `nu` | GLTFLoader |
| `TZ` | AnimationMixer |
| `LI`, `Cc`, `Io` | CanvasTexture, Sprite, SpriteMaterial |
| `S`, `M` | React, and the JSX runtime (`M.jsx`, `M.jsxs`) |
| `QI` | `useFrame` from React Three Fiber |

If the core is ever rebuilt from different source, these names will change and
the mods will need updating to match.
