"use client";
import React from "react";
import { useGameStore } from "../store/rootStore";
import { ResourceType, MaterialType, GoodsType } from "@/types/Resource";

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
    <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333" }}>
      <span style={{ textTransform: "capitalize" }}>{key}</span>
      <span>{stock[key] ?? 0}</span>
    </div>
  );

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}>
      <div style={{
        width: 520,
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#1e1e1e",
        color: "#eee",
        borderRadius: 8,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        padding: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Warehouse — {nation?.name ?? "Unknown"}</h3>
          <button onClick={close} style={{ background: "#444", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>✕</button>
        </div>

        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: "8px 0" }}>Resources</h4>
          <div>
            {resourceKeys.map((k) => row(k))}
          </div>
        </section>

        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: "8px 0" }}>Materials</h4>
          <div>
            {materialKeys.map((k) => row(k))}
          </div>
        </section>

        <section>
          <h4 style={{ margin: "8px 0" }}>Goods</h4>
          <div>
            {goodsKeys.map((k) => row(k))}
          </div>
        </section>
      </div>
    </div>
  );
};