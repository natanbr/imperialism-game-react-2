"use client";
import React, { useId, useMemo, useState } from "react";
import { useGameStore } from "../../store/rootStore";
import { selectActiveNation } from "../../store/selectors";
import type { Order } from "@/engine";
import type { TradeCommodity } from "@/types/Market";
import { money } from "../gameText";
import { boardView, lastTurnTrades, repeatTrades, type BoardRowView, type PartnerView } from "./boardView";
import { Stepper } from "./Stepper";
import styles from "./Market.module.css";
import { UI_ICONS } from "../icons";
import { GameIcon } from "../GameIcon";
import { Modal } from "../Modal";
import { InkPicture } from "../art/ArtPicture";
import { goodsArt } from "../art/inkArt";

/** "Sellers: Arvelia: 4 units (no consulate) …": the minors on one row, the barrier marked in words. */
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
 * The Board of Trade (FR-194, FR-248, FR-251 to FR-254, FR-257; Imp1 Board of Trade and Trade Book, rules 11 sections 1
 * and 1.2): in "partners" each commodity in the Board order with its board price, our own stock In warehouse and
 * today's bid or offer (a row with a bid has no offer control, and the other way round; a "+" the engine would refuse
 * is disabled and the reason stands beside it), and the minors that sell or buy it with their units and, when we cannot
 * trade with them, why; the note names each minor's favourite. A fixed frame: at 1280x720 the dialog fits the window
 * and only the board scrolls.
 */
export const BoardOfTrade: React.FC = () => {
  const close = useGameStore((s) => s.closeMarket);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const titleId = useId();
  const noteId = useId();

  const orderLog = useGameStore((s) => s.orderLog);
  const [repeated, setRepeated] = useState<{ turn: number; text: string } | null>(null);

  const view = useMemo(() => (nation ? boardView(game, nation) : null), [game, nation]);
  // FR-397: last turn's bids and offers, from the order log (NR-018 kept: the engine holds no standing trade order)
  const lastTrades = useMemo(() => (nation ? lastTurnTrades(orderLog, nation.id, game.turn) : []), [orderLog, nation, game.turn]);

  const send = (kind: "sellCommodity" | "buyCommodity", commodity: TradeCommodity) => (amount: number) => {
    if (!nation) return;
    const order: Order = { kind, nationId: nation.id, commodity, amount };
    submitOrder(order);
  };

  /** FR-397, FR-398: each unit through submitOrder; the line says how many and, for a refused one, why. Shown this turn only. */
  const repeat = () => {
    if (!nation) return;
    const outcome = repeatTrades(lastTrades, nation.id, () => useGameStore.getState().game, submitOrder);
    setRepeated({ turn: game.turn, text: outcome.text });
  };

  return (
    <Modal titleId={titleId} describedBy={noteId} onClose={close} overlayClassName={styles.overlay} className={styles.board}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.market} />Board of Trade — {nation?.name ?? "Unknown"}
        </h2>
        {view && (
          <div className={styles.boardSummary}>
            <span data-testid="market-cash">
              Cash: <strong>{money(view.treasury)}</strong>
            </span>
            <span>{view.fleetText}</span>
            <span data-testid="market-holds" title="Every unit traded takes one hold this turn">
              {view.holdsText}
            </span>
            <span data-testid="market-bids" title="At most this many commodities can be bought in one turn">
              Buying: {view.bids.used} of {view.bids.max}
            </span>
          </div>
        )}
        <button onClick={close} className={styles.closeButton} aria-label="Close Board of Trade">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p id={noteId} className={styles.boardNote}>
        {/* FR-399 (NR-018, card Q15): trade orders are one turn's; the Capital's production orders stand */}
        <span data-testid="board-duration">Buy and sell orders last one turn; production orders in the Capital stay.</span>{" "}
        Deals settle at End Turn at the board price; bought goods arrive next turn. Minor nations sell what their land
        yields and buy only clothing, furniture and hardware. A minor trades only where we hold a consulate (one ordered
        this turn counts) and serves the Great Power it favours first
        {view?.favouritesText ? (
          <>
            : <span data-testid="board-favourites">{view.favouritesText}</span>
          </>
        ) : (
          "."
        )}
      </p>

      {view?.firstSaleText && (
        <p className={styles.boardNote} data-testid="first-sale">
          {view.firstSaleText}
        </p>
      )}

      {nation && lastTrades.length > 0 && (
        <p className={styles.boardNote}>
          <button type="button" className={styles.plainButton} onClick={repeat}>
            Repeat last turn&apos;s trades
          </button>
          {repeated?.turn === game.turn && (
            <>
              {" "}
              <span data-testid="repeat-result" role="status">
                {repeated.text}
              </span>
            </>
          )}
        </p>
      )}

      {view && (
        <div className={styles.boardPane}>
          <table className={`${styles.table} ${styles.boardTable}`}>
            <thead>
              <tr>
                <th>Commodity</th>
                <th className={styles.number}>Price</th>
                <th className={styles.number}>In warehouse</th>
                <th>Buy</th>
                <th>Sell</th>
                <th>Minor nations</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row: BoardRowView) => (
                <tr key={row.commodity} data-testid={`trade-row-${row.commodity}`}>
                  <td className={styles.fixed} data-testid="name">
                    <InkPicture src={goodsArt(row.commodity)} alt="" inline />{row.name}
                  </td>
                  <td className={`${styles.number} ${styles.fixed}`} data-testid="price">
                    {money(row.price)}
                    {/* FR-394: the price a deal with a minor we subsidise gives, under the board price */}
                    {row.dealPrices?.map((line) => (
                      <div key={line} className={`${styles.stepNote} ${styles.stepRefusal}`} data-testid="deal-price">
                        {line}
                      </div>
                    ))}
                  </td>
                  <td className={`${styles.number} ${styles.fixed}`} data-testid="available">
                    {row.available}
                  </td>
                  <td className={styles.stepCell}>
                    {row.offer === 0 && (
                      <Stepper
                        label="Buy"
                        name={row.name}
                        value={row.bid}
                        testId="bid"
                        moreRefusal={row.bidMoreRefusal}
                        note={row.bidNote}
                        hideLessAtZero
                        onChange={send("buyCommodity", row.commodity)}
                      />
                    )}
                  </td>
                  <td className={styles.stepCell}>
                    {row.bid === 0 && (
                      <Stepper
                        label="Sell"
                        name={row.name}
                        value={row.offer}
                        testId="offer"
                        moreRefusal={row.offerMoreRefusal}
                        note={row.offerNote}
                        hideLessAtZero
                        onChange={send("sellCommodity", row.commodity)}
                      />
                    )}
                  </td>
                  <td className={styles.partnersCell}>
                    {row.sellers.length > 0 && <PartnerList label="Sellers" partners={row.sellers} testId="sellers" />}
                    {row.buyers.length > 0 && <PartnerList label="Buyers" partners={row.buyers} testId="buyers" />}
                    {row.noMinorText && (
                      <span className={styles.noMinor} data-testid="no-minor">
                        {row.noMinorText}
                      </span>
                    )}
                    {/* FR-494: the other Great Power's bid or offer of last turn (FR-491), a line of its own under the minors */}
                    {row.rivalLastTurn && (
                      <div className={styles.noMinor} data-testid="rival-last-turn">
                        {row.rivalLastTurn}
                      </div>
                    )}
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
