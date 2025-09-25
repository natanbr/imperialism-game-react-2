"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useGameStore } from "../store/rootStore";
import TransportAllocationModal from "./TransportAllocationModal";

// Capital screen organized per Roadmap Step 4.1
// - Top buttons: Warehouse, Trade, Diplomacy, Technology
// - Two side panels (left/right): Available Labour, Worker Types, Electricity (hidden until Oil tech)
// - Center area: sections including Industry with cards and sliders

import IndustryCard from "./IndustryCard";

export const CapitalModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  const close = useGameStore((s) => s.closeCapital);
  const openWarehouse = useGameStore((s) => s.openWarehouse);

  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.nations);
  const technologyState = useGameStore((s) => s.technologyState);
  const nation = nations.find((n) => n.id === activeNationId);
  // Industry is now per-nation
  const industry = nation?.industry;

  const purchaseCapacity = useGameStore((s) => s.purchaseTransportCapacityIncrease);

  // Transportation of commodities popup state
  const [isAllocOpen, setAllocOpen] = useState(false);

  const capacity = nation?.transportCapacity ?? 0;

  // Transport UI helpers
  const [buyCount, setBuyCount] = useState<number>(0);
  const { maxPurchasable } = useMemo(() => {
    const stock = nation?.warehouse ?? {} as Record<string, number>;
    const coal = Number(stock.coal ?? stock.Coal ?? 0);
    const iron = Number(stock.ironOre ?? stock.IronOre ?? 0);
    const maxByCoal = Math.floor(coal / 1);
    const maxByIron = Math.floor(iron / 1);
    return {
      maxPurchasable: Math.max(0, Math.min(maxByCoal, maxByIron)),
    };
  }, [nation]);

  // Auto-reset the slider at the start of each new turn
  const turn = useGameStore((s) => s.turn);
  useEffect(() => {
    setBuyCount(0);
  }, [turn]);

  const applyDelta = (newValue: number) => {
    if (!nation) return;
    const prev = buyCount;
    const totalAllowed = prev + maxPurchasable; // keep previous and add up to available this turn
    const next = Math.max(0, Math.min(Math.floor(newValue) || 0, totalAllowed));
    const delta = next - prev;
    if (delta !== 0) {
      purchaseCapacity(nation.id, delta); // positive buys, negative refunds
    }
    setBuyCount(next);
  };

  if (!isOpen) return null;

  const oilUnlocked = !!technologyState?.oilDrillingTechUnlocked;
  const workers = industry?.workers ?? { untrained: 0, trained: 0, expert: 0 };
  const power = industry?.power ?? { total: 0, available: 0, electricity: 0 };

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
          width: "92vw",
          height: "92vh",
          background: "#151515",
          color: "#eee",
          borderRadius: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with top action buttons */}
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

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={openWarehouse}
              style={{ background: "#2a2a2a", color: "#fff", border: "1px solid #444", padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}
              title="Open Warehouse"
            >
              Warehouse
            </button>
            <button
              onClick={() => {/* Placeholder for future screen */}}
              style={{ background: "#2a2a2a", color: "#aaa", border: "1px solid #444", padding: "6px 10px", borderRadius: 4, cursor: "not-allowed" }}
              title="Trade (coming soon)"
              disabled
            >
              Trade
            </button>
            <button
              onClick={() => {/* Placeholder for future screen */}}
              style={{ background: "#2a2a2a", color: "#aaa", border: "1px solid #444", padding: "6px 10px", borderRadius: 4, cursor: "not-allowed" }}
              title="Diplomacy (coming soon)"
              disabled
            >
              Diplomacy
            </button>
            <button
              onClick={() => {/* Placeholder for future screen */}}
              style={{ background: "#2a2a2a", color: "#aaa", border: "1px solid #444", padding: "6px 10px", borderRadius: 4, cursor: "not-allowed" }}
              title="Technology (coming soon)"
              disabled
            >
              Technology
            </button>
          </div>

          <button
            onClick={close}
            style={{
              background: "#444",
              color: "#fff",
              border: "none",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body layout: left sidebar, center content, right sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 8fr 1fr", gap: 12, padding: 12, height: "100%" }}>
          {/* Left side panel */}
          <aside style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#1a1a1a", display: "grid", gap: 8, alignContent: "start" }}>
            <h3 style={{ marginTop: 0 }}>Capital Info</h3>
            <div><strong>Workers (Total):</strong> {power.available}</div>
            <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6 }}>
              <div style={{ marginBottom: 4, fontWeight: 700 }}>Worker Types</div>
              <div>Untrained: {workers.untrained}</div>
              <div>Trained: {workers.trained}</div>
              <div>Expert: {workers.expert}</div>
            </div>
            {oilUnlocked && (
              <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6 }}>
                <div style={{ marginBottom: 4, fontWeight: 700 }}>Electricity</div>
                <div>Electricity: {power.electricity}</div>
              </div>
            )}
          </aside>

          {/* Center content grid */}
          <main style={{ overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(260px, 1fr))", gap: 12 }}>
              <section style={{ gridColumn: "1 / -1" }}>
                <div style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#1a1a1a" }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>Industry</h3>
                  {/* Industry cards grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 10 }}>
                    <IndustryCard title="Trade School" sliders={[{ label: "Untrained" }, { label: "Trained" }, { label: "Expert" }]} />
                    <IndustryCard title="Textile Mill" />
                    <IndustryCard title="Lumber Mill" />
                    <IndustryCard title="Steel Mill" />
                    <IndustryCard title="Food Processing" />
                    <IndustryCard title="Furniture Factory" />
                    <IndustryCard title="Clothing Factory" />
                    <IndustryCard title="Fuel Processing" hidden={!oilUnlocked} />
                    <IndustryCard title="Electricity Production" hidden={!oilUnlocked} />
                    <IndustryCard title="Armory" sliders={[]} />
                    <IndustryCard title="Shipyard"  sliders={[]}/>
                  </div>
                </div>
              </section>


              {/* Existing Transport section */}
              <section>
                <div style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#1a1a1a", display: 'grid', gap: 8 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>Transport</h3>

                  <div
                    onClick={() => setAllocOpen(true)}
                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', border: '1px dashed #333', borderRadius: 4 }}
                    title="Click to distribute transport capacity per resource"
                  >
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
                      max={maxPurchasable + buyCount}
                      step={1}
                      value={buyCount}
                      onChange={(e) => applyDelta(Number(e.target.value) || 0)}
                      style={{ width: 140, background: '#111', color: '#eee', border: '1px solid #333', borderRadius: 4, padding: '4px 6px' }}
                    />
                  </div>

                  <button
                    onClick={() => setAllocOpen(true)}
                    style={{
                      marginTop: 4,
                      alignSelf: 'start',
                      background: '#2a2a2a',
                      color: '#fff',
                      border: '1px solid #444',
                      padding: '6px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    title="Open Transportation of Commodities"
                  >
                    Transportation of Commodities
                  </button>
                </div>
              </section>
              
            </div>
          </main>

          {/* Right side panel (mirrors the required capital info) */}
          <aside style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#1a1a1a", display: "grid", gap: 8, alignContent: "start" }}>
            <h3 style={{ marginTop: 0 }}>Capital Info</h3>
            <div><strong>Workers (Total):</strong> {power.available}</div>
            <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6 }}>
              <div style={{ marginBottom: 4, fontWeight: 700 }}>Worker Types</div>
              <div>Untrained: {workers.untrained}</div>
              <div>Trained: {workers.trained}</div>
              <div>Expert: {workers.expert}</div>
            </div>
            {oilUnlocked && (
              <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6 }}>
                <div style={{ marginBottom: 4, fontWeight: 700 }}>Electricity</div>
                <div>Electricity: {power.electricity}</div>
              </div>
            )}
          </aside>
        </div>

        {/* Transportation of Commodities Popup */}
        {isAllocOpen && (
          <TransportAllocationModal
            capacity={capacity}
            onClose={() => setAllocOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CapitalModal;