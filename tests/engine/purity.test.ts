import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';
import { addDepot, addPort, addRailroad } from '@/engine/systems/railroadSystem';
import { createTurnContext } from '@/engine/turn/context';
import { TURN_PHASES } from '@/engine/turn/phases';
import { GameState } from '@/types/GameState';
import { deepFreeze, game, setTile, T } from './fixtures';
import { parseTileIdToArray } from '@/utils/tileIdUtils';

const at = (tileId: string) => {
  const [x, y] = parseTileIdToArray(tileId);
  return { x, y };
};

/** A state whose rail network already has a branch, so the helpers must extend existing arrays. */
function withRailNetwork(): GameState {
  return addRailroad(game(), 'nation-1', at(T.farm1));
}

function frozenCopy(state: GameState): { frozen: GameState; snapshot: GameState } {
  const snapshot = structuredClone(state);
  return { frozen: deepFreeze(structuredClone(state)), snapshot };
}

describe('rail network helpers do not mutate their input', () => {
  it.each([
    ['addRailroad', (s: GameState) => addRailroad(s, 'nation-1', at(T.orchard1))],
    ['addDepot', (s: GameState) => addDepot(s, 'nation-1', at(T.dryPlains1))],
    ['addPort', (s: GameState) => addPort(s, 'nation-1', at(T.range1))],
  ])('FR-013 %s leaves a deep-frozen input unchanged', (_name, run) => {
    const { frozen, snapshot } = frozenCopy(withRailNetwork());

    const next = run(frozen);

    expect(frozen).toEqual(snapshot);
    expect(next).not.toBe(frozen);
  });

  it('FR-013 addRailroad still links the new rail into the copy it returns', () => {
    const { frozen } = frozenCopy(withRailNetwork());

    const next = addRailroad(frozen, 'nation-1', at(T.orchard1));

    const graph = next.transportNetwork.railroadNetworks!['nation-1'].graph;
    expect(graph['3,1']).toContainEqual({ x: 2, y: 1 });
    expect(graph['2,1']).toContainEqual({ x: 3, y: 1 });
    expect(frozen.transportNetwork.railroadNetworks!['nation-1'].graph['2,1']).not.toContainEqual({ x: 3, y: 1 });
  });
});

describe('turn systems do not mutate their input', () => {
  it('FR-012 FR-013 every phase system takes (state, ctx) and leaves a deep-frozen input unchanged', () => {
    // Rail, depot and port jobs that finish this turn exercise the network helpers inside developmentSystem.
    let state = withRailNetwork();
    state = setTile(state, T.orchard1, { constructionJob: { workerId: 'x', kind: 'rail', startedOnTurn: 0, durationTurns: 1 } });
    state = setTile(state, T.dryPlains1, { constructionJob: { workerId: 'y', kind: 'depot', startedOnTurn: 0, durationTurns: 1 } });
    state = setTile(state, T.coastFarm1, { constructionJob: { workerId: 'z', kind: 'port', startedOnTurn: 0, durationTurns: 1 } });
    const { frozen, snapshot } = frozenCopy(state);
    const ctx = createTurnContext({ turn: frozen.turn, seed: frozen.seed });

    let s = frozen;
    for (const system of TURN_PHASES) {
      expect(system.length).toBeLessThanOrEqual(2);
      s = system(s, ctx);
    }

    expect(frozen).toEqual(snapshot);
    expect(s.transportNetwork.railroadNetworks!['nation-1'].depots).toContainEqual(expect.objectContaining({ x: 2, y: 2 }));
  });
});

