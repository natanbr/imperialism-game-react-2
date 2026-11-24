import React from "react";
import type { GameState } from "@/types/GameState";
import { FlagDrawing } from "../NationFlag";
import { nationMark } from "../nationMark";
import type { TradePolicyRowView } from "../diplomacy/diplomacyView";
import type { TradePolicyMap as MapGeometry } from "./tradePolicyMapView";
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
  return (
    <svg className={styles.map} viewBox={geometry.viewBox} role="group" aria-label="Trade policy map">
      {[...game.nations, ...game.minorNations].map(({ id, name }) => {
        const land = geometry.countries.find((country) => country.id === id);
        if (!land) return null;
        const row = rows.find((country) => country.id === id);
        const mark = nationMark(game, id);
        const policy = row?.policy;
        const label = policy ? `${name}, ${policy.boycott ? "boycott" : `subsidy ${policy.subsidyPercent}%`}` : name;
        const flagX = `${-(name.length * 0.3 + 0.78)}em`;
        return (
          <g
            key={id}
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
            <g
              className={`${styles.label} political-map-lettering`}
              style={{ "--country-fill": mark.colour } as React.CSSProperties}
              transform={`translate(${land.label.x} ${land.label.y})`}
              aria-hidden="true"
            >
              <svg x={flagX} y="-.63em" width=".82em" height="1.12em" viewBox="0 0 18 24">
                <rect width="18" height="24" rx="3" className={styles.flagGround} />
                <FlagDrawing mark={mark} x="1.5" y="2" width="15" height="20" style={{ color: mark.colour }} data-testid="nation-flag" />
              </svg>
              <text x=".5em" dy=".31em" textAnchor="middle">{name}</text>
            </g>
            {row && <PolicyMarker row={row} x={land.marker.x} y={land.marker.y} />}
          </g>
        );
      })}
    </svg>
  );
}
