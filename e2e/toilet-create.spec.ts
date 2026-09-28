import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Toilet Create Wizard API & Payload Conformance', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('correctly sets all properties in POST /toilet/add and subsequent PATCH payloads', async ({ page }) => {
    let postAddPayload: any = null;
    const patchPayloads: any[] = [];

    // Mock POST /toilet/add and capture payload
    await page.route('**/toilet/add', async (route) => {
      postAddPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        json: { success: true, id: 999 }
      });
    });

    // Mock PATCH /toilet/*/update and capture payloads
    await page.route('**/toilet/*/update', async (route) => {
      patchPayloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        json: { success: true, id: 999, diff: 'Updated' }
      });
    });

    // Navigate to /Toilets/Berlin
    await page.goto('/Toilets/Berlin');
    await page.waitForLoadState('networkidle');

    // Click "Fehlt eine Toilette?" button
    const openAddBtn = page.locator('button:has-text("Fehlt eine Toilette?"), button:has-text("Toilette hinzufügen")').first();
    await openAddBtn.click();

    // Wizard is open
    await expect(page.locator('app-create-wizard > div').first()).toBeVisible();

    // Step 1: place_id -> Click "Keiner dieser Orte"
    const noPlaceBtn = page.locator('app-create-wizard button:has-text("Keiner dieser Orte")');
    await noPlaceBtn.click();

    // Step 2: name -> Enter name and click "Weiter"
    const nameInput = page.locator('app-create-wizard input[type="text"]').first();
    await nameInput.fill('Kollwitzplatz Public Restroom');
    await page.locator('app-create-wizard button:has-text("Weiter")').first().click();

    // Step 3: sensor_location -> Click "Ja, GPS-Sensor-Position verwenden"
    const sensorYesBtn = page.locator('app-create-wizard button:has-text("Ja, GPS-Sensor-Position verwenden")');
    await sensorYesBtn.click();

    // Step 5: gender_separated -> Click "Ja, getrennte Toiletten"
    const genderYesBtn = page.locator('app-create-wizard button:has-text("Ja, getrennte Toiletten")');
    await genderYesBtn.click();

    // Step 6: wheelchair -> Click "Ja"
    const wheelchairYesBtn = page.locator('app-create-wizard button:has-text("Ja")').first();
    await wheelchairYesBtn.click();

    // Step 7: euro_key -> Click "Ja"
    const euroKeyYesBtn = page.locator('app-create-wizard button:has-text("Ja")').first();
    await euroKeyYesBtn.click();

    // At this milestone, POST /toilet/add is triggered!
    await expect.poll(() => postAddPayload, { timeout: 10000 }).not.toBeNull();

    // --- ASSERT POST /toilet/add PAYLOAD AGAINST OPENAPI SPEC StoreToiletRequest ---
    expect(postAddPayload).toHaveProperty('lat');
    expect(typeof postAddPayload.lat).toBe('number');
    expect(postAddPayload).toHaveProperty('lon');
    expect(typeof postAddPayload.lon).toBe('number');
    expect(postAddPayload.name).toBe('Kollwitzplatz Public Restroom');
    expect(postAddPayload.is_gender_separated).toBe(true);
    expect(postAddPayload.is_unisex).toBe(false);
    expect(postAddPayload.has_wheelchair_access).toBe(true);
    expect(postAddPayload.public_accessible).toBe(true);
    expect(postAddPayload.euro_key).toBe('yes');

    // Ensure NO camelCase leaks in POST payload
    expect(postAddPayload).not.toHaveProperty('isGenderSeparated');
    expect(postAddPayload).not.toHaveProperty('hasWheelchairAccess');
    expect(postAddPayload).not.toHaveProperty('isUnisex');
    expect(postAddPayload).not.toHaveProperty('euroKey');
    expect(postAddPayload).not.toHaveProperty('publicAccessible');
    expect(postAddPayload).not.toHaveProperty('placeId');

    // Step 8: address -> Save address
    const addressInput = page.locator('app-create-wizard textarea').first();
    await expect(addressInput).toBeVisible();
    await addressInput.fill('Kollwitzstraße 1, 10405 Berlin');
    await page.locator('app-create-wizard button:has-text("Adresse speichern")').click();

    // Step 9: opening_hours -> Click "Nein, überspringen"
    const skipHoursBtn = page.locator('app-create-wizard button:has-text("Nein, überspringen")');
    await expect(skipHoursBtn).toBeVisible();
    await skipHoursBtn.click();

    // Step 10: public_accessible -> Click "Ja (Frei für alle zugänglich)"
    const publicYesBtn = page.locator('app-create-wizard button:has-text("Ja (Frei für alle zugänglich)")');
    await expect(publicYesBtn).toBeVisible();
    await publicYesBtn.click();

    // Step 11: accessible_outside -> Click "Ja, immer zugänglich"
    const outsideYesBtn = page.locator('app-create-wizard button:has-text("Ja, immer zugänglich")');
    await expect(outsideYesBtn).toBeVisible();
    await outsideYesBtn.click();

    // Step 12: storage_space -> Click "Viel"
    const storageMuchBtn = page.locator('app-create-wizard button:has-text("Viel")');
    await expect(storageMuchBtn).toBeVisible();
    await storageMuchBtn.click();

    // Step 13: photo -> Click footer "Weiter →"
    const nextPhotoBtn = page.locator('app-create-wizard button:has-text("Weiter →")');
    await expect(nextPhotoBtn).toBeVisible();
    await nextPhotoBtn.click();

    // Step 14: comment -> Enter comment and click footer "Fertigstellen →"
    const commentInput = page.locator('app-create-wizard textarea').first();
    await expect(commentInput).toBeVisible();
    await commentInput.fill('Direkt am Kollwitzplatz Spielplatz gelegen.');
    const finishBtn = page.locator('app-create-wizard button:has-text("Fertigstellen →")');
    await finishBtn.click();

    // Verify subsequent PATCH updates occurred with valid properties conforming to UpdateToiletRequest
    await expect.poll(() => patchPayloads.length, { timeout: 10000 }).toBeGreaterThan(0);
    const lastPatch = patchPayloads[patchPayloads.length - 1];

    expect(lastPatch).toHaveProperty('storage_space');
    expect(lastPatch.storage_space).toBe('much');
    expect(lastPatch).toHaveProperty('public_accessible');
    expect(lastPatch.public_accessible).toBe(true);
    expect(lastPatch).toHaveProperty('accessible_outside_opening_times');
    expect(lastPatch.accessible_outside_opening_times).toBe(true);
    expect(lastPatch).toHaveProperty('address');
    expect(lastPatch.address).toBe('Kollwitzstraße 1, 10405 Berlin');
    expect(lastPatch).toHaveProperty('comment');
    expect(lastPatch.comment).toBe('Direkt am Kollwitzplatz Spielplatz gelegen.');

    // Ensure NO camelCase in PATCH payloads
    expect(lastPatch).not.toHaveProperty('storageSpace');
    expect(lastPatch).not.toHaveProperty('publicAccessible');
    expect(lastPatch).not.toHaveProperty('accessibleOutsideOpeningTimes');
    expect(lastPatch).not.toHaveProperty('isGenderSeparated');
    expect(lastPatch).not.toHaveProperty('hasWheelchairAccess');
  });
});

