"use client";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { ResourceType, MaterialType, GoodsType } from "@/types/Resource";
import styles from "./WarehouseModal.module.css";

// Simple modal to display nation's warehouse stockpiles
export const WarehouseModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isWarehouseOpen);
  const close = useGameStore((s) => s.closeWarehouse);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.nations);

  if (!isOpen) return null;

  const nation = nations.find((n) => n.id === activeNationId);
  const stock = nation?.warehouse ?? {};

  // All commodity keys (Resource + Materials + Goods)
  const resourceKeys = Object.values(ResourceType);
  const materialKeys = Object.values(MaterialType);
  const goodsKeys = Object.values(GoodsType);

  const row = (key: string) => (
    <div key={key} className={styles.itemRow}>
      <span className={styles.itemName}>{key}</span>
      <span>{stock[key] ?? 0}</span>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Warehouse — {nation?.name ?? "Unknown"}</h3>
          <button onClick={close} className={styles.closeButton}>✕</button>
        </div>

        <section className={styles.section}>
          <h4>Resources</h4>
          <div>
            {resourceKeys.map((k) => row(k))}
          </div>
        </section>

        <section className={styles.section}>
          <h4>Materials</h4>
          <div>
            {materialKeys.map((k) => row(k))}
          </div>
        </section>

        <section className={styles.section}>
          <h4>Goods</h4>
          <div>
            {goodsKeys.map((k) => row(k))}
          </div>
        </section>
      </div>
    </div>
  );
};