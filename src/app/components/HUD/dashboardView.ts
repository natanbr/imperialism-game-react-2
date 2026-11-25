// FR-562: the Demo level's debug dashboard as plain data, no React. Pure reads of the game through the engine's queries:
// it builds no order and writes nothing, and only the human's screen shows it (NR-037; the computer's view is FR-497's).
import {
  armiesOf,
  councilStanding,
  councilVote,
  countryName,
  militaryStrength,
  ordinal,
  provincesOf,
  regimentsOf,
  relationLevel,
  relationOf,
  REGIMENTS,
  scoreTable,
  tradeOrdersOf,
  type RegimentType,
} from "@/engine";
import { creditDebt } from "@/engine/credit/account";
import { lastTradeOrdersOf } from "@/engine/market/partners";
import { fleetFirepower } from "@/engine/navy/fleets";
import { isWarship, WARSHIPS } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { strengthText } from "../army/attackView";
import { relationText } from "../diplomacy/diplomacyView";
import { commodityName, councilProjectionText, money } from "../gameText";

/** The section buttons, in their order (FR-562: buttons, no drop-downs); "details" holds Details for bug reports (FR-476). */
export const DASHBOARD_SECTIONS = [
  { id: "economy", label: "Economy" },
  { id: "military", label: "Military" },
  { id: "trade", label: "Trade" },
  { id: "diplomacy", label: "Diplomacy" },
  { id: "council", label: "Council" },
  { id: "details", label: "Bug report" },
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];
/** The sections a nation's card shows; Bug report is one panel for the game, not per nation. */
export type CardSectionId = Exclude<DashboardSectionId, "details">;

/** One line of a card: a term and its value, as a description list shows them. */
export interface DashboardLine {
  term: string;
  value: string;
  /** For the lines a test or the e2e reads by itself (the cash). */
  testId?: string;
}

export interface DashboardCard {
  nationId: string;
  name: string;
  /** The FR-097 palette slot: the card's colour and swatch. */
  colorSlot: number;
  isPlayer: boolean;
  sections: Record<CardSectionId, DashboardLine[]>;
}

/** "Lumber 3, Wool 5" for the positive amounts in key order; "none" when there are none. */
export function amountsText(amounts: Partial<Record<string, number>>): string {
  const parts = Object.entries(amounts)
    .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
    .map(([key, n]) => `${commodityName(key)} ${n}`);
  return parts.length > 0 ? parts.join(", ") : "none";
}

