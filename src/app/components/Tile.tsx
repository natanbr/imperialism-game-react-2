import React from "react";
import { Tile, TerrainType } from "../types/Tile";
import { ResourceType } from "../types/Resource";
import { useGameStore } from '../store/rootStore';
<<<<<<< HEAD
import { nationColors } from '../definisions/nationColors';
=======
<<<<<<< HEAD
import { nationColors } from '../definisions/nationColors';
=======
<<<<<<< HEAD
import { nationColors } from '../definisions/nationColors';
=======
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  const selectTile = useGameStore((s) => s.selectTile);
  const isSelected = selectedTileId === tile.id;

  // Only show one Prospector for now (step 2.1)
  const hasProspector = workers.some(w => w.type === WorkerType.Prospector);

  const getBorderStyle = () => {
    if (isSelected) {
      return "2px solid red";
    }
    if (ownerNationId) {
      const color = nationColors[ownerNationId];
      if (color) {
        return `2px solid ${color}`;
      }
    }
    return "1px solid #555";
<<<<<<< HEAD
=======
=======
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
  const selectTile = useGameStore((s) => s.selectTile);
  const isSelected = selectedTileId === tile.id;

  // Only show one Prospector for now (step 2.1)
  const hasProspector = workers.some(w => w.type === WorkerType.Prospector);

  const getBorderStyle = () => {
    if (isSelected) {
      return "2px solid red";
    }
<<<<<<< HEAD
    if (ownerNationId) {
      const color = nationColors[ownerNationId];
      if (color) {
        return `2px solid ${color}`;
      }
    }
    return "1px solid #555";
=======
    selectTile(tile.id);
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  };

  return (
    <div
<<<<<<< HEAD
      onClick={() => selectTile(tile.id)}
      style={{
        border: getBorderStyle(),
=======
<<<<<<< HEAD
      onClick={() => selectTile(tile.id)}
      style={{
        border: getBorderStyle(),
=======
<<<<<<< HEAD
      onClick={() => selectTile(tile.id)}
      style={{
        border: getBorderStyle(),
=======
      onClick={handleTileClick}
      style={{
        border: `${borderWidth} solid ${borderColor}`,
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
        backgroundColor: terrainColors[terrain] || "#ccc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        width: "100px",
        height: "100px",
        position: "relative",
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
        userSelect: "none",
        boxShadow: jobCompleted ? "0 0 12px 4px #ffd54f" : undefined,
        transition: "box-shadow 200ms ease",
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
      }}
    >
      <div>{terrain}</div>
      {hasRiver && <div style={{ fontSize: "12px" }}>🌊</div>}
      {resource && (
<<<<<<< HEAD
        <div>
          {resourceIcons[resource.type] || "❓"} (L{resource.level})
=======
<<<<<<< HEAD
        <div>
          {resourceIcons[resource.type] || "❓"} (L{resource.level})
=======
<<<<<<< HEAD
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
=======
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>{resourceIcons[resource.type] || "❓"}</span>
          <span aria-label={`Development level ${resource.level}`} style={{ fontSize: 12 }}>
            {"🏗️".repeat(resource.level)}
          </span>
          <span>(L{resource.level})</span>
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======

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
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
    </div>
  );
};