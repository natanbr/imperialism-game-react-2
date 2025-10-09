"use client";
import React from "react";
import styles from "./CapitalModal.module.css";

interface CapitalSidebarProps {
  workersAvailable: number;
  workersUntrained: number;
  workersTrained: number;
  workersExpert: number;
  electricity: number;
  oilUnlocked: boolean;
}

export const CapitalSidebar: React.FC<CapitalSidebarProps> = ({
  workersAvailable,
  workersUntrained,
  workersTrained,
  workersExpert,
  electricity,
  oilUnlocked,
}) => {
  return (
    <aside className={styles.sidebar}>
      <h3>Capital Info</h3>
      <div><strong>Workers (Total):</strong> {workersAvailable}</div>
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionTitle}>Worker Types</div>
        <div>Untrained: {workersUntrained}</div>
        <div>Trained: {workersTrained}</div>
        <div>Expert: {workersExpert}</div>
      </div>
      {oilUnlocked && (
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarSectionTitle}>Electricity</div>
          <div>Electricity: {electricity}</div>
        </div>
      )}
    </aside>
  );
};
