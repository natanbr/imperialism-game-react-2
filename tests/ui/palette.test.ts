// FR-086 (NR-009): the colours are defined once, as CSS variables in styles/tokens.css, and the map,
// HUD and dialogs use only those. FR-088: 42 px tiles, so the whole 24x16 map fits 1280x720 next to
// the HUD. A source scan plus the palette's own numbers.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { HUD_PX, NATION_COLORS, TERRAIN_TINT, THEME, TILE_PX, themeVariables } from '@/styles/theme';
import { mapAreaOf, mapSizePx } from '@/components/camera';
import { TerrainType } from '@/types/Tile';

const ROOT = join(__dirname, '..', '..');
const TOKENS = readFileSync(join(ROOT, 'src/app/styles/tokens.css'), 'utf8');
const defined = new Map([...TOKENS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

/**
 * HSL of a #rrggbb colour: hue in degrees, saturation and lightness 0 to 1, plus chroma (max - min
 * channel, 0 to 1). Chroma says how much colour there is: pastels near white have a high HSL
 * saturation but little chroma, so "faint" is light with low chroma.
 */
function hsl(hex: string): { h: number; s: number; l: number; c: number } {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s, l, c: d };
}
/** The value of `var(--x)` in tokens.css, following var() chains (`--terrain-water: var(--color-sea)`). */
const valueOf = (cssVar: string): string => {
  const name = /^var\((--[\w-]+)\)$/.exec(cssVar)?.[1];
  if (!name) return cssVar;
  const value = defined.get(name);
  if (value === undefined) throw new Error(`undefined ${name}`);
  return valueOf(value);
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe('FR-086 the palette is defined once in styles/tokens.css', () => {
  it('FR-086 every variable styles/theme.ts names is defined in tokens.css', () => {
    const missing = themeVariables().filter((name) => !defined.has(name));
    expect(themeVariables().length).toBeGreaterThan(20);
    expect(missing).toEqual([]);
  });

  it('FR-086 every terrain has a tint, and every tint is faint: light and low in colour', () => {
    expect(Object.keys(TERRAIN_TINT).sort()).toEqual(Object.values(TerrainType).sort());
    const loud = Object.entries(TERRAIN_TINT).filter(([, v]) => {
      const { c, l } = hsl(valueOf(v));
      return l < 0.8 || c > 0.2;
    });
    expect(loud).toEqual([]);
  });

  it('FR-086 parchment land, pale blue sea, dark grey ink, strong nation colours, one accent', () => {
    const land = hsl(valueOf(THEME.land));
    expect(land.l).toBeGreaterThan(0.85);
    expect(land.h).toBeGreaterThan(30);
    expect(land.h).toBeLessThan(60);
    const sea = hsl(valueOf(THEME.sea));
    expect(sea.l).toBeGreaterThan(0.8);
    expect(sea.h).toBeGreaterThan(180);
    expect(sea.h).toBeLessThan(230);
    const ink = hsl(valueOf(THEME.ink));
    expect(ink.l).toBeLessThan(0.3);
    expect(ink.s).toBeLessThan(0.15);
    expect(NATION_COLORS.length).toBeGreaterThanOrEqual(2);
    for (const nation of NATION_COLORS) {
      const { c, l } = hsl(valueOf(nation));
      expect(l).toBeLessThan(0.55);
      expect(c).toBeGreaterThan(0.35);
    }
    const accent = hsl(valueOf(THEME.accent));
    expect(accent.c).toBeGreaterThan(0.3);
    expect(accent.l).toBeLessThan(0.5);
    // The accent is not a nation's colour, so the selection never reads as ownership (FR-087)
    expect(NATION_COLORS.map(valueOf)).not.toContain(valueOf(THEME.accent));
  });

  it('FR-086 no colour literal in components, hooks or globals.css: they use the tokens', () => {
    const files = [
      ...sourceFiles(join(ROOT, 'src/app/components')),
      ...sourceFiles(join(ROOT, 'src/app/hooks')),
      join(ROOT, 'src/app/globals.css'),
      join(ROOT, 'src/app/page.tsx'),
    ];
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?:color|background|border(?:Color)?)\s*[:=]\s*["']?(?:red|green|yellow|blue|white|black|gr[ae]y)\b/;
    const offenders = files
      .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => ({ f, line, i })))
      .filter(({ line }) => literal.test(line))
      .map(({ f, line, i }) => `${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});

/** WCAG 2.2 contrast ratio of two #rrggbb colours: (L1 + 0.05) / (L2 + 0.05), L the relative luminance. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
    const [r, g, b] = m.slice(1).map((v) => {
      const c = parseInt(v, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('FR-094 text contrast: WCAG AA 4.5:1 for normal text', () => {
  it('FR-094 the contrast formula gives the known ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('FR-094 status and muted text reach 4.5:1 on the panel surfaces', () => {
    const pairs: [string, string][] = [
      ['--color-good', '--color-surface'],
      ['--color-good', '--color-surface-sunken'],
      ['--color-warn', '--color-surface'],
      ['--color-ink-muted', '--color-surface'],
      ['--color-ink-muted', '--color-surface-sunken'],
      ['--color-ink-muted', '--color-surface-raised'],
    ];
    const low = pairs
      .map(([text, bg]) => ({ pair: `${text} on ${bg}`, ratio: Math.round(contrast(valueOf(`var(${text})`), valueOf(`var(${bg})`)) * 100) / 100 }))
      .filter(({ ratio }) => ratio < 4.5);
    expect(low).toEqual([]);
  });
});

describe('FR-088 tile size: the whole map fits 1280x720 next to the HUD', () => {
  it('FR-088 tiles are 42 px in theme.ts and tokens.css; the HUD width agrees too', () => {
    expect(TILE_PX).toBe(42);
    expect(defined.get('--tile-width')).toBe(`${TILE_PX}px`);
    expect(defined.get('--tile-height')).toBe(`${TILE_PX}px`);
    expect(defined.get('--hud-width')).toBe(`${HUD_PX}px`);
  });

  it('FR-088 the 24x16 map is 1,029 x 672 px and fits the 1030 x 720 map area of a 1280x720 screen', () => {
    const map = mapSizePx({ cols: 24, rows: 16 });
    expect(map).toEqual({ width: 1029, height: 672 });
    const area = mapAreaOf({ innerWidth: 1280, innerHeight: 720 });
    expect(map.width).toBeLessThanOrEqual(area.width);
    expect(map.height).toBeLessThanOrEqual(area.height);
  });
});
