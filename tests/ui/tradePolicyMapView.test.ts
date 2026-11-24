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
    // 105x84 of land, half a 42px tile of sea on each side. Height limits the scale to exactly 1.
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([73.5, 178.5, 21, 105]);
    const perimeter = outline[0].reduce((sum, p, i, points) => {
      const next = points[(i + 1) % points.length];
      return sum + Math.hypot(p.x - next.x, p.y - next.y);
    }, 0);
    expect(perimeter).toBe(3 * 4 * 42 - 2 * (42 + 21));
  });

  it("keeps a sea hole and an offshore territory and places both anchors on land", () => {
    const { countries } = tradePolicyMapView(world(["AAA~~", "A~A~A", "AAA~~"]), 252, 168);
    const country = countries[0];
    expect(rings(country.d)).toHaveLength(3);
    // Width limits the 273x168 padded bounds. Convert anchors back to main-map tile coordinates.
    const scale = 252 / 273;
    for (const anchor of [country.label, country.marker]) {
      const x = anchor.x / scale - 21;
      const y = (anchor.y - (168 - 126 * scale) / 2) / scale;
      const row = Math.floor(y / 42);
      const col = Math.floor((x - (row % 2) * 21) / 42);
      expect(["AAA~~", "A~A~A", "AAA~~"][row]?.[col]).toBe("A");
    }
    expect(country.label.y).toBeLessThan(country.marker.y);
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
    expect(resized.countries[0].marker.x).toBeCloseTo(map.countries[0].marker.x / 2);
    const islands = newGame({ world: "two-islands", seed: 1 });
    expect(new Set(tradePolicyMapView(islands).countries.map((c) => c.id))).toEqual(new Set(islands.nations.map((n) => n.id)));
  });

  it("leaves coast, river and water blank even with a stale tile owner", () => {
    const game = world(["AAA"]);
    game.map.tiles[0].forEach((t, i) => { t.terrain = [TerrainType.Water, TerrainType.Coast, TerrainType.River][i]; });
    expect(tradePolicyMapView(game, 240, 100)).toEqual({ viewBox: "0 0 240 100", countries: [] });
  });
});
