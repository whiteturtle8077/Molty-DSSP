import { expect } from '@playwright/test';
import { type Page } from 'playwright';
import { ProtonLoginPage } from '../pages/ProtonLoginPage.js';
import { config } from '../config/index.js';

type StepRegistry = Record<string, (page: Page, context: Record<string, unknown>) => Promise<void>>;

/**
 * Step definitions for ProtonMail login feature.
 * Supports anti-bot challenge handling and full login flow.
 */
const protonLoginSteps: StepRegistry = {

  // ---- Given steps ----

  'given:I navigate to the ProtonMail login page': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
  },

  'given:I am on the ProtonMail login page': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
    await loginPage.waitForLoginForm();
  },

  // ---- When steps ----

  'when:the page finishes loading': async (page: Page) => {
    await page.waitForTimeout(3_000);
  },

  'when:the login form is rendered': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.waitForLoginForm();
  },

  'when:I enter valid credentials and sign in': async (page: Page, context: Record<string, unknown>) => {
    const loginPage = new ProtonLoginPage(page);
    const username = config.auth.protonUsername;
    const password = config.auth.protonPassword;

    // Handle pre-fill captchas
    await loginPage.handleBlockingCaptchas();

    await loginPage.enterUsername(username);
    await loginPage.enterPassword(password);
    await loginPage.clickSignIn();

    // Handle post-submit captchas + check result
    for (let attempt = 0; attempt < 3; attempt++) {
      await loginPage.handleBlockingCaptchas();

      const loggedIn = await loginPage.waitForLoginResult();
      if (loggedIn) {
        context['loginSuccess'] = true;
        return;
      }

      const errorMsg = await loginPage.getErrorMessage();
      if (errorMsg) {
        console.log(`  ❌ Auth error: "${errorMsg}"`);
        context['loginSuccess'] = false;
        context['loginError'] = errorMsg;
        return;
      }

      if (attempt < 2) {
        console.log(`  🔄 Retry ${attempt + 2}...`);
        await loginPage.clickSignIn();
      }
    }

    context['loginSuccess'] = await loginPage.isLoggedIn();
  },

  // ---- Then steps ----

  'then:the page title should contain \'Proton\'': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.verifyPageLoaded();
  },

  'then:a username input field should be visible': async (page: Page) => {
    await expect(page.locator('#username')).toBeVisible({ timeout: 5_000 });
  },

  'then:a password input field should be visible': async (page: Page) => {
    await expect(page.locator('#password')).toBeVisible({ timeout: 5_000 });
  },

  'then:a sign-in button should be visible': async (page: Page) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5_000 });
  },

  'then:I should be redirected to my inbox': async (page: Page, context: Record<string, unknown>) => {
    if (context['loginSuccess'] === true) return;

    const loginPage = new ProtonLoginPage(page);
    const loggedIn = await loginPage.waitForLoginResult(5_000);

    if (!loggedIn) {
      // Debug dump
      console.log('\n  📄 Current page state:');
      console.log(`  URL: ${page.url()}`);
      const text = await page.evaluate(() => document.body.innerText);
      console.log(`  Text: ${text.substring(0, 500)}`);

      const error = await loginPage.getErrorMessage();
      throw new Error(`Login failed — ${error || 'not redirected to inbox'}`);
    }
  },

};


export default protonLoginSteps;
