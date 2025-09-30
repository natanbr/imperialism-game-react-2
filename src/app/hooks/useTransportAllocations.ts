"use client";

import { useMemo, useState, useEffect } from "react";
import { useGameStore } from "../store/rootStore";
import { computeLogisticsTransport } from "@/systems/logisticsSystem";
import { ResourceType, MaterialType, GoodsType } from "@/types/Resource";

export const useTransportAllocations = (capacity: number) => {
  const map = useGameStore((s) => s.map);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const transportAllocationsByNation = useGameStore((s) => s.transportAllocationsByNation);
  const setTransportAllocations = useGameStore((s) => s.setTransportAllocations);

  const initialAllocations = useMemo(
    () => transportAllocationsByNation?.[activeNationId] ?? {},
    [transportAllocationsByNation, activeNationId]
  );

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);

  useEffect(() => {
    setAllocations((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(initialAllocations);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => (prev[k] ?? 0) === (initialAllocations[k] ?? 0))
      ) {
        return prev;
      }
      return { ...initialAllocations };
    });
  }, [initialAllocations]);

  const collected = useMemo(() => computeLogisticsTransport(map, activeNationId), [map, activeNationId]);

  const resourceKeys = useMemo(() => Object.values(ResourceType), []);
  const materialKeys = useMemo(() => Object.values(MaterialType), []);
  const goodsKeys = useMemo(() => Object.values(GoodsType), []);

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((a, b) => a + (b || 0), 0),
    [allocations]
  );
  const remaining = Math.max(0, capacity - totalAllocated);

  const handleAllocChange = (key: string, nextValRaw: number) => {
    const maxForKey = Math.max(0, Math.floor(collected[key] ?? 0));
    const nextVal = Math.max(0, Math.min(maxForKey, Math.floor(nextValRaw) || 0));
    const currentForKey = allocations[key] ?? 0;
    const othersTotal = totalAllocated - currentForKey;
    const allowedForKey = Math.max(0, Math.min(capacity - othersTotal, maxForKey));
    const clamped = Math.min(nextVal, allowedForKey);
    if (clamped === currentForKey) return;
    const next = { ...allocations, [key]: clamped };
    setAllocations(next);
    setTransportAllocations(activeNationId, next);
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
      return next;
    });
  }, [collected, capacity]);

  return {
    allocations,
    handleAllocChange,
    totalAllocated,
    remaining,
    collected,
    resourceKeys,
    materialKeys,
    goodsKeys,
    sliderMax,
  };
};