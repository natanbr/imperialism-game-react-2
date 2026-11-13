// Army orders (FR-200, FR-205, FR-207): recruiting is paid when ordered (like `setProduction`); a march or a disband
// stores an army intent (FR-152) that the turn resolves (FR-206, FR-207). A regiment has at most one army intent: a later
// march or disband for it replaces the earlier one. Validation reads the state; apply returns a new one.
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { ArmyIntent } from "@/types/Intent";
import { GoodsType, ResourceType } from "@/types/Resource";
import { isMilitia, isRegimentType, RECRUITABLE_REGIMENTS, REGIMENTS } from "@/definisions/regiments";
import { capitalProvinceOf, findRegiment, freeWorkersOf, isArmyIntent, recruitingOf, withRecruiting } from "../army/armies";
import { warActive } from "../diplomacy/queries";
import { adjacentProvinces, provinceById } from "../world/provinces";
import { addIntent } from "../turn/intents";
import type {
  ArmyOrder,
  CancelArmyMoveOrder,
  CancelDisbandOrder,
  DisbandRegimentsOrder,
  MoveArmyOrder,
  RejectReason,
  SetRecruitmentOrder,
  ValidationResult,
} from "./Order";

const OK: ValidationResult = { ok: true };
const reject = (reason: RejectReason): ValidationResult => ({ ok: false, reason });
const isWholeNumber = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);
type Stock = Record<string, number>;

export function validateArmyOrder(state: GameState, nation: Nation, order: ArmyOrder): ValidationResult {
  switch (order.kind) {
    case "setRecruitment":
      return validateRecruitment(state, nation, order);
    case "moveArmy":
      return validateMove(state, order);
    case "cancelArmyMove":
      return validateCancel(state, order, "army-move");
    case "disbandRegiments":
      return validateDisband(state, order);
    case "cancelDisband":
      return validateCancel(state, order, "disband");
  }
}

// --- recruiting (FR-200) -------------------------------------------------------------------

function validateRecruitment(state: GameState, nation: Nation, order: SetRecruitmentOrder): ValidationResult {
  if (state.provinces.length === 0) return reject("invalid-target");
  if (!isRegimentType(order.regiment) || !RECRUITABLE_REGIMENTS.includes(order.regiment)) return reject("invalid-target");
  // FR-200: recruits join in the capital province (FR-201), so none is ordered while another country holds it
  if (capitalProvinceOf(state, nation.id)?.ownerId !== nation.id) return reject("invalid-target");
  const { count } = order;
  if (!isWholeNumber(count) || count < 0) return reject("invalid-amount");
  const more = count - recruitingOf(nation, order.regiment);
  if (more <= 0) return OK; // lowering gives everything back
  const def = REGIMENTS[order.regiment];
  if ((nation.treasury ?? 0) < more * def.cash) return reject("insufficient-funds");
  const stock = nation.warehouse as Stock;
  if ((stock[GoodsType.Armaments] ?? 0) < more * def.stats.armamentsCost || (stock[ResourceType.Horses] ?? 0) < more * def.horses) {
    return reject("insufficient-resources");
  }
  return def.worker && freeWorkersOf(nation, def.worker) >= more ? OK : reject("insufficient-labour");
}

/** Pays the difference to this turn's count now, or gives it back (FR-200). */
function applyRecruitment(state: GameState, order: SetRecruitmentOrder): GameState {
  return { ...state, nations: state.nations.map((nation) => (nation.id === order.nationId ? withRecruiting(nation, order.regiment, order.count) : nation)) };
}

// --- marches and disbands (FR-205, FR-207) ------------------------------------------------------

/** At least one regiment, none named twice. */
function checkList(ids: unknown): ValidationResult {
  if (!Array.isArray(ids) || ids.length === 0) return reject("invalid-amount");
  return new Set(ids).size === ids.length ? OK : reject("invalid-amount");
}

