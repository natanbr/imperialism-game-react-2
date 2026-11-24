"use client";
import React, { useId, useMemo, useState } from "react";
import type { Order, ValidationResult } from "@/engine";
import type { GameState } from "@/types/GameState";
import { reasonLines, tradePolicyRows, type ControlView, type TradePolicyRowView } from "../diplomacy/diplomacyView";
import styles from "./Market.module.css";
import { NationFlag } from "../NationFlag";
import { TradePolicyMap } from "./TradePolicyMap";
import { tradePolicyMapView } from "./tradePolicyMapView";
import mapStyles from "./TradePolicyMap.module.css";

type Submit = (order: Order) => ValidationResult;

/**
 * One country (FR-576): its flag and name, the subsidy steps as toggle buttons (the policy in force pressed) and the
 * boycott switch, each sending Diplomacy's `setTradePolicy` order (FR-171). A step validateOrder would refuse is
 * disabled, and its refusal stands under the steps as in Diplomacy (FR-237: "5%, 10%: we need a consulate there first"),
 * the disabled control's description. What the pressed step does is a line under the steps, as Diplomacy's subsidy-help
 * line (FR-395); the other steps say it in their tooltip.
 */
const PolicyRow: React.FC<{ row: TradePolicyRowView; submitOrder: Submit }> = ({ row, submitOrder }) => {
  const base = useId();
  const lines = reasonLines([...row.steps, row.boycott]);
  const reasonId = (control: ControlView) => {
    const i = control.refusal === undefined ? -1 : lines.findIndex((l) => l.reason === control.refusal);
    return i === -1 ? undefined : `${base}-reason-${i}`;
  };
  const boycottId = `${base}-boycott`;
  const helpId = `${base}-help`;
  const pressed = row.steps.find((step) => step.pressed);
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
              aria-describedby={[step.pressed ? helpId : undefined, reasonId(step)].filter(Boolean).join(" ") || undefined}
              onClick={() => {
                if (!step.pressed) submitOrder(step.order);
              }}
            >
              {step.label}
            </button>
          ))}
        </div>
        {pressed && (
          <p id={helpId} className={styles.policyHelp} data-testid="subsidy-help">
            {pressed.help}
          </p>
        )}
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

export const TradePolicies: React.FC<{ game: GameState; nationId: string; submitOrder: Submit }> = ({ game, nationId, submitOrder }) => {
  const [mode, setMode] = useState<"Map" | "List">("Map");
  const [chosenId, setChosenId] = useState<string>();
  const rows = useMemo(() => tradePolicyRows(game, nationId), [game, nationId]);
  const geometry = tradePolicyMapView(game);
  const landedRows = rows.filter((row) => geometry.countries.some((land) => land.id === row.id));
  const selected = landedRows.find((row) => row.id === chosenId) ?? landedRows[0];
  const visibleRows = mode === "List" ? rows : selected ? [selected] : [];
  return (
    <div className={mode === "Map" ? mapStyles.sheet : undefined}>
      <div className={mapStyles.toolbar}>
        <div className={styles.sideChoice} role="group" aria-label="Trade policy view">
          {(["Map", "List"] as const).map((view) => (
            <button key={view} className={styles.sideButton} type="button" aria-pressed={mode === view} onClick={() => setMode(view)}>{view}</button>
          ))}
        </div>
        <p className={styles.boardNote}>
          A subsidy changes the price of our deals with that country, and a boycott stops them; both count in this turn&apos;s
          trade.
        </p>
      </div>
      {mode === "Map" && <TradePolicyMap game={game} geometry={geometry} rows={rows} selectedId={selected?.id} select={setChosenId} />}
      {visibleRows.length > 0 ? (
        <table
          aria-label={mode === "Map" ? "Selected country policy" : "Country policies"}
          className={`${styles.table} ${styles.policyTable} ${mode === "Map" ? mapStyles.bar : ""}`}
        >
          <thead>
            <tr>
              <th>Country</th>
              <th>Subsidy</th>
              <th>Boycott</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => <PolicyRow key={row.id} row={row} submitOrder={submitOrder} />)}
          </tbody>
        </table>
      ) : (
        <p className={styles.boardNote}>
          {mode === "Map" ? "No countries on the map are available for a trade policy." : "No countries are available for a trade policy."}
        </p>
      )}
    </div>
  );
};
