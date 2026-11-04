// Public API of the headless game core. The store, the UI and AI players import from here.
export type { Order, OrderKind, RejectReason, ValidationResult } from "./orders/Order";
export { ORDER_KINDS } from "./orders/Order";
export { validateOrder } from "./orders/validate";
export { applyOrder, tryApplyOrder } from "./orders/apply";
export { resolveTurn, type OrdersByNation, type TurnResult } from "./turn/resolveTurn";
export type { GameEvent, TurnContext, TurnSystem } from "./turn/context";
export { createTurnRng, type Rng } from "./rng";
export { scriptedPlayer, type Player } from "./ai/scriptedPlayer";
export { newGame, type NewGameOptions } from "./newGame";
export { seasonOf, type Season } from "./calendar";
export { labourOf, type Labour } from "./industry/labour";
export { migrantCap } from "./industry/industryState";
export { foodForecast, type FoodForecast } from "./industry/foodForecast";
export {
  isTradeCommodity,
  marketOf,
  priceOf,
  tradeCapacityOf,
  tradeOrdersOf,
  type TradeCapacity,
} from "./market/market";
export { scoreOf, scoreTable } from "./score/score";
export { isGameOver, turnLimitOf } from "./turn/gameOver";
export { railLinksOf, type RailLink } from "./systems/railroadSystem";
export type { GameOver, Score } from "@/types/Score";
export type { TradeCommodity, TradeOrders, WorldMarket } from "@/types/Market";
