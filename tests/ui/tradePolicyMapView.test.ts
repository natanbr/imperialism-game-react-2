// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { tradePolicyMapView } from "@/components/market/tradePolicyMapView";
import { newGame } from "@/engine";
import { TerrainType } from "@/types/Tile";

const startingGame = newGame({ world: "continent", seed: 1 });

/** Each letter owns its tile directly; '~' is sea. */
function world(rows: string[]) {
  const tiles = rows.map((row, y) => [...row].map((letter, x) => ({
    id: `${x}-${y}`, x, y, explored: true, visible: true, workers: [],
    terrain: letter === "~" ? TerrainType.Water : TerrainType.Farm,
    ownerNationId: letter === "~" ? undefined : letter,
  })));
  return {
    ...startingGame,
    map: { config: { ...startingGame.map.config, cols: rows[0].length, rows: rows.length }, tiles },
  };
}

// Read the actual stroked SVG outline. Each closed ring is a coast, an island or a hole.
function rings(d: string) {
  return d.match(/M[^Z]+Z/g)!.map((ring) =>
    Array.from(ring.matchAll(/[ML](-?[\d.]+)[ ,]+(-?[\d.]+)/g), (match) => ({
      x: Number(match[1]), y: Number(match[2]),
    })));
}

describe("FR-579 political map geometry", () => {
  it("joins adjoining tiles with no interior stroke and scales an offset-row island to the given box", () => {
    const { viewBox, countries } = tradePolicyMapView(world(["AA~", "~A~"]), 252, 126);
    expect(viewBox).toBe("0 0 252 126");
    expect(countries.map((c) => c.id)).toEqual(["A"]);
    const outline = rings(countries[0].d);
    expect(outline).toHaveLength(1);
    const xs = outline[0].map((p) => p.x);
    const ys = outline[0].map((p) => p.y);
    // 105×84 of land with 30 view units of sea above and below.
    const scale = 66 / 84;
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([84.75, 167.25, 30, 96]);
    const perimeter = outline[0].reduce((sum, p, i, points) => {
      const next = points[(i + 1) % points.length];
      return sum + Math.hypot(p.x - next.x, p.y - next.y);
    }, 0);
    expect(perimeter).toBe((3 * 4 * 42 - 2 * (42 + 21)) * scale);
  });

  it("keeps a sea hole and an offshore territory and places both anchors on land", () => {
    const { countries } = tradePolicyMapView(world(["AAA~~", "A~A~A", "AAA~~"]), 252, 168);
    const country = countries[0];
    expect(rings(country.d)).toHaveLength(3);
    // Width fits the 231-unit world between 30-unit margins.
    const scale = 192 / 231;
    for (const anchor of [country.label, country.marker]) {
      const x = (anchor.x - 30) / scale;
      const y = (anchor.y - (168 - 126 * scale) / 2) / scale;
      const row = Math.floor(y / 42);
      const col = Math.floor((x - (row % 2) * 21) / 42);
      expect(["AAA~~", "A~A~A", "AAA~~"][row]?.[col]).toBe("A");
    }
    expect(country.label.y).toBeLessThan(country.marker.y);
  });

  it.each([
    ["starting continent", startingGame],
    ["large map with single-tile countries at opposite edges", world([
      "A" + "~".repeat(94) + "B",
      ...Array<string>(62).fill("~".repeat(96)),
      "C" + "~".repeat(94) + "D",
    ])],
  ] as const)("keeps every phone-sized label and marker separated and inside the view on the %s", (_, game) => {
    const { countries } = tradePolicyMapView(game);
    expect(countries.length).toBeGreaterThan(0);
    for (const { id, label, marker } of countries) {
      // Includes the 32-unit lettering/flag and the scaled medallion's stroke.
      const labelHalfHeight = 20;
      const markerRadius = 23;
      expect(marker.y - markerRadius - (label.y + labelHalfHeight), id).toBeGreaterThanOrEqual(3);
      // At 390px wide, 24 view units give the top name about 8px of air.
      expect(label.y - labelHalfHeight, id).toBeGreaterThanOrEqual(24);
      expect(640 - (marker.y + markerRadius), id).toBeGreaterThanOrEqual(24);
      expect(marker.x - markerRadius, id).toBeGreaterThanOrEqual(24);
      expect(1000 - (marker.x + markerRadius), id).toBeGreaterThanOrEqual(24);
    }
  });

  it("reads the current province owner and falls back to tile ownership on the older island world", () => {
    const map = tradePolicyMapView(startingGame);
    expect(new Set(map.countries.map((c) => c.id))).toEqual(new Set([
      ...startingGame.nations, ...startingGame.minorNations,
    ].map((c) => c.id)));
    expect(tradePolicyMapView({ ...startingGame, map: { ...startingGame.map }, turn: 5 })).toBe(map);
    const minorId = startingGame.minorNations[0].id;
    const provinces = startingGame.provinces.map((p) =>
      p.ownerId === minorId ? { ...p, ownerId: startingGame.nations[0].id } : p);
    expect(tradePolicyMapView({ ...startingGame, provinces }).countries.map((c) => c.id)).not.toContain(minorId);
    const resized = tradePolicyMapView(startingGame, 500, 320);
    // Height limits both projections: 260 and 580 units remain between their margins.
    expect(resized.countries[0].marker.x - 250).toBeCloseTo((map.countries[0].marker.x - 500) * 260 / 580);
    const islands = newGame({ world: "two-islands", seed: 1 });
    expect(new Set(tradePolicyMapView(islands).countries.map((c) => c.id))).toEqual(new Set(islands.nations.map((n) => n.id)));
  });

  it("redraws the two-islands map when only tile ownership changes", () => {
    const islands = newGame({ world: "two-islands", seed: 1 });
    const [first, second] = islands.nations;
    const before = tradePolicyMapView(islands);
    const tiles = islands.map.tiles.map((row) => row.map((tile) =>
      tile.ownerNationId === second.id ? { ...tile, ownerNationId: first.id } : tile));
    const after = tradePolicyMapView({ ...islands, map: { ...islands.map, tiles } });
    expect(before.countries).toHaveLength(2);
    expect(after.countries.map(({ id }) => id)).toEqual([first.id]);
    expect(rings(after.countries[0].d)).toHaveLength(2);
  });

  it("leaves coast, river and water blank even with a stale tile owner", () => {
    const game = world(["AAA"]);
    game.map.tiles[0].forEach((t, i) => { t.terrain = [TerrainType.Water, TerrainType.Coast, TerrainType.River][i]; });
    expect(tradePolicyMapView(game, 240, 100)).toEqual({ width: 240, viewBox: "0 0 240 100", countries: [] });
  });
});
