import React from "react";
import { Tile, TerrainType } from "../types/Tile";
import { ResourceType } from "../types/Resource";
import { useGameStore } from '../store/rootStore';

interface TileProps {
  tile: Tile;
}

const terrainColors: Record<TerrainType, string> = {
  [TerrainType.DryPlains]: "#d2f5a3",
  [TerrainType.OpenRange]: "#e6e2b3",
  [TerrainType.HorseRanch]: "#b6cf96",
  [TerrainType.Plantation]: "#a3d977",
  [TerrainType.Farm]: "#f5e6a3",
  [TerrainType.Orchard]: "#b6e2a3",
  [TerrainType.FertileHills]: "#b7d7a8",
  [TerrainType.BarrenHills]: "#b6cf96",
  [TerrainType.Mountains]: "#b0a9a9",
  [TerrainType.HardwoodForest]: "#228b22",
  [TerrainType.ScrubForest]: "#459c45",
  [TerrainType.Swamp]: "#556b2f",
  [TerrainType.Desert]: "#f4e19c",
  [TerrainType.Tundra]: "#e0f7fa",
  [TerrainType.Water]: "#b3e0ff",
  [TerrainType.River]: "#1e90ff",
  [TerrainType.Town]: "#ffe4b5",
  [TerrainType.Capital]: "#ffb347",
  [TerrainType.Coast]: "#87ceeb",
};

const resourceIcons: Partial<Record<ResourceType, string>> = {
  [ResourceType.Grain]: "🌾",
  [ResourceType.Timber]: "🌲",
  [ResourceType.IronOre]: "⛏️",
  [ResourceType.Coal]: "⚫",
  [ResourceType.Oil]: "🛢️",
  [ResourceType.Gold]: "💰",
  [ResourceType.Gems]: "💎",
  [ResourceType.Fish]: "🐟",
};

import { WorkerType } from "../types/Workers";

export const TileComponent: React.FC<TileProps> = ({ tile }) => {
  const { terrain, hasRiver, resource, workers } = tile;

  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const isSelected = selectedTileId === tile.id;

  // Only show one Prospector for now (step 2.1)
  const hasProspector = workers.some(w => w.type === WorkerType.Prospector);

  return (
    <div
      onClick={() => selectTile(tile.id)}
      style={{
        border: isSelected ? "2px solid red" : "1px solid #555",
        backgroundColor: terrainColors[terrain] || "#ccc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        width: "100px",
        height: "100px",
        position: "relative",
      }}
    >
      <div>{terrain}</div>
      {hasRiver && <div style={{ fontSize: "12px" }}>🌊</div>}
      {resource && (
        <div>
          {resourceIcons[resource.type] || "❓"} (L{resource.level})
        </div>
      )}
      {hasProspector && (
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            fontSize: "22px",
            pointerEvents: "none",
            filter: "drop-shadow(0 0 2px #fff)"
          }}
          title="Prospector"
        >
          ⛏️
        </div>
      )}
    </div>
  );
};