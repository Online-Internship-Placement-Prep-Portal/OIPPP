// TC-AUTH-06 UI step on the Render client: register a new student through the form.
// Usage: PW_DIR=<folder with playwright installed> node ui-register-run.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright');
const BASE = 'https://oippp-client.onrender.com';
const dir = decodeURIComponent(new URL('./ui-render/', import.meta.url).pathname).replace(/^\/(\w:)/, '$1');
const email = `tc-auth06-ui-${Date.now()}@students.example.com`;
const srn = `PES1UG24CS${String(Date.now()).slice(-3)}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(BASE + '/register', { timeout: 90000 });
await page.getByLabel('Full name').fill('TC Auth Six UI');
await page.getByLabel('Institutional email').fill(email);
await page.getByLabel('SRN').fill(srn);
await page.getByLabel('Password').fill('Testpass123');
await page.locator('button[type=submit]').click();
await page.waitForTimeout(5000);
await page.screenshot({ path: dir + 'auth06-registered.png', fullPage: true });
const result = { email, srn, urlAfter: page.url(), text: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300), at: new Date().toISOString() };
console.log(JSON.stringify(result));
fs.writeFileSync(new URL('./ui-register-results.json', import.meta.url), JSON.stringify(result, null, 2));
await browser.close();
