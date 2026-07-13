import { Page as PlaywrightPage } from '@playwright/test';

/**
 * Base page object — all page objects extend this.
 * Provides common navigation and utility methods.
 */
export abstract class BasePage {
  constructor(protected readonly page: PlaywrightPage) {}

  /** Navigate to a relative or absolute URL */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
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
}
