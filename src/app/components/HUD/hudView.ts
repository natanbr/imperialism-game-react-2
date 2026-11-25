// The right pane's alerts and groups (FR-471 to FR-476) as plain data: pure reads of the game and the session, no React.
import {
  adjacentProvinces,
  countryName,
  defenceOf,
  provinceOf,
  provincesOf,
  strengthIn,
  warBetween,
  type Score,
  type UpkeepForecast,
} from "@/engine";
import { TRAINED_TO } from "@/definisions/ResourceConversions";
import type { Difficulty, GameState } from "@/types/GameState";
import type { RandomMapSize, WorldId } from "@/types/World";
import type { WorkerGrade } from "@/types/Industry";
import type { Tile } from "@/types/Tile";
import { WorkerStatus } from "@/types/Workers";
import { strengthText } from "../army/attackView";
import { commodityName, creditUpkeepText, dateText, money, TERRAIN_TEXT } from "../gameText";

export const WORLD_LABEL: Record<WorldId, string> = { continent: "Continent", "two-islands": "Two islands", random: "Random" };
export const SIZE_LABEL: Record<RandomMapSize, string> = { standard: "Standard", large: "Large" };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  introductory: "Introductory", easy: "Easy", normal: "Normal", hard: "Hard", nighOnImpossible: "Nigh on Impossible", demo: "Demo",
};

/** FR-412: each country at war with the player, the other Great Powers first, then the minors, in id order. */
export function playerWars(game: GameState, playerId: string): { id: string; name: string; since: number }[] {
  const others = [...game.nations.filter((n) => n.id !== playerId).map((n) => n.id), ...(game.minorNations ?? []).map((m) => m.id)];
  return others.flatMap((id) => {
    const war = warBetween(game, playerId, id);
    return war ? [{ id, name: countryName(game, id) ?? id, since: war.since }] : [];
  });
}

/** FR-495: another Great Power's army in a province bordering one of ours, and that province of ours. */
export interface BorderThreat {
  nationId: string;
  name: string;
  /** Our province it borders. */
  provinceId: string;
  provinceName: string;
  /** Its strength there (FR-204) and our province's defence (FR-226). */
  strength: number;
  defence: number;
}

/**
 * FR-495 (Imp1's Defense Minister: "Strengthen the Army" when a rival army is more than twice ours [08:W26]): the
 * strongest army of another Great Power in a province bordering one of the player's, with a strength above twice that
 * province's defence; at peace too. At equal strength the weaker province of ours, then the first in state order. None
 * on a world without provinces.
 */
export function borderThreat(game: GameState, playerId: string): BorderThreat | undefined {
  const rivals = game.nations.map((n) => n.id).filter((id) => id !== playerId);
  let strongest: BorderThreat | undefined;
  for (const own of provincesOf(game, playerId)) {
    const defence = defenceOf(game, own.id);
    for (const near of adjacentProvinces(game, own.id)) {
      for (const rival of rivals) {
        const strength = strengthIn(game, rival, near.id);
        if (strength <= 2 * defence) continue;
        if (strongest && (strength < strongest.strength || (strength === strongest.strength && defence >= strongest.defence))) continue;
        strongest = { nationId: rival, name: countryName(game, rival) ?? rival, provinceId: own.id, provinceName: own.name, strength, defence };
      }
    }
  }
  return strongest;
}

/** FR-495: "Valdoria's army at our border: Testland North-East (52 against our 25)", one decimal as the Attack screen. */
export const borderThreatText = ({ name, provinceName, strength, defence }: Pick<BorderThreat, "name" | "provinceName" | "strength" | "defence">): string =>
  `${name}'s army at our border: ${provinceName} (${strengthText(strength)} against our ${strengthText(defence)})`;

/**
 * The score's four parts (FR-402), in the order and words the bar's popover (FR-404) and the Nation group (FR-474) both
 * list: one list, so the two never drift apart (M12b review NL-3).
 */
export const scoreParts = ({ treasury, industry, development, workInProgress }: Score["points"]): [string, number][] => [
  ["Treasury", treasury],
  ["Industry", industry],
  ["Development", development],
  ["Work in progress", workInProgress],
];

/** FR-505: show why known resource levels on conquered land are missing from Development. */
export const uncollectedScoreText = (score: Score): string | undefined => {
  const levels = score.uncollectedConqueredLevels;
  return levels ? `Conquered land not collected: ${levels} ${levels === 1 ? "level" : "levels"}, 0 points` : undefined;
};

