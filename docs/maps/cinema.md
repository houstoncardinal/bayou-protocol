# Bayou Palace Cinemas: how the map is built, and how its screens work

A 1930s art-deco movie palace grown into a six-screen multiplex, on a 120 x 108 m city block. It plays Bomb
Defusal, Team Deathmatch, Capture the Flag and Domination. Every screen plays its own film, chosen in the
`/admin` dashboard (see `docs/admin.md`).

- Code:
  - `src/mods/71-cinema.js`: the layout, the collision, and a record (`A.__cn`) of everything that isn't a
    box.
  - `src/mods/72-cinema-view.js`: the kit (textures, models, surfaces) and the detail.
  - `src/mods/70-screens.js`: the screens, shared with the prison's dayroom TV.
- Drawing: the prison's pipeline (`65-prison-view.js`) draws this map too. A map opts in with
  `A.__view = __PR_KITS.<id>`, and gets the same real materials, light volume, merged meshes and frozen
  matrices. The kit adds `skyK` and `lampK`, which set how much sky and how much lamp light reach indoors.
- `src/mods/73-cinema-seats.js`: sitting down in the seats.
- Assets: `node tools/fetch-polyhaven.mjs cinema` writes them to `public/game/maps/cinema/` (5.8 MB). They
  are all Poly Haven, CC0. The kit also loads the prison's asphalt, concrete, plaster, brick, steel and skies.

## The layout

| Area | Where | What is there |
|---|---|---|
| Street, parking lot, plaza | north, z 0-26 | Terrorist spawn (the bus). Parked cars, palms in planters, the box office kiosk with velvet-rope queues |
| Facade | z 26 | Stucco and granite. The marquee: letter boards listing the films and chaser bulbs. BAYOU PALACE in lit letters, the PALACE blade sign, poster cases |
| Grand Lobby | x 40-80 | Marble floor with a brass compass star, a coffered ceiling, three chandeliers, deco columns. The concession stand (candy cases, popcorn machines, soda fountain, menu boards). A mezzanine reached by two carpeted stairs |
| West Hall | x 30-40 | Arcade cabinets, a claw machine, a photo booth |
| The Velvet Room (theater 5) | x 4-30 | A luxury theater: leather recliners on five tiers, a 17.4 x 9.8 m screen over the front entrance, deep red velvet drapes down both walls, brass sconces, a 13.2 m ceiling |
| East Hall | x 80-90 | Coat check |
| The Starlight (theater 6) | x 90-116 | The Velvet Room's mirror image, in navy, under a star-field ceiling. Its neon sign is over its Promenade entrance |
| Promenade | z 46-53 | A carpeted hall along the theaters' fronts. Four arched screens cross it, so there is no 110 m sightline |
| Theaters 1-4 (Palace XL) | z 53-85 | A curved screen fills the whole front wall: 22.4 x 12.6 m (16:9), 2.8 m up to the 16 m ceiling, bowed 1.1 m towards the audience, all black velour round it, a blue light line under its curve. 14 rows of wide rocker seats (408 per theater) rising 5.9 m, lit row letters at the aisle ends, step lights. Ribbed timber walls under jacquard fabric panels with brass sconces, a ceiling of small recessed lights. You enter under the screen's corners from the Promenade, through the fire exits from the side corridors, or at the top from the projection level |
| Corridors | between the theaters | Promenade to yard, with a jog halfway. Fire exits into the theaters' fronts |
| Projection level | z 85-90, 6.3 m up | A projector at each port, with its beam and dust in the beam. Steel stairs down to the yard |
| Loading dock, staff lot | south | Counter-Terrorist spawn |

**Bomb sites:** A is Theater 2's stage and pit, B is Theater 3's (see "The round" below).

**Domination points:** the lobby, and the pits of Theaters 2 and 3.

## Sitting down (`73-cinema-seats.js`)

Walk up to any seat (in the theaters or the Velvet Room) and press Use (E or F) to sit. Press it again to stand.
- Seated, the view drops to a fixed seated eye height, facing the middle of the screen. You can still look
  around. The seated player skips the physics step and gets a fixed eye height (`tQ`). Holding them in place
  after physics had pushed them out of the seat's collision, and the core easing crouch every step, shook the
  view by a few centimetres every frame.
- The first-person gun and arms are hidden (their scene, `window.__vmScene`), and the HUD fades.
- You stand up in the legroom in front of the seat. Dying, a new round or leaving the map also stands you up.
- A door within reach or a planted bomb nearby keeps the Use key.

## Stairs (`34-physics.js`, every map)

Every flight of stairs is also a smooth slope for walking, on every map: three or more `stair` boxes, each ahead
of the last and a riser higher, are found when the map loads. The slope runs through the steps' front edges. A map
can add its own slopes (`m.__slopes`): the cinema's aisles are slopes over their half-steps. The steps stay as they
are for the eye, bullets and the bots' walk grid. `window.__phx.slopes` gives the count.

