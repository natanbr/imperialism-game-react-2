"use client";
import React from "react";
import type { Order, ValidationResult } from "@/engine";
import { FREIGHT_CAR_COST } from "@/definisions/ResourceConversions";
import styles from "./Capital.module.css";

interface FreightCarsProps {
  nationId: string;
  capacity: number;
  carsOrdered: number;
  submitOrder: (order: Order) => ValidationResult;
  onOpenAllocations: () => void;
}

/** The railyard: freight cars ordered this turn, one at a time (FR-039, FR-047). */
export const FreightCars: React.FC<FreightCarsProps> = ({ nationId, capacity, carsOrdered, submitOrder, onOpenAllocations }) => (
  <section className={styles.panel} data-testid="freight-cars" aria-label="Transport">
    <h3 className={styles.panelTitle}>Transport</h3>
    <div className={styles.labourLine}>
      <span>Transport capacity</span>
      <span>{capacity}</span>
    </div>
    <div className={styles.actionRow}>
      <button
        className={styles.actionButton}
        aria-label="Order a freight car"
        onClick={() => submitOrder({ kind: "changeTransportCapacity", nationId, delta: 1 })}
      >
        + Freight car
      </button>
      <button
        className={styles.cancelButton}
        aria-label="Cancel a freight car"
        disabled={carsOrdered <= 0}
        onClick={() => submitOrder({ kind: "changeTransportCapacity", nationId, delta: -1 })}
      >
        Cancel
      </button>
    </div>
    <div className={styles.note} data-testid="cars-ordered">{`${carsOrdered} ordered this turn`}</div>
    <div className={styles.note}>
      {`${FREIGHT_CAR_COST.lumber} Lumber, ${FREIGHT_CAR_COST.steel} Steel and ${FREIGHT_CAR_COST.labour} labour per car`}
    </div>
    <button className={styles.secondaryButton} onClick={onOpenAllocations}>
      Transportation of Commodities
    </button>
  </section>
);
