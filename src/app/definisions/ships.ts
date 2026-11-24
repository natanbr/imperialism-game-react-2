import type { Nation } from "@/types/Nation";
import { ShipType, type Fleet, type Ship } from "@/types/Navy";

/** Military rules §6. Armaments are both the construction cost and the landing allowance. */
export const WARSHIPS = {
  frigate: { type: ShipType.Frigate, name: "Frigate", plural: "Frigates", armaments: 2, lumber: 5, fabric: 2,
    firepower: 3, range: 5, armour: 10, hull: 35, battleMove: 4, speed: 3 },
  shipOfTheLine: { type: ShipType.ShipOfTheLine, name: "Ship-of-the-Line", plural: "Ships-of-the-Line",
    armaments: 5, lumber: 8, fabric: 3, firepower: 6, range: 6, armour: 20, hull: 65, battleMove: 3, speed: 2 },
} as const;
export type WarshipType = keyof typeof WARSHIPS;
export const WARSHIP_TYPES = Object.keys(WARSHIPS) as WarshipType[];
export const isWarship = (key: string): key is WarshipType => Object.hasOwn(WARSHIPS, key);
export type WarshipCounts = Partial<Record<WarshipType, number>>;

/** New commissioned ships form a home squadron with the identity of its first hull. */
export function newHomeSquadron(nation: Pick<Nation, "id" | "name">, ships: Ship[]): Fleet {
  return { id: "fleet-" + ships[0].id, ownerNationId: nation.id, name: nation.name + " squadron",
    location: "berth", aggression: "normal", ships };
}

export const SHIPS = {
  trader: { name: "Trader", plural: "Traders", lumber: 4, fabric: 2, holds: 2, requiredTechnology: null },
  indiaman: { name: "Indiaman", plural: "Indiamen", lumber: 7, fabric: 3, holds: 4, requiredTechnology: null },
  clipper: { name: "Clipper", plural: "Clippers", lumber: 6, fabric: 2, holds: 4, requiredTechnology: "streamlinedHulls" },
} as const;

export type MerchantShipType = keyof typeof SHIPS;
export type ShipCounts = Partial<Record<MerchantShipType, number>>;
export const SHIP_TYPES = Object.keys(SHIPS) as MerchantShipType[];

/** Pre-Shipyard v1 saves record only the four holds per starting Indiaman. */
export const shipsOf = (marine: Nation["merchantMarine"]): ShipCounts =>
  marine.ships ?? { indiaman: marine.holds / SHIPS.indiaman.holds };

export const fleetHolds = (ships: ShipCounts): number =>
  SHIP_TYPES.reduce((sum, type) => sum + (ships[type] ?? 0) * SHIPS[type].holds, 0);

export const cargoHolds = (marine: Nation["merchantMarine"] | undefined): number =>
  Math.max(0, Math.floor(marine?.ships ? fleetHolds(marine.ships) : marine?.holds ?? 0));
