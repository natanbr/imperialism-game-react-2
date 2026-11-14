// M9 UI half. FR-272 (NR-031): the war screens use Nathan's approved art pack under public/assets/ink-and-wash/. Art ids
// are not game enums, so one table (components/art/inkArt.ts) maps each game regiment type, fort level and army order
// arrow to a file of the pack; every era-1 regiment type and fort levels 1 to 3 map to a file the manifest lists and
// that exists on disk, and the pack's files stay as supplied (the checksums in the manifest). city/city-ground.png is
// not used anywhere in the game's code.
// M10 UI half. FR-298: the Council screen's header picture is the pack's buildings/capitol.png, through the same table.
// M11 (NR-032). FR-318: the table is complete: every terrain, improvement level, warehouse commodity, civilian, worker grade,
// building, the depot and port, the rail piece, the selection and station marks, the ground textures and the cursors map to
// a pack file by game id, and INK_ART_FILES / INK_ART_UNUSED split the manifest. FR-319: its guards, iterating INK_ART_FILES
// (manifest family, size, anchor, file on disk, checksum), enum completeness, no other source naming a pack file, and the
// .gitattributes line that keeps the pack's bytes on a core.autocrlf=true checkout. FR-322 and FR-323's rules (tileArt,
// resourceMarkArt) on the new continent game.
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { REGIMENT_TYPES, newGame } from '@/engine';
import {
  ATTACK_ARROW_ART,
  CAPITOL_ART,
  CURSOR_ART,
  DEPOT_ART,
  FORT_LEVELS,
  GROUND_ART,
  GROUND_ART_PX,
  INK_ART_BASE,
  INK_ART_FILES,
  INK_ART_UNUSED,
  LABOUR_ART,
  PORT_ART,
  RAIL_ART,
  SELECTION_ART,
  STATION_ART,
  STATION_ART_PX,
  artFileOf,
  artInfoOf,
  buildingArt,
  civilianArt,
  fortArt,
  goodsArt,
  gradeArt,
  improvementArt,
  regimentArt,
  resourceMarkArt,
  terrainArt,
  tileArt,
} from '@/components/art/inkArt';
import type { GameState } from '@/types/GameState';
import type { IndustryType, WorkerGrade } from '@/types/Industry';
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';

const ROOT = join(__dirname, '..', '..');
const PACK = join(ROOT, 'public', 'assets', 'ink-and-wash');

interface ManifestEntry {
  id: string;
  family: string;
  file: string;
  width: number;
  height: number;
  /** "bottom-center; 18px transparent bottom margin" or "center". */
  anchor: string;
  sha256: string;
}
const manifest: ManifestEntry[] = JSON.parse(readFileSync(join(PACK, 'manifest.json'), 'utf8'));
const byFile = new Map(manifest.map((e) => [e.file, e]));

