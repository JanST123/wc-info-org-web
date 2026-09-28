import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Toilet Cards & Detail View Properties Display', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('displays all properties correctly in result cards', async ({ page }) => {
    await page.goto('/Toilets/Berlin');
    await page.waitForLoadState('networkidle');

    // Select cards in the desktop sidebar
    const cards = page.locator('aside app-toilet-card');
    await expect(cards).toHaveCount(2);

    // --- CARD 1 (Full-featured: Deutsche Bahn AG) ---
    const firstCard = cards.first();
    // Headline: Owner "Deutsche Bahn AG" (since owner is preferred over name in headline)
    await expect(firstCard).toContainText('Deutsche Bahn AG');
    // Subtitle contains name "Hauptbahnhof WC Ost"
    await expect(firstCard).toContainText('Hauptbahnhof WC Ost');
    // Verified icon checkmark
    await expect(firstCard.locator('.fa-circle-check')).toBeVisible();
    // Address
    await expect(firstCard).toContainText('Europaplatz 1, 10557 Berlin');
    // Non-public warning indicator (since public_accessible is false)
    await expect(firstCard).toContainText('Nicht öffentlich');
    // Photos
    const photos = firstCard.locator('img');
    await expect(photos).toHaveCount(2);

    // --- CARD 2 (Minimal / Public City toilet) ---
    const secondCard = cards.nth(1);
    // Headline: Name "Park-Toilette Mauerpark" (since owner is null)
    await expect(secondCard).toContainText('Park-Toilette Mauerpark');
    // Address
    await expect(secondCard).toContainText('Gleimstraße 55, 10437 Berlin');
    // No verified badge for unverified toilet
    await expect(secondCard.locator('.fa-circle-check')).not.toBeVisible();
  });

  test('displays all properties accurately in Detail View', async ({ page }) => {
    await page.goto('/Toilets/Berlin');
    await page.waitForLoadState('networkidle');

    // Click on the first card and open detail view
    const firstCard = page.locator('aside app-toilet-card').first();
    await firstCard.click();
    await firstCard.locator('button:has-text("Details anzeigen")').click();

    const detailModal = page.locator('app-detail > div').first();
    await expect(detailModal).toBeVisible();

    // 1. Owner & Verified checkmark
    await expect(detailModal).toContainText('Deutsche Bahn AG');
    await expect(detailModal.locator('.fa-circle-check').first()).toBeVisible();

    // 2. Name & Address
    await expect(detailModal.locator('h2')).toContainText('Hauptbahnhof WC Ost');
    await expect(detailModal).toContainText('Europaplatz 1, 10557 Berlin');

    // 3. Photo carousel
    const detailPhotos = detailModal.locator('img');
    await expect(detailPhotos.first()).toBeVisible();

    // 4. Feature Matrix
    // Wheelchair: Yes (Ja)
    await expect(detailModal.locator('.grid > div:has-text("Rollstuhlgerecht")')).toContainText('Ja');
    // Changing table: Yes (Ja)
    await expect(detailModal.locator('.grid > div:has-text("Wickeltisch")')).toContainText('Ja');
    // Euro Key: Yes (Ja)
    await expect(detailModal.locator('.grid > div:has-text("Euroschlüssel")')).toContainText('Ja');
    // Storage space: Much (Viel Ablagefläche)
    await expect(detailModal.locator('.grid > div:has-text("Ablagefläche")')).toContainText('Viel Ablagefläche');
    // Public accessibility: No (Nein)
    await expect(detailModal.locator('.grid > div:has-text("Öffentlich zugänglich")')).toContainText('Nein');

    // 5. Weekly schedule
    await expect(detailModal.locator('text=Wöchentliche Öffnungszeiten')).toBeVisible();

    // 6. Website
    const websiteLink = detailModal.locator('a[href="https://www.bahnhof.de/berlin-hauptbahnhof"]');
    await expect(websiteLink).toBeVisible();

    // 7. Comment
    await expect(detailModal).toContainText('Sehr sauber, Euro-Schlüssel für Rollstuhl-WC erforderlich.');
  });
});

