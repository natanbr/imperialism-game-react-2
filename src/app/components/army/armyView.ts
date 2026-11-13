// What the army markers (FR-210) and the Army screen (FR-211) show, derived from the engine's army reads. No React, no
// store: the components render these views and send orders; the engine stays the judge of every order (validateOrder).
import {
  armyAt,
  armyMarkers,
  attackTargets,
  countryName,
  forceSize,
  isGameOver,
  isMilitia,
  marchTargets,
  pendingArmyOrders,
  provinceById,
  RegimentCategory,
  REGIMENTS,
  regimentStatus,
  UPKEEP_PER_ARMS,
  upkeepForecast,
  upkeepIn,
  validateOrder,
  type ArmyMarker,
  type Order,
  type RegimentType,
  type RejectReason,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import { nationColor, THEME, TILE_PX } from "@/styles/theme";
import { money, REFUSAL_TEXT, upkeepDueText, upkeepWarningText } from "../gameText";
import { namesText } from "../market/dealBookView";
import { ATTACK_ARROW_ART } from "../art/inkArt";

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
  /** FR-263, the player's own orders this turn: regiments ordered to disband here, shown as "−1" on the marker. */
  disbanding: number;
  /** FR-230: how many of its regiments the player has selected (ticked in the Army screen); 0 for none. */
  selected: number;
}

