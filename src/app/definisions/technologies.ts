/** Rules 09 section 2. Years use the start of the manual window and prerequisites use the manual column. */
export interface TechnologyDefinition {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly firstYear: number;
  readonly prerequisites: readonly string[];
  readonly effect: string;
}

function technology(id: string, name: string, cost: number, firstYear: number, prerequisites: string[], effect: string): TechnologyDefinition {
  return { id, name, cost, firstYear, prerequisites, effect };
}

export const TECHNOLOGIES: readonly TechnologyDefinition[] = [
  technology("highPressureSteamEngine", "High Pressure Steam Engine", 0, 1814, [], "Allows rail through farms, plains, deserts, forests and tundra."),
  technology("seedDrill", "Seed Drill", 0, 1814, [], "Farmers can raise grain farms and orchards to level 1."),
  technology("cottonGin", "Cotton Gin", 1000, 1816, [], "Farmers can raise cotton to level 1."),
  technology("streamlinedHulls", "Streamlined Hulls", 1500, 1821, [], "Unlocks the Clipper at the Shipyard."),
  technology("squareSetTimbering", "Square-Set Timbering", 1500, 1821, ["highPressureSteamEngine"], "Miners can raise coal, iron ore, gold and gems to level 2."),
  technology("ironRailroadBridge", "Iron Railroad Bridge", 1500, 1821, ["highPressureSteamEngine"], "Allows swamp rail, Forester training and timber level 1."),
  technology("feedGrasses", "Feed Grasses", 1500, 1821, [], "Unlocks Rancher training and level 1 wool and livestock."),
  technology("spinningJenny", "Spinning Jenny", 3000, 1826, ["feedGrasses", "cottonGin"], "Farmers can raise cotton and Ranchers can raise wool to level 2."),
  technology("paddlewheels", "Paddlewheels", 3000, 1826, [], "Historical unlocks: Raider and large merchant steamship (future ships)."),
  technology("steelAndIronPlows", "Steel and Iron Plows", 3000, 1831, ["seedDrill"], "Farmers can raise grain farms and orchards to level 2."),
  technology("bessemerConverter", "Bessemer Converter", 6000, 1836, [], "Historical unlocks: era-2 light regiments, combat engineers and level 2 forts (future)."),
  technology("compoundSteamEngine", "Compound Steam Engine", 7000, 1836, ["ironRailroadBridge"], "Allows hill rail and depots, and timber level 2."),
  technology("rifledArtillery", "Rifled Artillery", 10000, 1841, [], "Historical unlocks: Field Artillery and Siege Artillery (future regiments)."),
  technology("breechLoadingRifles", "Breech-Loading Rifles", 12000, 1841, ["bessemerConverter"], "Historical unlocks: Rifle Infantry, Guards and Carbine Cavalry (future regiments)."),
  technology("advancedIronWorking", "Advanced Iron Working", 12000, 1846, [], "Historical unlock: Ironclad (future warship)."),
  technology("powerLoom", "Power Loom", 12000, 1846, ["spinningJenny"], "Farmers can raise cotton and Ranchers can raise wool to level 3."),
  technology("mechanicalReaper", "Mechanical Reaper", 12000, 1851, ["steelAndIronPlows"], "Farmers can raise grain to level 3."),
  technology("commercialFertiliser", "Commercial Fertiliser", 12000, 1856, ["steelAndIronPlows"], "Farmers can raise orchards to level 3."),
  technology("oilDrilling", "Oil Drilling", 25000, 1856, [], "Unlocks Driller training and the Oil Refinery. Oil sites and the Power Plant are planned."),
  technology("barbedWire", "Barbed Wire", 20000, 1861, ["feedGrasses"], "Ranchers can raise livestock to level 2."),
  technology("steelArmourPlate", "Steel Armour Plate", 40000, 1866, ["advancedIronWorking"], "Historical unlock: Advanced Ironclad (future warship)."),
  technology("largeArtillery", "Large Artillery", 40000, 1871, ["rifledArtillery"], "Historical unlocks: Railroad Gun, Mobile Artillery and level 3 forts (future)."),
  technology("dynamite", "Dynamite", 40000, 1871, ["compoundSteamEngine", "squareSetTimbering"], "Allows mountain rail and level 3 timber and mines. Saboteurs are planned."),
  technology("marineEngineering", "Marine Engineering", 40000, 1871, ["steelArmourPlate"], "Historical unlocks: Armoured Cruiser and Freighter (future ships)."),
  technology("machineGuns", "Machine Guns", 100000, 1876, ["breechLoadingRifles"], "Historical unlocks: Modern Infantry, Machine-gunners and Rangers (future regiments)."),
  technology("chemistry", "Chemistry", 120000, 1876, ["oilDrilling", "barbedWire"], "Ranchers can raise livestock to level 3. Oil level 2 needs an oil site."),
  technology("improvedRangeFinding", "Improved Range-Finding", 150000, 1881, ["marineEngineering"], "Historical unlocks: Dreadnought and Battle Cruiser (future warships)."),
  technology("internalCombustion", "Internal Combustion", 150000, 1881, ["chemistry"], "Historical unlocks: Armour, Mechanised regiments and oil level 3 (future units and sites)."),
];

const byId = new Map(TECHNOLOGIES.map(t => [t.id, t]));
export const technologyById = (id: string): TechnologyDefinition | undefined => byId.get(id);

/** Q131 keeps the three NR-015 rail and timber gifts alongside the historical start pair. */
export const START_TECHNOLOGIES = ["highPressureSteamEngine", "seedDrill", "compoundSteamEngine", "ironRailroadBridge", "dynamite"] as const;
