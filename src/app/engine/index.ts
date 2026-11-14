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
  type RecruitCost,
  type TreasuryChange,
} from "./market/dealBook";
export { BOARD_ORDER, MINOR_DEMAND, MINOR_OFFER_CAP, TRADE_RELATION_POINTS } from "@/definisions/partnersMarket";
export type { BarredCounterparty, OfferMissedReason, TradeMissCause } from "./turn/context";
export type { MarketMode, TradeAmounts } from "@/types/Market";
// M8 (FR-199 to FR-213): the regiment table, armies and their view helpers for the map markers, the Army screen and
// the Armoury (FR-210 to FR-212), upkeep and its forecast (FR-261). The orders are `setRecruitment`, `moveArmy`,
// `cancelArmyMove`, `disbandRegiments`, `cancelDisband`.
export {
  armiesIn,
  armiesOf,
  armyAt,
  armyMarkers,
  beforeRecruiting,
  capitalProvinceOf,
  findRegiment,
  forceSize,
  freeWorkersOf,
  isArmyIntent,
  marchTargets,
  militiaCount,
  ordinal,
  pendingArmyIntent,
  pendingArmyOrders,
  recruitingOf,
  regimentStatus,
  regimentsOf,
  strength,
  strengthIn,
  upkeepOf,
  type ArmyMarker,
  type PendingArmyOrders,
  type PendingMarch,
  type RegimentLocation,
  type RegimentStatus,
} from "./army/armies";
export { upkeepForecast, upkeepIn, type UpkeepForecast } from "./army/upkeepForecast";
export {
  entrenches,
  isMilitia,
  RECRUITABLE_REGIMENTS,
  REGIMENT_TYPES,
  REGIMENTS,
  UPKEEP_PER_ARMS,
  type RegimentArm,
  type RegimentDefinition,
} from "@/definisions/regiments";
export { armyThreat } from "./ai/scriptedArmy";
export type { ArmyOrder } from "./orders/Order";
export type { DisbandReason } from "./turn/context";
export type { Army, Regiment } from "@/types/Army";
export { RegimentCategory, type RegimentType, type UnitStats } from "@/types/Unit";
export type { ArmyIntent, ArmyMoveIntent, AttackIntent, DisbandIntent } from "@/types/Intent";
// M9 (FR-216 to FR-229): attacks are `moveArmy` into a province of a country at war (an `attack` intent); the combat
// phase fights one battle per attacked province and emits `battle-resolved` with the whole report; conquest, colonies
// and the conquest game over; the estimate and the helpers of the attack screen and the battle screen.
export {
  attackStatus,
  attackTargets,
  battleEstimate,
  defenceOf,
  defendersOf,
  fortLevelOf,
  protectionOf,
  shotDamage,
  type AttackStatus,
  type BattleEstimate,
  type Defender,
  type EstimateVerdict,
  type Protection,
} from "./army/combat";
export { battleFrames, battleOutcome, battlesFoughtBy, type BattleFrame, type BattleFrameRegiment, type BattleOutcome, type BattleResolvedEvent } from "./army/battleReport";
export { conquestWinner, isFallen } from "./army/conquest";
export { isAttackIntent } from "./army/armies";
export { COMBAT, ESTIMATE, SCRIPTED_WAR } from "@/definisions/combatRules";
export type { BattleFate, BattleRegiment, BattleReport, BattleResult, BattleRound, BattleShot, BattleSide } from "@/types/Battle";
// M10 (FR-290 to FR-296): the Council of Governors. `resolveTurn` holds a meeting on turns 10, 20, 30 and 40 of a world with
// provinces and emits `council-met` (the whole vote); a winner ends the game (`GameOver.reason` "council", `council`).
// The screens read the event, or `councilVote(state)` for the projection, and these helpers.
export {
  abstainedProvinces,
  councilCell,
  councilNominees,
  councilStanding,
  councilVote,
  COUNCIL_ROWS,
  type CouncilMetEvent,
  isCouncilTurn,
  nextCouncilTurn,
  votesNeeded,
} from "./council/council";
export { yearOfTurn } from "./calendar";
export { COUNCIL } from "@/definisions/council";
export type { CouncilBallot, CouncilNominee, CouncilRow, CouncilVote } from "@/types/Council";
