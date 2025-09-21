import { Tile, TerrainType } from "@/types/Tile";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { WorkerType } from "@/types/Workers";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}   

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const startProspecting = useGameStore((s) => s.startProspecting);

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  const terrainAllowsProspecting = [
    TerrainType.BarrenHills,
    TerrainType.Mountains,
    TerrainType.Swamp,
    TerrainType.Desert,
    TerrainType.Tundra,
  ].includes(selectedTile.terrain);

  const prospectorOnTile = selectedTile.workers.find(w => w.id === selectedWorkerId && w.type === WorkerType.Prospector);
  const canProspect = !!prospectorOnTile && terrainAllowsProspecting && !selectedTile.prospecting;

  return (
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "200px" }}>
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {selectedTile.resource ? `${selectedTile.resource.type} (L${selectedTile.resource.level})` : "None"}</p>
      <p><strong>Owner:</strong> {selectedTile.ownerNationId || "Unclaimed"}</p>
      <p><strong>Workers:</strong> {selectedTile.workers.length > 0 ? selectedTile.workers.map(w => w.type).join(", ") : "None"}</p>

      {/* Prospector action */}
      {selectedTile.prospecting && (
        <div style={{ marginTop: 8, color: "#ffd54f" }}>Prospecting in progress… result next turn</div>
      )}
      {canProspect && (
        <button
          onClick={() => startProspecting(selectedTile.id, selectedWorkerId!)}
          style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, border: "1px solid #666", background: "#333", color: "#fff", cursor: "pointer" }}
        >
          Prospect ⛏️
        </button>
      )}
    </div>
  );
};