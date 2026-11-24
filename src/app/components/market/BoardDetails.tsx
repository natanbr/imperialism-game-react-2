"use client";
import React from "react";
import type { BoardView, PartnerView } from "./boardView";
import styles from "./Market.module.css";
import { InkPicture } from "../art/ArtPicture";
import { goodsArt } from "../art/inkArt";
import { NationFlag } from "../NationFlag";

/** "Sellers: Arvelia: 4 units (no consulate) …": the minors on one row, the barrier marked in words (FR-251). */
const PartnerList: React.FC<{ label: "Sellers" | "Buyers"; partners: PartnerView[]; testId: string }> = ({ label, partners, testId }) => (
  <div className={styles.partners} data-testid={testId}>
    {/* The list carries the name for assistive technology; the visible label is not read twice */}
    <span className={styles.partnersLabel} aria-hidden="true">
      {label}:
    </span>
    <ul className={styles.partnerList} aria-label={label}>
      {partners.map((p) => (
        <li key={p.minorId} className={`${styles.partner} ${p.barrier ? styles.partnerBlocked : ""}`}>
          <NationFlag nationId={p.minorId} />
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
 * The Details tab (FR-575): what the Board tab no longer shows. The explanation that stood under the title (FR-399's
 * duration first, FR-251's favourites, FR-253's goods the minors buy), the first-sale help (FR-434), and per commodity
 * each seller and buyer with its units and barrier (FR-251, FR-254), the subsidy deal prices (FR-394), what a purchase or
 * a sale may meet while its "+" is open ("money back if Valdoria does not sell", a minor that favours another Great Power,
 * FR-252, FR-494) and the other Great Powers' last-turn trades (FR-494).
 */
export const BoardDetails: React.FC<{ view: BoardView }> = ({ view }) => (
  <>
    <p className={styles.boardNote} data-testid="board-explanation">
      {/* FR-399 (NR-018, card Q15): trade orders are one turn's; the Capital's production orders stand */}
      <span data-testid="board-duration">Buy and sell orders last one turn; production orders in the Capital stay.</span>{" "}
      Deals settle at End Turn at the board price; bought goods arrive next turn. Minor nations sell what their land yields
      and buy only clothing, furniture and hardware. A minor trades only where we hold a consulate (one ordered this turn
      counts) and serves the Great Power it favours first
      {view.favouritesText ? (
        <>
          : <span data-testid="board-favourites">{view.favouritesText}</span>
        </>
      ) : (
        "."
      )}
    </p>

    {view.firstSaleText && (
      <p className={styles.boardNote} data-testid="first-sale">
        {view.firstSaleText}
      </p>
    )}

    <table className={`${styles.table} ${styles.detailsTable}`}>
      <thead>
        <tr>
          <th>Commodity</th>
          <th>Minor nations</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => {
          const bidInfo = row.bidNote?.tone === "info" ? row.bidNote.text : undefined;
          const offerInfo = row.offerNote?.tone === "info" ? row.offerNote.text : undefined;
          return (
            <tr key={row.commodity} data-testid={`detail-row-${row.commodity}`}>
              <td className={styles.fixed} data-testid="name">
                <InkPicture src={goodsArt(row.commodity)} alt="" inline />{row.name}
              </td>
              <td className={styles.partnersCell}>
                {row.sellers.length > 0 && <PartnerList label="Sellers" partners={row.sellers} testId="sellers" />}
                {row.buyers.length > 0 && <PartnerList label="Buyers" partners={row.buyers} testId="buyers" />}
                {row.noMinorText && (
                  <span className={styles.noMinor} data-testid="no-minor">
                    {row.noMinorText}
                  </span>
                )}
              </td>
              <td className={styles.detailNotes}>
                {/* FR-394: the price a deal with a minor we subsidise gives */}
                {row.dealPrices?.map((line) => (
                  <div key={line} data-testid="deal-price">
                    {line}
                  </div>
                ))}
                {bidInfo && (
                  <div>
                    <span className={styles.noteSide}>Buy:</span> <span data-testid="bid-note">{bidInfo}</span>
                  </div>
                )}
                {offerInfo && (
                  <div>
                    <span className={styles.noteSide}>Sell:</span> <span data-testid="offer-note">{offerInfo}</span>
                  </div>
                )}
                {/* FR-494: the other Great Power's purchase or sale of last turn (FR-491) */}
                {row.rivalLastTurn && (
                  <div className={styles.noMinor} data-testid="rival-last-turn">
                    {row.rivalLastTurn}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </>
);
