import { CommandCursor } from "@/types/Cursor";

export interface UiSlice {
  cursor: CommandCursor;
  selectedTileId?: string;
  selectedCityId?: string;
  selectedArmyId?: string;
  selectedFleetId?: string;
  // actions: setCursor, selectTile, openCityView, closeView...
}
