"use client";

import { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { knownFreightPlan } from "@/engine/systems/freightForecast";

const NO_PLAN: Record<string, number> = {};

/**
 * The transport plan of the popup (FR-133, FR-389, FR-390): a commodity in the plan is set (a hard cap, 0 ships nothing),
 * one not in it is automatic and shares the capacity the set ones leave. Each change sends the whole plan as one
 * `setTransportAllocations` order. Rows, sliders and header read the plan as the logistics phase will ship it, with the
 * player's own jobs that finish before it (FR-646).
 */
export const useTransportAllocations = (capacity: number) => {
  const game = useGameStore((s) => s.game);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const submitOrder = useGameStore((s) => s.submitOrder);

  const allocations = game.transportAllocationsByNation?.[activeNationId] ?? NO_PLAN;

  const { collected, shipments } = useMemo(
    () => knownFreightPlan(game, activeNationId, capacity),
    [game, activeNationId, capacity]
  );

  // A saved cap can exceed today's supply. Only its actual shipment uses capacity. The set rows only: sliders clamp
  // against it, so a set slider can still take capacity from the automatic rows.
  const totalAllocated = Object.keys(allocations).reduce((sum, key) => sum + (shipments[key] ?? 0), 0);
  // FR-646: the header counts every row that ships, set or automatic, and what is left over
  const shippedTotal = Object.values(shipments).reduce((sum, n) => sum + n, 0);
  const spare = Math.max(0, capacity - shippedTotal);

  const isSet = (key: string) => Object.hasOwn(allocations, key);
  const scheduledAmount = (key: string) => shipments[key] ?? 0;

  const submit = (next: Record<string, number>) =>
    submitOrder({ kind: "setTransportAllocations", nationId: activeNationId, allocations: next });

  /** Moving a slider sets its commodity, an automatic one too (FR-389). */
  const handleAllocChange = (key: string, nextValRaw: number) => {
    const maxForKey = Math.max(0, Math.floor(collected[key] ?? 0));
    const nextVal = Math.max(0, Math.min(maxForKey, Math.floor(nextValRaw) || 0));
    const currentForKey = allocations[key] ?? 0;
    const othersTotal = totalAllocated - (isSet(key) ? shipments[key] ?? 0 : 0);
    const allowedForKey = Math.max(0, Math.min(capacity - othersTotal, maxForKey));
    const clamped = Math.min(nextVal, allowedForKey);
    if (isSet(key) && clamped === currentForKey) return;
    submit({ ...allocations, [key]: clamped });
  };

  /** The Auto button: the commodity leaves the plan and is automatic again (FR-390). */
  const setAuto = (key: string) => {
    if (!isSet(key)) return false;
    const next = { ...allocations };
    delete next[key];
    return submit(next).ok;
  };

  const sliderMax = (key: string) => Math.max(0, Math.floor(collected[key] ?? 0));

  return {
    allocations,
    handleAllocChange,
    setAuto,
    isSet,
    scheduledAmount,
    shippedTotal,
    spare,
    collected,
    sliderMax,
  };
};
