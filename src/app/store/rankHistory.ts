import { cargoHolds } from "@/definisions/ships";
import { councilStanding } from "@/engine/council/council";
import { militaryStrength } from "@/engine/diplomacy/queries";
import { labourTotal } from "@/engine/industry/labour";
import { scoreOf } from "@/engine/score/score";
import type { GameEvent } from "@/engine/turn/context";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";

const economicMeasures = ["industry", "labour", "transport", "merchant", "exports"] as const;
const rankMeasures = [...economicMeasures, "council", "army"] as const;
export type RankMeasure = typeof rankMeasures[number];
export interface NationPlace {
  nationId: NationId;
  place: number;
}
export interface RankRecord {
  turn: number;
  places: Partial<Record<RankMeasure, NationPlace[]>>;
}

function ranked(nations: Nation[], quantity: (nation: Nation) => number): NationPlace[] {
  const sorted = nations.map(n => ({ nation: n, value: quantity(n) }))
    .sort((a, b) => b.value - a.value || a.nation.colorSlot - b.nation.colorSlot);
  let place = 1;
  return sorted.map(({ nation, value }, index) => {
    if (index > 0 && value !== sorted[index - 1].value) place = index + 1;
    return { nationId: nation.id, place };
  });
}

/** FR-610: the settled quantities stay inside this projection. Sessions store only placings. */
export function projectRankings(game: GameState, events: readonly GameEvent[], turn: number): RankRecord {
  const sold = new Map<NationId, number>();
  for (const event of events) {
    if (event.type === "goods-sold") sold.set(event.nationId, (sold.get(event.nationId) ?? 0) + event.amount);
  }
  const powers = game.nations;
  const owners = new Set(game.provinces.map(p => p.ownerId));
  return { turn, places: {
    ...(game.provinces.length > 0 && { council: ranked(powers.filter(n => owners.has(n.id)), n => councilStanding(game, n.id)) }),
    ...((game.provinces.length > 0 || game.armies.length > 0) && { army: ranked(powers, n => militaryStrength(game, n.id)) }),
    industry: ranked(powers, n => scoreOf(game, n.id).capacity),
    labour: ranked(powers, n => labourTotal(n.industry)),
    transport: ranked(powers, n => n.transportCapacity),
    merchant: ranked(powers, n => cargoHolds(n.merchantMarine)),
    exports: ranked(powers, n => sold.get(n.id) ?? 0),
  } };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validPlaces(rows: unknown, foundingSlots: Map<NationId, number>, council: boolean): rows is NationPlace[] {
  if (!Array.isArray(rows) || rows.length > foundingSlots.size || (!council && rows.length !== foundingSlots.size)) return false;
  const seen = new Set<NationId>();
  let previousPlace = 0;
  let previousSlot = 0;
  for (const [index, row] of rows.entries()) {
    if (!isObject(row) || Object.keys(row).length !== 2 || typeof row.nationId !== "string" || typeof row.place !== "number") return false;
    const slot = foundingSlots.get(row.nationId);
    if (slot === undefined || seen.has(row.nationId)) return false;
    if (row.place !== index + 1 && (index === 0 || row.place !== previousPlace || slot < previousSlot)) return false;
    previousPlace = row.place;
    previousSlot = slot;
    seen.add(row.nationId);
  }
  return true;
}

function validMeasures(places: unknown, slots: Map<NationId, number>, hasProvinces: boolean): places is RankRecord["places"] {
  if (!isObject(places) || Object.keys(places).some(key => !rankMeasures.some(measure => measure === key))) return false;
  const required = hasProvinces ? rankMeasures : economicMeasures;
  if (!required.every(measure => Object.hasOwn(places, measure))) return false;
  if (!hasProvinces && Object.hasOwn(places, "council")) return false;
  // Provinces persist across turns. Armies can disappear, so an earlier land ranking can outlive the last army.
  return rankMeasures.every(measure =>
    !Object.hasOwn(places, measure) || validPlaces(places[measure], slots, measure === "council"));
}

/** A damaged display sample leaves a gap. The game and every other usable sample survive. */
export function readRankHistory(raw: unknown, game: GameState): RankRecord[] {
  if (!Array.isArray(raw)) return [];
  const slots = new Map(game.nations.map(n => [n.id, n.colorSlot]));
  const byTurn = new Map<number, RankRecord>();
  for (const record of raw) {
    if (!isObject(record) || Object.keys(record).length !== 2 || typeof record.turn !== "number" ||
        !Number.isInteger(record.turn) || record.turn < 1 || record.turn >= game.turn || byTurn.has(record.turn)) continue;
    if (validMeasures(record.places, slots, game.provinces.length > 0)) {
      byTurn.set(record.turn, { turn: record.turn, places: record.places });
    }
  }
  return [...byTurn.values()].sort((a, b) => a.turn - b.turn);
}
