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

  // Allow selecting any worker on the tile
  const isWorkerSelected = (wId: string) => selectedWorkerId === wId;

  // Job completion visual pulse (if any)
  const jobCompleted = tile.developmentJob?.completed || tile.constructionJob?.completed;

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
      moveSelectedWorkerToTile(tile.id, selectedWorkerId);
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
        boxShadow: jobCompleted ? "0 0 12px 4px #ffd54f" : undefined,
        transition: "box-shadow 200ms ease",
      }}
    >
      <div>{terrain}</div>
      {hasRiver && <div style={{ fontSize: "12px" }}>🌊</div>}
      {resource && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>{resource.discovered ? resourceIcons[resource.type] : ""}</span>
          <span aria-label={`Development level ${resource.level}`} style={{ fontSize: 12 }}>
            {"🏗️".repeat(resource.level)}
          </span>
          <span>(L{resource.level})</span>
        </div>
      )}

      {/* Built infrastructure icons with active flags */}
      {tile.depot && (
        <div title="Depot" style={{ position: "absolute", top: 4, left: 4, fontSize: 16, display: "flex", alignItems: "center", gap: 2 }}>
          <span>🏬</span>
          <span style={{ fontSize: 12 }}>{tile.activeDepot ? "🟢" : "🔴"}</span>
        </div>
      )}
      {tile.port && (
        <div title="Port" style={{ position: "absolute", top: 4, left: 28, fontSize: 16, display: "flex", alignItems: "center", gap: 2 }}>
          <span>⚓</span>
          <span style={{ fontSize: 12 }}>{tile.activePort ? "🟢" : "🔴"}</span>
        </div>
      )}

      {/* Worker selection buttons (all workers present on tile) */}
      {workers.length > 0 && (
        <div style={{ position: "absolute", bottom: 2, right: 2, display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "96px", justifyContent: "flex-end" }}>
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={(e) => { e.stopPropagation(); selectWorker(w.id); }}
              title={w.type}
              style={{
                fontSize: "16px",
                lineHeight: 1,
                border: isWorkerSelected(w.id) ? "2px solid yellow" : "1px solid transparent",
                borderRadius: 4,
                background: "rgba(255,255,255,0.2)",
                padding: "0 2px",
                cursor: "pointer",
                filter: "drop-shadow(0 0 2px #fff)",
              }}
            >
              {w.type === WorkerType.Prospector && "👁️"}
              {w.type === WorkerType.Farmer && "🚜"}
              {w.type === WorkerType.Rancher && "🐄"}
              {w.type === WorkerType.Forester && "🌲"}
              {w.type === WorkerType.Miner && "⛏️"}
              {w.type === WorkerType.Driller && "🛢️"}
              {w.type === WorkerType.Engineer && "🛠️"}
            </button>
          ))}
        </div>
      )}

      {/* Simple icons indicating a job is in progress on this tile */}
      {tile.prospecting && (
        <div title="Prospecting in progress" style={{ position: "absolute", top: 4, right: 4, fontSize: 14 }}>⏳</div>
      )}
      {tile.developmentJob && !tile.developmentJob.completed && (
        <div title="Development in progress" style={{ position: "absolute", bottom: 4, right: 4, fontSize: 14 }}>⏳</div>
      )}
      {tile.constructionJob && !tile.constructionJob.completed && (
        <div title="Construction in progress" style={{ position: "absolute", bottom: 4, left: 4, fontSize: 14 }}>🛠️</div>
      )}
    </div>
  );
};