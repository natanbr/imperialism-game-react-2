import React from "react";
import styles from "./Market.module.css";

export interface StepperProps {
  /** The verb of the buttons' names: "Sell one more Lumber", "Bid one less Coal". */
  label: string;
  name: string;
  value: number;
  testId: string;
  onChange: (amount: number) => void;
  /**
   * Why one more would be refused (FR-248): "+" is disabled and says why in its title (also its accessible
   * description). Absent: "+" is enabled and the engine judges the order (the World market, FR-074).
   */
  moreRefusal?: string;
}

/** "− n +": each press sends this turn's total one lower or higher; the engine judges it (FR-074, FR-194). */
export const Stepper: React.FC<StepperProps> = ({ label, name, value, testId, onChange, moreRefusal }) => (
  <span className={styles.amount}>
    <button className={styles.stepButton} aria-label={`${label} one less ${name}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
      −
    </button>
    <span className={`${styles.amountValue} ${value > 0 ? styles.active : ""}`} data-testid={testId}>
      {value}
    </span>
    <button
      className={styles.stepButton}
      aria-label={`${label} one more ${name}`}
      disabled={moreRefusal !== undefined}
      title={moreRefusal}
      onClick={() => onChange(value + 1)}
    >
      +
    </button>
  </span>
);
