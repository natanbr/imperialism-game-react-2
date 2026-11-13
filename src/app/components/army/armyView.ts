// What the army markers (FR-210) and the Army screen (FR-211) show, derived from the engine's army reads. No React, no
// store: the components render these views and send orders; the engine stays the judge of every order (validateOrder).
import {
  armyAt,
  armyMarkers,
  countryName,
  forceSize,
  isMilitia,
  marchTargets,
  provinceById,
  RegimentCategory,
  REGIMENTS,
  regimentStatus,
  validateOrder,
  type ArmyMarker,
  type Order,
  type RejectReason,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import { nationColor, THEME } from "@/styles/theme";
import { REFUSAL_TEXT } from "../gameText";
import { namesText } from "../market/dealBookView";

// --- the map markers (FR-210) ------------------------------------------------------------------

export interface MarkerView {
  provinceId: string;
  ownerId: string;
  /** "Testland army: force size 4, 3 regiments, 4 militia", "Arvelia militia: 3": its accessible name and title. */
  label: string;
  /** The owner's colour: a Great Power's slot colour, --color-minor for a minor. */
  color: string;
  forceSize: number;
  /** Its non-militia regiments. */
  regiments: number;
  militia: number;
  /** The player's own: a button that opens the Army screen (FR-211); any other is an image. */
  own: boolean;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Testland army: force size 4, 3 regiments, 4 militia"; "Arvelia militia: 3" when it has militia only (FR-210). */
export function markerLabel(marker: Pick<ArmyMarker, "forceSize" | "regiments" | "militia">, ownerName: string): string {
  if (marker.regiments === 0) return `${ownerName} militia: ${marker.militia}`;
  const parts = [`force size ${marker.forceSize}`, count(marker.regiments, "regiment")];
  if (marker.militia > 0) parts.push(`${marker.militia} militia`);
  return `${ownerName} army: ${parts.join(", ")}`;
}

/** A Great Power's slot colour (FR-097); one slate for every minor (FR-154). */
export const ownerColor = (state: GameState, ownerId: string): string => {
  const nation = state.nations.find((n) => n.id === ownerId);
  return nation ? nationColor(nation.colorSlot) : THEME.minor;
};

/** The markers of each seat tile, the province's owner first (the engine's `armyMarkers` order). */
export function markersBySeat(state: GameState, playerId: string): ReadonlyMap<string, MarkerView[]> {
  const bySeat = new Map<string, MarkerView[]>();
  for (const m of armyMarkers(state)) {
    const view: MarkerView = {
      provinceId: m.provinceId,
      ownerId: m.ownerId,
      label: markerLabel(m, countryName(state, m.ownerId) ?? m.ownerId),
      color: ownerColor(state, m.ownerId),
      forceSize: m.forceSize,
      regiments: m.regiments,
      militia: m.militia,
      own: m.ownerId === playerId,
    };
    bySeat.set(m.seatTileId, [...(bySeat.get(m.seatTileId) ?? []), view]);
  }
  return bySeat;
}

// --- the Army screen (FR-211) ----------------------------------------------------------------

/** The Imp1 category names (rules 08 section 1). */
export const CATEGORY_TEXT: Record<RegimentCategory, string> = {
  [RegimentCategory.Militia]: "Militia",
  [RegimentCategory.LightInfantry]: "Light Infantry",
  [RegimentCategory.RegularInfantry]: "Regular Infantry",
  [RegimentCategory.HeavyInfantry]: "Heavy Infantry",
  [RegimentCategory.LightCavalry]: "Light Cavalry",
  [RegimentCategory.HeavyCavalry]: "Heavy Cavalry",
  [RegimentCategory.LightArtillery]: "Light Artillery",
  [RegimentCategory.HeavyArtillery]: "Heavy Artillery",
  [RegimentCategory.CombatEngineers]: "Combat Engineers",
};

/** Why a control is disabled before the engine is asked: nothing ticked, nowhere to go. */
export const ARMY_REASON = {
  tickToMarch: "Tick the regiments to march first.",
  tickToDisband: "Tick the regiments to disband first.",
  noTarget: "No province of ours borders this one.",
} as const;

/** An engine refusal as a sentence: "The game is over." */
export const refusalSentence = (reason: RejectReason): string => {
  const words = REFUSAL_TEXT[reason];
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
};

/** One order a control would send, and why `validateOrder` refuses it now (absent: the control is enabled). */
export interface ArmyControl {
  order: Order;
  refusal?: string;
}

const control = (state: GameState, order: Order): ArmyControl => {
  const result = validateOrder(state, order);
  return result.ok ? { order } : { order, refusal: refusalSentence(result.reason) };
};

export interface RegimentRowView {
  id: string;
  name: string;
  /** "Regular Infantry", "Militia" */
  category: string;
  /** ARMS: its armaments cost, its force size and upkeep (FR-202, FR-204); 0 for militia. */
  arms: number;
  health: number;
  /** "Defending", "Available", "Marching to Testland North-East", "Disband ordered" */
  status: string;
  /** Available: it may be ticked to march or to disband. */
  selectable: boolean;
  /** Marching: its "Cancel march" (`cancelArmyMove`). */
  cancel?: ArmyControl;
}

export interface ArmyView {
  provinceName: string;
  /** "Army in Testland South-West": the dialog's name. */
  title: string;
  forceSize: number;
  /** The regiments that may march first, then the militia, each group by id (the army's order). */
  rows: RegimentRowView[];
  /** "March to": the bordering provinces of ours, in state order (M8; attacks come with M9). */
  targets: { id: string; name: string }[];
}

const provinceName = (state: GameState, provinceId: string) => provinceById(state, provinceId)?.name ?? provinceId;

export function armyView(state: GameState, nationId: string, provinceId: string): ArmyView {
  const army = armyAt(state, nationId, provinceId);
  const regiments = army ? [...army.regiments.filter((r) => !isMilitia(r.type)), ...army.regiments.filter((r) => isMilitia(r.type))] : [];
  const rows = regiments.map((r): RegimentRowView => {
    const def = REGIMENTS[r.type];
    const status = regimentStatus(state, r.id);
    const base = { id: r.id, name: r.name, category: CATEGORY_TEXT[def.category], arms: def.stats.armamentsCost, health: r.health };
    switch (status?.kind) {
      case "available":
        return { ...base, status: "Available", selectable: true };
      case "marching":
        return {
          ...base,
          status: `Marching to ${provinceName(state, status.toProvinceId)}`,
          selectable: false,
          cancel: control(state, { kind: "cancelArmyMove", nationId, regimentIds: [r.id] }),
        };
      case "disband-ordered":
        return { ...base, status: "Disband ordered", selectable: false };
      default:
        return { ...base, status: "Defending", selectable: false };
    }
  });
  const name = provinceName(state, provinceId);
  return {
    provinceName: name,
    title: `Army in ${name}`,
    forceSize: army ? forceSize(army) : 0,
    rows,
    targets: marchTargets(state, nationId, provinceId).map((p) => ({ id: p.id, name: p.name })),
  };
}

/** "March": the ticked regiments to the chosen province (`moveArmy`). Game over first, then nowhere to go, then nothing ticked. */
export function marchControl(state: GameState, nationId: string, fromProvinceId: string, regimentIds: readonly string[], toProvinceId: string | undefined): ArmyControl {
  const order: Order = { kind: "moveArmy", nationId, fromProvinceId, regimentIds: [...regimentIds], toProvinceId: toProvinceId ?? "" };
  const result = validateOrder(state, order);
  if (result.ok) return { order };
  if (result.reason !== "game-over") {
    if (!toProvinceId) return { order, refusal: ARMY_REASON.noTarget };
    if (regimentIds.length === 0) return { order, refusal: ARMY_REASON.tickToMarch };
  }
  return { order, refusal: refusalSentence(result.reason) };
}

/** "Disband": the ticked regiments (`disbandRegiments`). */
export function disbandControl(state: GameState, nationId: string, provinceId: string, regimentIds: readonly string[]): ArmyControl {
  const order: Order = { kind: "disbandRegiments", nationId, provinceId, regimentIds: [...regimentIds] };
  const result = validateOrder(state, order);
  if (result.ok) return { order };
  if (result.reason !== "game-over" && regimentIds.length === 0) return { order, refusal: ARMY_REASON.tickToDisband };
  return { order, refusal: refusalSentence(result.reason) };
}

/** "Disband 2nd Regulars and 1st Artillery? They leave at End Turn; no money, armaments or workers come back." (FR-207) */
export const disbandQuestion = (names: readonly string[]): string =>
  `Disband ${namesText(names)}? They leave at End Turn; no money, armaments or workers come back.`;
