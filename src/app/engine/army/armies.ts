// Armies (FR-204): pure reads of `state.armies` and the turn's army intents, the view helpers of the army screens
// (FR-210 to FR-212), and the edits the orders and the turn phases share. Every edit returns a new state and keeps two
// invariants: at most one army per country per province (an army left empty is removed), and `state.armies` sorted by
// province (state order) then owner id, each army's regiments by id, so the same armies always read the same.
import type { Army, Regiment } from "@/types/Army";
import type { CountryId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { WorkerGrade } from "@/types/Industry";
import type { ArmyIntent, ArmyMoveIntent, Intent } from "@/types/Intent";
import type { Nation } from "@/types/Nation";
import type { Province } from "@/types/Province";
import type { RegimentType } from "@/types/Unit";
import { FULL_HEALTH, isMilitia, REGIMENTS, UPKEEP_PER_ARMS } from "@/definisions/regiments";
import { LABOUR_PER_WORKER } from "@/definisions/ResourceConversions";
import { healthyWorkers } from "../industry/labour";
import { labourOf } from "../industry/productionPlan";
import { adjacentProvinces, provinceById, provinceOf } from "../world/provinces";

// --- reads -------------------------------------------------------------------------------------

/** The country's armies, in state order. */
export const armiesOf = (state: GameState, countryId: CountryId): Army[] => state.armies.filter((a) => a.ownerId === countryId);

/** The country's army in the province, if it has one there. */
export const armyAt = (state: GameState, ownerId: CountryId, provinceId: ProvinceId): Army | undefined =>
  state.armies.find((a) => a.ownerId === ownerId && a.provinceId === provinceId);

/** Every country's army in the province, in state order. */
export const armiesIn = (state: GameState, provinceId: ProvinceId): Army[] => state.armies.filter((a) => a.provinceId === provinceId);

/** Every regiment of the country, army by army. */
export const regimentsOf = (state: GameState, countryId: CountryId): Regiment[] => armiesOf(state, countryId).flatMap((a) => a.regiments);

export interface RegimentLocation {
  army: Army;
  regiment: Regiment;
}

/** The regiment of that id and the army it is in; undefined for an unknown id. */
export function findRegiment(state: GameState, regimentId: RegimentId): RegimentLocation | undefined {
  for (const army of state.armies) {
    const regiment = army.regiments.find((r) => r.id === regimentId);
    if (regiment) return { army, regiment };
  }
  return undefined;
}

/** Imp1 Force Size (FR-204): the ARMS of the non-militia regiments; the start army 4. */
export const forceSize = (army: Pick<Army, "regiments">): number =>
  army.regiments.reduce((sum, r) => (isMilitia(r.type) ? sum : sum + REGIMENTS[r.type].stats.armamentsCost), 0);

/** FR-204: the sum of FPN x health / 100 over the non-militia regiments; the start army 36. */
export const strength = (regiments: readonly Regiment[]): number =>
  regiments.reduce((sum, r) => (isMilitia(r.type) ? sum : sum + (REGIMENTS[r.type].stats.fpNormal * r.health) / 100), 0);

/** The strength of the country's regiments in the province (FR-213); 0 without an army there. */
export const strengthIn = (state: GameState, countryId: CountryId, provinceId: ProvinceId): number =>
  strength(armyAt(state, countryId, provinceId)?.regiments ?? []);

export const militiaCount = (army: Pick<Army, "regiments">): number => army.regiments.filter((r) => isMilitia(r.type)).length;

/** FR-202: $25 x the ARMS of the country's non-militia regiments. */
export const upkeepOf = (state: GameState, countryId: CountryId): number =>
  UPKEEP_PER_ARMS * armiesOf(state, countryId).reduce((sum, a) => sum + forceSize(a), 0);

/** "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "101st", "111th" (FR-204). */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${n}${suffix[n % 10] ?? "th"}`;
}

const REGIMENT_PREFIX = "regiment-";

/** The number in a regiment id: a higher number is a newer regiment (FR-202); NaN for an id of another form. */
export const serialOf = (regimentId: RegimentId): number =>
  regimentId.startsWith(REGIMENT_PREFIX) ? Number(regimentId.slice(REGIMENT_PREFIX.length)) : Number.NaN;

const bySerial = (a: Regiment, b: Regiment): number => serialOf(a.id) - serialOf(b.id);

/** Plain string order (not the locale's), so the armies' order is the same everywhere. */
const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The province of the country's capital: a Great Power's capital city tile, a minor's capital tile. Undefined on a
 * world without provinces.
 */
export function capitalProvinceOf(state: GameState, countryId: CountryId): Province | undefined {
  const nation = state.nations.find((n) => n.id === countryId);
  if (nation) {
    const capitalId = nation.cities[0];
    const tile = state.map.tiles.flat().find((t) => t.cityId === capitalId);
    return tile ? provinceOf(state, tile.id) : undefined;
  }
  const minor = state.minorNations.find((m) => m.id === countryId);
  return minor ? provinceOf(state, minor.capitalTileId) : undefined;
}

// --- the turn's army intents (FR-205, FR-207) ----------------------------------------------

export const isArmyIntent = (intent: Intent): intent is ArmyIntent => intent.kind === "army-move" || intent.kind === "disband";

export const isArmyMoveIntent = (intent: Intent): intent is ArmyMoveIntent => intent.kind === "army-move";

/** This turn's move or disband intent that names the regiment, if any (a regiment has at most one). */
export const pendingArmyIntent = (state: GameState, regimentId: RegimentId): ArmyIntent | undefined =>
  state.intents.find((i): i is ArmyIntent => isArmyIntent(i) && i.regimentIds.includes(regimentId));

/** What a regiment does this turn, for the Army screen (FR-211). */
export type RegimentStatus =
  | { kind: "defending" }
  | { kind: "available" }
  | { kind: "marching"; toProvinceId: ProvinceId }
  | { kind: "disband-ordered" };

/** The regiment's status: "defending" (militia), "available", "marching" (with where to) or "disband-ordered"; undefined for an unknown id. */
export function regimentStatus(state: GameState, regimentId: RegimentId): RegimentStatus | undefined {
  const found = findRegiment(state, regimentId);
  if (!found) return undefined;
  if (isMilitia(found.regiment.type)) return { kind: "defending" };
  const intent = pendingArmyIntent(state, regimentId);
  if (intent?.kind === "army-move") return { kind: "marching", toProvinceId: intent.toProvinceId };
  if (intent?.kind === "disband") return { kind: "disband-ordered" };
  return { kind: "available" };
}

/** Where the nation's regiments in the province may march (FR-205, FR-211 "March to"): its bordering provinces, in state order. */
export const marchTargets = (state: GameState, nationId: NationId, provinceId: ProvinceId): Province[] =>
  adjacentProvinces(state, provinceId).filter((p) => p.ownerId === nationId);

// --- the Armoury (FR-200, FR-212) -----------------------------------------------------------

/** The count of the type the nation ordered this turn. */
export const recruitingOf = (nation: Nation, type: RegimentType): number => nation.recruiting?.[type] ?? 0;

/**
 * Workers of the grade a recruit may take (FR-200): the healthy ones (not sick, not training) whose labour the
 * production plan (FR-116) leaves free, so taking them changes nothing the plan makes.
 */
export const freeWorkersOf = (nation: Nation, grade: WorkerGrade): number =>
  Math.max(0, Math.min(healthyWorkers(nation.industry, grade), Math.floor(labourOf(nation).free / LABOUR_PER_WORKER[grade])));

// --- the map markers (FR-210) ----------------------------------------------------------------

export interface ArmyMarker {
  provinceId: ProvinceId;
  /** Where the map draws it (the province's seat). */
  seatTileId: string;
  ownerId: CountryId;
  forceSize: number;
  /** Its non-militia regiments. */
  regiments: number;
  militia: number;
}

/** One marker per country with regiments in a province, provinces in state order, the province's owner first, then by owner id. */
export function armyMarkers(state: GameState): ArmyMarker[] {
  return state.provinces.flatMap((province) =>
    armiesIn(state, province.id)
      .sort((a, b) => Number(b.ownerId === province.ownerId) - Number(a.ownerId === province.ownerId) || compareIds(a.ownerId, b.ownerId))
      .map((army) => ({
        provinceId: province.id,
        seatTileId: province.seatTileId,
        ownerId: army.ownerId,
        forceSize: forceSize(army),
        regiments: army.regiments.length - militiaCount(army),
        militia: militiaCount(army),
      }))
  );
}

// --- edits -----------------------------------------------------------------------------------

const armyId = (ownerId: CountryId, provinceId: ProvinceId) => `army-${ownerId}-${provinceId}`;

/** The armies with none empty, sorted by province (state order) then owner id, each army's regiments by id. */
function normalized(state: GameState, armies: Army[]): Army[] {
  const rank = new Map(state.provinces.map((p, i) => [p.id, i]));
  const place = (provinceId: ProvinceId) => rank.get(provinceId) ?? state.provinces.length;
  return armies
    .filter((a) => a.regiments.length > 0)
    .map((a) => ({ ...a, regiments: [...a.regiments].sort(bySerial) }))
    .sort((a, b) => place(a.provinceId) - place(b.provinceId) || compareIds(a.ownerId, b.ownerId));
}

/** The regiments added to their owner's army in the province (made when missing). */
export function placeRegiments(state: GameState, ownerId: CountryId, provinceId: ProvinceId, regiments: readonly Regiment[]): GameState {
  if (regiments.length === 0) return state;
  const existing = armyAt(state, ownerId, provinceId);
  const armies = existing
    ? state.armies.map((a) => (a === existing ? { ...a, regiments: [...a.regiments, ...regiments] } : a))
    : [...state.armies, { id: armyId(ownerId, provinceId), ownerId, provinceId, regiments: [...regiments] }];
  return { ...state, armies: normalized(state, armies) };
}

/** The listed regiments taken out of their armies; an army left empty is removed. The same state when none is found. */
export function removeRegiments(state: GameState, ids: ReadonlySet<RegimentId>): GameState {
  if (!state.armies.some((a) => a.regiments.some((r) => ids.has(r.id)))) return state;
  const armies = state.armies.map((a) => (a.regiments.some((r) => ids.has(r.id)) ? { ...a, regiments: a.regiments.filter((r) => !ids.has(r.id)) } : a));
  return { ...state, armies: normalized(state, armies) };
}

/** Each regiment passed through `fn` (a new army only where one changed). */
export function mapRegiments(state: GameState, fn: (regiment: Regiment, army: Army) => Regiment): GameState {
  let changed = false;
  const armies = state.armies.map((army) => {
    const regiments = army.regiments.map((r) => fn(r, army));
    if (regiments.every((r, i) => r === army.regiments[i])) return army;
    changed = true;
    return { ...army, regiments };
  });
  return changed ? { ...state, armies } : state;
}

/** The number of the next regiment: one more than every regiment raised so far (and than any id in the state). */
function nextSerial(state: GameState): number {
  const raised = Object.values(state.regimentsRaised ?? {}).reduce(
    (sum, byType) => sum + Object.values(byType ?? {}).reduce((s, n) => s + (n ?? 0), 0),
    0
  );
  const highest = state.armies.flatMap((a) => a.regiments).reduce((most, r) => Math.max(most, serialOf(r.id) || 0), 0);
  return Math.max(raised, highest) + 1;
}

/**
 * Raises `count` new regiments of the type for the owner in the province (FR-201, FR-203): health 100, the next ids,
 * names that go on from the owner's count of the type (FR-204: "3rd Regulars" after two).
 */
export function raiseRegiments(state: GameState, ownerId: CountryId, provinceId: ProvinceId, type: RegimentType, count: number): GameState {
  if (count <= 0) return state;
  const serial = nextSerial(state);
  const byOwner = state.regimentsRaised?.[ownerId] ?? {};
  const before = byOwner[type] ?? 0;
  const regiments: Regiment[] = Array.from({ length: count }, (_, i) => ({
    id: `${REGIMENT_PREFIX}${serial + i}`,
    type,
    name: `${ordinal(before + i + 1)} ${REGIMENTS[type].name}`,
    health: FULL_HEALTH,
  }));
  const raised = { ...(state.regimentsRaised ?? {}), [ownerId]: { ...byOwner, [type]: before + count } };
  return placeRegiments({ ...state, regimentsRaised: raised }, ownerId, provinceId, regiments);
}

/** The province exists and the country holds it. */
export const holds = (state: GameState, countryId: CountryId, provinceId: ProvinceId): boolean => provinceById(state, provinceId)?.ownerId === countryId;
