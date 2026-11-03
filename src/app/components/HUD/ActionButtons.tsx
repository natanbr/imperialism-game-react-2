import React from "react";
import { useGameStore } from "@/store/rootStore";
import { cameraOnCapital } from "../camera";

export const ActionButtons: React.FC = () => {
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const openWarehouse = useGameStore((s) => s.openWarehouse);
  const openCapital = useGameStore((s) => s.openCapital);
  const openMarket = useGameStore((s) => s.openMarket);
  const openTransportAllocation = useGameStore((s) => s.openTransportAllocation);
  const showGameOver = useGameStore((s) => s.showGameOver);
  const isOver = useGameStore((s) => s.game.gameOver !== undefined);
  const setCamera = useGameStore((s) => s.setCamera);
  // The capital back in the middle of the map area (FR-083)
  const centreOnCapital = () => {
    const { game, activeNationId } = useGameStore.getState();
    const camera = cameraOnCapital(game, activeNationId);
    if (camera) setCamera(camera.x, camera.y);
  };

  return (
    <div className="action-buttons-container">
      {isOver && (
        <button onClick={showGameOver} className="btn btn-success">
          Final scores 🏁
        </button>
      )}
      <button onClick={openWarehouse} className="btn btn-primary">
        Open Warehouse 📦
      </button>
      <button onClick={openCapital} className="btn btn-secondary">
        Open Capital 🏛️
      </button>
      <button onClick={openMarket} className="btn btn-secondary">
        Open Market ⚖️
      </button>
      <button onClick={openTransportAllocation} className="btn btn-tertiary">
        Transportation of Commodities 🚛
      </button>
      <div className="btn-group">
        <button
          onClick={centreOnCapital}
          title="Center Camera"
          className="btn btn-dark btn-sm flex-1"
        >
          ⌖ Center
        </button>
        {/* The store ignores advanceTurn after the end too (FR-077); the button says so (FR-076). */}
        <button
          onClick={advanceTurn}
          className="btn btn-success flex-2"
          disabled={isOver}
          title={isOver ? "The game is over" : undefined}
        >
          Advance Turn ▶
        </button>
      </div>
    </div>
  );
};
