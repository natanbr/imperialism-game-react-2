"use client";
import React, { useId } from "react";
import { useTransportAllocations } from "../hooks/useTransportAllocations";
import { transportKinds } from "./commodityKinds";
import { commodityName } from "./gameText";
import { Modal } from "./Modal";
import { InkPicture } from "./art/ArtPicture";
import { buildingArt, goodsArt } from "./art/inkArt";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

/**
 * The transport plan (FR-133, FR-135): one slider per commodity, the commodities grouped by kind
 * (FR-134) and the groups laid out in up to three columns, each row the commodity's picture and name (FR-331).
 * Only what the network can carry is listed (FR-141), and a group all 0 / 0 is hidden (FR-142). The title shows the
 * railyard, as the HUD button that opens it (FR-334).
 */
const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({ capacity, onClose }) => {
  const { allocations, handleAllocChange, totalAllocated, remaining, sliderMax } = useTransportAllocations(capacity);
  const titleId = useId();
  const kinds = transportKinds((key) => sliderMax(key) > 0 || (allocations[key] ?? 0) > 0);

  return (
    <Modal titleId={titleId} onClose={onClose} overlayClassName="modal-overlay" className="modal-content">
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">
            <InkPicture src={buildingArt("railyard")} alt="" inline />Transportation of Commodities
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

        {kinds.length === 0 && <p className="transport-empty">Nothing to ship this turn.</p>}
        {/* No more columns than groups shown, so two groups share the width instead of leaving a third empty */}
        <div className="transport-groups" style={{ columnCount: Math.min(3, Math.max(1, kinds.length)) }}>
          {kinds.map((kind) => (
            <section key={kind.title} className="transport-group" aria-label={kind.title}>
              <h4 className="transport-group-title">{kind.title}</h4>
              {kind.keys.map((key) => {
                const inputId = `transport-${key}`;
                return (
                  <div key={key} className="transport-row" data-testid={`transport-row-${key}`}>
                    <label htmlFor={inputId} className="transport-name" data-testid="name">
                      <InkPicture src={goodsArt(key)} alt="" inline />{commodityName(key)}
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
    </Modal>
  );
};

export default TransportAllocationModal;
