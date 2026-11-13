"use client";
import React, { useId, useMemo, useState } from "react";
import type { CountryId } from "@/engine";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { money, refusalText } from "./gameText";
import { diplomacyRows } from "./diplomacy/diplomacyView";
import { CountryList } from "./diplomacy/CountryList";
import { CountryDetails } from "./diplomacy/CountryDetails";
import styles from "./diplomacy/Diplomacy.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";

/**
 * The Diplomacy screen (FR-177, FR-178) in two panes (FR-237): on the left every other country, the other Great Power
 * first, with its relation and treaties; on the right the selected country's overtures and controls. The controls send
 * orders through submitOrder; the engine decides, and a refusal shows here. The selection outlives a close, so the
 * screen opens again on the country last looked at (the first one the first time).
 */
export const DiplomacyModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isDiplomacyOpen);
  const close = useGameStore((s) => s.closeDiplomacy);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const [selectedId, setSelectedId] = useState<CountryId | undefined>(undefined);
  const titleId = useId();
  const panelId = useId();

  const rows = useMemo(() => (isOpen && nation ? diplomacyRows(game, nation.id) : []), [isOpen, game, nation]);

  if (!isOpen) return null;
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.dialog}>
      <header className={styles.header}>
        <h2 id={titleId}>
          <GameIcon name={UI_ICONS.diplomacy} /> Diplomacy — {nation?.name ?? "Unknown"}
        </h2>
        {nation && (
          <span className={styles.cash} data-testid="diplomacy-cash">
            Cash: <strong>{money(nation.treasury)}</strong>
          </span>
        )}
        <button onClick={close} className={styles.closeButton} aria-label="Close diplomacy">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p className={styles.note}>
        Overtures take effect at End Turn. Until then each one can be withdrawn and its cost comes back. A grant improves
        relations; the money leaves our treasury and no country receives it.
      </p>

      {lastRejection && (
        <div className={styles.refusal} role="alert" data-testid="diplomacy-refusal">
          {refusalText(lastRejection)}
        </div>
      )}

      {nation && selected && (
        <div className={styles.panes}>
          <CountryList rows={rows} selectedId={selected.id} panelId={panelId} onSelect={setSelectedId} />
          <CountryDetails key={selected.id} row={selected} state={game} nationId={nation.id} submitOrder={submitOrder} panelId={panelId} />
        </div>
      )}
    </Modal>
  );
};

export default DiplomacyModal;