describe('FR-150 only the development and price draws read ctx.rng', () => {
  const root = join(process.cwd(), 'src/app/engine');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
    });
  /**
   * A read of the shared stream whatever the context is called (review R2, E4): the property on any
   * receiver (`ctx.rng`, `context.rng`, `c?.rng`; not `rngFor`), the bracket form (`ctx['rng']`), or `rng`
   * in a destructuring pattern (`{ rng } = ctx`, `({ rng }: TurnContext)`, `(s, { rng }) =>`).
   */
  const READS_SHARED_RNG = [/\.\s*rng\b/, /\[\s*(['"`])rng\1\s*\]/, /\{[^{}]*\brng\b[^{}]*\}\s*(?:=(?![=>])|:|\)\s*=>)/];
  const readsSharedRng = (src: string) => READS_SHARED_RNG.some(re => re.test(src));
  /** The source without its comments, so a doc comment that names ctx.rng is not a read. */
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  /** The two readers, and the context that builds the stream (`opts.rng`, the pre-M1 override). */
  const ALLOWED = ['systems/developmentSystem.ts', 'systems/tradeSystem.ts', 'turn/context.ts'];

  it('FR-150 a scan of src/app/engine finds the shared stream read in developmentSystem.ts and tradeSystem.ts only (and built in turn/context.ts)', () => {
    const readers = files(root)
      .filter(path => readsSharedRng(code(readFileSync(path, 'utf8'))))
      .map(path => relative(root, path).split(sep).join('/'))
      .sort();
    expect(readers).toEqual(ALLOWED);
  });

  it('FR-150 the scan sees every form of a read, whatever the context is called, and not rngFor, a passed stream or a comment', () => {
    const reads = [
      'const x = ctx.rng.next();',
      'const { nextTurn, rng } = ctx;',
      'const v = context.rng.next();',
      'function run(s: GameState, c: TurnContext) { return c.rng.next(); }',
      'const r = ctx?.rng;',
      "const r = ctx['rng'];",
      'const { rng: shared } = context;',
      'export const sys = (state: GameState, { rng }: TurnContext) => state;',
      'export const sys: TurnSystem = (state, { rng }) => state;',
    ];
    const notReads = [
      'ctx.rngFor("combat").next()',
      'const { rngFor } = ctx;',
      'nextPrices(prices, sold, bought, rng)',
      'function drift(prices: Prices, rng: Rng) { return rng.next(); }',
      '// reads ctx.rng',
      '/** the `ctx.rng` stream */',
    ];
    expect(reads.map(src => readsSharedRng(code(src)))).toEqual(reads.map(() => true));
    expect(notReads.map(src => readsSharedRng(code(src)))).toEqual(notReads.map(() => false));
  });
});

describe('M10 the Council code is headless, draws nothing and is not read by the scripted player', () => {
  const app = join(process.cwd(), 'src/app');
  const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const COUNCIL_FILES = ['engine/council/council.ts', 'definisions/council.ts', 'types/Council.ts'];

  it('FR-296 the council code imports no React, store or DOM and never reads a random stream (no ctx.rng, no rngFor)', () => {
    for (const file of COUNCIL_FILES) {
      const src = code(readFileSync(join(app, file), 'utf8'));
      const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]);
      expect(imports.filter(i => /react|zustand|store|components|^next/.test(i)), file).toEqual([]);
      expect(/\b(window|document)\./.test(src), file).toBe(false);
      expect(/rng/i.test(src), file).toBe(false);
    }
  });

  /**
   * The engine files a file loads at run time, followed through every `import ... from` and `export ... from` that is
   * not `import type` / `export type` (types are erased), for the paths inside src/app (`@/...` and relative ones).
   */
  function runtimeImports(entry: string): Set<string> {
    const seen = new Set<string>();
    const resolveFile = (from: string, spec: string): string | undefined => {
      const base = spec.startsWith('@/') ? join(app, spec.slice(2)) : spec.startsWith('.') ? join(from, '..', spec) : undefined;
      if (!base) return undefined;
      for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
        try {
          if (statSync(candidate).isFile()) return candidate;
        } catch {
          // not this one
        }
      }
      return undefined;
    };
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const src = code(readFileSync(file, 'utf8'));
      // the clause: `X`, `{ a, type B }`, `* as N`, `*`, `X, { a }`
      const statement = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?(\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s*from\s+["']([^"']+)["']/g;
      for (const m of src.matchAll(statement)) {
        if (m[2]) continue;
        const next = resolveFile(file, m[4]);
        if (next) visit(next);
      }
    };
    visit(entry);
    return seen;
  }
  const rel = (path: string) => relative(app, path).split(sep).join('/');
  const reachesCouncil = (entry: string) => [...runtimeImports(join(app, entry))].map(rel).filter(f => f === 'engine/council/council.ts' || f === 'definisions/council.ts');

  it('FR-302 no file of engine/ai loads the council code, directly or through another file', () => {
    const aiFiles = readdirSync(join(app, 'engine/ai')).filter(f => f.endsWith('.ts')).map(f => `engine/ai/${f}`);
    expect(aiFiles.length).toBeGreaterThanOrEqual(8);
    expect(aiFiles.map(f => [f, reachesCouncil(f)])).toEqual(aiFiles.map(f => [f, []]));
  });

  it('FR-302 the scan sees the council code where it is loaded: resolveTurn and the public API reach it', () => {
    expect(reachesCouncil('engine/turn/resolveTurn.ts').sort()).toEqual(['definisions/council.ts', 'engine/council/council.ts']);
    expect(reachesCouncil('engine/index.ts').sort()).toEqual(['definisions/council.ts', 'engine/council/council.ts']);
  });
});
