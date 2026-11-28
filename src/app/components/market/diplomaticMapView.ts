import { countryName, defenceOf, ordinal, relationLevel, relationOf } from "@/engine";
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
/** FR-651, inferred (spec open question 3): the ratio to our strength below which each word but Awesome applies. */
const MILITARY_LIMITS = [0.5, 0.8, 1.25, 2];

export function militaryWord(ratio: number): MilitaryWord {
  const step = MILITARY_LIMITS.findIndex(limit => ratio < limit);
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
  /** Information only, Great Powers only: the settled FR-610 industry placing ("1st of 2"). */
  industry?: string;
}

/** Information about our own country, which is Home on the map rather than a counterpart. */
export interface HomeInformation {
  provinces: number;
  industry: string;
}

const provinceCount = (game: GameState, countryId: string): number => game.provinces.filter(p => p.ownerId === countryId).length;

/** The FR-226 defence of every province the country holds: its defenders, fully visible (Q32). Settled armies only. */
const visibleStrength = (game: GameState, countryId: string): number =>
  game.provinces.reduce((sum, p) => (p.ownerId === countryId ? sum + defenceOf(game, p.id) : sum), 0);

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
  const ours = visibleStrength(game, viewer);
  const others = [...game.nations.filter(nation => nation.id !== viewer), ...game.minorNations];
  return others.map(({ id, name }) => {
    const provinces = provinceCount(game, id);
    const ruler = game.minorNations.find(minor => minor.id === id)?.colonyOf;
    if (ruler !== undefined) {
      return { id, name, fill: UNKNOWN_FILL, status: `Colony, counted under ${countryName(game, ruler) ?? ruler}`, offices: [], provinces };
    }
    const theirs = visibleStrength(game, id);
    const word = militaryWord(ours > 0 ? theirs / ours : theirs > 0 ? Infinity : 1);
    const country: DiplomaticCountry = { id, name, fill: militaryFill(word), status: word, offices: [], provinces };
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
