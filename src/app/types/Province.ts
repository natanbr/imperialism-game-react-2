// A province (FR-147): the unit in which land changes hands (FR-148, `transferProvince`).
import type { CountryId, ProvinceId, TileId } from "./Common";

export interface Province {
  id: ProvinceId;
  name: string;
  /** A Great Power id or a minor nation id. */
  ownerId: CountryId;
  /** FR-505: the owner at founding; older continent saves encode it in the province id. */
  startOwnerId?: CountryId;
  /** Where the map draws the province's markers. */
  seatTileId: TileId;
  /** Every tile of the province; each of them carries this province's id as `provinceId`. */
  tileIds: TileId[];
}
