"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import type { GrantAmount, Order, SubsidyPercent, ValidationResult } from "@/engine";
import type { GameState } from "@/types/GameState";
import { GRANT_OPTIONS, grantControl, policyControl, reasonLines, SUBSIDY_OPTIONS, type ControlView, type CountryRowView } from "./diplomacyView";
import { useEscapeFirst } from "../Modal";
import styles from "./Diplomacy.module.css";

type Submit = (order: Order) => ValidationResult;

/**
 * The refusals of one control group, each once, under the group (FR-237): "Embassy: we need a consulate there first".
 * Returns the lines and, per refusal text, the id of its line: the disabled controls' description.
 */
function useReasons(controls: readonly (ControlView | undefined)[]) {
  const base = useId();
  const lines = reasonLines(controls);
  const idOf = (control: ControlView | undefined): string | undefined => {
    const i = control?.refusal === undefined ? -1 : lines.findIndex((l) => l.reason === control.refusal);
    return i === -1 ? undefined : `${base}-reason-${i}`;
  };
  const list =
    lines.length === 0 ? null : (
      <ul className={styles.reasons}>
        {lines.map((line, i) => (
          <li key={line.reason} data-testid="reason">
            <span className={styles.reasonNames}>{`${line.names.join(", ")}:`}</span> <span id={`${base}-reason-${i}`}>{line.reason}</span>
          </li>
        ))}
      </ul>
    );
  return { idOf, list };
}

interface ControlButtonProps {
  control: ControlView;
  submitOrder: Submit;
  /** The id of the line that gives its refusal (its description while it is disabled). */
  reasonId?: string;
  className?: string;
  /** Overrides the click (Declare war asks first). */
  onClick?: () => void;
  expanded?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

/** A button for one order (FR-178): disabled when validateOrder would refuse it, its refusal as its description. */
const ControlButton: React.FC<ControlButtonProps> = ({ control, submitOrder, reasonId, className, onClick, expanded, buttonRef }) => (
  <button
    ref={buttonRef}
    className={`${styles.button} ${className ?? ""}`}
    disabled={control.refusal !== undefined}
    aria-describedby={control.refusal ? reasonId : undefined}
    aria-expanded={expanded}
    onClick={onClick ?? (() => submitOrder(control.order))}
  >
    {control.label}
  </button>
);

interface ConfirmWarProps {
  name: string;
  /** The treaty the war breaks; the question then says that relations with every other country get worse (FR-168). */
  breaks?: "pact" | "alliance";
  /** A minor nation: the question says that relations with every other minor nation get worse (FR-168, FR-238). */
  onMinor: boolean;
  onDeclare: () => void;
  onKeepPeace: () => void;
}

/** "Declare war on Arvelia? The war starts next turn." asked in place, like New game (FR-178, FR-109). */
const ConfirmWar: React.FC<ConfirmWarProps> = ({ name, breaks, onMinor, onDeclare, onKeepPeace }) => {
  const panel = useRef<HTMLDivElement>(null);
  const questionId = useId();
  const costId = useId();
  const minorsId = useId();
  useEffect(() => {
    panel.current?.focus();
  }, []);
  // While the question is shown, Escape anywhere in the dialog keeps the peace instead of closing the dialog (FR-236)
  useEscapeFirst(onKeepPeace);
  const describedBy = [questionId, breaks && costId, onMinor && minorsId].filter(Boolean).join(" ");
  return (
    <div ref={panel} tabIndex={-1} className={styles.confirm} role="group" aria-label={`Confirm war on ${name}`} aria-describedby={describedBy}>
      <p id={questionId} data-testid="war-question">{`Declare war on ${name}? The war starts next turn.`}</p>
      {breaks && (
        <p id={costId} className={styles.warCost} data-testid="war-cost">
          {`This breaks our ${breaks} with ${name}: relations with every other country get worse.`}
        </p>
      )}
      {onMinor && (
        <p id={minorsId} className={styles.warCost} data-testid="war-minors">
          A war on a minor nation also lowers our relations with every other minor nation, by half a level each.
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
  const reasons = useReasons([give, row.stopGrant]);
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
        <ControlButton control={give} submitOrder={submitOrder} reasonId={reasons.idOf(give)} />
        {row.stopGrant && <ControlButton control={row.stopGrant} submitOrder={submitOrder} reasonId={reasons.idOf(row.stopGrant)} />}
      </div>
      {reasons.list}
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
  const reasons = useReasons([set]);
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
        <ControlButton control={set} submitOrder={submitOrder} reasonId={reasons.idOf(set)} />
      </div>
      {reasons.list}
    </div>
  );
};

interface CountryDetailsProps {
  row: CountryRowView;
  state: GameState;
  nationId: string;
  submitOrder: Submit;
  /** The id its tab in the countries list points to (aria-controls, FR-237). */
  panelId: string;
}

/**
 * The selected country's details, the right pane of the Diplomacy screen (FR-237): this turn's ordered overtures with
 * Withdraw, then the overture, grant and trade policy controls (FR-177, FR-178). Every control sends one order
 * through submitOrder; a refused one is disabled and its refusal shows once, under its group.
 */
export const CountryDetails: React.FC<CountryDetailsProps> = ({ row, state, nationId, submitOrder, panelId }) => {
  const nameId = useId();
  const overturesId = useId();
  const [askingWar, setAskingWar] = useState(false);
  const warButton = useRef<HTMLButtonElement>(null);
  const overtures = useReasons(row.overtures);
  const isWar = (control: ControlView) => control.order.kind === "proposeOverture" && control.order.overture === "war";

  return (
    <section id={panelId} role="tabpanel" aria-labelledby={nameId} className={styles.details} data-testid={`country-${row.id}`}>
      <header className={styles.detailsHeader}>
        <h3 id={nameId} className={styles.detailsName}>
          {row.name}
        </h3>
        <span className={styles.kind}>{row.kind}</span>
      </header>

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
          {row.overtures.map((control) => (
            <ControlButton
              key={control.label}
              control={control}
              submitOrder={submitOrder}
              reasonId={overtures.idOf(control)}
              className={isWar(control) ? styles.warButton : undefined}
              onClick={isWar(control) ? () => setAskingWar((open) => !open) : undefined}
              expanded={isWar(control) ? askingWar : undefined}
              buttonRef={isWar(control) ? warButton : undefined}
            />
          ))}
        </div>
        {overtures.list}
        {askingWar && (
          <ConfirmWar
            name={row.name}
            breaks={row.brokenByWar}
            onMinor={row.warOnMinor}
            onDeclare={() => {
              const war = row.overtures.find(isWar);
              if (war) submitOrder(war.order);
              setAskingWar(false);
            }}
            onKeepPeace={() => {
              setAskingWar(false);
              warButton.current?.focus();
            }}
          />
        )}
      </div>

      <GrantForm row={row} state={state} nationId={nationId} submitOrder={submitOrder} />
      <PolicyForm key={state.turn} row={row} state={state} nationId={nationId} submitOrder={submitOrder} />
    </section>
  );
};
