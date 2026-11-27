"use client";
import React, { useId, useMemo, useRef } from "react";
import { countryName, dealBook, validateOrder, type DealEntry, type OverseasProfitEntry } from "@/engine";
import { buyingPower, creditDebt, hasOpenCredit } from "@/engine/credit/account";
import { CREDIT_FLOOR, CREDIT_HIGH_RATE_PERCENT, CREDIT_LOW_RATE_PERCENT } from "@/engine/credit/definitions";
import type { Nation } from "@/types/Nation";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { dateText, money } from "./gameText";
import { dealBookView, type MoneyLine } from "./market/dealBookView";
import styles from "./market/Market.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";
import { InkPicture } from "./art/ArtPicture";
import { goodsArt } from "./art/inkArt";
import { NationFlag } from "./NationFlag";

interface PageProps {
  title: "Sold" | "Bought" | "Not traded";
  entries: DealEntry[];
  lines: string[];
  /** Said when the page has no line: "Nothing sold." */
  none: string;
  testId: string;
  className?: string;
}

/** One page of the ledger: a line per deal with its commodity's picture (FR-331); what was not traded in muted text. */
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
                <InkPicture src={goodsArt(entry.commodity)} alt="" inline />
                {"counterpartyId" in entry && entry.counterpartyId && <NationFlag nationId={entry.counterpartyId} />}
                {line}
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

/** FR-639: the turn's Overseas Profits, a line per Minor Nation and commodity with its goods picture and the minor's flag. */
const OverseasPage: React.FC<{ entries: OverseasProfitEntry[]; lines: string[] }> = ({ entries, lines }) => {
  const titleId = useId();
  return (
    <section className={`${styles.page} ${styles.wide}`} data-testid="overseas-profits">
      <h3 id={titleId} className={styles.pageTitle}>
        Overseas Profits
      </h3>
      <ul className={styles.ledger} aria-labelledby={titleId}>
        {lines.map((line, i) => (
          <li key={i} className={styles.ledgerLine}>
            <InkPicture src={goodsArt(entries[i].commodity)} alt="" inline />
            <NationFlag nationId={entries[i].minorId} />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
};

const moneyRows = (lines: MoneyLine[]) => lines.map((row, i) => (
  <tr key={`${row.label}-${i}`}>
    <th scope="row">{row.label}</th>
    <td className={row.amount < 0 ? styles.negative : undefined}>{row.text}</td>
  </tr>
));

/** The balances follow the cash movements' total and have no part in the sum. */
const MoneyTable: React.FC<{ title: string; lines: MoneyLine[]; balances?: MoneyLine[]; caption?: string; testId: string }> = ({ title, lines, balances, caption, testId }) => {
  const titleId = useId();
  return (
    <div className={styles.bottomLine} data-testid={testId}>
      <h3 id={titleId} className={styles.pageTitle}>
        {title}
      </h3>
      <table aria-labelledby={titleId}>
        <tbody className={styles.movements}>{moneyRows(lines)}</tbody>
        {balances && <tbody aria-label="Closing balances">{moneyRows(balances)}</tbody>}
      </table>
      {caption && <p className={styles.moneyCaption}>{caption}</p>}
    </div>
  );
};

function CurrentCreditLine({ nation }: { nation: Nation }) {
  const game = useGameStore(s => s.game);
  const submitOrder = useGameStore(s => s.submitOrder);
  const headingId = useId();
  const termsId = useId();
  const status = useRef<HTMLSpanElement>(null);
  const open = hasOpenCredit(nation);
  const order = { kind: "openCredit", nationId: nation.id } as const;
  const canOpen = !open && validateOrder(game, order).ok;
  return (
    <section className={styles.creditLine} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.pageTitle}>Current credit line</h3>
      <span role="status" tabIndex={-1} ref={status}>{open ? "Credit line open" : "Credit line closed"}</span>
      <dl className={styles.creditFigures}>
        <div><dt>Debt</dt><dd>{money(creditDebt(nation))}</dd></div>
        <div><dt>{canOpen ? "Opening limit" : "Credit limit"}</dt><dd>{money(open ? nation.creditAccount.limit : canOpen ? CREDIT_FLOOR : 0)}</dd></div>
        <div><dt>Buying power</dt><dd>{money(buyingPower(nation))}</dd></div>
      </dl>
      {canOpen && <>
        <p id={termsId}>
          Interest per turn is {CREDIT_LOW_RATE_PERCENT}% on debt up to half the limit and {CREDIT_HIGH_RATE_PERCENT}% on the whole debt above half.
          {" "}Embassies require cash. If debt exceeds the limit after upkeep and interest, a forced sale of warehouse stock covers as much of the excess as possible.
        </p>
        <button type="button" className={styles.plainButton} aria-describedby={termsId} onClick={() => {
          if (submitOrder(order).ok) status.current?.focus();
        }}>Open credit line</button>
      </>}
    </section>
  );
}

/**
 * The Deal Book (FR-195, FR-248, FR-255, FR-256; Imp1 Deal Book, rules 11 section 2): the player's deals of the last
 * resolved turn, Sold and Bought side by side, then what was Not traded (units not sold, offers missed, bids nobody
 * filled, each with its cause), the turn it shows ("Turn 1, Spring 1815"), the bottom line ending in the Trade net and,
 * beside it, the Treasury: the trade net, the army upkeep (FR-396), the diplomacy costs and the rest add up to the
 * treasury's change over the turn. The live account can open credit independently of that dated report.
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
          <GameIcon name={UI_ICONS.dealBook} />Deal Book — {nation && <NationFlag nationId={nation.id} />}
          {nation?.name ?? "Unknown"}
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
      {book && view?.overseas && <OverseasPage entries={book.overseasProfits} lines={view.overseas} />}

      {view && (!view.empty || view.treasury) && (
        <div className={styles.totals}>
          {!view.empty && <MoneyTable title="Bottom line" lines={view.bottomLine} testId="bottom-line" />}
          {view.treasury && <MoneyTable title="Treasury" lines={view.treasury} balances={view.balances} caption={view.cash} testId="treasury" />}
        </div>
      )}
      {nation && <CurrentCreditLine nation={nation} />}
    </Modal>
  );
};

export default DealBookModal;
