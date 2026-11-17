import React from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { money } from "../gameText";

/**
 * FR-363: shown while the browser refuses the autosave's writes (storage full or blocked), until one succeeds; the
 * pane's alerts show it (HUD/Alerts.tsx, FR-471).
 */
export const NOT_SAVED_TEXT = "Not saved: the browser did not allow the game to be stored.";

/**
 * The cash, "Cash: $10,000", in the money format of the Board of Trade and the Deal Book (FR-258): the top bar's cash
 * block, line 1. Trap: the e2e suite reads this element's whole text as the cash, so the change line (CashChange) stands
 * beside it, never inside.
 */
export const NationStats: React.FC = () => {
  const activeNation = useGameStore(selectActiveNation);

  return (
    <div className="nation-stats">
      <div>
        <strong className="topbar-wide-only">Cash:</strong> {money(activeNation?.treasury ?? 0)}
      </div>
    </div>
  );
};

/** "-$100 last turn", "+$1,250 last turn", "$0 last turn" (FR-466). */
export const cashChangeText = (change: number): string => `${change > 0 ? "+" : ""}${money(change)} last turn`;

/**
 * Last turn's change of the cash (FR-466): the last report's treasury at its end less the one at its start, which is
 * before the player's first order of that turn (FR-256), so it holds the turn's spending too. None on turn 1, and none
 * for a report without treasuries (made by hand).
 */
export const CashChange: React.FC = () => {
  const treasury = useGameStore((s) => s.eventLog.at(-1)?.treasuries?.[s.activeNationId]);
  if (!treasury) return null;
  return (
    <div className="cash-change" data-testid="cash-change">
      {cashChangeText(treasury.end - treasury.start)}
    </div>
  );
};
