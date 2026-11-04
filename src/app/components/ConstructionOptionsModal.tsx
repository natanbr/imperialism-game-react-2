"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { isPortSite } from "@/engine/orders/queries";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";

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
        background: "var(--color-bg-backdrop)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          borderRadius: 8,
          padding: 20,
          boxShadow: "var(--shadow-dialog)",
          width: 300,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center", fontSize: 18, fontWeight: 700 }}>
          <GameIcon name={UI_ICONS.construction} /> Construction Options
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => handleConstruct('depot')}>
            Build Depot
          </button>
          {canBuildPort && (
            <button className="btn btn-primary" onClick={() => handleConstruct('port')}>
              Build Port
            </button>
          )}
        </div>
        <button onClick={close} className="btn btn-plain" style={{ marginTop: 20, textAlign: "center" }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConstructionOptionsModal;