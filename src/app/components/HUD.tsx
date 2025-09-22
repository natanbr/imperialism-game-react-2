import React from "react";
import { TileInfoPanel } from "./TileInfoPanel";
import { useGameStore } from '../store/rootStore';

export const HUD: React.FC = () => {
    const selectedTileId = useGameStore((s) => s.selectedTileId);
    const map = useGameStore((s) => s.map);
    const turn = useGameStore((s) => s.turn);
    const year = useGameStore((s) => s.year);
    const advanceTurn = useGameStore((s) => s.advanceTurn);
    const openWarehouse = useGameStore((s) => s.openWarehouse);

    const selectedTile = map.tiles.flat().find(tile => tile.id === selectedTileId);

    return (
        <div
        style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "250px",
            height: "100%",
            backgroundColor: "#222",
            color: "#eee",
            padding: "12px",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            zIndex: 10,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
        }}
        >
        <div>
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>HUD</h2>
          <div style={{ marginBottom: 8 }}>
            <div><strong>Turn:</strong> {turn}</div>
            <div><strong>Year:</strong> {year}</div>
          </div>
          <TileInfoPanel selectedTile={selectedTile} />
        </div>

        {/* Bottom controls */}
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <button
            onClick={openWarehouse}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Open Warehouse 📦
          </button>
          <button
            onClick={advanceTurn}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#4caf50",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Advance Turn ▶
          </button>
        </div>
        </div>
    );
};