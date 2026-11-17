"use client";

import { useMemo, useState, useEffect } from "react";
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

  const initialAllocations = useMemo(
    () => transportAllocationsByNation?.[activeNationId] ?? NO_PLAN,
    [transportAllocationsByNation, activeNationId]
  );

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);

  useEffect(() => {
    setAllocations((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(initialAllocations);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => Object.hasOwn(initialAllocations, k) && (prev[k] ?? 0) === (initialAllocations[k] ?? 0))
      ) {
        return prev;
      }
      return { ...initialAllocations };
    });
  }, [initialAllocations]);

  const nationNetwork = railroadNetworks?.[activeNationId];
  const collected = useMemo(
    () => computeLogisticsTransport(map, activeNationId, nationNetwork),
    [map, activeNationId, nationNetwork]
  );

  /** FR-390: what each commodity ships this turn under the plan, the logistics phase's own rule (FR-389). */
  const shipments = useMemo(() => transportShipments(capacity, collected, allocations), [capacity, collected, allocations]);

  /** Allocated: the set amounts only (FR-390); Remaining: the capacity they leave for the automatic commodities. */
  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + (b || 0), 0),
    [allocations]
  );
  const remaining = Math.max(0, capacity - totalAllocated);

  const isSet = (key: string) => Object.hasOwn(allocations, key);
  const autoAmount = (key: string) => shipments[key] ?? 0;

  const submit = (next: Record<string, number>) => {
    setAllocations(next);
    submitOrder({ kind: "setTransportAllocations", nationId: activeNationId, allocations: next });
  };

  /** Moving a slider sets its commodity, an automatic one too (FR-389). */
  const handleAllocChange = (key: string, nextValRaw: number) => {
    const maxForKey = Math.max(0, Math.floor(collected[key] ?? 0));
    const nextVal = Math.max(0, Math.min(maxForKey, Math.floor(nextValRaw) || 0));
    const currentForKey = allocations[key] ?? 0;
    const othersTotal = totalAllocated - currentForKey;
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

  useEffect(() => {
    setAllocations((prev) => {
      const next: Record<string, number> = { ...prev };
      Object.keys(next).forEach((k) => {
        const maxK = sliderMax(k);
        next[k] = Math.max(0, Math.min(next[k] || 0, maxK));
      });
      let total = Object.values(next).reduce((a, b) => a + (b || 0), 0);
      if (total > capacity) {
        for (const k of Object.keys(next)) {
          if (total <= capacity) break;
          const reduceBy = Math.min(next[k], total - capacity);
          next[k] -= reduceBy;
          total -= reduceBy;
        }
      }
      return Object.keys(next).every((k) => next[k] === prev[k]) ? prev : next;
    });
  }, [collected, capacity]);

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
