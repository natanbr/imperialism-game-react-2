// types/Common.ts
export type TileId = string;
export type CityId = string;
export type NationId = string;
export type ArmyId = string;
export type FleetId = string;
export type TradeRouteId = string;
export type ProvinceId = string;
export type SeaZoneId = string;
export type TechId = string;
export type BuildingId = string;

export interface NewsItem {
  id: string;
  turn: number;
  message: string;
  type: "diplomacy" | "military" | "economy" | "technology" | "general";
}