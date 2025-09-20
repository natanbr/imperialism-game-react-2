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
  const { terrain, hasRiver, resource, workers, ownerNationId } = tile;

  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const selectTile = useGameStore((s) => s.selectTile);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const moveSelectedWorkerToTile = useGameStore((s) => s.moveSelectedWorkerToTile);
  const nations = useGameStore((s) => s.nations);

  const isSelected = selectedTileId === tile.id;

  // Only show one Prospector for now (step 2.1)
  const prospector = workers.find(w => w.type === WorkerType.Prospector);
  const hasProspector = !!prospector;
  const isProspectorSelected = prospector && selectedWorkerId === prospector.id;

  // Get the nation color for border
  const ownerNation = ownerNationId ? nations.find(n => n.id === ownerNationId) : null;
  const borderColor = isSelected 
    ? "red" 
    : ownerNation 
    ? ownerNation.color 
    : "#555";
  const borderWidth = ownerNation ? "3px" : "1px";

  const handleTileClick = () => {
    if (selectedWorkerId) {
      moveSelectedWorkerToTile(tile.id);
      selectTile(tile.id);
      return;
    }
    selectTile(tile.id);
  };

  return (
    <div
      onClick={handleTileClick}
      style={{
        border: `${borderWidth} solid ${borderColor}`,
        backgroundColor: terrainColors[terrain] || "#ccc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        width: "100px",
        height: "100px",
        position: "relative",
        userSelect: "none",
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
        <button
          onClick={(e) => { e.stopPropagation(); selectWorker(prospector!.id); }}
          title="Prospector"
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            fontSize: "22px",
            lineHeight: 1,
            border: isProspectorSelected ? "2px solid yellow" : "none",
            borderRadius: 4,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            filter: "drop-shadow(0 0 2px #fff)",
          }}
        >
          👁️
        </button>
      )}
    </div>
  );
};