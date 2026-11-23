import type { GameState } from "@/types/GameState";
import type { ProvinceId, NationId } from "@/types/Common";
import type { MoveArmyOrder, ValidationResult } from "../orders/Order";
import { TerrainType } from "@/types/Tile";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { getNeighborCoords, isOcean } from "../map/mapHelpers";
import { provinceById } from "../world/provinces";
import { nationById } from "../orders/queries";
import { bookedArms, regimentArms } from "./deployment";

export const FREIGHT_CARS_PER_REGIMENT_ARMS = 5;

export function railAllowance(state: GameState, nationId: NationId): number {
  return Math.floor((nationById(state, nationId)?.transportCapacity ?? 0) / FREIGHT_CARS_PER_REGIMENT_ARMS);
}

/** Rail deployment works across continuous land, including a neutral land bridge. Track and ownership along the route do not matter. */
export function sameLandmass(state: GameState, from: ProvinceId, to: ProvinceId): boolean {
  const origin = provinceById(state, from);
  const target = provinceById(state, to);
  if (!origin || !target) return false;
  const queue = [parseTileIdToArray(origin.seatTileId)];
  const seen = new Set([origin.seatTileId]);
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    const tile = state.map.tiles[y]?.[x];
    if (!tile || isOcean(tile) || tile.terrain === TerrainType.River) continue;
    if (tile.id === target.seatTileId) return true;
    for (const [nx, ny] of getNeighborCoords(state.map, x, y)) {
      const next = state.map.tiles[ny][nx];
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      queue.push([nx, ny]);
    }
  }
  return false;
}

/** Call after checking the selected regiments at their origin. Pending freight cars enter service after combat. */
export function validateRailDeployment(state: GameState, order: MoveArmyOrder): ValidationResult {
  const { fromProvinceId: from, toProvinceId: to, nationId, regimentIds } = order;
  if (from === to || provinceById(state, from)?.ownerId !== nationId || provinceById(state, to)?.ownerId !== nationId) {
    return { ok: false, reason: "invalid-target" };
  }
  if (!sameLandmass(state, from, to)) return { ok: false, reason: "no-land-route" };
  const reserved = bookedArms(state, nationId, "rail", regimentIds);
  return reserved + regimentArms(state, regimentIds) <= railAllowance(state, nationId)
    ? { ok: true }
    : { ok: false, reason: "limit-reached" };
}
