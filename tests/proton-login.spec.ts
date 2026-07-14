import { test, expect } from '@playwright/test';
import { ProtonLoginPage } from '../src/pages/ProtonLoginPage';
import { config } from '../src/config/index';

test.describe('ProtonMail Login', () => {

  test('Login page loads with branding', async ({ page }) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
    await expect(page).toHaveTitle(/Proton/);
  });

  test('Login form displays all required fields', async ({ page }) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
    await loginPage.waitForLoginForm();
    await expect(page.locator('#username')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#password')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5_000 });
  });

  test('Successful login with valid credentials', async ({ page }) => {
    // Skip if no credentials available
    test.skip(!config.auth.protonUsername || !config.auth.protonPassword,
      'No credentials — set MOLTY_MASTER_KEY env var');

    const loginPage = new ProtonLoginPage(page);
    const loggedIn = await loginPage.login(config.auth.protonUsername, config.auth.protonPassword);
    expect(loggedIn).toBe(true);
  });

});
