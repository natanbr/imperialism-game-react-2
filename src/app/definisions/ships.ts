import type { Nation } from "@/types/Nation";

export const SHIPS = {
  trader: { name: "Trader", plural: "Traders", lumber: 4, fabric: 2, holds: 2 },
  indiaman: { name: "Indiaman", plural: "Indiamen", lumber: 7, fabric: 3, holds: 4 },
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
