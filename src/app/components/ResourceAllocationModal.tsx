"use client";
import React, { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { ResourceType } from "@/types/Resource";

interface ResourceAllocationModalProps {
  onClose: () => void;
}

const ResourceAllocationModal: React.FC<ResourceAllocationModalProps> = ({
  onClose,
}) => {
  const { resourceAllocations, updateResourceAllocation, nations, activeNationId } =
    useGameStore((state) => ({
      resourceAllocations: state.resourceAllocations,
      updateResourceAllocation: state.updateResourceAllocation,
      nations: state.nations,
      activeNationId: state.activeNationId,
    }));

  const nation = nations.find((n) => n.id === activeNationId);
  const capacity = nation?.transportCapacity ?? 0;

  const totalAllocated = useMemo(
    () =>
      Object.values(resourceAllocations).reduce(
        (a, b) => a + (b?.amount || 0),
        0
      ),
    [resourceAllocations]
  );
  const remaining = Math.max(0, capacity - totalAllocated);

  const handleAllocChange = (key: ResourceType, nextValRaw: number) => {
    const currentAllocation = resourceAllocations[key];
    if (!currentAllocation) return;

    const { max } = currentAllocation;
    const nextVal = Math.max(0, Math.min(max, Math.floor(nextValRaw) || 0));
    const currentForKey = currentAllocation.amount ?? 0;
    const othersTotal = totalAllocated - currentForKey;
    const allowedForKey = Math.max(0, capacity - othersTotal);
    const clamped = Math.min(nextVal, allowedForKey);

    updateResourceAllocation(key, clamped, max);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
      }}
    >
      <div
        style={{
          width: 720,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "#1e1e1e",
          color: "#eee",
          borderRadius: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Resource Allocation</h3>
          <button
            onClick={onClose}
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

        <div
          style={{
            marginBottom: 8,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <strong>Capacity:</strong>
          <span>{capacity}</span>
          <strong>Allocated:</strong>
          <span>{totalAllocated}</span>
          <strong>Remaining:</strong>
          <span>{remaining}</span>
        </div>

        <section style={{ marginBottom: 12 }}>
          <h4 style={{ margin: "8px 0" }}>Resources</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              rowGap: 6,
              columnGap: 10,
            }}
          >
            {Object.entries(resourceAllocations).map(([key, value]) => (
              <React.Fragment key={key}>
                <label style={{ textTransform: "capitalize" }}>{key}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="range"
                    min={0}
                    max={value.max}
                    step={1}
                    value={value.amount}
                    onChange={(e) =>
                      handleAllocChange(
                        key as ResourceType,
                        Number(e.target.value) || 0
                      )
                    }
                    style={{ width: 200 }}
                  />
                  <span>
                    {value.amount} / {value.max}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 12,
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#444",
              color: "#fff",
              border: "none",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceAllocationModal;