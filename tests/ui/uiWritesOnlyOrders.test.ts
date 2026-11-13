// FR-022: components and hooks change the game only by submitting orders. A source scan, so a
// new component that writes the store or calls the engine's apply or resolve functions fails here.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');
const UI_DIRS = ['src/app/components', 'src/app/hooks'];
const UI_FILES = ['src/app/page.tsx'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const files = [...UI_DIRS.flatMap((d) => sourceFiles(join(ROOT, d))), ...UI_FILES.map((f) => join(ROOT, f))];

describe('FR-022 the UI changes the game only through submitOrder', () => {
  it('scans the UI sources', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no component or hook writes the store state directly', () => {
    const offenders = files.filter((f) => /\.setState\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("no component or hook calls the engine's apply or resolve functions", () => {
    const offenders = files.filter((f) => /\b(applyOrder|tryApplyOrder|resolveTurn|applyTurnOrders|runTurnPhases)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('FR-178 FR-175 the diplomacy screens are scanned and send every order they build through submitOrder', () => {
    const screens = ['src/app/components/DiplomacyModal.tsx', 'src/app/components/diplomacy/CountryCard.tsx', 'src/app/components/AcceptOfferModal.tsx'];
    const scanned = files.map((f) => relative(ROOT, f).replace(/\\/g, '/'));
    expect(screens.filter((f) => !scanned.includes(f))).toEqual([]);
    // The two that send orders (the dialog hands submitOrder to its cards) call submitOrder; none reaches the game
    // another way (the checks above cover setState and the engine's apply and resolve functions)
    const senders = ['src/app/components/diplomacy/CountryCard.tsx', 'src/app/components/AcceptOfferModal.tsx'];
    const silent = senders.filter((f) => !/\bsubmitOrder\(/.test(readFileSync(join(ROOT, f), 'utf8')));
    expect(silent).toEqual([]);
  });

  it('the UI uses no pre-M1 worker action of the store', () => {
    const old = /\b(moveSelectedWorkerToTile|moveAndStartProspecting|moveAndStartDevelopment|moveAndStartConstruction|purchaseTransportCapacityIncrease|setTransportAllocations|cancelAction)\s*\(/;
    const offenders = files.filter((f) => old.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
