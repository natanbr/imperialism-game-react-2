"use client";
import React from "react";
import { useTransportAllocations } from "../hooks/useTransportAllocations";
import { COMMODITY_ICONS, UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { COMMODITY_KINDS } from "./commodityKinds";
import { commodityName } from "./gameText";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

/**
 * The transport plan (FR-133, FR-135): one slider per commodity, the commodities grouped by kind
 * (FR-134) and the groups laid out in up to three columns, each row the commodity's icon and name.
 */
const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({ capacity, onClose }) => {
  const { allocations, handleAllocChange, totalAllocated, remaining, sliderMax } = useTransportAllocations(capacity);

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-label="Transportation of Commodities">
        <div className="modal-header">
          <h3 className="modal-title">
            <GameIcon name={UI_ICONS.transport} /> Transportation of Commodities
          </h3>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close transport">
            <span aria-hidden="true">×</span>
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

        <div className="transport-groups">
          {COMMODITY_KINDS.map((kind) => (
            <section key={kind.title} className="transport-group" aria-label={kind.title}>
              <h4 className="transport-group-title">{kind.title}</h4>
              {kind.keys.map((key) => {
                const inputId = `transport-${key}`;
                return (
                  <div key={key} className="transport-row" data-testid={`transport-row-${key}`}>
                    <label htmlFor={inputId} className="transport-name" data-testid="name">
                      <GameIcon name={COMMODITY_ICONS[key]} /> {commodityName(key)}
                    </label>
                    <input
                      id={inputId}
                      type="range"
                      min={0}
                      max={sliderMax(key)}
                      step={1}
                      value={allocations[key] ?? 0}
                      onChange={(e) => handleAllocChange(key, Number(e.target.value) || 0)}
                    />
                    <span className="transport-amount">
                      {allocations[key] ?? 0} / {sliderMax(key)}
                    </span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransportAllocationModal;
