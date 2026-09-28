import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Matomo Tracking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await setupApiMocks(page);
  });

  test('tracks pageviews, results opening, detail modal, darkmode, help, language, and urgent navigation', async ({ page }) => {
    // 1. Visit Home Page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify _paq is initialized
    const paqExists = await page.evaluate(() => Array.isArray(window._paq));
    expect(paqExists).toBe(true);

    // Verify initial pageview was tracked
    const hasInitialPageView = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackPageView');
    });
    expect(hasInitialPageView).toBe(true);

    // 2. Toggle Dark Mode
    const themeBtn = page.locator('header button[aria-label="Toggle theme"]');
    await themeBtn.click();

    const hasDarkModeEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Settings' && item[2] === 'Toggle Dark Mode');
    });
    expect(hasDarkModeEvent).toBe(true);

    // 3. Use Help from Header
    const helpBtn = page.locator('header button[aria-label="Show help"]');
    await helpBtn.click();

    const hasHelpEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Header' && item[2] === 'Help Used');
    });
    expect(hasHelpEvent).toBe(true);

    // Close help modal
    await page.locator('app-help-modal button').first().click();

    // 4. Switch Language
    const enLangBtn = page.locator('header button:text-is("EN")');
    await enLangBtn.click();

    const hasLangEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Language' && item[2] === 'Switch Language' && item[3] === 'en');
    });
    expect(hasLangEvent).toBe(true);

    // Switch back to DE
    await page.locator('header button:text-is("DE")').click();

    // 5. Navigate to Results Page (for a place name: Berlin)
    await page.goto('/Toilets/Berlin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('aside app-toilet-card').first()).toBeVisible();

    const hasResultsPlaceEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Results' && item[2] === 'Open Results' && item[3] === 'Berlin');
    });
    expect(hasResultsPlaceEvent).toBe(true);

    // 6. Open Detail View from Card
    const firstCard = page.locator('aside app-toilet-card').first();
    await firstCard.locator('h3').click();
    await firstCard.locator('button:has-text("Details anzeigen")').click();

    const hasDetailCardEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Detail View' && item[2] === 'Open from card');
    });
    expect(hasDetailCardEvent).toBe(true);

    // Close detail view
    const closeDetailBtn = page.locator('app-detail button[title="Schließen"], app-detail button[title="Close"]').first();
    await closeDetailBtn.click();

    // 7. Use Urgent Navigation from Header
    const urgentBtn = page.locator('header button:has-text("Notfall-WC")');
    await urgentBtn.click();
    await page.waitForLoadState('networkidle');

    const hasUrgentEvent = await page.evaluate(() => {
      return (window._paq || []).some((item: any) => item[0] === 'trackEvent' && item[1] === 'Navigation' && item[2].includes('Urgent'));
    });
    expect(hasUrgentEvent).toBe(true);
  });
});
