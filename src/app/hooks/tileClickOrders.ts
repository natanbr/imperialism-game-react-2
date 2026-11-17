// Turns a tile click into the orders it asks for (FR-023). Plain functions, no React, so the
// click policy is tested without a browser; useTileClickHandler sends the orders. What the map's
// status line says about a click (FR-373, FR-374) and whether it asks before spending (FR-383) are worked out here too;
// submitAndSay and submitOrAsk are the functions that reach the store.
import {
  adjacentProvinces,
  countryOfTile,
  provinceById,
  validateOrder,
  type Order,
  type RejectReason,
  type ValidationResult,
} from "@/engine";
import { areTilesAdjacent } from "@/engine/map/mapHelpers";
import { findWorker, isRailNode, railOnMoveStart, railSectionStart, tileById } from "@/engine/orders/queries";
import { REFUSAL_TEXT, refusalText } from "@/components/gameText";
import { refusalDetail, spendQuestion } from "@/components/tileSiteText";
import { useGameStore } from "@/store/rootStore";
import type { PendingSpend } from "@/store/controls/controlsSlice";
import type { GameState } from "@/types/GameState";
import type { PossibleAction } from "@/types/actions";
import { WorkerType } from "@/types/Workers";
import type { CursorAction } from "./tileCursor";
import { getPossibleAction } from "./useTileActions";

/**
 * The orders a plain move tries, best first. An engineer stepping onto a neighbour builds rail on
 * the way: by rail-on-move where the engine's railOnMoveStart finds the section it would build;
 * from a rail node onto a rail node not yet linked to it, the section between the two (FR-137),
 * else two networks that meet head on could never be joined by a click. Otherwise, and as the
 * fallback, it just moves: a step between two tiles the rail already joins (FR-446), or onto a
 * tile where rail-on-move would be refused (FR-461; the map's own canBuildRailAt said yes to the
 * capital and to a depot the rail already reaches, and the click said "Rail refused"). The capital
 * is no exception: rail-on-move onto it is offered where railOnMoveStart finds a section into it.
 */
export function moveOrders(state: GameState, nationId: string, workerId: string, toTileId: string): Order[] {
  const from = findWorker(state, workerId);
  const to = tileById(state, toTileId);
  if (!from || !to) return [];
  const move: Order = { kind: "moveWorker", nationId, workerId, toTileId };
  const engineerStep =
    from.worker.type === WorkerType.Engineer && areTilesAdjacent(state.map, from.tile.x, from.tile.y, to.x, to.y);
  if (!engineerStep) return [move];
  if (railOnMoveStart(state, nationId, from.tile, to)) return [{ kind: "moveAndBuildRail", nationId, workerId, toTileId }, move];
  if (isRailNode(to, nationId) && railSectionStart(state, nationId, to, from.tile)) {
    return [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId, structure: "rail", fromTileId: from.tile.id }, move];
  }
  return [move];
}

/**
 * The orders a click on `tileId` tries for the selected worker, best first. A job on the worker's
 * own tile is a start; a job elsewhere is move-and-start, then the plain move, so a click still
 * moves the worker when only the job is refused (pre-M1 behaviour). The construction dialog on
 * the worker's own tile is UI only and asks for no order. All orders carry the active nation.
 */
export function tileClickOrders(
  state: GameState,
  nationId: string,
  workerId: string,
  tileId: string,
  action: PossibleAction
): Order[] {
  const at = findWorker(state, workerId);
  if (!at) return [];
  const sameTile = at.tile.id === tileId;
  const plainMove: Order = { kind: "moveWorker", nationId, workerId, toTileId: tileId };

  switch (action?.type) {
    case "prospect":
      return sameTile
        ? [{ kind: "startProspecting", nationId, workerId, tileId }]
        : [{ kind: "moveAndStartProspecting", nationId, workerId, toTileId: tileId }, plainMove];
    case "develop":
      return sameTile
        ? [{ kind: "startDevelopment", nationId, workerId, tileId }]
        : [{ kind: "moveAndStartDevelopment", nationId, workerId, toTileId: tileId }, plainMove];
    case "construct":
      return sameTile
        ? [{ kind: "startConstruction", nationId, workerId, tileId, structure: action.kind }]
        : [{ kind: "moveAndStartConstruction", nationId, workerId, toTileId: tileId, structure: action.kind }, plainMove];
    case "open-construct-modal":
      return sameTile ? [] : moveOrders(state, nationId, workerId, tileId);
    default:
      return moveOrders(state, nationId, workerId, tileId);
  }
}

