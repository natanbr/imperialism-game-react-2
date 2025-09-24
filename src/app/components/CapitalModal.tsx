"use client";
import React, { useState, useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import TransportAllocationModal from "./TransportAllocationModal";

// Minimal full-screen Capital screen placeholder with sections per repo.md
export const CapitalModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  const close = useGameStore((s) => s.closeCapital);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.nations);
  const purchaseCapacity = useGameStore((s) => s.purchaseTransportCapacityIncrease);


  const nation = nations.find((n) => n.id === activeNationId);

  // Transportation of commodities popup state
  const [isAllocOpen, setAllocOpen] = useState(false);

  const capacity = nation?.transportCapacity ?? 0;
  
  // Transport UI helpers
  const [buyCount, setBuyCount] = useState<number>(1);
  const { availableCoal, availableIron, maxPurchasable } = useMemo(() => {
    const stock = nation?.warehouse ?? {};
    const coal = Number(stock.coal ?? 0);
    const iron = Number(stock.ironOre ?? 0);
    const maxByCoal = Math.floor(coal / 1);
    const maxByIron = Math.floor(iron / 1);
    return {
      availableCoal: coal,
      availableIron: iron,
      maxPurchasable: Math.max(0, Math.min(maxByCoal, maxByIron)),
    };
  }, [nation]);

  const applyDelta = (newValue: number) => {
    if (!nation) return;
    const prev = buyCount;
    const next = Math.max(0, Math.min(Math.floor(newValue) || 0, maxPurchasable));
    const delta = next - prev;
    if (delta !== 0) {
      purchaseCapacity(nation.id, delta); // positive buys, negative refunds
    }
    setBuyCount(next);
  };

  if (!isOpen) return null;

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
                <span>Transport Capacity</span>
                <strong>{nation?.transportCapacity ?? 0}</strong>
                {nation?.transportCapacityPendingIncrease && (
                  <span style={{ color: '#ff0' }}>+{nation.transportCapacityPendingIncrease}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Increase capacity </span>
                <input
                  type="range"
                  min={0}
                  max={maxPurchasable}
                  step={1}
                  value={buyCount}
                  onChange={(e) => applyDelta(Number(e.target.value) || 0)}
                  style={{ width: 120, background: '#111', color: '#eee', border: '1px solid #333', borderRadius: 4, padding: '4px 6px' }}
                />
              </div>

              {/* Button to open Transportation of Commodities popup */}
              <button
                onClick={() => setAllocOpen(true)}
                style={{
                  marginTop: 8,
                  alignSelf: 'start',
                  background: '#2a2a2a',
                  color: '#fff',
                  border: '1px solid #444',
                  padding: '6px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Transportation of Commodities
              </button>
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

        {/* Transportation of Commodities Popup */}
        {isAllocOpen && (
          <TransportAllocationModal
            capacity={capacity}
            onClose={() => setAllocOpen(false)}
          />
        )}
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