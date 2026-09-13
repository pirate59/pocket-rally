# Albert Park reference notes

The game uses the current 14-turn, clockwise Grand Prix configuration, 5.278 km in reality. The outline is hand-traced from the FIA map, with the tightest corners rounded slightly for the miniature vehicle scale. It is a playable interpretation, not a surveyed digital twin.

- [FIA 2026 Australian Grand Prix circuit map](https://www.fia.com/system/files/decision-document/2026_australian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone.pdf): page 2 supplies the route, start line, direction, corner numbering and current distance. The removed pre-2022 chicane is not present.
- [Parks Victoria visitor guide](https://www.parks.vic.gov.au/-/media/project/pv/main/parks/documents/visitor-guides-and-publications/albert-park/albert-park-visitor-guide.pdf?rev=a640fccdba164b79acfabf33eb54f02f): lakeshore, islands, sailing clubs, Lakeside Stadium, aquatic centre and eastern golf course. Scenery placement and building forms are simplified to fit the board.
- [Formula 1 elevation comparison](https://www.formula1.com/en/latest/article/highs-and-lows-which-f1-track-has-the-most-elevation-changes-.7I9JEcBw3R2AqXbnJ6hyvc.7I9JEcBw3R2AqXbnJ6hyvc): reports 2.6 m of total relief, with the low on the pit straight and high approaching the old Turn 13 (current Turn 11). The game applies a broad, shallow rise across the whole board using approximately 0.18 world units per metre. Exact gradients and camber are not available from these sources and are not claimed.
- [Parks Victoria Albert Park](https://www.parks.vic.gov.au/places-to-see/parks/Albert-Park): city skyline views, sailing, rowing, sporting grounds and black swans inform the setting.

Runoff widths are approximate: narrow beside the street-circuit walls, wider around major braking zones. Grass and gravel retain the off-road grip and speed penalty. The lake is not driveable. The existing Real World tyre model and controls apply unchanged.

Validation: `node scripts/check.mjs`, `node scripts/test-albert-park.mjs`, and `node scripts/test-real-driving.mjs --races --albert-only`.
