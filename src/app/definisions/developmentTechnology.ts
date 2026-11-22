import { ResourceType } from "@/types/Resource";

// Rules 09 §3. Each entry is the technology for reaching levels 1, 2 and 3.
type Levels = readonly [string | null, string, string];
const mine: Levels = [null, "squareSetTimbering", "dynamite"];
const developmentLevels: Partial<Record<ResourceType, Levels>> = {
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

export function developmentTechnology(resource: ResourceType, targetLevel: number): string | null {
  return developmentLevels[resource]?.[targetLevel - 1] ?? null;
}
