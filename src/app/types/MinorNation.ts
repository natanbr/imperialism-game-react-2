// A minor nation (FR-146): a country on the map that is not a Great Power. It has no treasury,
// warehouse, industry, civilians or controller and gives no orders; its land is one province
// (FR-147) whose tiles have no `ownerNationId`.
import type { MinorNationId, NationId, TileId } from "./Common";

export interface MinorNation {
  id: MinorNationId;
  name: string;
  capitalTileId: TileId;
  /** The Great Power whose colony it is; set by M9, absent while it is independent. */
  colonyOf?: NationId;
}
