"use client";
import React from "react";
import { useGameStore } from "@/store/rootStore";
import styles from "./CapitalModal.module.css";

interface CapitalHeaderProps {
  nationName: string | undefined;
}

export const CapitalHeader: React.FC<CapitalHeaderProps> = ({ nationName }) => {
  const close = useGameStore((s) => s.closeCapital);
  const openWarehouse = useGameStore((s) => s.openWarehouse);

  return (
    <div className={styles.header}>
      <h2>Capital — {nationName ?? "Unknown"}</h2>

      <div className={styles.headerButtons}>
        <button
          onClick={openWarehouse}
          className={styles.headerButton}
          title="Open Warehouse"
        >
          Warehouse
        </button>
        <button
          onClick={() => {/* Placeholder for future screen */}}
          className={styles.headerButton}
          title="Trade (coming soon)"
          disabled
        >
          Trade
        </button>
        <button
          onClick={() => {/* Placeholder for future screen */}}
          className={styles.headerButton}
          title="Diplomacy (coming soon)"
          disabled
        >
          Diplomacy
        </button>
        <button
          onClick={() => {/* Placeholder for future screen */}}
          className={styles.headerButton}
          title="Technology (coming soon)"
          disabled
        >
          Technology
        </button>
      </div>

      <button onClick={close} className={styles.closeButton}>
        ✕
      </button>
    </div>
  );
};
