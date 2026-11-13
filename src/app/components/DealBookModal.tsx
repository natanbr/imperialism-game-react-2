"use client";
import React, { useId, useMemo } from "react";
import { countryName, dealBook, type DealEntry } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { dateText } from "./gameText";
import { dealBookView, type MoneyLine } from "./market/dealBookView";
import styles from "./market/Market.module.css";
import { COMMODITY_ICONS, UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

interface PageProps {
  title: "Sold" | "Bought" | "Not traded";
  entries: DealEntry[];
  lines: string[];
  /** Said when the page has no line: "Nothing sold." */
  none: string;
  testId: string;
  className?: string;
}

/** One page of the ledger: a line per deal with its commodity's icon; what was not traded in muted text. */
const Page: React.FC<PageProps> = ({ title, entries, lines, none, testId, className }) => {
  const titleId = useId();
  return (
    <section className={`${styles.page} ${className ?? ""}`}>
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

/** A table of money lines; the last one is the total, in bold; a loss in the danger colour. */
const MoneyTable: React.FC<{ title: string; lines: MoneyLine[]; caption?: string; testId: string }> = ({ title, lines, caption, testId }) => {
  const titleId = useId();
  return (
    <div className={styles.bottomLine} data-testid={testId}>
      <h3 id={titleId} className={styles.pageTitle}>
        {title}
      </h3>
      <table aria-labelledby={titleId}>
        <tbody>
          {lines.map((row, i) => (
            <tr key={`${row.label}-${i}`}>
              <th scope="row">{row.label}</th>
              <td className={row.amount < 0 ? styles.negative : undefined}>{row.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <p className={styles.moneyCaption}>{caption}</p>}
    </div>
  );
};

/**
 * The Deal Book (FR-195, FR-248, FR-255, FR-256; Imp1 Deal Book, rules 11 section 2): the player's deals of the last
 * resolved turn, Sold and Bought side by side, then what was Not traded (units not sold, offers missed, bids nobody
 * filled, each with its cause), the turn it shows ("Turn 1, Spring 1815"), the bottom line ending in the Trade net and,
 * beside it, the Treasury: the trade net, the diplomacy costs and the rest add up to the treasury's change over the
 * turn. It only reads the turn's events and treasuries; it builds no order.
 */
export const DealBookModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isDealBookOpen);
  const close = useGameStore((s) => s.closeDealBook);
  const report = useGameStore((s) => s.eventLog[s.eventLog.length - 1]);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();

  const book = useMemo(
    () => (isOpen && nation ? dealBook(report?.events ?? [], nation.id, report?.treasuries?.[nation.id]) : null),
    [isOpen, nation, report]
  );
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
        <div className={styles.pages}>
          <Page title="Sold" entries={book.sold} lines={view.sold} none="Nothing sold." testId="sold-none" />
          <Page title="Bought" entries={book.bought} lines={view.bought} none="Nothing bought." testId="bought-none" />
          {view.notTraded.length > 0 && (
            <Page title="Not traded" entries={book.notTraded} lines={view.notTraded} none="" testId="not-traded-none" className={styles.wide} />
          )}
        </div>
      )}

      {view && (!view.empty || view.treasury) && (
        <div className={styles.totals}>
          {!view.empty && <MoneyTable title="Bottom line" lines={view.bottomLine} testId="bottom-line" />}
          {view.treasury && <MoneyTable title="Treasury" lines={view.treasury} caption={view.cash} testId="treasury" />}
        </div>
      )}
    </Modal>
  );
};

export default DealBookModal;
