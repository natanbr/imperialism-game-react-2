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

/** Every CSS named colour (CSS Color 4), for the palette scan (FR-110). */
const NAMED_COLOURS = (
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood ' +
  'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray ' +
  'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
  'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue ' +
  'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew ' +
  'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
  'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
  'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue ' +
  'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred ' +
  'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
  'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
  'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
  'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
  'whitesmoke yellow yellowgreen'
).split(' ');
/**
 * CSS properties (kebab-case) and React style keys (camelCase) that take a colour; matched without
 * case, so `borderInlineStart` and `border-inline-start` are both found.
 */
const COLOUR_PROPERTY =
  '(?:-?webkit-?)?(?:color|background(?:-?(?:color|image))?|' +
  'border(?:-?(?:top|right|bottom|left|inline|block)(?:-?(?:start|end))?)?(?:-?color)?|outline(?:-?color)?|' +
  'fill|stroke|box-?shadow|text-?shadow|caret-?color|accent-?color|stop-?color|flood-?color|lighting-?color|' +
  'text-?decoration(?:-?color)?|text-?emphasis(?:-?color)?|text-?fill-?color|text-?stroke(?:-?color)?|' +
  'scrollbar-?color|column-?rule(?:-?color)?|(?:backdrop-?)?filter)';
const NAMED = `(?<![\\w-])(?:${NAMED_COLOURS.join('|')})(?![\\w-])`;
const HEX = /#[0-9a-f]{3,8}\b/i;
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const TAILWIND_PREFIX = '(?:bg|text|border|ring|fill|stroke|shadow|outline|from|via|to|divide|accent|caret|decoration)';
const COLOUR_LITERALS: RegExp[] = [
  HEX,
  COLOUR_FUNCTION,
  // A named colour anywhere in the value of a colour property ("border: 1px solid Red", fill="white")
  new RegExp(`(?<![\\w-])${COLOUR_PROPERTY}\\s*[:=]\\s*\\{?[^;\\n]*?${NAMED}`, 'i'),
  // Tailwind colour classes ("bg-white", "text-red-500") and arbitrary values ("text-[red]", "bg-[#fff]")
  /\b(?:bg|text|border|ring|fill|stroke|shadow|outline|from|via|to|divide|accent|caret|decoration)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/,
  new RegExp(`\\b${TAILWIND_PREFIX}-\\[(?:${NAMED}|#|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\()`, 'i'),
];
const hasColourLiteral = (line: string): boolean => COLOUR_LITERALS.some((re) => re.test(line));
/**
 * In a .css file a value can sit on the line after its property, so any named colour, hex or
 * colour function on any line counts (comments are stripped first: they may name colours).
 */
const NAMED_ANYWHERE = new RegExp(NAMED, 'i');
const hasCssColourLiteral = (line: string): boolean =>
  hasColourLiteral(line) || NAMED_ANYWHERE.test(line) || HEX.test(line) || COLOUR_FUNCTION.test(line);
