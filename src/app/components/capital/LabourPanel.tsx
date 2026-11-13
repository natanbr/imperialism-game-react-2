"use client";
import React from "react";
import type { Order, ValidationResult } from "@/engine";
import { MIGRANT_COST, TRAINING_COST } from "@/definisions/ResourceConversions";
import type { WorkerGrade } from "@/types/Industry";
import { commodityName, money } from "../gameText";
import type { LabourView } from "./capitalView";
import styles from "./Capital.module.css";

interface LabourPanelProps {
  view: LabourView;
  nationId: string;
  submitOrder: (order: Order) => ValidationResult;
}

const GRADE_TEXT: Record<WorkerGrade, string> = { untrained: "Untrained", trained: "Trained", expert: "Expert" };

const TRAINING: readonly { from: "untrained" | "trained"; article: string; to: string }[] = [
  { from: "untrained", article: "an untrained", to: "Trained" },
  { from: "trained", article: "a trained", to: "Expert" },
];

const MIGRANT_TEXT = Object.entries(MIGRANT_COST)
  .map(([key, amount]) => `${amount} ${commodityName(key)}`)
  .join(", ");

/** Labour, the workforce, the Trade School and the Capitol (FR-047). */
export const LabourPanel: React.FC<LabourPanelProps> = ({ view, nationId, submitOrder }) => {
  const { labour, grades } = view;
  const training = (grade: WorkerGrade) => grades.find((g) => g.grade === grade)?.training ?? 0;

  return (
    <section className={styles.panel} data-testid="labour-panel" aria-label="Labour">
      <h3 className={styles.panelTitle}>Labour</h3>
      <div className={styles.labourLine} data-testid="labour">
        <span>Labour</span>
        <span>{`${labour.total} total, ${labour.committed} committed, ${labour.free} free`}</span>
      </div>

      <ul className={styles.grades}>
        {grades.map((g) => (
          <li key={g.grade} className={styles.gradeRow} data-testid={`grade-${g.grade}`}>
            <span className={styles.gradeName}>{GRADE_TEXT[g.grade]}</span>
            <span className={styles.gradeCount}>{g.count}</span>
            {g.sick > 0 && <span className={styles.sick}>{`${g.sick} sick`}</span>}
            {g.training > 0 && <span className={styles.training}>{`${g.training} in training`}</span>}
          </li>
        ))}
      </ul>

      <h4 className={styles.subTitle}>Trade School</h4>
      {TRAINING.map(({ from, article, to }) => {
        const cost = TRAINING_COST[from];
        return (
          <div key={from} className={styles.actionRow}>
            <button
              className={styles.actionButton}
              aria-label={`Train ${article} worker`}
              onClick={() => submitOrder({ kind: "trainWorkers", nationId, from, delta: 1 })}
            >
              {`${GRADE_TEXT[from]} → ${to} (${money(cost.cash)} + ${cost.paper} Paper)`}
            </button>
            <button
              className={styles.cancelButton}
              aria-label={`Cancel ${article} trainee`}
              disabled={training(from) <= 0}
              onClick={() => submitOrder({ kind: "trainWorkers", nationId, from, delta: -1 })}
            >
              Cancel
            </button>
          </div>
        );
      })}

      <h4 className={styles.subTitle}>Capitol</h4>
      <div className={styles.actionRow}>
        <button
          className={styles.actionButton}
          aria-label="Recruit a migrant"
          onClick={() => submitOrder({ kind: "recruitWorkers", nationId, delta: 1 })}
        >
          {`Recruit (${MIGRANT_TEXT})`}
        </button>
        <button
          className={styles.cancelButton}
          aria-label="Cancel a migrant"
          disabled={view.recruits <= 0}
          onClick={() => submitOrder({ kind: "recruitWorkers", nationId, delta: -1 })}
        >
          Cancel
        </button>
      </div>
      <div className={styles.note} data-testid="recruits">
        {`${view.recruits} of ${view.recruitCap} this turn`}
      </div>
    </section>
  );
};
