// @vitest-environment jsdom
// FR-236 (M6 QA fix round, item 1): every game dialog is built on one shared component (components/Modal.tsx) and
// behaves as a modal dialog: role "dialog", aria-modal, named by its visible title (aria-labelledby); the focus moves
// into it on open and back to the button that opened it on close; Tab and Shift+Tab stay inside; Escape closes it;
// a click on the backdrop outside it closes it. Only the top dialog of a stack answers. Accept Offer: the dialog
// itself takes the focus and Escape rejects (FR-175). Game over has no close: Escape and the backdrop do nothing.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { WarehouseModal } from '@/components/WarehouseModal';
import { CapitalModal } from '@/components/CapitalModal';
import { MarketModal } from '@/components/MarketModal';
import { DiplomacyModal } from '@/components/DiplomacyModal';
import { AcceptOfferModal } from '@/components/AcceptOfferModal';
import { GameOverModal } from '@/components/GameOverModal';
import { ConstructionOptionsModal } from '@/components/ConstructionOptionsModal';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { useGameStore } from '@/store/rootStore';
import { newGame, proposalAnswer, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const N1 = 'nation-1';
const N2 = 'nation-2';

let submitted: Order[] = [];

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
}

/** The page's HUD and dialogs as page.tsx mounts them, without the map. */
const Dialogs: React.FC = () => {
  const isTransportOpen = useGameStore((s) => s.isTransportAllocationOpen);
  const closeTransport = useGameStore((s) => s.closeTransportAllocation);
  return (
    <>
      <HUD />
      <WarehouseModal />
      <CapitalModal />
      <MarketModal />
      <DiplomacyModal />
      <ConstructionOptionsModal />
      <GameOverModal />
      <AcceptOfferModal />
      {isTransportOpen && <TransportAllocationModal capacity={4} onClose={closeTransport} />}
    </>
  );
};