/**
 * What hangs from the top bar (New game's question FR-480, the score's parts FR-530): its left edge at its anchor's,
 * moved left as far as the window's right edge needs, and never closer than `margin` px to either edge.
 */
export const leftInWindow = (anchorLeft: number, width: number, windowWidth: number, margin = 8): number =>
  Math.max(margin, Math.min(anchorLeft, windowWidth - margin - width));

/** FR-432: the player's civilians with no move or job this turn. */
export const idleCivilianCount = (game: GameState, playerId: string): number =>
  game.map.tiles.flat().reduce((n, tile) => n + tile.workers.filter((w) => w.nationId === playerId && w.status === WorkerStatus.Available && !w.pendingDisband).length, 0);

export type WorkKind = "development" | "rail" | "depot" | "port" | "fort" | "prospecting" | "training";

/** One unfinished job of a nation (FR-475): a row of the "Work in progress" group. */
export interface WorkRow {
  /** `kind:tileId`, or `training:grade`: one job per tile (FR-113), one training row per grade. */
  key: string;
  kind: WorkKind;
  /** The job's tile; none for worker training. */
  tileId?: string;
  /** End Turns until it is done: 1 means the next End Turn finishes it. */
  turnsLeft: number;
  text: string;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const turnsLeftText = (n: number) => `${n} ${n === 1 ? "turn" : "turns"} left`;

/**
 * End Turns until a job started on `startedOnTurn` and lasting `durationTurns` is done: developmentSystem finishes it in
 * the turn's resolution whose next turn is startedOnTurn + durationTurns, so on turn T that is that number less T.
 */
const turnsLeftOf = (turn: number, startedOnTurn: number, durationTurns: number) => Math.max(1, startedOnTurn + durationTurns - turn);

/** The worker's nation, else the tile's owner: whose job this is. */
const jobNationOf = (tile: Tile, workerId: string) => tile.workers.find((w) => w.id === workerId)?.nationId ?? tile.ownerNationId;

/** "3-9 in Testland North-West", as the news names a tile (FR-375); the bare id where there is no province. */
function placeText(game: GameState, tileId: string): string {
  const province = provinceOf(game, tileId);
  return province ? `${tileId} in ${province.name}` : tileId;
}

/**
 * FR-475: every unfinished job of the nation, development first, then construction (rail, depot, port, fort),
 * prospecting and worker training, each kind in map order. Names avoid the words the page-wide e2e selectors look for
 * (FR-469): a development row names the resource ("grain"), not the terrain ("Open Range").
 */
export function workInProgressRows(game: GameState, nationId: string): WorkRow[] {
  const development: WorkRow[] = [];
  const construction: WorkRow[] = [];
  const prospecting: WorkRow[] = [];
  for (const tile of game.map.tiles.flat()) {
    const dev = tile.developmentJob;
    if (dev && jobNationOf(tile, dev.workerId) === nationId) {
      const what = tile.resource ? commodityName(tile.resource.type).toLowerCase() : (TERRAIN_TEXT[tile.terrain] ?? tile.terrain).toLowerCase();
      const left = turnsLeftOf(game.turn, dev.startedOnTurn, dev.durationTurns);
      development.push({
        key: `development:${tile.id}`,
        kind: "development",
        tileId: tile.id,
        turnsLeft: left,
        text: `${capitalize(dev.workerType)}: ${what} to level ${dev.targetLevel} at ${placeText(game, tile.id)}, ${turnsLeftText(left)}`,
      });
    }
    const job = tile.constructionJob;
    if (job && jobNationOf(tile, job.workerId) === nationId) {
      const left = turnsLeftOf(game.turn, job.startedOnTurn, job.durationTurns);
      const what = job.kind === "rail" && job.railFrom ? `rail from ${job.railFrom} to ${placeText(game, tile.id)}` : `${job.kind} at ${placeText(game, tile.id)}`;
      construction.push({ key: `${job.kind}:${tile.id}`, kind: job.kind, tileId: tile.id, turnsLeft: left, text: `Engineer: ${what}, ${turnsLeftText(left)}` });
    }
    const prospect = tile.prospecting;
    if (prospect && jobNationOf(tile, prospect.workerId) === nationId) {
      // Prospecting always ends at the next End Turn (ProspectorDiscoveryDurationTurns is 1)
      prospecting.push({
        key: `prospecting:${tile.id}`,
        kind: "prospecting",
        tileId: tile.id,
        turnsLeft: 1,
        text: `Prospector: prospecting at ${placeText(game, tile.id)}, finds out at End Turn`,
      });
    }
  }
  const training = game.nations.find((n) => n.id === nationId)?.industry.training;
  const trainees: WorkRow[] = (["untrained", "trained"] as const satisfies readonly WorkerGrade[]).flatMap((from) => {
    const count = training?.[from] ?? 0;
    if (count <= 0) return [];
    const workers = `${count} ${from} ${count === 1 ? "worker" : "workers"}`;
    return [{ key: `training:${from}`, kind: "training" as const, turnsLeft: 1, text: `Training: ${workers} to ${TRAINED_TO[from]}, done at End Turn` }];
  });
  return [...development, ...construction, ...prospecting, ...trainees];
}

/**
 * FR-474: "Army upkeep at End Turn: $100; the treasury will then hold $9,800" (before this turn's sales), "No army
 * upkeep." when nothing is due; when the cash is short, what the upkeep warning says (FR-261) in one line.
 */
export function upkeepForecastText(forecast: Pick<UpkeepForecast, "due" | "cash" | "short" | "shortBy" | "projectedDebt" | "overLimitBy" | "forcedSaleRisk">): string {
  const credit = creditUpkeepText(forecast);
  if (credit) return credit;
  if (forecast.due === 0) return "No army upkeep.";
  const due = `Army upkeep at End Turn: ${money(forecast.due)}`;
  if (forecast.short) return `${due}; the treasury will hold ${money(Math.max(0, forecast.cash))}, ${money(forecast.shortBy)} short`;
  return `${due}; the treasury will then hold ${money(forecast.cash - forecast.due)}`;
}

/** FR-474: "Spent this turn: $500" from the treasury at the turn's first order (FR-256); none when nothing changed. */
export function spentThisTurnText(startTreasury: number | undefined, treasury: number): string | null {
  if (startTreasury === undefined || startTreasury === treasury) return null;
  return `Spent this turn: ${money(startTreasury - treasury)}`;
}

/** FR-474: "Last turn: $10,000 to $9,900", from the last report's treasuries; none before the first End Turn. */
export function lastTurnTreasuryText(treasuries: { start: number; end: number } | undefined): string | null {
  return treasuries ? `Last turn: ${money(treasuries.start)} to ${money(treasuries.end)}` : null;
}

/** What the "Details for bug reports" group reads (FR-476), from the game and the store's session and view state. */
export interface DetailsInput {
  game: GameState;
  nationId: string;
  selectedTileId?: string;
  selectedWorker?: { id: string; type?: string };
  ordersThisTurn: number;
  lastRefusal?: string;
  zoom: number;
  camera: { x: number; y: number };
  /** FR-536: the window's inner size in CSS px; most layout bugs depend on it. */
  window: { width: number; height: number };
  saveVersion: number;
}

/** FR-476: the lines of "Details for bug reports", the same text the Copy details button copies. */
export function detailLines(input: DetailsInput): string[] {
  const { game } = input;
  const tile = input.selectedTileId ? game.map.tiles.flat().find((t) => t.id === input.selectedTileId) : undefined;
  const worker = input.selectedWorker;
  return [
    tile ? `Tile: ${tile.x},${tile.y} (id ${tile.id})` : "Tile: none",
    `Seed: ${game.seed}`,
    `Turn: ${game.turn} (${dateText(game.turn, game.year)})`,
    `Nation: ${input.nationId}`,
    worker ? `Selected civilian: ${worker.id}${worker.type ? ` (${worker.type})` : ""}` : "Selected civilian: none",
    `Orders this turn: ${input.ordersThisTurn}`,
    `Last refusal: ${input.lastRefusal ?? "none"}`,
    `Zoom: ${Math.round(input.zoom * 100)}%`,
    `Camera: ${Math.round(input.camera.x)}, ${Math.round(input.camera.y)}`,
    `Window: ${input.window.width} x ${input.window.height}`,
    `Map: ${game.map.config.cols} x ${game.map.config.rows}`,
    `Save version: ${input.saveVersion}`,
  ];
}
