import { technologyById } from "@/definisions/technologies";
import type { GameState } from "@/types/GameState";
import { technologyTurn } from "../technology";
import type { Order, ValidationResult } from "./Order";
import { nationById } from "./queries";

type TechnologyOrder = Extract<Order, { kind: "buyTechnology" | "withdrawTechnology" }>;

export function validateTechnologyOrder(state: GameState, { kind, nationId, techId }: TechnologyOrder): ValidationResult {
  const nation = nationById(state, nationId)!;
  const tech = technologyById(techId);
  if (!tech) return { ok: false, reason: "not-available" };
  const pending = nation.pendingTechnologies?.includes(techId);
  if (kind === "withdrawTechnology") return pending ? { ok: true } : { ok: false, reason: "not-available" };
  if (pending || nation.technologies?.includes(techId)) return { ok: false, reason: "already-owned" };
  if (state.turn < technologyTurn(state, techId)) return { ok: false, reason: "not-available" };
  if (tech.prerequisites.some(id => !nation.technologies?.includes(id))) return { ok: false, reason: "missing-prerequisite" };
  if (nation.treasury < tech.cost) return { ok: false, reason: "insufficient-funds" };
  return { ok: true };
}

export function applyTechnologyOrder(state: GameState, { kind, nationId, techId }: TechnologyOrder): GameState {
  const price = technologyById(techId)!.cost;
  const buying = kind === "buyTechnology";
  const nations = state.nations.map(nation => {
    if (nation.id !== nationId) return nation;
    const pending = nation.pendingTechnologies ?? [];
    return {
      ...nation,
      treasury: nation.treasury + (buying ? -price : price),
      pendingTechnologies: buying ? [...pending, techId] : pending.filter(id => id !== techId),
    };
  });
  return { ...state, nations };
}
