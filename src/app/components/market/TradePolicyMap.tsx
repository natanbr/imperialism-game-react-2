import React from "react";
import type { GameState } from "@/types/GameState";
import { FlagDrawing } from "../NationFlag";
import { nationMark } from "../nationMark";
import type { TradePolicyRowView } from "../diplomacy/diplomacyView";
import { HOME_FILL, provincesText, type DiplomaticCountry, type HomeInformation } from "./diplomaticMapView";
import type { MapMode } from "./TradePolicies";
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
  information: DiplomaticCountry[];
  /** Information mode: our own provinces and placing, read on the Home country. */
  homeInformation?: HomeInformation;
  mode: MapMode;
  viewerId: string;
  selectedId?: string;
  select: (id: string) => void;
}

export function TradePolicyMap({ game, geometry, rows, information, homeInformation, mode, viewerId, selectedId, select }: Props) {
  const mapId = React.useId();
  const countries = [...game.nations, ...game.minorNations].flatMap(({ id, name }) => {
    const land = geometry.countries.find(country => country.id === id);
    if (!land) return [];
    const row = rows.find(country => country.id === id);
    const info = information.find(country => country.id === id);
    const mark = nationMark(game, id);
    const home = mode !== "Trade policies" && viewerId === id;
    const fill = info?.fill ?? (home ? HOME_FILL : mark.colour);
    let label = name;
    if (home) label += ", Home";
    if (home && homeInformation) {
      label += `, Our forces, ${provincesText(homeInformation.provinces)}, Industry ${homeInformation.industry}`;
    }
    if (info && mode === "Information") {
      label += `, ${info.military ? `Military ${info.military}` : info.status}, ${provincesText(info.provinces ?? 0)}`;
      if (info.industry !== undefined) label += `, Industry ${info.industry}`;
    } else if (info) {
      label += `, ${info.status}`;
      if (info.offices.length) label += `, our offices there: ${info.offices.join(", ")}`;
    }
    if (row) label += `, ${row.policy.boycott ? "boycott" : `subsidy ${row.policy.subsidyPercent}%`}`;
    return [{ id, name, land, row, info, selectable: Boolean(row || info), mark, fill, label }];
  });
  const selected = geometry.countries.find(({ id }) => id === selectedId);
  return (
    <svg className={mode === "Trade policies" ? styles.map : `${styles.map} ${styles.informationMap}`}
      viewBox={geometry.viewBox} role="group" aria-label={mode === "Trade policies" ? "Trade policy map" : `${mode} map`}>
      <g>
        {countries.map(({ id, land, selectable, fill, label }) => {
          return (
            <g
              key={id}
              id={`${mapId}-${id}`}
              className={mode === "Trade policies" ? styles.country : `${styles.country} diplomatic-map-country`}
              style={mode === "Trade policies" ? undefined : { "--country-fill": fill } as React.CSSProperties}
              data-country={id}
              role={selectable ? "button" : "img"}
              aria-label={label}
              aria-pressed={selectable ? selectedId === id : undefined}
              tabIndex={selectable ? 0 : undefined}
              onClick={selectable ? () => select(id) : undefined}
              onKeyDown={selectable ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (event.key === "Enter") select(id);
                }
              } : undefined}
              onKeyUp={selectable ? (event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  select(id);
                }
              } : undefined}
            >
              <title>{label}</title>
              <path className={styles.land} d={land.d} fill={fill} fillRule="evenodd" />
            </g>
          );
        })}
        {/* Above every neighbour's land, below every country's name and policy marker. */}
        {selected && <path className={styles.selectedBorder} d={selected.d} fill="none" aria-hidden="true" />}
      </g>
      <g aria-hidden="true">
        {countries.map(({ id, name, land, row, info, selectable, fill, mark }) => (
          <g
            key={id}
            data-annotation-for={id}
            className={selectable ? styles.annotationButton : undefined}
            onClick={selectable ? () => {
              document.getElementById(`${mapId}-${id}`)?.focus({ preventScroll: true });
              select(id);
            } : undefined}
          >
            <g
              className={`${styles.label} political-map-lettering`}
              style={{
                "--country-fill": fill,
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
            {info && info.offices.length > 0 && (
              <g transform={`translate(${land.marker.x} ${land.marker.y})`}>
                <g className={styles.marker}>
                  <circle r="17" className={styles.medallion} />
                  <text className={styles.officeMark} textAnchor="middle" dy=".34em">{info.offices.map(office => office[0]).join("")}</text>
                </g>
              </g>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
