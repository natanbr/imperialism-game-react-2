import type { DiplomacyState } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { AnswerIntent } from "@/types/Intent";
import type { Approach } from "@/types/Navy";
import type { Tile } from "@/types/Tile";
import { proposalsOf, warActive } from "../diplomacy/queries";
import { pairKey } from "../diplomacy/relations";
import { buildingOf } from "../industry/industryState";
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

/**
 * FR-646: the sea routes of this turn's connectivity phase as far as the viewer knows them. The diplomacy phase first
 * ends the wars whose peace it accepted; the fleet phase then sails its own squadron on its mission, the other fleets
 * staying where they publicly are (their orders are their owners' own, FR-497). A squadron left with no enemy on its
 * approach is no longer contested, as the fleet phase clears it. One that still meets an enemy fights there, and the
 * battle's result is drawn in the settlement, so the forecast keeps both on the approach.
 */
function knownRoutes(state: GameState, viewerId: string): GameState {
  const diplomacy = acceptedPeace(state, viewerId);
  const atPeace = diplomacy === state.diplomacy ? state : { ...state, diplomacy };
  if (!atPeace.fleets.length) return atPeace;
  const sailed = atPeace.fleets.map(f => f.ownerNationId === viewerId ? sailedPosition(atPeace, f).fleet : f);
  const fleets = sailed.map(f => {
    if (!f.contested && !f.contestedWith) return f;
    const meetsEnemy = sailed.some(o => o !== f && sameApproach(o.approach, f.approach) && warActive(atPeace, f.ownerNationId, o.ownerNationId));
    if (meetsEnemy) return f;
    const clear = { ...f };
    delete clear.contested;
    delete clear.contestedWith;
    return clear;
  });
  return { ...atPeace, fleets };
}

/**
 * FR-646: the transport plan of this End Turn as far as `viewerId` knows it: its own jobs that finish before logistics
 * (a tile's next level, a rail, a depot or a port), its town factories' expansions, the sea routes its own peace answers
 * and squadron's mission open or close, and the hubs those connect, shipped under its plan and cars. The popup's rows
 * and header and the Armoury's horse supply (FR-517) read it, so they equal what the logistics phase ships unless
 * another nation's orders or a battle change a route. The scripted player plans on `freightAtLogistics` instead.
 */
export function knownFreightPlan(
  state: GameState, viewerId: string, capacity: number, plan = state.transportAllocationsByNation?.[viewerId]
) {
  const { collected, collectionOrder } = freightAtLogistics(knownRoutes(ownWork(state, viewerId), viewerId), viewerId);
  return { collected, shipments: transportShipments(capacity, collected, plan, collectionOrder) };
}
