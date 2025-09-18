import React from "react";
import { GameMap } from "@/types/Map";
import { TileComponent } from "./Tile";

interface MapViewProps {
  map: GameMap;
}

export const MapView: React.FC<MapViewProps> = ({ map }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${map.config.width}, auto)` }}>
      {map.tiles.flat().map((tile) => (
        <TileComponent key={tile.id} tile={tile} />
      ))}
    </div>
  );
};