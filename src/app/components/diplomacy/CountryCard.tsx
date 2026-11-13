"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import type { GrantAmount, Order, SubsidyPercent, ValidationResult } from "@/engine";
import type { GameState } from "@/types/GameState";
import { relationColor } from "@/styles/theme";
import { GRANT_OPTIONS, grantControl, policyControl, SUBSIDY_OPTIONS, type ControlView, type CountryRowView } from "./diplomacyView";
import styles from "./Diplomacy.module.css";

type Submit = (order: Order) => ValidationResult;

interface ControlButtonProps {
  control: ControlView;
  submitOrder: Submit;
  className?: string;
  /** Overrides the click (Declare war asks first). */
  onClick?: () => void;
  ariaLabel?: string;
  children?: React.ReactNode;
  expanded?: boolean;
}

/**
 * A button for one order (FR-178): disabled when validateOrder would refuse it, with the refusal text shown under it
 * and named as its description.
 */
const ControlButton: React.FC<ControlButtonProps> = ({ control, submitOrder, className, onClick, ariaLabel, children, expanded }) => {
  const reasonId = useId();
  return (
    <span className={styles.cell}>
      <button
        className={`${styles.button} ${className ?? ""}`}
        disabled={control.refusal !== undefined}
        aria-describedby={control.refusal ? reasonId : undefined}
        aria-label={ariaLabel}
        aria-expanded={expanded}
        onClick={onClick ?? (() => submitOrder(control.order))}
      >
        {children ?? control.label}
      </button>
      {control.refusal && (
        <span id={reasonId} className={styles.reason}>
          {control.refusal}
        </span>
      )}
    </span>
  );
};

interface ConfirmWarProps {
  name: string;
  /** The treaty the war breaks; the question then says that relations with every other country get worse (FR-168). */
  breaks?: "pact" | "alliance";
  onDeclare: () => void;
  onKeepPeace: () => void;
}

/** "Declare war on Arvelia? The war starts next turn." asked in place, like New game (FR-178, FR-109). */
const ConfirmWar: React.FC<ConfirmWarProps> = ({ name, breaks, onDeclare, onKeepPeace }) => {
  const panel = useRef<HTMLDivElement>(null);
  const questionId = useId();
  const costId = useId();
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return (
    <div
      ref={panel}
      tabIndex={-1}
      className={styles.confirm}
      role="group"
      aria-label={`Confirm war on ${name}`}
      aria-describedby={breaks ? `${questionId} ${costId}` : questionId}
    >
      <p id={questionId} data-testid="war-question">{`Declare war on ${name}? The war starts next turn.`}</p>
      {breaks && (
        <p id={costId} className={styles.warCost} data-testid="war-cost">
          {`This breaks our ${breaks} with ${name}: relations with every other country get worse.`}
        </p>
      )}
      <button className={`${styles.button} ${styles.warButton}`} onClick={onDeclare}>
        Declare war
      </button>
      <button className={styles.button} onClick={onKeepPeace}>
        Keep the peace
      </button>
    </div>
  );
};

interface FormProps {
  row: CountryRowView;
  state: GameState;
  nationId: string;
  submitOrder: Submit;
}

