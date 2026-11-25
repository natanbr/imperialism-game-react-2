import type { Nation } from "@/types/Nation";
import type { ValidationResult } from "../orders/Order";
import { CREDIT_FLOOR } from "./definitions";

type Borrower = Nation & { creditAccount: NonNullable<Nation["creditAccount"]> };

export function hasOpenCredit(nation: Nation | undefined): nation is Borrower {
  return nation?.controller === "human" && nation.creditAccount != null;
}

export function openCredit(nation: Nation): Nation {
  if (nation.controller !== "human" || hasOpenCredit(nation)) return nation;
  return { ...nation, creditAccount: { limit: CREDIT_FLOOR, saleReceipts: [] } };
}

export function creditDebt(nation: Nation): number {
  return hasOpenCredit(nation) ? Math.max(0, -nation.treasury) : 0;
}

export function buyingPower(nation: Nation, treasury = nation.treasury ?? 0): number {
  return Math.max(0, treasury + (hasOpenCredit(nation) ? nation.creditAccount.limit : 0));
}

/** Cost is the additional outlay after releasing this Order's own refundable reservation. */
export function canAfford(nation: Nation, cost: number, cashOnly = false): ValidationResult {
  const available = cashOnly ? Math.max(0, nation.treasury ?? 0) : buyingPower(nation);
  if (cost <= available) return { ok: true };
  return hasOpenCredit(nation)
    ? { ok: false, reason: "insufficient-funds", cost, buyingPower: available }
    : { ok: false, reason: "insufficient-funds" };
}
