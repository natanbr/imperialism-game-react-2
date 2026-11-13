"use client";
import React, { useId, useRef } from "react";
import type { CountryId } from "@/engine";
import { relationColor } from "@/styles/theme";
import type { CountryRowView } from "./diplomacyView";
import styles from "./Diplomacy.module.css";

interface CountryTabProps {
  row: CountryRowView;
  selected: boolean;
  panelId: string;
  onSelect: () => void;
  tabRef: (el: HTMLButtonElement | null) => void;
}

/**
 * One country in the list (FR-237): named after the country, with its kind, the relation (a decorative swatch and the
 * words, FR-177, FR-179), the treaty chips ("since the start" for the Great Powers' start treaties, FR-240) and a
 * marker while orders toward it stand this turn. All but the name is the tab's description.
 */
const CountryTab: React.FC<CountryTabProps> = ({ row, selected, panelId, onSelect, tabRef }) => {
  const nameId = useId();
  const infoId = useId();
  const markId = useId();
  const ordered = row.ordered.length;
  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={selected ? panelId : undefined}
      aria-labelledby={nameId}
      aria-describedby={ordered > 0 ? `${infoId} ${markId}` : infoId}
      tabIndex={selected ? 0 : -1}
      className={`${styles.tab} ${selected ? styles.tabSelected : ""}`}
      onClick={onSelect}
      data-testid={`country-tab-${row.id}`}
    >
      <span className={styles.tabTop}>
        <span id={nameId} className={styles.tabName}>
          {row.name}
        </span>
        {ordered > 0 && (
          <span id={markId} className={styles.orderedMark} data-testid="ordered-mark" title="Orders toward this country this turn">
            {`${ordered} ordered`}
          </span>
        )}
      </span>
      <span id={infoId} className={styles.tabInfo}>
        <span className={styles.tabLine}>
          <span className={styles.kind} data-testid="country-kind">
            {row.kind}
          </span>
          <span className={styles.relation} data-testid="relation">
            {row.level !== undefined && (
              <span className={styles.swatch} aria-hidden="true" data-testid="relation-swatch" style={{ background: relationColor(row.level) }} />
            )}
            {row.relationText}
          </span>
        </span>
        <span className={styles.treaties}>
          {row.treaties.length === 0 ? (
            <span className={styles.treatyNone} data-testid="treaty">
              No treaties
            </span>
          ) : (
            row.treaties.map((t) => (
              <span key={t.text} className={`${styles.treaty} ${t.war ? styles.treatyWar : ""}`} title={t.title} data-testid="treaty">
                {t.text}
                {t.note && <span className={styles.treatyNote}>{` ${t.note}`}</span>}
              </span>
            ))
          )}
        </span>
      </span>
    </button>
  );
};

interface CountryListProps {
  rows: readonly CountryRowView[];
  selectedId: CountryId;
  panelId: string;
  onSelect: (id: CountryId) => void;
}

/**
 * The left pane of the Diplomacy screen (FR-237): every other country as a tab of a vertical list named "Countries".
 * Arrow Down and Up (wrapping), Home and End move the focus and the selection; only the selected tab is in the Tab
 * order (roving tabindex), so Tab goes from the list to the details.
 */
export const CountryList: React.FC<CountryListProps> = ({ rows, selectedId, panelId, onSelect }) => {
  const tabs = useRef(new Map<CountryId, HTMLButtonElement>());
  const move = (to: number) => {
    const row = rows[(to + rows.length) % rows.length];
    onSelect(row.id);
    tabs.current.get(row.id)?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = rows.findIndex((r) => r.id === selectedId);
    const targets: Record<string, number> = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: rows.length - 1 };
    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    move(target);
  };
  return (
    <div role="tablist" aria-label="Countries" aria-orientation="vertical" className={styles.countryList} onKeyDown={onKeyDown}>
      {rows.map((row) => (
        <CountryTab
          key={row.id}
          row={row}
          selected={row.id === selectedId}
          panelId={panelId}
          onSelect={() => onSelect(row.id)}
          tabRef={(el) => {
            if (el) tabs.current.set(row.id, el);
            else tabs.current.delete(row.id);
          }}
        />
      ))}
    </div>
  );
};
