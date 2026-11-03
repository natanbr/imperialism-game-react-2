"use client";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import { COMMODITY_GROUPS, commodityName } from "./gameText";
import styles from "./WarehouseModal.module.css";

/** The active nation's stock of every commodity, by display name, in three groups (FR-050). */
export const WarehouseModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isWarehouseOpen);
  const close = useGameStore((s) => s.closeWarehouse);
  const nation = useGameStore(selectActiveNation);

  if (!isOpen) return null;

  const stock = (nation?.warehouse ?? {}) as Record<string, number>;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-label="Warehouse">
        <div className={styles.header}>
          <h3>Warehouse — {nation?.name ?? "Unknown"}</h3>
          <button onClick={close} className={styles.closeButton} aria-label="Close warehouse">
            ✕
          </button>
        </div>

        {COMMODITY_GROUPS.map((group) => (
          <section key={group.title} className={styles.section} aria-label={group.title}>
            <h4>{group.title}</h4>
            <div className={styles.grid}>
              {group.keys.map((key) => (
                <div key={key} className={styles.itemRow} data-testid={`stock-${key}`}>
                  <span className={styles.itemName}>{commodityName(key)}</span>
                  <span className={styles.itemAmount}>{stock[key] ?? 0}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
