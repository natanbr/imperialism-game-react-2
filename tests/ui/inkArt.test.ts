// M9 UI half. FR-272 (NR-031): the war screens use Nathan's approved art pack under public/assets/ink-and-wash/. Art ids
// are not game enums, so one table (components/art/inkArt.ts) maps each game regiment type, fort level and army order
// arrow to a file of the pack; every era-1 regiment type and fort levels 1 to 3 map to a file the manifest lists and
// that exists on disk, and the pack's files stay as supplied (the checksums in the manifest). city/city-ground.png is
// not used anywhere in the game's code.
// M10 UI half. FR-298: the Council screen's header picture is the pack's buildings/capitol.png, through the same table.
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { REGIMENT_TYPES } from '@/engine';
import { ATTACK_ARROW_ART, CAPITOL_ART, FORT_LEVELS, INK_ART_BASE, fortArt, regimentArt } from '@/components/art/inkArt';

const ROOT = join(__dirname, '..', '..');
const PACK = join(ROOT, 'public', 'assets', 'ink-and-wash');

interface ManifestEntry {
  id: string;
  family: string;
  file: string;
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
