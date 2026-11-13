// Countries (FR-146): a country is a Great Power (`state.nations`) or a minor nation
// (`state.minorNations`). Pure reads for systems and views that must answer for both.
import type { CountryId, MinorNationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { MinorNation } from "@/types/MinorNation";
import type { Tile } from "@/types/Tile";
import { provinceById } from "./provinces";

export const minorNationById = (state: GameState, id: MinorNationId): MinorNation | undefined =>
  state.minorNations.find((m) => m.id === id);

export const isGreatPower = (state: GameState, id: CountryId): boolean => state.nations.some((n) => n.id === id);

export const isMinorNation = (state: GameState, id: CountryId): boolean => state.minorNations.some((m) => m.id === id);

/** The name of a Great Power or a minor nation; undefined for an unknown id. */
export const countryName = (state: GameState, id: CountryId): string | undefined =>
  state.nations.find((n) => n.id === id)?.name ?? minorNationById(state, id)?.name;

/**
 * The country a tile belongs to: the owner of its province on a world with provinces, else its Great
 * Power owner (`ownerNationId`); undefined for the sea and for land of nobody.
 */
export function countryOfTile(state: GameState, tile: Pick<Tile, "ownerNationId" | "provinceId">): CountryId | undefined {
  const province = tile.provinceId ? provinceById(state, tile.provinceId) : undefined;
  return province?.ownerId ?? tile.ownerNationId;
}

/** The minor nation a tile belongs to, if any (a minor's tile has no `ownerNationId`, FR-149). */
export function minorNationAt(state: GameState, tile: Pick<Tile, "ownerNationId" | "provinceId">): MinorNation | undefined {
  const country = countryOfTile(state, tile);
  return country ? minorNationById(state, country) : undefined;
}