/** Each regiment is the nation's, in its army in the province, and not militia (Imp1: militia cannot move). */
function checkOwnRegiments(state: GameState, nationId: NationId, provinceId: ProvinceId, ids: readonly RegimentId[]): ValidationResult {
  if (!provinceById(state, provinceId)) return reject("invalid-target");
  for (const id of ids) {
    const found = findRegiment(state, id);
    if (!found) return reject("invalid-target");
    if (found.army.ownerId !== nationId) return reject("not-owner");
    if (found.army.provinceId !== provinceId || isMilitia(found.regiment.type)) return reject("invalid-target");
  }
  return OK;
}

function validateMove(state: GameState, order: MoveArmyOrder): ValidationResult {
  const list = checkList(order.regimentIds);
  if (!list.ok) return list;
  const own = checkOwnRegiments(state, order.nationId, order.fromProvinceId, order.regimentIds);
  if (!own.ok) return own;
  const to = provinceById(state, order.toProvinceId);
  if (!to) return reject("invalid-target");
  if (!adjacentProvinces(state, order.fromProvinceId).some((p) => p.id === to.id)) return reject("not-adjacent");
  if (to.ownerId === order.nationId) return OK;
  // FR-205: into another country's province only with a war active this turn (FR-167); that move is an attack, which
  // M9 builds (FR-216). Until then it is refused with its own reason (review R7, F5).
  return reject(warActive(state, order.nationId, to.ownerId) ? "attack-not-available" : "not-at-war");
}

/** `cancelArmyMove` (FR-205) and `cancelDisband` (FR-207): each regiment is the nation's and has an intent of that kind this turn. */
function validateCancel(state: GameState, order: CancelArmyMoveOrder | CancelDisbandOrder, kind: ArmyIntent["kind"]): ValidationResult {
  const list = checkList(order.regimentIds);
  if (!list.ok) return list;
  for (const id of order.regimentIds) {
    const found = findRegiment(state, id);
    if (!found) return reject("invalid-target");
    if (found.army.ownerId !== order.nationId) return reject("not-owner");
    if (!state.intents.some((i) => isArmyIntent(i) && i.kind === kind && i.nationId === order.nationId && i.regimentIds.includes(id))) {
      return reject("invalid-target");
    }
  }
  return OK;
}

function validateDisband(state: GameState, order: DisbandRegimentsOrder): ValidationResult {
  const list = checkList(order.regimentIds);
  if (!list.ok) return list;
  return checkOwnRegiments(state, order.nationId, order.provinceId, order.regimentIds);
}

/**
 * This turn's army intents of the nation without these regiments (only the intents of `kind` when given); an intent
 * left without regiments is dropped. The same state when none names them.
 */
function withoutRegiments(state: GameState, nationId: NationId, ids: readonly RegimentId[], kind?: ArmyIntent["kind"]): GameState {
  const drop = new Set(ids);
  const touches = (i: GameState["intents"][number]): i is ArmyIntent =>
    isArmyIntent(i) && i.nationId === nationId && (kind === undefined || i.kind === kind) && i.regimentIds.some((id) => drop.has(id));
  if (!state.intents.some(touches)) return state;
  const intents = state.intents.flatMap((i) => {
    if (!touches(i)) return [i];
    const left = i.regimentIds.filter((id) => !drop.has(id));
    return left.length > 0 ? [{ ...i, regimentIds: left }] : [];
  });
  return { ...state, intents };
}

export function applyArmyOrder(state: GameState, order: ArmyOrder): GameState {
  switch (order.kind) {
    case "setRecruitment":
      return applyRecruitment(state, order);
    case "moveArmy": {
      const { nationId, fromProvinceId, toProvinceId, regimentIds } = order;
      return addIntent(withoutRegiments(state, nationId, regimentIds), { kind: "army-move", nationId, fromProvinceId, toProvinceId, regimentIds: [...regimentIds] });
    }
    case "cancelArmyMove":
      return withoutRegiments(state, order.nationId, order.regimentIds, "army-move");
    case "disbandRegiments": {
      const { nationId, provinceId, regimentIds } = order;
      return addIntent(withoutRegiments(state, nationId, regimentIds), { kind: "disband", nationId, provinceId, regimentIds: [...regimentIds] });
    }
    case "cancelDisband":
      return withoutRegiments(state, order.nationId, order.regimentIds, "disband");
  }
}
