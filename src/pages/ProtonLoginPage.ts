import { expect } from '@playwright/test';
import { BasePage } from './Page.js';

/**
 * ProtonMail login page object.
 * Base URL is consumed from config (MOLTY_BASE_URL env var or .env file).
 */
export class ProtonLoginPage extends BasePage {
  // Selectors for the ProtonMail login form
  private readonly usernameInput = '#username';
  private readonly passwordInput = '#password';
  private readonly signInButton = 'button[type="submit"]';
  private readonly titlePattern = /Proton/;

  /** Navigate to ProtonMail login (uses config.app.baseUrl) */
  async open(): Promise<void> {
    // Passing empty string so BasePage resolves relative to baseUrl
    await this.goto('');
  }

  /** Verify the login page loaded with correct branding */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(this.titlePattern);
  }

  /** Verify all login form elements are present */
  async verifyLoginFormPresent(): Promise<void> {
    await this.waitForVisible(this.usernameInput, 15000);
    await this.waitForVisible(this.passwordInput, 5000);
    await this.waitForVisible(this.signInButton, 5000);
  }

  /** Enter username (email) */
  async enterUsername(username: string): Promise<void> {
    await this.type(this.usernameInput, username);
  }

  /** Enter password */
  async enterPassword(password: string): Promise<void> {
    await this.type(this.passwordInput, password);
  }

  /** Click sign in */
  async clickSignIn(): Promise<void> {
    await this.click(this.signInButton);
  }

  /** Full login flow (assumes valid credentials will succeed) */
  async login(username: string, password: string): Promise<void> {
    await this.open();
    await this.verifyPageLoaded();
    await this.verifyLoginFormPresent();
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickSignIn();
  }
}
