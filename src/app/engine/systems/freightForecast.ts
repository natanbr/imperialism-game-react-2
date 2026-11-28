import type { DiplomacyState } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { AnswerIntent } from "@/types/Intent";
import type { Approach, Fleet, Ship } from "@/types/Navy";
import type { Tile } from "@/types/Tile";
import { proposalsOf, warActive } from "../diplomacy/queries";
import { pairKey } from "../diplomacy/relations";
import { buildingOf } from "../industry/industryState";
import { seaBattle } from "../navy/battle";
import type { Rng } from "../rng";
import { createTurnContext } from "../turn/context";
import { townFactories } from "../world/towns";
import { developmentSystem } from "./developmentSystem";
import { sailedPosition } from "./interceptionsSystem";
import { forecastFreight, transportShipments } from "./logisticsSystem";
import { finishBuildings } from "./productionSystem";
import { transportConnectivitySystem } from "./transportConnectivitySystem";

/**
 * What the hubs collect in the logistics phase of the turn `view` plans (its orders given): after the development
 * phase finishes this turn's jobs (a rail, a depot, a tile's next level), the production phase this owner's town
 * factory expansions, and the connectivity phase updates the hubs. The scripted player's plan (FR-389, FR-628).
 */
export function freightAtLogistics(view: GameState, nationId: string) {
  const ctx = createTurnContext({ turn: view.turn });
  const connected = transportConnectivitySystem(developmentSystem(view, ctx), ctx);
  const owner = connected.nations.find(n => n.id === nationId);
  if (owner && Object.values(townFactories).some(factory => buildingOf(owner, factory).pendingCapacity > 0)) {
    const buildings = finishBuildings(nationId, owner.industry, ctx);
    const nations = connected.nations.map(n => n === owner ? { ...n, industry: { ...n.industry, buildings } } : n);
    return forecastFreight({ ...connected, nations }, nationId, view.map);
  }
  // A survey can finish in the real settlement. Its result is still private while orders are being planned.
  return forecastFreight(connected, nationId, view.map);
}

/**
 * The viewer's own worker on the tile holds the job: on its land, or its improver on a Minor Nation tile it holds
 * (FR-634). A worker that holds a job cannot leave its tile, so a job naming another nation's worker or no worker there
 * comes from an edited save and is not the viewer's.
 */
const viewerHolds = (tile: Tile, viewerId: string, workerId: string) =>
  tile.workers.some(w => w.id === workerId && w.nationId === viewerId);

/**
 * The state with only the viewer's development and construction jobs (FR-497): another nation's jobs are its own
 * business, and no survey finishes, as its result is drawn in the settlement.
 */
export function ownWork(state: GameState, viewerId: string): GameState {
  const tiles = state.map.tiles.map(row => row.map(tile => {
    const development = tile.developmentJob && !viewerHolds(tile, viewerId, tile.developmentJob.workerId);
    const construction = tile.constructionJob && !viewerHolds(tile, viewerId, tile.constructionJob.workerId);
    if (!tile.prospecting && !development && !construction) return tile;
    return {
      ...tile,
      prospecting: undefined,
      ...(development && { developmentJob: undefined }),
      ...(construction && { constructionJob: undefined }),
    };
  }));
  return { ...state, map: { ...state.map, tiles } };
}

/**
 * The wars the viewer's accepted answers end in this turn's diplomacy phase: each peace it was offered on an earlier
 * turn, while the pair is still at war (FR-169). No other diplomacy of its own ends a war or a blockade this turn as far
 * as it knows: a declaration starts next turn, a peace offer to a Great Power is that power's to answer (its player's,
 * or a computer power's own rule), and a peace with a Minor Nation, always granted, changes no sea route, as no Minor
 * Nation sails a fleet.
 */
