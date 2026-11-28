"use client";
import React, { useId, useMemo, useState } from "react";
import { countryName, type Order, type ValidationResult } from "@/engine";
import type { GameState } from "@/types/GameState";
import { reasonLines, tradePolicyRows, type ControlView, type TradePolicyRowView } from "../diplomacy/diplomacyView";
import styles from "./Market.module.css";
import { NationFlag } from "../NationFlag";
import { TradePolicyMap } from "./TradePolicyMap";
import { tradePolicyMapView } from "./tradePolicyMapView";
import mapStyles from "./TradePolicyMap.module.css";
import type { RankRecord } from "@/store/rankHistory";
import { diplomaticCountries, homeInformation, type InformationMode } from "./diplomaticMapView";
import { CountryDetail, DiplomaticCountryList, DiplomaticMapKey, InformationList } from "./DiplomaticMapInfo";

type Submit = (order: Order) => ValidationResult;
export type MapMode = "Trade policies" | InformationMode;

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

interface Props {
  game: GameState;
  nationId: string;
  submitOrder: Submit;
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  /** The session's settled FR-610 placings; Information reads the industry placing of the last settled turn. */
  rankHistory?: readonly RankRecord[];
}

const NOTES: Record<InformationMode, string> = {
  Information: " · Military compares each country's land forces with ours; Industry is the last settled placing.",
  Relationships: " · Settled relationships, from bad to good.",
  "Political status": " · Markers show our offices abroad.",
};

export const TradePolicies: React.FC<Props> = ({ game, nationId, submitOrder, mode, onModeChange, rankHistory }) => {
  const [layout, setLayout] = useState<"Map" | "List">("Map");
  const [chosenId, setChosenId] = useState<string>();
  const rows = useMemo(() => mode === "Trade policies" ? tradePolicyRows(game, nationId) : [], [game, nationId, mode]);
  const information = useMemo(() => mode === "Trade policies" ? [] : diplomaticCountries(game, nationId, mode, rankHistory),
    [game, nationId, mode, rankHistory]);
  const home = mode === "Information" ? homeInformation(game, nationId, rankHistory) : undefined;
  const geometry = tradePolicyMapView(game);
  const isMap = layout === "Map";
  const candidates = mode === "Trade policies" ? rows : information;
  const available = isMap ? candidates.filter(row => geometry.countries.some(land => land.id === row.id)) : candidates;
  const selectedId = available.find(row => row.id === chosenId)?.id ?? available[0]?.id;
  const visibleRows = isMap ? rows.filter(row => row.id === selectedId) : rows;
  const selectedInfo = information.find(row => row.id === selectedId);
  const viewer = countryName(game, nationId) ?? nationId;
  return (
    <div className={isMap ? mapStyles.sheet : undefined}>
      <div className={mapStyles.toolbar}>
        <label className={mapStyles.mode}>
          Map mode
          <select value={mode} onChange={(event) => onModeChange(event.target.value as MapMode)}>
            <option>Trade policies</option><option>Information</option><option>Relationships</option><option>Political status</option>
          </select>
        </label>
        <div className={styles.sideChoice} role="group" aria-label="Trade policy view">
          {(["Map", "List"] as const).map((view) => (
            <button key={view} className={styles.sideButton} type="button" aria-pressed={layout === view} onClick={() => setLayout(view)}>{view}</button>
          ))}
        </div>
        {mode === "Trade policies" ? <p className={styles.boardNote}>
          A subsidy changes the price of our deals with that country, and a boycott stops them; both count in this turn&apos;s
          trade.
        </p> : <>
          <p className={styles.boardNote}>From {viewer}{NOTES[mode]}</p>
          <DiplomaticMapKey mode={mode} />
        </>}
      </div>
      {isMap && <TradePolicyMap game={game} geometry={geometry} rows={rows} information={information} homeInformation={home}
        mode={mode} viewerId={nationId} selectedId={selectedId} select={setChosenId} />}
      {mode !== "Trade policies" ? <>
        {!isMap && (home
          ? <InformationList viewer={viewer} home={home} selected={selectedInfo} countries={information} select={setChosenId} />
          : <DiplomaticCountryList mode={mode} viewer={viewer} selected={selectedInfo} countries={information} select={setChosenId} />)}
        <CountryDetail mode={mode} viewer={viewer} selected={selectedInfo} />
      </> : visibleRows.length > 0 ? (
        <table
          aria-label={isMap ? "Selected country policy" : "Country policies"}
          className={`${styles.table} ${styles.policyTable} ${isMap ? mapStyles.bar : ""}`}
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
          {isMap ? "No countries on the map are available for a trade policy." : "No countries are available for a trade policy."}
        </p>
      )}
    </div>
  );
};
