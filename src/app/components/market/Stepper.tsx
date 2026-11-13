import React from "react";
import styles from "./Market.module.css";

export interface StepperProps {
  /** The verb of the buttons' names: "Sell one more Lumber", "Bid one less Coal". */
  label: string;
  name: string;
  value: number;
  testId: string;
  onChange: (amount: number) => void;
}

/** "− n +": each press sends this turn's total one lower or higher; the engine judges it (FR-074, FR-194). */
export const Stepper: React.FC<StepperProps> = ({ label, name, value, testId, onChange }) => (
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
