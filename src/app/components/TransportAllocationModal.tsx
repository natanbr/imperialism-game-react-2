"use client";
import React from "react";
import { useTransportAllocations } from "../hooks/useTransportAllocations";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

const Section = ({
  title,
  keys,
  allocations,
  sliderMax,
  handleAllocChange,
}: {
  title: string;
  keys: string[];
  allocations: Record<string, number>;
  sliderMax: (key: string) => number;
  handleAllocChange: (key: string, value: number) => void;
}) => (
  <section className="section">
    <h4 className="section-title">{title}</h4>
    <div className="section-grid">
      {keys.map((k) => (
        <React.Fragment key={k}>
          <label className="section-label">{k}</label>
          <div className="section-input-container">
            <input
              type="range"
              min={0}
              max={sliderMax(k)}
              step={1}
              value={allocations[k] ?? 0}
              onChange={(e) => handleAllocChange(k, Number(e.target.value) || 0)}
              className="section-range-input"
            />
            <span>
              {allocations[k] ?? 0} / {sliderMax(k)}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  </section>
);

const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({
  capacity,
  onClose,
}) => {
  const {
    allocations,
    handleAllocChange,
    totalAllocated,
    remaining,
    resourceKeys,
    materialKeys,
    goodsKeys,
    sliderMax,
  } = useTransportAllocations(capacity);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Transportation of Commodities</h3>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-info-bar">
          <strong>Capacity:</strong>
          <span>{capacity}</span>
          <strong>Allocated:</strong>
          <span>{totalAllocated}</span>
          <strong>Remaining:</strong>
          <span>{remaining}</span>
        </div>

        <Section
          title="Resources"
          keys={resourceKeys}
          allocations={allocations}
          sliderMax={sliderMax}
          handleAllocChange={handleAllocChange}
        />
        <Section
          title="Materials"
          keys={materialKeys}
          allocations={allocations}
          sliderMax={sliderMax}
          handleAllocChange={handleAllocChange}
        />
        <Section
          title="Goods"
          keys={goodsKeys}
          allocations={allocations}
          sliderMax={sliderMax}
          handleAllocChange={handleAllocChange}
        />
      </div>
    </div>
  );
};

export default TransportAllocationModal;