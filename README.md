# Pocket Rally

A browser-based miniature racer with twenty-two circuits — original playgrounds, grand tours, eight real-world tracks and piece-built generated courses — plus a free-route Carpet City collection race. Includes keyboard and mobile touch controls, three CPU rivals, polished and cel-shaded graphics, dynamic lighting, and shared boost refills.

[Play the Sites version](https://pocket-rally.baaraamyou.chatgpt.site)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pirate59/pocket-rally)

## Deploy to Cloudflare

Use the button above for a new Cloudflare Workers deployment. Follow the account and repository prompts, then deploy using the included `wrangler.jsonc`. This follows the deployment-button approach used in [Incident Control](https://github.com/pirate59/incident-control).

Pocket Rally uses [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) to serve `dist/`. There is no server entry point, application build output to generate, or database to provision. The `build` command validates the maintained static source files. Cloudflare's [deployment button](https://developers.cloudflare.com/workers/platform/deploy-buttons/) supports package build and deploy commands.

### Git-connected Workers deployment

Connect this repository in Cloudflare Workers Builds and use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Project root | Repository root |
| Install command, if requested | `npm ci` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Wrangler configuration | `wrangler.jsonc` |
| Static assets | `dist/` |
| Runtime variables / secrets | None |
| Database / storage bindings | None |

Use Node.js 22.13 or newer. The lockfile pins the deployment tooling. If `pocket-rally` is already used by another Worker in your Cloudflare account, change `name` in `wrangler.jsonc` before deploying. Subsequent pushes to the connected production branch deploy through Cloudflare Builds.

### Manual deployment and local development

```bash
git clone https://github.com/pirate59/pocket-rally.git
cd pocket-rally
npm ci
npm run dev
```

Open the local URL printed by Wrangler. Use an HTTP server; opening `index.html` directly with `file://` will not load the JavaScript modules correctly.

```bash
npm run build
npm run deploy:check
npx wrangler login
npm run deploy
```

`deploy:check` validates deployment configuration without publishing. `deploy` requires Cloudflare authentication and publishes to the account selected in Wrangler. For a separate CI system, provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through that system's secrets; do not put credentials in source files. Cloudflare's own Git integration manages deployment authentication.

## Database and persistence requirements

**No database is required.** Do not create a D1 database, add a `DB` binding, run Drizzle migrations, or configure administrator credentials for this game. Incident Control needs those resources for its server-side records and accounts; Pocket Rally has no corresponding server-side functionality.

| Data | Storage | Behaviour |
| --- | --- | --- |
| Best race times | Browser `localStorage` | Per course, difficulty and gameplay revision |
| Difficulty, camera and visual style | Browser `localStorage` | Remembered on the same browser and origin |
| Current race, CPU state, collected tokens and pickup cooldowns | Browser memory | Reset on restart or page reload |
| Shared leaderboard, user accounts or online multiplayer | Not implemented | No backend or database schema exists |

The Sites URL and a Cloudflare URL are different browser origins, so existing records and preferences do not automatically transfer. Clearing browser storage removes those local records. No D1, KV, R2, Durable Objects, migration files, database IDs, or application secrets are needed for deployment.

## Real World courses

Choose **Real World → Mount Panorama** for an approximate miniature recreation traced from the supplied circuit overview. Racing begins on Main Straight and runs counter-clockwise through Hell Corner, Mountain Straight, the mountain section, Conrod Straight, the Chase and Murrays Corner.

The full terrain board, infield and outer slopes rise toward the summit. Road and off-road driving share that terrain, and the chase camera clears the hills. Elevations emulate the circuit's climb and descent; they are not a surveyed simulation. There are no artificial jump ramps or toy obstacles on this course.

The outline follows the user-supplied map. Reference facts, including the 174 m elevation range and anti-clockwise direction, are from [Bathurst Regional Council](https://www.bathurst.nsw.gov.au/Services/Facilities/Mount-Panorama/About-the-Mount/Track-Facts).

Real World circuits use section-specific safety shoulders: walls sit close to the asphalt through the mountain bends and move outward beside the start area and long straights. The shoulder is driveable but uses the off-road surface penalty, so the extra room is for recovery rather than a faster line.

### Oran Park Raceway

Choose **Real World → Oran Park Raceway** for the 2.620 km Grand Prix configuration used in its final years. The course includes the Sweeper, underpass, Shell Corner, Champion Curve, bridge, Foster’s Dip, Momo Corner, Dogleg and Recaro Corner. The pit straight follows the historical racing direction, with the pit complex outside the circuit.

The entire board has rolling terrain. The crossover has distinct upper and lower driving surfaces, an open underpass and a supported bridge deck. Route progress, barriers and car collisions respect the separate levels. Elevation shapes are an interpretation for miniature gameplay, not surveyed data; the HUD therefore displays section names without invented elevation measurements. No artificial jump ramps are added.

Research references: [RacingCircuits.info’s final Grand Prix map and circuit history](https://www.racingcircuits.info/australasia/australia/oran-park.html), [The Race Torque’s bridge history](https://www.theracetorque.com/2021/05/what-happened-to-the-oran-park-bridge/) and [iRacing’s description of its scanned Oran Park recreation](https://www.iracing.com/broekman-shines-at-oran-park/). The geometry is authored for this game; source map artwork is not bundled.

### Hidden Valley Raceway

Choose **Real World → Hidden Valley Raceway** for the 2.870 km Darwin circuit, run clockwise. The lap opens with the 1.1 km main straight into the tight Turn 1, climbs through the fast Turn 2-3-4 esses, brakes hard for Turn 5 and the slow Turn 6 hairpin in its natural amphitheatre, then runs the technical second half through Ducati, the 8/9 kink, the crest at Turn 10 and the Turn 12-13-14 flicks onto the straight.

The whole board undulates. Relief carries the climb through the esses, the drop into the Turn 6 bowl and the rise to the Turn 10 crest. It interprets the published driver guides rather than surveyed data, so the HUD shows section names without invented elevation measurements. No artificial jump ramps are added. Scenery is a miniature of the wider Hidden Valley Motorsports Complex: pit garages and race control beside the main straight, the drag strip alongside it, grassed spectator terraces instead of a grandstand, the dirt speedway, the kart and motocross tracks, and Top End savanna woodland with termite mounds.

The geometry is authored for this game from published circuit facts and lap guides; no map artwork is traced or bundled. Sources are listed in [docs/hidden-valley-sources.md](docs/hidden-valley-sources.md).

### Sydney 500 · Homebush

Real World includes the historic 2009–2016 Homebush course, with 13 anti-clockwise turns, named sections, approximate Dawn Fraser Avenue undulations and Olympic Park scenery. See [research and modelling limits](docs/homebush-sources.md). Validate with `node scripts/test-homebush.mjs` and `node scripts/test-real-driving.mjs --races --homebush-only`.

## Game modes and controls

- **Circuits:** three laps against three CPU racers; the player starts fourth.
- **Carpet City:** collect all 12 unique blocks before the rivals, in any order. Each racer has an independent collection set.
- **Boost:** locks when charge reaches the low threshold. A cyan pickup fully refills and unlocks boost. Pickups are shared and respawn after 3–5 seconds: one on each small circuit, three on each large course. Cyan boost pads are reusable and grant the equivalent temporary boost without multiplying an in-car boost. Completing a circuit lap also refills boost; there is no timed recharge. Catch-up speed adds 4% per place behind the leader, up to 12% for fourth place.
- **Low Clutter:** optional in race setup and the pause menu, remembered on this browser. Hides race stats, opponent labels, minimap and secondary notifications while racing, and moves a compact boost meter to the top corner. Touch controls, pause and the on-demand Carpet City map remain available. Full results are shown after racing.
- **Visual style:** select Polished 3D or Cartoon / Cel shaded in the main menu. Both use a black background and dynamic lighting.

| Action | Keyboard |
| --- | --- |
| Accelerate / brake or reverse | W / S or Up / Down |
| Steer | A / D or Left / Right |
| Drift / handbrake | Space |
| Boost | Shift |
| Recover vehicle | R |
| Pause | Escape |
| Change camera | C |
| Carpet City map | M |

Touch controls appear on phones and tablets. A WebGL 2-capable browser with hardware acceleration is required. Three.js is vendored locally; no runtime npm installation is needed in the browser. Optional web fonts use fallbacks if unavailable.

## Source layout

- `dist/`: maintained HTML, CSS, JavaScript modules and vendored Three.js. **Do not delete or regenerate this directory as disposable build output.**
- `dist/race.mjs`: circuit physics and CPU racing.
- `dist/carpet-*.mjs`: carpet layout, scenery, collection race and rival navigation.
- `dist/boost-*.mjs`: boost rules, contested pickup handling and visuals.
- `dist/visual-style.mjs`, `dist/course-lights.mjs`: rendering styles and lighting.
- `dist/course-pieces.mjs`: connectable course pieces (straights, 45/90/135° turns, hairpins, elevation, jumps) for generating imagined courses, with staged layout → validation → barriers → decorations. Reference: `docs/course-pieces.md`.
- `scripts/check.mjs`: syntax, local-import and static-asset checks.
- `wrangler.jsonc`: independent Cloudflare deployment configuration.
- `.openai/hosting.json`: the existing OpenAI Sites project connection. It is not a Cloudflare account credential and is not used by Wrangler. A separate Sites project must use its own Sites-managed project ID.

This repository begins with the game published from Sites source commit `056de021e41dab072a833dcb0cd1b01128cbbf1d`, plus the deployment documentation and tooling. Uploading this repository does not establish automatic two-way synchronisation with Sites. Keep later source changes aligned explicitly when maintaining both hosting destinations.

## Verification and maintenance

Run `npm ci`, `npm run check`, and `npm run deploy:check` before deploying changes. The check command is a static validation, not a browser gameplay test. Check driving, mobile controls, both visual styles and boost pickups in a browser when changing gameplay or rendering. For a blank screen, check WebGL 2 support and the browser console, and ensure `dist/` is being served as the asset directory.

Three.js attribution and licence are retained in `dist/THREE-LICENSE.txt`. This repository does not add a licence grant for the original game code.
