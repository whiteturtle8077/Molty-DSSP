import { test } from '@playwright/test';
import { chromium } from 'playwright';

/**
 * ProtonMail debug — browser + Playwright Inspector visible.
 * Loads creds from encrypted .env.enc via config/index.ts.
 *
 * Command:
 *   npx playwright test tests/login-and-pause.spec.ts --debug
 *
 * Opens headed browser + Inspector. Steps through login,
 * then hits page.pause() — you browse your mail.
 */

test('login to ProtonMail with debugger', async () => {
  const { config } = await import('../src/config/index.js');
  const username = config.auth.protonUsername;
  const password = config.auth.protonPassword;

  test.fixme(!username || !password, 'Set PROTON_WHITETURTLE_MASTER_KEY at OS level.');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://mail.proton.me', { waitUntil: 'load' });
  await page.waitForTimeout(4_000);

  await page.waitForSelector('#username', { state: 'visible', timeout: 20_000 });

  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5_000);

  for (let i = 0; i < 3; i++) {
    const onLoginPage = await page.locator('#username').isVisible();
    if (onLoginPage) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
    } else {
      break;
    }
  }

  await page.pause();
  await browser.close();
});
