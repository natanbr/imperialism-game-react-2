"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { isAdjacentToOcean } from "../store/helpers/mapHelpers";

export const ConstructionOptionsModal: React.FC = () => {
  const { isOpen, tileId, workerId, close, map } = useGameStore((s) => ({
    isOpen: s.isConstructionModalOpen,
    tileId: s.constructionModalTileId,
    workerId: s.constructionModalWorkerId,
    close: s.closeConstructionModal,
    map: s.map,
  }));

  const tile = useMemo(() => {
    if (!tileId) return null;
    const [x, y] = tileId.split("-").map(Number);
    return map.tiles[y]?.[x] || null;
  }, [tileId, map.tiles]);

  const canBuildPort = useMemo(() => {
    if (!tile) return false;
    return tile.hasRiver || isAdjacentToOcean(map, tile.x, tile.y);
  }, [tile, map]);

  const handleConstruct = (kind: 'depot' | 'port') => {
    if (tileId && workerId) {
      useGameStore.getState().moveAndStartConstruction(tileId, workerId, kind);
    }
    close();
  };

  if (!isOpen || !tile) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          color: "#eee",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
          width: 300,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center" }}>Construction Options</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => handleConstruct('depot')}>Build Depot</button>
          {canBuildPort && <button onClick={() => handleConstruct('port')}>Build Port</button>}
        </div>
        <button
          onClick={close}
          style={{
            marginTop: 20,
            width: "100%",
            background: "#444",
            color: "#fff",
            border: "none",
            padding: "10px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConstructionOptionsModal;