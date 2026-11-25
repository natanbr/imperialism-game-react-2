"use client";
import React, { useId, useState } from "react";
import { BOARD_ORDER, countryName, dealBook, isMinorNation, partnerRanking } from "@/engine";
import { diplomacyAfterThisTurn, lastTradeOrdersOf } from "@/engine/market/partners";
import type { GameState } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { NationId } from "@/types/Common";
import { useGameStore } from "@/store/rootStore";
import { commodityName } from "../gameText";
import { NationFlag } from "../NationFlag";
import type { BoardView } from "./boardView";
import { dealLineText } from "./dealBookView";
import styles from "./Market.module.css";
import book from "./TradeBook.module.css";

interface RoundProps {
  title: string;
  commodities: TradeCommodity[];
  children: (commodity: TradeCommodity) => React.ReactNode;
}

function Round({ title, commodities, children }: RoundProps) {
  const heading = useId();
  const [choice, setChoice] = useState<TradeCommodity>();
  // Bids can be cancelled, or a different save restored while the book is open.
  const selected = choice && commodities.includes(choice) ? choice : commodities[0];
  return (
    <section aria-labelledby={heading} className={styles.page}>
      <h3 id={heading} className={styles.pageTitle}>{title}</h3>
      {selected ? <>
        <label className={book.picker}>
          Commodity
          <select value={selected} onChange={(event) => setChoice(event.target.value as TradeCommodity)}>
            {commodities.map(commodity => <option key={commodity} value={commodity}>{commodityName(commodity)}</option>)}
          </select>
        </label>
        {children(selected)}
      </> : <p className={styles.nothing}>Place a buy bid on the Board to open its commodity page.</p>}
    </section>
  );
}

type BookProps = { game: GameState; nationId: NationId };

function SettledMarket({ game, nationId, commodity }: BookProps & { commodity: TradeCommodity }) {
  const report = useGameStore(s => s.eventLog.find(r => r.turn === game.turn - 1));
  const nameOf = (id: string) => countryName(game, id) ?? id;
  const powers = game.nations.map(({ id, name }) => {
    const orders = lastTradeOrdersOf(game, id);
    return { id, name, offered: orders.sell[commodity] ?? 0, bid: orders.buy[commodity] ?? 0 };
  });
  const sellers = powers.filter(power => power.offered > 0);
  const bidders = powers.filter(power => power.bid > 0);
  const deals = report && dealBook(report.events, nationId);
  const encounters = deals && [...deals.bought, ...deals.notTraded].filter(entry =>
    (entry.kind === "bought" || entry.kind === "missed") && entry.commodity === commodity &&
    entry.counterpartyId !== undefined && isMinorNation(game, entry.counterpartyId));
  return <>
    <h4>Great Power offers</h4>
    {sellers.length ? <ul className={styles.ledger} aria-label="Great Power offers">
      {sellers.map(({ id, name, offered }) =>
        <li key={id}><NationFlag nationId={id} />{name}: {offered} {offered === 1 ? "unit" : "units"}</li>)}
    </ul> : <p className={styles.nothing}>No Great Power offered {commodityName(commodity)}.</p>}
    <h4>Bidding Great Powers</h4>
    <ul className={styles.ledger} aria-label="Bidding Great Powers">
      {bidders.map(({ id, name }) => <li key={id}><NationFlag nationId={id} />{name}</li>)}
    </ul>
    <h4>Our encounters</h4>
    {encounters?.length ? <ul className={styles.ledger} aria-label="Our encounters">
      {encounters.map((entry, i) => <li key={i}>{dealLineText(entry, nameOf)}</li>)}
    </ul> : <p className={styles.nothing}>{report ? "No minor purchase or missed offer recorded." : "Deal Book report unavailable for this turn."}</p>}
  </>;
}

export function TradeBook({ game, nationId, view }: BookProps & { view: BoardView }) {
  const current = view.rows.filter(row => row.bid > 0);
  const priorBids = lastTradeOrdersOf(game, nationId).buy;
  const settled = BOARD_ORDER.filter(commodity => (priorBids[commodity] ?? 0) > 0);
  return (
    <div className={book.pages}>
      <Round title={`Current turn ${game.turn}`} commodities={current.map(row => row.commodity)}>
        {commodity => {
          const row = current.find(r => r.commodity === commodity)!;
          const known = diplomacyAfterThisTurn(game, nationId);
          return <>
            <p>Our remaining holds: <strong>{view.capacity.free}</strong></p>
            <h4>Minor sellers</h4>
            {row.sellers.length ? <ul className={styles.ledger}>
              {row.sellers.map(seller => (
                <li key={seller.minorId} className={book.seller}>
                  <strong><NationFlag nationId={seller.minorId} />{seller.text}</strong>
                  {seller.barrier && <span className={styles.ledgerAside}> ({seller.barrier})</span>}
                  <div className={book.preference}>
                    <span>Seller preference</span>
                    <ol aria-label="Seller preference">
                      {partnerRanking(known, seller.minorId).map(id => (
                        <li key={id}><NationFlag nationId={id} />{countryName(game, id) ?? id}</li>
                      ))}
                    </ol>
                  </div>
                </li>
              ))}
            </ul> : <p className={styles.nothing}>No minor nation offers {row.name} this turn.</p>}
          </>;
        }}
      </Round>
      {game.turn > 1 && settled.length > 0 &&
        <Round title={`Settled turn ${game.turn - 1}`} commodities={settled}>
          {commodity => <SettledMarket game={game} nationId={nationId} commodity={commodity} />}
        </Round>}
    </div>
  );
}
