"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { money, refusalText } from "./gameText";
import { diplomacyRows } from "./diplomacy/diplomacyView";
import { CountryCard } from "./diplomacy/CountryCard";
import styles from "./diplomacy/Diplomacy.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";

/**
 * The Diplomacy screen (FR-177, FR-178): every other country, the other Great Power first, with its relation,
 * treaties, this turn's overtures and the controls that order new ones. The cards send orders through submitOrder;
 * the engine decides, and a refusal shows here.
 */
export const DiplomacyModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isDiplomacyOpen);
  const close = useGameStore((s) => s.closeDiplomacy);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);

  const rows = useMemo(() => (isOpen && nation ? diplomacyRows(game, nation.id) : []), [isOpen, game, nation]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-label="Diplomacy">
        <header className={styles.header}>
          <h2>
            <GameIcon name={UI_ICONS.diplomacy} /> Diplomacy — {nation?.name ?? "Unknown"}
          </h2>
          <button onClick={close} className={styles.closeButton} aria-label="Close diplomacy">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {nation && (
          <div className={styles.summary}>
            <span data-testid="diplomacy-cash">
              Cash: <strong>{money(nation.treasury)}</strong>
            </span>
          </div>
        )}

        {lastRejection && (
          <div className={styles.refusal} role="alert" data-testid="diplomacy-refusal">
            {refusalText(lastRejection)}
          </div>
        )}

        <p className={styles.note}>
          Overtures take effect at End Turn. Until then each one can be withdrawn and its cost comes back.
        </p>

        {nation && (
          <ul className={styles.countries} aria-label="Countries">
            {rows.map((row) => (
              <li key={row.id}>
                <CountryCard row={row} state={game} nationId={nation.id} submitOrder={submitOrder} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DiplomacyModal;
