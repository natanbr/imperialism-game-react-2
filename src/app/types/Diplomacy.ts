// The diplomacy state (FR-151): one entry per pair of countries with at least one Great Power,
// keyed by `pairKey(a, b)` (engine/diplomacy/relations.ts). Rules 07 sections 1, 2 and 7.1.
import type { CountryId, NationId, ProvinceId } from "./Common";

/** The six Imp1 subsidy steps, in percent (gaps F14). */
export type SubsidyPercent = 5 | 10 | 25 | 50 | 75 | 100;

/** The four Imp1 grant sizes, in dollars. */
export type GrantAmount = 1000 | 3000 | 5000 | 10000;

/** What `proposeOverture` asks for (FR-161; Imp1 Diplomatic Overtures panel, Join the Empire left out, Q37). */
export type Overture = "consulate" | "embassy" | "pact" | "alliance" | "war" | "peace";

/** What `withdrawOverture` takes back (FR-161): an overture, this turn's grant (or a standing locked one) or trade policy. */
export type WithdrawableOverture = Overture | "grant" | "trade-policy";

/** The overtures a Great Power answers itself rather than having them always accepted (FR-166, FR-169). */
export type ProposalKind = "alliance" | "peace";

/**
 * An overture to a human Great Power, answered with `answerProposal` on the turn after it was made
 * (FR-166); one still unanswered at that End Turn is refused and removed.
 */
export interface Proposal {
  /** "proposal-<turn>-<n>". */
  id: string;
  fromId: NationId;
  toId: NationId;
  kind: ProposalKind;
  /** The turn it was proposed on; it is answered on `turn + 1`. */
  turn: number;
}

/** A province that changed hands in a war (written by M9's conquest; read by the FR-174 peace rule). */
export interface ProvinceCapture {
  provinceId: ProvinceId;
  /** The country that lost it. */
  fromId: CountryId;
  /** The country that took it. */
  toId: CountryId;
  turn: number;
}

/**
 * FR-408: one battle between the two countries of a war, as the combat phase fought it: an attack that took the
 * province is won by the attacker, one the defender held by the defender.
 */
export interface WarBattle {
  provinceId: ProvinceId;
  turn: number;
  winnerId: CountryId;
  loserId: CountryId;
}

export interface War {
  /** The countries that declared it, in id order. */
  aggressors: CountryId[];
  /** The first turn of the war (the turn after the declaration). */
  since: number;
  /** The provinces taken in this war, oldest first; absent while none was (always in M6). */
  captures?: ProvinceCapture[];
  /** FR-408: the battles of this war, oldest first; absent while none was fought. */
  battles?: WarBattle[];
  /** Per Great Power of the pair: the last turn it proposed peace in this war (FR-408, card Q92: at most once every `SCRIPTED_DIPLOMACY.offerAgainTurns`, 6 turns; FR-174 had 3). */
  lastPeaceOffer?: Partial<Record<NationId, number>>;
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
  /**
   * Two Great Powers: the consulates and embassies are still the ones of the start (FR-151, FR-240). A war between the
   * two ends them and this mark (FR-167), so a consulate or embassy opened later is never taken for a start one.
   */
  startTreaties?: boolean;
  /**
   * FR-488 (M13): the turn the pair's last war ended in peace (FR-169). Absent when it never did, and on saves from before
   * M13 (optional, so they still load). The scripted Great Power starts no war on a Great Power within 10 turns of it.
   */
  peaceTurn?: number;
}

/** By `pairKey(a, b)`: the two country ids in string order joined by a bar ("minor-1|nation-1"). */
export type DiplomacyState = Record<string, PairDiplomacy>;