function acceptedPeace(state: GameState, viewerId: string): DiplomacyState {
  let diplomacy = state.diplomacy;
  const accepted = state.intents.filter((i): i is AnswerIntent =>
    i.kind === "answer" && i.nationId === viewerId && i.turn === state.turn && (i as AnswerIntent).accept);
  for (const { proposalId } of accepted) {
    const offer = proposalsOf(state).find(p => p.id === proposalId && p.toId === viewerId && p.kind === "peace" && p.turn < state.turn);
    const key = offer && pairKey(offer.fromId, offer.toId);
    if (!key || !diplomacy[key]?.war) continue;
    const settled = { ...diplomacy[key] };
    delete settled.war;
    diplomacy = { ...diplomacy, [key]: settled };
  }
  return diplomacy;
}

const sameApproach = (a: Approach | undefined, b: Approach | undefined) =>
  !!a && !!b && a.provinceId === b.provinceId && a.seaId === b.seaId;

/** The fleets on `fleet`'s approach whose owners are at war with its owner: those it fights in the fleet phase. */
const opponentsOf = (state: GameState, fleets: Fleet[], fleet: Fleet) =>
  fleets.filter(o => o !== fleet && sameApproach(o.approach, fleet.approach) && warActive(state, fleet.ownerNationId, o.ownerNationId));

/** As the fleet phase sends a squadron to its berth: no approach, landing site or contest. */
function atBerth(fleet: Fleet): Fleet {
  const home = { ...fleet, location: "berth" };
  delete home.approach;
  delete home.siteSinceTurn;
  delete home.contested;
  delete home.contestedWith;
  return home;
}

/** As the fleet phase leaves a squadron its battle tied: still on the approach, contesting it with the opponent. */
const contesting = (fleet: Fleet, opponentId: string): Fleet => ({ ...fleet, contested: true, contestedWith: [opponentId] });

/** As the fleet phase leaves a squadron that fought no tie this turn: contesting nothing. */
function uncontested(fleet: Fleet): Fleet {
  if (!fleet.contested && !fleet.contestedWith) return fleet;
  const clear = { ...fleet };
  delete clear.contested;
  delete clear.contestedWith;
  return clear;
}

/**
 * An enemy squadron as the viewer knows it (FR-497): its ships' types and ids are public (the naval screens), and a
 * ship's firepower, range, armour and hull are its type's (shipyardSystem). The hull an enemy ship has left is not (the
 * naval report shows it only to the battle's sides), so the forecast takes each at full hull. A damaged enemy can only
 * lose more ships: a forecast tie or win is then a tie or our win, our squadron on the approach either way, and a
 * forecast loss a loss or a result a draw decides, the approach as before the turn either way.
 */
function sighted(fleet: Fleet): Fleet {
  if (!fleet.ships.some(ship => ship.hullDamage)) return fleet;
  return { ...fleet, ships: fleet.ships.map(ship => {
    const undamaged = { ...ship };
    delete undamaged.hullDamage;
    return undamaged;
  }) };
}

/**
 * Each draw 0: every gun picks the first ship it can target and hits it (`rng.next() < NAVAL_HIT_CHANCE` in battle.ts).
 * The forecast's own stream, not the game's (FR-150): it draws nothing from the turn's streams.
 */
const everyGunHits: Rng = { next: () => 0 };

/**
 * No draw sinks the ship: alone against `enemy`, with every enemy gun hitting it in every round, it is still afloat and
 * has sunk none of them, so each gun fired every round. Beside its squadron's other ships it can only take less: they
 * draw fire and can only sink enemy guns.
 */
function afloatInEveryDraw(ship: Ship, squadron: Fleet, enemy: Fleet): boolean {
  const { afterLeft, afterRight } = seaBattle({ ...squadron, ships: [ship] }, enemy, everyGunHits);
  return afterLeft.ships.length === 1 && afterRight.ships.length === enemy.ships.length;
}

/**
 * Our squadron's battle against the enemy's as the fleet phase fights it (`seaBattle`), when no draw decides it: no ship
 * on either side can sink, so the full firepower of each decides. Undefined when a draw may decide it.
 */
