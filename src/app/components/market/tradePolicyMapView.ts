import { countryOfTile } from "@/engine/world/countries";
import { TILE_PX } from "@/styles/theme";
import type { GameState } from "@/types/GameState";
import { isLandTerrain } from "../map/shoreline";
import { sidesOf } from "../territoryBorders";

interface Point { x: number; y: number }
interface Land {
  centres: Point[];
  // On a brick grid three tiles meet at each vertex, so each boundary vertex has one outgoing edge per owner.
  next: Map<string, Point>;
}

export interface TradePolicyMap {
  viewBox: string;
  countries: { id: string; d: string; label: Point; marker: Point }[];
}

const keyOf = ({ x, y }: Point) => `${x},${y}`;

function outline(next: Map<string, Point>, project: (p: Point) => Point): string {
  let d = "";
  // Consume each directed edge exactly once. Separate closed rings preserve islands and inland water.
  while (next.size) {
    const start: string = next.keys().next().value!;
    let vertex = start;
    let command = "M";
    do {
      const end = next.get(vertex)!;
      next.delete(vertex);
      vertex = keyOf(end);
      const { x, y } = project(end);
      d += `${command}${+x.toFixed(2)} ${+y.toFixed(2)}`;
      command = "L";
    } while (vertex !== start);
    d += "Z";
  }
  return d;
}

function centreTile(points: Point[]): Point {
  const mean = points.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  mean.x /= points.length;
  mean.y /= points.length;
  const distance = (p: Point) => (p.x - mean.x) ** 2 + (p.y - mean.y) ** 2;
  // The mean can lie in the sea or another country. Both anchors must be inside an owned tile.
  return points.reduce((best, p) => distance(p) < distance(best) ? p : best);
}

function buildView(game: GameState, width: number, height: number): TradePolicyMap {
  const { map } = game;
  const owners = map.tiles.map((row) => row.map((t) => isLandTerrain(t.terrain) ? countryOfTile(game, t) : undefined));
  const lands = new Map<string, Land>();
  const half = TILE_PX / 2;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const row of map.tiles) {
    for (const tile of row) {
      const owner = owners[tile.y][tile.x];
      if (!owner) continue;
      let land = lands.get(owner);
      if (!land) {
        land = { centres: [], next: new Map() };
        lands.set(owner, land);
      }
      const x = tile.x * TILE_PX + (tile.y % 2) * half;
      const y = tile.y * TILE_PX;
      land.centres.push({ x: x + half, y: y + half });
      left = Math.min(left, x);
      right = Math.max(right, x + TILE_PX);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + TILE_PX);
      for (const { x1, y1, x2, y2, neighbour } of sidesOf(map, tile, TILE_PX)) {
        if (neighbour && owners[neighbour.y][neighbour.x] === owner) continue;
        // Trace clockwise: reverse the left and bottom sides as supplied by the main map.
        const reverse = (x1 === x2 && x1 === x) || (y1 === y2 && y1 > y);
        const from = reverse ? { x: x2, y: y2 } : { x: x1, y: y1 };
        const to = reverse ? { x: x1, y: y1 } : { x: x2, y: y2 };
        land.next.set(keyOf(from), to);
      }
    }
  }
  const viewBox = `0 0 ${width} ${height}`;
  if (!lands.size) return { viewBox, countries: [] };
  const scale = Math.min(width / (right - left + 2 * half), height / (bottom - top + 2 * half));
  const project = (p: Point): Point => ({
    x: (p.x - (left + right) / 2) * scale + width / 2,
    y: (p.y - (top + bottom) / 2) * scale + height / 2,
  });
  const countries = Array.from(lands, ([id, land]) => {
    const centre = centreTile(land.centres);
    return {
      id,
      d: outline(land.next, project),
      label: project({ x: centre.x, y: centre.y - TILE_PX / 3 }),
      marker: project({ x: centre.x, y: centre.y + TILE_PX / 3 }),
    };
  });
  return { viewBox, countries };
}

interface CachedMap {
  provinces: GameState["provinces"];
  rows: number;
  cols: number;
  width: number;
  height: number;
  view: TradePolicyMap;
}

const cache = new WeakMap<GameState["map"]["tiles"], CachedMap>();

/** Reuse the same drawing through policy orders. Either the tile map or a province transfer can change ownership. */
export function tradePolicyMapView(game: GameState, width = 1000, height = 640): TradePolicyMap {
  const { tiles, config: { rows, cols } } = game.map;
  const { provinces } = game;
  const previous = cache.get(tiles);
  if (previous && previous.provinces === provinces && previous.rows === rows && previous.cols === cols &&
      previous.width === width && previous.height === height) {
    return previous.view;
  }
  const view = buildView(game, width, height);
  cache.set(tiles, { provinces, rows, cols, width, height, view });
  return view;
}
