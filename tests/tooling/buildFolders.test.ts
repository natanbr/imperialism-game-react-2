// M12 QA fix round, FR-444: `npm run build` writes the production build into .next; the e2e run's dev server (Playwright's
// webServer, `npm run dev`) wrote its development manifests over it in the same folder, so after the gate `next start`
// failed with "routesManifest.dataRoutes is not iterable" and the QA tracks had no built app to test. The dev server of
// the e2e run builds into a folder of its own, which git and ESLint treat as they treat .next.
// FR-462 (closeout review 2): tsconfig.json listed .next-e2e/types too, so the generated types of the last e2e run (a page
// the dev server saw, removed since) were type-checked by `tsc` and `next build`. The e2e dev server reads a tsconfig of
// its own, tsconfig.e2e.json; tsconfig.json lists only the production build's types.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ts from 'typescript';

const ROOT = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');
/** A tsconfig's JSON, which may hold comments (TypeScript's and Next's own reader both allow them). */
const tsconfigJson = (text: string) => ts.parseConfigFileTextToJson('tsconfig.json', text).config;
const E2E_DIST_DIR = '.next-e2e';
const E2E_TSCONFIG = 'tsconfig.e2e.json';

async function nextConfigWith(distDir: string | undefined) {
  if (distDir === undefined) delete process.env.NEXT_DIST_DIR;
  else process.env.NEXT_DIST_DIR = distDir;
  vi.resetModules();
  return (await import('../../next.config')).default;
}

const savedDistDir = process.env.NEXT_DIST_DIR;
afterEach(() => {
  if (savedDistDir === undefined) delete process.env.NEXT_DIST_DIR;
  else process.env.NEXT_DIST_DIR = savedDistDir;
});

describe('FR-444 the e2e dev server does not write into the production build', () => {
  it('FR-444 Playwright starts its dev server with NEXT_DIST_DIR=.next-e2e', () => {
    const config = read('playwright.config.ts');
    const server = config.slice(config.indexOf('webServer:'));
    expect(server).toMatch(/^webServer:\s*\{/);
    expect(server).toMatch(/env:\s*\{\s*NEXT_DIST_DIR:\s*'\.next-e2e'\s*\}/);
  });

  it('FR-444 next.config builds into NEXT_DIST_DIR when it is set, else into .next (the default)', async () => {
    expect((await nextConfigWith(E2E_DIST_DIR)).distDir).toBe(E2E_DIST_DIR);
    expect((await nextConfigWith(undefined)).distDir ?? '.next').toBe('.next');
  });

  it('FR-444 git and ESLint treat .next-e2e as they treat .next', () => {
    expect(read('.gitignore')).toContain('/.next-e2e/');
    expect(read('eslint.config.mjs')).toContain('".next-e2e/**"');
    // TypeScript's part moved to FR-462: tsconfig.json no longer lists .next-e2e/types (it is tsconfig.e2e.json's)
  });
});

describe('FR-462 the e2e dev server reads a tsconfig of its own', () => {
  /** A scratch project with both tsconfig files, a source file and a generated types file in each build folder. */
  function project(): string {
    const dir = mkdtempSync(join(tmpdir(), 'fr462-'));
    for (const file of ['tsconfig.json', E2E_TSCONFIG]) writeFileSync(join(dir, file), read(file));
    writeFileSync(join(dir, 'next-env.d.ts'), '/// <reference types="next" />\n');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'page.ts'), 'export const page = 1;\n');
    for (const folder of ['.next', E2E_DIST_DIR]) {
      mkdirSync(join(dir, folder, 'types'), { recursive: true });
      writeFileSync(join(dir, folder, 'types', 'validator.ts'), 'export {};\n');
    }
    return dir;
  }
  /** The files `tsc -p <file>` would check, relative to the project and sorted. */
  function filesOf(dir: string, file: string): string[] {
    const parsed = ts.getParsedCommandLineOfConfigFile(join(dir, file), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
    if (!parsed) throw new Error(`cannot parse ${file}`);
    const base = dir.replace(/\\/g, '/');
    return parsed.fileNames.map((f) => f.replace(/\\/g, '/').slice(base.length + 1)).sort();
  }

  it('FR-462 next.config makes the dev server that builds into .next-e2e read tsconfig.e2e.json; next build reads tsconfig.json', async () => {
    expect((await nextConfigWith(E2E_DIST_DIR)).typescript?.tsconfigPath).toBe(E2E_TSCONFIG);
    expect((await nextConfigWith(undefined)).typescript?.tsconfigPath ?? 'tsconfig.json').toBe('tsconfig.json');
  });

  it('FR-462 tsc and next build check the production build\'s types only; tsconfig.e2e.json extends tsconfig.json with .next-e2e\'s types instead', () => {
    const main = tsconfigJson(read('tsconfig.json'));
    expect(main.include.filter((entry: string) => entry.includes(E2E_DIST_DIR))).toEqual([]);
    const e2e = tsconfigJson(read(E2E_TSCONFIG));
    expect(e2e.extends).toBe('./tsconfig.json');
    // The same sources: only the build folder differs
    expect(e2e.include).toEqual(main.include.map((entry: string) => entry.replace(/^\.next\//, `${E2E_DIST_DIR}/`)));

    const dir = project();
    try {
      expect(filesOf(dir, 'tsconfig.json')).toEqual(['.next/types/validator.ts', 'next-env.d.ts', 'src/page.ts']);
      expect(filesOf(dir, E2E_TSCONFIG)).toEqual(['.next-e2e/types/validator.ts', 'next-env.d.ts', 'src/page.ts']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // next dev and next build add their build folder's types to the include list of the tsconfig they read when it is
  // missing (Next's writeConfigurationDefaults): each file lists its own folder, so neither run rewrites either file
  it('FR-462 Next leaves both files as they are: the dev server of the e2e run, and next build', async () => {
    const { writeConfigurationDefaults } = await import('next/dist/lib/typescript/writeConfigurationDefaults.js');
    const dir = project();
    const info = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const after = async (file: string, distDir: string) => {
        await writeConfigurationDefaults(ts, join(dir, file), false, true, distDir, false);
        return readFileSync(join(dir, file), 'utf8');
      };
      expect(await after('tsconfig.json', '.next')).toBe(read('tsconfig.json'));
      expect(await after(E2E_TSCONFIG, E2E_DIST_DIR)).toBe(read(E2E_TSCONFIG));
      // Nor does it say anything about them (it logs each change it makes, and that it cannot add its plugin)
      expect(info).not.toHaveBeenCalled();
      // The check sees a rewrite: a build folder the file does not list is added to it
      expect(tsconfigJson(await after(E2E_TSCONFIG, '.next-other')).include).toContain('.next-other/types/**/*.ts');
    } finally {
      info.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
