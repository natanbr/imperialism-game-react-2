// The diplomacy state (FR-151): one entry per pair of countries with at least one Great Power,
// keyed by `pairKey(a, b)` (engine/diplomacy/relations.ts). Rules 07 sections 1, 2 and 7.1.
import type { CountryId, NationId } from "./Common";

/** The six Imp1 subsidy steps, in percent (gaps F14). */
export type SubsidyPercent = 5 | 10 | 25 | 50 | 75 | 100;

/** The four Imp1 grant sizes, in dollars. */
export type GrantAmount = 1000 | 3000 | 5000 | 10000;

export interface War {
  /** The countries that declared it. */
  aggressors: CountryId[];
  /** The first turn of the war (the turn after the declaration). */
  since: number;
}

export interface PairDiplomacy {
  /** 0 to 89; the relation level is floor(points / 10), 0 to 8 (`relationLevel`). */
  points: number;
  /** The Great Powers of the pair that hold a consulate with the other country. */
  consulates: NationId[];
  /** The Great Powers of the pair that hold an embassy with the other country. */
  embassies: NationId[];
  /** Non-aggression pact (a Great Power and a minor). */
  pact: boolean;
  /** Alliance (two Great Powers). */
  alliance: boolean;
  /** Absent while the two are at peace. */
  war?: War;
  /** The countries of the pair that boycott the other. */
  boycotts: CountryId[];
  /** Per Great Power of the pair: its subsidy toward the other country. */
  subsidies: Partial<Record<NationId, SubsidyPercent>>;
  /** Per Great Power of the pair: the grant it pays the other country each turn. */
  lockedGrants: Partial<Record<NationId, GrantAmount>>;
}

/** By `pairKey(a, b)`: the two country ids in string order joined by a bar ("minor-1|nation-1"). */
export type DiplomacyState = Record<string, PairDiplomacy>;
