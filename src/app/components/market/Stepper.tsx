import React, { useId, useState } from "react";
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
   * The Board of Trade (FR-574): a refused "+" stays in the Tab order (aria-disabled, its press sends nothing). Its
   * reason is its accessible description, and shows beside it while it has focus or after a press.
   */
  focusableRefusal?: boolean;
}

/** "− n +": each press sends this turn's total one lower or higher; the engine judges it (FR-074, FR-194). */
export const Stepper: React.FC<StepperProps> = ({ label, name, value, testId, onChange, moreRefusal, note, hideLessAtZero, focusableRefusal }) => {
  const noteId = useId();
  const reasonId = useId();
  const [reasonShown, setReasonShown] = useState(false);
  const refused = moreRefusal !== undefined;
  const focusable = focusableRefusal === true && refused;
  const describedBy = [focusable ? reasonId : undefined, note ? noteId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <span className={`${styles.amount} ${focusableRefusal ? styles.amountAnchor : ""}`}>
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
        aria-label={`${label} one more ${name}`}
        aria-describedby={describedBy}
        aria-disabled={focusable ? true : undefined}
        disabled={refused && !focusable}
        title={moreRefusal}
        onClick={() => (focusable ? setReasonShown(true) : onChange(value + 1))}
        onFocus={focusable ? () => setReasonShown(true) : undefined}
        onBlur={() => setReasonShown(false)}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget) setReasonShown(false);
        }}
      >
        +
      </button>
      {/* Hidden, it is still the description: aria-describedby reads a hidden element it names */}
      {focusable && (
        <span id={reasonId} className={styles.stepReason} hidden={!reasonShown} data-testid={`${testId}-reason`}>
          {moreRefusal}
        </span>
      )}
      {note && (
        <span id={noteId} className={`${styles.stepNote} ${note.tone === "refusal" ? styles.stepRefusal : ""}`} data-testid={`${testId}-note`}>
          {note.text}
        </span>
      )}
    </span>
  );
};
