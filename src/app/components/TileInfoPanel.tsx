import { Tile } from "@/types/Tile";
import React from "react";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}   

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {

  if (!selectedTile) {
    return <div style={{ padding: "10px" }}>No tile selected</div>;
  }

  // For now, lookup from mockMap

  if (!selectedTile) return <div style={{ padding: "10px" }}>Tile not found</div>;

  return (
    <div style={{ padding: "10px", borderLeft: "2px solid #333", minWidth: "200px" }}>
      <h3>Tile Info</h3>
      <p><strong>Terrain:</strong> {selectedTile.terrain}</p>
      <p><strong>River:</strong> {selectedTile.hasRiver ? "Yes" : "No"}</p>
      <p><strong>Resource:</strong> {selectedTile.resource ? `${selectedTile.resource.type} (L${selectedTile.resource.level})` : "None"}</p>
      <p><strong>Owner:</strong> {selectedTile.ownerNationId || "Unclaimed"}</p>
      <p><strong>Workers:</strong> {selectedTile.workers.length > 0 ? selectedTile.workers.map(w => w.type).join(", ") : "None"}</p>
    </div>
  );
};