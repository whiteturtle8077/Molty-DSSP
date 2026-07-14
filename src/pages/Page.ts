import { Page as PlaywrightPage } from '@playwright/test';
import { config } from '../config/index.js';

/**
 * Base page object — all page objects extend this.
 * Provides common navigation and utility methods.
 *
 * Navigation uses 'load' event (not 'networkidle') because SPAs like ProtonMail
 * maintain persistent connections that prevent networkidle from ever firing.
 */
export abstract class BasePage {
  constructor(protected readonly page: PlaywrightPage) {}

  /** Navigate to an absolute URL or relative path */
  async goto(url: string): Promise<void> {
    // If it's a relative path or empty (use baseUrl), resolve against config
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const base = config.app.baseUrl.replace(/\/+$/, '');
      const path = url.startsWith('/') ? url : `/${url}`;
      await this.page.goto(`${base}${path}`, { waitUntil: 'load' });
    } else {
      await this.page.goto(url, { waitUntil: 'load' });
    }
  }

  /** Get the page title */
  async title(): Promise<string> {
    return this.page.title();
  }

  /** Wait for element to be visible */
  async waitForVisible(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /** Type text into a field */
  async type(selector: string, text: string): Promise<void> {
    await this.page.fill(selector, text);
  }

  /** Click an element */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /** Get the config instance (exposed for page objects that need it) */
  get config() {
    return config;
  }
}
