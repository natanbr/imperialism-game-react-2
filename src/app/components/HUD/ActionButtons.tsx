import React from "react";
import { useGameStore } from "@/store/rootStore";
import { centreOnCapital } from "@/hooks/mapActions";
import { UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";

export const ActionButtons: React.FC = () => {
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const openWarehouse = useGameStore((s) => s.openWarehouse);
  const openCapital = useGameStore((s) => s.openCapital);
  const openMarket = useGameStore((s) => s.openMarket);
  const openDealBook = useGameStore((s) => s.openDealBook);
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  const openTransportAllocation = useGameStore((s) => s.openTransportAllocation);
  const showGameOver = useGameStore((s) => s.showGameOver);
  const isOver = useGameStore((s) => s.game.gameOver !== undefined);

  // One accent colour for the primary action, Advance Turn (FR-086); the rest are plain.
  return (
    <div className="action-buttons-container">
      {isOver && (
        <button onClick={showGameOver} className="btn btn-plain">
          <GameIcon name={UI_ICONS.finalScores} /> Final scores
        </button>
      )}
      <button onClick={openWarehouse} className="btn btn-plain">
        <GameIcon name={UI_ICONS.warehouse} /> Open Warehouse
      </button>
      <button onClick={openCapital} className="btn btn-plain">
        <GameIcon name={UI_ICONS.capital} /> Open Capital
      </button>
      <button onClick={openMarket} className="btn btn-plain">
        <GameIcon name={UI_ICONS.market} /> Open Market
      </button>
      <button onClick={openDealBook} className="btn btn-plain">
        <GameIcon name={UI_ICONS.dealBook} /> Deal Book
      </button>
      <button onClick={openDiplomacy} className="btn btn-plain">
        <GameIcon name={UI_ICONS.diplomacy} /> Diplomacy
      </button>
      <button onClick={openTransportAllocation} className="btn btn-plain">
        <GameIcon name={UI_ICONS.transport} /> Transportation of Commodities
      </button>
      <div className="btn-group">
        <button onClick={centreOnCapital} title="Center Camera" className="btn btn-plain btn-sm flex-1">
          <GameIcon name={UI_ICONS.center} /> Center
        </button>
        {/* The store ignores advanceTurn after the end too (FR-077); the button says so (FR-076). */}
        <button
          onClick={advanceTurn}
          className="btn btn-primary flex-2"
          disabled={isOver}
          title={isOver ? "The game is over" : undefined}
        >
          Advance Turn <GameIcon name={UI_ICONS.advanceTurn} />
        </button>
      </div>
    </div>
  );
};
