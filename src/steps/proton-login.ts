import { expect } from '@playwright/test';
import { Page } from 'playwright';
import { ProtonLoginPage } from '../pages/ProtonLoginPage.js';

type StepRegistry = Record<string, (page: Page, context: Record<string, unknown>) => Promise<void>>;

/**
 * Step definitions for ProtonMail login feature.
 * Each key follows the pattern: <stepType>:<full text from JSON feature>
 */
const protonLoginSteps: StepRegistry = {
  'given:I navigate to the ProtonMail login page': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
  },

  'given:I am on the ProtonMail login page': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.open();
    await loginPage.verifyLoginFormPresent();
  },

  'when:the page finishes loading': async (page: Page) => {
    await page.waitForLoadState('networkidle');
  },

  'when:the login form is rendered': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.verifyLoginFormPresent();
  },

  'then:the page title should contain \'Proton\'': async (page: Page) => {
    const loginPage = new ProtonLoginPage(page);
    await loginPage.verifyPageLoaded();
  },

  'then:a username input field should be visible': async (page: Page) => {
    await expect(page.locator('#username')).toBeVisible({ timeout: 5000 });
  },

  'then:a password input field should be visible': async (page: Page) => {
    await expect(page.locator('#password')).toBeVisible({ timeout: 5000 });
  },

  'then:a sign-in button should be visible': async (page: Page) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5000 });
  },
};

export default protonLoginSteps;