function drawFreeResult(ours: Fleet, enemy: Fleet): "won" | "tied" | "lost" | undefined {
  if (!ours.ships.every(ship => afloatInEveryDraw(ship, ours, enemy)) ||
      !enemy.ships.every(ship => afloatInEveryDraw(ship, enemy, ours))) return undefined;
  const { winner } = seaBattle(ours, enemy, everyGunHits);
  return !winner ? "tied" : winner.id === ours.id ? "won" : "lost";
}

/**
 * The fleets after our squadron arrives where an enemy squadron holds the approach, the rivals staying put (their orders
 * are their own, FR-497). When that one enemy is all it fights there and no draw decides the battle, the forecast settles
 * it as the fleet phase does: a tie leaves both contesting the approach, the loser goes to its berth and the winner holds
 * the approach. Otherwise our squadron is kept off it (at its berth, where a lost battle sends it) and the approach keeps
 * its pre-turn blockade or contest.
 */
function settledSortie(state: GameState, fleets: Fleet[], ours: Fleet): Fleet[] {
  const [enemy, ...others] = opponentsOf(state, fleets, ours);
  if (!enemy) return fleets;
  const alone = !others.length && opponentsOf(state, fleets, enemy).length === 1;
  const result = alone ? drawFreeResult(ours, sighted(enemy)) : undefined;
  return fleets.map(f => {
    if (f === ours) return result === "won" ? uncontested(ours) : result === "tied" ? contesting(ours, enemy.id) : atBerth(ours);
    if (f !== enemy || !result) return f;
    return result === "lost" ? uncontested(enemy) : result === "tied" ? contesting(enemy, ours.id) : atBerth(enemy);
  });
}

/**
 * FR-646: the sea routes of this turn's connectivity phase as far as the viewer can settle them from its own orders and
 * the public fleet positions, the rivals staying put. The diplomacy phase first ends the wars whose peace it accepted;
 * the fleet phase then sails its own squadron on its mission (`sailedPosition`), the other fleets staying where they
 * publicly are (their orders are their owners' own, FR-497), and settles the battle the squadron meets on arriving when
 * no draw decides it (`settledSortie`). A squadron left with no enemy on its approach is no longer contested, as the
 * fleet phase clears it. One that still meets an enemy there fights again, so the forecast keeps both as they stand.
 */
function knownRoutes(state: GameState, viewerId: string): GameState {
  const diplomacy = acceptedPeace(state, viewerId);
  const atPeace = diplomacy === state.diplomacy ? state : { ...state, diplomacy };
  if (!atPeace.fleets.length) return atPeace;
  const sailed = atPeace.fleets.map(f => f.ownerNationId === viewerId ? sailedPosition(atPeace, f).fleet : f);
  const arriving = sailed.find((f, i) => f.approach && !sameApproach(f.approach, atPeace.fleets[i].approach));
  const settled = arriving ? settledSortie(atPeace, sailed, arriving) : sailed;
  const fleets = settled.map(f => opponentsOf(atPeace, settled, f).length ? f : uncontested(f));
  return { ...atPeace, fleets };
}

/**
 * FR-646: the transport plan of this End Turn as far as `viewerId` knows it: its own jobs that finish before logistics
 * (a tile's next level, a rail, a depot or a port), its town factories' expansions, the sea routes its own peace answers
 * and squadron's mission open or close against the public fleet positions (a battle settled only when no draw decides
 * it), and the hubs those connect, shipped under its plan and cars. The popup's rows and header and the Armoury's horse
 * supply (FR-517) read it, so they equal what the logistics phase ships unless another nation's orders or a draw change
 * a route. The scripted player plans on `freightAtLogistics` instead.
 */
export function knownFreightPlan(
  state: GameState, viewerId: string, capacity: number, plan = state.transportAllocationsByNation?.[viewerId]
) {
  const { collected, collectionOrder } = freightAtLogistics(knownRoutes(ownWork(state, viewerId), viewerId), viewerId);
  return { collected, shipments: transportShipments(capacity, collected, plan, collectionOrder) };
}
