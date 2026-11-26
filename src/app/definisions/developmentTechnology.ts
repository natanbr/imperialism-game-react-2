import { ResourceType } from "@/types/Resource";
import { TerrainType, type Tile } from "@/types/Tile";

// Rules 02 §3, in order of target level. FR-523 remains parked on the older development paths.
type Levels = readonly [string | null, string, string];
const mine: Levels = [null, "squareSetTimbering", "dynamite"];
const levelsByResource: Partial<Record<ResourceType, Levels>> = {
  [ResourceType.Grain]: ["seedDrill", "steelAndIronPlows", "mechanicalReaper"],
  [ResourceType.Fruit]: ["seedDrill", "steelAndIronPlows", "commercialFertiliser"],
  [ResourceType.Cotton]: ["cottonGin", "spinningJenny", "powerLoom"],
  [ResourceType.Livestock]: ["feedGrasses", "barbedWire", "chemistry"],
  [ResourceType.Wool]: ["feedGrasses", "spinningJenny", "powerLoom"],
  [ResourceType.Timber]: ["ironRailroadBridge", "compoundSteamEngine", "dynamite"],
  [ResourceType.Coal]: mine,
  [ResourceType.IronOre]: mine,
  [ResourceType.Gold]: mine,
  [ResourceType.Gems]: mine,
  [ResourceType.Oil]: ["oilDrilling", "chemistry", "internalCombustion"],
};

export function requiredDevelopmentTechnology(tile: Tile, targetLevel: number): string | null {
  const resource = tile.resource?.type;
  if (!resource) return null;
  if (tile.terrain !== TerrainType.Mountains && resource !== ResourceType.Wool && resource !== ResourceType.Oil)
    return null;
  return levelsByResource[resource]?.[targetLevel - 1] ?? null;
}
