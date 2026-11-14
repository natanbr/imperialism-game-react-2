"use client";
import React, { useId } from "react";
import { useGameStore } from "../store/rootStore";
import { dateText } from "./gameText";
import styles from "./market/Market.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { NationSwatch } from "./NationSwatch";
import { Modal } from "./Modal";
import { startNewGameOnCapital } from "@/hooks/mapActions";

/**
 * The end of the game (FR-076): the recorded final scores (`state.gameOver`), ranked, with their
 * three parts, each nation named beside its colour (FR-106). Shown whenever the game is over unless
 * the player closed it to look at the map; New game starts the next one at once (FR-109). A game the Council of Governors
 * decided says so under the date (FR-300); the Council screen of the last meeting shows first (FR-299).
 */
export const GameOverModal: React.FC = () => {
  const gameOver = useGameStore((s) => s.game.gameOver);
  const nations = useGameStore((s) => s.game.nations);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const hidden = useGameStore((s) => s.isGameOverHidden);
  const hide = useGameStore((s) => s.hideGameOver);
  // FR-299: the last meeting's Council screen comes first; this screen shows once it is closed
  const councilFirst = useGameStore((s) => s.councilShown !== null);
  const titleId = useId();

  if (!gameOver || hidden || councilFirst) return null;

  const nationOf = (id: string) => nations.find((n) => n.id === id);

  return (
    // No onClose: neither Escape nor the backdrop ends the game-over screen (FR-236); "Back to the map" does
    <Modal titleId={titleId} overlayClassName={styles.overlay} className={styles.dialog}>
        <header className={styles.header}>
          <h2 id={titleId}>
            <GameIcon name={UI_ICONS.finalScores} /> Game over
          </h2>
        </header>
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
        {gameOver.reason === "council" && gameOver.winnerId !== undefined && gameOver.council && (
          // FR-300: the meeting that elected the winner (FR-295)
          <p className={styles.note} data-testid="game-over-council">
            The Council of Governors chose {nationOf(gameOver.winnerId)?.name ?? gameOver.winnerId}:{" "}
            {gameOver.council.nominees.find((n) => n.nationId === gameOver.winnerId)?.total ?? 0} of {gameOver.council.totalVotes} votes.
          </p>
        )}

        <table className={styles.table} aria-label="Final scores">
          <thead>
            <tr>
              <th>#</th>
              <th>Nation</th>
              <th className={styles.number} title="1 point per $100">Treasury</th>
              <th className={styles.number} title="10 points per capacity point of the mills and factories">Industry</th>
              <th className={styles.number} title="10 points per resource level on own tiles">Development</th>
              <th className={styles.number}>Total</th>
            </tr>
          </thead>
          <tbody>
            {gameOver.scores.map((score, i) => {
              const you = score.nationId === activeNationId;
              return (
                <tr key={score.nationId} className={you ? styles.you : undefined} data-testid={`final-score-${score.nationId}`}>
                  <td data-testid="rank">{i + 1}</td>
                  <td data-testid="nation">
                    <NationSwatch slot={nationOf(score.nationId)?.colorSlot} />
                    {nationOf(score.nationId)?.name ?? score.nationId}
                    {you ? " (you)" : ""}
                  </td>
                  <td className={styles.number} data-testid="treasury">{score.points.treasury}</td>
                  <td className={styles.number} data-testid="industry">{score.points.industry}</td>
                  <td className={styles.number} data-testid="development">{score.points.development}</td>
                  <td className={styles.number} data-testid="total">
                    <strong>{score.total}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
