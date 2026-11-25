import React from "react";
import type { GameState } from "@/types/GameState";
import { FlagDrawing } from "../NationFlag";
import { nationMark } from "../nationMark";
import type { TradePolicyRowView } from "../diplomacy/diplomacyView";
import { POLICY_MAP_EDGE_CLEARANCE, type TradePolicyMap as MapGeometry } from "./tradePolicyMapView";
import styles from "./TradePolicyMap.module.css";

function PolicyMarker({ row, x, y }: { row: TradePolicyRowView; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <g className={styles.marker} data-testid={`policy-marker-${row.id}`}>
        <circle r="17" className={styles.medallion} />
        <circle r="13.5" className={styles.track} />
        <path className={styles.ship} d="M-1 -9H1V4H-1ZM-2 -7V2H-8ZM2 -6L8 2H2ZM-10 4H10L6 8H-5Z" />
        {row.policy.boycott ? (
          <path data-testid="boycott-cross" d="M-10 -10L10 10M10 -10L-10 10" className={styles.cross} />
        ) : (
          <circle r="13.5" transform="rotate(-90)" pathLength="100" strokeDasharray={`${row.policy.subsidyPercent} 100`} className={styles.progress} />
        )}
      </g>
    </g>
  );
}

interface Props {
  game: GameState;
  geometry: MapGeometry;
  rows: TradePolicyRowView[];
  selectedId?: string;
  select: (id: string) => void;
}

export function TradePolicyMap({ game, geometry, rows, selectedId, select }: Props) {
  const mapId = React.useId();
  const countries = [...game.nations, ...game.minorNations].flatMap(({ id, name }) => {
    const land = geometry.countries.find(country => country.id === id);
    if (!land) return [];
    return [{ id, name, land, row: rows.find(country => country.id === id), mark: nationMark(game, id) }];
  });
  const selected = geometry.countries.find(({ id }) => id === selectedId);
  return (
    <svg className={styles.map} viewBox={geometry.viewBox} role="group" aria-label="Trade policy map">
      <g>
        {countries.map(({ id, name, land, row, mark }) => {
          const policy = row?.policy;
          const label = policy ? `${name}, ${policy.boycott ? "boycott" : `subsidy ${policy.subsidyPercent}%`}` : name;
          return (
            <g
              key={id}
              id={`${mapId}-${id}`}
              className={styles.country}
              data-country={id}
              role={row ? "button" : "img"}
              aria-label={label}
              aria-pressed={row ? selectedId === id : undefined}
              tabIndex={row ? 0 : undefined}
              onClick={row ? () => select(id) : undefined}
              onKeyDown={row ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (event.key === "Enter") select(id);
                }
              } : undefined}
              onKeyUp={row ? (event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  select(id);
                }
              } : undefined}
            >
              <title>{label}</title>
              <path className={styles.land} d={land.d} fill={mark.colour} fillRule="evenodd" />
            </g>
          );
        })}
        {/* Above every neighbour's land, below every country's name and policy marker. */}
        {selected && <path className={styles.selectedBorder} d={selected.d} fill="none" aria-hidden="true" />}
      </g>
      <g aria-hidden="true">
        {countries.map(({ id, name, land, row, mark }) => (
          <g
            key={id}
            data-annotation-for={id}
            className={row ? styles.annotationButton : undefined}
            onClick={row ? () => {
              document.getElementById(`${mapId}-${id}`)?.focus({ preventScroll: true });
              select(id);
            } : undefined}
          >
            <g
              className={`${styles.label} political-map-lettering`}
              style={{
                "--country-fill": mark.colour,
                "--label-min-x": `${POLICY_MAP_EDGE_CLEARANCE - land.label.x}px`,
                "--label-max-x": `${geometry.width - POLICY_MAP_EDGE_CLEARANCE - land.label.x}px`,
              } as React.CSSProperties}
              transform={`translate(${land.label.x} ${land.label.y})`}
            >
              <g className={styles.labelContents}>
                <svg y="-.56em" width=".82em" height="1.12em" viewBox="0 0 18 24">
                  <rect width="18" height="24" rx="3" className={styles.flagGround} />
                  <FlagDrawing mark={mark} x="1.5" y="2" width="15" height="20" style={{ color: mark.colour }} data-testid="nation-flag" />
                </svg>
                <text x="1.14em" dy=".31em">{name}</text>
              </g>
            </g>
            {row && <PolicyMarker row={row} x={land.marker.x} y={land.marker.y} />}
          </g>
        ))}
      </g>
    </svg>
  );
}
