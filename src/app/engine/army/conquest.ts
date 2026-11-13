// Conquest (M9, FR-222 to FR-224): what passes with a province taken in battle, a Great Power's fallen capital, a
// minor's fallen capital and a colony that changes hands. Pure edits of the state; the events go through `emit`, in the
// order the news reads them.
import type { CountryId, MinorNationId, NationId, ProvinceId } from "@/types/Common";
import type { DiplomacyState, PairDiplomacy } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import type { RailroadNetwork } from "@/types/Transport";
import { WorkerStatus, type Worker } from "@/types/Workers";
import { MAX_RELATION_POINTS, pairKey } from "../diplomacy/relations";
import type { GameEvent } from "../turn/context";
import { isGreatPower, isMinorNation } from "../world/countries";
import { provinceById, provincesOf, transferProvince } from "../world/provinces";
import { capitalProvinceOf } from "./armies";

type Emit = (event: GameEvent) => void;

/** A Great Power whose capital province another country holds (FR-223). Never on a world without provinces. */
export function isFallen(state: GameState, nationId: NationId): boolean {
  if (state.provinces.length === 0) return false;
  const capital = capitalProvinceOf(state, nationId);
  return capital !== undefined && capital.ownerId !== nationId;
}

/** FR-223: the one Great Power left standing when the others have fallen; undefined while two stand (always on two-islands). */
export function conquestWinner(state: GameState): NationId | undefined {
  if (state.provinces.length === 0 || state.nations.length < 2) return undefined;
  const standing = state.nations.filter((n) => !isFallen(state, n.id));
  return standing.length === 1 ? standing[0].id : undefined;
}

const nodeKey = (t: Pick<Tile, "x" | "y">) => `${t.x},${t.y}`;

/** The old owner's rail network without the nodes on these tiles and the sections into them (FR-222). */
function withoutNodes(network: RailroadNetwork, keys: ReadonlySet<string>): RailroadNetwork {
  const graph: RailroadNetwork["graph"] = {};
  for (const [k, nodes] of Object.entries(network.graph)) {
    if (!keys.has(k)) graph[k] = nodes.filter((n) => !keys.has(`${n.x},${n.y}`)).map((n) => ({ ...n }));
  }
  const rest: RailroadNetwork = {
    ...network,
    graph,
    depots: network.depots.filter((d) => !keys.has(`${d.x},${d.y}`)).map((d) => ({ ...d })),
    ports: network.ports.filter((p) => !keys.has(`${p.x},${p.y}`)).map((p) => ({ ...p })),
  };
  if (network.capital && keys.has(`${network.capital.x},${network.capital.y}`)) delete rest.capital;
  return rest;
}

/** The tile with its rail, depot, port and jobs gone, and without the civilians that leave it. */
function clearedTile(tile: Tile, leaving: (w: Worker) => boolean): Tile {
  const copy: Tile = { ...tile };
  delete copy.connected;
  delete copy.depot;
  delete copy.port;
  delete copy.prospecting;
  delete copy.developmentJob;
  delete copy.constructionJob;
  // Anyone left on the tile whose job ended is free again (FR-222: the jobs under way there end)
  copy.workers = tile.workers.filter((w) => !leaving(w)).map((w) => (w.status === WorkerStatus.Working ? { ...w, status: WorkerStatus.Available } : w));
  return copy;
}

/**
 * FR-222: the province passes to the winner (`transferProvince`); the rail, depots and ports on its tiles are removed,
 * also from the old owner's rail graph; its fort, resources and development levels stay; the jobs under way there end;
 * the old owner's civilians on its tiles go to the old owner's capital tile (removed when it has none); the winner gets
 * no militia there. A capture is recorded in the war between the two (read by FR-174 and FR-228). Event `province-taken`.
 */
function passProvince(state: GameState, provinceId: ProvinceId, winnerId: NationId, turn: number, emit: Emit): GameState {
  const province = provinceById(state, provinceId)!;
  const fromId = province.ownerId;
  let s = transferProvince(state, provinceId, winnerId);

  const taken = new Set(province.tileIds);
  const capitalTile = state.nations.some((n) => n.id === fromId)
    ? s.map.tiles.flat().find((t) => t.cityId === s.nations.find((n) => n.id === fromId)!.cities[0] && t.ownerNationId === fromId)
    : undefined;
  const leaving = (w: Worker) => w.nationId === fromId;
  const homeless: Worker[] = [];
  const keys = new Set<string>();
  const tiles = s.map.tiles.map((row) =>
    row.some((t) => taken.has(t.id))
      ? row.map((t) => {
          if (!taken.has(t.id)) return t;
          keys.add(nodeKey(t));
          homeless.push(...t.workers.filter(leaving));
          return clearedTile(t, leaving);
        })
      : row
  );
  const home = (w: Worker): Worker => {
    const back: Worker = { ...w, status: WorkerStatus.Available, justMoved: false, assignedTileId: capitalTile!.id };
    delete back.previousTileId;
    return back;
  };
  const placed = capitalTile && homeless.length > 0
    ? tiles.map((row) => (row.some((t) => t.id === capitalTile.id) ? row.map((t) => (t.id === capitalTile.id ? { ...t, workers: [...t.workers, ...homeless.map(home)] } : t)) : row))
    : tiles;
  s = { ...s, map: { ...s.map, tiles: placed } };

  const network = s.transportNetwork.railroadNetworks?.[fromId];
  if (network) {
    s = {
      ...s,
      transportNetwork: { ...s.transportNetwork, railroadNetworks: { ...s.transportNetwork.railroadNetworks, [fromId]: withoutNodes(network, keys) } },
    };
  }

  const key = pairKey(winnerId, fromId);
  const war = s.diplomacy[key]?.war;
  if (war) {
    const captures = [...(war.captures ?? []), { provinceId, fromId, toId: winnerId, turn }];
    s = { ...s, diplomacy: { ...s.diplomacy, [key]: { ...s.diplomacy[key], war: { ...war, captures } } } };
  }
  emit({ type: "province-taken", nationId: winnerId, provinceId, fromId });
  return s;
}