/** A CSS file's lines with comments blanked, so line numbers stay right. */
const cssLines = (source: string): string[] =>
  source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')).split('\n');

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

  it('FR-086 FR-110 no colour literal in components, hooks, page.tsx, layout.tsx or globals.css: they use the tokens', () => {
    const files = [
      ...sourceFiles(join(ROOT, 'src/app/components')),
      ...sourceFiles(join(ROOT, 'src/app/hooks')),
      join(ROOT, 'src/app/globals.css'),
      join(ROOT, 'src/app/page.tsx'),
      join(ROOT, 'src/app/layout.tsx'),
    ];
    const offenders = files
      .flatMap((f) => {
        const source = readFileSync(f, 'utf8');
        const isCss = f.endsWith('.css');
        return (isCss ? cssLines(source) : source.split('\n')).map((line, i) => ({ f, line, i, isCss }));
      })
      .filter(({ line, isCss }) => (isCss ? hasCssColourLiteral(line) : hasColourLiteral(line)))
      .map(({ f, line, i }) => `${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });

  it('FR-110 the scan flags every kind of colour literal it looks for, and not the tokens', () => {
    const flagged = [
      "color: '#fff'",
      'background: rgba(0, 0, 0, 0.5);',
      'color: hsl(10 50% 50%);',
      'color: hwb(10 20% 30%);',
      'color: lab(50% 40 59);',
      'color: lch(52% 72 50);',
      'color: oklab(0.6 0.1 0.1);',
      'fill: oklch(0.6 0.15 30);',
      'stroke: color(display-p3 1 0 0);',
      '<path fill="white" />',
      '<line stroke="crimson" />',
      "boxShadow: '0 0 2px black',",
      'box-shadow: inset 0 0 0 3px tomato;',
      'border: 1px solid rebeccapurple;',
      "borderTop: '1px solid silver',",
      'outline-color: navy;',
      'text-shadow: 0 1px teal;',
      "accentColor: 'gold',",
      '<div className="bg-white text-red-500">',
      '<span className="border-slate-200" />',
      // Found missing in the M4 review: named colours in any case, filters, gradients, logical
      // borders, scrollbars, column rules, WebKit text fill, Tailwind arbitrary values
      "color: 'Red',",
      'border: 1px solid RED;',
      'filter: drop-shadow(0 0 2px black);',
      "filter: 'drop-shadow(0 0 2px Black)',",
      'backdrop-filter: drop-shadow(0 0 1px white);',
      'background-image: linear-gradient(red, white);',
      "backgroundImage: 'linear-gradient(red, white)',",
      'border-inline-start: 2px solid navy;',
      "borderInlineStart: '2px solid navy',",
      'border-block-end-color: teal;',
      "borderBlockStart: '1px solid gray',",
      'scrollbar-color: gray white;',
      "scrollbarColor: 'gray white',",
      'column-rule: 1px solid silver;',
      'column-rule-color: maroon;',
      '-webkit-text-fill-color: white;',
      "WebkitTextFillColor: 'white',",
      '<span className="text-[red]" />',
      '<span className="bg-[#fff] border-[rgb(0,0,0)]" />',
      'color: #ABCDEF;',
      'color: RGB(0 0 0);',
    ];
    // In a .css file the value can be on the line after its property
    const cssFlagged = ['  red;', '    Navy', '  linear-gradient(white, var(--color-sea));', '  #fff;', '  hsl(0 0% 0%);'];
    const clean = [
      'color: var(--color-ink);',
      "boxShadow: 'var(--shadow-dialog)',",
      'stroke={b.color}',
      'fill: none;',
      "background: selected ? THEME.surfaceSunken : 'transparent',",
      'color: currentColor;',
      'transition: box-shadow var(--transition-fast);',
      'grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));',
      '<div className="hud-container btn-plain text-left">',
      'const nationColor = (slot: number) => NATION_COLORS[slot];',
      'color: inherit;',
      'border-inline-start: 2px solid var(--color-line);',
      'filter: drop-shadow(0 0 2px var(--color-ink));',
      'white-space: nowrap;',
      '<span className="text-[14px] text-left" />',
      'const visible = workers.filter((w) => w.nationId === playerId);',
    ];
    const cssClean = [
      ...clean.filter((line) => !line.includes('className') && !line.includes('=>')),
      '  var(--color-x);',
      '  transparent;',
      '  currentColor;',
      '  inherit;',
      '.workerMarker {',
      '  border-inline-start: 1px solid var(--color-line);',
    ];
    expect(flagged.filter((line) => !hasColourLiteral(line))).toEqual([]);
    expect(clean.filter(hasColourLiteral)).toEqual([]);
    expect([...flagged, ...cssFlagged].filter((line) => !hasCssColourLiteral(line))).toEqual([]);
    expect(cssClean.filter(hasCssColourLiteral)).toEqual([]);
    // Comments in .css files are not scanned (they may name colours), and the line numbers stay right
    expect(cssLines('a {\n  /* the red\n of bad */\n  color: red;\n}').map((l) => l.trim())).toEqual(['a {', '', '', 'color: red;', '}']);
  });
});

/** sRGB #rrggbb to CIE Lab (D65), for colour distances. */
function lab(hex: string): [number, number, number] {
  return labOfLinear(linearRgb(hex));
}
function linearRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
}
function labOfLinear([r, g, b]: [number, number, number]): [number, number, number] {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/** CIE76 colour distance: about 2.3 is just noticeable; 25 and more reads as a different colour at a glance. */
const deltaE = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Colour vision deficiency on linear RGB (Machado, Oliveira and Fernandes 2009, severity 1). */
const CVD: Record<string, number[][]> = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const simulate = (hex: string, m: number[][]): [number, number, number] => {
  const c = linearRgb(hex);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return labOfLinear([0, 1, 2].map((i) => clamp(m[i][0] * c[0] + m[i][1] * c[1] + m[i][2] * c[2])) as [number, number, number]);
};

describe('FR-110 (c) the nation colours are told apart', () => {
  const token = (name: string) => valueOf(`var(${name})`);

  it('FR-110 the distance formula gives the known values', () => {
    expect(deltaE(lab('#ffffff'), lab('#000000'))).toBeCloseTo(100, 0);
    expect(deltaE(lab('#a8322d'), lab('#c9483a'))).toBeCloseTo(11.0, 0);
  });

  it('FR-110 nation 1 is at least 25 from the red of "bad" and from nation 2; each nation at least 25 from the accent and good', () => {
    const pairs: [string, string][] = [
      ['--color-nation-1', '--color-bad'],
      ['--color-nation-1', '--color-nation-2'],
      ['--color-nation-1', '--color-accent'],
      ['--color-nation-2', '--color-accent'],
      ['--color-nation-1', '--color-good'],
      ['--color-nation-2', '--color-good'],
    ];
    const close = pairs
      .map(([a, b]) => ({ pair: `${a} vs ${b}`, dE: Math.round(deltaE(lab(token(a)), lab(token(b))) * 10) / 10 }))
      .filter(({ dE }) => dE < 25);
    expect(close).toEqual([]);
  });

  it('FR-110 the two nation colours stay at least 20 apart under simulated deuteranopia and protanopia', () => {
    const apart = Object.entries(CVD).map(([kind, m]) => ({
      kind,
      dE: Math.round(deltaE(simulate(token('--color-nation-1'), m), simulate(token('--color-nation-2'), m)) * 10) / 10,
    }));
    expect(apart.filter(({ dE }) => dE < 20)).toEqual([]);
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

  it('FR-094 FR-110 status, muted and danger text reach 4.5:1 on the panel surfaces', () => {
    const pairs: [string, string][] = [
      ['--color-good', '--color-surface'],
      ['--color-good', '--color-surface-sunken'],
      ['--color-warn', '--color-surface'],
      ['--color-ink-muted', '--color-surface'],
      ['--color-ink-muted', '--color-surface-sunken'],
      ['--color-ink-muted', '--color-surface-raised'],
      // FR-110 (d): refusals in the HUD and dialogs, and the Cancel button
      ['--color-text-danger', '--color-surface'],
      ['--color-text-danger', '--color-surface-sunken'],
      ['--color-text-danger', '--color-surface-raised'],
      ['--color-text-danger', '--color-bg-danger'],
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
