"use client";
import React, { useId, useLayoutEffect, useRef } from "react";
import { useTransportAllocations } from "../hooks/useTransportAllocations";
import { transportKinds } from "./commodityKinds";
import { GOODS_WITH_SOURCE_NOTES } from "./goodsSources";
import { commodityName } from "./gameText";
import { Modal } from "./Modal";
import { InkPicture } from "./art/ArtPicture";
import { buildingArt, goodsArt } from "./art/inkArt";

interface TransportAllocationModalProps {
  capacity: number;
  onClose: () => void;
}

/** A row: name, slider, amount, and the Auto button of a set commodity (FR-390), which the 3-column CSS grid has no cell for. */
const ROW_COLUMNS = { gridTemplateColumns: "7.5rem minmax(4rem, 1fr) 4rem 3rem" };

/**
 * The transport plan (FR-133, FR-135): one slider per commodity, the commodities grouped by kind
 * (FR-134) and the groups laid out in up to three columns, each row the commodity's picture and name (FR-331).
 * Only what the network can carry is listed (FR-141), and a group all 0 / 0 is hidden (FR-142). The title shows the
 * railyard, as the HUD button that opens it (FR-334). M12 (FR-389, FR-390): a commodity is set (its slider is a hard
 * cap, "1 / 4" and an Auto button) or automatic ("Auto: 4", what it ships this turn from the capacity the set ones leave).
 */
const TransportAllocationModal: React.FC<TransportAllocationModalProps> = ({ capacity, onClose }) => {
  const { allocations, handleAllocChange, setAuto, isSet, autoAmount, totalAllocated, remaining, sliderMax } = useTransportAllocations(capacity);
  const titleId = useId();
  const kinds = transportKinds((key) => sliderMax(key) > 0 || (allocations[key] ?? 0) > 0 || (GOODS_WITH_SOURCE_NOTES.includes(key) && isSet(key)));
  const closeButton = useRef<HTMLButtonElement>(null);
  const clearedSlider = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!clearedSlider.current) return;
    (document.getElementById(clearedSlider.current) ?? closeButton.current)?.focus();
    clearedSlider.current = null;
  }, [allocations]);

  return (
    <Modal titleId={titleId} onClose={onClose} overlayClassName="modal-overlay" className="modal-content">
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">
            <InkPicture src={buildingArt("railyard")} alt="" inline />Transportation of Commodities
          </h3>
          <button ref={closeButton} onClick={onClose} className="modal-close-btn" aria-label="Close transport">
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
        <p className="tile-note">Goods shipped this turn reach the warehouse after this turn&apos;s production.</p>

        {kinds.length === 0 && <p className="transport-empty">Nothing to ship this turn.</p>}
        {/* No more columns than groups shown, so two groups share the width instead of leaving a third empty */}
        <div className="transport-groups" style={{ columnCount: Math.min(3, Math.max(1, kinds.length)) }}>
          {kinds.map((kind) => (
            <section key={kind.title} className="transport-group" aria-label={kind.title}>
              <h4 className="transport-group-title">{kind.title}</h4>
              {kind.keys.map((key) => {
                const inputId = `transport-${key}`;
                const set = isSet(key);
                const max = sliderMax(key);
                const cap = allocations[key] ?? 0;
                const savedAboveSupply = set && cap > max;
                return (
                  <div key={key} className="transport-row" data-testid={`transport-row-${key}`} style={ROW_COLUMNS}>
                    <label htmlFor={inputId} className="transport-name" data-testid="name">
                      <InkPicture src={goodsArt(key)} alt="" inline />{commodityName(key)}
                    </label>
                    <input
                      id={inputId}
                      type="range"
                      min={0}
                      max={max}
                      step={1}
                      value={set ? Math.min(cap, max) : autoAmount(key)}
                      aria-valuetext={savedAboveSupply ? `Saved allocation ${cap}, ${max} available` : undefined}
                      onChange={(e) => handleAllocChange(key, Number(e.target.value) || 0)}
                    />
                    <span className="transport-amount">
                      {set ? (savedAboveSupply ? `Set: ${cap}` : `${cap} / ${max}`) : `Auto: ${autoAmount(key)}`}
                    </span>
                    {set && (
                      <button type="button" className="btn btn-sm" aria-label={`Auto ${commodityName(key)}`} onClick={() => {
                        clearedSlider.current = inputId;
                        if (!setAuto(key)) clearedSlider.current = null;
                      }}>
                        Auto
                      </button>
                    )}
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