const start = (): GameState => newGame({ seed: 1, world: 'continent' });
const focused = () => document.activeElement as HTMLElement;
const press = (key: string, shiftKey = false) => fireEvent.keyDown(focused(), { key, shiftKey });
/** A click that starts and ends on the element, as the browser sends it. */
const clickOn = (el: HTMLElement) => {
  fireEvent.mouseDown(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
};
/** The backdrop is the element right around the dialog. */
const backdropOf = (dialog: HTMLElement) => dialog.parentElement!;

/** Clicks the button the way a player does: it takes the focus, then it is clicked. */
function openWith(button: HTMLElement) {
  act(() => button.focus());
  fireEvent.click(button);
}

/** Tab from the first control until the focus comes back to it: the controls in Tab order (at most 200 presses). */
function tabCycle(dialog: HTMLElement): HTMLElement[] {
  const first = focused();
  const seen: HTMLElement[] = [first];
  for (let i = 0; i < 200; i++) {
    press('Tab');
    expect(dialog.contains(focused()), `Tab ${i + 1} left the dialog for ${focused().outerHTML.slice(0, 80)}`).toBe(true);
    if (focused() === first) return seen;
    seen.push(focused());
  }
  throw new Error('Tab never came back to the first control');
}

const HUD_DIALOGS: { name: string; opener: RegExp; close: string }[] = [
  { name: 'Diplomacy — Testland', opener: /^Diplomacy$/, close: 'Close diplomacy' },
  { name: 'Warehouse — Testland', opener: /Open Warehouse/, close: 'Close warehouse' },
  { name: 'Capital — Testland', opener: /Open Capital/, close: 'Close capital' },
  { name: 'World market — Testland', opener: /Open Market/, close: 'Close market' },
  { name: 'Transportation of Commodities', opener: /Transportation of Commodities/, close: 'Close transport' },
  { name: 'About', opener: /^About$/, close: 'Close about' },
];

describe('FR-236 every dialog is a modal dialog', () => {
  it.each(HUD_DIALOGS)('FR-236 $name: role dialog, aria-modal, named by its visible title', ({ name, opener }) => {
    show(start());
    render(<Dialogs />);
    openWith(screen.getByRole('button', { name: opener }));

    const dialog = screen.getByRole('dialog', { name });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-label')).toBe(false);
    const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
    expect(title && dialog.contains(title)).toBe(true);
    expect(text(title!)).toBe(name);
  });

  it.each(HUD_DIALOGS)('FR-236 $name: the focus moves to its first control on open and back to the opener on close', ({ name, opener, close }) => {
    show(start());
    render(<Dialogs />);
    const button = screen.getByRole('button', { name: opener });
    openWith(button);

    const dialog = screen.getByRole('dialog', { name });
    const controls = tabCycle(dialog);
    expect(controls[0]).toBe(focused());
    // The first control in the page order of the dialog
    const firstInOrder = [...dialog.querySelectorAll<HTMLElement>('button, select, input, a[href]')].find((el) => !(el as HTMLButtonElement).disabled);
    expect(focused()).toBe(firstInOrder);

    fireEvent.click(within(dialog).getByRole('button', { name: close }));
    expect(screen.queryByRole('dialog', { name })).toBeNull();
    expect(focused()).toBe(button);
  });

  it.each(HUD_DIALOGS)('FR-236 $name: Tab and Shift+Tab stay inside, from the last control to the first and back', ({ name, opener }) => {
    show(start());
    render(<Dialogs />);
    openWith(screen.getByRole('button', { name: opener }));
    const dialog = screen.getByRole('dialog', { name });

    const controls = tabCycle(dialog);
    // Tab visits every control of the dialog that takes the focus, in page order (jsdom moves no focus on its own)
    const enabled = [...dialog.querySelectorAll<HTMLElement>('button, select, input, a[href], [tabindex]')].filter(
      (el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0
    );
    expect(enabled.length).toBeGreaterThan(0);
    expect(controls).toEqual(enabled);
    // Back from the first control: the last one
    press('Tab', true);
    expect(focused()).toBe(controls[controls.length - 1]);
    press('Tab');
    expect(focused()).toBe(controls[0]);
  });

  it.each(HUD_DIALOGS)('FR-236 $name: Escape closes it and the focus goes back to the opener', ({ name, opener }) => {
    show(start());
    render(<Dialogs />);
    const button = screen.getByRole('button', { name: opener });
    openWith(button);
    expect(screen.getByRole('dialog', { name })).toBeTruthy();

    press('Escape');
    expect(screen.queryByRole('dialog', { name })).toBeNull();
    expect(focused()).toBe(button);
  });

  it.each(HUD_DIALOGS)('FR-236 $name: a click on the backdrop closes it; a click inside, or a drag that ends outside, does not', ({ name, opener }) => {
    show(start());
    render(<Dialogs />);
    const button = screen.getByRole('button', { name: opener });
    openWith(button);
    const dialog = screen.getByRole('dialog', { name });

    clickOn(dialog);
    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(backdropOf(dialog));
    fireEvent.click(backdropOf(dialog));
    expect(screen.getByRole('dialog', { name })).toBe(dialog);

    clickOn(backdropOf(dialog));
    expect(screen.queryByRole('dialog', { name })).toBeNull();
    expect(focused()).toBe(button);
  });

  it('FR-236 Construction Options: a modal dialog named by its title; Escape and the backdrop close it', () => {
    const opened = { isConstructionModalOpen: true, constructionModalTileId: '2-9', constructionModalWorkerId: 'worker-nation-1-7' };
    show(start(), opened);
    const { unmount } = render(<ConstructionOptionsModal />);
    let dialog = screen.getByRole('dialog', { name: 'Construction Options' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(focused())).toBe(true);
    press('Escape');
    expect(useGameStore.getState().isConstructionModalOpen).toBe(false);
    unmount();

    show(start(), opened);
    render(<ConstructionOptionsModal />);
    dialog = screen.getByRole('dialog', { name: 'Construction Options' });
    clickOn(backdropOf(dialog));
    expect(useGameStore.getState().isConstructionModalOpen).toBe(false);
    expect(submitted).toEqual([]);
  });
});

describe('FR-236 a stack of dialogs: only the top one answers', () => {
  it('FR-236 Diplomacy over Capital: Escape closes Diplomacy only, the focus goes back to the capital\'s button; Escape again closes Capital', () => {
    show(start());
    render(<Dialogs />);
    const openCapital = screen.getByRole('button', { name: /Open Capital/ });
    openWith(openCapital);
    const capital = screen.getByRole('dialog', { name: 'Capital — Testland' });
    const fromCapital = within(capital).getByRole('button', { name: 'Diplomacy' });
    openWith(fromCapital);
    const diplomacy = screen.getByRole('dialog', { name: 'Diplomacy — Testland' });
    expect(diplomacy.contains(focused())).toBe(true);
    tabCycle(diplomacy);

    press('Escape');
    expect(screen.queryByRole('dialog', { name: 'Diplomacy — Testland' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Capital — Testland' })).toBe(capital);
    expect(focused()).toBe(fromCapital);

    press('Escape');
    expect(screen.queryByRole('dialog', { name: 'Capital — Testland' })).toBeNull();
    expect(focused()).toBe(openCapital);
  });

  it('FR-236 the transport plan over Capital: its backdrop closes it alone', () => {
    show(start());
    render(<Dialogs />);
    openWith(screen.getByRole('button', { name: /Open Capital/ }));
    const capital = screen.getByRole('dialog', { name: 'Capital — Testland' });
    const fromCapital = within(capital).getByRole('button', { name: 'Transportation of Commodities' });
    openWith(fromCapital);
    const transport = screen.getByRole('dialog', { name: 'Transportation of Commodities' });

    clickOn(backdropOf(transport));
    expect(screen.queryByRole('dialog', { name: 'Transportation of Commodities' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Capital — Testland' })).toBe(capital);
    expect(focused()).toBe(fromCapital);
  });
});

describe('FR-236 FR-175 Accept Offer', () => {
  const withOffer = (): GameState => ({ ...start(), turn: 2, proposals: [{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'alliance', turn: 1 }] });

  it('FR-236 a modal dialog named "Accept Offer" that takes the focus itself (Enter accepts); Tab stays inside', () => {
    show(withOffer());
    render(<AcceptOfferModal />);
    const dialog = screen.getByRole('dialog', { name: 'Accept Offer' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(text(document.getElementById(dialog.getAttribute('aria-labelledby')!)!)).toBe('Accept Offer');
    expect(focused()).toBe(dialog);

    press('Tab');
    const controls = tabCycle(dialog);
    expect(controls.map((b) => b.getAttribute('aria-label') ?? text(b))).toEqual(['Close offer', 'Reject', 'Accept']);
  });

  it('FR-236 FR-175 a click on the backdrop closes it as its × button does: no answer, the proposal stays', () => {
    show(withOffer());
    render(<AcceptOfferModal />);
    clickOn(backdropOf(screen.getByRole('dialog', { name: 'Accept Offer' })));
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
    expect(submitted).toEqual([]);
    expect(proposalAnswer(useGameStore.getState().game, 'proposal-1-1')).toBeUndefined();
    expect(useGameStore.getState().dismissedProposalIds).toEqual(['proposal-1-1']);
  });
});

describe('FR-236 Game over has no close', () => {
  const finished = (): GameState => ({ ...start(), gameOver: { turn: 40, year: 1824, scores: [] } });

  it('FR-236 a modal dialog named "Game over"; the focus on its first control; Escape and the backdrop do nothing; Tab stays inside', () => {
    show(finished());
    render(<GameOverModal />);
    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(focused()).toBe(within(dialog).getByRole('button', { name: 'Back to the map' }));

    press('Escape');
    clickOn(backdropOf(dialog));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBe(dialog);
    expect(useGameStore.getState().isGameOverHidden).toBe(false);

    const controls = tabCycle(dialog);
    expect(controls.map(text)).toEqual(['Back to the map', 'New game']);
  });
});

describe('FR-236 one shared component, not per-dialog copies', () => {
  it('FR-236 every dialog renders components/Modal.tsx; no other component sets role="dialog" or aria-modal itself', () => {
    const dir = join(ROOT, 'src/app/components');
    const files = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(d, e.name)) : /\.tsx$/.test(e.name) ? [join(d, e.name)] : []));
    const shared = join(dir, 'Modal.tsx');
    expect(readFileSync(shared, 'utf8')).toMatch(/role="dialog"/);
    const setsRole = files(dir)
      .filter((f) => f !== shared)
      .filter((f) => /role=["']dialog["']|aria-modal/.test(readFileSync(f, 'utf8')));
    expect(setsRole.map((f) => f.slice(dir.length + 1))).toEqual([]);

    const dialogs = [
      'DiplomacyModal.tsx',
      'AcceptOfferModal.tsx',
      'WarehouseModal.tsx',
      'CapitalModal.tsx',
      'MarketModal.tsx',
      'TransportAllocationModal.tsx',
      'ConstructionOptionsModal.tsx',
      'GameOverModal.tsx',
      join('HUD', 'AboutPanel.tsx'),
    ];
    const withoutModal = dialogs.filter((f) => !/<Modal\b/.test(readFileSync(join(dir, f), 'utf8')));
    expect(withoutModal).toEqual([]);
  });
});
