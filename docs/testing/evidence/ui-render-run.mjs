// UI checks on the Render client with Playwright (Edge, headless).
// Usage: PW_DIR=<folder with playwright installed> node ui-render-run.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright');
const BASE = 'https://oippp-client.onrender.com', PW = 'Demo12345';
const shots = decodeURIComponent(new URL('./ui-render/', import.meta.url).pathname).replace(/^\/(\w:)/, '$1');
fs.mkdirSync(shots, { recursive: true });
const res = { base: BASE, startedAt: new Date().toISOString(), cases: {} };
const rec = (tc, step, ok, note = '') => { (res.cases[tc] ??= []).push({ step, ok, note }); console.log(tc, ok ? 'PASS' : 'FAIL', step, note); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
async function session(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { timeout: 90000 });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  return { ctx, page };
}
const shot = (p, n) => p.screenshot({ path: shots + n + '.png', fullPage: true });
const fail = (m) => { throw new Error(m); };
const step = async (tc, name, fn) => {
  try { const r = await fn(); rec(tc, name, true, typeof r === 'string' ? r : ''); }
  catch (e) { rec(tc, name, false, String(e.message).split('\n')[0]); }
};
const title = `UI QA ${Date.now()}`;
const edited = title + ' edited';
const future = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
let listingId;

// UI-LST-02 recruiter listing form
const r1 = await session('recruiter01@example.com');
const p = r1.page;
await step('UI-LST-02', 'invalid values show errors (empty, negative stipend, past deadline)', async () => {
  await p.goto(BASE + '/recruiter/listings/new');
  await p.getByRole('button', { name: 'Publish listing' }).click();
  const empty = await p.locator('.field-error').count();
  await p.getByLabel('Stipend (₹ per month)').fill('-5');
  await p.getByLabel('Application deadline').fill('2020-01-01');
  await p.getByRole('button', { name: 'Publish listing' }).click();
  const txt = (await p.locator('.field-error').allTextContents()).join(' | ');
  await shot(p, 'lst02-invalid');
  if (!(empty >= 3 && /stipend/i.test(txt) && /deadline|future|past/i.test(txt))) fail(`errors on empty submit: ${empty}; texts: ${txt}`);
  return `empty submit: ${empty} errors; ${txt}`;
});
await step('UI-LST-02', 'create valid listing, appears in My listings', async () => {
  await p.goto(BASE + '/recruiter/listings/new');
  await p.getByLabel('Company').fill('QA Corp');
  await p.getByLabel('Role title').fill(title);
  await p.getByLabel('Location').fill('Bengaluru');
  await p.getByLabel('Mode').selectOption('REMOTE');
  await p.getByLabel('Stipend (₹ per month)').fill('12000');
  await p.getByLabel('Required skills').fill('React, Node');
  await p.getByLabel('Application deadline').fill(future);
  await p.getByRole('button', { name: 'Publish listing' }).click();
  await p.waitForURL(/\/recruiter\/listings$/, { timeout: 20000 });
  await p.getByText(title).first().waitFor({ timeout: 15000 });
  await shot(p, 'lst02-created');
  const hrefs = await p.locator('a[href*="/recruiter/listings/"]').evaluateAll((as) => as.map((a) => [a.closest('tr,li,article,div')?.innerText || '', a.getAttribute('href')]));
  const hit = hrefs.find(([t]) => t.includes(title));
  listingId = hit?.[1].match(/listings\/([a-f0-9]{24})/)?.[1];
  if (!listingId) fail('created, but could not read the listing id from My listings');
  return `listing ${listingId}`;
});
await step('UI-LST-02', 'owner edits title and sees the change', async () => {
  await p.goto(`${BASE}/recruiter/listings/${listingId}/edit`);
  await p.getByLabel('Role title').fill(edited);
  await p.getByRole('button', { name: 'Save changes' }).click();
  await p.waitForURL(/\/recruiter\/listings$/, { timeout: 20000 });
  await p.getByText(edited).first().waitFor({ timeout: 15000 });
  await shot(p, 'lst02-edited');
});
const r2 = await session('recruiter02@example.com');
await step('UI-LST-02', 'another recruiter cannot edit the listing', async () => {
  const q = r2.page;
  await q.goto(`${BASE}/recruiter/listings/${listingId}/edit`);
  await q.waitForTimeout(3000);
  if (await q.getByLabel('Role title').count()) {
    await q.getByLabel('Role title').fill('hijack');
    await q.getByRole('button', { name: 'Save changes' }).click();
    await q.waitForTimeout(3000);
  }
  const body = await q.locator('body').innerText();
  await shot(q, 'lst02-other-recruiter');
  const m = body.match(/.*(own|permission|forbidden|not allowed).*/i);
  if (!m) fail('no ownership error shown: ' + body.replace(/\s+/g, ' ').slice(0, 200));
  return m[0];
});
await r2.ctx.close();

