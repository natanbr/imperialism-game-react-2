// The UI's icons (FR-084): Game Icons by game-icons.net contributors, CC BY 3.0 (credited in the
// HUD's About panel, FR-089), through react-icons/gi. Icons are named by their Game Icons export
// name, so the name survives minification and the DOM can carry it (`data-icon`).
import type { IconType } from "react-icons";
import {
  GiAnchor,
  GiAnticlockwiseRotation,
  GiBigWave,
  GiCampingTent,
  GiCannedFish,
  GiCapitol,
  GiCheckeredFlag,
  GiCoalPile,
  GiCottonFlower,
  GiCow,
  GiCowboyBoot,
  GiCrossedSabres,
  GiCrossedSwords,
  GiCrosshair,
  GiCutDiamond,
  GiDesert,
  GiDoubleFish,
  GiFarmer,
  GiField,
  GiGearHammer,
  GiGoldNuggets,
  GiHammerNails,
  GiHills,
  GiHorseHead,
  GiHourglass,
  GiHouse,
  GiInfo,
  GiJerrycan,
  GiMagnifyingGlass,
  GiMeepleGroup,
  GiMetalBar,
  GiMiner,
  GiMountains,
  GiMusket,
  GiOak,
  GiOilDrum,
  GiOilPump,
  GiOpenBook,
  GiOre,
  GiPaper,
  GiPineTree,
  GiPitchfork,
  GiPlayButton,
  GiRailRoad,
  GiRiver,
  GiRolledCloth,
  GiScales,
  GiScrollUnfurled,
  GiSheep,
  GiShinyApple,
  GiShirt,
  GiSnowflake1,
  GiSpyglass,
  GiSteamLocomotive,
  GiSwamp,
  GiSwordClash,
  GiToolbox,
  GiTrowel,
  GiWaves,
  GiWheat,
  GiWoodAxe,
  GiWoodenChair,
  GiWoodenCrate,
  GiWoodPile,
} from "react-icons/gi";
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { TerrainType, type Tile } from "@/types/Tile";
import { WorkerType } from "@/types/Workers";

