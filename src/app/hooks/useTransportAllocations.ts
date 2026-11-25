"use client";

import { useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { computeLogisticsTransport, transportShipments } from "@/engine/systems/logisticsSystem";

const NO_PLAN: Record<string, number> = {};

/**
 * The transport plan of the popup (FR-133, FR-389, FR-390): a commodity in the plan is set (a hard cap, 0 ships nothing),
 * one not in it is automatic and shares the capacity the set ones leave. Each change sends the whole plan as one
 * `setTransportAllocations` order.
 */
export const useTransportAllocations = (capacity: number) => {
  const map = useGameStore((s) => s.game.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const transportAllocationsByNation = useGameStore((s) => s.game.transportAllocationsByNation);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const railroadNetworks = useGameStore((s) => s.game.transportNetwork.railroadNetworks);

  const allocations = transportAllocationsByNation?.[activeNationId] ?? NO_PLAN;

  const nationNetwork = railroadNetworks?.[activeNationId];
  const collected = useMemo(
    () => computeLogisticsTransport(map, activeNationId, nationNetwork),
    [map, activeNationId, nationNetwork]
  );

  /** FR-390: what each commodity ships this turn under the plan, the logistics phase's own rule (FR-389). */
  const shipments = useMemo(() => transportShipments(capacity, collected, allocations), [capacity, collected, allocations]);

  // A saved cap can exceed today's supply. Only its actual shipment uses capacity.
  const totalAllocated = Object.keys(allocations).reduce((sum, key) => sum + (shipments[key] ?? 0), 0);
  const remaining = Math.max(0, capacity - totalAllocated);

  const isSet = (key: string) => Object.hasOwn(allocations, key);
  const autoAmount = (key: string) => shipments[key] ?? 0;

  const submit = (next: Record<string, number>) => {
    submitOrder({ kind: "setTransportAllocations", nationId: activeNationId, allocations: next });
  };

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
    if (!isSet(key)) return;
    const next = { ...allocations };
    delete next[key];
    submit(next);
  };

  const sliderMax = (key: string) => Math.max(0, Math.floor(collected[key] ?? 0));

  return {
    allocations,
    handleAllocChange,
    setAuto,
    isSet,
    autoAmount,
    totalAllocated,
    remaining,
    collected,
    sliderMax,
  };
};
