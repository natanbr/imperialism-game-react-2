import type { NationId, ProvinceId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GameMap } from "@/types/Map";
import type { Province, TownProgress } from "@/types/Province";
import { capitalProvinceOf } from "../army/armies";
import { provinceById, startOwnerOf } from "../world/provinces";
import { townChains, townOutput, townsOf, type TownFacts } from "../world/towns";

export const STARTUP_SETTLEMENTS = 6;
export const UPGRADE_SETTLEMENTS = 2;
const zeroTiers = { textile: 0, wood: 0, metal: 0 };

export function advanceTown(town: TownFacts, previous: TownProgress | undefined, capturedCapital: boolean): TownProgress {
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

export function townCapitalKind(state: GameState, province: Province, foundingCapitalId: ProvinceId | undefined) {
  if (province.id !== foundingCapitalId) return undefined;
  const founder = startOwnerOf(province);
  if (state.minorNations.some(minor => minor.id === founder)) return "minor";
  return founder === province.ownerId ? "own" : "captured";
}

/** FR-619/620: the same one-settlement projection drives the owner’s estimate and the actual turn. */
export function nextTownSettlements(state: GameState, owner: NationId, knownMap: GameMap = state.map) {
  const capitals = new Map<NationId, ProvinceId | undefined>();
  const settlements: { town: TownFacts; progress: TownProgress }[] = [];
  for (const town of townsOf(state, owner, knownMap)) {
    const saved = state.townProgress?.[town.provinceId];
    const previous = saved?.ownerId === owner ? saved : undefined;
    if (!town.connected && !previous) continue;
    const province = provinceById(state, town.provinceId)!;
    const founder = startOwnerOf(province);
    if (!capitals.has(founder)) capitals.set(founder, capitalProvinceOf(state, founder)?.id);
    const kind = townCapitalKind(state, province, capitals.get(founder));
    if (kind === "minor" || kind === "own") continue;
    settlements.push({ town, progress: advanceTown(town, previous, kind === "captured") });
  }
  return settlements;
}

/** Resolve once, after transfers, factory completions and the connectivity check. */
export function townDevelopmentSystem(state: GameState): GameState {
  if (state.provinces.length === 0) return state;
  const townProgress: Record<ProvinceId, TownProgress> = {};
  for (const nation of state.nations) {
    for (const { town, progress } of nextTownSettlements(state, nation.id)) townProgress[town.provinceId] = progress;
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
