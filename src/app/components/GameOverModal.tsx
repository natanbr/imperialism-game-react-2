"use client";
import React, { useId } from "react";
import type { GameOver } from "@/types/Score";
import { finalStandings, isLastMeeting } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { dateText, groupedNumber } from "./gameText";
import styles from "./market/Market.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { NationSwatch } from "./NationSwatch";
import { Modal } from "./Modal";
import { startNewGameOnCapital } from "@/hooks/mapActions";

/**
 * FR-415: "Defeat: Valdoria won the Council of Governors." or "Defeat: Valdoria won by conquest." when another nation won;
 * undefined for our win and for a turn-limit end (no winner: the ranked scores tell).
 */
export function defeatText(gameOver: GameOver, playerId: string, nameOf: (id: string) => string): string | undefined {
  if (gameOver.winnerId === undefined || gameOver.winnerId === playerId) return undefined;
  const winner = nameOf(gameOver.winnerId);
  return gameOver.reason === "council" ? `Defeat: ${winner} won the Council of Governors.` : `Defeat: ${winner} won by conquest.`;
}

/** Only an overflowing table needs a keyboard scroll stop. Keep initial focus on Back to the map. */
function observeTableWidth(viewport: HTMLDivElement | null) {
  if (!viewport || typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(() => {
    viewport.tabIndex = viewport.scrollWidth > viewport.clientWidth ? 0 : -1;
  });
  observer.observe(viewport);
  return () => observer.disconnect();
}

/**
 * The end of the game (FR-076): the recorded final scores (`state.gameOver`), ranked, with their
 * three parts, each nation named beside its colour (FR-106). Shown whenever the game is over unless
 * the player closed it to look at the map; New game starts the next one at once (FR-109). A game the Council of Governors
 * decided says so under the date (FR-300); the Council screen of the last meeting shows first (FR-299).
 */
export const GameOverModal: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const { gameOver, nations } = game;
  const activeNationId = useGameStore((s) => s.activeNationId);
  const hidden = useGameStore((s) => s.isGameOverHidden);
  const hide = useGameStore((s) => s.hideGameOver);
  // FR-299: the last meeting's Council screen comes first; this screen shows once it is closed
  const councilFirst = useGameStore((s) => s.councilShown !== null);
  const titleId = useId();

  if (!gameOver || hidden || councilFirst) return null;

  const nationOf = (id: string) => nations.find((n) => n.id === id);
  const defeat = defeatText(gameOver, activeNationId, (id) => nationOf(id)?.name ?? id);
  const vote = gameOver.council;
  const winner = vote?.nominees.find(n => n.nationId === gameOver.winnerId);
  const decidedBy = gameOver.decidedBy ?? vote?.decidedBy;
  const lastCouncil = gameOver.reason === "council" && decidedBy !== undefined && isLastMeeting(game, gameOver.turn);
  const tieBreak = decidedBy === "standing" && vote
    ? (vote.nominees[0].standing === vote.nominees[1].standing ? ", by turn order" : ", on standing")
    : "";
  const standings = finalStandings(game, gameOver);
  const bestScore = !gameOver.reason && gameOver.winnerId === undefined ? gameOver.scores[0] : undefined;

  return (
    // No onClose: neither Escape nor the backdrop ends the game-over screen (FR-236); "Back to the map" does
    <Modal titleId={titleId} overlayClassName={styles.overlay} className={styles.dialog}>
        <header className={styles.header}>
          <h2 id={titleId}>
            <GameIcon name={UI_ICONS.finalScores} />Game over
          </h2>
        </header>
        {lastCouncil && vote && winner && (
          <p className={styles.note} style={defeat ? { color: "var(--color-text-danger)", fontWeight: 700 } : undefined} data-testid="game-over-council">
            {defeat ? "Defeat: " : ""}The Council of Governors chose {nationOf(winner.nationId)?.name ?? winner.nationId} at the last meeting:{" "}
            {winner.total} of {vote.totalVotes} votes{tieBreak}.
          </p>
        )}
        {defeat && !lastCouncil && (
          // FR-415: a game another nation won says so first (Market.module.css is layout only in M12: the colour is set here)
          <p className={styles.note} style={{ color: "var(--color-text-danger)", fontWeight: 700 }} data-testid="game-over-outcome">
            {defeat}
          </p>
        )}
        <p className={styles.note} data-testid="game-over-date">
          The game ended after {dateText(gameOver.turn, gameOver.year)} (turn {gameOver.turn}).
        </p>
        {gameOver.reason === "conquest" && gameOver.winnerId !== undefined && (
          // FR-223: one Great Power is left standing; every other one has fallen
          <p className={styles.note} data-testid="game-over-conquest">
            {nationOf(gameOver.winnerId)?.name ?? gameOver.winnerId} has conquered{" "}
            {nations.filter((n) => n.id !== gameOver.winnerId).map((n) => n.name).join(" and ")}.
          </p>
        )}
        {gameOver.reason === "council" && !lastCouncil && gameOver.winnerId !== undefined && gameOver.council && (
          // FR-300: the meeting that elected the winner (FR-295)
          <p className={styles.note} data-testid="game-over-council">
            The Council of Governors chose {nationOf(gameOver.winnerId)?.name ?? gameOver.winnerId}:{" "}
            {gameOver.council.nominees.find((n) => n.nationId === gameOver.winnerId)?.total ?? 0} of {gameOver.council.totalVotes} votes.
          </p>
        )}
        {bestScore && <p className={styles.note}>Best score: {nationOf(bestScore.nationId)?.name ?? bestScore.nationId} ({groupedNumber(bestScore.total)})</p>}

        <div className={styles.finalScoresScroll} role="region" aria-label="Final standings" ref={observeTableWidth}>
          <table className={styles.table} aria-label="Final scores">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Nation</th>
                <th scope="col" className={styles.number} title="1 point per $100">Treasury</th>
                <th scope="col" className={styles.number} title="10 points per capacity point of the mills and factories">Industry</th>
                <th scope="col" className={styles.number} title="Discovered resources on owned tiles earn 10 points for level 1, 10 more for level 2 and 50 more for level 3. On conquered land, only resources collected by the owner earn points.">Development</th>
                {/* FR-402 (M12 review F4): the total counts the jobs still open, so the parts add up to it */}
                <th scope="col" className={styles.number} title="Work in progress: 1 point per $100 paid for each job not yet finished">In progress</th>
                <th scope="col" className={styles.number}>Score</th>
                <th scope="col" className={styles.number}>Provinces</th>
                <th scope="col" className={styles.number} title="Military strength">Military</th>
                <th scope="col" className={styles.number}>Standing</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(({ score, provinces, military, standing }, i) => {
                const you = score.nationId === activeNationId;
                return (
                  <tr key={score.nationId} className={you ? styles.you : undefined} data-testid={`final-score-${score.nationId}`}>
                    <td data-testid="rank">{i + 1}</td>
                    <th scope="row" data-testid="nation">
                      <NationSwatch slot={nationOf(score.nationId)?.colorSlot} />
                      {nationOf(score.nationId)?.name ?? score.nationId}
                      {you ? " (you)" : ""}
                    </th>
                    <td className={styles.number} data-testid="treasury">{score.points.treasury}</td>
                    <td className={styles.number} data-testid="industry">{score.points.industry}</td>
                    <td className={styles.number} data-testid="development">{score.points.development}</td>
                    <td className={styles.number} data-testid="work-in-progress">{score.points.workInProgress}</td>
                    <td className={styles.number} data-testid="total">
                      <strong>{score.total}</strong>
                    </td>
                    <td className={styles.number} data-testid="provinces">{provinces}</td>
                    <td className={styles.number} data-testid="military">{Number(military.toFixed(2))}</td>
                    <td className={styles.number} data-testid="standing">{standing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <button className={styles.plainButton} onClick={hide}>
            Back to the map
          </button>
          <button className={styles.primaryButton} onClick={startNewGameOnCapital}>
            <GameIcon name={UI_ICONS.newGame} /> New game
          </button>
        </div>
    </Modal>
  );
};

export default GameOverModal;