/** A refused order and why. */
export interface OrderRefusal {
  order: Order;
  reason: RejectReason;
}

/** What a click's orders came to (FR-374): the last order tried and its result, and the first order's refusal when a later one was tried. */
export interface SubmitOutcome {
  order: Order;
  last: ValidationResult;
  firstRefusal?: OrderRefusal;
}

/**
 * Submits the orders one by one until one is accepted. A refusal for lack of money stops the
 * list: an unaffordable job never turns into a plain move. Returns the last order and its result,
 * with the first order's refusal when the list went past it (FR-374); undefined for no orders.
 */
export function submitFirstAccepted(
  submit: (order: Order) => ValidationResult,
  orders: readonly Order[]
): SubmitOutcome | undefined {
  let outcome: SubmitOutcome | undefined;
  for (const order of orders) {
    const result = submit(order);
    const firstRefusal = outcome ? (outcome.firstRefusal ?? refusalOf(outcome)) : undefined;
    outcome = firstRefusal ? { order, last: result, firstRefusal } : { order, last: result };
    if (result.ok || result.reason === "insufficient-funds") break;
  }
  return outcome;
}

const refusalOf = ({ order, last }: SubmitOutcome): OrderRefusal | undefined => (last.ok ? undefined : { order, reason: last.reason });

/** A refusal for the map's status line (FR-373): the engine's refusal, then the tile's own reason where it has one (FR-381). */
function refusalLine(state: GameState, order: Order, reason: RejectReason): string {
  const detail = refusalDetail(state, order, reason);
  return detail ? `${refusalText({ order, reason })} ${detail}` : refusalText({ order, reason });
}

const isRailOrder = (order: Order): boolean =>
  order.kind === "moveAndBuildRail" || (order.kind === "moveAndStartConstruction" && order.structure === "rail");

/**
 * The map's status line for a click (FR-373, FR-374): the refusal that ended it; or, when its job was refused and the
 * plain move that followed was accepted, both ("Rail refused: another civilian is already working that tile. The
 * engineer moved there instead (Cancel brings it back)."); nothing for a click that did what it asked. `state` is the
 * game before the click.
 */
export function clickStatusText(state: GameState, outcome: SubmitOutcome | undefined): string | undefined {
  if (!outcome) return undefined;
  const { order, last, firstRefusal } = outcome;
  if (!last.ok) return refusalLine(state, order, last.reason);
  if (!firstRefusal || order.kind !== "moveWorker") return undefined;
  const detail = refusalDetail(state, firstRefusal.order, firstRefusal.reason);
  const refused = isRailOrder(firstRefusal.order)
    ? `Rail refused: ${REFUSAL_TEXT[firstRefusal.reason]}.${detail ? ` ${detail}` : ""}`
    : refusalLine(state, firstRefusal.order, firstRefusal.reason);
  const type = findWorker(state, order.workerId)?.worker.type ?? "civilian";
  return `${refused} The ${type} moved there instead (Cancel brings it back).`;
}

/**
 * With regiments selected, a click on another country's province they do not border (FR-373, ARMY-WAR-15): "Not next to
 * Valdoria South-East: the selected regiments are in Testland North-West."; undefined for a province they border, their
 * own, or one of the player's.
 */
export function notNextToText(
  state: GameState,
  nationId: string,
  selection: { provinceId: string },
  toProvinceId: string
): string | undefined {
  const to = provinceById(state, toProvinceId);
  const from = provinceById(state, selection.provinceId);
  if (!to || !from || to.ownerId === nationId || to.id === from.id) return undefined;
  if (adjacentProvinces(state, from.id).some((p) => p.id === to.id)) return undefined;
  return `Not next to ${to.name}: the selected regiments are in ${from.name}.`;
}

