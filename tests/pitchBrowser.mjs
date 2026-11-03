import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
async function open(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Pitch Test', matches: [] }));
    localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
    Math.random = () => .01;
  });
  const page = await context.newPage();
  page.on('pageerror', error => { throw error; });
  await page.goto(base);
  await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
  await page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  assert.equal(await page.locator('.player-marker').count(), 11);
  await page.locator('.prematch-panel .primary-button').click();
  return { context, page };
}
const positions = page => page.locator('.live-player').evaluateAll(markers => markers.map(marker => marker.getAttribute('style')));
try {
  const { context, page } = await open({ viewport: { width: 1366, height: 768 } });
  assert.equal(await page.locator('.home-player').count(), 11);
  assert.equal(await page.locator('.away-player').count(), 11);
  assert.notEqual(await page.locator('.home-player').first().evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('.away-player').first().evaluate(el => getComputedStyle(el).backgroundColor));
  const initial = await positions(page);
  await page.waitForTimeout(450);
  assert.notDeepEqual(await positions(page), initial);
  assert.equal(await page.locator('.score-center strong').innerText(), '0 - 0');
  await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  await page.waitForTimeout(100);
  const ball = await page.locator('.match-ball').getAttribute('style');
  await page.waitForTimeout(650);
  assert.notEqual(await page.locator('.match-ball').getAttribute('style'), ball);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(150);
  const stopped = await positions(page);
  const stoppedBall = await page.locator('.match-ball').getAttribute('style');
  await page.waitForTimeout(450);
  assert.deepEqual(await positions(page), stopped);
  assert.equal(await page.locator('.match-ball').getAttribute('style'), stoppedBall);
  const awayName = await page.locator('.away-player').last().getAttribute('title');
  await page.locator('.away-player').last().click();
  assert.ok(awayName.includes(await page.locator('.pitch-player-card strong').innerText()));
  assert.match(await page.locator('.pitch-player-card').innerText(), /Barcelona/);
  await page.getByRole('button', { name: 'Close player details', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForTimeout(450);
  assert.notDeepEqual(await positions(page), stopped);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const reduced = await positions(page);
  await page.waitForTimeout(450);
  assert.deepEqual(await positions(page), reduced);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let steps = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'HALF TIME') {
    assert.ok(++steps < 30);
    if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  await page.waitForTimeout(150);
  const halfStopped = await positions(page);
  await page.waitForTimeout(300);
  assert.deepEqual(await positions(page), halfStopped);
  await page.getByRole('button', { name: 'Start second half', exact: true }).click();
  assert.ok(await page.locator('.home-player.goalkeeper').evaluate(el => parseFloat(el.style.top) < 20));
  assert.equal(await page.locator('.match-ball').evaluate(el => el.style.left + '/' + el.style.top), '50%/50%');
  steps = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++steps < 30);
    if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  await page.waitForTimeout(150);
  const finalPositions = await positions(page);
  await page.waitForTimeout(300);
  assert.deepEqual(await positions(page), finalPositions);
  await context.close();
  console.log('22 players, colors, event ball movement, pause/resume, halftime freeze, change of ends, full-time freeze, away details, and reduced motion passed.');
  const touch = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touch.page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await touch.page.locator('.away-player').last().tap();
  assert.match(await touch.page.locator('.pitch-player-card').innerText(), /Barcelona/);
  assert.equal(await touch.page.locator('.live-player').count(), 22);
  assert.ok(await touch.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touch.context.close();
  console.log('Shared pitch and opponent details work on mobile without horizontal overflow.');
} finally { await browser.close(); }
