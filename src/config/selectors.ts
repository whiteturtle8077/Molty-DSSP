/**
 * Selector configuration — single source of truth for all page element selectors.
 *
 * Centralizes CSS selectors, XPaths, and text patterns so they can be updated
 * without touching page object code. Maps logical names to locator strategies.
 *
 * Format:
 *   <page>.<element>: { selector: string, type: 'css' | 'xpath' | 'text' | 'role' }
 *
 * Usage:
 *   import { selectors } from '../config/selectors.js';
 *   await page.locator(selectors.protonLogin.username).fill('...');
 */

export interface SelectorDef {
  selector: string;
  type: 'css' | 'xpath' | 'text' | 'role';
  description?: string;
}

export interface PageSelectors {
  [key: string]: SelectorDef;
}

export const selectors: Record<string, PageSelectors> = {

  protonLogin: {
    username: {
      selector: '#username',
      type: 'css',
      description: 'ProtonMail username/email input field',
    },
    password: {
      selector: '#password',
      type: 'css',
      description: 'ProtonMail password input field',
    },
    signInButton: {
      selector: 'button[type="submit"]',
      type: 'css',
      description: 'Sign in submit button',
    },
    staySignedIn: {
      selector: '#staySignedIn',
      type: 'css',
      description: 'Keep me signed in checkbox',
    },
    troubleSigningIn: {
      selector: 'text=Trouble signing in?',
      type: 'text',
      description: 'Trouble signing in link',
    },
  },

  protonChallenge: {
    iframe: {
      selector: 'iframe[src*="challenge/v4/html"]',
      type: 'css',
      description: 'Proton challenge/anti-bot iframe',
    },
    iframeLogin: {
      selector: 'iframe[src*="challenge/v4/html?Type=0&Name=login"]',
      type: 'css',
      description: 'Proton login-specific challenge iframe',
    },
    iframeUnauth: {
      selector: 'iframe[src*="challenge/v4/html?Type=0&Name=unauth"]',
      type: 'css',
      description: 'Proton unauth challenge iframe',
    },
    pixelBody: {
      selector: 'body',
      type: 'css',
      description: 'Challenge iframe body for pixel detection',
    },
    captchaContainer: {
      selector: '[class*="captcha"], [class*="challenge"], [id*="captcha"]',
      type: 'css',
      description: 'Generic captcha container inside challenge iframe',
    },
  },

  common: {
    pageBody: {
      selector: 'body',
      type: 'css',
    },
    iframe: {
      selector: 'iframe',
      type: 'css',
    },
  },

};

/**
 * Resolve a selector to a Playwright locator string.
 * For 'text' type, wrap in text= prefix for Playwright.
 * For 'role', wrap in role= prefix.
 */
export function resolveSelector(pageKey: string, elementKey: string): string {
  const pageSel = selectors[pageKey];
  if (!pageSel) throw new Error(`Unknown page: ${pageKey}`);
  const def = pageSel[elementKey];
  if (!def) throw new Error(`Unknown element: ${pageKey}.${elementKey}`);

  switch (def.type) {
    case 'text':
      return `text=${def.selector}`;
    case 'role':
      return `role=${def.selector}`;
    default:
      return def.selector;
  }
}
