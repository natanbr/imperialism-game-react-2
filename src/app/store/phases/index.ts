import { GameMap } from "@/types/Map";
import { nationDevelopmentPhase } from "./nationDevelopment";

export interface PhaseContext {
  // Extend with things like nations, diplomacy state, economy, etc.
}

export function diplomacyPhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function tradePhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function productionPhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function combatPhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function interceptionsPhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function logisticsPhase(map: GameMap): GameMap {
  return map; // placeholder
}

export function runTurnPhases(map: GameMap, currentTurn: number, nextTurn: number): GameMap {
  let m = map;
  // Nation Development Phase
  m = nationDevelopmentPhase(m, currentTurn, nextTurn);

  // Subsequent phases (placeholders)
  m = diplomacyPhase(m);
  m = tradePhase(m);
  m = productionPhase(m);
  m = combatPhase(m);
  m = interceptionsPhase(m);
  m = logisticsPhase(m);

  return m;
}