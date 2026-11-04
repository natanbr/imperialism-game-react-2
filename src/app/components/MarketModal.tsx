"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import type { Order } from "@/engine";
import type { TradeCommodity } from "@/types/Market";
import { money, refusalText } from "./gameText";
import { marketView, type MarketRowView } from "./market/marketView";
import styles from "./market/Market.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";

interface StepperProps {
  label: string;
  name: string;
  value: number;
  testId: string;
  onChange: (amount: number) => void;
}

/** "− n +": each press sends this turn's total one lower or higher; the engine judges it (FR-074). */
const Stepper: React.FC<StepperProps> = ({ label, name, value, testId, onChange }) => (
  <span className={styles.amount}>
    <button className={styles.stepButton} aria-label={`${label} one less ${name}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
      −
    </button>
    <span className={`${styles.amountValue} ${value > 0 ? styles.active : ""}`} data-testid={testId}>
      {value}
    </span>
    <button className={styles.stepButton} aria-label={`${label} one more ${name}`} onClick={() => onChange(value + 1)}>
      +
    </button>
  </span>
);

/**
 * The world market (FR-073, FR-074): per tradeable commodity its price, stock, offer and bid, plus
 * the cargo holds and buy bids. Every button sends one order through submitOrder.
 */
export const MarketModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isMarketOpen);
  const close = useGameStore((s) => s.closeMarket);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);

  const view = useMemo(() => (isOpen && nation ? marketView(game, nation) : null), [isOpen, game, nation]);

  if (!isOpen) return null;

  const send = (kind: "sellCommodity" | "buyCommodity", commodity: TradeCommodity) => (amount: number) => {
    if (!nation) return;
    const order: Order = { kind, nationId: nation.id, commodity, amount };
    submitOrder(order);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-label="Market">
        <header className={styles.header}>
          <h2>
            <GameIcon name={UI_ICONS.market} /> World market — {nation?.name ?? "Unknown"}
          </h2>
          <button onClick={close} className={styles.closeButton} aria-label="Close market">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {view && (
          <div className={styles.summary}>
            <span data-testid="market-cash">
              Cash: <strong>{money(view.treasury)}</strong>
            </span>
            <span data-testid="market-holds" title="Every unit sold or bought takes one cargo hold this turn">
              Cargo holds: <strong>{view.capacity.used}</strong> used, <strong>{view.capacity.free}</strong> free of {view.capacity.holds}
            </span>
            <span data-testid="market-bids" title="At most this many commodities can be bid on in one turn">
              Buy bids: <strong>{view.bids.used}</strong> of {view.bids.max}
            </span>
          </div>
        )}

        {lastRejection && (
          <div className={styles.refusal} role="alert" data-testid="market-refusal">
            {refusalText(lastRejection)}
          </div>
        )}

        <p className={styles.note}>
          Sales and purchases settle at the end of the turn at this price. Bought goods arrive in the warehouse after this turn&apos;s production.
        </p>

        {view && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Commodity</th>
                <th className={styles.number}>Price</th>
                <th className={styles.number}>Stock</th>
                <th>Sell</th>
                <th>Buy</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row: MarketRowView) => (
                <tr key={row.commodity} data-testid={`trade-row-${row.commodity}`}>
                  <td data-testid="name">{row.name}</td>
                  <td className={styles.number} data-testid="price">
                    {money(row.price)}
                  </td>
                  <td className={styles.number} data-testid="stock">
                    {row.stock}
                  </td>
                  <td>
                    <Stepper label="Sell" name={row.name} value={row.sell} testId="sell" onChange={send("sellCommodity", row.commodity)} />
                  </td>
                  <td>
                    <Stepper label="Buy" name={row.name} value={row.buy} testId="buy" onChange={send("buyCommodity", row.commodity)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MarketModal;
