import { countryName, defendersOf, ordinal, REGIMENTS, relationLevel, relationOf } from "@/engine";
import type { RankRecord } from "@/store/rankHistory";
import { MILITARY_COLORS, relationColor } from "@/styles/theme";
import type { GameState } from "@/types/GameState";
import { relationText } from "../diplomacy/diplomacyView";

export type InformationMode = "Information" | "Relationships" | "Political status";
export const HOME_FILL = "var(--color-map-home)";
export const UNKNOWN_FILL = "var(--color-surface-sunken)";
export const POLITICAL_FILLS = {
  Peace: "var(--color-surface-raised)",
  War: "var(--color-map-war)",
  Pact: "var(--color-map-pact)",
  Alliance: "var(--color-map-alliance)",
  Empire: "var(--color-map-empire)",
};

export const MILITARY_WORDS = ["Poor", "Fair", "Good", "Excellent", "Awesome"] as const;
export type MilitaryWord = (typeof MILITARY_WORDS)[number];
/** FR-651, inferred (spec open question 3): the ratio to our strength below which each word but Awesome applies, as num / den. */
const MILITARY_LIMITS: readonly (readonly [num: number, den: number])[] = [[1, 2], [4, 5], [5, 4], [2, 1]];

/**
 * The word for strength `theirs` against `ours`, both in the same units. The steps compare products, not a quotient,
 * so whole-number strengths exactly at a step read the higher word. No regiment is Poor even when we have none either
 * (FR-651); any force against none of ours is Awesome.
 */
export function militaryWord(theirs: number, ours: number): MilitaryWord {
  if (theirs === 0) return "Poor";
  const step = MILITARY_LIMITS.findIndex(([num, den]) => theirs * den < ours * num);
  return MILITARY_WORDS[step === -1 ? MILITARY_LIMITS.length : step];
}

export const militaryFill = (word: MilitaryWord): string => MILITARY_COLORS[MILITARY_WORDS.indexOf(word)];

export type Office = "Consulate" | "Embassy";
export interface DiplomaticCountry {
  id: string;
  name: string;
  fill: string;
  status: string;
  offices: Office[];
  /** Information only: the provinces it owns. */
  provinces?: number;
  /** Information only: its Military word, also in `status`; absent for a colony, which is counted under its ruler. */
  military?: MilitaryWord;
  /** Information only, Great Powers only: the settled FR-610 industry placing ("1st of 2"). */
  industry?: string;
}

/** Information about our own country, which is Home on the map rather than a counterpart. */
export interface HomeInformation {
  provinces: number;
  industry: string;
}

const provinceCount = (game: GameState, countryId: string): number => game.provinces.filter(p => p.ownerId === countryId).length;

/** One defender's FR-226 term, FPN x health / (100 - R) as `defenceOf` sums it, kept as [numerator, denominator]. */
type DefenceTerm = readonly [number, number];

/** The FR-226 defence of every province the country holds: its defenders, fully visible (Q32). Settled armies only. */
const visibleDefence = (game: GameState, countryId: string): DefenceTerm[] =>
  game.provinces.flatMap(p => p.ownerId !== countryId ? [] : defendersOf(game, p.id).map(({ regiment, protection }): DefenceTerm =>
    [REGIMENTS[regiment.type].stats.fpNormal * regiment.health, 100 - protection.percent]));

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Both strengths over one common denominator. The float sums round under an exact step (170 Regulars against 340 give
 * 0.4999999999999981), while these are whole numbers for whole-number health, so a force exactly at a step is at it.
 */
function commonStrengths(theirs: readonly DefenceTerm[], ours: readonly DefenceTerm[]): [theirs: number, ours: number] {
  const common = [...theirs, ...ours].reduce((lcm, [, den]) => (lcm / gcd(lcm, den)) * den, 1);
  const sum = (terms: readonly DefenceTerm[]) => terms.reduce((total, [num, den]) => total + num * (common / den), 0);
  return [sum(theirs), sum(ours)];
}

/** FR-610's placing for the last settled turn only; an older record would describe another turn. */
function industryPlacing(game: GameState, history: readonly RankRecord[] | undefined, nationId: string): string {
  const lastTurn = game.gameOver?.turn ?? game.turn - 1;
  if (lastTurn < 1) return "ranked after the first turn";
  const places = history?.find(r => r.turn === lastTurn)?.places.industry;
  const place = places?.find(p => p.nationId === nationId)?.place;
  return places && place !== undefined ? `${ordinal(place)} of ${places.length}` : "unavailable";
}

export const homeInformation = (game: GameState, viewer: string, history?: readonly RankRecord[]): HomeInformation =>
  ({ provinces: provinceCount(game, viewer), industry: industryPlacing(game, history, viewer) });

export const provincesText = (count: number): string => `${count} province${count === 1 ? "" : "s"}`;

/** Only public, settled facts (FR-651): ownership, settled armies (Q32) and settled FR-610 placings. */
function informationCountries(game: GameState, viewer: string, history: readonly RankRecord[] | undefined): DiplomaticCountry[] {
  const ours = visibleDefence(game, viewer);
  const others = [...game.nations.filter(nation => nation.id !== viewer), ...game.minorNations];
  return others.map(({ id, name }) => {
    const provinces = provinceCount(game, id);
    const ruler = game.minorNations.find(minor => minor.id === id)?.colonyOf;
    if (ruler !== undefined) {
      return { id, name, fill: UNKNOWN_FILL, status: `Colony, counted under ${countryName(game, ruler) ?? ruler}`, offices: [], provinces };
    }
    const word = militaryWord(...commonStrengths(visibleDefence(game, id), ours));
    const country: DiplomaticCountry = { id, name, fill: militaryFill(word), status: word, military: word, offices: [], provinces };
    if (game.nations.some(nation => nation.id === id)) country.industry = industryPlacing(game, history, id);
    return country;
  });
}

/** Only settled bilateral facts. An office lists its sender; unresolved orders never enter this view. */
export function diplomaticCountries(game: GameState, viewer: string, mode: InformationMode, history?: readonly RankRecord[]): DiplomaticCountry[] {
  if (mode === "Information") return informationCountries(game, viewer, history);
  const others = [...game.nations.filter(nation => nation.id !== viewer), ...game.minorNations];
  return others.map(({ id, name }) => {
    const offices: Office[] = [];
    if (mode === "Relationships") {
      const level = relationLevel(game, viewer, id);
      return level === undefined
        ? { id, name, fill: UNKNOWN_FILL, status: "No relations", offices }
        : { id, name, fill: relationColor(level), status: relationText(level), offices };
    }
    const pair = relationOf(game, viewer, id);
    if (pair?.consulates.includes(viewer)) offices.push("Consulate");
    if (pair?.embassies.includes(viewer)) offices.push("Embassy");
    const ruler = game.minorNations.find(minor => minor.id === id)?.colonyOf;
    if (ruler !== undefined) {
      return { id, name, fill: POLITICAL_FILLS.Empire, status: `Empire · Colony of ${countryName(game, ruler) ?? ruler}`, offices };
    }
    if (!pair) return { id, name, fill: UNKNOWN_FILL, status: "No relations", offices };
    const status = pair.war ? "War" : pair.alliance ? "Alliance" : pair.pact ? "Pact" : "Peace";
    return { id, name, fill: POLITICAL_FILLS[status], status, offices };
  });
}
