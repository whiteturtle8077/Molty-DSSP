import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  await page.goto('https://mail.proton.me', { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  // Get all frames
  const frames = page.frames();
  console.log(`Total frames: ${frames.length}`);
  
  for (const frame of frames) {
    console.log(`\nFrame URL: ${frame.url().substring(0, 120)}`);
    if (frame.url().includes('challenge')) {
      try {
        const text = await frame.evaluate(() => document.body.innerText);
        console.log(`  Text: ${text.substring(0, 2000)}`);
        
        const html = await frame.evaluate(() => document.body.innerHTML.substring(0, 1000));
        console.log(`  HTML snippet: ${html}`);
        
        // Check for any canvas elements
        const canvases = await frame.evaluate(() => {
          return Array.from(document.querySelectorAll('canvas, img, svg')).map(el => ({
            tag: el.tagName,
            width: (el as any).width,
            height: (el as any).height
          }));
        });
        console.log(`  Canvas/Img/Svg: ${JSON.stringify(canvases)}`);
      } catch (e) {
        console.log(`  Cannot access frame: ${e}`);
      }
    }
  }

  // Fill username and press enter to see what challenge appears
  console.log('\n--- Filling username and clicking sign in ---');
  await page.locator('#username').fill('whiteturtle8077@proton.me');
  await page.locator('#password').fill('anything');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(8000);
  
  console.log(`URL after submit: ${page.url()}`);
  
  // Check for new frames
  const frames2 = page.frames();
  console.log(`\nFrames after submit: ${frames2.length}`);
  for (const frame of frames2) {
    if (frame.url().includes('challenge')) {
      try {
        const text = await frame.evaluate(() => document.body.innerText);
        console.log(`  Challenge text: ${text.substring(0, 500)}`);
        
        const html = await frame.evaluate(() => document.body.innerHTML.substring(0, 500));
        console.log(`  Challenge HTML: ${html}`);
      } catch (e) {
        console.log(`  Cannot access: ${e}`);
      }
    }
  }

  // Check page text for error messages
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log(`\nPage text after submit:\n${pageText.substring(0, 1000)}`);

  await browser.close();
}

main().catch(console.error);
