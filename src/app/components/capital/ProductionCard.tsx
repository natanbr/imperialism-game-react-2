"use client";
import React from "react";
import type { Order, ValidationResult } from "@/engine";
import { BUILDING_TEXT } from "../gameText";
import type { BuildingCardView } from "./capitalView";
import styles from "./Capital.module.css";

interface ProductionCardProps {
  card: BuildingCardView;
  nationId: string;
  submitOrder: (order: Order) => ValidationResult;
}

/** One production building: capacity, Expand, and per output its inputs and amount control (FR-046). */
export const ProductionCard: React.FC<ProductionCardProps> = ({ card, nationId, submitOrder }) => {
  const name = BUILDING_TEXT[card.building];
  const { building, expansion } = card;

  return (
    <section className={styles.card} data-testid={`building-${building}`} aria-label={name}>
      <header className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{name}</h4>
        <span className={styles.capacity} data-testid="capacity">
          {card.unlimited ? "No limit" : `Capacity ${card.capacity}`}
          {card.pendingCapacity > 0 && <span className={styles.pending}> (+{card.pendingCapacity} next turn)</span>}
        </span>
      </header>

      {card.outputs.map((out) => (
        <div key={out.output} className={styles.output} data-testid={`output-${out.output}`}>
          <div className={styles.outputName}>{out.name}</div>
          <ul className={styles.inputs} aria-label={`${out.name} needs`}>
            {out.inputs.map((input) => (
              <li
                key={input.key}
                className={input.missing ? styles.inputMissing : styles.input}
                data-testid={`input-${input.key}`}
                data-missing={input.missing ? "true" : undefined}
                title={input.missing ? "Not enough in the warehouse for one batch" : undefined}
              >
                {input.missing && <span aria-hidden="true">✗ </span>}
                {`${input.label} (${input.stock})`}
              </li>
            ))}
          </ul>
          <div className={styles.amount}>
            <button
              className={styles.stepButton}
              aria-label={`Less ${out.name}`}
              disabled={out.order <= 0}
              onClick={() => submitOrder({ kind: "setProduction", nationId, building, output: out.output, amount: out.order - out.batch })}
            >
              −
            </button>
            <span className={styles.amountValue} data-testid={`order-${out.output}`}>
              {`${out.order} of ${out.max}`}
            </span>
            <button
              className={styles.stepButton}
              aria-label={`More ${out.name}`}
              onClick={() => submitOrder({ kind: "setProduction", nationId, building, output: out.output, amount: out.order + out.batch })}
            >
              +
            </button>
          </div>
        </div>
      ))}

      {expansion && (
        <button
          className={styles.expandButton}
          aria-label={`Expand ${name}`}
          onClick={() => submitOrder({ kind: "expandBuilding", nationId, building })}
        >
          {`Expand to ${expansion.to} (${expansion.lumber} Lumber, ${expansion.steel} Steel)`}
        </button>
      )}
    </section>
  );
};
