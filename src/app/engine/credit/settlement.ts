import type { Nation } from "@/types/Nation";
import type { WorldMarket } from "@/types/Market";
import { BOARD_ORDER } from "@/definisions/partnersMarket";
import { marketOf, priceOf } from "../market/market";
import type { TurnContext, TurnSystem } from "../turn/context";
import { creditDebt, hasOpenCredit } from "./account";
import {
  CREDIT_FLOOR, CREDIT_HIGH_RATE_PERCENT, CREDIT_INCOME_PERCENT, CREDIT_INCOME_TURNS,
  CREDIT_LOW_BAND_SHARE, CREDIT_LOW_RATE_PERCENT, FORCED_SALE_MIN_PRICE, FORCED_SALE_PRICE_SHARE,
} from "./definitions";

type CreditAccount = NonNullable<Nation["creditAccount"]>;

export function postedCreditLimit(saleReceipts: readonly number[]): number {
  const gross = saleReceipts.reduce((sum, income) => sum + income, 0);
  return Math.max(CREDIT_FLOOR, Math.floor(gross * CREDIT_INCOME_PERCENT / 100));
}

export function nextCreditAccount(account: CreditAccount, saleIncome: number): CreditAccount {
  const saleReceipts = [...account.saleReceipts, saleIncome].slice(-CREDIT_INCOME_TURNS);
  return { limit: postedCreditLimit(saleReceipts), saleReceipts };
}

export function interestOn(debt: number, limit: number): { ratePercent: number; amount: number } {
  const ratePercent = debt <= limit * CREDIT_LOW_BAND_SHARE ? CREDIT_LOW_RATE_PERCENT : CREDIT_HIGH_RATE_PERCENT;
  return { ratePercent, amount: Math.round(debt * ratePercent / 100) };
}

function liquidate(nation: Nation, limit: number, market: WorldMarket, ctx: TurnContext): Nation {
  let treasury = nation.treasury;
  if (-treasury <= limit) return nation;
  const warehouse = { ...nation.warehouse };
  for (const commodity of BOARD_ORDER) {
    const price = Math.max(FORCED_SALE_MIN_PRICE, Math.floor(priceOf(market, commodity) * FORCED_SALE_PRICE_SHARE));
    const stock = warehouse[commodity] ?? 0;
    const amount = Math.min(Math.floor(stock), Math.ceil((-treasury - limit) / price));
    if (amount <= 0) continue;
    const proceeds = amount * price;
    treasury += proceeds;
    warehouse[commodity] = stock - amount;
    ctx.emit({ type: "forced-sale", nationId: nation.id, commodity, amount, price, proceeds });
    if (-treasury <= limit) break;
  }
  return { ...nation, treasury, warehouse };
}

/** The trade phase has posted the limit and upkeep has debited the surviving army. Production has not taken inputs yet. */
export const creditSettlementSystem: TurnSystem = (state, ctx) => {
  if (!state.nations.some(hasOpenCredit)) return state;
  const market = marketOf(state);
  const nations = state.nations.map(nation => {
    if (!hasOpenCredit(nation)) return nation;
    const { limit } = nation.creditAccount;
    const debt = creditDebt(nation);
    let settled = nation;
    if (debt > 0) {
      const interest = interestOn(debt, limit);
      ctx.emit({ type: "credit-interest", nationId: nation.id, debt, limit, ...interest });
      settled = { ...nation, treasury: nation.treasury - interest.amount };
    }
    return liquidate(settled, limit, market, ctx);
  });
  return { ...state, nations };
};

/** Later refunds and logistics receipts affect the closing balance after interest has been charged. */
export const reportClosingCredit: TurnSystem = (state, ctx) => {
  for (const nation of state.nations) {
    if (hasOpenCredit(nation)) {
      ctx.emit({ type: "credit-settled", nationId: nation.id, limit: nation.creditAccount.limit, closingDebt: creditDebt(nation) });
    }
  }
  return state;
};
