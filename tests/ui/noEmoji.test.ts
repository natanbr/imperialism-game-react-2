// M11 (NR-032). FR-330: no source file under src/app contains an emoji (Unicode Extended_Pictographic): the map's cursors
// were the last ones (useTileVisuals.ts drew 🔍 🚜 🛤️ 🏰 🏗️), now drawn from the art pack. A text scan, comments included.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');
const EMOJI = /\p{Extended_Pictographic}/u;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe('FR-330 no emoji in the source', () => {
  it('FR-330 the scan flags emoji and not the typographic signs the UI writes', () => {
    expect(['🔍', '🚜', '🛤️', '🏰', '🏗️', '⚔', '★'].filter((s) => !EMOJI.test(s))).toEqual([]);
    expect(['×', '−', '–', '…', '·', '→', 'é', 'ΔE'].filter((s) => EMOJI.test(s))).toEqual([]);
  });

  it('FR-330 no .ts, .tsx or .css file under src/app contains one', () => {
    const files = sourceFiles(join(ROOT, 'src/app'));
    expect(files.length).toBeGreaterThan(100);
    const offenders = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${relative(ROOT, f)}:${i + 1}` }))
        .filter(({ line }) => EMOJI.test(line))
        .map(({ line, at }) => `${at}: ${line.trim()}`)
    );
    expect(offenders).toEqual([]);
  });
});
