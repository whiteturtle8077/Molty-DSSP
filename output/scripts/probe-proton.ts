import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  console.log('Navigating to ProtonMail login...');
  await page.goto('https://mail.proton.me', { waitUntil: 'domcontentloaded' });
  
  // Wait for either the login form or any visible content
  await page.waitForTimeout(8000);
  
  // Check current URL
  console.log('Current URL:', page.url());

  // Full page text
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\n=== PAGE TEXT (first 3000 chars) ===');
  console.log(text.substring(0, 3000));

  // All input fields and buttons
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, button, [role="button"], [contenteditable]')).map(el => ({
      tag: el.tagName,
      type: el.getAttribute('type') || '',
      id: el.id || '',
      class: (el.className?.toString() || '').substring(0, 80),
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      text: (el.textContent || '').trim().substring(0, 60),
      visible: el.offsetParent !== null,
    }));
  });
  console.log('\n=== INPUTS/BUTTONS ===');
  console.log(JSON.stringify(inputs, null, 2));

  // All iframes
  const iframes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe')).map(f => ({
      src: (f.src || '').substring(0, 120),
      id: f.id || ''
    }));
  });
  console.log('\n=== IFRAMES ===');
  console.log(JSON.stringify(iframes, null, 2));

  // Check recaptcha
  const recaptcha = await page.evaluate(() => {
    return {
      hasGrecaptcha: typeof (window as any).grecaptcha !== 'undefined',
      recaptchaFrames: Array.from(document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="google"]')).map(f => (f.src || '').substring(0, 100)),
    };
  });
  console.log('\n=== RECAPTCHA CHECK ===');
  console.log(JSON.stringify(recaptcha, null, 2));

  await browser.close();
}

main().catch(console.error);
