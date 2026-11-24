"use client";
import React, { useId, useMemo } from "react";
import type { Order, ValidationResult } from "@/engine";
import type { GameState } from "@/types/GameState";
import { reasonLines, tradePolicyRows, type ControlView, type TradePolicyRowView } from "../diplomacy/diplomacyView";
import styles from "./Market.module.css";
import { NationFlag } from "../NationFlag";

type Submit = (order: Order) => ValidationResult;

/**
 * One country (FR-576): its flag and name, the subsidy steps as toggle buttons (the policy in force pressed) and the
 * boycott switch, each sending Diplomacy's `setTradePolicy` order (FR-171). A step validateOrder would refuse is
 * disabled, and its refusal stands under the steps as in Diplomacy (FR-237: "5%, 10%: we need a consulate there first"),
 * the disabled control's description.
 */
const PolicyRow: React.FC<{ row: TradePolicyRowView; submitOrder: Submit }> = ({ row, submitOrder }) => {
  const base = useId();
  const lines = reasonLines([...row.steps, row.boycott]);
  const reasonId = (control: ControlView) => {
    const i = control.refusal === undefined ? -1 : lines.findIndex((l) => l.reason === control.refusal);
    return i === -1 ? undefined : `${base}-reason-${i}`;
  };
  const boycottId = `${base}-boycott`;
  return (
    <tr data-testid={`policy-row-${row.id}`}>
      <th scope="row" className={styles.fixed}>
        <NationFlag nationId={row.id} />
        {row.name}
      </th>
      <td>
        <div role="group" aria-label={`Subsidy toward ${row.name}`} className={styles.policySteps}>
          {row.steps.map((step) => (
            <button
              key={step.value}
              type="button"
              className={styles.sideButton}
              aria-pressed={step.pressed}
              disabled={step.refusal !== undefined}
              title={step.help}
              aria-describedby={reasonId(step)}
              onClick={() => {
                if (!step.pressed) submitOrder(step.order);
              }}
            >
              {step.label}
            </button>
          ))}
        </div>
        {lines.length > 0 && (
          <ul className={styles.policyReasons}>
            {lines.map((line, i) => (
              <li key={line.reason} data-testid="reason">
                <span className={styles.noteSide}>{`${line.names.join(", ")}:`}</span> <span id={`${base}-reason-${i}`}>{line.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className={styles.fixed}>
        <span className={styles.check} title={row.boycott.help}>
          <input
            id={boycottId}
            type="checkbox"
            checked={row.policy.boycott}
            disabled={row.boycott.refusal !== undefined}
            aria-describedby={reasonId(row.boycott)}
            onChange={() => submitOrder(row.boycott.order)}
          />
          <label htmlFor={boycottId}>Boycott</label>
        </span>
      </td>
    </tr>
  );
};

/**
 * The Trade policies tab (FR-576): every country we may set a trade policy for, with the steps of the original game's
 * Trade Policies screen (none, 5, 10, 25, 50, 75 and 100 %) and Boycott. The original shows them on a map; this list comes
 * first. The rows and their refusals are Diplomacy's (`tradePolicyRows`), so both screens send the same order.
 */
export const TradePolicies: React.FC<{ game: GameState; nationId: string; submitOrder: Submit }> = ({ game, nationId, submitOrder }) => {
  const rows = useMemo(() => tradePolicyRows(game, nationId), [game, nationId]);
  return (
    <>
      <p className={styles.boardNote}>
        A subsidy changes the price of our deals with that country, and a boycott stops them; both count in this turn&apos;s
        trade. Point at a step to see what it does.
      </p>
      <table className={`${styles.table} ${styles.policyTable}`}>
        <thead>
          <tr>
            <th>Country</th>
            <th>Subsidy</th>
            <th>Boycott</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PolicyRow key={row.id} row={row} submitOrder={submitOrder} />
          ))}
        </tbody>
      </table>
    </>
  );
};
