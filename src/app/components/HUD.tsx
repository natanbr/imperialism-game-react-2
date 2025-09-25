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
    const openCapital = useGameStore((s) => s.openCapital);
    const openTransportAllocation = useGameStore((s) => s.openTransportAllocation);
    const setCamera = useGameStore((s) => s.setCamera);
    const activeNationId = useGameStore((s) => s.activeNationId);
    const nations = useGameStore((s) => s.nations);
    const activeNation = nations.find((n) => n.id === activeNationId);

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
            <div><strong>Cash:</strong> {activeNation?.treasury ?? 0}</div>
          </div>

          {/* Debug section */}
          {selectedTile && (
            <div style={{ marginBottom: 8, padding: 8, border: '1px dashed #555', borderRadius: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Debug</div>
              <div><strong>Tile:</strong> {selectedTile.x},{selectedTile.y} (id {selectedTile.id})</div>
              {/* <div><strong>Owner:</strong> {selectedTile.ownerNationId || 'Unclaimed'}</div>
              <div><strong>Terrain:</strong> {selectedTile.terrain}</div>
              <div><strong>Connected (rail):</strong> {selectedTile.connected ? 'Yes' : 'No'}</div>
              <div><strong>Depot:</strong> {selectedTile.depot ? 'Yes' : 'No'} {selectedTile.activeDepot ? '(active)' : ''}</div>
              <div><strong>Port:</strong> {selectedTile.port ? 'Yes' : 'No'} {selectedTile.activePort ? '(active)' : ''}</div>
              <div><strong>Has River:</strong> {selectedTile.hasRiver ? 'Yes' : 'No'}</div> */}
            </div>
          )}

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
            onClick={openCapital}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#8e44ad",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Open Capital 🏛️
          </button>
          <button
            onClick={openTransportAllocation}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Transportation of Commodities 🚛
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const cx = Math.floor((map.config.cols * 100 + 50) / 2);
                const cy = Math.floor((map.config.rows * 100) / 2);
                setCamera(cx, cy);
              }}
              title="Center Camera"
              style={{
                flex: 1,
                padding: "6px 8px",
                background: "#333",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ⌖ Center
            </button>
            <button
              onClick={advanceTurn}
              style={{
                flex: 2,
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
        </div>
    );
};