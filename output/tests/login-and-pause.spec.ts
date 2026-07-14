import { test } from '@playwright/test';

/**
 * ProtonMail login → pause so you can browse your mail.
 *
 * Run: npx playwright test tests/login-and-pause.spec.ts
 * Env:  PROTON_EMAIL and PROTON_PASSWORD must be set
 *       (or PROTON_WHITETURTLE_MASTER_KEY with config/index.ts loaded)
 *
 * Headed mode: edit playwright.config.ts or pass --headed
 */

test('login to ProtonMail and hand off browser', async ({ page }) => {
  const username = process.env.PROTON_EMAIL || process.env.PROTON_USERNAME;
  const password = process.env.PROTON_PASSWORD;

  if (!username || !password) {
    console.error('❌ Set PROTON_EMAIL and PROTON_PASSWORD env vars.');
    test.fixme();
    return;
  }

  console.log('🌐 Opening ProtonMail...');
  await page.goto('https://mail.proton.me', { waitUntil: 'load' });
  await page.waitForTimeout(4_000);

  console.log('⏳ Waiting for login form...');
  await page.waitForSelector('#username', { state: 'visible', timeout: 20_000 });
  console.log('✅ Login form ready');

  console.log('👤 Entering credentials...');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  console.log('⏳ Waiting for login to complete...');
  await page.waitForTimeout(5_000);

  // Retry submit if still on login page
  for (let i = 0; i < 3; i++) {
    const onLoginPage = await page.locator('#username').isVisible();
    if (onLoginPage) {
      console.log(`🔄 Retry submit (attempt ${i + 1})...`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
    } else {
      break;
    }
  }

  console.log('✅ Logged in. Browser is yours — browse your mail.');
  console.log('   Close the browser window or press Ctrl+C to exit.');

  // Hand off — you're in control
  await page.pause();
});