/** FR-263: what the player ordered this turn for the regiments of a marker's province. */
export interface MarkerOrders {
  marchingOut: number;
  marchingIn: number;
  /** FR-273: regiments ordered to attack out of the province. */
  attacking?: number;
  disbanding: number;
  /** FR-230: regiments of it the player has selected. */
  selected?: number;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * "Testland army: force size 4, 3 regiments, 4 militia"; "Arvelia militia: 3" when it has militia only (FR-210); with
 * this turn's orders of the player "..., 1 marching out, 1 marching in, 1 attacking, 1 to disband" (FR-263, FR-273) and
 * its selection ", 3 selected" (FR-230).
 */
export function markerLabel(marker: Pick<ArmyMarker, "forceSize" | "regiments" | "militia">, ownerName: string, orders?: MarkerOrders): string {
  const pending = orders
    ? [
        ...(orders.marchingOut > 0 ? [`${orders.marchingOut} marching out`] : []),
        ...(orders.marchingIn > 0 ? [`${orders.marchingIn} marching in`] : []),
        ...((orders.attacking ?? 0) > 0 ? [`${orders.attacking} attacking`] : []),
        ...(orders.disbanding > 0 ? [`${orders.disbanding} to disband`] : []),
        ...((orders.selected ?? 0) > 0 ? [`${orders.selected} selected`] : []),
      ]
    : [];
  if (marker.regiments === 0) return [`${ownerName} militia: ${marker.militia}`, ...pending].join(", ");
  const parts = [`force size ${marker.forceSize}`, count(marker.regiments, "regiment")];
  if (marker.militia > 0) parts.push(`${marker.militia} militia`);
  return `${ownerName} army: ${[...parts, ...pending].join(", ")}`;
}

/** A Great Power's slot colour (FR-097); one slate for every minor (FR-154). */
export const ownerColor = (state: GameState, ownerId: string): string => {
  const nation = state.nations.find((n) => n.id === ownerId);
  return nation ? nationColor(nation.colorSlot) : THEME.minor;
};

/** The regiments of the selection still Available in its province, in the army's order (FR-230). */
export function selectedRegimentIds(
  state: GameState,
  nationId: string,
  selection: { provinceId: string; regimentIds: readonly string[] } | null | undefined
): string[] {
  if (!selection) return [];
  const regiments = armyAt(state, nationId, selection.provinceId)?.regiments ?? [];
  return regiments.filter((r) => selection.regimentIds.includes(r.id) && regimentStatus(state, r.id)?.kind === "available").map((r) => r.id);
}

/**
 * The markers of each seat tile, the province's owner first (the engine's `armyMarkers` order). The player's own carry
 * this turn's march, attack and disband orders (FR-263, FR-273) and the player's selection (FR-230); another country's
 * orders are not known before End Turn.
 */
export function markersBySeat(
  state: GameState,
  playerId: string,
  selection?: { provinceId: string; regimentIds: readonly string[] } | null
): ReadonlyMap<string, MarkerView[]> {
  const pending = pendingArmyOrders(state, playerId);
  const selected = selectedRegimentIds(state, playerId, selection);
  const sum = (list: readonly { count: number }[]) => list.reduce((total, m) => total + m.count, 0);
  const ordersIn = (provinceId: string): MarkerOrders => ({
    marchingOut: sum(pending.marches.filter((m) => m.fromProvinceId === provinceId)),
    marchingIn: sum(pending.marches.filter((m) => m.toProvinceId === provinceId)),
    attacking: sum(pending.attacks.filter((m) => m.fromProvinceId === provinceId)),
    disbanding: pending.disbands[provinceId] ?? 0,
    selected: selection?.provinceId === provinceId ? selected.length : 0,
  });
  const bySeat = new Map<string, MarkerView[]>();
  for (const m of armyMarkers(state)) {
    const own = m.ownerId === playerId;
    const orders = own ? ordersIn(m.provinceId) : undefined;
    const view: MarkerView = {
      provinceId: m.provinceId,
      ownerId: m.ownerId,
      label: markerLabel(m, countryName(state, m.ownerId) ?? m.ownerId, orders),
      color: ownerColor(state, m.ownerId),
      forceSize: m.forceSize,
      regiments: m.regiments,
      militia: m.militia,
      own,
      disbanding: orders?.disbanding ?? 0,
      selected: orders?.selected ?? 0,
    };
    bySeat.set(m.seatTileId, [...(bySeat.get(m.seatTileId) ?? []), view]);
  }
  return bySeat;
}

// --- the march arrows (FR-263) ------------------------------------------------------------------

/**
 * Where the province owner's marker centre lies from its seat tile's top left corner (Tile.module.css `.armies`: the
 * chip ends 13 px into the tile, 24 px wide, 9 px down; 1 px down on a minor's capital, above its name tag). A copy of
 * the CSS: e2e/m8-armies.spec.ts measures the arrow ends against the markers as drawn (FR-271), so keep them together.
 */
const MARKER_CENTRE = { dx: 1, dy: 21, dyHigh: 13 };
/** The line stays this far from each marker's centre (a chip's half width and a little). */
const MARKER_CLEARANCE = 15;
const HEAD_LENGTH = 8;
const HEAD_HALF_WIDTH = 5;
/**
 * FR-270: marches both ways between two provinces would share one line and one count spot, so each keeps this far to
 * its own right: the two count badges (r 8, a 1.5 px outline) and arrow heads then lie side by side, apart.
 */
const OPPOSED_OFFSET = 10;

export interface MarchArrowView {
  fromProvinceId: string;
  toProvinceId: string;
  count: number;
  /** "Testland North-West: 1 regiment marching in from Testland South-West": its accessible name. */
  label: string;
  /** FR-273 (replaces FR-263's nation colour): the art pack's movement green, and its dark ink for the outline. */
  color: string;
  ink: string;
  /** In map pixels: the dashed line, from the source marker to the arrow head's base. */
  line: { x1: number; y1: number; x2: number; y2: number };
  /** The arrow head, "x,y x,y x,y", its tip at the destination marker. */
  head: string;
  /** Where the count sits: the middle of the arrow. */
  countAt: { x: number; y: number };
}

/** FR-263, FR-270: the line between the two marker centres, cut short at each marker, moved `offset` px to its right. */
function arrowPoints(a: { x: number; y: number }, b: { x: number; y: number }, offset: number) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length <= 2 * MARKER_CLEARANCE + HEAD_LENGTH) return undefined;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  // On screen (y down) the right of the way (ux, uy) is (-uy, ux)
  const right = { x: -uy * offset, y: ux * offset };
  const start = { x: a.x + ux * MARKER_CLEARANCE + right.x, y: a.y + uy * MARKER_CLEARANCE + right.y };
  const tip = { x: b.x - ux * MARKER_CLEARANCE + right.x, y: b.y - uy * MARKER_CLEARANCE + right.y };
  const base = { x: tip.x - ux * HEAD_LENGTH, y: tip.y - uy * HEAD_LENGTH };
  const side = { x: -uy * HEAD_HALF_WIDTH, y: ux * HEAD_HALF_WIDTH };
  return { start, tip, base, side };
}

