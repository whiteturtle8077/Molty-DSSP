import { test, expect } from '@playwright/test';

test('HELLO WORLD — ProtonMail login page loads', async ({ page }) => {
  await page.goto('https://mail.proton.me');

  // The ProtonMail login page should show their branding
  // We'll assert on page title as a minimal smoke check
  await expect(page).toHaveTitle(/Proton/);
  console.log('✅ ProtonMail login page loaded successfully');
});

test('HELLO WORLD — Login form elements are present', async ({ page }) => {
  await page.goto('https://mail.proton.me');

  // Verify the login form has a username field
  const usernameInput = page.locator('#username');
  await expect(usernameInput).toBeVisible({ timeout: 15000 });

  // Verify the password field
  const passwordInput = page.locator('#password');
  await expect(passwordInput).toBeVisible({ timeout: 5000 });

  // Verify the sign-in button
  const signInButton = page.locator('button[type="submit"]');
  await expect(signInButton).toBeVisible({ timeout: 5000 });

  console.log('✅ All login form elements are present');
});
