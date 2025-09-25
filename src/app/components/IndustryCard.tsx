"use client";
import React, { useState } from "react";

export type SliderSpec = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

export type IndustryCardProps = {
  title: string;
  sliders?: SliderSpec[];
  hidden?: boolean;
  // Optional upgrade button
  onUpgrade?: () => void;
  upgradeLabel?: string;
  upgradeDisabled?: boolean;
};

const IndustryCard: React.FC<IndustryCardProps> = ({
  title,
  sliders = [{ label: "Output" }],
  hidden,
  onUpgrade,
  upgradeLabel = "Upgrade",
  upgradeDisabled,
}) => {
  const [values, setValues] = useState<number[]>(() => sliders.map(() => 0));

  if (hidden) return null;

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: 10,
        background: "#1b1b1b",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            disabled={upgradeDisabled}
            style={{
              background: upgradeDisabled ? "#3a3a3a" : "#2a2a2a",
              color: "#fff",
              border: "1px solid #444",
              padding: "4px 8px",
              borderRadius: 4,
              cursor: upgradeDisabled ? "not-allowed" : "pointer",
              fontSize: 12,
            }}
            title={upgradeLabel}
          >
            {upgradeLabel}
          </button>
        )}
      </div>

      {sliders.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          {sliders.map((s, i) => (
            <div
              key={`${title}-${i}`}
              style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8 }}
            >
              <label style={{ fontSize: 12, opacity: 0.9 }}>{s.label}</label>
              <input
                type="range"
                min={s.min ?? 0}
                max={s.max ?? 10}
                step={s.step ?? 1}
                value={values[i]}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = Number(e.target.value) || 0;
                  setValues(next);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndustryCard;