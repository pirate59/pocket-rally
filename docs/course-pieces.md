# Course pieces — the building blocks for imagined courses

Read this before generating a course from imagination. It does **not** apply
when recreating a real circuit or tracing a reference image; those are
hand-traced centrelines (see `dist/real-courses.mjs`, `dist/sandown.mjs`).

Module: [`dist/course-pieces.mjs`](../dist/course-pieces.mjs).
Tests: `node scripts/test-course-pieces.mjs`.

## Build order (enforced)

1. **Layout** — chain pieces end-to-end: `layoutCourse(spec)`.
2. **Validate** — the loop must close and never meet itself at one level:
   `validateLayout(layout)`. Fix every problem before moving on.
3. **Barriers** — only once the layout is valid: `addBarriers(course)`.
4. **Decorations** — only once barriers exist: `addDecorations(course, {theme})`.

`makeCourse(spec, options)` runs all four in order and throws with the list of
problems if stage 2 fails. Its result is a course object `makeTrack` accepts.

## Conventions

- Units are world units. The road is `width` wide (default 6.8, the arcade
  standard). The standard table board is about 88 × 62 (±44 × ±31), so keep
  the finished layout's extent inside that unless the world is enlarged.
- The cursor is `{x, z, y, heading}`. Forward is `(sin heading, cos heading)`;
  a **left** turn increases the heading; the driver's left is `(cos heading,
  −sin heading)`. This matches `race.mjs` so pieces map straight onto nodes.
- The first piece starts at the origin heading +z at ground level. The finished
  layout is recentred on the origin by `makeCourse` (`recentre: true`).
- Ground is `y = 0`. Heights are absolute; `makeTrack` clamps below zero, so
  the course must never dip under ground level.
- Points are sampled every `STEP` (0.25) units; `makeTrack` resamples them
  (`sampledPath: true`), so pieces never need extra smoothing.

## Piece catalogue

Text form (one string per piece) or object form via `PIECES`.

| Piece | Text | Object | Radius | Notes |
| --- | --- | --- | --- | --- |
| Straight | `straight 24` | `PIECES.straight(24)` | — | Any positive length |
| 45° turn | `L45 sharp` / `R45 sweeper` | `PIECES.turn(45,'L','sharp')` | sharp 7 · sweeper 14 | |
| 90° turn | `L90 sharp` / `R90 sweeper` | `PIECES.turn(90,'R','sweeper')` | sharp 7 · sweeper 14 | |
| 135° turn | `L135 sharp` / `R135 sweeper` | `PIECES.turn(135,'L','sweeper')` | sharp 7 · sweeper 14 | |
| 180° hairpin, round | `hairpin L round` | `PIECES.hairpin('L','round')` | 6 | One semicircle; exits 2R beside the entry |
| 180° hairpin, square | `hairpin R square gap=6` | `PIECES.hairpin('R','square',{gap:6})` | 6 | Two 90° corners with a short straight at the tip; exits 2R + gap beside the entry |
| Corkscrew up | `corkscrew L radius=12 rise=6 turns=1` | `PIECES.corkscrew('L',{radius:12,rise:6})` | 12 | A climbing helix: `turns` full circles rising `rise` in total (default 6 per turn), exiting over its own entry at the same heading one deck up. Needs a level straight ≥ radius after it. Left or right. |
| Corkscrew down | `corkscrew R down` | `PIECES.corkscrew('R',{down:true})` | 12 | The same helix descending (or `rise=-6`). Needs a level straight ≥ radius before it, and enough height to descend from. Left or right. |
| Loop-de-loop | `loop L radius=8` | `PIECES.loop('L',{radius:8})` | 8 | A vertical loop on a sticky rail. Exits beside its entry (drifts one road width + 1 to `side`) at the same heading. Needs a level plain straight ≥ 20 before and ≥ 12 after. |
| Choke point | `straight 30 choke=3.6` | `PIECES.straight(30,{choke:3.6})` | — | The road funnels from full width down to `choke` through the middle of the straight and back out (30 % taper each end). Straight ≥ 16; choke ≥ 2.6. |
| Split road | `straight 40 split=1.2 lane=4.4` | `PIECES.straight(40,{split:1.2})` | — | The road widens into two lanes of `lane` (default 0.65 × width) around a centre island `split` wide, with a barrier and kerbs down the island. Straight ≥ 24; lane ≥ 3. |

Modifiers (append to any piece as `key=value`):

| Modifier | Applies to | Effect |
| --- | --- | --- |
| `rise=N` | any | Height change across the piece, eased in and out. Negative descends. Limit: `|rise| ≤ 0.35 × piece length`. |
| `radius=N` | turns, hairpins | Override the default radius |
| `gap=N` | square hairpin | Straight length at the tip (default 4) |
| `runoff=N` | turns, hairpins | Extra barrier clearance on the outside of that bend |
| `jump` or `jump=N` | straights | Places a jump crest `N` units into the straight (default 14). `makeTrack` builds the ramp over the 12 units before the crest and a 3.4-unit gap. The landing rules below decide how much straight must follow. |

## Adventurous pieces

- **Loop-de-loop** — a rail section. The circle sits in the heading plane
  centred `radius` above the entry, so its back half overhangs the approach
  road (that is why the approach must be ≥ 20 units of plain road). The ribbon
  drifts sideways by `width + 1` over the turn so the exit runs beside the
  entry. Cars are *carried*: on entry `race.mjs` switches the car to rail
  mode — position and orientation come from the node's 3D tangent and up
  vectors, speed bleeds on the climb and returns on the drop but never falls
  below `RAIL_FLOOR` (8), so a slow entry means a slow loop, never a fall.
  Steering is ignored on the rail; throttle adds a little. No walls, pickups,
  pads or debris are placed on rail nodes and cars on the rail don't collide.
  Left and right variants only differ in which side the exit lands. No
  supports are drawn under the loop.
- **Corkscrew** — a spiral ramp, up or down, left or right. The helix climbs `rise` over `turns` full
  circles and comes out directly above where it went in, so the exit deck
  passes over the start of the helix: follow it with a level straight of at
  least `radius` units, then descend (`straight 16 rise=-5.5`). Each turn must
  climb ≥ 5 units; the radius must be ≥ width/2 + 2.5. Treated as a harsh
  turn for jump landings. Rendered on stilts like any deck.
- **Choke** — the barriers and road funnel in together. CPU rivals read the
  narrower width and pull their line to the centre; the player just has to
  be tidy. Minimum 2.6 (a car is ~1.6 wide). Don't put one within 20 units
  of the start line or in a jump's landing runway.
- **Split** — a centre island with a two-sided barrier and kerbs. Rivals
  commit to a lane about 32 units out and slow down if they are not across
  in time; `recover` places a car in a lane rather than on the island. The
  island nose is a head-on wall, so give it a straight run-up: not within 20
  units of the start line, not in a jump landing, and ideally not straight
  out of a hairpin (warning).

Not available (engine limits, see the end): barrel-roll corkscrew, banked
bends.

## Elevation, bridges and jumps

- A **bridge** is any place the road passes over itself with at least
  `BRIDGE_CLEARANCE` (4 units) between decks. Use three straights: rise, flat
  deck, fall. The flat deck must cover the whole width of the road underneath
  (road corridor is `width` wide, so the deck should run ≈ `width + 2` past the
  crossing point on both sides). A crossing with less clearance is reported as
  a same-level overlap and fails validation.
- A rise on a turn is fine (`L90 sweeper rise=4.5`); it just needs enough arc
  length for the grade limit.
- Every `rise` must be paid back somewhere so the loop closes at the start
  height; `closure.rise` reports the leftover.

## Closing the loop

`layoutCourse` returns `closure`, expressed in the **end cursor's own frame**:

```js
closure: { distance, heading, rise, ahead, left, turn }
// ahead: how far in front of the end cursor the start lies (negative = behind)
// left:  how far to the driver's left the start lies (negative = right)
// turn:  degrees of heading still to add (positive = left) to face the start heading
```

Tolerances: 0.25 units position, 0.25 units height, ~1° heading (a looser seam kinks the road and pushes the wall onto it). Use the readout
to pick the closing pieces — e.g. `ahead:0, left:12, turn:180` is exactly a
round hairpin (2 × radius 6), and `ahead:20, left:0, turn:0` is `straight 20`.

Because the same-radius turns are exact arcs, symmetric layouts close exactly
(paperclip: `straight 40, hairpin L square gap=8, straight 40, hairpin L square
gap=8`). Asymmetric layouts usually need one or two straights tuned by a few
tenths of a unit; solve with the closure readout rather than guessing.

## Sequencing rules

`validateLayout` also applies driving-safety rules from the game's physics.
**Problems** block the build; **warnings** are returned in `validation.warnings`
and should be read as "risky but allowed". Numbers come from `race.mjs`: cars
leave the ramp at up to 20 units/s (29 boosting) and land ~16 (~28) units past
the crest.

| Rule | Level | Why |
| --- | --- | --- |
| A jump straight must be flat, with the crest ≥ 14 units in and ≥ 4 before its end | problem | The ramp needs 12 units of run-up on level road |
| ≥ 18 units of flat straight after the crest (this straight's remainder plus any following straights) | problem | Below this, cars are still airborne when the next turn starts |
| No rising or falling straight within 30 units after the crest | problem | Landing on a slope or a deck edge |
| A harsh turn (hairpin, or sharp 90°/135°) within 30 units after the crest | problem | Boosted cars land at ~28 units, straight into the wall |
| A sweeper within 30 units after the crest | warning | Fine at cruise speed; boosted landings may clip the outside wall |
| Jump crests ≥ 44 units apart | problem | One landing plus the next ramp |
| Piece 0 must be a straight | problem | The grid launches straight ahead from just before the start line |
| No crest within the first 20 units of the lap | problem | Cars would leave the grid straight into the ramp |
| The last 10 units of the lap should be flat straight | warning | That is where the grid sits |
| Opposite-direction harsh turns with no straight between | warning | Snap chicane; add a short straight or use sweepers |
| A choke or split beginning within 20 units of the start line | problem | The grid launches straight into it |
| A choke or split inside a jump's 30-unit landing | problem | Landing into a funnel or an island nose |
| A corkscrew not followed by a level straight ≥ its radius | problem | The exit deck runs over the start of the helix |
| A corkscrew down not preceded by a level straight ≥ its radius | problem | The entry deck runs over the end of the helix |
| A loop without a level plain straight ≥ 20 before and ≥ 12 after | problem | The loop overhangs its approach by `radius`; cars need to settle on exit |
| Loop radius < 6 | problem | The top must clear cars at the bottom |
| A choke or split straight out of a harsh turn | warning | Cars are still gathering their line |

A quick way to satisfy the start rules: put the start/finish partway along a
long straight by splitting it, e.g. `… , 'hairpin R round', 'straight 10'` at the
end and `'straight 16', …` at the beginning.

## Validation problems you will see

| Message | Meaning / fix |
| --- | --- |
| Loop does not close: … | Adjust the last straights/turns using `closure` |
| Road meets itself at the same level near (x, z): piece A and piece B … | Reroute, or make one of them a bridge with ≥ 4 units clearance |
| Elevation drops below ground level | Start the descent higher or shorten it |
| rise of N is too steep | Spread the rise over more length |
| only N units of straight after the crest / harsh turn N units after the crest | Lengthen the landing straight, move the crest earlier with `jump=N`, or swap the turn for a sweeper |
| the crest is only N units after the start line | Move the jump to a later straight, or start the lap elsewhere |
| the lap must start on a straight | Rotate the spec so a straight comes first |

`validation.notes` lists every bridge found (`Bridge at (x, z): deck 4.5 over 0.0`).

## Barriers and decorations

`addBarriers` sets `walls: true` with a 0.34 wall offset (the arcade default);
`runoff=N` on a bend widens the gap on that bend's outside only. Barriers are
built by `makeBarriers` in `dist/track-boundaries.mjs` when the track is made.

`addDecorations` picks a theme, which fixes the vehicle type and colours and
selects the existing scenery builder (props are placed around, never on, the
road): `table` (cars), `bath` (boats), `garden` (buggies), `beach` (buggies).

## Grand tours (3× boards)

Pass `grand: true` to `makeCourse` for a grand-tour course: the road is 9 wide,
barrier offset 0.18, `mapScale` 3, and the board comes from the theme
(`beach` → 460 × 500). The grand beach board's driveable interior is
x −160…195, z −105…215; the shoreline water strips run beyond x 195 / z 215
(a raised deck there is a pier over the water) and dune bands beyond
x −160 / z −105. Use `centre: {x, z}` to place the layout's centre — the beach
interior is centred near (17, 55).

Lap-time budget: CPU rivals average ~20 units/s, so a grand tour meant to lap
in 90–180 s needs **1800–3600 units** of road. At that scale use larger radii
(`radius=30`–`45` sweepers, `radius=12`–`18` hairpins) — the 7/14 defaults are
tuned for the 6.8-wide arcade road.

`EXAMPLES.adventure` (Adventure Park) puts a split, a choke and a corkscrew on
one table. `EXAMPLES.sands` (Shifting Sands Grand Tour, 2173 units ≈ 105 s CPU lap) is
the worked example: a Bay Straight jump, a coastal sweeper climbing onto a pier
over the water, a reef chicane, a hairpin-and-diagonal reef section, and a
comb of dune switchbacks joined by hairpins.

## Worked examples

`EXAMPLES` in the module holds three specs that close exactly, pass every
stage with no warnings, and each end on a flat straight so the grid is level;
CPU rivals complete three laps on each without a respawn.

```js
import {makeCourse, EXAMPLES} from './course-pieces.mjs';
const course = makeCourse(EXAMPLES.proving.spec, EXAMPLES.proving);
// course.points, course.jumpAnchors, course.walls, course.deco … → makeTrack(course)
```

Proving Ground — a long jump, sharp and sweeper turns at 45°/90°/135°, round hairpins both ways and a flyover:

```
straight 16               straight 18
R90 sweeper               L90 sweeper rise=4.5   (climb onto the deck)
straight 44 jump          straight 41.85
R135 sharp                L90 sharp
L45 sweeper               straight 7.65          (flat deck over piece 1)
hairpin L round radius=8  straight 13 rise=-4.5  (descend)
                          straight 22.5
                          hairpin R round
                          straight 10            (grid sits here)
```

The jump crest is 14 units into the 44-unit straight, leaving exactly 30 units
of landing before the 135° sharp corner.

## Rail sections (how loops work in the engine)

Layout points carry nine elements: `[x, y, z, width, island, rail, ux, uy, uz]`.
For a rail point `rail = 1` and `(ux, uy, uz)` is the car's up vector (towards
the loop centre). `makeTrack` measures rail spans in 3D, marks nodes
`rail: true` with a 3D tangent `t3x/t3y/t3z`, and gives them the plan-view
heading of the road they were entered from so the minimap, chase camera and
AI curvature preview treat a loop as a straight. `game.mjs` skips rail nodes
in the flat road and builds them as a floating double-sided deck with no
supports (`buildRailRibbon`) — it is a toy world; rail cars are oriented by
quaternion from the frame. The chase camera stays level and follows the car's
plan heading, rising and falling with it — and each loop is registered with
the scenery fader, so whenever the deck comes between the camera and the car
it turns translucent (as buildings do in the classic view) and the driver
stays in sight. The nose, roof and cockpit views are bolted to the car and
roll with it, so the world turns over around you. This is the groundwork for fully 3D courses: any piece that
emits rail points with frames rides the same path.

## Not yet available

**Barrel-roll corkscrew** (a helix around the forward axis) — the rail mode
above supports it in principle; it needs a piece that emits the frames and a
decision about lateral drift. **Banked bends** need the flat road to accept a
roll angle. Also not yet: at-grade crossovers, chicane/S-bend compound pieces.
Add new kinds in `primitives()` and list them here so every generator sees
the same catalogue.
