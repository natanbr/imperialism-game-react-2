import { GameState } from "../../types/GameState";
import { Nation } from "../../types/Nation";

/**
 * Collects treasury charges while a start-work function scans the map, so several
 * jobs started in one pass cannot overspend a nation.
 */
export function createTreasuryLedger(state: GameState) {
  const spent: Record<string, number> = {};
  const treasuryOf = (nationId: string) =>
    state.nations.find(n => n.id === nationId)?.treasury ?? 0;

  return {
    /** Reserves `cost` for the nation; returns false (and reserves nothing) if it cannot afford it. */
    tryCharge(nationId: string, cost: number): boolean {
      if (!state.nations.some(n => n.id === nationId)) return false;
      if (treasuryOf(nationId) - (spent[nationId] ?? 0) < cost) return false;
      spent[nationId] = (spent[nationId] ?? 0) + cost;
      return true;
    },
    /** Returns the nations with all reserved charges deducted. */
    nationsAfterCharges(): Nation[] {
      return state.nations.map(n =>
        spent[n.id] ? { ...n, treasury: (n.treasury ?? 0) - spent[n.id] } : n
      );
    },
  };
}