// UI-SRCH-04 saved internships, then the applications UI steps
const s = await session('student0003@students.example.com');
const sp = s.page;
await step('UI-SRCH-04', 'save listing, appears once in Saved, remove', async () => {
  await sp.goto(`${BASE}/listings/${listingId}`);
  await sp.getByRole('button', { name: 'Save internship' }).click();
  await sp.getByRole('button', { name: 'Remove from saved' }).waitFor({ timeout: 10000 });
  await sp.goto(BASE + '/saved');
  await sp.waitForTimeout(2500);
  const n = await sp.getByText(edited).count();
  const savedText = await sp.locator('body').innerText();
  await shot(sp, 'srch04-saved');
  if (n !== 1) fail(`appears ${n} times`);
  await sp.goto(`${BASE}/listings/${listingId}`);
  await sp.getByRole('button', { name: 'Remove from saved' }).click();
  await sp.getByRole('button', { name: 'Save internship' }).waitFor();
  await sp.goto(BASE + '/saved');
  await sp.waitForTimeout(2500);
  await shot(sp, 'srch04-removed');
  if (await sp.getByText(edited).count()) fail('still listed after removal');
  const count = savedText.match(/.*\b100\b.*/)?.[0];
  return `limit text: ${count || 'no 100-item limit text shown'}`;
});
await step('TC-APP-01 (UI)', 'apply from listing page, reload, My applications + History', async () => {
  await sp.goto(`${BASE}/listings/${listingId}`);
  await sp.getByLabel('Cover note (optional)').fill('UI run cover note');
  await sp.getByRole('button', { name: 'Submit application' }).click();
  await sp.waitForTimeout(4000);
  await shot(sp, 'app01-applied');
  await sp.reload();
  await sp.waitForTimeout(3000);
  await shot(sp, 'app01-reloaded');
  if (await sp.getByRole('button', { name: 'Submit application' }).count()) fail('form still offered after applying');
  await sp.goto(BASE + '/applications');
  const row = sp.locator(`tr:has-text("${edited}")`);
  await row.waitFor({ timeout: 15000 });
  await row.getByRole('button', { name: 'History' }).click();
  await sp.waitForTimeout(1500);
  await shot(sp, 'app01-history');
  const h = (await sp.locator('body').innerText()).replace(/\s+/g, ' ');
  return `history panel: ${h.match(/.{0,60}Applied.{0,60}/g)?.slice(-1)[0] || '?'}`;
});
await step('UI-SRCH-05', 'home shows recommendations and matched skills; search navigates', async () => {
  await sp.goto(BASE + '/home');
  await sp.waitForTimeout(4000);
  const t = (await sp.locator('main').innerText()).replace(/\s+/g, ' ');
  await shot(sp, 'srch05-home');
  await sp.locator('#home-search').fill('React');
  await sp.getByRole('button', { name: 'Search' }).click();
  await sp.waitForURL(/listings/, { timeout: 10000 });
  if (!/recommend/i.test(t)) fail('no recommendations section: ' + t.slice(0, 200));
  return `home: ${t.slice(0, 220)} | search url ${sp.url()}`;
});
await step('TC-REV-01 (UI)', 'recruiter moves the applicant to Shortlisted', async () => {
  await p.goto(`${BASE}/recruiter/listings/${listingId}/applicants`);
  await p.getByRole('button', { name: 'Move to Shortlisted' }).first().click();
  await p.waitForTimeout(3000);
  await shot(p, 'rev01-shortlisted');
  if (!/Shortlisted/.test(await p.locator('main').innerText())) fail('status not shown');
  return 'Shortlisted shown in the applicants table';
});
await step('TC-REV-05 (UI)', 'student bell shows the shortlist notification', async () => {
  await sp.goto(BASE + '/home');
  await sp.waitForTimeout(3000);
  const bell = sp.getByRole('button', { name: /notification/i }).first();
  const label = await bell.getAttribute('aria-label');
  await bell.click();
  await sp.waitForTimeout(1500);
  await shot(sp, 'rev05-bell');
  if (!(await sp.locator('body').innerText()).includes('Shortlisted')) fail('no shortlist notification in the bell');
  return `bell: ${label}`;
});
res.listingId = listingId;
res.finishedAt = new Date().toISOString();
fs.writeFileSync(new URL('./ui-render-results.json', import.meta.url), JSON.stringify(res, null, 2));
await browser.close();
