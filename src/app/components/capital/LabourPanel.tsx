"use client";
import React from "react";
import type { Order, ValidationResult } from "@/engine";
import { MIGRANT_COST, TRAINING_COST } from "@/definisions/ResourceConversions";
import type { WorkerGrade } from "@/types/Industry";
import { commodityName, money } from "../gameText";
import { InkPicture } from "../art/ArtPicture";
import { LABOUR_ART, buildingArt, gradeArt } from "../art/inkArt";
import type { LabourView } from "./capitalView";
import styles from "./Capital.module.css";

interface OrderPanelProps {
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

/**
 * The city's labour above the Capital's sections (FR-565): labour and the workforce by grade with the sick and the
 * trainees (FR-047), on one line where the width allows. It has no controls; the grade and labour pictures stand before
 * their names (FR-332).
 */
export const LabourBar: React.FC<{ view: LabourView }> = ({ view }) => {
  const { labour, grades } = view;
  return (
    <section className={styles.labourBar} data-testid="labour-panel" aria-label="Labour">
      <div className={styles.labourLine} data-testid="labour">
        <span>
          <InkPicture src={LABOUR_ART} alt="" inline />Labour
        </span>
        <span>{`${labour.total} total, ${labour.committed} committed, ${labour.free} free`}</span>
      </div>

      <ul className={styles.grades}>
        {grades.map((g) => (
          <li key={g.grade} className={styles.gradeRow} data-testid={`grade-${g.grade}`}>
            <span className={styles.gradeName}>
              <InkPicture src={gradeArt(g.grade)} alt="" inline />{GRADE_TEXT[g.grade]}
            </span>
            <span className={styles.gradeCount}>{g.count}</span>
            {g.sick > 0 && <span className={styles.sick}>{`${g.sick} sick`}</span>}
            {g.training > 0 && <span className={styles.training}>{`${g.training} in training`}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** The Trade School (FR-047): one more or one fewer trainee of each grade; its building before its heading (FR-333). */
export const TradeSchoolPanel: React.FC<OrderPanelProps> = ({ view, nationId, submitOrder }) => {
  const training = (grade: WorkerGrade) => view.grades.find((g) => g.grade === grade)?.training ?? 0;
  return (
    <section className={styles.panel} aria-label="Trade School">
      <h3 className={styles.panelTitle}>
        <InkPicture src={buildingArt("tradeSchool")} alt="" inline className={styles.buildingPicture} />Trade School
      </h3>
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
    </section>
  );
};

/** The Capitol (FR-047): migrants recruited this turn, up to the cap; its building before its heading (FR-333). */
export const CapitolPanel: React.FC<OrderPanelProps> = ({ view, nationId, submitOrder }) => (
  <section className={styles.panel} aria-label="Capitol">
    <h3 className={styles.panelTitle}>
      <InkPicture src={buildingArt("capitol")} alt="" inline className={styles.buildingPicture} />Capitol
    </h3>
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