/** "Regulars 6, Minutemen 2" by type, in the order the regiments stand; "none" without any. */
function countsText(names: readonly string[]): string {
  if (names.length === 0) return "none";
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${name} ${n}`).join(", ");
}

function economyLines(nation: Nation): DashboardLine[] {
  const debt = creditDebt(nation);
  return [
    { term: "Cash", value: money(nation.treasury), testId: "dashboard-cash" },
    ...(debt > 0 ? [{ term: "Debt", value: money(debt) }] : []),
    { term: "Stock", value: amountsText(nation.warehouse) },
    { term: "Freight cars", value: String(nation.transportCapacity) },
  ];
}

function militaryLines(game: GameState, nation: Nation): DashboardLine[] {
  const regiments = regimentsOf(game, nation.id);
  const armies = armiesOf(game, nation.id);
  const recruiting = Object.entries(nation.recruiting ?? {}).flatMap(([type, n]) =>
    Array.from({ length: n ?? 0 }, () => REGIMENTS[type as RegimentType]?.name ?? type)
  );
  const fleets = game.fleets.filter((f) => f.ownerNationId === nation.id);
  const ships = fleets.flatMap((f) => f.ships.map((s) => (isWarship(s.type) ? WARSHIPS[s.type].name : s.type)));
  const firepower = fleets.reduce((sum, f) => sum + fleetFirepower(f), 0);
  const atSea = fleets.filter((f) => f.approach !== undefined).length;
  return [
    { term: "Regiments", value: String(regiments.length) },
    { term: "Strength", value: strengthText(militaryStrength(game, nation.id)) },
    { term: "Army", value: countsText(regiments.map((r) => REGIMENTS[r.type]?.name ?? r.type)) },
    { term: "Provinces held by its armies", value: String(armies.length) },
    ...(recruiting.length > 0 ? [{ term: "Recruiting", value: countsText(recruiting) }] : []),
    { term: "Fleet", value: ships.length > 0 ? `${countsText(ships)}; firepower ${strengthText(firepower)}` : "none" },
    ...(fleets.length > 0 ? [{ term: "Squadrons at sea", value: `${atSea} of ${fleets.length}` }] : []),
    { term: "Cargo holds", value: String(nation.merchantMarine.holds) },
  ];
}

/**
 * The player's orders of this turn as submitted, then last turn's. Trap (M18a review finding 1): the computer plans its
 * orders inside End Turn (store's advanceTurn), so on the player's turn a rival has none in the market yet; a "this turn"
 * line would always read "none". A rival's real data is last turn's bids and offers (FR-491, `market.lastOrders`).
 */
function tradeLines(game: GameState, nation: Nation, isPlayer: boolean): DashboardLine[] {
  const now = tradeOrdersOf(game, nation.id);
  const last = lastTradeOrdersOf(game, nation.id);
  return [
    ...(isPlayer
      ? [
          { term: "Buy this turn", value: amountsText(now.buy) },
          { term: "Sell this turn", value: amountsText(now.sell) },
        ]
      : [{ term: "This turn", value: "decided at End Turn" }]),
    { term: "Buy last turn", value: amountsText(last.buy) },
    { term: "Sell last turn", value: amountsText(last.sell) },
  ];
}

/** Every other country, the Great Powers first in state order, then the minors in id order: its relation and treaties. */
function diplomacyLines(game: GameState, nation: Nation): DashboardLine[] {
  const others = [
    ...game.nations.filter((n) => n.id !== nation.id).map((n) => n.id),
    ...[...(game.minorNations ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((m) => m.id),
  ];
  return others.flatMap((id) => {
    const pair = relationOf(game, nation.id, id);
    const level = relationLevel(game, nation.id, id);
    if (!pair || level === undefined) return [];
    const notes = [
      pair.war ? `at war since turn ${pair.war.since}` : undefined,
      pair.alliance ? "alliance" : undefined,
      pair.pact ? "pact" : undefined,
      pair.embassies.includes(nation.id) ? "our embassy" : pair.consulates.includes(nation.id) ? "our consulate" : undefined,
      game.minorNations?.find((m) => m.id === id)?.colonyOf === nation.id ? "our colony" : undefined,
    ].filter((note): note is string => note !== undefined);
    return [{ term: countryName(game, id) ?? id, value: [relationText(level), ...notes].join(", ") }];
  });
}

function councilLines(game: GameState, nation: Nation): DashboardLine[] {
  const vote = councilVote(game);
  const nominee = vote?.nominees.find((n) => n.nationId === nation.id);
  const scores = scoreTable(game);
  const rank = scores.findIndex((s) => s.nationId === nation.id);
  const score = scores[rank];
  return [
    // FR-291: the two highest standings are the nominees
    { term: "Standing", value: String(Math.round(councilStanding(game, nation.id) * 10) / 10) },
    ...(vote
      ? nominee
        ? [
            { term: "Nominee", value: "yes" },
            { term: "Votes if it met now", value: String(nominee.total) },
            {
              term: "From",
              value: `own provinces ${nominee.controlled}, colonies ${nominee.colonies}, other Great Powers ${nominee.otherGreatPowers}, minors ${nominee.otherMinorNations}`,
            },
          ]
        : [{ term: "Nominee", value: "no" }]
      : []),
    { term: "Provinces", value: String(provincesOf(game, nation.id).length) },
    ...(score ? [{ term: "Score", value: `${score.total} (${ordinal(rank + 1)})` }] : []),
  ];
}

/** FR-562: one card per Great Power, the player's first, then the others in state order. */
export function dashboardCards(game: GameState, playerId: string): DashboardCard[] {
  const nations = [...game.nations.filter((n) => n.id === playerId), ...game.nations.filter((n) => n.id !== playerId)];
  return nations.map((nation) => ({
    nationId: nation.id,
    name: nation.name,
    colorSlot: nation.colorSlot,
    isPlayer: nation.id === playerId,
    sections: {
      economy: economyLines(nation),
      military: militaryLines(game, nation),
      trade: tradeLines(game, nation, nation.id === playerId),
      diplomacy: diplomacyLines(game, nation),
      council: councilLines(game, nation),
    },
  }));
}

/** The Council section's line above the cards: the HUD's projection (FR-314), or why there is none. */
export function councilForecastText(game: GameState, playerId: string): string {
  const vote = councilVote(game);
  if (!vote) return "No Council vote to forecast in this game.";
  return councilProjectionText(vote, playerId, (id) => countryName(game, id) ?? id);
}
