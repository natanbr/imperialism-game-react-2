"use client";
import React, { useId, useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { attackView, type AttackRegimentView, type AttackView, type DefenderView } from "./army/attackView";
import styles from "./army/War.module.css";
import { FortPicture, RegimentPicture } from "./art/ArtPicture";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

const VERDICT_CLASS: Record<AttackView["estimate"]["verdict"], string> = {
  "likely-victory": styles.likelyVictory,
  uncertain: styles.uncertain,
  "likely-defeat": styles.likelyDefeat,
};

/** A health bar and its number ("80%"), the number alone read out. */
const Health: React.FC<{ value: number }> = ({ value }) => (
  <span className={styles.health}>
    <span className={styles.healthTrack} aria-hidden="true">
      <span className={styles.healthFill} style={{ width: `${value}%` }} />
    </span>
    <span data-testid="health">{value}%</span>
  </span>
);

/**
 * One regiment: its picture beside its name (decorative, FR-272), then its health; a defender also its type and cover,
 * "entrenched" described by the legend under the list (FR-278, `legendId`).
 */
const RegimentRow: React.FC<{ regiment: AttackRegimentView | DefenderView; defender?: boolean; legendId?: string }> = ({ regiment, defender = false, legendId }) => {
  const protection = "protection" in regiment ? regiment.protection : "";
  return (
    <li className={styles.row}>
      <RegimentPicture type={regiment.type} size={36} className={styles.rowPicture} />
      <span className={styles.rowName} data-testid="name">
        {regiment.name}
      </span>
      <Health value={regiment.health} />
      {defender && (
        <span className={styles.rowMeta}>
          <span data-testid="type">{regiment.typeName}</span>
          <span className={styles.protection} data-testid="protection" aria-describedby={protection === "entrenched" ? legendId : undefined}>
            {protection}
          </span>
        </span>
      )}
    </li>
  );
};

/** The Attack screen's content; mounted only while a plan is open. */
const AttackScreen: React.FC = () => {
  const plan = useGameStore((s) => s.attackPlan)!;
  const close = useGameStore((s) => s.closeAttack);
  const clearSelection = useGameStore((s) => s.clearArmySelection);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const game = useGameStore((s) => s.game);
  const nationId = useGameStore((s) => s.activeNationId);
  const titleId = useId();
  const oursId = useId();
  const estimateId = useId();
  const legendId = useId();
  const reasonId = useId();

  const view = useMemo(() => attackView(game, nationId, plan), [game, nationId, plan]);

  const attack = () => {
    if (!view.attack || view.attack.refusal) return;
    if (submitOrder(view.attack.order).ok) {
      // The ticked regiments went with the order (FR-230)
      clearSelection();
      close();
    }
  };

  return (
    <Modal titleId={titleId} describedBy={estimateId} onClose={close} overlayClassName={styles.overlay} className={styles.attack}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.attack} /> {view.title}
        </h2>
      </header>

      {view.warNote && (
        <p className={styles.warNote} role="status" data-testid="attack-war-note">
          {view.warNote}
        </p>
      )}

      <div className={styles.sides}>
        <section className={styles.side}>
          <h3 id={oursId} className={styles.sideHeading}>
            Our regiments
          </h3>
          <ul className={styles.list} aria-labelledby={oursId}>
            {view.ours.map((r) => (
              <RegimentRow key={r.id} regiment={r} />
            ))}
          </ul>
        </section>
        <section className={styles.side}>
          <h3 className={styles.sideHeading} data-testid="defenders-heading">
            Defenders: {view.ownerName}
          </h3>
          {view.fortText && (
            <p className={styles.fort} data-testid="attack-fort">
              <FortPicture level={view.fortLevel} size={40} className={styles.fortPicture} />
              {view.fortText}
            </p>
          )}
          {view.defenders.length > 0 ? (
            <ul className={styles.list} aria-label="Defenders">
              {view.defenders.map((d) => (
                <RegimentRow key={d.id} regiment={d} defender legendId={legendId} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty} data-testid="no-defenders">
              {view.noDefenders}
            </p>
          )}
          {view.entrenchedText && (
            <p id={legendId} className={styles.legend} data-testid="entrenched-legend">
              {view.entrenchedText}
            </p>
          )}
        </section>
      </div>

      {/* FR-226: both strengths and the verdict, in words as well as its colour; FR-278: what the numbers are, under it */}
      <p id={estimateId} className={`${styles.estimate} ${VERDICT_CLASS[view.estimate.verdict]}`} data-testid="attack-estimate">
        {view.estimateText}
      </p>
      <p className={styles.explanation} data-testid="estimate-explanation">
        {view.estimateExplanation}
      </p>

      <footer className={styles.footer}>
        {view.attack && (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.attackButton}`}
              disabled={view.attack.refusal !== undefined}
              aria-describedby={view.attack.refusal ? reasonId : undefined}
              onClick={attack}
            >
              Attack
            </button>
            {view.attack.refusal && (
              <span id={reasonId} className={styles.reason} data-testid="attack-reason">
                {view.attack.refusal}
              </span>
            )}
          </>
        )}
        <button type="button" className={`${styles.button} ${styles.footerEnd}`} onClick={close}>
          Cancel
        </button>
      </footer>
    </Modal>
  );
};

/**
 * The Attack screen (FR-230; Imp1 Scouting Report, rules 11 section 5.3): our chosen regiments and the defenders as they
 * stand, both strengths and the verdict (FR-226), and "Attack", which sends one `moveArmy` into the province through
 * submitOrder (an attack, FR-216). Without an active war it says why and has no Attack. Store flag `attackPlan`, set by
 * the Army screen's "Attack…" and by a map click with regiments selected.
 */
export const AttackModal: React.FC = () => {
  const open = useGameStore((s) => s.attackPlan !== null);
  if (!open) return null;
  return <AttackScreen />;
};

export default AttackModal;
