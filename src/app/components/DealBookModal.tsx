"use client";
import React, { useId, useMemo } from "react";
import { countryName, dealBook, type DealEntry } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { dateText } from "./gameText";
import { dealBookView } from "./market/dealBookView";
import styles from "./market/Market.module.css";
import { COMMODITY_ICONS, UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

interface PageProps {
  title: "Sold" | "Bought";
  entries: DealEntry[];
  lines: string[];
  /** Said when the page has no line: "Nothing sold." */
  none: string;
  testId: string;
}

/** One page of the ledger: a line per deal with its commodity's icon; a missed offer or an unsold unit in muted text. */
const Page: React.FC<PageProps> = ({ title, entries, lines, none, testId }) => {
  const titleId = useId();
  return (
    <section className={styles.page}>
      <h3 id={titleId} className={styles.pageTitle}>
        {title}
      </h3>
      {lines.length > 0 ? (
        <ul className={styles.ledger} aria-labelledby={titleId}>
          {lines.map((line, i) => {
            const entry = entries[i];
            const aside = entry.kind === "missed" || entry.kind === "unsold" || entry.kind === "unfilled";
            return (
              <li key={i} className={`${styles.ledgerLine} ${aside ? styles.ledgerAside : ""}`}>
                <GameIcon name={COMMODITY_ICONS[entry.commodity]} /> {line}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.nothing} data-testid={testId}>
          {none}
        </p>
      )}
    </section>
  );
};

/**
 * The Deal Book (FR-195, FR-248; Imp1 Deal Book, rules 11 section 2): the player's deals of the last resolved turn, Sold and
 * Bought side by side (the missed offers and the bids nobody filled under Bought, the units left unsold under Sold), the
 * turn it shows ("Turn 1, Spring 1815") and the bottom line. It only
 * reads the turn's events; it builds no order.
 */
export const DealBookModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isDealBookOpen);
  const close = useGameStore((s) => s.closeDealBook);
  const report = useGameStore((s) => s.eventLog[s.eventLog.length - 1]);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const bottomId = useId();

  const book = useMemo(() => (isOpen && nation ? dealBook(report?.events ?? [], nation.id) : null), [isOpen, nation, report]);
  if (!isOpen) return null;
  const view = book ? dealBookView(book, (id) => countryName(game, id) ?? id) : null;

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.dealBook}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.dealBook} /> Deal Book — {nation?.name ?? "Unknown"}
        </h2>
        <button onClick={close} className={styles.closeButton} aria-label="Close Deal Book">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {report && (
        <p className={styles.dealTurn} data-testid="deal-book-turn">
          Turn {report.turn}, {dateText(report.turn, report.year)}
        </p>
      )}

      {!book || !view || view.empty ? (
        <p className={styles.nothing} data-testid="deal-book-empty">
          No deals last turn.
        </p>
      ) : (
        <>
          <div className={styles.pages}>
            <Page title="Sold" entries={book.sold} lines={view.sold} none="Nothing sold." testId="sold-none" />
            <Page title="Bought" entries={book.bought} lines={view.bought} none="Nothing bought." testId="bought-none" />
          </div>
          <div className={styles.bottomLine}>
            <h3 id={bottomId} className={styles.pageTitle}>
              Bottom line
            </h3>
            <table aria-labelledby={bottomId}>
              <tbody>
                {view.bottomLine.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className={row.amount < 0 ? styles.negative : undefined}>{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

export default DealBookModal;
