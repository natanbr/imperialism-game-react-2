import React from "react";
import { useGameStore } from "@/store/rootStore";
import { centreOnCapital } from "@/hooks/mapActions";
import { UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";
import { InkPicture } from "../art/ArtPicture";
import { CAPITOL_ART, buildingArt } from "../art/inkArt";

type BarButtonProps = Omit<React.ComponentProps<"button">, "children" | "title"> & {
  /** The accessible name, shown as the label (FR-469: the names are kept exactly). */
  name: string;
  icon: React.ReactNode;
  /** The mouse tooltip; the name unless a longer one is kept (Center Camera). */
  title?: string;
};

/**
 * One of the top bar's icon buttons (FR-468): the icon in FR-349's 20 px box, then the name as a `.topbar-label` span,
 * hidden from sight only below 1800 px of width (globals.css), so the visible label is the name (WCAG 2.5.3) and no space
 * stands between icon and label (FR-354).
 */
export const BarButton: React.FC<BarButtonProps> = ({ name, icon, title = name, className, ...button }) => (
  <button type="button" className={`btn btn-plain topbar-button${className ? ` ${className}` : ""}`} title={title} {...button}>
    {icon}
    <span className="topbar-label">{name}</span>
  </button>
);

/**
 * The top bar's buttons (FR-466): the six dialogs (Warehouse, Capital and Transport show their buildings from the art
 * pack, FR-334; the others their Game Icons, FR-335), Center, then `children` (the bar's New game and About), Final
 * scores at game over, all in a strip that scrolls sideways in a narrow window; Advance Turn last, outside the strip, so
 * it never scrolls away: the one End Turn control on the screen (card Q113).
 */
export const ActionButtons: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const endTurn = useGameStore((s) => s.endTurn);
  const locked = useGameStore((s) => s.endTurnLocked);
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
    <div className="topbar-buttons">
      <div className="topbar-strip" data-testid="topbar-strip">
        <div className="action-buttons-container">
          <BarButton name="Open Warehouse" onClick={openWarehouse} icon={<InkPicture src={buildingArt("warehouse")} alt="" inline />} />
          <BarButton name="Open Capital" onClick={openCapital} icon={<InkPicture src={CAPITOL_ART} alt="" inline />} />
          <BarButton name="Open Market" onClick={openMarket} icon={<GameIcon name={UI_ICONS.market} />} />
          <BarButton name="Deal Book" onClick={openDealBook} icon={<GameIcon name={UI_ICONS.dealBook} />} />
          <BarButton name="Diplomacy" onClick={openDiplomacy} icon={<GameIcon name={UI_ICONS.diplomacy} />} />
          <BarButton
            name="Transportation of Commodities"
            onClick={openTransportAllocation}
            icon={<InkPicture src={buildingArt("railyard")} alt="" inline />}
          />
        </div>
        {/* The title e2e/islands.spec.ts and tests/ui/camera.test.tsx find it by */}
        <BarButton name="Center" title="Center Camera" onClick={centreOnCapital} icon={<GameIcon name={UI_ICONS.center} />} />
        {children}
        {isOver && <BarButton name="Final scores" onClick={showGameOver} icon={<GameIcon name={UI_ICONS.finalScores} />} />}
      </div>
      {/* The store ignores advanceTurn after the end too (FR-077); the button says so (FR-076). FR-423: locked for
          600 ms after each turn; aria-disabled, not disabled, so it keeps the focus (Playwright waits for it too). */}
      <button
        type="button"
        onClick={endTurn}
        className="btn btn-primary topbar-advance"
        disabled={isOver}
        aria-busy={locked || undefined}
        aria-disabled={locked || undefined}
        title={isOver ? "The game is over" : undefined}
      >
        Advance Turn <GameIcon name={UI_ICONS.advanceTurn} />
      </button>
    </div>
  );
};