## The screens (`70-screens.js`)

A map lists screens in `A.screens`: `{ id, x, y, z, w, h, ry, room, hear, frame }`.

**Where the film is.** Every player works out the film's position from the showing's start time, offset and
loop, using the server's clock. So everyone in a room sees and hears the same moment.

**Video files** (kind `file`, same origin):
- A `<video>` is drawn as the screen's texture.
- Its sound goes through the game's audio graph: an HRTF panner at the screen, a low-pass filter when walls
  are in the way, and the game's reverb.
- It pauses when nobody is near and re-syncs when it resumes.

**YouTube** (kind `youtube`): YouTube's player is a cross-origin iframe and can't be drawn into WebGL.
- The player sits in a layer behind the game's canvas.
- The screen is drawn as a hole: alpha 0, with no blending.
- Every frame, the iframe is warped with a CSS `matrix3d` (from the screen's four corners as the camera sees
  them) to fill the hole exactly. This happens in the screen mesh's `onBeforeRender`, so it uses the
  rendered frame's camera.
- Anything in front still draws over it: players, seats, the projector's beam.
- Volume follows the room you're in and the distance to the screen, through the IFrame API.
- No subtitles: captions are switched off and their module unloaded every time a film starts. The player is
  mapped 14 % larger than the screen, so YouTube's title bar, logo and progress bar fall outside it. After any
  start or seek, the film's still stays up for 1.3 s while YouTube's play icon shows.
- Inside a theater only its own player runs, at 1080p (1440p on a large high-density display). In the halls,
  at most two run. Other screens show the film's still.
- A curved screen (`curve` on the screen) is drawn curved. The player is mapped onto its chord, 7 % larger than
  the screen, so YouTube's title and logo along the edges fall behind the masking.
- Sound stays in its theater. From inside one theater no other theater's film reaches you, even through a shared
  wall. In the halls you hear a film only through an open doorway with its screen in view.

**Updates.** The game re-reads `/api/showings` every 20 s, so a change in `/admin` reaches a match in
progress. Posters, the marquee and the theater titles are redrawn when it changes.

**Without the API** (a static host such as itch.io), the screens play the built-in programme.

### Things to keep when editing

- **Additive light** (beams, wall washes, dust, stars) must use `__cnAdd`, which leaves the canvas's alpha
  alone. Plain additive blending fills the YouTube hole back in, and the film disappears behind the beam.
- **Openings** must have a `floor` threshold, not just the `wall` sill under them. `wall()` in
  `71-cinema.js` adds one. The bots' walk grid never stands on a wall's top, so a sill alone cut the yard off
  from the building.
- **No solid open leaves on doors** here: the walk grid doesn't know where an open leaf rests, and bots got
  stuck on them.

## Checking it

During a match on the dev server, these commands are available in the browser console:

- `window.__bpScreens()`: each screen's source, whether its YouTube player is active or playing, its level,
  and the video's time.
- `window.__bpCinema()`: the build numbers (boxes, detail triangles, seats).
- `window.__bpPathTo(a, b)`: whether bots can walk between two points.

## Doorways (November 2026)

The cinema has no doors. Every way in and out of a theater is an open arched portal, 2 m wide and 2.85-3 m high,
with a gold architrave and keystone, its EXIT sign over it:
- the front entrances from the Promenade, under the screen's corners (the screen and its black surround start at
  3.45 m, clear of them);
- the fire exits from the side corridors; the doors at the top to the projection level and its doors to the yard.

