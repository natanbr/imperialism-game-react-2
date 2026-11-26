import type { NationId, ProvinceId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { TownProgress } from "@/types/Province";
import { capitalProvinceOf } from "../army/armies";
import { provinceById, startOwnerOf } from "../world/provinces";
import { townChains, townOutput, townsOf, type TownFacts } from "../world/towns";

const STARTUP_SETTLEMENTS = 6;
const UPGRADE_SETTLEMENTS = 2;
const zeroTiers = { textile: 0, wood: 0, metal: 0 };

function advanceTown(town: TownFacts, previous: TownProgress | undefined, capturedCapital: boolean): TownProgress {
  const connectedSettlements = (previous?.connectedSettlements ?? 0) + (town.connected ? 1 : 0);
  const readyToStart = capturedCapital || connectedSettlements >= STARTUP_SETTLEMENTS;
  const matured = { ...(previous?.matured ?? zeroTiers) };
  const upgradeSettlements = { ...(previous?.upgradeSettlements ?? zeroTiers) };
  for (const [chain] of townChains) {
    if (town.supported[chain] <= matured[chain]) {
      // Losing the next tier's prerequisite invalidates its unfinished interval, even in a blockade.
      upgradeSettlements[chain] = 0;
      continue;
    }
    if (!town.connected) continue;
    if (matured[chain] === 0) {
      if (readyToStart) matured[chain] = 1;
      continue;
    }
    upgradeSettlements[chain]++;
    if (upgradeSettlements[chain] >= UPGRADE_SETTLEMENTS) {
      matured[chain]++;
      upgradeSettlements[chain] = 0;
    }
  }
  return { ownerId: town.ownerId, connectedSettlements, matured, upgradeSettlements };
}

/** FR-619/620: resolve once, after transfers, factory completions and the connectivity check. */
export function townDevelopmentSystem(state: GameState): GameState {
  if (state.provinces.length === 0) return state;
  const capitals = new Map([...state.nations, ...state.minorNations].map(country =>
    [country.id, capitalProvinceOf(state, country.id)?.id]));
  const townProgress: Record<ProvinceId, TownProgress> = {};
  for (const nation of state.nations) {
    for (const town of townsOf(state, nation.id)) {
      const saved = state.townProgress?.[town.provinceId];
      const previous = saved?.ownerId === nation.id ? saved : undefined;
      if (!town.connected && !previous) continue;
      const founder = startOwnerOf(provinceById(state, town.provinceId)!);
      const capital = capitals.get(founder) === town.provinceId;
      if (capital && (founder === nation.id || state.minorNations.some(minor => minor.id === founder))) continue;
      townProgress[town.provinceId] = advanceTown(town, previous, capital);
    }
  }
  if (Object.keys(townProgress).length) return { ...state, townProgress };
  if (!state.townProgress) return state;
  const next = { ...state };
  delete next.townProgress;
  return next;
}

/** Read an offer from townsOf(state, owner) at this settlement; this query never advances its clock. */
export function settledTownOutput(state: GameState, owner: NationId, town: TownFacts) {
  const progress = state.townProgress?.[town.provinceId];
  if (!town.connected || town.ownerId !== owner || progress?.ownerId !== owner ||
      provinceById(state, town.provinceId)?.ownerId !== owner) return {};
  return townOutput(town.supported, progress.matured);
}
