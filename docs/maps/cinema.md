# Bayou Palace Cinemas: how the map is built, and how its screens work

A 1930s art-deco movie palace grown into a six-screen multiplex, on a 120 x 108 m city block. It plays Bomb
Defusal, Team Deathmatch and Free-for-All, and Theater Mode (no guns: from its Home card and the side rail). Every screen plays its own film, chosen in the
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
| Street, plaza, parking lot | north, z 0-26 (the lot x 116-165, to z 46) | Terrorist spawn. Parked cars along the far kerb, palms in planters, gardens, the box office kiosk with velvet-rope queues. East of the gardens the palace's own parking lot behind wrought-iron railings: seen from the street, not reached |
| Facade | z 26 | Stucco and granite. The marquee: letter boards listing the films and chaser bulbs. BAYOU PALACE in lit letters, the PALACE blade sign, poster cases |
| Grand Lobby | x 40-80 | Marble floor with a brass compass star, a coffered ceiling, three chandeliers, deco columns. The concession stand (candy cases, popcorn machines, soda fountain, menu boards). A mezzanine reached by two carpeted stairs |
| West Hall | x 30-40 | Arcade cabinets, a claw machine, a photo booth |
| The Velvet Room (theater 5) | x 4-30 | A luxury theater round an ultra-wide curved screen (a 19 m chord bowed 4 m, 7.95 m high: 2.39:1) on its east wall, wrapping round the audience; 80 leather recliners in five curved rows on tiers, each seat square to the screen; black velour round the screen, deep red drapes, a 12.1 m ceiling. Its entrance is on the Promenade, beside the screen's south end |
| East Hall | x 80-90 | Coat check |
| The Starlight (theater 6) | x 90-116 | A 360° sphere round the eye (24 x 14.4 m across, 23 m from its foot below the floor to its crown), the film all round you, above and below. From the Promenade a short hallway (marble, rosewood, brass, a coved ceiling) leads straight through a gilt portal into the film; nothing else of the room is seen. No seats, no film controls, no floor to be seen (you stand on an invisible floor) |
| Promenade | z 46.4-54.2, x 4-165 | A carpeted hall along the theaters' fronts, 7.8 m wide under a 4.8 m ceiling. Six arched screens cross it |
| Theaters 1-4 (Palace XL) | z 54.2-101.8, each 36.75 m wide | The screen is the front wall: flat, 35.95 x 20.2 m (16:9), wall to wall, 1 m off the floor to near the 22.2 m ceiling; nothing frames it. 18 rows of premium rockers (about 750 per theater) rising 8.1 m, lit row letters at the aisle ends, step lights. Ribbed timber walls under jacquard fabric panels with brass sconces, a ceiling of small recessed lights. You enter through the fire exits from the side corridors, or at the top from the projection level |
| Corridors | between the theaters (x 40.75-44.75, 81.5-87.5, 124.25-128.25) | Promenade to yard, with a jog at z 72.2. Fire exits (2.0 x 3.24 m) into the theaters' fronts |
| Projection level | z 102.2-106.8, 8.22 m up | A projector at each port, with its beam and dust in the beam. Steel stairs down to the yard |
| Loading dock, staff lot | south | Counter-Terrorist spawn |

**Bomb sites:** A is Theater 2's stage and pit, B is Theater 3's (see "The round" below).

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
- The cinema's screens are flat (`curve: 0`): YouTube's player is a flat rectangle warped onto the screen, and on
  the old curved screens the two parted towards the edges, so the player's own edges showed as glowing borders
  round the picture. The player is 16:9 and covers the screen at one scale (6 % over, so YouTube's title and logo
  fall outside the picture); a video file is cropped to cover it too, with any black bars baked into the file
  found by sampling the frame (`__scrFit`) and cropped away.
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

