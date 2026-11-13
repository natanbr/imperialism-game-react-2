// What the Armoury (FR-212) shows, derived from the regiment table (FR-199) and the engine's recruiting reads (FR-200).
// No React, no store: the dialog renders this view and sends `setRecruitment`; the engine stays the judge of every order.
import {
  beforeRecruiting,
  entrenches,
  freeWorkersOf,
  RECRUITABLE_REGIMENTS,
  recruitingOf,
  REGIMENTS,
  upkeepForecast,
  validateOrder,
  type RegimentType,
  type RejectReason,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import type { WorkerGrade } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { GoodsType, ResourceType } from "@/types/Resource";
import { money, REFUSAL_TEXT, upkeepDueText, upkeepWarningText } from "../gameText";
import { CATEGORY_TEXT } from "./armyView";

/** One thing a regiment costs, or the nation has at hand: a worker of its grade, armaments, horses, cash. */
export type ArmouryItemKey = "worker" | "armaments" | "horses" | "cash";

export interface ArmouryItem {
  key: ArmouryItemKey;
  /** "1 untrained worker", "1 armament", "2 armaments", "1 horse", "$500" */
  text: string;
}

/**
 * One line of "At hand" (FR-264): the item before this turn's recruit orders and what they reserve, as
 * "Armaments: 1 in warehouse, 1 reserved by this order". `parts` keep each amount whole when the line wraps.
 */
export interface AtHandItem extends ArmouryItem {
  /** "Untrained workers", "Armaments", "Horses", "Cash" */
  label: string;
  /** "1 in warehouse", then "1 reserved by this order" and "1 reserved by other recruits" when they hold any. */
  parts: string[];
  /**
   * None of this type is ordered this turn and what is left cannot pay one: marked "short" in text and colour. A
   * recruit that worked never reads short; the "+" note says what stops the next one (FR-212, FR-264).
   */
  short: boolean;
}

export interface ArmouryCardView {
  type: RegimentType;
  /** "Regulars": the card's name. */
  name: string;
  /** "Regular Infantry" */
  category: string;
  firepower: number;
  move: number;
  range: number;
  entrench: boolean;
  cost: ArmouryItem[];
  atHand: AtHandItem[];
  /** Ordered this turn. */
  count: number;
  /** Why one more would be refused (validateOrder), in words; absent when "+" is enabled. */
  moreRefusal?: string;
}

export interface ArmouryView {
  treasury: number;
  /** "Army upkeep at End Turn: $100" (FR-261); this turn's recruits pay from next turn. */
  upkeep: string;
  /** FR-261: the cash End Turn will find is below the upkeep; absent otherwise. */
  upkeepWarning?: string;
  cards: ArmouryCardView[];
}

const workers = (n: number, grade: WorkerGrade) => `${n} ${grade} worker${n === 1 ? "" : "s"}`;
const armaments = (n: number) => `${n} armament${n === 1 ? "" : "s"}`;
const horses = (n: number) => `${n} horse${n === 1 ? "" : "s"}`;
const capitalized = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

/** What this turn's recruit orders hold of each item: one worker of the grade, the arms, horses and cash of each. */
interface Reserved {
  worker: number;
  armaments: number;
  horses: number;
  cash: number;
}

const reservedBy = (nation: Nation, type: RegimentType): Reserved => {
  const def = REGIMENTS[type];
  const n = recruitingOf(nation, type);
  return { worker: n, armaments: n * def.stats.armamentsCost, horses: n * def.horses, cash: n * def.cash };
};

/** ", 1 reserved by this order", ", 1 reserved by other recruits": only the ones that hold any. */
const reservedParts = (own: number, others: number, amount: (n: number) => string): string[] => [
  ...(own > 0 ? [`${amount(own)} reserved by this order`] : []),
  ...(others > 0 ? [`${amount(others)} reserved by other recruits`] : []),
];

function atHandItem(key: ArmouryItemKey, label: string, first: string, own: number, others: number, amount: (n: number) => string, short: boolean): AtHandItem {
  const parts = [first, ...reservedParts(own, others, amount)];
  return { key, label, parts, text: `${label}: ${parts.join(", ")}`, short };
}

/** "+" disabled (FR-212): the engine's reason, named for the thing that is short. */
function moreRefusalText(reason: RejectReason, nation: Nation, type: RegimentType): string {
  const def = REGIMENTS[type];
  switch (reason) {
    case "insufficient-funds":
      return "Not enough money";
    case "insufficient-resources":
      return (nation.warehouse[GoodsType.Armaments] ?? 0) < def.stats.armamentsCost ? "Not enough armaments" : "Not enough horses";
    case "insufficient-labour":
      return `No free ${def.worker ?? "untrained"} worker`;
    default: {
      const words = REFUSAL_TEXT[reason];
      return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
    }
  }
}

export function armouryView(state: GameState, nation: Nation): ArmouryView {
  const stock = (key: GoodsType | ResourceType) => nation.warehouse[key] ?? 0;
  // FR-264: "in warehouse" is before this turn's recruit orders; each card names what its own order and the others hold
  const before = beforeRecruiting(nation);
  const stockBefore = (key: GoodsType | ResourceType) => before.warehouse[key] ?? 0;
  const reserved = new Map(RECRUITABLE_REGIMENTS.map((type) => [type, reservedBy(nation, type)]));
  const cards = RECRUITABLE_REGIMENTS.map((type): ArmouryCardView => {
    const def = REGIMENTS[type];
    const grade = def.worker ?? "untrained";
    const free = freeWorkersOf(nation, grade);
    const arms = def.stats.armamentsCost;
    const count = recruitingOf(nation, type);
    const cost: ArmouryItem[] = [
      { key: "worker", text: workers(1, grade) },
      { key: "armaments", text: armaments(arms) },
      ...(def.horses > 0 ? [{ key: "horses" as const, text: horses(def.horses) }] : []),
      { key: "cash", text: money(def.cash) },
    ];
    const own = reserved.get(type)!;
    const others = RECRUITABLE_REGIMENTS.filter((t) => t !== type).reduce(
      (sum, t): Reserved => {
        const r = reserved.get(t)!;
        const sameGrade = (REGIMENTS[t].worker ?? "untrained") === grade;
        return { worker: sum.worker + (sameGrade ? r.worker : 0), armaments: sum.armaments + r.armaments, horses: sum.horses + r.horses, cash: sum.cash + r.cash };
      },
      { worker: 0, armaments: 0, horses: 0, cash: 0 }
    );
    const none = count === 0;
    const plain = (n: number) => `${n}`;
    const atHand: AtHandItem[] = [
      atHandItem("worker", `${capitalized(grade)} workers`, `${freeWorkersOf(before, grade)} free`, own.worker, others.worker, plain, none && free < 1),
      atHandItem("armaments", "Armaments", `${stockBefore(GoodsType.Armaments)} in warehouse`, own.armaments, others.armaments, plain, none && stock(GoodsType.Armaments) < arms),
      ...(def.horses > 0
        ? [atHandItem("horses", "Horses", `${stockBefore(ResourceType.Horses)} in warehouse`, own.horses, others.horses, plain, none && stock(ResourceType.Horses) < def.horses)]
        : []),
      atHandItem("cash", "Cash", money(before.treasury), own.cash, others.cash, money, none && nation.treasury < def.cash),
    ];
    const result = validateOrder(state, { kind: "setRecruitment", nationId: nation.id, regiment: type, count: count + 1 });
    return {
      type,
      name: def.name,
      category: CATEGORY_TEXT[def.category],
      firepower: def.stats.fpNormal,
      move: def.stats.move,
      range: def.stats.range,
      entrench: entrenches(type),
      cost,
      atHand,
      count,
      ...(result.ok ? {} : { moreRefusal: moreRefusalText(result.reason, nation, type) }),
    };
  });
  const forecast = upkeepForecast(state, nation.id);
  const warning = upkeepWarningText(forecast);
  return { treasury: nation.treasury, upkeep: upkeepDueText(forecast), ...(warning ? { upkeepWarning: warning } : {}), cards };
}
