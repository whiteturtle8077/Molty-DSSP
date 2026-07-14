/**
 * Captcha solver module — 2Captcha integration with Playwright.
 *
 * Detects and solves captchas on the page.
 *
 * Important: ProtonMail uses passive challenge iframes by default for
 * behavioral analysis. These are NOT blocking captchas and should be
 * ignored. Only real captchas (reCAPTCHA, text-based, image) trigger
 * the solver.
 */

import { type Page } from '@playwright/test';
import { config } from '../config/index.js';

const SOLVE_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 5_000;

/** Check if 2Captcha is configured */
export function isConfigured(): boolean {
  return config.captcha.apiKey.length > 0;
}

/** Detect if a BLOCKING captcha is present (not passive challenge iframes) */
export async function detectCaptcha(page: Page): Promise<'recaptcha' | 'text' | 'none'> {
  // Check for reCAPTCHA iframe
  const recaptcha = await page.locator('iframe[src*="recaptcha/api"], iframe[src*="google.com/recaptcha"]').count();
  if (recaptcha > 0) return 'recaptcha';

  // Check for captcha-related text on the page
  const text = await page.evaluate(() => document.body.innerText);
  const lower = text.toLowerCase();
  if (lower.includes('verify you are human') || lower.includes('verify your')) {
    // Double check it's not just Proton's challenge text
    if (!lower.includes('sign in') && !lower.includes('password')) {
      return 'recaptcha';
    }
  }

  return 'none';
}

/**
 * Solve a visible captcha on the page.
 * Returns true if a captcha was detected and solved.
 */
export async function solveCaptcha(page: Page): Promise<boolean> {
  const captchaType = await detectCaptcha(page);
  if (captchaType === 'none') return false;

  console.log(`  🛡️ Blocking captcha detected: ${captchaType}`);

  if (!isConfigured()) {
    console.log('  ⚠ No 2Captcha API key configured — cannot solve');
    return false;
  }

  switch (captchaType) {
    case 'recaptcha':
      return solveRecaptcha(page);
    default:
      return false;
  }
}

/**
 * Solve a reCAPTCHA v2 via 2Captcha.
 */
async function solveRecaptcha(page: Page): Promise<boolean> {
  const apiKey = config.captcha.apiKey;

  // Extract sitekey
  const sitekey = await page.evaluate(() => {
    const el = document.querySelector('[data-sitekey]');
    if (el) return el.getAttribute('data-sitekey');

    const iframe = document.querySelector<HTMLIFrameElement>('iframe[src*="recaptcha"]');
    if (iframe) {
      const match = iframe.src.match(/[?&]k=([^&]+)/);
      if (match) return match[1];
    }
    return null;
  });

  if (!sitekey) {
    console.log('  ⚠ Could not find reCAPTCHA sitekey');
    return false;
  }

  const pageUrl = page.url();
  console.log(`  🎯 Submitting to 2Captcha (sitekey: ${sitekey.substring(0, 12)}...)`);

  const captchaId = await submitTo2Captcha(apiKey, sitekey, pageUrl);
  if (!captchaId) return false;

  const token = await poll2CaptchaResult(apiKey, captchaId);
  if (!token) return false;

  console.log('  ✅ reCAPTCHA solved! Applying token...');

  await page.evaluate((t: string) => {
    const textarea = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement;
    if (textarea) textarea.value = t;
    try {
      const cb = (window as any).___grecaptcha_cfg?.clients?.[0]?.[0]?.callback;
      if (typeof cb === 'function') cb(t);
    } catch { /* ignore */ }
  }, token);

  return true;
}

/** Submit a reCAPTCHA to 2Captcha */
async function submitTo2Captcha(apiKey: string, sitekey: string, pageUrl: string): Promise<string | null> {
  try {
    const url = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${sitekey}&pageurl=${pageUrl}&json=1`;
    const resp = await fetch(url);
    const data = await resp.json() as { status: number; request?: string; error_text?: string };

    if (data.status === 1 && data.request) {
      console.log(`  ✅ Submitted to 2Captcha, ID: ${data.request}`);
      return data.request;
    }
    console.log(`  ❌ 2Captcha error: ${data.error_text || 'unknown'}`);
    return null;
  } catch (err) {
    console.log(`  ❌ 2Captcha network error: ${(err as Error).message}`);
    return null;
  }
}

/** Poll 2Captcha for the result */
async function poll2CaptchaResult(apiKey: string, captchaId: string): Promise<string | null> {
  const start = Date.now();

  while (Date.now() - start < SOLVE_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const url = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
      const resp = await fetch(url);
      const data = await resp.json() as { status: number; request?: string; error_text?: string };

      if (data.status === 1 && data.request) return data.request;
      if (data.request === 'ERROR_CAPTCHA_UNSOLVABLE') {
        console.log('  ❌ 2Captcha: captcha unsolvable');
        return null;
      }
      console.log(`  ⏳ Waiting for 2Captcha... (${Math.round((Date.now() - start) / 1000)}s)`);
    } catch (err) {
      console.log(`  ⚠ Poll error: ${(err as Error).message}`);
    }
  }

  console.log('  ❌ 2Captcha: timeout (90s)');
  return null;
}
