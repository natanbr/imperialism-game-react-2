"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useGameStore } from "../store/rootStore";
import { refusalText } from "./gameText";
import { armyView, disbandControl, disbandQuestion, marchControl, type ArmyControl, type RegimentRowView } from "./army/armyView";
import styles from "./army/Army.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal, useEscapeFirst } from "./Modal";

interface ConfirmDisbandProps {
  question: string;
  onDisband: () => void;
  onKeep: () => void;
}

/** "Disband 2nd Regulars? ..." asked in place, like the war question (FR-178); Escape anywhere in the dialog keeps them. */
const ConfirmDisband: React.FC<ConfirmDisbandProps> = ({ question, onDisband, onKeep }) => {
  const panel = useRef<HTMLDivElement>(null);
  const questionId = useId();
  useEffect(() => {
    panel.current?.focus();
  }, []);
  useEscapeFirst(onKeep);
  return (
    <div ref={panel} tabIndex={-1} className={styles.confirm} role="group" aria-label="Confirm disband" aria-describedby={questionId}>
      <p id={questionId} data-testid="disband-question">
        {question}
      </p>
      <button className={`${styles.button} ${styles.dangerButton}`} onClick={onDisband}>
        Yes, disband
      </button>
      <button className={styles.button} onClick={onKeep}>
        Keep them
      </button>
    </div>
  );
};

/** A control's reason beside it while it is disabled, and its accessible description (FR-211, FR-257's rule). */
const Reason: React.FC<{ id: string; control: ArmyControl; testId?: string }> = ({ id, control, testId }) =>
  control.refusal ? (
    <span id={id} className={styles.reason} data-testid={testId}>
      {control.refusal}
    </span>
  ) : null;

interface RowProps {
  row: RegimentRowView;
  ticked: boolean;
  onTick: (id: string, on: boolean) => void;
  onSubmit: (control: ArmyControl) => void;
}

const RegimentRow: React.FC<RowProps> = ({ row, ticked, onTick, onSubmit }) => {
  const reasonId = useId();
  const statusClass = row.status === "Disband ordered" ? styles.disbanding : row.cancel ? styles.marching : row.selectable ? "" : styles.militia;
  return (
    <tr data-testid={`regiment-${row.name}`}>
      <td>
        {row.selectable ? (
          <label className={styles.pick}>
            <input type="checkbox" checked={ticked} onChange={(e) => onTick(row.id, e.target.checked)} />
            {row.name}
          </label>
        ) : (
          <span className={styles.unpicked}>{row.name}</span>
        )}
      </td>
      <td data-testid="category">{row.category}</td>
      <td className={styles.number} data-testid="arms">
        {row.arms}
      </td>
      <td data-testid="health">
        <span className={styles.health}>
          <span className={styles.healthTrack} aria-hidden="true">
            <span className={styles.healthFill} data-testid="health-bar" style={{ width: `${row.health}%` }} />
          </span>
          <span className={styles.healthNumber}>{row.health}%</span>
        </span>
      </td>
      <td>
        <span className={styles.status}>
          <span className={statusClass} data-testid="status">
            {row.status}
          </span>
          {row.cancel && (
            <>
              <button
                className={`${styles.button} ${styles.small}`}
                aria-label={`${row.cancel.label} of ${row.name}`}
                disabled={row.cancel.refusal !== undefined}
                aria-describedby={row.cancel.refusal ? reasonId : undefined}
                onClick={() => onSubmit(row.cancel!)}
              >
                {row.cancel.label}
              </button>
              <Reason id={reasonId} control={row.cancel} />
            </>
          )}
        </span>
      </td>
    </tr>
  );
};