/** Every war of the country ends (FR-223, FR-224). */
function endWarsOf(diplomacy: DiplomacyState, countryId: CountryId): DiplomacyState {
  const next: DiplomacyState = { ...diplomacy };
  for (const [key, entry] of Object.entries(diplomacy)) {
    if (!entry.war || !key.split("|").includes(countryId)) continue;
    const rest: PairDiplomacy = { ...entry };
    delete rest.war;
    next[key] = rest;
  }
  return next;
}

/**
 * FR-224: the minor becomes (or stays) a colony of `ownerId`: `colonyOf` set, the other Great Powers' consulates,
 * embassies, pacts, subsidies and locked grants with it end (each grant with `grant-stopped`, reason "colony"), its
 * points with the owner become 89; `minor-colonised`. Also when a colony changes hands (review E1): the old owner is
 * then one of the other Great Powers.
 */
function makeColony(state: GameState, minorId: MinorNationId, ownerId: NationId, emit: Emit): GameState {
  const diplomacy: DiplomacyState = { ...state.diplomacy };
  const stopped: GameEvent[] = [];
  for (const nation of state.nations) {
    const key = pairKey(nation.id, minorId);
    const entry = diplomacy[key];
    if (!entry) continue;
    if (nation.id === ownerId) {
      diplomacy[key] = { ...entry, points: MAX_RELATION_POINTS };
      continue;
    }
    for (const granter of Object.keys(entry.lockedGrants).sort()) {
      stopped.push({ type: "grant-stopped", nationId: granter, targetId: minorId, amount: entry.lockedGrants[granter]!, reason: "colony" });
    }
    diplomacy[key] = { ...entry, consulates: [], embassies: [], pact: false, subsidies: {}, lockedGrants: {} };
  }
  const s = { ...state, diplomacy, minorNations: state.minorNations.map((m) => (m.id === minorId ? { ...m, colonyOf: ownerId } : m)) };
  emit({ type: "minor-colonised", nationId: ownerId, minorId });
  for (const event of stopped) emit(event);
  return s;
}

/**
 * FR-223 (Q34; Imp1 differs: the rest of the nation falls into anarchy, gaps F4): the fallen Great Power's other
 * provinces pass to the winner (each as FR-222), its colonies with them (review E1), its regiments are removed and its
 * wars end; `nation-fallen`, then a `minor-colonised` for each colony the winner gains.
 */
function fallNation(state: GameState, fallenId: NationId, winnerId: NationId, turn: number, emit: Emit): GameState {
  let s = state;
  for (const province of provincesOf(state, fallenId)) s = passProvince(s, province.id, winnerId, turn, emit);
  s = { ...s, armies: s.armies.filter((a) => a.ownerId !== fallenId), diplomacy: endWarsOf(s.diplomacy, fallenId) };
  emit({ type: "nation-fallen", nationId: winnerId, fallenId });
  for (const colony of s.minorNations.filter((m) => m.colonyOf === fallenId)) s = makeColony(s, colony.id, winnerId, emit);
  return s;
}

/**
 * FR-224 (Q34; Imp1: a conquered minor's capital keeps buying, only from its conqueror [07:W3]): the minor's other
 * provinces pass to the winner, every war with it ends and it becomes the winner's colony (`makeColony`).
 */
function colonise(state: GameState, minorId: MinorNationId, winnerId: NationId, turn: number, emit: Emit): GameState {
  let s = state;
  for (const province of provincesOf(state, minorId)) s = passProvince(s, province.id, winnerId, turn, emit);
  s = { ...s, diplomacy: endWarsOf(s.diplomacy, minorId) };
  return makeColony(s, minorId, winnerId, emit);
}

/**
 * A province taken in battle by `winnerId` (FR-222). When it is the capital province of a colony of the old owner,
 * the colony passes to the winner with it (review E1). The fall of a capital is not applied here: the combat phase
 * applies it after its last battle (`fallCapital`), so every battle of the phase is decided first (review F1).
 */
export function takeProvince(state: GameState, provinceId: ProvinceId, winnerId: NationId, turn: number, emit: Emit): GameState {
  const fromId = provinceById(state, provinceId)!.ownerId;
  const s = passProvince(state, provinceId, winnerId, turn, emit);
  const colony = s.minorNations.find((m) => m.colonyOf === fromId && capitalProvinceOf(s, m.id)?.id === provinceId);
  return colony ? makeColony(s, colony.id, winnerId, emit) : s;
}

/** The country whose own capital province this is (a Great Power or a minor), else undefined. */
export function capitalOwnerOf(state: GameState, provinceId: ProvinceId): CountryId | undefined {
  const ownerId = provinceById(state, provinceId)?.ownerId;
  return ownerId !== undefined && capitalProvinceOf(state, ownerId)?.id === provinceId ? ownerId : undefined;
}

/**
 * A capital province taken this phase from `fallenId` now held by `holderId`: the Great Power falls to it (FR-223) or the
 * minor becomes its colony (FR-224).
 */
export function fallCapital(state: GameState, fallenId: CountryId, holderId: NationId, turn: number, emit: Emit): GameState {
  if (isGreatPower(state, fallenId)) return fallNation(state, fallenId, holderId, turn, emit);
  if (isMinorNation(state, fallenId)) return colonise(state, fallenId, holderId, turn, emit);
  return state;
}
