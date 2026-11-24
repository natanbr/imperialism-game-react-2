"use client";
import React from "react";
import type { FoodForecast, Order, ValidationResult } from "@/engine";
import { TRAINED_TO } from "@/definisions/ResourceConversions";
import type { WorkerGrade } from "@/types/Industry";
import { ResourceType } from "@/types/Resource";
import { InkPicture } from "../art/ArtPicture";
import { LABOUR_ART, buildingArt, goodsArt, gradeArt } from "../art/inkArt";
import type { CostView, LabourView, SchoolAction } from "./capitalView";
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

/**
 * The city's labour bar, the Capital's HUD (FR-566): labour, the workforce by grade with the sick and the trainees
 * (FR-047), and the meal at the end of this turn (FR-049), on one line where the width allows. It has no controls; the
 * grade and labour pictures stand before their names (FR-332).
 */
export const LabourBar: React.FC<{ view: LabourView; food: FoodForecast }> = ({ view, food }) => {
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

      <div className={styles.labourLine} data-testid="food" title="The meal at the end of this turn">
        <span>
          <InkPicture src={goodsArt(ResourceType.Grain)} alt="" inline />Food
        </span>
        <span>
          {`${food.fed} of ${food.mouths} fed`}
          {food.sick > 0 && <span className={styles.sick}>{` · ${food.sick} sick`}</span>}
          {food.starved > 0 && <span className={styles.sick}>{` · ${food.starved} starve${food.starved === 1 ? "s" : ""}`}</span>}
        </span>
      </div>
    </section>
  );
};


/** FR-572: an action's costs, as an industry card lists its inputs: the goods pictures, needed and held, ✗ when short. */
const CostList: React.FC<{ costs: readonly CostView[]; label: string }> = ({ costs, label }) => (
  <ul className={styles.inputs} aria-label={label}>
    {costs.map((cost) => (
      <li
        key={cost.key}
        className={cost.missing ? styles.inputMissing : styles.input}
        data-testid={`cost-${cost.key}`}
        data-missing={cost.missing ? "true" : undefined}
        title={cost.missing ? "Not enough for one more" : undefined}
      >
        {cost.missing && <span aria-hidden="true">✗ </span>}
        {cost.types.map((type) => (
          <InkPicture key={type} src={goodsArt(type)} alt="" inline />
        ))}
        {cost.missing ? `${cost.text} (short)` : cost.text}
      </li>
    ))}
  </ul>
);

/**
 * The Trade School (FR-047; M18c FR-572 merged the Capitol into it): training (Untrained → Trained, Trained → Expert) and
 * recruiting migrants, each with its grade pictures and, like an industry card, what one more costs against what we hold.
 * Every button sends one order; the engine judges it and a refusal is a toast (FR-569). Its building before its heading
 * (FR-333).
 */
export const TradeSchoolPanel: React.FC<OrderPanelProps & { costs: Record<SchoolAction, CostView[]> }> = ({ view, nationId, submitOrder, costs }) => {
  const training = (grade: WorkerGrade) => view.grades.find((g) => g.grade === grade)?.training ?? 0;
  return (
    <section className={styles.panel} aria-label="Trade School">
      <h3 className={styles.panelTitle}>
        <InkPicture src={buildingArt("tradeSchool")} alt="" inline className={styles.buildingPicture} />Trade School
      </h3>
      {TRAINING.map(({ from, article, to }) => (
        <div key={from} className={styles.schoolAction} data-testid={`school-${from}`}>
          <div className={styles.schoolName}>
            <InkPicture src={gradeArt(from)} alt="" inline />
            {GRADE_TEXT[from]}
            {" → "}
            <InkPicture src={gradeArt(TRAINED_TO[from])} alt="" inline />
            {to}
          </div>
          <CostList costs={costs[from]} label={`${GRADE_TEXT[from]} to ${to} needs`} />
          <div className={styles.actionRow}>
            <button
              className={styles.actionButton}
              aria-label={`Train ${article} worker`}
              onClick={() => submitOrder({ kind: "trainWorkers", nationId, from, delta: 1 })}
            >
              Train
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
        </div>
      ))}
      <div className={styles.schoolAction} data-testid="school-migrant">
        <div className={styles.schoolName}>
          <InkPicture src={buildingArt("capitol")} alt="" inline />
          {"Migrant → "}
          <InkPicture src={gradeArt("untrained")} alt="" inline />
          Untrained
        </div>
        <CostList costs={costs.migrant} label="A migrant needs" />
        <div className={styles.actionRow}>
          <button
            className={styles.actionButton}
            aria-label="Recruit a migrant"
            onClick={() => submitOrder({ kind: "recruitWorkers", nationId, delta: 1 })}
          >
            Recruit
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
          {`${view.recruits} of ${view.recruitCap} migrants this turn`}
        </div>
      </div>
    </section>
  );
};