/** The pack's file a public URL names ("/assets/ink-and-wash/army/regulars.png" -> "army/regulars.png"). */
const packFile = (url: string): string => {
  expect(url.startsWith(INK_ART_BASE)).toBe(true);
  return url.slice(INK_ART_BASE.length);
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe('FR-272 one table maps the game to the art pack', () => {
  it('FR-272 the pack is served from /assets/ink-and-wash/', () => {
    expect(INK_ART_BASE).toBe('/assets/ink-and-wash/');
  });

  it('FR-272 every era-1 regiment type maps to an army picture the manifest lists and that exists', () => {
    const files = REGIMENT_TYPES.map((type) => packFile(regimentArt(type)));
    for (const file of files) {
      expect(byFile.get(file)?.family, file).toBe('army');
      expect(existsSync(join(PACK, file)), file).toBe(true);
    }
    // The era-1 picture of each type, by name (the Imp1 lines: Light Artillery is horse artillery in era 1)
    expect(Object.fromEntries(REGIMENT_TYPES.map((type) => [type, packFile(regimentArt(type))]))).toEqual({
      minutemen: 'army/militia.png',
      skirmishers: 'army/light-infantry.png',
      regulars: 'army/regulars.png',
      grenadiers: 'army/grenadiers.png',
      hussars: 'army/hussars.png',
      cuirassiers: 'army/cuirassiers.png',
      lightArtillery: 'army/horse-artillery.png',
      artillery: 'army/heavy-artillery.png',
      sappers: 'army/sappers.png',
    });
  });

  it('FR-272 fort levels 1 to 3 map to the fort pictures; level 0 has none', () => {
    expect(FORT_LEVELS).toEqual([1, 2, 3]);
    for (const level of FORT_LEVELS) {
      const file = packFile(fortArt(level)!);
      expect(file).toBe(`infrastructure/fort-${level}.png`);
      expect(byFile.get(file)?.family).toBe('infrastructure');
      expect(existsSync(join(PACK, file))).toBe(true);
    }
    expect(fortArt(0)).toBeUndefined();
    // A level past the pack's last picture shows the strongest fort
    expect(packFile(fortArt(4)!)).toBe('infrastructure/fort-3.png');
  });

  it("FR-273 an attack is the pack's RED attack arrow; its tail and tip are where the file draws them", () => {
    expect(packFile(ATTACK_ARROW_ART.url)).toBe('map-ui/army-attack.svg');
    expect(byFile.get('map-ui/army-attack.svg')?.family).toBe('map-ui');
    const svg = readFileSync(join(PACK, 'map-ui', 'army-attack.svg'), 'utf8');
    expect(svg).toContain(`viewBox="0 0 ${ATTACK_ARROW_ART.width} ${ATTACK_ARROW_ART.height}"`);
    // The arrow's outline: from the tail's top (7 36.3) to the tip (112 9) and back to the tail's bottom (9 51.7)
    const outline = /id="attack-arrow" d="([^"]+)"/.exec(svg)![1];
    expect(outline.startsWith('M7 36.3')).toBe(true);
    expect(outline).toContain('L112 9L');
    expect(outline.endsWith('9 51.7Z')).toBe(true);
    expect(ATTACK_ARROW_ART.tip).toEqual({ x: 112, y: 9 });
    expect(ATTACK_ARROW_ART.tail).toEqual({ x: 8, y: 44 });
  });

  it("FR-273 a march is drawn in the pack's GREEN movement treatment: the tokens are the committed movement arrow's colours, the attack badge the attack arrow's red", () => {
    const tokens = readFileSync(join(ROOT, 'src', 'app', 'styles', 'tokens.css'), 'utf8');
    const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(tokens)?.[1]?.toLowerCase();
    const committed = readFileSync(join(PACK, 'map-ui', 'army-movement-committed.svg'), 'utf8');
    expect(committed).toContain(`fill="${token('color-army-move')}" stroke="${token('color-army-move-ink')}"`);
    const attack = readFileSync(join(PACK, 'map-ui', 'army-attack.svg'), 'utf8');
    expect(attack).toContain(`fill="${token('color-army-attack')}" stroke="${token('color-army-attack-ink')}"`);
  });

  it("FR-298 the Council screen's picture is the pack's capitol (buildings/capitol.png), listed in the manifest and on disk", () => {
    const file = packFile(CAPITOL_ART);
    expect(file).toBe('buildings/capitol.png');
    expect(byFile.get(file)?.family).toBe('buildings');
    expect(existsSync(join(PACK, file))).toBe(true);
  });

  it('FR-272 NR-031 the pack files the game uses are kept as supplied: their checksums match the manifest', () => {
    const used = [...REGIMENT_TYPES.map(regimentArt), ...FORT_LEVELS.map((l) => fortArt(l)!), ATTACK_ARROW_ART.url, CAPITOL_ART].map(packFile);
    for (const file of used) {
      const sha = createHash('sha256').update(readFileSync(join(PACK, file))).digest('hex');
      expect(sha, file).toBe(byFile.get(file)!.sha256);
    }
  });

  it("FR-272 the game's code never uses city/city-ground.png (an earlier study, not a capital ground)", () => {
    const offenders = sourceFiles(join(ROOT, 'src', 'app')).filter((f) => readFileSync(f, 'utf8').includes('city-ground'));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('FR-272 art file paths appear only in the one table: no component names a pack file itself', () => {
    const table = join(ROOT, 'src', 'app', 'components', 'art', 'inkArt.ts');
    const offenders = sourceFiles(join(ROOT, 'src', 'app')).filter((f) => f !== table && /ink-and-wash/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});

/** The manifest file a table URL names, or undefined for "no picture". */
const fileOf = (url: string | undefined): string | undefined => (url === undefined ? undefined : packFile(url));
/** A game id in the pack's spelling: camelCase to kebab-case ("ironOre" -> "iron-ore"). */
const kebab = (id: string) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const COMMODITIES: WarehouseCommodities[] = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];
/** The grades by name; `satisfies` makes the compiler check the list is every WorkerGrade and nothing else. */
const GRADES = Object.keys({ untrained: 0, trained: 0, expert: 0 } satisfies Record<WorkerGrade, 0>) as WorkerGrade[];
/** Every IndustryType (a type union, no runtime list) with the building picture FR-318 (f) names; checked complete by `satisfies`. */
const BUILDINGS = {
  textileMill: 'buildings/textile-mill.png',
  clothingFactory: 'buildings/clothing-factory.png',
  lumberMill: 'buildings/lumber-mill.png',
  furnitureFactory: 'buildings/furniture-factory.png',
  steelMill: 'buildings/steel-mill.png',
  metalWorks: 'buildings/metal-works.png',
  refinery: 'buildings/oil-refinery.png',
  foodProcessing: 'buildings/food-processing.png',
  railyard: 'buildings/railyard.png',
  university: 'buildings/university.png',
  armoury: 'buildings/armory.png',
  shipyard: 'buildings/shipyard.png',
  powerPlant: 'buildings/power-plant.png',
  warehouse: 'buildings/warehouse.png',
  capitol: 'buildings/capitol.png',
  tradeSchool: 'buildings/trade-school.png',
} satisfies Record<IndustryType, string>;
const INDUSTRY = Object.keys(BUILDINGS) as IndustryType[];

/** Every URL any export of the table gives, over every game id and level it takes. */
function everyUrl(): string[] {
  const levels = [0, 1, 2, 3];
  return [
    ...REGIMENT_TYPES.map(regimentArt),
    ...FORT_LEVELS.map((l) => fortArt(l)!),
    CAPITOL_ART,
    ATTACK_ARROW_ART.url,
    ...Object.values(TerrainType).flatMap((t) => [terrainArt(t), ...Object.values(ResourceType).map((r) => terrainArt(t, r))]),
    ...Object.values(ResourceType).flatMap((r) => levels.map((l) => improvementArt(r, l))),
    ...COMMODITIES.map(goodsArt),
    ...Object.values(WorkerType).map(civilianArt),
    ...GRADES.map(gradeArt),
    LABOUR_ART,
    ...INDUSTRY.map(buildingArt),
    DEPOT_ART,
    PORT_ART,
    RAIL_ART.url,
    SELECTION_ART.url,
    STATION_ART.connected,
    STATION_ART.disconnected,
    ...Object.values(GROUND_ART),
    ...Object.values(CURSOR_ART),
  ].filter((url): url is string => url !== undefined);
}

describe('FR-318 the one table, complete (NR-032)', () => {
  it('FR-318 (a) every terrain type maps to its map picture; water, river and coast to none', () => {
    const expected: Record<TerrainType, string | undefined> = {
      dryPlains: 'terrain/dry-plains.png',
      openRange: 'terrain/open-range.png',
      horseRanch: 'terrain/horse-ranch.png',
      plantation: 'terrain/plantation.png',
      farm: 'terrain/farm.png',
      orchard: 'terrain/orchard.png',
      fertileHills: 'terrain/fertile-hills.png',
      barrenHills: 'terrain/barren-hills.png',
      mountains: 'terrain/mountains.png',
      hardwoodForest: 'terrain/hardwood-forest.png',
      scrubForest: 'terrain/scrub-forest.png',
      swamp: 'terrain/swamp.png',
      desert: 'terrain/desert.png',
      tundra: 'terrain/tundra.png',
      water: undefined,
      river: undefined,
      town: 'terrain/town.png',
      capital: 'terrain/capital.png',
      coast: undefined,
    };
    expect(Object.keys(expected).sort()).toEqual(Object.values(TerrainType).sort());
    expect(Object.fromEntries(Object.values(TerrainType).map((t) => [t, fileOf(terrainArt(t))]))).toEqual(expected);
  });

  it('FR-318 (a) Q62 fertile hills show the wool pasture when the tile holds wool, bare hills without a resource', () => {
    expect(fileOf(terrainArt(TerrainType.FertileHills, ResourceType.Wool))).toBe('terrain/wool-pasture.png');
    expect(fileOf(terrainArt(TerrainType.FertileHills))).toBe('terrain/fertile-hills.png');
    // The resource changes no other terrain's picture
    expect(fileOf(terrainArt(TerrainType.Farm, ResourceType.Grain))).toBe('terrain/farm.png');
    expect(terrainArt(TerrainType.Water, ResourceType.Fish)).toBeUndefined();
  });

  it('FR-318 (b) FR-319 improvements: levels 1 to 3 of every improvable resource; none at level 0, for fish or for horses', () => {
    const stems: Record<ResourceType, string | undefined> = {
      grain: 'farm',
      fruit: 'orchard',
      cotton: 'plantation',
      livestock: 'ranch',
      wool: 'wool',
      timber: 'forestry',
      coal: 'mine',
      ironOre: 'mine',
      gold: 'mine',
      gems: 'mine',
      oil: 'oil-well',
      fish: undefined,
      horses: undefined,
    };
    expect(Object.keys(stems).sort()).toEqual(Object.values(ResourceType).sort());
    for (const type of Object.values(ResourceType)) {
      expect(improvementArt(type, 0), `${type} level 0`).toBeUndefined();
      for (const level of [1, 2, 3]) {
        const stem = stems[type];
        expect(fileOf(improvementArt(type, level)), `${type} level ${level}`).toBe(stem ? `improvements/${stem}-${level}.png` : undefined);
      }
    }
    // horse-ranch-1.png is a fenced variant of the horse ranch, not a level (FR-318 (b))
    expect(everyUrl().map(packFile)).not.toContain('improvements/horse-ranch-1.png');
  });

  it("FR-318 (c) every warehouse commodity maps to its goods picture by id, never by the manifest's label", () => {
    expect(COMMODITIES).toHaveLength(23);
    for (const c of COMMODITIES) expect(fileOf(goodsArt(c)), c).toBe(`goods/${kebab(c)}.png`);
    expect(fileOf(goodsArt(ResourceType.IronOre))).toBe('goods/iron-ore.png');
    expect(fileOf(goodsArt(MaterialType.CannedFood))).toBe('goods/canned-food.png');
    // The manifest labels steel.png "Cast Iron / Steel": the game's Steel
    expect(fileOf(goodsArt(MaterialType.Steel))).toBe('goods/steel.png');
    expect(new Set(COMMODITIES.map(goodsArt)).size).toBe(23);
  });

  it('FR-318 (d) every civilian worker type maps to workers/<same id>.png', () => {
    expect(Object.values(WorkerType)).toHaveLength(8);
    for (const type of Object.values(WorkerType)) expect(fileOf(civilianArt(type))).toBe(`workers/${type}.png`);
  });

  it('FR-318 (e) the worker grades untrained, trained and expert and labour map to worker-icons/', () => {
    expect(GRADES).toEqual(['untrained', 'trained', 'expert']);
    expect(GRADES.map((g) => fileOf(gradeArt(g)))).toEqual(['worker-icons/untrained.png', 'worker-icons/trained.png', 'worker-icons/expert.png']);
    expect(fileOf(LABOUR_ART)).toBe('worker-icons/labour.png');
  });

  it('FR-318 (f) every IndustryType maps to its building: refinery the oil refinery, armoury the armory, the rest in kebab-case', () => {
    expect(INDUSTRY).toHaveLength(16);
    expect(Object.fromEntries(INDUSTRY.map((b) => [b, fileOf(buildingArt(b))]))).toEqual(BUILDINGS);
    // The Council screen's capitol (FR-298) is the same picture
    expect(buildingArt('capitol')).toBe(CAPITOL_ART);
  });

  it('FR-318 (g) the depot, the port, the rail piece, the selection mark and the station marks, with their drawn sizes', () => {
    expect(fileOf(DEPOT_ART)).toBe('infrastructure/depot.png');
    expect(fileOf(PORT_ART)).toBe('infrastructure/port.png');
    expect({ ...RAIL_ART, url: packFile(RAIL_ART.url) }).toEqual({ url: 'infrastructure/rail-straight.svg', width: 42, height: 16 });
    expect({ ...SELECTION_ART, url: packFile(SELECTION_ART.url) }).toEqual({ url: 'map-ui/tile-selection.svg', width: 42, height: 42 });
    expect({ connected: packFile(STATION_ART.connected), disconnected: packFile(STATION_ART.disconnected) }).toEqual({
      connected: 'map-ui/station-connected.svg',
      disconnected: 'map-ui/station-disconnected.svg',
    });
    // The sizes the table states are the manifest's
    for (const [url, w, h] of [
      [RAIL_ART.url, RAIL_ART.width, RAIL_ART.height],
      [SELECTION_ART.url, SELECTION_ART.width, SELECTION_ART.height],
      [STATION_ART.connected, STATION_ART_PX, STATION_ART_PX],
      [STATION_ART.disconnected, STATION_ART_PX, STATION_ART_PX],
    ] as const) {
      expect({ width: byFile.get(packFile(url))?.width, height: byFile.get(packFile(url))?.height }, url).toEqual({ width: w, height: h });
    }
  });

  it('FR-318 (h) the ground textures: grass, open water, desert and tundra, 512 px', () => {
    expect(Object.fromEntries(Object.entries(GROUND_ART).map(([k, url]) => [k, packFile(url)]))).toEqual({
      grass: 'terrain/grass-base.png',
      water: 'terrain/open-water.png',
      desert: 'terrain/desert-base.png',
      tundra: 'terrain/tundra-base.png',
    });
    expect(GROUND_ART_PX).toBe(512);
    for (const url of Object.values(GROUND_ART)) expect([byFile.get(packFile(url))?.width, byFile.get(packFile(url))?.height]).toEqual([512, 512]);
  });

  it("FR-318 FR-330 the cursors' pictures: prospector, fort, rail piece, engineer; develop is the developing civilian", () => {
    expect(Object.fromEntries(Object.entries(CURSOR_ART).map(([k, url]) => [k, packFile(url)]))).toEqual({
      prospect: 'workers/prospector.png',
      constructFort: 'infrastructure/fort-1.png',
      constructRail: 'infrastructure/rail-straight.svg',
      constructModal: 'workers/engineer.png',
    });
    expect(CURSOR_ART.constructRail).toBe(RAIL_ART.url);
    expect(CURSOR_ART.constructFort).toBe(fortArt(1));
  });

  it('FR-318 every URL is /assets/ink-and-wash/<manifest file> with no query string; the M9 and M10 entries keep their exact URLs', () => {
    const bad = everyUrl().filter((url) => !url.startsWith(INK_ART_BASE) || /[?#]/.test(url) || !byFile.has(url.slice(INK_ART_BASE.length)));
    expect(bad).toEqual([]);
    expect(regimentArt('regulars')).toBe('/assets/ink-and-wash/army/regulars.png');
    expect(regimentArt('lightArtillery')).toBe('/assets/ink-and-wash/army/horse-artillery.png');
    expect(fortArt(2)).toBe('/assets/ink-and-wash/infrastructure/fort-2.png');
    expect(CAPITOL_ART).toBe('/assets/ink-and-wash/buildings/capitol.png');
    expect(ATTACK_ARROW_ART.url).toBe('/assets/ink-and-wash/map-ui/army-attack.svg');
  });

  it("FR-318 artFileOf gives the manifest file of a table URL (for data-art); artInfoOf its INK_ART_FILES entry", () => {
    expect(artFileOf(goodsArt(MaterialType.Steel))).toBe('goods/steel.png');
    expect(artFileOf(RAIL_ART.url)).toBe('infrastructure/rail-straight.svg');
    expect(artInfoOf(civilianArt(WorkerType.Farmer))).toEqual({ file: 'workers/farmer.png', family: 'workers', width: 256, height: 256, anchor: 'bottom-center' });
    expect(artInfoOf(goodsArt(ResourceType.Coal))).toEqual({ file: 'goods/coal.png', family: 'goods', width: 128, height: 128, anchor: 'center' });
    expect(artInfoOf('/favicon.ico')).toBeUndefined();
  });
});

describe("FR-319 the table's guards", () => {
  /** The manifest's anchor without its note ("bottom-center; 18px transparent bottom margin" -> "bottom-center"). */
  const anchorOf = (e: ManifestEntry) => e.anchor.split(';')[0].trim();

  it('FR-319 every file of INK_ART_FILES is in the manifest with the same family, width, height and anchor, exists and keeps its checksum', () => {
    expect(INK_ART_FILES.length).toBeGreaterThan(100);
    const wrong = INK_ART_FILES.flatMap((f) => {
      const e = byFile.get(f.file);
      if (!e) return [`${f.file}: not in the manifest`];
      const problems: string[] = [];
      if (e.family !== f.family) problems.push(`${f.file}: family ${f.family}, manifest ${e.family}`);
      if (e.width !== f.width || e.height !== f.height) problems.push(`${f.file}: ${f.width}x${f.height}, manifest ${e.width}x${e.height}`);
      if (anchorOf(e) !== f.anchor) problems.push(`${f.file}: anchor ${f.anchor}, manifest ${e.anchor}`);
      const path = join(PACK, f.file);
      if (!existsSync(path)) problems.push(`${f.file}: missing on disk`);
      else if (createHash('sha256').update(readFileSync(path)).digest('hex') !== e.sha256) problems.push(`${f.file}: checksum differs`);
      return problems;
    });
    expect(wrong).toEqual([]);
  });

  it('FR-319 INK_ART_FILES lists each file once, and exactly the files the exports name', () => {
    const files = INK_ART_FILES.map((f) => f.file);
    expect(files.filter((f, i) => files.indexOf(f) !== i)).toEqual([]);
    expect([...new Set(everyUrl().map(packFile))].sort()).toEqual([...files].sort());
  });

  it("FR-319 INK_ART_FILES and INK_ART_UNUSED together are exactly the manifest's files, none in both, each unused one with a reason", () => {
    const used = INK_ART_FILES.map((f) => f.file);
    const unused = INK_ART_UNUSED.map((u) => u.file);
    expect(used.filter((f) => unused.includes(f))).toEqual([]);
    expect(unused.filter((f, i) => unused.indexOf(f) !== i)).toEqual([]);
    expect([...used, ...unused].sort()).toEqual(manifest.map((e) => e.file).sort());
    expect(INK_ART_UNUSED.filter((u) => u.reason.trim().length < 10)).toEqual([]);
    // FR-318's list: the 13 ships, the 16 army pictures no era-1 regiment uses, and ten single files; no worker icon
    const regiments = new Set(REGIMENT_TYPES.map((t) => packFile(regimentArt(t))));
    const expected = [
      ...manifest.filter((e) => e.family === 'navy').map((e) => e.file),
      ...manifest.filter((e) => e.family === 'army' && !regiments.has(e.file)).map((e) => e.file),
      'city/city-ground.png',
      'improvements/horse-ranch-1.png',
      'infrastructure/rail-curve.svg',
      'infrastructure/rail-bridge.svg',
      'map-ui/army-movement-preview.svg',
      'map-ui/army-movement-arrowhead.svg',
      'map-ui/army-transport.svg',
      'map-ui/army-movement-committed.svg',
      'map-ui/territory-line.svg',
      'map-ui/nation-flag.svg',
    ];
    expect(manifest.filter((e) => e.family === 'navy')).toHaveLength(13);
    expect(expected).toHaveLength(13 + 16 + 10);
    expect([...unused].sort()).toEqual(expected.sort());
  });

  it('FR-319 no .ts, .tsx or .css file under src/app but the table names the pack or any of its files (comments included); city-ground nowhere', () => {
    const table = join(ROOT, 'src', 'app', 'components', 'art', 'inkArt.ts');
    const offenders = sourceFiles(join(ROOT, 'src', 'app')).flatMap((f) => {
      const source = readFileSync(f, 'utf8');
      if (source.includes('city-ground')) return [`${relative(ROOT, f)}: city-ground`];
      if (f === table) return [];
      const named = manifest.filter((e) => source.includes(e.file)).map((e) => e.file);
      if (source.includes('ink-and-wash')) named.unshift('ink-and-wash');
      return named.map((n) => `${relative(ROOT, f)}: ${n}`);
    });
    expect(offenders).toEqual([]);
  });

  it('FR-319 .gitattributes keeps the pack byte for byte on a core.autocrlf=true checkout; every manifest file keeps its checksum', () => {
    const attributes = readFileSync(join(ROOT, '.gitattributes'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    expect(attributes).toContain('public/assets/ink-and-wash/** -text');
    // The SVG and JSON files are text a CRLF checkout would change (found 2026-11-14 on map-ui/army-attack.svg)
    const changed = manifest.filter((e) => createHash('sha256').update(readFileSync(join(PACK, e.file))).digest('hex') !== e.sha256).map((e) => e.file);
    expect(changed).toEqual([]);
  });
});

describe("FR-322 FR-323 what the table gives a tile (the map's rules)", () => {
  const continent = newGame({ seed: 1, world: 'continent' });
  const tileOf = (game: GameState, id: string): Tile => game.map.tiles.flat().find((t) => t.id === id)!;

  it('FR-322 a new continent game: the capital 2-9 its terrain picture, the level-1 farm 3-9 farm-1, the hidden coal hills 5-2 barren hills', () => {
    expect(tileOf(continent, '2-9').terrain).toBe(TerrainType.Capital);
    expect(fileOf(tileArt(tileOf(continent, '2-9')))).toBe('terrain/capital.png');
    expect(tileOf(continent, '3-9').resource).toMatchObject({ type: ResourceType.Grain, level: 1 });
    expect(fileOf(tileArt(tileOf(continent, '3-9')))).toBe('improvements/farm-1.png');
    expect(tileOf(continent, '5-2').resource).toMatchObject({ type: ResourceType.Coal, level: 0, discovered: false });
    expect(fileOf(tileArt(tileOf(continent, '5-2')))).toBe('terrain/barren-hills.png');
    // Every land tile has a picture, the sea none
    const tiles = continent.map.tiles.flat();
    const wrong = tiles.filter((t) => (t.terrain === TerrainType.Water ? tileArt(t) !== undefined : tileArt(t) === undefined));
    expect(wrong.map((t) => t.id)).toEqual([]);
  });

  it('FR-322 on hand-built tiles: capital and town keep their picture whatever they hold; level 0 and unimproved resources show the terrain', () => {
    const grain1 = { type: ResourceType.Grain, level: 1 };
    expect(fileOf(tileArt({ terrain: TerrainType.Capital, resource: grain1 }))).toBe('terrain/capital.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Town, resource: grain1 }))).toBe('terrain/town.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Farm, resource: { type: ResourceType.Grain, level: 0 } }))).toBe('terrain/farm.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Farm, resource: { type: ResourceType.Grain, level: 3 } }))).toBe('improvements/farm-3.png');
    expect(fileOf(tileArt({ terrain: TerrainType.BarrenHills, resource: { type: ResourceType.Coal, level: 0, discovered: true } }))).toBe('terrain/barren-hills.png');
    expect(fileOf(tileArt({ terrain: TerrainType.BarrenHills, resource: { type: ResourceType.Coal, level: 2, discovered: true } }))).toBe('improvements/mine-2.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 1, discovered: true } }))).toBe('improvements/oil-well-1.png');
    expect(fileOf(tileArt({ terrain: TerrainType.HorseRanch, resource: { type: ResourceType.Horses, level: 1 } }))).toBe('terrain/horse-ranch.png');
    expect(fileOf(tileArt({ terrain: TerrainType.FertileHills, resource: { type: ResourceType.Wool, level: 0 } }))).toBe('terrain/wool-pasture.png');
    expect(fileOf(tileArt({ terrain: TerrainType.FertileHills, resource: { type: ResourceType.Wool, level: 1 } }))).toBe('improvements/wool-1.png');
    expect(fileOf(tileArt({ terrain: TerrainType.FertileHills }))).toBe('terrain/fertile-hills.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Desert }))).toBe('terrain/desert.png');
    expect(fileOf(tileArt({ terrain: TerrainType.Tundra }))).toBe('terrain/tundra.png');
    expect(tileArt({ terrain: TerrainType.River })).toBeUndefined();
    expect(tileArt({ terrain: TerrainType.Coast })).toBeUndefined();
  });

  it('FR-323 a known coal, iron ore, gold, gems or oil resource gets its goods mark; a hidden one or any other resource none', () => {
    const hills = tileOf(continent, '5-2');
    expect(resourceMarkArt(hills)).toBeUndefined();
    expect(fileOf(resourceMarkArt({ ...hills, resource: { ...hills.resource!, discovered: true } }))).toBe('goods/coal.png');
    for (const type of [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems, ResourceType.Oil]) {
      // discovered left out counts as known (`discovered` is not false)
      expect(fileOf(resourceMarkArt({ resource: { type, level: 0 } })), type).toBe(`goods/${kebab(type)}.png`);
      expect(resourceMarkArt({ resource: { type, level: 1, discovered: false } }), type).toBeUndefined();
    }
    for (const type of [ResourceType.Grain, ResourceType.Fruit, ResourceType.Cotton, ResourceType.Livestock, ResourceType.Wool, ResourceType.Timber, ResourceType.Fish, ResourceType.Horses]) {
      expect(resourceMarkArt({ resource: { type, level: 1 } }), type).toBeUndefined();
    }
    expect(resourceMarkArt({})).toBeUndefined();
  });
});
