"use client";
import React from "react";
import styles from "./CapitalModal.module.css";

interface TransportSectionProps {
  capacity: number;
  capacityPendingIncrease: number | undefined;
  buyCount: number;
  maxPurchasable: number;
  onSliderChange: (value: number) => void;
  onOpenAllocation: () => void;
}

export const TransportSection: React.FC<TransportSectionProps> = ({
  capacity,
  capacityPendingIncrease,
  buyCount,
  maxPurchasable,
  onSliderChange,
  onOpenAllocation,
}) => {
  return (
    <section>
      <div className={styles.transportContent}>
        <h3>Transport</h3>

        <div
          onClick={onOpenAllocation}
          className={styles.capacityRow}
          title="Click to distribute transport capacity per resource"
        >
          <span>Transport Capacity</span>
          <strong>{capacity}</strong>
          {capacityPendingIncrease && (
            <span className={styles.capacityIncrease}>+{capacityPendingIncrease}</span>
          )}
        </div>

        <div className={styles.sliderRow}>
          <span>Increase capacity </span>
          <input
            type="range"
            min={0}
            max={maxPurchasable + buyCount}
            step={1}
            value={buyCount}
            onChange={(e) => onSliderChange(Number(e.target.value) || 0)}
          />
        </div>

        <button
          onClick={onOpenAllocation}
          className={styles.actionButton}
          title="Open Transportation of Commodities"
        >
          Transportation of Commodities
        </button>
      </div>
    </section>
  );
};