The swinging doors had a fixed second leaf (the leaf's resting collision) that looked like a door you could walk
through, and the auditorium screens covered the entrances. Arches are drawn by `__cnArch` (`72-cinema-view.js`):
the opening stays a rectangle for collision and the bots' walk grid; the corners above the curve are filled with
the wall's own surfaces.

The XL screens are 19.2 x 10.8 m from 3.2 m up. The seat rows curve round the screen (each seat up to 22 cm
nearer it at the sides, turned to face its middle). The lobby's columns are round and fluted.

## Theater Mode (`74-theater-mode.js`)

The cinema with no bots, no weapons, no damage and no clock. Start it from the Home screen's Theater Mode card,
the side rail, or as a mode in Play offline / an online lobby. Everyone starts in the Grand Lobby; online, voice
chat works as in any lobby. It runs as team deathmatch with `st.theater` set: fire, aim, reload, buy and weapon
switching are ignored, damage is off, the gun HUD, health and score are hidden.

## Screens and the film clock (November 2026, second pass)

- **Wall to wall, floor to ceiling.** The Palace XL screens are 23.5 x 13.2 m (16:9), from just above the stage to
  the 14.5 m ceiling, curved 0.9 m. The Velvet Room's and the Starlight's are 19 x 10.7 m under an 11.9 m ceiling,
  curved 0.5 m. Nothing is cut into the screen wall: the XL theaters are entered through their side walls from
  the side corridors (by the front rows, the theater's number lit over each doorway in the corridor), or at the
  top from the projection level; the luxury rooms through their side wall from the Promenade.
- **How YouTube is placed.** The player is positioned in 3D with CSS transforms from the game camera (as three.js's
  CSS3DRenderer), so the browser projects and clips it. Before, its four corners were projected by hand, and
  when one went behind you (looking along a big screen) the screen fell back to the film's still.
- **Players keep playing.** Leaving a theater or looking away only hides and mutes its player; it is closed
  after five minutes unused (or when a nearer screen needs the slot).
- **The film clock.** In a match every film starts at the beginning when the match starts and plays once to
  its end (`__filmPos` in `70-screens.js`, kept in `state.__film`). Outside a match the showings' schedule from
  `/admin` still applies. Online, the host sends each film's position in the status (`FM`) and clients follow
  when more than 1.5 s off; clients' controls go to the host as an action (`v`).
- **The projection booth** (`76-film-control.js`): the desk beside each XL theater's spare projection port, and at
  the back of each luxury room. Use opens the control panel: play / pause, back and forward 10 or 30 s, from the
  beginning, a progress bar to drag, tabs for every screen. Keys: Space, the arrows (Shift for 30 s), Home, Esc.
  It moves the film for everyone in the match. While it is open the mouse is free and the game's keys are off
  (`RD.active`); the match carries on (the game's auto-pause on losing the mouse is held off).
- **Seated:** no crosshair until you stand up.

## Screen edges, doorway curtains, side passages (November 2026, third pass)

- **Feathered screen edges.** The canvas draws without anti-aliasing, so the gently curved top edge of a 23 m screen
  showed as stair-steps. Each cinema screen has a strip round the picture (`sc.edge` in `70-screens.js`) that
  writes alpha from clear to the black masking over 28 cm: a soft, clean edge.
- **Doorway curtains.** Every theater doorway (side passages, the rear doors to the projection level, the luxury
  rooms' Promenade entrances) has two velvet curtain halves on a brass rod, in the room's colour
  (`N.exitDrapes`, drawn in `72-cinema-view.js`). They gather towards the jambs while anyone, player or bot, is
  within 1.7 m; no collision. The EXIT signs above stay lit. The arches' frames inside the theaters are dark
  bronze, not gold.
- **The side passages** (the main way into the theaters): patterned carpet, deep red fabric walls over a timber
  dado, a dark ceiling with brass downlights and sconces, lit poster cases; plain service concrete beyond the
  jog, towards the yard.

## The round: routes and timings (November 2026)

Measured along the bots' walk grid, spawn to the middle of each site:

| Route | Terrorists | Counter-Terrorists |
|---|---|---|
| to A (Theater 2's stage) | 81.5 m | 48 m |
| to B (Theater 3's stage) | 84 m | 48 m |
| to the Mid passage's doorways | 69 m | 42 m |
| A to B rotation | via the Mid passage, ~25 m | along the projection level, 32 m |

Before, both teams walked into Theater 1 through the same side passage and met in it at the same moment (81 vs
79 m): there was no site to hold. Now:
- **CTs spawn on the projection level** (y 6.3, x 47-73), above and behind Theaters 2 and 3. They reach a site in
  about 58 % of the Terrorists' time, through the rear doors, and hold it from the rake, looking down.
- **Terrorists** come from the street through the lobby and the Promenade into the side passages: West -> A,
  East -> B, and the Mid passage, which has a doorway into each site (the contested connector). CTs can reach Mid
  down the projection level's stairs and through the yard.
- **Flanks:** Theaters 1 and 4 (in from the West / East passages, up their aisles, out of their rear doors onto
  the projection level, behind the CTs); the yard, from the passages' far ends.
- **Cover:** on each site, two low stage monitors at the screen's corners (they stop bullets) and three flight
  cases in the pit (bullets go through), plus the front row of seats; espresso carts in the lobby; steel
  shelving and carts along the projection level (clear of the spawn).
- Sites are -0.5 to 0.75 m high, so their middle is at the pit's floor: the bots aim to plant at a site's middle,
  and with 0 to 1 m that point snapped to the front row's step, just outside the site.

In bot tests, rounds went both ways.

## Assets added in this pass (Poly Haven, CC0)

marble_mosaic_tiles (the lobby's floor bands); CoffeeCart_01 (lobby), ArmChair_01 and side_table_01 (the halls),
potted_plant_04 (the Promenade), industrial_storage_cart, steel_frame_shelves_02 and cardboard_box_01 (the
projection level). The cinema's assets are now 7.2 MB.
