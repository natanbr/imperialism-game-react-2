"use client";
import React, { useId, useMemo } from "react";
import type { CouncilMetEvent } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { CapitolPicture } from "./art/ArtPicture";
import { COUNCIL_ROW_TEXT, COUNCIL_TABLE_ROWS, councilView, type CouncilColumnView, type CouncilTableRow } from "./council/councilView";
import styles from "./council/Council.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";
import { NationSwatch } from "./NationSwatch";

/** One meeting's report; keyed by the meeting, so a news line of another meeting starts fresh. */
const CouncilReport: React.FC<{ event: CouncilMetEvent }> = ({ event }) => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const closeCouncil = useGameStore((s) => s.closeCouncil);
  const showGameOver = useGameStore((s) => s.showGameOver);
  const titleId = useId();
  const cellIds = useId();
  const abstainedId = useId();
  const view = useMemo(() => councilView(event, game, playerId), [event, game, playerId]);
  const won = view.winnerName !== undefined;
  // FR-299: a winner ended the game, so every way out of its meeting (the button, Escape, the backdrop) leads to the final scores
  const close = won
    ? () => {
        closeCouncil();
        showGameOver();
      }
    : closeCouncil;
  const describedBy = (column: number, row: CouncilTableRow) => `${cellIds}-${column}-${row}`;
  // FR-312: in a world of two Great Powers no province can fill the Other Great Powers row
  const unused = (row: CouncilTableRow) => row === "otherGreatPowers" && view.unusedRowNote !== undefined;

  const numberCell = (column: CouncilColumnView, index: number, row: CouncilTableRow) => {
    const cell = column.cells[row];
    return (
      <td
        className={styles.number}
        title={cell.provinces}
        aria-describedby={describedBy(index, row)}
        data-testid={`council-cell-${column.nationId}-${row}`}
        data-count={cell.count}
      >
        {cell.shown}
      </td>
    );
  };
  const head = (column: CouncilColumnView) => (
    <th scope="col" className={styles.nominee}>
      <NationSwatch slot={column.colorSlot} />
      {column.name}
      {/* FR-313: the columns follow the player, so the standing shows as a mark */}
      <span className={styles.rank} data-testid={`council-rank-${column.nationId}`}>
        {column.rank}
      </span>
    </th>
  );
  const [first, second] = view.columns;

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.dialog}>
      <header className={styles.header}>
        <CapitolPicture size={96} className={styles.picture} />
        <div className={styles.titles}>
          <h2 id={titleId}>
            <GameIcon name={UI_ICONS.council} /> Council of Governors
          </h2>
          <span className={styles.date} data-testid="council-date">
            {view.date}
          </span>
        </div>
      </header>

      <table className={styles.table} aria-label="Votes">
        <thead>
          <tr>
            {head(first)}
            {/* The middle column holds the row names */}
            <td />
            {head(second)}
          </tr>
        </thead>
        <tbody>
          {COUNCIL_TABLE_ROWS.map((row) => (
            <tr
              key={row}
              className={row === "total" ? styles.totalRow : unused(row) ? styles.unusedRow : undefined}
              data-testid={`council-row-${row}`}
              data-unused={unused(row) ? "true" : undefined}
            >
              {numberCell(first, 0, row)}
              <th scope="row" className={styles.rowName}>
                {COUNCIL_ROW_TEXT[row]}
                {unused(row) && <span className={styles.rowNote}>{view.unusedRowNote}</span>}
              </th>
              {numberCell(second, 1, row)}
            </tr>
          ))}
        </tbody>
      </table>
      {/* The provinces behind each number, as the cells' accessible descriptions (their titles show them on hover) */}
      <div hidden>
        {view.columns.flatMap((column, index) =>
          COUNCIL_TABLE_ROWS.map((row) => (
            <span key={`${index}-${row}`} id={describedBy(index, row)}>
              {column.cells[row].provinces}
            </span>
          ))
        )}
      </div>

      {/* FR-311: who abstained and why, then how a minor votes */}
      <p className={styles.note} id={abstainedId} data-testid="council-abstained">
        {view.abstained}
      </p>
      {view.abstentions.length > 0 && (
        <ul className={styles.reasons} aria-labelledby={abstainedId} data-testid="council-abstentions">
          {view.abstentions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className={styles.rule} data-testid="council-rule">
        {view.rule}
      </p>
      <p className={styles.note} data-testid="council-needed">
        {view.needed}
      </p>
      {won ? (
        <h3 className={styles.winner} data-testid="council-result">
          {view.result}
        </h3>
      ) : (
        <p className={styles.result} data-testid="council-result">
          {view.result}
        </p>
      )}

      {/* The player does not vote (Imp1: the screen is a report), so its only control closes it */}
      <footer className={styles.footer}>
        <button type="button" className={won ? styles.primaryButton : styles.button} onClick={close}>
          {won ? "See the final scores" : "Close"}
        </button>
      </footer>
    </Modal>
  );
};

/**
 * The Council of Governors (FR-298; Imp1 vote screen, rules 11 section 8.1): the report of one meeting, the store's
 * `councilShown`. End Turn shows the meeting just held, once, after the Battle screens of that turn (FR-299), so it waits
 * while one is to be seen; the news line of a meeting shows it again (FR-297). It builds no order.
 */
export const CouncilModal: React.FC = () => {
  const event = useGameStore((s) => s.councilShown);
  const battleWaiting = useGameStore((s) => s.battleQueue.length > 0);
  if (!event || battleWaiting) return null;
  return <CouncilReport key={`${event.turn}`} event={event} />;
};

export default CouncilModal;
