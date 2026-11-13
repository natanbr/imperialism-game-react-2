// Public API of the headless game core. The store, the UI and AI players import from here.
export type { DiplomacyOrder, Order, OrderKind, RejectReason, ValidationResult } from "./orders/Order";
export { ORDER_KINDS } from "./orders/Order";
export { validateOrder } from "./orders/validate";
export { applyOrder, tryApplyOrder } from "./orders/apply";
export { resolveTurn, type OrdersByNation, type TurnResult } from "./turn/resolveTurn";
export type { GameEvent, GrantStopReason, TurnContext, TurnSystem } from "./turn/context";
export { createTurnRng, type Rng } from "./rng";
export { scriptedPlayer, type Player } from "./ai/scriptedPlayer";
export { computerOrders, PLAYERS } from "./ai/players";
export { newGame, type NewGameOptions } from "./newGame";
export { seasonOf, type Season } from "./calendar";
export { labourOf, planProduction, type Labour, type ProductionPlan } from "./industry/productionPlan";
export { migrantCap } from "./industry/industryState";
export { largestOrder } from "./orders/industryOrders";
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
// M5 (FR-144 to FR-152): worlds, minor nations, provinces, diplomacy state, intents, random streams.
export { WORLDS, DEFAULT_WORLD, type World } from "./world/worlds";
export { countryName, countryOfTile, isGreatPower, isMinorNation, minorNationAt, minorNationById } from "./world/countries";
export { adjacentProvinces, provinceById, provinceOf, provincesOf, transferProvince } from "./world/provinces";
export { pairKey, RELATION_SWATCHES, relationLevel, relationOf, type RelationSwatch } from "./diplomacy/relations";
export { addIntent, byIntentOrder, intentOrder } from "./turn/intents";
export { RNG_STREAMS, type RngStream } from "./rng";
export type { GameOver, Score } from "@/types/Score";
export type { CountryId, MinorNationId } from "@/types/Common";
export type { DiplomacyState, PairDiplomacy } from "@/types/Diplomacy";
export type { Intent } from "@/types/Intent";
// M6 (FR-161 to FR-176): diplomacy orders, the phase's view helpers, the scripted answers, the rule numbers.
export {
  diplomacyIntentsOf,
  intentCost,
  isOverture,
  militaryStrength,
  OVERTURES,
  pendingProposalsFor,
  proposalAnswer,
  proposalsOf,
  warActive,
  warBetween,
} from "./diplomacy/queries";
export { acceptsAlliance, acceptsPeace, losingWar } from "./diplomacy/scriptedAnswers";
export { GRANT_AMOUNTS, GRANT_POINTS, OVERTURE_COST, SUBSIDY_PERCENTS } from "@/definisions/diplomacyRules";
export type {
  GrantAmount,
  Overture,
  Proposal,
  ProposalKind,
  ProvinceCapture,
  SubsidyPercent,
  War,
  WithdrawableOverture,
} from "@/types/Diplomacy";
export type { DiplomacyIntent } from "@/types/Intent";
export type { MinorNation } from "@/types/MinorNation";
export type { Province } from "@/types/Province";
export type { WorldId } from "@/types/World";
export type { TradeCommodity, TradeOrders, WorldMarket } from "@/types/Market";
// M7 (FR-183 to FR-191, FR-242 to FR-256): nation-to-nation trade, the Board of Trade rows and the Deal Book data.
export {
  boardOfTrade,
  buyersOf,
  favouritePartner,
  marketModeOf,
  minorDemand,
  minorOffers,
  partnerRanking,
  partnerRefusal,
  sellersOf,
  tradeBarrier,
  type BoardBuyer,
  type BoardRow,
  type BoardSeller,
  type PartnerRefusal,
  type TradeBarrier,
} from "./market/partners";
export {
  dealBook,
  type DealBook,
  type DealBottomLine,
  type DealEntry,
  type DiplomacyCost,
  type TreasuryChange,
} from "./market/dealBook";
export { BOARD_ORDER, MINOR_DEMAND, MINOR_OFFER_CAP, TRADE_RELATION_POINTS } from "@/definisions/partnersMarket";
export type { OfferMissedReason, TradeMissCause } from "./turn/context";
export type { MarketMode, TradeAmounts } from "@/types/Market";
