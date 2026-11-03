// Workers eat after the turn's shipments reach the warehouse (rules 05 section 5; FR-040), then
// this turn's migrants join (FR-042).
import type { GameState } from "@/types/GameState";
import type { WorkerGrade, Workers } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import { MaterialType, ResourceType } from "@/types/Resource";
import { noWorkers } from "../industry/labour";
import type { TurnContext, TurnSystem } from "../turn/context";

type Stock = Record<string, number>;

const MEAT = [ResourceType.Livestock, ResourceType.Fish] as const;
const RAW_FOOD = [ResourceType.Grain, ResourceType.Fruit, ResourceType.Livestock, ResourceType.Fish] as const;

/** Worker slot i prefers, in groups of four: grain, fruit, grain, livestock-or-fish. */
const PREFERENCE: readonly (readonly ResourceType[])[] = [[ResourceType.Grain], [ResourceType.Fruit], [ResourceType.Grain], MEAT];

/** Fed first: the expert, then the trained, then the untrained (preference ignores the grade). */
const FEEDING_ORDER: readonly WorkerGrade[] = ["expert", "trained", "untrained"];
/** Who takes a sick or starving place first. [NEEDS CLARIFICATION] gaps.md B7. */
const HUNGRY_FIRST: readonly WorkerGrade[] = ["untrained", "trained", "expert"];

/** Takes one unit of the type with the largest stock among `types` (ties: the first listed). */
function takeOne(stock: Stock, types: readonly string[]): boolean {
  let best: string | undefined;
  for (const type of types) {
    if ((stock[type] ?? 0) > 0 && (best === undefined || stock[type] > stock[best])) best = type;
  }
  if (best === undefined) return false;
  stock[best] -= 1;
  return true;
}

/** Spreads `count` bad outcomes over the grades, the untrained first, within what each grade has. */
function assign(count: number, available: Workers): Workers {
  const out = noWorkers();
  let left = count;
  for (const grade of HUNGRY_FIRST) {
    const n = Math.min(left, available[grade]);
    out[grade] = n;
    left -= n;
  }
  return out;
}

function feedNation(nation: Nation, ctx: TurnContext): Nation {
  const { workers, recruits } = nation.industry;
  const mouths = FEEDING_ORDER.reduce((sum, grade) => sum + workers[grade], 0);
  const stock: Stock = { ...(nation.warehouse as Stock) };

  // Pass 1: every slot its preferred raw food; pass 2: canned food; pass 3: any other raw food.
  const fed = Array.from({ length: mouths }, (_, slot) => takeOne(stock, PREFERENCE[slot % PREFERENCE.length]));
  let wellFed = fed.filter(Boolean).length;
  for (let slot = 0; slot < mouths && wellFed < mouths; slot++) {
    if (!fed[slot] && takeOne(stock, [MaterialType.CannedFood])) {
      fed[slot] = true;
      wellFed++;
    }
  }
  let sickCount = 0;
  for (let slot = 0; slot < mouths && wellFed + sickCount < mouths; slot++) {
    if (!fed[slot] && takeOne(stock, RAW_FOOD)) sickCount++;
  }
  const starvedCount = mouths - wellFed - sickCount;

  const starved = assign(starvedCount, workers);
  const survivors: Workers = {
    untrained: workers.untrained - starved.untrained,
    trained: workers.trained - starved.trained,
    expert: workers.expert - starved.expert,
  };
  const sick = assign(sickCount, survivors);
  if (mouths > 0) ctx.emit({ type: "workers-fed", nationId: nation.id, fed: wellFed, sick: sickCount, starved: starvedCount });

  // Migrants ordered this turn join after the meal and eat from next turn on.
  if (recruits > 0) ctx.emit({ type: "workers-recruited", nationId: nation.id, count: recruits });
  const after: Workers = { ...survivors, untrained: survivors.untrained + recruits };

  return {
    ...nation,
    warehouse: stock as Nation["warehouse"],
    industry: { ...nation.industry, workers: after, sick, recruits: 0 },
  };
}

export const foodSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => ({
  ...state,
  nations: state.nations.map((nation) => feedNation(nation, ctx)),
});