/** The Army screen of one province (FR-211); keyed by the province, so the ticks start empty for each. */
const ArmyScreen: React.FC<{ provinceId: string }> = ({ provinceId }) => {
  const close = useGameStore((s) => s.closeArmy);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nationId = useGameStore((s) => s.activeNationId);
  const titleId = useId();
  const selectId = useId();
  const marchReasonId = useId();
  const disbandReasonId = useId();
  const disbandButton = useRef<HTMLButtonElement>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [asking, setAsking] = useState(false);

  const view = useMemo(() => armyView(game, nationId, provinceId), [game, nationId, provinceId]);
  // Only regiments that are still Available count as ticked, in the list's order
  const selected = view.rows.filter((r) => r.selectable && ticked.includes(r.id));
  const selectedIds = selected.map((r) => r.id);
  const target = view.targets.some((t) => t.id === chosen) ? chosen : view.targets[0]?.id;
  const march = marchControl(game, nationId, provinceId, selectedIds, target);
  const disband = disbandControl(game, nationId, provinceId, selectedIds);

  const tick = (id: string, on: boolean) => setTicked((list) => (on ? [...list, id] : list.filter((x) => x !== id)));
  const send = (control: ArmyControl) => {
    submitOrder(control.order);
  };
  const keep = () => {
    setAsking(false);
    disbandButton.current?.focus();
  };

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.dialog}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.army} /> {view.title}
        </h2>
        <span className={styles.summary} data-testid="force-size">
          Force Size: <strong>{view.forceSize}</strong>
        </span>
        <span className={styles.summary} data-testid="army-upkeep">
          {view.upkeep}
        </span>
        <button className={styles.closeButton} onClick={close} aria-label="Close army">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {view.upkeepWarning && (
        <div className={styles.warning} role="status" data-testid="army-upkeep-warning">
          {view.upkeepWarning}
        </div>
      )}

      {lastRejection && (
        <div className={styles.refusal} role="alert" data-testid="army-refusal">
          {refusalText(lastRejection)}
        </div>
      )}

      {view.rows.length === 0 ? (
        <p className={styles.empty} data-testid="no-army">
          No regiment of ours is here.
        </p>
      ) : (
        <div className={styles.listPane}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Regiment</th>
                <th>Category</th>
                <th className={styles.number}>Arms</th>
                <th>Health</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <RegimentRow key={row.id} row={row} ticked={ticked.includes(row.id)} onTick={tick} onSubmit={send} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view.rows.length > 0 && (
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor={selectId} className={styles.label}>
              March to
            </label>
            <select id={selectId} className={styles.select} value={target ?? ""} disabled={view.targets.length === 0} onChange={(e) => setChosen(e.target.value)}>
              {view.targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              className={styles.button}
              disabled={march.refusal !== undefined}
              aria-describedby={march.refusal ? marchReasonId : undefined}
              onClick={() => {
                send(march);
                setTicked([]);
              }}
            >
              March
            </button>
            <Reason id={marchReasonId} control={march} testId="march-reason" />
          </div>
          <div className={styles.controlGroup}>
            <button
              ref={disbandButton}
              className={styles.button}
              disabled={disband.refusal !== undefined}
              aria-describedby={disband.refusal ? disbandReasonId : undefined}
              aria-expanded={asking && selected.length > 0}
              onClick={() => setAsking((open) => !open)}
            >
              Disband
            </button>
            <Reason id={disbandReasonId} control={disband} testId="disband-reason" />
          </div>
        </div>
      )}

      {asking && selected.length > 0 && (
        <ConfirmDisband
          question={disbandQuestion(selected.map((r) => r.name))}
          onDisband={() => {
            if (disband.refusal === undefined) send(disband);
            setTicked([]);
            setAsking(false);
          }}
          onKeep={keep}
        />
      )}
    </Modal>
  );
};

/**
 * The Army screen (FR-211; Imp1 Garrison Book, rules 11 section 5.2): our regiments in one province with their category,
 * ARMS, health and status; tick the Available ones to march them to a bordering province of ours or to disband them
 * (asked in place first); cancel a march. Opened from our marker on the map (FR-210, store flag `armyProvinceId`). Every
 * control sends one order through submitOrder; a control the engine would refuse is disabled and says why.
 */
export const ArmyModal: React.FC = () => {
  const provinceId = useGameStore((s) => s.armyProvinceId);
  if (!provinceId) return null;
  return <ArmyScreen key={provinceId} provinceId={provinceId} />;
};

export default ArmyModal;
