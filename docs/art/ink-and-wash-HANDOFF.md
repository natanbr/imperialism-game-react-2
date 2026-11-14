# Claude handoff — approved Imperialism static artwork

## Current status
The owner approved this static set on 2026-11-13 and requested this export. Treat the included PNG/SVG files as the selected art. No gameplay integration, animation, build/deployment or source-code change is included. This handoff supplies context; let the owner specify the next implementation task.

## Start here
Inspect public/assets/ink-and-wash/index.html and its manifest.json. Keep the folder structure. The classic asset-catalog.js drives the offline gallery; manifest.json is the integration inventory. Asset IDs are art IDs, not a guaranteed one-to-one mapping to game enums: inspect the target runtime before wiring them.

## Locked visual choices
- Ink and wash: charcoal outlines, muted green/ochre/cream/slate, restrained texture.
- Orchard L1–L3 use the selected three-quarter orchard with nine trees and one/two/three cottages. Wool and forestry use the selected illustrated shelters with one/two/three openings. Preserve these exact files; the simplified front-facing variants were rejected.
- Farm and plantation progression uses one/two/three crop rows. Base sheep pasture has no fence. Base horse terrain has no fence. The fenced horse ranch is an optional art variant, not a verified additional gameplay tier. Cattle ranch supports three improvement sprites.
- Goods: Armaments is a cannon, Hardware a hammer, Iron Ore is rust-red to distinguish it from Coal, Canned Food is a sealed tin.
- RED means attack; GREEN means transport. Use the exported broad curved arrow SVGs. Existing generic movement/preview files use the transport treatment.
- There are eight full-body map specialists and four separate compact economy icons: Untrained, Trained, Expert and Labour.
- Capital has16 separate building sprites. The current preview lays out all16. city/city-ground.png is an earlier background study with baked scenery; it is not the complete capital or a clean empty placement ground.

## Rendering and integration
Goods and economic icons are128×128 PNGs, reviewed at22px. Other sprites are256×256, reviewed at42px map scale. Full-body workers, army, navy and buildings use a bottom-center anchor with18px transparent bottom margin; ground features and goods are centered. Ground/water textures are512×512; see the manifest for all exact dimensions. Preserve alpha and aspect ratios.

The connected terrain demo uses a42px staggered square grid with21px alternating row offset, shared ground, separate terrain objects, shoreline masks, river, rail and order layers. terrain-renderer.js supplies reusable SVG helpers. Demo geography and arrow positions are fixed examples: runtime topology and validated movement waypoints must come from game data. Static curve samples do not constitute arbitrary path routing. Use neighbour-aware shores; test islands, bays, river mouths, bridges and port placement. The checked game reference stored armies by province without a playable deployment route renderer; recheck current code before integration.

Keep previews and exported files synchronized. After deliberate artwork changes, run node scripts/sync-ink-assets.cjs from the pack root. It updates content fingerprints and catalog script URLs. Recheck transparent borders, small-scale readability, and the actual gallery files rather than judging only source generation sheets.

## Later stages
Static art is approved. The planned next stage is simple looping worker WORK and army MOVE/ATTACK animations, beginning with representative units for review before expanding. Keep fixed canvas, palette, scale and ground anchor across frames. Optional working mine glow and oil effects come afterward. This ZIP contains no animation frames or sprite animations.
