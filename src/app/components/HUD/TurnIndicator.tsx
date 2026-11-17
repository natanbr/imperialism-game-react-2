import React, { useId, useMemo } from "react";
import { councilVote, countryName, nextCouncilTurn, turnLimitOf, warBetween, yearOfTurn } from "@/engine";
import { useGameStore } from "@/store/rootStore";
import { WorkerStatus } from "@/types/Workers";
import { councilProjectionText, dateText } from "../gameText";

/**
 * The next Council meeting (FR-301): "Next Council: turn 20 (Winter 1819)", or "Council: this turn" on a meeting turn.
 * Under it, shown, the vote the Council would give now, the player's nation first (FR-313, FR-314; Imp1's Council
 * Projection, the exact count), which is also the line's accessible description. Nothing on a world without provinces
 * (two-islands), after the last meeting and after game over. The HUD places it after Tile Info and the score table
 * (FR-371), not under the turn line.
 */
export const NextCouncil: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const projectionId = useId();
  const next = nextCouncilTurn(game);
  const projection = useMemo(() => {
    const vote = councilVote(game);
    if (!vote) return undefined;
    const nameOf = (id: string) => game.nations.find((n) => n.id === id)?.name ?? id;
    return councilProjectionText(vote, playerId, nameOf);
  }, [game, playerId]);
  if (next === undefined || game.gameOver) return null;
  return (
    <>
      <div className="next-council" data-testid="next-council" aria-describedby={projection ? projectionId : undefined}>
        {next === game.turn ? "Council: this turn" : `Next Council: turn ${next} (${dateText(next, yearOfTurn(game, next))})`}
      </div>
      {projection && (
        <div id={projectionId} className="council-projection" data-testid="council-projection">
          {projection}
        </div>
      )}
    </>
  );
};

/** One line each, like the Council lines (globals.css is lane L2's in M12, so the look is set here: 13 px on 16 px). */
const STATUS_LINE_STYLE: React.CSSProperties = { margin: "-8px 0 8px", fontSize: 13, lineHeight: "16px" };

export const atWarText = (name: string, since: number): string => `At war with ${name} (since turn ${since})`;
export const idleCiviliansText = (count: number): string => `${count} ${count === 1 ? "civilian" : "civilians"} without orders`;

/**
 * What the player should not miss at the start of a turn, under the turn line: each war, "At war with Valdoria (since
 * turn 3)", the other Great Powers first, then the minors in id order (FR-412); and the civilians that have no move or
 * job this turn, "3 civilians without orders" (FR-432, card Q95: it informs, End Turn asks nothing).
 */
const PlayerStatus: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const wars = useMemo(() => {
    const others = [...game.nations.filter((n) => n.id !== playerId).map((n) => n.id), ...(game.minorNations ?? []).map((m) => m.id)];
    return others.flatMap((id) => {
      const war = warBetween(game, playerId, id);
      return war ? [{ id, text: atWarText(countryName(game, id) ?? id, war.since) }] : [];
    });
  }, [game, playerId]);
  const idle = useMemo(
    () => game.map.tiles.flat().reduce((n, tile) => n + tile.workers.filter((w) => w.nationId === playerId && w.status === WorkerStatus.Available).length, 0),
    [game.map, playerId]
  );
  return (
    <>
      {wars.map((war) => (
        <div key={war.id} style={STATUS_LINE_STYLE} data-testid="at-war">
          {war.text}
        </div>
      ))}
      {idle > 0 && (
        <div style={STATUS_LINE_STYLE} data-testid="idle-civilians">
          {idleCiviliansText(idle)}
        </div>
      )}
    </>
  );
};

/**
 * The turn of the game's length and the date, "Turn: 1 of 40 / Spring 1815" (FR-048, FR-075), then the wars and the idle
 * civilians (FR-412, FR-432). The next Council (FR-301) is NextCouncil, placed by the HUD.
 */
export const TurnIndicator: React.FC = () => {
  const turn = useGameStore((s) => s.game.turn);
  const year = useGameStore((s) => s.game.year);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const limit = useGameStore((s) => turnLimitOf(s.game));

  if (gameOver) {
    // FR-315: its date wraps under the text on a 16 px line, so the news keeps room above the Final scores button
    return (
      <div className="turn-indicator turn-indicator-over" data-testid="turn-indicator">
        <div>
          <strong>Game over</strong> after turn {gameOver.turn} of {limit}
        </div>
        <div className="turn-date">{dateText(gameOver.turn, gameOver.year)}</div>
      </div>
    );
  }

  return (
    <>
      <div className="turn-indicator" data-testid="turn-indicator">
        <div>
          <strong>Turn:</strong> {turn} of {limit}
        </div>
        <div className="turn-date">{dateText(turn, year)}</div>
      </div>
      <PlayerStatus />
    </>
  );
};
