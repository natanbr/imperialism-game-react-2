"use client";
import React, { useId, useMemo } from "react";
import { useGameStore } from "../../store/rootStore";
import { selectActiveNation } from "../../store/selectors";
import type { Order } from "@/engine";
import type { TradeCommodity } from "@/types/Market";
import { money, refusalText } from "../gameText";
import { boardView, type BoardRowView, type PartnerView } from "./boardView";
import { Stepper } from "./Stepper";
import styles from "./Market.module.css";
import { COMMODITY_ICONS, UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";
import { Modal } from "../Modal";

/** "Sellers: Arvelia 4, favours Testland (no consulate) …": the minors on one row, the barrier marked in words. */
const PartnerList: React.FC<{ label: "Sellers" | "Buyers"; partners: PartnerView[]; testId: string }> = ({ label, partners, testId }) => (
  <div className={styles.partners} data-testid={testId}>
    {/* The list carries the name for assistive technology; the visible label is not read twice */}
    <span className={styles.partnersLabel} aria-hidden="true">
      {label}:
    </span>
    <ul className={styles.partnerList} aria-label={label}>
      {partners.map((p) => (
        <li key={p.minorId} className={`${styles.partner} ${p.barrier ? styles.partnerBlocked : ""}`}>
          <span>{p.text}</span>
          {p.barrier && (
            <>
              {" "}
              <span className={styles.barrier} data-testid="barrier">
                ({p.barrier})
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * The Board of Trade (FR-194; Imp1 Board of Trade and Trade Book, rules 11 sections 1 and 1.2): in "partners" each
 * commodity in the Board order with its board price, the stock Available and today's bid or offer (a row with a bid has
 * no offer control, and the other way round), and the minors that sell or buy it with their favourite and, when we
 * cannot trade with them, why. A fixed frame: at 1280x720 the dialog fits the window and only the board scrolls.
 */
export const BoardOfTrade: React.FC = () => {
  const close = useGameStore((s) => s.closeMarket);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const noteId = useId();

  const view = useMemo(() => (nation ? boardView(game, nation) : null), [game, nation]);

  const send = (kind: "sellCommodity" | "buyCommodity", commodity: TradeCommodity) => (amount: number) => {
    if (!nation) return;
    const order: Order = { kind, nationId: nation.id, commodity, amount };
    submitOrder(order);
  };

  return (
    <Modal titleId={titleId} describedBy={noteId} onClose={close} overlayClassName={styles.overlay} className={styles.board}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.market} /> Board of Trade — {nation?.name ?? "Unknown"}
        </h2>
        {view && (
          <div className={styles.boardSummary}>
            <span data-testid="market-cash">
              Cash: <strong>{money(view.treasury)}</strong>
            </span>
            <span data-testid="market-holds" title="Every unit traded takes one hold this turn">
              {view.holdsText}
            </span>
            <span data-testid="market-bids" title="At most this many commodities can be bid on in one turn">
              Bids: {view.bids.used} of {view.bids.max}
            </span>
          </div>
        )}
        <button onClick={close} className={styles.closeButton} aria-label="Close Board of Trade">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p id={noteId} className={styles.boardNote}>
        Deals settle at End Turn at the board price. A minor trades only where we hold a consulate (one ordered this turn
        counts) and serves the Great Power it favours first. Bought goods arrive next turn.
      </p>

      {lastRejection && (
        <div className={styles.refusal} role="alert" data-testid="market-refusal">
          {refusalText(lastRejection)}
        </div>
      )}

      {view && (
        <div className={styles.boardPane}>
          <table className={`${styles.table} ${styles.boardTable}`}>
            <thead>
              <tr>
                <th>Commodity</th>
                <th className={styles.number}>Price</th>
                <th className={styles.number}>Available</th>
                <th>Bid</th>
                <th>Offer</th>
                <th>Minor nations</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row: BoardRowView) => (
                <tr key={row.commodity} data-testid={`trade-row-${row.commodity}`}>
                  <td className={styles.fixed} data-testid="name">
                    <GameIcon name={COMMODITY_ICONS[row.commodity]} /> {row.name}
                  </td>
                  <td className={`${styles.number} ${styles.fixed}`} data-testid="price">
                    {money(row.price)}
                  </td>
                  <td className={`${styles.number} ${styles.fixed}`} data-testid="available">
                    {row.available}
                  </td>
                  <td className={styles.fixed}>
                    {row.offer === 0 && <Stepper label="Bid" name={row.name} value={row.bid} testId="bid" onChange={send("buyCommodity", row.commodity)} />}
                  </td>
                  <td className={styles.fixed}>
                    {row.bid === 0 && <Stepper label="Offer" name={row.name} value={row.offer} testId="offer" onChange={send("sellCommodity", row.commodity)} />}
                  </td>
                  <td className={styles.partnersCell}>
                    {row.sellers.length > 0 && <PartnerList label="Sellers" partners={row.sellers} testId="sellers" />}
                    {row.buyers.length > 0 && <PartnerList label="Buyers" partners={row.buyers} testId="buyers" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

export default BoardOfTrade;