/** Every Game Icon the UI uses, by its export name. */
export const GI = {
  GiAnchor,
  GiAnticlockwiseRotation,
  GiBigWave,
  GiCampingTent,
  GiCannedFish,
  GiCapitol,
  GiCheckeredFlag,
  GiCoalPile,
  GiCottonFlower,
  GiCow,
  GiCowboyBoot,
  GiCrossedSabres,
  GiCrossedSwords,
  GiCrosshair,
  GiCutDiamond,
  GiDesert,
  GiDoubleFish,
  GiFarmer,
  GiField,
  GiGearHammer,
  GiGoldNuggets,
  GiHammerNails,
  GiHills,
  GiHorseHead,
  GiHourglass,
  GiHouse,
  GiInfo,
  GiJerrycan,
  GiMagnifyingGlass,
  GiMeepleGroup,
  GiMetalBar,
  GiMiner,
  GiMountains,
  GiMusket,
  GiOak,
  GiOilDrum,
  GiOilPump,
  GiOpenBook,
  GiOre,
  GiPaper,
  GiPineTree,
  GiPitchfork,
  GiPlayButton,
  GiRailRoad,
  GiRiver,
  GiRolledCloth,
  GiScales,
  GiScrollUnfurled,
  GiSheep,
  GiShinyApple,
  GiShirt,
  GiSnowflake1,
  GiSpyglass,
  GiSteamLocomotive,
  GiSwamp,
  GiSwordClash,
  GiToolbox,
  GiTrowel,
  GiWaves,
  GiWheat,
  GiWoodAxe,
  GiWoodenChair,
  GiWoodenCrate,
  GiWoodPile,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof GI;

export const TERRAIN_ICONS: Record<TerrainType, IconName> = {
  [TerrainType.DryPlains]: "GiField",
  [TerrainType.OpenRange]: "GiCow",
  [TerrainType.HorseRanch]: "GiHorseHead",
  [TerrainType.Plantation]: "GiCottonFlower",
  [TerrainType.Farm]: "GiWheat",
  [TerrainType.Orchard]: "GiShinyApple",
  [TerrainType.FertileHills]: "GiSheep",
  [TerrainType.BarrenHills]: "GiHills",
  [TerrainType.Mountains]: "GiMountains",
  [TerrainType.HardwoodForest]: "GiOak",
  [TerrainType.ScrubForest]: "GiPineTree",
  [TerrainType.Swamp]: "GiSwamp",
  [TerrainType.Desert]: "GiDesert",
  [TerrainType.Tundra]: "GiSnowflake1",
  [TerrainType.Water]: "GiWaves",
  [TerrainType.River]: "GiRiver",
  [TerrainType.Town]: "GiHouse",
  [TerrainType.Capital]: "GiCapitol",
  [TerrainType.Coast]: "GiBigWave",
};

export const RESOURCE_ICONS: Record<ResourceType, IconName> = {
  [ResourceType.Grain]: "GiWheat",
  [ResourceType.Livestock]: "GiCow",
  [ResourceType.Fruit]: "GiShinyApple",
  [ResourceType.Fish]: "GiDoubleFish",
  [ResourceType.Cotton]: "GiCottonFlower",
  [ResourceType.Wool]: "GiSheep",
  [ResourceType.Horses]: "GiHorseHead",
  [ResourceType.Timber]: "GiOak",
  [ResourceType.Coal]: "GiCoalPile",
  [ResourceType.IronOre]: "GiOre",
  [ResourceType.Oil]: "GiOilDrum",
  [ResourceType.Gold]: "GiGoldNuggets",
  [ResourceType.Gems]: "GiCutDiamond",
};

/**
 * Every warehouse commodity (FR-121): the resources keep their map icons, each material and good has
 * its own, in the same line-art style. Shown before the name in the market and the capital dialog.
 */
export const COMMODITY_ICONS: Record<WarehouseCommodities, IconName> = {
  ...RESOURCE_ICONS,
  [MaterialType.Lumber]: "GiWoodPile",
  [MaterialType.Paper]: "GiPaper",
  [MaterialType.Steel]: "GiMetalBar",
  [MaterialType.Fuel]: "GiJerrycan",
  [MaterialType.Fabric]: "GiRolledCloth",
  [MaterialType.CannedFood]: "GiCannedFish",
  [GoodsType.Clothing]: "GiShirt",
  [GoodsType.Furniture]: "GiWoodenChair",
  [GoodsType.Hardware]: "GiToolbox",
  [GoodsType.Armaments]: "GiMusket",
};

export const WORKER_ICONS: Record<WorkerType, IconName> = {
  [WorkerType.Prospector]: "GiSpyglass",
  [WorkerType.Engineer]: "GiGearHammer",
  [WorkerType.Miner]: "GiMiner",
  [WorkerType.Farmer]: "GiFarmer",
  [WorkerType.Rancher]: "GiCowboyBoot",
  [WorkerType.Forester]: "GiWoodAxe",
  [WorkerType.Driller]: "GiOilPump",
  [WorkerType.Developer]: "GiTrowel",
};

export const UI_ICONS = {
  capital: "GiCapitol",
  town: "GiHouse",
  depot: "GiSteamLocomotive",
  port: "GiAnchor",
  prospecting: "GiMagnifyingGlass",
  development: "GiHourglass",
  construction: "GiHammerNails",
  warehouse: "GiWoodenCrate",
  market: "GiScales",
  transport: "GiRailRoad",
  center: "GiCrosshair",
  advanceTurn: "GiPlayButton",
  finalScores: "GiCheckeredFlag",
  about: "GiInfo",
  newGame: "GiAnticlockwiseRotation",
  /** Several civilians on one tile: the stack button (FR-110) */
  civilians: "GiMeepleGroup",
  /** The Diplomacy screen (FR-177): the Imp1 overtures scroll */
  diplomacy: "GiScrollUnfurled",
  /** The Deal Book (FR-195): the Imp1 ledger is an open book */
  dealBook: "GiOpenBook",
  /** An army on the map and the Army screen (FR-210, FR-211): the Imp1 encampment tents */
  army: "GiCampingTent",
  /** Militia in an army marker (FR-210): the Minutemen's local levy */
  militia: "GiPitchfork",
  /** The Armoury (FR-212) */
  armoury: "GiCrossedSabres",
  /** The Attack screen (FR-230): the Imp1 crossed swords over an enemy province */
  attack: "GiCrossedSwords",
  /** The Battle screen (FR-231) */
  battle: "GiSwordClash",
} as const satisfies Record<string, IconName>;

/**
 * The icon for what a tile holds (FR-085): the capital's or town's own icon; else its resource's
 * when the resource is known (`discovered` is only `false` for a hidden mineral or oil); else its
 * terrain's. Open sea shows nothing.
 */
export function tileIconOf(tile: Pick<Tile, "terrain" | "resource">): IconName | null {
  if (tile.terrain === TerrainType.Water) return null;
  if (tile.terrain === TerrainType.Capital) return UI_ICONS.capital;
  if (tile.terrain === TerrainType.Town) return UI_ICONS.town;
  if (tile.resource && tile.resource.discovered !== false) return RESOURCE_ICONS[tile.resource.type];
  return TERRAIN_ICONS[tile.terrain];
}