/** Foreign grant (FR-170, FR-178): an amount, once or each turn, and Give; Stop grant for a standing locked grant. */
const GrantForm: React.FC<FormProps> = ({ row, state, nationId, submitOrder }) => {
  const [amount, setAmount] = useState<GrantAmount>(1000);
  const [locked, setLocked] = useState(false);
  const titleId = useId();
  const amountId = useId();
  const oftenId = useId();
  const give = grantControl(state, nationId, row.id, amount, locked);
  return (
    <div className={styles.block} role="group" aria-labelledby={titleId}>
      <span id={titleId} className={styles.blockTitle}>
        Grant
      </span>
      <div className={styles.fields}>
        <label htmlFor={amountId} className={styles.fieldLabel}>
          Amount
        </label>
        <select id={amountId} className={styles.select} value={amount} onChange={(e) => setAmount(Number(e.target.value) as GrantAmount)}>
          {GRANT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
        <label htmlFor={oftenId} className={styles.fieldLabel}>
          How often
        </label>
        <select id={oftenId} className={styles.select} value={locked ? "each-turn" : "once"} onChange={(e) => setLocked(e.target.value === "each-turn")}>
          <option value="once">once</option>
          <option value="each-turn">each turn</option>
        </select>
        <ControlButton control={give} submitOrder={submitOrder} />
        {row.stopGrant && <ControlButton control={row.stopGrant} submitOrder={submitOrder} />}
      </div>
    </div>
  );
};

/** Trade policy (FR-171, FR-178): a subsidy step (none to 100%), Boycott, and Set policy. Starts at the policy in force. */
const PolicyForm: React.FC<FormProps> = ({ row, state, nationId, submitOrder }) => {
  const [subsidy, setSubsidy] = useState<0 | SubsidyPercent>(row.policy.subsidyPercent);
  const [boycott, setBoycott] = useState(row.policy.boycott);
  const titleId = useId();
  const subsidyId = useId();
  const boycottId = useId();
  const set = policyControl(state, nationId, row.id, subsidy, boycott);
  return (
    <div className={styles.block} role="group" aria-labelledby={titleId}>
      <span id={titleId} className={styles.blockTitle}>
        Trade policy
      </span>
      <div className={styles.fields}>
        <label htmlFor={subsidyId} className={styles.fieldLabel}>
          Subsidy
        </label>
        <select id={subsidyId} className={styles.select} value={subsidy} onChange={(e) => setSubsidy(Number(e.target.value) as 0 | SubsidyPercent)}>
          {SUBSIDY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
        <span className={styles.check}>
          <input id={boycottId} type="checkbox" checked={boycott} onChange={(e) => setBoycott(e.target.checked)} />
          <label htmlFor={boycottId}>Boycott</label>
        </span>
        <ControlButton control={set} submitOrder={submitOrder} />
      </div>
    </div>
  );
};

interface CountryCardProps {
  row: CountryRowView;
  state: GameState;
  nationId: string;
  submitOrder: Submit;
}

/**
 * One country of the Diplomacy screen (FR-177, FR-178): its name and kind, the relation as a swatch and in words, the
 * treaties, this turn's ordered overtures with Withdraw, and the overture, grant and trade policy controls. Every
 * control sends one order through submitOrder.
 */
export const CountryCard: React.FC<CountryCardProps> = ({ row, state, nationId, submitOrder }) => {
  const nameId = useId();
  const overturesId = useId();
  const [askingWar, setAskingWar] = useState(false);

  return (
    <section className={styles.card} aria-labelledby={nameId} data-testid={`country-${row.id}`}>
      <header className={styles.cardHeader}>
        <h3 id={nameId} className={styles.name}>
          {row.name}
        </h3>
        <span className={styles.kind} data-testid="country-kind">
          {row.kind}
        </span>
        <span className={styles.relation} data-testid="relation">
          {row.level !== undefined && (
            <span className={styles.swatch} aria-hidden="true" data-testid="relation-swatch" style={{ background: relationColor(row.level) }} />
          )}
          {row.relationText}
        </span>
      </header>

      <ul className={styles.treaties} aria-label="Treaties">
        {row.treaties.length === 0 ? (
          <li className={styles.treatyNone} data-testid="treaty">
            No treaties
          </li>
        ) : (
          row.treaties.map((t) => (
            <li key={t} className={`${styles.treaty} ${t.startsWith("At war") ? styles.treatyWar : ""}`} data-testid="treaty">
              {t}
            </li>
          ))
        )}
      </ul>

      {row.ordered.length > 0 && (
        <div className={styles.block}>
          <span className={styles.blockTitle}>This turn</span>
          <ul className={styles.ordered} aria-label="Ordered this turn">
            {row.ordered.map((o) => (
              <li key={o.id} className={styles.orderedItem} data-testid="ordered">
                <span>{o.text}</span>
                <span className={styles.cost}>{o.costText}</span>
                {o.withdraw && (
                  <button
                    className={styles.button}
                    aria-label={o.withdraw.label}
                    disabled={o.withdraw.refusal !== undefined}
                    onClick={() => submitOrder(o.withdraw!.order)}
                  >
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.block} role="group" aria-labelledby={overturesId}>
        <span id={overturesId} className={styles.blockTitle}>
          Overtures
        </span>
        <div className={styles.overtures}>
          {row.overtures.map((control) => {
            const isWar = control.order.kind === "proposeOverture" && control.order.overture === "war";
            return (
              <ControlButton
                key={control.label}
                control={control}
                submitOrder={submitOrder}
                className={isWar ? styles.warButton : undefined}
                onClick={isWar ? () => setAskingWar((open) => !open) : undefined}
                expanded={isWar ? askingWar : undefined}
              />
            );
          })}
          {askingWar && (
            <ConfirmWar
              name={row.name}
              breaks={row.brokenByWar}
              onDeclare={() => {
                const war = row.overtures.find((c) => c.order.kind === "proposeOverture" && c.order.overture === "war");
                if (war) submitOrder(war.order);
                setAskingWar(false);
              }}
              onKeepPeace={() => setAskingWar(false)}
            />
          )}
        </div>
      </div>

      <GrantForm row={row} state={state} nationId={nationId} submitOrder={submitOrder} />
      <PolicyForm key={state.turn} row={row} state={state} nationId={nationId} submitOrder={submitOrder} />
    </section>
  );
};
