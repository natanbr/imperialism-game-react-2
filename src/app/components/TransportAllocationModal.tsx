"use client";
import React, { useMemo, useState, useEffect } from "react";
import { ResourceType, MaterialType, GoodsType } from "@/types/Resource";
import { computeLogisticsTransport } from "@/systems/logisticsSystem";
import { useGameStore } from "../store/rootStore";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

// Modal to distribute per-resource allocations bounded by collected amounts (active depots) and total capacity
const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({ capacity, onClose }) => {
  const map = useGameStore((s) => s.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const transportAllocationsByNation = useGameStore((s) => s.transportAllocationsByNation);
  const setTransportAllocations = useGameStore((s) => s.setTransportAllocations);

  // Memoize derived initial allocations to avoid unstable selector results
  const initialAllocations = useMemo(
    () => transportAllocationsByNation?.[activeNationId] ?? {},
    [transportAllocationsByNation, activeNationId]
  );

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);

  // Keep local allocations in sync when store allocation for the active nation changes
  useEffect(() => {
    setAllocations((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(initialAllocations);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => (prev[k] ?? 0) === (initialAllocations[k] ?? 0))
      ) {
        return prev; // no change
      }
      return { ...initialAllocations };
    });
  }, [initialAllocations]);

  // Compute per-resource maximums from currently collected amounts
  const collected = useMemo(() => computeLogisticsTransport(map, activeNationId), [map, activeNationId]);

  const resourceKeys = useMemo(() => Object.values(ResourceType), []);
  const materialKeys = useMemo(() => Object.values(MaterialType), []);
  const goodsKeys = useMemo(() => Object.values(GoodsType), []);

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + (b || 0), 0),
    [allocations]
  );
  const remaining = Math.max(0, capacity - totalAllocated);

  const handleAllocChange = (key: string, nextValRaw: number) => {
    // Max per key is what is collected from active hubs
    const maxForKey = Math.max(0, Math.floor(collected[key] ?? 0));

    const nextVal = Math.max(0, Math.min(maxForKey, Math.floor(nextValRaw) || 0));
    const currentForKey = allocations[key] ?? 0;
    const othersTotal = totalAllocated - currentForKey;
    const allowedForKey = Math.max(0, Math.min(capacity - othersTotal, maxForKey));
    const clamped = Math.min(nextVal, allowedForKey);
    if (clamped === currentForKey) return; // avoid unnecessary state updates
    const next = { ...allocations, [key]: clamped };
    setAllocations(next);
    // Persist immediately: allocations persist across turns until changed
    setTransportAllocations(activeNationId, next);
  };

  const sliderMax = (key: string) => Math.max(0, Math.floor(collected[key] ?? 0));

  // No explicit Save/Cancel — changes persist as you move sliders

  // When collected changes, clamp allocations
  useEffect(() => {
    setAllocations((prev) => {
      const next: Record<string, number> = { ...prev };
      Object.keys(next).forEach((k) => {
        const maxK = sliderMax(k);
        next[k] = Math.max(0, Math.min(next[k] || 0, maxK));
      });
      // Also ensure total <= capacity by reducing overflow in a stable pass
      let total = Object.values(next).reduce((a, b) => a + (b || 0), 0);
      if (total > capacity) {
        for (const k of Object.keys(next)) {
          if (total <= capacity) break;
          const reduceBy = Math.min(next[k], total - capacity);
          next[k] -= reduceBy;
          total -= reduceBy;
        }
      }
      return next;
    });
  }, [collected, capacity]);

  const Section = ({ title, keys }: { title: string; keys: string[] }) => (
    <section style={{ marginBottom: 12 }}>
      <h4 style={{ margin: '8px 0' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 10 }}>
        {keys.map((k) => (
          <React.Fragment key={k}>
            <label style={{ textTransform: 'capitalize' }}>{k}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="range"
                min={0}
                max={sliderMax(k)}
                step={1}
                value={allocations[k] ?? 0}
                onChange={(e) => handleAllocChange(k, Number(e.target.value) || 0)}
                style={{ width: 200 }}
              />
              <span>{allocations[k] ?? 0} / {sliderMax(k)}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
      }}
    >
      <div
        style={{
          width: 720,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#1e1e1e',
          color: '#eee',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Transportation of Commodities</h3>
          <button
            onClick={onClose}
            style={{ background: '#444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <strong>Capacity:</strong>
          <span>{capacity}</span>
          <strong>Allocated:</strong>
          <span>{totalAllocated}</span>
          <strong>Remaining:</strong>
          <span>{remaining}</span>
        </div>

        <Section title="Resources" keys={resourceKeys} />
        <Section title="Materials" keys={materialKeys} />
        <Section title="Goods" keys={goodsKeys} />

      </div>
    </div>
  );
};

export default TransportAllocationModal;