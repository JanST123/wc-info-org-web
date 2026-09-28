import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Toilet Update Modal API & Payload Conformance', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('correctly sets all properties in PATCH /toilet/:id/update according to OpenAPI spec', async ({ page }) => {
    let patchPayload: any = null;

    // Mock PATCH /toilet/101/update and capture payload
    await page.route('**/toilet/101/update', async (route) => {
      patchPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          id: 101,
          diff: 'Updated properties'
        }
      });
    });

    // Navigate to results
    await page.goto('/Toilets/Berlin');
    await page.waitForLoadState('networkidle');

    // Click on the first toilet card in desktop sidebar to select it and click "Details anzeigen"
    const firstCard = page.locator('aside app-toilet-card').first();
    await firstCard.locator('h3').click();

    const viewDetailsBtn = firstCard.locator('button:has-text("Details anzeigen")');
    await viewDetailsBtn.click();

    // In Detail view, click "Änderungen vorschlagen"
    const suggestEditBtn = page.locator('app-detail button:has-text("Änderungen vorschlagen")');
    await suggestEditBtn.click();

    // Update Modal is now open!
    const updateModal = page.locator('app-update-modal > div').first();
    await expect(updateModal).toBeVisible();

    // 1. Belongs to venue & custom venue name
    const venueCheckbox = updateModal.locator('input[type="checkbox"]').first();
    if (!(await venueCheckbox.isChecked())) {
      await venueCheckbox.check();
    }

    const venueSelect = updateModal.locator('select').first();
    await venueSelect.selectOption('CUSTOM');
    const customVenueInput = updateModal.locator('input[placeholder*="Name der Einrichtung"]');
    await customVenueInput.fill('Hauptbahnhof Empfangsgebäude');

    // 2. Name
    const nameInput = updateModal.locator('input[placeholder*="WC #"]');
    await nameInput.fill('HBF Premium Lounge Restroom');

    // 3. Features & Storage space
    // Select "Viel" for storage shelf
    const storageLotBtn = updateModal.locator('button:has-text("Viel")');
    await storageLotBtn.click();

    // 4. Address
    const addressInput = updateModal.locator('input[placeholder*="Straße, Hausnummer"]');
    await addressInput.fill('Europaplatz 1, 10557 Berlin, Ebene 1');

    // 5. Website
    const websiteInput = updateModal.locator('input[type="url"]');
    await websiteInput.fill('https://www.bahnhof.de/wc');

    // 6. Comment
    const commentInput = updateModal.locator('textarea');
    await commentInput.fill('Zugang mit EC-Karte oder Euro-WC-Schlüssel möglich.');

    // 7. Click "Änderungen speichern"
    const saveBtn = updateModal.locator('button:has-text("Änderungen speichern")');
    await saveBtn.click();

    // Assert that the PATCH request was received
    await expect.poll(() => patchPayload, { timeout: 10000 }).not.toBeNull();

    // --- VALIDATE PATCH PAYLOAD AGAINST OPENAPI UpdateToiletRequest ---
    expect(patchPayload).toHaveProperty('lat');
    expect(typeof patchPayload.lat).toBe('number');
    expect(patchPayload).toHaveProperty('lon');
    expect(typeof patchPayload.lon).toBe('number');
    expect(patchPayload.name).toBe('HBF Premium Lounge Restroom');
    expect(patchPayload.owner).toBe('Hauptbahnhof Empfangsgebäude');
    expect(patchPayload.address).toBe('Europaplatz 1, 10557 Berlin, Ebene 1');
    expect(patchPayload.website).toBe('https://www.bahnhof.de/wc');
    expect(patchPayload.comment).toBe('Zugang mit EC-Karte oder Euro-WC-Schlüssel möglich.');
    expect(patchPayload.storage_space).toBe('much');

    expect(patchPayload).toHaveProperty('is_gender_separated');
    expect(patchPayload).toHaveProperty('is_unisex');
    expect(patchPayload).toHaveProperty('has_wheelchair_access');
    expect(patchPayload).toHaveProperty('has_changing_table');
    expect(patchPayload).toHaveProperty('public_accessible');
    expect(patchPayload).toHaveProperty('accessible_outside_opening_times');
    expect(patchPayload).toHaveProperty('euro_key');

    // Ensure NO camelCase in PATCH payload
    expect(patchPayload).not.toHaveProperty('storageSpace');
    expect(patchPayload).not.toHaveProperty('publicAccessible');
    expect(patchPayload).not.toHaveProperty('accessibleOutsideOpeningTimes');
    expect(patchPayload).not.toHaveProperty('isGenderSeparated');
    expect(patchPayload).not.toHaveProperty('hasWheelchairAccess');
    expect(patchPayload).not.toHaveProperty('hasChangingTable');
    expect(patchPayload).not.toHaveProperty('euroKey');
    expect(patchPayload).not.toHaveProperty('placeId');
  });
});