/** The marker centre of a seat tile in map pixels (odd rows shifted half a tile, as MapView draws them). */
function markerCentre(state: GameState, seatTileId: string): { x: number; y: number } | undefined {
  const tile = state.map.tiles.flat().find((t) => t.id === seatTileId);
  if (!tile) return undefined;
  const high = state.minorNations.some((m) => m.capitalTileId === seatTileId);
  return {
    x: tile.x * TILE_PX + (tile.y % 2 === 1 ? TILE_PX / 2 : 0) + MARKER_CENTRE.dx,
    y: tile.y * TILE_PX + (high ? MARKER_CENTRE.dyHigh : MARKER_CENTRE.dy),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * One arrow per pair of provinces the player ordered regiments to march between this turn (FR-263); marches both ways
 * between two provinces each keep to their own right (FR-270).
 */
export function marchArrows(state: GameState, playerId: string): MarchArrowView[] {
  const { marches } = pendingArmyOrders(state, playerId);
  return marches.flatMap((m): MarchArrowView[] => {
    const from = provinceById(state, m.fromProvinceId);
    const to = provinceById(state, m.toProvinceId);
    const a = from && markerCentre(state, from.seatTileId);
    const b = to && markerCentre(state, to.seatTileId);
    if (!from || !to || !a || !b) return [];
    const opposed = marches.some((o) => o.fromProvinceId === m.toProvinceId && o.toProvinceId === m.fromProvinceId);
    const points = arrowPoints(a, b, opposed ? OPPOSED_OFFSET : 0);
    if (!points) return [];
    const { start, tip, base, side } = points;
    const point = (p: { x: number; y: number }) => `${round1(p.x)},${round1(p.y)}`;
    return [
      {
        fromProvinceId: m.fromProvinceId,
        toProvinceId: m.toProvinceId,
        count: m.count,
        label: `${to.name}: ${count(m.count, "regiment")} marching in from ${from.name}`,
        color: THEME.armyMove,
        ink: THEME.armyMoveInk,
        line: { x1: round1(start.x), y1: round1(start.y), x2: round1(base.x), y2: round1(base.y) },
        head: [tip, { x: base.x + side.x, y: base.y + side.y }, { x: base.x - side.x, y: base.y - side.y }].map(point).join(" "),
        countAt: { x: round1((start.x + tip.x) / 2), y: round1((start.y + tip.y) / 2) },
      },
    ];
  });
}

// --- the attack arrows (FR-273) -----------------------------------------------------------------

export interface AttackArrowView {
  fromProvinceId: string;
  toProvinceId: string;
  count: number;
  /** "Arvelia: 3 regiments attacking from Testland North-East": its accessible name. */
  label: string;
  /** The art pack's red arrow (map-ui/army-attack.svg), drawn in its own 120 x 56 units. */
  href: string;
  width: number;
  height: number;
  /**
   * The SVG matrix (a b c d e f) from the arrow file's units to map pixels: one scale and one turn, so the arrow keeps
   * the pack's proportions, with its tail's middle 15 px on from the source marker's centre and its tip 15 px short of
   * the target's (as a march arrow's ends, FR-271).
   */
  matrix: [number, number, number, number, number, number];
  /** Where the count sits: the middle of the arrow's body. */
  countAt: { x: number; y: number };
}

/** The middle of the attack arrow's body, in the file's units (between its two curved edges, halfway along). */
const ATTACK_ARROW_MIDDLE = { x: 58, y: 38 };

/** One red arrow per pair of provinces the player ordered an attack between this turn (FR-273). */
export function attackArrows(state: GameState, playerId: string): AttackArrowView[] {
  const { attacks } = pendingArmyOrders(state, playerId);
  const { tail, tip, url, width, height } = ATTACK_ARROW_ART;
  const artAngle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
  const artLength = Math.hypot(tip.x - tail.x, tip.y - tail.y);
  return attacks.flatMap((m): AttackArrowView[] => {
    const from = provinceById(state, m.fromProvinceId);
    const to = provinceById(state, m.toProvinceId);
    const a = from && markerCentre(state, from.seatTileId);
    const b = to && markerCentre(state, to.seatTileId);
    const points = a && b ? arrowPoints(a, b, 0) : undefined;
    if (!from || !to || !points) return [];
    const { start, tip: end } = points;
    const scale = Math.hypot(end.x - start.x, end.y - start.y) / artLength;
    const turn = Math.atan2(end.y - start.y, end.x - start.x) - artAngle;
    const [ma, mb] = [scale * Math.cos(turn), scale * Math.sin(turn)];
    const [mc, md] = [-mb, ma];
    const matrix: AttackArrowView["matrix"] = [ma, mb, mc, md, start.x - (ma * tail.x + mc * tail.y), start.y - (mb * tail.x + md * tail.y)];
    const at = (p: { x: number; y: number }) => ({ x: round1(ma * p.x + mc * p.y + matrix[4]), y: round1(mb * p.x + md * p.y + matrix[5]) });
    return [
      {
        fromProvinceId: m.fromProvinceId,
        toProvinceId: m.toProvinceId,
        count: m.count,
        label: `${to.name}: ${count(m.count, "regiment")} attacking from ${from.name}`,
        href: url,
        width,
        height,
        matrix,
        countAt: at(ATTACK_ARROW_MIDDLE),
      },
    ];
  });
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

/**
 * Why a control is disabled before the engine is asked: no regiment here can be ticked (militia only, or every regiment
 * already marching or to be disbanded; review F1), nowhere to go, nothing ticked.
 */
export const ARMY_REASON = {
  militiaStay: "Militia defend their province: they cannot march or be disbanded.",
  allOrdered: "Every regiment here already has an order this turn.",
  tickToMarch: "Tick the regiments to march first.",
  tickToDisband: "Tick the regiments to disband first.",
  noTarget: "No province of ours borders this one.",
  tickToAttack: "Tick the regiments to attack with first.",
} as const;

/** Why no regiment of the nation's army in the province can be ticked, or undefined when one can (FR-211, review F1). */
function noneToTick(state: GameState, nationId: string, provinceId: string): string | undefined {
  const regiments = armyAt(state, nationId, provinceId)?.regiments ?? [];
  if (regiments.some((r) => regimentStatus(state, r.id)?.kind === "available")) return undefined;
  return regiments.some((r) => !isMilitia(r.type)) ? ARMY_REASON.allOrdered : ARMY_REASON.militiaStay;
}

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
  /** Its type: the picture beside its name (FR-272). */
  type: RegimentType;
  /** "Regular Infantry", "Militia" */
  category: string;
  /** ARMS: its armaments cost, its force size and upkeep (FR-202, FR-204); 0 for militia. */
  arms: number;
  health: number;
  /** "Defending", "Available", "Marching to Testland North-East", "Attacking Arvelia" (FR-230), "Disband ordered" */
  status: string;
  /** Available: it may be ticked to march or to disband. */
  selectable: boolean;
  /**
   * Marching: its "Cancel march"; attacking: its "Cancel attack" (both `cancelArmyMove`, FR-230); disband ordered: its
   * "Cancel disband" (`cancelDisband`, review F4).
   */
  cancel?: ArmyControl & { label: "Cancel march" | "Cancel attack" | "Cancel disband" };
}

export interface ArmyView {
  provinceName: string;
  /** "Army in Testland South-West": the dialog's name. */
  title: string;
  forceSize: number;
  /** "Upkeep here: $100 a turn" (FR-266): the regiments in this province, $0 for militia only. */
  upkeepHere: string;
  /** "Army upkeep at End Turn: $100 for all provinces" (FR-261, FR-266): the whole army's. */
  upkeep: string;
  /** FR-265: "Arms: armaments per regiment; ...", under the table and the Arms column head's description. */
  armsLegend: string;
  /** FR-267: the army here is militia only, so no regiment can ever march or be disbanded: no controls, one line why. */
  militiaOnly: boolean;
  /** FR-261: the cash End Turn will find is below the upkeep (`upkeepWarningText`); absent otherwise. */
  upkeepWarning?: string;
  /** The regiments that may march first, then the militia, each group by id (the army's order). */
  rows: RegimentRowView[];
  /**
   * "March to": the bordering provinces of ours, in state order, then the bordering provinces of other countries as
   * "Attack Arvelia" (FR-230), at war or not: the Attack screen says when no attack can be ordered yet.
   */
  targets: ArmyTarget[];
}

/** One entry of "March to": a march into a province of ours, or an attack on another country's (FR-230). */
export interface ArmyTarget {
  id: string;
  name: string;
  kind: "march" | "attack";
  /** The option's text: "Testland North-East", "Attack Arvelia". */
  text: string;
}

const provinceName = (state: GameState, provinceId: string) => provinceById(state, provinceId)?.name ?? provinceId;

/** FR-265: what the Arms column holds (FR-199 ARMS, FR-202 upkeep, FR-204 force size). */
export const ARMS_LEGEND = `Arms: armaments per regiment; each costs ${money(UPKEEP_PER_ARMS)} a turn and counts toward force size`;

export function armyView(state: GameState, nationId: string, provinceId: string): ArmyView {
  const army = armyAt(state, nationId, provinceId);
  const regiments = army ? [...army.regiments.filter((r) => !isMilitia(r.type)), ...army.regiments.filter((r) => isMilitia(r.type))] : [];
  const rows = regiments.map((r): RegimentRowView => {
    const def = REGIMENTS[r.type];
    const status = regimentStatus(state, r.id);
    const base = { id: r.id, name: r.name, type: r.type, category: CATEGORY_TEXT[def.category], arms: def.stats.armamentsCost, health: r.health };
    switch (status?.kind) {
      case "available":
        return { ...base, status: "Available", selectable: true };
      case "marching":
        return {
          ...base,
          status: `Marching to ${provinceName(state, status.toProvinceId)}`,
          selectable: false,
          cancel: { ...control(state, { kind: "cancelArmyMove", nationId, regimentIds: [r.id] }), label: "Cancel march" },
        };
      case "attacking":
        return {
          ...base,
          status: `Attacking ${provinceName(state, status.toProvinceId)}`,
          selectable: false,
          cancel: { ...control(state, { kind: "cancelArmyMove", nationId, regimentIds: [r.id] }), label: "Cancel attack" },
        };
      case "disband-ordered":
        return {
          ...base,
          status: "Disband ordered",
          selectable: false,
          cancel: { ...control(state, { kind: "cancelDisband", nationId, regimentIds: [r.id] }), label: "Cancel disband" },
        };
      default:
        return { ...base, status: "Defending", selectable: false };
    }
  });
  const name = provinceName(state, provinceId);
  const forecast = upkeepForecast(state, nationId);
  const warning = upkeepWarningText(forecast);
  return {
    provinceName: name,
    title: `Army in ${name}`,
    forceSize: army ? forceSize(army) : 0,
    upkeepHere: `Upkeep here: ${money(upkeepIn(state, nationId, provinceId))} a turn`,
    upkeep: `${upkeepDueText(forecast)} for all provinces`,
    armsLegend: ARMS_LEGEND,
    militiaOnly: regiments.length > 0 && regiments.every((r) => isMilitia(r.type)),
    ...(warning ? { upkeepWarning: warning } : {}),
    rows,
    targets: [
      ...marchTargets(state, nationId, provinceId).map((p): ArmyTarget => ({ id: p.id, name: p.name, kind: "march", text: p.name })),
      ...attackTargets(state, nationId, provinceId).map((p): ArmyTarget => ({ id: p.id, name: p.name, kind: "attack", text: `Attack ${p.name}` })),
    ],
  };
}

/**
 * "March": the ticked regiments to the chosen province (`moveArmy`). Game over first, then no regiment that can be
 * ticked, then nowhere to go, then nothing ticked.
 */
export function marchControl(state: GameState, nationId: string, fromProvinceId: string, regimentIds: readonly string[], toProvinceId: string | undefined): ArmyControl {
  const order: Order = { kind: "moveArmy", nationId, fromProvinceId, regimentIds: [...regimentIds], toProvinceId: toProvinceId ?? "" };
  const result = validateOrder(state, order);
  if (result.ok) return { order };
  if (result.reason !== "game-over") {
    const none = noneToTick(state, nationId, fromProvinceId);
    if (none) return { order, refusal: none };
    if (!toProvinceId) return { order, refusal: ARMY_REASON.noTarget };
    if (regimentIds.length === 0) return { order, refusal: ARMY_REASON.tickToMarch };
  }
  return { order, refusal: refusalSentence(result.reason) };
}

/**
 * "Attack…" beside "March to" (FR-230): opens the Attack screen for the ticked regiments. Not refused for want of a war:
 * the Attack screen says so and offers no Attack. Game over first, then no regiment that can be ticked, then nothing ticked.
 */
export function attackScreenControl(state: GameState, nationId: string, fromProvinceId: string, regimentIds: readonly string[], toProvinceId: string): ArmyControl {
  const order: Order = { kind: "moveArmy", nationId, fromProvinceId, regimentIds: [...regimentIds], toProvinceId };
  if (isGameOver(state)) return { order, refusal: refusalSentence("game-over") };
  const none = noneToTick(state, nationId, fromProvinceId);
  if (none) return { order, refusal: none };
  if (regimentIds.length === 0) return { order, refusal: ARMY_REASON.tickToAttack };
  return { order };
}

/** "Disband": the ticked regiments (`disbandRegiments`). Game over first, then no regiment that can be ticked, then nothing ticked. */
export function disbandControl(state: GameState, nationId: string, provinceId: string, regimentIds: readonly string[]): ArmyControl {
  const order: Order = { kind: "disbandRegiments", nationId, provinceId, regimentIds: [...regimentIds] };
  const result = validateOrder(state, order);
  if (result.ok) return { order };
  if (result.reason !== "game-over") {
    const none = noneToTick(state, nationId, provinceId);
    if (none) return { order, refusal: none };
    if (regimentIds.length === 0) return { order, refusal: ARMY_REASON.tickToDisband };
  }
  return { order, refusal: refusalSentence(result.reason) };
}

/** "Disband 2nd Regulars and 1st Artillery? They leave at End Turn; no money, armaments or workers come back." (FR-207) */
export const disbandQuestion = (names: readonly string[]): string =>
  `Disband ${namesText(names)}? They leave at End Turn; no money, armaments or workers come back.`;