/** The cursor of a click whose first accepted order is `order` (FR-379): its job's or construction's picture, or a move. */
function cursorOfOrder(order: Order, action: PossibleAction): CursorAction {
  switch (order.kind) {
    case "moveWorker":
      return { type: "move" };
    case "moveAndBuildRail":
      return { type: "construct", kind: "rail" };
    case "startProspecting":
    case "moveAndStartProspecting":
      return { type: "prospect" };
    case "startDevelopment":
    case "moveAndStartDevelopment":
      return action?.type === "develop" ? action : null;
    case "startConstruction":
    case "moveAndStartConstruction":
      return order.structure === "rail" || order.structure === "fort" ? { type: "construct", kind: order.structure } : { type: "open-construct-modal" };
    default:
      return null;
  }
}

const NO_CURSORS: ReadonlyMap<string, CursorAction> = new Map();

/**
 * Every tile's cursor while the player's civilian `workerId` is selected (FR-379, FR-380): what its click would do, the
 * same choice useTileClickHandler makes (the tile's action, Construction Options on the engineer's own tile, else
 * moveOrders), and of those orders the first the engine would accept, as submitFirstAccepted sends them: a job's or a
 * construction's picture (the rail piece where the click lays rail), `move` for a plain move, and nothing (null) where
 * the engine would take no order of the click (the sea, another country's land, a job without the money). Tiles with
 * null are left out. Empty with no civilian selected.
 */
export function clickCursors(state: GameState, nationId: string, workerId: string | undefined): ReadonlyMap<string, CursorAction> {
  const at = workerId ? findWorker(state, workerId) : undefined;
  if (!at || at.worker.nationId !== nationId) return NO_CURSORS;
  const cursors = new Map<string, CursorAction>();
  for (const tile of state.map.tiles.flat()) {
    // Another country's tile is only viewed (FR-108, FR-155)
    const country = countryOfTile(state, tile);
    if (country && country !== nationId) continue;
    const action = getPossibleAction(tile, at.worker, state.map);
    if (action?.type === "open-construct-modal" && at.worker.assignedTileId === tile.id) {
      cursors.set(tile.id, action);
      continue;
    }
    const orders = action ? tileClickOrders(state, nationId, at.worker.id, tile.id, action) : moveOrders(state, nationId, at.worker.id, tile.id);
    for (const order of orders) {
      const result = validateOrder(state, order);
      if (result.ok) {
        const cursor = cursorOfOrder(order, action);
        if (cursor) cursors.set(tile.id, cursor);
        break;
      }
      if (result.reason === "insufficient-funds") break;
    }
  }
  return cursors;
}

/**
 * Submits one order from Tile Info or Construction Options; a refusal is also said in the map's status line (FR-373),
 * where the player looks. Returns the engine's result.
 */
export function submitAndSay(order: Order): ValidationResult {
  const { game, submitOrder, showMapStatus } = useGameStore.getState();
  const result = submitOrder(order);
  if (!result.ok) showMapStatus(refusalLine(game, order, result.reason));
  return result;
}

/**
 * The spend question a click's orders need first (FR-383): when the first order, the one the click asks for, would be
 * accepted and costs $1,000 or more; undefined otherwise (a cheaper job, a plain move, or a refused job, whose refusal is
 * said instead). `selectTileId`: the tile the click selects once the player answers Spend.
 */
export function spendAskOf(state: GameState, orders: readonly Order[], selectTileId?: string): PendingSpend | undefined {
  const [order] = orders;
  if (!order || !validateOrder(state, order).ok) return undefined;
  const question = spendQuestion(state, order);
  return question ? { ...question, order, selectTileId } : undefined;
}

/**
 * Sends one order from Tile Info or Construction Options (submitAndSay), or, for one of $1,000 or more the engine would
 * accept, asks first: the ConfirmSpend dialog sends it on Spend (FR-383). `selectTileId`: Tile Info's tile, where an
 * accepted job (or Spend) ends the civilian selection, as after a job ordered by a click (FR-384, FR-449).
 */
export function submitOrAsk(order: Order, selectTileId?: string): void {
  const { game, askSpend } = useGameStore.getState();
  const ask = spendAskOf(game, [order], selectTileId);
  if (ask) askSpend(ask);
  else if (submitAndSay(order).ok && selectTileId !== undefined) {
    const { selectWorker, selectTile } = useGameStore.getState();
    selectWorker(undefined);
    selectTile(selectTileId);
  }
}
