// The one table from the game to Nathan's approved art pack (NR-031, NR-032; FR-272, FR-318): public/assets/ink-and-wash/,
// kept as supplied (its manifest lists every file with its checksum). Art ids are not game enums, so every use of the pack
// goes through this file; tests/ui/inkArt.test.ts checks each entry of INK_ART_FILES against the manifest and the files on
// disk, and that INK_ART_FILES and INK_ART_UNUSED together are exactly the manifest's files.
import type { RegimentType } from "@/engine";
import type { IndustryType, WorkerGrade } from "@/types/Industry";
import { ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { TerrainType, type Tile } from "@/types/Tile";
import type { WorkerType } from "@/types/Workers";

/** Where the pack is served from (Next serves public/ at the root). */
export const INK_ART_BASE = "/assets/ink-and-wash/";

/** The pack's picture families (the manifest's `family`). */
export type InkFamily =
  | "workers"
  | "goods"
  | "army"
  | "navy"
  | "buildings"
  | "terrain"
  | "infrastructure"
  | "improvements"
  | "city"
  | "map-ui"
  | "worker-icons";

/**
 * Where a picture's subject stands in its box: full-body figures (workers, army, buildings) on the bottom centre, above
 * an 18 px transparent margin; everything else centred. The manifest's anchor without its note.
 */
export type InkAnchor = "bottom-center" | "center";

/** One pack file the game uses, as the manifest lists it. */
export interface InkArtFile {
  /** The manifest's `file`, relative to INK_ART_BASE ("goods/steel.png"). */
  readonly file: string;
  readonly family: InkFamily;
  /** The file's own size in px (its viewBox for an SVG). */
  readonly width: number;
  readonly height: number;
  readonly anchor: InkAnchor;
}

const listed = new Map<string, InkArtFile>();

/** Names one pack file: records it once for INK_ART_FILES and gives its URL. */
function packArt(file: string, family: InkFamily, width: number, height: number, anchor: InkAnchor = "center"): string {
  if (!listed.has(file)) listed.set(file, { file, family, width, height, anchor });
  return `${INK_ART_BASE}${file}`;
}
/** A full-body figure: 256x256, standing on the bottom centre. */
const figure = (family: "workers" | "army" | "buildings", file: string) => packArt(file, family, 256, 256, "bottom-center");
/** A map object (terrain, improvement, depot, port, fort): 256x256, centred. */
const mapObject = (family: "terrain" | "improvements" | "infrastructure", file: string) => packArt(file, family, 256, 256);
/** An economy icon (goods, worker grades): 128x128, centred; reviewed at 22 px. */
const icon = (family: "goods" | "worker-icons", file: string) => packArt(file, family, 128, 128);

/**
 * The era-1 picture of each regiment type. The pack draws three eras per Imp1 line (light infantry: light infantry,
 * sharpshooters, rangers; light artillery: horse artillery, field artillery, mobile artillery; heavy artillery: heavy
 * artillery, siege artillery, railroad gun), so the era-1 Light Artillery is the horse artillery and the era-1
 * Artillery the heavy artillery.
 */
const REGIMENT_ART: Record<RegimentType, string> = {
  minutemen: figure("army", "army/militia.png"),
  skirmishers: figure("army", "army/light-infantry.png"),
  regulars: figure("army", "army/regulars.png"),
  grenadiers: figure("army", "army/grenadiers.png"),
  hussars: figure("army", "army/hussars.png"),
  cuirassiers: figure("army", "army/cuirassiers.png"),
  lightArtillery: figure("army", "army/horse-artillery.png"),
  artillery: figure("army", "army/heavy-artillery.png"),
  sappers: figure("army", "army/sappers.png"),
};

/** The regiment type's picture. */
export const regimentArt = (type: RegimentType): string => REGIMENT_ART[type];

/** The fort levels the pack draws (infrastructure/fort-1.png to fort-3.png, centred). */
export const FORT_LEVELS = [1, 2, 3] as const;
const FORT_ART = FORT_LEVELS.map((level) => mapObject("infrastructure", `infrastructure/fort-${level}.png`));

/** The fort's picture; none below level 1, the strongest fort above level 3. */
export const fortArt = (level: number): string | undefined =>
  level >= 1 ? FORT_ART[Math.min(Math.floor(level), FORT_LEVELS.length) - 1] : undefined;

/**
 * The pack's RED attack arrow (120x56): a broad curved arrow whose tail's middle and tip are the points below, in the
 * file's own units. The map scales and turns it so they land on the two army markers (FR-273).
 */
export const ATTACK_ARROW_ART = {
  url: packArt("map-ui/army-attack.svg", "map-ui", 120, 56),
  width: 120,
  height: 56,
  /** The middle of the tail's edge, from (7, 36.3) to (9, 51.7). */
  tail: { x: 8, y: 44 },
  tip: { x: 112, y: 9 },
} as const;

/** Each capital building's picture (FR-318 (f)): the camelCase id in kebab-case, but the refinery and the armoury. */
const BUILDING_ART: Record<IndustryType, string> = {
  textileMill: figure("buildings", "buildings/textile-mill.png"),
  clothingFactory: figure("buildings", "buildings/clothing-factory.png"),
  lumberMill: figure("buildings", "buildings/lumber-mill.png"),
  furnitureFactory: figure("buildings", "buildings/furniture-factory.png"),
  steelMill: figure("buildings", "buildings/steel-mill.png"),
  metalWorks: figure("buildings", "buildings/metal-works.png"),
  refinery: figure("buildings", "buildings/oil-refinery.png"),
  foodProcessing: figure("buildings", "buildings/food-processing.png"),
  railyard: figure("buildings", "buildings/railyard.png"),
  university: figure("buildings", "buildings/university.png"),
  armoury: figure("buildings", "buildings/armory.png"),
  shipyard: figure("buildings", "buildings/shipyard.png"),
  powerPlant: figure("buildings", "buildings/power-plant.png"),
  warehouse: figure("buildings", "buildings/warehouse.png"),
  capitol: figure("buildings", "buildings/capitol.png"),
  tradeSchool: figure("buildings", "buildings/trade-school.png"),
};

/** The building's picture (FR-333, FR-334). */
export const buildingArt = (building: IndustryType): string => BUILDING_ART[building];

/** The Council screen's header picture (FR-298): the capitol. */
export const CAPITOL_ART = BUILDING_ART.capitol;

/** Each terrain's map picture (FR-318 (a)); water, river and coast have none (the ground draws them, FR-321). */
const TERRAIN_ART: Record<TerrainType, string | undefined> = {
  dryPlains: mapObject("terrain", "terrain/dry-plains.png"),
  openRange: mapObject("terrain", "terrain/open-range.png"),
  horseRanch: mapObject("terrain", "terrain/horse-ranch.png"),
  plantation: mapObject("terrain", "terrain/plantation.png"),
  farm: mapObject("terrain", "terrain/farm.png"),
  orchard: mapObject("terrain", "terrain/orchard.png"),
  fertileHills: mapObject("terrain", "terrain/fertile-hills.png"),
  barrenHills: mapObject("terrain", "terrain/barren-hills.png"),
  mountains: mapObject("terrain", "terrain/mountains.png"),
  hardwoodForest: mapObject("terrain", "terrain/hardwood-forest.png"),
  scrubForest: mapObject("terrain", "terrain/scrub-forest.png"),
  swamp: mapObject("terrain", "terrain/swamp.png"),
  desert: mapObject("terrain", "terrain/desert.png"),
  tundra: mapObject("terrain", "terrain/tundra.png"),
  water: undefined,
  river: undefined,
  town: mapObject("terrain", "terrain/town.png"),
  capital: mapObject("terrain", "terrain/capital.png"),
  coast: undefined,
};
/** Fertile hills that hold wool show the wool pasture (sheep, no fence) instead of the bare hills (Q62). */
const WOOL_PASTURE_ART = mapObject("terrain", "terrain/wool-pasture.png");

/** The terrain's map picture (FR-318 (a)); `resource` only matters on fertile hills (wool pasture). */
export const terrainArt = (terrain: TerrainType, resource?: ResourceType): string | undefined =>
  terrain === TerrainType.FertileHills && resource === ResourceType.Wool ? WOOL_PASTURE_ART : TERRAIN_ART[terrain];

/** The improvement pictures' name per resource (FR-318 (b)); fish and horses have no tiers. */
const IMPROVEMENT_STEM: Record<ResourceType, string | undefined> = {
  grain: "farm",
  livestock: "ranch",
  fruit: "orchard",
  fish: undefined,
  cotton: "plantation",
  wool: "wool",
  // improvements/horse-ranch-1.png is a fenced variant of the horse ranch, not a level (INK_ART_UNUSED)
  horses: undefined,
  timber: "forestry",
  coal: "mine",
  ironOre: "mine",
  oil: "oil-well",
  gold: "mine",
  gems: "mine",
};
const IMPROVEMENT_ART = Object.fromEntries(
  Object.entries(IMPROVEMENT_STEM).map(([type, stem]) => [
    type,
    stem === undefined ? undefined : [1, 2, 3].map((level) => mapObject("improvements", `improvements/${stem}-${level}.png`)),
  ])
) as Record<ResourceType, readonly string[] | undefined>;

/** The improvement's picture at levels 1 to 3 (FR-318 (b)); none at level 0 (the terrain shows) and for fish and horses. */
export const improvementArt = (type: ResourceType, level: number): string | undefined =>
  Number.isInteger(level) && level >= 1 && level <= 3 ? IMPROVEMENT_ART[type]?.[level - 1] : undefined;

/** The two M15 capital farm pictures share a lossless map sprite sheet (scripts/build-capital-farmland-atlas.mjs). */
export const FARMLAND_ATLAS = "/assets/map-atlases/capital-farmland.webp";
export const farmlandFrame = (src: string) =>
  src === TERRAIN_ART[TerrainType.HorseRanch] ? "left" : src === IMPROVEMENT_ART[ResourceType.Fruit]?.[1] ? "right" : undefined;

/**
 * The one picture a map tile shows (FR-322): a capital or town its terrain's; else a resource at level 1 to 3 with an
 * improvement that level's improvement; else the terrain's (a hidden coal hill and an opened one at level 0 both show
 * barren hills). None on water, river and coast.
 */
export const tileArt = (tile: Pick<Tile, "terrain" | "resource">): string | undefined => {
  if (tile.terrain === TerrainType.Capital || tile.terrain === TerrainType.Town) return terrainArt(tile.terrain);
  const improved = tile.resource ? improvementArt(tile.resource.type, tile.resource.level) : undefined;
  return improved ?? terrainArt(tile.terrain, tile.resource?.type);
};

/** Each warehouse commodity's picture (FR-318 (c)), by game id; the manifest's labels are not the game's names. */
const GOODS_ART: Record<WarehouseCommodities, string> = {
  grain: icon("goods", "goods/grain.png"),
  livestock: icon("goods", "goods/livestock.png"),
  fruit: icon("goods", "goods/fruit.png"),
  fish: icon("goods", "goods/fish.png"),
  cotton: icon("goods", "goods/cotton.png"),
  wool: icon("goods", "goods/wool.png"),
  horses: icon("goods", "goods/horses.png"),
  timber: icon("goods", "goods/timber.png"),
  coal: icon("goods", "goods/coal.png"),
  ironOre: icon("goods", "goods/iron-ore.png"),
  oil: icon("goods", "goods/oil.png"),
  gold: icon("goods", "goods/gold.png"),
  gems: icon("goods", "goods/gems.png"),
  cannedFood: icon("goods", "goods/canned-food.png"),
  fabric: icon("goods", "goods/fabric.png"),
  paper: icon("goods", "goods/paper.png"),
  lumber: icon("goods", "goods/lumber.png"),
  // The manifest labels it "Cast Iron / Steel": the game's Steel
  steel: icon("goods", "goods/steel.png"),
  fuel: icon("goods", "goods/fuel.png"),
  clothing: icon("goods", "goods/clothing.png"),
  furniture: icon("goods", "goods/furniture.png"),
  hardware: icon("goods", "goods/hardware.png"),
  armaments: icon("goods", "goods/armaments.png"),
};

/** The commodity's picture (FR-331). */
export const goodsArt = (commodity: WarehouseCommodities): string => GOODS_ART[commodity];

/** The minerals and oil whose mine or oil well does not say which one it is: a goods mark says it (FR-323, Q63). */
const MARKED: ReadonlySet<ResourceType> = new Set([ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems, ResourceType.Oil]);

/** The 16 px mark of a tile's known mineral or oil (FR-323): its goods picture; none while hidden or for any other resource. */
export const resourceMarkArt = (tile: Pick<Tile, "resource">): string | undefined =>
  tile.resource && tile.resource.discovered !== false && MARKED.has(tile.resource.type) ? goodsArt(tile.resource.type) : undefined;

/** Each civilian's full-body figure (FR-318 (d)): workers/<same id>.png. */
const CIVILIAN_ART: Record<WorkerType, string> = {
  prospector: figure("workers", "workers/prospector.png"),
  engineer: figure("workers", "workers/engineer.png"),
  miner: figure("workers", "workers/miner.png"),
  farmer: figure("workers", "workers/farmer.png"),
  rancher: figure("workers", "workers/rancher.png"),
  forester: figure("workers", "workers/forester.png"),
  driller: figure("workers", "workers/driller.png"),
  developer: figure("workers", "workers/developer.png"),
};

/** The civilian's figure (FR-325, FR-332), by its `WorkerType` of `types/Workers.ts`. */
export const civilianArt = (type: WorkerType): string => CIVILIAN_ART[type];

/** The industrial workers' grade icons (FR-318 (e)). */
const GRADE_ART: Record<WorkerGrade, string> = {
  untrained: icon("worker-icons", "worker-icons/untrained.png"),
  trained: icon("worker-icons", "worker-icons/trained.png"),
  expert: icon("worker-icons", "worker-icons/expert.png"),
};

/** The grade's icon (FR-332), by its `WorkerGrade` of `types/Industry.ts`. */
export const gradeArt = (grade: WorkerGrade): string => GRADE_ART[grade];

/** The labour icon (FR-332). */
export const LABOUR_ART = icon("worker-icons", "worker-icons/labour.png");

/** The depot and the port, drawn as small marks on their tile (FR-324). */
export const DEPOT_ART = mapObject("infrastructure", "infrastructure/depot.png");
export const PORT_ART = mapObject("infrastructure", "infrastructure/port.png");

/** The straight rail piece (42x16), laid along each rail link from its left middle (0, 8) to its right middle (42, 8) (FR-328). */
export const RAIL_ART = { url: packArt("infrastructure/rail-straight.svg", "infrastructure", 42, 16), width: 42, height: 16 } as const;

/** The selection mark: four corner brackets with a pale halo over the tile's outer 42x42 box (FR-326). */
export const SELECTION_ART = { url: packArt("map-ui/tile-selection.svg", "map-ui", 42, 42), width: 42, height: 42 } as const;

/** The station marks' own size in px (both 12x12). */
export const STATION_ART_PX = 12;
/** A depot's or port's state by shape as well as colour (FR-324): a filled disc when connected, a ring when not. */
export const STATION_ART = {
  connected: packArt("map-ui/station-connected.svg", "map-ui", STATION_ART_PX, STATION_ART_PX),
  disconnected: packArt("map-ui/station-disconnected.svg", "map-ui", STATION_ART_PX, STATION_ART_PX),
} as const;

/** The ground textures' own size in px (all 512x512): they repeat at this size from the map's origin (FR-321). */
export const GROUND_ART_PX = 512;
/** The ground's textures (FR-321): the grass under all land, the deep water, and the desert and tundra patches. */
export const GROUND_ART = {
  grass: packArt("terrain/grass-base.png", "terrain", GROUND_ART_PX, GROUND_ART_PX),
  water: packArt("terrain/open-water.png", "terrain", GROUND_ART_PX, GROUND_ART_PX),
  desert: packArt("terrain/desert-base.png", "terrain", GROUND_ART_PX, GROUND_ART_PX),
  tundra: packArt("terrain/tundra-base.png", "terrain", GROUND_ART_PX, GROUND_ART_PX),
} as const;

/**
 * The pictures the map's cursors are drawn from (FR-330), by the cursor's name in `hooks/useTileVisuals.ts`; a develop
 * action's cursor is the developing civilian's figure, `civilianArt(action.workerType)`.
 */
export const CURSOR_ART = {
  prospect: CIVILIAN_ART.prospector,
  constructFort: FORT_ART[0],
  constructRail: RAIL_ART.url,
  constructModal: CIVILIAN_ART.engineer,
} as const;

/** Every pack file the table names, once each, with its family, size and anchor (FR-318, FR-319). */
export const INK_ART_FILES: readonly InkArtFile[] = [...listed.values()];

/** The manifest's other files, each with why the game does not use it (FR-318). */
export const INK_ART_UNUSED: readonly { readonly file: string; readonly reason: string }[] = [
  ...["trader", "indiaman", "clipper", "paddlewheeler", "freighter", "frigate", "raider", "armoured-cruiser", "battlecruiser", "ship-of-the-line", "ironclad", "advanced-ironclad", "dreadnought"].map(
    (ship) => ({ file: `navy/${ship}.png`, reason: "a ship: the game has no navy yet" })
  ),
  ...["rifle-infantry", "modern-infantry", "sharpshooters", "rangers", "guards", "machine-gunners", "scouts", "armour", "carbine-cavalry", "mechanised-cavalry", "field-artillery", "mobile-artillery", "siege-artillery", "railroad-gun", "demolitionists", "fort-guns"].map(
    (unit) => ({ file: `army/${unit}.png`, reason: "an era-2 or era-3 unit: the game has era-1 regiments only" })
  ),
  // The one place under src/app that may name it (FR-343): the text scans prove no code uses the file
  { file: "city/city-ground.png", reason: "an earlier background study with baked scenery, not a capital ground (FR-272)" },
  { file: "improvements/horse-ranch-1.png", reason: "a fenced variant of the horse ranch, not a level: horses have no tiers" },
  { file: "infrastructure/rail-curve.svg", reason: "a two-link curve sample; each link is one straight piece (FR-328)" },
  { file: "infrastructure/rail-bridge.svg", reason: "a bridge: the game has no river or bridge data" },
  { file: "map-ui/army-movement-preview.svg", reason: "the curved movement arrow: a march stays a straight line (FR-273, Q69)" },
  { file: "map-ui/army-movement-arrowhead.svg", reason: "the movement arrow's head: a march draws its own head (FR-273)" },
  { file: "map-ui/army-transport.svg", reason: "the curved transport arrow: a march stays a straight line (FR-273, Q69)" },
  { file: "map-ui/army-movement-committed.svg", reason: "its colours only, copied into the army-move tokens (FR-273)" },
  { file: "map-ui/territory-line.svg", reason: "its halo colour only, the map-halo token: one fixed brown cannot show the owner (FR-327)" },
  { file: "map-ui/nation-flag.svg", reason: "its pole and cloth paths only, drawn by NationFlag in each nation's colour and pattern (FR-564)" },
];

/** The manifest file a table URL names ("/assets/ink-and-wash/goods/steel.png" -> "goods/steel.png"), for `data-art`. */
export const artFileOf = (url: string): string => (url.startsWith(INK_ART_BASE) ? url.slice(INK_ART_BASE.length) : url);

/** The INK_ART_FILES entry of a table URL (its family, size and anchor); undefined for any other URL. */
export const artInfoOf = (url: string): InkArtFile | undefined => (url.startsWith(INK_ART_BASE) ? listed.get(artFileOf(url)) : undefined);
