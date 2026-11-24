import React, { useId } from "react";
import styles from "./Market.module.css";

export interface StepperProps {
  /** The verb of the buttons' names: "Sell one more Lumber", "Buy one less Coal". */
  label: string;
  name: string;
  value: number;
  testId: string;
  onChange: (amount: number) => void;
  /**
   * Why one more would be refused (FR-248): "+" is disabled and says why in its title. Absent: "+" is enabled and the
   * engine judges the order (the World market, FR-074).
   */
  moreRefusal?: string;
  /**
   * The Board of Trade's line beside the stepper (FR-257): the refusal in words, or what to know while "+" is enabled
   * ("Arvelia favours Valdoria"). It is visible, and the "+" button's accessible description.
   */
  note?: { text: string; tone: "refusal" | "info" };
  /**
   * The Board of Trade (FR-257): at 0 there is no "−" button, only its place, so no button is disabled without a
   * visible reason. Without it "−" is disabled at 0 (the World market, FR-074).
   */
  hideLessAtZero?: boolean;
  /**
   * The Board of Trade (FR-574): no line beside the stepper; a refused "+" says why in its tooltip and its accessible
   * name ("Buy one more Coal: We need a consulate with a seller").
   */
  refusalInName?: boolean;
}

/** "− n +": each press sends this turn's total one lower or higher; the engine judges it (FR-074, FR-194). */
export const Stepper: React.FC<StepperProps> = ({ label, name, value, testId, onChange, moreRefusal, note, hideLessAtZero, refusalInName }) => {
  const noteId = useId();
  const more = `${label} one more ${name}`;
  return (
    <span className={styles.amount}>
      {hideLessAtZero && value <= 0 ? (
        <span className={styles.stepPlace} aria-hidden="true" data-testid={`${testId}-less-place`} />
      ) : (
        <button className={styles.stepButton} aria-label={`${label} one less ${name}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
      )}
      <span className={`${styles.amountValue} ${value > 0 ? styles.active : ""}`} data-testid={testId}>
        {value}
      </span>
      <button
        className={styles.stepButton}
        aria-label={refusalInName && moreRefusal !== undefined ? `${more}: ${moreRefusal}` : more}
        aria-describedby={note ? noteId : undefined}
        disabled={moreRefusal !== undefined}
        title={moreRefusal}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
      {note && (
        <span id={noteId} className={`${styles.stepNote} ${note.tone === "refusal" ? styles.stepRefusal : ""}`} data-testid={`${testId}-note`}>
          {note.text}
        </span>
      )}
    </span>
  );
};
