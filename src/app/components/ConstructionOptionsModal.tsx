"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { isPortSite } from "@/engine/orders/queries";
import { parseTileIdToArray } from "@/utils/tileIdUtils";

export const ConstructionOptionsModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isConstructionModalOpen);
  const tileId = useGameStore((s) => s.constructionModalTileId);
  const workerId = useGameStore((s) => s.constructionModalWorkerId);
  const close = useGameStore((s) => s.closeConstructionModal);
  const game = useGameStore((s) => s.game);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const submitOrder = useGameStore((s) => s.submitOrder);

  const tile = useMemo(() => {
    if (!tileId) return null;
    const [x, y] = parseTileIdToArray(tileId);
    return game.map.tiles[y]?.[x] || null;
  }, [tileId, game.map.tiles]);

  const canBuildPort = useMemo(() => {
    if (!tile) return false;
    return isPortSite(game, tile);
  }, [tile, game]);

  const handleConstruct = (kind: 'depot' | 'port') => {
    if (tileId && workerId) {
      // The dialog opens for the engineer's own tile, so this is a plain start.
      submitOrder({ kind: "startConstruction", nationId: activeNationId, workerId, tileId, structure: kind });
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