// types/Map.ts
import { Tile } from "./Tile";

export enum MapStyle {
  SquareGrid = "square",
  HexGrid = "hex",
  Isometric = "isometric",
}

export interface MapConfig {
  cols: number;
  rows: number;
  style: MapStyle;
  seed?: string;
}

export interface GameMap {
  config: MapConfig;
  tiles: Tile[][];
}
