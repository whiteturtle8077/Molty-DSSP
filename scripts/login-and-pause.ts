import { chromium } from 'playwright';
import { config } from './config/index.js';

/**
 * Standalone ProtonMail login script.
 * Opens browser, logs in, pauses — you browse your mail.
 *
 * Run: npx tsx scripts/login-and-pause.ts
 * Env: PROTON_WHITETURTLE_MASTER_KEY must be set at OS level
 */

async function main() {
  const username = config.auth.protonUsername;
  const password = config.auth.protonPassword;

  if (!username || !password) {
    console.error('❌ No credentials found. Set PROTON_WHITETURTLE_MASTER_KEY at OS level.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('🌐 Opening ProtonMail...');
  await page.goto('https://mail.proton.me', { waitUntil: 'load' });
  await page.waitForTimeout(4_000);

  // Wait for login form
  await page.waitForSelector('#username', { state: 'visible', timeout: 20_000 });
  console.log('✅ Login form ready');

  console.log('👤 Entering credentials...');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  console.log('⏳ Waiting for login...');
  await page.waitForTimeout(5_000);

  // Try clicking again if still on login page
  for (let i = 0; i < 3; i++) {
    const onLoginPage = await page.locator('#username').isVisible();
    if (onLoginPage) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3_000);
    } else {
      break;
    }
  }

  console.log('✅ Logged in. Browser is paused — browse your mail.');
  console.log('   Close the browser window or press Ctrl+C to exit.');

  // Pause indefinitely — you're in control
  await page.pause();

  await browser.close();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
