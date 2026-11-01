// UI-only Firebase boundary mocks: no accounts or cloud documents are created.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Save Test', matches: [{ id: 'saved-match', events: [], decisions: [] }] })));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/services/firebase.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const auth = {
      currentUser: { uid: 'mock-only-user', email: 'mock@example.com' },
      onAuthStateChanged(next) { queueMicrotask(() => next(this.currentUser)); return () => {}; }
    };
    export const db = {};
  ` }));
  await page.route('**/src/services/cloudCareer.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export async function saveCloudCareer() {
      const response = await fetch('/__test/save', { method: 'POST' });
      if (!response.ok) throw new Error('Cloud save failed. Try again.');
    }
    export async function loadCloudCareer() { return null; }
  ` }));
  let pending;
  await page.route('**/__test/save', route => { pending = route; });
  await page.goto(process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174');
  await page.getByRole('button', { name: 'Account / Cloud saves', exact: true }).tap();
  await page.getByRole('button', { name: 'Save browser career to cloud', exact: true }).tap();
  await page.getByText('Connecting to Firebase...', { exact: true }).waitFor();
  assert.equal(await page.locator('.save-confirmation').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Close account', exact: true }).isDisabled());
  assert.ok(pending);
  await pending.fulfill({ status: 200, body: '{}' });
  await page.getByText('Career saved successfully', { exact: true }).waitFor();
  assert.match(await page.locator('.save-confirmation').innerText(), /1 completed match/);
  await page.getByRole('button', { name: 'Done · return to game', exact: true }).tap();
  assert.equal(await page.locator('.account-modal').count(), 0);
  await page.getByRole('button', { name: 'Account / Cloud saves', exact: true }).tap();
  pending = null;
  await page.getByRole('button', { name: 'Save browser career to cloud', exact: true }).tap();
  await page.getByText('Connecting to Firebase...', { exact: true }).waitFor();
  assert.ok(pending);
  await pending.fulfill({ status: 503, body: '{}' });
  await page.getByRole('alert').filter({ hasText: 'Cloud save failed' }).waitFor();
  assert.equal(await page.locator('.save-confirmation').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Done · return to game', exact: true }).count(), 0);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')));
  assert.equal(save.matches[0].id, 'saved-match');
  assert.deepEqual(errors, []);
  await context.close();
  console.log('Pending save has no premature success; successful save shows banner and Done closes; failure stays open without success. Mobile checks passed using mocks.');
} finally { await browser.close(); }
