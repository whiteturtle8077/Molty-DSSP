import { expect, type Page as PlaywrightPage } from '@playwright/test';
import { BasePage } from './Page.js';
import { selectors } from '../config/selectors.js';
import { solveCaptcha, detectCaptcha } from '../captcha/index.js';

/**
 * ProtonMail login page object.
 *
 * Uses externalized selectors from config/selectors.ts.
 * Handles genuine blocking captchas via 2Captcha.
 *
 * Note: ProtonMail's challenge iframes are passive behavioral analysis
 * and are present on every page load. They are NOT blocking captchas
 * and should be ignored.
 */

const POST_LOGIN_URL_PATTERN = /mail\.proton(\.me|\.com)\/u\/\d+\/inbox/;
const LOGIN_REDIRECT_MS = 20_000;

export class ProtonLoginPage extends BasePage {
  private readonly sel = selectors.protonLogin;

  constructor(protected readonly page: PlaywrightPage) {
    super(page);
  }

  /** Navigate to ProtonMail login */
  async open(): Promise<void> {
    console.log('  🌐 Opening ProtonMail login...');
    await this.goto('');
    await this.page.waitForTimeout(4_000);
  }

  /** Wait for the login form to be ready */
  async waitForLoginForm(timeout = 20_000): Promise<void> {
    await this.waitForVisible(this.sel.username.selector, timeout);
    console.log('  ✅ Login form ready');
  }

  /** Verify the login page loaded with correct branding */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Proton/);
  }

  /** Verify all login form elements are present */
  async verifyLoginFormPresent(): Promise<void> {
    await this.waitForVisible(this.sel.username.selector, 15_000);
    await this.waitForVisible(this.sel.password.selector, 5_000);
    await this.waitForVisible(this.sel.signInButton.selector, 5_000);
  }

  /** Enter username */
  async enterUsername(username: string): Promise<void> {
    console.log(`  👤 Entering username`);
    await this.page.locator(this.sel.username.selector).fill(username);
  }

  /** Enter password */
  async enterPassword(password: string): Promise<void> {
    console.log('  🔑 Entering password');
    await this.page.locator(this.sel.password.selector).fill(password);
  }

  /** Click sign in */
  async clickSignIn(): Promise<void> {
    console.log('  🚀 Clicking Sign in...');
    await this.page.locator(this.sel.signInButton.selector).click();
    await this.page.waitForTimeout(3_000);
  }

  /**
   * Check for and handle BLOCKING captchas only.
   * Proton's passive challenge iframes are ignored.
   */
  async handleBlockingCaptchas(): Promise<boolean> {
    const captchaType = await detectCaptcha(this.page);
    if (captchaType === 'none') return false;

    console.log(`  🛡️ Blocking captcha detected: ${captchaType}`);
    const solved = await solveCaptcha(this.page);
    if (solved) {
      console.log('  ✅ Captcha solved, re-submitting...');
      await this.page.waitForTimeout(2_000);
      await this.page.locator(this.sel.signInButton.selector).click();
      return true;
    }
    return false;
  }

  /**
   * Check if login was successful by looking at the current URL.
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    const matched = POST_LOGIN_URL_PATTERN.test(currentUrl);

    if (matched) {
      console.log(`  ✅ Login successful — at inbox`);
    } else {
      console.log(`  ⏳ Still on login page — URL: ${currentUrl.substring(0, 60)}`);
    }

    return matched;
  }

  /**
   * Wait for post-login redirect and verify success.
   */
  async waitForLoginResult(timeout = LOGIN_REDIRECT_MS): Promise<boolean> {
    try {
      await this.page.waitForURL(POST_LOGIN_URL_PATTERN, { timeout });
      console.log('  ✅ Redirected to inbox');
      return true;
    } catch {
      console.log('  ⏳ No redirect yet');
      return false;
    }
  }

  /**
   * Check for auth error messages on the login page.
   */
  async getErrorMessage(): Promise<string> {
    const text = await this.page.evaluate(() => document.body.innerText);

    const errorPatterns = [
      'password is not correct',
      'invalid',
      'incorrect',
      'wrong',
    ];

    for (const pattern of errorPatterns) {
      if (text.toLowerCase().includes(pattern)) {
        return pattern;
      }
    }

    return '';
  }

  /**
   * Full login flow with captcha handling.
   * Returns true if login succeeded.
   */
  async login(username: string, password: string): Promise<boolean> {
    await this.open();
    await this.verifyPageLoaded();
    await this.waitForLoginForm();

    // Check for pre-fill blocking captchas
    await this.handleBlockingCaptchas();

    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickSignIn();

    // Check for post-submit captchas
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.handleBlockingCaptchas();

      const loggedIn = await this.waitForLoginResult();
      if (loggedIn) return true;

      const errorMsg = await this.getErrorMessage();
      if (errorMsg) {
        console.log(`  ❌ Auth error: "${errorMsg}"`);
        return false;
      }

      if (attempt < 2) {
        console.log(`  🔄 Retry ${attempt + 2}...`);
        await this.clickSignIn();
      }
    }

    return this.isLoggedIn();
  }
}
