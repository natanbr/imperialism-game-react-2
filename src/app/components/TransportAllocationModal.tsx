"use client";
import React, { useMemo, useState } from "react";
import { ResourceType, MaterialType, GoodsType } from "@/types/Resource";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

// A focused modal that manages local allocations with capacity enforcement
const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({ capacity, onClose }) => {
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const resourceKeys = useMemo(() => Object.values(ResourceType), []);
  const materialKeys = useMemo(() => Object.values(MaterialType), []);
  const goodsKeys = useMemo(() => Object.values(GoodsType), []);

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + (b || 0), 0),
    [allocations]
  );
  const remaining = Math.max(0, capacity - totalAllocated);

  const handleAllocChange = (key: string, nextValRaw: number) => {
    const nextVal = Math.max(0, Math.min(100, Math.floor(nextValRaw) || 0));
    const currentForKey = allocations[key] ?? 0;
    const othersTotal = totalAllocated - currentForKey;
    const allowedForKey = Math.max(0, capacity - othersTotal);
    const clamped = Math.min(nextVal, allowedForKey);
    setAllocations((prev) => ({ ...prev, [key]: clamped }));
  };

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

        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '8px 0' }}>Resources</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 10 }}>
            {resourceKeys.map((k) => (
              <React.Fragment key={k}>
                <label style={{ textTransform: 'capitalize' }}>{k}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={allocations[k] ?? 0}
                    onChange={(e) => handleAllocChange(k, Number(e.target.value) || 0)}
                    style={{ width: 200 }}
                  />
                  <span>{allocations[k] ?? 0}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '8px 0' }}>Materials</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 10 }}>
            {materialKeys.map((k) => (
              <React.Fragment key={k}>
                <label style={{ textTransform: 'capitalize' }}>{k}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={allocations[k] ?? 0}
                    onChange={(e) => handleAllocChange(k, Number(e.target.value) || 0)}
                    style={{ width: 200 }}
                  />
                  <span>{allocations[k] ?? 0}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section>
          <h4 style={{ margin: '8px 0' }}>Goods</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 10 }}>
            {goodsKeys.map((k) => (
              <React.Fragment key={k}>
                <label style={{ textTransform: 'capitalize' }}>{k}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={allocations[k] ?? 0}
                    onChange={(e) => handleAllocChange(k, Number(e.target.value) || 0)}
                    style={{ width: 200 }}
                  />
                  <span>{allocations[k] ?? 0}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: '#444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransportAllocationModal;