import React, { useId, useState } from "react";
import { ordinal } from "@/engine";
import type { RankMeasure, RankRecord } from "@/store/rankHistory";
import { useGameStore } from "@/store/rootStore";
import { NationFlag } from "../NationFlag";
import { nationMark } from "../nationMark";
import styles from "./Stats.module.css";

const MEASURES: ReadonlyArray<readonly [RankMeasure, string]> = [
  ["council", "Council standing"],
  ["army", "Army strength (land)"],
  ["industry", "Industry (installed capacity)"],
  ["labour", "Labour (available output)"],
  ["transport", "Transport (freight cars)"],
  ["merchant", "Merchant marine (cargo capacity)"],
  ["exports", "World exports (units sold this turn)"],
];

/** Separate traces keep tied places visible. A missing sample breaks the line. The table gives each point in words. */
function PlaceTrace({ places, nationCount, selectedTurn }: { places: (number | undefined)[]; nationCount: number; selectedTurn: number }) {
  const x = (index: number) => 4 + 192 * index / Math.max(1, places.length - 1);
  const y = (place: number) => 4 + 36 * (place - 1) / Math.max(1, nationCount - 1);
  const path = places.map((place, i) => place === undefined ? "" : `${places[i - 1] === undefined ? "M" : "L"}${x(i)},${y(place)}`).join(" ");
  return (
    <svg viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={styles.gridlines} d="M4 4H196 M4 40H196" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {places.map((place, i) => place !== undefined && (i + 1 === selectedTurn || (places[i - 1] === undefined && places[i + 1] === undefined))
        ? <circle key={i} cx={x(i)} cy={y(place)} r="3" fill="currentColor" /> : null)}
    </svg>
  );
}

export function StatsRankings() {
  const measureId = useId();
  const turnId = useId();
  const history = useGameStore(s => s.rankHistory);
  const lastTurn = useGameStore(s => s.game.gameOver?.turn ?? s.game.turn - 1);
  const finished = useGameStore(s => Boolean(s.game.gameOver));
  const nations = useGameStore(s => s.game.nations);
  const [pickedTurn, setPickedTurn] = useState<number>();
  const [pickedMeasure, setPickedMeasure] = useState<RankMeasure>();
  const record = history?.find(r => r.turn === pickedTurn) ?? history?.at(-1);
  if (!record || !history) return (
    <p>{lastTurn < 1 ? "Rankings start after the first turn settles." :
      `${lastTurn === 1 ? "Turn 1 is" : `Turns 1–${lastTurn} are`} unavailable.${finished ? "" : " New rankings will appear after the next settlement."}`}</p>
  );
  const measures = MEASURES.filter(([key]) => record.places[key] !== undefined);
  const [measure, label] = measures.find(([key]) => key === pickedMeasure) ?? measures[0];
  const placings = record.places[measure]!;
  const byTurn = new Map(history.map(r => [r.turn, r]));
  const timeline = Array.from({ length: lastTurn }, (_, i) => byTurn.get(i + 1));
  const placeOf = (sample: RankRecord | undefined, nationId: string) => sample?.places[measure]?.find(row => row.nationId === nationId)?.place;
  const colour = (id: string) => nationMark({ nations, minorNations: [] }, id).colour;
  return (
    <div className={styles.rankings}>
      <div className={styles.filters}>
        <div>
          <label htmlFor={measureId}>Measure</label>
          <select id={measureId} value={measure} onChange={e => setPickedMeasure(e.target.value as RankMeasure)}>
            {measures.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={turnId}>Resolved turn</label>
          <select id={turnId} value={record.turn} onChange={e => setPickedTurn(Number(e.target.value))}>
            {history.map(sample => <option key={sample.turn} value={sample.turn}>Turn {sample.turn}</option>)}
          </select>
        </div>
      </div>
      <section>
        <h3>{label}</h3>
        <p className={styles.annotation}>Placings on turn {record.turn}</p>
        <ol role="list" aria-label={`Placings on turn ${record.turn}`} className={styles.places}>
          {placings.map(({ nationId, place }) => (
            <li key={nationId}>
              <span className={styles.ordinal}>{ordinal(place)}</span>
              <span className={styles.nation}><NationFlag nationId={nationId} size="large" />{nations.find(n => n.id === nationId)?.name}</span>
              <span className={styles.track} aria-hidden="true">
                <span data-testid="rank-bar" style={{ width: `${100 * (nations.length + 1 - place) / nations.length}%`, backgroundColor: colour(nationId) }} />
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3>Rank history</h3>
        <p className={styles.annotation}>{lastTurn === 1 ? "Turn 1" : `Turns 1–${lastTurn}`} · {label}</p>
        <div className={styles.traces} aria-hidden="true">
          {nations.map(n => (
            <div key={n.id} className={styles.trace} style={{ color: colour(n.id) }}>
              <strong>{n.name}</strong>
              <div className={styles.plot}>
                <div className={styles.scale}><span>1st</span>{nations.length > 1 && <span>{ordinal(nations.length)}</span>}</div>
                <PlaceTrace places={timeline.map(sample => placeOf(sample, n.id))} nationCount={nations.length} selectedTurn={record.turn} />
              </div>
              <div className={styles.period}><span>Turn 1</span>{lastTurn > 1 && <span>Turn {lastTurn}</span>}</div>
            </div>
          ))}
        </div>
        <table className={styles.history} aria-label={`${label} by turn`}>
          <thead><tr><th scope="col">Turn</th>{nations.map(n => <th key={n.id} scope="col">{n.name}</th>)}</tr></thead>
          <tbody>{timeline.map((sample, i) => (
            <tr key={i} className={i + 1 === record.turn ? styles.selectedTurn : undefined}>
              <th scope="row">{i + 1}</th>
              {sample?.places[measure] ? nations.map(n => {
                const place = placeOf(sample, n.id);
                return <td key={n.id}>{place === undefined ? "Unranked" : ordinal(place)}</td>;
              }) : <td colSpan={nations.length}>{sample ? "Not applicable" : "Unavailable"}</td>}
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  );
}
