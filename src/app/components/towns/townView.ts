import { createSelector } from "reselect";
import { capitalProvinceOf } from "@/engine/army/armies";
import { buildingOf } from "@/engine/industry/industryState";
import { hubOf } from "@/engine/map/collectingHubs";
import { nationById, tileById } from "@/engine/orders/queries";
import { advanceTown, settledTownOutput, townCapitalKind } from "@/engine/systems/townDevelopmentSystem";
import { provinceById, startOwnerOf } from "@/engine/world/provinces";
import {
  TOWN_CAPACITY_PER_TIER, TOWN_MAX_TIER, TOWN_TILES_PER_TIER,
  townChains, townFactories, townOutput, townsOf, type TownFacts,
} from "@/engine/world/towns";
import type { GameStore } from "@/store/rootStore";
import type { GameState } from "@/types/GameState";
import type { TownTiers } from "@/types/Province";
import { BUILDING_TEXT } from "../gameText";
import { collectingHubText } from "../tileSiteText";

type TownStatus = "Idle" | "Developing" | "Producing" | "Disconnected";

function routeText(game: GameState, town: TownFacts) {
  if (town.hub) return `Connected through ${collectingHubText(game, town.hub)}.`;
  const network = game.transportNetwork.railroadNetworks?.[town.ownerId];
  const seat = tileById(game, town.seatTileId);
  if (network && seat) {
    const unavailablePorts = network.ports.filter(p => !p.isActive || network.closedFishingPorts?.includes(`${p.x}-${p.y}`));
    const nearby = hubOf(game.map, town.ownerId, unavailablePorts.map(p => ({ kind: "port", tileId: `${p.x}-${p.y}` })), seat);
    if (nearby) return `Port route closed at ${nearby.tileId}. Reopen its water access or connect a depot near the seat.`;
  }
  return "Connect a depot or open port on the seat or an adjacent hex.";
}

function resourceRequirement(chain: keyof TownTiers, tier: number) {
  const tiles = tier * TOWN_TILES_PER_TIER;
  if (chain === "metal") return `${tiles} coal and ${tiles} iron ore tiles`;
  return `${tiles} ${chain === "wood" ? "timber" : "cotton or wool"} tiles`;
}

/** Derive town estimates only for the inspecting nation. Foreign seats use public province geometry alone. */
export function ownTownViews(game: GameState, viewerId: string) {
  const nation = nationById(game, viewerId);
  if (!nation) return [];
  return townsOf(game, viewerId).map(town => {
    const province = provinceById(game, town.provinceId)!;
    const founder = startOwnerOf(province);
    const capital = townCapitalKind(game, province, capitalProvinceOf(game, founder)?.id);
    const excluded = capital === "minor" || capital === "own";
    const saved = game.townProgress?.[province.id];
    const progress = !excluded && saved?.ownerId === viewerId ? saved : undefined;
    const projection = excluded ? undefined : advanceTown(town, progress, capital === "captured");
    const output = town.connected && projection ? townOutput(town.supported, projection.matured) : {};
    const producing = !excluded && Object.keys(settledTownOutput(game, viewerId, town)).length > 0;
    let status: TownStatus = "Idle";
    if (!excluded) {
      if (!town.connected) status = progress?.connectedSettlements ? "Disconnected" : "Idle";
      else if (producing) status = "Producing";
      else if (Object.values(town.supported).some(tier => tier > 0)) status = "Developing";
    }
    const chains = townChains.map(([chain, material, good]) => {
      const factory = townFactories[chain];
      const factoryName = BUILDING_TEXT[factory];
      const capacity = buildingOf(nation, factory).capacity;
      const tier = Math.min(town.supported[chain], projection?.matured[chain] ?? 0);
      const nextTier = !excluded && tier < TOWN_MAX_TIER ? tier + 1 : null;
      const nextRequirement = nextTier && `${resourceRequirement(chain, nextTier)} and ${factoryName} capacity ${nextTier * TOWN_CAPACITY_PER_TIER}`;
      return { chain, material, good, factoryName, capacity, supportedTier: town.supported[chain], nextTier, nextRequirement };
    });
    return { province, status, capital, connected: town.connected, route: routeText(game, town), resources: town.resources, progress, output, chains };
  });
}

export type OwnTownView = ReturnType<typeof ownTownViews>[number];

export const selectOwnTownViews = createSelector(
  [(s: GameStore) => s.game, (s: GameStore) => s.activeNationId],
  ownTownViews
);

const statusGlyph: Record<TownStatus, string> = { Idle: "○", Developing: "◐", Producing: "●", Disconnected: "×" };

export const selectTownMarkers = createSelector(
  [(s: GameStore) => s.game.provinces, selectOwnTownViews],
  (provinces, ownTowns) => {
    const statuses = new Map(ownTowns.map(town => [town.province.id, town.status]));
    return new Map(provinces.map(province => {
      const status = statuses.get(province.id);
      const label = `${province.name} town${status ? `, ${status}` : ""}`;
      return [province.seatTileId, { label, glyph: status ? statusGlyph[status] : "⌂" }];
    }));
  }
);
