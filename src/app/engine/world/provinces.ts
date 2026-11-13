// Provinces (FR-147, FR-148, decision 6): pure queries, and the one helper that moves land between
// countries. After newGame only transferProvince writes a tile's `ownerNationId`, so its read sites
// keep meaning "owned by this Great Power" (a minor's land has none).
import type { CountryId, ProvinceId, TileId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Province } from "@/types/Province";
import type { Tile } from "@/types/Tile";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { getNeighborCoords } from "../map/mapHelpers";

export const provinceById = (state: GameState, provinceId: ProvinceId): Province | undefined =>
  state.provinces.find((p) => p.id === provinceId);

/** The province of the tile; undefined for a sea tile, an unknown id or a world without provinces. */
export function provinceOf(state: GameState, tileId: TileId): Province | undefined {
  const [x, y] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[y]?.[x];
  return tile?.id === tileId && tile.provinceId ? provinceById(state, tile.provinceId) : undefined;
}

/** The provinces a Great Power or a minor nation holds, in state order. */
export const provincesOf = (state: GameState, countryId: CountryId): Province[] =>
  state.provinces.filter((p) => p.ownerId === countryId);

/** The provinces with a tile that is a hex neighbour of a tile of this one, in state order (FR-147). */
export function adjacentProvinces(state: GameState, provinceId: ProvinceId): Province[] {
  const province = provinceById(state, provinceId);
  if (!province) return [];
  const around = new Set<ProvinceId>();
  for (const tileId of province.tileIds) {
    const [x, y] = parseTileIdToArray(tileId);
    for (const [nx, ny] of getNeighborCoords(state.map, x, y)) {
      const other = state.map.tiles[ny][nx].provinceId;
      if (other && other !== provinceId) around.add(other);
    }
  }
  return state.provinces.filter((p) => around.has(p.id));
}

/** The tile owned by `nationId`, or by no Great Power when it is undefined. */
function withOwner(tile: Tile, nationId: string | undefined): Tile {
  if (nationId) return { ...tile, ownerNationId: nationId };
  const copy = { ...tile };
  delete copy.ownerNationId;
  return copy;
}

/**
 * Gives a province to another country (FR-148): its `ownerId` and the `ownerNationId` of each of its
 * tiles (the new owner's id when it is a Great Power, none when it is a minor). Returns a new state;
 * the input is unchanged. An unknown province or country throws. What else moves with the land (its
 * rail, civilians and jobs) is M9's.
 */
export function transferProvince(state: GameState, provinceId: ProvinceId, newOwnerId: CountryId): GameState {
  const province = provinceById(state, provinceId);
  if (!province) throw new Error(`Unknown province "${provinceId}"`);
  const greatPower = state.nations.some((n) => n.id === newOwnerId);
  if (!greatPower && !state.minorNations.some((m) => m.id === newOwnerId)) throw new Error(`Unknown country "${newOwnerId}"`);

  const moving = new Set(province.tileIds);
  const tiles = state.map.tiles.map((row) =>
    row.some((t) => moving.has(t.id)) ? row.map((t) => (moving.has(t.id) ? withOwner(t, greatPower ? newOwnerId : undefined) : t)) : row
  );
  return {
    ...state,
    provinces: state.provinces.map((p) => (p.id === provinceId ? { ...p, ownerId: newOwnerId } : p)),
    map: { ...state.map, tiles },
  };
}