- **Wall to wall, IMAX-wide, a subtle curve.** The Palace XL screens are 23.5 m wide, 12.6 m high at the walls
  and 12.0 m in the middle; the Velvet Room's 19.4 m wide, 10.4 m and 9.9 m. On a large high-density display the
  YouTube player is 4K (YouTube picks its quality by the player's size). Their top and bottom edges bow out
  towards the sides (`bow` on the screen), the look of a giant curved screen from the seats. The screen itself
  stays flat, so YouTube's flat player stays locked to it (a truly curved screen and the flat player parted at the
  edges, which showed as glowing borders). No frame, no light lines round them: the picture is the wall. Nothing is cut into the screen wall: the XL theaters are entered through their side walls from
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

- **Screen edges.** The canvas draws without anti-aliasing, so a screen's edge can stair-step. A 5 cm strip round the
  picture (`sc.edge` in `70-screens.js`) fades it into the black: a pixel or two from the seats, a clean edge
  without a visible border (it was 28 cm, which read as a dark frame).
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

## The Starlight: the 360° dome (November 2026)

- **What it plays.** Any 360° or VR YouTube video, or a 360° / 180° video file, set in `/admin` (the Starlight's
  card has the format: 360° or 180° VR, and for VR files their stereo layout: mono, top / bottom, side by side; the
  left eye is shown). A YouTube video that turns out not to be 360° plays on a flat screen at the dome's front.
