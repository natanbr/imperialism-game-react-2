// src/app/definisions/workPrices.ts
// Centralized work price definitions

export const PROSPECT_COST = 100;

export const DEVELOPMENT_COST: Record<1 | 2 | 3, number> = {
  1: 100,
  2: 500,
  3: 5000,
};

export const CONSTRUCTION_COST: Record<"rail" | "depot" | "port" | "fort", number> = {
  rail: 100,
  depot: 500,
  port: 1000,
  fort: 1000,
};

export const getDevelopmentCost = (level: 1 | 2 | 3): number => DEVELOPMENT_COST[level];
export const getConstructionCost = (kind: keyof typeof CONSTRUCTION_COST): number => CONSTRUCTION_COST[kind];