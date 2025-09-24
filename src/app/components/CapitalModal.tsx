"use client";
import React from "react";
import { useGameStore } from "../store/rootStore";

// Minimal full-screen Capital screen placeholder with sections per repo.md
export const CapitalModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  const close = useGameStore((s) => s.closeCapital);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.nations);
  const setNationTransportCapacity = useGameStore((s) => s.setNationTransportCapacity);

  if (!isOpen) return null;

  const nation = nations.find((n) => n.id === activeNationId);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "90vw",
          height: "90vh",
          background: "#151515",
          color: "#eee",
          borderRadius: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #333",
            background: "#1e1e1e",
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        >
          <h2 style={{ margin: 0 }}>Capital — {nation?.name ?? "Unknown"}</h2>
          <button
            onClick={close}
            style={{
              background: "#444",
              color: "#fff",
              border: "none",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content area: basic grid of sections to be implemented */}
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridAutoRows: "minmax(160px, auto)",
            gap: 12,
            overflow: "auto",
          }}
        >
          <Section title="Industry">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Production overview (Textile, Lumber, Steel, Food, etc.)</li>
              <li>Labor (untrained/trained/expert)</li>
              <li>Power capacity</li>
            </ul>
          </Section>

          <Section title="Warehouse">
            <p>Quick stock summary of resources, materials, goods.</p>
          </Section>

          <Section title="Transport">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capacity per turn</span>
                <strong>{nation?.transportCapacity ?? 0}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={nation?.transportCapacity ?? 0}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (nation) setNationTransportCapacity(nation.id, next);
                }}
              />
            </div>
          </Section>

          <Section title="Trade">
            <p>Bids & offers, merchant marine capacity (planned).</p>
          </Section>

          <Section title="Diplomacy">
            <p>Attitudes, treaties, grants (planned).</p>
          </Section>

          <Section title="Military">
            <p>Regiments, recruitment (armaments + horses) (planned).</p>
          </Section>

          <Section title="Technology">
            <p>Investments, unlocks (e.g., oil drilling, ranchers) (planned).</p>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#1a1a1a" }}>
    <h3 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h3>
    {children}
  </div>
);

export default CapitalModal;