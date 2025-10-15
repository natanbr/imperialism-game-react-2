import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeRailroadNetworks,
  addRailroad,
} from "@/systems/railroadSystem";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { Nation } from "@/types/Nation";
import { RailroadNode } from "@/types/Transport";

const mockMap = (tiles: Tile[][]): GameMap => ({
  config: {
    cols: tiles[0].length,
    rows: tiles.length,
    gameYearStart: 1900,
    mapUrl: "",
    name: "mock",
  },
  tiles,
});

const mockNation = (id: string): Nation => ({
  id,
  name: `Nation ${id}`,
  color: "#ffffff",
  capital: 0,
  provinces: [],
  relations: {},
  technology: {
    advances: {},
  },
  industry: {
    factories: 0,
    resourceCapacity: 0,
    resourceStockpiles: {},
  },
  military: {
    maxManpower: 0,
    manpower: 0,
  },
});

const mockState = (map: GameMap, nations: Nation[]): GameState => ({
  turn: 1,
  year: 1900,
  activeNationId: nations[0]?.id,
  nations,
  cities: [],
  armies: [],
  fleets: [],
  relations: [],
  treaties: [],
  tradePolicies: [],
  grants: [],
  map,
  transportNetwork: {
    shippingLanes: [],
    capacity: 0,
  },
  technologyState: {
    advances: {},
    researching: {},
  },
  newsLog: [],
  turnOrder: {
    phases: [
      "diplomacy",
      "trade",
      "production",
      "combat",
      "interceptions",
      "logistics",
    ],
  },
  difficulty: "normal",
});

describe("railroadSystem", () => {
  let state: GameState;

  beforeEach(() => {
    const tiles: Tile[][] = [
      [
        { terrain: TerrainType.Plains, ownerNationId: "1", connected: true },
        { terrain: TerrainType.Plains, ownerNationId: "1", connected: true },
      ],
      [
        { terrain: TerrainType.Plains, ownerNationId: "1", connected: false },
        { terrain: TerrainType.Plains, ownerNationId: "2", connected: true },
      ],
    ];
    const map = mockMap(tiles);
    const nations = [mockNation("1"), mockNation("2")];
    state = mockState(map, nations);
  });

  it("should initialize railroad networks", () => {
    const networks = initializeRailroadNetworks(state.map, state.nations);
    expect(networks).toBeDefined();
    expect(Object.keys(networks!)).toEqual(["1", "2"]);
    expect(networks!["1"].graph["0,0"]).toBeDefined();
    expect(networks!["1"].graph["0,0"].length).toBe(1);
    expect(networks!["1"].graph["1,0"]).toBeDefined();
    expect(networks!["2"].graph["1,1"]).toBeDefined();
  });

  it("should add a railroad and connect to adjacent nodes", () => {
    state.transportNetwork.railroadNetworks = initializeRailroadNetworks(state.map, state.nations);
    const newNode: RailroadNode = { x: 0, y: 1 };
    const newState = addRailroad(state, "1", newNode);
    const networks = newState.transportNetwork.railroadNetworks;
    // (0,1) should connect to (0,0) and (1,0)
    expect(networks!["1"].graph["0,1"]).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ])
    );
    expect(networks!["1"].graph["0,1"].length).toBe(2);
    // (0,0) should now also connect to (0,1)
    expect(networks!["1"].graph["0,0"]).toContainEqual({ x: 0, y: 1 });
  });

});