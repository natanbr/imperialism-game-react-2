// M12 QA fix round, FR-444: `npm run build` writes the production build into .next; the e2e run's dev server (Playwright's
// webServer, `npm run dev`) wrote its development manifests over it in the same folder, so after the gate `next start`
// failed with "routesManifest.dataRoutes is not iterable" and the QA tracks had no built app to test. The dev server of
// the e2e run builds into a folder of its own, which git, ESLint and TypeScript treat as they treat .next.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');
const E2E_DIST_DIR = '.next-e2e';

async function nextConfigWith(distDir: string | undefined) {
  if (distDir === undefined) delete process.env.NEXT_DIST_DIR;
  else process.env.NEXT_DIST_DIR = distDir;
  vi.resetModules();
  return (await import('../../next.config')).default;
}

describe('FR-444 the e2e dev server does not write into the production build', () => {
  const saved = process.env.NEXT_DIST_DIR;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_DIST_DIR;
    else process.env.NEXT_DIST_DIR = saved;
  });

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

  it('FR-444 git, ESLint and TypeScript treat .next-e2e as they treat .next', () => {
    expect(read('.gitignore')).toContain('/.next-e2e/');
    expect(read('eslint.config.mjs')).toContain('".next-e2e/**"');
    // next dev adds its folder's types to tsconfig's include when they are missing: listed here, it leaves the file alone
    expect(JSON.parse(read('tsconfig.json')).include).toContain('.next-e2e/types/**/*.ts');
  });
});
