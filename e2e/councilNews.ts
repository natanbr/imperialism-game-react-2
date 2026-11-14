import { expect, Page } from '@playwright/test';

// Shared by e2e/m10-council.spec.ts (turn 11) and e2e/m10-qa.spec.ts (game over); not a spec file.

/**
 * FR-306, FR-315: the Council line is the news list's first line and lies whole inside the list's visible box, above the
 * HUD's fade, with the list and the HUD scrolled to the top; and above the action buttons (at game over Final scores).
 */
export async function councilLineSeen(page: Page) {
  const newsList = page.getByTestId('news-list');
  await expect(newsList.getByRole('listitem').first()).toContainText(/^Council of Governors: /);
  const seen = await newsList.evaluate((list: HTMLElement) => {
    const hud = list.closest('.hud-content') as HTMLElement;
    const box = list.getBoundingClientRect();
    const item = list.querySelector('li')!.getBoundingClientRect();
    const fadeTop = hud.getBoundingClientRect().top + hud.clientHeight - parseFloat(getComputedStyle(hud, '::after').height);
    const buttons = document.querySelector('.action-buttons-container')!.getBoundingClientRect();
    return {
      scrollTop: list.scrollTop,
      hudScrollTop: hud.scrollTop,
      lines: list.querySelectorAll('li').length,
      inside: item.top >= box.top - 0.5 && item.bottom <= box.top + list.clientHeight + 0.5 && item.bottom <= fadeTop + 0.5,
      aboveButtons: item.bottom <= buttons.top,
    };
  });
  expect(seen).toMatchObject({ scrollTop: 0, hudScrollTop: 0, inside: true, aboveButtons: true });
  expect(seen.lines, 'more news than the Council line').toBeGreaterThan(1);
}
