import { describe, expect, it, vi } from "vitest";
import { boardView } from "@/components/market/boardView";
import { spendingWarningText } from "@/components/gameText";
import { newGame } from "@/engine";
import { upkeepForecast } from "@/engine/army/upkeepForecast";
import { openCredit } from "@/engine/credit/account";
import * as settlement from "@/engine/market/settlePartners";
import { applyBuyCommodity } from "@/engine/orders/tradeOrders";
import { ResourceType } from "@/types/Resource";
import { setPair, setTreasury } from "../engine/fixtures";

const id = "nation-1";
const start = () => setPair(newGame({ seed: 1, world: "continent" }), id, "minor-1", { consulates: [id] });

describe("FR-605 Board purchase forecasts", () => {
  it("avoids simulating a settlement for each row when even the most expensive subsidized bid is covered", () => {
    const state = setPair(start(), id, "minor-1", { subsidies: { [id]: 100 } });
    const spy = vi.spyOn(settlement, "settlePartnerTrade");
    try {
      const rows = boardView(state, state.nations[0]).rows.filter(row => !row.bidMoreRefusal);
      expect(rows.length).toBeGreaterThan(1);
      expect(rows.every(row => row.purchaseWarning === undefined)).toBe(true);
      expect(spy.mock.calls.length).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("also shares the forecast for debt warnings when the purchase has no premium", () => {
    const lowCash = setTreasury(start(), id, 25);
    const state = { ...lowCash, nations: lowCash.nations.map(n => n.id === id ? openCredit(n) : n) };
    const spy = vi.spyOn(settlement, "settlePartnerTrade");
    try {
      const warnings = boardView(state, state.nations[0]).rows.filter(row => row.purchaseWarning);
      expect(warnings.length).toBeGreaterThan(1);
      expect(spy.mock.calls.length).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it.each([360, 1260])("matches actual bids with a $%i treasury, including premiums and standing grants", treasury => {
    for (const borrow of [false, true]) {
      for (const subsidy of [0, 50] as const) {
        let state = setTreasury(start(), id, treasury);
        if (borrow) state = { ...state, nations: state.nations.map(n => n.id === id ? openCredit(n) : n) };
        state = setPair(state, id, "minor-1", {
          subsidies: subsidy ? { [id]: subsidy } : {}, lockedGrants: { [id]: 1000 },
        });
        state = applyBuyCommodity(state, { kind: "buyCommodity", nationId: id, commodity: ResourceType.Coal, amount: 1 });
        const nation = state.nations.find(n => n.id === id)!;
        const rows = boardView(state, nation).rows.filter(row => !row.bidMoreRefusal);
        expect(rows.length).toBeGreaterThan(1);
        for (const row of rows) {
          const bought = applyBuyCommodity(state, { kind: "buyCommodity", nationId: id, commodity: row.commodity, amount: row.bid + 1 });
          const expected = spendingWarningText(upkeepForecast(bought, id), nation.treasury - row.price);
          expect(row.purchaseWarning, `${row.commodity} / credit ${borrow} / subsidy ${subsidy}`).toBe(expected);
        }
      }
    }
  });
});
