// What the Armoury (FR-212) shows, derived from the regiment table (FR-199) and the engine's recruiting reads (FR-200).
// No React, no store: the dialog renders this view and sends `setRecruitment`; the engine stays the judge of every order.
import {
  entrenches,
  freeWorkersOf,
  RECRUITABLE_REGIMENTS,
  recruitingOf,
  REGIMENTS,
  validateOrder,
  type RegimentType,
  type RejectReason,
} from "@/engine";
import type { GameState } from "@/types/GameState";
import type { WorkerGrade } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { GoodsType, ResourceType } from "@/types/Resource";
import { money, REFUSAL_TEXT } from "../gameText";
import { CATEGORY_TEXT } from "./armyView";

/** One thing a regiment costs, or the nation has at hand: a worker of its grade, armaments, horses, cash. */
export type ArmouryItemKey = "worker" | "armaments" | "horses" | "cash";

export interface ArmouryItem {
  key: ArmouryItemKey;
  /** "1 untrained worker", "2 armaments", "1 horse", "$500" */
  text: string;
}

export interface AtHandItem extends ArmouryItem {
  /** Less at hand than one more regiment costs: marked "short" in text and colour (FR-212). */
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
  cards: ArmouryCardView[];
}

const workers = (n: number, grade: WorkerGrade) => `${n} ${grade} worker${n === 1 ? "" : "s"}`;
const armaments = (n: number) => `${n} armaments`;
const horses = (n: number) => `${n} horse${n === 1 ? "" : "s"}`;

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
  const cards = RECRUITABLE_REGIMENTS.map((type): ArmouryCardView => {
    const def = REGIMENTS[type];
    const grade = def.worker ?? "untrained";
    const free = freeWorkersOf(nation, grade);
    const arms = def.stats.armamentsCost;
    const cost: ArmouryItem[] = [
      { key: "worker", text: workers(1, grade) },
      { key: "armaments", text: armaments(arms) },
      ...(def.horses > 0 ? [{ key: "horses" as const, text: horses(def.horses) }] : []),
      { key: "cash", text: money(def.cash) },
    ];
    const atHand: AtHandItem[] = [
      { key: "worker", text: workers(free, grade), short: free < 1 },
      { key: "armaments", text: armaments(stock(GoodsType.Armaments)), short: stock(GoodsType.Armaments) < arms },
      ...(def.horses > 0 ? [{ key: "horses" as const, text: horses(stock(ResourceType.Horses)), short: stock(ResourceType.Horses) < def.horses }] : []),
      { key: "cash", text: money(nation.treasury), short: nation.treasury < def.cash },
    ];
    const count = recruitingOf(nation, type);
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
  return { treasury: nation.treasury, cards };
}