- **How YouTube 360° works.** YouTube's player can't be drawn on a 3D surface, but its own 360° viewer can be
  turned from the page (`setSphericalProperties`). The dome is drawn as a hole in the canvas; the player behind it
  fills the window (10 % over, so its corner badges fall outside), and every frame its view is turned to the
  camera's yaw and pitch with the camera's field of view (across the window's longer side). Both count up turning
  left and looking up, as the game's do. So the film is all round you and stays put as you look about.
- **How a file works.** The dome (`def.dome` in `70-screens.js`) is a grid of directions from an eye point in the
  middle of the room; each vertex is where that direction meets the dome, so an equirectangular film mapped by
  direction is right from the seats. 180° films fill the front half (black behind).
- **The building.** A full ellipsoid round the eye point (1.6 m over the floor), 24.4 x 18.8 m across, 11.7 m up to
  its crown and 11.7 m down below the floor: the film is under your feet too. The floor is collision only inside it
  (the carpet is drawn only in the vestibule and the corners; the site's ground is open under the room). Solid to
  4 m (a ring of collision columns), open at a 2.8 m doorway facing the vestibule. Seen from outside it is a dark
  shell. The room's control desk is in the vestibule.
- **Learned the hard way.** Right after a 360° film starts YouTube reports no view for a moment; switching the
  player between the dome and the flat fallback on that every frame stalled the page. The choice is made once per
  player: 360° as soon as a view is reported, flat only after 5 s of playing without one.

## YouTube films with black bars

A widescreen film uploaded inside a 16:9 video has black bars baked in, and a YouTube player can't be inspected
to find them. Each flat screen's card in `/admin` has **Picture: Full 16:9 / Widescreen 1.85 / Scope 2.39**: with
a shape set, the player is scaled so the film's picture covers the screen and the bars fall outside it. Video files
are trimmed automatically (`__scrFit`).

## Sacred geometry and the finish (November 2026)

The palace's ornament is drawn by `72b-cinema-sacred.js` from records `71-cinema.js` keeps in `A.__cn.sacred`
(`sg(kind, {...})`). All of it is visual: nothing has collision, and the bomb sites, doorways, stairs and spawns are
as they were. The figures are drawn procedurally on canvases (no image files): crisp anti-aliased lines with a dark
groove edge and a highlight so they read as inlaid or gilt metal, or as light, or as leaded glass.

- **The figures.** Flower of Life (the 19 circles and the arcs of the next ring, inside a band of interlaced
  circles), Seed of Life (in a ring of twelve lotus petals), Metatron's Cube (the 13 circles of the Fruit of Life and
  the 78 lines between their centres), the Sri Yantra (four triangles up, five down, the lotuses of 8 and 16 petals,
  the square enclosure with its gates), the golden spiral through its Fibonacci squares (a 1.618 : 1 panel), the
  Vesica Piscis, and a running frieze of circles each through its neighbours' centres.
- **Grand Lobby.** A 7.8 m Flower of Life of brass in dark marble under the middle chandelier, a Seed of Life under
  each side one; every coffer (now over the mezzanine too) lacquered deep blue with a gilt Metatron's Cube or Seed of
  Life in a stepped moulding; over the doors a rose window of Metatron's Cube lit from behind, a roundel either
  side, four fluted pilasters with stepped gilt capitals; a frieze under a moulded cornice round all four walls;
  on the stair walls framed bays (the picture, the golden spiral, a Seed of Life over the mezzanine); a rosewood
  wainscot with raised panels; the mezzanine's moulded fascia; the concession counter's black marble plinth, bullnose,
  fillets and medallion; carved consoles with marble busts under the windows.
- **Promenade.** A Seed of Life (Metatron's Cube in the middle) in brass and marble in front of each theater; a
  rosette over each pendant and beams with corbels between them; a crown moulding and a rosewood wainscot along both
  walls; tall backlit stained-glass panels (Seed of Life, Vesica Piscis, hexagram) either side of every entrance (the
  Velvet Room's in rose glass, the Starlight's in teal); roundels on the arched screens.
- **Auditoriums.** No ornament on the ceilings: they stay plain black with their small lights (a Sri Yantra and a
  Flower of Life were tried there and taken out). The Starlight is untouched.
- **Street front.** Seed of Life roundels either side of the blade sign, friezes along each step of the parapet,
  moulded cornices on every parapet, the fins ribbed in gilt on granite bases, a roundel over each fluted relief on
  the luxury rooms' blank walls, a Seed of Life in the plaza's terrazzo, the box office's corners rounded and its
  canopy edged with a gilt roll.
- **Cars.** The parked cars (the staff lot's four, nose in to the bays as painted, and four new ones along the far
  kerb of the street, clear of the Terrorists' spawn) are Poly Haven's `covered_car`, a scan of a saloon under a
  fitted cover, instanced with each cover tinted its own colour, solid (4.4 x 1.8 x 1.38 m). Poly Haven has no bare
  cars, and no realistic car model under a licence that allows redistribution in a game could be fetched without an
  account (Sketchfab's CC0 cars need a login; Khronos's CarConcept is a logo-branded concept car). The two vans at the
  dock are still the core's low-poly vans: their 2.1 m collision is cover the round is balanced round.
- **Assets added (Poly Haven, CC0).** rosewood_veneer1 (wainscots, frames); covered_car, marble_bust_01,
  ClassicConsole_01. The cinema's assets are now 8.5 MB.
- **Cost.** About 65k triangles more (detail 138k -> 203k), about fifteen draw calls, eleven canvas textures (the
  floor's Flower of Life at 2048 px, the rest 1536 px or smaller: about 80 MB of video memory with mipmaps), made
  when the map is built and released with it.

## Palace XL at 1.5 x, the Velvet's curved screen, the Starlight's hallway, the golden ratio (November 2026, fourth pass)

- **Map size.** 169 x 126 m (was 120 x 108). The street front (street, plaza, gardens, facade, marquee, lobby, halls,
  the Velvet Room, the Starlight) is where it was, x 4-116; the auditorium block behind it runs on to x 165, with the
  palace's parking lot in front of that part (fenced: the street's pavement runs past it). The building is closed on
  every side: the block's own stucco walls rise above the Promenade's roof with a cornice, the alleys are walled, the
  yard has its back fence.
- **The theaters** are laid out from one list (`__CN_XL` and `__CN` in `71-cinema.js`): four auditoriums 36.75 m wide
  from x 4, corridors of 4, 6 and 4 m between them; T1 x 4-40.75, T2 44.75-81.5, T3 87.5-124.25, T4 128.25-165. The
  section: screen wall at z 54.2, stage to 58.1, pit to 66.2, 18 rows of 1.8 m rising 0.45 m to 98.6, cross-aisle,
  rear wall 101.8, projection level 102.2-106.8 at 8.22 m (its roof 12.6 m), yard to 126. Screens: flat (`curve: 0`, no
  bow), 35.95 x 20.2 m, centred 11.1 m up. Projectors' ports at 10.87 m; beams follow the screen's size.
- **Round.** Sites: A = Theater 2's stage and pit (x 49-77, z 54.6-65.8), B = Theater 3's (x 92-120). T spawn on the
  street (unchanged); CT spawn on the projection level round the Mid Corridor (x 73-96, z 104.4-106.8). T gather in the
  West / Mid / East corridors past the fire exits; CTs watch from the cross-aisle and the side aisles. Stairs from the
  yard to the projection level at x 14, 96 and 140.
- **Seats.** One soft-box builder (`__cnSoft` in `72-cinema-view.js`): each part a face grid with rounded edges and
  analytic normals, bent (a dished cushion, a backrest wrapping round you with a lumbar roll and three stitched
  channels) with its normals carried through the bend. The rocker is about 790 triangles (velour seat and backrest,
  piping, headrest pad, moulded shell, brass seat plate), each arm standard about 150 (side panel, padded armrest, cup
  holder with a brass rim); the Velvet recliner about 1,000 (leather seat, two pillow-top bolsters, headrest pillow,
  wide padded arms with cup holders, the footrest stowed). Instanced per room; a room's seats are drawn only while
  the camera is in it or at its doors (about 0.7 M triangles in an XL theater). `73-cinema-seats.js` reads the same
  rows; the Velvet's curved rows are listed seat by seat (`list: [{ x, z, yaw }]`).
- **Velvet Room.** Screen def `{ id: 't5', x: 29.65, z: 36.2, w: 19, h: 7.95, curve: 4, ry: -π/2 }`: the arc's middle
  0.35 m off the east wall, its ends 4 m nearer the seats. Collision fills the space behind the arc. Black velour
  follows the curve (a lip at its foot with a warm LED line, the masking above it to the ceiling, returns at its
  ends). Five rows of 16 recliners on 2.9 m tiers rising 0.42 m, bowed 1.2 m towards the screen, each seat turned
  square to the arc: from the middle rows the screen fills about 110-125° of the view.
- **The Starlight.** Promenade entrance at x 101.9-104.1 (2.2 x 3.56 m) -> hallway x 101.5-104.5, z 41.15-46 -> a gilt
  portal (opening 2.0 x 3.24 m) -> the sphere (`cx 103, cz 33.98, rx 12, rz 7.18`, eye 1.72 m; door due south: yaw π,
  half-angle atan(1.4 / rz), up to 3.9 m). The hole in the sphere is wider than the portal's opening and narrower
  than its velour panel, so from the hallway you see only the film and from the sphere only the portal. The film's
  front is straight ahead as you step in (`front: 0`). The vestibule, its carpet ring and the control desk are gone.
- **The golden ratio (φ = 1.618) by design.**
  - the Promenade: 7.8 m wide under its 4.8 m ceiling (width = height x φ)
  - Palace XL auditoriums: ceiling 22.2 m = their 35.95 m width / φ
  - the Velvet Room: ceiling 12.1 m = its 19.6 m depth / φ
  - the Starlight's hallway: 3 m wide, 4.85 m high and 4.85 m long (1 : φ : φ); its runner 1.85 m (width / φ); its
    wainscot 1.15 m (height / φ³); its framed bays 1.4 x 2.27 m (1 : φ)
  - doorways at 1 : φ: the theaters' fire exits and the Velvet Room's entrance 2.0 x 3.24 m, the rear doors to the
    projection level 1.8 x 2.91 m, the Starlight's entrance 2.2 x 3.56 m and its portal 2.0 x 3.24 m
  - the golden-spiral bays on the lobby's stair walls 6.0 x 3.71 m; the backlit glass panels 0.8 x 2.4 m carry the
    Vesica Piscis, whose own proportion is 1 : √3
- **Cars.** Poly Haven's covered car now at 3,000 triangles (its hidden wheels were most of the 6,000); 40 cars:
  seven along the street, four in the staff lot, the rest in the parking lot.
