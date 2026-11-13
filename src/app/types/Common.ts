// types/Common.ts
export type TileId = string;
export type CityId = string;
/** A Great Power: an entry of `state.nations`. */
export type NationId = string;
/** A minor nation: an entry of `state.minorNations` (FR-146). */
export type MinorNationId = string;
/** A Great Power id or a minor nation id (FR-146). */
export type CountryId = NationId | MinorNationId;
export type ArmyId = string;
export type FleetId = string;
export type TradeRouteId = string;
export type ProvinceId = string;
export type SeaZoneId = string;
export type TechId = string;
export type BuildingId = string;
